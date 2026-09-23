import { FastifyInstance } from 'fastify'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { db } from '../db/index.js'
import { communityImages } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'
import { UPLOAD_ROOT } from '../utils/uploads.js'

const ORIGINAL_DIR = path.join(UPLOAD_ROOT, 'original')
const THUMB_DIR = path.join(UPLOAD_ROOT, 'thumb')

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])
const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 9
const THUMB_MAX_SIDE = 800
const THUMB_QUALITY = 72

function ensureDirs() {
  fs.mkdirSync(ORIGINAL_DIR, { recursive: true })
  fs.mkdirSync(THUMB_DIR, { recursive: true })
}

function extFromMime(mime: string, filename?: string) {
  const lower = (filename || '').toLowerCase()
  for (const ext of ALLOWED_EXTS) {
    if (lower.endsWith(ext)) return ext
  }
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/png') return '.png'
  if (mime === 'image/webp') return '.webp'
  if (mime === 'image/gif') return '.gif'
  return '.jpg'
}

interface IncomingFile {
  mime: string
  ext: string
  buffer: Buffer
}

interface PreparedFile extends IncomingFile {
  id: string
  isGif: boolean
  originalName: string
  thumbName: string
  thumbBuffer: Buffer
  width?: number
  height?: number
}

export async function uploadRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.post('/images', async (request, reply) => {
    ensureDirs()

    // 阶段一：全部读入内存并校验，任何失败都不产生副作用
    const incoming: IncomingFile[] = []
    for await (const part of request.files()) {
      if (part.type !== 'file') continue
      if (incoming.length >= MAX_FILES) {
        return reply.status(400).send({ error: `最多上传 ${MAX_FILES} 张图片` })
      }
      const mime = part.mimetype
      if (!ALLOWED_MIMES.has(mime)) {
        return reply.status(400).send({ error: `不支持的图片类型: ${mime}` })
      }
      const ext = extFromMime(mime, part.filename)
      if (!ALLOWED_EXTS.has(ext)) {
        return reply.status(400).send({ error: `不支持的图片扩展名: ${ext}` })
      }
      const buffer = await part.toBuffer()
      if (buffer.length > MAX_ORIGINAL_BYTES) {
        return reply.status(400).send({ error: `单张图片不能超过 10MB: ${part.filename}` })
      }
      incoming.push({ mime, ext, buffer })
    }

    if (incoming.length === 0) {
      return reply.status(400).send({ error: '请选择图片' })
    }

    // 阶段二：sharp 二次校验 + 生成缩略图（仍全部在内存）
    const prepared: PreparedFile[] = []
    for (const item of incoming) {
      const isGif = item.mime === 'image/gif' || item.ext === '.gif'
      const id = randomUUID()
      let thumbBuffer = item.buffer
      let width: number | undefined
      let height: number | undefined

      try {
        if (isGif) {
          const meta = await sharp(item.buffer, { animated: false }).metadata()
          width = meta.width
          height = meta.height
        } else {
          const image = sharp(item.buffer, { failOn: 'none' })
          const meta = await image.metadata()
          width = meta.width
          height = meta.height
          thumbBuffer = await image
            .rotate()
            .resize({
              width: THUMB_MAX_SIDE,
              height: THUMB_MAX_SIDE,
              fit: 'inside',
              withoutEnlargement: true,
            })
            .webp({ quality: THUMB_QUALITY })
            .toBuffer()
        }
      } catch {
        return reply.status(400).send({ error: '图片无法解析，请更换图片' })
      }

      if (!width || !height) {
        return reply.status(400).send({ error: '图片无法解析，请更换图片' })
      }

      prepared.push({
        ...item,
        id,
        isGif,
        originalName: `${id}${item.ext}`,
        // 缩略图命名保留原始扩展名以便反推原图：abc.jpg → abc.jpg.thumb.webp；gif 不压缩
        thumbName: isGif ? `${id}${item.ext}` : `${id}${item.ext}.thumb.webp`,
        thumbBuffer,
        width,
        height,
      })
    }

    // 阶段三：全部校验通过后才落盘 + 入库
    const now = new Date()
    const yyyy = String(now.getFullYear())
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const subDir = path.join(yyyy, mm)
    const originalSub = path.join(ORIGINAL_DIR, subDir)
    const thumbSub = path.join(THUMB_DIR, subDir)
    fs.mkdirSync(originalSub, { recursive: true })
    fs.mkdirSync(thumbSub, { recursive: true })

    const results: Array<{
      originalUrl: string
      thumbUrl: string
      width: number
      height: number
      bytesOriginal: number
      bytesThumb: number
    }> = []

    const writtenPaths: string[] = []
    try {
      for (const p of prepared) {
        const originalPath = path.join(originalSub, p.originalName)
        const thumbPath = path.join(thumbSub, p.thumbName)
        fs.writeFileSync(originalPath, p.buffer)
        writtenPaths.push(originalPath)
        fs.writeFileSync(thumbPath, p.thumbBuffer)
        writtenPaths.push(thumbPath)

        const originalUrl = `/uploads/original/${subDir}/${p.originalName}`
        const thumbUrl = `/uploads/thumb/${subDir}/${p.thumbName}`

        const [row] = await db
          .insert(communityImages)
          .values({
            userId: request.user.userId,
            originalUrl,
            thumbUrl,
            width: p.width,
            height: p.height,
            bytesOriginal: p.buffer.length,
            bytesThumb: p.thumbBuffer.length,
          })
          .returning()

        results.push({
          originalUrl: row.originalUrl,
          thumbUrl: row.thumbUrl,
          width: row.width ?? 0,
          height: row.height ?? 0,
          bytesOriginal: row.bytesOriginal ?? p.buffer.length,
          bytesThumb: row.bytesThumb ?? p.thumbBuffer.length,
        })
      }
    } catch (err) {
      // 落盘/入库中途失败：回滚已写文件
      for (const path of writtenPaths) {
        try {
          fs.unlinkSync(path)
        } catch {
          // ignore
        }
      }
      request.log.error(err)
      return reply.status(500).send({ error: '图片保存失败，请重试' })
    }

    return { images: results }
  })
}

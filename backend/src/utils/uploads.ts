import fs from 'fs'
import path from 'path'
import { db } from '../db/index.js'
import { communityImages } from '../db/schema.js'
import { inArray } from 'drizzle-orm'

export const UPLOAD_ROOT = path.resolve(import.meta.dirname, '../../data/uploads')

/** 原图 URL → 缩略图 URL（与 uploads 路由命名规则保持一致） */
export function originalToThumbUrl(url: string): string {
  let thumb = url.replace('/uploads/original/', '/uploads/thumb/')
  if (!/\.gif$/i.test(thumb)) thumb += '.thumb.webp'
  return thumb
}

/** 上传 URL → 服务器本地路径（拒绝路径穿越） */
function urlToPath(url: string): string | null {
  const m = url.match(/\/uploads\/((?:original|thumb)\/[\w.-]+(?:\/[\w.-]+)+)$/)
  if (!m) return null
  if (m[1].includes('..')) return null
  return path.join(UPLOAD_ROOT, m[1])
}

/** 缩略图 URL → 原图 URL（与 uploads 路由命名规则保持一致） */
export function thumbToOriginalUrl(url: string): string {
  let original = url.replace('/uploads/thumb/', '/uploads/original/')
  if (original.endsWith('.thumb.webp')) original = original.slice(0, -'.thumb.webp'.length)
  return original
}

/** 从帖子 HTML 中提取上传图片 URL，统一归一化为原图 URL（绝对或相对） */
export function extractOriginalUrlsFromHtml(html: string): string[] {
  const re = /(?:https?:\/\/[^"'\s]+)?\/uploads\/(?:original|thumb)\/[^"'\s<)]+/g
  const found = html.match(re) || []
  return [...new Set(found.map(thumbToOriginalUrl))]
}

/** 删除原图与缩略图文件 + community_images 记录（按原图 URL） */
export async function cleanupUploadsByOriginalUrls(originalUrls: string[]): Promise<void> {
  const uniq = [...new Set(originalUrls.filter(Boolean))]
  if (uniq.length === 0) return

  const paths = new Set<string>()
  for (const url of uniq) {
    const originalPath = urlToPath(url)
    if (originalPath) paths.add(originalPath)
    const thumbPath = urlToPath(originalToThumbUrl(url))
    if (thumbPath) paths.add(thumbPath)
  }

  for (const p of paths) {
    try {
      fs.unlinkSync(p)
    } catch {
      // 文件不存在或已删除，忽略
    }
  }

  // URL 可能带主机前缀，统一按相对路径匹配记录
  const relativeKeys = uniq.map((u) => {
    const idx = u.indexOf('/uploads/original/')
    return idx >= 0 ? u.slice(idx) : u
  })

  try {
    await db.delete(communityImages).where(inArray(communityImages.originalUrl, relativeKeys))
  } catch {
    // 记录清理失败不影响主流程
  }
}

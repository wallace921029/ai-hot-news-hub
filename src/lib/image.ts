export interface CompressedImage {
  original: File
  thumbBlob: Blob
  thumbUrl: string
  originalPreviewUrl: string
  width: number
  height: number
}

const MAX_SIDE = 800
const QUALITY = 0.72
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return `不支持的图片类型: ${file.type}`
  if (file.size > MAX_ORIGINAL_BYTES) return `单张图片不能超过 10MB: ${file.name}`
  return null
}

export async function compressImage(file: File): Promise<CompressedImage> {
  if (file.type === 'image/gif') {
    // gif 不压缩，仅预生成预览
    const thumbUrl = URL.createObjectURL(file)
    return {
      original: file,
      thumbBlob: file,
      thumbUrl,
      originalPreviewUrl: thumbUrl,
      width: 0,
      height: 0,
    }
  }

  const img = await loadImage(file)
  const { canvas, width, height } = drawToCanvas(img, MAX_SIDE)
  const thumbBlob = await canvasToBlob(canvas, 'image/webp', QUALITY)
  const thumbUrl = URL.createObjectURL(thumbBlob)
  const originalPreviewUrl = URL.createObjectURL(file)

  return {
    original: file,
    thumbBlob,
    thumbUrl,
    originalPreviewUrl,
    width,
    height,
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}

function drawToCanvas(img: HTMLImageElement, maxSide: number) {
  let { width, height } = img
  if (width > maxSide || height > maxSide) {
    const ratio = Math.min(maxSide / width, maxSide / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, width, height)
  return { canvas, width, height }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('压缩失败'))
      },
      type,
      quality
    )
  })
}

export function revokeThumbUrl(url: string) {
  try {
    URL.revokeObjectURL(url)
  } catch {
    // ignore
  }
}

export function revokeCompressed(img: CompressedImage) {
  revokeThumbUrl(img.thumbUrl)
  if (img.originalPreviewUrl !== img.thumbUrl) revokeThumbUrl(img.originalPreviewUrl)
}

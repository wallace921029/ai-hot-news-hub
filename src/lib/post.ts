// 社区帖子 HTML 清洗：BlockNote 空段落会导出为 <p>￼</p>（U+FFFC 光标占位符），
// 存库前和渲染前去掉，避免段落之间出现怪符号。

const EMPTY_PARAGRAPH_RE = /<p>(?:\s|￼|<br\s*\/?>)*<\/p>/gi

/** 去掉纯空段落（含 ￼ 占位符），保留正常内容 */
export function cleanPostHtml(html: string): string {
  return html.replace(EMPTY_PARAGRAPH_RE, '').trim()
}

/** 缩略图 URL → 原图 URL（与后端 uploads 命名规则一致） */
export function originalFromThumb(url: string): string {
  let original = url.replace('/uploads/thumb/', '/uploads/original/')
  if (original.endsWith('.thumb.webp')) original = original.slice(0, -'.thumb.webp'.length)
  return original
}

/**
 * 把正文中上传的缩略图包一层 <a>，点击在新标签页打开原图。
 * 仅处理 /uploads/thumb/ 路径的图片，外链图片不动。
 */
export function linkifyUploadImages(html: string): string {
  if (!html.includes('/uploads/thumb/')) return html
  return html.replace(
    /<img([^>]*?)\ssrc="((?:https?:\/\/[^"]+)?\/uploads\/thumb\/[^"]+)"([^>]*)>/gi,
    (_match, pre: string, src: string, post: string) => {
      const abs = src.startsWith('/') ? `http://localhost:8762${src}` : src
      const original = originalFromThumb(abs)
      return `<a href="${original}" target="_blank" rel="noopener noreferrer"><img${pre} src="${src}"${post}></a>`
    }
  )
}

/** 纯文本摘要：去标签 + 去 ￼ + 压缩空白 */
export function postExcerpt(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent || '').replace(/￼/g, '').replace(/\s+/g, ' ').trim()
}

/** 纯文本长度（字数统计用） */
export function postTextLength(html: string): number {
  return postExcerpt(html).length
}

// 社区帖子 HTML 清洗：BlockNote 空段落会导出为 <p>￼</p>（U+FFFC 光标占位符），
// 存库前和渲染前去掉，避免段落之间出现怪符号。

const EMPTY_PARAGRAPH_RE = /<p>(?:\s|￼|<br\s*\/?>)*<\/p>/gi

/** 去掉纯空段落（含 ￼ 占位符），保留正常内容 */
export function cleanPostHtml(html: string): string {
  return html.replace(EMPTY_PARAGRAPH_RE, '').trim()
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

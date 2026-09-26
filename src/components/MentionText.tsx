import type { ReactNode } from 'react'

/**
 * 文本中的 @xxx 渲染为蓝色（纯展示，不改文本；经 JSX 输出，React 自动转义）。
 * 只认“行首/空白后的 @”（邮箱等不误伤），与后端子串匹配口径一致。
 */
export function MentionText({ text }: { text: string }) {
  const nodes: ReactNode[] = []
  const re = /(^|\s)(@[^\s@]+)/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1]) nodes.push(m[1])
    nodes.push(
      <span key={k++} className="text-primary font-medium">
        {m[2]}
      </span>
    )
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  if (nodes.length === 0) return <>{text}</>
  return <>{nodes}</>
}

/** 光标前的 @ token：@ 起始下标 + 查询串；无有效 token 返回 null */
export interface MentionQuery {
  start: number
  query: string
}

export function getMentionQuery(value: string, caret: number): MentionQuery | null {
  const before = value.slice(0, Math.max(0, caret))
  const match = /@([^\s@]*)$/.exec(before)
  if (!match) return null
  const start = caret - match[0].length
  // @ 前必须是行首或空白（避免邮箱等误触）
  if (start > 0 && !/\s/.test(before[start - 1])) return null
  return { start, query: match[1] }
}

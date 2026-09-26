/**
 * 往受控 textarea 光标处插入文本并恢复光标（头像 @、弹窗选词等共用）。
 * 与各页 insertEmoji 同一写法：rAF 里聚焦 + 归位。
 */
export function insertTextAtCaret(
  el: HTMLTextAreaElement | null,
  value: string,
  insert: string,
  setValue: (v: string) => void,
  maxLength?: number
): void {
  if (!el) {
    const next = value + insert
    setValue(maxLength !== undefined ? next.slice(0, maxLength) : next)
    return
  }
  const start = el.selectionStart ?? value.length
  const end = el.selectionEnd ?? value.length
  let next = `${value.slice(0, start)}${insert}${value.slice(end)}`
  if (maxLength !== undefined) next = next.slice(0, maxLength)
  setValue(next)
  const pos = Math.min(start + insert.length, next.length)
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(pos, pos)
  })
}

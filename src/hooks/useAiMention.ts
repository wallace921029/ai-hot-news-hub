import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import { getMentionQuery } from '@/lib/mentions'
import { useMentionableAis } from '@/hooks/useMentionableAis'
import type { MentionableAgent } from '@/services/api'

export interface MentionCoords {
  top: number
  left: number
}

const MIRROR_PROPS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'letterSpacing',
  'lineHeight',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'textTransform',
  'wordSpacing',
  'textIndent',
] as const

/** mirror-div 测光标视口坐标（与 textarea 同字体/同宽/同换行） */
function getCaretCoords(el: HTMLTextAreaElement): MentionCoords {
  const div = document.createElement('div')
  const style = window.getComputedStyle(el)
  for (const prop of MIRROR_PROPS) {
    div.style.setProperty(
      prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`),
      style.getPropertyValue(prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`))
    )
  }
  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = 'pre-wrap'
  div.style.wordWrap = 'break-word'
  div.style.overflowWrap = 'break-word'
  div.style.width = `${el.clientWidth}px`
  div.textContent = el.value.slice(0, el.selectionStart ?? 0)
  const span = document.createElement('span')
  span.textContent = '​'
  div.appendChild(span)
  document.body.appendChild(div)
  const rect = span.getBoundingClientRect()
  const coords = { top: rect.top, left: rect.left }
  document.body.removeChild(div)
  return coords
}

interface UseAiMentionOptions {
  value: string
  setValue: (v: string) => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
  maxLength?: number
  /** 各页原 onChange 副作用（如 PostDetail 重置 sendState） */
  onExtraChange?: () => void
}

/**
 * 评论框 @ AI：检测光标前 @token → 弹窗 → 选中插入 `@昵称 `。
 * 后端子串匹配，无需改协议；插入文本与手打完全一致。
 */
export function useAiMention({
  value,
  setValue,
  textareaRef,
  maxLength,
  onExtraChange,
}: UseAiMentionOptions) {
  const { data, isFetched } = useMentionableAis()
  const agents = useMemo(() => data?.agents ?? [], [data])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [coords, setCoords] = useState<MentionCoords | null>(null)

  const filtered = useMemo(
    () => (query ? agents.filter((a) => a.nickname.includes(query)) : agents),
    [agents, query]
  )

  // 高亮下标渲染期夹紧（数据到达/过滤变化自动生效，无需 effect）
  const safeActiveIndex = filtered.length === 0 ? 0 : Math.min(activeIndex, filtered.length - 1)

  const close = useCallback(() => {
    setOpen(false)
    setActiveIndex(0)
  }, [])

  // 滚动/缩放时跟随光标；输入框滚出视口则关闭（resize 只重定位，不断开，兼容移动端键盘）
  useEffect(() => {
    if (!open) return
    const reposition = () => {
      const el = textareaRef.current
      if (!el) return close()
      const rect = el.getBoundingClientRect()
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return close()
      setCoords(getCaretCoords(el))
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, close, textareaRef])

  /** 接到 textarea onChange，替代原来的 setValue */
  const handleMentionChange = useCallback(
    (next: string) => {
      setValue(next)
      onExtraChange?.()
      const el = textareaRef.current
      if (!el) return
      const caret = el.selectionStart ?? next.length
      const found = getMentionQuery(next, caret)
      // AI 未启用（已加载且为空）→ 永不弹起
      if (!found || (agents.length === 0 && isFetched)) {
        close()
        return
      }
      setQuery(found.query)
      setActiveIndex(0)
      setCoords(getCaretCoords(el))
      setOpen(true)
    },
    [setValue, onExtraChange, textareaRef, agents.length, isFetched, close]
  )

  const selectMentionAgent = useCallback(
    (agent: MentionableAgent) => {
      const el = textareaRef.current
      const caret = el?.selectionStart ?? value.length
      const found = getMentionQuery(value, caret)
      if (!found) {
        close()
        return
      }
      const insert = `@${agent.nickname} `
      let next = `${value.slice(0, found.start)}${insert}${value.slice(caret)}`
      if (maxLength !== undefined) next = next.slice(0, maxLength)
      setValue(next)
      onExtraChange?.()
      close()
      requestAnimationFrame(() => {
        const node = textareaRef.current
        if (!node) return
        node.focus()
        const pos = Math.min(found.start + insert.length, next.length)
        node.setSelectionRange(pos, pos)
      })
    },
    [value, maxLength, setValue, onExtraChange, close, textareaRef]
  )

  /**
   * 接到 textarea onKeyDown。返回 true 表示已消费（调用方直接 return），
   * false 表示弹窗未介入，调用方走原有逻辑（如 Ctrl+Enter 发送）。
   */
  const handleMentionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!open) return false
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (filtered.length === 0) return false
        e.preventDefault()
        const dir = e.key === 'ArrowDown' ? 1 : -1
        setActiveIndex((i) => (i + dir + filtered.length) % filtered.length)
        return true
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        const target = filtered[safeActiveIndex]
        if (!target) return false
        e.preventDefault()
        selectMentionAgent(target)
        return true
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return true
      }
      return false
    },
    [open, filtered, safeActiveIndex, selectMentionAgent, close]
  )

  return {
    mentionOpen: open && (filtered.length > 0 || !isFetched),
    mentionLoading: !isFetched,
    mentionAgents: filtered,
    mentionCoords: coords,
    mentionActiveIndex: safeActiveIndex,
    setMentionActiveIndex: setActiveIndex,
    handleMentionChange,
    handleMentionKeyDown,
    selectMentionAgent,
    closeMention: close,
  }
}

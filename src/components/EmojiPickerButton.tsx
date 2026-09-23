import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Smile } from 'lucide-react'
import { motion } from 'framer-motion'
import { useThemeStore } from '@/stores/theme'
import { useTranslation } from 'react-i18next'
import EmojiPicker, {
  EmojiStyle,
  Theme as EmojiTheme,
  type EmojiClickData,
} from 'emoji-picker-react'
import emojiZhData from 'emoji-picker-react/dist/data/emojis-zh.json'
import type { EmojiData } from 'emoji-picker-react/dist/types/exposedTypes'

// JSON 导入会被拓宽字面量类型，这里形状与官方一致，做一次收窄
const emojiZh = emojiZhData as unknown as EmojiData

interface EmojiPickerButtonProps {
  onSelect: (emoji: string) => void
}

// 表情按钮 + Portal 面板（fixed 定位，不受祖先 overflow 裁剪）
export function EmojiPickerButton({ onSelect }: EmojiPickerButtonProps) {
  const { t } = useTranslation()
  const { resolvedTheme } = useThemeStore()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const place = () => {
    const btn = btnRef.current
    if (!btn) return false
    const rect = btn.getBoundingClientRect()
    if (rect.top < 0 || rect.top > window.innerHeight) return false
    const w = 340
    const h = 380
    const gap = 8
    const left = Math.max(8, Math.min(rect.right - w, window.innerWidth - w - 8))
    const above = rect.top - h - gap
    setPos({ top: above < 8 ? rect.bottom + gap : above, left })
    return true
  }

  const toggle = () => {
    if (!open && !place()) return
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return
    let raf = 0
    const reposition = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (!place()) setOpen(false)
      })
    }
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return
      reposition()
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', reposition)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', reposition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <>
      <Button
        ref={btnRef}
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full text-muted-foreground"
        title={t('editor.emoji')}
        onClick={toggle}
      >
        <Smile className="w-4 h-4" />
      </Button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60] cursor-default" onClick={() => setOpen(false)} />
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 70 }}
              className="rounded-xl border bg-background shadow-xl overflow-hidden"
            >
              <EmojiPicker
                emojiData={emojiZh}
                theme={resolvedTheme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                emojiStyle={EmojiStyle.NATIVE}
                width={340}
                height={380}
                previewConfig={{ showPreview: false }}
                onEmojiClick={(data: EmojiClickData) => onSelect(data.emoji)}
              />
            </motion.div>
          </>,
          document.body
        )}
    </>
  )
}

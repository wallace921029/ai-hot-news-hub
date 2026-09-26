import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Bot, Loader2 } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { cn } from '@/lib/utils'
import type { MentionableAgent } from '@/services/api'

interface AiMentionPopupProps {
  /** 光标视口坐标（fixed 定位基准） */
  coords: { top: number; left: number }
  agents: MentionableAgent[]
  activeIndex: number
  loading: boolean
  onSelect: (agent: MentionableAgent) => void
  onHover: (index: number) => void
}

const PANEL_WIDTH = 260
const ESTIMATED_HEIGHT = 200

// @ 选择框（Portal + fixed，不受祖先 overflow 裁剪；mouseDown 保住输入框焦点）
export function AiMentionPopup({
  coords,
  agents,
  activeIndex,
  loading,
  onSelect,
  onHover,
}: AiMentionPopupProps) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)

  // 底部放不下则翻到光标上方（渲染期直接推导；滚动时 coords 更新会重算）

  const flip = coords.top + 28 + ESTIMATED_HEIGHT > window.innerHeight - 8
  const left = Math.max(8, Math.min(coords.left, window.innerWidth - PANEL_WIDTH - 8))
  const style = flip
    ? { left, bottom: window.innerHeight - coords.top + 4, width: PANEL_WIDTH }
    : { left, top: coords.top + 26, width: PANEL_WIDTH }

  return createPortal(
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: flip ? 6 : -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      style={{ position: 'fixed', zIndex: 70, ...style }}
      className="rounded-xl border bg-background shadow-xl overflow-hidden"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="px-3 pt-2 pb-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Bot className="w-3.5 h-3.5" />
        {t('mention.pickAi')}
      </div>
      <div className="max-h-56 overflow-y-auto p-1.5 pt-0.5">
        {loading && agents.length === 0 ? (
          <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('mention.loading')}
          </div>
        ) : (
          agents.map((agent, i) => (
            <button
              key={agent.username}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(agent)}
              onMouseEnter={() => onHover(i)}
              className={cn(
                'w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                i === activeIndex ? 'bg-accent' : 'hover:bg-accent/60'
              )}
            >
              <UserAvatar avatar={agent.avatar} username={agent.nickname} size={28} />
              <span className="font-medium text-foreground truncate">@{agent.nickname}</span>
              <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {t('mention.aiBadge')}
              </span>
            </button>
          ))
        )}
      </div>
      <div className="px-3 py-1.5 border-t text-[11px] text-muted-foreground/70">
        {t('mention.hint')}
      </div>
    </motion.div>,
    document.body
  )
}

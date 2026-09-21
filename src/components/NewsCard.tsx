import { Star, ExternalLink, Clock } from 'lucide-react'
import type { NewsItem } from '@/types'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

interface NewsCardProps {
  item: NewsItem
  isFavorited?: boolean
  onFavorite?: () => void
}

export function NewsCard({ item, isFavorited = false, onFavorite }: NewsCardProps) {
  const { t } = useTranslation()

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return { text: t('time.justNow'), freshness: 'fresh' as const }
    if (diff < 3600)
      return {
        text: t('time.minutesAgo', { count: Math.floor(diff / 60) }),
        freshness: 'fresh' as const,
      }
    if (diff < 86400)
      return {
        text: t('time.hoursAgo', { count: Math.floor(diff / 3600) }),
        freshness: 'fresh' as const,
      }
    if (diff < 172800)
      return { text: t('time.daysAgo', { count: 1 }), freshness: 'moderate' as const }
    return {
      text: t('time.daysAgo', { count: Math.floor(diff / 86400) }),
      freshness: 'stale' as const,
    }
  }

  const freshnessColors = {
    fresh: 'text-emerald-500',
    moderate: 'text-amber-500',
    stale: 'text-muted-foreground/40',
  }

  const hostname = item.url
    ? (() => {
        try {
          return new URL(item.url).hostname.replace(/^www\./, '')
        } catch {
          return ''
        }
      })()
    : ''

  return (
    <div className="group flex items-center gap-3 py-2.5 px-4 hover:bg-accent/50 rounded-lg transition-colors">
      {/* 左侧：来源 + 标题 */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {item.sourceName && (
          <span className="text-xs text-primary/70 font-medium shrink-0 whitespace-nowrap">
            {item.sourceName}
          </span>
        )}
        <Link
          to={`/news/${item.id}`}
          className="text-sm text-foreground/80 group-hover:text-foreground transition-colors truncate hover:underline"
        >
          {item.title}
        </Link>
      </div>

      {/* 中部：域名 */}
      {hostname && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
          {hostname}
        </a>
      )}

      {/* 右侧：时间 + 收藏 */}
      <div className="flex items-center gap-2 shrink-0">
        {item.fetchedAt &&
          (() => {
            const time = formatTime(item.fetchedAt)
            return (
              <span
                className={`text-xs flex items-center gap-0.5 whitespace-nowrap ${freshnessColors[time.freshness]}`}
              >
                <Clock className="w-3 h-3" />
                {time.text}
              </span>
            )
          })()}
        {onFavorite && (
          <button onClick={onFavorite} className="p-0.5 transition-opacity">
            <Star
              className={`w-3.5 h-3.5 transition-colors ${
                isFavorited
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground/30 hover:text-yellow-400'
              }`}
            />
          </button>
        )}
      </div>
    </div>
  )
}

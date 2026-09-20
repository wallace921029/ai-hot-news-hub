import { Star, ExternalLink, Clock } from 'lucide-react'
import type { NewsItem } from '@/types'
import { useTranslation } from 'react-i18next'

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

    if (diff < 60) return t('time.justNow')
    if (diff < 3600) return t('time.minutesAgo', { count: Math.floor(diff / 60) })
    if (diff < 86400) return t('time.hoursAgo', { count: Math.floor(diff / 3600) })
    return t('time.daysAgo', { count: Math.floor(diff / 86400) })
  }

  return (
    <div className="group flex items-start space-x-3 py-3 px-4 hover:bg-accent/50 rounded-lg transition-colors">
      <div className="flex-1 min-w-0">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start space-x-2"
        >
          <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors line-clamp-1 flex-1">
            {item.title}
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors mt-0.5" />
        </a>
        <div className="flex items-center space-x-3 mt-1.5">
          {item.sourceName && (
            <span className="text-xs text-primary font-medium">{item.sourceName}</span>
          )}
          <span className="text-xs text-muted-foreground">{item.platform}</span>
          {item.fetchedAt && (
            <span className="text-xs text-muted-foreground/60 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{formatTime(item.fetchedAt)}</span>
            </span>
          )}
        </div>
      </div>
      {onFavorite && (
        <button
          onClick={onFavorite}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1"
        >
          <Star
            className={`w-4 h-4 transition-colors ${
              isFavorited
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground/30 hover:text-yellow-400'
            }`}
          />
        </button>
      )}
    </div>
  )
}

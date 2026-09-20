import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Star, ExternalLink, Clock } from 'lucide-react'
import { toast } from 'sonner'
import type { NewsItem } from '@/types'

interface NewsCardProps {
  item: NewsItem
  isFavorited?: boolean
}

export function NewsCard({ item, isFavorited = false }: NewsCardProps) {
  const queryClient = useQueryClient()

  const addFavorite = useMutation({
    mutationFn: () => api.addFavorite(item.id),
    onSuccess: () => {
      toast.success('已收藏')
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
    onError: () => toast.error('收藏失败'),
  })

  const removeFavorite = useMutation({
    mutationFn: () => api.removeFavorite(item.id),
    onSuccess: () => {
      toast.success('已取消收藏')
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
    onError: () => toast.error('取消收藏失败'),
  })

  return (
    <div className="group flex items-start space-x-3 py-3 px-4 hover:bg-white/[0.03] rounded-lg transition-colors">
      <div className="flex-1 min-w-0">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start space-x-2"
        >
          <span className="text-sm text-white/80 group-hover:text-white transition-colors line-clamp-1 flex-1">
            {item.title}
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/15 group-hover:text-white/40 transition-colors mt-0.5" />
        </a>
        <div className="flex items-center space-x-3 mt-1.5">
          {item.sourceName && (
            <span className="text-xs text-violet-400 font-medium">{item.sourceName}</span>
          )}
          <span className="text-xs text-white/25">{item.platform}</span>
          {item.fetchedAt && (
            <span className="text-xs text-white/20 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>
                {new Date(item.fetchedAt).toLocaleDateString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => (isFavorited ? removeFavorite.mutate() : addFavorite.mutate())}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1"
      >
        <Star
          className={`w-4 h-4 transition-colors ${
            isFavorited ? 'fill-yellow-400 text-yellow-400' : 'text-white/20 hover:text-yellow-400'
          }`}
        />
      </button>
    </div>
  )
}

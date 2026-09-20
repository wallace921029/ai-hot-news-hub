import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, ExternalLink, Sparkles } from 'lucide-react'
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
    onError: () => {
      toast.error('收藏失败')
    },
  })

  const removeFavorite = useMutation({
    mutationFn: () => api.removeFavorite(item.id),
    onSuccess: () => {
      toast.success('已取消收藏')
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
    onError: () => {
      toast.error('取消收藏失败')
    },
  })

  const getScoreGradient = (score: number | null) => {
    if (!score) return 'from-gray-500 to-gray-600'
    if (score >= 90) return 'from-emerald-500 to-teal-500'
    if (score >= 70) return 'from-blue-500 to-cyan-500'
    if (score >= 50) return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-pink-500'
  }

  return (
    <div className="glass-card rounded-xl p-5 group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-medium text-white hover:text-violet-300 transition-colors flex items-start group/title"
          >
            <span className="line-clamp-2">{item.title}</span>
            <ExternalLink className="ml-2 h-4 w-4 shrink-0 opacity-0 group-hover/title:opacity-100 transition-opacity mt-0.5" />
          </a>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge
              variant="secondary"
              className="bg-white/10 text-white/70 border-0 hover:bg-white/15"
            >
              {item.platform}
            </Badge>
            {item.categories.map((cat) => (
              <Badge
                key={cat}
                variant="outline"
                className="border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
              >
                {cat}
              </Badge>
            ))}
          </div>

          {item.aiSummary && (
            <div className="mt-3 flex items-start space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
              <p className="text-xs text-white/40 line-clamp-2">{item.aiSummary}</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-white/30">
              {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('zh-CN') : ''}
            </span>
          </div>
        </div>

        {/* 分数和收藏 */}
        <div className="flex flex-col items-center space-y-2 ml-4">
          {item.aiScore ? (
            <div
              className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getScoreGradient(item.aiScore)} shadow-lg flex flex-col items-center justify-center`}
            >
              <span className="text-lg font-bold text-white leading-none">{item.aiScore}</span>
              <span className="text-[10px] text-white/70 leading-none mt-0.5">分</span>
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
              <span className="text-xs text-white/20">--</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white/40 hover:text-yellow-400 hover:bg-white/10"
            onClick={() => (isFavorited ? removeFavorite.mutate() : addFavorite.mutate())}
          >
            <Star className={`h-4 w-4 ${isFavorited ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  )
}

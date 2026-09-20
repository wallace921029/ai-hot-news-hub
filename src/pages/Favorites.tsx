import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { NewsCard } from '@/components/NewsCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Star, BookmarkPlus } from 'lucide-react'

export function FavoritesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.getFavorites(1, 100),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/25 flex items-center justify-center">
          <Star className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">我的收藏</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl bg-white/5" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <BookmarkPlus className="w-10 h-10 text-white/20" />
          </div>
          <p className="text-white/50 text-lg mb-2">暂无收藏</p>
          <p className="text-white/30 text-sm">在首页点击星标收藏感兴趣的内容</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.items.map((fav: any) =>
            fav.newsItem ? <NewsCard key={fav.id} item={fav.newsItem} isFavorited /> : null
          )}
        </div>
      )}
    </div>
  )
}

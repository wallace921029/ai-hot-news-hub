import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { NewsCard } from '@/components/NewsCard'
import { motion } from 'framer-motion'
import { pageTransition, staggerContainer, staggerItem } from '@/lib/animations'
import { Star, ChevronLeft, ChevronRight, Newspaper } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { Favorite } from '@/types'

export function FavoritesPage() {
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ['favorites', page],
    queryFn: () => api.getFavorites(page, 20),
  })

  const removeFavorite = useMutation({
    mutationFn: (newsId: number) => api.removeFavorite(newsId),
    onSuccess: () => {
      toast.success(t('favorites.removed'))
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
    onError: () => toast.error(t('favorites.removeFailed')),
  })

  return (
    <motion.div className="max-w-5xl mx-auto space-y-4" {...pageTransition}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h1 className="text-2xl font-semibold text-foreground flex items-center">
          <Star className="w-5 h-5 mr-2 text-foreground" />
          {t('favorites.title')}
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !data?.items.length ? (
              <div className="text-center py-16">
                <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">{t('favorites.empty')}</p>
                <p className="text-sm text-muted-foreground/60 mt-1">{t('favorites.emptyDesc')}</p>
              </div>
            ) : (
              <motion.div
                className="divide-y"
                variants={staggerContainer}
                initial="hidden"
                animate="show"
              >
                {data.items.map((fav: Favorite) =>
                  fav.newsItem ? (
                    <motion.div key={fav.id} variants={staggerItem}>
                      <NewsCard
                        item={fav.newsItem}
                        isFavorited
                        onFavorite={() => removeFavorite.mutate(fav.newsItem!.id)}
                      />
                    </motion.div>
                  ) : null
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <motion.div
          className="flex items-center justify-between px-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <span className="text-xs text-muted-foreground">
            {t('pagination.total', { total: data.pagination.total })}
          </span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {t('pagination.page', { current: page, total: data.pagination.totalPages })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={page >= data.pagination.totalPages}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

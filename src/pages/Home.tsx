import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useFilterStore } from '@/stores/filter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NewsCard } from '@/components/NewsCard'
import { motion } from 'framer-motion'
import { pageTransition, staggerContainer, staggerItem } from '@/lib/animations'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Rss,
  Globe,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { NewsItem } from '@/types'

const sourceTypeConfig = {
  api: { icon: Globe, labelKey: 'home.apiSource' },
  rss: { icon: Rss, labelKey: 'home.rssSource' },
  topic: { icon: MessageSquare, labelKey: 'home.topicSource' },
}

export function HomePage() {
  const {
    sourceType,
    sourceId,
    platform,
    search,
    page,
    setSourceType,
    setSourceId,
    setPlatform,
    setSearch,
    setPage,
  } = useFilterStore()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: sources } = useQuery({
    queryKey: ['news-sources', sourceType],
    queryFn: () => api.getNewsSources(sourceType),
  })

  const { data: platforms } = useQuery({
    queryKey: ['news-platforms', sourceType],
    queryFn: () => api.getPlatforms(sourceType),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['news', sourceType, sourceId, platform, search, page],
    queryFn: () =>
      api.getNews({
        page,
        pageSize: 30,
        sourceType,
        sourceId: sourceId || undefined,
        platform: platform || undefined,
        search: search || undefined,
      }),
  })

  const addFavorite = useMutation({
    mutationFn: (newsId: number) => api.addFavorite(newsId),
    onSuccess: () => {
      toast.success(t('home.favorited'))
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
    onError: () => toast.error(t('home.favoriteFailed')),
  })

  return (
    <motion.div className="max-w-5xl mx-auto space-y-4" {...pageTransition}>
      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('home.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
      </motion.div>

      {/* Source type tabs */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as 'api' | 'rss' | 'topic')}>
          <TabsList className="w-full justify-start">
            {(Object.keys(sourceTypeConfig) as Array<'api' | 'rss' | 'topic'>).map((type) => {
              const cfg = sourceTypeConfig[type]
              const Icon = cfg.icon
              const isDisabled = type === 'topic'

              return (
                <TabsTrigger
                  key={type}
                  value={type}
                  disabled={isDisabled}
                  className="flex items-center space-x-1.5"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t(cfg.labelKey)}</span>
                  {isDisabled && (
                    <span className="text-[10px] ml-1 opacity-50">{t('home.comingSoon')}</span>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="flex flex-col space-y-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={sourceId === null ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setSourceId(null)}
            >
              {t('home.allSources')}
            </Badge>
            {sources.map((source: { id: number; name: string }) => (
              <Badge
                key={source.id}
                variant={sourceId === source.id ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setSourceId(sourceId === source.id ? null : source.id)}
              >
                {source.name}
              </Badge>
            ))}
          </div>
        )}

        {platforms && platforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Badge
              variant={platform === null ? 'secondary' : 'outline'}
              className="cursor-pointer text-[11px] transition-colors"
              onClick={() => setPlatform(null)}
            >
              {t('home.allPlatforms')}
            </Badge>
            {platforms.map((p: string) => (
              <Badge
                key={p}
                variant={platform === p ? 'secondary' : 'outline'}
                className="cursor-pointer text-[11px] transition-colors"
                onClick={() => setPlatform(platform === p ? null : p)}
              >
                {p}
              </Badge>
            ))}
          </div>
        )}
      </motion.div>

      {/* News list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
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
            ) : data?.items.length === 0 ? (
              <div className="text-center py-16">
                <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">{t('home.noNews')}</p>
              </div>
            ) : (
              <motion.div
                className="divide-y"
                variants={staggerContainer}
                initial="hidden"
                animate="show"
              >
                {data?.items.map((item: NewsItem) => (
                  <motion.div key={item.id} variants={staggerItem}>
                    <NewsCard item={item} onFavorite={() => addFavorite.mutate(item.id)} />
                  </motion.div>
                ))}
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
          transition={{ duration: 0.3, delay: 0.3 }}
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

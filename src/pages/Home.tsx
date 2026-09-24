import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { debounce } from 'lodash-es'
import { api } from '@/services/api'
import { useFilterStore } from '@/stores/filter'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NewsCard } from '@/components/NewsCard'
import { motion } from 'framer-motion'
import { pageTransition, staggerContainer, staggerItem } from '@/lib/animations'
import { Search, Newspaper, Rss, Globe, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Pagination } from '@/components/Pagination'
import type { NewsItem } from '@/types'

const sourceTypeConfig = {
  rss: { icon: Rss, labelKey: 'home.rssSource' },
  api: { icon: Globe, labelKey: 'home.apiSource' },
  topic: { icon: MessageSquare, labelKey: 'home.topicSource' },
}

export function HomePage() {
  const {
    sourceType,
    sourceId,
    sourceCode,
    search,
    page,
    pageSize,
    setSourceType,
    setSourceId,
    setSourceCode,
    setSearch,
    setPage,
    setPageSize,
  } = useFilterStore()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = useState(search)
  const [lastPushed, setLastPushed] = useState(search)

  const debouncedSetSearch = useMemo(
    () =>
      debounce((value: string) => {
        setLastPushed(value)
        setSearch(value)
      }, 300),
    [setSearch]
  )

  useEffect(() => () => debouncedSetSearch.cancel(), [debouncedSetSearch])

  // 外部（如切换 tab、reset）修改 search 时同步回输入框（渲染期调整，React 官方模式）
  if (search !== lastPushed) {
    setLastPushed(search)
    setSearchInput(search)
  }

  const { data: sources } = useQuery({
    queryKey: ['news-sources', sourceType],
    queryFn: () => api.getNewsSources(sourceType),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['news', sourceType, sourceId, sourceCode, search, page, pageSize],
    queryFn: () =>
      api.getNews({
        page,
        pageSize,
        sourceType,
        sourceId: sourceId || undefined,
        sourceCode: sourceCode || undefined,
        search: search || undefined,
      }),
  })

  const { data: favoritesData } = useQuery({
    queryKey: ['favorites-ids'],
    queryFn: () => api.getFavorites(1, 1000),
  })

  const favoritedIds = new Set(
    (favoritesData?.items || [])
      .map((f: { newsItem?: { id: number } }) => f.newsItem?.id)
      .filter(Boolean)
  )

  const addFavorite = useMutation({
    mutationFn: (newsId: number) => api.addFavorite(newsId),
    onSuccess: () => {
      toast.success(t('home.favorited'))
      queryClient.invalidateQueries({ queryKey: ['favorites-ids'] })
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
    onError: () => toast.error(t('home.favoriteFailed')),
  })

  const removeFavorite = useMutation({
    mutationFn: (newsId: number) => api.removeFavorite(newsId),
    onSuccess: () => {
      toast.success(t('favorites.removed'))
      queryClient.invalidateQueries({ queryKey: ['favorites-ids'] })
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
    onError: () => toast.error(t('favorites.removeFailed')),
  })

  return (
    <motion.div className="max-w-4xl mx-auto space-y-4" {...pageTransition}>
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
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              debouncedSetSearch(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                debouncedSetSearch.cancel()
                setLastPushed(searchInput)
                setSearch(searchInput)
              }
            }}
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
              variant={sourceId === null && sourceCode === null ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => {
                setSourceId(null)
                setSourceCode(null)
              }}
            >
              {t('home.allSources')}
            </Badge>
            {sources.map((source: { id: number | null; code?: string | null; name: string }) => {
              const isBuiltin = source.id == null && !!source.code
              const selected = isBuiltin ? sourceCode === source.code : sourceId === source.id
              return (
                <Badge
                  key={isBuiltin ? `code:${source.code}` : `id:${source.id}`}
                  variant={selected ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => {
                    if (isBuiltin) {
                      setSourceCode(sourceCode === source.code ? null : source.code!)
                    } else {
                      setSourceId(sourceId === source.id ? null : (source.id as number))
                    }
                  }}
                >
                  {source.name}
                </Badge>
              )
            })}
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
                    <NewsCard
                      item={item}
                      isFavorited={favoritedIds.has(item.id)}
                      onFavorite={() =>
                        favoritedIds.has(item.id)
                          ? removeFavorite.mutate(item.id)
                          : addFavorite.mutate(item.id)
                      }
                    />
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Pagination
            page={page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </motion.div>
      )}
    </motion.div>
  )
}

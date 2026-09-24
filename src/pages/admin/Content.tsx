import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { debounce } from 'lodash-es'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Trash2,
  FileText,
  ExternalLink,
  Clock,
  Search,
  Globe,
  Rss,
  MessageSquare,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Pagination } from '@/components/Pagination'
import type { NewsItem } from '@/types'

const sourceTypeConfig = {
  rss: { icon: Rss, labelKey: 'home.rssSource' },
  api: { icon: Globe, labelKey: 'home.apiSource' },
  topic: { icon: MessageSquare, labelKey: 'home.topicSource' },
}

export function AdminContent() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sourceType, setSourceType] = useState<'api' | 'rss' | 'topic'>('rss')
  const [sourceId, setSourceId] = useState<number | null>(null)
  const [sourceCode, setSourceCode] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const debouncedSetSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearch(value)
        setPage(1)
      }, 300),
    []
  )

  useEffect(() => () => debouncedSetSearch.cancel(), [debouncedSetSearch])

  const { data: sources } = useQuery({
    queryKey: ['admin-sources'],
    queryFn: () => api.getSources(),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-content', page, pageSize, sourceType, sourceId, sourceCode, search],
    queryFn: () =>
      api.getAdminContent({
        page,
        pageSize,
        sourceType,
        sourceId: sourceId || undefined,
        sourceCode: sourceCode || undefined,
        search: search || undefined,
      }),
  })

  const filteredSources = (sources || []).filter(
    (s: { sourceType?: string }) => s.sourceType === sourceType
  )

  const handleSourceTypeChange = (value: string) => {
    setSourceType(value as 'api' | 'rss' | 'topic')
    setSourceId(null)
    setSourceCode(null)
    setPage(1)
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteContent(id),
    onSuccess: () => {
      toast.success(t('admin.content.deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-content'] })
    },
    onError: () => toast.error(t('common.failed')),
  })

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t('admin.content.title')}</h1>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.content.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.content.total', { count: data?.pagination?.total || 0 })}
          </p>
        </div>
      </div>

      {/* Filters（参考首页） */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin.content.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              debouncedSetSearch(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                debouncedSetSearch.cancel()
                setSearch(searchInput)
                setPage(1)
              }
            }}
            className="pl-10 h-10"
          />
        </div>

        <Tabs value={sourceType} onValueChange={handleSourceTypeChange}>
          <TabsList className="justify-start">
            {(Object.keys(sourceTypeConfig) as Array<'api' | 'rss' | 'topic'>).map((type) => {
              const cfg = sourceTypeConfig[type]
              const Icon = cfg.icon
              return (
                <TabsTrigger key={type} value={type} className="flex items-center space-x-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t(cfg.labelKey)}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>

        {filteredSources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={sourceId === null && sourceCode === null ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => {
                setSourceId(null)
                setSourceCode(null)
                setPage(1)
              }}
            >
              {t('home.allSources')}
            </Badge>
            {filteredSources.map(
              (source: { id: number | null; code?: string | null; name: string }) => {
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
                      setPage(1)
                    }}
                  >
                    {source.name}
                  </Badge>
                )
              }
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card text-card-foreground overflow-hidden">
        {!data?.items?.length ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t('admin.content.noContent')}</p>
          </div>
        ) : (
          <div className="p-2">
            {data.items.map((item: NewsItem) => {
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
                <div
                  key={item.id}
                  className="group flex items-center gap-3 py-2.5 px-4 hover:bg-accent/50 rounded-lg transition-colors"
                >
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {item.sourceName && (
                      <span className="text-xs text-primary/70 font-medium shrink-0 whitespace-nowrap">
                        {item.sourceName}
                      </span>
                    )}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground/80 group-hover:text-foreground transition-colors truncate hover:underline"
                    >
                      {item.title}
                    </a>
                  </div>

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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground/30 hover:text-destructive shrink-0"
                      onClick={() => setPendingDeleteId(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.content.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.content.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDeleteId !== null) deleteMutation.mutate(pendingDeleteId)
                setPendingDeleteId(null)
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

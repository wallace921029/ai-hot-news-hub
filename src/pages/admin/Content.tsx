import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Trash2, FileText, ExternalLink, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Pagination } from '@/components/Pagination'
import type { NewsItem } from '@/types'

export function AdminContent() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-content', page, pageSize],
    queryFn: () => api.getAdminContent({ page, pageSize }),
  })

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
                      onClick={() => {
                        if (confirm(t('admin.content.deleteConfirm'))) {
                          deleteMutation.mutate(item.id)
                        }
                      }}
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
    </div>
  )
}

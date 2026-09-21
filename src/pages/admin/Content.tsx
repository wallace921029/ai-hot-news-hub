import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Trash2, RefreshCw, FileText } from 'lucide-react'
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

  const fetchAllMutation = useMutation({
    mutationFn: () => api.fetchAllContent(),
    onSuccess: () => {
      toast.success(t('admin.content.fetchTriggered'))
    },
    onError: () => toast.error(t('common.failed')),
  })

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
        <Button
          type="button"
          variant="outline"
          onClick={() => fetchAllMutation.mutate()}
          disabled={fetchAllMutation.isPending}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 shrink-0 ${fetchAllMutation.isPending ? 'animate-spin' : ''}`}
          />
          {t('admin.sources.fetchAll')}
        </Button>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground overflow-hidden">
        {!data?.items?.length ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t('admin.content.noContent')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {data.items.map((item: NewsItem) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-foreground hover:text-primary transition-colors line-clamp-1"
                  >
                    {item.title}
                  </a>
                  <div className="flex items-center space-x-2 mt-1">
                    {item.sourceName && (
                      <span className="text-xs text-primary">{item.sourceName}</span>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {item.platform}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.fetchedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive shrink-0"
                  onClick={() => {
                    if (confirm(t('admin.content.deleteConfirm'))) {
                      deleteMutation.mutate(item.id)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
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

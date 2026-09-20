import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { FetchLog } from '@/types'

export function AdminLogs() {
  const [fetchPage, setFetchPage] = useState(1)
  const { t } = useTranslation()

  const { data: fetchLogs } = useQuery({
    queryKey: ['fetch-logs', fetchPage],
    queryFn: () => api.getFetchLogs({ page: fetchPage, pageSize: 20 }),
  })

  const { data: errorLogs } = useQuery({
    queryKey: ['error-logs'],
    queryFn: () => api.getErrorLogs({ page: 1, pageSize: 50 }),
  })

  const renderPagination = (page: number, totalPages: number, setPage: (p: number) => void) => {
    if (totalPages <= 1) return null
    return (
      <div className="flex items-center justify-center space-x-2 pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-muted">
          <span className="text-sm text-foreground">{page}</span>
          <span className="text-sm text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground">{totalPages}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('admin.logs.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.logs.subtitle')}</p>
      </div>

      {/* Fetch logs */}
      <div className="rounded-xl border bg-card text-card-foreground p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">
          {t('admin.logs.fetchLogs')}
        </h2>
        {!fetchLogs?.items.length ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t('admin.logs.noFetchLogs')}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {fetchLogs.items.map((log: FetchLog) => (
              <div
                key={log.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/50"
              >
                <div className="flex items-center space-x-3">
                  <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                    {log.status === 'success' ? t('admin.logs.success') : t('admin.logs.failed')}
                  </Badge>
                  <span className="text-sm text-foreground/70">
                    {t('admin.logs.fetch')} #{log.sourceId}
                  </span>
                  {log.count !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {t('admin.logs.items', { count: log.count })}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  {log.error && (
                    <span className="text-xs text-destructive/60 truncate max-w-[200px]">
                      {log.error}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{log.duration}ms</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        {renderPagination(fetchPage, fetchLogs?.pagination.totalPages || 1, setFetchPage)}
      </div>

      {/* Error logs */}
      <div className="rounded-xl border bg-card text-card-foreground p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">
          {t('admin.logs.errorLogs')}
        </h2>
        {!errorLogs?.items.length ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-success/20 mx-auto mb-3" />
            <p className="text-muted-foreground">{t('admin.logs.noErrorLogs')}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {errorLogs.items.map(
              (
                log: { type: string; sourceId?: number; error?: string; createdAt: string },
                index: number
              ) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center space-x-3">
                    <Badge variant="destructive">
                      {log.type === 'fetch' ? t('admin.logs.fetch') : t('admin.logs.system')}
                    </Badge>
                    <span className="text-sm text-foreground/70">
                      {t('admin.logs.fetch')} #{log.sourceId}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {log.error && (
                      <span className="text-xs text-destructive/60 truncate max-w-[300px]">
                        {log.error}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

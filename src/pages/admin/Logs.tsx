import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FileText, AlertTriangle, CheckCircle, History } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Pagination } from '@/components/Pagination'
import type { FetchLog } from '@/types'

interface AlertItem {
  id: number
  sourceId: number | null
  sourceName: string | null
  alertType: string
  message: string
  details: unknown
  resolved: boolean
  createdAt: string
  resolvedAt: string | null
}

interface AuditLogItem {
  id: number
  userId: number | null
  username: string | null
  action: string
  resource: string
  resourceId: string | null
  details: unknown
  ipAddress: string | null
  createdAt: string
}

export function AdminLogs() {
  const [fetchPage, setFetchPage] = useState(1)
  const [fetchPageSize, setFetchPageSize] = useState(10)
  const [alertPage, setAlertPage] = useState(1)
  const [alertPageSize, setAlertPageSize] = useState(10)
  const [auditPage, setAuditPage] = useState(1)
  const [auditPageSize, setAuditPageSize] = useState(10)
  const [alertTab, setAlertTab] = useState<'active' | 'resolved'>('active')
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: fetchLogs } = useQuery({
    queryKey: ['fetch-logs', fetchPage, fetchPageSize],
    queryFn: () => api.getFetchLogs({ page: fetchPage, pageSize: fetchPageSize }),
  })

  const { data: errorLogs } = useQuery({
    queryKey: ['error-logs'],
    queryFn: () => api.getErrorLogs({ page: 1, pageSize: 50 }),
  })

  const { data: alerts } = useQuery({
    queryKey: ['admin-alerts', alertPage, alertPageSize, alertTab],
    queryFn: () =>
      api.getAlerts({
        page: alertPage,
        pageSize: alertPageSize,
        resolved: alertTab === 'resolved',
      }),
  })

  const { data: auditLogs } = useQuery({
    queryKey: ['admin-audit', auditPage, auditPageSize],
    queryFn: () => api.getAuditLogs({ page: auditPage, pageSize: auditPageSize }),
  })

  const resolveMutation = useMutation({
    mutationFn: (id: number) => api.resolveAlert(id),
    onSuccess: () => {
      toast.success('告警已解决')
      queryClient.invalidateQueries({ queryKey: ['admin-alerts'] })
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('admin.logs.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.logs.subtitle')}</p>
      </div>

      <Tabs defaultValue="fetch" className="w-full">
        <TabsList>
          <TabsTrigger value="fetch">{t('admin.logs.fetchLogs')}</TabsTrigger>
          <TabsTrigger value="errors">{t('admin.logs.errorLogs')}</TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            告警
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            操作审计
          </TabsTrigger>
        </TabsList>

        {/* Fetch logs */}
        <TabsContent value="fetch">
          <div className="rounded-xl border bg-card text-card-foreground p-5">
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
                        {log.status === 'success'
                          ? t('admin.logs.success')
                          : t('admin.logs.failed')}
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
            {fetchLogs && fetchLogs.pagination.totalPages > 1 && (
              <div className="pt-4">
                <Pagination
                  page={fetchPage}
                  totalPages={fetchLogs.pagination.totalPages}
                  total={fetchLogs.pagination.total}
                  pageSize={fetchPageSize}
                  onPageChange={setFetchPage}
                  onPageSizeChange={setFetchPageSize}
                />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Error logs */}
        <TabsContent value="errors">
          <div className="rounded-xl border bg-card text-card-foreground p-5">
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
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={alertTab === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setAlertTab('active')
                  setAlertPage(1)
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                活跃告警
              </Button>
              <Button
                type="button"
                variant={alertTab === 'resolved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setAlertTab('resolved')
                  setAlertPage(1)
                }}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                已解决
              </Button>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground p-5">
              {!alerts?.items?.length ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-success/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {alertTab === 'active' ? '暂无活跃告警' : '暂无已解决告警'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.items.map((alert: AlertItem) => (
                    <div
                      key={alert.id}
                      className="flex items-start justify-between px-4 py-3 rounded-lg border bg-muted/30"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={alert.resolved ? 'outline' : 'destructive'}>
                            {alert.alertType === 'consecutive_failures'
                              ? '连续失败'
                              : alert.alertType}
                          </Badge>
                          {alert.sourceName && (
                            <span className="text-sm font-medium">{alert.sourceName}</span>
                          )}
                        </div>
                        <p className="text-sm text-foreground/80">{alert.message}</p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {!alert.resolved && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 ml-3"
                          onClick={() => resolveMutation.mutate(alert.id)}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                          解决
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {alerts && alerts.pagination?.totalPages > 1 && (
                <div className="pt-4">
                  <Pagination
                    page={alertPage}
                    totalPages={alerts.pagination.totalPages}
                    total={alerts.pagination.total}
                    pageSize={alertPageSize}
                    onPageChange={setAlertPage}
                    onPageSizeChange={setAlertPageSize}
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Audit logs */}
        <TabsContent value="audit">
          <div className="rounded-xl border bg-card text-card-foreground p-5">
            {!auditLogs?.items?.length ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">暂无操作日志</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {auditLogs.items.map((log: AuditLogItem) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{log.action}</Badge>
                      <Badge variant="secondary">{log.resource}</Badge>
                      {log.resourceId && (
                        <span className="text-xs text-muted-foreground">#{log.resourceId}</span>
                      )}
                      <span className="text-sm text-foreground/70">{log.username || '-'}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      {log.ipAddress && (
                        <span className="text-xs text-muted-foreground">{log.ipAddress}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {auditLogs && auditLogs.pagination?.totalPages > 1 && (
              <div className="pt-4">
                <Pagination
                  page={auditPage}
                  totalPages={auditLogs.pagination.totalPages}
                  total={auditLogs.pagination.total}
                  pageSize={auditPageSize}
                  onPageChange={setAuditPage}
                  onPageSizeChange={setAuditPageSize}
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

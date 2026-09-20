import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import type { FetchLog } from '@/types'

export function AdminLogs() {
  const [fetchPage, setFetchPage] = useState(1)

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
          variant="ghost"
          size="sm"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          className="text-white/50 hover:text-white hover:bg-white/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white/5">
          <span className="text-sm text-white/70">{page}</span>
          <span className="text-sm text-white/30">/</span>
          <span className="text-sm text-white/50">{totalPages}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          className="text-white/50 hover:text-white hover:bg-white/10"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">日志查看</h1>
        <p className="text-sm text-white/40 mt-1">查看系统运行日志</p>
      </div>

      {/* 抓取日志 */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">抓取日志</h2>
        {!fetchLogs?.items.length ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30">暂无抓取日志</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {fetchLogs.items.map((log: FetchLog) => (
              <div
                key={log.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.03]"
              >
                <div className="flex items-center space-x-3">
                  <Badge
                    className={
                      log.status === 'success'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }
                  >
                    {log.status === 'success' ? '成功' : '失败'}
                  </Badge>
                  <span className="text-sm text-white/70">数据源 #{log.sourceId}</span>
                  {log.count !== undefined && (
                    <span className="text-xs text-white/30">{log.count} 条</span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  {log.error && (
                    <span className="text-xs text-red-400/60 truncate max-w-[200px]">
                      {log.error}
                    </span>
                  )}
                  <span className="text-xs text-white/20">{log.duration}ms</span>
                  <span className="text-xs text-white/20">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        {renderPagination(fetchPage, fetchLogs?.pagination.totalPages || 1, setFetchPage)}
      </div>

      {/* 错误日志 */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">错误日志</h2>
        {!errorLogs?.items.length ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-emerald-400/20 mx-auto mb-3" />
            <p className="text-white/30">暂无错误日志</p>
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
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.03]"
                >
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      {log.type === 'fetch' ? '抓取' : '系统'}
                    </Badge>
                    <span className="text-sm text-white/70">数据源 #{log.sourceId}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {log.error && (
                      <span className="text-xs text-red-400/60 truncate max-w-[300px]">
                        {log.error}
                      </span>
                    )}
                    <span className="text-xs text-white/20">
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

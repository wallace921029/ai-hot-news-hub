import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle } from 'lucide-react'
import type { FetchLog, AILog } from '@/types'

export function AdminLogs() {
  const [fetchPage, setFetchPage] = useState(1)
  const [aiPage, setAiPage] = useState(1)

  const { data: fetchLogs } = useQuery({
    queryKey: ['fetch-logs', fetchPage],
    queryFn: () => api.getFetchLogs({ page: fetchPage, pageSize: 20 }),
  })

  const { data: aiLogs } = useQuery({
    queryKey: ['ai-logs', aiPage],
    queryFn: () => api.getAILogs({ page: aiPage, pageSize: 20 }),
  })

  const { data: errorLogs } = useQuery({
    queryKey: ['error-logs'],
    queryFn: () => api.getErrorLogs({ page: 1, pageSize: 50 }),
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">日志查看</h1>

      <Tabs defaultValue="fetch">
        <TabsList>
          <TabsTrigger value="fetch">抓取日志</TabsTrigger>
          <TabsTrigger value="ai">AI 处理日志</TabsTrigger>
          <TabsTrigger value="errors">错误日志</TabsTrigger>
        </TabsList>

        <TabsContent value="fetch" className="space-y-4">
          {fetchLogs?.items.map((log: FetchLog) => (
            <Card key={log.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                      {log.status === 'success' ? '成功' : '失败'}
                    </Badge>
                    <span className="text-sm">数据源 #{log.sourceId}</span>
                    {log.count !== undefined && (
                      <span className="text-sm text-muted-foreground">{log.count} 条</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>{log.duration}ms</span>
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                {log.error && <p className="text-sm text-red-500 mt-2">{log.error}</p>}
              </CardContent>
            </Card>
          ))}
          {fetchLogs && fetchLogs.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFetchPage(fetchPage - 1)}
                disabled={fetchPage <= 1}
              >
                上一页
              </Button>
              <span className="text-sm">
                {fetchPage} / {fetchLogs.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFetchPage(fetchPage + 1)}
                disabled={fetchPage >= fetchLogs.pagination.totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          {aiLogs?.items.map((log: AILog) => (
            <Card key={log.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                      {log.status === 'success' ? '成功' : '失败'}
                    </Badge>
                    <span className="text-sm">新闻 #{log.newsItemId}</span>
                    {log.tokensUsed && (
                      <span className="text-sm text-muted-foreground">{log.tokensUsed} tokens</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>{log.duration}ms</span>
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                {log.error && <p className="text-sm text-red-500 mt-2">{log.error}</p>}
              </CardContent>
            </Card>
          ))}
          {aiLogs && aiLogs.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiPage(aiPage - 1)}
                disabled={aiPage <= 1}
              >
                上一页
              </Button>
              <span className="text-sm">
                {aiPage} / {aiLogs.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiPage(aiPage + 1)}
                disabled={aiPage >= aiLogs.pagination.totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          {errorLogs?.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无错误日志</p>
            </div>
          ) : (
            errorLogs?.items.map(
              (
                log: {
                  type: string
                  sourceId?: number
                  newsItemId?: number
                  error?: string
                  createdAt: string
                },
                index: number
              ) => (
                <Card key={index}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="destructive">{log.type === 'fetch' ? '抓取' : 'AI'}</Badge>
                        <span className="text-sm">
                          {log.type === 'fetch'
                            ? `数据源 #${log.sourceId}`
                            : `新闻 #${log.newsItemId}`}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {log.error && <p className="text-sm text-red-500 mt-2">{log.error}</p>}
                  </CardContent>
                </Card>
              )
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

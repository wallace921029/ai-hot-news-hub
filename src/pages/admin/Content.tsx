import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Trash2,
  Edit,
  ExternalLink,
  RefreshCw,
  Brain,
  Play,
  Loader2,
  Sparkles,
  FileText,
} from 'lucide-react'

function getScoreGradient(score: number | null) {
  if (!score) return 'from-gray-500 to-gray-600'
  if (score >= 90) return 'from-emerald-500 to-teal-500'
  if (score >= 70) return 'from-blue-500 to-cyan-500'
  if (score >= 50) return 'from-yellow-500 to-orange-500'
  return 'from-red-500 to-pink-500'
}

interface ProcessingState {
  isProcessing: boolean
  current: number
  total: number
  currentItem: string
}

export function AdminContent() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [status, setStatus] = useState<string>('pending')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [editCategories, setEditCategories] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    current: 0,
    total: 0,
    currentItem: '',
  })
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['admin-content', page, pageSize, status],
    queryFn: () =>
      api.getAdminContent({
        page,
        pageSize,
        status: status || undefined,
      }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateContent(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      queryClient.invalidateQueries({ queryKey: ['admin-content'] })
      setEditDialogOpen(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '更新失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteContent(id),
    onSuccess: () => {
      toast.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['admin-content'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => api.batchDeleteContent(ids),
    onSuccess: () => {
      toast.success('批量删除成功')
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['admin-content'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '批量删除失败')
    },
  })

  const fetchMutation = useMutation({
    mutationFn: () => api.fetchAllContent(),
    onSuccess: () => {
      toast.success('抓取任务已触发，请稍候...')
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['admin-content'] }), 5000)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '抓取失败')
    },
  })

  const processSingle = useMutation({
    mutationFn: (id: number) => api.processContent(id),
    onMutate: (_id) => {
      setProcessingIds((prev) => new Set(prev).add(_id))
    },
    onSuccess: (_, _id) => {
      toast.success('处理完成')
      queryClient.invalidateQueries({ queryKey: ['admin-content'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '处理失败')
    },
    onSettled: (_, __, _id) => {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(_id)
        return next
      })
    },
  })

  const processItems = useCallback(
    async (items: any[]) => {
      if (items.length === 0) {
        toast.info('没有待处理的内容')
        return
      }

      setProcessing({
        isProcessing: true,
        current: 0,
        total: items.length,
        currentItem: '',
      })

      let processed = 0
      let failed = 0

      for (const item of items) {
        setProcessing((prev) => ({
          ...prev,
          current: processed + failed + 1,
          currentItem: item.title,
        }))

        try {
          await api.processContent(item.id)
          processed++
        } catch {
          failed++
        }

        setProcessing((prev) => ({
          ...prev,
          current: processed + failed,
        }))
      }

      setProcessing({
        isProcessing: false,
        current: 0,
        total: 0,
        currentItem: '',
      })

      toast.success(`处理完成：成功 ${processed}，失败 ${failed}`)
      queryClient.invalidateQueries({ queryKey: ['admin-content'] })
    },
    [queryClient]
  )

  const processBatch = useCallback(() => {
    const pendingItems = data?.items.filter((item: any) => item.status === 'pending') || []
    processItems(pendingItems)
  }, [data, processItems])

  const processSelected = useCallback(() => {
    const selectedItems =
      data?.items.filter(
        (item: any) =>
          selectedIds.has(item.id) && (item.status === 'pending' || item.status === 'failed')
      ) || []
    processItems(selectedItems)
  }, [data, selectedIds, processItems])

  const fetchAndProcessMutation = useMutation({
    mutationFn: () => api.fetchAndProcessContent(),
    onSuccess: () => {
      toast.success('抓取并处理任务已触发，请稍候...')
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['admin-content'] }), 10000)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '操作失败')
    },
  })

  const handleEdit = (item: any) => {
    setSelectedItem(item)
    setEditCategories(item.categories?.join(', ') || '')
    setEditDialogOpen(true)
  }

  const handleSave = () => {
    if (selectedItem) {
      const categories = editCategories
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      updateMutation.mutate({ id: selectedItem.id, data: { categories } })
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === data?.items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data?.items.map((item: any) => item.id)))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const pendingCount = data?.items.filter((item: any) => item.status === 'pending').length || 0
  const selectedPendingCount =
    data?.items.filter(
      (item: any) =>
        selectedIds.has(item.id) && (item.status === 'pending' || item.status === 'failed')
    ).length || 0

  return (
    <div className="space-y-6">
      {/* 标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">内容管理</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            onClick={() => fetchMutation.mutate()}
            disabled={fetchMutation.isPending || processing.isProcessing}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${fetchMutation.isPending ? 'animate-spin' : ''}`}
            />
            抓取数据
          </Button>
          <Button
            variant="ghost"
            onClick={processBatch}
            disabled={processing.isProcessing || pendingCount === 0}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            {processing.isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            全部处理 {pendingCount > 0 && `(${pendingCount})`}
          </Button>
          {selectedPendingCount > 0 && (
            <Button
              variant="ghost"
              onClick={processSelected}
              disabled={processing.isProcessing}
              className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
            >
              <Brain className="h-4 w-4 mr-2" />
              处理选中 ({selectedPendingCount})
            </Button>
          )}
          <Button
            onClick={() => fetchAndProcessMutation.mutate()}
            disabled={fetchAndProcessMutation.isPending || processing.isProcessing}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-lg shadow-violet-500/25"
          >
            <Play
              className={`h-4 w-4 mr-2 ${fetchAndProcessMutation.isPending ? 'animate-spin' : ''}`}
            />
            一键抓取并处理
          </Button>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/10">
              <SelectItem value="" className="text-white hover:bg-white/10">
                全部状态
              </SelectItem>
              <SelectItem value="pending" className="text-white hover:bg-white/10">
                待处理
              </SelectItem>
              <SelectItem value="processing" className="text-white hover:bg-white/10">
                解析中
              </SelectItem>
              <SelectItem value="processed" className="text-white hover:bg-white/10">
                已处理
              </SelectItem>
              <SelectItem value="failed" className="text-white hover:bg-white/10">
                失败
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 进度条 */}
      {processing.isProcessing && (
        <div className="glass-card rounded-xl p-4 border-violet-500/20">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-white/70">AI 处理中...</span>
              </div>
              <span className="text-white/50">
                {processing.current} / {processing.total}
              </span>
            </div>
            <Progress
              value={(processing.current / processing.total) * 100}
              className="h-1.5 bg-white/10"
            />
            {processing.currentItem && (
              <p className="text-xs text-white/30 truncate">当前：{processing.currentItem}</p>
            )}
          </div>
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">编辑分类</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">分类（逗号分隔）</Label>
              <Input
                value={editCategories}
                onChange={(e) => setEditCategories(e.target.value)}
                placeholder="AI, 技术, 开源"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <Button
              onClick={handleSave}
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            >
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 工具栏 */}
      {data && data.items.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedIds.size === data.items.length}
                onCheckedChange={toggleSelectAll}
                className="border-white/20 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
              />
              <Label className="text-sm cursor-pointer text-white/50" onClick={toggleSelectAll}>
                全选
              </Label>
              {selectedIds.size > 0 && (
                <span className="text-sm text-white/30">已选 {selectedIds.size} 项</span>
              )}
            </div>
            {selectedIds.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => {
                  if (confirm(`确定删除选中的 ${selectedIds.size} 条内容？`)) {
                    batchDeleteMutation.mutate(Array.from(selectedIds))
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                删除选中
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Label className="text-sm text-white/50">每页</Label>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v))
                setPage(1)
              }}
            >
              <SelectTrigger className="w-20 bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                <SelectItem value="10" className="text-white hover:bg-white/10">
                  10
                </SelectItem>
                <SelectItem value="15" className="text-white hover:bg-white/10">
                  15
                </SelectItem>
                <SelectItem value="20" className="text-white hover:bg-white/10">
                  20
                </SelectItem>
                <SelectItem value="50" className="text-white hover:bg-white/10">
                  50
                </SelectItem>
                <SelectItem value="100" className="text-white hover:bg-white/10">
                  100
                </SelectItem>
              </SelectContent>
            </Select>
            <Label className="text-sm text-white/50">条</Label>
          </div>
        </div>
      )}

      {/* 内容列表 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-white/20 border-t-violet-500 rounded-full animate-spin mx-auto" />
          <p className="text-white/30 mt-4">加载中...</p>
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/30">暂无内容</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((item: any) => (
            <div
              key={item.id}
              className={`glass-card rounded-xl p-4 ${
                selectedIds.has(item.id) ? 'border-violet-500/50 bg-violet-500/5' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={selectedIds.has(item.id)}
                  onCheckedChange={() => toggleSelect(item.id)}
                  className="mt-1 border-white/20 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                />
                <div className="flex-1 min-w-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-white hover:text-violet-300 transition-colors flex items-start group"
                  >
                    <span className="line-clamp-1">{item.title}</span>
                    <ExternalLink className="ml-2 h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                  </a>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge
                      variant="secondary"
                      className="bg-white/10 text-white/60 border-0 text-xs"
                    >
                      {item.platform}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs border ${
                        item.status === 'processed'
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                          : item.status === 'failed'
                            ? 'border-red-500/30 text-red-400 bg-red-500/10'
                            : item.status === 'processing'
                              ? 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                              : 'border-white/10 text-white/40'
                      }`}
                    >
                      {item.status === 'processed'
                        ? '已处理'
                        : item.status === 'failed'
                          ? '失败'
                          : item.status === 'processing'
                            ? '解析中'
                            : '待处理'}
                    </Badge>
                    {item.categories?.map((cat: string) => (
                      <Badge
                        key={cat}
                        variant="outline"
                        className="border-white/10 text-white/40 text-xs"
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                  {item.aiSummary && (
                    <div className="mt-2 flex items-start space-x-2">
                      <Sparkles className="w-3 h-3 text-violet-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-white/30 line-clamp-2">{item.aiSummary}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {item.aiScore ? (
                    <div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getScoreGradient(item.aiScore)} shadow-lg flex flex-col items-center justify-center`}
                    >
                      <span className="text-sm font-bold text-white leading-none">
                        {item.aiScore}
                      </span>
                      <span className="text-[8px] text-white/70 leading-none mt-0.5">分</span>
                    </div>
                  ) : null}
                  {(item.status === 'pending' || item.status === 'failed') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-white/40 hover:text-violet-400 hover:bg-violet-500/10"
                      onClick={() => processSingle.mutate(item.id)}
                      disabled={processingIds.has(item.id) || processing.isProcessing}
                    >
                      {processingIds.has(item.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Brain className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white/40 hover:text-white/70 hover:bg-white/10"
                    onClick={() => handleEdit(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => {
                      if (confirm('确定删除此内容？')) {
                        deleteMutation.mutate(item.id)
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(1)}
            disabled={page <= 1}
            className="text-white/50 hover:text-white hover:bg-white/10"
          >
            首页
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="text-white/50 hover:text-white hover:bg-white/10"
          >
            上一页
          </Button>
          <div className="flex items-center space-x-1 px-4 py-2 rounded-full glass-light">
            <span className="text-sm text-white/70">{page}</span>
            <span className="text-sm text-white/30">/</span>
            <span className="text-sm text-white/50">{data.pagination.totalPages}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= data.pagination.totalPages}
            className="text-white/50 hover:text-white hover:bg-white/10"
          >
            下一页
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(data.pagination.totalPages)}
            disabled={page >= data.pagination.totalPages}
            className="text-white/50 hover:text-white hover:bg-white/10"
          >
            末页
          </Button>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Trash2, ExternalLink, FileText, ChevronLeft, ChevronRight, Globe, Rss } from 'lucide-react'

const sourceTypeConfig = {
  api: { label: 'API', icon: Globe, className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  rss: {
    label: 'RSS',
    icon: Rss,
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  topic: {
    label: '话题',
    icon: FileText,
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
}

export function AdminContent() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sourceType, setSourceType] = useState<string>('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['admin-content', page, pageSize, sourceType],
    queryFn: () =>
      api.getAdminContent({
        page,
        pageSize,
        sourceType: sourceType || undefined,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteContent(id),
    onSuccess: () => {
      toast.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['admin-content'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : '删除失败'),
  })

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => api.batchDeleteContent(ids),
    onSuccess: () => {
      toast.success('批量删除成功')
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['admin-content'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : '批量删除失败'),
  })

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
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* 标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">内容管理</h1>
          <p className="text-sm text-white/40 mt-1">共 {data?.pagination.total || 0} 条内容</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center space-x-1 bg-white/[0.03] rounded-lg p-1 w-fit">
        {[
          { value: '', label: '全部' },
          { value: 'api', label: 'API' },
          { value: 'rss', label: 'RSS' },
          { value: 'topic', label: '话题' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setSourceType(option.value)
              setPage(1)
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              sourceType === option.value
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 工具栏 */}
      {data && data.items.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedIds.size === data.items.length && data.items.length > 0}
                onCheckedChange={toggleSelectAll}
                className="border-white/20 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
              />
              <span className="text-sm text-white/50 cursor-pointer" onClick={toggleSelectAll}>
                全选
              </span>
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
            <span className="text-sm text-white/50">每页</span>
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
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-white hover:bg-white/10">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* 表格 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-white/20 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : data?.items.length === 0 ? (
        <div className="glass-card rounded-xl text-center py-16">
          <FileText className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30">暂无内容</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={selectedIds.size === data.items.length && data.items.length > 0}
                    onCheckedChange={toggleSelectAll}
                    className="border-white/20 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  标题
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider w-20">
                  来源
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider w-20">
                  平台
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider w-36">
                  获取时间
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider w-16">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {data?.items.map((item: any) => {
                const stConfig =
                  sourceTypeConfig[item.sourceType as keyof typeof sourceTypeConfig] ||
                  sourceTypeConfig.api
                return (
                  <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        className="border-white/20 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white hover:text-violet-300 transition-colors flex items-center group max-w-lg"
                      >
                        <span className="truncate">{item.title}</span>
                        <ExternalLink className="ml-1.5 h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs border ${stConfig.className}`}>
                        {stConfig.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/50">{item.platform}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/30">
                        {item.fetchedAt
                          ? new Date(item.fetchedAt).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => {
                          if (confirm('确定删除？')) deleteMutation.mutate(item.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-4">
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
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white/5">
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
            <ChevronRight className="h-4 w-4" />
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

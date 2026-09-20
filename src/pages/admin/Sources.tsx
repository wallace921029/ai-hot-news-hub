import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Plus,
  RefreshCw,
  Wifi,
  Trash2,
  Edit,
  Rss,
  Globe,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import type { DataSource } from '@/types'

interface RssForm {
  name: string
  url: string
  parser: string
  enabled: boolean
  fetchInterval: number
  description: string
}

const defaultRssForm: RssForm = {
  name: '',
  url: '',
  parser: '',
  enabled: true,
  fetchInterval: 30,
  description: '',
}

function getStatusIcon(source: DataSource) {
  if (source.lastError) return <AlertCircle className="h-3.5 w-3.5 text-red-400" />
  if (source.lastFetchAt) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
  return <Clock className="h-3.5 w-3.5 text-white/30" />
}

function getTimeAgo(dateStr: string | null) {
  if (!dateStr) return '未抓取'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return `${Math.floor(diff / 86400)} 天前`
}

export function AdminSources() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<DataSource | null>(null)
  const [form, setForm] = useState<RssForm>(defaultRssForm)

  const { data: sources, isLoading } = useQuery({
    queryKey: ['admin-sources'],
    queryFn: () => api.getSources(),
  })

  const rssSources = sources?.filter((s) => s.type === 'rss') || []
  const apiSources = sources?.filter((s) => s.type === 'rest' || s.type === 'html') || []
  const apiSourcesWithErrors = apiSources.filter((s) => s.lastError)

  const createMutation = useMutation({
    mutationFn: (data: typeof defaultRssForm) =>
      api.createSource({ ...data, type: 'rss', method: 'GET' }),
    onSuccess: () => {
      toast.success('创建成功')
      queryClient.invalidateQueries({ queryKey: ['admin-sources'] })
      setDialogOpen(false)
      setForm(defaultRssForm)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DataSource> }) =>
      api.updateSource(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      queryClient.invalidateQueries({ queryKey: ['admin-sources'] })
      setDialogOpen(false)
      setEditingSource(null)
      setForm(defaultRssForm)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '更新失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteSource(id),
    onSuccess: () => {
      toast.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['admin-sources'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  const fetchMutation = useMutation({
    mutationFn: (id: number) => api.fetchSource(id),
    onSuccess: () => {
      toast.success('抓取任务已触发')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '触发失败')
    },
  })

  const testMutation = useMutation({
    mutationFn: (id: number) => api.testSource(id),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`连通性测试成功 (${data.status})`)
      } else {
        toast.error(`连通性测试失败: ${data.error || data.statusText}`)
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '测试失败')
    },
  })

  const handleSubmit = () => {
    if (editingSource) {
      updateMutation.mutate({ id: editingSource.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const handleEdit = (source: DataSource) => {
    setEditingSource(source)
    setForm({
      name: source.name,
      url: source.url,
      parser: source.parser || '',
      enabled: source.enabled,
      fetchInterval: source.fetchInterval,
      description: source.description || '',
    })
    setDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-white/20 border-t-violet-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">数据源管理</h1>
          <p className="text-sm text-white/40 mt-1">共 {sources?.length || 0} 个数据源</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingSource(null)
                setForm(defaultRssForm)
              }}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加 RSS 订阅
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingSource ? '编辑 RSS 订阅' : '添加 RSS 订阅'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/70">名称</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="RSS 订阅名称"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">URL</Label>
                <Input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://example.com/feed"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">解析器标识</Label>
                <Input
                  value={form.parser}
                  onChange={(e) => setForm({ ...form, parser: e.target.value })}
                  placeholder="可选，如 qbitai"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">抓取间隔（分钟）</Label>
                  <Input
                    type="number"
                    value={form.fetchInterval}
                    onChange={(e) =>
                      setForm({ ...form, fetchInterval: parseInt(e.target.value) || 30 })
                    }
                    min={5}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">描述</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="可选"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
                />
                <Label className="text-white/70">启用</Label>
              </div>
              <Button
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              >
                {editingSource ? '保存' : '创建'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rss">
        <div className="flex items-center justify-between">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger
              value="rss"
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50"
            >
              <Rss className="h-4 w-4 mr-2 text-orange-400" />
              RSS 订阅
              <Badge variant="secondary" className="ml-2 bg-white/10 text-white/50 text-xs">
                {rssSources.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="api"
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50"
            >
              <Globe className="h-4 w-4 mr-2 text-violet-400" />
              API 数据源
              <Badge variant="secondary" className="ml-2 bg-white/10 text-white/50 text-xs">
                {apiSources.length}
              </Badge>
              {apiSourcesWithErrors.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-red-500/20 text-red-400 text-xs">
                  {apiSourcesWithErrors.length} 异常
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* RSS Tab */}
        <TabsContent value="rss">
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white/60">RSS 订阅源</h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/50 hover:text-white hover:bg-white/10"
                onClick={() => {
                  const ids = rssSources.filter((s) => s.enabled).map((s) => s.id)
                  ids.forEach((id) => fetchMutation.mutate(id))
                  toast.success(`正在获取 ${ids.length} 个 RSS 源...`)
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                获取全部
              </Button>
            </div>
            {rssSources.length === 0 ? (
              <p className="text-sm text-white/30 py-8 text-center">
                暂无 RSS 订阅，点击右上角按钮添加
              </p>
            ) : (
              <div className="space-y-1.5">
                {rssSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {getStatusIcon(source)}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-white truncate">
                            {source.name}
                          </span>
                          {!source.enabled && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 bg-white/10 text-white/40"
                            >
                              禁用
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-white/30 truncate mt-0.5">{source.url}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-white/30 mr-2">
                        {getTimeAgo(source.lastFetchAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/10"
                        onClick={() => testMutation.mutate(source.id)}
                        title="测试连通性"
                      >
                        <Wifi className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/10"
                        onClick={() => fetchMutation.mutate(source.id)}
                        title="手动抓取"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/10"
                        onClick={() => handleEdit(source)}
                        title="编辑"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => {
                          if (confirm('确定删除此数据源？')) {
                            deleteMutation.mutate(source.id)
                          }
                        }}
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api">
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-white/30">系统内置数据源，不可添加或删除</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/50 hover:text-white hover:bg-white/10"
                onClick={() => {
                  const ids = apiSources.filter((s) => s.enabled).map((s) => s.id)
                  ids.forEach((id) => fetchMutation.mutate(id))
                  toast.success(`正在获取 ${ids.length} 个 API 源...`)
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                获取全部
              </Button>
            </div>
            <div className="space-y-1">
              {apiSources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {getStatusIcon(source)}
                    <div className="min-w-0 flex items-center space-x-2">
                      <span className="text-sm text-white/80 truncate">{source.name}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-white/10 text-white/30"
                      >
                        {source.type}
                      </Badge>
                      {!source.enabled && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 bg-white/10 text-white/30"
                        >
                          禁用
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {source.lastError ? (
                      <span className="text-xs text-red-400/60 truncate max-w-[200px]">
                        {source.lastError}
                      </span>
                    ) : (
                      <span className="text-xs text-white/20">
                        {getTimeAgo(source.lastFetchAt)}
                      </span>
                    )}
                    <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10"
                        onClick={() => testMutation.mutate(source.id)}
                        title="测试连通性"
                      >
                        <Wifi className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10"
                        onClick={() => fetchMutation.mutate(source.id)}
                        title="手动抓取"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, RefreshCw, Wifi, Trash2, Edit } from 'lucide-react'
import type { DataSource } from '@/types'

type SourceType = 'rest' | 'rss' | 'html'
type MethodType = 'GET' | 'POST'

const defaultSource: {
  name: string
  type: SourceType
  url: string
  method: MethodType
  parser: string
  enabled: boolean
  fetchInterval: number
  description: string
} = {
  name: '',
  type: 'rest',
  url: '',
  method: 'GET',
  parser: '',
  enabled: true,
  fetchInterval: 30,
  description: '',
}

export function AdminSources() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<DataSource | null>(null)
  const [form, setForm] = useState(defaultSource)

  const { data: sources, isLoading } = useQuery({
    queryKey: ['admin-sources'],
    queryFn: () => api.getSources(),
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof defaultSource) => api.createSource(data),
    onSuccess: () => {
      toast.success('创建成功')
      queryClient.invalidateQueries({ queryKey: ['admin-sources'] })
      setDialogOpen(false)
      setForm(defaultSource)
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
      setForm(defaultSource)
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
      type: source.type,
      url: source.url,
      method: source.method,
      parser: source.parser || '',
      enabled: source.enabled,
      fetchInterval: source.fetchInterval,
      description: source.description || '',
    })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">数据源管理</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingSource(null)
                setForm(defaultSource)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              添加数据源
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSource ? '编辑数据源' : '添加数据源'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>名称</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="数据源名称"
                />
              </div>
              <div className="space-y-2">
                <Label>类型</Label>
                <Select
                  value={form.type}
                  onValueChange={(value: 'rest' | 'rss' | 'html') =>
                    setForm({ ...form, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rest">REST API</SelectItem>
                    <SelectItem value="rss">RSS/Atom</SelectItem>
                    <SelectItem value="html">HTML 解析</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              {form.type === 'rest' && (
                <div className="space-y-2">
                  <Label>请求方法</Label>
                  <Select
                    value={form.method}
                    onValueChange={(value: 'GET' | 'POST') => setForm({ ...form, method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>解析器</Label>
                <Input
                  value={form.parser}
                  onChange={(e) => setForm({ ...form, parser: e.target.value })}
                  placeholder="解析器标识（可选）"
                />
              </div>
              <div className="space-y-2">
                <Label>抓取间隔（分钟）</Label>
                <Input
                  type="number"
                  value={form.fetchInterval}
                  onChange={(e) =>
                    setForm({ ...form, fetchInterval: parseInt(e.target.value) || 30 })
                  }
                  min={5}
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="数据源描述（可选）"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
                />
                <Label>启用</Label>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingSource ? '保存' : '创建'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">加载中...</div>
      ) : sources?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">暂无数据源</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sources?.map((source) => (
            <Card key={source.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{source.name}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline">{source.type}</Badge>
                      <Badge variant={source.enabled ? 'default' : 'secondary'}>
                        {source.enabled ? '启用' : '禁用'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testMutation.mutate(source.id)}
                    >
                      <Wifi className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchMutation.mutate(source.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(source)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('确定删除此数据源？')) {
                          deleteMutation.mutate(source.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground truncate">{source.url}</p>
                {source.description && (
                  <p className="text-sm text-muted-foreground mt-1">{source.description}</p>
                )}
                <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                  <span>
                    上次抓取：
                    {source.lastFetchAt ? new Date(source.lastFetchAt).toLocaleString() : '未抓取'}
                  </span>
                  {source.lastError && (
                    <span className="text-red-500 truncate ml-2">{source.lastError}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { useTranslation } from 'react-i18next'
import type { DataSource } from '@/types'

interface RssForm {
  name: string
  url: string
  enabled: boolean
  description: string
}

const defaultRssForm: RssForm = {
  name: '',
  url: '',
  enabled: true,
  description: '',
}

function getStatusIcon(source: DataSource) {
  if (source.lastError) return <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
  if (source.lastFetchAt) return <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
  return <Clock className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
}

export function AdminSources() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<DataSource | null>(null)
  const [form, setForm] = useState<RssForm>(defaultRssForm)
  const [fetchingKey, setFetchingKey] = useState<string | null>(null)
  const [fetchingAll, setFetchingAll] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const { data: sources, isLoading } = useQuery({
    queryKey: ['admin-sources'],
    queryFn: () => api.getSources(),
  })

  const rssSources = sources?.filter((s: DataSource) => !s.builtin && s.type === 'rss') || []
  const apiSources = sources?.filter((s: DataSource) => s.builtin) || []
  const apiSourcesWithErrors = apiSources.filter((s) => s.lastError)

  const sourceKey = (source: DataSource) =>
    source.builtin ? `code:${source.code}` : `id:${source.id}`

  const createMutation = useMutation({
    mutationFn: (data: typeof defaultRssForm) =>
      api.createSource({ ...data, type: 'rss', sourceType: 'rss', method: 'GET' }),
    onSuccess: () => {
      toast.success(t('admin.sources.createSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-sources'] })
      setDialogOpen(false)
      setForm(defaultRssForm)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('admin.sources.createFailed'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DataSource> }) =>
      api.updateSource(id, data),
    onSuccess: () => {
      toast.success(t('admin.sources.updateSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-sources'] })
      setDialogOpen(false)
      setEditingSource(null)
      setForm(defaultRssForm)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('admin.sources.updateFailed'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteSource(id),
    onSuccess: () => {
      toast.success(t('admin.sources.deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-sources'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('admin.sources.deleteFailed'))
    },
  })

  const fetchAllMutation = useMutation({
    mutationFn: () => api.fetchAllContent(),
    onMutate: () => {
      setFetchingAll(true)
    },
    onSuccess: () => {
      toast.success(t('admin.sources.fetchTriggered'))
      queryClient.invalidateQueries({ queryKey: ['admin-sources'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('common.failed'))
    },
    onSettled: () => {
      // 延迟清除，让用户能看到旋转动画
      setTimeout(() => setFetchingAll(false), 500)
    },
  })

  const fetchMutation = useMutation({
    mutationFn: (source: DataSource) =>
      source.builtin ? api.fetchBuiltinSource(source.code!) : api.fetchSource(source.id!),
    onMutate: (source) => {
      setFetchingKey(sourceKey(source))
    },
    onSuccess: () => {
      toast.success(t('admin.sources.fetchTriggered'))
      queryClient.invalidateQueries({ queryKey: ['admin-sources'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('common.failed'))
    },
    onSettled: () => {
      // 延迟清除，让用户能看到旋转动画
      setTimeout(() => setFetchingKey(null), 500)
    },
  })

  const testMutation = useMutation({
    mutationFn: (source: DataSource) =>
      source.builtin ? api.testBuiltinSource(source.code!) : api.testSource(source.id!),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${t('admin.sources.testSuccess')} (${data.status})`)
      } else {
        toast.error(`${t('admin.sources.testFailed')}: ${data.error || data.statusText}`)
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('admin.sources.testFailed'))
    },
  })

  const toggleBuiltinMutation = useMutation({
    mutationFn: ({ code, enabled }: { code: string; enabled: boolean }) =>
      api.updateBuiltinSource(code, { enabled }),
    onSuccess: () => {
      toast.success(t('admin.sources.updateSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-sources'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('admin.sources.updateFailed'))
    },
  })

  const handleFetch = (e: React.MouseEvent, source: DataSource) => {
    e.preventDefault()
    e.stopPropagation()
    fetchMutation.mutate(source)
  }

  const handleFetchAll = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    fetchAllMutation.mutate()
  }

  const handleTest = (e: React.MouseEvent, source: DataSource) => {
    e.preventDefault()
    e.stopPropagation()
    testMutation.mutate(source)
  }

  const handleSubmit = () => {
    if (editingSource?.id != null) {
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
      enabled: source.enabled,
      description: source.description || '',
    })
    setDialogOpen(true)
  }

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return t('admin.sources.neverFetched')
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return t('time.justNow')
    if (diff < 3600) return t('time.minutesAgo', { count: Math.floor(diff / 60) })
    if (diff < 86400) return t('time.hoursAgo', { count: Math.floor(diff / 3600) })
    return t('time.daysAgo', { count: Math.floor(diff / 86400) })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.sources.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.sources.total', { count: sources?.length || 0 })}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              onClick={() => {
                setEditingSource(null)
                setForm(defaultRssForm)
              }}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.sources.addRss')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSource ? t('admin.sources.editRss') : t('admin.sources.addRss')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('admin.sources.name')}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('admin.sources.name')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.sources.url')}</Label>
                <Input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://example.com/feed"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.sources.description')}</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t('common.more')}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
                />
                <Label>{t('admin.sources.enabled')}</Label>
              </div>
              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full bg-foreground text-background hover:bg-foreground/90"
              >
                {editingSource ? t('common.save') : t('common.create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="rss">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="rss">
              <Rss className="h-4 w-4 mr-2 text-orange-500 shrink-0" />
              {t('admin.sources.rssSubscriptions')}
              <Badge variant="secondary" className="ml-2 text-xs">
                {rssSources.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="api">
              <Globe className="h-4 w-4 mr-2 text-violet-500 shrink-0" />
              {t('admin.sources.apiDataSources')}
              <Badge variant="secondary" className="ml-2 text-xs">
                {apiSources.length}
              </Badge>
              {apiSourcesWithErrors.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {apiSourcesWithErrors.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="rss">
          <div className="rounded-xl border bg-card text-card-foreground p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                {t('admin.sources.rssSubscriptions')}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFetchAll}
                disabled={fetchingAll}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1.5 shrink-0 ${fetchingAll ? 'animate-spin' : ''}`}
                />
                {t('admin.sources.fetchAll')}
              </Button>
            </div>
            {rssSources.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t('admin.sources.noRss')}
              </p>
            ) : (
              <div className="space-y-1.5">
                {rssSources.map((source) => (
                  <div
                    key={sourceKey(source)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {getStatusIcon(source)}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {source.name}
                          </span>
                          {!source.enabled && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {t('admin.sources.disabled')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {source.url}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-muted-foreground mr-2">
                        {getTimeAgo(source.lastFetchAt)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => handleTest(e, source)}
                        title={t('admin.sources.testConnectivity')}
                      >
                        <Wifi className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => handleFetch(e, source)}
                        disabled={fetchingKey === sourceKey(source)}
                        title={t('admin.sources.manualFetch')}
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${fetchingKey === sourceKey(source) ? 'animate-spin' : ''}`}
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEdit(source)}
                        title={t('common.edit')}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setPendingDeleteId(source.id)}
                        title={t('common.delete')}
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

        <TabsContent value="api">
          <div className="rounded-xl border bg-card text-card-foreground p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted-foreground">{t('admin.sources.systemBuiltIn')}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFetchAll}
                disabled={fetchingAll}
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${fetchingAll ? 'animate-spin' : ''}`} />
                {t('admin.sources.fetchAll')}
              </Button>
            </div>
            <div className="space-y-1">
              {apiSources.map((source) => (
                <div
                  key={sourceKey(source)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {getStatusIcon(source)}
                    <div className="min-w-0 flex items-center space-x-2">
                      <span className="text-sm text-foreground/80 truncate">{source.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {source.type}
                      </Badge>
                      {!source.enabled && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {t('admin.sources.disabled')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {source.lastError ? (
                      <span className="text-xs text-destructive/60 truncate max-w-[200px]">
                        {source.lastError}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {getTimeAgo(source.lastFetchAt)}
                      </span>
                    )}
                    <div className="flex items-center space-x-0.5">
                      <Switch
                        checked={source.enabled}
                        disabled={toggleBuiltinMutation.isPending}
                        onCheckedChange={(checked) =>
                          source.code &&
                          toggleBuiltinMutation.mutate({ code: source.code, enabled: checked })
                        }
                        aria-label={t('admin.sources.enabled')}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => handleTest(e, source)}
                        title={t('admin.sources.testConnectivity')}
                      >
                        <Wifi className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => handleFetch(e, source)}
                        disabled={fetchingKey === sourceKey(source)}
                        title={t('admin.sources.manualFetch')}
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${fetchingKey === sourceKey(source) ? 'animate-spin' : ''}`}
                        />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.sources.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.sources.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDeleteId !== null) deleteMutation.mutate(pendingDeleteId)
                setPendingDeleteId(null)
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Settings, Brain, RefreshCw, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AdminConfig() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [aiForm, setAiForm] = useState({
    aiApiKey: '',
    aiBaseUrl: '',
    aiModel: '',
  })
  const [basicForm, setBasicForm] = useState({
    inviteCode: '',
    registrationEnabled: true,
    fetchInterval: 30,
  })
  const [models, setModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [showModelList, setShowModelList] = useState(false)

  const { data: config, isLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => api.getConfig(),
  })

  const { data: autoFetchData } = useQuery({
    queryKey: ['auto-fetch'],
    queryFn: () => api.getAutoFetch(),
  })

  useEffect(() => {
    if (config) {
      setAiForm({
        aiApiKey: config.aiApiKey || '',
        aiBaseUrl: config.aiBaseUrl || '',
        aiModel: config.aiModel || '',
      })
      setBasicForm({
        inviteCode: config.inviteCode || '',
        registrationEnabled: config.registrationEnabled ?? true,
        fetchInterval: config.fetchInterval || 30,
      })
    }
  }, [config])

  const saveAiMutation = useMutation({
    mutationFn: () => {
      const data: Record<string, unknown> = { ...aiForm }
      if (data.aiApiKey === '***') delete data.aiApiKey
      return api.updateConfig(data)
    },
    onSuccess: () => {
      toast.success(t('admin.config.saveSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-config'] })
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t('admin.config.saveFailed')),
  })

  const saveBasicMutation = useMutation({
    mutationFn: () => api.updateConfig(basicForm),
    onSuccess: () => {
      toast.success(t('admin.config.saveSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-config'] })
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t('admin.config.saveFailed')),
  })

  const autoFetchMutation = useMutation({
    mutationFn: (enabled: boolean) => api.setAutoFetch(enabled),
    onSuccess: () => {
      toast.success(t('common.success'))
      queryClient.invalidateQueries({ queryKey: ['auto-fetch'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t('common.failed')),
  })

  const fetchModels = async () => {
    if (!aiForm.aiBaseUrl) {
      toast.error(t('admin.config.saveFailed'))
      return
    }
    const apiKey = aiForm.aiApiKey || config?.aiApiKey
    if (!apiKey) {
      toast.error(t('admin.config.saveFailed'))
      return
    }
    setLoadingModels(true)
    try {
      const result = await api.getAIModels(aiForm.aiBaseUrl, apiKey)
      setModels(result.models)
      setShowModelList(true)
      if (result.models.length === 0) toast.info(t('admin.config.noModels'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.config.modelsFetchFailed'))
    } finally {
      setLoadingModels(false)
    }
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('admin.config.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.config.subtitle')}</p>
      </div>

      <Tabs defaultValue="ai">
        <TabsList>
          <TabsTrigger value="ai">
            <Brain className="h-4 w-4 mr-2 shrink-0" />
            {t('admin.config.aiModel')}
          </TabsTrigger>
          <TabsTrigger value="basic">
            <Settings className="h-4 w-4 mr-2 shrink-0" />
            {t('admin.config.basicSettings')}
          </TabsTrigger>
          <TabsTrigger value="fetch">
            <Clock className="h-4 w-4 mr-2 shrink-0" />
            {t('admin.config.fetchSettings')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          <div className="rounded-xl border bg-card text-card-foreground p-5 space-y-4">
            <div className="space-y-2">
              <Label>{t('admin.config.apiKey')}</Label>
              <Input
                type="password"
                value={aiForm.aiApiKey}
                onChange={(e) => setAiForm({ ...aiForm, aiApiKey: e.target.value })}
                placeholder={t('admin.config.apiKey')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.config.baseUrl')}</Label>
              <Input
                value={aiForm.aiBaseUrl}
                onChange={(e) => setAiForm({ ...aiForm, aiBaseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('admin.config.modelName')}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={fetchModels}
                  disabled={loadingModels}
                >
                  <RefreshCw
                    className={`h-3 w-3 mr-1 shrink-0 ${loadingModels ? 'animate-spin' : ''}`}
                  />
                  {t('admin.config.getModels')}
                </Button>
              </div>
              <div className="relative">
                <Input
                  value={aiForm.aiModel}
                  onChange={(e) => setAiForm({ ...aiForm, aiModel: e.target.value })}
                  placeholder={t('admin.config.modelName')}
                />
                {showModelList && models.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {models.map((model) => (
                      <button
                        key={model}
                        className="w-full text-left px-3 py-2 text-sm text-foreground/70 hover:bg-accent hover:text-foreground transition-colors"
                        onClick={() => {
                          setAiForm({ ...aiForm, aiModel: model })
                          setShowModelList(false)
                        }}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button
              type="button"
              onClick={() => saveAiMutation.mutate()}
              disabled={saveAiMutation.isPending}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {t('admin.config.saveAiConfig')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="basic">
          <div className="rounded-xl border bg-card text-card-foreground p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('admin.config.openRegistration')}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('admin.config.openRegistrationDesc')}
                </p>
              </div>
              <Switch
                checked={basicForm.registrationEnabled}
                onCheckedChange={(checked) =>
                  setBasicForm({ ...basicForm, registrationEnabled: checked })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.config.inviteCode')}</Label>
              <Input
                value={basicForm.inviteCode}
                onChange={(e) => setBasicForm({ ...basicForm, inviteCode: e.target.value })}
                placeholder={t('admin.config.inviteCode')}
              />
            </div>
            <Button
              type="button"
              onClick={() => saveBasicMutation.mutate()}
              disabled={saveBasicMutation.isPending}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {t('admin.config.saveBasicSettings')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="fetch">
          <div className="rounded-xl border bg-card text-card-foreground p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('admin.config.autoFetch')}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('admin.config.autoFetchDesc', { interval: basicForm.fetchInterval })}
                </p>
              </div>
              <Switch
                checked={autoFetchData?.enabled ?? false}
                onCheckedChange={(checked) => autoFetchMutation.mutate(checked)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.config.fetchInterval')}</Label>
              <Input
                type="number"
                value={basicForm.fetchInterval}
                onChange={(e) =>
                  setBasicForm({ ...basicForm, fetchInterval: parseInt(e.target.value) || 30 })
                }
                min={5}
                max={1440}
                className="max-w-xs"
              />
            </div>
            <Button
              type="button"
              onClick={() => saveBasicMutation.mutate()}
              disabled={saveBasicMutation.isPending}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {t('admin.config.saveFetchSettings')}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

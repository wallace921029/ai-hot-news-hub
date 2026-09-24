import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Settings, Brain, RefreshCw, Clock, Dices } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UserAvatar } from '@/components/UserAvatar'
import { randomSeed, avatarStyles, type AvatarStyleKey } from '@/lib/avatar'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function parseAgentAvatar(v: unknown): { style: AvatarStyleKey; seed: string } {
  const fallback = { style: 'adventurer' as AvatarStyleKey, seed: 'ai-agent' }
  if (typeof v !== 'string') return fallback
  const idx = v.indexOf(':')
  const style = idx > 0 ? v.slice(0, idx) : ''
  const seed = idx > 0 ? v.slice(idx + 1) : ''
  if (!(style in avatarStyles) || !seed) return fallback
  return { style: style as AvatarStyleKey, seed }
}

/** 智能体头像选择框（与用户资料页的头像选择一致：大预览 + 骰子 + 风格格子） */
function AgentAvatarDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  saving,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: string
  onSave: (avatar: string) => void
  saving: boolean
}) {
  const { t } = useTranslation()
  const parsed = parseAgentAvatar(initial)
  const [style, setStyle] = useState<AvatarStyleKey>(parsed.style)
  const [seed, setSeed] = useState(parsed.seed)

  useEffect(() => {
    if (open) {
      const p = parseAgentAvatar(initial)
      setStyle(p.style)
      setSeed(p.seed)
    }
  }, [open, initial])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.config.agentAvatarTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center gap-5">
            <UserAvatar avatar={`${style}:${seed}`} username="ai" size={88} />
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setSeed(randomSeed())}
            >
              <Dices className="w-4 h-4" />
              {t('profile.regenerate')}
            </Button>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {(Object.keys(avatarStyles) as AvatarStyleKey[]).map((key) => (
              <button
                key={key}
                type="button"
                title={key}
                onClick={() => setStyle(key)}
                className={cn(
                  'flex items-center justify-center rounded-xl p-1.5 border-2 transition-colors',
                  style === key
                    ? 'border-primary bg-accent'
                    : 'border-transparent hover:bg-accent/50'
                )}
              >
                <UserAvatar avatar={`${key}:${seed}`} username={key} size={44} />
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => onSave(`${style}:${seed}`)}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AdminConfig() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [aiForm, setAiForm] = useState({
    aiApiKey: '',
    aiBaseUrl: '',
    aiModel: '',
    aiAgentEnabled: false,
    aiAgentNickname: '',
    aiAgentPersona: '',
    aiAgentAvatar: '',
    aiAgentMaxTokens: null as number | null,
    aiAgentTemperature: 0.8,
    aiAgentTopP: null as number | null,
    aiAgentFrequencyPenalty: null as number | null,
    aiAgentPresencePenalty: null as number | null,
    aiAgentThinking: '' as '' | 'enabled' | 'disabled',
    aiAgentReasoningEffort: '' as
      '' | 'minimal' | 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max',
    aiAgentTimeout: 120,
    aiAgentThrottleEnabled: true,
    aiAgentDailyLimit: 20,
  })
  const [basicForm, setBasicForm] = useState({
    inviteCode: '',
    registrationEnabled: true,
    rssFetchInterval: 30,
    apiFetchInterval: 30,
  })
  const [models, setModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [showModelList, setShowModelList] = useState(false)
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false)

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
        aiAgentEnabled: config.aiAgentEnabled ?? false,
        aiAgentNickname: config.aiAgentNickname || '',
        aiAgentPersona: config.aiAgentPersona || '',
        aiAgentAvatar: config.aiAgentAvatar || '',
        aiAgentMaxTokens: config.aiAgentMaxTokens ?? null,
        aiAgentTemperature: config.aiAgentTemperature ?? 0.8,
        aiAgentTopP: config.aiAgentTopP ?? null,
        aiAgentFrequencyPenalty: config.aiAgentFrequencyPenalty ?? null,
        aiAgentPresencePenalty: config.aiAgentPresencePenalty ?? null,
        aiAgentThinking: config.aiAgentThinking ?? '',
        aiAgentReasoningEffort: config.aiAgentReasoningEffort ?? '',
        aiAgentTimeout: config.aiAgentTimeout ?? 120,
        aiAgentThrottleEnabled: config.aiAgentThrottleEnabled ?? true,
        aiAgentDailyLimit: config.aiAgentDailyLimit ?? 20,
      })
      setBasicForm({
        inviteCode: config.inviteCode || '',
        registrationEnabled: config.registrationEnabled ?? true,
        rssFetchInterval: config.rssFetchInterval || 30,
        apiFetchInterval: config.apiFetchInterval || 30,
      })
    }
  }, [config])

  const saveAiMutation = useMutation({
    mutationFn: () => {
      const data: Record<string, unknown> = { ...aiForm }
      if (data.aiApiKey === '***') delete data.aiApiKey
      // 下拉"默认"以空字符串表示，后端只接受 null/枚举
      if (data.aiAgentThinking === '') data.aiAgentThinking = null
      if (data.aiAgentReasoningEffort === '') data.aiAgentReasoningEffort = null
      if (!data.aiAgentAvatar) delete data.aiAgentAvatar
      return api.updateConfig(data)
    },
    onSuccess: () => {
      toast.success(t('admin.config.saveSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-config'] })
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t('admin.config.saveFailed')),
  })

  const saveAvatarMutation = useMutation({
    mutationFn: (avatar: string) => api.updateConfig({ aiAgentAvatar: avatar }),
    onSuccess: (_, avatar) => {
      toast.success(t('admin.config.saveSuccess'))
      setAiForm((prev) => ({ ...prev, aiAgentAvatar: avatar }))
      queryClient.invalidateQueries({ queryKey: ['admin-config'] })
      setAvatarDialogOpen(false)
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
            <h4 className="text-[13px] font-semibold text-foreground/90 tracking-wide">
              {t('admin.config.groupConnection')}
            </h4>
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

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-[13px] font-semibold text-foreground/90 tracking-wide">
                {t('admin.config.groupAgent')}
              </h4>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('admin.config.agentEnabled')}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('admin.config.agentEnabledDesc')}
                  </p>
                </div>
                <Switch
                  checked={aiForm.aiAgentEnabled}
                  onCheckedChange={(checked) => setAiForm({ ...aiForm, aiAgentEnabled: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.config.agentNickname')}</Label>
                <Input
                  value={aiForm.aiAgentNickname}
                  onChange={(e) => setAiForm({ ...aiForm, aiAgentNickname: e.target.value })}
                  placeholder="润土"
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  {t('admin.config.agentNicknameDesc')}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t('admin.config.agentAvatar')}</Label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    title={t('admin.config.agentAvatarChange')}
                    onClick={() => setAvatarDialogOpen(true)}
                    className="rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <UserAvatar
                      avatar={aiForm.aiAgentAvatar || undefined}
                      username="ai"
                      size={48}
                      className="shrink-0 pointer-events-none"
                    />
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {t('admin.config.agentAvatarChange')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{t('admin.config.agentAvatarDesc')}</p>
              </div>
              <AgentAvatarDialog
                open={avatarDialogOpen}
                onOpenChange={setAvatarDialogOpen}
                initial={aiForm.aiAgentAvatar}
                saving={saveAvatarMutation.isPending}
                onSave={(avatar) => saveAvatarMutation.mutate(avatar)}
              />
              <div className="space-y-2">
                <Label>{t('admin.config.agentPersona')}</Label>
                <textarea
                  value={aiForm.aiAgentPersona}
                  onChange={(e) => setAiForm({ ...aiForm, aiAgentPersona: e.target.value })}
                  rows={5}
                  className="flex min-h-[120px] w-full rounded-xl border border-input bg-muted/40 px-3.5 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-background transition-colors resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  {t('admin.config.agentPersonaDesc')}
                </p>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-[13px] font-semibold text-foreground/90 tracking-wide">
                  {t('admin.config.groupSampling')}
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('admin.config.agentMaxTokens')}</Label>
                  <Input
                    type="number"
                    value={aiForm.aiAgentMaxTokens ?? ''}
                    placeholder={t('admin.config.agentOptional')}
                    onChange={(e) => {
                      const v = parseInt(e.target.value)
                      setAiForm({ ...aiForm, aiAgentMaxTokens: Number.isFinite(v) ? v : null })
                    }}
                    min={1}
                    className="max-w-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.config.agentTemperature')}</Label>
                  <Input
                    type="number"
                    step={0.1}
                    value={aiForm.aiAgentTemperature}
                    onChange={(e) =>
                      setAiForm({
                        ...aiForm,
                        aiAgentTemperature: parseFloat(e.target.value) || 0,
                      })
                    }
                    min={0}
                    max={2}
                    className="max-w-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.config.agentTopP')}</Label>
                  <Input
                    type="number"
                    step={0.05}
                    value={aiForm.aiAgentTopP ?? ''}
                    placeholder={t('admin.config.agentOptional')}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setAiForm({ ...aiForm, aiAgentTopP: Number.isFinite(v) ? v : null })
                    }}
                    min={0}
                    max={1}
                    className="max-w-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.config.agentFrequencyPenalty')}</Label>
                  <Input
                    type="number"
                    step={0.1}
                    value={aiForm.aiAgentFrequencyPenalty ?? ''}
                    placeholder={t('admin.config.agentOptional')}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setAiForm({
                        ...aiForm,
                        aiAgentFrequencyPenalty: Number.isFinite(v) ? v : null,
                      })
                    }}
                    min={-2}
                    max={2}
                    className="max-w-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.config.agentPresencePenalty')}</Label>
                  <Input
                    type="number"
                    step={0.1}
                    value={aiForm.aiAgentPresencePenalty ?? ''}
                    placeholder={t('admin.config.agentOptional')}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setAiForm({
                        ...aiForm,
                        aiAgentPresencePenalty: Number.isFinite(v) ? v : null,
                      })
                    }}
                    min={-2}
                    max={2}
                    className="max-w-xs"
                  />
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-[13px] font-semibold text-foreground/90 tracking-wide">
                  {t('admin.config.groupThinking')}
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('admin.config.agentThinking')}</Label>
                  <select
                    value={aiForm.aiAgentThinking}
                    onChange={(e) =>
                      setAiForm({
                        ...aiForm,
                        aiAgentThinking: e.target.value as '' | 'enabled' | 'disabled',
                      })
                    }
                    className="flex h-10 w-full max-w-xs rounded-xl border border-input bg-muted/40 px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">{t('admin.config.agentDefault')}</option>
                    <option value="enabled">{t('admin.config.agentThinkingOn')}</option>
                    <option value="disabled">{t('admin.config.agentThinkingOff')}</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {t('admin.config.agentThinkingDesc')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.config.agentReasoningEffort')}</Label>
                  <select
                    value={aiForm.aiAgentReasoningEffort}
                    onChange={(e) =>
                      setAiForm({
                        ...aiForm,
                        aiAgentReasoningEffort: e.target.value as
                          '' | 'minimal' | 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max',
                      })
                    }
                    className="flex h-10 w-full max-w-xs rounded-xl border border-input bg-muted/40 px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">{t('admin.config.agentDefault')}</option>
                    <option value="minimal">minimal（极简）</option>
                    <option value="none">none（无）</option>
                    <option value="low">low（轻度）</option>
                    <option value="medium">medium（中度）</option>
                    <option value="high">high（高度）</option>
                    <option value="xhigh">xhigh（超高）</option>
                    <option value="max">max（最深）</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {t('admin.config.agentReasoningEffortDesc')}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('admin.config.agentTimeout')}</Label>
                <Input
                  type="number"
                  value={aiForm.aiAgentTimeout}
                  onChange={(e) =>
                    setAiForm({ ...aiForm, aiAgentTimeout: parseInt(e.target.value) || 120 })
                  }
                  min={10}
                  max={600}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  {t('admin.config.agentTimeoutDesc')}
                </p>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-[13px] font-semibold text-foreground/90 tracking-wide">
                  {t('admin.config.groupThrottle')}
                </h4>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('admin.config.agentThrottle')}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('admin.config.agentThrottleDesc')}
                  </p>
                </div>
                <Switch
                  checked={aiForm.aiAgentThrottleEnabled}
                  onCheckedChange={(checked) =>
                    setAiForm({ ...aiForm, aiAgentThrottleEnabled: checked })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.config.agentDailyLimit')}</Label>
                <Input
                  type="number"
                  value={aiForm.aiAgentDailyLimit}
                  onChange={(e) =>
                    setAiForm({ ...aiForm, aiAgentDailyLimit: parseInt(e.target.value) || 0 })
                  }
                  min={0}
                  className="max-w-xs"
                />
              </div>
              <div className="pt-1">
                <Button
                  type="button"
                  onClick={() => saveAiMutation.mutate()}
                  disabled={saveAiMutation.isPending}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  {t('admin.config.saveAiConfig')}
                </Button>
              </div>
            </div>
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
                  {t('admin.config.autoFetchDesc')}
                </p>
              </div>
              <Switch
                checked={autoFetchData?.enabled ?? false}
                onCheckedChange={(checked) => autoFetchMutation.mutate(checked)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.config.rssFetchInterval')}</Label>
              <Input
                type="number"
                value={basicForm.rssFetchInterval}
                onChange={(e) =>
                  setBasicForm({
                    ...basicForm,
                    rssFetchInterval: parseInt(e.target.value) || 30,
                  })
                }
                min={5}
                max={1440}
                className="max-w-xs"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.config.apiFetchInterval')}</Label>
              <Input
                type="number"
                value={basicForm.apiFetchInterval}
                onChange={(e) =>
                  setBasicForm({
                    ...basicForm,
                    apiFetchInterval: parseInt(e.target.value) || 30,
                  })
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

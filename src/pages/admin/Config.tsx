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

export function AdminConfig() {
  const queryClient = useQueryClient()
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
      const data: any = { ...aiForm }
      if (data.aiApiKey === '***') delete data.aiApiKey
      return api.updateConfig(data)
    },
    onSuccess: () => {
      toast.success('AI 配置已保存')
      queryClient.invalidateQueries({ queryKey: ['admin-config'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : '保存失败'),
  })

  const saveBasicMutation = useMutation({
    mutationFn: () => api.updateConfig(basicForm),
    onSuccess: () => {
      toast.success('基本设置已保存')
      queryClient.invalidateQueries({ queryKey: ['admin-config'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : '保存失败'),
  })

  const autoFetchMutation = useMutation({
    mutationFn: (enabled: boolean) => api.setAutoFetch(enabled),
    onSuccess: () => {
      toast.success('已更新')
      queryClient.invalidateQueries({ queryKey: ['auto-fetch'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : '更新失败'),
  })

  const fetchModels = async () => {
    if (!aiForm.aiBaseUrl) {
      toast.error('请先填写 Base URL')
      return
    }
    const apiKey = aiForm.aiApiKey || config?.aiApiKey
    if (!apiKey) {
      toast.error('请先填写 API Key')
      return
    }
    setLoadingModels(true)
    try {
      const result = await api.getAIModels(aiForm.aiBaseUrl, apiKey)
      setModels(result.models)
      setShowModelList(true)
      if (result.models.length === 0) toast.info('未找到可用模型')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取模型列表失败')
    } finally {
      setLoadingModels(false)
    }
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
      <div>
        <h1 className="text-2xl font-bold text-white">系统配置</h1>
        <p className="text-sm text-white/40 mt-1">管理系统运行参数</p>
      </div>

      {/* Tab 切换 */}
      <Tabs defaultValue="ai">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger
            value="ai"
            className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50"
          >
            <Brain className="h-4 w-4 mr-2" />
            AI 模型
          </TabsTrigger>
          <TabsTrigger
            value="basic"
            className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50"
          >
            <Settings className="h-4 w-4 mr-2" />
            基本设置
          </TabsTrigger>
          <TabsTrigger
            value="fetch"
            className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50"
          >
            <Clock className="h-4 w-4 mr-2" />
            抓取设置
          </TabsTrigger>
        </TabsList>

        {/* AI 模型配置 */}
        <TabsContent value="ai">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">API Key</Label>
              <Input
                type="password"
                value={aiForm.aiApiKey}
                onChange={(e) => setAiForm({ ...aiForm, aiApiKey: e.target.value })}
                placeholder="输入 API Key"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Base URL</Label>
              <Input
                value={aiForm.aiBaseUrl}
                onChange={(e) => setAiForm({ ...aiForm, aiBaseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-white/70">模型名称</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-white/40 hover:text-white h-6 px-2"
                  onClick={fetchModels}
                  disabled={loadingModels}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${loadingModels ? 'animate-spin' : ''}`} />
                  获取模型列表
                </Button>
              </div>
              <div className="relative">
                <Input
                  value={aiForm.aiModel}
                  onChange={(e) => setAiForm({ ...aiForm, aiModel: e.target.value })}
                  placeholder="输入模型名称或点击上方按钮获取"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                {showModelList && models.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-900 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {models.map((model) => (
                      <button
                        key={model}
                        className="w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
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
              onClick={() => saveAiMutation.mutate()}
              disabled={saveAiMutation.isPending}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              保存 AI 配置
            </Button>
          </div>
        </TabsContent>

        {/* 基本设置 */}
        <TabsContent value="basic">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white/70">开放注册</Label>
                <p className="text-xs text-white/30 mt-0.5">关闭后新用户无法注册</p>
              </div>
              <Switch
                checked={basicForm.registrationEnabled}
                onCheckedChange={(checked) =>
                  setBasicForm({ ...basicForm, registrationEnabled: checked })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">邀请码</Label>
              <Input
                value={basicForm.inviteCode}
                onChange={(e) => setBasicForm({ ...basicForm, inviteCode: e.target.value })}
                placeholder="邀请码"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <Button
              onClick={() => saveBasicMutation.mutate()}
              disabled={saveBasicMutation.isPending}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              保存基本设置
            </Button>
          </div>
        </TabsContent>

        {/* 抓取设置 */}
        <TabsContent value="fetch">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white/70">自动定时抓取</Label>
                <p className="text-xs text-white/30 mt-0.5">开启后每 30 分钟自动抓取所有数据源</p>
              </div>
              <Switch
                checked={autoFetchData?.enabled ?? false}
                onCheckedChange={(checked) => autoFetchMutation.mutate(checked)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">抓取间隔（分钟）</Label>
              <Input
                type="number"
                value={basicForm.fetchInterval}
                onChange={(e) =>
                  setBasicForm({ ...basicForm, fetchInterval: parseInt(e.target.value) || 30 })
                }
                min={5}
                max={1440}
                className="bg-white/5 border-white/10 text-white max-w-xs"
              />
            </div>
            <Button
              onClick={() => saveBasicMutation.mutate()}
              disabled={saveBasicMutation.isPending}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              保存抓取设置
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

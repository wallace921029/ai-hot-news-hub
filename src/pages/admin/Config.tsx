import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export function AdminConfig() {
  const [form, setForm] = useState({
    inviteCode: '',
    registrationEnabled: true,
    aiApiKey: '',
    aiBaseUrl: '',
    aiModel: '',
    fetchInterval: 30,
  })

  const { data: config, isLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => api.getConfig(),
  })

  useEffect(() => {
    if (config) {
      setForm({
        inviteCode: config.inviteCode || '',
        registrationEnabled: config.registrationEnabled ?? true,
        aiApiKey: '',
        aiBaseUrl: config.aiBaseUrl || '',
        aiModel: config.aiModel || '',
        fetchInterval: config.fetchInterval || 30,
      })
    }
  }, [config])

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) => api.updateConfig(data),
    onSuccess: () => {
      toast.success('配置已更新')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '更新失败')
    },
  })

  const handleSubmit = () => {
    const data = { ...form }
    if (!data.aiApiKey) {
      delete (data as any).aiApiKey
    }
    updateMutation.mutate(data)
  }

  if (isLoading) {
    return <div className="text-center py-8">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">系统配置</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>注册设置</CardTitle>
            <CardDescription>控制用户注册行为</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>开放注册</Label>
              <Switch
                checked={form.registrationEnabled}
                onCheckedChange={(checked) => setForm({ ...form, registrationEnabled: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label>邀请码</Label>
              <Input
                value={form.inviteCode}
                onChange={(e) => setForm({ ...form, inviteCode: e.target.value })}
                placeholder="邀请码"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI 模型配置</CardTitle>
            <CardDescription>配置 OpenAI 兼容的 AI 接口</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={form.aiApiKey}
                onChange={(e) => setForm({ ...form, aiApiKey: e.target.value })}
                placeholder="留空表示不修改"
              />
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                value={form.aiBaseUrl}
                onChange={(e) => setForm({ ...form, aiBaseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
            </div>
            <div className="space-y-2">
              <Label>模型名称</Label>
              <Input
                value={form.aiModel}
                onChange={(e) => setForm({ ...form, aiModel: e.target.value })}
                placeholder="gpt-4o-mini"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>抓取设置</CardTitle>
            <CardDescription>配置数据抓取频率</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>抓取间隔（分钟）</Label>
              <Input
                type="number"
                value={form.fetchInterval}
                onChange={(e) =>
                  setForm({ ...form, fetchInterval: parseInt(e.target.value) || 30 })
                }
                min={5}
                max={1440}
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSubmit} className="w-full">
          保存配置
        </Button>
      </div>
    </div>
  )
}

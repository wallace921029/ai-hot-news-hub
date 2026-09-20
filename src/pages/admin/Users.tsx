import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, Trash2, Key, Users } from 'lucide-react'

export function AdminUsers() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
  })
  const [newPassword, setNewPassword] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.getUsers({ page: 1, pageSize: 100 }),
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.createUser(data),
    onSuccess: () => {
      toast.success('创建成功')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setDialogOpen(false)
      setForm({ username: '', email: '', password: '', role: 'user' })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '创建失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteUser(id),
    onSuccess: () => {
      toast.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      api.resetPassword(id, password),
    onSuccess: () => {
      toast.success('密码已重置')
      setResetDialogOpen(false)
      setNewPassword('')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '重置失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateUser(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '更新失败')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-white/20 border-t-violet-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">用户管理</h1>
          <p className="text-sm text-white/40 mt-1">共 {data?.items?.length || 0} 个用户</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
              <Plus className="h-4 w-4 mr-2" />
              创建用户
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">创建用户</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/70">用户名</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="用户名"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">邮箱</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="邮箱"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">密码</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="密码（至少 6 位）"
                  minLength={6}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">角色</Label>
                <Select
                  value={form.role}
                  onValueChange={(value: 'admin' | 'user') => setForm({ ...form, role: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10">
                    <SelectItem value="user" className="text-white hover:bg-white/10">
                      普通用户
                    </SelectItem>
                    <SelectItem value="admin" className="text-white hover:bg-white/10">
                      管理员
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => createMutation.mutate(form)}
                className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              >
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 重置密码对话框 */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">重置密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">新密码</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新密码（至少 6 位）"
                minLength={6}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <Button
              onClick={() => {
                if (selectedUserId && newPassword) {
                  resetPasswordMutation.mutate({ id: selectedUserId, password: newPassword })
                }
              }}
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            >
              重置
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 用户列表 */}
      <div className="glass-card rounded-xl p-5">
        {data?.items.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/30">暂无用户</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data?.items.map((user: any) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-medium">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{user.username}</p>
                    <p className="text-xs text-white/40">{user.email}</p>
                  </div>
                  <Badge
                    className={
                      user.role === 'admin'
                        ? 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                        : 'bg-white/10 text-white/50 border-white/20'
                    }
                  >
                    {user.role === 'admin' ? '管理员' : '用户'}
                  </Badge>
                  <Badge
                    className={
                      user.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }
                  >
                    {user.status === 'active' ? '正常' : '禁用'}
                  </Badge>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/40 hover:text-white hover:bg-white/10"
                    onClick={() => {
                      setSelectedUserId(user.id)
                      setResetDialogOpen(true)
                    }}
                  >
                    <Key className="h-4 w-4 mr-1" />
                    重置密码
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/40 hover:text-white hover:bg-white/10"
                    onClick={() =>
                      updateMutation.mutate({
                        id: user.id,
                        data: { status: user.status === 'active' ? 'disabled' : 'active' },
                      })
                    }
                  >
                    {user.status === 'active' ? '禁用' : '启用'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/40 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => {
                      if (confirm('确定删除此用户？')) {
                        deleteMutation.mutate(user.id)
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

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
import { Plus, Trash2, Key, Users, UserCheck, UserX } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AdminUsers() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
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
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.getUsers({ page: 1, pageSize: 100 }),
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.createUser(data),
    onSuccess: () => {
      toast.success(t('admin.users.createSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setDialogOpen(false)
      setForm({ username: '', email: '', password: '', role: 'user' })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('common.failed'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteUser(id),
    onSuccess: () => {
      toast.success(t('admin.users.deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('common.failed'))
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      api.resetPassword(id, password),
    onSuccess: () => {
      toast.success(t('admin.users.passwordResetSuccess'))
      setResetDialogOpen(false)
      setNewPassword('')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('common.failed'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status: string } }) =>
      api.updateUser(id, data),
    onSuccess: () => {
      toast.success(t('admin.users.updateSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('common.failed'))
    },
  })

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
          <h1 className="text-2xl font-bold text-foreground">{t('admin.users.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.users.total', { count: data?.items?.length || 0 })}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" className="bg-foreground text-background hover:bg-foreground/90">
              <Plus className="h-4 w-4 mr-2 shrink-0" />
              {t('admin.users.addUser')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.users.addUser')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('admin.users.username')}</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder={t('admin.users.username')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.users.email')}</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={t('admin.users.email')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('auth.password')}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={t('auth.passwordPlaceholder')}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.users.role')}</Label>
                <Select
                  value={form.role}
                  onValueChange={(value: 'admin' | 'user') => setForm({ ...form, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t('admin.users.user')}</SelectItem>
                    <SelectItem value="admin">{t('admin.users.admin')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                onClick={() => createMutation.mutate(form)}
                className="w-full bg-foreground text-background hover:bg-foreground/90"
              >
                {t('common.create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reset password dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.users.resetPassword')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('admin.users.newPassword')}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                minLength={6}
              />
            </div>
            <Button
              type="button"
              onClick={() => {
                if (selectedUserId && newPassword) {
                  resetPasswordMutation.mutate({ id: selectedUserId, password: newPassword })
                }
              }}
              className="w-full bg-foreground text-background hover:bg-foreground/90"
            >
              {t('common.confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User list */}
      <div className="rounded-xl border bg-card text-card-foreground overflow-hidden">
        {data?.items.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t('common.noData')}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-xs text-muted-foreground">
                <th className="text-left font-medium py-2.5 px-4 w-12">#</th>
                <th className="text-left font-medium py-2.5 px-4 w-56">
                  {t('admin.users.username')}
                </th>
                <th className="text-left font-medium py-2.5 px-4">{t('admin.users.email')}</th>
                <th className="text-left font-medium py-2.5 px-4 w-24">{t('admin.users.role')}</th>
                <th className="text-left font-medium py-2.5 px-4 w-24">
                  {t('admin.users.status')}
                </th>
                <th className="text-right font-medium py-2.5 px-4 w-28">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data?.items.map(
                (user: {
                  id: number
                  username: string
                  email: string
                  role: string
                  status: string
                }) => (
                  <tr key={user.id} className="hover:bg-accent/50 transition-colors">
                    <td className="py-3 px-4 text-sm text-muted-foreground">{user.id}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-white text-xs font-medium shrink-0">
                          {user.username[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">
                          {user.username}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground truncate">
                      {user.email}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {user.role === 'admin' ? t('admin.users.admin') : t('admin.users.user')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={user.status === 'active' ? 'default' : 'destructive'}
                        className="text-[10px]"
                      >
                        {user.status === 'active'
                          ? t('admin.users.active')
                          : t('admin.users.disabled')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title={t('admin.users.resetPassword')}
                          onClick={() => {
                            setSelectedUserId(user.id)
                            setResetDialogOpen(true)
                          }}
                        >
                          <Key className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title={
                            user.status === 'active'
                              ? t('admin.users.disabled')
                              : t('admin.users.active')
                          }
                          onClick={() =>
                            updateMutation.mutate({
                              id: user.id,
                              data: { status: user.status === 'active' ? 'disabled' : 'active' },
                            })
                          }
                        >
                          {user.status === 'active' ? (
                            <UserX className="h-3.5 w-3.5" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground/30 hover:text-destructive"
                          title={t('common.delete')}
                          onClick={() => setPendingDeleteId(user.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.users.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.users.deleteConfirm')}</AlertDialogDescription>
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

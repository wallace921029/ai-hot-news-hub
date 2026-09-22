import { useState } from 'react'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function SecuritySettingsPage() {
  const { t } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const canSubmit =
    currentPassword.length >= 1 &&
    newPassword.length >= 6 &&
    confirmPassword === newPassword &&
    newPassword !== currentPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setSaving(true)
    try {
      await api.updatePassword(currentPassword, newPassword)
      toast.success(t('security.success'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('security.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('security.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            {t('security.changePassword')}
          </CardTitle>
          <CardDescription>{t('security.passwordDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t('security.currentPassword')}</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('security.newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">{t('security.passwordHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('security.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-xs text-destructive">{t('security.passwordMismatch')}</p>
              )}
            </div>
            <Button type="submit" disabled={!canSubmit || saving} className="px-8">
              {saving ? t('common.loading') : t('security.changePassword')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

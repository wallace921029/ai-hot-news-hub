import { useState } from 'react'
import { useUserStore } from '@/stores/user'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Dices } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UserAvatar } from '@/components/UserAvatar'
import { randomSeed, avatarStyles, type AvatarStyleKey } from '@/lib/avatar'
import { cn } from '@/lib/utils'

export function ProfilePage() {
  const { user, applyUserProfile } = useUserStore()
  const { t } = useTranslation()

  const initial = user?.avatar && user.avatar.includes(':') ? user.avatar.split(':') : null
  const [style, setStyle] = useState<AvatarStyleKey>(
    initial && initial[0] in avatarStyles ? (initial[0] as AvatarStyleKey) : 'adventurer'
  )
  const [seed, setSeed] = useState(initial ? initial[1] : randomSeed())
  const [nickname, setNickname] = useState(user?.nickname || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await api.updateProfile({
        nickname: nickname.trim(),
        avatar: `${style}:${seed}`,
      })
      applyUserProfile(updated)
      toast.success(t('profile.saved'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('profile.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('profile.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.avatar')}</CardTitle>
          <CardDescription>{t('profile.avatarDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preview + regenerate */}
          <div className="flex items-center gap-5">
            <UserAvatar avatar={`${style}:${seed}`} username={user?.username || '?'} size={88} />
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

          {/* Style grid */}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.info')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">{t('profile.nickname')}</Label>
            <Input
              id="nickname"
              placeholder={t('profile.nicknamePlaceholder')}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('auth.username')}</Label>
            <Input value={user?.username || ''} disabled className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label>{t('auth.email')}</Label>
            <Input value={user?.email || ''} disabled className="bg-muted/50" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={saving} className="px-8">
          {saving ? t('common.loading') : t('profile.save')}
        </Button>
      </div>
    </div>
  )
}

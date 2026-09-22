import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useUserStore } from '@/stores/user'
import { useThemeStore, type Theme } from '@/stores/theme'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  LogOut,
  User,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Languages,
  Check,
  Star,
  LayoutDashboard,
} from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'

const themeOptions: { value: Theme; icon: typeof Sun; labelKey: string }[] = [
  { value: 'light', icon: Sun, labelKey: 'theme.light' },
  { value: 'dark', icon: Moon, labelKey: 'theme.dark' },
  { value: 'system', icon: Monitor, labelKey: 'theme.system' },
]

const languages = [
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
]

export function UserMenu() {
  const { user, logout, isAdmin } = useUserStore()
  const { theme, setTheme } = useThemeStore()
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [themeOpen, setThemeOpen] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)

  const displayName = user?.nickname?.trim() || user?.username || '?'
  const currentThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
  const ThemeIcon = currentThemeIcon

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleLanguageSwitch = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('language', code)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 pl-1 pr-3 rounded-full flex items-center gap-2 hover:bg-accent/50"
        >
          <UserAvatar avatar={user?.avatar} username={user?.username || '?'} size={28} />
          <span className="text-sm font-medium max-w-[8rem] truncate">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Theme submenu */}
        <DropdownMenuSub
          open={themeOpen}
          onOpenChange={(v) => {
            setThemeOpen(v)
            if (v) setLanguageOpen(false)
          }}
        >
          <DropdownMenuSubTrigger
            className="cursor-pointer justify-between"
            onClick={() => {
              setThemeOpen(true)
              setLanguageOpen(false)
            }}
          >
            <span className="flex items-center">
              <ThemeIcon className="w-4 h-4 mr-2" />
              {t('theme.toggle')}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent sideOffset={8} collisionPadding={16} className="w-40">
            {themeOptions.map(({ value, icon: OptionIcon, labelKey }) => {
              const active = theme === value
              return (
                <DropdownMenuItem
                  key={value}
                  onClick={() => setTheme(value)}
                  className="justify-between"
                >
                  <span className="flex items-center">
                    <OptionIcon className="mr-2 h-4 w-4" />
                    {t(labelKey)}
                  </span>
                  {active && <Check className="w-4 h-4 text-primary" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Language submenu */}
        <DropdownMenuSub
          open={languageOpen}
          onOpenChange={(v) => {
            setLanguageOpen(v)
            if (v) setThemeOpen(false)
          }}
        >
          <DropdownMenuSubTrigger
            className="cursor-pointer justify-between"
            onClick={() => {
              setLanguageOpen(true)
              setThemeOpen(false)
            }}
          >
            <span className="flex items-center">
              <Languages className="w-4 h-4 mr-2" />
              {t('language.toggle')}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent sideOffset={8} collisionPadding={16} className="w-40">
            {languages.map(({ code, label, flag }) => {
              const active = i18n.language === code
              return (
                <DropdownMenuItem
                  key={code}
                  onClick={() => handleLanguageSwitch(code)}
                  className="justify-between"
                >
                  <span className="flex items-center">
                    <span className="mr-2">{flag}</span>
                    {label}
                  </span>
                  {active && <Check className="w-4 h-4 text-primary" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/favorites')}>
          <Star className="w-4 h-4 mr-2" />
          {t('nav.favorites')}
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate('/admin')}>
            <LayoutDashboard className="w-4 h-4 mr-2" />
            {t('nav.admin')}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <User className="w-4 h-4 mr-2" />
          {t('nav.profile')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings/security')}>
          <ShieldCheck className="w-4 h-4 mr-2" />
          {t('nav.security')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t('nav.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

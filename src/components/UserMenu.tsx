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
import { LogOut, User, ShieldCheck, Sun, Moon, Monitor, Languages } from 'lucide-react'
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
  const { user, logout } = useUserStore()
  const { theme, setTheme } = useThemeStore()
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()

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
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Theme submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <ThemeIcon className="w-4 h-4 mr-2" />
            {t('theme.toggle')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-36">
            {themeOptions.map(({ value, icon: OptionIcon, labelKey }) => (
              <DropdownMenuItem
                key={value}
                onClick={() => setTheme(value)}
                className={theme === value ? 'bg-accent' : ''}
              >
                <OptionIcon className="mr-2 h-4 w-4" />
                <span>{t(labelKey)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Language submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <Languages className="w-4 h-4 mr-2" />
            {t('language.toggle')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-36">
            {languages.map(({ code, label, flag }) => (
              <DropdownMenuItem
                key={code}
                onClick={() => handleLanguageSwitch(code)}
                className={i18n.language === code ? 'bg-accent' : ''}
              >
                <span className="mr-2">{flag}</span>
                <span>{label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

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

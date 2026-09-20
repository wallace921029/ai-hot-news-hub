import { Outlet, Link } from 'react-router'
import { useUserStore } from '@/stores/user'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { UserMenu } from '@/components/UserMenu'
import { Star, LayoutDashboard, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function MainLayout() {
  const { isAdmin } = useUserStore()
  const { t } = useTranslation()

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="shrink-0 z-50 glass">
        <div className="container flex h-14 items-center">
          <Link to="/" className="mr-8 flex items-center space-x-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
            <span className="font-semibold text-base text-foreground">{t('common.appName')}</span>
          </Link>

          <nav className="flex items-center space-x-1">
            <Link
              to="/"
              className="px-3 py-1.5 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent/50 rounded-md transition-colors"
            >
              {t('nav.home')}
            </Link>
            <Link
              to="/favorites"
              className="px-3 py-1.5 text-sm font-medium text-foreground/50 hover:text-foreground hover:bg-accent/50 rounded-md transition-colors flex items-center"
            >
              <Star className="w-3.5 h-3.5 mr-1" />
              {t('nav.favorites')}
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="px-3 py-1.5 text-sm font-medium text-foreground/50 hover:text-foreground hover:bg-accent/50 rounded-md transition-colors flex items-center"
              >
                <LayoutDashboard className="w-3.5 h-3.5 mr-1" />
                {t('nav.admin')}
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center space-x-1.5">
            <ThemeToggle />
            <LanguageSwitch />
            <div className="h-5 w-px bg-border mx-1" />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="container py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

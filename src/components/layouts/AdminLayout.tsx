import { Outlet, Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { UserMenu } from '@/components/UserMenu'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Database,
  Users,
  FileText,
  Settings,
  ScrollText,
  ArrowLeft,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'

export function AdminLayout() {
  const location = useLocation()
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  const navItems = [
    { path: '/admin', label: t('admin.dashboard.title'), icon: LayoutDashboard },
    { path: '/admin/sources', label: t('admin.sources.title'), icon: Database },
    { path: '/admin/users', label: t('admin.users.title'), icon: Users },
    { path: '/admin/content', label: t('admin.content.title'), icon: FileText },
    { path: '/admin/config', label: t('admin.config.title'), icon: Settings },
    { path: '/admin/logs', label: t('admin.logs.title'), icon: ScrollText },
  ]

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="shrink-0 z-50 glass">
        <div className="flex h-14 items-center px-4 lg:px-6">
          {/* Left: Logo */}
          <Link to="/admin" className="flex items-center space-x-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
            <span className="font-semibold text-base text-foreground">{t('nav.admin')}</span>
          </Link>

          {/* Right: Actions */}
          <div className="ml-auto flex items-center space-x-1.5">
            <ThemeToggle />
            <LanguageSwitch />
            <div className="h-5 w-px bg-border mx-1" />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Sidebar */}
        <aside
          className={cn(
            'shrink-0 border-r bg-card/50 flex flex-col transition-all duration-300',
            collapsed ? 'w-16' : 'w-56'
          )}
        >
          {/* Top: Collapse button */}
          <div className="p-2 border-b">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-full h-8 text-foreground/40 hover:text-foreground"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto scrollbar-sidebar space-y-0.5 p-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                item.path === '/admin'
                  ? location.pathname === '/admin'
                  : location.pathname.startsWith(item.path)

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center rounded-lg transition-colors duration-150',
                    collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
                    isActive
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-foreground/60 hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn('w-4 h-4', !collapsed && 'mr-2.5', isActive && 'text-foreground')}
                  />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Bottom: Back to site */}
          <div className="p-2 border-t">
            <Link to="/">
              <Button
                variant="ghost"
                className={cn(
                  'w-full text-foreground/50 hover:text-foreground',
                  collapsed ? 'justify-center px-2 h-9' : 'justify-start px-3 h-9'
                )}
              >
                <ArrowLeft className={cn('w-4 h-4', !collapsed && 'mr-2')} />
                {!collapsed && <span className="text-sm">{t('nav.backToFront')}</span>}
              </Button>
            </Link>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="px-4 lg:px-6 py-6 max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

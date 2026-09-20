import { Outlet, Link, useNavigate, useLocation } from 'react-router'
import { useUserStore } from '@/stores/user'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Database,
  Users,
  FileText,
  Settings,
  ScrollText,
  ArrowLeft,
  LogOut,
  Sparkles,
} from 'lucide-react'

const navItems = [
  { path: '/admin', label: '仪表盘', icon: LayoutDashboard },
  { path: '/admin/sources', label: '数据源', icon: Database },
  { path: '/admin/users', label: '用户管理', icon: Users },
  { path: '/admin/content', label: '内容管理', icon: FileText },
  { path: '/admin/config', label: '系统配置', icon: Settings },
  { path: '/admin/logs', label: '日志查看', icon: ScrollText },
]

export function AdminLayout() {
  const { user, logout } = useUserStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="h-screen flex flex-col gradient-bg overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="shrink-0 z-50 glass border-b border-white/[0.08]">
        <div className="container flex h-16 items-center">
          <Link to="/admin" className="mr-6 flex items-center space-x-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">管理后台</span>
          </Link>

          <div className="ml-auto flex items-center space-x-3">
            <Link to="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回前台
              </Button>
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-white/70">{user?.username}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* 主体区域 */}
      <div className="flex flex-1 min-h-0 relative z-10">
        {/* 左侧菜单 */}
        <aside className="w-64 shrink-0 glass-light border-r border-white/[0.06] overflow-y-auto scrollbar-thin">
          <nav className="space-y-1 p-4">
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
                  className={cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-white border border-white/10 shadow-lg shadow-violet-500/10'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon className={cn('w-5 h-5 mr-3', isActive && 'text-violet-400')} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* 右侧内容区 */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

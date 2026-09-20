import { Outlet, Link, useNavigate } from 'react-router'
import { useUserStore } from '@/stores/user'
import { Button } from '@/components/ui/button'
import { LogOut, Star, LayoutDashboard, Sparkles } from 'lucide-react'

export function MainLayout() {
  const { user, isAdmin, logout } = useUserStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="h-screen flex flex-col gradient-bg overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="shrink-0 z-50 glass border-b border-white/[0.08]">
        <div className="container flex h-16 items-center">
          <Link to="/" className="mr-6 flex items-center space-x-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">AI Hot News</span>
          </Link>

          <nav className="flex items-center space-x-1 mx-6">
            <Link
              to="/"
              className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              首页
            </Link>
            <Link
              to="/favorites"
              className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center"
            >
              <Star className="w-4 h-4 mr-1.5" />
              收藏
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center"
              >
                <LayoutDashboard className="w-4 h-4 mr-1.5" />
                管理后台
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-white/70">{user?.username}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* 主体内容区 */}
      <main className="flex-1 overflow-y-auto scrollbar-thin relative z-10">
        <div className="container py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

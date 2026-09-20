import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Database, Users, Activity, Zap } from 'lucide-react'

export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.getStats(),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">仪表盘</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    )
  }

  const overview = stats?.overview

  const statCards = [
    {
      title: '总内容数',
      value: overview?.totalNews || 0,
      subtitle: `今日新增 ${overview?.todayNews || 0}`,
      icon: FileText,
      gradient: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-500/25',
    },
    {
      title: '数据源',
      value: overview?.totalSources || 0,
      subtitle: `启用中 ${overview?.activeSources || 0}`,
      icon: Database,
      gradient: 'from-violet-500 to-purple-500',
      shadow: 'shadow-violet-500/25',
    },
    {
      title: '用户数',
      value: overview?.totalUsers || 0,
      subtitle: '注册用户',
      icon: Users,
      gradient: 'from-fuchsia-500 to-pink-500',
      shadow: 'shadow-fuchsia-500/25',
    },
    {
      title: '抓取成功率',
      value: `${overview?.fetchSuccessRate || 0}%`,
      subtitle: `${overview?.successFetches || 0} / ${overview?.totalFetches || 0}`,
      icon: Activity,
      gradient: 'from-emerald-500 to-teal-500',
      shadow: 'shadow-emerald-500/25',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">仪表盘</h1>
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full glass-light">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-white/70">系统运行中</span>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="glass-card rounded-xl p-6 group cursor-default">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/50 mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-white">{card.value}</p>
                  <p className="text-xs text-white/40 mt-1">{card.subtitle}</p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} ${card.shadow} shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 图表区域 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">平台分布</h3>
          {stats?.platformDistribution.length === 0 ? (
            <p className="text-white/30 text-center py-8">暂无数据</p>
          ) : (
            <div className="space-y-3">
              {stats?.platformDistribution.slice(0, 8).map((item: any, index: number) => {
                const colors = [
                  'bg-violet-500',
                  'bg-fuchsia-500',
                  'bg-blue-500',
                  'bg-cyan-500',
                  'bg-emerald-500',
                  'bg-yellow-500',
                  'bg-orange-500',
                  'bg-red-500',
                ]
                const maxCount = Math.max(
                  ...(stats?.platformDistribution.map((p: any) => p.count) || [1])
                )
                return (
                  <div key={index} className="flex items-center space-x-3">
                    <span className="text-sm text-white/70 w-20 truncate">{item.platform}</span>
                    <div className="flex-1 h-6 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[index % colors.length]} transition-all duration-500`}
                        style={{ width: `${(item.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-white/50 w-12 text-right">{item.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">热门分类</h3>
          {stats?.categoryDistribution.length === 0 ? (
            <p className="text-white/30 text-center py-8">暂无数据</p>
          ) : (
            <div className="space-y-3">
              {stats?.categoryDistribution.slice(0, 8).map((item: any, index: number) => {
                const colors = [
                  'bg-violet-500/20 text-violet-300 border-violet-500/30',
                  'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
                  'bg-blue-500/20 text-blue-300 border-blue-500/30',
                  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
                  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
                  'bg-orange-500/20 text-orange-300 border-orange-500/30',
                  'bg-red-500/20 text-red-300 border-red-500/30',
                ]
                return (
                  <div key={index} className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-xs border ${colors[index % colors.length]}`}
                    >
                      {item.name}
                    </span>
                    <span className="text-sm text-white/50">{item.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

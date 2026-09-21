import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { pageTransition, staggerContainer, staggerItem } from '@/lib/animations'
import { FileText, Database, Users, Activity, Zap, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

const CHART_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
]

export function AdminDashboard() {
  const { t } = useTranslation()
  const platformChartRef = useRef<HTMLDivElement>(null)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.getStats(),
  })

  useEffect(() => {
    if (!platformChartRef.current || !stats?.platformDistribution?.length) return

    const chart = echarts.init(platformChartRef.current)
    const isDark = document.documentElement.classList.contains('dark')

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: { top: 10, right: 10, bottom: 20, left: 10, containLabel: true },
      xAxis: {
        type: 'category',
        data: stats.platformDistribution.map((p: { platform: string }) => p.platform),
        axisLabel: {
          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
          fontSize: 11,
          rotate: 15,
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        show: false,
      },
      series: [
        {
          type: 'bar',
          data: stats.platformDistribution.map((p: { count: number }, i: number) => ({
            value: p.count,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: CHART_COLORS[i % CHART_COLORS.length] },
                { offset: 1, color: CHART_COLORS[i % CHART_COLORS.length] + '66' },
              ]),
              borderRadius: [6, 6, 0, 0],
            },
          })),
          barWidth: '40%',
        },
      ],
    })

    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(platformChartRef.current)

    return () => {
      observer.disconnect()
      chart.dispose()
    }
  }, [stats?.platformDistribution])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">{t('admin.dashboard.title')}</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const overview = stats?.overview

  const statCards = [
    {
      title: t('admin.dashboard.totalNews'),
      value: overview?.totalNews || 0,
      subtitle: `${t('admin.dashboard.todayNews')} ${overview?.todayNews || 0}`,
      icon: FileText,
      gradient: 'from-blue-500 to-indigo-500',
      bgLight: 'bg-blue-50',
      bgDark: 'dark:bg-blue-950/30',
    },
    {
      title: t('admin.dashboard.dataSources'),
      value: overview?.totalSources || 0,
      subtitle: `${t('admin.dashboard.activeSources')} ${overview?.activeSources || 0}`,
      icon: Database,
      gradient: 'from-violet-500 to-purple-500',
      bgLight: 'bg-violet-50',
      bgDark: 'dark:bg-violet-950/30',
    },
    {
      title: t('admin.dashboard.users'),
      value: overview?.totalUsers || 0,
      subtitle: t('admin.dashboard.registeredUsers'),
      icon: Users,
      gradient: 'from-pink-500 to-rose-500',
      bgLight: 'bg-pink-50',
      bgDark: 'dark:bg-pink-950/30',
    },
    {
      title: t('admin.dashboard.fetchSuccessRate'),
      value: `${overview?.fetchSuccessRate || 0}%`,
      subtitle: `${overview?.successFetches || 0} / ${overview?.totalFetches || 0}`,
      icon: Activity,
      gradient: 'from-emerald-500 to-teal-500',
      bgLight: 'bg-emerald-50',
      bgDark: 'dark:bg-emerald-950/30',
    },
  ]

  return (
    <motion.div className="space-y-6" {...pageTransition}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">{t('admin.dashboard.title')}</h1>
        <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
          <Zap className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
          <span>{t('admin.dashboard.systemRunning')}</span>
        </Badge>
      </div>

      {/* Stat cards */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <motion.div key={index} variants={staggerItem}>
              <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden relative">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
                      <p className="text-2xl font-bold text-foreground">{card.value}</p>
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {card.subtitle}
                      </p>
                    </div>
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Charts */}
      <motion.div
        className="grid gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              {t('admin.dashboard.platformDistribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.platformDistribution?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t('admin.dashboard.noData')}
              </p>
            ) : (
              <div ref={platformChartRef} className="h-64" />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

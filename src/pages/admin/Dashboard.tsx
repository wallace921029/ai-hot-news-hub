import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { pageTransition, staggerContainer, staggerItem } from '@/lib/animations'
import { FileText, Database, Users, Activity, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

export function AdminDashboard() {
  const { t } = useTranslation()
  const platformChartRef = useRef<HTMLDivElement>(null)
  const categoryChartRef = useRef<HTMLDivElement>(null)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.getStats(),
  })

  // Platform distribution chart
  useEffect(() => {
    if (!platformChartRef.current || !stats?.platformDistribution?.length) return

    const chart = echarts.init(platformChartRef.current)
    const isDark = document.documentElement.classList.contains('dark')

    chart.setOption({
      tooltip: { trigger: 'item' },
      grid: { top: 0, right: 0, bottom: 0, left: 0, containLabel: true },
      xAxis: {
        type: 'category',
        data: stats.platformDistribution.slice(0, 8).map((p: { platform: string }) => p.platform),
        axisLabel: {
          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
          fontSize: 11,
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
          data: stats.platformDistribution.slice(0, 8).map((p: { count: number }) => p.count),
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          },
          barWidth: '60%',
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

  // Category distribution chart
  useEffect(() => {
    if (!categoryChartRef.current || !stats?.categoryDistribution?.length) return

    const chart = echarts.init(categoryChartRef.current)
    const isDark = document.documentElement.classList.contains('dark')
    const colors = isDark
      ? [
          'rgba(255,255,255,0.7)',
          'rgba(255,255,255,0.6)',
          'rgba(255,255,255,0.5)',
          'rgba(255,255,255,0.4)',
          'rgba(255,255,255,0.3)',
          'rgba(255,255,255,0.25)',
          'rgba(255,255,255,0.2)',
          'rgba(255,255,255,0.15)',
        ]
      : [
          'rgba(0,0,0,0.7)',
          'rgba(0,0,0,0.6)',
          'rgba(0,0,0,0.5)',
          'rgba(0,0,0,0.4)',
          'rgba(0,0,0,0.3)',
          'rgba(0,0,0,0.25)',
          'rgba(0,0,0,0.2)',
          'rgba(0,0,0,0.15)',
        ]

    chart.setOption({
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: isDark ? '#1c1c1e' : '#fafafa',
            borderWidth: 2,
          },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 12, fontWeight: 'bold' },
          },
          data: stats.categoryDistribution
            .slice(0, 8)
            .map((item: { count: number; name: string }, index: number) => ({
              value: item.count,
              name: item.name,
              itemStyle: { color: colors[index % colors.length] },
            })),
        },
      ],
    })

    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(categoryChartRef.current)

    return () => {
      observer.disconnect()
      chart.dispose()
    }
  }, [stats?.categoryDistribution])

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
      color: 'text-blue-500',
    },
    {
      title: t('admin.dashboard.dataSources'),
      value: overview?.totalSources || 0,
      subtitle: `${t('admin.dashboard.activeSources')} ${overview?.activeSources || 0}`,
      icon: Database,
      color: 'text-violet-500',
    },
    {
      title: t('admin.dashboard.users'),
      value: overview?.totalUsers || 0,
      subtitle: t('admin.dashboard.registeredUsers'),
      icon: Users,
      color: 'text-pink-500',
    },
    {
      title: t('admin.dashboard.fetchSuccessRate'),
      value: `${overview?.fetchSuccessRate || 0}%`,
      subtitle: `${overview?.successFetches || 0} / ${overview?.totalFetches || 0}`,
      icon: Activity,
      color: 'text-emerald-500',
    },
  ]

  return (
    <motion.div className="space-y-6" {...pageTransition}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">{t('admin.dashboard.title')}</h1>
        <Badge variant="outline" className="flex items-center space-x-1.5 px-3 py-1">
          <Zap className="w-3.5 h-3.5 text-yellow-500" />
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
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
                      <p className="text-2xl font-semibold text-foreground">{card.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className={`w-5 h-5 ${card.color}`} />
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
        className="grid gap-4 md:grid-cols-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('admin.dashboard.platformDistribution')}</CardTitle>
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('admin.dashboard.topCategories')}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.categoryDistribution?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t('admin.dashboard.noData')}
              </p>
            ) : (
              <div ref={categoryChartRef} className="h-64" />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

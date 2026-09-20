import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useFilterStore } from '@/stores/filter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Star,
  ExternalLink,
  Rss,
  Globe,
  MessageSquare,
  Clock,
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const sourceTypeConfig = {
  api: { label: 'API 资讯', icon: Globe, description: '各平台实时热榜' },
  rss: { label: 'RSS 订阅', icon: Rss, description: '专业媒体订阅' },
  topic: { label: '话题资讯', icon: MessageSquare, description: 'AI 搜索聚合（即将推出）' },
}

function NewsItem({ item }: { item: any }) {
  const queryClient = useQueryClient()

  const addFavorite = useMutation({
    mutationFn: () => api.addFavorite(item.id),
    onSuccess: () => {
      toast.success('已收藏')
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })

  return (
    <div className="group flex items-start space-x-3 py-3 px-4 hover:bg-white/[0.03] rounded-lg transition-colors">
      <div className="flex-1 min-w-0">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start space-x-2"
        >
          <span className="text-sm text-white/80 group-hover:text-white transition-colors line-clamp-1 flex-1">
            {item.title}
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/15 group-hover:text-white/40 transition-colors mt-0.5" />
        </a>
        <div className="flex items-center space-x-3 mt-1.5">
          <span className="text-xs text-violet-400 font-medium">{item.sourceName}</span>
          <span className="text-xs text-white/25">{item.platform}</span>
          {item.fetchedAt && (
            <span className="text-xs text-white/20 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>
                {new Date(item.fetchedAt).toLocaleDateString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => addFavorite.mutate()}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1"
      >
        <Star className="w-4 h-4 text-white/20 hover:text-yellow-400 transition-colors" />
      </button>
    </div>
  )
}

export function HomePage() {
  const {
    sourceType,
    sourceId,
    platform,
    search,
    page,
    setSourceType,
    setSourceId,
    setPlatform,
    setSearch,
    setPage,
  } = useFilterStore()

  // 获取数据源列表（二次筛选）
  const { data: sources } = useQuery({
    queryKey: ['news-sources', sourceType],
    queryFn: () => api.getNewsSources(sourceType),
  })

  // 获取平台列表
  const { data: platforms } = useQuery({
    queryKey: ['news-platforms', sourceType],
    queryFn: () => api.getPlatforms(sourceType),
  })

  // 获取新闻列表
  const { data, isLoading } = useQuery({
    queryKey: ['news', sourceType, sourceId, platform, search, page],
    queryFn: () =>
      api.getNews({
        page,
        pageSize: 30,
        sourceType,
        sourceId: sourceId || undefined,
        platform: platform || undefined,
        search: search || undefined,
      }),
  })

  return (
    <div className="max-w-5xl mx-auto">
      {/* 搜索栏 */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
          <Input
            placeholder="搜索资讯..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/25 h-10 rounded-lg"
          />
        </div>
      </div>

      {/* Tab 切换：来源类型 */}
      <div className="flex space-x-1 mb-4 bg-white/[0.03] rounded-lg p-1">
        {(Object.keys(sourceTypeConfig) as Array<'api' | 'rss' | 'topic'>).map((type) => {
          const cfg = sourceTypeConfig[type]
          const Icon = cfg.icon
          const isActive = sourceType === type
          const isDisabled = type === 'topic' // 话题功能暂未开放

          return (
            <button
              key={type}
              onClick={() => !isDisabled && setSourceType(type)}
              disabled={isDisabled}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white/10 text-white shadow-sm'
                  : isDisabled
                    ? 'text-white/20 cursor-not-allowed'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cfg.label}</span>
              {isDisabled && <span className="text-[10px] text-white/20 ml-1">即将推出</span>}
            </button>
          )
        })}
      </div>

      {/* 二次筛选：数据源 + 平台 */}
      <div className="flex flex-col space-y-2 mb-4">
        {/* 数据源筛选 */}
        {sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSourceId(null)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                sourceId === null
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              全部来源
            </button>
            {sources.map((source: any) => (
              <button
                key={source.id}
                onClick={() => setSourceId(sourceId === source.id ? null : source.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  sourceId === source.id
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                {source.name}
              </button>
            ))}
          </div>
        )}

        {/* 平台筛选 */}
        {platforms && platforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setPlatform(null)}
              className={`px-2.5 py-1 rounded text-[11px] transition-all ${
                platform === null
                  ? 'bg-white/10 text-white/70'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              全部平台
            </button>
            {platforms.map((p: string) => (
              <button
                key={p}
                onClick={() => setPlatform(platform === p ? null : p)}
                className={`px-2.5 py-1 rounded text-[11px] transition-all ${
                  platform === p ? 'bg-white/10 text-white/70' : 'text-white/30 hover:text-white/50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 新闻列表 */}
      <div className="glass-card rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-white/[0.03]">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-white/5" />
                    <Skeleton className="h-3 w-1/3 bg-white/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <div className="text-center py-16">
            <Newspaper className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30">暂无资讯</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {data?.items.map((item: any) => (
              <NewsItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* 分页 */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-xs text-white/20">共 {data.pagination.total} 条</span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="h-8 px-3 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-white/40 px-2">
              {page} / {data.pagination.totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= data.pagination.totalPages}
              className="h-8 px-3 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

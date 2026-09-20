import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useFilterStore } from '@/stores/filter'
import { NewsCard } from '@/components/NewsCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, ChevronLeft, ChevronRight, TrendingUp, Clock, Filter } from 'lucide-react'

export function HomePage() {
  const {
    category,
    platform,
    sort,
    search,
    page,
    setCategory,
    setPlatform,
    setSort,
    setSearch,
    setPage,
  } = useFilterStore()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  })

  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => api.getPlatforms(),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['news', category, platform, sort, search, page],
    queryFn: () =>
      api.getNews({
        page,
        pageSize: 20,
        category: category || undefined,
        platform: platform || undefined,
        sort,
        search: search || undefined,
      }),
  })

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="搜索新闻..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 h-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={sort === 'score' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSort('score')}
              className={
                sort === 'score'
                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }
            >
              <TrendingUp className="w-4 h-4 mr-1.5" />
              评分
            </Button>
            <Button
              variant={sort === 'time' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSort('time')}
              className={
                sort === 'time'
                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }
            >
              <Clock className="w-4 h-4 mr-1.5" />
              时间
            </Button>
          </div>
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={category === null ? 'default' : 'outline'}
          className={`cursor-pointer transition-all ${
            category === null
              ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0 shadow-lg shadow-violet-500/25'
              : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
          }`}
          onClick={() => setCategory(null)}
        >
          全部分类
        </Badge>
        {categories?.map((cat) => (
          <Badge
            key={cat.name}
            variant={category === cat.name ? 'default' : 'outline'}
            className={`cursor-pointer transition-all ${
              category === cat.name
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0 shadow-lg shadow-violet-500/25'
                : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
            }`}
            onClick={() => setCategory(cat.name)}
          >
            {cat.name} ({cat.count})
          </Badge>
        ))}
      </div>

      {/* 平台筛选 */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={platform === null ? 'default' : 'outline'}
          className={`cursor-pointer transition-all ${
            platform === null
              ? 'bg-white/20 text-white border-0'
              : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
          }`}
          onClick={() => setPlatform(null)}
        >
          <Filter className="w-3 h-3 mr-1" />
          全部平台
        </Badge>
        {platforms?.map((p) => (
          <Badge
            key={p}
            variant={platform === p ? 'default' : 'outline'}
            className={`cursor-pointer transition-all ${
              platform === p
                ? 'bg-white/20 text-white border-0'
                : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
            }`}
            onClick={() => setPlatform(p)}
          >
            {p}
          </Badge>
        ))}
      </div>

      {/* 新闻列表 */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl bg-white/5" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/30">暂无数据</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.items.map((item: any) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* 分页 */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-1 px-4 py-2 rounded-full glass-light">
            <span className="text-sm text-white/70">{page}</span>
            <span className="text-sm text-white/30">/</span>
            <span className="text-sm text-white/50">{data.pagination.totalPages}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= data.pagination.totalPages}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

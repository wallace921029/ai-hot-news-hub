import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { debounce } from 'lodash-es'
import { api } from '@/services/api'
import { useUserStore } from '@/stores/user'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pagination } from '@/components/Pagination'
import { UserAvatar } from '@/components/UserAvatar'
import { motion } from 'framer-motion'
import { pageTransition, staggerContainer, staggerItem } from '@/lib/animations'
import { Search, PenLine, Heart, MessageSquare, Trash2, MessagesSquare, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { postExcerpt } from '@/lib/post'
import type { CommunityPost } from '@/types'

function stripHtml(html: string) {
  return postExcerpt(html)
}

export function CommunityPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'mine'>('all')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, isAdmin } = useUserStore()

  const debouncedSetSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearch(value)
        setPage(1)
      }, 300),
    []
  )

  const { data, isLoading } = useQuery({
    queryKey: ['community-posts', page, pageSize, search, tab],
    queryFn: () =>
      api.getCommunityPosts({
        page,
        pageSize,
        search: search || undefined,
        mine: tab === 'mine',
      }),
  })

  const invalidatePosts = () => {
    queryClient.invalidateQueries({ queryKey: ['community-posts'] })
  }

  const toggleLike = useMutation({
    mutationFn: (id: number) => api.togglePostLike(id),
    onSuccess: () => invalidatePosts(),
    onError: () => toast.error(t('community.likeFailed')),
  })

  const deletePost = useMutation({
    mutationFn: (id: number) => api.deleteCommunityPost(id),
    onSuccess: () => {
      toast.success(t('community.deleteSuccess'))
      invalidatePosts()
    },
    onError: () => toast.error(t('community.deleteFailed')),
  })

  const handleDelete = (post: CommunityPost) => {
    if (window.confirm(t('community.deleteConfirm'))) {
      deletePost.mutate(post.id)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return t('time.justNow')
    if (diff < 3600) return t('time.minutesAgo', { count: Math.floor(diff / 60) })
    if (diff < 86400) return t('time.hoursAgo', { count: Math.floor(diff / 3600) })
    return t('time.daysAgo', { count: Math.floor(diff / 86400) })
  }

  return (
    <motion.div className="max-w-5xl mx-auto space-y-4" {...pageTransition}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center">
            <MessagesSquare className="w-5 h-5 mr-2 shrink-0" />
            {t('community.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('community.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/community/new')}>
          <PenLine className="w-4 h-4 mr-2" />
          {t('community.newPost')}
        </Button>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchInput}
            placeholder={t('community.searchPlaceholder')}
            className="pl-9"
            onChange={(e) => {
              setSearchInput(e.target.value)
              debouncedSetSearch(e.target.value)
            }}
          />
        </div>
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as 'all' | 'mine')
            setPage(1)
          }}
        >
          <TabsList>
            <TabsTrigger value="all">{t('community.allPosts')}</TabsTrigger>
            <TabsTrigger value="mine">{t('community.myPosts')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-4 py-4 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                ))}
              </div>
            ) : !data?.items.length ? (
              <div className="text-center py-16">
                <MessagesSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">{t('community.empty')}</p>
                <p className="text-sm text-muted-foreground/60 mt-1">{t('community.emptyDesc')}</p>
              </div>
            ) : (
              <motion.div
                className="divide-y"
                variants={staggerContainer}
                initial="hidden"
                animate="show"
              >
                {data.items.map((post: CommunityPost) => {
                  const authorName = post.author?.nickname?.trim() || post.author?.username || '?'
                  const canDelete = post.userId === user?.id || isAdmin
                  return (
                    <motion.div key={post.id} variants={staggerItem} className="px-4 py-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <UserAvatar
                          avatar={post.author?.avatar}
                          username={post.author?.username || '?'}
                          size={20}
                        />
                        <span className="font-medium text-foreground/80">{authorName}</span>
                        <span>·</span>
                        <span>{formatTime(post.createdAt)}</span>
                      </div>
                      <Link to={`/community/${post.id}`} className="block mt-2 group">
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
                          {stripHtml(post.content)}
                        </p>
                      </Link>
                      <div className="flex items-center gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 px-2 text-xs ${post.likedByMe ? 'text-rose-500' : 'text-muted-foreground'}`}
                          onClick={() => toggleLike.mutate(post.id)}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 mr-1 ${post.likedByMe ? 'fill-current' : ''}`}
                          />
                          {post.likeCount}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground"
                          asChild
                        >
                          <Link to={`/community/${post.id}`}>
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                            {post.commentCount}
                          </Link>
                        </Button>
                        {canDelete && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground ml-auto"
                              onClick={() => navigate(`/community/${post.id}/edit`)}
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" />
                              {t('community.edit')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(post)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              {t('common.delete')}
                            </Button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {data && data.pagination.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      )}
    </motion.div>
  )
}

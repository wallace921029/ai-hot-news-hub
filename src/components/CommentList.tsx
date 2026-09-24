import { motion } from 'framer-motion'
import { Heart, Reply, Trash2, MessagesSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/Pagination'
import { UserAvatar } from '@/components/UserAvatar'
import type { CommunityAuthor } from '@/types'

/** 通用评论条目（议事厅 / 速递共用；速递暂无点赞） */
export interface CommentListItem {
  id: number
  userId: number
  parentCommentId?: number | null
  content: string
  likeCount: number
  likedByMe?: boolean
  createdAt: string
  author: CommunityAuthor | null
  replies?: CommentListItem[]
}

interface CommentListProps {
  loading: boolean
  items: CommentListItem[]
  emptyText: string
  page: number
  pageSize: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
  currentUserId?: number
  isAdmin?: boolean
  /** 楼主 id（传了才显示原创徽标；速递不传） */
  originalPosterId?: number | null
  /** 点赞回调（不传则不显示点赞按钮；速递暂不支持） */
  onToggleLike?: (id: number) => void
  onReply: (parentId: number, username: string) => void
  onDelete: (id: number) => void
}

const freshnessColors = {
  fresh: 'text-emerald-500',
  moderate: 'text-amber-500',
  stale: 'text-muted-foreground/40',
} as const

function useRelativeTime() {
  const { t } = useTranslation()
  return (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return { text: t('time.justNow'), freshness: 'fresh' as const }
    if (diff < 3600)
      return {
        text: t('time.minutesAgo', { count: Math.floor(diff / 60) }),
        freshness: 'fresh' as const,
      }
    if (diff < 86400)
      return {
        text: t('time.hoursAgo', { count: Math.floor(diff / 3600) }),
        freshness: 'fresh' as const,
      }
    if (diff < 172800)
      return { text: t('time.daysAgo', { count: 1 }), freshness: 'moderate' as const }
    return {
      text: t('time.daysAgo', { count: Math.floor(diff / 86400) }),
      freshness: 'stale' as const,
    }
  }
}

function AuthorBadge() {
  const { t } = useTranslation()
  return (
    <Badge
      variant="outline"
      className="px-1.5 py-0 text-[10px] leading-4 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700"
    >
      {t('community.originalPoster')}
    </Badge>
  )
}

export function CommentList({
  loading,
  items,
  emptyText,
  page,
  pageSize,
  totalPages,
  total,
  onPageChange,
  currentUserId,
  isAdmin,
  originalPosterId,
  onToggleLike,
  onReply,
  onDelete,
}: CommentListProps) {
  const { t } = useTranslation()
  const formatTime = useRelativeTime()

  if (loading) {
    return (
      <div className="space-y-4 mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="text-center py-10">
        <MessagesSquare className="w-10 h-10 text-muted-foreground/25 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    )
  }

  const displayName = (author: CommunityAuthor | null) =>
    author?.nickname?.trim() || author?.username || '?'

  const renderTime = (createdAt: string) => {
    const time = formatTime(createdAt)
    return <span className={freshnessColors[time.freshness]}>{time.text}</span>
  }

  return (
    <div className="mt-2">
      {items.map((comment, index: number) => {
        const name = displayName(comment.author)
        const canDelete = comment.userId === currentUserId || isAdmin
        const isAuthor = originalPosterId != null && comment.userId === originalPosterId
        const floor = (page - 1) * pageSize + index + 1
        const replies = comment.replies || []
        return (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: -10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="flex gap-3 py-4 border-b last:border-0 hover:bg-muted/40 -mx-3 px-3 rounded-lg transition-colors"
          >
            <UserAvatar
              avatar={comment.author?.avatar}
              username={comment.author?.username || '?'}
              size={32}
              className="mt-0.5 shrink-0 self-start"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-foreground/85">{name}</span>
                {isAuthor && <AuthorBadge />}
                <span className="text-muted-foreground">{renderTime(comment.createdAt)}</span>
                <span className="ml-auto tabular-nums text-muted-foreground/70 shrink-0">
                  {t('community.floor', { n: floor })}
                </span>
              </div>
              <p className="text-sm text-foreground/90 mt-1.5 whitespace-pre-wrap leading-relaxed">
                {comment.content}
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                {onToggleLike && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 px-2 text-xs rounded-full ${comment.likedByMe ? 'text-rose-500' : 'text-muted-foreground'}`}
                    onClick={() => onToggleLike(comment.id)}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 mr-1 ${comment.likedByMe ? 'fill-current' : ''}`}
                    />
                    {comment.likeCount > 0 ? comment.likeCount : ''}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs rounded-full text-muted-foreground"
                  onClick={() => onReply(comment.id, name)}
                >
                  <Reply className="w-3.5 h-3.5 mr-1" />
                  {t('community.reply')}
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs rounded-full text-muted-foreground/70 hover:text-destructive"
                    onClick={() => onDelete(comment.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    {t('common.delete')}
                  </Button>
                )}
              </div>
              {replies.length > 0 && (
                <div className="mt-3 space-y-3 rounded-xl bg-muted/40 p-3">
                  {replies.map((reply) => {
                    const rName = displayName(reply.author)
                    const rCanDelete = reply.userId === currentUserId || isAdmin
                    const rIsAuthor = originalPosterId != null && reply.userId === originalPosterId
                    return (
                      <div key={reply.id} className="flex gap-2">
                        <UserAvatar
                          avatar={reply.author?.avatar}
                          username={reply.author?.username || '?'}
                          size={24}
                          className="mt-0.5 shrink-0 self-start"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-medium text-foreground/85">{rName}</span>
                            {rIsAuthor && <AuthorBadge />}
                            <span className="text-muted-foreground">
                              {renderTime(reply.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/85 mt-1 whitespace-pre-wrap leading-relaxed">
                            <span className="text-primary font-medium">@{name} </span>
                            {reply.content}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {onToggleLike && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-6 px-2 text-xs rounded-full ${reply.likedByMe ? 'text-rose-500' : 'text-muted-foreground'}`}
                                onClick={() => onToggleLike(reply.id)}
                              >
                                <Heart
                                  className={`w-3 h-3 mr-1 ${reply.likedByMe ? 'fill-current' : ''}`}
                                />
                                {reply.likeCount > 0 ? reply.likeCount : ''}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs rounded-full text-muted-foreground"
                              onClick={() => onReply(comment.id, rName)}
                            >
                              <Reply className="w-3 h-3 mr-1" />
                              {t('community.reply')}
                            </Button>
                            {rCanDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs rounded-full text-muted-foreground/70 hover:text-destructive"
                                onClick={() => onDelete(reply.id)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                {t('common.delete')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )
      })}

      {totalPages > 1 && (
        <div className="mt-2">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  )
}

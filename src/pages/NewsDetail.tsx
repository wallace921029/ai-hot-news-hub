import { useParams, useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useUserStore } from '@/stores/user'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/UserAvatar'
import { CommentList } from '@/components/CommentList'
import { AiMentionPopup } from '@/components/AiMentionPopup'
import { useAiMention } from '@/hooks/useAiMention'
import { insertTextAtCaret } from '@/lib/caret'
import { motion, AnimatePresence } from 'framer-motion'
import { pageTransition } from '@/lib/animations'
import {
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Star,
  Clock,
  Globe,
  User,
  BarChart3,
  Info,
  MessageSquare,
  Send,
  Loader2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAiReplyPoll } from '@/hooks/useAiReplyPoll'
import DOMPurify from 'dompurify'
import { useEffect, useRef, useState } from 'react'
import type { NewsComment } from '@/types'

const COMMENT_PAGE_SIZE = 20

export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user, isAdmin } = useUserStore()
  const newsId = Number(id)

  const [commentPage, setCommentPage] = useState(1)
  const [commentInput, setCommentInput] = useState('')
  const [replyTarget, setReplyTarget] = useState<{ parentId: number; username: string } | null>(
    null
  )
  const [sending, setSending] = useState(false)
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const mention = useAiMention({
    value: commentInput,
    setValue: setCommentInput,
    textareaRef,
    maxLength: 2000,
  })

  // 点头像 @ 人：挂到对应主楼 + 落字 @用户名 + 聚焦（与回复按钮同线程）
  const handleMentionUser = (parentId: number, username: string) => {
    setReplyTarget({ parentId, username })
    insertTextAtCaret(textareaRef.current, commentInput, `@${username} `, setCommentInput, 2000)
  }

  const {
    data: item,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['news-detail', id],
    queryFn: () => api.getNewsById(Number(id)),
    enabled: !!id,
  })

  const addFavorite = useMutation({
    mutationFn: () => api.addFavorite(Number(id)),
    onSuccess: () => {
      toast.success(t('home.favorited'))
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
    onError: () => toast.error(t('home.favoriteFailed')),
  })

  const { data: commentsData } = useQuery({
    queryKey: ['news-comments', newsId, commentPage],
    queryFn: () => api.getNewsComments(newsId, commentPage, COMMENT_PAGE_SIZE),
    enabled: !!newsId,
  })
  const { watchAiReply } = useAiReplyPoll()

  const createComment = useMutation({
    mutationFn: () =>
      api.createNewsComment(newsId, commentInput.trim(), replyTarget?.parentId ?? undefined),
    onMutate: async () => {
      setSending(true)
      const queryKey = ['news-comments', newsId, commentPage]
      await queryClient.cancelQueries({ queryKey })
      const prev = queryClient.getQueryData(queryKey)
      const parentId = replyTarget?.parentId ?? null
      const temp: NewsComment = {
        id: -Date.now(),
        newsItemId: newsId,
        userId: user?.id ?? 0,
        parentCommentId: parentId,
        content: commentInput.trim(),
        likeCount: 0,
        createdAt: new Date().toISOString(),
        author: user
          ? {
              id: user.id,
              username: user.username,
              nickname: user.nickname ?? null,
              avatar: user.avatar ?? null,
            }
          : null,
        replies: [],
      }
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old
        if (parentId) {
          return {
            ...old,
            items: (old.items || []).map((it: any) =>
              it.id === parentId ? { ...it, replies: [...(it.replies || []), temp] } : it
            ),
          }
        }
        return { ...old, items: [...(old.items || []), temp] }
      })
      return { prev, queryKey }
    },
    onSuccess: (data) => {
      toast.success(t('newsDetail.commentSuccess'))
      if (data?.aiQuotaExhausted) toast.warning(t('ai.quotaExhausted'))
      setCommentInput('')
      setReplyTarget(null)
      setSending(false)
      queryClient.invalidateQueries({ queryKey: ['news-comments', newsId] })
      // @ 了智能体且后台已接单：定向轮询等回复出现（抓到即停，无感）
      if (data?.aiPending && data?.agentUserId && data?.comment?.id) {
        const myId = data.comment.id as number
        const agentId = data.agentUserId as number
        watchAiReply({
          queryKey: ['news-comments', newsId, commentPage],
          isArrived: (cached: unknown) => {
            const items = (cached as { items?: NewsComment[] })?.items || []
            return items.some(
              (c) =>
                (c.id > myId && c.author?.id === agentId) ||
                (c.replies || []).some((r) => r.id > myId && r.author?.id === agentId)
            )
          },
        })
      }
    },
    onError: (e: Error, _v, context) => {
      setSending(false)
      if (context?.prev) queryClient.setQueryData(context.queryKey, context.prev)
      toast.error(e.message || t('newsDetail.commentFailed'))
    },
  })

  const deleteComment = useMutation({
    mutationFn: (commentId: number) => api.deleteNewsComment(commentId),
    onSuccess: () => {
      toast.success(t('common.success'))
      queryClient.invalidateQueries({ queryKey: ['news-comments', newsId] })
    },
    onError: () => toast.error(t('common.failed')),
  })

  const canSend = commentInput.trim().length > 0 && !sending

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  const [showFloatBack, setShowFloatBack] = useState(false)

  useEffect(() => {
    const main = document.querySelector('main.overflow-y-auto') as HTMLElement | null
    const target = main ?? window
    const getScroll = () => (main ? main.scrollTop : window.scrollY)
    const onScroll = () => setShowFloatBack(getScroll() > 500)
    onScroll()
    target.addEventListener('scroll', onScroll as EventListener, { passive: true })
    return () => target.removeEventListener('scroll', onScroll as EventListener)
  }, [item?.id])

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-muted-foreground text-lg">{t('newsDetail.notFound')}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('newsDetail.backToList')}
        </Button>
      </div>
    )
  }

  return (
    <>
      <motion.div className="max-w-3xl mx-auto space-y-6" {...pageTransition}>
        {/* Back button */}
        <motion.div
          animate={{ opacity: showFloatBack ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className={showFloatBack ? 'pointer-events-none' : ''}
        >
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            {t('newsDetail.backToList')}
          </Button>
        </motion.div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold leading-tight">{item.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            {item.sourceName && (
              <Badge variant="secondary" className="gap-1">
                <Globe className="w-3 h-3 shrink-0" />
                {item.sourceName}
              </Badge>
            )}
            {item.author && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3 shrink-0" />
                {item.author}
              </span>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {item.publishedAt && (
            <div className="text-sm">
              <span className="text-muted-foreground">{t('newsDetail.publishedAt')}</span>
              <p className="mt-0.5">{formatTime(item.publishedAt)}</p>
            </div>
          )}
          <div className="text-sm">
            <span className="text-muted-foreground">{t('newsDetail.fetchedAt')}</span>
            <p className="mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 shrink-0" />
              {formatTime(item.fetchedAt)}
            </p>
          </div>
          {item.hotScore != null && (
            <div className="text-sm">
              <span className="text-muted-foreground">{t('newsDetail.hotScore')}</span>
              <p className="mt-0.5 flex items-center gap-1">
                <BarChart3 className="w-3 h-3 shrink-0" />
                {item.hotScore}
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                {t('newsDetail.description')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/<[a-z][\s\S]*>/i.test(item.description || '') ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none article-content"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(item.description || '', {
                      ADD_ATTR: ['target'],
                    }),
                  }}
                />
              ) : (
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {item.description}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        {item.metadata && Object.keys(item.metadata).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('newsDetail.metadata')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(item.metadata).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="text-muted-foreground">{key}: </span>
                    <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button asChild>
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2 shrink-0" />
              {t('newsDetail.viewOriginal')}
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => addFavorite.mutate()}
            disabled={addFavorite.isPending}
          >
            <Star className="w-4 h-4 mr-2 shrink-0" />
            {t('home.favorited')}
          </Button>
        </div>

        {/* Comments */}
        <Card id="comments" className="overflow-hidden shadow-sm scroll-mt-4">
          <CardContent className="p-6 md:p-8">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <MessageSquare className="w-5 h-5 text-primary shrink-0" />
              {t('newsDetail.comments')}
              <Badge variant="secondary" className="ml-1 tabular-nums">
                {commentsData?.pagination.total ?? 0}
              </Badge>
            </h2>

            <CommentList
              loading={!commentsData}
              items={commentsData?.items || []}
              emptyText={t('newsDetail.noComments')}
              page={commentPage}
              pageSize={COMMENT_PAGE_SIZE}
              totalPages={commentsData?.pagination.totalPages || 0}
              total={commentsData?.pagination.total || 0}
              onPageChange={setCommentPage}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              onReply={(parentId, username) => {
                setReplyTarget({ parentId, username })
                textareaRef.current?.focus()
              }}
              onDelete={(id) => setPendingDeleteCommentId(id)}
              onMentionUser={handleMentionUser}
            />

            {/* Composer（按钮内置右下角，与议事厅对齐） */}
            <div className="flex gap-3 mt-6">
              <UserAvatar
                avatar={user?.avatar}
                username={user?.username || '?'}
                size={32}
                className="mt-1 shrink-0 self-start"
              />
              <div className="flex-1 relative">
                {replyTarget && (
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span className="text-muted-foreground">
                      {t('newsDetail.replyingTo', { username: replyTarget.username })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyTarget(null)}
                      className="inline-flex items-center justify-center h-5 w-5 rounded-full hover:bg-muted text-muted-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={commentInput}
                  maxLength={2000}
                  rows={3}
                  placeholder={
                    replyTarget
                      ? t('newsDetail.replyPlaceholder', { username: replyTarget.username })
                      : t('newsDetail.commentPlaceholder')
                  }
                  onChange={(e) => mention.handleMentionChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (mention.handleMentionKeyDown(e)) return
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSend) {
                      createComment.mutate()
                    }
                  }}
                  onBlur={() => mention.closeMention()}
                  className="flex min-h-[96px] w-full rounded-xl border border-input bg-muted/40 px-3.5 py-2.5 pb-12 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-background transition-colors disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                />
                {mention.mentionOpen && mention.mentionCoords && (
                  <AiMentionPopup
                    coords={mention.mentionCoords}
                    agents={mention.mentionAgents}
                    activeIndex={mention.mentionActiveIndex}
                    loading={mention.mentionLoading}
                    onSelect={mention.selectMentionAgent}
                    onHover={mention.setMentionActiveIndex}
                  />
                )}
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    disabled={!canSend}
                    onClick={() => createComment.mutate()}
                    title={t('common.submit')}
                    className="h-8 w-8 rounded-full"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Floating action buttons */}
      <AnimatePresence>
        {showFloatBack && (
          <div
            className="fixed top-20 z-40 flex flex-col gap-2"
            style={{ left: 'max(1rem, calc((100vw - 48rem) / 2 - 3.5rem))' }}
          >
            <motion.button
              key="float-back"
              initial={{ opacity: 0, scale: 0.6, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.6, x: -20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={() => navigate(-1)}
              aria-label={t('newsDetail.backToList')}
              title={t('newsDetail.backToList')}
              className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-border/60 shadow-lg hover:shadow-xl hover:bg-background flex items-center justify-center transition-shadow"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </motion.button>
            <motion.button
              key="float-top"
              initial={{ opacity: 0, scale: 0.6, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.6, x: -20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.06 }}
              onClick={() => {
                const main = document.querySelector('main.overflow-y-auto')
                if (main) main.scrollTo({ top: 0, behavior: 'smooth' })
                else window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              aria-label="返回顶部"
              title="返回顶部"
              className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-border/60 shadow-lg hover:shadow-xl hover:bg-background flex items-center justify-center transition-shadow"
            >
              <ArrowUp className="w-4 h-4 text-foreground" />
            </motion.button>
          </div>
        )}
      </AnimatePresence>
      <AlertDialog
        open={pendingDeleteCommentId !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteCommentId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('community.commentDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('community.commentDeleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDeleteCommentId !== null) deleteComment.mutate(pendingDeleteCommentId)
                setPendingDeleteCommentId(null)
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

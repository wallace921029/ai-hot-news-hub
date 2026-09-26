import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UserAvatar } from '@/components/UserAvatar'
import { CommentList } from '@/components/CommentList'
import { AiMentionPopup } from '@/components/AiMentionPopup'
import { useAiMention } from '@/hooks/useAiMention'
import { insertTextAtCaret } from '@/lib/caret'
import { motion, AnimatePresence } from 'framer-motion'
import { pageTransition } from '@/lib/animations'
import {
  ArrowLeft,
  Check,
  Heart,
  Loader2,
  MessageSquare,
  Send,
  Pencil,
  Link2,
  Smile,
  Trash2,
  X,
} from 'lucide-react'
import EmojiPicker, {
  EmojiStyle,
  Theme as EmojiTheme,
  type EmojiClickData,
} from 'emoji-picker-react'
import emojiZhData from 'emoji-picker-react/dist/data/emojis-zh.json'
import type { EmojiData } from 'emoji-picker-react/dist/types/exposedTypes'

// JSON 导入会被拓宽字面量类型，这里形状与官方一致，做一次收窄
const emojiZh = emojiZhData as unknown as EmojiData
import { toast } from 'sonner'
import DOMPurify from 'dompurify'
import { useAiReplyPoll, isFreshContent } from '@/hooks/useAiReplyPoll'
import { cleanPostHtml, linkifyUploadImages, postExcerpt } from '@/lib/post'
import { useTranslation } from 'react-i18next'
import type { CommunityComment } from '@/types'

const COMMENT_PAGE_SIZE = 20

export function PostDetailPage() {
  const { id } = useParams()
  const postId = Number(id)
  const [commentPage, setCommentPage] = useState(1)
  const [commentInput, setCommentInput] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiPos, setEmojiPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<number | null>(null)
  const [pendingDeletePost, setPendingDeletePost] = useState(false)
  const [replyTarget, setReplyTarget] = useState<{ parentId: number; username: string } | null>(
    null
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiBtnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, isAdmin } = useUserStore()
  const { resolvedTheme } = useThemeStore()

  const {
    data: post,
    isLoading: postLoading,
    isError: postError,
  } = useQuery({
    queryKey: ['community-post', postId],
    queryFn: () => api.getCommunityPost(postId),
    enabled: Number.isFinite(postId) && postId > 0,
  })

  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['community-comments', postId, commentPage],
    queryFn: () => api.getCommunityComments(postId, commentPage, COMMENT_PAGE_SIZE),
    enabled: Number.isFinite(postId) && postId > 0,
  })
  const { watchAiReply, stopAiReplyWatch } = useAiReplyPoll()

  // 新帖等欢迎语：帖子新鲜且尚无评论时，定向等第一条评论出现（抓到即停）
  const isFreshPost = isFreshContent(post?.createdAt)
  useEffect(() => {
    if (!isFreshPost || commentsLoading || !commentsData) return
    if ((commentsData.items?.length || 0) > 0) return
    watchAiReply({
      queryKey: ['community-comments', postId, commentPage],
      isArrived: (cached: unknown) => ((cached as { items?: unknown[] })?.items || []).length > 0,
    })
    return () => stopAiReplyWatch()
  }, [
    isFreshPost,
    commentsLoading,
    commentsData,
    postId,
    commentPage,
    watchAiReply,
    stopAiReplyWatch,
  ])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['community-post', postId] })
    queryClient.invalidateQueries({ queryKey: ['community-comments', postId] })
    queryClient.invalidateQueries({ queryKey: ['community-posts'] })
  }

  const togglePostLike = useMutation({
    mutationFn: () => api.togglePostLike(postId),
    onSuccess: () => invalidateAll(),
    onError: () => toast.error(t('community.likeFailed')),
  })

  const deletePost = useMutation({
    mutationFn: () => api.deleteCommunityPost(postId),
    onSuccess: () => {
      toast.success(t('community.deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['community-posts'] })
      navigate('/community')
    },
    onError: () => toast.error(t('community.deleteFailed')),
  })

  const createComment = useMutation({
    mutationFn: () =>
      api.createCommunityComment(postId, commentInput.trim(), replyTarget?.parentId ?? undefined),
    onMutate: async () => {
      setSendState('sending')
      const queryKey = ['community-comments', postId, commentPage]
      await queryClient.cancelQueries({ queryKey })
      const prev = queryClient.getQueryData(queryKey)
      const parentId = replyTarget?.parentId ?? null
      const temp: CommunityComment = {
        id: -Date.now(),
        postId,
        userId: user?.id ?? 0,
        parentCommentId: parentId,
        content: commentInput.trim(),
        likeCount: 0,
        likedByMe: false,
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
      toast.success(t('community.commentSuccess'))
      if (data?.aiQuotaExhausted) toast.warning(t('ai.quotaExhausted'))
      setCommentInput('')
      setReplyTarget(null)
      setEmojiOpen(false)
      setSendState('sent')
      invalidateAll()
      // @ 了智能体且后台已接单：定向轮询等回复出现（抓到即停，无感）
      if (data?.aiPending && data?.agentUserId && data?.comment?.id) {
        const myId = data.comment.id as number
        const agentId = data.agentUserId as number
        watchAiReply({
          queryKey: ['community-comments', postId, commentPage],
          isArrived: (cached: unknown) => {
            const items = (cached as { items?: CommunityComment[] })?.items || []
            return items.some(
              (c) =>
                (c.id > myId && c.author?.id === agentId) ||
                (c.replies || []).some((r) => r.id > myId && r.author?.id === agentId)
            )
          },
        })
      }
      // 绿勾 1.2s 后自动复位
      setTimeout(() => setSendState('idle'), 1200)
    },
    onError: (e: Error, _v, context) => {
      setSendState('idle')
      if (context?.prev) queryClient.setQueryData(context.queryKey, context.prev)
      toast.error(e.message || t('community.commentFailed'))
    },
  })

  const deleteComment = useMutation({
    mutationFn: (commentId: number) => api.deleteCommunityComment(commentId),
    onSuccess: () => {
      toast.success(t('community.deleteSuccess'))
      invalidateAll()
    },
    onError: () => toast.error(t('community.deleteFailed')),
  })

  const toggleCommentLike = useMutation({
    mutationFn: (commentId: number) => api.toggleCommentLike(commentId),
    onSuccess: () => invalidateAll(),
    onError: () => toast.error(t('community.likeFailed')),
  })

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return t('time.justNow')
    if (diff < 3600) return t('time.minutesAgo', { count: Math.floor(diff / 60) })
    if (diff < 86400) return t('time.hoursAgo', { count: Math.floor(diff / 3600) })
    return t('time.daysAgo', { count: Math.floor(diff / 86400) })
  }

  const handleDeletePost = () => {
    setPendingDeletePost(true)
  }

  const confirmDeletePost = () => {
    deletePost.mutate()
    setPendingDeletePost(false)
  }

  const confirmDeleteComment = () => {
    if (pendingDeleteCommentId !== null) {
      deleteComment.mutate(pendingDeleteCommentId)
      setPendingDeleteCommentId(null)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success(t('community.linkCopied'))
    } catch {
      toast.error(t('community.linkCopyFailed'))
    }
  }

  const authorName = post?.author?.nickname?.trim() || post?.author?.username || '?'
  const canDeletePost = post && (post.userId === user?.id || isAdmin)
  const canSend = commentInput.trim().length > 0 && sendState !== 'sending'
  const wordCount = post ? postExcerpt(post.content || '').length : 0

  // 表情面板 Portal 到 body，用 fixed 定位避免被任何祖先容器裁剪
  const placeEmojiPanel = () => {
    const btn = emojiBtnRef.current
    if (!btn) return false
    const rect = btn.getBoundingClientRect()
    // 按钮滚出视口就直接关闭
    if (rect.top < 0 || rect.top > window.innerHeight) return false
    const w = 340
    const h = 380
    const gap = 8
    const left = Math.max(8, Math.min(rect.right - w, window.innerWidth - w - 8))
    const above = rect.top - h - gap
    setEmojiPos({ top: above < 8 ? rect.bottom + gap : above, left })
    return true
  }

  const toggleEmoji = () => {
    if (!emojiOpen && !placeEmojiPanel()) return
    setEmojiOpen((v) => !v)
  }

  // 滚动时面板跟随按钮（面板内部滚动忽略），按钮滚出视口则关闭
  useEffect(() => {
    if (!emojiOpen) return
    let raf = 0
    const reposition = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (!placeEmojiPanel()) setEmojiOpen(false)
      })
    }
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return
      reposition()
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', reposition)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', reposition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emojiOpen])

  // 表情插入到光标处
  const handleEmojiClick = (data: EmojiClickData) => {
    const el = textareaRef.current
    const emoji = data.emoji
    if (!el) {
      setCommentInput((v) => v + emoji)
      return
    }
    const start = el.selectionStart ?? commentInput.length
    const end = el.selectionEnd ?? commentInput.length
    setCommentInput(commentInput.slice(0, start) + emoji + commentInput.slice(end))
    if (sendState !== 'idle') setSendState('idle')
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + emoji.length
      el.setSelectionRange(pos, pos)
    })
  }

  const mention = useAiMention({
    value: commentInput,
    setValue: setCommentInput,
    textareaRef,
    maxLength: 2000,
    onExtraChange: () => {
      if (sendState === 'sent') setSendState('idle')
    },
  })

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention.handleMentionKeyDown(e)) return
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canSend) {
      e.preventDefault()
      createComment.mutate()
    }
  }

  // 点头像 @ 人：挂到对应主楼 + 落字 @用户名 + 聚焦（与回复按钮同线程）
  const handleMentionUser = (parentId: number, username: string) => {
    setReplyTarget({ parentId, username })
    insertTextAtCaret(textareaRef.current, commentInput, `@${username} `, setCommentInput, 2000)
  }

  return (
    <motion.div className="max-w-4xl mx-auto space-y-4" {...pageTransition}>
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link to="/community">
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t('community.backToList')}
        </Link>
      </Button>

      {/* 正文区 */}
      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-6 md:p-8">
          {postLoading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-8 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : postError || !post ? (
            <p className="text-center text-muted-foreground py-8">{t('community.notFound')}</p>
          ) : (
            <>
              {/* 作者行 */}
              <div className="flex items-center gap-3">
                <UserAvatar
                  avatar={post.author?.avatar}
                  username={post.author?.username || '?'}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground leading-tight">{authorName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTime(post.createdAt)} · {t('community.chars', { count: wordCount })} ·{' '}
                    {t('community.readingTime', {
                      count: Math.max(1, Math.ceil(wordCount / 400)),
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground shrink-0"
                  title={t('community.copyLink')}
                  onClick={handleCopyLink}
                >
                  <Link2 className="w-4 h-4" />
                </Button>
              </div>

              {/* 标题 */}
              <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-foreground mt-5 leading-snug">
                {post.title}
              </h1>
              <div className="border-t mt-5" />

              {/* 正文 */}
              {/<[a-z][\s\S]*>/i.test(post.content || '') ? (
                <div
                  className="article-content mt-4"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      linkifyUploadImages(cleanPostHtml(post.content || '')),
                      {
                        ADD_ATTR: ['target'],
                      }
                    ),
                  }}
                />
              ) : (
                <p className="text-[15px] text-foreground/90 mt-4 whitespace-pre-wrap leading-loose">
                  {post.content}
                </p>
              )}

              {/* 操作栏 */}
              <div className="flex items-center gap-2 mt-8 pt-4 border-t">
                <Button
                  variant={post.likedByMe ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 rounded-full px-4 ${post.likedByMe ? '' : 'text-muted-foreground'}`}
                  onClick={() => togglePostLike.mutate()}
                >
                  <Heart className={`w-4 h-4 mr-1.5 ${post.likedByMe ? 'fill-current' : ''}`} />
                  {post.likeCount}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full px-4 text-muted-foreground"
                  asChild
                >
                  <a href="#comments">
                    <MessageSquare className="w-4 h-4 mr-1.5" />
                    {post.commentCount}
                  </a>
                </Button>
                {canDeletePost && (
                  <div className="flex gap-1 ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-sm text-muted-foreground"
                      onClick={() => navigate(`/community/${postId}/edit`)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      {t('community.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-sm text-muted-foreground hover:text-destructive"
                      onClick={handleDeletePost}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t('common.delete')}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 评论区 */}
      {post && (
        <Card id="comments" className="overflow-hidden shadow-sm scroll-mt-4">
          <CardContent className="p-6 md:p-8">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <MessageSquare className="w-5 h-5 text-primary shrink-0" />
              {t('community.title')}
              <Badge variant="secondary" className="ml-1 tabular-nums">
                {post.commentCount}
              </Badge>
            </h2>

            <CommentList
              loading={commentsLoading}
              items={commentsData?.items || []}
              emptyText={t('community.noComments')}
              page={commentPage}
              pageSize={COMMENT_PAGE_SIZE}
              totalPages={commentsData?.pagination.totalPages || 0}
              total={commentsData?.pagination.total || 0}
              onPageChange={setCommentPage}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              originalPosterId={post?.userId}
              onToggleLike={(id) => toggleCommentLike.mutate(id)}
              onReply={(parentId, username) => {
                setReplyTarget({ parentId, username })
                textareaRef.current?.focus()
              }}
              onDelete={(id) => setPendingDeleteCommentId(id)}
              onMentionUser={handleMentionUser}
            />

            {/* 发表评论（底部输入框，支持回复 @） */}
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
                      {t('community.replyingTo', { username: replyTarget.username })}
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
                      ? t('community.replyPlaceholder', { username: replyTarget.username })
                      : t('community.commentPlaceholder')
                  }
                  onChange={(e) => mention.handleMentionChange(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
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
                {/* 内置操作区 */}
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1">
                  <Button
                    ref={emojiBtnRef}
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground"
                    title={t('editor.emoji')}
                    onClick={toggleEmoji}
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    disabled={!canSend}
                    onClick={() => createComment.mutate()}
                    className={`h-8 min-w-9 overflow-hidden transition-colors ${
                      sendState === 'sent' ? 'bg-green-500 hover:bg-green-500 text-white' : ''
                    }`}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {sendState === 'sending' ? (
                        <motion.span
                          key="sending"
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center"
                        >
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </motion.span>
                      ) : sendState === 'sent' ? (
                        <motion.span
                          key="sent"
                          initial={{ opacity: 0, scale: 0.4 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                          className="flex items-center"
                        >
                          <Check className="w-4 h-4" />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="send"
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center"
                        >
                          <Send className="w-4 h-4" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </div>
                {/* 表情面板：Portal 到 body，不受 Card overflow 裁剪 */}
                {emojiOpen &&
                  createPortal(
                    <>
                      <div
                        className="fixed inset-0 z-[60] cursor-default"
                        onClick={() => setEmojiOpen(false)}
                      />
                      <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        style={{
                          position: 'fixed',
                          top: emojiPos.top,
                          left: emojiPos.left,
                          zIndex: 70,
                        }}
                        className="rounded-xl border bg-background shadow-xl overflow-hidden"
                      >
                        <EmojiPicker
                          emojiData={emojiZh}
                          theme={resolvedTheme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                          emojiStyle={EmojiStyle.NATIVE}
                          width={340}
                          height={380}
                          previewConfig={{ showPreview: false }}
                          onEmojiClick={handleEmojiClick}
                        />
                      </motion.div>
                    </>,
                    document.body
                  )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 评论删除确认：shadcn Dialog */}
      <Dialog
        open={pendingDeleteCommentId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteCommentId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('community.commentDeleteTitle')}</DialogTitle>
            <DialogDescription>{t('community.commentDeleteConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteCommentId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteComment}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={pendingDeletePost} onOpenChange={setPendingDeletePost}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('community.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('community.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDeletePost}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

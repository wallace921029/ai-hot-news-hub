import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, assetUrl } from '@/services/api'
import { useUserStore } from '@/stores/user'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UserAvatar } from '@/components/UserAvatar'
import { EmojiPickerButton } from '@/components/EmojiPickerButton'
import { Pagination } from '@/components/Pagination'
import { ImageGrid } from '@/components/ImageGrid'
import {
  compressImage,
  validateImageFile,
  revokeCompressed,
  type CompressedImage,
} from '@/lib/image'
import { motion } from 'framer-motion'
import { pageTransition, staggerContainer, staggerItem } from '@/lib/animations'
import {
  Heart,
  MessageSquare,
  Trash2,
  Send,
  Radio,
  ChevronDown,
  Loader2,
  ImagePlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAiReplyPoll, isFreshContent } from '@/hooks/useAiReplyPoll'
import type { CommunityMoment, MomentComment } from '@/types'

const MOMENT_LIMIT = 280
const MAX_IMAGES = 9

function useFormatTime() {
  const { t } = useTranslation()
  return (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return t('time.justNow')
    if (diff < 3600) return t('time.minutesAgo', { count: Math.floor(diff / 60) })
    if (diff < 86400) return t('time.hoursAgo', { count: Math.floor(diff / 3600) })
    return t('time.daysAgo', { count: Math.floor(diff / 86400) })
  }
}

const COMMENT_PAGE_SIZE = 5

function MomentComments({
  momentId,
  momentCreatedAt,
  commentCount,
}: {
  momentId: number
  momentCreatedAt?: string
  commentCount: number
}) {
  const { t } = useTranslation()
  const { user, isAdmin } = useUserStore()
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [page, setPage] = useState(1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formatTime = useFormatTime()

  const previewKey = ['moment-comments', momentId, 'preview']
  const pageKey = ['moment-comments', momentId, 'page', page]
  const isFreshMoment = isFreshContent(momentCreatedAt)

  // 预览：最新 1 条（有评论才查；新鲜动态也查，否则欢迎语等不到）
  const { data: preview } = useQuery({
    queryKey: previewKey,
    queryFn: () => api.getMomentComments(momentId, 1, 1, 'desc'),
    enabled: commentCount > 0 || isFreshMoment,
  })
  // 展开：分页 5 条/页，时间正序
  const { data: pageData, isLoading: pageLoading } = useQuery({
    queryKey: pageKey,
    queryFn: () => api.getMomentComments(momentId, page, COMMENT_PAGE_SIZE),
    enabled: showAll,
  })
  const { watchAiReply, stopAiReplyWatch } = useAiReplyPoll()

  // 新动态等欢迎语：动态新鲜、预览为空，定向等第一条出现（抓到即停）
  useEffect(() => {
    if (!isFreshMoment || !preview) return
    if ((preview.items?.length || 0) > 0) return
    watchAiReply({
      queryKey: previewKey,
      isArrived: (cached: unknown) => ((cached as { items?: unknown[] })?.items || []).length > 0,
    })
    return () => stopAiReplyWatch()
  }, [isFreshMoment, preview, momentId, watchAiReply, stopAiReplyWatch])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['moment-comments', momentId] })
    queryClient.invalidateQueries({ queryKey: ['moments'] })
  }

  const createComment = useMutation({
    mutationFn: () => api.createMomentComment(momentId, input.trim()),
    onMutate: async () => {
      setSending(true)
      await queryClient.cancelQueries({ queryKey: previewKey })
      await queryClient.cancelQueries({ queryKey: pageKey })
      const prevPreview = queryClient.getQueryData(previewKey)
      const prevPage = queryClient.getQueryData(pageKey)
      const temp: MomentComment = {
        id: -Date.now(),
        momentId,
        userId: user?.id ?? 0,
        content: input.trim(),
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
      }
      // 预览永远是最新 1 条：自己的新评论直接顶上去
      queryClient.setQueryData(previewKey, (old: any) =>
        old
          ? {
              ...old,
              items: [temp],
              pagination: { ...old.pagination, total: (old.pagination?.total ?? 0) + 1 },
            }
          : old
      )
      // 展开的分页里也追加一条（ showing 即时反馈）
      queryClient.setQueryData(pageKey, (old: any) =>
        old ? { ...old, items: [...(old.items || []), temp] } : old
      )
      return { prevPreview, prevPage, previewKey, pageKey }
    },
    onSuccess: (data) => {
      toast.success(t('moments.commentSuccess'))
      if (data?.aiQuotaExhausted) toast.warning(t('ai.quotaExhausted'))
      setInput('')
      setSending(false)
      invalidate()
      // @ 了智能体且后台已接单：定向轮询等回复出现（抓到即停，无感）
      if (data?.aiPending && data?.agentUserId && data?.comment?.id) {
        const myId = data.comment.id as number
        const agentId = data.agentUserId as number
        watchAiReply({
          queryKey: previewKey,
          isArrived: (cached: unknown) => {
            const items = (cached as { items?: MomentComment[] })?.items || []
            return items.some((c) => c.id > myId && c.author?.id === agentId)
          },
        })
      }
    },
    onError: (e: Error, _v, context) => {
      setSending(false)
      if (context?.prevPreview) queryClient.setQueryData(context.previewKey, context.prevPreview)
      if (context?.prevPage) queryClient.setQueryData(context.pageKey, context.prevPage)
      toast.error(e.message || t('moments.commentFailed'))
    },
  })

  const deleteComment = useMutation({
    mutationFn: (id: number) => api.deleteMomentComment(id),
    onSuccess: () => {
      toast.success(t('moments.deleteSuccess'))
      invalidate()
    },
    onError: () => toast.error(t('moments.deleteFailed')),
  })

  const toggleLike = useMutation({
    mutationFn: (id: number) => api.toggleMomentCommentLike(id),
    onSuccess: () => invalidate(),
    onError: () => toast.error(t('moments.likeFailed')),
  })

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current
    if (!el) {
      setInput((v) => v + emoji)
      return
    }
    const start = el.selectionStart ?? input.length
    const end = el.selectionEnd ?? input.length
    setInput(input.slice(0, start) + emoji + input.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + emoji.length
      el.setSelectionRange(pos, pos)
    })
  }

  const canSend = input.trim().length > 0 && !sending
  const submit = () => {
    if (canSend) createComment.mutate()
  }

  const confirmDelete = () => {
    if (pendingDeleteId !== null) {
      deleteComment.mutate(pendingDeleteId)
      setPendingDeleteId(null)
    }
  }

  const renderRow = (c: MomentComment) => {
    const name = c.author?.nickname?.trim() || c.author?.username || '?'
    const canDelete = c.userId === user?.id || isAdmin
    return (
      <div key={c.id} className="flex gap-2">
        <UserAvatar
          avatar={c.author?.avatar}
          username={c.author?.username || '?'}
          size={24}
          className="mt-0.5 shrink-0 self-start"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-medium text-foreground/85">{name}</span>
            <span className="text-muted-foreground">{formatTime(c.createdAt)}</span>
          </div>
          <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap leading-relaxed">
            {c.content}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 px-2 text-xs rounded-full ${c.likedByMe ? 'text-rose-500' : 'text-muted-foreground'}`}
              onClick={() => toggleLike.mutate(c.id)}
            >
              <Heart className={`w-3 h-3 mr-1 ${c.likedByMe ? 'fill-current' : ''}`} />
              {c.likeCount > 0 ? c.likeCount : ''}
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs rounded-full text-muted-foreground/70 hover:text-destructive"
                onClick={() => setPendingDeleteId(c.id)}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                {t('common.delete')}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const previewItems = preview?.items || []
  const previewTotal = preview?.pagination?.total ?? commentCount

  return (
    <>
      <div className="mt-3 rounded-xl bg-muted/40 p-3 space-y-3">
        {!showAll ? (
          <>
            <div className="space-y-3">{previewItems.map(renderRow)}</div>
            {previewTotal === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                {t('moments.noComments')}
              </p>
            )}
            {previewTotal > 1 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="text-xs text-primary/80 hover:text-primary transition-colors"
              >
                {t('moments.viewAllComments', { count: previewTotal })}
              </button>
            )}
          </>
        ) : pageLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : (
          <>
            <div className="space-y-3">{(pageData?.items || []).map(renderRow)}</div>
            {(pageData?.pagination.totalPages || 0) > 1 && (
              <Pagination
                page={page}
                totalPages={pageData.pagination.totalPages}
                total={pageData.pagination.total}
                pageSize={COMMENT_PAGE_SIZE}
                onPageChange={setPage}
              />
            )}
            <button
              type="button"
              onClick={() => {
                setShowAll(false)
                setPage(1)
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('moments.collapseComments')}
            </button>
          </>
        )}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              maxLength={500}
              rows={1}
              placeholder={t('moments.commentPlaceholder')}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault()
                  submit()
                }
              }}
              className="flex min-h-[36px] w-full rounded-lg border border-input bg-background px-3 py-2 pr-20 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
            <div className="absolute bottom-1 right-1 flex items-center">
              <EmojiPickerButton onSelect={insertEmoji} />
              <Button size="sm" disabled={!canSend} onClick={submit} className="h-7 min-w-7">
                {sending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('moments.commentDeleteTitle')}</DialogTitle>
            <DialogDescription>{t('moments.commentDeleteConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MomentCard({
  moment,
  onDeleteRequest,
}: {
  moment: CommunityMoment
  onDeleteRequest: (id: number) => void
}) {
  const { t } = useTranslation()
  const { user, isAdmin } = useUserStore()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(true)
  const formatTime = useFormatTime()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['moments'] })
  const canDelete = moment.userId === user?.id || isAdmin
  const authorName = moment.author?.nickname?.trim() || moment.author?.username || '?'

  const toggleLike = useMutation({
    mutationFn: () => api.toggleMomentLike(moment.id),
    onSuccess: () => invalidate(),
    onError: () => toast.error(t('moments.likeFailed')),
  })

  return (
    <motion.div variants={staggerItem} className="relative z-10">
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <UserAvatar
              avatar={moment.author?.avatar}
              username={moment.author?.username || '?'}
              size={32}
              className="shrink-0 self-start"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{authorName}</span>
                <span>·</span>
                <span>{formatTime(moment.createdAt)}</span>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-muted-foreground/60 hover:text-destructive ml-auto"
                    onClick={() => onDeleteRequest(moment.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-[15px] text-foreground/90 mt-1.5 whitespace-pre-wrap leading-relaxed">
                {moment.content}
              </p>
              {moment.images && moment.images.length > 0 && (
                <ImageGrid
                  images={moment.images.map((img) => ({
                    thumbUrl: assetUrl(img.thumbUrl),
                    originalUrl: assetUrl(img.originalUrl),
                    width: img.width,
                    height: img.height,
                  }))}
                />
              )}
              <div className="flex items-center gap-1 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 text-xs rounded-full ${moment.likedByMe ? 'text-rose-500' : 'text-muted-foreground'}`}
                  onClick={() => toggleLike.mutate()}
                >
                  <Heart className={`w-3.5 h-3.5 mr-1 ${moment.likedByMe ? 'fill-current' : ''}`} />
                  {moment.likeCount > 0 ? moment.likeCount : t('moments.likeAction')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs rounded-full text-muted-foreground"
                  title={
                    expanded
                      ? t('moments.collapseComments')
                      : t('moments.expandComments', { count: moment.commentCount })
                  }
                  onClick={() => setExpanded((v) => !v)}
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1" />
                  {moment.commentCount > 0 ? moment.commentCount : t('moments.commentAction')}
                  <ChevronDown
                    className={`w-3.5 h-3.5 ml-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  />
                </Button>
              </div>
              {expanded && (
                <MomentComments
                  momentId={moment.id}
                  momentCreatedAt={moment.createdAt}
                  commentCount={moment.commentCount}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const MOMENT_PAGE_SIZE = 50

export function MomentsPage() {
  const [tab, setTab] = useState<'all' | 'mine'>('all')
  const [input, setInput] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [pendingDeleteMomentId, setPendingDeleteMomentId] = useState<number | null>(null)
  const [draftImages, setDraftImages] = useState<CompressedImage[]>([])
  const [pickingImages, setPickingImages] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['moments', tab],
    queryFn: ({ pageParam }) =>
      api.getMoments({ page: pageParam, pageSize: MOMENT_PAGE_SIZE, mine: tab === 'mine' }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
  })

  const items = data?.pages.flatMap((p) => p.items) ?? []

  // 触底加载更多
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, items.length])

  const createMoment = useMutation({
    mutationFn: async () => {
      let images:
        | Array<{ originalUrl: string; thumbUrl: string; width?: number; height?: number }>
        | undefined
      if (draftImages.length > 0) {
        const res = await api.uploadImages(draftImages.map((d) => d.original))
        images = res.images.map((img) => ({
          originalUrl: img.originalUrl,
          thumbUrl: img.thumbUrl,
          width: img.width,
          height: img.height,
        }))
      }
      return api.createMoment(input.trim(), images)
    },
    onMutate: () => setPublishing(true),
    onSuccess: () => {
      toast.success(t('moments.publishSuccess'))
      setInput('')
      draftImages.forEach(revokeCompressed)
      setDraftImages([])
      setPublishing(false)
      queryClient.invalidateQueries({ queryKey: ['moments'] })
    },
    onError: (e: Error) => {
      setPublishing(false)
      toast.error(e.message || t('moments.publishFailed'))
    },
  })

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current
    if (!el) {
      setInput((v) => (v + emoji).slice(0, MOMENT_LIMIT))
      return
    }
    const start = el.selectionStart ?? input.length
    const end = el.selectionEnd ?? input.length
    setInput((input.slice(0, start) + emoji + input.slice(end)).slice(0, MOMENT_LIMIT))
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + emoji.length
      el.setSelectionRange(pos, pos)
    })
  }

  const canPublish = (input.trim().length > 0 || draftImages.length > 0) && !publishing
  const submit = () => {
    if (canPublish) createMoment.mutate()
  }

  const handlePickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return

    const room = MAX_IMAGES - draftImages.length
    if (files.length > room) {
      toast.error(t('moments.imageTooMany'))
      files.length = room
    }

    setPickingImages(true)
    try {
      const accepted: CompressedImage[] = []
      for (const file of files) {
        const err = validateImageFile(file)
        if (err) {
          toast.error(err)
          continue
        }
        try {
          accepted.push(await compressImage(file))
        } catch {
          toast.error(t('moments.imageInvalid'))
        }
      }
      if (accepted.length) setDraftImages((prev) => [...prev, ...accepted])
    } finally {
      setPickingImages(false)
    }
  }

  const removeDraftImage = (index: number) => {
    setDraftImages((prev) => {
      const target = prev[index]
      if (target) revokeCompressed(target)
      return prev.filter((_, i) => i !== index)
    })
  }

  const deleteMoment = useMutation({
    mutationFn: (id: number) => api.deleteMoment(id),
    onSuccess: () => {
      toast.success(t('moments.deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['moments'] })
    },
    onError: () => toast.error(t('moments.deleteFailed')),
  })

  const confirmDeleteMoment = () => {
    if (pendingDeleteMomentId !== null) {
      deleteMoment.mutate(pendingDeleteMomentId)
      setPendingDeleteMomentId(null)
    }
  }

  return (
    <motion.div className="max-w-4xl mx-auto space-y-4" {...pageTransition}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h1 className="text-2xl font-semibold text-foreground flex items-center">
          <Radio className="w-5 h-5 mr-2 shrink-0 text-primary" />
          {t('moments.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('moments.subtitle')}</p>
      </motion.div>

      {/* 发射台 */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  maxLength={MOMENT_LIMIT}
                  rows={3}
                  placeholder={t('moments.placeholder')}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault()
                      submit()
                    }
                  }}
                  className="flex min-h-[84px] w-full rounded-xl border border-input bg-muted/40 px-3.5 py-2.5 pb-12 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-background transition-colors disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                />
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1">
                  <span className="text-[11px] tabular-nums text-muted-foreground/70 mr-1">
                    {input.length} / {MOMENT_LIMIT}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-full text-muted-foreground"
                    title={t('moments.addImage')}
                    disabled={pickingImages || draftImages.length >= MAX_IMAGES}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {pickingImages ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <EmojiPickerButton onSelect={insertEmoji} />
                  <Button
                    type="button"
                    size="icon"
                    disabled={!canPublish}
                    onClick={submit}
                    title={t('moments.publish')}
                    className="h-8 w-8 rounded-full"
                  >
                    {publishing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              {draftImages.length > 0 && (
                <ImageGrid
                  editable
                  onRemove={removeDraftImage}
                  images={draftImages.map((d) => ({
                    thumbUrl: d.thumbUrl,
                    originalUrl: d.originalPreviewUrl,
                  }))}
                />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handlePickImages}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as 'all' | 'mine')
        }}
      >
        <TabsList>
          <TabsTrigger value="all">{t('moments.allMoments')}</TabsTrigger>
          <TabsTrigger value="mine">{t('moments.myMoments')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !items.length ? (
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="text-center py-16">
                <Radio className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">{t('moments.empty')}</p>
                <p className="text-sm text-muted-foreground/60 mt-1">{t('moments.emptyDesc')}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="relative space-y-3"
          >
            {/* 全局串联线：z-0 垫在卡片下，只在卡片间隙露出 */}
            <div aria-hidden className="absolute left-[31.5px] top-8 bottom-8 z-0 w-px bg-border" />
            {items.map((m: CommunityMoment) => (
              <MomentCard key={m.id} moment={m} onDeleteRequest={setPendingDeleteMomentId} />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* 触底加载哨兵 */}
      <div ref={loadMoreRef} aria-hidden className="h-1" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-2">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!hasNextPage && items.length > 0 && (
        <p className="text-center text-xs text-muted-foreground/60 pb-2">{t('moments.noMore')}</p>
      )}

      <Dialog
        open={pendingDeleteMomentId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteMomentId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('moments.deleteTitle')}</DialogTitle>
            <DialogDescription>{t('moments.deleteConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteMomentId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteMoment}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

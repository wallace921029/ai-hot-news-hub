import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useUserStore } from '@/stores/user'
import { Input } from '@/components/ui/input'
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
import { RichEditor } from '@/components/RichEditor'
import { cleanPostHtml, postTextLength } from '@/lib/post'
import { UserAvatar } from '@/components/UserAvatar'
import { motion } from 'framer-motion'
import { pageTransition } from '@/lib/animations'
import { ArrowLeft, Send, PenLine, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

export function PostEditorPage() {
  const { id } = useParams()
  const postId = id ? Number(id) : null
  const isEdit = postId !== null && Number.isFinite(postId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { user } = useUserStore()
  const submittedRef = useRef(false)

  const [title, setTitle] = useState('')
  const [html, setHtml] = useState('')
  const [plainText, setPlainText] = useState('')
  const [initialized, setInitialized] = useState(!isEdit)
  const [pendingLeave, setPendingLeave] = useState(false)

  const { data: post, isLoading } = useQuery({
    queryKey: ['community-post', postId],
    queryFn: () => api.getCommunityPost(postId as number),
    enabled: isEdit,
  })

  // 编辑模式：预填 + 鉴权
  useEffect(() => {
    if (!isEdit || !post || initialized) return
    if (post.userId !== user?.id) {
      toast.error(t('community.noPermission'))
      navigate('/community', { replace: true })
      return
    }
    setTitle(post.title || '')
    setHtml(post.content || '')
    setPlainText(stripHtml(post.content || ''))
    setInitialized(true)
  }, [isEdit, post, initialized, user?.id, navigate, t])

  const dirty = title.trim().length > 0 || plainText.trim().length > 0

  // 离开页面前提醒未保存的内容
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      if (submittedRef.current) return
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const invalidatePosts = () => {
    queryClient.invalidateQueries({ queryKey: ['community-posts'] })
    if (isEdit) {
      queryClient.invalidateQueries({ queryKey: ['community-post', postId] })
      queryClient.invalidateQueries({ queryKey: ['community-comments', postId] })
    }
  }

  const createPost = useMutation({
    mutationFn: () =>
      api.createCommunityPost({ title: title.trim(), content: cleanPostHtml(html) }),
    onSuccess: (res) => {
      submittedRef.current = true
      toast.success(t('community.publishSuccess'))
      invalidatePosts()
      navigate(`/community/${res.post.id}`)
    },
    onError: (e: Error) => toast.error(e.message || t('community.publishFailed')),
  })

  const updatePost = useMutation({
    mutationFn: () =>
      api.updateCommunityPost(postId as number, {
        title: title.trim(),
        content: cleanPostHtml(html),
      }),
    onSuccess: () => {
      submittedRef.current = true
      toast.success(t('community.updateSuccess'))
      invalidatePosts()
      navigate(`/community/${postId}`)
    },
    onError: (e: Error) => toast.error(e.message || t('community.updateFailed')),
  })

  const pending = createPost.isPending || updatePost.isPending
  const textLen = postTextLength(html)
  const hasImage = /<img\s/i.test(html)
  const canSubmit =
    !pending && title.trim().length > 0 && (textLen > 0 || hasImage) && html.length <= 20000

  const handleSubmit = () => {
    if (!canSubmit) return
    if (isEdit) updatePost.mutate()
    else createPost.mutate()
  }

  const handleBack = () => {
    if (dirty) {
      setPendingLeave(true)
      return
    }
    navigate(isEdit ? `/community/${postId}` : '/community')
  }

  const confirmLeave = () => {
    setPendingLeave(false)
    navigate(isEdit ? `/community/${postId}` : '/community')
  }

  const authorName = user?.nickname?.trim() || user?.username || '?'
  const wordCount = textLen

  return (
    <motion.div className="max-w-4xl mx-auto space-y-5" {...pageTransition}>
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link to={isEdit ? `/community/${postId}` : '/community'}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t('community.backToList')}
        </Link>
      </Button>

      {/* 标题区：图标徽标 + 作者行 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center gap-3"
      >
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <PenLine className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground leading-tight">
            {isEdit ? t('community.editTitle') : t('community.createTitle')}
          </h1>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <UserAvatar avatar={user?.avatar} username={user?.username || '?'} size={18} />
            <span className="font-medium text-foreground/70">{authorName}</span>
            <span>·</span>
            <span>{t('community.writingAs')}</span>
          </div>
        </div>
      </motion.div>

      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {isEdit && isLoading ? (
            <div className="p-6 md:p-8 space-y-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
              {/* 无框大标题 */}
              <div className="px-6 md:px-8 pt-6">
                <Input
                  id="editor-title"
                  value={title}
                  maxLength={100}
                  placeholder={t('community.postTitlePlaceholder')}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-0 rounded-none shadow-none focus-visible:ring-0 text-xl md:text-2xl font-semibold px-0 h-auto py-2 placeholder:text-muted-foreground/50 placeholder:font-normal"
                />
                <div className="flex justify-end">
                  <span className="text-[11px] tabular-nums text-muted-foreground/70">
                    {title.trim().length} / 100
                  </span>
                </div>
              </div>

              <div className="mx-6 md:mx-8 border-t" />

              {/* 编辑器 */}
              <div className="px-3 md:px-5 py-2">
                {initialized && (
                  <RichEditor
                    value={html}
                    placeholder={t('community.editorPlaceholder')}
                    onChange={(nextHtml, text) => {
                      setHtml(nextHtml)
                      setPlainText(text)
                    }}
                  />
                )}
              </div>

              {/* 快捷键提示 */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 md:px-8 pb-3 text-xs text-muted-foreground/80">
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    /
                  </kbd>
                  {t('community.tipSlash')}
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    :
                  </kbd>
                  {t('community.tipColon')}
                </span>
              </div>

              {/* 底部操作栏 */}
              <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-6 md:px-8 py-3">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {t('community.chars', { count: wordCount })} ·{' '}
                  {t('community.readingTime', { count: Math.max(1, Math.ceil(wordCount / 400)) })}
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleBack}>
                    {t('common.cancel')}
                  </Button>
                  <Button disabled={!canSubmit} onClick={handleSubmit}>
                    {pending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {pending
                      ? t('community.publishing')
                      : isEdit
                        ? t('community.update')
                        : t('community.publish')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={pendingLeave} onOpenChange={setPendingLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('community.unsavedLeaveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('community.unsavedLeave')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave}>{t('common.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

function stripHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

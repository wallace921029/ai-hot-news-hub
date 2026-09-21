import { useParams, useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { pageTransition } from '@/lib/animations'
import { ArrowLeft, ExternalLink, Star, Clock, Globe, User, BarChart3, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

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

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

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
    <motion.div className="max-w-3xl mx-auto space-y-6" {...pageTransition}>
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
        <ArrowLeft className="w-4 h-4" />
        {t('newsDetail.backToList')}
      </Button>

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
          <Badge variant="outline">{item.platform}</Badge>
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
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {item.description}
            </p>
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
    </motion.div>
  )
}

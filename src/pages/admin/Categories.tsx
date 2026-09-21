import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Tag, Plus, Pencil, Trash2, Merge, ArrowUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Category {
  id: number
  name: string
  description: string | null
  icon: string | null
  sortOrder: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

interface CategoryForm {
  name: string
  description: string
  icon: string
  sortOrder: number
  enabled: boolean
}

const defaultForm: CategoryForm = {
  name: '',
  description: '',
  icon: '',
  sortOrder: 0,
  enabled: true,
}

export function AdminCategories() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<CategoryForm>(defaultForm)
  const [showMerge, setShowMerge] = useState(false)
  const [mergeSourceId, setMergeSourceId] = useState<number | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null)

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.getAdminCategories() as Promise<Category[]>,
  })

  const createMutation = useMutation({
    mutationFn: (data: CategoryForm) => api.createCategory(data),
    onSuccess: () => {
      toast.success(t('admin.categories.createSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      resetForm()
    },
    onError: () => toast.error(t('common.failed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CategoryForm> }) =>
      api.updateCategory(id, data),
    onSuccess: () => {
      toast.success(t('admin.categories.updateSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      resetForm()
    },
    onError: () => toast.error(t('common.failed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCategory(id),
    onSuccess: () => {
      toast.success(t('admin.categories.deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
    },
    onError: () => toast.error(t('common.failed')),
  })

  const resetForm = () => {
    setForm(defaultForm)
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (cat: Category) => {
    setForm({
      name: cat.name,
      description: cat.description || '',
      icon: cat.icon || '',
      sortOrder: cat.sortOrder,
      enabled: cat.enabled,
    })
    setEditingId(cat.id)
    setShowForm(true)
  }

  const handleSubmit = () => {
    if (!form.name.trim()) return

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const handleMerge = () => {
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) return
    const source = categories?.find((c) => c.id === mergeSourceId)
    const target = categories?.find((c) => c.id === mergeTargetId)
    if (!source || !target) return

    if (!confirm(t('admin.categories.mergeConfirm', { source: source.name, target: target.name })))
      return

    // Update source items to target, then delete source
    api.deleteCategory(mergeSourceId).then(() => {
      toast.success(t('admin.categories.mergeSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      setShowMerge(false)
      setMergeSourceId(null)
      setMergeTargetId(null)
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t('admin.categories.title')}</h1>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.categories.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.categories.total', { count: categories?.length || 0 })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setShowMerge(!showMerge)}>
            <Merge className="h-4 w-4 mr-2 shrink-0" />
            {t('admin.categories.mergeCategory')}
          </Button>
          <Button
            type="button"
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2 shrink-0" />
            {t('admin.categories.addCategory')}
          </Button>
        </div>
      </div>

      {/* Merge panel */}
      {showMerge && (
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <h3 className="font-medium">{t('admin.categories.mergeCategory')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('admin.categories.name')} (Source)</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={mergeSourceId ?? ''}
                onChange={(e) => setMergeSourceId(Number(e.target.value) || null)}
              >
                <option value="">--</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('admin.categories.mergeTarget')}</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={mergeTargetId ?? ''}
                onChange={(e) => setMergeTargetId(Number(e.target.value) || null)}
              >
                <option value="">--</option>
                {categories
                  ?.filter((c) => c.id !== mergeSourceId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleMerge}
              disabled={!mergeSourceId || !mergeTargetId}
            >
              {t('common.confirm')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowMerge(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Form dialog */}
      {showForm && (
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <h3 className="font-medium">
            {editingId ? t('admin.categories.editCategory') : t('admin.categories.addCategory')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('admin.categories.name')} *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('admin.categories.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.categories.icon')}</Label>
              <Input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder={t('admin.categories.iconPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.categories.description')}</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('admin.categories.descriptionPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.categories.sortOrder')}</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
            />
            <Label>
              {form.enabled ? t('admin.categories.enabled') : t('admin.categories.disabled')}
            </Label>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={handleSubmit} disabled={!form.name.trim()}>
              {t('common.save')}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Category list */}
      <div className="rounded-xl border bg-card text-card-foreground overflow-hidden">
        {!categories?.length ? (
          <div className="text-center py-16">
            <Tag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t('admin.categories.noCategories')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {cat.icon && <span className="text-lg">{cat.icon}</span>}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{cat.name}</span>
                      {!cat.enabled && (
                        <Badge variant="outline" className="text-[10px]">
                          {t('admin.categories.disabled')}
                        </Badge>
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground mr-2 flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3 shrink-0" />
                    {cat.sortOrder}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(cat)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(t('admin.categories.deleteConfirm'))) {
                        deleteMutation.mutate(cat.id)
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

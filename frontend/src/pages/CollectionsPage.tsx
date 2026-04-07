import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Folders, Plus, Globe, Lock, Star } from 'lucide-react'
import { titleToColor } from '@/lib/colorHash'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { collectionsApi } from '@/api/collections'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageContainer } from '@/components/layout/PageContainer'
import type { Collection } from '@/types'

// ─── Star rating (display only) ──────────────────────────────────────────────

function StarRating({ value }: { value?: number | null }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3 ${i < value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  )
}

// ─── Create/Edit Dialog ───────────────────────────────────────────────────────

function CollectionDialog({ open, onClose, initial }: {
  open: boolean; onClose: () => void; initial?: Collection
}) {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const isEdit = !!initial

  const collectionSchema = z.object({
    name: z.string().min(1, t('collections.validation.nameRequired')).max(60, t('collections.validation.nameTooLong')),
    description: z.string().max(200, t('collections.validation.descTooLong')).optional(),
    isPublic: z.boolean(),
  })
  type CollectionForm = z.infer<typeof collectionSchema>

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<CollectionForm>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      isPublic: initial?.isPublic ?? false,
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const isPublic = watch('isPublic')

  const mutation = useMutation({
    mutationFn: (data: CollectionForm) =>
      isEdit ? collectionsApi.update(initial!.id, data) : collectionsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(isEdit ? t('collections.updateSuccess') : t('collections.createSuccess'))
      reset()
      onClose()
    },
    onError: () => toast.error(t('collections.saveError')),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('collections.editTitle') : t('collections.createTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="col-name">{t('collections.nameLabel')}</Label>
            <Input id="col-name" placeholder={t('collections.namePlaceholder')} {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="col-desc">
              {t('collections.descLabel')}{' '}
              <span className="text-muted-foreground">{t('collections.descOptional')}</span>
            </Label>
            <Input id="col-desc" placeholder={t('collections.descPlaceholder')} {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <button
            type="button"
            onClick={() => setValue('isPublic', !isPublic)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left ${
              isPublic ? 'border-primary bg-primary/5' : 'border-border bg-background'
            }`}
          >
            {isPublic
              ? <Globe className="size-4 text-primary shrink-0" />
              : <Lock className="size-4 text-muted-foreground shrink-0" />}
            <div>
              <p className="text-sm font-medium">{isPublic ? t('collections.public') : t('collections.private')}</p>
              <p className="text-xs text-muted-foreground">
                {isPublic ? t('collections.publicHint') : t('collections.privateHint')}
              </p>
            </div>
          </button>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? t('collections.saving')
                : isEdit ? t('collections.saveChanges') : t('collections.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Collection Card ──────────────────────────────────────────────────────────

function CollectionCard({ collection }: { collection: Collection }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const comicCount = collection._count?.comics ?? 0

  const yearLabel = collection.yearRange
    ? collection.yearRange.min === collection.yearRange.max
      ? String(collection.yearRange.min)
      : `${collection.yearRange.min} – ${collection.yearRange.max}`
    : null

  const color = titleToColor(collection.name)
  const covers = collection.previewCovers ?? []

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden gap-0  "
      onClick={() => navigate(`/collections/${collection.id}`)}
    >
      {/* Accent line — always visible */}
      <div className="h-2 w-full shrink-0" style={{ backgroundColor: color }} />

      {/* Cover mosaic or placeholder — always h-20 */}
      {covers.length >= 2 ? (
        <div className="grid grid-cols-4 h-20 w-full overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="overflow-hidden bg-muted">
              {covers[i]
                ? <img src={covers[i]} alt="" className="w-full h-full object-cover" loading="lazy" />
                : <div className="w-full h-full" style={{ backgroundColor: `${color}${i % 2 === 0 ? '33' : '1a'}` }} />}
            </div>
          ))}
        </div>
      ) : (
        <div className="h-20 w-full flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
          <Folders className="size-7 opacity-20" style={{ color }} />
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex items-start gap-2.5 mb-2.5">
          <div
            className="flex items-center justify-center size-8 rounded-lg shrink-0 mt-0.5"
            style={{ backgroundColor: `${color}26` }}
          >
            <Folders className="size-4" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-tight truncate">{collection.name}</p>
            {collection.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{collection.description}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1 text-xs font-normal">
            {collection.isPublic
              ? <><Globe className="size-3" />{t('collections.public')}</>
              : <><Lock className="size-3" />{t('collections.private')}</>}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {t('collections.comicCount', { count: comicCount })}
          </span>
          {yearLabel && (
            <span className="text-xs text-muted-foreground">{yearLabel}</span>
          )}
        </div>

        {/* Rating */}
        {collection.rating && (
          <div className="mt-1.5">
            <StarRating value={collection.rating} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Sort options ─────────────────────────────────────────────────────────────

type SortField = 'name' | 'count' | 'year' | 'rating'

function sortCollections(cols: Collection[], field: SortField, dir: 'asc' | 'desc') {
  const d = dir === 'asc' ? 1 : -1
  return [...cols].sort((a, b) => {
    if (field === 'name') return d * a.name.localeCompare(b.name)
    if (field === 'count') return d * ((a._count?.comics ?? 0) - (b._count?.comics ?? 0))
    if (field === 'year') {
      const ay = a.yearRange?.min ?? 0
      const by = b.yearRange?.min ?? 0
      return d * (ay - by)
    }
    if (field === 'rating') return d * ((a.rating ?? 0) - (b.rating ?? 0))
    return 0
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CollectionsPage() {
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const { data: collections, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.getAll,
  })

  const sorted = useMemo(
    () => sortCollections(collections ?? [], sortField, sortDir),
    [collections, sortField, sortDir],
  )

  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'name',   label: t('collections.sortName')   },
    { field: 'count',  label: t('collections.sortCount')  },
    { field: 'year',   label: t('collections.sortYear')   },
    { field: 'rating', label: t('collections.sortRating') },
  ]

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('collections.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('collections.subtitle')}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="size-4" />
          {t('collections.newCollection')}
        </Button>
      </div>

      {/* Sort bar */}
      {!isLoading && (collections?.length ?? 0) > 1 && (
        <div className="flex items-center gap-1.5 mb-4">
          <span className="text-xs text-muted-foreground shrink-0">{t('library.sortBy')}:</span>
          {sortOptions.map(({ field, label }) => {
            const isActive = sortField === field
            return (
              <button
                key={field}
                onClick={() => {
                  if (isActive) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
                  else { setSortField(field); setSortDir('asc') }
                }}
                className={`chip-sort ${isActive ? 'chip-active' : 'chip-inactive'}`}
              >
                {label}
                {isActive && <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : !sorted.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-muted mb-4">
            <Folders className="size-8 text-muted-foreground" />
          </div>
          <p className="font-medium">{t('collections.emptyState')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('collections.emptyStateHint')}</p>
          <Button onClick={() => setDialogOpen(true)} className="mt-4 gap-2">
            <Plus className="size-4" />
            {t('collections.newCollection')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {sorted.map((col) => (
            <CollectionCard key={col.id} collection={col} />
          ))}
        </div>
      )}

      <CollectionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </PageContainer>
  )
}

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Folders, Plus, Globe, Lock, Search, X, Layers, ChevronDown, LayoutGrid } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { collectionsApi } from '@/api/collections'
import { libraryApi } from '@/api/library'
import { ProgressOverlay } from '@/components/features/ProgressOverlay'
import { CollectionStatusBadge } from '@/components/features/CollectionStatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/empty-state'
import type { Collection, UserSeriesSummary } from '@/types'

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
    totalVolumes: z.coerce.number().int().min(1).optional().nullable(),
    initialSeriesName: z.string().min(1).max(100).optional(),
  })
  type CollectionForm = z.infer<typeof collectionSchema>

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<CollectionForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(collectionSchema) as any,
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      isPublic: initial?.isPublic ?? false,
      totalVolumes: initial?.totalVolumes ?? undefined,
      initialSeriesName: '',
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const isPublic = watch('isPublic')

  const mutation = useMutation({
    mutationFn: (data: CollectionForm) => {
      const payload = {
        ...data,
        totalVolumes: data.totalVolumes ?? undefined,
        initialSeriesName: !isEdit && data.initialSeriesName?.trim() ? data.initialSeriesName.trim() : undefined,
      }
      return isEdit ? collectionsApi.update(initial!.id, payload) : collectionsApi.create(payload)
    },
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
          <div className="space-y-1.5">
            <Label htmlFor="col-total-volumes">
              {t('collections.totalVolumesLabel')}{' '}
              <span className="text-muted-foreground">{t('collections.descOptional')}</span>
            </Label>
            <Input
              id="col-total-volumes"
              type="number"
              min={1}
              placeholder={t('collections.totalVolumesPlaceholder')}
              {...register('totalVolumes')}
            />
            {errors.totalVolumes && <p className="text-xs text-destructive">{errors.totalVolumes.message}</p>}
          </div>
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="col-initial-series">
                {t('collections.initialSeriesLabel')}{' '}
                <span className="text-muted-foreground">{t('collections.descOptional')}</span>
              </Label>
              <Input
                id="col-initial-series"
                placeholder={t('collections.initialSeriesPlaceholder')}
                {...register('initialSeriesName')}
              />
            </div>
          )}
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
  const covers = collection.previewCovers ?? []
  const comicCount = collection._count?.comics ?? 0
  const seriesCount = collection._count?.series ?? 0

  return (
    <article
      className="group flex flex-col bg-card rounded-lg overflow-hidden hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      onClick={() => navigate(`/collections/${collection.id}`)}
    >
    {/* 2×2 mosaic */}
      <div className="aspect-[4/3] relative grid grid-cols-2 grid-rows-2 gap-1 p-1 bg-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden bg-muted/60">
            {covers[i] ? (
              <img
                src={covers[i]}
                alt=""
                className="w-full aspect-[1/1] object-cover object-center grayscale group-hover:grayscale-0 transition-all duration-500"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-[1/1] flex items-center justify-center">
                <Folders className="size-4 text-muted-foreground/20" />
              </div>
            )}
          </div>
        ))}
        <CollectionStatusBadge isPublic={collection.isPublic} className="absolute top-2 right-2 z-10" />
      </div>

      {collection.totalVolumes && collection.totalVolumes > 0 && (
        <div className="px-5 pt-3 bg-card">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span className="tabular-nums">{comicCount}/{collection.totalVolumes}</span>
            <span>{Math.min(Math.round((comicCount / collection.totalVolumes) * 100), 100)}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(Math.round((comicCount / collection.totalVolumes) * 100), 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="p-5 flex flex-col flex-1 bg-card group-hover:bg-muted/30 transition-colors duration-300">
        <h3 className="text-foreground font-semibold text-xl tracking-tight mb-3 group-hover:text-primary transition-colors line-clamp-1">
          {collection.name}
        </h3>
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/10">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-semibold">
              {t('collections.seriesLabel')}
            </span>
            <span className="text-foreground text-sm font-medium">{seriesCount}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-semibold">
              {t('collections.issuesLabel')}
            </span>
            <span className="text-foreground text-sm font-medium">{comicCount}</span>
          </div>
        </div>
      </div>
    </article>
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

// ─── Collection Series View (accordion: collection → series) ──────────────────

function CollectionSeriesView({
  q,
  collections,
}: {
  q: string
  collections: Collection[]
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [toggledIds, setToggledIds] = useState<Set<string>>(new Set())

  const { data: seriesGroups = [], isLoading } = useQuery({
    queryKey: ['library-series-view', 'ALL', q],
    queryFn: () => libraryApi.getSeriesView({ q: q || undefined }),
  })

  const { grouped, defaultExpandedId } = useMemo(() => {
    const map = new Map<string, { id: string; name: string; isPublic: boolean; series: UserSeriesSummary[] }>()
    for (const s of seriesGroups) {
      const key = s.collectionId ?? '__none__'
      if (!map.has(key)) {
        const col = collections.find((c) => c.id === s.collectionId)
        map.set(key, {
          id: key,
          name: col?.name ?? t('comicDetail.noCollection'),
          isPublic: col?.isPublic ?? true,
          series: [],
        })
      }
      map.get(key)!.series.push(s)
    }
    const result = Array.from(map.values())
    return { grouped: result, defaultExpandedId: result[0]?.id ?? null }
  }, [seriesGroups, collections, t])

  const isExpanded = (id: string) => {
    const toggled = toggledIds.has(id)
    return id === defaultExpandedId ? !toggled : toggled
  }
  const toggle = (id: string) => {
    setToggledIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    )
  }

  if (grouped.length === 0) {
    return (
      <EmptyState
        icon={<Layers className="size-8 text-muted-foreground" />}
        title={t('library.noSeries')}
      />
    )
  }

  return (
    <div className="space-y-3">
      {grouped.map(({ id, name, isPublic, series }) => {
        const expanded = isExpanded(id)
        const totalComics = series.reduce((sum, s) => sum + s.comicCount, 0)
        const ownedComics = series.reduce((sum, s) => sum + s.ownedCount, 0)
        const previewCovers = series
          .map((s) => s.coverUrl)
          .filter((u): u is string => !!u)
          .slice(0, 3)

        return (
          <section
            key={id}
            className="bg-card rounded-xl overflow-hidden border border-border/10"
          >
            <div
              className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors select-none"
              onClick={() => toggle(id)}
            >
              <div className="flex items-center gap-4">
                <Folders
                  className={`size-5 transition-colors ${expanded ? 'text-primary' : 'text-muted-foreground/40'}`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-sm transition-colors ${expanded ? 'text-primary' : 'text-foreground'}`}>
                      {name}
                    </h3>
                    <CollectionStatusBadge isPublic={isPublic} className='bg-transparent' />
                  </div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 mt-0.5">
                    {ownedComics > 0 ? `${ownedComics}/${totalComics}` : totalComics} {t('library.issues').toUpperCase()} · {series.length} {t('nav.mySeries').toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {!expanded && previewCovers.length > 0 && (
                  <div className="hidden sm:flex -space-x-2.5">
                    {previewCovers.map((url, i) => (
                      <div key={i} className="w-8 h-8 rounded border-2 border-card overflow-hidden bg-muted">
                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}
                <ChevronDown
                  className={`size-4 text-muted-foreground/40 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
                />
              </div>
            </div>

            {expanded && (
              <div className="px-6 pb-6 pt-4 border-t border-border/10">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {series.map((s) => (
                    <div
                      key={s.collectionSeriesId ?? s.seriesName}
                      className="group cursor-pointer"
                      onClick={() =>
                        s.collectionSeriesId
                          ? navigate(`/series/${s.collectionSeriesId}`)
                          : undefined
                      }
                    >
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted mb-2 border border-border/10 group-hover:border-primary/40 transition-colors">
                        <ProgressOverlay current={s.ownedCount} total={s.totalCount}>
                          {s.coverUrl ? (
                            <img
                              src={s.coverUrl}
                              alt={s.seriesName}
                              loading="lazy"
                              className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Layers className="size-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </ProgressOverlay>
                      </div>
                      <h4 className="text-xs font-bold group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                        {s.seriesName}
                      </h4>
                      {!s.totalCount && s.ownedCount === 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {s.comicCount} {t('library.issues').toLowerCase()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'series'

export function CollectionsPage() {
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [searchInput, setSearchInput] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.getAll,
  })

  const sorted = useMemo(() => {
    const filtered = searchInput
      ? collections.filter((c) => c.name.toLowerCase().includes(searchInput.toLowerCase()))
      : collections
    return sortCollections(filtered, sortField, sortDir)
  }, [collections, sortField, sortDir, searchInput])

  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'name',   label: t('collections.sortName')   },
    { field: 'count',  label: t('collections.sortCount')  },
    { field: 'year',   label: t('collections.sortYear')   },
    { field: 'rating', label: t('collections.sortRating') },
  ]

  return (
    <PageContainer>
      <PageHeader
        title={t('nav.myCollections')}
        description={t('collections.subtitle')}
        action={
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="size-4" />
            {t('collections.newCollection')}
          </Button>
        }
      />

      {/* Search bar + view toggle */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex items-center bg-card border border-border/20 rounded-lg overflow-hidden flex-1 max-w-sm">
          <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={
              viewMode === 'grid'
                ? t('collections.searchComics')
                : t('library.searchPlaceholder')
            }
            className="w-full pl-10 pr-9 py-2.5 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="bg-muted rounded-lg p-1 flex gap-1 shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${
              viewMode === 'grid' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="size-3.5" />
            {t('common.viewmode.grid')}
          </button>
          <button
            onClick={() => setViewMode('series')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${
              viewMode === 'series' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="size-3.5" />
            {t('common.viewmode.list')}
          </button>
        </div>
      </div>

      {/* Sort bar — grid mode only */}
      {viewMode === 'grid' && !isLoading && collections.length > 1 && (
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

      {/* Content */}
      {viewMode === 'series' ? (
        <CollectionSeriesView q={searchInput} collections={collections} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : !sorted.length ? (
        <EmptyState
          icon={<Folders className="size-8 text-muted-foreground" />}
          title={t('collections.emptyState')}
          description={t('collections.emptyStateHint')}
          action={
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="size-4" />
              {t('collections.newCollection')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sorted.map((col) => (
            <CollectionCard key={col.id} collection={col} />
          ))}
        </div>
      )}

      <CollectionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </PageContainer>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BookOpen, Trash2, ChevronLeft, ChevronRight,
  Check, Search, X, Tag, SlidersHorizontal, CheckSquare, Folders,
  LayoutGrid, Plus, ChevronDown, Layers, Star, Pencil, Globe, Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { libraryApi } from '@/api/library'
import { comicsApi } from '@/api/comics'
import { collectionsApi } from '@/api/collections'
import { seriesApi } from '@/api/series'
import { collectionSeriesApi } from '@/api/collection-series'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { AddToCollectionDialog } from '@/components/features/AddToCollectionDialog'
import { CreateManualComicSheet } from './SearchPage'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import type { Collection, LibraryFilter, SortBy, UserComic, UserSeriesSummary } from '@/types'

const LIMIT = 24

// ─── Comic Card (Comics view) ─────────────────────────────────────────────────

function ComicCard({
  entry,
  confirmDeleteId,
  setConfirmDeleteId,
  removeMutation,
}: {
  entry: UserComic
  confirmDeleteId: string | null
  setConfirmDeleteId: (id: string | null) => void
  removeMutation: { mutate: (id: string) => void; isPending: boolean }
}) {
  const { t } = useTranslation()
  const { comic } = entry

  const collectionStatusCls: Record<string, string> = {
    IN_COLLECTION: 'bg-primary/15 text-primary',
    WISHLIST:      'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    LOANED:        'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  }
  const readStatusCls: Record<string, string> = {
    READ:    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    READING: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    TO_READ: 'bg-muted-foreground/15 text-muted-foreground',
  }
  const statusTags = [
    entry.collectionStatus && { label: t(`status.${entry.collectionStatus}`), cls: collectionStatusCls[entry.collectionStatus] ?? 'bg-muted/30 text-muted-foreground' },
    entry.readStatus       && { label: t(`status.${entry.readStatus}`),       cls: readStatusCls[entry.readStatus] ?? 'bg-muted/30 text-muted-foreground' },
  ].filter(Boolean) as { label: string; cls: string }[]

  const hasBottom = !!entry.rating || !!comic.year

  return (
    <div className=" group flex flex-col bg-card rounded-xl overflow-hidden hover:-translate-y-1 transition-all duration-300 border border-border/10 ">
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        <Link to={`/comics/${comic.id}`} className="block w-full h-full">
          {comic.coverUrl ? (
            <img
              src={comic.coverUrl}
              alt={comic.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="size-12 text-muted-foreground/30" />
            </div>
          )}
        </Link>

        {/* Issue number badge */}
        {comic.issueNumber && (
          <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-2 py-0.5 rounded font-black text-xs">
            #{comic.issueNumber}
          </div>
        )}

        {/* Glassmorphism hover overlay */}
        <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
          <Link
            to={`/comics/${comic.id}`}
            className="bg-primary/20 text-primary w-23 h-23 rounded-full flex items-center justify-center hover:bg-primary/30 transition-colors"
          >
            <BookOpen className="size-12" />
          </Link>
        </div>

        {/* Delete button */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {confirmDeleteId === comic.id ? (
            <button
              className="bg-destructive/90 text-white p-1.5 rounded-full backdrop-blur-sm"
              onClick={() => { removeMutation.mutate(comic.id); setConfirmDeleteId(null) }}
            >
              <Check className="size-5" />
            </button>
          ) : (
            <button
              className="bg-background/80 text-muted-foreground hover:text-destructive p-1.5 rounded-full backdrop-blur-sm"
              onClick={() => setConfirmDeleteId(comic.id)}
              disabled={removeMutation.isPending}
            >
              <Trash2 className="size-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <Link to={`/comics/${comic.id}`}>
          <h3 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-2 leading-snug h-10">
            {comic.title}
          </h3>
        </Link>

        {statusTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {statusTags.map((tag) => (
              <span key={tag.label} className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${tag.cls}`}>
                {tag.label}
              </span>
            ))}
          </div>
        ) : (<span className="dark:text-muted-400 bg-muted/90 text-muted-foreground w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
          {t('status.NO_STATUS')}
              </span>
         )}

        {hasBottom && (
          <div className="flex justify-between items-center mt-auto pt-2.5 border-t border-border/10">
            {entry.rating ? (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`size-3 ${i < entry.rating! ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                ))}
              </div>
            ) : <span />}
            {comic.year && (
              <span className="text-[10px] font-medium text-muted-foreground">{comic.year}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Series Form Dialog (create + edit) ──────────────────────────────────────

function SeriesEditDialog({
  open, onClose, series,
}: {
  open: boolean
  onClose: () => void
  series: UserSeriesSummary
}) {
  const isCreate = !series.seriesId
  const qc = useQueryClient()
  const { t } = useTranslation()

  const [name, setName] = useState(series.seriesName)
  const [publisher, setPublisher] = useState(series.publisher ?? '')
  const [totalIssues, setTotalIssues] = useState(series.totalCount != null ? String(series.totalCount) : '')
  const [isOngoing, setIsOngoing] = useState(series.isOngoing ?? true)

  // collection picker (create mode only)
  const [selectedColId, setSelectedColId] = useState<string>('')
  const [creatingNewCol, setCreatingNewCol] = useState(false)
  const [newColName, setNewColName] = useState('')

  const { data: allCollections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: () => collectionsApi.getAll(),
    enabled: isCreate && open,
  })

  // show inline creation if user explicitly chose it OR if there are no collections to pick from
  const showInlineCol = creatingNewCol || (isCreate && open && allCollections.length === 0)

  const canSubmit = !isCreate
    ? name.trim().length > 0
    : name.trim().length > 0 && (
        showInlineCol ? newColName.trim().length > 0 : selectedColId.length > 0
      )

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        publisher: publisher.trim() || undefined,
        totalIssues: totalIssues ? parseInt(totalIssues, 10) : undefined,
    
      }
      if (!isCreate) {
        return seriesApi.update(series.seriesId!, payload)
      }
      // create mode: resolve collection first
      let colId = selectedColId
      if (showInlineCol) {
        const col = await collectionsApi.create({ name: newColName.trim(), isPublic: false })
        colId = col.id
      }
      const newSeries = await seriesApi.create(payload)
      await collectionSeriesApi.create(colId, newSeries.name)
      return newSeries
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-series-view'] })
      qc.invalidateQueries({ queryKey: ['series'] })
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(isCreate ? t('library.seriesCreated', { name }) : t('library.seriesUpdated', { name }))
      onClose()
    },
    onError: () => toast.error(t('common.error')),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isCreate ? t('library.createSeries') : t('library.editSeries')}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
          className="space-y-4 pt-1"
        >
          {/* Collection picker — create mode only */}
          {isCreate && (
            <div className="space-y-2">
              <Label>{t('collections.title')} <span className="text-destructive">*</span></Label>

              {!showInlineCol && (
                <Select
                  value={selectedColId}
                  onValueChange={(v) => {
                    if (v === '__new__') {
                      setCreatingNewCol(true)
                      setSelectedColId('')
                    } else {
                      setSelectedColId(v)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('library.selectCollection')} />
                  </SelectTrigger>
                  <SelectContent>
                    {allCollections.map((col) => (
                      <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                    ))}
                    <SelectItem value="__new__" className="text-primary font-medium">
                      + {t('collections.newCollection')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}

              {showInlineCol && (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    placeholder={t('collections.namePlaceholder')}
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    className="flex-1"
                  />
                  {allCollections.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setCreatingNewCol(false); setNewColName('') }}
                    >
                      {t('common.cancel')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="series-name">{t('library.seriesName')}</Label>
            <Input
              id="series-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="series-publisher">
              {t('library.seriesPublisher')}{' '}
              <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
            </Label>
            <Input
              id="series-publisher"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="Marvel, DC…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="series-total">
              {t('library.seriesTotalIssues')}{' '}
              <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
            </Label>
            <Input
              id="series-total"
              type="number"
              min={1}
              value={totalIssues}
              onChange={(e) => setTotalIssues(e.target.value)}
              placeholder="12"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsOngoing((v) => !v)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left ${
              isOngoing ? 'border-border bg-background' : 'border-primary bg-primary/5'
            }`}
          >
            <div className={`size-2 rounded-full shrink-0 ${isOngoing ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
            <div>
              <p className="text-sm font-medium">
                {isOngoing ? t('library.ongoing') : t('library.complete')}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOngoing ? t('library.ongoingHint') : t('library.completeHint')}
              </p>
            </div>
          </button>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={mutation.isPending || !canSubmit}>
              {mutation.isPending ? t('common.saving') : isCreate ? t('collections.create') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Create Collection Dialog ─────────────────────────────────────────────────

function CreateCollectionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  const mutation = useMutation({
    mutationFn: () => collectionsApi.create({ name: name.trim(), isPublic }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(t('collections.createSuccess'))
      setName(''); setIsPublic(false)
      onClose()
    },
    onError: () => toast.error(t('collections.saveError')),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('collections.createTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="col-name">{t('collections.nameLabel')}</Label>
            <Input
              id="col-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('collections.namePlaceholder')}
              required
            />
          </div>
          <button
            type="button"
            onClick={() => setIsPublic((v) => !v)}
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
            <Button type="submit" disabled={mutation.isPending || !name.trim()}>
              {mutation.isPending ? t('common.saving') : t('collections.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Series Card ──────────────────────────────────────────────────────────────

function SeriesCard({
  group,
  onClickSeries,
  onEdit,
  createCollectionMutation,
}: {
  group: UserSeriesSummary
  onClickSeries: (name: string) => void
  onEdit: () => void
  createCollectionMutation: { mutate: (g: UserSeriesSummary) => void; isPending: boolean }
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  function handleClick() {
    if (group.collectionSeriesId) {
      navigate(`/series/${group.collectionSeriesId}`)
    } else {
      onClickSeries(group.seriesName)
    }
  }

  const progress =
    group.totalCount != null && group.totalCount > 0
      ? Math.round((group.ownedCount / group.totalCount) * 100)
      : null
  const isComplete =
    group.isOngoing === false && group.totalCount != null && group.ownedCount >= group.totalCount

  return (
    <div
      className="group cursor-pointer bg-card rounded-xl overflow-hidden flex flex-col hover:-translate-y-1 transition-all duration-300 border border-border/10 hover:border-primary/40"
      onClick={handleClick}
    >
      <div className="aspect-[2/3] relative overflow-hidden bg-muted">
        {group.coverUrl ? (
          <img
            src={group.coverUrl}
            alt={group.seriesName}
            loading="lazy"
            className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500 scale-105 group-hover:scale-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="size-8 text-muted-foreground/30" />
          </div>
        )}

        {group.isOngoing !== null && (
          <div className="absolute top-3 right-3">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm ${
              isComplete
                ? 'bg-primary/90 text-primary-foreground'
                : 'bg-background/70 text-foreground border border-border/30'
            }`}>
              {isComplete ? t('library.complete') : t('library.ongoing')}
            </span>
          </div>
        )}

        {/* Edit button — only for series linked to a Series entity */}
        {group.seriesId && (
          <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="bg-background/80 text-muted-foreground hover:text-primary p-1.5 rounded-full backdrop-blur-sm transition-colors"
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              aria-label={t('library.editSeries')}
            >
              <Pencil className="size-3" />
            </button>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        <div>
          <h3 className="text-base font-bold group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {group.seriesName}
          </h3>
          {group.publisher && (
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em] mt-1 truncate">
              {group.publisher}
            </p>
          )}
        </div>

        {progress !== null ? (
          <div className="space-y-1.5 mt-auto">
            <div className="flex justify-between text-[10px] font-bold tracking-widest">
              <span>{group.ownedCount} / {group.totalCount} {t('library.issues').toUpperCase()}</span>
              <span className="text-primary">{progress}%</span>
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground font-medium mt-auto">
            {group.comicCount} {t('library.issues').toUpperCase()}
          </p>
        )}

        <button
          className="text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 -mt-2"
          onClick={(e) => { e.stopPropagation(); createCollectionMutation.mutate(group) }}
          disabled={createCollectionMutation.isPending}
        >
          <Folders className="size-3" />
          {t('library.createCollection')}
        </button>
      </div>
    </div>
  )
}

// ─── Series Grid View (expandable by collection) ──────────────────────────────

function SeriesGroupView({
  filter, q, onClickSeries,
}: {
  filter: LibraryFilter
  q: string
  onClickSeries: (name: string) => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [editingGroup, setEditingGroup] = useState<UserSeriesSummary | null>(null)
  // IDs the user has explicitly toggled; the first collection is expanded by default,
  // all others start collapsed. Toggling flips that default.
  const [toggledIds, setToggledIds] = useState<Set<string>>(new Set())

  const { data: groups = [], isLoading: seriesLoading } = useQuery({
    queryKey: ['library-series-view', filter, q],
    queryFn: () => libraryApi.getSeriesView({
      status: filter !== 'ALL' ? filter : undefined,
      q: q || undefined,
    }),
  })

  const { data: collections = [], isLoading: colLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.getAll,
  })

  const { grouped, defaultExpandedId } = useMemo(() => {
    const map = new Map<string, { id: string; name: string; series: UserSeriesSummary[] }>()
    for (const s of groups) {
      const key = s.collectionId ?? '__none__'
      if (!map.has(key)) {
        const col = collections.find((c) => c.id === s.collectionId)
        map.set(key, { id: key, name: col?.name ?? t('library.noCollection'), series: [] })
      }
      map.get(key)!.series.push(s)
    }
    const result = Array.from(map.values())
    return { grouped: result, defaultExpandedId: result[0]?.id ?? null }
  }, [groups, collections, t])

  // First collection starts expanded; toggling flips its default state
  const isCollectionExpanded = (id: string) => {
    const toggled = toggledIds.has(id)
    return id === defaultExpandedId ? !toggled : toggled
  }

  const toggleCollection = (id: string) => {
    setToggledIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const createCollectionMutation = useMutation({
    mutationFn: async (group: UserSeriesSummary) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const collection = await collectionsApi.create({ name: group.seriesName, description: (group as any).publisher ?? undefined })
      await Promise.all(group.comics.map((uc) => collectionsApi.addComic(collection.id, uc.comic.id)))
      return collection
    },
    onSuccess: (col) => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(t('library.seriesCollectionCreated', { name: col.name }))
    },
    onError: () => toast.error(t('common.error')),
  })

  if (seriesLoading || colLoading) return <GridSkeleton variant="series" />

  if (groups.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Layers className="size-8 text-muted-foreground" /></div>
        <p className="font-medium">{t('library.noSeries')}</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {grouped.map(({ id, name, series }) => {
          const isExpanded = isCollectionExpanded(id)
          const totalComics = series.reduce((sum, s) => sum + s.comicCount, 0)
          const previewCovers = series
            .map((s) => s.coverUrl)
            .filter((u): u is string => !!u)
            .slice(0, 4)

          return (
            <section
              key={id}
              className="bg-card rounded-xl overflow-hidden border border-border/10 transition-all duration-300"
            >
              {/* ── Collection header ──────────────────────────────── */}
              <div
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors select-none"
                onClick={() => toggleCollection(id)}
              >
                <div className="flex items-center gap-4">
                  <Folders className={`size-5 transition-colors ${isExpanded ? 'text-primary' : 'text-muted-foreground/40'}`} />
                  <div>
                    <h3 className={`font-bold text-sm transition-colors ${isExpanded ? 'text-primary' : 'text-foreground'}`}>
                      {name}
                    </h3>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 mt-0.5">
                      {series.length} Series · {totalComics} {t('library.issues').toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Thumbnail strip — only when collapsed */}
                  {!isExpanded && previewCovers.length > 0 && (
                    <div className="hidden sm:flex -space-x-2.5">
                      {previewCovers.slice(0, 3).map((url, i) => (
                        <div key={i} className="w-8 h-8 rounded border-2 border-card overflow-hidden bg-muted">
                          <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ))}
                      {series.length > 3 && (
                        <div className="w-8 h-8 rounded border-2 border-card bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          +{series.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                  <ChevronDown
                    className={`size-4 text-muted-foreground/40 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              {/* ── Expanded series grid ───────────────────────────── */}
              {isExpanded && (
                <div className="px-6 pb-6 pt-4 border-t border-border/10">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {series.map((group) => (
                      <SeriesCard
                        key={group.collectionSeriesId ?? group.seriesName}
                        group={group}
                        onClickSeries={onClickSeries}
                        onEdit={() => setEditingGroup(group)}
                        createCollectionMutation={createCollectionMutation}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )
        })}
      </div>

      {editingGroup && (
        <SeriesEditDialog
          open={!!editingGroup}
          onClose={() => setEditingGroup(null)}
          series={editingGroup}
        />
      )}
    </>
  )
}

// ─── Collection Card ──────────────────────────────────────────────────────────

function CollectionCard({ collection }: { collection: Collection }) {
  const comicCount = collection._count?.comics ?? 0
  const covers = collection.previewCovers ?? []

  return (
    <Link
      to={`/collections/${collection.id}`}
      className="group flex flex-col bg-card rounded-sm overflow-hidden hover:-translate-y-1 transition-all duration-300"
    >
      {/* 2×2 mosaic */}
      <div className="aspect-[4/3] grid grid-cols-2 grid-rows-2 gap-1 p-1 bg-border">
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
              <div className="w-full h-full flex items-center justify-center">
                <Folders className="size-4 text-muted-foreground/20" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info bar */}
      <div className="px-4 py-3.5 flex justify-between items-center border border-sidebar h-full overflow-hidden">
        <div className="min-w-0">
          <h3 className="text-sm font-bold group-hover:text-primary transition-colors line-clamp-1">
            {collection.name}
          </h3>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">
            {comicCount} {comicCount === 1 ? 'Issue' : 'Issues'}
          </p>
        </div>
        <ChevronRight className="size-8 text-muted-foreground shrink-0 ml-3 group-hover:text-primary" />
      </div>
    </Link>
  )
}

// ─── Collections Grid View ────────────────────────────────────────────────────

function CollectionsView({ q }: { q: string }) {
  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.getAll,
  })

  const filtered = q
    ? collections.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    : collections

  if (isLoading) return <GridSkeleton variant="collections" />

  if (filtered.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Folders className="size-8 text-muted-foreground" /></div>
        <p className="font-medium">No collections yet</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {filtered.map((col) => (
        <CollectionCard key={col.id} collection={col} />
      ))}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function GridSkeleton({ variant = 'series' }: { variant?: 'series' | 'collections' | 'comics' }) {
  const gridCls =
    variant === 'comics'
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
      : variant === 'collections'
      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

  return (
    <div className={`grid ${gridCls} gap-5`}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-border/10">
          <Skeleton className={`w-full ${variant === 'collections' ? 'aspect-[4/3]' : 'aspect-[2/3]'}`} />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Library Page ─────────────────────────────────────────────────────────────

type ViewMode = 'collections' | 'series' | 'grid'

export function LibraryPage() {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()

  const [activeFilter, setActiveFilter] = useState<LibraryFilter>(
    (searchParams.get('status') as LibraryFilter) ?? 'ALL',
  )
  const [sortBy, setSortBy] = useState<SortBy>(
    (searchParams.get('sortBy') as SortBy) ??
    (localStorage.getItem('lib-sort') as SortBy | null) ??
    'added_desc',
  )
  const [viewMode, setViewMode] = useState<ViewMode>(
    (localStorage.getItem('lib-view') as ViewMode | null) ?? 'collections',
  )
  const [page, setPage] = useState(1)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Multi-select (only in comics view)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [addToCollectionOpen, setAddToCollectionOpen] = useState(false)
  const [createManualOpen, setCreateManualOpen] = useState(false)
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false)
  const [createSeriesOpen, setCreateSeriesOpen] = useState(false)

  // Search
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [searchBy, setSearchBy] = useState<
    'all' | 'title' | 'authors' | 'scriptwriter' | 'artist' | 'publisher'
  >('all')

  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [publisherInput, setPublisherInput] = useState('')
  const [publisher, setPublisher] = useState('')
  const [yearFromInput, setYearFromInput] = useState('')
  const [yearFrom, setYearFrom] = useState('')
  const [yearToInput, setYearToInput] = useState('')
  const [yearTo, setYearTo] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => { setQ(searchInput); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const timer = setTimeout(() => { setPublisher(publisherInput); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [publisherInput])

  useEffect(() => {
    const timer = setTimeout(() => { setYearFrom(yearFromInput); setPage(1) }, 500)
    return () => clearTimeout(timer)
  }, [yearFromInput])

  useEffect(() => {
    const timer = setTimeout(() => { setYearTo(yearToInput); setPage(1) }, 500)
    return () => clearTimeout(timer)
  }, [yearToInput])

  function exitSelecting() { setIsSelecting(false); setSelectedIds(new Set()) }

  function switchView(mode: ViewMode) {
    setViewMode(mode)
    if (mode !== 'grid') exitSelecting()
  }

  const { data: userTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => comicsApi.getTags(),
    staleTime: 60_000,
  })

  const { data: stats } = useQuery({
    queryKey: ['library-stats'],
    queryFn: libraryApi.getStats,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['library', activeFilter, sortBy, page, q, searchBy, activeTag, publisher, yearFrom, yearTo],
    queryFn: () =>
      libraryApi.getAll({
        status: activeFilter !== 'ALL' ? activeFilter : undefined,
        sortBy,
        page,
        limit: LIMIT,
        q: q || undefined,
        searchBy: searchBy !== 'all' ? searchBy : undefined,
        tag: activeTag || undefined,
        publisher: publisher || undefined,
        yearFrom: yearFrom ? parseInt(yearFrom, 10) : undefined,
        yearTo: yearTo ? parseInt(yearTo, 10) : undefined,
      }),
    enabled: viewMode === 'grid',
  })

  const totalPages = data?.totalPages ?? 1
  const comics = data?.data ?? []
  const totalCount = data?.total ?? null

  const removeMutation = useMutation({
    mutationFn: libraryApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library'] })
      qc.invalidateQueries({ queryKey: ['library-stats'] })
      toast.success(t('library.removeSuccess'))
    },
    onError: () => toast.error(t('library.removeError')),
  })

  const handleFilterChange = (filter: LibraryFilter) => { setActiveFilter(filter); setPage(1) }

  const advancedActiveCount = [publisher, yearFrom, yearTo, activeTag].filter(Boolean).length
  const hasActiveFilters = q || activeTag || publisher || yearFrom || yearTo

  const clearAllFilters = () => {
    setSearchInput(''); setQ(''); setSearchBy('all'); setActiveTag(null)
    setPublisherInput(''); setPublisher('')
    setYearFromInput(''); setYearFrom('')
    setYearToInput(''); setYearTo('')
  }

  function toggleSelect(comicId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(comicId)) { next.delete(comicId) } else { next.add(comicId) }
      return next
    })
  }

  async function handleAddToCollection(collectionId: string) {
    await Promise.all([...selectedIds].map((id) => collectionsApi.addComic(collectionId, id)))
    qc.invalidateQueries({ queryKey: ['collections'] })
    toast.success(t('collections.addMultipleSuccess', { count: selectedIds.size }))
    exitSelecting()
  }

  function handleSeriesClick(name: string) {
    setSearchInput(name); setQ(name); setViewMode('grid'); setPage(1)
  }

  const FILTERS: { label: string; value: LibraryFilter }[] = [
    { label: t('library.filterAll'),      value: 'ALL'          },
    { label: t('library.filterOwned'),    value: 'IN_COLLECTION' },
    { label: t('library.filterRead'),     value: 'READ'          },
    { label: t('library.filterWishlist'), value: 'WISHLIST'      },
    { label: t('library.filterLoaned'),   value: 'LOANED'        },
  ]

  const SORT_OPTIONS: { label: string; value: SortBy }[] = [
    { label: t('library.sortAdded'),  value: 'added_desc'  },
    { label: t('library.sortTitle'),  value: 'title_asc'   },
    { label: t('library.sortSeries'), value: 'series_asc'  },
    { label: t('library.sortYear'),   value: 'year_asc'    },
    { label: t('library.sortRating'), value: 'rating_desc' },
  ]

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? t('library.sortAdded')

  const readPercent = stats && stats.total > 0
    ? Math.round((stats.byStatus.READ / stats.total) * 100)
    : 0

  const VIEW_OPTIONS: { label: string; value: ViewMode; Icon: React.ElementType }[] = [
    { label: 'Collections', value: 'collections', Icon: Folders },
    { label: 'Series',      value: 'series',      Icon: Layers  },
    { label: 'Comics',      value: 'grid',        Icon: LayoutGrid },
  ]

  return (
    <PageContainer>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="mb-8">
        <PageHeader
          title={t('library.title')}
          className="mb-6 items-end"
          action={
            <div className="flex items-center gap-3">
              {/* Multi-select: only in comics view */}
              {viewMode === 'grid' && (
                <button
                  onClick={() => isSelecting ? exitSelecting() : setIsSelecting(true)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                    isSelecting
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CheckSquare className="size-4" />
                  {t('library.selectMode')}
                </button>
              )}

              {/* Collections | Series | Comics toggle */}
              <div className="bg-muted rounded-lg p-1 flex gap-1">
                {VIEW_OPTIONS.map(({ label, value, Icon }) => (
                  <button
                    key={value}
                    onClick={() => switchView(value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-colors ${
                      viewMode === value
                        ? 'bg-card text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search — larger, fix 5 */}
          <div className="relative flex items-center bg-card border border-border/20 rounded-lg overflow-hidden  flex-1 min-w-[100%] max-w-sm">
            <Select
              value={searchBy}
              onValueChange={(v) => { setSearchBy(v as typeof searchBy); setPage(1) }}
            >
              <SelectTrigger className="h-full w-auto shrink-0 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 pl-3 pr-2 gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {searchBy === 'all'          ? t('library.searchByAll') :
                   searchBy === 'title'        ? t('library.searchByTitle') :
                   searchBy === 'authors'      ? t('library.searchByAuthors') :
                   searchBy === 'scriptwriter' ? t('library.searchByScriptwriter') :
                   searchBy === 'artist'       ? t('library.searchByArtist') :
                                                 t('library.searchByPublisher')}
                </span>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="all">{t('library.searchByAll')}</SelectItem>
                <SelectItem value="title">{t('library.searchByTitle')}</SelectItem>
                <SelectItem value="authors">{t('library.searchByAuthors')}</SelectItem>
                <SelectItem value="scriptwriter">{t('library.searchByScriptwriter')}</SelectItem>
                <SelectItem value="artist">{t('library.searchByArtist')}</SelectItem>
                <SelectItem value="publisher">{t('library.searchByPublisher')}</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 flex items-center h-full">
              <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('library.searchPlaceholder')}
                className="w-full h-full pl-10 pr-9 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(''); setQ('') }}
                  className="absolute right-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

        

          {/* Status pills — only relevant for Series/Comics views */}
          {viewMode !== 'collections' && (
            <div className="flex  gap-1 overflow-x-auto">
              {FILTERS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => handleFilterChange(value)}
                  className={`px-4 py-2 rounded-xl  text-[0.7rem] font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                    activeFilter === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Sort + Advanced — only for comics view */}
          {viewMode === 'grid' && (
            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                  {t('library.sortBy').toUpperCase()}: {currentSortLabel.toUpperCase()}
                  <ChevronDown className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {SORT_OPTIONS.map(({ label, value }) => (
                    <DropdownMenuItem
                      key={value}
                      onClick={() => { setSortBy(value); setPage(1) }}
                      className={sortBy === value ? 'text-primary font-semibold' : ''}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className={`h-8 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  advancedActiveCount > 0 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <SlidersHorizontal className="size-3.5" />
                {advancedActiveCount > 0 && (
                  <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                    {advancedActiveCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Advanced filter panel ────────────────────────────────────────── */}
        {showAdvanced && viewMode === 'grid' && (
          <div className="mt-3 flex flex-wrap gap-3 p-4 rounded-lg bg-muted/40 border border-border/20">
            <div className="flex flex-col gap-1 min-w-[160px] flex-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t('library.filterPublisher')}
              </label>
              <div className="relative">
                <Input
                  value={publisherInput}
                  onChange={(e) => setPublisherInput(e.target.value)}
                  placeholder={t('library.filterPublisherPlaceholder')}
                  className="h-8 text-sm pr-7"
                />
                {publisherInput && (
                  <button onClick={() => { setPublisherInput(''); setPublisher('') }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('library.filterYearFrom')}</label>
              <Input type="number" value={yearFromInput} onChange={(e) => setYearFromInput(e.target.value)} placeholder="1970" className="h-8 text-sm w-24" min={1900} max={2099} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('library.filterYearTo')}</label>
              <Input type="number" value={yearToInput} onChange={(e) => setYearToInput(e.target.value)} placeholder="2024" className="h-8 text-sm w-24" min={1900} max={2099} />
            </div>
            {userTags.length > 0 && (
              <div className="flex flex-col gap-1 w-full">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Tag className="size-3" /> {t('library.filterByTag')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {userTags.map((tag) => (
                    <button
                      key={tag.slug}
                      onClick={() => { setActiveTag(activeTag === tag.slug ? null : tag.slug); setPage(1) }}
                      className={`px-3 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider transition-colors ${
                        activeTag === tag.slug
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:text-foreground border border-border/20'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {advancedActiveCount > 0 && (
              <div className="flex items-end">
                <button
                  onClick={() => { setPublisherInput(''); setPublisher(''); setYearFromInput(''); setYearFrom(''); setYearToInput(''); setYearTo(''); setActiveTag(null) }}
                  className="h-8 px-3 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  {t('library.clearFilters')}
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {viewMode === 'collections' && <CollectionsView q={q} />}

      {viewMode === 'series' && (
        <SeriesGroupView filter={activeFilter} q={q} onClickSeries={handleSeriesClick} />
      )}

      {viewMode === 'grid' && (
        isLoading ? (
          <GridSkeleton variant="comics" />
        ) : comics.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><BookOpen className="size-8 text-muted-foreground" /></div>
            {hasActiveFilters ? (
              <>
                <p className="font-medium">
                  {q ? t('library.noResultsSearch', { q }) : t('library.emptyFiltered', { status: activeFilter })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{t('library.emptyFilteredHint')}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={clearAllFilters}>
                  {t('library.clearSearch')}
                </Button>
              </>
            ) : activeFilter !== 'ALL' ? (
              <>
                <p className="font-medium">{t('library.emptyFiltered', { status: activeFilter })}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('library.emptyFilteredHint')}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => handleFilterChange('ALL')}>
                  {t('library.showAll')}
                </Button>
              </>
            ) : (
              <>
                <p className="font-medium">{t('library.emptyLibrary')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('library.emptyLibraryHint')}</p>
                <Link to="/search" className={cn(buttonVariants(), 'mt-4')}>
                  <Search className="size-4" /> {t('library.searchComics')}
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {comics.map((entry) => {
              const isSelected = selectedIds.has(entry.comic.id)
              return (
                <div
                  key={entry.id}
                  className={`relative ${isSelecting && isSelected ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`}
                >
                  {isSelecting && (
                    <button
                      type="button"
                      onClick={() => toggleSelect(entry.comic.id)}
                      className="absolute inset-0 z-10 rounded-lg"
                      aria-label={isSelected ? t('common.deselect') : t('common.select')}
                    >
                      <div className={`absolute top-2 right-2 size-5 rounded border-2 flex items-center justify-center shadow-sm transition-colors ${
                        isSelected ? 'bg-primary border-primary' : 'bg-white/90 border-white'
                      }`}>
                        {isSelected && <Check className="size-3 text-primary-foreground" />}
                      </div>
                    </button>
                  )}
                  <ComicCard
                    entry={entry}
                    confirmDeleteId={isSelecting ? null : confirmDeleteId}
                    setConfirmDeleteId={isSelecting ? () => {} : setConfirmDeleteId}
                    removeMutation={removeMutation}
                    
                  />
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="mt-20 pt-8 border-t border-border/15 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-10">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              {viewMode === 'collections' ? 'Collections' : viewMode === 'series' ? 'Total Series' : 'Total Issues'}
            </span>
            <span className="text-xl font-bold">
              {viewMode === 'series' ? (stats?.seriesCount ?? '—') : viewMode === 'grid' ? (totalCount ?? '—') : '—'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Read Status</span>
            <span className="text-xl font-bold text-primary">{readPercent}% Complete</span>
          </div>
        </div>

        {totalPages > 1 && viewMode === 'grid' && (
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-card hover:bg-muted transition-colors disabled:opacity-40"
              aria-label={t('library.prevPage')}
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex items-center px-4 bg-card rounded-lg text-xs font-bold">
              PAGE {page} OF {totalPages}
            </div>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-card hover:bg-muted transition-colors disabled:opacity-40"
              aria-label={t('library.nextPage')}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </footer>

      {/* ── Selection action bar ─────────────────────────────────────────── */}
      {isSelecting && selectedIds.size > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-background border shadow-xl">
          <span className="text-sm font-medium">{t('library.selectedCount', { count: selectedIds.size })}</span>
          <Button size="sm" className="gap-1.5" onClick={() => setAddToCollectionOpen(true)}>
            <Folders className="size-3.5" />
            {t('library.addToCollection')}
          </Button>
          <Button variant="ghost" size="sm" onClick={exitSelecting}>{t('common.cancel')}</Button>
        </div>
      )}

      {/* ── FAB (dynamic per view) ──────────────────────────────────────── */}
      <button
        onClick={() => {
          if (viewMode === 'collections') setCreateCollectionOpen(true)
          else if (viewMode === 'series') setCreateSeriesOpen(true)
          else setCreateManualOpen(true)
        }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
        aria-label={
          viewMode === 'collections' ? t('collections.newCollection')
          : viewMode === 'series' ? t('library.createSeries')
          : t('search.createManual.trigger')
        }
      >
        <Plus className="size-6" />
      </button>

      <AddToCollectionDialog
        open={addToCollectionOpen}
        onClose={() => setAddToCollectionOpen(false)}
        count={selectedIds.size}
        onConfirm={handleAddToCollection}
      />
      <CreateManualComicSheet open={createManualOpen} onOpenChange={setCreateManualOpen} />
      <CreateCollectionDialog open={createCollectionOpen} onClose={() => setCreateCollectionOpen(false)} />
      <SeriesEditDialog
        open={createSeriesOpen}
        onClose={() => setCreateSeriesOpen(false)}
        series={{ seriesId: null, seriesName: '', publisher: null, coverUrl: null, totalCount: null, isOngoing: true, ownedCount: 0, comicCount: 0, comics: [] }}
      />
    </PageContainer>
  )
}

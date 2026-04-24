import { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowLeft, BookOpen, Layers, Loader2, Pencil, Plus, Search } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { libraryApi } from '@/api/library'
import { collectionSeriesApi } from '@/api/collection-series'
import { comicsApi } from '@/api/comics'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UserComic } from '@/types'

// ─── Missing Issue Card ───────────────────────────────────────────────────────

function MissingIssueCard({ issueNumber, searchQuery }: { issueNumber: number; searchQuery?: string }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="h-full flex flex-col rounded-lg border-2 border-dashed border-border/90 overflow-hidden bg-muted/60 opacity-70 hover:opacity-80 transition-opacity cursor-pointer group">
      <div className="aspect-[2/3] flex flex-col items-center justify-center gap-3 p-4">
        <Plus className="size-7 text-muted-foreground/40 group-hover:text-primary transition-colors" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center font-mono">
          #{String(issueNumber).padStart(2, '0')}
        </span>
      </div>
      <div className="h-full p-3 bg-card/50 flex flex-col gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {t('seriesDetail.missing')}
        </p>
        <button
          onClick={() =>
            navigate(searchQuery ? `/search?q=${encodeURIComponent(searchQuery)}` : '/search')
          }
          className="text-[10px] text-primary hover:underline text-left font-medium"
        >
          {t('seriesDetail.search')} →
        </button>
      </div>
    </div>
  )
}

// ─── Owned Issue Card ─────────────────────────────────────────────────────────

function IssueCard({ entry }: { entry: UserComic }) {
  const { comic } = entry
  const { t } = useTranslation()


  return (
    <Link
      to={`/comics/${comic.id}`}
      className="group flex flex-col bg-card rounded-lg overflow-hidden border border-border/10 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        {comic.coverUrl ? (
          <img
            src={comic.coverUrl}
            alt={comic.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="size-8 text-muted-foreground/30" />
          </div>
        )}
        {entry.collectionStatus && (
          <span className={`absolute top-2 right-2 text-[9px] font-black px-1.5 h-4 flex items-center rounded-sm uppercase tracking-wide ${
            entry.collectionStatus === 'IN_COLLECTION'
              ? 'bg-primary text-primary-foreground'
              : entry.collectionStatus === 'WISHLIST'
              ? 'bg-sky-500/80 text-white'
              : 'bg-muted/80 backdrop-blur-sm text-muted-foreground'
          }`}>
            {t(`status.${entry.collectionStatus}` as `status.IN_COLLECTION`)}
          </span>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
      </div>

      <div className="h-full p-3 flex flex-col gap-1">
        <p className="text-sm font-bold leading-tight line-clamp-2 h-9 ">{comic.title}</p>
        {(comic.issueNumber || entry.seriesPosition != null) && (
          <p className="text-[14px] text-muted-foreground font-mono tracking-wider">
            Vol. #{comic.issueNumber ?? entry.seriesPosition}
          </p>
        )}
      </div>
    </Link>
  )
}

// ─── Sortable wrappers (drag & drop) ─────────────────────────────────────────

function SortableIssueCard({ entry }: { entry: UserComic }) {
  const startX = useRef(0)
  const startY = useRef(0)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.comic.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, cursor: 'grab' }}
      {...attributes}
      {...listeners}
    >
      <div
        onPointerDown={(e) => {
          startX.current = e.clientX
          startY.current = e.clientY
        }}
        onClickCapture={(e) => {
          if (Math.abs(e.clientX - startX.current) > 5 || Math.abs(e.clientY - startY.current) > 5) {
            e.stopPropagation()
          }
        }}
      >
        <IssueCard entry={entry} />
      </div>
    </div>
  )
}

function SortableMissingCard({ issueNumber, searchQuery }: { issueNumber: number; searchQuery?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `missing-${issueNumber}` })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1, cursor: 'grab' }}
      {...attributes}
      {...listeners}
    >
      <MissingIssueCard issueNumber={issueNumber} searchQuery={searchQuery} />
    </div>
  )
}

// ─── Add from Library Sheet ───────────────────────────────────────────────────

function AddFromLibrarySheet({ open, onClose, collectionSeriesId, existingComicIds }: {
  open: boolean
  onClose: () => void
  collectionSeriesId: string
  existingComicIds: Set<string>
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: libraryPage } = useQuery({
    queryKey: ['library-all'],
    queryFn: () => libraryApi.getAll({ limit: 500 }),
    enabled: open,
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return (libraryPage?.data ?? []).filter(
      (uc) => !existingComicIds.has(uc.comic.id) && uc.comic.title.toLowerCase().includes(q),
    )
  }, [libraryPage, existingComicIds, search])

  const assignMutation = useMutation({
    mutationFn: (comicId: string) => comicsApi.update(comicId, { collectionSeriesId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['series-detail', collectionSeriesId] }),
    onError: () => toast.error(t('common.error')),
  })

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{t('seriesDetail.addFromLibrary')}</SheetTitle>
        </SheetHeader>
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted rounded-md outline-none focus:ring-1 focus:ring-primary"
              placeholder={t('collections.searchLibrary')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              {t('seriesDetail.noLibraryComics')}
            </p>
          ) : (
            filtered.map((uc) => (
              <div key={uc.id} className="flex items-center gap-3 px-4 py-3">
                <div className="size-10 rounded overflow-hidden bg-muted shrink-0">
                  {uc.comic.coverUrl ? (
                    <img src={uc.comic.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="size-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{uc.comic.title}</p>
                  <p className="text-xs text-muted-foreground">{uc.comic.publisher} · {uc.comic.year}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={assignMutation.isPending}
                  onClick={() => assignMutation.mutate(uc.comic.id)}
                >
                  {assignMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Plus className="size-3.5" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Edit Series Dialog ───────────────────────────────────────────────────────

function EditSeriesDialog({
  open,
  onClose,
  collectionId,
  collectionSeriesId,
  initialName,
  initialTotalVolumes,
}: {
  open: boolean
  onClose: () => void
  collectionId: string
  collectionSeriesId: string
  initialName: string
  initialTotalVolumes: number | null
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [name, setName] = useState(initialName)
  const [totalVolumes, setTotalVolumes] = useState(
    initialTotalVolumes != null ? String(initialTotalVolumes) : '',
  )

  const mutation = useMutation({
    mutationFn: () =>
      collectionSeriesApi.update(collectionId, collectionSeriesId, {
        name: name.trim(),
        totalVolumes: totalVolumes ? parseInt(totalVolumes, 10) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['series-detail', collectionSeriesId] })
      qc.invalidateQueries({ queryKey: ['library-series-view'] })
      toast.success(t('library.seriesUpdated', { name: name.trim() }))
      onClose()
    },
    onError: () => toast.error(t('common.error')),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('library.editSeries')}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
          className="space-y-4 pt-1"
        >
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
            <Label htmlFor="series-total">
              {t('library.seriesTotalIssues')}{' '}
              <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
            </Label>
            <Input
              id="series-total"
              type="number"
              min={1}
              value={totalVolumes}
              onChange={(e) => setTotalVolumes(e.target.value)}
              placeholder="24"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending || !name.trim()}>
              {mutation.isPending ? (
                <><Loader2 className="size-3.5 animate-spin mr-1" />{t('common.saving')}</>
              ) : (
                t('common.save')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [addFromLibraryOpen, setAddFromLibraryOpen] = useState(false)
  const [localOrder, setLocalOrder] = useState<string[] | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const { data, isLoading } = useQuery({
    queryKey: ['series-detail', id],
    queryFn: () => libraryApi.getSeriesDetail(id!),
    enabled: !!id,
  })

  const reorderMutation = useMutation({
    mutationFn: (positions: { comicId: string; position: number }[]) =>
      libraryApi.reorderSeries(id!, positions),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['series-detail', id] })
    },
    onError: () => toast.error(t('common.error')),
  })

  // Build the ordered grid
  // Gap mode: totalVolumes set AND comics have numeric issueNumbers → fixed slots, no DnD
  // Free mode: no numeric issues or no totalVolumes → all slots draggable
  const { grid, isDragMode } = useMemo(() => {
    type Slot = { type: 'owned'; entry: UserComic } | { type: 'missing'; n: number }

    if (!data) return { grid: [] as Slot[], isDragMode: false }

    const byIssueNumber = new Map<number, UserComic>()
    const nonNumeric: UserComic[] = []

    for (const uc of data.comics) {
      const n = parseInt(uc.comic.issueNumber ?? '', 10)
      if (!isNaN(n) && n > 0) {
        byIssueNumber.set(n, uc)
      } else {
        nonNumeric.push(uc)
      }
    }

    const hasNumericIssues = byIssueNumber.size > 0
    const gapMode = data.totalVolumes != null && data.totalVolumes > 0 && hasNumericIssues

    if (gapMode) {
      const slots: Slot[] = []
      for (let i = 1; i <= data.totalVolumes!; i++) {
        const uc = byIssueNumber.get(i)
        slots.push(uc ? { type: 'owned', entry: uc } : { type: 'missing', n: i })
      }
      for (const uc of nonNumeric) slots.push({ type: 'owned', entry: uc })
      return { grid: slots, isDragMode: false }
    }

    // Free mode — reconstruct from localOrder or fall back to server order
    const allComics = [
      ...Array.from(byIssueNumber.entries())
        .sort(([a], [b]) => a - b)
        .map(([, uc]) => uc),
      ...nonNumeric,
    ]

    let slots: Slot[]

    if (localOrder) {
      const comicMap = new Map(allComics.map((uc) => [uc.comic.id, uc]))
      slots = []
      for (const slotId of localOrder) {
        if (slotId.startsWith('missing-')) {
          slots.push({ type: 'missing', n: parseInt(slotId.slice('missing-'.length), 10) })
        } else {
          const uc = comicMap.get(slotId)
          if (uc) slots.push({ type: 'owned', entry: uc })
        }
      }
      const inOrder = new Set(localOrder)
      for (const uc of allComics) {
        if (!inOrder.has(uc.comic.id)) slots.push({ type: 'owned', entry: uc })
      }
    } else {
      const hasPositions = allComics.some((uc) => uc.seriesPosition != null)

      if (data.totalVolumes != null && data.totalVolumes > 0 && hasPositions) {
        const posMap = new Map<number, UserComic>()
        const unpositioned: UserComic[] = []
        for (const uc of allComics) {
          const p = uc.seriesPosition
          if (p != null && p >= 1 && p <= data.totalVolumes) {
            posMap.set(p, uc)
          } else {
            unpositioned.push(uc)
          }
        }
        slots = []
        for (let i = 1; i <= data.totalVolumes; i++) {
          const uc = posMap.get(i)
          slots.push(uc ? { type: 'owned', entry: uc } : { type: 'missing', n: i })
        }
        for (const uc of unpositioned) slots.push({ type: 'owned', entry: uc })
      } else {
        slots = allComics.map((uc) => ({ type: 'owned' as const, entry: uc }))
        if (data.totalVolumes != null && data.totalVolumes > 0) {
          for (let i = allComics.length + 1; i <= data.totalVolumes; i++) {
            slots.push({ type: 'missing' as const, n: i })
          }
        }
      }
    }

    return { grid: slots, isDragMode: true }
  }, [data, localOrder])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const current = grid.map((s) =>
      s.type === 'owned' ? s.entry.comic.id : `missing-${s.n}`,
    )
    const oldIndex = current.indexOf(String(active.id))
    const newIndex = current.indexOf(String(over.id))
    const reordered = arrayMove(current, oldIndex, newIndex)

    // Renumber missing slots sequentially after each reorder
    let missingCounter = 0
    const newOrder = reordered.map((slotId) => {
      if (slotId.startsWith('missing-')) {
        missingCounter++
        return `missing-${missingCounter}`
      }
      return slotId
    })

    setLocalOrder(newOrder)
    const ownedPositions = newOrder.reduce<{ comicId: string; position: number }[]>(
      (acc, slotId, i) => {
        if (!slotId.startsWith('missing-')) acc.push({ comicId: slotId, position: i + 1 })
        return acc
      },
      [],
    )
    reorderMutation.mutate(ownedPositions)
  }

  const existingComicIds = useMemo(
    () => new Set((data?.comics ?? []).map((uc) => uc.comic.id)),
    [data],
  )

  const progress =
    data?.totalVolumes && data.totalVolumes > 0
      ? Math.round((data.ownedCount / data.totalVolumes) * 100)
      : null

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-72 w-full" />
        <div className="px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-lg overflow-hidden">
                <Skeleton className="aspect-[2/3] w-full" />
                <div className="p-3 space-y-1.5">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Not found ───────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Layers className="size-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">{t('seriesDetail.notFound')}</p>
        <Button variant="outline" onClick={() => navigate('/library')}>
          {t('seriesDetail.backToLibrary')}
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative h-72 w-full overflow-hidden">
        {data.coverUrl ? (
          <img
            src={data.coverUrl}
            alt={data.seriesName}
            className="absolute inset-0 w-full h-full object-cover grayscale contrast-125 scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/10" />

        <div className="relative z-10 h-full flex flex-col justify-end px-8 pb-8 max-w-7xl">
          {/* Breadcrumb */}
          <button
            onClick={() => navigate('/library/series')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5 w-fit"
          >
            <ArrowLeft className="size-3.5" />
            {t('seriesDetail.backToLibrary')}
          </button>

          <div className="flex items-end justify-between gap-6">
            <div className="flex-1 min-w-0">
              {/* Meta badges */}
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {data.publisher && (
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    {data.publisher}
                  </span>
                )}
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50">
                  {data.collectionName}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-none mb-4 truncate">
                {data.seriesName}
              </h1>

              {/* Progress */}
              {progress !== null ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    {t('seriesDetail.vaultProgress')}
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="w-48 h-1 bg-muted-foreground/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono text-primary">
                      {data.ownedCount} {t('seriesDetail.of')} {data.totalVolumes}{' '}
                      {t('library.issues')}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {data.comicCount} {t('library.issues').toUpperCase()}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-3.5" />
                {t('library.editSeries')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setAddFromLibraryOpen(true)}
              >
                <BookOpen className="size-3.5" />
                {t('seriesDetail.addFromLibrary')}
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => navigate(`/search?q=${encodeURIComponent(data.seriesName)}`)}
              >
                <Search className="size-3.5" />
                {t('seriesDetail.addIssueSearch')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Issue Manifest ─────────────────────────────────────────────────── */}
      <div className="px-8 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
            {t('seriesDetail.manifest')}
            {reorderMutation.isPending && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
          </h2>
          {data.totalVolumes == null && data.comicCount > 0 && (
            <button
              onClick={() => setEditOpen(true)}
              className="text-[10px] text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-full uppercase font-bold tracking-wider transition-colors"
            >
              {t('seriesDetail.noTotalHint')} →
            </button>
          )}
        </div>

        {grid.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Search className="size-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">{t('seriesDetail.empty')}</p>
            <Button size="sm" onClick={() => navigate(`/search?q=${encodeURIComponent(data.seriesName)}`)}>
              {t('seriesDetail.addIssue')}
            </Button>
          </div>
        ) : isDragMode ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={grid.map((s) => s.type === 'owned' ? s.entry.comic.id : `missing-${s.n}`)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {grid.map((slot) =>
                  slot.type === 'owned' ? (
                    <SortableIssueCard key={slot.entry.comic.id} entry={slot.entry} />
                  ) : (
                    <SortableMissingCard
                      key={`missing-${slot.n}`}
                      issueNumber={slot.n}
                      searchQuery={`${data.collectionName} ${slot.n}`}
                    />
                  ),
                )}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {grid.map((slot) =>
              slot.type === 'owned' ? (
                <IssueCard key={slot.entry.comic.id} entry={slot.entry} />
              ) : (
                <MissingIssueCard
                  key={`missing-${slot.n}`}
                  issueNumber={slot.n}
                  searchQuery={`${data.seriesName} ${slot.n}`}
                />
              ),
            )}
          </div>
        )}
      </div>

      {/* ── Edit Dialog ─────────────────────────────────────────────────────── */}
      {editOpen && (
        <EditSeriesDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          collectionId={data.collectionId}
          collectionSeriesId={data.collectionSeriesId}
          initialName={data.seriesName}
          initialTotalVolumes={data.totalVolumes}
        />
      )}

      {/* ── Add from Library Sheet ──────────────────────────────────────────── */}
      <AddFromLibrarySheet
        open={addFromLibraryOpen}
        onClose={() => setAddFromLibraryOpen(false)}
        collectionSeriesId={data.collectionSeriesId}
        existingComicIds={existingComicIds}
      />
    </>
  )
}

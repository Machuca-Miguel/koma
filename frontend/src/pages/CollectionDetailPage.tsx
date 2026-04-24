import { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  BookOpen, Check, Download,
  Folders, Globe, Lock, Pencil,
  Plus, Search, Sparkles, Star, Trash2, X,
} from 'lucide-react'
import { collectionsApi } from '@/api/collections'
import { libraryApi } from '@/api/library'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageContainer } from '@/components/layout/PageContainer'
import { EmptyState } from '@/components/ui/empty-state'
import type { Collection, CollectionComic, CollectionSeries } from '@/types'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ─── Star Rating Input ────────────────────────────────────────────────────────

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5"
        >
          <Star
            className={`size-5 transition-colors ${
              n <= (hover || value) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

// ─── Edit Collection Dialog ───────────────────────────────────────────────────

function EditCollectionDialog({ open, onClose, collection }: {
  open: boolean; onClose: () => void; collection: Collection
}) {
  const qc = useQueryClient()
  const { t } = useTranslation()

  const schema = z.object({
    name: z.string().min(1, t('collections.validation.nameRequired')).max(60, t('collections.validation.nameTooLong')),
    description: z.string().max(200, t('collections.validation.descTooLong')).optional(),
    isPublic: z.boolean(),
    rating: z.number().min(0).max(5).optional(),
  })
  type Form = z.infer<typeof schema>

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: collection.name,
      description: collection.description ?? '',
      isPublic: collection.isPublic,
      rating: collection.rating ?? 0,
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const isPublic = watch('isPublic')
  const rating = watch('rating') ?? 0

  const mutation = useMutation({
    mutationFn: (data: Form) => collectionsApi.update(collection.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection', collection.id] })
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(t('collections.updateSuccess'))
      onClose()
    },
    onError: () => toast.error(t('collections.saveError')),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('collections.editTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>{t('collections.nameLabel')}</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>
              {t('collections.descLabel')}{' '}
              <span className="text-muted-foreground">{t('collections.descOptional')}</span>
            </Label>
            <Input {...register('description')} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('collections.ratingLabel')}</Label>
            <StarRatingInput value={rating} onChange={(v) => setValue('rating', v)} />
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
              {mutation.isPending ? t('collections.saving') : t('collections.saveChanges')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Comic Card ───────────────────────────────────────────────────────────────

function CollectionComicCard({ item, onRemove }: {
  item: CollectionComic
  onRemove: (comicId: string) => void
}) {
  const { t } = useTranslation()
  const comic = item.comic
  const readStatus = item.userStatus?.readStatus

  const badge =
    readStatus === 'READ'
      ? { label: t('status.READ'),    cls: 'bg-muted text-emerald-600 dark:text-emerald-400' }
      : readStatus === 'READING'
      ? { label: t('status.READING'), cls: 'bg-muted text-amber-600 dark:text-amber-400' }
      : null

  return (
    <article className="group relative bg-card overflow-hidden border border-border/10 hover:border-primary/40 transition-all duration-300 flex flex-col">
      <Link to={`/comics/${comic.id}`} className="flex flex-col flex-1">
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          {comic.coverUrl
            ? <img src={comic.coverUrl} alt={comic.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="size-6 text-muted-foreground/30" />
              </div>
          }
          {badge && (
            <span className={`absolute top-2 right-2 text-[0.6rem] font-bold px-2 pt-0.5 rounded-full uppercase backdrop-blur-sm ${badge.cls}`}>
              {badge.label}
            </span>
          )}
        </div>
        <div className="p-3 flex flex-col flex-1 border-t border-border/10">
          <h4 className="text-sm font-semibold leading-tight line-clamp-1 mb-2 flex-1 group-hover:text-primary transition-colors">
            {comic.title}
          </h4>
          {comic.year && (
            <span className="text-[0.65rem] text-muted-foreground">{comic.year}</span>
          )}
        </div>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); onRemove(comic.id) }}
        className="absolute top-1.5 left-1.5 size-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title={t('collections.removeComic')}
      >
        <X className="size-3" />
      </button>
    </article>
  )
}

// ─── Add Comics Sheet ─────────────────────────────────────────────────────────

function AddComicsSheet({ open, onClose, collectionId, existingIds }: {
  open: boolean
  onClose: () => void
  collectionId: string
  existingIds: Set<string>
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
      (uc) => !existingIds.has(uc.comic.id) && uc.comic.title.toLowerCase().includes(q),
    )
  }, [libraryPage, existingIds, search])

  const addMutation = useMutation({
    mutationFn: (comicId: string) => collectionsApi.addComic(collectionId, comicId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collection-comics', collectionId] }),
    onError: () => toast.error(t('collections.addComicError')),
  })

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{t('collections.addComics')}</SheetTitle>
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
            <p className="text-center text-sm text-muted-foreground py-12">{t('common.noResults')}</p>
          ) : filtered.map((uc) => (
            <div key={uc.id} className="flex items-center gap-3 px-4 py-3">
              <div className="size-10 rounded overflow-hidden bg-muted shrink-0">
                {uc.comic.coverUrl
                  ? <img src={uc.comic.coverUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="size-4 text-muted-foreground/40" />
                    </div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{uc.comic.title}</p>
                <p className="text-xs text-muted-foreground">{uc.comic.publisher} · {uc.comic.year}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={addMutation.isPending}
                onClick={() => addMutation.mutate(uc.comic.id)}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Suggestions Sheet ────────────────────────────────────────────────────────

function SuggestionsSheet({ open, onClose, collectionId, existingIds }: {
  open: boolean
  onClose: () => void
  collectionId: string
  existingIds: Set<string>
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['collection-suggestions', collectionId],
    queryFn: () => collectionsApi.getSuggestions(collectionId),
    enabled: open,
  })

  const addMutation = useMutation({
    mutationFn: (comicId: string) => collectionsApi.addComic(collectionId, comicId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collection-comics', collectionId] }),
    onError: () => toast.error(t('collections.addComicError')),
  })

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            {t('collections.suggestions')}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-md" />)}
            </div>
          ) : !suggestions?.length ? (
            <p className="text-center text-sm text-muted-foreground py-12">{t('collections.suggestionsEmpty')}</p>
          ) : suggestions.map((s) => (
            <div key={s.comicId} className="flex items-center gap-3 px-4 py-3">
              <div className="size-10 rounded overflow-hidden bg-muted shrink-0">
                {s.comic.coverUrl
                  ? <img src={s.comic.coverUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="size-4 text-muted-foreground/40" />
                    </div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{s.comic.title}</p>
                <p className="text-xs text-muted-foreground">{s.comic.publisher} · {s.comic.year}</p>
              </div>
              {existingIds.has(s.comicId) ? (
                <Check className="size-4 text-emerald-500 shrink-0" />
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={addMutation.isPending}
                  onClick={() => addMutation.mutate(s.comicId)}
                >
                  <Plus className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const qc = useQueryClient()

  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [internalSearch, setInternalSearch] = useState('')
  const [seriesFilter, setSeriesFilter] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(6)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w < 640) setCols(2)
      else if (w < 768) setCols(3)
      else if (w < 1024) setCols(4)
      else if (w < 1280) setCols(5)
      else setCols(6)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { data: collection, isLoading: loadingCol } = useQuery<Collection>({
    queryKey: ['collection', id],
    queryFn: () => collectionsApi.getOne(id!),
    enabled: !!id,
  })

  const { data: comics, isLoading: loadingComics } = useQuery<CollectionComic[]>({
    queryKey: ['collection-comics', id],
    queryFn: () => collectionsApi.getComics(id!),
    enabled: !!id,
  })

  const allComics = useMemo(() => comics ?? [], [comics])
  const existingIds = useMemo(() => new Set(allComics.map((c) => c.comic.id)), [allComics])

  const seriesOptions = useMemo(() => {
    const map = new Map<string, string>()
    allComics.forEach((c) => {
      const s = c.comic.collectionSeries
      if (s) map.set(s.id, s.name)
    })
    return Array.from(map.entries()).map(([sid, name]) => ({ id: sid, name }))
  }, [allComics])

  const filteredComics = useMemo(() => {
    const q = internalSearch.toLowerCase()
    return allComics.filter((c) => {
      const matchSearch = !q || c.comic.title.toLowerCase().includes(q)
      const matchSeries = !seriesFilter
        || (seriesFilter === '__unsorted__'
          ? !c.comic.collectionSeriesId
          : c.comic.collectionSeriesId === seriesFilter)
      return matchSearch && matchSeries
    })
  }, [allComics, internalSearch, seriesFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, { series: CollectionSeries | null; items: CollectionComic[] }>()
    filteredComics.forEach((item) => {
      const key = item.comic.collectionSeriesId ?? '__unsorted__'
      if (!map.has(key)) {
        map.set(key, { series: item.comic.collectionSeries ?? null, items: [] })
      }
      map.get(key)!.items.push(item)
    })
    const result = Array.from(map.entries()).map(([key, { series, items }]) => ({ key, series, items }))
    result.sort((a, b) => {
      if (a.key === '__unsorted__') return 1
      if (b.key === '__unsorted__') return -1
      if (a.series?.isDefault && !b.series?.isDefault) return -1
      if (!a.series?.isDefault && b.series?.isDefault) return 1
      return (a.series?.name ?? '').localeCompare(b.series?.name ?? '')
    })
    return result
  }, [filteredComics])

  const removeMutation = useMutation({
    mutationFn: (comicId: string) => collectionsApi.removeComic(id!, comicId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-comics', id] })
      toast.success(t('collections.removeComicSuccess'))
    },
    onError: () => toast.error(t('collections.removeComicError')),
  })

  const deleteMutation = useMutation({
    mutationFn: () => collectionsApi.remove(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(t('collections.deleteSuccess'))
      navigate('/collections')
    },
    onError: () => toast.error(t('collections.deleteError')),
  })

  async function handleExport(format: 'csv' | 'json') {
    if (!id) return
    setExporting(true)
    try {
      const blob = await collectionsApi.exportCollection(id, format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `collection-${id}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t('collections.exportError'))
    } finally {
      setExporting(false)
    }
  }

  if (loadingCol) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </PageContainer>
    )
  }

  if (!collection) {
    return (
      <PageContainer>
        <EmptyState
          icon={<Folders className="size-8 text-muted-foreground" />}
          title={t('collections.notFound')}
          action={<Button onClick={() => navigate('/collections')}>{t('common.back')}</Button>}
        />
      </PageContainer>
    )
  }

  const comicCount = collection._count?.comics ?? allComics.length
  const seriesCount = collection._count?.series ?? seriesOptions.length

  const bentoStats: { label: string; value: string | number; isRating?: boolean }[] = [
    { label: t('collections.seriesLabel'), value: seriesCount },
    { label: t('collections.issuesLabel'), value: comicCount },
    { label: t('collections.ratingLabel'), value: collection.rating ?? 0, isRating: true },
    { label: t('collections.yearRange'), value: collection.yearRange ? `${collection.yearRange.min}–${collection.yearRange.max}` : '—' },
  ]

  return (
    <PageContainer>
   

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          {collection.isPublic
            ? <Globe className="size-5 text-muted-foreground shrink-0" />
            : <Lock className="size-5 text-muted-foreground shrink-0" />}
          <h1 className="text-3xl font-bold tracking-tight truncate">{collection.name}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Pencil className="size-3.5" />
            {t('common.edit')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1 text-sm font-medium shadow-sm hover:bg-accent focus-visible:outline-none disabled:opacity-50" disabled={exporting}>
              <Download className="size-3.5" />
              {t('collections.export')}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="destructive"  onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Bento stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {bentoStats.map(({ label, value, isRating }) => (
          <div key={label} className="bg-card rounded-xl border border-border/40 px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">{label}</p>
            {isRating ? (
              (value as number) > 0 ? (
                <div className="flex items-center gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-4 ${i < (value as number) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'}`}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xl font-bold">—</p>
              )
            ) : (
              <p className="text-xl font-bold tabular-nums">{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Controls bar */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Row 1: search + action buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 min-w-0 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted rounded-md outline-none focus:ring-1 focus:ring-primary"
              placeholder={t('collections.searchComics')}
              value={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setSuggestOpen(true)} className="gap-1.5">
              <Sparkles className="size-3.5" />
              {t('collections.suggestions')}
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="size-3.5" />
              {t('collections.addComics')}
            </Button>
          </div>
        </div>
        {/* Row 2: series filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSeriesFilter(null)}
            className={`chip-sort ${seriesFilter === null ? 'chip-active' : 'chip-inactive'}`}
          >
            {t('collections.allSeries')}
          </button>
          {seriesOptions.map(({ id: sid, name }) => (
            <button
              key={sid}
              onClick={() => setSeriesFilter(sid === seriesFilter ? null : sid)}
              className={`chip-sort ${seriesFilter === sid ? 'chip-active' : 'chip-inactive'}`}
            >
              {name}
            </button>
          ))}
          <button
            onClick={() => setSeriesFilter(seriesFilter === '__unsorted__' ? null : '__unsorted__')}
            className={`chip-sort ${seriesFilter === '__unsorted__' ? 'chip-active' : 'chip-inactive'}`}
          >
            {t('collections.unsorted')}
          </button>
        </div>
      </div>

      {/* Comic groups */}
      {loadingComics ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-md" />)}
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={<Folders className="size-8 text-muted-foreground" />}
          title={t('collections.emptyCollection')}
          description={t('collections.emptyComicsHint')}
          action={
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="size-4" />
              {t('collections.addComics')}
            </Button>
          }
        />
      ) : (
        <div ref={containerRef}>
          {grouped.map(({ key, series, items }) => {
            const hasMore = items.length > cols
            const visible = items.slice(0, hasMore ? cols - 1 : cols)
            const extraCount = items.length - visible.length
            const progress = series?.totalVolumes && series.totalVolumes > 0
              ? Math.round((items.length / series.totalVolumes) * 100)
              : null
            const subtitleParts = [
              `${items.length} ${t('library.issues').toLowerCase()}`,
              series?.totalVolumes ? `${items.length}/${series.totalVolumes} vol.` : null,
            ].filter(Boolean).join(' · ')

            return (
              <section key={key} className="mb-12">
                <div className="flex justify-between items-end pb-3 border-b border-border/15 mb-4">
                  <div>
                    <h3 className="text-xl font-bold">
                      {key === '__unsorted__' ? t('collections.unsorted') : series?.name ?? t('collections.unsorted')}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{subtitleParts}</p>
                  </div>
                  {key !== '__unsorted__' && (
                    <button
                      onClick={() => navigate(`/series/${key}`)}
                      className="text-xs font-bold text-primary hover:text-primary/70 uppercase tracking-wider transition-colors shrink-0 ml-4"
                    >
                      {t('seriesDetail.viewAll')} →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {visible.map((item) => (
                    <CollectionComicCard
                      key={item.comic.id}
                      item={item}
                      onRemove={(comicId) => removeMutation.mutate(comicId)}
                    />
                  ))}
                  {extraCount > 0 && key !== '__unsorted__' && (
                    <button
                      onClick={() => navigate(`/series/${key}`)}
                      className="h-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border/25 hover:border-primary/40 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <span className="text-xl font-bold">+{extraCount}</span>
                      <span className="text-[0.6rem] font-bold uppercase tracking-wider">
                        {t('seriesDetail.viewAll')}
                      </span>
                    </button>
                  )}
                </div>
                {progress !== null && (
                <>
                  <div className="h-0.5 mt-5 bg-muted rounded-full overflow-hidden mb-5">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                    <p className="text-[0.65rem] text-muted-foreground uppercase font-bold tracking-wider">
                      <span className='text-bg-foreground'> {progress}%</span> {t('collections.seriesProgressComplete')}
                    </p>
                </>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* Dialogs / Sheets */}
      <EditCollectionDialog open={editOpen} onClose={() => setEditOpen(false)} collection={collection} />
      <AddComicsSheet open={addOpen} onClose={() => setAddOpen(false)} collectionId={id!} existingIds={existingIds} />
      <SuggestionsSheet open={suggestOpen} onClose={() => setSuggestOpen(false)} collectionId={id!} existingIds={existingIds} />

      {/* Delete confirm */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('collections.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('collections.deleteConfirm')}</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

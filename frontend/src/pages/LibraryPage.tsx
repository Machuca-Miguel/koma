import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BookMarked, BookOpen, Bookmark, Star, Trash2, ChevronLeft, ChevronRight,
  Check, Search, X, Tag, SlidersHorizontal, CheckSquare, Folders, PenLine,
  LayoutGrid, Layers,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { libraryApi } from '@/api/library'
import { comicsApi } from '@/api/comics'
import { collectionsApi } from '@/api/collections'
import { Card, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { PageContainer } from '@/components/layout/PageContainer'
import { AddToCollectionDialog } from '@/components/features/AddToCollectionDialog'
import { CreateManualComicSheet } from './SearchPage'
import type { LibraryFilter, SortBy, UserComic, UserSeriesSummary } from '@/types'

const STATUS_FLAGS: { key: keyof Pick<UserComic, 'isOwned' | 'isRead' | 'isWishlist' | 'isFavorite' | 'isLoaned'>; className: string; i18nKey: 'status.OWNED' | 'status.READ' | 'status.WISHLIST' | 'status.FAVORITE' | 'status.LOANED' }[] = [
  { key: 'isOwned',    className: 'bg-secondary/80 text-primary',                              i18nKey: 'status.OWNED'    },
  { key: 'isRead',     className: 'bg-secondary/80 text-emerald-600 dark:text-emerald-400',    i18nKey: 'status.READ'     },
  { key: 'isWishlist', className: 'bg-secondary/80 text-sky-600 dark:text-sky-400',            i18nKey: 'status.WISHLIST' },
  { key: 'isFavorite', className: 'bg-secondary/80 text-[#FF8A65]',                            i18nKey: 'status.FAVORITE' },
  { key: 'isLoaned',   className: 'bg-secondary/80 text-violet-600 dark:text-violet-400',      i18nKey: 'status.LOANED'   },
]

const LIMIT = 24

// ─── Comic Card ───────────────────────────────────────────────────────────────

function ComicCard({
  entry, confirmDeleteId, setConfirmDeleteId, removeMutation,
}: {
  entry: UserComic
  confirmDeleteId: string | null
  setConfirmDeleteId: (id: string | null) => void
  removeMutation: { mutate: (id: string) => void; isPending: boolean }
}) {
  const { t } = useTranslation()
  const { comic } = entry
  const activeStatusFlags = STATUS_FLAGS.filter((f) => entry[f.key])
  return (
    <Card className="overflow-hidden group h-full flex flex-col">
      <Link to={`/comics/${comic.id}`} className="relative block w-full aspect-[2/3] bg-muted overflow-hidden shrink-0">
        {comic.coverUrl ? (
          <img
            src={comic.coverUrl} alt={comic.title} loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="size-10 text-muted-foreground/40" />
          </div>
        )}
        {activeStatusFlags.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {activeStatusFlags.map((f) => (
              <Badge key={f.key} className={`text-[10px] font-medium border-0 ${f.className}`}>
                {t(f.i18nKey)}
              </Badge>
            ))}
          </div>
        )}
      </Link>
      <CardContent className="px-3 flex flex-col flex-1">
        <div className="flex-1 space-y-0.5 min-h-[80px]">
          <p className="text-sm font-medium leading-tight line-clamp-2">{comic.title}</p>
          {comic.series && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate italic">{comic.series}</p>
          )}
          {(comic.issueNumber || comic.publisher) && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {[comic.issueNumber && `#${comic.issueNumber}`, comic.publisher].filter(Boolean).join(' · ')}
            </p>
          )}
          {comic.authors && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 truncate italic">{comic.authors}</p>
          )}
          {comic.year && (
            <p className="text-xs text-muted-foreground/60">{comic.year}</p>
          )}
        </div>
        {comic.tags && comic.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {comic.tags.map(({ tag }) => (
              <span key={tag.id} className="text-xs px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                {tag.name}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-end mt-1">
          {confirmDeleteId === comic.id ? (
            <Button variant="ghost" size="icon" className="size-8 shrink-0 text-destructive hover:text-destructive"
              aria-label={t('common.confirm')}
              onClick={() => { removeMutation.mutate(comic.id); setConfirmDeleteId(null) }}>
              <Check className="size-3.5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={t('common.delete')}
              onClick={() => setConfirmDeleteId(comic.id)}
              disabled={removeMutation.isPending}>
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Series Group View ────────────────────────────────────────────────────────

function SeriesGroupView({ filter, q }: { filter: LibraryFilter; q: string }) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['library-series-view', filter, q],
    queryFn: () => libraryApi.getSeriesView({
      status: filter !== 'ALL' ? filter : undefined,
      q: q || undefined,
    }),
  })

  const createCollectionMutation = useMutation({
    mutationFn: async (group: UserSeriesSummary) => {
      const collection = await collectionsApi.create({
        name: group.seriesName,
        description: group.publisher ?? undefined,
      })
      await Promise.all(group.comics.map((uc) => collectionsApi.addComic(collection.id, uc.comic.id)))
      return collection
    },
    onSuccess: (col) => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(t('library.seriesCollectionCreated', { name: col.name }))
    },
    onError: () => toast.error(t('common.error')),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Layers className="size-8 text-muted-foreground" /></div>
        <p className="font-medium">{t('library.noSeries')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const progress = group.totalCount ? Math.round((group.ownedCount / group.totalCount) * 100) : null
        return (
          <Card key={group.seriesId ?? group.seriesName} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex gap-4 p-4">
                {/* Cover */}
                <div className="shrink-0 w-16 h-[88px] rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {group.coverUrl
                    ? <img src={group.coverUrl} alt={group.seriesName} loading="lazy" className="w-full h-full object-cover" />
                    : <Layers className="size-6 text-muted-foreground/30" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
                  <p className="font-semibold text-sm leading-tight truncate">{group.seriesName}</p>
                  {group.publisher && (
                    <p className="text-xs text-muted-foreground truncate">{group.publisher}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {group.ownedCount} {group.totalCount ? `/ ${group.totalCount}` : ''} {t('library.issues')}
                    </span>
                    {group.isOngoing && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">{t('library.ongoing')}</Badge>
                    )}
                  </div>
                  {progress !== null && (
                    <div className="w-full bg-muted rounded-full h-1.5 mt-0.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex flex-col items-end gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 whitespace-nowrap"
                    disabled={createCollectionMutation.isPending}
                    onClick={() => createCollectionMutation.mutate(group)}
                  >
                    <Folders className="size-3.5" />
                    {t('library.createCollection')}
                  </Button>
                </div>
              </div>

              {/* Issue covers strip */}
              {group.comics.length > 0 && (
                <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto">
                  {group.comics.slice(0, 12).map((uc) => (
                    <Link
                      key={uc.id}
                      to={`/comics/${uc.comic.id}`}
                      className="shrink-0 w-10 h-14 rounded overflow-hidden bg-muted flex items-center justify-center hover:opacity-80 transition-opacity"
                      title={uc.comic.title}
                    >
                      {uc.comic.coverUrl
                        ? <img src={uc.comic.coverUrl} alt={uc.comic.title} loading="lazy" className="w-full h-full object-cover" />
                        : <BookOpen className="size-3 text-muted-foreground/30" />}
                    </Link>
                  ))}
                  {group.comics.length > 12 && (
                    <div className="shrink-0 w-10 h-14 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                      +{group.comics.length - 12}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ─── Library Page ─────────────────────────────────────────────────────────────

export function LibraryPage() {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>(
    (searchParams.get('status') as LibraryFilter) ?? 'ALL'
  )
  const [sortBy, setSortBy] = useState<SortBy>('added_desc')
  const [viewMode, setViewMode] = useState<'grid' | 'series'>('grid')
  const [page, setPage] = useState(1)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  // Multi-select
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [addToCollectionOpen, setAddToCollectionOpen] = useState(false)
  const [createManualOpen, setCreateManualOpen] = useState(false)

  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [searchBy, setSearchBy] = useState<'all' | 'title' | 'author' | 'publisher'>('all')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const [showAdvanced, setShowAdvanced] = useState(false)
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

  const { data: userTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => comicsApi.getTags(),
    staleTime: 60_000,
  })

  const FILTERS: { label: string; value: LibraryFilter; Icon?: LucideIcon }[] = [
    { label: t('library.filterAll'),      value: 'ALL'      },
    { label: t('library.filterOwned'),    value: 'OWNED',    Icon: BookMarked },
    { label: t('library.filterRead'),     value: 'READ',     Icon: BookOpen   },
    { label: t('library.filterWishlist'), value: 'WISHLIST', Icon: Bookmark   },
    { label: t('library.filterFavorite'), value: 'FAVORITE', Icon: Star       },
  ]

  const SORT_OPTIONS: { label: string; value: SortBy }[] = [
    { label: t('library.sortAdded'),   value: 'added_desc'  },
    { label: t('library.sortTitle'),   value: 'title_asc'   },
    { label: t('library.sortSeries'),  value: 'series_asc'  },
    { label: t('library.sortYear'),    value: 'year_asc'    },
    { label: t('library.sortRating'),  value: 'rating_desc' },
  ]

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

  const handleFilterChange = (filter: LibraryFilter) => {
    setActiveFilter(filter)
    setPage(1)
  }

  const hasActiveFilters = q || activeTag || publisher || yearFrom || yearTo
  const advancedActiveCount = [publisher, yearFrom, yearTo].filter(Boolean).length

  const clearAllFilters = () => {
    setSearchInput(''); setQ('')
    setSearchBy('all')
    setActiveTag(null)
    setPublisherInput(''); setPublisher('')
    setYearFromInput(''); setYearFrom('')
    setYearToInput(''); setYearTo('')
  }

  function toggleSelect(comicId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(comicId) ? next.delete(comicId) : next.add(comicId)
      return next
    })
  }

  function exitSelecting() {
    setIsSelecting(false)
    setSelectedIds(new Set())
  }

  async function handleAddToCollection(collectionId: string) {
    await Promise.all([...selectedIds].map((id) => collectionsApi.addComic(collectionId, id)))
    qc.invalidateQueries({ queryKey: ['collections'] })
    toast.success(t('collections.addMultipleSuccess', { count: selectedIds.size }))
    exitSelecting()
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('library.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1 h-5">
            {totalCount !== null ? t('library.comicCount', { count: totalCount }) : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* View mode toggle */}
          <div className="flex rounded-md border border-input overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title={t('library.viewGrid')}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setViewMode('series')}
              className={`px-2.5 py-1.5 transition-colors ${viewMode === 'series' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title={t('library.viewSeries')}
            >
              <Layers className="size-4" />
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setCreateManualOpen(true)}
          >
            <PenLine className="size-4" />
            {t('search.createManual.trigger')}
          </Button>
          <Button
            variant={isSelecting ? 'secondary' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => { if (isSelecting) exitSelecting(); else setIsSelecting(true) }}
          >
            <CheckSquare className="size-4" />
            {isSelecting ? t('common.cancel') : t('library.selectMode')}
          </Button>
        </div>
      </div>

      {/* Search bar with integrated type selector */}
      <div className="flex h-10 items-center rounded-lg border border-input bg-transparent ring-offset-background focus-within:ring-3 focus-within:ring-ring/50 focus-within:border-ring transition-colors mb-4 overflow-hidden dark:bg-input/30">
        <Select
          value={searchBy}
          onValueChange={(v) => { setSearchBy(v as typeof searchBy); setPage(1) }}
        >
          <SelectTrigger className="h-full w-auto shrink-0 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 dark:bg-transparent dark:hover:bg-transparent pl-3 pr-2 gap-1">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {searchBy === 'all'       ? t('library.searchByAll') :
               searchBy === 'title'     ? t('library.searchByTitle') :
               searchBy === 'author'    ? t('library.searchByAuthor') :
                                          t('library.searchByPublisher')}
            </span>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value="all">{t('library.searchByAll')}</SelectItem>
            <SelectItem value="title">{t('library.searchByTitle')}</SelectItem>
            <SelectItem value="author">{t('library.searchByAuthor')}</SelectItem>
            <SelectItem value="publisher">{t('library.searchByPublisher')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-px h-5 bg-border shrink-0" />
        <div className="relative flex-1 flex items-center h-full">
          <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={
              searchBy === 'title'     ? t('library.searchPlaceholderTitle') :
              searchBy === 'author'    ? t('library.searchPlaceholderAuthor') :
              searchBy === 'publisher' ? t('library.searchPlaceholderPublisher') :
              t('library.searchPlaceholder')
            }
            className="w-full h-full pl-9 pr-9 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
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

      {/* Tag filter chips */}
      {userTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Tag className="size-3" />
            {t('library.filterByTag')}:
          </span>
          {userTags.map((tag) => (
            <button
              key={tag.slug}
              onClick={() => { setActiveTag(activeTag === tag.slug ? null : tag.slug); setPage(1) }}
              className={`chip-tag ${activeTag === tag.slug ? 'chip-active' : 'chip-inactive'}`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Advanced filters toggle */}
      <div className="mb-3">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={`chip-filter ${
            advancedActiveCount > 0
              ? 'bg-primary/10 text-primary'
              : 'chip-inactive'
          }`}
        >
          <SlidersHorizontal className="size-3.5" />
          {t('library.advancedFilters')}
          {advancedActiveCount > 0 && (
            <span className="ml-1 size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold">
              {advancedActiveCount}
            </span>
          )}
        </button>

        {showAdvanced && (
          <div className="mt-2 flex flex-wrap gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex flex-col gap-1 min-w-[160px] flex-1">
              <label className="text-xs font-medium text-muted-foreground">{t('library.filterPublisher')}</label>
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
            <div className="flex flex-col gap-1 min-w-[100px]">
              <label className="text-xs font-medium text-muted-foreground">{t('library.filterYearFrom')}</label>
              <Input
                type="number"
                value={yearFromInput}
                onChange={(e) => setYearFromInput(e.target.value)}
                placeholder="1970"
                className="h-8 text-sm w-24"
                min={1900}
                max={2099}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[100px]">
              <label className="text-xs font-medium text-muted-foreground">{t('library.filterYearTo')}</label>
              <Input
                type="number"
                value={yearToInput}
                onChange={(e) => setYearToInput(e.target.value)}
                placeholder="2024"
                className="h-8 text-sm w-24"
                min={1900}
                max={2099}
              />
            </div>
            {advancedActiveCount > 0 && (
              <div className="flex items-end">
                <button
                  onClick={() => { setPublisherInput(''); setPublisher(''); setYearFromInput(''); setYearFrom(''); setYearToInput(''); setYearTo('') }}
                  className="h-8 px-2.5 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  {t('library.clearFilters')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map(({ label, value, Icon }) => (
          <button
            key={value}
            onClick={() => handleFilterChange(value)}
            className={`chip-filter ${activeFilter === value ? 'chip-active' : 'chip-inactive'}`}
          >
            {Icon && <Icon className="size-3.5" />}
            {label}
          </button>
        ))}
      </div>

      {/* Sort chips */}
      <div className="flex flex-wrap items-center gap-1.5 mb-6">
        <span className="text-xs text-muted-foreground shrink-0">{t('library.sortBy')}:</span>
        {SORT_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => { setSortBy(value); setPage(1) }}
            className={`chip-sort ${sortBy === value ? 'chip-active' : 'chip-inactive'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {viewMode === 'series' ? (
        <SeriesGroupView filter={activeFilter} q={q} />
      ) : isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full aspect-[2/3] rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : comics.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <BookOpen className="size-8 text-muted-foreground" />
          </div>
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
              <Link to="/search" className={cn(buttonVariants(), "mt-4")}>
                <Search className="size-4" />
                {t('library.searchComics')}
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {comics.map((entry) => {
            const isSelected = selectedIds.has(entry.comic.id)
            return (
              <div
                key={entry.id}
                className={`relative ${isSelecting && isSelected ? 'ring-2 ring-primary ring-offset-2 rounded-xl' : ''}`}
              >
                {isSelecting && (
                  <button
                    type="button"
                    onClick={() => toggleSelect(entry.comic.id)}
                    className="absolute inset-0 z-10 rounded-xl"
                    aria-label={isSelected ? t('common.deselect') : t('common.select')}
                  >
                    <div className={`absolute top-2 right-2 size-5 rounded-md border-2 flex items-center justify-center shadow-sm transition-colors ${
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <Button variant="outline" size="icon" onClick={() => setPage((p) => p - 1)} disabled={page === 1} aria-label={t('library.prevPage')}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {t('library.pageOf', { page, total: totalPages })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} aria-label={t('library.nextPage')}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
      {/* Selection action bar */}
      {isSelecting && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-background border shadow-xl">
          <span className="text-sm font-medium">
            {t('library.selectedCount', { count: selectedIds.size })}
          </span>
          <Button size="sm" className="gap-1.5" onClick={() => setAddToCollectionOpen(true)}>
            <Folders className="size-3.5" />
            {t('library.addToCollection')}
          </Button>
          <Button variant="ghost" size="sm" onClick={exitSelecting}>
            {t('common.cancel')}
          </Button>
        </div>
      )}

      <AddToCollectionDialog
        open={addToCollectionOpen}
        onClose={() => setAddToCollectionOpen(false)}
        count={selectedIds.size}
        onConfirm={handleAddToCollection}
      />
      <CreateManualComicSheet
        open={createManualOpen}
        onOpenChange={setCreateManualOpen}
      />
    </PageContainer>
  )
}

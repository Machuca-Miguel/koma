import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BookOpen, ChevronLeft, ChevronRight,
  Check, Search, X, Tag, SlidersHorizontal, CheckSquare, Folders,
  Plus, ChevronDown, Star,
} from 'lucide-react'
import { ConfirmDeleteButton } from '@/components/ui/ConfirmDeleteButton'
import { toast } from 'sonner'
import { libraryApi } from '@/api/library'
import { comicsApi } from '@/api/comics'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { AddToCollectionSheet } from '@/components/features/AddToCollectionSheet'
import { CreateManualComicSheet } from './SearchPage'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import type { LibraryFilter, SortBy, UserComic } from '@/types'

const LIMIT = 24

// ─── Comic Card ───────────────────────────────────────────────────────────────

function ComicCard({
  entry,
  removeMutation,
}: {
  entry: UserComic
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
    <div className="group flex flex-col bg-card rounded-lg overflow-hidden hover:-translate-y-1 transition-all duration-300 border border-border/10">
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

        {comic.issueNumber && (
          <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-2 py-0.5 rounded font-black text-xs">
            #{comic.issueNumber}
          </div>
        )}


        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ConfirmDeleteButton
            onConfirm={() => removeMutation.mutate(comic.id)}
            disabled={removeMutation.isPending}
          />
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
        ) : (
          <span className="dark:text-muted-400 bg-muted/90 text-muted-foreground w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-border/10">
          <Skeleton className="w-full aspect-[2/3]" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Library Page (Comics view) ───────────────────────────────────────────────

export function LibraryPage() {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()

  const initQ = searchParams.get('q') ?? ''

  const [activeFilter, setActiveFilter] = useState<LibraryFilter>(
    (searchParams.get('status') as LibraryFilter) ?? 'ALL',
  )
  const [sortBy, setSortBy] = useState<SortBy>(
    (searchParams.get('sortBy') as SortBy) ??
    (localStorage.getItem('lib-sort') as SortBy | null) ??
    'added_desc',
  )
  const [page, setPage] = useState(1)


  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [addToCollectionOpen, setAddToCollectionOpen] = useState(false)
  const [createManualOpen, setCreateManualOpen] = useState(false)

  const [searchInput, setSearchInput] = useState(initQ)
  const [q, setQ] = useState(initQ)
  const [searchBy, setSearchBy] = useState<
    'all' | 'title' | 'authors' | 'scriptwriter' | 'artist' | 'publisher'
  >('all')

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

  const FILTERS: { label: string; value: LibraryFilter }[] = [
    { label: t('library.filterAll'),      value: 'ALL'           },
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

  return (
    <PageContainer>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="mb-8">
        <PageHeader
          title={t('nav.comics')}
          className="mb-6 items-end"
          action={
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
          }
        />

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex items-center bg-card border border-border/20 rounded-lg overflow-hidden flex-1 min-w-[100%] max-w-sm">
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

          {/* Status pills */}
          <div className="flex gap-1 overflow-x-auto">
            {FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => handleFilterChange(value)}
                className={`px-4 py-2 rounded-xl text-[0.7rem] font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                  activeFilter === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort + Advanced */}
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
        </div>

        {/* ── Advanced filter panel ────────────────────────────────────────── */}
        {showAdvanced && (
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
      {isLoading ? (
        <GridSkeleton />
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
                  removeMutation={removeMutation}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="mt-20 pt-8 border-t border-border/15 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-10">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{t('library.footerTotalLabel')}</span>
            <span className="text-xl font-bold">{totalCount ?? '—'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{t('library.footerReadStatusLabel')}</span>
            <span className="text-xl font-bold text-primary">{t('library.footerComplete', { percent: readPercent })}</span>
          </div>
        </div>

        {totalPages > 1 && (
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
              {t('library.footerPage', { page, total: totalPages }).toUpperCase()}
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
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-muted border shadow-xl">
          <span className="text-sm font-medium">{t('library.selectedCount', { count: selectedIds.size })}</span>
          <Button size="sm" className="gap-1.5" onClick={() => setAddToCollectionOpen(true)}>
            <Folders className="size-3.5" />
            {t('library.addToCollection')}
          </Button>
          <Button variant="outline" size="sm" onClick={exitSelecting}>{t('common.cancel')}</Button>
        </div>
      )}

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setCreateManualOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
        aria-label={t('search.createManual.trigger')}
      >
        <Plus className="size-6" />
      </button>

      <AddToCollectionSheet
        mode="multiple"
        open={addToCollectionOpen}
        onOpenChange={setAddToCollectionOpen}
        selectedComicIds={[...selectedIds]}
        onSuccess={exitSelecting}
      />
      <CreateManualComicSheet open={createManualOpen} onOpenChange={setCreateManualOpen} />
    </PageContainer>
  )
}

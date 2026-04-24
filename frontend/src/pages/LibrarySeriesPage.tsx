import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, Search, X, Layers } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { libraryApi } from '@/api/library'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import type { UserComic, UserSeriesSummary } from '@/types'

type CompletionFilter = 'ALL' | 'COMPLETE' | 'INCOMPLETE'

// ─── Issue Card ───────────────────────────────────────────────────────────────

function IssueCard({ entry }: { entry: UserComic }) {
  const { t } = useTranslation()
  const { comic } = entry
  const badge =
    entry.readStatus === 'READ'
      ? { label: t('status.READ'),    cls: 'bg-muted text-emerald-600 dark:text-emerald-400' }
      : entry.readStatus === 'READING'
      ? { label: t('status.READING'), cls: 'bg-muted text-amber-600 dark:text-amber-400' }
      : entry.collectionStatus === 'WISHLIST'
      ? { label: t('status.WISHLIST'), cls: 'bg-muted text-sky-600 dark:text-sky-400' }
      : null

  return (
    <Link to={`/comics/${comic.id}`} className="block h-full">
      <article className="group bg-card  overflow-hidden border border-border/10 hover:border-primary/40 transition-all duration-300 flex flex-col h-full cursor-pointer">
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
              <BookOpen className="size-6 text-muted-foreground/30" />
            </div>
          )}
          {badge && (
            <span className={`absolute top-2 right-2 text-[0.6rem] font-bold px-2 pt-0.5 rounded-full uppercase backdrop-blur-sm ${badge.cls}`}>
              {badge.label}
            </span>
          )}
        </div>
        <div title={comic.title} className="p-3 flex flex-col flex-1 border-t border-border/10">
          <h4 className="text-sm font-semibold leading-tight line-clamp-1 mb-2 flex-1 group-hover:text-primary transition-colors">
            {comic.title}
          </h4>
          <div className="flex justify-between items-baseline mb-1">
            {entry.seriesPosition != null && (
              <span className="text-[0.8rem] text-muted-foreground text-mono">Vol #{entry.seriesPosition}</span>
            )}
            {comic.year && (
              <span className="text-[0.65rem] text-muted-foreground">{comic.year}</span>
            )}
         
          </div>
        </div>
      </article>
    </Link>
  )
}

// ─── Series Section ───────────────────────────────────────────────────────────

function SeriesSection({ series, visibleCount }: { series: UserSeriesSummary; visibleCount: number }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const hasMore = series.comics.length > visibleCount
  const visible = series.comics.slice(0, hasMore ? visibleCount : series.comics.length)
  const extraCount = series.comics.length - visible.length

  const progress =
    series.totalCount && series.totalCount > 0
      ? Math.round((series.ownedCount / series.totalCount) * 100)
      : null

  const subtitleParts = [
    series.comicCount > 0 && `${series.comicCount} ${t('library.issues').toLowerCase()}`,
    series.totalCount && `${series.ownedCount}/${series.totalCount} ${t('library.filterOwned').toLowerCase()}`,
  ].filter(Boolean) as string[]

  return (
    <section className="mb-12">
      <div className="flex justify-between items-end pb-3 border-b border-border/15">
        <div>
          <h3 className="text-xl font-bold"><span className="text-primary mr-2">
            {series.collectionName}</span>{series.seriesName}</h3>
          {subtitleParts.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{subtitleParts.join(' · ')}</p>
          )}
        </div>
        {series.collectionSeriesId && (
          <button
            onClick={() => navigate(`/series/${series.collectionSeriesId}`)}
            className="text-xs font-bold text-primary hover:text-primary/70 uppercase tracking-wider transition-colors shrink-0 ml-4"
          >
            {t('seriesDetail.viewAll')} →
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4">
        {visible.map((uc) => (
          <IssueCard key={uc.id} entry={uc} />
        ))}
        {extraCount > 0 && series.collectionSeriesId && (
          <button
            onClick={() => navigate(`/series/${series.collectionSeriesId}`)}
            className=" h-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/25 hover:border-primary/40 text-muted-foreground hover:text-primary transition-colors"
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
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
            />
        </div>
        <p className="text-[0.65rem] text-muted-foreground uppercase font-bold tracking-wider">
          {progress}% {t('collections.seriesProgressComplete')}
        </p>
            </>
          
      )}
    </section>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SeriesPageSkeleton() {
  return (
    <div className="space-y-12">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <div className="pb-3 border-b border-border/15 mb-5 flex justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="rounded-lg overflow-hidden border border-border/10">
                <Skeleton className="w-full aspect-[2/3]" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Library Series Page ──────────────────────────────────────────────────────

export function LibrarySeriesPage() {
  const { t } = useTranslation()

  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('ALL')

  // Dynamic column count via ResizeObserver
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

  useEffect(() => {
    const timer = setTimeout(() => setQ(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: allSeries = [], isLoading } = useQuery({
    queryKey: ['library-series-view', q],
    queryFn: () => libraryApi.getSeriesView({ q: q || undefined }),
  })

  const displaySeries = useMemo(() => {
    let result = allSeries

    if (completionFilter === 'COMPLETE') {
      result = result.filter((s) => s.totalCount && s.totalCount > 0 && s.ownedCount >= s.totalCount)
    } else if (completionFilter === 'INCOMPLETE') {
      result = result.filter((s) => !s.totalCount || s.ownedCount < s.totalCount)
    }

    return [...result].sort((a, b) => {
      const colA = a.collectionName ?? ''
      const colB = b.collectionName ?? ''
      const colCompare = colA.localeCompare(colB)
      if (colCompare !== 0) return colCompare
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      return a.seriesName.localeCompare(b.seriesName)
    })
  }, [allSeries, completionFilter])

  const FILTERS: { label: string; value: CompletionFilter }[] = [
    { label: t('library.filterAll'),        value: 'ALL'        },
    { label: t('library.filterComplete'),   value: 'COMPLETE'   },
    { label: t('library.filterIncomplete'), value: 'INCOMPLETE' },
  ]

  return (
    <PageContainer>
      <header className="mb-8">
        <PageHeader title={t('nav.mySeries')} className="mb-6" />

        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative flex items-center bg-card border border-border/20 rounded-lg overflow-hidden max-w-sm">
            <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('library.searchPlaceholder')}
              className="w-full h-full pl-10 pr-9 py-2.5 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
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

          {/* Completion pills */}
          <div className="flex gap-1 overflow-x-auto">
            {FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setCompletionFilter(value)}
                className={`px-4 py-2 rounded-xl text-[0.7rem] font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                  completionFilter === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div ref={containerRef}>
        {isLoading ? (
          <SeriesPageSkeleton />
        ) : displaySeries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Layers className="size-8 text-muted-foreground" />
            </div>
            <p className="font-medium">{t('library.noSeries')}</p>
          </div>
        ) : (
          displaySeries.map((series) => (
            <SeriesSection
              key={series.collectionSeriesId ?? series.seriesName}
              series={series}
              visibleCount={cols}
            />
          ))
        )}
      </div>
    </PageContainer>
  )
}

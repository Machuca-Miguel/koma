import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, BookOpen, Plus, Check, ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { gcdApi } from '@/api/gcd'
import { libraryApi } from '@/api/library'
import { comicsApi } from '@/api/comics'
import { GcdDetailPanel } from './GcdDetailPanel'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { GcdComic } from '@/types'

interface AdvancedFilters {
  publisher: string
  creator:   string
  year:      string
}

const EMPTY_FILTERS: AdvancedFilters = { publisher: '', creator: '', year: '' }

function hasActiveFilters(f: AdvancedFilters) {
  return Object.values(f).some((v) => v.trim() !== '')
}

function hasAnyInput(query: string, filters: AdvancedFilters) {
  return query.trim() !== '' || hasActiveFilters(filters)
}

export function SearchPage() {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filters, setFilters] = useState<AdvancedFilters>(EMPTY_FILTERS)
  const [submittedFilters, setSubmittedFilters] = useState<AdvancedFilters>(EMPTY_FILTERS)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualData, setManualData] = useState({ title: '', issueNumber: '', publisher: '', year: '', coverUrl: '' })

  const FILTER_META: Record<keyof AdvancedFilters, { label: string; placeholder: string }> = {
    publisher: { label: t('search.filterPublisher'), placeholder: t('search.filterPublisherPlaceholder') },
    creator:   { label: t('search.filterCreator'),   placeholder: t('search.filterCreatorPlaceholder')   },
    year:      { label: t('search.filterYear'),       placeholder: t('search.filterYearPlaceholder')      },
  }

  const hasSubmitted = submittedQuery.trim() !== '' || hasActiveFilters(submittedFilters)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['gcd-search', submittedQuery, page, submittedFilters],
    queryFn: () =>
      gcdApi.search({
        q:         submittedQuery || undefined,
        page,
        publisher: submittedFilters.publisher || undefined,
        creator:   submittedFilters.creator   || undefined,
        year:      submittedFilters.year ? Number(submittedFilters.year) : undefined,
      }),
    enabled: hasSubmitted,
  })

  const importMutation = useMutation({
    mutationFn: async (comic: GcdComic) => {
      const { comic: imported } = await gcdApi.import(comic.externalId)
      try {
        await libraryApi.add({ comicId: imported.id, status: 'OWNED' })
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status !== 409) throw err
      }
      return comic.externalId
    },
    onSuccess: (externalId) => {
      setAdded((prev) => new Set(prev).add(externalId))
      qc.invalidateQueries({ queryKey: ['library'] })
      qc.invalidateQueries({ queryKey: ['library-stats'] })
      toast.success(t('search.addSuccess'))
    },
    onError: () => toast.error(t('search.addError')),
  })

  const manualMutation = useMutation({
    mutationFn: async () => {
      const comic = await comicsApi.create({
        title:       manualData.title.trim(),
        issueNumber: manualData.issueNumber || undefined,
        publisher:   manualData.publisher   || undefined,
        year:        manualData.year ? Number(manualData.year) : undefined,
        coverUrl:    manualData.coverUrl    || undefined,
      })
      try {
        await libraryApi.add({ comicId: comic.id, status: 'OWNED' })
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status !== 409) throw err
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library'] })
      qc.invalidateQueries({ queryKey: ['library-stats'] })
      toast.success(t('search.addSuccess'))
      setShowManualForm(false)
      setManualData({ title: '', issueNumber: '', publisher: '', year: '', coverUrl: '' })
    },
    onError: () => toast.error(t('search.addError')),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasAnyInput(query, filters)) return
    setSubmittedQuery(query.trim())
    setSubmittedFilters(filters)
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setSubmittedFilters(EMPTY_FILTERS)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const results = data?.data ?? []
  const totalPages = data ? Math.ceil(data.total / 20) : 1
  const loading = isLoading || isFetching
  const activeFilters = hasActiveFilters(submittedFilters)

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('search.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('search.subtitle')}</p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.inputPlaceholder')}
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={!hasAnyInput(query, filters) || loading}>
            {t('search.searchButton')}
          </Button>
        </div>

        {/* Advanced filters */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
          <div className="grid gap-4 grid-cols-3">
            {(Object.keys(FILTER_META) as (keyof AdvancedFilters)[]).map((field) => {
              const meta = FILTER_META[field]
              return (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={`f-${field}`} className="text-xs">{meta.label}</Label>
                  <Input
                    id={`f-${field}`}
                    placeholder={meta.placeholder}
                    type={field === 'year' ? 'number' : 'text'}
                    min={field === 'year' ? 1900 : undefined}
                    max={field === 'year' ? new Date().getFullYear() : undefined}
                    value={filters[field]}
                    onChange={(e) => setFilters((f) => ({ ...f, [field]: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              )
            })}
          </div>
          {hasActiveFilters(filters) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-3" />
              {t('search.clearFilters')}
            </button>
          )}
        </div>
      </form>

      {/* States */}
      {!hasSubmitted ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-muted mb-4">
            <Search className="size-8 text-muted-foreground" />
          </div>
          <p className="font-medium">{t('search.emptyState')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('search.emptyStateHint')}</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full aspect-[2/3] rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-muted mb-4">
            <BookOpen className="size-8 text-muted-foreground" />
          </div>
          <p className="font-medium">
            {submittedQuery ? t('search.noResultsFor', { query: submittedQuery }) : t('search.noResults')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {activeFilters ? t('search.noResultsFilterHint') : t('search.noResultsHint')}
          </p>

          <Button
            variant="ghost"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={() => setShowManualForm((v) => !v)}
          >
            <Plus className="size-4" />
            {showManualForm ? t('search.cancelManual') : t('search.addManually')}
          </Button>

          {showManualForm && (
            <form
              onSubmit={(e) => { e.preventDefault(); manualMutation.mutate() }}
              className="w-full max-w-sm mt-4 space-y-2 text-left"
            >
              <Input
                placeholder={t('search.titlePlaceholder')}
                value={manualData.title}
                onChange={(e) => setManualData((d) => ({ ...d, title: e.target.value }))}
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder={t('search.issuePlaceholder')}
                  value={manualData.issueNumber}
                  onChange={(e) => setManualData((d) => ({ ...d, issueNumber: e.target.value }))}
                />
                <Input
                  placeholder={t('search.yearPlaceholder')}
                  type="number"
                  value={manualData.year}
                  onChange={(e) => setManualData((d) => ({ ...d, year: e.target.value }))}
                />
              </div>
              <Input
                placeholder={t('search.publisherPlaceholder')}
                value={manualData.publisher}
                onChange={(e) => setManualData((d) => ({ ...d, publisher: e.target.value }))}
              />
              <Input
                placeholder={t('search.coverUrlPlaceholder')}
                value={manualData.coverUrl}
                onChange={(e) => setManualData((d) => ({ ...d, coverUrl: e.target.value }))}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={!manualData.title.trim() || manualMutation.isPending}
              >
                {manualMutation.isPending ? t('common.adding') : t('search.addToLibrary')}
              </Button>
            </form>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-sm text-muted-foreground">
              {t('search.resultCount', { count: data?.total ?? 0 })}
              {submittedQuery && t('search.resultCountFor', { query: submittedQuery })}
            </p>
            {activeFilters && (
              <Badge variant="secondary" className="text-xs gap-1">
                <SlidersHorizontal className="size-3" />
                {t('search.activeFilters')}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {results.map((comic) => {
              const isAdded = added.has(comic.externalId)
              return (
                <Card
                  key={comic.externalId}
                  className="overflow-hidden group cursor-pointer"
                  onClick={() => setSelectedId(comic.externalId)}
                >
                  <div className="relative w-full aspect-[2/3] bg-muted overflow-hidden">
                    {comic.coverUrl ? (
                      <img
                        src={comic.coverUrl}
                        alt={comic.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="size-10 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  <CardContent className="p-3 space-y-2">
                    <div>
                      <p className="text-sm font-medium leading-tight line-clamp-2">{comic.title}</p>
                      {(comic.issueNumber || comic.publisher || comic.year) && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {[
                            comic.issueNumber && `#${comic.issueNumber}`,
                            comic.publisher,
                            comic.year?.toString(),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant={isAdded ? 'outline' : 'default'}
                      className="w-full gap-1.5 h-7 text-xs"
                      disabled={isAdded || importMutation.isPending}
                      onClick={(e) => { e.stopPropagation(); importMutation.mutate(comic) }}
                    >
                      {isAdded ? (
                        <><Check className="size-3.5" />{t('common.added')}</>
                      ) : (
                        <><Plus className="size-3.5" />{t('common.add')}</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || loading}
                aria-label={t('library.prevPage')}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {t('search.pageOf', { page, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages || loading}
                aria-label={t('library.nextPage')}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <GcdDetailPanel
        externalId={selectedId}
        isAdded={selectedId ? added.has(selectedId) : false}
        onClose={() => setSelectedId(null)}
        onAdded={(id) => {
          setAdded((prev) => new Set(prev).add(id))
          qc.invalidateQueries({ queryKey: ['library'] })
          qc.invalidateQueries({ queryKey: ['library-stats'] })
        }}
      />
    </div>
  )
}

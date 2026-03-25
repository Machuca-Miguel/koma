import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookMarked, BookOpen, Bookmark, Star, Trash2, ChevronLeft, ChevronRight, Check, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { libraryApi } from '@/api/library'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { CollectionStatus } from '@/types'

const STATUS_BADGE: Record<CollectionStatus, string> = {
  OWNED:    'bg-primary/10 text-primary',
  READ:     'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  WISHLIST: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  FAVORITE: 'bg-[#FF8A65]/10 text-[#FF8A65]',
}

const LIMIT = 12

export function LibraryPage() {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [activeFilter, setActiveFilter] = useState<CollectionStatus | 'ALL'>(
    (searchParams.get('status') as CollectionStatus) ?? 'ALL'
  )
  const [page, setPage] = useState(1)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const STATUS_LABELS: Record<CollectionStatus, string> = {
    OWNED:    t('status.OWNED'),
    READ:     t('status.READ'),
    WISHLIST: t('status.WISHLIST'),
    FAVORITE: t('status.FAVORITE'),
  }

  const FILTERS: { label: string; value: CollectionStatus | 'ALL'; Icon?: LucideIcon }[] = [
    { label: t('library.filterAll'),      value: 'ALL'      },
    { label: t('library.filterOwned'),    value: 'OWNED',    Icon: BookMarked },
    { label: t('library.filterRead'),     value: 'READ',     Icon: BookOpen   },
    { label: t('library.filterWishlist'), value: 'WISHLIST', Icon: Bookmark   },
    { label: t('library.filterFavorite'), value: 'FAVORITE', Icon: Star       },
  ]

  const { data, isLoading } = useQuery({
    queryKey: ['library', activeFilter, page],
    queryFn: () =>
      libraryApi.getAll({
        status: activeFilter !== 'ALL' ? activeFilter : undefined,
        page,
        limit: LIMIT,
      }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ comicId, status }: { comicId: string; status: CollectionStatus }) =>
      libraryApi.update(comicId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library'] })
      qc.invalidateQueries({ queryKey: ['library-stats'] })
    },
    onError: () => toast.error(t('library.updateError')),
  })

  const removeMutation = useMutation({
    mutationFn: libraryApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library'] })
      qc.invalidateQueries({ queryKey: ['library-stats'] })
      toast.success(t('library.removeSuccess'))
    },
    onError: () => toast.error(t('library.removeError')),
  })

  const handleFilterChange = (filter: CollectionStatus | 'ALL') => {
    setActiveFilter(filter)
    setPage(1)
  }

  const comics = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('library.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1 h-5">
          {data ? t('library.comicCount', { count: data.total }) : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {FILTERS.map(({ label, value, Icon }) => (
          <button
            key={value}
            onClick={() => handleFilterChange(value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            {Icon && <Icon className="size-3.5" />}
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full aspect-[2/3] rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : comics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-muted mb-4">
            <BookOpen className="size-8 text-muted-foreground" />
          </div>
          {activeFilter !== 'ALL' ? (
            <>
              <p className="font-medium">
                {t('library.emptyFiltered', { status: STATUS_LABELS[activeFilter] })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('library.emptyFilteredHint')}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => handleFilterChange('ALL')}
              >
                {t('library.showAll')}
              </Button>
            </>
          ) : (
            <>
              <p className="font-medium">{t('library.emptyLibrary')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('library.emptyLibraryHint')}
              </p>
              <Link
                to="/search"
                className="inline-flex items-center gap-2 mt-4 h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Search className="size-4" />
                {t('library.searchComics')}
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {comics.map(({ id, status, comic }) => (
            <Card key={id} className="overflow-hidden group">
              {/* Cover */}
              <Link
                to={`/comics/${comic.id}`}
                className="relative block w-full aspect-[2/3] bg-muted overflow-hidden"
              >
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
                <Badge
                  className={`absolute top-2 left-2 text-xs font-medium border-0 ${STATUS_BADGE[status]}`}
                >
                  {STATUS_LABELS[status]}
                </Badge>
              </Link>

              <CardContent className="p-3 space-y-2">
                <div>
                  <p className="text-sm font-medium leading-tight line-clamp-2">{comic.title}</p>
                  {(comic.issueNumber || comic.publisher) && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {[comic.issueNumber && `#${comic.issueNumber}`, comic.publisher]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>

                {/* Tags */}
                {comic.tags && comic.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {comic.tags.map(({ tag }) => (
                      <span
                        key={tag.id}
                        className="text-xs px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <Select
                    value={status}
                    onValueChange={(val) =>
                      updateMutation.mutate({ comicId: comic.id, status: val as CollectionStatus })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABELS) as CollectionStatus[]).map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {confirmDeleteId === comic.id ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-destructive hover:text-destructive"
                      aria-label={t('common.confirm')}
                      onClick={() => {
                        removeMutation.mutate(comic.id)
                        setConfirmDeleteId(null)
                      }}
                    >
                      <Check className="size-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={t('common.delete')}
                      onClick={() => setConfirmDeleteId(comic.id)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
            aria-label={t('library.prevPage')}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {t('library.pageOf', { page, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => p + 1)}
            disabled={page === totalPages}
            aria-label={t('library.nextPage')}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { BookMarked, BookOpen, Bookmark, Star, Library, Search, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { libraryApi } from '@/api/library'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { CollectionStatus } from '@/types'

const STATUS_META: Record<
  CollectionStatus,
  { Icon: LucideIcon; colorClass: string; bgClass: string }
> = {
  OWNED:    { Icon: BookMarked, colorClass: 'text-primary',      bgClass: 'bg-primary/10'     },
  READ:     { Icon: BookOpen,   colorClass: 'text-emerald-500',  bgClass: 'bg-emerald-500/10' },
  WISHLIST: { Icon: Bookmark,   colorClass: 'text-sky-500',      bgClass: 'bg-sky-500/10'     },
  FAVORITE: { Icon: Star,       colorClass: 'text-[#FF8A65]',    bgClass: 'bg-[#FF8A65]/10'   },
}

function getGreetingKey(): string {
  const h = new Date().getHours()
  if (h < 12) return 'dashboard.greetingMorning'
  if (h < 20) return 'dashboard.greetingAfternoon'
  return 'dashboard.greetingEvening'
}

export function DashboardPage() {
  const { user } = useAuth()
  const { t } = useTranslation()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['library-stats'],
    queryFn: libraryApi.getStats,
  })

  const total = Object.values(stats?.byStatus ?? {}).reduce((a, b) => a + b, 0)

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-0.5">{t(getGreetingKey())},</p>
        <h1 className="text-3xl font-bold">{user?.username}</h1>
        {!isLoading && total > 0 && (
          <p className="text-muted-foreground mt-1">
            <Trans
              i18nKey="dashboard.collectionCount"
              count={total}
              components={{
                link: (
                  <Link
                    to="/library"
                    className="font-medium text-foreground hover:underline underline-offset-4"
                  />
                ),
              }}
            />
          </p>
        )}
        {!isLoading && total === 0 && (
          <p className="text-muted-foreground mt-1">
            {t('dashboard.emptyLibrary')}{' '}
            <Link
              to="/search"
              className="font-medium text-foreground hover:underline underline-offset-4"
            >
              {t('dashboard.startSearching')}
            </Link>
          </p>
        )}
      </div>

      {/* Stats grid — each card links to the filtered library */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {(Object.keys(STATUS_META) as CollectionStatus[]).map((status) => {
          const { Icon, colorClass, bgClass } = STATUS_META[status]
          return (
            <Link
              key={status}
              to={`/library?status=${status}`}
              className="group block rounded-xl ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  {isLoading ? (
                    <>
                      <Skeleton className="size-10 rounded-xl mb-3" />
                      <Skeleton className="h-8 w-12 mb-1" />
                      <Skeleton className="h-4 w-20" />
                    </>
                  ) : (
                    <>
                      <div className={`flex items-center justify-center size-10 rounded-xl mb-3 ${bgClass}`}>
                        <Icon className={`size-5 ${colorClass}`} />
                      </div>
                      <p className="text-3xl font-bold tabular-nums">{stats?.byStatus[status] ?? 0}</p>
                      <p className="text-sm text-muted-foreground">{t(`status.${status}`)}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Bottom row: average rating + quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Average rating */}
        <Card>
          <CardContent className="p-5">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-9 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {t('dashboard.averageRating')}
                </p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-bold tabular-nums">
                    {stats?.averageRating != null ? stats.averageRating.toFixed(1) : '—'}
                  </p>
                  <span className="text-sm text-muted-foreground mb-1">
                    {t('dashboard.ratingOf')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('dashboard.rated', { count: stats?.totalRated ?? 0 })}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t('dashboard.quickLinks')}
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" className="w-full justify-between">
                <Link to="/library">
                  <span className="flex items-center gap-2">
                    <Library className="size-4" />
                    {t('dashboard.goToLibrary')}
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link to="/search">
                  <span className="flex items-center gap-2">
                    <Search className="size-4" />
                    {t('dashboard.searchComics')}
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

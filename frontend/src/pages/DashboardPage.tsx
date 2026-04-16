import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BookMarked,
  Layers,
  CheckCircle,
  Heart,
  ArrowRight,
  PlusCircle,
} from 'lucide-react'
import { libraryApi } from '@/api/library'
import { Skeleton } from '@/components/ui/skeleton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionHeader } from '@/components/layout/SectionHeader'
import type { UserComic } from '@/types'

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="bg-card p-5 rounded-xl border border-border/20 flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
        <span className="text-primary">{icon}</span>
        <span className="text-[0.6rem] font-black uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-3xl font-black tracking-tighter">{value}</div>
    </div>
  )
}

// ─── Recently Added Item ──────────────────────────────────────────────────────

function RecentItem({ uc }: { uc: UserComic }) {
  const date = new Date(uc.addedAt).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Link
      to={`/comics/${uc.comic.id}`}
      className="flex items-center gap-5 p-4 bg-muted/20 rounded-xl hover:bg-muted/40 transition-colors group"
    >
      <div className="w-11 h-16 bg-muted rounded-lg overflow-hidden shrink-0">
        {uc.comic.coverUrl ? (
          <img
            src={uc.comic.coverUrl}
            alt={uc.comic.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookMarked className="size-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
          {uc.comic.title}
          {uc.comic.issueNumber ? ` #${uc.comic.issueNumber}` : ''}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {uc.comic.collectionSeries?.name ?? uc.comic.publisher ?? ''}
          {uc.comic.year ? ` (${uc.comic.year})` : ''}
        </div>
      </div>
      <div className="text-xs text-muted-foreground font-mono uppercase shrink-0">
        {date}
      </div>
    </Link>
  )
}

// ─── Wishlist Card ────────────────────────────────────────────────────────────

function WishlistCard({ uc }: { uc: UserComic }) {
  return (
    <Link
      to={`/comics/${uc.comic.id}`}
      className="bg-background rounded-xl overflow-hidden group border border-border/20 hover:border-border/50 transition-colors"
    >
      <div className="aspect-[2/3] overflow-hidden relative bg-muted">
        {uc.comic.coverUrl ? (
          <img
            src={uc.comic.coverUrl}
            alt={uc.comic.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookMarked className="size-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2.5 right-2.5">
          <div className="bg-background/80 backdrop-blur-md p-1.5 rounded-full text-rose-500">
            <Heart className="size-3.5 fill-current" />
          </div>
        </div>
      </div>
      <div className="p-3 bg-card">
        <div className="text-[0.6rem] text-muted-foreground font-black uppercase tracking-widest mb-0.5">
          {uc.comic.year ?? 'Wishlist'}
        </div>
        <div className="text-sm font-bold truncate">{uc.comic.title}</div>
        {uc.comic.collectionSeries?.name && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {uc.comic.collectionSeries.name}
          </div>
        )}
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['library-stats'],
    queryFn: libraryApi.getStats,
  })

  const { data: recentlyAdded, isLoading: recentLoading } = useQuery({
    queryKey: ['library-recently-added'],
    queryFn: () => libraryApi.getAll({ sortBy: 'added_desc', limit: 5 }),
  })

  const { data: wishlist, isLoading: wishlistLoading } = useQuery({
    queryKey: ['library-wishlist-preview'],
    queryFn: () => libraryApi.getAll({ status: 'WISHLIST', limit: 4 }),
  })

  // Reading progress circle
  const total = stats?.total ?? 0
  const read = stats?.byStatus.READ ?? 0
  const readPercent = total > 0 ? Math.round((read / total) * 100) : 0
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (readPercent / 100) * circumference

  const hasWishlist = (wishlist?.data.length ?? 0) > 0

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Your digital archival vault overview."
        action={
          <Link
            to="/search"
            className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg text-sm font-bold tracking-tight hover:bg-muted/70 transition-colors border border-border/20"
          >
            <PlusCircle className="size-4" />
            ADD COMIC
          </Link>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-10">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-card p-5 rounded-lg border border-border/20 h-32"
            >
              <Skeleton className="h-full w-full" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              icon={<BookMarked className="size-5" />}
              label="Total Volume"
              value={`${stats?.total ?? 0} Comics`}
            />
            <StatCard
              icon={<Layers className="size-5" />}
              label="Active Series"
              value={`${stats?.seriesCount ?? 0} Series`}
            />
            <StatCard
              icon={<CheckCircle className="size-5" />}
              label="Completed"
              value={`${stats?.byStatus.READ ?? 0} Read`}
            />
            <StatCard
              icon={<Heart className="size-5" />}
              label="Wishlist"
              value={`${stats?.byStatus.WISHLIST ?? 0} Items`}
            />
          </>
        )}
      </div>

      {/* Middle: Recently Added + Reading Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 mb-10">
        {/* Recently Added */}
        <div className="lg:col-span-2">
          <SectionHeader
            title="Recently added"
            viewAllHref="/library?sortBy=added_desc"
          />
          <div className="space-y-3">
            {recentLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-4 bg-muted/20 rounded-xl"
                  >
                    <Skeleton className="w-11 h-16 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              : recentlyAdded?.data.map((uc) => (
                  <RecentItem key={uc.id} uc={uc} />
                ))}
            {!recentLoading && !recentlyAdded?.data.length && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No comics yet.{' '}
                <Link to="/search" className="text-primary hover:underline">
                  Search and add some!
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Reading Progress */}
        <div className="lg:col-span-1">
          <div className="bg-card h-full rounded-xl p-7 border border-border/20 flex flex-col">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight mb-1">
                Reading progress
              </h2>
              <p className="text-muted-foreground text-sm">
                Active curation status across your collection.
              </p>
            </div>
            <div className="flex-1 flex flex-col justify-center text-center">
              {/* Circular SVG progress */}
              <div className="relative w-44 h-44 mx-auto mb-7">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 176 176">
                  <circle
                    className="text-muted"
                    cx="88"
                    cy="88"
                    fill="transparent"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="7"
                  />
                  <circle
                    className="text-primary"
                    cx="88"
                    cy="88"
                    fill="transparent"
                    r={radius}
                    stroke="currentColor"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeWidth="10"
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {statsLoading ? (
                    <Skeleton className="h-10 w-16" />
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold tracking-tighter">
                        {readPercent}%
                      </span>
                      <span className="text-[0.6rem] font-bold tracking-widest uppercase text-muted-foreground mt-0.5">
                        Completion
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Mini stats */}
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center bg-background p-3 rounded-lg border border-border/10">
                  <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">
                    Owned
                  </span>
                  <span className="text-sm font-bold">
                    {stats?.byStatus.OWNED ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-background p-3 rounded-lg border border-border/10">
                  <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">
                    Read
                  </span>
                  <span className="text-sm font-bold">
                    {stats?.byStatus.READ ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <Link
              to="/library"
              className="mt-7 w-full bg-primary/15 text-primary font-bold py-3 rounded-lg text-sm tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-primary/25 transition-colors"
            >
              <ArrowRight className="size-4" />
              Go to Library
            </Link>
          </div>
        </div>
      </div>

      {/* Wishlist Grid */}
      {(wishlistLoading || hasWishlist) && (
        <section>
          <SectionHeader
            title="Wishlist"
            viewAllHref="/library?status=WISHLIST"
            extra={
              !statsLoading ? (
                <span className="bg-secondary/20 text-secondary-foreground text-[0.6rem] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                  {stats?.byStatus.WISHLIST ?? 0} items
                </span>
              ) : undefined
            }
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {wishlistLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-card rounded-xl overflow-hidden border border-border/20"
                  >
                    <div className="aspect-[2/3] bg-muted animate-pulse" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))
              : wishlist?.data.map((uc) => (
                  <WishlistCard key={uc.id} uc={uc} />
                ))}
          </div>
        </section>
      )}
    </PageContainer>
  )
}

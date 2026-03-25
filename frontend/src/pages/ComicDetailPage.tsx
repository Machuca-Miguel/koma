import { useState, useRef, Fragment, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, BookOpen, Building2, Calendar, Star, Users, FileText,
  Layers, Globe, ExternalLink, Hash,
} from 'lucide-react'
import { toast } from 'sonner'
import { comicsApi } from '@/api/comics'
import { gcdApi } from '@/api/gcd'
import { libraryApi } from '@/api/library'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { CollectionStatus } from '@/types'

export function ComicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [notes, setNotes] = useState<string | undefined>(undefined)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: comic, isLoading } = useQuery({
    queryKey: ['comic', id],
    queryFn: () => comicsApi.getOne(id!),
    enabled: !!id,
  })

  const { data: gcdDetail } = useQuery({
    queryKey: ['gcd-detail', comic?.externalId],
    queryFn: () => gcdApi.getDetail(comic!.externalId!),
    enabled: !!comic?.externalId && comic?.externalApi === 'gcd',
    staleTime: 5 * 60 * 1000,
  })

  const { data: userComic } = useQuery({
    queryKey: ['user-comic', id],
    queryFn: () => libraryApi.getByComicId(id!),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (data: { status?: CollectionStatus; rating?: number; notes?: string }) =>
      libraryApi.update(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-comic', id] })
      qc.invalidateQueries({ queryKey: ['library'] })
    },
    onError: () => toast.error(t('comicDetail.updateError')),
  })

  const addMutation = useMutation({
    mutationFn: () => libraryApi.add({ comicId: id!, status: 'OWNED' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-comic', id] })
      qc.invalidateQueries({ queryKey: ['library'] })
      toast.success(t('comicDetail.addedSuccess'))
    },
    onError: () => toast.error(t('comicDetail.updateError')),
  })

  const handleNotesChange = (value: string) => {
    setNotes(value)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => updateMutation.mutate({ notes: value }), 500)
  }

  const present = t('comicDetail.present')

  return (
    <div className="p-8 max-w-4xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="size-4" />
        {t('comicDetail.back')}
      </button>

      {isLoading ? (
        <DetailSkeleton />
      ) : !comic ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BookOpen className="size-12 text-muted-foreground/40 mb-4" />
          <p className="font-medium">{t('comicDetail.notFound')}</p>
        </div>
      ) : (
        <div>
          {/* ── 1. HERO ─────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-8 pb-6">
            <div className="shrink-0 w-full sm:w-48">
              <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-muted">
                {comic.coverUrl ? (
                  <img
                    src={comic.coverUrl}
                    alt={comic.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="size-14 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-tight">
                {comic.title}
                {comic.issueNumber && (
                  <span className="text-muted-foreground font-normal ml-2">
                    #{comic.issueNumber}
                  </span>
                )}
              </h1>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-sm text-muted-foreground">
                {comic.publisher && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="size-3.5" />
                    {comic.publisher}
                  </span>
                )}
                {comic.year && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    {comic.year}
                  </span>
                )}
                {gcdDetail?.pageCount && (
                  <span className="flex items-center gap-1.5">
                    <FileText className="size-3.5" />
                    {t('comicDetail.pages', { count: gcdDetail.pageCount })}
                  </span>
                )}
                {gcdDetail?.price && (
                  <span>{gcdDetail.price}</span>
                )}
              </div>

              {comic.tags && comic.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {comic.tags.map(({ tag }) => (
                    <Badge key={tag.id} variant="secondary" className="text-xs">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 2. USER STATUS ──────────────────────────────────────────── */}
          <Separator />
          <div className="py-5">
            {userComic ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-6 items-start">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('comicDetail.statusLabel')}
                    </p>
                    <Select
                      value={userComic.status}
                      onValueChange={(v) =>
                        updateMutation.mutate({ status: v as CollectionStatus })
                      }
                    >
                      <SelectTrigger className="w-36 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWNED">{t('comicDetail.status.OWNED')}</SelectItem>
                        <SelectItem value="READ">{t('comicDetail.status.READ')}</SelectItem>
                        <SelectItem value="WISHLIST">{t('comicDetail.status.WISHLIST')}</SelectItem>
                        <SelectItem value="FAVORITE">{t('comicDetail.status.FAVORITE')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('comicDetail.ratingLabel')}
                    </p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => updateMutation.mutate({ rating: star })}
                          className="text-amber-400 hover:scale-110 transition-transform p-0.5"
                          aria-label={t('comicDetail.ratingAriaLabel', { count: star })}
                        >
                          <Star
                            className="size-5"
                            fill={
                              userComic.rating && userComic.rating >= star
                                ? 'currentColor'
                                : 'none'
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('comicDetail.notesLabel')}
                  </p>
                  <textarea
                    value={notes ?? userComic?.notes ?? ''}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder={t('comicDetail.notesPlaceholder')}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
              </div>
            ) : userComic === null ? (
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  {t('comicDetail.notInLibrary')}
                </p>
                <Button
                  size="sm"
                  disabled={addMutation.isPending}
                  onClick={() => addMutation.mutate()}
                >
                  {addMutation.isPending ? t('comicDetail.adding') : t('comicDetail.addToLibrary')}
                </Button>
              </div>
            ) : null}
          </div>

          {/* ── 3. SYNOPSIS ─────────────────────────────────────────────── */}
          {comic.synopsis && (
            <>
              <Separator />
              <div className="py-5">
                <SectionTitle>{t('comicDetail.synopsis')}</SectionTitle>
                <p className="text-sm leading-relaxed mt-2">{comic.synopsis}</p>
              </div>
            </>
          )}

          {/* ── 4. CREATORS ─────────────────────────────────────────────── */}
          {gcdDetail && gcdDetail.creators.length > 0 && (
            <>
              <Separator />
              <div className="py-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="size-4 text-muted-foreground" />
                  <SectionTitle>{t('comicDetail.creators')}</SectionTitle>
                </div>
                <div className="space-y-1.5">
                  {gcdDetail.creators.map(({ role, names }) => (
                    <div key={role} className="grid grid-cols-[7rem_1fr] gap-2 text-sm">
                      <span className="text-muted-foreground">{role}</span>
                      <span className="font-medium">{names.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── 5. STORIES ──────────────────────────────────────────────── */}
          {gcdDetail && gcdDetail.stories.length > 0 && (
            <>
              <Separator />
              <div className="py-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="size-4 text-muted-foreground" />
                  <SectionTitle>{t('comicDetail.stories')}</SectionTitle>
                </div>
                <div className="space-y-5">
                  {gcdDetail.stories.map((story, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">
                          {story.title ?? (
                            <span className="italic text-muted-foreground">{t('comicDetail.noTitle')}</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {story.type && (
                            <Badge variant="secondary" className="text-[10px]">
                              {story.type}
                            </Badge>
                          )}
                          {story.pageCount && (
                            <span className="text-xs text-muted-foreground">
                              {story.pageCount}p
                            </span>
                          )}
                        </div>
                      </div>
                      {story.feature && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">{t('comicDetail.character')}: </span>
                          {story.feature}
                        </p>
                      )}
                      {story.genre && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">{t('comicDetail.genre')}: </span>
                          {story.genre}
                        </p>
                      )}
                      {story.characters && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          <span className="font-medium">{t('comicDetail.characters')}: </span>
                          {story.characters}
                        </p>
                      )}
                      {story.synopsis && (
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {story.synopsis}
                        </p>
                      )}
                      {story.firstLine && (
                        <p className="text-xs text-muted-foreground italic">
                          "{story.firstLine}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── 6. SERIES ───────────────────────────────────────────────── */}
          {gcdDetail?.seriesInfo && (
            <>
              <Separator />
              <div className="py-5">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="size-4 text-muted-foreground" />
                  <SectionTitle>{t('comicDetail.series')}</SectionTitle>
                </div>
                <p className="text-sm font-semibold mb-2">{gcdDetail.seriesInfo.name}</p>
                <DataGrid
                  items={[
                    { label: t('comicDetail.format'), value: gcdDetail.seriesInfo.format },
                    {
                      label: t('comicDetail.years'),
                      value: formatYears(gcdDetail.seriesInfo.yearBegan, gcdDetail.seriesInfo.yearEnded, present),
                    },
                    {
                      label: t('comicDetail.totalIssues'),
                      value: gcdDetail.seriesInfo.issueCount?.toString(),
                    },
                    { label: t('comicDetail.publicationDates'), value: gcdDetail.seriesInfo.publicationDates },
                    { label: t('comicDetail.color'), value: gcdDetail.seriesInfo.color },
                    { label: t('comicDetail.dimensions'), value: gcdDetail.seriesInfo.dimensions },
                    { label: t('comicDetail.paper'), value: gcdDetail.seriesInfo.paperStock },
                    { label: t('comicDetail.binding'), value: gcdDetail.seriesInfo.binding },
                    { label: t('comicDetail.publishingFormat'), value: gcdDetail.seriesInfo.publishingFormat },
                  ]}
                />
              </div>
            </>
          )}

          {/* ── 7. PUBLISHER ────────────────────────────────────────────── */}
          {gcdDetail?.publisherInfo && (
            <>
              <Separator />
              <div className="py-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="size-4 text-muted-foreground" />
                  <SectionTitle>{t('comicDetail.publisher')}</SectionTitle>
                </div>
                <p className="text-sm font-semibold mb-2">{gcdDetail.publisherInfo.name}</p>
                <DataGrid
                  items={[
                    {
                      label: t('comicDetail.yearsActive'),
                      value: formatYears(gcdDetail.publisherInfo.yearBegan, gcdDetail.publisherInfo.yearEnded, present),
                    },
                    { label: t('comicDetail.web'), value: gcdDetail.publisherInfo.url, link: true },
                  ]}
                />
              </div>
            </>
          )}

          {/* ── 8. PUBLICATION ──────────────────────────────────────────── */}
          {gcdDetail &&
            (gcdDetail.price ||
              gcdDetail.onSaleDate ||
              gcdDetail.barcode ||
              gcdDetail.isbn) && (
              <>
                <Separator />
                <div className="py-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Hash className="size-4 text-muted-foreground" />
                    <SectionTitle>{t('comicDetail.publication')}</SectionTitle>
                  </div>
                  <DataGrid
                    items={[
                      { label: t('comicDetail.price'), value: gcdDetail.price },
                      { label: t('comicDetail.saleDate'), value: gcdDetail.onSaleDate },
                      { label: t('comicDetail.barcode'), value: gcdDetail.barcode },
                      { label: t('comicDetail.isbn'), value: gcdDetail.isbn },
                    ]}
                  />
                </div>
              </>
            )}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  )
}

interface DataItem {
  label: string
  value?: string | null
  link?: boolean
}

function DataGrid({ items }: { items: DataItem[] }) {
  const filtered = items.filter((i) => i.value)
  if (!filtered.length) return null
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-1.5">
      {filtered.map(({ label, value, link }) => (
        <Fragment key={label}>
          <span className="text-xs text-muted-foreground">{label}</span>
          {link ? (
            <a
              href={value!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center gap-1 text-primary hover:underline"
            >
              {value}
              <ExternalLink className="size-3" />
            </a>
          ) : (
            <span className="text-xs font-medium">{value}</span>
          )}
        </Fragment>
      ))}
    </div>
  )
}

function formatYears(began?: number, ended?: number, present?: string): string | undefined {
  if (!began) return undefined
  return ended ? `${began} – ${ended}` : `${began} – ${present ?? ''}`
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-8">
        <Skeleton className="w-full sm:w-48 aspect-[2/3] rounded-xl shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-36" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  )
}

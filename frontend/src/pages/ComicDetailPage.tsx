import { useState, useRef, Fragment, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, BookOpen, Building2, Calendar, Star, Users, FileText,
  Layers, Globe, ExternalLink, Hash, Pencil, X, Tag, Copy, ShoppingCart, Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { comicsApi } from '@/api/comics'
import { gcdApi } from '@/api/gcd'
import { libraryApi } from '@/api/library'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PageContainer } from '@/components/layout/PageContainer'
import type { BindingFormat } from '@/types'

// ─── Tag Input ────────────────────────────────────────────────────────────────

function TagInput({ comicId, tags }: {
  comicId: string
  tags: { id: string; name: string; slug: string }[]
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => comicsApi.getTags(),
    staleTime: 60_000,
  })

  const suggestions = allTags.filter(
    (s) => s.name.toLowerCase().includes(input.toLowerCase()) &&
           !tags.find((tag) => tag.id === s.id) &&
           input.length > 0
  )

  const addMutation = useMutation({
    mutationFn: (name: string) => comicsApi.addTag(comicId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comic', comicId] })
      qc.invalidateQueries({ queryKey: ['tags'] })
      setInput('')
      setShowSuggestions(false)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (tagId: string) => comicsApi.removeTag(comicId, tagId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comic', comicId] }),
  })

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 items-center">
        {tags.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="text-xs gap-1 pr-1">
            {tag.name}
            <button
              onClick={() => removeMutation.mutate(tag.id)}
              className="hover:text-destructive rounded-sm transition-colors"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <div className="relative">
          <Input
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim()) {
                e.preventDefault()
                addMutation.mutate(input.trim())
              }
              if (e.key === 'Escape') { setInput(''); setShowSuggestions(false) }
            }}
            onFocus={() => input.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={t('comicDetail.addTag')}
            className="h-7 text-xs px-2 w-40 border-dashed"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 z-20 mt-1 w-48 bg-popover border rounded-md shadow-md overflow-hidden">
              {suggestions.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  onMouseDown={() => addMutation.mutate(s.name)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

const BINDING_OPTIONS: BindingFormat[] = ['CARTONE', 'TAPA_BLANDA', 'BOLSILLO', 'OMNIBUS', 'HARDCOVER']

function EditSheet({ comicId, initial, open, onClose }: {
  comicId: string
  initial: {
    title: string; publisher?: string; year?: number; synopsis?: string
    coverUrl?: string; isbn?: string; binding?: BindingFormat; drawingStyle?: string; series?: string
    authors?: string; externalApi?: string
  }
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...initial })

  const editMutation = useMutation({
    mutationFn: () => comicsApi.update(comicId, {
      title: form.title || undefined,
      publisher: form.publisher || undefined,
      year: form.year || undefined,
      synopsis: form.synopsis || undefined,
      coverUrl: form.coverUrl || undefined,
      isbn: form.isbn || undefined,
      binding: form.binding || null,
      drawingStyle: form.drawingStyle || undefined,
      series: form.series || undefined,
      authors: form.authors || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comic', comicId] })
      qc.invalidateQueries({ queryKey: ['library'] })
      toast.success(t('comicDetail.editSaved'))
      onClose()
    },
    onError: () => toast.error(t('comicDetail.updateError')),
  })

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:w-[600px] overflow-y-auto flex flex-col p-0 gap-0">
        <SheetHeader className="sheet-header">
          <SheetTitle className="text-lg">{t('comicDetail.editComic')}</SheetTitle>
        </SheetHeader>
        <div className="sheet-body">
          <div className="space-y-2">
            <label className="text-sm font-medium">Título *</label>
            <Input value={form.title} onChange={set('title')} className="h-10" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('comicDetail.publisher')}</label>
              <Input value={form.publisher ?? ''} onChange={set('publisher')} className="h-10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('comicDetail.years')}</label>
              <Input
                type="number"
                value={form.year ?? ''}
                min={1900}
                max={2099}
                className="h-10"
                onChange={(e) => setForm((p) => ({ ...p, year: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('comicDetail.series')}</label>
            <Input value={form.series ?? ''} onChange={set('series')} className="h-10" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('comicDetail.coverUrlField')}</label>
            <Input value={form.coverUrl ?? ''} onChange={set('coverUrl')} placeholder="https://..." className="h-10" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-medium">{t('comicDetail.isbn')}</label>
                {initial.externalApi && (
                  <span title={t('comicDetail.isbnLocked')} className="text-muted-foreground/50">
                    <Lock className="size-3.5" />
                  </span>
                )}
              </div>
              <Input
                value={form.isbn ?? ''}
                onChange={set('isbn')}
                readOnly={!!initial.externalApi}
                className={`h-10 ${initial.externalApi ? 'bg-muted cursor-not-allowed opacity-60 font-mono text-xs' : ''}`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('comicDetail.binding')}</label>
              <Select
                value={form.binding ?? '__none__'}
                onValueChange={(v) => setForm((p) => ({ ...p, binding: v === '__none__' ? undefined : v as BindingFormat }))}
              >
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {BINDING_OPTIONS.map((b) => (
                    <SelectItem key={b} value={b}>{t(`binding.${b}` as `binding.${BindingFormat}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('comicDetail.authors')}</label>
              <Input value={form.authors ?? ''} onChange={set('authors')} placeholder="Frank Miller, Alan Moore..." className="h-10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('comicDetail.drawingStyle')}</label>
              <Input value={form.drawingStyle ?? ''} onChange={set('drawingStyle')} placeholder="Línea clara, realista..." className="h-10" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('comicDetail.synopsis')}</label>
            <Textarea
              value={form.synopsis ?? ''}
              onChange={set('synopsis')}
              rows={4}
            />
          </div>
        </div>
        <div className="sheet-footer">
          <Button variant="outline" size="xl" onClick={onClose} className="flex-1">{t('common.cancel')}</Button>
          <Button size="xl" onClick={() => editMutation.mutate()} disabled={editMutation.isPending || !form.title.trim()} className="flex-1">
            {editMutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Comic Detail Page ────────────────────────────────────────────────────────

export function ComicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [notes, setNotes] = useState<string | undefined>(undefined)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

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

  const [loanedToInput, setLoanedToInput] = useState<string | undefined>(undefined)

  const updateMutation = useMutation({
    mutationFn: (data: {
      isOwned?: boolean; isRead?: boolean; isWishlist?: boolean; isFavorite?: boolean;
      isLoaned?: boolean; loanedTo?: string; rating?: number; notes?: string
    }) => libraryApi.update(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-comic', id] })
      qc.invalidateQueries({ queryKey: ['library'] })
    },
    onError: () => toast.error(t('comicDetail.updateError')),
  })

  const addMutation = useMutation({
    mutationFn: () => libraryApi.add({ comicId: id!, isOwned: true }),
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

  const handleCopyIsbn = (isbn: string) => {
    navigator.clipboard.writeText(isbn).then(() => toast.success(t('comicDetail.isbnCopied')))
  }

  const present = t('comicDetail.present')
  const isbn = comic?.isbn ?? gcdDetail?.isbn

  return (
    <PageContainer size="narrow">
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
              <div
                className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-muted group/cover cursor-pointer"
                onClick={() => setIsEditOpen(true)}
                title={t(comic.coverUrl ? 'comicDetail.changeCover' : 'comicDetail.addCover')}
              >
                {comic.coverUrl ? (
                  <img src={comic.coverUrl} alt={comic.title} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="size-14 text-muted-foreground/30" />
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex flex-col items-center gap-1.5 text-white">
                    <Pencil className="size-5" />
                    <span className="text-xs font-medium">
                      {t(comic.coverUrl ? 'comicDetail.changeCover' : 'comicDetail.addCover')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-2xl font-bold leading-tight">
                  {comic.title}
                  {comic.issueNumber && (
                    <span className="text-muted-foreground font-normal ml-2">#{comic.issueNumber}</span>
                  )}
                </h1>
                <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" onClick={() => setIsEditOpen(true)}>
                  <Pencil className="size-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-sm text-muted-foreground">
                {comic.publisher && (
                  <span className="flex items-center gap-1.5"><Building2 className="size-3.5" />{comic.publisher}</span>
                )}
                {comic.year && (
                  <span className="flex items-center gap-1.5"><Calendar className="size-3.5" />{comic.year}</span>
                )}
                {comic.authors && (
                  <span className="flex items-center gap-1.5"><Users className="size-3.5" />{comic.authors}</span>
                )}
                {gcdDetail?.pageCount && (
                  <span className="flex items-center gap-1.5">
                    <FileText className="size-3.5" />{t('comicDetail.pages', { count: gcdDetail.pageCount })}
                  </span>
                )}
                {gcdDetail?.price && <span>{gcdDetail.price}</span>}
              </div>

              {/* Tags */}
              <div className="mt-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Tag className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t('comicDetail.tagsLabel')}</span>
                </div>
                <TagInput comicId={comic.id} tags={comic.tags?.map(({ tag }) => tag) ?? []} />
              </div>

              {/* Incomplete data warning */}
              {(!comic.synopsis || !comic.coverUrl) && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  <span>⚠</span>
                  <span>
                    {[!comic.coverUrl && t('comicDetail.coverUrlField'), !comic.synopsis && t('comicDetail.synopsis')]
                      .filter(Boolean).join(', ')}{' '}
                    · <button onClick={() => setIsEditOpen(true)} className="underline hover:no-underline">{t('comicDetail.editComic')}</button>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── 2. USER STATUS ──────────────────────────────────────────── */}
          <Separator />
          <div className="py-5">
            {userComic ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('comicDetail.statusLabel')}</p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: 'isOwned',    label: t('comicDetail.status.OWNED'),    activeClass: 'bg-primary text-primary-foreground'    },
                        { key: 'isRead',     label: t('comicDetail.status.READ'),     activeClass: 'bg-emerald-500 text-white'             },
                        { key: 'isWishlist', label: t('comicDetail.status.WISHLIST'), activeClass: 'bg-sky-500 text-white'                 },
                        { key: 'isFavorite', label: t('comicDetail.status.FAVORITE'), activeClass: 'bg-[#FF8A65] text-white'               },
                      ] as { key: 'isOwned' | 'isRead' | 'isWishlist' | 'isFavorite'; label: string; activeClass: string }[]
                    ).map(({ key, label, activeClass }) => {
                      const isActive = !!userComic[key]
                      return (
                        <button
                          key={key}
                          onClick={() => updateMutation.mutate({ [key]: !isActive })}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                            isActive ? `${activeClass} border-transparent` : 'bg-background text-muted-foreground border-border hover:text-foreground'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const next = !userComic.isLoaned
                        if (!next) setLoanedToInput('')
                        updateMutation.mutate({ isLoaned: next, loanedTo: next ? (loanedToInput ?? userComic.loanedTo ?? '') : '' })
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                        userComic.isLoaned ? 'bg-violet-500 text-white border-transparent' : 'bg-background text-muted-foreground border-border hover:text-foreground'
                      }`}
                    >
                      {t('comicDetail.status.LOANED')}
                    </button>
                    {userComic.isLoaned && (
                      <Input
                        className="h-8 text-sm max-w-48"
                        placeholder={t('comicDetail.loanedToPlaceholder')}
                        defaultValue={userComic.loanedTo ?? ''}
                        onChange={(e) => setLoanedToInput(e.target.value)}
                        onBlur={(e) => updateMutation.mutate({ loanedTo: e.target.value })}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('comicDetail.ratingLabel')}</p>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => updateMutation.mutate({ rating: star })}
                        className="text-amber-400 hover:scale-110 transition-transform p-0.5"
                        aria-label={t('comicDetail.ratingAriaLabel', { count: star })}>
                        <Star className="size-5" fill={userComic.rating && userComic.rating >= star ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('comicDetail.notesLabel')}</p>
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
                <p className="text-sm text-muted-foreground">{t('comicDetail.notInLibrary')}</p>
                <Button size="sm" disabled={addMutation.isPending} onClick={() => addMutation.mutate()}>
                  {addMutation.isPending ? t('comicDetail.adding') : t('comicDetail.addToLibrary')}
                </Button>
              </div>
            ) : null}
          </div>

          {/* ── 3. WHERE TO BUY (wishlist + isbn) ───────────────────────── */}
          {userComic?.isWishlist && isbn && (
            <>
              <Separator />
              <div className="py-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart className="size-4 text-muted-foreground" />
                  <SectionTitle>{t('comicDetail.whereToBuy')}</SectionTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                    <span className="text-xs text-muted-foreground">ISBN:</span>
                    <span className="text-sm font-mono font-medium">{isbn}</span>
                    <button onClick={() => handleCopyIsbn(isbn)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                  <a href={`https://www.amazon.es/s?k=${isbn}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                    Amazon <ExternalLink className="size-3" />
                  </a>
                  <a href={`https://www.fnac.es/SearchResult/ResultList.aspx?Search=${isbn}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                    FNAC <ExternalLink className="size-3" />
                  </a>
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(`${comic.title} ${isbn} comprar`)}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                    {t('comicDetail.searchStore')} <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            </>
          )}

          {/* ── 4. SYNOPSIS ─────────────────────────────────────────────── */}
          {comic.synopsis && (
            <>
              <Separator />
              <div className="py-5">
                <SectionTitle>{t('comicDetail.synopsis')}</SectionTitle>
                <p dangerouslySetInnerHTML={{ __html: comic.synopsis }} className="text-sm leading-relaxed mt-2" />
              </div>
            </>
          )}

          {/* ── 5. AUTHORS ──────────────────────────────────────────────── */}
          {comic.authors && (
            <>
              <Separator />
              <div className="py-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="size-4 text-muted-foreground" />
                  <SectionTitle>{t('comicDetail.authors')}</SectionTitle>
                </div>
                <p className="text-sm font-medium">{comic.authors}</p>
              </div>
            </>
          )}

          {/* ── 6. CREATORS (GCD roles breakdown) ───────────────────────── */}
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

          {/* ── 6. STORIES ──────────────────────────────────────────────── */}
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
                          {story.title ?? <span className="italic text-muted-foreground">{t('comicDetail.noTitle')}</span>}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {story.type && <Badge variant="secondary" className="text-[10px]">{story.type}</Badge>}
                          {story.pageCount && <span className="text-xs text-muted-foreground">{story.pageCount}p</span>}
                        </div>
                      </div>
                      {story.feature && <p className="text-xs text-muted-foreground"><span className="font-medium">{t('comicDetail.character')}: </span>{story.feature}</p>}
                      {story.genre && <p className="text-xs text-muted-foreground"><span className="font-medium">{t('comicDetail.genre')}: </span>{story.genre}</p>}
                      {story.characters && <p className="text-xs text-muted-foreground line-clamp-2"><span className="font-medium">{t('comicDetail.characters')}: </span>{story.characters}</p>}
                      {story.synopsis && <p dangerouslySetInnerHTML={{ __html: story.synopsis }} className="text-xs text-muted-foreground line-clamp-3" />}
                      {story.firstLine && <p className="text-xs text-muted-foreground italic">"{story.firstLine}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── 7. SERIES ───────────────────────────────────────────────── */}
          {gcdDetail?.seriesInfo && (
            <>
              <Separator />
              <div className="py-5">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="size-4 text-muted-foreground" />
                  <SectionTitle>{t('comicDetail.series')}</SectionTitle>
                </div>
                <p className="text-sm font-semibold mb-2">{gcdDetail.seriesInfo.name}</p>
                <DataGrid items={[
                  { label: t('comicDetail.format'), value: gcdDetail.seriesInfo.format },
                  { label: t('comicDetail.years'), value: formatYears(gcdDetail.seriesInfo.yearBegan, gcdDetail.seriesInfo.yearEnded, present) },
                  { label: t('comicDetail.totalIssues'), value: gcdDetail.seriesInfo.issueCount?.toString() },
                  { label: t('comicDetail.publicationDates'), value: gcdDetail.seriesInfo.publicationDates },
                  { label: t('comicDetail.color'), value: gcdDetail.seriesInfo.color },
                  { label: t('comicDetail.dimensions'), value: gcdDetail.seriesInfo.dimensions },
                  { label: t('comicDetail.paper'), value: gcdDetail.seriesInfo.paperStock },
                  { label: t('comicDetail.binding'), value: gcdDetail.seriesInfo.binding },
                  { label: t('comicDetail.publishingFormat'), value: gcdDetail.seriesInfo.publishingFormat },
                ]} />
              </div>
            </>
          )}

          {/* ── 8. PUBLISHER ────────────────────────────────────────────── */}
          {gcdDetail?.publisherInfo && (
            <>
              <Separator />
              <div className="py-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="size-4 text-muted-foreground" />
                  <SectionTitle>{t('comicDetail.publisher')}</SectionTitle>
                </div>
                <p className="text-sm font-semibold mb-2">{gcdDetail.publisherInfo.name}</p>
                <DataGrid items={[
                  { label: t('comicDetail.yearsActive'), value: formatYears(gcdDetail.publisherInfo.yearBegan, gcdDetail.publisherInfo.yearEnded, present) },
                  { label: t('comicDetail.web'), value: gcdDetail.publisherInfo.url, link: true },
                ]} />
              </div>
            </>
          )}

          {/* ── 9. PUBLICATION ──────────────────────────────────────────── */}
          {(gcdDetail?.price || gcdDetail?.onSaleDate || gcdDetail?.barcode || isbn || comic.binding || comic.drawingStyle) && (
            <>
              <Separator />
              <div className="py-5">
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="size-4 text-muted-foreground" />
                  <SectionTitle>{t('comicDetail.publication')}</SectionTitle>
                </div>
                <DataGrid items={[
                  { label: t('comicDetail.price'), value: gcdDetail?.price },
                  { label: t('comicDetail.saleDate'), value: gcdDetail?.onSaleDate },
                  { label: t('comicDetail.barcode'), value: gcdDetail?.barcode },
                  { label: t('comicDetail.isbn'), value: isbn },
                  { label: t('comicDetail.binding'), value: comic.binding ? t(`binding.${comic.binding}` as `binding.${BindingFormat}`) : undefined },
                  { label: t('comicDetail.drawingStyle'), value: comic.drawingStyle },
                ]} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Edit Sheet */}
      {comic && (
        <EditSheet
          comicId={comic.id}
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          initial={{
            title: comic.title,
            publisher: comic.publisher,
            year: comic.year,
            synopsis: comic.synopsis,
            coverUrl: comic.coverUrl,
            isbn: comic.isbn,
            binding: comic.binding,
            drawingStyle: comic.drawingStyle,
            series: comic.series,
            authors: comic.authors,
            externalApi: comic.externalApi,
          }}
        />
      )}
    </PageContainer>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>
}

interface DataItem { label: string; value?: string | null; link?: boolean }

function DataGrid({ items }: { items: DataItem[] }) {
  const filtered = items.filter((i) => i.value)
  if (!filtered.length) return null
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-1.5">
      {filtered.map(({ label, value, link }) => (
        <Fragment key={label}>
          <span className="text-xs text-muted-foreground">{label}</span>
          {link ? (
            <a href={value!} target="_blank" rel="noopener noreferrer"
              className="text-xs flex items-center gap-1 text-primary hover:underline">
              {value}<ExternalLink className="size-3" />
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

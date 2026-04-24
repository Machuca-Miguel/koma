import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Barcode, BookOpen, Search, Plus, Check, Copy,
  ChevronLeft, User, Building2, Tag, SlidersHorizontal,
  X, PenLine, Globe, Hash as HashIcon,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { isbndbApi } from '@/api/isbndb'
import { libraryApi } from '@/api/library'
import { comicsApi } from '@/api/comics'
import type { IsbndbBook } from '@/api/isbndb'
import type { BindingFormat } from '@/types'
import { AddToSheet } from '@/components/features/AddToSheet'
import { AutocompleteInput } from '@/components/ui/autocomplete-input'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

type TabId = 'books' | 'isbn' | 'authors' | 'publishers' | 'subjects'

const BINDING_OPTIONS: BindingFormat[] = ['CARTONE', 'TAPA_BLANDA', 'BOLSILLO', 'OMNIBUS', 'HARDCOVER', 'DIGITAL' , 'OTHER']

// ─── Color helper ─────────────────────────────────────────────────────────────

function strHue(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h) % 360
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getIsbn(book: IsbndbBook) { return book.isbn13 ?? book.isbn }
function getYear(book: IsbndbBook) {
  if (!book.date_published) return undefined
  const y = parseInt(book.date_published.slice(0, 4), 10)
  return isNaN(y) ? undefined : y
}

const COMIC_SUBJECT_KEYWORDS = ['comic', 'graphic novel', 'manga', 'bande dessin', 'fumetti', 'bd ', 'tebeo', 'strip', 'illustrat', 'superhero', 'super hero', 'Comics & Graphic Novels', 'Graphic Novels' ]

const LANGUAGES = [
  { code: '',   label: 'isbndb.langAll' },
  { code: 'es', label: 'isbndb.langEs'  },
  { code: 'fr', label: 'isbndb.langFr'  },
  { code: 'en', label: 'isbndb.langEn'  },
  { code: 'it', label: 'isbndb.langIt'  },
  { code: 'de', label: 'isbndb.langDe'  },
  { code: 'pt', label: 'isbndb.langPt'  },
  { code: 'nl', label: 'isbndb.langNl'  },
  { code: 'ca', label: 'isbndb.langCa'  },
]

// ─── Create Manual Comic Sheet ────────────────────────────────────────────────

const EMPTY_FORM = {
  title: '', publisher: '',
  year: '', isbn: '', binding: '' as BindingFormat | '',
  coverUrl: '', drawingStyle: '', synopsis: '',
  authors: '', scriptwriter: '', artist: '',
}

export function CreateManualComicSheet({ open, onOpenChange }: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: libraryData } = useQuery({
    queryKey: ['library'],
    queryFn: () => libraryApi.getAll({ limit: 200 }),
    enabled: open,
    staleTime: 60_000,
  })

  const libraryComics = libraryData?.data ?? []
  const publisherSuggestions = useMemo(() =>
    [...new Set(libraryComics.map((uc) => uc.comic.publisher).filter(Boolean) as string[])],
    [libraryComics]
  )
  const scriptwriterSuggestions = useMemo(() =>
    [...new Set(libraryComics.map((uc) => uc.comic.scriptwriter).filter(Boolean) as string[])],
    [libraryComics]
  )
  const artistSuggestions = useMemo(() =>
    [...new Set(libraryComics.map((uc) => uc.comic.artist).filter(Boolean) as string[])],
    [libraryComics]
  )
  const authorsSuggestions = useMemo(() =>
    [...new Set(libraryComics.map((uc) => uc.comic.authors).filter(Boolean) as string[])],
    [libraryComics]
  )
  const drawingStyleSuggestions = useMemo(() =>
    [...new Set(libraryComics.map((uc) => uc.comic.drawingStyle).filter(Boolean) as string[])],
    [libraryComics]
  )

  const set = (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }))

  function handleClose() {
    setForm(EMPTY_FORM)
    onOpenChange(false)
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const comic = await comicsApi.create({
        title: form.title.trim(),
        publisher: form.publisher.trim() || undefined,
        year: form.year ? Number(form.year) : undefined,
        isbn: form.isbn.trim() || undefined,
        binding: (form.binding as BindingFormat) || undefined,
        coverUrl: form.coverUrl.trim() || undefined,
        drawingStyle: form.drawingStyle.trim() || undefined,
        synopsis: form.synopsis.trim() || undefined,
        authors: form.authors.trim() || undefined,
        scriptwriter: form.scriptwriter.trim() || undefined,
        artist: form.artist.trim() || undefined,
      })
      try { await libraryApi.add({ comicId: comic.id, collectionStatus: 'IN_COLLECTION' }) }
      catch (err: unknown) { if ((err as { response?: { status?: number } })?.response?.status !== 409) throw err }
      return comic
    },
    onSuccess: () => {
      toast.success(t('search.createManual.success'))
      qc.invalidateQueries({ queryKey: ['library'] })
      handleClose()
    },
    onError: () => toast.error(t('search.createManual.error')),
  })

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent className="w-full sm:w-[600px] flex flex-col p-0 gap-0">
        <SheetHeader className="sheet-header">
          <SheetTitle className="text-lg">{t('search.createManual.title')}</SheetTitle>
        </SheetHeader>
        <div className="sheet-body">
          <div className="grid gap-2">
            <label className="text-sm font-medium">{t('search.createManual.fields.title')}</label>
            <Input value={form.title} onChange={set('title')} autoFocus className="h-10" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AutocompleteInput
              label={t('search.createManual.fields.publisher')}
              value={form.publisher}
              onChange={(v) => setForm((p) => ({ ...p, publisher: v }))}
              suggestions={publisherSuggestions}
              className="[&_input]:h-10"
            />
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t('search.createManual.fields.year')}</label>
              <Input type="number" value={form.year} onChange={set('year')} min={1800} max={2099} placeholder="2024" className="h-10" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t('search.createManual.fields.isbn')}</label>
              <Input value={form.isbn} onChange={set('isbn')} className="h-10 font-mono" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t('search.createManual.fields.binding')}</label>
              <Select
                value={form.binding || '__none__'}
                onValueChange={(v) => setForm((p) => ({ ...p, binding: v === '__none__' ? '' : v as BindingFormat }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue>
                    {form.binding ? t(`binding.${form.binding}` as `binding.${BindingFormat}`) : t('common.select')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('common.select')}</SelectItem>
                  {BINDING_OPTIONS.map((b) => (
                    <SelectItem key={b} value={b}>{t(`binding.${b}` as `binding.${BindingFormat}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">{t('search.createManual.fields.coverUrl')}</label>
            <Input value={form.coverUrl} onChange={set('coverUrl')} placeholder="https://..." className="h-10" />
          </div>
          <AutocompleteInput
            label={t('search.createManual.fields.drawingStyle')}
            value={form.drawingStyle}
            onChange={(v) => setForm((p) => ({ ...p, drawingStyle: v }))}
            suggestions={drawingStyleSuggestions}
            placeholder="Línea clara, realista..."
            className="[&_input]:h-10"
          />
          <div className="grid gap-2">
            <label className="text-sm font-medium">{t('search.createManual.fields.synopsis')}</label>
            <Textarea value={form.synopsis} onChange={set('synopsis')} rows={3} />
          </div>
          <AutocompleteInput
            label={t('search.createManual.fields.authors')}
            value={form.authors}
            onChange={(v) => setForm((p) => ({ ...p, authors: v }))}
            suggestions={authorsSuggestions}
            className="[&_input]:h-10"
          />
          <div className="grid grid-cols-2 gap-4">
            <AutocompleteInput
              label={t('search.createManual.fields.scriptwriter')}
              value={form.scriptwriter}
              onChange={(v) => setForm((p) => ({ ...p, scriptwriter: v }))}
              suggestions={scriptwriterSuggestions}
              className="[&_input]:h-10"
            />
            <AutocompleteInput
              label={t('search.createManual.fields.artist')}
              value={form.artist}
              onChange={(v) => setForm((p) => ({ ...p, artist: v }))}
              suggestions={artistSuggestions}
              className="[&_input]:h-10"
            />
          </div>
        </div>
        <div className="sheet-footer">
          <Button variant="outline" size="xl" onClick={handleClose} className="flex-1">{t('common.cancel')}</Button>
          <Button
            size="xl"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !form.title.trim()}
            className="flex-1"
          >
            {createMutation.isPending ? t('common.saving') : t('common.add')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Add Button ───────────────────────────────────────────────────────────────

function AddButton({
  book, isAdded, isPending, onOpenLibrarySheet,
}: {
  book: IsbndbBook
  isAdded: boolean
  isPending: boolean
  onOpenLibrarySheet: (b: IsbndbBook) => void
}) {
  const { t } = useTranslation()
  if (isAdded) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Check className="size-3.5 text-emerald-500" />
        {t('common.added')}
      </div>
    )
  }
  return (
    <Button size="sm" variant="default" className="h-7 text-xs gap-1 shrink-0" disabled={isPending} onClick={() => onOpenLibrarySheet(book)}>
      <Plus className="size-3" />
      {t('isbndb.addToLibrary')}
    </Button>
  )
}

// ─── BookCard ─────────────────────────────────────────────────────────────────

function BookCard({ book, addedIds, isPending, isSelected, onToggleSelect, onOpenLibrarySheet, onNavigateToDetail }: {
  book: IsbndbBook
  addedIds: Set<string>
  isPending: boolean
  isSelected?: boolean
  onToggleSelect?: (book: IsbndbBook) => void
  onOpenLibrarySheet?: (book: IsbndbBook) => void
  onNavigateToDetail?: (isbn: string) => void
}) {
  const { t } = useTranslation()
  const isbn = getIsbn(book)
  const year = getYear(book)
  const isAdded = addedIds.has(isbn)
  const meta = [book.publisher, year].filter(Boolean)
  // Filter out "subjects" literal and deduplicate
  const subjects = (book.subjects ?? [])
    .filter((s) => s.toLowerCase() !== 'subjects')
    .slice(0, 2)

  function handleCardClick() {
    if (onToggleSelect) { onToggleSelect(book); return }
    if (onNavigateToDetail) onNavigateToDetail(isbn)
  }

  return (
    <Card
      className={`flex  flex-col overflow-hidden transition-colors py-2 gap-0 min-h-[160px] ${
        onToggleSelect || onNavigateToDetail ? 'cursor-pointer hover:bg-muted/30' : ''
      } ${isSelected ? 'border-primary bg-primary/5' : ''}`}
      onClick={handleCardClick}
    >
      {/* Main row: cover + info */}
      <div className="flex gap-3 p-3 flex-1">
        {/* Checkbox (select mode) */}
        {onToggleSelect && (
          <div className={`shrink-0 size-5 rounded-md border-2 flex items-center justify-center self-center transition-colors ${
            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
          }`}>
            {isSelected && <Check className="size-3 text-primary-foreground" />}
          </div>
        )}

        {/* Cover  */}
        <div className="relative shrink-0 w-[120px] h-[172px] rounded-md overflow-hidden shadow-sm">
          {book.image ? (
            <img src={book.image} alt={book.title} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-1.5"
              style={{ background: `hsl(${strHue(book.title)}, 55%, 22%)` }}
            >
              <BookOpen className="size-6 text-white/40" />
              <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest px-2 text-center line-clamp-3 leading-tight">
                {book.title.slice(0, 18)}
              </span>
            </div>
          )}
          {/* Language badge — absolute bottom-right */}
          {book.language && (
            <div className="absolute bottom-1.5 right-1.5">
              <Badge variant="secondary" className="text-[9px] py-0 px-1 h-4 gap-0.5 shadow-sm bg-background/90 backdrop-blur-sm">
                <Globe className="size-2.5" />{book.language.toUpperCase()}
              </Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 py-0.5">
          <p className="font-semibold text-sm leading-snug line-clamp-3">{book.title}</p>
          {book.authors && book.authors.length > 0 && (
            <p className="text-xs text-muted-foreground line-clamp-2">{book.authors.join(', ')}</p>
          )}
          {meta.length > 0 && (
            <p className="text-xs text-muted-foreground">{meta.join(' · ')}</p>
          )}
          {book.pages && (
            <p className="text-xs text-muted-foreground">{t('isbndb.pages', { count: book.pages })}</p>
          )}
          {/* Subjects */}
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-auto pt-1">
              {book.binding && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">{book.binding}</Badge>
              )}
              {subjects.map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px] py-0 px-1.5 h-4">{s}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer: ISBN + Add button */}
      {!onToggleSelect && (
        <div
          className="flex items-center gap-2 p-3 border-t border-border/50"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { navigator.clipboard.writeText(isbn); toast.success(t('isbndb.isbnCopied')) }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer font-mono"
          >
            <HashIcon className="size-2.5" />{isbn}
            <Copy className="size-2.5 opacity-50" />
          </button>
          <div className="ml-auto">
            {onOpenLibrarySheet && (
              <AddButton
                book={book}
                isAdded={isAdded}
                isPending={isPending}
                onOpenLibrarySheet={onOpenLibrarySheet}
              />
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function BookCardSkeleton() {
  return (
    <Card className="flex gap-3 p-3 min-h-[160px]">
      <Skeleton className="shrink-0 w-[120px] h-[172px] rounded-md" />
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </Card>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const { t } = useTranslation()
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-end gap-3 py-2">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="size-4" /></Button>
      <span className="text-sm text-muted-foreground">{t('isbndb.pageOf', { page, total: totalPages })}</span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}><ChevronRight className="size-4" /></Button>
    </div>
  )
}

// ─── BookGrid ─────────────────────────────────────────────────────────────────

function BookGrid({ books, addedIds, isPending, isLoading, emptyMsg, selectedIsbnIds, onToggleIsbnSelect, onOpenLibrarySheet, onNavigateToDetail, page, totalPages, onPage, total }: {
  books: IsbndbBook[]
  addedIds: Set<string>
  isPending: boolean
  isLoading: boolean
  emptyMsg?: string
  selectedIsbnIds?: Set<string>
  onToggleIsbnSelect?: (book: IsbndbBook) => void
  onOpenLibrarySheet?: (book: IsbndbBook) => void
  onNavigateToDetail?: (isbn: string) => void
  page?: number
  totalPages?: number
  onPage?: (p: number) => void
  total?: number
}) {
  const { t } = useTranslation()
  if (isLoading) return <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <BookCardSkeleton key={i} />)}</div>
  if (books.length === 0) return (
    <div className="text-center py-12 text-muted-foreground">
      <BookOpen className="size-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">{emptyMsg ?? t('common.noResults')}</p>
    </div>
  )
  return (
    <div className="space-y-3">
      {/* Top pagination + count */}
      {total != null && total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t('isbndb.resultCount', { count: total })}</p>
          {page != null && totalPages != null && onPage && <Pagination page={page} totalPages={totalPages} onPage={onPage} />}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {books.map((book) => (
          <BookCard
            key={getIsbn(book)} book={book} addedIds={addedIds} isPending={isPending}
            isSelected={selectedIsbnIds?.has(getIsbn(book))}
            onToggleSelect={onToggleIsbnSelect}
            onOpenLibrarySheet={onOpenLibrarySheet}
            onNavigateToDetail={onNavigateToDetail}
          />
        ))}
      </div>
      {/* Bottom pagination */}
      {page != null && totalPages != null && onPage && <Pagination page={page} totalPages={totalPages} onPage={onPage} />}
    </div>
  )
}

// ─── Filters Panel ────────────────────────────────────────────────────────────

function FiltersPanel({
  language, setLanguage,
  yearFrom, setYearFrom,
  yearTo, setYearTo,
  publisherFilter, setPublisherFilter,
  publisherChips, togglePublisherChip,
  comicsOnly, setComicsOnly,
  activeFilterCount, clearFilters,
  publishers,
}: {
  language: string; setLanguage: (v: string) => void
  yearFrom: string; setYearFrom: (v: string) => void
  yearTo: string; setYearTo: (v: string) => void
  publisherFilter: string; setPublisherFilter: (v: string) => void
  publisherChips: Set<string>; togglePublisherChip: (p: string) => void
  comicsOnly: boolean; setComicsOnly: (v: boolean) => void
  activeFilterCount: number; clearFilters: () => void
  publishers: string[]
}) {
  const { t } = useTranslation()
  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
      {/* Publisher */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">{t('isbndb.filterPublisher')}</label>
        <Input
          value={publisherFilter}
          onChange={(e) => setPublisherFilter(e.target.value)}
          placeholder={t('isbndb.filterPublisherPlaceholder')}
          className="h-8 text-xs"
        />
        {publishers.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            <span className="text-[10px] text-muted-foreground/60 self-center">{t('isbndb.publisherQuickFilter')}</span>
            {publishers.map((pub) => {
              const active = publisherChips.has(pub)
              return (
                <button
                  key={pub}
                  onClick={() => togglePublisherChip(pub)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
                    active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                  }`}
                >
                  {active && <Check className="size-2.5" />}{pub}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {/* Language + year range */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('isbndb.filterLanguage')}</label>
          <Select value={language} onValueChange={(v) => v !== null && setLanguage(v)}>
            <SelectTrigger className="h-8 text-xs">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <SelectValue>{t((LANGUAGES.find((l) => l.code === language)?.label ?? 'isbndb.langAll') as any)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {LANGUAGES.map(({ code, label }) => <SelectItem key={code} value={code}>{t(label as any)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('isbndb.filterYearFrom')}</label>
          <Input type="number" placeholder="1950" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className="h-8 text-xs" min={1800} max={new Date().getFullYear()} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('isbndb.filterYearTo')}</label>
          <Input type="number" placeholder={String(new Date().getFullYear())} value={yearTo} onChange={(e) => setYearTo(e.target.value)} className="h-8 text-xs" min={1800} max={new Date().getFullYear()} />
        </div>
      </div>
      {/* Comics only */}
      <button
        type="button"
        onClick={() => setComicsOnly(!comicsOnly)}
        className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors ${
          comicsOnly ? 'bg-primary/10 border-primary/40 text-primary font-medium' : 'border-border text-muted-foreground hover:text-foreground'
        }`}
      >
        <div className={`size-3.5 rounded-sm border flex items-center justify-center transition-colors ${comicsOnly ? 'bg-primary border-primary' : 'border-muted-foreground/50'}`}>
          {comicsOnly && <Check className="size-2.5 text-primary-foreground" />}
        </div>
        {t('isbndb.comicsOnly')}
      </button>
      {activeFilterCount > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={clearFilters}>
            <X className="size-3" />{t('isbndb.clearFilters')}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Libros ──────────────────────────────────────────────────────────────

function TabBooks({ q, addedIds, isPending, selectedIsbnIds, onToggleIsbnSelect, onOpenLibrarySheet, onCreateManual }: {
  q: string
  addedIds: Set<string>
  isPending: boolean
  selectedIsbnIds?: Set<string>
  onToggleIsbnSelect?: (book: IsbndbBook) => void
  onOpenLibrarySheet?: (book: IsbndbBook) => void
  onCreateManual?: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<'title' | 'publisher' | 'year' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [language, setLanguage] = useState('es')
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [publisherFilter, setPublisherFilter] = useState('')
  const [publisherChips, setPublisherChips] = useState<Set<string>>(new Set())
  const [comicsOnly, setComicsOnly] = useState(false)

  const isbndbQuery = useQuery({
    queryKey: ['isbndb', 'books', q, page, language],
    queryFn: () => isbndbApi.searchBooks({ q, page, pageSize: 100, language: language || undefined }),
    enabled: q.trim().length > 0,
  })

  const books = useMemo(() => {
    let raw = isbndbQuery.data?.books ?? []
    if (comicsOnly) {
      // Only exclude books that HAVE subjects but NONE match comic keywords
      raw = raw.filter((book) => {
        if (!book.subjects || book.subjects.length === 0) return true
        return book.subjects.some((s) =>
          COMIC_SUBJECT_KEYWORDS.some((k) => s.toLowerCase().includes(k))
        )
      })
    }
    if (yearFrom || yearTo) {
      const from = yearFrom ? parseInt(yearFrom) : -Infinity
      const to = yearTo ? parseInt(yearTo) : Infinity
      raw = raw.filter((book) => { const y = getYear(book); return y === undefined || (y >= from && y <= to) })
    }
    if (publisherFilter.trim()) {
      const pf = publisherFilter.trim().toLowerCase()
      raw = raw.filter((book) => book.publisher?.toLowerCase().includes(pf))
    }
    if (publisherChips.size > 0) {
      raw = raw.filter((book) => book.publisher && publisherChips.has(book.publisher))
    }
    if (!sortField) return raw
    const dir = sortDir === 'asc' ? 1 : -1
    return [...raw].sort((a, b) => {
      if (sortField === 'title') return dir * (a.title ?? '').localeCompare(b.title ?? '')
      if (sortField === 'publisher') return dir * (a.publisher ?? '').localeCompare(b.publisher ?? '')
      if (sortField === 'year') return dir * ((getYear(a) ?? 0) - (getYear(b) ?? 0))
      return 0
    })
  }, [isbndbQuery.data?.books, yearFrom, yearTo, publisherFilter, publisherChips, sortField, sortDir, comicsOnly])

  const total = isbndbQuery.data?.total ?? 0
  const totalPages = Math.ceil(total / 100)
  const activeFilterCount = [language, yearFrom, yearTo, publisherFilter].filter(Boolean).length + publisherChips.size + (comicsOnly ? 1 : 0)

  const publishers = useMemo(() => [...new Set(
    (isbndbQuery.data?.books ?? []).map((b) => b.publisher).filter((p): p is string => !!p && p.trim().length > 0)
  )].slice(0, 8), [isbndbQuery.data?.books])

  function clearFilters() {
    setLanguage(''); setYearFrom(''); setYearTo(''); setPublisherFilter(''); setPublisherChips(new Set()); setComicsOnly(false)
  }

  if (!q.trim()) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Search className="size-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{t('isbndb.emptyState')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter button row */}
      <div className="flex items-center gap-2">
        <Button
          type="button" variant={showFilters ? 'secondary' : 'outline'} size="sm"
          onClick={() => setShowFilters((v) => !v)} className="relative gap-1.5 h-8"
        >
          <SlidersHorizontal className="size-3.5" />
          {t('isbndb.filtersToggle')}
          {activeFilterCount > 0 && (
            <span className="ml-0.5 size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">{activeFilterCount}</span>
          )}
        </Button>
        {/* Sort chips */}
        {(['title', 'publisher', 'year'] as const).map((opt) => {
          const isActive = sortField === opt
          const label = opt === 'title' ? t('search.sortTitle') : opt === 'publisher' ? t('search.sortPublisher') : t('search.sortYear')
          return (
            <button
              key={opt}
              onClick={() => {
                if (isActive) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
                else { setSortField(opt); setSortDir('asc') }
              }}
              className={`chip-sort ${isActive ? 'chip-active' : 'chip-inactive'}`}
            >
              {label}
              {isActive && <span className="text-[10px] leading-none">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              {isActive && <span onClick={(e) => { e.stopPropagation(); setSortField(null) }} className="ml-0.5 opacity-70 hover:opacity-100">×</span>}
            </button>
          )
        })}
      </div>

      {showFilters && (
        <FiltersPanel
          language={language} setLanguage={setLanguage}
          yearFrom={yearFrom} setYearFrom={setYearFrom}
          yearTo={yearTo} setYearTo={setYearTo}
          publisherFilter={publisherFilter} setPublisherFilter={setPublisherFilter}
          publisherChips={publisherChips} togglePublisherChip={(p) => setPublisherChips((prev) => { const n = new Set(prev); if (n.has(p)) { n.delete(p) } else { n.add(p) }; return n })}
          comicsOnly={comicsOnly} setComicsOnly={setComicsOnly}
          activeFilterCount={activeFilterCount} clearFilters={clearFilters}
          publishers={publishers}
        />
      )}

      <BookGrid
        books={books} addedIds={addedIds} isPending={isPending}
        isLoading={isbndbQuery.isLoading}
        total={total} page={page} totalPages={totalPages} onPage={setPage}
        selectedIsbnIds={selectedIsbnIds} onToggleIsbnSelect={onToggleIsbnSelect}
        onOpenLibrarySheet={onOpenLibrarySheet}
        onNavigateToDetail={(isbn) => navigate(`/search/book/${isbn}`)}
      />

      {!isbndbQuery.isLoading && books.length === 0 && q && onCreateManual && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-xs text-muted-foreground">{t('search.createManual.emptyStateCta')}</p>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onCreateManual}>
            <PenLine className="size-3.5" />{t('search.createManual.trigger')}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Tab: ISBN ────────────────────────────────────────────────────────────────

function TabIsbn({ q, addedIds, isPending, onOpenLibrarySheet, onCreateManual }: {
  q: string
  addedIds: Set<string>
  isPending: boolean
  onOpenLibrarySheet?: (b: IsbndbBook) => void
  onCreateManual?: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showEditions, setShowEditions] = useState(false)

  const cleanIsbn = q.trim().replace(/[-\s]/g, '')

  const bookQuery = useQuery({
    queryKey: ['isbndb', 'book', cleanIsbn],
    queryFn: () => isbndbApi.getBook(cleanIsbn),
    enabled: cleanIsbn.length >= 10,
    retry: false,
  })

  const editionsQuery = useQuery({
    queryKey: ['isbndb', 'editions', cleanIsbn],
    queryFn: () => isbndbApi.getBookEditions(cleanIsbn),
    enabled: showEditions && cleanIsbn.length >= 10,
  })

  if (!cleanIsbn) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Barcode className="size-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{t('isbndb.isbnEmptyState')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {bookQuery.isLoading && <div className="grid gap-3 sm:grid-cols-2"><BookCardSkeleton /></div>}
      {bookQuery.isError && (
        <div className="text-center py-8 space-y-3">
          <p className="text-muted-foreground text-sm">{t('isbndb.noIsbnResult')}</p>
          {onCreateManual && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">{t('search.createManual.emptyStateCta')}</p>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={onCreateManual}>
                <PenLine className="size-3.5" />{t('search.createManual.trigger')}
              </Button>
            </div>
          )}
        </div>
      )}
      {bookQuery.data && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <BookCard
              book={bookQuery.data} addedIds={addedIds} isPending={isPending}
              onOpenLibrarySheet={onOpenLibrarySheet}

              onNavigateToDetail={(isbn) => navigate(`/search/book/${isbn}`)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowEditions((v) => !v)}>
            {showEditions ? t('isbndb.hideEditions') : t('isbndb.allEditions')}
          </Button>
          {showEditions && (
            <BookGrid
              books={editionsQuery.data?.books ?? []} addedIds={addedIds} isPending={isPending}
              isLoading={editionsQuery.isLoading}
              onOpenLibrarySheet={onOpenLibrarySheet}

            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Autores ─────────────────────────────────────────────────────────────

function TabAuthors({ q, addedIds, isPending, onOpenLibrarySheet }: {
  q: string
  addedIds: Set<string>
  isPending: boolean
  onOpenLibrarySheet?: (b: IsbndbBook) => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const authorsQuery = useQuery({
    queryKey: ['isbndb', 'authors', q],
    queryFn: () => isbndbApi.searchAuthors({ q, pageSize: 30 }),
    enabled: q.trim().length > 0,
  })



  const authorBooksQuery = useQuery({
    queryKey: ['isbndb', 'author-books', selected, page],
    queryFn: () => isbndbApi.getAuthorBooks(selected!, { page, pageSize: 20 }),
    enabled: selected !== null,
  })

  if (!q.trim()) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <User className="size-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{t('isbndb.authorsEmptyState')}</p>
      </div>
    )
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelected(null)}>
            <ChevronLeft className="size-4" />{t('common.back')}
          </Button>
          <h3 className="font-medium text-sm">{t('isbndb.booksBy', { name: selected })}</h3>
        </div>
        <BookGrid
          books={authorBooksQuery.data?.books ?? []} addedIds={addedIds} isPending={isPending}
          isLoading={authorBooksQuery.isLoading}
          onOpenLibrarySheet={onOpenLibrarySheet}
          onNavigateToDetail={(isbn) => navigate(`/search/book/${isbn}`)}
          page={page} totalPages={Math.ceil((authorBooksQuery.data?.total ?? 0) / 20)} onPage={setPage}
          total={authorBooksQuery.data?.total}
        />
      </div>
    )
  }

  if (authorsQuery.isLoading) return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
  if (!authorsQuery.data?.authors.length) return <div className="text-center py-8 text-muted-foreground text-sm">{t('common.noResults')}</div>

  return (
    <div className="space-y-1">
      {(authorsQuery.data?.authors ?? []).map((author) => (
        <button key={author} onClick={() => { setSelected(author); setPage(1) }}
          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors cursor-pointer flex items-center gap-2">
          <User className="size-4 text-muted-foreground shrink-0" />{author}
        </button>
      ))}
    </div>
  )
}

// ─── Tab: Editoriales ─────────────────────────────────────────────────────────

function TabPublishers({ q, addedIds, isPending, onOpenLibrarySheet }: {
  q: string
  addedIds: Set<string>
  isPending: boolean
  onOpenLibrarySheet?: (b: IsbndbBook) => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const pubsQuery = useQuery({
    queryKey: ['isbndb', 'publishers', q],
    queryFn: () => isbndbApi.searchPublishers({ q, pageSize: 30 }),
    enabled: q.trim().length > 0,
  })

  const pubBooksQuery = useQuery({
    queryKey: ['isbndb', 'publisher-books', selected, page],
    queryFn: () => isbndbApi.getPublisherBooks(selected!, { page, pageSize: 20 }),
    enabled: selected !== null,
  })

  if (!q.trim()) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Building2 className="size-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{t('isbndb.publishersEmptyState')}</p>
      </div>
    )
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelected(null)}>
            <ChevronLeft className="size-4" />{t('common.back')}
          </Button>
          <h3 className="font-medium text-sm">{t('isbndb.booksBy', { name: selected })}</h3>
        </div>
        <BookGrid
          books={pubBooksQuery.data?.books ?? []} addedIds={addedIds} isPending={isPending}
          isLoading={pubBooksQuery.isLoading}
          onOpenLibrarySheet={onOpenLibrarySheet}
          onNavigateToDetail={(isbn) => navigate(`/search/book/${isbn}`)}
          page={page} totalPages={Math.ceil((pubBooksQuery.data?.total ?? 0) / 20)} onPage={setPage}
          total={pubBooksQuery.data?.total}
        />
      </div>
    )
  }

  if (pubsQuery.isLoading) return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
  if (!pubsQuery.data?.publishers.length) return <div className="text-center py-8 text-muted-foreground text-sm">{t('common.noResults')}</div>

  return (
    <div className="space-y-1">
      {(pubsQuery.data?.publishers ?? []).map((pub) => (
        <button key={pub} onClick={() => { setSelected(pub); setPage(1) }}
          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors cursor-pointer flex items-center gap-2">
          <Building2 className="size-4 text-muted-foreground shrink-0" />{pub}
        </button>
      ))}
    </div>
  )
}

// ─── Tab: Temas ───────────────────────────────────────────────────────────────

function TabSubjects({ q, addedIds, isPending, onOpenLibrarySheet }: {
  q: string
  addedIds: Set<string>
  isPending: boolean
  onOpenLibrarySheet?: (b: IsbndbBook) => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const subjectsQuery = useQuery({
    queryKey: ['isbndb', 'subjects', q],
    queryFn: () => isbndbApi.searchSubjects({ q, pageSize: 30 }),
    enabled: q.trim().length > 0,
  })

  const subjectBooksQuery = useQuery({
    queryKey: ['isbndb', 'subject-books', selected, page],
    queryFn: () => isbndbApi.getSubjectBooks(selected!, { page, pageSize: 20 }),
    enabled: selected !== null,
  })

  if (!q.trim()) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Tag className="size-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{t('isbndb.subjectsEmptyState')}</p>
      </div>
    )
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelected(null)}>
            <ChevronLeft className="size-4" />{t('common.back')}
          </Button>
          <h3 className="font-medium text-sm">{t('isbndb.booksBy', { name: selected })}</h3>
        </div>
        <BookGrid
          books={subjectBooksQuery.data?.books ?? []} addedIds={addedIds} isPending={isPending}
          isLoading={subjectBooksQuery.isLoading}
          onOpenLibrarySheet={onOpenLibrarySheet}
          onNavigateToDetail={(isbn) => navigate(`/search/book/${isbn}`)}
          page={page} totalPages={Math.ceil((subjectBooksQuery.data?.total ?? 0) / 20)} onPage={setPage}
          total={subjectBooksQuery.data?.total}
        />
      </div>
    )
  }

  if (subjectsQuery.isLoading) return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
  if (!subjectsQuery.data?.subjects.length) return <div className="text-center py-8 text-muted-foreground text-sm">{t('common.noResults')}</div>

  return (
    <div className="space-y-1">
      {(subjectsQuery.data?.subjects ?? []).map((subject) => (
        <button key={subject} onClick={() => { setSelected(subject); setPage(1) }}
          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors cursor-pointer flex items-center gap-2">
          <Tag className="size-4 text-muted-foreground shrink-0" />{subject}
        </button>
      ))}
    </div>
  )
}

// ─── Tabs definition ──────────────────────────────────────────────────────────

const TABS: { id: TabId; labelKey: string; placeholderKey: string; Icon: React.ElementType }[] = [
  { id: 'books',      labelKey: 'isbndb.tabBooks',      placeholderKey: 'isbndb.searchPlaceholder',         Icon: BookOpen   },
  { id: 'isbn',       labelKey: 'isbndb.tabIsbn',       placeholderKey: 'isbndb.searchIsbnPlaceholder',     Icon: Barcode    },
  { id: 'authors',    labelKey: 'isbndb.tabAuthors',    placeholderKey: 'isbndb.searchAuthorsPlaceholder',  Icon: User       },
  { id: 'publishers', labelKey: 'isbndb.tabPublishers', placeholderKey: 'isbndb.searchPublishersPlaceholder', Icon: Building2 },
  { id: 'subjects',   labelKey: 'isbndb.tabSubjects',   placeholderKey: 'isbndb.searchSubjectsPlaceholder', Icon: Tag        },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SearchPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialQ = searchParams.get('q') ?? ''
  const [activeTab, setActiveTab] = useState<TabId>('books')
  const [globalInput, setGlobalInput] = useState(initialQ)
  const [globalSubmitted, setGlobalSubmitted] = useState(initialQ)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [createManualOpen, setCreateManualOpen] = useState(false)

  const [librarySheetBook, setLibrarySheetBook] = useState<IsbndbBook | null>(null)

  // ISBNdb import (quick add)
  const importMutation = useMutation({
    mutationFn: async (book: IsbndbBook) => {
      const { comic } = await isbndbApi.import(book)
      try { await libraryApi.add({ comicId: comic.id, collectionStatus: 'IN_COLLECTION' }) }
      catch (err: unknown) { if ((err as { response?: { status?: number } })?.response?.status !== 409) throw err }
      return comic
    },
    onSuccess: (_, book) => {
      setAddedIds((prev) => new Set(prev).add(getIsbn(book)))
      toast.success(t('isbndb.addSuccess'))
      queryClient.invalidateQueries({ queryKey: ['library'] })
    },
    onError: () => toast.error(t('isbndb.addError')),
  })

  const activePlaceholderKey = TABS.find((t) => t.id === activeTab)?.placeholderKey ?? 'isbndb.searchPlaceholder'

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalSubmitted(globalInput.trim())
  }

  const tabProps = {
    q: globalSubmitted,
    addedIds,
    isPending: importMutation.isPending,
    onOpenLibrarySheet: (b: IsbndbBook) => setLibrarySheetBook(b),
    onCreateManual: () => setCreateManualOpen(true),
  }

  return (
    <PageContainer  className="space-y-4">
      <PageHeader
        title={t('search.title')}
        description={t('search.subtitle')}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => setCreateManualOpen(true)}
            >
              <PenLine className="size-4" />
              {t('search.createManual.trigger')}
            </Button>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b pb-0">
        {TABS.map(({ id, labelKey, Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id) }}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md border-b-2 transition-colors cursor-pointer ${
              activeTab === id
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            <Icon className="size-3.5" />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {t(labelKey as any)}
          </button>
        ))}
      </div>

      {/* Global search bar */}
      <form onSubmit={handleSearchSubmit} className="flex h-10 items-center rounded-lg border border-input bg-transparent ring-offset-background focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring transition-colors overflow-hidden dark:bg-input/30">
        <div className="relative flex-1 flex items-center h-full">
          <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
          <input
            value={globalInput}
            onChange={(e) => setGlobalInput(e.target.value)}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            placeholder={t(activePlaceholderKey as any)}
            className={`w-full h-full pl-9 pr-9 bg-transparent text-sm outline-none placeholder:text-muted-foreground ${activeTab === 'isbn' ? 'font-mono' : ''}`}
          />
          {globalInput && (
            <button type="button" onClick={() => { setGlobalInput(''); setGlobalSubmitted('') }} className="absolute right-10 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!globalInput.trim()}
          className="h-full px-4 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors border-l disabled:opacity-40"
        >
          <Search className="size-4" />
        </button>
      </form>

      {/* Tab content */}
      <div>
        {activeTab === 'books' && <TabBooks key={globalSubmitted} {...tabProps} />}
        {activeTab === 'isbn'       && <TabIsbn       key={globalSubmitted} {...tabProps} />}
        {activeTab === 'authors'    && <TabAuthors    key={globalSubmitted} {...tabProps} />}
        {activeTab === 'publishers' && <TabPublishers key={globalSubmitted} {...tabProps} />}
        {activeTab === 'subjects'   && <TabSubjects   key={globalSubmitted} {...tabProps} />}
      </div>

      {librarySheetBook && (
        <AddToSheet
          book={librarySheetBook}
          open={!!librarySheetBook}
          onClose={() => setLibrarySheetBook(null)}
          noNavigate
        />
      )}

      <CreateManualComicSheet open={createManualOpen} onOpenChange={setCreateManualOpen} />

      {/* FAB: barcode scanner */}
      <button
        onClick={() => toast.info(t('search.scannerComingSoon'))}
        className="fixed bottom-6 right-6 z-40 size-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-colors"
        aria-label={t('search.scannerLabel')}
      >
        <Barcode className="size-6" />
      </button>
    </PageContainer>
  )
}

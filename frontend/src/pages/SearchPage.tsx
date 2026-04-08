import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Barcode, BookOpen, Search, Plus, Check, Copy, Loader2,
  ChevronLeft, User, Building2, Tag, BarChart3, SlidersHorizontal,
  X, Library, CheckSquare, Folders, PenLine, Globe, Hash as HashIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { isbndbApi } from '@/api/isbndb'
import { gcdApi } from '@/api/gcd'
import { libraryApi } from '@/api/library'
import { collectionsApi } from '@/api/collections'
import { comicsApi } from '@/api/comics'
import type { IsbndbBook } from '@/api/isbndb'
import type { GcdComic, GcdSeriesSummary, BindingFormat } from '@/types'
import { AddToCollectionDialog } from '@/components/features/AddToCollectionDialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import { GcdSeriesIssuesSheet } from './GcdSeriesIssuesSheet'
import { PageContainer } from '@/components/layout/PageContainer'

type Source = 'isbndb' | 'gcd'
type TabId = 'books' | 'isbn' | 'authors' | 'publishers' | 'subjects' | 'stats'
type GroupBy = 'none' | 'edition' | 'binding'

const BINDING_OPTIONS: BindingFormat[] = ['CARTONE', 'TAPA_BLANDA', 'BOLSILLO', 'OMNIBUS', 'HARDCOVER']

// ─── Color helpers (deterministic from string) ────────────────────────────────

function strHue(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h) % 360
}

// ─── Create Manual Comic Sheet ────────────────────────────────────────────────

const EMPTY_FORM = {
  title: '', series: '', issueNumber: '', publisher: '',
  year: '', isbn: '', binding: '' as BindingFormat | '',
  coverUrl: '', drawingStyle: '', synopsis: '',
}

export function CreateManualComicSheet({ open, onOpenChange }: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)

  // Collection picker state
  const [collectionSearch, setCollectionSearch] = useState('')
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [creatingNewCollection, setCreatingNewCollection] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.getAll,
    enabled: open,
  })

  const filteredCollections = collections.filter((c) =>
    collectionSearch ? c.name.toLowerCase().includes(collectionSearch.toLowerCase()) : true
  )

  const set = (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }))

  function handleClose() {
    setForm(EMPTY_FORM)
    setCollectionSearch('')
    setSelectedCollectionId(null)
    setCreatingNewCollection(false)
    setNewCollectionName('')
    onOpenChange(false)
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const comic = await comicsApi.create({
        title: form.title.trim(),
        series: form.series.trim() || undefined,
        issueNumber: form.issueNumber.trim() || undefined,
        publisher: form.publisher.trim() || undefined,
        year: form.year ? Number(form.year) : undefined,
        isbn: form.isbn.trim() || undefined,
        binding: (form.binding as BindingFormat) || undefined,
        coverUrl: form.coverUrl.trim() || undefined,
        drawingStyle: form.drawingStyle.trim() || undefined,
        synopsis: form.synopsis.trim() || undefined,
      })
      try { await libraryApi.add({ comicId: comic.id, isOwned: true }) }
      catch (err: unknown) { if ((err as { response?: { status?: number } })?.response?.status !== 409) throw err }

      // Add to collection if one is selected / being created
      let targetCollectionId = selectedCollectionId
      if (creatingNewCollection && newCollectionName.trim()) {
        const col = await collectionsApi.create({ name: newCollectionName.trim(), isPublic: false })
        targetCollectionId = col.id
        qc.invalidateQueries({ queryKey: ['collections'] })
      }
      if (targetCollectionId) {
        await collectionsApi.addComic(targetCollectionId, comic.id).catch(() => {})
      }

      return comic
    },
    onSuccess: () => {
      toast.success(t('search.createManual.success'))
      qc.invalidateQueries({ queryKey: ['library'] })
      qc.invalidateQueries({ queryKey: ['collections'] })
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
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('search.createManual.fields.title')}</label>
            <Input value={form.title} onChange={set('title')} autoFocus className="h-10" />
          </div>
          {/* Series + Issue */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('search.createManual.fields.series')}</label>
              <Input value={form.series} onChange={set('series')} className="h-10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('search.createManual.fields.issueNumber')}</label>
              <Input value={form.issueNumber} onChange={set('issueNumber')} placeholder="#1" className="h-10" />
            </div>
          </div>
          {/* Publisher + Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('search.createManual.fields.publisher')}</label>
              <Input value={form.publisher} onChange={set('publisher')} className="h-10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('search.createManual.fields.year')}</label>
              <Input type="number" value={form.year} onChange={set('year')} min={1800} max={2099} placeholder="2024" className="h-10" />
            </div>
          </div>
          {/* ISBN + Binding */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('search.createManual.fields.isbn')}</label>
              <Input value={form.isbn} onChange={set('isbn')} className="h-10 font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('search.createManual.fields.binding')}</label>
              <Select
                value={form.binding || '__none__'}
                onValueChange={(v) => setForm((p) => ({ ...p, binding: v === '__none__' ? '' : v as BindingFormat }))}
              >
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {BINDING_OPTIONS.map((b) => (
                    <SelectItem key={b} value={b}>{t(`binding.${b}` as string)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Cover URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('search.createManual.fields.coverUrl')}</label>
            <Input value={form.coverUrl} onChange={set('coverUrl')} placeholder="https://..." className="h-10" />
          </div>
          {/* Drawing Style */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('search.createManual.fields.drawingStyle')}</label>
            <Input value={form.drawingStyle} onChange={set('drawingStyle')} placeholder="Línea clara, realista..." className="h-10" />
          </div>
          {/* Synopsis */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('search.createManual.fields.synopsis')}</label>
            <Textarea
              value={form.synopsis}
              onChange={set('synopsis')}
              rows={3}
            />
          </div>

          {/* ── Collection picker ─────────────────────────────────── */}
          <Separator />
          <div className="space-y-3">
            <label className="text-sm font-medium">{t('search.createManual.collection')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={collectionSearch}
                onChange={(e) => { setCollectionSearch(e.target.value); setCreatingNewCollection(false) }}
                placeholder={t('search.createManual.collectionSearch')}
                className="pl-9 h-10"
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border p-1.5">
              {filteredCollections.length === 0 && !creatingNewCollection ? (
                <p className="text-sm text-muted-foreground text-center py-3">{t('collections.emptyState')}</p>
              ) : (
                filteredCollections.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => { setSelectedCollectionId(selectedCollectionId === col.id ? null : col.id); setCreatingNewCollection(false) }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between gap-2 transition-colors ${
                      selectedCollectionId === col.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <span className="truncate">{col.name}</span>
                    {selectedCollectionId === col.id && <Check className="size-3.5 shrink-0" />}
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => { setCreatingNewCollection((v) => !v); setSelectedCollectionId(null) }}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${creatingNewCollection ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Plus className="size-4" />{t('collections.createTitle')}
            </button>
            {creatingNewCollection && (
              <Input
                autoFocus
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder={t('collections.namePlaceholder')}
                className="h-10"
              />
            )}
          </div>
        </div>
        <div className="sheet-footer">
          <Button variant="outline" size="xl" onClick={handleClose} className="flex-1">{t('common.cancel')}</Button>
          <Button
            size="xl"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !form.title.trim() || (creatingNewCollection && !newCollectionName.trim())}
            className="flex-1"
          >
            {createMutation.isPending ? t('common.saving') : t('common.add')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── ISBNdb helpers ───────────────────────────────────────────────────────────

function getIsbn(book: IsbndbBook) { return book.isbn13 ?? book.isbn }
function getYear(book: IsbndbBook) {
  if (!book.date_published) return undefined
  const y = parseInt(book.date_published.slice(0, 4), 10)
  return isNaN(y) ? undefined : y
}

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

// ─── ISBNdb BookCard ──────────────────────────────────────────────────────────

function BookCard({ book, addedIds, onAdd, isPending, isSelected, onToggleSelect }: {
  book: IsbndbBook; addedIds: Set<string>; onAdd: (b: IsbndbBook) => void; isPending: boolean
  isSelected?: boolean; onToggleSelect?: (book: IsbndbBook) => void
}) {
  const { t } = useTranslation()
  const isbn = getIsbn(book)
  const year = getYear(book)
  const isAdded = addedIds.has(isbn)
  const meta = [book.publisher, year, book.pages ? t('isbndb.pages', { count: book.pages }) : undefined].filter(Boolean)
  return (
    <Card
      className={`flex-row gap-4 p-4 transition-colors ${onToggleSelect ? 'cursor-pointer hover:bg-muted/30' : 'hover:bg-muted/20'} ${isSelected ? 'border-primary bg-primary/5' : ''}`}
      onClick={onToggleSelect ? () => onToggleSelect(book) : undefined}
    >
      {/* Checkbox when in select mode */}
      {onToggleSelect && (
        <div className={`shrink-0 size-5 rounded-md border-2 flex items-center justify-center self-center transition-colors ${
          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
        }`}>
          {isSelected && <Check className="size-3 text-primary-foreground" />}
        </div>
      )}

      {/* Cover */}
      <div className="shrink-0 w-[72px] h-[104px] rounded-md overflow-hidden shadow-sm">
        {book.image
          ? <img src={book.image} alt={book.title} loading="lazy" className="w-full h-full object-cover" />
          : (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-1"
              style={{ background: `hsl(${strHue(book.title)}, 55%, 22%)` }}
            >
              <BookOpen className="size-5 text-white/40" />
              <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest px-1 text-center line-clamp-2 leading-tight">
                {book.title.slice(0, 12)}
              </span>
            </div>
          )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Row 1: title */}
        <p className="font-semibold text-sm leading-snug line-clamp-2">{book.title}</p>

        {/* Row 2: authors */}
        {book.authors && book.authors.length > 0 && (
          <p className="text-xs text-muted-foreground line-clamp-1">{book.authors.join(', ')}</p>
        )}

        {/* Row 3: publisher · year · pages */}
        {meta.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {meta.join(' · ')}
          </p>
        )}

        {/* Row 4: badges (subjects + language + binding) */}
        <div className="flex flex-wrap gap-1">
          {book.language && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 gap-0.5">
              <Globe className="size-2.5" />{book.language.toUpperCase()}
            </Badge>
          )}
          {book.binding && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
              {book.binding}
            </Badge>
          )}
          {book.subjects?.slice(0, 2).map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px] py-0 px-1.5 h-4">{s}</Badge>
          ))}
        </div>

        {/* Row 5: ISBN + add button (hidden in select mode) */}
        {!onToggleSelect && (
          <div className="flex items-center gap-2 mt-auto pt-1.5 border-t border-border/50">
            <button
              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(isbn); toast.success(t('isbndb.isbnCopied')) }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer font-mono"
            >
              <HashIcon className="size-2.5" />{isbn}
            </button>
            <Button
              size="sm" variant={isAdded ? 'secondary' : 'default'}
              className="ml-auto h-7 text-xs gap-1.5 shrink-0"
              disabled={isAdded || isPending} onClick={(e) => { e.stopPropagation(); onAdd(book) }}
            >
              {isAdded ? <><Check className="size-3" />{t('common.added')}</> : <><Plus className="size-3" />{t('isbndb.addToLibrary')}</>}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

function BookCardSkeleton() {
  return (
    <Card className="flex-row gap-4 p-4">
      <Skeleton className="shrink-0 w-[72px] h-[104px] rounded-md" />
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </Card>
  )
}

function BookGrid({ books, addedIds, onAdd, isPending, isLoading, selectedIsbnIds, onToggleIsbnSelect }: {
  books: IsbndbBook[]; addedIds: Set<string>; onAdd: (b: IsbndbBook) => void; isPending: boolean; isLoading: boolean
  selectedIsbnIds?: Set<string>; onToggleIsbnSelect?: (book: IsbndbBook) => void
}) {
  const { t } = useTranslation()
  if (isLoading) return <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <BookCardSkeleton key={i} />)}</div>
  if (books.length === 0) return <div className="text-center py-12 text-muted-foreground"><BookOpen className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">{t('common.noResults')}</p></div>
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {books.map((book) => (
        <BookCard
          key={getIsbn(book)} book={book} addedIds={addedIds} onAdd={onAdd} isPending={isPending}
          isSelected={selectedIsbnIds?.has(getIsbn(book))}
          onToggleSelect={onToggleIsbnSelect}
        />
      ))}
    </div>
  )
}

function GroupedResults({ books, groupBy, addedIds, onAdd, isPending, selectedIsbnIds, onToggleIsbnSelect }: {
  books: IsbndbBook[]; groupBy: Exclude<GroupBy, 'none'>; addedIds: Set<string>; onAdd: (b: IsbndbBook) => void; isPending: boolean
  selectedIsbnIds?: Set<string>; onToggleIsbnSelect?: (book: IsbndbBook) => void
}) {
  const { t } = useTranslation()
  const groups = useMemo(() => {
    const map = new Map<string, IsbndbBook[]>()
    for (const book of books) {
      const key = groupBy === 'edition'
        ? (book.edition?.trim() || t('isbndb.noEditionGroup'))
        : (book.binding?.trim() || t('isbndb.noBindingGroup'))
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(book)
    }
    return [...map.entries()].sort(([a], [b]) => {
      const fb1 = t('isbndb.noEditionGroup'), fb2 = t('isbndb.noBindingGroup')
      if (a === fb1 || a === fb2) return 1
      if (b === fb1 || b === fb2) return -1
      return a.localeCompare(b)
    })
  }, [books, groupBy, t])
  return (
    <div className="space-y-6">
      {groups.map(([name, groupBooks]) => (
        <div key={name}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">{name}</h3>
            <Badge variant="secondary" className="text-xs">{groupBooks.length}</Badge>
          </div>
          <BookGrid books={groupBooks} addedIds={addedIds} onAdd={onAdd} isPending={isPending} isLoading={false} selectedIsbnIds={selectedIsbnIds} onToggleIsbnSelect={onToggleIsbnSelect} />
        </div>
      ))}
    </div>
  )
}

// ─── GCD helpers ──────────────────────────────────────────────────────────────

function GcdIssueCard({ comic, addedGcdIds, onAdd, isPending, isSelected, onToggleSelect }: {
  comic: GcdComic; addedGcdIds: Set<string>; onAdd: (id: string) => void; isPending: boolean
  isSelected?: boolean; onToggleSelect?: (externalId: string) => void
}) {
  const { t } = useTranslation()
  const isAdded = addedGcdIds.has(comic.externalId)
  const meta = [
    comic.issueNumber ? `#${comic.issueNumber}` : undefined,
    comic.publisher,
    comic.year ? String(comic.year) : undefined,
  ].filter(Boolean)
  return (
    <Card
      className={`flex-row gap-4 p-4 transition-colors ${onToggleSelect ? 'cursor-pointer hover:bg-muted/30' : 'hover:bg-muted/20'} ${isSelected ? 'border-primary bg-primary/5' : ''}`}
      onClick={onToggleSelect ? () => onToggleSelect(comic.externalId) : undefined}
    >
      {/* Checkbox when in select mode */}
      {onToggleSelect && (
        <div className={`shrink-0 size-5 rounded-md border-2 flex items-center justify-center self-center transition-colors ${
          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
        }`}>
          {isSelected && <Check className="size-3 text-primary-foreground" />}
        </div>
      )}

      {/* Cover */}
      <div className="shrink-0 w-[72px] h-[104px] rounded-md overflow-hidden bg-muted flex items-center justify-center shadow-sm">
        {comic.coverUrl
          ? <img src={comic.coverUrl} alt={comic.title} loading="lazy" className="w-full h-full object-cover" />
          : <BookOpen className="size-7 text-muted-foreground/30" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {/* Row 1: title */}
        <p className="font-semibold text-sm leading-snug line-clamp-2">{comic.title}</p>

        {/* Row 2: series */}
        {comic.series && (
          <p className="text-xs text-muted-foreground italic line-clamp-1">{comic.series}</p>
        )}

        {/* Row 3: #issue · publisher · year */}
        {meta.length > 0 && (
          <p className="text-xs text-muted-foreground">{meta.join(' · ')}</p>
        )}

        {/* Row 4: add button (hidden when in select mode) */}
        {!onToggleSelect && (
          <div className="flex items-center mt-auto pt-1 border-t border-border/50">
            <Button
              size="sm" variant={isAdded ? 'secondary' : 'default'}
              className="ml-auto h-7 text-xs gap-1.5"
              disabled={isAdded || isPending} onClick={() => onAdd(comic.externalId)}
            >
              {isAdded ? <><Check className="size-3" />{t('common.added')}</> : <><Plus className="size-3" />{t('isbndb.addToLibrary')}</>}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

function GcdIssueGrid({ comics, addedGcdIds, onAdd, isPending, isLoading, selectedGcdIds, onToggleGcdSelect }: {
  comics: GcdComic[]; addedGcdIds: Set<string>; onAdd: (id: string) => void; isPending: boolean; isLoading: boolean
  selectedGcdIds?: Set<string>; onToggleGcdSelect?: (id: string) => void
}) {
  const { t } = useTranslation()
  if (isLoading) return <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <BookCardSkeleton key={i} />)}</div>
  if (comics.length === 0) return <div className="text-center py-12 text-muted-foreground"><BookOpen className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">{t('common.noResults')}</p></div>
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {comics.map((c) => (
        <GcdIssueCard
          key={c.externalId}
          comic={c}
          addedGcdIds={addedGcdIds}
          onAdd={onAdd}
          isPending={isPending}
          isSelected={selectedGcdIds?.has(c.externalId)}
          onToggleSelect={onToggleGcdSelect}
        />
      ))}
    </div>
  )
}

function GcdSeriesCard({ series, onOpen }: { series: GcdSeriesSummary; onOpen: () => void }) {
  const { t } = useTranslation()
  const hue = strHue(series.name)
  const yearStart = series.yearBegan ?? null
  const yearEnd = series.yearEnded ?? null
  const yearRange = yearStart
    ? yearEnd ? `${yearStart}–${yearEnd}` : `${yearStart}–`
    : null

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:bg-muted/30 transition-colors group"
      onClick={onOpen}
    >
      <CardContent className="p-3 flex items-center gap-3">
        {/* Color block with initial */}
        <div
          className="shrink-0 size-12 rounded-lg flex items-center justify-center text-white font-bold text-lg select-none"
          style={{ background: `hsl(${hue}, 60%, 30%)` }}
        >
          {series.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">{series.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {series.publisher && (
              <span className="text-xs text-muted-foreground truncate">{series.publisher}</span>
            )}
            {yearRange && (
              <span className="text-xs text-muted-foreground/70">{yearRange}</span>
            )}
            {series.issueCount != null && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 shrink-0">
                {series.issueCount} {t('search.seriesIssues_other', { count: series.issueCount })}
              </Badge>
            )}
          </div>
        </div>

        {/* Arrow caret on hover */}
        <Library className="size-4 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground transition-colors" />
      </CardContent>
    </Card>
  )
}

// ─── Tab: Libros / Issues ─────────────────────────────────────────────────────

function TabBooks({ source, addedIds, onAdd, isPending, addedGcdIds, onAddGcd, isPendingGcd, selectedGcdIds, onToggleGcdSelect, selectedIsbnIds, onToggleIsbnSelect, onCreateManual }: {
  source: Source; addedIds: Set<string>; onAdd: (b: IsbndbBook) => void; isPending: boolean
  addedGcdIds: Set<string>; onAddGcd: (id: string) => void; isPendingGcd: boolean
  selectedGcdIds?: Set<string>; onToggleGcdSelect?: (id: string) => void
  selectedIsbnIds?: Set<string>; onToggleIsbnSelect?: (book: IsbndbBook) => void
  onCreateManual?: () => void
}) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [page, setPage] = useState(1)
  const [submitted, setSubmitted] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<'title' | 'publisher' | 'year' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [language, setLanguage] = useState('es')
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [publisherFilter, setPublisherFilter] = useState('')
  const [publisherChips, setPublisherChips] = useState<Set<string>>(new Set())
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [comicsOnly, setComicsOnly] = useState(true)
  // GCD-specific filters
  const [gcdPublisher, setGcdPublisher] = useState('')
  const [gcdYear, setGcdYear] = useState('')
  // Series sheet (GCD)
  const [selectedSeries, setSelectedSeries] = useState<{ gcdSeriesId: number; name: string } | null>(null)

  const activeIsbndbFilterCount = [language, yearFrom, yearTo, publisherFilter].filter(Boolean).length + publisherChips.size + (comicsOnly ? 1 : 0)

  const isbndbQuery = useQuery({
    queryKey: ['isbndb', 'books', submitted, page, language],
    queryFn: () => isbndbApi.searchBooks({ q: submitted, page, pageSize: 100, language: language || undefined }),
    enabled: source === 'isbndb' && submitted.trim().length > 0,
  })

  const gcdSeriesQuery = useQuery({
    queryKey: ['gcd', 'series-books', submitted, gcdPublisher, gcdYear, page],
    queryFn: () => gcdApi.searchSeries({
      q: submitted || undefined,
      publisher: gcdPublisher || undefined,
      year: gcdYear ? parseInt(gcdYear) : undefined,
      page,
    }),
    enabled: source === 'gcd' && (submitted.trim().length > 0 || !!gcdPublisher),
  })

  const COMIC_SUBJECT_KEYWORDS = ['comic', 'graphic novel', 'manga', 'bande dessin', 'fumetti', 'bd ', 'tebeo', 'strip', 'illustrat']

  const books = useMemo(() => {
    let raw = isbndbQuery.data?.books ?? []
    if (comicsOnly) {
      raw = raw.filter((book) => {
        if (!book.subjects || book.subjects.length === 0) return true // sin subjects, no se filtra
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
  }, [isbndbQuery.data?.books, yearFrom, yearTo, publisherFilter, publisherChips, sortField, sortDir])

  const total = source === 'isbndb' ? (isbndbQuery.data?.total ?? 0) : (gcdSeriesQuery.data?.total ?? 0)
  const totalPages = Math.ceil(total / (source === 'isbndb' ? 100 : 20))
  const isFetching = source === 'isbndb' ? isbndbQuery.isFetching : gcdSeriesQuery.isFetching
  const isLoading = source === 'isbndb' ? isbndbQuery.isLoading : gcdSeriesQuery.isLoading

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() && source === 'isbndb') return
    setPage(1); setSubmitted(input.trim())
  }

  function clearFilters() {
    if (source === 'isbndb') { setLanguage(''); setYearFrom(''); setYearTo(''); setPublisherFilter(''); setPublisherChips(new Set()); setGroupBy('none'); setComicsOnly(false) }
    else { setGcdPublisher(''); setGcdYear('') }
  }

  function togglePublisherChip(pub: string) {
    setPublisherChips((prev) => {
      const next = new Set(prev)
      next.has(pub) ? next.delete(pub) : next.add(pub)
      return next
    })
  }

  const hasGcdInput = submitted.trim() || gcdPublisher
  const gcdSeriesList = useMemo(() => {
    const raw = gcdSeriesQuery.data?.data ?? []
    if (!sortField) return raw
    const dir = sortDir === 'asc' ? 1 : -1
    return [...raw].sort((a, b) => {
      if (sortField === 'title') return dir * (a.name ?? '').localeCompare(b.name ?? '')
      if (sortField === 'publisher') return dir * (a.publisher ?? '').localeCompare(b.publisher ?? '')
      if (sortField === 'year') return dir * ((a.yearBegan ?? 0) - (b.yearBegan ?? 0))
      return 0
    })
  }, [gcdSeriesQuery.data?.data, sortField, sortDir])

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={source === 'gcd' ? t('search.inputPlaceholder') : t('isbndb.searchPlaceholder')}
          className="flex-1"
        />
        <Button
          type="button" variant={showFilters ? 'secondary' : 'outline'}
          onClick={() => setShowFilters((v) => !v)} className="relative shrink-0" title={t('isbndb.filtersToggle')}
        >
          <SlidersHorizontal className="size-4" />
          {(source === 'isbndb' ? activeIsbndbFilterCount : [gcdPublisher, gcdYear].filter(Boolean).length) > 0 && (
            <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
              {source === 'isbndb' ? activeIsbndbFilterCount : [gcdPublisher, gcdYear].filter(Boolean).length}
            </span>
          )}
        </Button>
        <Button type="submit" disabled={isFetching || (!input.trim() && source === 'isbndb') || (!input.trim() && !gcdPublisher && source === 'gcd')}>
          {isFetching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </Button>
      </form>

      {showFilters && (
        <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
          {source === 'isbndb' ? (
            <div className="space-y-3">
              {/* Comics-only toggle */}
              <button
                type="button"
                onClick={() => setComicsOnly((v) => !v)}
                className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                  comicsOnly
                    ? 'bg-primary/10 border-primary/40 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`size-3.5 rounded-sm border flex items-center justify-center transition-colors ${comicsOnly ? 'bg-primary border-primary' : 'border-muted-foreground/50'}`}>
                  {comicsOnly && <Check className="size-2.5 text-primary-foreground" />}
                </div>
                {t('isbndb.comicsOnly')}
              </button>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('isbndb.filterLanguage')}</label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t('isbndb.langAll')} /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(({ code, label }) => (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        <SelectItem key={code} value={code}>{t(label as any)}</SelectItem>
                      ))}
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
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('isbndb.filterGroupBy')}</label>
                  <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('isbndb.groupByNone')}</SelectItem>
                      <SelectItem value="edition">{t('isbndb.groupByEdition')}</SelectItem>
                      <SelectItem value="binding">{t('isbndb.groupByBinding')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Publisher filter row */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t('isbndb.filterPublisher')}</label>
                <Input
                  value={publisherFilter}
                  onChange={(e) => setPublisherFilter(e.target.value)}
                  placeholder={t('isbndb.filterPublisherPlaceholder')}
                  className="h-8 text-xs"
                />
                {/* Quickpick: unique publishers from current results — multi-select */}
                {(() => {
                  const publishers = [...new Set(
                    (isbndbQuery.data?.books ?? [])
                      .map((b) => b.publisher)
                      .filter((p): p is string => !!p && p.trim().length > 0)
                  )].slice(0, 8)
                  return publishers.length > 0 ? (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      <span className="text-[10px] text-muted-foreground/60 self-center">{t('isbndb.publisherQuickFilter')}</span>
                      {publishers.map((pub) => {
                        const active = publisherChips.has(pub)
                        return (
                          <button
                            key={pub}
                            onClick={() => togglePublisherChip(pub)}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
                              active
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                            }`}
                          >
                            {active && <Check className="size-2.5" />}
                            {pub}
                          </button>
                        )
                      })}
                    </div>
                  ) : null
                })()}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('search.filterPublisher')}</label>
                <Input value={gcdPublisher} onChange={(e) => setGcdPublisher(e.target.value)} placeholder="Marvel, DC..." className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('search.filterYear')}</label>
                <Input type="number" value={gcdYear} onChange={(e) => setGcdYear(e.target.value)} placeholder="1986" className="h-8 text-xs" min={1900} max={2099} />
              </div>
            </div>
          )}
          {(source === 'isbndb' ? activeIsbndbFilterCount : [gcdPublisher, gcdYear].filter(Boolean).length) > 0 && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={clearFilters}>
                <X className="size-3" />{t('isbndb.clearFilters')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Sort bar — shown whenever there are results */}
      {((source === 'isbndb' && submitted && (books.length > 0 || isLoading)) ||
        (source === 'gcd' && hasGcdInput && (gcdSeriesList.length > 0 || isLoading))) && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground shrink-0">{t('library.sortBy')}:</span>
          {(['title', 'publisher', 'year'] as const).map((opt) => {
            const isActive = sortField === opt
            const label = opt === 'title' ? t('search.sortTitle') : opt === 'publisher' ? t('search.sortPublisher') : t('search.sortYear')
            return (
              <button
                key={opt}
                onClick={() => {
                  if (isActive) {
                    setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
                  } else {
                    setSortField(opt)
                    setSortDir('asc')
                  }
                }}
                className={`chip-sort ${isActive ? 'chip-active' : 'chip-inactive'}`}
              >
                {label}
                {isActive && <span className="text-[10px] leading-none">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                {isActive && (
                  <span
                    onClick={(e) => { e.stopPropagation(); setSortField(null) }}
                    className="ml-0.5 opacity-70 hover:opacity-100 leading-none"
                  >×</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {source === 'isbndb' ? (
        submitted && (
          <>
            {total > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('isbndb.resultCount', { count: total })}
                {(yearFrom || yearTo || publisherFilter || publisherChips.size > 0) && books.length !== total && <span> → {t('isbndb.filteredCount', { count: books.length })}</span>}
              </p>
            )}
            {groupBy !== 'none' ? (
              <GroupedResults books={books} groupBy={groupBy} addedIds={addedIds} onAdd={onAdd} isPending={isPending} selectedIsbnIds={selectedIsbnIds} onToggleIsbnSelect={onToggleIsbnSelect} />
            ) : (
              <BookGrid books={books} addedIds={addedIds} onAdd={onAdd} isPending={isPending} isLoading={isLoading} selectedIsbnIds={selectedIsbnIds} onToggleIsbnSelect={onToggleIsbnSelect} />
            )}
            {/* Create manually CTA — shown when search returned no results */}
            {!isLoading && books.length === 0 && onCreateManual && (
              <div className="flex flex-col items-center gap-2 pt-2">
                <p className="text-xs text-muted-foreground">{t('search.createManual.emptyStateCta')}</p>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={onCreateManual}>
                  <PenLine className="size-3.5" />{t('search.createManual.trigger')}
                </Button>
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('library.prevPage')}</Button>
                <span className="text-sm text-muted-foreground">{t('isbndb.pageOf', { page, total: totalPages })}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>{t('library.nextPage')}</Button>
              </div>
            )}
          </>
        )
      ) : (
        hasGcdInput ? (
          <>
            {total > 0 && <p className="text-xs text-muted-foreground">{t('isbndb.resultCount', { count: total })}</p>}
            {isLoading
              ? <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}</div>
              : gcdSeriesList.length === 0
                ? <div className="text-center py-12 text-muted-foreground"><BookOpen className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">{t('common.noResults')}</p></div>
                : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {gcdSeriesList.map((s) => (
                      <GcdSeriesCard
                        key={s.seriesId}
                        series={s}
                        onOpen={() => setSelectedSeries({ gcdSeriesId: s.seriesId, name: s.name })}
                      />
                    ))}
                  </div>
                )
            }
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('library.prevPage')}</Button>
                <span className="text-sm text-muted-foreground">{t('isbndb.pageOf', { page, total: totalPages })}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>{t('library.nextPage')}</Button>
              </div>
            )}
            <GcdSeriesIssuesSheet
              gcdSeriesId={selectedSeries?.gcdSeriesId ?? null}
              seriesName={selectedSeries?.name ?? ''}
              onClose={() => setSelectedSeries(null)}
              onAdded={(id) => onAddGcd(id)}
            />
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">{t('isbndb.emptyState')}</p>
          </div>
        )
      )}

      {source === 'isbndb' && !submitted && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">{t('isbndb.emptyState')}</p>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Por ISBN / Por Serie (GCD) ──────────────────────────────────────────

function TabIsbn({ source, addedIds, onAdd, isPending, addedGcdIds, onAddGcd, isPendingGcd, onCreateManual }: {
  source: Source; addedIds: Set<string>; onAdd: (b: IsbndbBook) => void; isPending: boolean
  addedGcdIds: Set<string>; onAddGcd: (id: string) => void; isPendingGcd: boolean
  onCreateManual?: () => void
}) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [showEditions, setShowEditions] = useState(false)
  const [selectedSeries, setSelectedSeries] = useState<{ gcdSeriesId: number; name: string } | null>(null)
  const [page, setPage] = useState(1)

  // ISBNdb
  const bookQuery = useQuery({
    queryKey: ['isbndb', 'book', submitted],
    queryFn: () => isbndbApi.getBook(submitted),
    enabled: source === 'isbndb' && submitted.trim().length > 0,
    retry: false,
  })
  const editionsQuery = useQuery({
    queryKey: ['isbndb', 'editions', submitted],
    queryFn: () => isbndbApi.getBookEditions(submitted),
    enabled: source === 'isbndb' && showEditions && submitted.trim().length > 0,
  })

  // GCD series search
  const gcdSeriesQuery = useQuery({
    queryKey: ['gcd', 'series', submitted, page],
    queryFn: () => gcdApi.searchSeries({ q: submitted, page }),
    enabled: source === 'gcd' && submitted.trim().length > 0,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setShowEditions(false)
    setPage(1)
    setSubmitted(source === 'isbndb' ? input.trim().replace(/[-\s]/g, '') : input.trim())
  }

  const seriesList = gcdSeriesQuery.data?.data ?? []
  const totalPages = Math.ceil((gcdSeriesQuery.data?.total ?? 0) / 20)

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={source === 'gcd' ? t('search.inputPlaceholder') : t('isbndb.searchIsbnPlaceholder')}
          className={`flex-1 ${source === 'isbndb' ? 'font-mono' : ''}`}
        />
        <Button type="submit" disabled={!input.trim() || (source === 'isbndb' ? bookQuery.isFetching : gcdSeriesQuery.isFetching)}>
          {(source === 'isbndb' ? bookQuery.isFetching : gcdSeriesQuery.isFetching)
            ? <Loader2 className="size-4 animate-spin" />
            : source === 'isbndb' ? <Barcode className="size-4" /> : <Search className="size-4" />}
        </Button>
      </form>

      {source === 'isbndb' ? (
        <>
          {bookQuery.isLoading && <div className="grid gap-3 sm:grid-cols-2"><BookCardSkeleton /></div>}
          {bookQuery.isError && submitted && (
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
                <BookCard book={bookQuery.data} addedIds={addedIds} onAdd={onAdd} isPending={isPending} />
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowEditions((v) => !v)}>
                {showEditions ? t('isbndb.hideEditions') : t('isbndb.allEditions')}
              </Button>
              {showEditions && <BookGrid books={editionsQuery.data?.books ?? []} addedIds={addedIds} onAdd={onAdd} isPending={isPending} isLoading={editionsQuery.isLoading} />}
            </div>
          )}
          {!submitted && <div className="text-center py-16 text-muted-foreground"><Barcode className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">{t('isbndb.isbnEmptyState')}</p></div>}
        </>
      ) : (
        <>
          {gcdSeriesQuery.isLoading && <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>}
          {submitted && !gcdSeriesQuery.isLoading && seriesList.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">{t('common.noResults')}</div>
          )}
          {seriesList.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {seriesList.map((s) => (
                <GcdSeriesCard key={s.seriesId} series={s} onOpen={() => setSelectedSeries({ gcdSeriesId: s.seriesId, name: s.name })} />
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('library.prevPage')}</Button>
              <span className="text-sm text-muted-foreground">{t('isbndb.pageOf', { page, total: totalPages })}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>{t('library.nextPage')}</Button>
            </div>
          )}
          {!submitted && <div className="text-center py-16 text-muted-foreground"><Library className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">{t('search.emptyState')}</p></div>}
          <GcdSeriesIssuesSheet
            gcdSeriesId={selectedSeries?.gcdSeriesId ?? null}
            seriesName={selectedSeries?.name ?? ''}
            onClose={() => setSelectedSeries(null)}
            onAdded={(id) => onAddGcd(id)}
          />
        </>
      )}
    </div>
  )
}

// ─── Tab: Autores ─────────────────────────────────────────────────────────────

function TabAuthors({ source, addedIds, onAdd, isPending, addedGcdIds, onAddGcd, isPendingGcd }: {
  source: Source; addedIds: Set<string>; onAdd: (b: IsbndbBook) => void; isPending: boolean
  addedGcdIds: Set<string>; onAddGcd: (id: string) => void; isPendingGcd: boolean
}) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // ISBNdb
  const authorsQuery = useQuery({
    queryKey: ['isbndb', 'authors', submitted],
    queryFn: () => isbndbApi.searchAuthors({ q: submitted, pageSize: 30 }),
    enabled: source === 'isbndb' && submitted.trim().length > 0,
  })
  const authorBooksQuery = useQuery({
    queryKey: ['isbndb', 'author-books', selected, page],
    queryFn: () => isbndbApi.getAuthorBooks(selected!, { page, pageSize: 20 }),
    enabled: source === 'isbndb' && selected !== null,
  })

  // GCD
  const gcdQuery = useQuery({
    queryKey: ['gcd', 'creator', submitted, page],
    queryFn: () => gcdApi.search({ creator: submitted, page }),
    enabled: source === 'gcd' && submitted.trim().length > 0,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setSelected(null); setPage(1); setSubmitted(input.trim())
  }

  const gcdComics = gcdQuery.data?.data ?? []
  const gcdTotal = gcdQuery.data?.total ?? 0
  const gcdTotalPages = Math.ceil(gcdTotal / 20)

  return (
    <div className="space-y-4">
      {(source === 'isbndb' ? !selected : true) && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={source === 'gcd' ? t('isbndb.searchAuthorsPlaceholder') : t('isbndb.searchAuthorsPlaceholder')}
            className="flex-1" />
          <Button type="submit" disabled={!input.trim() || (source === 'isbndb' ? authorsQuery.isFetching : gcdQuery.isFetching)}>
            {(source === 'isbndb' ? authorsQuery.isFetching : gcdQuery.isFetching) ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </Button>
        </form>
      )}

      {source === 'isbndb' ? (
        <>
          {!selected && submitted && (
            authorsQuery.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
            ) : authorsQuery.data?.authors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">{t('common.noResults')}</div>
            ) : (
              <div className="space-y-1">
                {(authorsQuery.data?.authors ?? []).map((author) => (
                  <button key={author} onClick={() => { setSelected(author); setPage(1) }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors cursor-pointer flex items-center gap-2">
                    <User className="size-4 text-muted-foreground shrink-0" />{author}
                  </button>
                ))}
              </div>
            )
          )}
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelected(null)}>
                  <ChevronLeft className="size-4" />{t('common.back')}
                </Button>
                <h3 className="font-medium text-sm">{t('isbndb.booksBy', { name: selected })}</h3>
              </div>
              <BookGrid books={authorBooksQuery.data?.books ?? []} addedIds={addedIds} onAdd={onAdd} isPending={isPending} isLoading={authorBooksQuery.isLoading} />
              {(authorBooksQuery.data?.books.length ?? 0) === 20 && (
                <div className="flex justify-center gap-3">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('library.prevPage')}</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>{t('library.nextPage')}</Button>
                </div>
              )}
            </div>
          )}
          {!submitted && !selected && <div className="text-center py-16 text-muted-foreground"><User className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">{t('isbndb.authorsEmptyState')}</p></div>}
        </>
      ) : (
        <>
          {submitted && (
            <>
              {gcdTotal > 0 && <p className="text-xs text-muted-foreground">{t('isbndb.resultCount', { count: gcdTotal })} {t('isbndb.booksBy', { name: submitted })}</p>}
              <GcdIssueGrid comics={gcdComics} addedGcdIds={addedGcdIds} onAdd={onAddGcd} isPending={isPendingGcd} isLoading={gcdQuery.isLoading} />
              {gcdTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('library.prevPage')}</Button>
                  <span className="text-sm text-muted-foreground">{t('isbndb.pageOf', { page, total: gcdTotalPages })}</span>
                  <Button variant="outline" size="sm" disabled={page >= gcdTotalPages} onClick={() => setPage((p) => p + 1)}>{t('library.nextPage')}</Button>
                </div>
              )}
            </>
          )}
          {!submitted && <div className="text-center py-16 text-muted-foreground"><User className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">{t('isbndb.authorsEmptyState')}</p></div>}
        </>
      )}
    </div>
  )
}

// ─── Tab: Editoriales ─────────────────────────────────────────────────────────

function TabPublishers({ source, addedIds, onAdd, isPending, addedGcdIds, onAddGcd, isPendingGcd }: {
  source: Source; addedIds: Set<string>; onAdd: (b: IsbndbBook) => void; isPending: boolean
  addedGcdIds: Set<string>; onAddGcd: (id: string) => void; isPendingGcd: boolean
}) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // ISBNdb
  const pubsQuery = useQuery({
    queryKey: ['isbndb', 'publishers', submitted],
    queryFn: () => isbndbApi.searchPublishers({ q: submitted, pageSize: 30 }),
    enabled: source === 'isbndb' && submitted.trim().length > 0,
  })
  const pubBooksQuery = useQuery({
    queryKey: ['isbndb', 'publisher-books', selected, page],
    queryFn: () => isbndbApi.getPublisherBooks(selected!, { page, pageSize: 20 }),
    enabled: source === 'isbndb' && selected !== null,
  })

  // GCD
  const gcdQuery = useQuery({
    queryKey: ['gcd', 'publisher', submitted, page],
    queryFn: () => gcdApi.search({ publisher: submitted, page }),
    enabled: source === 'gcd' && submitted.trim().length > 0,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setSelected(null); setPage(1); setSubmitted(input.trim())
  }

  const gcdComics = gcdQuery.data?.data ?? []
  const gcdTotal = gcdQuery.data?.total ?? 0
  const gcdTotalPages = Math.ceil(gcdTotal / 20)

  return (
    <div className="space-y-4">
      {(source === 'isbndb' ? !selected : true) && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('isbndb.searchPublishersPlaceholder')} className="flex-1" />
          <Button type="submit" disabled={!input.trim() || (source === 'isbndb' ? pubsQuery.isFetching : gcdQuery.isFetching)}>
            {(source === 'isbndb' ? pubsQuery.isFetching : gcdQuery.isFetching) ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </Button>
        </form>
      )}

      {source === 'isbndb' ? (
        <>
          {!selected && submitted && (
            pubsQuery.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
            ) : pubsQuery.data?.publishers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">{t('common.noResults')}</div>
            ) : (
              <div className="space-y-1">
                {(pubsQuery.data?.publishers ?? []).map((pub) => (
                  <button key={pub} onClick={() => { setSelected(pub); setPage(1) }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors cursor-pointer flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground shrink-0" />{pub}
                  </button>
                ))}
              </div>
            )
          )}
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelected(null)}>
                  <ChevronLeft className="size-4" />{t('common.back')}
                </Button>
                <h3 className="font-medium text-sm">{t('isbndb.booksBy', { name: selected })}</h3>
              </div>
              <BookGrid books={pubBooksQuery.data?.books ?? []} addedIds={addedIds} onAdd={onAdd} isPending={isPending} isLoading={pubBooksQuery.isLoading} />
              {(pubBooksQuery.data?.books.length ?? 0) === 20 && (
                <div className="flex justify-center gap-3">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('library.prevPage')}</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>{t('library.nextPage')}</Button>
                </div>
              )}
            </div>
          )}
          {!submitted && !selected && <div className="text-center py-16 text-muted-foreground"><Building2 className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">{t('isbndb.publishersEmptyState')}</p></div>}
        </>
      ) : (
        <>
          {submitted && (
            <>
              {gcdTotal > 0 && <p className="text-xs text-muted-foreground">{t('isbndb.resultCount', { count: gcdTotal })}</p>}
              <GcdIssueGrid comics={gcdComics} addedGcdIds={addedGcdIds} onAdd={onAddGcd} isPending={isPendingGcd} isLoading={gcdQuery.isLoading} />
              {gcdTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('library.prevPage')}</Button>
                  <span className="text-sm text-muted-foreground">{t('isbndb.pageOf', { page, total: gcdTotalPages })}</span>
                  <Button variant="outline" size="sm" disabled={page >= gcdTotalPages} onClick={() => setPage((p) => p + 1)}>{t('library.nextPage')}</Button>
                </div>
              )}
            </>
          )}
          {!submitted && <div className="text-center py-16 text-muted-foreground"><Building2 className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">{t('isbndb.publishersEmptyState')}</p></div>}
        </>
      )}
    </div>
  )
}

// ─── Tab: Temas / Series (GCD) ────────────────────────────────────────────────

function TabSubjects({ source, addedIds, onAdd, isPending, addedGcdIds, onAddGcd, isPendingGcd: _isPendingGcd }: {
  source: Source; addedIds: Set<string>; onAdd: (b: IsbndbBook) => void; isPending: boolean
  addedGcdIds: Set<string>; onAddGcd: (id: string) => void; isPendingGcd: boolean
}) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedSeries, setSelectedSeries] = useState<{ gcdSeriesId: number; name: string } | null>(null)
  const [page, setPage] = useState(1)

  // ISBNdb
  const subjectsQuery = useQuery({
    queryKey: ['isbndb', 'subjects', submitted],
    queryFn: () => isbndbApi.searchSubjects({ q: submitted, pageSize: 30 }),
    enabled: source === 'isbndb' && submitted.trim().length > 0,
  })
  const subjectBooksQuery = useQuery({
    queryKey: ['isbndb', 'subject-books', selected, page],
    queryFn: () => isbndbApi.getSubjectBooks(selected!, { page, pageSize: 20 }),
    enabled: source === 'isbndb' && selected !== null,
  })

  // GCD series
  const gcdSeriesQuery = useQuery({
    queryKey: ['gcd', 'series-tab', submitted, page],
    queryFn: () => gcdApi.searchSeries({ q: submitted, page }),
    enabled: source === 'gcd' && submitted.trim().length > 0,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setSelected(null); setPage(1); setSubmitted(input.trim())
  }

  const gcdSeries = gcdSeriesQuery.data?.data ?? []
  const gcdTotalPages = Math.ceil((gcdSeriesQuery.data?.total ?? 0) / 20)

  return (
    <div className="space-y-4">
      {(source === 'isbndb' ? !selected : true) && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={source === 'gcd' ? t('search.inputPlaceholder') : t('isbndb.searchSubjectsPlaceholder')}
            className="flex-1" />
          <Button type="submit" disabled={!input.trim() || (source === 'isbndb' ? subjectsQuery.isFetching : gcdSeriesQuery.isFetching)}>
            {(source === 'isbndb' ? subjectsQuery.isFetching : gcdSeriesQuery.isFetching) ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </Button>
        </form>
      )}

      {source === 'isbndb' ? (
        <>
          {!selected && submitted && (
            subjectsQuery.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
            ) : subjectsQuery.data?.subjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">{t('common.noResults')}</div>
            ) : (
              <div className="space-y-1">
                {(subjectsQuery.data?.subjects ?? []).map((subject) => (
                  <button key={subject} onClick={() => { setSelected(subject); setPage(1) }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors cursor-pointer flex items-center gap-2">
                    <Tag className="size-4 text-muted-foreground shrink-0" />{subject}
                  </button>
                ))}
              </div>
            )
          )}
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelected(null)}>
                  <ChevronLeft className="size-4" />{t('common.back')}
                </Button>
                <h3 className="font-medium text-sm">{t('isbndb.booksBy', { name: selected })}</h3>
              </div>
              <BookGrid books={subjectBooksQuery.data?.books ?? []} addedIds={addedIds} onAdd={onAdd} isPending={isPending} isLoading={subjectBooksQuery.isLoading} />
              {(subjectBooksQuery.data?.books.length ?? 0) === 20 && (
                <div className="flex justify-center gap-3">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('library.prevPage')}</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>{t('library.nextPage')}</Button>
                </div>
              )}
            </div>
          )}
          {!submitted && !selected && <div className="text-center py-16 text-muted-foreground"><Tag className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">{t('isbndb.subjectsEmptyState')}</p></div>}
        </>
      ) : (
        <>
          {gcdSeriesQuery.isLoading && <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>}
          {submitted && !gcdSeriesQuery.isLoading && gcdSeries.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">{t('common.noResults')}</div>
          )}
          {gcdSeries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gcdSeries.map((s) => (
                <GcdSeriesCard key={s.seriesId} series={s} onOpen={() => setSelectedSeries({ gcdSeriesId: s.seriesId, name: s.name })} />
              ))}
            </div>
          )}
          {gcdTotalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('library.prevPage')}</Button>
              <span className="text-sm text-muted-foreground">{t('isbndb.pageOf', { page, total: gcdTotalPages })}</span>
              <Button variant="outline" size="sm" disabled={page >= gcdTotalPages} onClick={() => setPage((p) => p + 1)}>{t('library.nextPage')}</Button>
            </div>
          )}
          {!submitted && <div className="text-center py-16 text-muted-foreground"><Library className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">{t('search.emptyState')}</p></div>}
          <GcdSeriesIssuesSheet
            gcdSeriesId={selectedSeries?.gcdSeriesId ?? null}
            seriesName={selectedSeries?.name ?? ''}
            onClose={() => setSelectedSeries(null)}
            onAdded={(id) => onAddGcd(id)}
          />
        </>
      )}
    </div>
  )
}

// ─── Tab: Estadísticas ────────────────────────────────────────────────────────

function TabStats({ source }: { source: Source }) {
  const { t } = useTranslation()

  const statsQuery = useQuery({
    queryKey: ['isbndb', 'stats'],
    queryFn: () => isbndbApi.getStats(),
    staleTime: 1000 * 60 * 10,
    enabled: source === 'isbndb',
  })

  if (source === 'gcd') {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <BarChart3 className="size-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{t('isbndb.statsGcdNote')}</p>
      </div>
    )
  }

  const stats = statsQuery.data
  const items = [
    { label: t('isbndb.statsBooks'), value: stats?.books },
    { label: t('isbndb.statsAuthors'), value: stats?.authors },
    { label: t('isbndb.statsPublishers'), value: stats?.publishers },
    { label: t('isbndb.statsSubjects'), value: stats?.subjects },
  ]

  return (
    <div className="space-y-4">
      {statsQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : statsQuery.isError ? (
        <div className="text-center py-8 text-muted-foreground text-sm">{t('common.error')}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(({ label, value }) => (
            <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold mt-1">{value !== undefined ? value.toLocaleString() : '—'}</p></CardContent></Card>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground text-center">{t('isbndb.statsHint')}</p>
    </div>
  )
}

// ─── Tabs definition ──────────────────────────────────────────────────────────

const TABS: { id: TabId; isbndbLabel: string; gcdLabel: string; Icon: React.ElementType }[] = [
  { id: 'books',      isbndbLabel: 'isbndb.tabBooks',      gcdLabel: 'search.tabIssues',      Icon: BookOpen  },
  { id: 'isbn',       isbndbLabel: 'isbndb.tabIsbn',       gcdLabel: 'search.tabSeries',      Icon: Barcode   },
  { id: 'authors',    isbndbLabel: 'isbndb.tabAuthors',    gcdLabel: 'isbndb.tabAuthors',     Icon: User      },
  { id: 'publishers', isbndbLabel: 'isbndb.tabPublishers', gcdLabel: 'isbndb.tabPublishers',  Icon: Building2 },
  { id: 'subjects',   isbndbLabel: 'isbndb.tabSubjects',   gcdLabel: 'search.tabSeriesBrowse',Icon: Tag       },
  { id: 'stats',      isbndbLabel: 'isbndb.tabStats',      gcdLabel: 'isbndb.tabStats',       Icon: BarChart3 },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SearchPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [source, setSource] = useState<Source>('isbndb')
  const [activeTab, setActiveTab] = useState<TabId>('books')
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [addedGcdIds, setAddedGcdIds] = useState<Set<string>>(new Set())
  const [createManualOpen, setCreateManualOpen] = useState(false)

  // Multi-select — ISBNdb
  const [isSelectingIsbn, setIsSelectingIsbn] = useState(false)
  const [selectedIsbnBooks, setSelectedIsbnBooks] = useState<Map<string, IsbndbBook>>(new Map())
  const [addToCollectionIsbnOpen, setAddToCollectionIsbnOpen] = useState(false)

  function toggleIsbnSelect(book: IsbndbBook) {
    const isbn = getIsbn(book)
    setSelectedIsbnBooks((prev) => {
      const n = new Map(prev)
      n.has(isbn) ? n.delete(isbn) : n.set(isbn, book)
      return n
    })
  }

  function exitIsbnSelecting() {
    setIsSelectingIsbn(false)
    setSelectedIsbnBooks(new Map())
  }

  async function handleAddIsbnToCollection(collectionId: string) {
    const comicIds: string[] = []
    for (const [, book] of selectedIsbnBooks) {
      try {
        const { comic } = await isbndbApi.import(book)
        try { await libraryApi.add({ comicId: comic.id, isOwned: true }) }
        catch (err: unknown) { if ((err as { response?: { status?: number } })?.response?.status !== 409) throw err }
        comicIds.push(comic.id)
        setAddedIds((prev) => new Set(prev).add(getIsbn(book)))
      } catch { /* continue */ }
    }
    await Promise.all(comicIds.map((id) => collectionsApi.addComic(collectionId, id).catch(() => {})))
    queryClient.invalidateQueries({ queryKey: ['library'] })
    queryClient.invalidateQueries({ queryKey: ['collections'] })
    toast.success(t('collections.addMultipleSuccess', { count: comicIds.length }))
    exitIsbnSelecting()
  }

  // Multi-select — GCD
  const [isSelectingGcd, setIsSelectingGcd] = useState(false)
  const [selectedGcdIds, setSelectedGcdIds] = useState<Set<string>>(new Set())
  const [addToCollectionGcdOpen, setAddToCollectionGcdOpen] = useState(false)

  function toggleGcdSelect(id: string) {
    setSelectedGcdIds((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function exitGcdSelecting() {
    setIsSelectingGcd(false)
    setSelectedGcdIds(new Set())
  }

  async function handleAddGcdToCollection(collectionId: string) {
    const comicIds: string[] = []
    for (const externalId of selectedGcdIds) {
      try {
        const { comic } = await gcdApi.import(externalId)
        try { await libraryApi.add({ comicId: comic.id, isOwned: true }) }
        catch (err: unknown) { if ((err as { response?: { status?: number } })?.response?.status !== 409) throw err }
        comicIds.push(comic.id)
        setAddedGcdIds((prev) => new Set(prev).add(externalId))
      } catch { /* continue */ }
    }
    await Promise.all(comicIds.map((id) => collectionsApi.addComic(collectionId, id).catch(() => {})))
    queryClient.invalidateQueries({ queryKey: ['library'] })
    queryClient.invalidateQueries({ queryKey: ['collections'] })
    toast.success(t('collections.addMultipleSuccess', { count: comicIds.length }))
    exitGcdSelecting()
  }

  // ISBNdb import
  const importMutation = useMutation({
    mutationFn: async (book: IsbndbBook) => {
      const { comic } = await isbndbApi.import(book)
      try { await libraryApi.add({ comicId: comic.id, isOwned: true }) }
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

  // GCD import
  const importGcdMutation = useMutation({
    mutationFn: async (externalId: string) => {
      const { comic } = await gcdApi.import(externalId)
      try { await libraryApi.add({ comicId: comic.id, isOwned: true }) }
      catch (err: unknown) { if ((err as { response?: { status?: number } })?.response?.status !== 409) throw err }
      return externalId
    },
    onSuccess: (externalId) => {
      setAddedGcdIds((prev) => new Set(prev).add(externalId))
      toast.success(t('isbndb.addSuccess'))
      queryClient.invalidateQueries({ queryKey: ['library'] })
    },
    onError: () => toast.error(t('isbndb.addError')),
  })

  const tabProps = {
    source,
    addedIds,
    onAdd: (b: IsbndbBook) => importMutation.mutate(b),
    isPending: importMutation.isPending,
    addedGcdIds,
    onAddGcd: (id: string) => importGcdMutation.mutate(id),
    isPendingGcd: importGcdMutation.isPending,
    selectedGcdIds: isSelectingGcd ? selectedGcdIds : undefined,
    onToggleGcdSelect: isSelectingGcd ? toggleGcdSelect : undefined,
    selectedIsbnIds: isSelectingIsbn ? new Set(selectedIsbnBooks.keys()) : undefined,
    onToggleIsbnSelect: isSelectingIsbn ? toggleIsbnSelect : undefined,
    onCreateManual: () => setCreateManualOpen(true),
  }

  return (
    <PageContainer size="narrow" className="space-y-6">
      {/* Header + source selector */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t('search.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('search.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setCreateManualOpen(true)}
          >
            <PenLine className="size-4" />
            {t('search.createManual.trigger')}
          </Button>
          {activeTab === 'books' && (
            <Button
              variant={(source === 'isbndb' ? isSelectingIsbn : isSelectingGcd) ? 'secondary' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => {
                if (source === 'isbndb') { if (isSelectingIsbn) exitIsbnSelecting(); else setIsSelectingIsbn(true) }
                else { if (isSelectingGcd) exitGcdSelecting(); else setIsSelectingGcd(true) }
              }}
            >
              <CheckSquare className="size-4" />
              {(source === 'isbndb' ? isSelectingIsbn : isSelectingGcd) ? t('common.cancel') : t('library.selectMode')}
            </Button>
          )}
          <div className="flex gap-1 p-1 rounded-lg bg-muted">
            {(['isbndb', 'gcd'] as Source[]).map((s) => (
              <button
                key={s}
                onClick={() => { setSource(s); exitGcdSelecting(); exitIsbnSelecting() }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  source === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === 'isbndb' ? 'ISBNdb' : 'GCD'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b pb-0">
        {TABS.map(({ id, isbndbLabel, gcdLabel, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md border-b-2 transition-colors cursor-pointer ${
              activeTab === id
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            <Icon className="size-3.5" />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {t((source === 'isbndb' ? isbndbLabel : gcdLabel) as any)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'books'      && <TabBooks      {...tabProps} />}
        {activeTab === 'isbn'       && <TabIsbn       {...tabProps} />}
        {activeTab === 'authors'    && <TabAuthors    {...tabProps} />}
        {activeTab === 'publishers' && <TabPublishers {...tabProps} />}
        {activeTab === 'subjects'   && <TabSubjects   {...tabProps} />}
        {activeTab === 'stats'      && <TabStats      source={source} />}
      </div>

      {/* Multi-select action bar — ISBNdb */}
      {isSelectingIsbn && selectedIsbnBooks.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-background border shadow-xl">
          <span className="text-sm font-medium">
            {t('library.selectedCount', { count: selectedIsbnBooks.size })}
          </span>
          <Button size="sm" className="gap-1.5" onClick={() => setAddToCollectionIsbnOpen(true)}>
            <Folders className="size-3.5" />
            {t('library.addToCollection')}
          </Button>
          <Button variant="ghost" size="sm" onClick={exitIsbnSelecting}>
            {t('common.cancel')}
          </Button>
        </div>
      )}

      {/* Multi-select action bar — GCD */}
      {isSelectingGcd && selectedGcdIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-background border shadow-xl">
          <span className="text-sm font-medium">
            {t('library.selectedCount', { count: selectedGcdIds.size })}
          </span>
          <Button size="sm" className="gap-1.5" onClick={() => setAddToCollectionGcdOpen(true)}>
            <Folders className="size-3.5" />
            {t('library.addToCollection')}
          </Button>
          <Button variant="ghost" size="sm" onClick={exitGcdSelecting}>
            {t('common.cancel')}
          </Button>
        </div>
      )}

      <AddToCollectionDialog
        open={addToCollectionIsbnOpen}
        onClose={() => setAddToCollectionIsbnOpen(false)}
        count={selectedIsbnBooks.size}
        onConfirm={handleAddIsbnToCollection}
      />
      <AddToCollectionDialog
        open={addToCollectionGcdOpen}
        onClose={() => setAddToCollectionGcdOpen(false)}
        count={selectedGcdIds.size}
        onConfirm={handleAddGcdToCollection}
      />
      <CreateManualComicSheet
        open={createManualOpen}
        onOpenChange={setCreateManualOpen}
      />
    </PageContainer>
  )
}

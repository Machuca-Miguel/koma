import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Plus, X, Star, BookMarked, BookOpen,
  Bookmark, HandHelping, Pencil, Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { Dialog as ModalPrimitive } from '@base-ui/react/dialog'
import { comicsApi } from '@/api/comics'
import { libraryApi } from '@/api/library'
import type { IsbndbBook } from '@/api/isbndb'
import type { BindingFormat } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AutocompleteInput } from '@/components/ui/autocomplete-input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ─── Types ────────────────────────────────────────────────────────────────────

type CollectionStatusKey = 'IN_COLLECTION' | 'WISHLIST' | 'LOANED'
type ReadStatusKey = 'READ' | 'READING' | 'TO_READ'

// ─── Constants ────────────────────────────────────────────────────────────────

const BINDING_OPTIONS: BindingFormat[] = ['CARTONE', 'TAPA_BLANDA', 'BOLSILLO', 'OMNIBUS', 'HARDCOVER', 'SOFTCOVER', 'DIGITAL', 'OTHER']

function mapBinding(raw: string | undefined): BindingFormat | '' {
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (lower.includes('carton')) return 'CARTONE'
  if (lower.includes('hard')) return 'HARDCOVER'
  if (lower.includes('soft')) return 'SOFTCOVER'
  if (lower.includes('paper') || lower.includes('trade')) return 'TAPA_BLANDA'
  if (lower.includes('pocket') || lower.includes('bolsillo')) return 'BOLSILLO'
  if (lower.includes('omni')) return 'OMNIBUS'
  if (lower.includes('digital') || lower.includes('ebook')) return 'DIGITAL'
  if (lower.includes('other')) return 'OTHER'
  return ''
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getYear(book: IsbndbBook) {
  if (!book.date_published) return undefined
  const y = parseInt(book.date_published.slice(0, 4), 10)
  return isNaN(y) ? undefined : y
}

const COLLECTION_STATUS_OPTIONS: { key: CollectionStatusKey; labelKey: string; Icon: React.ElementType }[] = [
  { key: 'IN_COLLECTION', labelKey: 'status.IN_COLLECTION', Icon: BookMarked  },
  { key: 'WISHLIST',      labelKey: 'status.WISHLIST',      Icon: Bookmark    },
  { key: 'LOANED',        labelKey: 'status.LOANED',        Icon: HandHelping },
]

const READ_STATUS_OPTIONS: { key: ReadStatusKey; labelKey: string; Icon: React.ElementType }[] = [
  { key: 'READ',    labelKey: 'status.READ',    Icon: BookOpen   },
  { key: 'READING', labelKey: 'status.READING', Icon: Eye        },
  { key: 'TO_READ', labelKey: 'status.TO_READ', Icon: BookMarked },
]

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`size-6 transition-colors ${
              n <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

// ─── Tags Confirmator ─────────────────────────────────────────────────────────

function TagsConfirmator({
  activeTags, onChange,
}: {
  activeTags: string[]
  onChange: (tags: string[]) => void
}) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const { data: existingTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: comicsApi.getTags,
    staleTime: 60_000,
  })
  const suggestions = existingTags
    .map((tag) => tag.name)
    .filter((n) => n.toLowerCase().includes(input.toLowerCase()) && !activeTags.includes(n))
    .slice(0, 5)

  function addTag(name: string) {
    const trimmed = name.trim()
    if (trimmed && !activeTags.includes(trimmed)) onChange([...activeTags, trimmed])
    setInput('')
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{t('comicDetail.tags')}</label>
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {activeTags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs">
            {tag}
            <button type="button" onClick={() => onChange(activeTags.filter((t) => t !== tag))} className="hover:text-destructive rounded-sm">
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        {activeTags.length === 0 && (
          <span className="text-xs text-muted-foreground">{t('common.noResults')}</span>
        )}
      </div>
      <div className="relative">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(input) } }}
          placeholder={t('comicDetail.addTag')}
          className="h-8 text-xs pr-8"
        />
        {input && (
          <button type="button" onMouseDown={() => addTag(input)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <Plus className="size-3.5" />
          </button>
        )}
        {suggestions.length > 0 && input && (
          <ul className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md text-xs overflow-hidden">
            {suggestions.map((s) => (
              <li key={s}>
                <button type="button" onMouseDown={() => addTag(s)}
                  className="w-full text-left px-3 py-1.5 hover:bg-accent">
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AddToSheet({ book, open, onClose, noNavigate }: {
  book: IsbndbBook
  open: boolean
  onClose: () => void
  noNavigate?: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Cover
  const [coverUrl, setCoverUrl] = useState(book.image ?? '')
  const [editingCover, setEditingCover] = useState(false)

  // Credits
  const [scriptwriter, setScriptwriter] = useState('')
  const [artist, setArtist] = useState('')
  const [publisher, setPublisher] = useState(book.publisher ?? '')

  // Binding
  const [binding, setBinding] = useState<BindingFormat | ''>(() => mapBinding(book.binding))

  // Status
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatusKey>('IN_COLLECTION')
  const [readStatus, setReadStatus] = useState<ReadStatusKey | null>(null)
  const [loanedTo, setLoanedTo] = useState('')

  // Tags
  const initialTags = useMemo(() => book.subjects?.filter((s) => s.toLowerCase() !== 'subjects').slice(0, 5) ?? [], [book.subjects])
  const [activeTags, setActiveTags] = useState<string[]>(initialTags)

  // Rating
  const [rating, setRating] = useState(0)

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: libraryData } = useQuery({
    queryKey: ['library'],
    queryFn: () => libraryApi.getAll({ limit: 200 }),
    enabled: open,
    staleTime: 60_000,
  })

  const libraryComics = libraryData?.data ?? []

  const scriptwriterSuggestions = useMemo(() =>
    [...new Set(libraryComics.map((uc) => uc.comic.scriptwriter).filter(Boolean) as string[])],
    [libraryComics]
  )
  const artistSuggestions = useMemo(() =>
    [...new Set(libraryComics.map((uc) => uc.comic.artist).filter(Boolean) as string[])],
    [libraryComics]
  )
  const publisherSuggestions = useMemo(() =>
    [...new Set(libraryComics.map((uc) => uc.comic.publisher).filter(Boolean) as string[])],
    [libraryComics]
  )

  // ── Reset ─────────────────────────────────────────────────────────────────

  function handleClose() {
    setCoverUrl(book.image ?? '')
    setEditingCover(false)
    setScriptwriter('')
    setArtist('')
    setPublisher(book.publisher ?? '')
    setBinding(mapBinding(book.binding))
    setCollectionStatus('IN_COLLECTION')
    setReadStatus(null)
    setLoanedTo('')
    setActiveTags(initialTags)
    setRating(0)
    onClose()
  }

  // ── Mutation ──────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      const displayIsbn = book.isbn13 ?? book.isbn

      // Deduplicate by ISBN
      let comic = null
      if (displayIsbn) {
        const found = await comicsApi.findByIsbn(displayIsbn)
        if (found.total > 0) {
          comic = found.data[0]
          toast.info(t('isbndb.existingComicReused'))
        }
      }
      if (!comic) {
        comic = await comicsApi.create({
          title: book.title,
          publisher: publisher.trim() || undefined,
          year: getYear(book),
          synopsis: book.synopsis ?? book.overview ?? undefined,
          coverUrl: coverUrl.trim() || undefined,
          isbn: displayIsbn,
          binding: (binding as BindingFormat) || undefined,
          scriptwriter: scriptwriter.trim() || undefined,
          artist: artist.trim() || undefined,
          authors: book.authors?.join(', ') || undefined,
        })
      }

      // Add to library (ignore 409 duplicate)
      try {
        await libraryApi.add({
          comicId: comic.id,
          collectionStatus,
          rating: rating || undefined,
        })
      } catch (err: unknown) {
        if ((err as { response?: { status?: number } })?.response?.status !== 409) throw err
      }

      // Patch read status and loanedTo if needed
      const patchData: Parameters<typeof libraryApi.update>[1] = {}
      if (readStatus) patchData.readStatus = readStatus
      if (collectionStatus === 'LOANED' && loanedTo.trim()) patchData.loanedTo = loanedTo.trim()
      if (Object.keys(patchData).length > 0) {
        await libraryApi.update(comic.id, patchData)
      }

      // Tags
      await Promise.all(activeTags.map((name) => comicsApi.addTag(comic.id, name).catch(() => {})))

      return comic
    },
    onSuccess: (comic) => {
      qc.invalidateQueries({ queryKey: ['library'] })
      qc.invalidateQueries({ queryKey: ['library-stats'] })
      toast.success(t('search.createManual.success'))
      handleClose()
      if (!noNavigate) navigate(`/comics/${comic.id}`)
    },
    onError: () => toast.error(t('search.createManual.error')),
  })

  const canSubmit = !saveMutation.isPending

  // ── Render ────────────────────────────────────────────────────────────────

  const sheetTitle = t('addSheet.title')

  return (
    <ModalPrimitive.Root open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <ModalPrimitive.Portal>

        {/* Backdrop with blur */}
        <ModalPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 supports-backdrop-filter:backdrop-blur-sm data-starting-style:opacity-0 data-ending-style:opacity-0 duration-200" />

        {/* Modal window */}
        <ModalPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-5xl max-h-[90vh] rounded-2xl bg-background shadow-2xl ring-1 ring-foreground/10 overflow-hidden flex flex-col md:flex-row outline-none data-starting-style:opacity-0 data-ending-style:opacity-0 data-starting-style:scale-95 data-ending-style:scale-95 duration-150">

          {/* ── Left panel: cover + raw metadata (desktop only) ── */}
          <div className="hidden md:flex md:w-5/12 bg-muted/30 border-r border-border flex-col gap-5 p-8 overflow-y-auto shrink-0">

            {/* Large cover */}
            <div
              className="relative aspect-[2/3] w-full max-w-[200px] mx-auto rounded-xl overflow-hidden bg-muted cursor-pointer group shadow-lg"
              onClick={() => setEditingCover((v) => !v)}
            >
              {coverUrl ? (
                <img src={coverUrl} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="size-8 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <Pencil className="size-4 text-white" />
              </div>
            </div>
            {editingCover && (
              <Input
                autoFocus
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://..."
                className="h-8 text-xs"
              />
            )}

            {/* Source badge */}
            <span className="self-start bg-muted px-2.5 py-1 rounded-md text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
              Source: ISBNdb
            </span>

            {/* Raw metadata */}
            <div className="space-y-4">
              {book.authors && book.authors.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Authors</p>
                  <div className="flex flex-wrap gap-1.5">
                    {book.authors.map((a) => (
                      <span key={a} className="bg-background border border-border px-2.5 py-1 rounded-md text-xs">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Title</p>
                <p className="text-sm font-medium leading-snug">{book.title}</p>
              </div>
              {(book.isbn13 || book.isbn) && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">ISBN</p>
                  <p className="font-mono text-xs text-muted-foreground">{book.isbn13 ?? book.isbn}</p>
                </div>
              )}
              {(book.binding || book.pages) && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Format</p>
                  <p className="text-xs text-muted-foreground">
                    {[book.binding, book.pages ? t('isbndb.pages', { count: book.pages }) : undefined].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right panel: form ── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">

            {/* Header */}
            <div className="sheet-header flex items-center justify-between">
              <p className="text-lg font-semibold">{sheetTitle}</p>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground -mr-1"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="sheet-body">

              {/* ── Mobile cover (hidden on desktop) ────────────── */}
              <div className="flex gap-4 items-start md:hidden">
                <div
                  className="relative shrink-0 w-20 h-28 rounded-lg overflow-hidden bg-muted cursor-pointer group"
                  onClick={() => setEditingCover((v) => !v)}
                >
                  {coverUrl ? (
                    <img src={coverUrl} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="size-6 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Pencil className="size-4 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-semibold text-sm leading-snug line-clamp-3">{book.title}</p>
                  {book.publisher && <p className="text-xs text-muted-foreground">{book.publisher}</p>}
                  {editingCover && (
                    <Input
                      autoFocus
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      placeholder="https://..."
                      className="h-8 text-xs mt-2"
                    />
                  )}
                </div>
              </div>

              {/* ── Grupo 1: Estado de colección ─────────────────── */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('comicDetail.collectionStatusLabel')}</p>
                <div className="flex flex-wrap gap-2">
                  {COLLECTION_STATUS_OPTIONS.map(({ key, labelKey, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCollectionStatus(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        collectionStatus === key
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {t(labelKey as `status.${string}`)}
                    </button>
                  ))}
                </div>
                {collectionStatus === 'LOANED' && (
                  <Input
                    value={loanedTo}
                    onChange={(e) => setLoanedTo(e.target.value)}
                    placeholder={t('comicDetail.loanedToPlaceholder')}
                    className="h-8 text-sm"
                  />
                )}
              </div>

              {/* ── Grupo 2: Estado de lectura ───────────────────── */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('comicDetail.readStatusLabel')}</p>
                <div className="flex flex-wrap gap-2">
                  {READ_STATUS_OPTIONS.map(({ key, labelKey, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setReadStatus(readStatus === key ? null : key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        readStatus === key
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {t(labelKey as `status.${string}`)}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* ── Credits ─────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <AutocompleteInput
                  label={t('comicDetail.scriptwriter')}
                  value={scriptwriter}
                  onChange={setScriptwriter}
                  suggestions={scriptwriterSuggestions}
                  placeholder={t('comicDetail.scriptwriterPlaceholder')}
                />
                <AutocompleteInput
                  label={t('comicDetail.artist')}
                  value={artist}
                  onChange={setArtist}
                  suggestions={artistSuggestions}
                  placeholder={t('comicDetail.artistPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <AutocompleteInput
                  label={t('comicDetail.publisher')}
                  value={publisher}
                  onChange={setPublisher}
                  suggestions={publisherSuggestions}
                  placeholder={t('comicDetail.publisherPlaceholder')}
                />
                {/* Binding */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t('search.createManual.fields.binding')}</label>
                  <Select
                    value={binding || '__none__'}
                    onValueChange={(v) => setBinding(v === '__none__' ? '' : v as BindingFormat)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue>
                        {binding ? t(`binding.${binding}` as `binding.${BindingFormat}`) : t('common.select')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t('common.select')}</SelectItem>
                      {BINDING_OPTIONS.map((binding) => (
                        <SelectItem key={binding} value={binding}>{t(`binding.${binding}` as `binding.${BindingFormat}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* ── Tags ────────────────────────────────────────── */}
              <TagsConfirmator activeTags={activeTags} onChange={setActiveTags} />

              <Separator />

              {/* ── Rating ──────────────────────────────────────── */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t('comicDetail.rating')}</label>
                <StarRating value={rating} onChange={setRating} />
              </div>

            </div>

            {/* Footer */}
            <div className="sheet-footer">
              <Button variant="outline" size="xl" onClick={handleClose} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button
                size="xl"
                className="flex-1"
                disabled={!canSubmit}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? t('common.saving') : t('isbndb.addToLibrary')}
              </Button>
            </div>
          </div>

        </ModalPrimitive.Popup>
      </ModalPrimitive.Portal>
    </ModalPrimitive.Root>
  )
}

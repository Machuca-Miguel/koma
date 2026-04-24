import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Check, Plus, Search, X, Star, BookMarked, BookOpen,
  Bookmark, HandHelping, Pencil, ChevronDown, ChevronRight, Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { comicsApi } from '@/api/comics'
import { libraryApi } from '@/api/library'
import { collectionsApi } from '@/api/collections'
import { collectionSeriesApi } from '@/api/collection-series'
import type { IsbndbBook } from '@/api/isbndb'
import type { BindingFormat } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'

// ─── Types ────────────────────────────────────────────────────────────────────

type CollectionStatusKey = 'IN_COLLECTION' | 'WISHLIST' | 'LOANED'
type ReadStatusKey = 'READ' | 'READING' | 'TO_READ'

export interface AddCollectionTarget {
  collectionId: string
  collectionName: string
}

interface Props {
  book: IsbndbBook
  open: boolean
  onClose: () => void
  defaultTarget: 'library' | AddCollectionTarget
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getYear(book: IsbndbBook) {
  if (!book.date_published) return undefined
  const y = parseInt(book.date_published.slice(0, 4), 10)
  return isNaN(y) ? undefined : y
}

const COLLECTION_STATUS_OPTIONS: { key: CollectionStatusKey; labelKey: `status.${CollectionStatusKey}`; Icon: React.ElementType }[] = [
  { key: 'IN_COLLECTION', labelKey: 'status.IN_COLLECTION', Icon: BookMarked  },
  { key: 'WISHLIST',      labelKey: 'status.WISHLIST',      Icon: Bookmark    },
  { key: 'LOANED',        labelKey: 'status.LOANED',        Icon: HandHelping },
]

const READ_STATUS_OPTIONS: { key: ReadStatusKey; labelKey: `status.${ReadStatusKey}`; Icon: React.ElementType }[] = [
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

// ─── Autocomplete Input ───────────────────────────────────────────────────────

function AutocompleteInput({
  value, onChange, suggestions, placeholder, label,
}: {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
  label: string
}) {
  const [show, setShow] = useState(false)
  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value
  ).slice(0, 6)

  return (
    <div className="space-y-1.5 relative">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setShow(true) }}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 150)}
        placeholder={placeholder}
        className="h-9"
      />
      {show && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md text-sm overflow-hidden">
          {filtered.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={() => { onChange(s); setShow(false) }}
                className="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
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
    .map((t) => t.name)
    .filter((n) => n.toLowerCase().includes(input.toLowerCase()) && !activeTags.includes(n))
    .slice(0, 5)

  function addTag(name: string) {
    const trimmed = name.trim()
    if (trimmed && !activeTags.includes(trimmed)) {
      onChange([...activeTags, trimmed])
    }
    setInput('')
  }

  function removeTag(name: string) {
    onChange(activeTags.filter((t) => t !== name))
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{t('comicDetail.tags')}</label>
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {activeTags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive rounded-sm">
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
          <button
            type="button"
            onMouseDown={() => addTag(input)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </button>
        )}
        {suggestions.length > 0 && input && (
          <ul className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md text-xs overflow-hidden">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={() => { addTag(s) }}
                  className="w-full text-left px-3 py-1.5 hover:bg-accent"
                >
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

export function AddCollectionBottomSheet({ book, open, onClose, defaultTarget }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Cover
  const [coverUrl, setCoverUrl] = useState(book.image ?? '')
  const [editingCover, setEditingCover] = useState(false)

  // Credits
  const [scriptwriter, setScriptwriter] = useState('')
  const [artist, setArtist]             = useState('')

  // Publisher (normalized)
  const [publisher, setPublisher] = useState(book.publisher ?? '')

  // Status
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatusKey>('IN_COLLECTION')
  const [readStatus, setReadStatus] = useState<ReadStatusKey | null>(null)
  const [loanedTo, setLoanedTo] = useState('')

  // Tags
  const initialTags = useMemo(() => book.subjects?.slice(0, 8) ?? [], [book.subjects])
  const [activeTags, setActiveTags] = useState<string[]>(initialTags)

  // Rating
  const [rating, setRating] = useState(0)

  // Series selection (only when target is a collection)
  const [seriesId, setSeriesId] = useState<string | null>(null)
  const [seriesSearch, setSeriesSearch] = useState('')
  const [creatingNewSeries, setCreatingNewSeries] = useState(false)
  const [newSeriesName, setNewSeriesName] = useState('')
  const [showSeriesSelector, setShowSeriesSelector] = useState(false)

  const isCollection = defaultTarget !== 'library'
  const targetCollection = isCollection ? (defaultTarget as AddCollectionTarget) : null

  // Extract autocomplete candidates from library cache
  const { data: libraryData } = useQuery({
    queryKey: ['library'],
    queryFn: () => libraryApi.getAll({ limit: 200 }),
    enabled: open,
    staleTime: 60_000,
  })

  const libraryComics = libraryData?.data ?? []

  const scriptwriterSuggestions = [...new Set(libraryComics.map((uc) => uc.comic.scriptwriter).filter(Boolean) as string[])]
  const artistSuggestions = [...new Set(libraryComics.map((uc) => uc.comic.artist).filter(Boolean) as string[])]
  const publisherSuggestions = [...new Set(libraryComics.map((uc) => uc.comic.publisher).filter(Boolean) as string[])]

  // Series (CollectionSeries) dentro de la colección destino
  const { data: collectionSeries = [] } = useQuery({
    queryKey: ['collection-series', targetCollection?.collectionId],
    queryFn: () => collectionSeriesApi.getByCollection(targetCollection!.collectionId),
    enabled: open && isCollection,
  })

  const filteredSeries = collectionSeries.filter((s) =>
    seriesSearch ? s.name.toLowerCase().includes(seriesSearch.toLowerCase()) : true
  )

  const selectedSeriesName = seriesId
    ? (collectionSeries.find((s) => s.id === seriesId)?.name ?? seriesId)
    : creatingNewSeries && newSeriesName
    ? newSeriesName
    : null

  // Submit button label
  const submitLabel = (() => {
    if (defaultTarget === 'library') return t('isbndb.addToLibrary')
    const colName = (defaultTarget as AddCollectionTarget).collectionName
    if (selectedSeriesName) return t('addSheet.addToSeriesInCollection', { series: selectedSeriesName, collection: colName })
    return t('addSheet.addToCollection', { collection: colName })
  })()

  function handleClose() {
    // Reset state
    setCoverUrl(book.image ?? '')
    setEditingCover(false)
    setScriptwriter('')
    setArtist('')
    setPublisher(book.publisher ?? '')
    setCollectionStatus('IN_COLLECTION')
    setReadStatus(null)
    setLoanedTo('')
    setActiveTags(initialTags)
    setRating(0)
    setSeriesId(null)
    setSeriesSearch('')
    setCreatingNewSeries(false)
    setNewSeriesName('')
    setShowSeriesSelector(false)
    onClose()
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const year = getYear(book)
      const displayIsbn = book.isbn13 ?? book.isbn

      // 1. Create comic
      const comic = await comicsApi.create({
        title: book.title,
        publisher: publisher.trim() || undefined,
        year,
        synopsis: book.synopsis ?? book.overview ?? undefined,
        coverUrl: coverUrl.trim() || undefined,
        isbn: displayIsbn,
        binding: book.binding as BindingFormat | undefined,
        scriptwriter: scriptwriter.trim() || undefined,
        artist: artist.trim() || undefined,
        authors: book.authors?.join(', ') || undefined,
      })

      // 2. Add to library
      await libraryApi.add({
        comicId: comic.id,
        collectionStatus,
        rating: rating || undefined,
      })

      // 3. Patch read status and loanedTo if needed
      const patchData: Parameters<typeof libraryApi.update>[1] = {}
      if (readStatus) patchData.readStatus = readStatus
      if (collectionStatus === 'LOANED' && loanedTo.trim()) patchData.loanedTo = loanedTo.trim()
      if (Object.keys(patchData).length > 0) {
        await libraryApi.update(comic.id, patchData)
      }

      // 4. Tags
      await Promise.all(activeTags.map((name) => comicsApi.addTag(comic.id, name).catch(() => {})))

      // 5. Asignar a colección/serie
      if (isCollection && targetCollection) {
        let resolvedCollectionSeriesId = seriesId
        if (creatingNewSeries && newSeriesName.trim()) {
          const newSeries = await collectionSeriesApi.create(targetCollection.collectionId, newSeriesName.trim())
          resolvedCollectionSeriesId = newSeries.id
        }
        if (resolvedCollectionSeriesId) {
          await comicsApi.update(comic.id, { collectionSeriesId: resolvedCollectionSeriesId })
        } else {
          await collectionsApi.addComic(targetCollection.collectionId, comic.id)
        }
      }

      return comic
    },
    onSuccess: (comic) => {
      qc.invalidateQueries({ queryKey: ['library'] })
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['library-stats'] })
      toast.success(t('search.createManual.success'))
      handleClose()
      if (defaultTarget === 'library') {
        navigate('/library')
      } else {
        navigate(`/comics/${comic.id}`)
      }
    },
    onError: () => toast.error(t('search.createManual.error')),
  })

  const canSubmit = !saveMutation.isPending &&
    !(creatingNewSeries && !newSeriesName.trim())

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent className="w-full sm:w-[520px] flex flex-col p-0 gap-0">
        <SheetHeader className="sheet-header">
          <SheetTitle className="text-lg">{t('addSheet.title')}</SheetTitle>
        </SheetHeader>

        <div className="sheet-body">

          {/* ── Cover editable ─────────────────────────────── */}
          <div className="flex gap-4 items-start">
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

          <Separator />

          {/* ── Credits ────────────────────────────────────── */}
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

          {/* ── Publisher normalized ───────────────────────── */}
          <AutocompleteInput
            label={t('comicDetail.publisher')}
            value={publisher}
            onChange={setPublisher}
            suggestions={publisherSuggestions}
            placeholder={t('comicDetail.publisherPlaceholder')}
          />

          <Separator />

          {/* ── Grupo 1: Colección ─────────────────────────── */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{t('comicDetail.collectionStatusLabel')}</label>
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
                  {t(labelKey)}
                </button>
              ))}
            </div>
            {collectionStatus === 'LOANED' && (
              <Input
                value={loanedTo}
                onChange={(e) => setLoanedTo(e.target.value)}
                placeholder={t('comicDetail.loanedToPlaceholder')}
                className="h-8 text-sm mt-1"
              />
            )}
          </div>

          {/* ── Grupo 2: Lectura ───────────────────────────── */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{t('comicDetail.readStatusLabel')}</label>
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
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* ── Tags confirmator ───────────────────────────── */}
          <TagsConfirmator
            activeTags={activeTags}
            onChange={setActiveTags}
          />

          <Separator />

          {/* ── Rating ─────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('comicDetail.rating')}</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* ── Series selector (collection mode only) ─────── */}
          {isCollection && (
            <>
              <Separator />
              <div className="space-y-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowSeriesSelector((v) => !v)}
                >
                  {showSeriesSelector ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  {t('addSheet.assignSeries')}
                  {selectedSeriesName && (
                    <Badge variant="secondary" className="text-xs ml-1">{selectedSeriesName}</Badge>
                  )}
                </button>

                {showSeriesSelector && (
                  <div className="space-y-2 pl-5">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        value={seriesSearch}
                        onChange={(e) => { setSeriesSearch(e.target.value); setCreatingNewSeries(false) }}
                        placeholder={t('addSheet.searchSeries')}
                        className="pl-8 h-8 text-sm"
                      />
                    </div>
                    {filteredSeries.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-0.5 rounded-md border p-1">
                        {filteredSeries.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => { setSeriesId(seriesId === s.id ? null : s.id); setCreatingNewSeries(false) }}
                            className={`w-full text-left px-3 py-1.5 rounded text-sm flex items-center justify-between gap-2 transition-colors ${
                              seriesId === s.id
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <span className="truncate">{s.name}</span>
                            {seriesId === s.id && <Check className="size-3.5 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setCreatingNewSeries((v) => !v); setSeriesId(null) }}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                        creatingNewSeries ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Plus className="size-3.5" />{t('addSheet.createSeries')}
                    </button>
                    {creatingNewSeries && (
                      <Input
                        autoFocus
                        value={newSeriesName}
                        onChange={(e) => setNewSeriesName(e.target.value)}
                        placeholder={t('addSheet.seriesNamePlaceholder')}
                        className="h-8 text-sm"
                      />
                    )}
                  </div>
                )}
              </div>
            </>
          )}
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
            {saveMutation.isPending ? t('common.saving') : submitLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

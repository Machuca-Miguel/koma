import { useState, useRef, useEffect, Fragment, useMemo, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, BookOpen, Building2, Star, Users,
  ExternalLink, Hash, Pencil, X, Tag, Copy, ShoppingCart, 
  ChevronDown, Plus, PenLine, Brush, FolderOpen,
  BookMarked, Eye, Bookmark, ArrowRightLeft, Search, Check,
  ShoppingBag,
} from 'lucide-react'
import { toast } from 'sonner'
import { Dialog as ModalPrimitive } from '@base-ui/react/dialog'
import { comicsApi } from '@/api/comics'
import { collectionsApi } from '@/api/collections'
import { collectionSeriesApi } from '@/api/collection-series'
import { libraryApi } from '@/api/library'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { BindingFormat, Collection, CollectionSeries, CollectionStatusValue, ReadStatusValue, SaleStatusValue } from '@/types'
import { PageContainer } from '@/components/layout/PageContainer'

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
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((tag) => (
        <Badge key={tag.id} variant="secondary" className="text-xs gap-1 pr-1">
          {tag.name}
          <button onClick={() => removeMutation.mutate(tag.id)} className="hover:text-destructive rounded-sm transition-colors">
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <div className="relative">
        <Input
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) { e.preventDefault(); addMutation.mutate(input.trim()) }
            if (e.key === 'Escape') { setInput(''); setShowSuggestions(false) }
          }}
          onFocus={() => input.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={t('comicDetail.addTag')}
          className="h-7 text-xs px-2 w-36 border-dashed"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 z-20 mt-1 w-48 bg-popover border rounded-md shadow-md overflow-hidden">
            {suggestions.slice(0, 5).map((s) => (
              <button key={s.id} onMouseDown={() => addMutation.mutate(s.name)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors">
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const BINDING_OPTIONS: BindingFormat[] = ['CARTONE', 'TAPA_BLANDA', 'BOLSILLO', 'OMNIBUS', 'HARDCOVER', 'DIGITAL' ]

function EditSheet({ comicId, initial, open, onClose, focusOnCover }: {
  comicId: string
  initial: {
    title: string; publisher?: string; year?: number; synopsis?: string
    coverUrl?: string; isbn?: string; binding?: BindingFormat; drawingStyle?: string
    authors?: string; scriptwriter?: string; artist?: string
    collectionSeriesId?: string
    collectionSeries?: CollectionSeries
  }
  open: boolean
  onClose: () => void
  focusOnCover?: boolean
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...initial })
  const coverInputRef = useRef<HTMLInputElement>(null)

  // ── Collection / Series state ────────────────────────────────────────────────
  const [selectedColId, setSelectedColId] = useState(initial.collectionSeries?.collectionId ?? '')
  const [colSearch, setColSearch] = useState('')
  const [showColDropdown, setShowColDropdown] = useState(false)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(initial.collectionSeriesId ?? null)
  const [creatingNewCol, setCreatingNewCol] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [creatingNewSeries, setCreatingNewSeries] = useState(false)
  const [newSeriesName, setNewSeriesName] = useState('')

  const { data: allCollections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.getAll,
    enabled: open,
    staleTime: 60_000,
  })

  const { data: seriesInCollection = [] } = useQuery({
    queryKey: ['collection-series', selectedColId],
    queryFn: () => collectionSeriesApi.getByCollection(selectedColId),
    enabled: !!selectedColId && open,
    staleTime: 30_000,
  })

  const filteredCols = allCollections.filter((c) =>
    colSearch ? c.name.toLowerCase().includes(colSearch.toLowerCase()) : true
  )

  useEffect(() => {
    if (open) {
      setSelectedColId(initial.collectionSeries?.collectionId ?? '')
      setSelectedSeriesId(initial.collectionSeriesId ?? null)
      setCreatingNewCol(false); setNewColName('')
      setCreatingNewSeries(false); setNewSeriesName('')
      setColSearch(''); setShowColDropdown(false)
    }
  }, [open])

  useEffect(() => {
    if (open && focusOnCover) {
      const timer = setTimeout(() => {
        coverInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        coverInputRef.current?.focus()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [open, focusOnCover])

  const editMutation = useMutation({
    mutationFn: async () => {
      // 1. Resolve collection (create if needed)
      let resolvedColId = selectedColId
      if (creatingNewCol && newColName.trim()) {
        const col = await collectionsApi.create({ name: newColName.trim() })
        resolvedColId = col.id
        qc.invalidateQueries({ queryKey: ['collections'] })
      }

      // 2. Resolve series (create if needed)
      let resolvedSeriesId: string | null = selectedSeriesId
      if (creatingNewSeries && newSeriesName.trim() && resolvedColId) {
        const s = await collectionSeriesApi.create(resolvedColId, newSeriesName.trim())
        resolvedSeriesId = s.id
        qc.invalidateQueries({ queryKey: ['collection-series', resolvedColId] })
      }

      // 3. Update comic metadata + series assignment in one call
      await comicsApi.update(comicId, {
        title: form.title || undefined,
        publisher: form.publisher || undefined,
        year: form.year || undefined,
        synopsis: form.synopsis || undefined,
        coverUrl: form.coverUrl || undefined,
        isbn: form.isbn || undefined,
        binding: form.binding || null,
        drawingStyle: form.drawingStyle || undefined,
        authors: form.authors || undefined,
        scriptwriter: form.scriptwriter || undefined,
        artist: form.artist || undefined,
        collectionSeriesId: resolvedSeriesId ?? undefined,
      })

      // 4. If collection selected but no specific series → assign to Principal
      if (resolvedColId && !resolvedSeriesId) {
        await collectionsApi.addComic(resolvedColId, comicId).catch(() => {})
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comic', comicId] })
      qc.invalidateQueries({ queryKey: ['comic-collections', comicId] })
      qc.invalidateQueries({ queryKey: ['library'] })
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(t('comicDetail.editSaved'))
      onClose()
    },
    onError: () => toast.error(t('comicDetail.updateError')),
  })

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <ModalPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <ModalPrimitive.Portal>
        <ModalPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 supports-backdrop-filter:backdrop-blur-sm data-starting-style:opacity-0 data-ending-style:opacity-0 duration-200" />
        <ModalPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] rounded-2xl bg-background shadow-2xl ring-1 ring-foreground/10 overflow-hidden flex flex-col md:flex-row outline-none data-starting-style:opacity-0 data-ending-style:opacity-0 duration-150">

          {/* Left: cover preview + current metadata */}
          <div className="hidden md:flex md:w-5/12 bg-muted/30 border-r border-border flex-col gap-5 p-8 overflow-y-auto shrink-0">
            <div className="aspect-[2/3] w-full max-w-[200px] mx-auto rounded-xl overflow-hidden bg-muted shadow-lg">
              {form.coverUrl ? (
                <img src={form.coverUrl} alt={form.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="size-8 text-muted-foreground/30" />
                </div>
              )}
            </div>

            <span className="self-start bg-muted px-2.5 py-1 rounded-md text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
              {t('comicDetail.editComic')}
            </span>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Title</p>
                <p className="text-sm font-medium leading-snug">{form.title || initial.title}</p>
              </div>
              {(form.publisher || initial.publisher) && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Publisher</p>
                  <p className="text-sm text-muted-foreground">{form.publisher || initial.publisher}</p>
                </div>
              )}
              {(form.year || initial.year) && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Year</p>
                  <p className="text-sm text-muted-foreground">{form.year || initial.year}</p>
                </div>
              )}
              {(form.isbn || initial.isbn) && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">ISBN</p>
                  <p className="font-mono text-xs text-muted-foreground">{form.isbn || initial.isbn}</p>
                </div>
              )}
              {(form.binding || initial.binding) && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Format</p>
                  <p className="text-sm text-muted-foreground">{t(`binding.${(form.binding || initial.binding)!}` as `binding.${BindingFormat}`)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: edit form */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <div className="sheet-header flex items-center justify-between">
              <p className="text-lg font-semibold">{t('comicDetail.editComic')}</p>
              <button type="button" onClick={onClose}
                className="rounded-md p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground -mr-1">
                <X className="size-4" />
              </button>
            </div>

            <div className="sheet-body">
              {/* Cover URL */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('comicDetail.coverUrlField')}</label>
                <Input ref={coverInputRef} value={form.coverUrl ?? ''} onChange={set('coverUrl')} placeholder="https://..." className="h-9" />
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Título *</label>
                <Input value={form.title} onChange={set('title')} className="h-10" />
              </div>

              {/* Publisher + Year */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('comicDetail.publisher')}</label>
                  <Input value={form.publisher ?? ''} onChange={set('publisher')} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('comicDetail.years')}</label>
                  <Input type="number" value={form.year ?? ''} min={1900} max={2099} className="h-10"
                    onChange={(e) => setForm((p) => ({ ...p, year: e.target.value ? Number(e.target.value) : undefined }))} />
                </div>
              </div>


              {/* ISBN + Binding */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-sm font-medium">{t('comicDetail.isbn')}</label>
                    </div>
                  <Input value={form.isbn ?? ''} onChange={set('isbn')} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('comicDetail.binding')}</label>
                  <Select value={form.binding ?? '__none__'}
                    onValueChange={(v) => setForm((p) => ({ ...p, binding: v === '__none__' ? undefined : v as BindingFormat }))}>
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

              {/* Authors */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('comicDetail.authors')}</label>
                <Input value={form.authors ?? ''} onChange={set('authors')} placeholder="Frank Miller, Alan Moore..." className="h-10" />
              </div>

              {/* Scriptwriter + Artist */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('comicDetail.scriptwriter')}</label>
                  <Input value={form.scriptwriter ?? ''} onChange={set('scriptwriter')} placeholder="Alan Moore..." className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('comicDetail.artist')}</label>
                  <Input value={form.artist ?? ''} onChange={set('artist')} placeholder="Dave Gibbons..." className="h-10" />
                </div>
              </div>

              {/* Drawing Style */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('comicDetail.drawingStyle')}</label>
                <Input value={form.drawingStyle ?? ''} onChange={set('drawingStyle')} placeholder="Línea clara, realista..." className="h-10" />
              </div>

              {/* Synopsis */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('comicDetail.synopsis')}</label>
                <Textarea value={form.synopsis ?? ''} onChange={set('synopsis')} rows={4} />
              </div>

              {/* ── Collection / Series ─────────────────────────────────── */}
              <div className="border-t border-border pt-4 space-y-4">
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                  {t('addSheet.titleCollection')}
                </label>

                {/* Collection picker */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">{t('addSheet.selectCollection')}</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowColDropdown((v) => !v)}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 flex justify-between items-center hover:border-primary/50 transition-colors text-sm"
                    >
                      <span className="truncate">
                        {creatingNewCol && newColName
                          ? newColName
                          : allCollections.find((c) => c.id === selectedColId)?.name
                          ?? t('addSheet.selectCollection')}
                      </span>
                      <ChevronDown className="size-3.5 text-muted-foreground shrink-0 ml-2" />
                    </button>

                    {showColDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-background rounded-lg shadow-xl border border-border overflow-hidden z-20">
                        <div className="p-2 border-b border-border">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                            <Input
                              value={colSearch}
                              onChange={(e) => setColSearch(e.target.value)}
                              placeholder={t('addSheet.searchCollections')}
                              className="pl-7 h-7 text-xs"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {filteredCols.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedColId(c.id)
                                setSelectedSeriesId(null)
                                setCreatingNewSeries(false); setNewSeriesName('')
                                setCreatingNewCol(false)
                                setShowColDropdown(false); setColSearch('')
                              }}
                              className={`w-full px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                                c.id === selectedColId ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              }`}
                            >
                              <span>{c.name}</span>
                              {c.id === selectedColId && <Check className="size-3.5 shrink-0" />}
                            </button>
                          ))}
                          {filteredCols.length === 0 && (
                            <p className="px-3 py-2 text-xs text-muted-foreground">{t('common.noResults')}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {!creatingNewCol ? (
                    <button
                      type="button"
                      onClick={() => { setCreatingNewCol(true); setSelectedColId('') }}
                      className="inline-flex items-center gap-1 text-primary text-[11px] font-medium hover:brightness-125 transition-all"
                    >
                      <Plus className="size-3" />
                      {t('addSheet.createNewCollection')}
                    </button>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <Input
                        autoFocus
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                        placeholder={t('addSheet.newCollectionPlaceholder')}
                        className="h-7 text-xs flex-1"
                      />
                      <button type="button"
                        onClick={() => { setCreatingNewCol(false); setNewColName('') }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
                        {t('common.cancel')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Series picker (only when a collection is chosen) */}
                {(selectedColId || creatingNewCol) && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">{t('addSheet.assignSeries')}</label>
                    <div className="space-y-1">
                      {seriesInCollection.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setSelectedSeriesId(selectedSeriesId === s.id ? null : s.id); setCreatingNewSeries(false) }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors border ${
                            selectedSeriesId === s.id
                              ? 'border-primary/30 bg-primary/5 text-primary font-medium'
                              : 'border-border bg-muted hover:border-primary/20'
                          }`}
                        >
                          <span className="truncate">{s.name}</span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            {s.isDefault && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                {t('addSheet.defaultSeries')}
                              </span>
                            )}
                            {selectedSeriesId === s.id && <Check className="size-3" />}
                          </span>
                        </button>
                      ))}

                      {!creatingNewSeries ? (
                        <button
                          type="button"
                          onClick={() => { setCreatingNewSeries(true); setSelectedSeriesId(null) }}
                          className="inline-flex items-center gap-1 text-primary text-[11px] font-medium hover:brightness-125 transition-all mt-1"
                        >
                          <Plus className="size-3" />
                          {t('addSheet.createSeries')}
                        </button>
                      ) : (
                        <div className="flex gap-2 items-center mt-1">
                          <Input
                            autoFocus
                            value={newSeriesName}
                            onChange={(e) => setNewSeriesName(e.target.value)}
                            placeholder={t('addSheet.seriesNamePlaceholder')}
                            className="h-7 text-xs flex-1"
                          />
                          <button type="button"
                            onClick={() => { setCreatingNewSeries(false); setNewSeriesName('') }}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
                            {t('common.cancel')}
                          </button>
                        </div>
                      )}
                    </div>
                    {!selectedSeriesId && !creatingNewSeries && (
                      <p className="text-[10px] text-muted-foreground/60 italic">{t('addSheet.principalHint')}</p>
                    )}
                  </div>
                )}
              </div>

            </div>

            <div className="sheet-footer">
              <Button variant="outline" size="xl" onClick={onClose} className="flex-1">{t('common.cancel')}</Button>
              <Button size="xl" onClick={() => editMutation.mutate()}
                disabled={
                  editMutation.isPending ||
                  !form.title.trim() ||
                  (creatingNewCol && !newColName.trim()) ||
                  (creatingNewSeries && !newSeriesName.trim())
                } className="flex-1">
                {editMutation.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </ModalPrimitive.Popup>
      </ModalPrimitive.Portal>
    </ModalPrimitive.Root>
  )
}

// ─── Add to Collection Sheet ─────────────────────────────────────────────────

function AddToCollectionSheet({ comicId, open, onClose }: {
  comicId: string
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const [selectedColId, setSelectedColId] = useState('')
  const [colSearch, setColSearch] = useState('')
  const [showColDropdown, setShowColDropdown] = useState(false)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const [creatingNewSeries, setCreatingNewSeries] = useState(false)
  const [newSeriesName, setNewSeriesName] = useState('')
  const [creatingNewCol, setCreatingNewCol] = useState(false)
  const [newColName, setNewColName] = useState('')

  const { data: allCollections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.getAll,
    staleTime: 60_000,
  })

  const { data: collectionSeries = [] } = useQuery({
    queryKey: ['collection-series', selectedColId],
    queryFn: () => collectionSeriesApi.getByCollection(selectedColId),
    enabled: !!selectedColId && open,
    staleTime: 30_000,
  })

  const filteredCols = allCollections.filter((c) =>
    colSearch ? c.name.toLowerCase().includes(colSearch.toLowerCase()) : true
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      let resolvedColId = selectedColId
      if (creatingNewCol && newColName.trim()) {
        const newCol = await collectionsApi.create({ name: newColName.trim() })
        resolvedColId = newCol.id
      }

      let resolvedSeriesId = selectedSeriesId
      if (creatingNewSeries && newSeriesName.trim() && resolvedColId) {
        const newSeries = await collectionSeriesApi.create(resolvedColId, newSeriesName.trim())
        resolvedSeriesId = newSeries.id
      }

      if (resolvedSeriesId) {
        await comicsApi.update(comicId, { collectionSeriesId: resolvedSeriesId })
      } else if (resolvedColId) {
        await collectionsApi.addComic(resolvedColId, comicId)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comic', comicId] })
      qc.invalidateQueries({ queryKey: ['comic-collections', comicId] })
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['library'] })
      toast.success(t('addSheet.savedToCollection'))
      onClose()
    },
    onError: () => toast.error(t('common.error')),
  })

  const canSave = (selectedColId || (creatingNewCol && newColName.trim())) &&
    !(creatingNewSeries && !newSeriesName.trim())

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]" onClick={onClose} />

      {/* Side sheet */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-background border-l border-border shadow-2xl z-[70] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border">
          <h2 className="text-xl font-bold tracking-tight">{t('addSheet.titleCollection')}</h2>
          <button onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">

          {/* Field 1: Select Collection */}
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              {t('addSheet.selectCollection')}
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColDropdown((v) => !v)}
                className="w-full bg-muted border border-border rounded-lg p-3 flex justify-between items-center hover:border-primary/50 transition-colors"
              >
                <span className="text-sm">
                  {creatingNewCol && newColName
                    ? newColName
                    : allCollections.find((c) => c.id === selectedColId)?.name
                    ?? t('addSheet.selectCollection')}
                </span>
                <ChevronDown className="size-4 text-muted-foreground shrink-0" />
              </button>

              {showColDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background rounded-lg shadow-xl border border-border overflow-hidden z-10">
                  <div className="p-3 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        value={colSearch}
                        onChange={(e) => setColSearch(e.target.value)}
                        placeholder={t('addSheet.searchCollections')}
                        className="pl-7 h-8 text-xs"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCols.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedColId(c.id)
                          setSelectedSeriesId(null)
                          setCreatingNewSeries(false); setNewSeriesName('')
                          setCreatingNewCol(false)
                          setShowColDropdown(false); setColSearch('')
                        }}
                        className={`w-full px-4 py-2.5 text-xs flex items-center justify-between transition-colors ${
                          c.id === selectedColId
                            ? 'text-primary bg-primary/5'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <span>{c.name}</span>
                        {c.id === selectedColId && <Check className="size-3.5 shrink-0" />}
                      </button>
                    ))}
                    {filteredCols.length === 0 && (
                      <p className="px-4 py-3 text-xs text-muted-foreground">{t('common.noResults')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Create new collection */}
            {!creatingNewCol ? (
              <button
                type="button"
                onClick={() => { setCreatingNewCol(true); setSelectedColId('') }}
                className="inline-flex items-center gap-1.5 text-primary text-[11px] font-bold uppercase tracking-widest hover:brightness-125 transition-all"
              >
                <Plus className="size-3.5" />
                {t('addSheet.createNewCollection')}
              </button>
            ) : (
              <div className="space-y-2">
                <Input
                  autoFocus
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder={t('addSheet.newCollectionPlaceholder')}
                  className="h-8 text-sm"
                />
                <button type="button"
                  onClick={() => { setCreatingNewCol(false); setNewColName('') }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {t('common.cancel')}
                </button>
              </div>
            )}
          </div>

          {/* Field 2: Select Series (only when a collection is chosen) */}
          {(selectedColId || creatingNewCol) && (
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                {t('addSheet.assignSeries')}
              </label>

              <div className="space-y-1.5">
                {collectionSeries.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedSeriesId(selectedSeriesId === s.id ? null : s.id)
                      setCreatingNewSeries(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors border ${
                      selectedSeriesId === s.id
                        ? 'border-primary/30 bg-primary/5 text-primary font-medium'
                        : 'border-border bg-muted hover:border-primary/20'
                    }`}
                  >
                    <span className="truncate">{s.name}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {s.isDefault && (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                          {t('addSheet.defaultSeries')}
                        </span>
                      )}
                      {selectedSeriesId === s.id && <Check className="size-3.5" />}
                    </span>
                  </button>
                ))}

                {!creatingNewSeries ? (
                  <button
                    type="button"
                    onClick={() => { setCreatingNewSeries(true); setSelectedSeriesId(null) }}
                    className="inline-flex items-center gap-1.5 text-primary text-[11px] font-bold uppercase tracking-widest hover:brightness-125 transition-all mt-1"
                  >
                    <Plus className="size-3.5" />
                    {t('addSheet.createSeries')}
                  </button>
                ) : (
                  <div className="space-y-2 mt-1">
                    <Input
                      autoFocus
                      value={newSeriesName}
                      onChange={(e) => setNewSeriesName(e.target.value)}
                      placeholder={t('addSheet.seriesNamePlaceholder')}
                      className="h-8 text-sm"
                    />
                    <button type="button"
                      onClick={() => { setCreatingNewSeries(false); setNewSeriesName('') }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {t('common.cancel')}
                    </button>
                  </div>
                )}
              </div>

              {!selectedSeriesId && !creatingNewSeries && (
                <p className="text-[10px] text-muted-foreground/60 italic px-1">
                  {t('addSheet.principalHint')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-border grid grid-cols-2 gap-4">
          <Button variant="outline" onClick={onClose}
            className="h-11 text-xs font-bold uppercase tracking-widest">
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !canSave}
            className="h-11 text-xs font-bold uppercase tracking-widest">
            {saveMutation.isPending ? t('common.saving') : t('addSheet.saveToCollection')}
          </Button>
        </div>
      </div>
    </>
  )
}

// ─── Collection Gallery ───────────────────────────────────────────────────────

function CollectionGallery({ collections, currentComicId }: {
  collections: Collection[]
  currentComicId: string
}) {
  const navigate = useNavigate()
  const [selectedCollectionId, setSelectedCollectionId] = useState(collections[0]?.id ?? '')

  const { data: collectionComics = [], isLoading } = useQuery({
    queryKey: ['collection-comics', selectedCollectionId],
    queryFn: () => collectionsApi.getComics(selectedCollectionId),
    enabled: !!selectedCollectionId,
    staleTime: 60_000,
  })

  // Group by series, preserving insertion order
  const groups = useMemo(() => {
    const map = new Map<string, typeof collectionComics>()
    for (const item of collectionComics) {
      const key = item.comic.collectionSeries?.name ?? '__none__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return map
  }, [collectionComics])

  const collectionName = collections.find((c) => c.id === selectedCollectionId)?.name ?? ''

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 border-t border-border/40">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FolderOpen className="size-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">En tu Colección</h2>
          {collectionComics.length > 0 && (
            <span className="text-sm text-muted-foreground">({collectionComics.length})</span>
          )}
        </div>
        {collections.length > 1 && (
          <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {collections.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <Skeleton className="h-2.5 w-3/4" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          ))}
        </div>
      ) : collectionComics.length === 0 ? null : (
        <div className="space-y-10">
          {Array.from(groups.entries()).map(([seriesKey, items]) => {
            const hasSeries = seriesKey !== '__none__'
            const groupLabel = hasSeries ? `Serie: ${seriesKey}` : collectionName
            const sorted = [...items].sort((a, b) =>
              (a.comic.issueNumber ?? 0) - (b.comic.issueNumber ?? 0)
            )
            return (
              <div key={seriesKey}>
                {/* Series divider */}
                <div className="flex items-center gap-4 mb-5">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0">
                    {groupLabel}
                  </h3>
                  <div className="h-px flex-1 bg-border/30" />
                </div>

                {/* Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-4">
                  {sorted.map(({ comic }) => {
                    const isCurrent = comic.id === currentComicId
                    return (
                      <div
                        key={comic.id}
                        className={`group ${isCurrent ? 'cursor-default' : 'cursor-pointer'}`}
                        onClick={() => !isCurrent && navigate(`/comics/${comic.id}`)}
                        title={comic.title}
                      >
                        <div className={`aspect-[2/3] rounded-lg overflow-hidden bg-muted mb-2 transition-transform duration-300 ${
                          isCurrent
                            ? 'ring-2 ring-primary ring-offset-4 ring-offset-background'
                            : 'group-hover:-translate-y-1'
                        }`}>
                          {comic.coverUrl ? (
                            <img
                              src={comic.coverUrl}
                              alt={comic.title}
                              loading="lazy"
                              className={`w-full h-full object-cover transition-opacity duration-300 ${
                                isCurrent ? 'opacity-70' : 'opacity-80 group-hover:opacity-100'
                              }`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="size-4 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <h4 className={`text-[10px] font-bold uppercase leading-tight line-clamp-2 transition-colors ${
                          isCurrent ? 'text-primary' : 'text-foreground/80 group-hover:text-primary'
                        }`}>
                          {comic.title}
                        </h4>
                        {(comic.issueNumber || comic.year) && (
                          <p className="text-[9px] text-muted-foreground/50 uppercase tracking-tight mt-0.5">
                            {[
                              comic.issueNumber ? `Vol. ${comic.issueNumber}` : null,
                              comic.year ? String(comic.year) : null,
                            ].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
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
  const [editFocusCover, setEditFocusCover] = useState(false)
  const [isAddToCollectionOpen, setIsAddToCollectionOpen] = useState(false)

  const { data: comic, isLoading } = useQuery({
    queryKey: ['comic', id],
    queryFn: () => comicsApi.getOne(id!),
    enabled: !!id,
  })

  const { data: comicCollections = [] } = useQuery({
    queryKey: ['comic-collections', id],
    queryFn: () => collectionsApi.getByComic(id!),
    enabled: !!id,
  })

  const { data: userComic } = useQuery({
    queryKey: ['user-comic', id],
    queryFn: () => libraryApi.getByComicId(id!),
    enabled: !!id,
  })

  const [loanedToInput, setLoanedToInput] = useState<string | undefined>(undefined)
  const [isSaleOpen, setIsSaleOpen] = useState(false)

  const updateMutation = useMutation({
    mutationFn: (data: {
      collectionStatus?: CollectionStatusValue | null
      readStatus?: ReadStatusValue | null
      saleStatus?: SaleStatusValue | null
      loanedTo?: string
      rating?: number
      notes?: string
    }) => libraryApi.update(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-comic', id] })
      qc.invalidateQueries({ queryKey: ['library'] })
    },
    onError: () => toast.error(t('comicDetail.updateError')),
  })

  const addMutation = useMutation({
    mutationFn: () => libraryApi.add({ comicId: id!, collectionStatus: 'IN_COLLECTION' }),
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

  const isbn = comic?.isbn

  // ── Grupo 1: Estado de colección (3 pills excluyentes) ────────────────
  const collectionStatusItems: { value: CollectionStatusValue; label: string; Icon: React.ElementType; activeClass: string }[] = [
    { value: 'IN_COLLECTION', label: t('status.IN_COLLECTION'), Icon: BookMarked,    activeClass: 'bg-primary text-primary-foreground border-transparent' },
    { value: 'WISHLIST',      label: t('status.WISHLIST'),      Icon: Bookmark,      activeClass: 'bg-sky-500 text-white border-transparent' },
    { value: 'LOANED',        label: t('status.LOANED'),        Icon: ArrowRightLeft, activeClass: 'bg-violet-500 text-white border-transparent' },
  ]

  // ── Grupo 2: Estado de lectura (3 pills excluyentes) ──────────────────
  const readStatusItems: { value: ReadStatusValue; label: string; Icon: React.ElementType; activeClass: string }[] = [
    { value: 'READ',    label: t('status.READ'),    Icon: Check,    activeClass: 'bg-emerald-500 text-white border-transparent' },
    { value: 'READING', label: t('status.READING'), Icon: Eye,      activeClass: 'bg-amber-500 text-white border-transparent' },
    { value: 'TO_READ', label: t('status.TO_READ'), Icon: BookOpen, activeClass: 'bg-muted-foreground/20 text-foreground border-transparent' },
  ]

  // ── Grupo 3: Estado de venta (botón mercadillo) ────────────────────────
  const saleStatusItems: { value: SaleStatusValue; label: string; activeClass: string }[] = [
    { value: 'FOR_SALE', label: t('status.FOR_SALE'), activeClass: 'bg-orange-500 text-white' },
    { value: 'TO_SELL',  label: t('status.TO_SELL'),  activeClass: 'bg-yellow-500 text-white' },
    { value: 'SOLD',     label: t('status.SOLD'),     activeClass: 'bg-rose-600 text-white' },
  ]

  return (
    <PageContainer>

      {/* ── MAIN SECTION ─────────────────────────────────────────────────── */}
      <section >
        {/* Ambient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-transparent -z-10 pointer-events-none" />
        <div className="absolute top-0 right-2/7 w-[500px] h-[500px] bg-primary/5 blur-[120px] -z-10 rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-14 lg:pb-20">

          {/* Back */}
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

              {/* ── LEFT: Cover ── */}
              <div className="lg:col-span-4 flex flex-col items-center lg:items-start gap-5">
                {/* Cover with ambient glow */}
                <div className="relative group w-full max-w-[320px] mx-auto lg:mx-0">
                  <div className="absolute -inset-4 bg-primary/10 blur-2xl  opacity-40 group-hover:opacity-70 transition-opacity" />
                  <div
                    className="relative aspect-[2/3]  overflow-hidden bg-muted shadow-2xl cursor-pointer ghost-border"
                    onClick={() => { setEditFocusCover(true); setIsEditOpen(true) }}
                    title={t(comic.coverUrl ? 'comicDetail.changeCover' : 'comicDetail.addCover')}
                  >
                    {comic.coverUrl ? (
                      <img src={comic.coverUrl} alt={comic.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="size-14 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Publisher badge */}
                    {comic.publisher && (
                      <div className="absolute top-3 left-3">
                        <span className="bg-background/75 backdrop-blur-md border border-border/30 text-foreground text-[10px] px-2.5 py-1 rounded-full font-medium">
                          {comic.publisher}
                        </span>
                      </div>
                    )}
                    {/* Edit overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex flex-col items-center gap-1.5 text-white">
                        <Pencil className="size-5" />
                        <span className="text-xs font-medium">{t(comic.coverUrl ? 'comicDetail.changeCover' : 'comicDetail.addCover')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick status cards */}
                {userComic && (
                  <div className="w-full max-w-[320px] mx-auto lg:mx-0 grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 border border-border/50 p-3 rounded-xl flex flex-col items-center gap-1">
                      <BookMarked className={`size-4 ${userComic.collectionStatus === 'IN_COLLECTION' ? 'text-primary' : userComic.collectionStatus ? 'text-sky-500' : 'text-muted-foreground/40'}`} />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{t('comicDetail.collectionStatusLabel')}</span>
                      <span className="text-xs font-semibold">
                        {userComic.collectionStatus ? t(`status.${userComic.collectionStatus}`) : '—'}
                      </span>
                    </div>
                    <div className="bg-muted/50 border border-border/50 p-3 rounded-xl flex flex-col items-center gap-1">
                      <Star className={`size-4 ${userComic.rating ? 'text-amber-400' : 'text-muted-foreground/40'}`}
                        fill={userComic.rating ? 'currentColor' : 'none'} />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{t('comicDetail.ratingLabel')}</span>
                      <span className="text-xs font-semibold">{userComic.rating ? `${userComic.rating}/5` : '—'}</span>
                    </div>
                  </div>
                  
                )}

                                       {/* CTAs */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button onClick={() => setIsEditOpen(true)} className="gap-2">
                    <Pencil className="size-4" />
                    {t('comicDetail.editComic')}
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddToCollectionOpen(true)} className="gap-2">
                    <FolderOpen className="size-4" />
                    {t('addSheet.titleCollection')}
                  </Button>
                  {isbn && (
                    <Button variant="outline" onClick={() => handleCopyIsbn(isbn)} className="gap-2">
                      <Copy className="size-4" />
                      ISBN
                    </Button>
                  )}
                </div>
                 {/* Notes */}
                    <div className="space-y-1.5 w-full max-w-[320px] mx-auto lg:mx-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('comicDetail.notesLabel')}</p>
                      <textarea value={notes ?? userComic?.notes ?? ''} onChange={(e) => handleNotesChange(e.target.value)}
                        placeholder={t('comicDetail.notesPlaceholder')} rows={3}
                        className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
                    </div>
              </div>

              {/* ── RIGHT: Info ── */}
              <div className="lg:col-span-8 flex flex-col gap-6">

                {/* Series label */}
                {comic.collectionSeries?.name && (
                  <span className="text-primary font-semibold text-sm uppercase tracking-widest">
                    {comic.collectionSeries.name}
                  </span>
                )}

                {/* Title */}
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-4xl lg:text-[3.5rem] font-bold tracking-tighter leading-none">
                    {comic.title}
                    {comic.issueNumber && (
                      <span className="text-muted-foreground font-normal ml-3">#{comic.issueNumber}</span>
                    )}
                  </h1>
                  <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground mt-1" onClick={() => setIsEditOpen(true)}>
                    <Pencil className="size-4" />
                  </Button>
                </div>

                {/* Authors row */}
                {(comic.scriptwriter || comic.artist || comic.authors) && (
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground uppercase tracking-widest">
                    {comic.scriptwriter && (
                      <div className="flex items-center gap-2">
                        <PenLine className="size-3.5 shrink-0" />
                        <span>{comic.scriptwriter}</span>
                      </div>
                    )}
                    {comic.artist && (
                      <div className={`flex items-center gap-2 ${comic.scriptwriter ? 'pl-4 border-l border-border/40' : ''}`}>
                        <Brush className="size-3.5 shrink-0" />
                        <span>{comic.artist}</span>
                      </div>
                    )}
                    {comic.authors && !comic.scriptwriter && !comic.artist && (
                      <div className="flex items-center gap-2">
                        <Users className="size-3.5 shrink-0" />
                        <span>{comic.authors}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                <div className="flex items-start gap-2 flex-wrap">
                  <Tag className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <TagInput comicId={comic.id} tags={comic.tags?.map(({ tag }) => tag) ?? []} />
                </div>

                {/* Metadata grid */}
                {(comic.year || comic.publisher || comic.binding || isbn) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y border-border/40">
                    {comic.year && <MetaCell label={t('comicDetail.years')} value={String(comic.year)} />}
                    {comic.publisher && <MetaCell label={t('comicDetail.publisher')} value={comic.publisher} />}
                    {comic.binding && <MetaCell label={t('comicDetail.binding')} value={t(`binding.${comic.binding}` as `binding.${BindingFormat}`)} />}
                    {isbn && <MetaCell label="ISBN" value={isbn} />}
                  </div>
                )}

         

                {/* ── User status ── */}
                {userComic ? (
                  <div className="space-y-4 pt-2">

                    {/* Grupo 1 — Colección */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('comicDetail.collectionStatusLabel')}</p>
                      <div className="flex flex-wrap gap-2">
                        {collectionStatusItems.map(({ value, label, Icon, activeClass }) => {
                          const isActive = userComic.collectionStatus === value
                          return (
                            <button key={value}
                              onClick={() => {
                                if (!isActive) updateMutation.mutate({ collectionStatus: value })
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                isActive ? activeClass : 'bg-background text-muted-foreground border-border hover:text-foreground'
                              }`}>
                              <Icon className="size-3.5" />
                              {label}
                            </button>
                          )
                        })}
                      </div>
                      {userComic.collectionStatus === 'LOANED' && (
                        <Input className="h-8 text-sm max-w-52" placeholder={t('comicDetail.loanedToPlaceholder')}
                          defaultValue={userComic.loanedTo ?? ''}
                          onChange={(e) => setLoanedToInput(e.target.value)}
                          onBlur={(e) => updateMutation.mutate({ loanedTo: e.target.value })} />
                      )}
                    </div>

                    {/* Grupo 2 — Lectura */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('comicDetail.readStatusLabel')}</p>
                      <div className="flex flex-wrap gap-2">
                        {readStatusItems.map(({ value, label, Icon, activeClass }) => {
                          const isActive = userComic.readStatus === value
                          return (
                            <button key={value}
                              onClick={() => updateMutation.mutate({ readStatus: isActive ? null : value })}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                isActive ? activeClass : 'bg-background text-muted-foreground border-border hover:text-foreground'
                              }`}>
                              <Icon className="size-3.5" />
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Botón Mercadillo (Grupo 3) */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('comicDetail.saleStatusLabel')}</p>
                      <div className="relative inline-block">
                        <button
                          onClick={() => setIsSaleOpen((v) => !v)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                            userComic.saleStatus
                              ? saleStatusItems.find((s) => s.value === userComic.saleStatus)?.activeClass + ' border-transparent'
                              : 'bg-background text-muted-foreground border-border hover:text-foreground'
                          }`}>
                          <ShoppingBag className="size-3.5" />
                          {userComic.saleStatus ? t(`status.${userComic.saleStatus}`) : t('comicDetail.saleButton')}
                          <ChevronDown className="size-3 opacity-60" />
                        </button>
                        {isSaleOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsSaleOpen(false)} />
                            <div className="absolute top-full left-0 mt-1.5 z-20 bg-popover border border-border rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                              {saleStatusItems.map(({ value, label, activeClass }) => (
                                <button key={value}
                                  onClick={() => {
                                    updateMutation.mutate({ saleStatus: value })
                                    setIsSaleOpen(false)
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-3 ${
                                    userComic.saleStatus === value
                                      ? 'font-semibold bg-muted'
                                      : 'hover:bg-muted/60'
                                  }`}>
                                  {label}
                                  {userComic.saleStatus === value && <Check className="size-3.5 shrink-0" />}
                                </button>
                              ))}
                              {userComic.saleStatus && (
                                <>
                                  <div className="h-px bg-border mx-3" />
                                  <button
                                    onClick={() => {
                                      updateMutation.mutate({ saleStatus: null })
                                      setIsSaleOpen(false)
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/60 transition-colors">
                                    {t('comicDetail.clearSaleStatus')}
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('comicDetail.ratingLabel')}</p>
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

                   


                           {/* Synopsis */}
                {comic.synopsis && (
                  <div>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">
                      {t('comicDetail.synopsis')}
                    </h2>
                    <p dangerouslySetInnerHTML={{ __html: comic.synopsis }}
                      className="text-base text-muted-foreground leading-relaxed" />
                  </div>
                )}

                {/* Incomplete data warning */}
                {(!comic.synopsis || !comic.coverUrl) && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                    <span>⚠</span>
                    <span>
                      {[!comic.coverUrl && t('comicDetail.coverUrlField'), !comic.synopsis && t('comicDetail.synopsis')]
                        .filter(Boolean).join(', ')}{' '}
                      · <button onClick={() => setIsEditOpen(true)} className="underline hover:no-underline">{t('comicDetail.editComic')}</button>
                    </span>
                  </div>
                )}
                  </div>
                ) : userComic === null ? (
                  <div className="flex items-center justify-between gap-4 py-2">
                    <p className="text-sm text-muted-foreground">{t('comicDetail.notInLibrary')}</p>
                    <Button size="sm" disabled={addMutation.isPending} onClick={() => addMutation.mutate()}>
                      {addMutation.isPending ? t('comicDetail.adding') : t('comicDetail.addToLibrary')}
                    </Button>
                  </div>
                ) : null}

             
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── WHERE TO BUY ──────────────────────────────────────────────────── */}
      {comic && userComic?.collectionStatus === 'WISHLIST' && isbn && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 border-t border-border/40">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('comicDetail.whereToBuy')}</h2>
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
        </section>
      )}

      {/* ── ARCHIVE DATA BENTO ────────────────────────────────────────────── */}
      {comic && (isbn || comic.binding || comic.drawingStyle || comic.authors || comic.scriptwriter || comic.artist) && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6">
            Extended Archive Data
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Metadata digest */}
            <div className="md:col-span-2 bg-muted/30 p-6 rounded-xl border border-border/50 hover:border-primary/20 transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Hash className="size-4 text-primary" />
                </div>
                <span className="font-semibold">Metadata Digest</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-10">
                {isbn && (
                  <div className="flex justify-between items-center py-2 border-b border-border/30">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">ISBN</span>
                    <button onClick={() => handleCopyIsbn(isbn)} className="text-xs font-mono text-primary hover:underline flex items-center gap-1">
                      {isbn}<Copy className="size-3 opacity-50" />
                    </button>
                  </div>
                )}
                {comic.binding && (
                  <div className="flex justify-between items-center py-2 border-b border-border/30">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">{t('comicDetail.binding')}</span>
                    <span className="text-xs font-medium">{t(`binding.${comic.binding}` as `binding.${BindingFormat}`)}</span>
                  </div>
                )}
                {comic.drawingStyle && (
                  <div className="flex justify-between items-center py-2 border-b border-border/30">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">{t('comicDetail.drawingStyle')}</span>
                    <span className="text-xs font-medium">{comic.drawingStyle}</span>
                  </div>
                )}
                {comic.authors && (
                  <div className="flex justify-between items-center py-2 border-b border-border/30">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">{t('comicDetail.authors')}</span>
                    <span className="text-xs font-medium truncate max-w-[180px]">{comic.authors}</span>
                  </div>
                )}
                {comic.scriptwriter && (
                  <div className="flex justify-between items-center py-2 border-b border-border/30">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">{t('comicDetail.scriptwriter')}</span>
                    <span className="text-xs font-medium">{comic.scriptwriter}</span>
                  </div>
                )}
                {comic.artist && (
                  <div className="flex justify-between items-center py-2 border-b border-border/30">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">{t('comicDetail.artist')}</span>
                    <span className="text-xs font-medium">{comic.artist}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Collections card */}
            {comicCollections.length > 0 ? (
              <div className="bg-muted/30 p-6 rounded-xl border border-border/50 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FolderOpen className="size-4 text-primary" />
                  </div>
                  <span className="font-semibold">{t('comicDetail.collections')}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {comicCollections.map((col) => (
                    <button key={col.id} onClick={() => navigate(`/collections/${col.id}`)}
                      className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-background/50 hover:bg-background transition-colors text-left">
                      <FolderOpen className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{col.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-muted/20 p-6 rounded-xl border border-border/30 flex flex-col items-center justify-center text-center gap-3">
                <Building2 className="size-8 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium">{t('comicDetail.publisher') ?? 'Publisher'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{comic.publisher ?? '—'}</p>
                </div>
                {comic.year && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{comic.year}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Collection gallery */}
      {comic && comicCollections.length > 0 && (
        <CollectionGallery collections={comicCollections} currentComicId={comic.id} />
      )}

      {/* Add to Collection sheet */}
      {comic && (
        <AddToCollectionSheet
          key={String(isAddToCollectionOpen)}
          comicId={comic.id}
          open={isAddToCollectionOpen}
          onClose={() => setIsAddToCollectionOpen(false)}
        />
      )}

      {/* Edit modal */}
      {comic && (
        <EditSheet
          comicId={comic.id}
          open={isEditOpen}
          onClose={() => { setIsEditOpen(false); setEditFocusCover(false) }}
          focusOnCover={editFocusCover}
          initial={{
            title: comic.title,
            publisher: comic.publisher,
            year: comic.year,
            synopsis: comic.synopsis,
            coverUrl: comic.coverUrl,
            isbn: comic.isbn,
            binding: comic.binding,
            drawingStyle: comic.drawingStyle,
            authors: comic.authors,
            scriptwriter: comic.scriptwriter,
            artist: comic.artist,
            collectionSeriesId: comic.collectionSeriesId,
            collectionSeries: comic.collectionSeries,
          }}
        />
      )}
 
    </PageContainer>
    
  )
  
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{label}</span>
      <span className="text-base font-medium leading-tight">{value}</span>
    </div>
  )
}

// Keep for potential future use
function _SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>
}

interface DataItem { label: string; value?: string | null; link?: boolean }

function _DataGrid({ items }: { items: DataItem[] }) {
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

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-4">
        <Skeleton className="w-full max-w-[260px] aspect-[2/3] rounded-xl mx-auto lg:mx-0" />
      </div>
      <div className="lg:col-span-8 space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-px w-full" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

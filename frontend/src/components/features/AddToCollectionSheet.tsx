import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Plus, Search, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { collectionsApi } from '@/api/collections'
import { collectionSeriesApi } from '@/api/collection-series'
import { libraryApi } from '@/api/library'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface AddToCollectionSheetProps {
  mode: 'single' | 'multiple'
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedComicIds: string[]
  currentCollectionId?: string
  currentSeriesId?: string
  onSuccess?: () => void
}

export function AddToCollectionSheet({
  mode,
  open,
  onOpenChange,
  selectedComicIds,
  currentCollectionId,
  currentSeriesId,
  onSuccess,
}: AddToCollectionSheetProps) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const count = selectedComicIds.length

  const [step, setStep] = useState<'collection' | 'series'>('collection')
  const [selectedId, setSelectedId] = useState(currentCollectionId ?? '')
  const [newName, setNewName] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [collectionSearch, setCollectionSearch] = useState('')

  const [resolvedCollectionId, setResolvedCollectionId] = useState(currentCollectionId ?? '')
  const [selectedSeriesId, setSelectedSeriesId] = useState(currentSeriesId ?? '')

  // Tracks whether the user just created a new collection (to show editable series name in step 2)
  const [isNewCollection, setIsNewCollection] = useState(false)
  const [editingSeriesName, setEditingSeriesName] = useState('')

  const [submitting, setSubmitting] = useState(false)

  const { data: collections, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.getAll,
    enabled: open,
  })

  const { data: seriesList, isLoading: isLoadingSeries } = useQuery({
    queryKey: ['collection-series', resolvedCollectionId],
    queryFn: () => collectionSeriesApi.getByCollection(resolvedCollectionId),
    enabled: step === 'series' && !!resolvedCollectionId && !isNewCollection,
  })

  const filteredCollections = useMemo(() => {
    if (!collections) return []
    const q = collectionSearch.trim().toLowerCase()
    if (!q) return collections
    return collections.filter((c) => c.name.toLowerCase().includes(q))
  }, [collections, collectionSearch])

  function handleClose() {
    setStep('collection')
    setSelectedId(currentCollectionId ?? '')
    setNewName('')
    setCreatingNew(false)
    setCollectionSearch('')
    setResolvedCollectionId(currentCollectionId ?? '')
    setSelectedSeriesId(currentSeriesId ?? '')
    setIsNewCollection(false)
    setEditingSeriesName('')
    onOpenChange(false)
  }

  async function invalidateAfterSave() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['collections'] }),
      qc.invalidateQueries({ queryKey: ['library'] }),
      qc.invalidateQueries({ queryKey: ['library-series-view'] }),
    ])
    onSuccess?.()
  }

  async function handleNext() {
    setSubmitting(true)
    try {
      if (creatingNew) {
        if (!newName.trim()) return
        // Create the collection (and its default "Principal" series), then advance to step 2
        // so the user can rename the series before comics are added.
        const result = await collectionsApi.create({ name: newName.trim(), isPublic: false })
        setResolvedCollectionId(result.collection.id)
        setSelectedSeriesId(result.series.id)
        setIsNewCollection(true)
        setEditingSeriesName(result.series.name)
        setStep('series')
        return
      }
      if (!selectedId) return
      setResolvedCollectionId(selectedId)
      setSelectedSeriesId('')
      setStep('series')
    } catch {
      toast.error(t('collections.addComicError'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFinalConfirm() {
    setSubmitting(true)
    try {
      let seriesId = selectedSeriesId

      if (isNewCollection) {
        // seriesId was already set when the collection was created
        if (!seriesId) return
        // Rename the default series if the user changed it
        const trimmedName = editingSeriesName.trim()
        if (trimmedName) {
          await collectionSeriesApi.update(resolvedCollectionId, seriesId, { name: trimmedName })
        }
      } else {
        // Existing collection: fall back to the default (Principal) series if none selected
        if (!seriesId) {
          const principal = seriesList?.find((s) => s.isDefault)
          seriesId = principal?.id ?? ''
        }
        if (!seriesId) return
      }

      await libraryApi.addMultipleToCollection({
        comicIds: selectedComicIds,
        collectionSeriesId: seriesId,
      })
      toast.success(
        mode === 'single'
          ? t('collections.addComicSuccess')
          : t('collections.addMultipleSuccess', { count }),
      )
      await invalidateAfterSave()
      handleClose()
    } catch {
      toast.error(t('collections.addComicError'))
    } finally {
      setSubmitting(false)
    }
  }

  const canNext = !submitting && (creatingNew ? newName.trim().length > 0 : selectedId.length > 0)

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent side="right" className="w-full sm:w-[480px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {step === 'series' && (
              <button
                type="button"
                onClick={() => { setStep('collection'); setIsNewCollection(false); setEditingSeriesName('') }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            <SheetTitle className="text-lg">
              {step === 'collection'
                ? t('collections.addToCollectionTitle', { count })
                : isNewCollection
                  ? t('collections.configureSeriesTitle')
                  : t('collections.pickSeriesTitle')}
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* ── Step 1: Collection ── */}
        {step === 'collection' && (
          <>
            <div className="px-6 pt-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={t('collections.filterPlaceholder')}
                  value={collectionSearch}
                  onChange={(e) => setCollectionSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-1">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('common.loading')}</p>
              ) : filteredCollections.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <p className="text-sm text-muted-foreground text-center">
                    {!collections?.length ? t('collections.emptyState') : t('common.noResults')}
                  </p>
                  {collectionSearch.trim() && (
                    <button
                      type="button"
                      onClick={() => { setCreatingNew(true); setNewName(collectionSearch.trim()); setSelectedId('') }}
                      className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <Plus className="size-4" />
                      {t('collections.createNamed', { name: collectionSearch.trim() })}
                    </button>
                  )}
                </div>
              ) : (
                filteredCollections.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => { setSelectedId(col.id); setCreatingNew(false) }}
                    className={`w-full text-left px-3 py-3 rounded-lg text-sm border transition-colors flex items-center justify-between gap-2 ${
                      selectedId === col.id && !creatingNew
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <span className="truncate">{col.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {col._count?.comics ?? 0}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-border px-6 py-4 space-y-3 shrink-0">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => { setCreatingNew((v) => !v); setSelectedId('') }}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    creatingNew ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Plus className="size-4" />
                  {t('collections.createTitle')}
                </button>
                {creatingNew && (
                  <Input
                    autoFocus
                    placeholder={t('collections.namePlaceholder')}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && canNext) handleNext() }}
                    className="h-10"
                  />
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-11" onClick={handleClose}>
                  {t('common.cancel')}
                </Button>
                <Button className="flex-1 h-11" disabled={!canNext} onClick={handleNext}>
                  {submitting
                    ? t('common.saving')
                    : creatingNew
                      ? t('collections.create')
                      : t('common.next')}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Series ── */}
        {step === 'series' && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {isNewCollection ? (
                /* New collection: let the user rename the auto-created "Principal" series */
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('collections.seriesNameLabel')}
                  </label>
                  <Input
                    autoFocus
                    value={editingSeriesName}
                    onChange={(e) => setEditingSeriesName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !submitting) handleFinalConfirm() }}
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('collections.seriesNameHint')}
                  </p>
                </div>
              ) : isLoadingSeries ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('common.loading')}</p>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedSeriesId('')}
                    className={`w-full text-left px-3 py-3 rounded-lg text-sm border transition-colors flex items-center justify-between gap-2 ${
                      !selectedSeriesId
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <span className="truncate">{t('collections.principalSeries')}</span>
                    <span className="text-xs text-primary font-bold">{t('collections.default')}</span>
                  </button>
                  {seriesList
                    ?.filter((s) => !s.isDefault)
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSeriesId(s.id)}
                        className={`w-full text-left px-3 py-3 rounded-lg text-sm border transition-colors flex items-center justify-between gap-2 ${
                          selectedSeriesId === s.id
                            ? 'border-primary bg-primary/5 font-medium'
                            : 'border-border hover:bg-muted/40'
                        }`}
                      >
                        <span className="truncate">{s.name}</span>
                        {s.totalVolumes && (
                          <span className="text-xs text-muted-foreground shrink-0">{s.totalVolumes} vol.</span>
                        )}
                      </button>
                    ))}
                </>
              )}
            </div>

            <div className="border-t border-border px-6 py-4 shrink-0">
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-11" onClick={handleClose}>
                  {t('common.cancel')}
                </Button>
                <Button
                  className="flex-1 h-11"
                  disabled={submitting || (isNewCollection && !editingSeriesName.trim())}
                  onClick={handleFinalConfirm}
                >
                  {submitting ? t('common.saving') : t('collections.confirmAdd', { count })}
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

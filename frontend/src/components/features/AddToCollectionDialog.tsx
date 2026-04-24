import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Plus, Search, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { collectionsApi } from '@/api/collections'
import { collectionSeriesApi } from '@/api/collection-series'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export function AddToCollectionDialog({
  open,
  onClose,
  count,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  count: number
  onConfirm: (collectionId: string, seriesId: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  // Step 1 — collection
  const [step, setStep] = useState<'collection' | 'series'>('collection')
  const [selectedId, setSelectedId] = useState('')
  const [newName, setNewName] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [collectionSearch, setCollectionSearch] = useState('')

  // Step 2 — series
  const [resolvedCollectionId, setResolvedCollectionId] = useState('')
  const [selectedSeriesId, setSelectedSeriesId] = useState('')
  const [creatingNewSeries, setCreatingNewSeries] = useState(false)
  const [newSeriesName, setNewSeriesName] = useState('')

  const [submitting, setSubmitting] = useState(false)

  const { data: collections, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.getAll,
    enabled: open,
  })

  const { data: seriesList, isLoading: isLoadingSeries } = useQuery({
    queryKey: ['collection-series', resolvedCollectionId],
    queryFn: () => collectionSeriesApi.getByCollection(resolvedCollectionId),
    enabled: step === 'series' && !!resolvedCollectionId,
  })

  const filteredCollections = useMemo(() => {
    if (!collections) return []
    const q = collectionSearch.trim().toLowerCase()
    if (!q) return collections
    return collections.filter((c) => c.name.toLowerCase().includes(q))
  }, [collections, collectionSearch])

  function handleClose() {
    setStep('collection')
    setSelectedId('')
    setNewName('')
    setCreatingNew(false)
    setCollectionSearch('')
    setResolvedCollectionId('')
    setSelectedSeriesId('')
    setCreatingNewSeries(false)
    setNewSeriesName('')
    onClose()
  }

  async function handleNext() {
    setSubmitting(true)
    try {
      let collectionId = selectedId
      if (creatingNew) {
        if (!newName.trim()) return
        const col = await collectionsApi.create({ name: newName.trim(), isPublic: false })
        collectionId = col.id
        qc.invalidateQueries({ queryKey: ['collections'] })
      }
      if (!collectionId) return
      setResolvedCollectionId(collectionId)
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
      if (creatingNewSeries) {
        if (!newSeriesName.trim()) return
        const series = await collectionSeriesApi.create(resolvedCollectionId, newSeriesName.trim())
        seriesId = series.id
      }
      if (!seriesId) {
        const principal = seriesList?.find((s) => s.isDefault)
        seriesId = principal?.id ?? ''
      }
      if (!seriesId) return
      await onConfirm(resolvedCollectionId, seriesId)
      handleClose()
    } catch {
      toast.error(t('collections.addComicError'))
    } finally {
      setSubmitting(false)
    }
  }

  const canNext = !submitting && (creatingNew ? newName.trim().length > 0 : selectedId.length > 0)
  const canConfirm = !submitting && (creatingNewSeries ? newSeriesName.trim().length > 0 : true)

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent side="right" className="w-full sm:w-[480px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {step === 'series' && (
              <button
                type="button"
                onClick={() => setStep('collection')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            <SheetTitle className="text-lg">
              {step === 'collection'
                ? t('collections.addToCollectionTitle', { count })
                : t('collections.pickSeriesTitle')}
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* ── Step 1: Collection ─────────────────────────────────────────── */}
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
                  {submitting ? t('common.saving') : t('common.next')}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Series ─────────────────────────────────────────────── */}
        {step === 'series' && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
              {isLoadingSeries ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('common.loading')}</p>
              ) : (
                <>
                  {/* Principal / skip option */}
                  <button
                    type="button"
                    onClick={() => { setSelectedSeriesId(''); setCreatingNewSeries(false) }}
                    className={`w-full text-left px-3 py-3 rounded-lg text-sm border transition-colors flex items-center justify-between gap-2 ${
                      !selectedSeriesId && !creatingNewSeries
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
                        onClick={() => { setSelectedSeriesId(s.id); setCreatingNewSeries(false) }}
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

            <div className="border-t border-border px-6 py-4 space-y-3 shrink-0">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => { setCreatingNewSeries((v) => !v); setSelectedSeriesId('') }}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    creatingNewSeries ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Plus className="size-4" />
                  {t('collections.createSeriesTitle')}
                </button>
                {creatingNewSeries && (
                  <Input
                    autoFocus
                    placeholder={t('collections.seriesNamePlaceholder')}
                    value={newSeriesName}
                    onChange={(e) => setNewSeriesName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && canConfirm) handleFinalConfirm() }}
                    className="h-10"
                  />
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-11" onClick={handleClose}>
                  {t('common.cancel')}
                </Button>
                <Button className="flex-1 h-11" disabled={!canConfirm} onClick={handleFinalConfirm}>
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

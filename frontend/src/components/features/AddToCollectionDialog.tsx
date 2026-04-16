import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { collectionsApi } from '@/api/collections'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
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
  onConfirm: (collectionId: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState('')
  const [newName, setNewName] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [collectionSearch, setCollectionSearch] = useState('')

  const { data: collections, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.getAll,
    enabled: open,
  })

  const filteredCollections = useMemo(() => {
    if (!collections) return []
    const q = collectionSearch.trim().toLowerCase()
    if (!q) return collections
    return collections.filter((c) => c.name.toLowerCase().includes(q))
  }, [collections, collectionSearch])

  function handleClose() {
    setSelectedId('')
    setNewName('')
    setCreatingNew(false)
    setCollectionSearch('')
    onClose()
  }

  async function handleConfirm() {
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
      await onConfirm(collectionId)
      handleClose()
    } catch {
      toast.error(t('collections.addComicError'))
    } finally {
      setSubmitting(false)
    }
  }

  const canConfirm = !submitting && (creatingNew ? newName.trim().length > 0 : selectedId.length > 0)

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent side="right" className="w-full sm:w-[480px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-5 border-b border-border shrink-0">
          <SheetTitle className="text-lg">{t('collections.addToCollectionTitle', { count })}</SheetTitle>
        </SheetHeader>

        {/* Search */}
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

        {/* Collections list */}
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
          {/* Create new toggle */}
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
                onKeyDown={(e) => { if (e.key === 'Enter' && canConfirm) handleConfirm() }}
                className="h-10"
              />
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-11" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1 h-11" disabled={!canConfirm} onClick={handleConfirm}>
              {submitting ? t('common.saving') : t('collections.confirmAdd', { count })}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

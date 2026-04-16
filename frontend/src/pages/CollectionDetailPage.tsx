import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ArrowDown01, ArrowDownAZ, ArrowLeft, ArrowRightLeft, ArrowUp01, ArrowUpAZ,
  Bookmark, BookOpen, Check, Download, Eye,
  Filter, Globe, GripVertical, Heart, Library, Lock, Pencil,
  Plus, Search, Sparkles, Star, Trash2, X,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { collectionsApi } from '@/api/collections'
import { titleToColor } from '@/lib/colorHash'
import { libraryApi } from '@/api/library'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageContainer } from '@/components/layout/PageContainer'
import type { Collection, CollectionComic, CollectionComicUserStatus } from '@/types'

// ─── Interactive star rating ──────────────────────────────────────────────────

function StarRatingInput({ value, onChange }: { value?: number | null; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = hovered ?? value ?? 0
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHovered(i + 1)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(i + 1)}
          className="p-0.5 rounded hover:scale-110 transition-transform"
        >
          <Star
            className={`size-5 transition-colors ${
              i < display ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30 hover:text-amber-300'
            }`}
          />
        </button>
      ))}
      {value && (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="ml-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

// ─── Edit Collection Dialog ───────────────────────────────────────────────────

function EditCollectionDialog({ open, onClose, collection }: {
  open: boolean; onClose: () => void; collection: Collection
}) {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const schema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    isPublic: z.boolean(),
  })
  type Form = z.infer<typeof schema>
  const { register, handleSubmit, watch, setValue } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: collection.name, description: collection.description ?? '', isPublic: collection.isPublic },
  })
  const isPublic = watch('isPublic')
  const mutation = useMutation({
    mutationFn: (d: Form) => collectionsApi.update(collection.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['collection', collection.id] })
      toast.success(t('collections.updateSuccess'))
      onClose()
    },
  })
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t('collections.editTitle')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>{t('collections.nameLabel')}</Label>
            <Input {...register('name')} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('collections.descLabel')}</Label>
            <Input {...register('description')} />
          </div>
          <button
            type="button"
            onClick={() => setValue('isPublic', !isPublic)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left ${
              isPublic ? 'border-primary bg-primary/5' : 'border-border bg-background'
            }`}
          >
            {isPublic
              ? <Globe className="size-4 text-primary shrink-0" />
              : <Lock className="size-4 text-muted-foreground shrink-0" />}
            <div>
              <p className="text-sm font-medium">{isPublic ? t('collections.public') : t('collections.private')}</p>
              <p className="text-xs text-muted-foreground">
                {isPublic ? t('collections.publicHint') : t('collections.privateHint')}
              </p>
            </div>
          </button>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={mutation.isPending}>{t('collections.saveChanges')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Status badges (indicadores visuales de colección y lectura) ─────────────

type CollStatusFilter = 'IN_COLLECTION' | 'WISHLIST' | 'LOANED' | 'READ' | 'READING' | 'TO_READ'

const COLL_STATUS_ICON: Record<string, { Icon: typeof Library; color: string; i18nKey: string }> = {
  IN_COLLECTION: { Icon: Library,        color: 'text-primary',        i18nKey: 'collections.badge_IN_COLLECTION' },
  WISHLIST:      { Icon: Bookmark,       color: 'text-sky-500',        i18nKey: 'collections.badge_WISHLIST'      },
  LOANED:        { Icon: ArrowRightLeft, color: 'text-violet-500',     i18nKey: 'collections.badge_LOANED'        },
}
const READ_STATUS_ICON: Record<string, { Icon: typeof Library; color: string; i18nKey: string }> = {
  READ:    { Icon: Eye,      color: 'text-emerald-500',       i18nKey: 'collections.badge_READ'    },
  READING: { Icon: BookOpen, color: 'text-amber-500',         i18nKey: 'collections.badge_READING' },
  TO_READ: { Icon: Library,  color: 'text-muted-foreground/50', i18nKey: 'collections.badge_TO_READ' },
}

function InteractiveStatusBadges({
  status,
}: {
  comicId: string
  status: CollectionComicUserStatus | null | undefined
  onToggle: (comicId: string, flag: CollStatusFilter, current: boolean) => void
}) {
  const { t } = useTranslation()
  const collMeta = status?.collectionStatus ? COLL_STATUS_ICON[status.collectionStatus] : null
  const readMeta = status?.readStatus ? READ_STATUS_ICON[status.readStatus] : null
  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex items-center gap-1">
        {collMeta && (() => {
          const { Icon, color, i18nKey } = collMeta
          return (
            <Tooltip key="coll">
              <TooltipTrigger asChild>
                <span className="p-0.5">
                  <Icon className={`size-3.5 ${color}`} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">{t(i18nKey as never)}</TooltipContent>
            </Tooltip>
          )
        })()}
        {readMeta && (() => {
          const { Icon, color, i18nKey } = readMeta
          return (
            <Tooltip key="read">
              <TooltipTrigger asChild>
                <span className="p-0.5">
                  <Icon className={`size-3.5 ${color}`} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">{t(i18nKey as never)}</TooltipContent>
            </Tooltip>
          )
        })()}
        {/* placeholder invisible para mantener el layout cuando no hay iconos */}
        {!collMeta && !readMeta && <span className="size-3.5" />}
      </div>
    </TooltipProvider>
  )
}

function MiniRating({ value }: { value?: number | null }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-px">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-2.5 ${i < value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'}`}
        />
      ))}
    </div>
  )
}

// ─── Sortable comic item ──────────────────────────────────────────────────────

function SortableComicItem({
  item,
  index,
  totalCount,
  reordering,
  onRemove,
  isPendingRemove,
  onReposition,
  onStatusToggle,
}: {
  item: CollectionComic
  index: number
  totalCount: number
  reordering: boolean
  onRemove: (comicId: string) => void
  isPendingRemove: boolean
  onReposition: (comicId: string, newPos: number) => void
  onStatusToggle: (comicId: string, flag: StatusFlag, current: boolean) => void
}) {
  const { t } = useTranslation()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [posInput, setPosInput] = useState('')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.comicId,
    disabled: !reordering,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-transparent group/item transition-colors ${
        isDragging ? 'border-primary/50 bg-primary/5 shadow-md' : ''
      }`}
    >
      {/* Position badge / drag handle */}
      {reordering ? (
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      ) : (
        <input
          type="number"
          value={posInput !== '' ? posInput : (item.position ?? index + 1)}
          onChange={(e) => setPosInput(e.target.value)}
          onFocus={(e) => { setPosInput(String(item.position ?? index + 1)); e.target.select() }}
          onBlur={() => {
            const n = parseInt(posInput)
            if (!isNaN(n) && n >= 1 && n !== (item.position ?? index + 1)) {
              onReposition(item.comicId, n)
            }
            setPosInput('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') { setPosInput(''); (e.target as HTMLInputElement).blur() }
          }}
          className="shrink-0 w-9 h-7 text-center text-xs font-bold text-muted-foreground bg-transparent border border-transparent rounded hover:border-border focus:border-primary focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          title={t('collections.positionHint')}
        />
      )}

      {/* Cover */}
      <Link to={`/comics/${item.comic.id}`} className="shrink-0">
        <div className="size-10 rounded overflow-hidden bg-muted">
          {item.comic.coverUrl
            ? <img src={item.comic.coverUrl} alt={item.comic.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><BookOpen className="size-4 text-muted-foreground/40" /></div>}
        </div>
      </Link>

      {/* Info */}
      <Link to={`/comics/${item.comic.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
        <p className="text-sm font-medium truncate">{item.comic.title}</p>
        {(item.comic.issueNumber || item.comic.publisher || item.comic.year) && (
          <p className="text-xs text-muted-foreground truncate">
            {[
              item.comic.issueNumber && `#${item.comic.issueNumber}`,
              item.comic.publisher,
              item.comic.year,
            ].filter(Boolean).join(' · ')}
          </p>
        )}
        {item.comic.drawingStyle && (
          <p className="text-xs text-muted-foreground/70 italic truncate">{item.comic.drawingStyle}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <InteractiveStatusBadges
            comicId={item.comicId}
            status={item.userStatus}
            onToggle={onStatusToggle}
          />
          <MiniRating value={item.userStatus?.rating} />
        </div>
      </Link>

      {/* Remove */}
      {!reordering && (
        confirmRemove ? (
          <Button
            variant="ghost" size="icon"
            className="size-8 shrink-0 text-destructive hover:text-destructive"
            onClick={() => { onRemove(item.comicId); setConfirmRemove(false) }}
            disabled={isPendingRemove}
          >
            <Check className="size-3.5" />
          </Button>
        ) : (
          <Button
            variant="ghost" size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity"
            onClick={() => setConfirmRemove(true)}
          >
            <X className="size-3.5" />
          </Button>
        )
      )}
    </div>
  )
}

// ─── Add Comics Sheet (multi-select) ─────────────────────────────────────────

type AddAction = 'current' | 'other' | 'new'

function AddComicsSheet({ open, onClose, collectionId, existingIds }: {
  open: boolean; onClose: () => void; collectionId: string; existingIds: Set<string>
}) {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [action, setAction] = useState<AddAction>('current')
  const [targetCollectionId, setTargetCollectionId] = useState('')
  const [newColName, setNewColName] = useState('')
  const [committing, setCommitting] = useState(false)

  function resetAndClose() {
    setSearch(''); setSelected(new Set()); setAction('current')
    setTargetCollectionId(''); setNewColName('')
    onClose()
  }

  const { data: library } = useQuery({
    queryKey: ['library', 'ALL', 1],
    queryFn: () => libraryApi.getAll({ limit: 500 }),
    enabled: open,
  })

  const { data: allCollections } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.getAll,
    enabled: open && action === 'other',
  })

  const otherCollections = allCollections?.filter((c) => c.id !== collectionId) ?? []

  const available = useMemo(() => {
    const all = library?.data.filter((uc) => !existingIds.has(uc.comic.id)) ?? []
    if (!search.trim()) return all
    const q = search.toLowerCase()
    return all.filter((uc) =>
      uc.comic.title.toLowerCase().includes(q) ||
      uc.comic.collectionSeries?.name?.toLowerCase().includes(q) ||
      uc.comic.publisher?.toLowerCase().includes(q),
    )
  }, [library, existingIds, search])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === available.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(available.map((uc) => uc.comic.id)))
    }
  }

  async function commit() {
    if (selected.size === 0) return
    setCommitting(true)
    try {
      let targetId = collectionId
      if (action === 'other') {
        if (!targetCollectionId) return
        targetId = targetCollectionId
      } else if (action === 'new') {
        if (!newColName.trim()) return
        const col = await collectionsApi.create({ name: newColName.trim(), isPublic: false })
        targetId = col.id
        qc.invalidateQueries({ queryKey: ['collections'] })
      }
      await Promise.all([...selected].map((id) => collectionsApi.addComic(targetId, id)))
      qc.invalidateQueries({ queryKey: ['collection-comics', targetId] })
      qc.invalidateQueries({ queryKey: ['collection', targetId] })
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(t('collections.addMultipleSuccess', { count: selected.size }))
      resetAndClose()
    } catch {
      toast.error(t('collections.addComicError'))
    } finally {
      setCommitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) resetAndClose() }}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="p-5 pb-3 border-b">
          <SheetTitle>{t('collections.addComicTitle')}</SheetTitle>
        </SheetHeader>

        {/* Search + select all */}
        <div className="px-5 py-3 border-b space-y-2">
          <Input
            placeholder={t('common.search') + '…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {available.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {selected.size === available.length
                ? t('collections.deselectAll')
                : t('collections.selectAll', { count: available.length })}
            </button>
          )}
        </div>

        {/* Comic list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? t('common.noResults') : t('collections.allComicsAdded')}
            </p>
          ) : (
            available.map(({ comic }) => {
              const isSelected = selected.has(comic.id)
              return (
                <button
                  key={comic.id}
                  onClick={() => toggle(comic.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  {/* Checkbox indicator */}
                  <div className={`shrink-0 size-4 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                  }`}>
                    {isSelected && <Check className="size-2.5 text-primary-foreground" />}
                  </div>
                  <div className="size-9 rounded overflow-hidden bg-muted shrink-0">
                    {comic.coverUrl
                      ? <img src={comic.coverUrl} alt={comic.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen className="size-3.5 text-muted-foreground/40" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{comic.title}</p>
                    {(comic.collectionSeries?.name || comic.publisher) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[comic.collectionSeries?.name, comic.publisher].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Action bar — only shown when something is selected */}
        {selected.size > 0 && (
          <div className="border-t p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">{t('collections.selectedCount', { count: selected.size })}</p>

            {/* Destination selector */}
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {(['current', 'other', 'new'] as AddAction[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAction(a)}
                  className={`chip-sort border ${action === a ? 'border-primary chip-active' : 'border-border chip-inactive bg-background hover:bg-muted'}`}
                >
                  {t(`collections.actionDest_${a}`)}
                </button>
              ))}
            </div>

            {/* Other collection picker */}
            {action === 'other' && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {otherCollections.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('collections.noOtherCollections')}</p>
                ) : (
                  otherCollections.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => setTargetCollectionId(col.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                        targetCollectionId === col.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      {col.name}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* New collection name */}
            {action === 'new' && (
              <Input
                placeholder={t('collections.newCollectionName')}
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                className="h-8 text-sm"
              />
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={resetAndClose}>
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1"
                disabled={
                  committing ||
                  (action === 'other' && !targetCollectionId) ||
                  (action === 'new' && !newColName.trim())
                }
                onClick={commit}
              >
                {committing ? t('common.saving') : t('collections.confirmAdd', { count: selected.size })}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Suggestions Sheet ────────────────────────────────────────────────────────

function SuggestionsSheet({ open, onClose, collectionId, existingIds }: {
  open: boolean; onClose: () => void; collectionId: string; existingIds: Set<string>
}) {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [added, setAdded] = useState<Set<string>>(new Set())

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['collection-suggestions', collectionId],
    queryFn: () => collectionsApi.getSuggestions(collectionId),
    enabled: open,
  })

  const addMutation = useMutation({
    mutationFn: (comicId: string) => collectionsApi.addComic(collectionId, comicId),
    onSuccess: (_, comicId) => {
      setAdded((prev) => new Set(prev).add(comicId))
      qc.invalidateQueries({ queryKey: ['collection-comics', collectionId] })
      qc.invalidateQueries({ queryKey: ['collection', collectionId] })
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(t('collections.addComicSuccess'))
    },
  })

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            {t('collections.suggestions')}
          </SheetTitle>
        </SheetHeader>
        <p className="px-6 pb-4 text-sm text-muted-foreground">{t('collections.suggestionsHint')}</p>
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
          ) : !suggestions?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('collections.suggestionsEmpty')}</p>
          ) : (
            suggestions.map(({ comicId, comic }) => {
              const isAdded = existingIds.has(comicId) || added.has(comicId)
              return (
                <div key={comicId} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card">
                  <div className="size-9 rounded overflow-hidden bg-muted shrink-0">
                    {comic.coverUrl
                      ? <img src={comic.coverUrl} alt={comic.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen className="size-4 text-muted-foreground/40" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{comic.title}</p>
                    {(comic.collectionSeries?.name || comic.publisher) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[comic.collectionSeries?.name, comic.publisher].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm" variant={isAdded ? 'secondary' : 'default'}
                    className="h-7 text-xs gap-1 shrink-0"
                    disabled={isAdded} onClick={() => addMutation.mutate(comicId)}
                  >
                    {isAdded ? <><Check className="size-3" />{t('common.added')}</> : <><Plus className="size-3" />{t('common.add')}</>}
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type AutoSortField = 'title' | 'year' | 'issue'
type StatusFilterKey = 'owned' | 'read' | 'wishlist' | 'loaned'

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [localOrder, setLocalOrder] = useState<CollectionComic[] | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // A2 — search + status filter
  const [internalSearch, setInternalSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey | null>(null)
  // A3 — auto-sort
  const [autoSortField, setAutoSortField] = useState<AutoSortField | null>(null)
  const [autoSortDir, setAutoSortDir] = useState<'asc' | 'desc'>('asc')
  // B1 — export
  const [exporting, setExporting] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { data: collection, isLoading: loadingCol } = useQuery({
    queryKey: ['collection', id],
    queryFn: () => collectionsApi.getOne(id!),
    enabled: !!id,
  })

  const { data: comics, isLoading: loadingComics } = useQuery({
    queryKey: ['collection-comics', id],
    queryFn: () => collectionsApi.getComics(id!),
    enabled: !!id,
  })

  // Base order: local drag order > server order
  const displayComics = localOrder ?? comics ?? []
  const existingIds = useMemo(() => new Set(displayComics.map((c) => c.comicId)), [displayComics])

  // A2 — filtered view (never affects saved order)
  const filteredComics = useMemo(() => {
    let list = displayComics
    const q = internalSearch.trim().toLowerCase()
    if (q) {
      list = list.filter((item) =>
        item.comic.title.toLowerCase().includes(q) ||
        item.comic.collectionSeries?.name?.toLowerCase().includes(q) ||
        item.comic.publisher?.toLowerCase().includes(q),
      )
    }
    if (statusFilter) {
      list = list.filter((item) => {
        const s = item.userStatus
        if (!s) return false
        if (statusFilter === 'owned')    return s.collectionStatus === 'IN_COLLECTION'
        if (statusFilter === 'read')     return s.readStatus === 'READ'
        if (statusFilter === 'wishlist') return s.collectionStatus === 'WISHLIST'
        if (statusFilter === 'loaned')   return s.collectionStatus === 'LOANED'
        return true
      })
    }
    return list
  }, [displayComics, internalSearch, statusFilter])

  const removeMutation = useMutation({
    mutationFn: (comicId: string) => collectionsApi.removeComic(id!, comicId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-comics', id] })
      qc.invalidateQueries({ queryKey: ['collection', id] })
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(t('collections.removeComicSuccess'))
    },
    onError: () => toast.error(t('collections.removeComicError')),
  })

  const deleteMutation = useMutation({
    mutationFn: () => collectionsApi.remove(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(t('collections.deleteSuccess'))
      navigate('/collections')
    },
    onError: () => toast.error(t('collections.deleteError')),
  })

  const ratingMutation = useMutation({
    mutationFn: (rating: number) => collectionsApi.update(id!, { rating: rating || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection', id] })
      qc.invalidateQueries({ queryKey: ['collections'] })
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (items: { comicId: string; position: number }[]) =>
      collectionsApi.reorderComics(id!, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-comics', id] })
      toast.success(t('collections.reorderSuccess'))
    },
    onError: () => toast.error(t('collections.reorderError')),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const current = localOrder ?? comics ?? []
    const oldIndex = current.findIndex((c) => c.comicId === active.id)
    const newIndex = current.findIndex((c) => c.comicId === over.id)
    setLocalOrder(arrayMove(current, oldIndex, newIndex))
  }

  function saveReorder() {
    if (!localOrder) return
    const items = localOrder.map((c, i) => ({ comicId: c.comicId, position: i + 1 }))
    reorderMutation.mutate(items)
    setReordering(false)
    setLocalOrder(null)
  }

  function handleReposition(comicId: string, newPos: number) {
    const current = localOrder ?? comics ?? []
    // Assign the exact typed position to this comic; keep all others at their current position
    const updated = current.map((c, i) => ({
      ...c,
      position: c.comicId === comicId ? newPos : (c.position ?? i + 1),
    }))
    // Re-sort display order by position value (ascending)
    const reindexed = [...updated].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    const items = reindexed.map((c) => ({ comicId: c.comicId, position: c.position ?? 1 }))
    setLocalOrder(reindexed)
    reorderMutation.mutate(items)
  }

  function cancelReorder() {
    setLocalOrder(null)
    setReordering(false)
  }

  // statusToggleMutation mantenido por compatibilidad con InteractiveStatusBadges (ahora solo lectura)
  const statusToggleMutation = useMutation({
    mutationFn: ({ comicId, updates }: { comicId: string; updates: Parameters<typeof libraryApi.update>[1] }) =>
      libraryApi.update(comicId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-comics', id] })
    },
    onError: () => toast.error(t('collections.updateStatusError')),
  })

  function handleStatusToggle(_comicId: string, _flag: CollStatusFilter, _current: boolean) {
    // Los badges son ahora solo indicadores visuales; la edición se hace en ComicDetailPage
  }

  // A3 — auto-sort: calculates order and persists it via reorderComics
  function applyAutoSort(field: AutoSortField, dir: 'asc' | 'desc') {
    const base = comics ?? []
    const d = dir === 'asc' ? 1 : -1
    const sorted = [...base].sort((a, b) => {
      if (field === 'year') return d * ((a.comic.year ?? 0) - (b.comic.year ?? 0))
      if (field === 'title') return d * (a.comic.title ?? '').localeCompare(b.comic.title ?? '')
      if (field === 'issue') {
        const ai = parseFloat(a.comic.issueNumber ?? '0') || 0
        const bi = parseFloat(b.comic.issueNumber ?? '0') || 0
        return d * (ai - bi)
      }
      return 0
    })
    const items = sorted.map((c, i) => ({ comicId: c.comicId, position: i + 1 }))
    reorderMutation.mutate(items)
    setAutoSortField(field)
    setAutoSortDir(dir)
  }

  function handleAutoSortClick(field: AutoSortField) {
    const newDir = autoSortField === field && autoSortDir === 'asc' ? 'desc' : 'asc'
    applyAutoSort(field, newDir)
  }

  // B1 — export
  async function handleExport(format: 'csv' | 'json') {
    setExporting(true)
    try {
      const data = await collectionsApi.exportCollection(id!, format)
      const blob = format === 'csv' ? data : new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${collection?.name ?? 'collection'}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t('collections.exportError'))
    } finally {
      setExporting(false)
    }
  }

  const color = collection ? titleToColor(collection.name) : '#6366f1'

  if (loadingCol) {
    return (
      <PageContainer  className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </PageContainer>
    )
  }

  if (!collection) {
    return (
      <PageContainer className="text-center text-muted-foreground">
        <p>{t('collections.notFound')}</p>
        <Button variant="link" onClick={() => navigate('/collections')}>{t('collections.backToList')}</Button>
      </PageContainer>
    )
  }

  const yearLabel = collection.yearRange
    ? collection.yearRange.min === collection.yearRange.max
      ? String(collection.yearRange.min)
      : `${collection.yearRange.min} – ${collection.yearRange.max}`
    : null

  return (
    <PageContainer>
      {/* Back */}
      <button
        onClick={() => navigate('/collections')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="size-4" />
        {t('collections.backToList')}
      </button>

      {/* Header card */}
      <Card className="mb-6 overflow-hidden">
        <div className="h-2" style={{ backgroundColor: color }} />
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className="flex items-center justify-center size-14 rounded-2xl shrink-0"
                style={{ backgroundColor: `${color}26` }}
              >
                <span className="text-2xl font-bold" style={{ color }}>
                  {collection.name[0].toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight">{collection.name}</h1>
                {collection.description && (
                  <p className="text-muted-foreground mt-1 text-sm">{collection.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {collection.isPublic
                      ? <><Globe className="size-3" />{t('collections.public')}</>
                      : <><Lock className="size-3" />{t('collections.private')}</>}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t('collections.comicCount', { count: collection._count?.comics ?? 0 })}
                  </span>
                  {yearLabel && <span className="text-xs text-muted-foreground">{yearLabel}</span>}
                </div>
                {/* Rating */}
                <div className="mt-3">
                  <StarRatingInput
                    value={collection.rating}
                    onChange={(v) => ratingMutation.mutate(v)}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" disabled={exporting}>
                    <Download className="size-3.5" />
                    {t('collections.export')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    {t('collections.exportCsv')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    {t('collections.exportJson')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
              </Button>
              {confirmDelete ? (
                <Button
                  variant="ghost" size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  <Check className="size-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost" size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comics section */}
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t('collections.comicsInCollection')}</h2>
          <div className="flex items-center gap-2">
            {reordering ? (
              <>
                <Button variant="outline" size="sm" onClick={cancelReorder}>
                  {t('common.cancel')}
                </Button>
                <Button size="sm" onClick={saveReorder} disabled={reorderMutation.isPending}>
                  <Check className="size-3 mr-1" />{t('common.save')}
                </Button>
              </>
            ) : (
              <>
                {(displayComics.length > 1) && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setLocalOrder(comics ?? []); setReordering(true) }}>
                    <GripVertical className="size-3.5" />
                    {t('collections.reorder')}
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSuggestOpen(true)}>
                  <Sparkles className="size-3.5" />
                  {t('collections.suggestions')}
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
                  <Plus className="size-3.5" />
                  {t('collections.addComic')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* A3 — Auto-sort chips (only when not reordering and >1 comic) */}
        {!reordering && displayComics.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
              <Filter className="size-3" />{t('library.sortBy')}:
            </span>
            {(['title', 'year', 'issue'] as AutoSortField[]).map((field) => {
              const isActive = autoSortField === field
              const Icon = field === 'year'
                ? (autoSortDir === 'asc' ? ArrowDown01 : ArrowUp01)
                : (autoSortDir === 'asc' ? ArrowDownAZ : ArrowUpAZ)
              return (
                <button
                  key={field}
                  onClick={() => handleAutoSortClick(field)}
                  disabled={reorderMutation.isPending}
                  className={`chip-sort disabled:opacity-50 ${isActive ? 'chip-active' : 'chip-inactive'}`}
                >
                  {t(`collections.autoSort_${field}`)}
                  {isActive && <Icon className="size-3" />}
                </button>
              )
            })}
          </div>
        )}

        {/* A2 — Internal search + status filter chips */}
        {!reordering && displayComics.length > 0 && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder={t('collections.searchInCollection')}
                value={internalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['owned', 'read', 'wishlist', 'loaned'] as StatusFilterKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(statusFilter === key ? null : key)}
                  className={`chip-sort ${statusFilter === key ? 'chip-active' : 'chip-inactive'}`}
                >
                  {t(`collections.filter_${key}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comics list */}
        {loadingComics ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : displayComics.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-xl border-dashed">
            <BookOpen className="size-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t('collections.emptyCollection')}</p>
            <Button variant="link" size="sm" onClick={() => setAddOpen(true)}>
              {t('collections.addComic')}
            </Button>
          </div>
        ) : filteredComics.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-sm">{t('common.noResults')}</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={displayComics.map((c) => c.comicId)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {(reordering ? displayComics : filteredComics).map((item, i) => (
                  <SortableComicItem
                    key={item.comicId}
                    item={item}
                    index={i}
                    totalCount={displayComics.length}
                    reordering={reordering}
                    onRemove={(comicId) => removeMutation.mutate(comicId)}
                    isPendingRemove={removeMutation.isPending}
                    onReposition={handleReposition}
                    onStatusToggle={handleStatusToggle}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Modals / Sheets */}
      <EditCollectionDialog open={editOpen} onClose={() => setEditOpen(false)} collection={collection} />
      <AddComicsSheet open={addOpen} onClose={() => setAddOpen(false)} collectionId={id!} existingIds={existingIds} />
      <SuggestionsSheet open={suggestOpen} onClose={() => setSuggestOpen(false)} collectionId={id!} existingIds={existingIds} />
    </PageContainer>
  )
}

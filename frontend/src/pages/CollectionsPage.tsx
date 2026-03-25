import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Folders, Plus, Pencil, Trash2, Globe, Lock, BookOpen, ChevronDown, ChevronUp, X, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { collectionsApi } from '@/api/collections'
import { libraryApi } from '@/api/library'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Collection } from '@/types'

// ─── Create/Edit Dialog ───────────────────────────────────────────────────────

function CollectionDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Collection }) {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const isEdit = !!initial

  const collectionSchema = z.object({
    name: z.string().min(1, t('collections.validation.nameRequired')).max(60, t('collections.validation.nameTooLong')),
    description: z.string().max(200, t('collections.validation.descTooLong')).optional(),
    isPublic: z.boolean(),
  })
  type CollectionForm = z.infer<typeof collectionSchema>

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<CollectionForm>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      isPublic: initial?.isPublic ?? false,
    },
  })

  const isPublic = watch('isPublic')

  const mutation = useMutation({
    mutationFn: (data: CollectionForm) =>
      isEdit ? collectionsApi.update(initial!.id, data) : collectionsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(isEdit ? t('collections.updateSuccess') : t('collections.createSuccess'))
      reset()
      onClose()
    },
    onError: () => toast.error(t('collections.saveError')),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('collections.editTitle') : t('collections.createTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="col-name">{t('collections.nameLabel')}</Label>
            <Input id="col-name" placeholder={t('collections.namePlaceholder')} {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="col-desc">
              {t('collections.descLabel')}{' '}
              <span className="text-muted-foreground">{t('collections.descOptional')}</span>
            </Label>
            <Input id="col-desc" placeholder={t('collections.descPlaceholder')} {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <button
            type="button"
            onClick={() => setValue('isPublic', !isPublic)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left ${
              isPublic ? 'border-primary bg-primary/5' : 'border-border bg-background'
            }`}
          >
            {isPublic ? (
              <Globe className="size-4 text-primary shrink-0" />
            ) : (
              <Lock className="size-4 text-muted-foreground shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">{isPublic ? t('collections.public') : t('collections.private')}</p>
              <p className="text-xs text-muted-foreground">
                {isPublic ? t('collections.publicHint') : t('collections.privateHint')}
              </p>
            </div>
          </button>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? t('collections.saving')
                : isEdit
                  ? t('collections.saveChanges')
                  : t('collections.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add Comic Dialog ─────────────────────────────────────────────────────────

function AddComicDialog({ open, onClose, collectionId }: { open: boolean; onClose: () => void; collectionId: string }) {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [selectedComicId, setSelectedComicId] = useState('')

  const { data: library } = useQuery({
    queryKey: ['library', 'ALL', 1],
    queryFn: () => libraryApi.getAll({ limit: 100 }),
    enabled: open,
  })

  const { data: existing } = useQuery({
    queryKey: ['collection-comics', collectionId],
    queryFn: () => collectionsApi.getComics(collectionId),
    enabled: open,
  })

  const existingIds = new Set(existing?.map((e) => e.comicId) ?? [])
  const available = library?.data.filter((uc) => !existingIds.has(uc.comic.id)) ?? []

  const mutation = useMutation({
    mutationFn: () => collectionsApi.addComic(collectionId, selectedComicId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-comics', collectionId] })
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(t('collections.addComicSuccess'))
      setSelectedComicId('')
      onClose()
    },
    onError: () => toast.error(t('collections.addComicError')),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setSelectedComicId(''); onClose() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('collections.addComicTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>{t('collections.comicFromLibrary')}</Label>
            <Select value={selectedComicId} onValueChange={setSelectedComicId}>
              <SelectTrigger>
                <SelectValue placeholder={t('collections.selectComic')} />
              </SelectTrigger>
              <SelectContent>
                {available.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    {t('collections.allComicsAdded')}
                  </div>
                ) : (
                  available.map(({ comic }) => (
                    <SelectItem key={comic.id} value={comic.id}>
                      {comic.title}{comic.issueNumber ? ` #${comic.issueNumber}` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setSelectedComicId(''); onClose() }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={!selectedComicId || mutation.isPending}>
              {mutation.isPending ? t('common.adding') : t('common.add')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Collection Card ──────────────────────────────────────────────────────────

function CollectionCard({ collection, onEdit, onDelete }: { collection: Collection; onEdit: () => void; onDelete: () => void }) {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const { data: comics, isLoading: loadingComics } = useQuery({
    queryKey: ['collection-comics', collection.id],
    queryFn: () => collectionsApi.getComics(collection.id),
    enabled: expanded,
  })

  const removeMutation = useMutation({
    mutationFn: (comicId: string) => collectionsApi.removeComic(collection.id, comicId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-comics', collection.id] })
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(t('collections.removeComicSuccess'))
    },
    onError: () => toast.error(t('collections.removeComicError')),
  })

  const comicCount = collection._count?.comics ?? 0

  return (
    <>
      <Card className="group">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 shrink-0">
              <Folders className="size-5 text-primary" />
            </div>
            <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                aria-label={t('collections.editTitle')}
                onClick={onEdit}
              >
                <Pencil className="size-3.5" />
              </Button>
              {confirmDelete ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  aria-label={t('common.confirm')}
                  onClick={() => { onDelete(); setConfirmDelete(false) }}
                >
                  <Check className="size-3.5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  aria-label={t('common.delete')}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>

          <p className="font-semibold leading-tight truncate">{collection.name}</p>
          {collection.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{collection.description}</p>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 text-xs">
                {collection.isPublic ? (
                  <><Globe className="size-3" />{t('collections.public')}</>
                ) : (
                  <><Lock className="size-3" />{t('collections.private')}</>
                )}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {t('collections.comicCount', { count: comicCount })}
              </span>
            </div>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <><ChevronUp className="size-3.5" />{t('collections.hideComics')}</>
              ) : (
                <><ChevronDown className="size-3.5" />{t('collections.showComics')}</>
              )}
            </button>
          </div>

          {/* Comics list */}
          {expanded && (
            <div className="mt-4 space-y-2">
              {loadingComics ? (
                <>
                  <Skeleton className="h-12 rounded-lg" />
                  <Skeleton className="h-12 rounded-lg" />
                </>
              ) : comics?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">
                  {t('collections.emptyCollection')}
                </p>
              ) : (
                comics?.map(({ comic, comicId }) => (
                  <div key={comicId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 group/item">
                    <Link to={`/comics/${comic.id}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                      <div className="size-8 rounded bg-muted overflow-hidden shrink-0">
                        {comic.coverUrl ? (
                          <img src={comic.coverUrl} alt={comic.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="size-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{comic.title}</p>
                        {(comic.issueNumber || comic.publisher) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {[comic.issueNumber && `#${comic.issueNumber}`, comic.publisher].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    </Link>
                    {confirmRemoveId === comicId ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-destructive hover:text-destructive"
                        aria-label={t('common.confirm')}
                        onClick={() => { removeMutation.mutate(comicId); setConfirmRemoveId(null) }}
                      >
                        <Check className="size-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 sm:opacity-0 sm:group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        aria-label={t('common.delete')}
                        onClick={() => setConfirmRemoveId(comicId)}
                        disabled={removeMutation.isPending}
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))
              )}

              <Button variant="outline" size="sm" className="w-full gap-2 mt-1" onClick={() => setAddOpen(true)}>
                <Plus className="size-3.5" />
                {t('collections.addComic')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddComicDialog open={addOpen} onClose={() => setAddOpen(false)} collectionId={collection.id} />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CollectionsPage() {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Collection | undefined>()

  const { data: collections, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.getAll,
  })

  const removeMutation = useMutation({
    mutationFn: collectionsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      toast.success(t('collections.deleteSuccess'))
    },
    onError: () => toast.error(t('collections.deleteError')),
  })

  const openCreate = () => { setEditing(undefined); setDialogOpen(true) }
  const openEdit = (col: Collection) => { setEditing(col); setDialogOpen(true) }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('collections.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('collections.subtitle')}</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          {t('collections.newCollection')}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : !collections?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-muted mb-4">
            <Folders className="size-8 text-muted-foreground" />
          </div>
          <p className="font-medium">{t('collections.emptyState')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('collections.emptyStateHint')}</p>
          <Button onClick={openCreate} className="mt-4 gap-2">
            <Plus className="size-4" />
            {t('collections.newCollection')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {collections.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              onEdit={() => openEdit(col)}
              onDelete={() => removeMutation.mutate(col.id)}
            />
          ))}
        </div>
      )}

      <CollectionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} initial={editing} />
    </div>
  )
}

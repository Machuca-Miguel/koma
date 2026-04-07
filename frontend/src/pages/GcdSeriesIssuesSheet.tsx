import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BookOpen, Check, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { gcdApi } from '@/api/gcd'
import { libraryApi } from '@/api/library'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface GcdSeriesIssuesSheetProps {
  gcdSeriesId: number | null
  seriesName: string
  onClose: () => void
  onAdded?: (externalId: string) => void
}

export function GcdSeriesIssuesSheet({
  gcdSeriesId,
  seriesName,
  onClose,
  onAdded,
}: GcdSeriesIssuesSheetProps) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [addingId, setAddingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['gcd-series-issues', gcdSeriesId],
    queryFn: () => gcdApi.getSeriesCompletion(gcdSeriesId!),
    enabled: !!gcdSeriesId,
    staleTime: 5 * 60 * 1000,
  })

  const importMutation = useMutation({
    mutationFn: async (gcdId: string) => {
      setAddingId(gcdId)
      const { comic: imported } = await gcdApi.import(gcdId)
      try {
        await libraryApi.add({ comicId: imported.id, isOwned: true })
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status !== 409) throw err
      }
      return gcdId
    },
    onSuccess: (gcdId) => {
      setAddedIds((prev) => new Set(prev).add(gcdId))
      setAddingId(null)
      qc.invalidateQueries({ queryKey: ['library'] })
      qc.invalidateQueries({ queryKey: ['library-stats'] })
      toast.success(t('search.addSuccess'))
      onAdded?.(gcdId)
    },
    onError: () => {
      setAddingId(null)
      toast.error(t('search.addError'))
    },
  })

  const total = data?.total ?? 0
  const ownedCount = data ? data.owned + addedIds.size : 0
  const pct = total > 0 ? Math.min(100, Math.round((ownedCount / total) * 100)) : 0
  const allOwned = data ? data.issues.every((i) => i.isOwned || addedIds.has(i.gcdId)) : false

  return (
    <Sheet open={!!gcdSeriesId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:w-[560px] flex flex-col gap-0 p-0">
        {/* Header with progress */}
        <div className="px-6 pt-6 pb-5 border-b border-border shrink-0">
          <SheetHeader className="text-left mb-4">
            <SheetTitle className="text-lg">{seriesName}</SheetTitle>
          </SheetHeader>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : data && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {allOwned
                    ? t('library.completionFull')
                    : t('library.completionOwned', { owned: ownedCount, total })}
                </span>
                <span className={`font-semibold ${allOwned ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  {pct}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${allOwned ? 'bg-emerald-500' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Issues list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-4" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-1/5" />
                  </div>
                  <Skeleton className="size-7 rounded" />
                </div>
              ))}
            </div>
          ) : data && data.issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <BookOpen className="size-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">{t('search.seriesNoIssues')}</p>
            </div>
          ) : data && (
            data.issues.map((issue) => {
              const isAdded = issue.isOwned || addedIds.has(issue.gcdId)
              const isPending = addingId === issue.gcdId

              return (
                <div
                  key={issue.gcdId}
                  className={`flex items-center gap-3 px-4 py-2.5 ${issue.isOwned ? 'bg-muted/20' : ''}`}
                >
                  <span className="shrink-0 w-10 text-right text-sm font-mono text-muted-foreground">
                    #{issue.issueNumber ?? '?'}
                  </span>

                  <div className="flex-1 min-w-0">
                    {issue.title && (
                      <p className={`text-sm truncate ${issue.isOwned ? 'font-medium' : ''}`}>{issue.title}</p>
                    )}
                    {issue.year && (
                      <p className="text-xs text-muted-foreground">{issue.year}</p>
                    )}
                  </div>

                  {isAdded ? (
                    <span className="shrink-0 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <Check className="size-3.5" />
                      {t(issue.isOwned ? 'status.OWNED' : 'common.added')}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      disabled={importMutation.isPending}
                      onClick={() => importMutation.mutate(issue.gcdId)}
                    >
                      {isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                      {t('common.add')}
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

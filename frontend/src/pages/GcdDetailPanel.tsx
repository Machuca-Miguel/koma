import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus, Check, Users, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { gcdApi } from '@/api/gcd'
import { libraryApi } from '@/api/library'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

interface GcdDetailPanelProps {
  externalId: string | null
  isAdded: boolean
  onClose: () => void
  onAdded: (externalId: string) => void
}

export function GcdDetailPanel({ externalId, isAdded, onClose, onAdded }: GcdDetailPanelProps) {
  const qc = useQueryClient()
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ['gcd-detail', externalId],
    queryFn: () => gcdApi.getDetail(externalId!),
    enabled: !!externalId,
    staleTime: 5 * 60 * 1000,
  })

  const importMutation = useMutation({
    mutationFn: async () => {
      const { comic: imported } = await gcdApi.import(externalId!)
      try {
        await libraryApi.add({ comicId: imported.id, status: 'OWNED' })
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status !== 409) throw err
      }
      return externalId!
    },
    onSuccess: (id) => {
      onAdded(id)
      qc.invalidateQueries({ queryKey: ['library'] })
      qc.invalidateQueries({ queryKey: ['library-stats'] })
      toast.success(t('gcdPanel.addSuccess'))
    },
    onError: () => toast.error(t('gcdPanel.addError')),
  })

  return (
    <Sheet open={!!externalId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[420px] sm:w-[540px] overflow-y-auto flex flex-col gap-0 p-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="w-full aspect-[2/3] max-w-[160px] rounded-xl" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : data ? (
          <>
            {/* Header: cover + title + metadata */}
            <div className="flex gap-5 p-6 pb-5">
              <div className="shrink-0 w-32 aspect-[2/3] rounded-xl overflow-hidden bg-muted">
                {data.coverUrl ? (
                  <img
                    src={data.coverUrl}
                    alt={data.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="size-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <SheetHeader className="text-left space-y-0.5 mb-2">
                    <SheetTitle className="text-lg leading-tight">
                      {data.title}
                      {data.issueNumber && (
                        <span className="text-muted-foreground font-normal ml-1.5">
                          #{data.issueNumber}
                        </span>
                      )}
                    </SheetTitle>
                  </SheetHeader>

                  <div className="text-sm text-muted-foreground space-y-0.5">
                    {data.publisher && <p>{data.publisher}</p>}
                    <p className="flex gap-2">
                      {data.year && <span>{data.year}</span>}
                      {data.pageCount && (
                        <span>{t('gcdPanel.pages', { count: data.pageCount })}</span>
                      )}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={isAdded ? 'outline' : 'default'}
                  className="mt-4 gap-1.5 self-start"
                  disabled={isAdded || importMutation.isPending}
                  onClick={() => importMutation.mutate()}
                >
                  {isAdded ? (
                    <><Check className="size-3.5" />{t('gcdPanel.added')}</>
                  ) : importMutation.isPending ? (
                    t('gcdPanel.adding')
                  ) : (
                    <><Plus className="size-3.5" />{t('gcdPanel.addToLibrary')}</>
                  )}
                </Button>
              </div>
            </div>

            {/* Synopsis */}
            {data.synopsis && (
              <>
                <Separator />
                <div className="px-6 py-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">{data.synopsis}</p>
                </div>
              </>
            )}

            {/* Creators */}
            {data.creators.length > 0 && (
              <>
                <Separator />
                <div className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('gcdPanel.creators')}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {data.creators.map(({ role, names }) => (
                      <div key={role} className="flex gap-3 text-sm">
                        <span className="text-muted-foreground shrink-0 w-20">{role}</span>
                        <span className="font-medium">{names.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Stories */}
            {data.stories.length > 0 && (
              <>
                <Separator />
                <div className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('gcdPanel.stories')}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {data.stories.map((story, i) => (
                      <div key={i} className="space-y-0.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium">
                            {story.title ?? (
                              <span className="text-muted-foreground italic">
                                {t('gcdPanel.noTitle')}
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            {story.type && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                {story.type}
                              </span>
                            )}
                            {story.pageCount && (
                              <span className="text-xs text-muted-foreground">{story.pageCount}p</span>
                            )}
                          </div>
                        </div>
                        {story.synopsis && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{story.synopsis}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

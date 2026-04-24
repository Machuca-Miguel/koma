import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Sparkles, BookOpen, ChevronRight, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { libraryApi } from '@/api/library'
import { discoverApi } from '@/api/discover'
import type { Recommendation } from '@/api/discover'
import type { UserComic } from '@/types'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

function groupBySeries(comics: UserComic[]): [string, UserComic[]][] {
  const map = new Map<string, UserComic[]>()
  for (const uc of comics) {
    const key = uc.collectionSeries?.name ?? ''
    if (!key) continue
    const arr = map.get(key) ?? []
    arr.push(uc)
    map.set(key, arr)
  }
  return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
}

export function DiscoverPage() {
  const { t } = useTranslation()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

  const { data: libraryData } = useQuery({
    queryKey: ['library', { page: 1, limit: 200, sortBy: 'series_asc' }],
    queryFn: () => libraryApi.getAll({ sortBy: 'series_asc', page: 1, limit: 200 }),
  })

  const seriesGroups = groupBySeries(libraryData?.data ?? [])

  const recommendMutation = useMutation({
    mutationFn: () => discoverApi.getRecommendations(),
    onSuccess: (data) => setRecommendations(data),
  })

  return (
    <PageContainer  className="space-y-10">
      <PageHeader title={t('discover.title')} description={t('discover.subtitle')} className="mb-0" />

      {/* AI Recommendations */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              {t('discover.recommendSection')}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('discover.recommendationsIntro')}
            </p>
          </div>
          <Button
            onClick={() => recommendMutation.mutate()}
            disabled={recommendMutation.isPending}
            size="sm"
            className="shrink-0"
          >
            {recommendMutation.isPending && (
              <Loader2 className="size-4 mr-2 animate-spin" />
            )}
            {recommendMutation.isPending
              ? t('discover.loadingRecommendations')
              : t('discover.getRecommendations')}
          </Button>
        </div>

        {recommendMutation.isError && (
          <p className="text-sm text-destructive">{t('discover.recommendError')}</p>
        )}

        {recommendations.length === 0 &&
          !recommendMutation.isPending &&
          !recommendMutation.isError && (
            <p className="text-sm text-muted-foreground">{t('discover.noRecommendations')}</p>
          )}

        {recommendations.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((rec, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-snug">{rec.title}</CardTitle>
                  <CardDescription>{rec.author}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {t('discover.recommendWhy')}:
                    </span>{' '}
                    {rec.why}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Series in collection */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            {t('discover.seriesSection')}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t('discover.seriesHint')}</p>
        </div>

        {seriesGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('discover.noSeries')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {seriesGroups.map(([name, comics]) => (
              <Link key={name} to="/library">
                <Card className="hover:bg-accent transition-colors cursor-pointer">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium truncate">{name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {t('discover.owned', { count: comics.length })}
                    </Badge>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  )
}

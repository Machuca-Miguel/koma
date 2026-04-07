import { BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import type { PublisherGroup, ExternalComic } from '@/types'

const MAX_COVERS = 4

function getYearRange(items: ExternalComic[]): { min: number; max: number } | null {
  let min = Infinity
  let max = -Infinity
  for (const item of items) {
    if (item.year !== undefined) {
      if (item.year < min) min = item.year
      if (item.year > max) max = item.year
    }
  }
  return min === Infinity ? null : { min, max }
}

interface PublisherGroupCardProps {
  group: PublisherGroup
  onClick: () => void
}

export function PublisherGroupCard({ group, onClick }: PublisherGroupCardProps) {
  const { t } = useTranslation()
  const covers = group.items
    .filter((i) => i.coverUrl)
    .slice(0, MAX_COVERS)
    .map((i) => i.coverUrl!)

  const yearRange = getYearRange(group.items)
  const yearLabel = yearRange
    ? yearRange.min === yearRange.max
      ? String(yearRange.min)
      : `${yearRange.min}–${yearRange.max}`
    : null

  const emptySlots = covers.length > 0 ? MAX_COVERS - covers.length : 0
  const isWide = group.count > 2

  return (
    <Card
      className={`cursor-pointer overflow-hidden transition-colors hover:bg-muted/40 ring-1 ring-border hover:ring-primary/40${isWide ? ' col-span-2 sm:col-span-3' : ''}`}
      onClick={onClick}
    >
      {/* Cover thumbnails strip — gap-px creates hairline dividers via bg-border background */}
      <div className="grid grid-cols-4 h-24 bg-border gap-px">
        {covers.length > 0 ? (
          <>
            {covers.map((url, idx) => (
              <div key={idx} className="relative overflow-hidden h-full bg-muted">
                <img
                  src={url}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            ))}
            {Array.from({ length: emptySlots }).map((_, idx) => (
              <div key={`empty-${idx}`} className="bg-muted/60 h-full" />
            ))}
          </>
        ) : (
          <div className="col-span-4 flex items-center justify-center h-full bg-muted">
            <BookOpen className="size-8 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <CardContent className="p-3 space-y-0.5">
        <p className="text-sm font-semibold leading-tight truncate">{group.publisher}</p>
        <p className="text-xs text-muted-foreground">
          {t('search.resultCount', { count: group.count })}
          {yearLabel ? ` · ${yearLabel}` : ''}
        </p>
      </CardContent>
    </Card>
  )
}

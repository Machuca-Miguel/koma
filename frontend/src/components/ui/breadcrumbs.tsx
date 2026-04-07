import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs'

export function Breadcrumbs() {
  const items = useBreadcrumbs()

  if (items.length <= 1) return null

  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1 text-sm mb-2">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground/50 shrink-0" />}
            {isLast || !item.href ? (
              <span className={isLast ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}

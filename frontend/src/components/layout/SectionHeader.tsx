import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface SectionHeaderProps {
  title: string
  viewAllHref?: string
  viewAllLabel?: string
  extra?: ReactNode
  className?: string
}

export function SectionHeader({
  title,
  viewAllHref,
  viewAllLabel = 'View All',
  extra,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-5 ${className}`}>
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="flex items-center gap-3">
        {extra}
        {viewAllHref && (
          <Link to={viewAllHref} className="view-all-link">
            {viewAllLabel}
          </Link>
        )}
      </div>
    </div>
  )
}

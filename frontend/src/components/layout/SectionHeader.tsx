import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
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
  viewAllLabel,
  extra,
  className = '',
}: SectionHeaderProps) {
  const { t } = useTranslation()
  const defaultLabel = viewAllLabel || t('common.viewAll')

  return (
    <div className={`flex items-center justify-between mb-5 ${className}`}>
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="flex items-center gap-3">
        {extra}
        {viewAllHref && (
          <Link to={viewAllHref} className="view-all-link">
            {defaultLabel}
          </Link>
        )}
      </div>
    </div>
  )
}

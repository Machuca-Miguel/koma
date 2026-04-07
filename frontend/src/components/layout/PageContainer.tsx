import type { ReactNode } from 'react'

type PageSize = 'default' | 'narrow' | 'xs'

const SIZE_CLASS: Record<PageSize, string> = {
  default: 'max-w-5xl',
  narrow:  'max-w-4xl',
  xs:      'max-w-2xl',
}

export function PageContainer({
  children,
  size = 'default',
  className = '',
}: {
  children: ReactNode
  size?: PageSize
  className?: string
}) {
  return (
    <div className={`p-8 ${SIZE_CLASS[size]} mx-auto ${className}`}>
      {children}
    </div>
  )
}

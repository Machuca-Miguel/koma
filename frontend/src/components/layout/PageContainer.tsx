import type { ReactNode } from 'react'

type PageSize = 'default' | 'narrow' | 'xs' | 'wide'

const SIZE_CLASS: Record<PageSize, string> = {
  wide:    'max-w-9xl',
  default: 'max-w-7xl',
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
    <div className={`px-8 ${SIZE_CLASS[size]} mx-auto ${className}`}>
      {children}
    </div>
  )
}

import { Lock } from 'lucide-react'

interface CollectionStatusBadgeProps {
  isPublic: boolean
  className?: string
}

export function CollectionStatusBadge({ isPublic, className = '' }: CollectionStatusBadgeProps) {
  if (isPublic) return null
  return (
    <div
      className={`inline-flex items-center gap-1 bg-muted backdrop-blur-sm text-primary/80 rounded p-1.5 ${className}`}
      title="Privada"
    >
      <Lock className="size-3" />
    </div>
  )
}

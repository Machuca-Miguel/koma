import { useState, useEffect, useRef } from 'react'
import { Trash2, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface ConfirmDeleteButtonProps {
  onConfirm: () => void
  disabled?: boolean
  label?: string
  className?: string
}

export function ConfirmDeleteButton({
  onConfirm,
  disabled = false,
  label,
  className,
}: ConfirmDeleteButtonProps) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pending) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPending(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pending])

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center h-8 overflow-hidden rounded-full backdrop-blur-sm transition-all duration-300',
        pending
          ? 'bg-destructive/90 pl-1.5 pr-1 gap-1.5'
          : 'bg-muted/80 px-1.5',
        className,
      )}
    >
      <button
        className="shrink-0 flex items-center justify-center text-destructive disabled:opacity-50 transition-colors duration-300"
        style={{ color: pending ? 'white' : undefined }}
        onClick={() => !pending && setPending(true)}
        disabled={disabled}
        aria-label="Delete"
      >
        <Trash2 className={cn('transition-all duration-300', pending ? 'size-4' : 'size-5')} />
      </button>

      {/* Expanding content */}
      <div
        className={cn(
          'flex items-center gap-1.5 overflow-hidden transition-all duration-300',
          pending ? 'max-w-32 opacity-100' : 'max-w-0 opacity-0',
        )}
      >
        <span className="text-xs font-semibold text-white whitespace-nowrap select-none">
          {label ?? t('common.delete')}
        </span>
        <button
          className="shrink-0 bg-white/20 hover:bg-white/30 text-white rounded-full p-0.5 transition-colors cursor-pointer"
          onClick={() => { onConfirm(); setPending(false) }}
          aria-label="Confirm delete"
        >
          <Check className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

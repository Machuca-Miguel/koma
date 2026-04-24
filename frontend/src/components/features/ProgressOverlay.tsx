import type { ReactNode } from 'react'

interface ProgressOverlayProps {
  current: number
  total: number | null
  children: ReactNode
}

export function ProgressOverlay({ current, total, children }: ProgressOverlayProps) {
  const pct = total && total > 0 ? Math.min(Math.round((current / total) * 100), 100) : null
  const show = current > 0 || (total !== null && total > 0)

  return (
    <div className="relative h-full">
      {children}
      {show && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold tabular-nums text-white/90 shrink-0">
              {total ? `${current}/${total}` : current}
            </span>
            {pct !== null && (
              <div className="flex-1 bg-white/30 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-white h-full rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

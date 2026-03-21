import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      className={cn(
        'relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border border-border transition-colors duration-200',
        isDark ? 'bg-secondary' : 'bg-secondary'
      )}
    >
      {/* Icono sol — lado izquierdo */}
      <Sun className="absolute left-1.5 size-3.5 text-muted-foreground" />

      {/* Icono luna — lado derecho */}
      <Moon className="absolute right-1.5 size-3.5 text-muted-foreground" />

      {/* Círculo deslizable */}
      <span
        className={cn(
          'absolute size-5 rounded-full bg-primary shadow-sm transition-transform duration-200',
          isDark ? 'translate-x-[1.875rem]' : 'translate-x-1'
        )}
      />
    </button>
  )
}

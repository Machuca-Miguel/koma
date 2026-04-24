import { useState } from 'react'
import { Input } from '@/components/ui/input'

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  label,
  className,
}: {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
  label: string
  className?: string
}) {
  const [show, setShow] = useState(false)
  const filtered = suggestions
    .filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value)
    .slice(0, 6)

  return (
    <div className={`space-y-1.5 relative ${className ?? ''}`}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setShow(true) }}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 150)}
        placeholder={placeholder}
        className="h-9"
      />
      {show && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md text-sm overflow-hidden">
          {filtered.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={() => { onChange(s); setShow(false) }}
                className="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

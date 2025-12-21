import { cn } from '@/lib/utils'
import type { VariationCount } from '@/lib/storage'

interface VariationSelectorProps {
  value: VariationCount
  onChange: (value: VariationCount) => void
  disabled?: boolean
}

const VARIATIONS: VariationCount[] = [1, 2, 3, 4]

const VARIATION_COLORS: Record<VariationCount, string> = {
  1: 'bg-[hsl(var(--variation-1))]',
  2: 'bg-[hsl(var(--variation-2))]',
  3: 'bg-[hsl(var(--variation-3))]',
  4: 'bg-[hsl(var(--variation-4))]',
}

export function VariationSelector({ value, onChange, disabled }: VariationSelectorProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
      {VARIATIONS.map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          disabled={disabled}
          className={cn(
            'relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            value === v
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          )}
        >
          <div className="flex gap-0.5">
            {Array.from({ length: v }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  value === v ? VARIATION_COLORS[(i + 1) as VariationCount] : 'bg-muted-foreground/40'
                )}
              />
            ))}
          </div>
          <span>x{v}</span>
        </button>
      ))}
    </div>
  )
}

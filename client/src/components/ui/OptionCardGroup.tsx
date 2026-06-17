import type { ReactNode } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export interface OptionCard<T extends string> {
  value: T
  label: string
  description: string
  preview: ReactNode
}

interface Props<T extends string> {
  options: readonly OptionCard<T>[]
  value: T
  onChange: (value: T) => void
}

// Selectable cards with a visual preview — used for settings like layout mode
export function OptionCardGroup<T extends string>({ options, value, onChange }: Props<T>) {
  const { theme } = useTheme()

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="flex flex-col gap-3 p-4 rounded-xl text-left transition-opacity hover:opacity-90"
            style={{
              border: `1px solid ${selected ? theme.accent : theme.border}`,
              background: selected ? `${theme.accent}08` : theme.surface2,
              boxShadow: selected ? `0 0 0 3px ${theme.accent}15` : 'none',
            }}
          >
            <div
              className="w-full rounded-lg p-3"
              style={{ background: theme.surface, border: `1px solid ${theme.border}`, minHeight: '60px' }}
            >
              {option.preview}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: theme.text }}>{option.label}</p>
              <p className="text-xs mt-0.5" style={{ color: theme.text2 }}>{option.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

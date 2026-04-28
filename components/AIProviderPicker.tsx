'use client'
import { type AIProvider, providerShort } from '@/lib/aiProvider'

type Props = {
  value: AIProvider
  onChange: (p: AIProvider) => void
  disabled?: boolean
}

/**
 * Compact two-button toggle: Claude | GPT.
 * Renders inline, intended to sit next to a "Generate"-style button.
 */
export default function AIProviderPicker({ value, onChange, disabled }: Props) {
  const opts: { v: AIProvider; color: string; bg: string }[] = [
    { v: 'anthropic', color: '#d4a843', bg: 'rgba(212,168,67,0.15)' },
    { v: 'openai',    color: '#7bc87b', bg: 'rgba(123,200,123,0.15)' },
  ]
  return (
    <div
      role="radiogroup"
      aria-label="AI provider"
      style={{ display: 'inline-flex', gap: 0, border: '1px solid rgba(180,140,80,0.2)', borderRadius: 4, overflow: 'hidden', height: 36 }}
    >
      {opts.map(o => {
        const active = o.v === value
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => !disabled && onChange(o.v)}
            disabled={disabled}
            style={{
              padding: '0 14px',
              background: active ? o.bg : 'transparent',
              border: 'none',
              borderLeft: o.v === 'openai' ? '1px solid rgba(180,140,80,0.2)' : 'none',
              color: active ? o.color : '#6a5a40',
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              letterSpacing: '0.5px',
            }}
            title={`Use ${providerShort(o.v)} for next generation`}
          >
            {providerShort(o.v)}
          </button>
        )
      })}
    </div>
  )
}

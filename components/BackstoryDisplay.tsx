'use client'
import { useState } from 'react'

/**
 * Displays a song backstory with collapse/expand if long.
 * Renders simple paragraphs from plain text or basic markdown.
 */
export default function BackstoryDisplay({
  text,
  readMoreLabel = 'Read more',
  readLessLabel = 'Show less',
  accent = '#d4a843',
}: {
  text: string
  readMoreLabel?: string
  readLessLabel?: string
  accent?: string
}) {
  const [expanded, setExpanded] = useState(false)
  if (!text?.trim()) return null

  const COLLAPSED_CHARS = 380
  const isLong = text.length > COLLAPSED_CHARS
  const visible = expanded || !isLong ? text : text.slice(0, COLLAPSED_CHARS).trimEnd() + '…'

  // Split paragraphs by blank lines
  const paragraphs = visible.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${accent}25`,
      borderRadius: 12,
      padding: '20px 22px',
    }}>
      {paragraphs.map((p, i) => (
        <p key={i} style={{
          color: '#c8c0b0',
          fontSize: 15,
          lineHeight: 1.7,
          margin: i === 0 ? '0 0 12px' : '0 0 12px',
        }}>{p}</p>
      ))}
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: 'transparent',
            border: 'none',
            color: accent,
            cursor: 'pointer',
            fontSize: 13,
            padding: 0,
            marginTop: 4,
            textDecoration: 'underline',
          }}
        >
          {expanded ? readLessLabel : readMoreLabel}
        </button>
      )}
    </div>
  )
}

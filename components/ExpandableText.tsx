'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { t, useLang } from '@/lib/i18n'

const DEFAULT_COLLAPSED_LINES = 4

function splitParagraphs(text: string) {
  return text.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
}

export default function ExpandableText({
  text,
  className = '',
  style,
  paragraphStyle,
  accent = '#d4a843',
  readMoreLabel,
  readLessLabel,
  collapsedLines = DEFAULT_COLLAPSED_LINES,
  fadeToColor = '#0a0a0f',
  maxWidth,
}: {
  text: string
  className?: string
  style?: CSSProperties
  paragraphStyle?: CSSProperties
  accent?: string
  readMoreLabel?: string
  readLessLabel?: string
  collapsedLines?: number
  fadeToColor?: string
  maxWidth?: number | string
}) {
  const lang = useLang()
  const tx = t[lang]
  const bodyRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [needsToggle, setNeedsToggle] = useState(false)

  const trimmed = text?.trim()
  if (!trimmed) return null

  const paragraphs = splitParagraphs(trimmed)
  const readMore = readMoreLabel ?? tx.readMore
  const readLess = readLessLabel ?? tx.showLess

  const lineCount = trimmed.split('\n').length
  const likelyShort =
    trimmed.length <= 200 &&
    paragraphs.length <= 1 &&
    lineCount <= collapsedLines &&
    !trimmed.includes('\n\n')

  useEffect(() => {
    if (likelyShort) {
      setNeedsToggle(false)
      return
    }
    const el = bodyRef.current
    if (!el) return

    const measure = () => {
      const hadCollapsed = el.classList.contains('is-collapsed')
      if (hadCollapsed) el.classList.remove('is-collapsed')
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24
      const maxHeight = lineHeight * collapsedLines
      const overflow = el.scrollHeight > maxHeight + 2
      if (hadCollapsed && !expanded) el.classList.add('is-collapsed')
      setNeedsToggle(overflow)
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [trimmed, collapsedLines, likelyShort, expanded])

  const bodyStyle = {
    '--expandable-fade-to': fadeToColor,
    '--expandable-max-lines': collapsedLines,
  } as CSSProperties

  const content = paragraphs.map((p, i) => (
    <p
      key={i}
      style={{
        whiteSpace: 'pre-wrap',
        margin: i < paragraphs.length - 1 ? '0 0 1em' : 0,
        ...paragraphStyle,
      }}
    >
      {p}
    </p>
  ))

  if (likelyShort) {
    return (
      <div className={`expandable-text ${className}`.trim()} style={{ maxWidth, ...style }}>
        {content}
      </div>
    )
  }

  return (
    <div className={`expandable-text ${className}`.trim()} style={{ maxWidth, ...style }}>
      <div
        ref={bodyRef}
        className={`expandable-text__body${!expanded && needsToggle ? ' is-collapsed' : ''}`}
        style={bodyStyle}
      >
        {content}
      </div>
      {needsToggle && (
        <button
          type="button"
          className="expandable-text__toggle"
          onClick={() => setExpanded(v => !v)}
          style={{ color: accent }}
          aria-expanded={expanded}
        >
          {expanded ? readLess : readMore}
        </button>
      )}
    </div>
  )
}

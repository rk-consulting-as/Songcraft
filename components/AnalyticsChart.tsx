'use client'
import { useState } from 'react'

/**
 * Multi-series daily chart. Stacked bars per day with optional series legend.
 * Pure SVG — no chart library.
 */
type Series = { key: string; label: string; color: string; data: number[] }

export default function AnalyticsChart({
  dates,
  series,
  height = 220,
  accent = '#d4a843',
}: {
  dates: string[]
  series: Series[]
  height?: number
  accent?: string
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set())

  const visibleSeries = series.filter(s => !hiddenKeys.has(s.key))

  // Find max stacked total for y-scale
  let max = 1
  for (let i = 0; i < dates.length; i++) {
    let sum = 0
    for (const s of visibleSeries) sum += s.data[i] || 0
    if (sum > max) max = sum
  }

  const W = 100 // viewBox width
  const H = 100 // viewBox height
  const barW = W / Math.max(1, dates.length)

  const fmtDate = (d: string) => {
    try {
      const dt = new Date(d)
      return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch { return d }
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${accent}25`, borderRadius: 12, padding: '16px 18px' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
        {series.map(s => {
          const hidden = hiddenKeys.has(s.key)
          return (
            <button
              key={s.key}
              onClick={() => {
                const next = new Set(hiddenKeys)
                if (hidden) next.delete(s.key); else next.add(s.key)
                setHiddenKeys(next)
              }}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                opacity: hidden ? 0.4 : 1, padding: 2,
              }}
            >
              <span style={{ width: 10, height: 10, background: s.color, borderRadius: 2, display: 'inline-block' }} />
              <span style={{ color: '#c8c0b0', fontSize: 12 }}>{s.label}</span>
              <span style={{ color: '#8a7a60', fontSize: 11 }}>
                ({s.data.reduce((a, b) => a + b, 0).toLocaleString()})
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          width="100%"
          height={height}
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* Y grid lines */}
          {[0.25, 0.5, 0.75].map(p => (
            <line key={p} x1={0} x2={W} y1={H * p} y2={H * p} stroke={`${accent}15`} strokeWidth={0.2} />
          ))}

          {/* Stacked bars */}
          {dates.map((d, i) => {
            let yOffset = H
            return (
              <g key={i} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}>
                {/* Hover hit area */}
                <rect x={i * barW} y={0} width={barW} height={H} fill="transparent" />
                {visibleSeries.map(s => {
                  const v = s.data[i] || 0
                  if (v === 0) return null
                  const h = (v / max) * H
                  yOffset -= h
                  return (
                    <rect
                      key={s.key}
                      x={i * barW + barW * 0.1}
                      y={yOffset}
                      width={barW * 0.8}
                      height={h}
                      fill={s.color}
                      opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.4}
                    />
                  )
                })}
              </g>
            )
          })}
        </svg>

        {/* Tooltip */}
        {hoverIdx !== null && (
          <div style={{
            position: 'absolute',
            top: 8,
            left: `${(hoverIdx / dates.length) * 100}%`,
            transform: 'translateX(-50%)',
            background: '#1a1a25',
            border: `1px solid ${accent}55`,
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 11,
            pointerEvents: 'none',
            zIndex: 5,
            color: '#e8e0d0',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
          }}>
            <div style={{ color: accent, fontWeight: 600, marginBottom: 4 }}>{fmtDate(dates[hoverIdx])}</div>
            {visibleSeries.map(s => (
              <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ color: s.color }}>● {s.label}</span>
                <span>{(s.data[hoverIdx] || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* X-axis date labels (first, middle, last) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color: '#8a7a60', fontSize: 11 }}>
        <span>{dates[0] && fmtDate(dates[0])}</span>
        {dates.length > 4 && <span>{fmtDate(dates[Math.floor(dates.length / 2)])}</span>}
        <span>{dates[dates.length - 1] && fmtDate(dates[dates.length - 1])}</span>
      </div>
    </div>
  )
}

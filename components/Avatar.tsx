'use client'

/**
 * Avatar — renders a profile picture, gallery preset, or initial-letter fallback.
 *
 * The `value` argument is read from profiles.avatar_url:
 *   - "https://…"            → uploaded image
 *   - "preset:guitar"        → music-themed preset (emoji on colored circle)
 *   - null / undefined / ""  → first letter of name on a color derived from seed
 *
 * Marked as client component because it uses onClick and onError event handlers,
 * which are not supported in React Server Components.
 */

import React from 'react'

export type AvatarValue = string | null | undefined

export const AVATAR_PRESETS: Array<{ key: string; emoji: string; color: string; labelKey: string }> = [
  { key: 'preset:guitar',     emoji: '🎸', color: '#d4a843', labelKey: 'avatarPresetGuitar' },
  { key: 'preset:mic',        emoji: '🎤', color: '#c47b3e', labelKey: 'avatarPresetMic' },
  { key: 'preset:headphones', emoji: '🎧', color: '#7090d0', labelKey: 'avatarPresetHeadphones' },
  { key: 'preset:vinyl',      emoji: '💿', color: '#a070c0', labelKey: 'avatarPresetVinyl' },
  { key: 'preset:clef',       emoji: '🎼', color: '#7bc87b', labelKey: 'avatarPresetClef' },
  { key: 'preset:drums',      emoji: '🥁', color: '#c05050', labelKey: 'avatarPresetDrums' },
  { key: 'preset:piano',      emoji: '🎹', color: '#9ad0d4', labelKey: 'avatarPresetPiano' },
  { key: 'preset:sax',        emoji: '🎷', color: '#e0a050', labelKey: 'avatarPresetSax' },
]

const PRESET_MAP: Record<string, { emoji: string; color: string }> = Object.fromEntries(
  AVATAR_PRESETS.map(p => [p.key, { emoji: p.emoji, color: p.color }])
)

// Color palette for initial-letter fallback. Picks deterministically from seed.
const INITIAL_COLORS = [
  '#d4a843', '#c47b3e', '#a070c0', '#7090d0', '#7bc87b',
  '#c05050', '#9ad0d4', '#e0a050', '#b8b8b8', '#c07bd0',
]

/** Simple FNV-1a-ish hash from a string → uint32 (good enough for color picking). */
function hashString(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

function pickColor(seed: string): string {
  return INITIAL_COLORS[hashString(seed) % INITIAL_COLORS.length]
}

function getInitial(name: string | null | undefined): string {
  if (!name) return '?'
  const trimmed = name.trim()
  if (!trimmed) return '?'
  // Take first alphanumeric char, uppercase
  const match = trimmed.match(/[a-zA-Z0-9æøåÆØÅ]/)
  return (match ? match[0] : trimmed[0]).toUpperCase()
}

export interface AvatarProps {
  value: AvatarValue
  name?: string | null
  seed?: string                 // typically the user id, ensures stable color per user
  size?: number                 // pixels, default 40
  borderColor?: string | null   // optional outer ring (e.g. for current user emphasis)
  style?: React.CSSProperties
  onClick?: () => void
  title?: string
}

export default function Avatar({
  value,
  name,
  seed,
  size = 40,
  borderColor,
  style,
  onClick,
  title,
}: AvatarProps) {
  const dims: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    userSelect: 'none',
    overflow: 'hidden',
    border: borderColor ? `2px solid ${borderColor}` : undefined,
    cursor: onClick ? 'pointer' : undefined,
    transition: 'transform 0.15s ease, border-color 0.2s',
    ...style,
  }

  // 1) Uploaded image URL
  if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
    return (
      <span style={dims} onClick={onClick} title={title}>
        <img
          src={value}
          alt={name || ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e) => {
            // If image fails to load, hide it and let the parent show the initial fallback.
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      </span>
    )
  }

  // 2) Preset emoji
  if (value && value.startsWith('preset:')) {
    const preset = PRESET_MAP[value]
    if (preset) {
      return (
        <span
          style={{
            ...dims,
            background: `${preset.color}22`,
            color: preset.color,
            border: borderColor ? dims.border : `1px solid ${preset.color}55`,
            fontSize: Math.round(size * 0.5),
            lineHeight: 1,
          }}
          onClick={onClick}
          title={title}
        >
          {preset.emoji}
        </span>
      )
    }
  }

  // 3) Initial-letter fallback
  const seedSource = seed || name || 'anon'
  const color = pickColor(seedSource)
  return (
    <span
      style={{
        ...dims,
        background: `${color}22`,
        color,
        border: borderColor ? dims.border : `1px solid ${color}55`,
        fontSize: Math.round(size * 0.42),
        letterSpacing: 0,
      }}
      onClick={onClick}
      title={title}
    >
      {getInitial(name)}
    </span>
  )
}

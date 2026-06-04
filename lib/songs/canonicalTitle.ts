/**
 * Canonical song title rules for saved songs (song.id exists).
 * Proposals before save may still suggest new titles.
 */

export function canonicalTitleDirective(title: string): string {
  const t = title.trim()
  if (!t) return ''
  return [
    `The song title is: "${t}".`,
    'Do not change, rename, translate, or replace this title.',
    'Use this exact title in headings or metadata if a title is needed.',
    'Do not invent an alternate song title.',
  ].join(' ')
}

export function canonicalTitleUserLine(title: string): string {
  const t = title.trim()
  if (!t) return ''
  return `Canonical song title: "${t}"`
}

/** Append canonical title rules to an AI system or user prompt. */
export function appendCanonicalTitleDirective(base: string, title: string | null | undefined): string {
  const directive = canonicalTitleDirective(title || '')
  if (!directive) return base
  return base ? `${base}\n\n${directive}` : directive
}

/** Story/article titles may reference the song; the song name itself must stay canonical. */
export function storySongTitleGuidance(songTitle: string): string {
  const t = songTitle.trim()
  if (!t) return ''
  return [
    `Canonical song title: "${t}".`,
    `Fan-facing story titles may use formats like "${t} — Behind the Song" but must not imply the song has a different name.`,
    'Do not rename or translate the song title in the narrative.',
  ].join(' ')
}

function normalizeTitleToken(s: string): string {
  return s
    .replace(/^#+\s*/, '')
    .replace(/^\*\*|\*\*$/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function looksLikeTitleHeading(line: string): boolean {
  const t = line.trim()
  if (!t || t.length > 100) return false
  if (/^\[.+\]$/i.test(t)) return false
  if (/^(verse|chorus|bridge|intro|outro|pre-chorus|pre chorus|hook|refrain)\b/i.test(t)) return false
  if (t.startsWith('#')) return true
  if (t.startsWith('**') && t.endsWith('**') && t.length < 90) return true
  if (t.length < 72 && !/[.!?]/.test(t) && !/,/.test(t)) return true
  return false
}

/** Replace a conflicting first-line title heading in generated lyrics. */
export function enforceCanonicalTitleInLyrics(
  lyrics: string,
  canonicalTitle: string,
): { text: string; conflict: boolean } {
  const title = canonicalTitle.trim()
  if (!title || !lyrics.trim()) return { text: lyrics, conflict: false }

  const lines = lyrics.split('\n')
  let idx = 0
  while (idx < lines.length && !lines[idx].trim()) idx += 1
  if (idx >= lines.length) return { text: lyrics, conflict: false }

  const first = lines[idx].trim()
  if (!looksLikeTitleHeading(first)) return { text: lyrics, conflict: false }

  const normFirst = normalizeTitleToken(first)
  const normCanon = normalizeTitleToken(title)
  if (!normFirst) return { text: lyrics, conflict: false }

  if (normFirst !== normCanon) {
    lines[idx] = title
    return { text: lines.join('\n'), conflict: true }
  }

  if (first !== title) {
    lines[idx] = title
    return { text: lines.join('\n'), conflict: false }
  }

  return { text: lyrics, conflict: false }
}

/** Detect if text opens with a title-like line that differs from canonical. */
export function lyricsTitleHeadingConflict(lyrics: string, canonicalTitle: string): boolean {
  return enforceCanonicalTitleInLyrics(lyrics, canonicalTitle).conflict
}

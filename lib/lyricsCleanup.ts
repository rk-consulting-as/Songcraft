// Strip section markers and metadata from generated lyrics, leaving only the singable text.
// Used by the "Copy clean text" button so the user can paste lyrics into WordPress / press
// releases / external editors without [Verse 1], (Chorus), etc.

const SECTION_LABELS = [
  'verse', 'chorus', 'pre-chorus', 'pre chorus', 'prechorus',
  'bridge', 'intro', 'outro', 'hook', 'interlude', 'coda',
  'refrain', 'breakdown', 'drop', 'instrumental', 'solo',
  'tag', 'vamp', 'ad-lib', 'ad lib', 'adlib',
  'post-chorus', 'post chorus', 'postchorus',
]

const SECTION_LABEL_RE = new RegExp(
  `^(?:${SECTION_LABELS.join('|')})(?:\\s+\\d+)?\\s*[:.]?\\s*$`,
  'i'
)

export function cleanLyricsText(raw: string): string {
  if (!raw) return ''
  return raw
    .split(/\r?\n/)
    .filter(line => {
      const t = line.trim()
      if (!t) return true                        // keep blank lines for paragraph spacing
      if (/^\[[^\]]+\]$/.test(t)) return false   // [Verse 1], [Chorus], [Bridge]
      if (/^\([^)]+\)$/.test(t)) return false    // (Verse 1), (Chorus)
      if (/^#+\s/.test(t)) return false          // markdown headers
      if (SECTION_LABEL_RE.test(t)) return false // "Verse 1:", "Chorus", etc.
      return true
    })
    .map(line =>
      line
        // Strip markdown emphasis but keep the words.
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        // Single-underscore italics — be conservative, only when surrounded by spaces.
        .replace(/(^|\s)_([^_\s][^_]*?)_(?=$|\s|[.,!?;:])/g, '$1$2')
    )
    .join('\n')
    // Collapse 3+ blank lines to a single blank line.
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

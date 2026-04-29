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

/** Strip markdown emphasis (bold, italic) but keep the words. */
function stripMarkdown(line: string): string {
  return line
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Conservative single-underscore italic: only when surrounded by spaces / punctuation.
    .replace(/(^|\s)_([^_\s][^_]*?)_(?=$|\s|[.,!?;:])/g, '$1$2')
}

export function cleanLyricsText(raw: string): string {
  if (!raw) return ''
  return raw
    .split(/\r?\n/)
    // Strip markdown FIRST so the filter below sees `[Intro]` / `(Instrumental)` even when
    // they were wrapped in **bold** or *italic* markers in the source.
    .map(stripMarkdown)
    .filter(line => {
      const t = line.trim()
      if (!t) return true                        // keep blank lines for paragraph spacing
      if (/^\[[^\]]+\]$/.test(t)) return false   // [Verse 1], [Chorus], [Bridge], [Intro — ...]
      if (/^\([^)]+\)$/.test(t)) return false    // (Verse 1), (Chorus), (Instrumental — ...)
      if (/^#+\s/.test(t)) return false          // markdown headers (# Title)
      if (SECTION_LABEL_RE.test(t)) return false // "Verse 1:", "Chorus", etc.
      return true
    })
    .join('\n')
    // Collapse 3+ blank lines to a single blank line.
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

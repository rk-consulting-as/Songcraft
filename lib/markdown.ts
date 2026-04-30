// Tiny safe Markdown -> HTML renderer for user-authored content (bio, project descriptions).
// Inline so we don't add a dependency. Only supports the subset we need:
//   #/##/### headers, **bold**, *italic*, [link](url), - lists, paragraphs, line-breaks.
// HTML is escaped first so users can't inject raw HTML/scripts.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url, 'http://x.invalid')
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(u.protocol)
  } catch {
    return false
  }
}

export function markdownToHtml(md: string): string {
  if (!md) return ''
  // 1) Escape any raw HTML the user put in.
  let html = escapeHtml(md)

  // 2) Headers (longest first so ### doesn't get matched by # rule).
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')

  // 3) Bold (must come before italic since ** also matches *).
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>')

  // 4) Lists: consecutive lines starting with "- ".
  html = html.replace(/(^|\n)((?:- [^\n]+(?:\n|$))+)/g, (_m, prefix, block) => {
    const items = (block as string).split('\n')
      .filter((l: string) => l.startsWith('- '))
      .map((l: string) => `<li>${l.slice(2).trim()}</li>`)
      .join('')
    return `${prefix}<ul>${items}</ul>`
  })

  // 5) Links — [text](url). URL is validated for safe protocols.
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text, url) => {
    if (!isSafeUrl(url)) return text as string
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`
  })

  // 6) Paragraphs — split on blank lines. Blocks that already start with a block element
  //    (h1/h2/h3/ul/ol/blockquote/pre) are left as-is. Other text becomes <p>...</p>.
  const blocks = html.split(/\n{2,}/)
  return blocks.map(b => {
    const t = b.trim()
    if (!t) return ''
    if (/^<(h\d|ul|ol|blockquote|pre)/i.test(t)) return t
    return `<p>${t.replace(/\n/g, '<br/>')}</p>`
  }).join('\n')
}

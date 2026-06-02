import {
  SUNO_COMPACT_MAX,
  SUNO_COMPACT_MIN,
  SUNO_DETAILED_MAX,
  SUNO_DETAILED_MIN,
  SUNO_HARD_MAX,
  SUNO_TARGET,
  type SunoPromptMode,
} from './types'

export { SUNO_HARD_MAX, SUNO_TARGET, SUNO_COMPACT_MIN, SUNO_COMPACT_MAX, SUNO_DETAILED_MIN, SUNO_DETAILED_MAX }

const FILLER = /\b(very|really|quite|extremely|beautifully|wonderfully|absolutely|incredibly)\b/gi
const REDUNDANT = [
  [/in the style of/gi, 'style:'],
  [/with a focus on/gi, 'focus:'],
  [/featuring a/gi, 'feat.'],
  [/that creates a/gi, '—'],
  [/which gives a/gi, '—'],
  [/and also/gi, 'and'],
  [/  +/g, ' '],
]

export type SunoCharStatus = 'green' | 'yellow' | 'red'

export function sunoCharStatus(length: number): SunoCharStatus {
  if (length > SUNO_HARD_MAX) return 'red'
  if (length > 900) return 'yellow'
  return 'green'
}

export function sunoCharStatusColor(status: SunoCharStatus): string {
  if (status === 'red') return '#e07070'
  if (status === 'yellow') return '#d4a843'
  return '#7bc87b'
}

/** Intelligent compression toward target — preserves genre, instrumentation, mood, vocal direction. */
export function compressSunoPrompt(text: string, target = SUNO_TARGET, hardMax = SUNO_HARD_MAX): string {
  let out = text.trim().replace(/\s+/g, ' ')

  for (const [pattern, replacement] of REDUNDANT) {
    out = out.replace(pattern, replacement as string)
  }
  out = out.replace(FILLER, '')

  // Deduplicate comma-separated tags in brackets
  out = out.replace(/\[([^\]]+)\]/g, (_, inner: string) => {
    const tags = Array.from(new Set(inner.split(/[,;|]/).map(t => t.trim()).filter(Boolean)))
    return `[${tags.join(', ')}]`
  })

  // Remove duplicate sentences
  const sentences = out.split(/(?<=[.!?])\s+/).filter(Boolean)
  const seen = new Set<string>()
  const unique = sentences.filter(s => {
    const key = s.toLowerCase().slice(0, 60)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  out = unique.join(' ').trim()

  if (out.length <= target) return out.slice(0, hardMax)

  // Trim at clause boundaries from the end, keeping opening (genre/mood usually first)
  const clauses = out.split(/[,;]\s*/)
  while (clauses.length > 1 && clauses.join(', ').length > target) {
    clauses.pop()
  }
  out = clauses.join(', ').trim()

  if (out.length > hardMax) {
    // Last resort: cut at word boundary without blind mid-word truncation
    const words = out.split(' ')
    while (words.length > 1 && words.join(' ').length > hardMax) words.pop()
    out = words.join(' ').trim()
  }

  return out.slice(0, hardMax)
}

export function buildCompactSunoFromDetailed(detailed: string): string {
  const compressed = compressSunoPrompt(detailed, SUNO_TARGET, SUNO_HARD_MAX)
  if (compressed.length >= SUNO_COMPACT_MIN) return compressed
  return compressSunoPrompt(detailed, SUNO_COMPACT_MIN, SUNO_HARD_MAX)
}

export function exportPromptForMode(text: string, mode: SunoPromptMode): string {
  if (mode === 'compact') return compressSunoPrompt(text, SUNO_TARGET, SUNO_HARD_MAX)
  return text.trim()
}

export function sunoSystemPromptForMode(mode: SunoPromptMode, langName: string): string {
  if (mode === 'compact') {
    return [
      'You are a Suno AI music prompt expert.',
      `Write a COMPACT Suno "Style of Music" prompt in ${langName}.`,
      `Target length: ${SUNO_COMPACT_MIN}-${SUNO_COMPACT_MAX} characters (hard max ${SUNO_HARD_MAX}).`,
      'Include: genre, tempo, mood, key instruments, vocal style, production texture.',
      'Use concise [tag] clusters. No lyrics. No preamble.',
      'Prioritize genre, instrumentation, mood, and vocal direction.',
    ].join(' ')
  }
  return [
    'You are an expert music production prompt writer for Claude, GPT, Udio, and future AI systems.',
    `Write a DETAILED production brief in ${langName}.`,
    `Target length: ${SUNO_DETAILED_MIN}-${SUNO_DETAILED_MAX} characters.`,
    'Include: genre, subgenre, tempo/BPM feel, mood, instrumentation, arrangement, vocal direction, production references, dynamic arc.',
    'Use [tags] where helpful. No lyrics. No preamble.',
  ].join(' ')
}

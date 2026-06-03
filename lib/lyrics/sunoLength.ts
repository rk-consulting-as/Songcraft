export const SUNO_LYRICS_MAX = 5000
export const SUNO_LYRICS_TARGET_MIN = 3000
export const SUNO_LYRICS_TARGET_MAX = 4500
export const SUNO_LYRICS_SHORTEN_TARGET_MIN = 4000
export const SUNO_LYRICS_SHORTEN_TARGET_MAX = 4500

export const SUNO_LYRICS_WARN = 4000
export const SUNO_LYRICS_DANGER = 4500

export type LyricsLengthState = 'success' | 'warning' | 'danger' | 'error'

export function getLyricsCharCount(text: string | null | undefined): number {
  return (text || '').length
}

export function getLyricsLengthState(count: number): LyricsLengthState {
  if (count > SUNO_LYRICS_MAX) return 'error'
  if (count > SUNO_LYRICS_DANGER) return 'danger'
  if (count > SUNO_LYRICS_WARN) return 'warning'
  return 'success'
}

export function isLyricsWithinSunoLimit(text: string | null | undefined): boolean {
  return getLyricsCharCount(text) <= SUNO_LYRICS_MAX
}

export function formatLyricsCounter(count: number): string {
  return `${count} / ${SUNO_LYRICS_MAX}`
}

export const SUNO_LYRICS_GENERATION_CONSTRAINTS = `Length constraints for Suno AI compatibility:
- Target total length: ${SUNO_LYRICS_TARGET_MIN}-${SUNO_LYRICS_TARGET_MAX} characters (including section labels and line breaks).
- Hard maximum: ${SUNO_LYRICS_MAX} characters — never exceed this.
- Prefer structure: 2 verses, 2-3 choruses, 1 bridge.
- Avoid unnecessary repetition, extra verses, or repeated choruses beyond what the song needs.
- Keep lines concise; prioritize story and hook over padding.`

export const SUNO_LYRICS_REFINE_CONSTRAINTS = `Keep total length between ${SUNO_LYRICS_TARGET_MIN}-${SUNO_LYRICS_TARGET_MAX} characters and never exceed ${SUNO_LYRICS_MAX} characters. Avoid unnecessary repetition.`

export const SUNO_LYRICS_SHORTEN_SYSTEM = `You shorten song lyrics for Suno AI while preserving the story, chorus hooks, emotional arc, and writing style.
Target ${SUNO_LYRICS_SHORTEN_TARGET_MIN}-${SUNO_LYRICS_SHORTEN_TARGET_MAX} characters total (including section labels and line breaks).
Hard maximum ${SUNO_LYRICS_MAX} characters — never exceed this.
Keep 2 verses, 2-3 choruses, and 1 bridge when possible. Output only the shortened lyrics.`

export function buildLyricsGenerationSystem(lang: string, useSongStructure: boolean): string {
  const structureNote = useSongStructure ? ' Follow the song structure profile provided.' : ''
  return [
    `You are a creative songwriter. Write song lyrics based on the user's instructions. Write in ${lang}.`,
    'Format with Verse 1, Verse 2, Chorus, Bridge etc.',
    structureNote,
    SUNO_LYRICS_GENERATION_CONSTRAINTS,
    'Output only the lyrics, no explanations.',
  ].filter(Boolean).join(' ')
}

export function buildLyricsRefineSystem(): string {
  return [
    'You are a creative songwriter. Adjust the lyrics based on the feedback.',
    SUNO_LYRICS_REFINE_CONSTRAINTS,
    'Output only the updated lyrics.',
  ].join(' ')
}

import {
  buildCompactSunoFromDetailed,
  compressSunoPrompt,
  exportPromptForMode,
  sunoSystemPromptForMode,
} from './compressSunoPrompt'
import type { SunoPromptMode } from './types'

export { compressSunoPrompt, exportPromptForMode, sunoSystemPromptForMode, buildCompactSunoFromDetailed }

export function prepareSunoPromptPair(rawDetailed: string): { compact: string; detailed: string } {
  const detailed = rawDetailed.trim()
  const compact = buildCompactSunoFromDetailed(detailed)
  return { compact, detailed }
}

export function activePromptForMode(
  compact: string,
  detailed: string,
  mode: SunoPromptMode
): string {
  return mode === 'compact' ? compact : detailed
}

export const SUNO_CREATE_URL = 'https://suno.com/create'

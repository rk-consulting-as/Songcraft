// Per-call AI provider selection. Default = anthropic; user can override per generation.
// Last-used provider is persisted in localStorage so it survives page reloads.

export type AIProvider = 'anthropic' | 'openai'
export const AI_PROVIDERS: AIProvider[] = ['anthropic', 'openai']

const STORAGE_KEY = 'songcraft_ai_provider'

export function getStoredProvider(): AIProvider {
  if (typeof window === 'undefined') return 'anthropic'
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'openai' ? 'openai' : 'anthropic'
}

export function setStoredProvider(p: AIProvider) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, p)
}

export function providerLabel(p: AIProvider): string {
  return p === 'openai' ? 'OpenAI' : 'Anthropic'
}

/**
 * Display short, e.g. for compact buttons: "Claude" or "GPT".
 */
export function providerShort(p: AIProvider): string {
  return p === 'openai' ? 'GPT' : 'Claude'
}

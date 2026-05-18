export type AIOutputLang = 'en' | 'no' | 'sv' | 'da' | 'de' | 'fr' | 'es' | 'custom'

export const AI_OUTPUT_LANGUAGES: Array<{ value: AIOutputLang; label: string; promptName: string }> = [
  { value: 'en', label: 'English', promptName: 'English' },
  { value: 'no', label: 'Norwegian', promptName: 'Norwegian' },
  { value: 'sv', label: 'Swedish', promptName: 'Swedish' },
  { value: 'da', label: 'Danish', promptName: 'Danish' },
  { value: 'de', label: 'German', promptName: 'German' },
  { value: 'fr', label: 'French', promptName: 'French' },
  { value: 'es', label: 'Spanish', promptName: 'Spanish' },
  { value: 'custom', label: 'Custom / Other', promptName: 'the language requested by the user' },
]

export function normalizeAIOutputLang(value: unknown): AIOutputLang {
  return AI_OUTPUT_LANGUAGES.some(lang => lang.value === value) ? value as AIOutputLang : 'en'
}

export function aiOutputLanguageName(value: unknown) {
  return AI_OUTPUT_LANGUAGES.find(lang => lang.value === normalizeAIOutputLang(value))?.promptName || 'English'
}

export function aiOutputLanguageDirective(value: unknown) {
  return `Write the output in: ${aiOutputLanguageName(value)}.`
}

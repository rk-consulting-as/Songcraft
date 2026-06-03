const WORDS_PER_MINUTE = 200

export function estimateReadTimeMinutes(body: string | null | undefined, excerpt?: string | null): number {
  const text = [body || '', excerpt || ''].join(' ').trim()
  if (!text) return 1
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

export function formatReadTimeLabel(minutes: number, labels: { minRead: string }): string {
  return `${minutes} ${labels.minRead}`
}

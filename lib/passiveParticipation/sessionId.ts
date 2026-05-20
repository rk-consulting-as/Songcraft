export function buildSessionId(campaignId: string, sessionStartIso: string): string {
  const compact = sessionStartIso.replace(/[^0-9]/g, '').slice(0, 14)
  return `lfm_${campaignId.replace(/-/g, '').slice(0, 12)}_${compact}`
}

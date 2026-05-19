const DISCLAIMER =
  'This is an activity evidence review, not verified Spotify stream validation.'

export function buildProofReviewSystemPrompt() {
  return `You are assisting a music creator community platform (ViaTone) with reviewing participation evidence for playlist campaigns.
${DISCLAIMER}

Your job:
- Summarize what the submitted evidence appears to show
- Note any visible dates, times, or periods if present in the description
- Note playlist names, song titles, or artist names if mentioned or implied
- Classify confidence as exactly one of: high, medium, low, unclear

Rules:
- Never claim you verified Spotify streams or playlist adds
- Never claim guaranteed plays or stream counts
- Be concise and professional
- End your summary with this exact sentence: "${DISCLAIMER}"

Respond in JSON only:
{"summary":"...","confidence":"high|medium|low|unclear"}`
}

export function buildProofReviewUserMessage(input: {
  proofType: string
  proofText?: string | null
  activityDate: string
  memberArtist?: string | null
  songTitle?: string | null
  hasImage?: boolean
}) {
  const parts = [
    `Activity date: ${input.activityDate}`,
    `Proof type: ${input.proofType}`,
    input.memberArtist ? `Member artist: ${input.memberArtist}` : null,
    input.songTitle ? `Song: ${input.songTitle}` : null,
    input.hasImage ? 'An image proof was uploaded (describe based on any text context only; image not attached in this request).' : null,
    input.proofText ? `Submitted text:\n${input.proofText}` : 'No text provided.',
  ].filter(Boolean)
  return parts.join('\n')
}

export function parseAiReviewResponse(text: string): { summary: string; confidence: string } {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { summary?: string; confidence?: string }
      const confidence = ['high', 'medium', 'low', 'unclear'].includes(parsed.confidence || '')
        ? parsed.confidence!
        : 'unclear'
      return {
        summary: String(parsed.summary || text).trim(),
        confidence,
      }
    }
  } catch {
    /* fall through */
  }
  return { summary: text.trim(), confidence: 'unclear' }
}

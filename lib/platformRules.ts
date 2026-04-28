export type Platform = 'TikTok' | 'Instagram' | 'Facebook' | 'YouTube' | 'X/Twitter'

export const PLATFORM_RULES: Record<Platform, {
  name: string
  emoji: string
  maxChars: number | null
  visibleChars: number | null
  hashtagCount: string
  tone: string
  structure: string
  tips: string[]
}> = {
  TikTok: {
    name: 'TikTok',
    emoji: '🎵',
    maxChars: 2200,
    visibleChars: 150,
    hashtagCount: '3-5 hashtags',
    tone: 'Casual, energetic, trend-aware, youth culture',
    structure: 'Hook in first sentence (visible before "more"). Short punchy sentences. Emoji OK. End with CTA like "Follow for more" or question.',
    tips: [
      'First 150 chars shown before "more" — make them count',
      'Use trending sounds/references when relevant',
      '3-5 hashtags — mix popular and niche',
      'Emoji adds personality',
      'Ask a question to boost comments',
    ],
  },
  Instagram: {
    name: 'Instagram',
    emoji: '📸',
    maxChars: 2200,
    visibleChars: 125,
    hashtagCount: '5-15 hashtags (up to 30 allowed)',
    tone: 'Aesthetic, aspirational, storytelling, authentic',
    structure: 'Hook first. Blank lines for readability. Story or emotion in body. Hashtags at end or in first comment. CTA before hashtags.',
    tips: [
      'First 125 chars visible before "more"',
      'Use line breaks — white space increases readability',
      '5-15 hashtags at the end',
      'Mix large hashtags (1M+) with niche ones (10k-100k)',
      'CTA: "Save this", "Tag someone", "Listen now"',
    ],
  },
  Facebook: {
    name: 'Facebook',
    emoji: '👥',
    maxChars: 63206,
    visibleChars: 477,
    hashtagCount: '1-3 hashtags max',
    tone: 'Conversational, personal, community-oriented, emotional',
    structure: 'Personal story or question to spark engagement. Longer is OK. Max 1-3 hashtags. Avoid link previews competing with text.',
    tips: [
      'Organic reach is low — make content shareable',
      'Personal stories and emotions perform best',
      'Max 1-3 hashtags — more hurts reach on Facebook',
      'Ask direct questions to boost comments',
      'Videos and images outperform text-only posts',
    ],
  },
  YouTube: {
    name: 'YouTube',
    emoji: '▶️',
    maxChars: 5000,
    visibleChars: 157,
    hashtagCount: '3-5 hashtags (shown above title)',
    tone: 'Informative, SEO-optimized, descriptive, searchable',
    structure: 'First 157 chars = SEO snippet. Include main keyword early. Timestamps if applicable. Links to socials. Hashtags above title (first 3 used). Description = searchable metadata.',
    tips: [
      'First 157 chars shown in search results',
      'Include main keyword in first sentence',
      'Add timestamps for longer videos',
      'First 3 hashtags appear above video title',
      'Include links to Spotify, socials at bottom',
    ],
  },
  'X/Twitter': {
    name: 'X/Twitter',
    emoji: '🐦',
    maxChars: 280,
    visibleChars: 280,
    hashtagCount: '1-2 hashtags max',
    tone: 'Punchy, witty, direct, conversational, real-time',
    structure: 'Max 280 chars total including hashtags and links (links = 23 chars). One clear message. Hashtags at end. No fluff.',
    tips: [
      'Hard limit: 280 chars (links count as 23 chars)',
      'One hashtag is often better than two',
      'Threads work well for storytelling',
      'Conversational tone outperforms promotional',
      'Retweet-worthy = opinionated or surprising',
    ],
  },
}

export function buildPlatformSystemPrompt(
  platform: Platform,
  language: string,
  customRules?: string
): string {
  const rules = PLATFORM_RULES[platform]
  
  return `You are a social media expert specializing in music promotion.

PLATFORM: ${rules.name} ${rules.emoji}
LANGUAGE: Write the caption in ${language}.

PLATFORM RULES (always follow these):
- Character limit: ${rules.maxChars ? rules.maxChars + ' chars max' : 'no hard limit'}
- Visible before "more": ${rules.visibleChars ? rules.visibleChars + ' chars' : 'full text'}
- Hashtags: ${rules.hashtagCount}
- Tone: ${rules.tone}
- Structure: ${rules.structure}

BEST PRACTICES:
${rules.tips.map(t => `- ${t}`).join('\n')}

${customRules ? `CUSTOM RULES FOR THIS ACCOUNT (always follow these):\n${customRules}\n` : ''}

OUTPUT: Write only the caption text ready to copy-paste. No explanations, no quotes around it.`
}

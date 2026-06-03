'use client'

/** @deprecated Use ContentLimitCounter with platformId */
import ContentLimitCounter from '@/components/songStudio/ContentLimitCounter'

type Props = {
  text: string
  label?: string
  hint?: string
}

export default function LyricsCharCounter({ text }: Props) {
  return (
    <ContentLimitCounter
      text={text}
      contentType="lyrics"
      platformId="suno"
    />
  )
}

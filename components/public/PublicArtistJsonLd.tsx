type Props = {
  data: Record<string, unknown>
}

export default function PublicArtistJsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

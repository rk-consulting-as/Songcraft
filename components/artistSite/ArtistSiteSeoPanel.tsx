'use client'

import PublicSocialPreviewCard from '@/components/workspace/PublicSocialPreviewCard'
import { t, useLang } from '@/lib/i18n'

type Props = {
  previewTitle: string
  previewDescription: string
  previewImage?: string | null
  publicUrl?: string
}

export default function ArtistSiteSeoPanel({ previewTitle, previewDescription, previewImage, publicUrl = '' }: Props) {
  const tx = t[useLang()] as Record<string, string>

  return (
    <div className="workspace-section artist-site-seo">
      <div className="card workspace-card workspace-glass">
        <h2 className="workspace-section-title">{tx.artistSiteSeoTitle}</h2>
        <p className="workspace-section-desc">{tx.artistSiteSeoDesc}</p>
      </div>
      <PublicSocialPreviewCard
        title={previewTitle}
        description={previewDescription}
        imageUrl={previewImage}
        shareUrl={publicUrl}
      />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { t, useLang } from '@/lib/i18n'

type Props = {
  title: string
  description: string
  imageUrl?: string | null
  shareUrl?: string
}

export default function PublicSocialPreviewCard({ title, description, imageUrl, shareUrl }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [copied, setCopied] = useState(false)

  const copyShare = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className="card workspace-card workspace-glass public-social-preview">
      <h3 className="workspace-card-title">{tx.publicBuilderSocialPreview}</h3>
      <p className="workspace-section-desc">{tx.publicBuilderSocialPreviewNote}</p>
      <div className="public-social-preview__card">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="public-social-preview__image" />
        )}
        <div className="public-social-preview__body">
          <span className="public-social-preview__domain">viatone.app</span>
          <strong className="public-social-preview__title">{title}</strong>
          <p className="public-social-preview__desc">{description}</p>
        </div>
      </div>
      {shareUrl && (
        <button type="button" className="btn-outline quick-action-btn" onClick={copyShare}>
          {copied ? tx.copied : tx.publicBuilderCopyShareUrl}
        </button>
      )}
    </div>
  )
}

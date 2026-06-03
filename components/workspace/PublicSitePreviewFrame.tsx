'use client'

import { useState } from 'react'
import { t, useLang } from '@/lib/i18n'

type Props = {
  slug: string
  publicUrl: string
}

export default function PublicSitePreviewFrame({ slug, publicUrl }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop')

  return (
    <div className="card workspace-card workspace-glass public-site-preview">
      <div className="public-site-preview__toolbar">
        <h3 className="workspace-card-title" style={{ margin: 0 }}>{tx.publicBuilderLivePreview}</h3>
        <div className="public-site-preview__toggle" role="tablist" aria-label={tx.publicBuilderPreviewMode}>
          <button type="button" role="tab" aria-selected={mode === 'desktop'} className={mode === 'desktop' ? 'is-active' : ''} onClick={() => setMode('desktop')}>
            {tx.publicBuilderPreviewDesktop}
          </button>
          <button type="button" role="tab" aria-selected={mode === 'mobile'} className={mode === 'mobile' ? 'is-active' : ''} onClick={() => setMode('mobile')}>
            {tx.publicBuilderPreviewMobile}
          </button>
        </div>
      </div>
      <div className={`public-site-preview__frame public-site-preview__frame--${mode}`}>
        <iframe
          src={`/p/${slug}`}
          title={tx.publicBuilderPreviewSite}
          className="public-site-preview__iframe"
          loading="lazy"
        />
      </div>
      <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn-outline quick-action-btn" style={{ textDecoration: 'none', marginTop: 12, display: 'inline-flex' }}>
        {tx.publicBuilderOpenFullPreview} ↗
      </a>
    </div>
  )
}

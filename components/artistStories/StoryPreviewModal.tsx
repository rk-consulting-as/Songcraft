'use client'

import { useState } from 'react'
import { estimateReadTimeMinutes, formatReadTimeLabel } from '@/lib/artistStories/readTime'
import { t, useLang } from '@/lib/i18n'

export type StoryPreviewData = {
  title: string
  excerpt: string
  body: string
  cover_image_url?: string
  story_type?: string
}

type Props = {
  open: boolean
  onClose: () => void
  story: StoryPreviewData
  artistName: string
  privateNote?: string
}

export default function StoryPreviewModal({ open, onClose, story, artistName, privateNote }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')

  if (!open) return null

  const minutes = estimateReadTimeMinutes(story.body, story.excerpt)
  const readLabel = formatReadTimeLabel(minutes, { minRead: tx.storyMinRead })
  const paragraphs = (story.body || '').split(/\n\n+/).filter(Boolean)

  return (
    <div className="modal-overlay story-preview-modal" role="dialog" aria-modal="true" aria-labelledby="story-preview-title">
      <div className={`story-preview-modal__panel story-preview-modal__panel--${viewport}`}>
        <div className="story-preview-modal__toolbar">
          <h3 id="story-preview-title" className="workspace-card-title">{tx.storyPreviewModalTitle}</h3>
          <div className="story-preview-modal__viewport-toggle">
            <button
              type="button"
              className={`btn-outline quick-action-btn${viewport === 'desktop' ? ' is-active' : ''}`}
              onClick={() => setViewport('desktop')}
            >
              {tx.storyPreviewDesktop}
            </button>
            <button
              type="button"
              className={`btn-outline quick-action-btn${viewport === 'mobile' ? ' is-active' : ''}`}
              onClick={() => setViewport('mobile')}
            >
              {tx.storyPreviewMobile}
            </button>
          </div>
          <button type="button" className="story-preview-modal__close" onClick={onClose} aria-label={tx.close}>×</button>
        </div>

        <div className="story-preview-modal__frame public-surface public-story-page">
          <p className="story-preview-modal__badge">{tx.storyPreviewDraftBadge}</p>
          {privateNote && <p className="story-preview-modal__private-note">{privateNote}</p>}
          <article className="public-story-page__article">
            <header className="public-story-page__header">
              <span className="public-story-page__back" style={{ opacity: 0.6 }}>{artistName}</span>
              {story.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={story.cover_image_url} alt="" className="public-story-page__cover" />
              )}
              <h1 className="public-story-page__title">{story.title || tx.storyUntitled}</h1>
              <p className="public-story-page__meta">{readLabel}</p>
              {story.excerpt && <p className="public-story-page__excerpt">{story.excerpt}</p>}
            </header>
            <div className="public-story-page__body">
              {paragraphs.length > 0 ? paragraphs.map(p => (
                <p key={p.slice(0, 32)}>{p}</p>
              )) : (
                <p style={{ color: '#8a7a60' }}>{tx.storyPreviewEmptyBody}</p>
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}

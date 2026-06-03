'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { CreatorPageSettings } from '@/lib/creatorIdentity/types'
import { t, useLang } from '@/lib/i18n'

type SectionKey = 'hero' | 'songs' | 'stories' | 'newsletter' | 'events' | 'bio' | 'spotify' | 'youtube' | 'albums' | 'social' | 'epk' | 'playlists'

const SECTION_KEYS: { key: SectionKey; labelKey: string }[] = [
  { key: 'hero', labelKey: 'publicSectionHero' },
  { key: 'songs', labelKey: 'publicSectionSongs' },
  { key: 'stories', labelKey: 'artistSiteSectionStories' },
  { key: 'newsletter', labelKey: 'publicSectionNewsletter' },
  { key: 'playlists', labelKey: 'publicSectionPlaylists' },
  { key: 'epk', labelKey: 'publicSectionEpk' },
  { key: 'events', labelKey: 'publicSectionEvents' },
  { key: 'bio', labelKey: 'publicSectionBio' },
  { key: 'spotify', labelKey: 'publicSectionSpotify' },
  { key: 'youtube', labelKey: 'publicSectionYoutube' },
  { key: 'albums', labelKey: 'publicSectionAlbums' },
  { key: 'social', labelKey: 'publicSectionSocial' },
]

type Props = {
  artistId: string
  pageSettings?: CreatorPageSettings | null
  onSaved: (settings: CreatorPageSettings) => void
}

export default function ArtistSiteHomepageControls({ artistId, pageSettings, onSaved }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const sections = { ...(pageSettings?.sections || {}) }
  const [saving, setSaving] = useState(false)

  const toggle = async (key: SectionKey, enabled: boolean) => {
    setSaving(true)
    const next: CreatorPageSettings = {
      ...(pageSettings || {}),
      sections: { ...sections, [key]: enabled },
    }
    const supabase = createClient()
    const { error } = await supabase.from('artists').update({ page_settings: next }).eq('id', artistId)
    setSaving(false)
    if (!error) onSaved(next)
  }

  return (
    <div className="workspace-section artist-site-homepage">
      <div className="card workspace-card workspace-glass">
        <h2 className="workspace-section-title">{tx.artistSiteHomepageTitle}</h2>
        <p className="workspace-section-desc">{tx.artistSiteHomepageDesc}</p>
        <ul className="artist-site-homepage__list">
          {SECTION_KEYS.map(({ key, labelKey }) => {
            const enabled = sections[key] !== false
            return (
              <li key={key} className="artist-site-homepage__row">
                <span>{tx[labelKey] || key}</span>
                <label className="artist-site-homepage__toggle">
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={saving}
                    onChange={e => toggle(key, e.target.checked)}
                    aria-label={tx[labelKey] || key}
                  />
                  <span>{enabled ? tx.yes : tx.no}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

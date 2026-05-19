'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { t, useLang } from '@/lib/i18n'
import type { PlanId } from '@/lib/subscription'
import type { MediaAsset } from '@/lib/mediaLibrary/types'
import { getBrandKit, mergeBrandKit } from '@/lib/mediaLibrary/brandKit'
import { trackMediaUsage } from '@/lib/mediaLibrary/usage'
import UpgradePrompt from '@/components/UpgradePrompt'
import ZoomableImage from '@/components/ZoomableImage'

type Props = {
  artistId: string
  artistName: string
  pageSettings: Record<string, unknown> | null | undefined
  avatarUrl?: string | null
  planId: PlanId
  assets: MediaAsset[]
  onSaved?: () => void
}

export default function BrandKitPanel({
  artistId,
  artistName,
  pageSettings,
  avatarUrl,
  planId,
  assets,
  onSaved,
}: Props) {
  const lang = useLang()
  const tx = t[lang]
  const kit = useMemo(() => getBrandKit(pageSettings), [pageSettings])
  const [saving, setSaving] = useState(false)
  const [colors, setColors] = useState({
    primary: kit.colors?.primary || '#d4a843',
    secondary: kit.colors?.secondary || '#7090d0',
    accent: kit.colors?.accent || '#8a7a60',
  })
  const [tagline, setTagline] = useState(kit.tagline || '')
  const [logoId, setLogoId] = useState(kit.logo_asset_id || '')
  const [heroId, setHeroId] = useState(kit.hero_asset_id || '')
  const [profileId, setProfileId] = useState(kit.profile_asset_id || '')

  const imageAssets = assets.filter(a => a.visibility === 'public' || a.visibility === 'private')

  const resolveUrl = (assetId: string, fallback?: string | null) => {
    const a = assets.find(x => x.id === assetId)
    return a?.file_url || fallback || null
  }

  if (planId !== 'pro') {
    return (
      <div className="card workspace-card media-brand-kit">
        <h3 style={{ margin: '0 0 8px', color: '#d4a843', fontWeight: 'normal', fontSize: 16 }}>{tx.mediaBrandKitTitle}</h3>
        <p style={{ margin: '0 0 12px', color: '#8a7a60', fontSize: 13, lineHeight: 1.5 }}>{tx.mediaBrandKitDesc}</p>
        <UpgradePrompt title={tx.mediaBrandKitUpgradeTitle} description={tx.mediaBrandKitUpgradeDesc} />
      </div>
    )
  }

  async function save() {
    setSaving(true)
    const sb = createClient()
    const logoUrl = resolveUrl(logoId, kit.logo_url)
    const heroUrl = resolveUrl(heroId, kit.hero_url)
    const profileUrl = resolveUrl(profileId, kit.profile_url || avatarUrl)

    const nextSettings = mergeBrandKit(pageSettings, {
      logo_asset_id: logoId || null,
      hero_asset_id: heroId || null,
      profile_asset_id: profileId || null,
      logo_url: logoUrl,
      hero_url: heroUrl,
      profile_url: profileUrl,
      colors,
      tagline: tagline.trim() || undefined,
    })

    const updates: Record<string, unknown> = { page_settings: nextSettings }
    if (profileUrl) updates.avatar_url = profileUrl

    await sb.from('artists').update(updates).eq('id', artistId)
    const assetIds = [logoId, heroId, profileId].filter(Boolean) as string[]
    await Promise.all(
      assetIds.map(id =>
        trackMediaUsage(id, ['used_as_brand_kit', 'used_in_public_page'], { makePublic: true, artistId })
      )
    )
    setSaving(false)
    onSaved?.()
  }

  return (
    <div className="card workspace-card media-brand-kit">
      <h3 style={{ margin: '0 0 6px', color: '#d4a843', fontWeight: 'normal', fontSize: 16 }}>{tx.mediaBrandKitTitle}</h3>
      <p style={{ margin: '0 0 16px', color: '#8a7a60', fontSize: 13, lineHeight: 1.5 }}>{tx.mediaBrandKitDesc}</p>

      <div className="media-brand-preview-row">
        {[
          { label: tx.mediaBrandLogo, url: resolveUrl(logoId, kit.logo_url) },
          { label: tx.mediaBrandHero, url: resolveUrl(heroId, kit.hero_url) },
          { label: tx.mediaBrandProfile, url: resolveUrl(profileId, kit.profile_url || avatarUrl) },
        ].map(slot => (
          <div key={slot.label} className="media-brand-preview-slot">
            <span className="media-brand-preview-label">{slot.label}</span>
            {slot.url ? (
              <ZoomableImage src={slot.url} alt={slot.label} className="media-brand-preview-img" />
            ) : (
              <div className="media-brand-preview-empty">{tx.mediaBrandNoImage}</div>
            )}
          </div>
        ))}
      </div>

      <div className="media-brand-fields">
        <label>
          <span>{tx.mediaBrandLogo}</span>
          <select value={logoId} onChange={e => setLogoId(e.target.value)}>
            <option value="">{tx.mediaBrandPickAsset}</option>
            {imageAssets.map(a => (
              <option key={a.id} value={a.id}>{a.title || a.type}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{tx.mediaBrandHero}</span>
          <select value={heroId} onChange={e => setHeroId(e.target.value)}>
            <option value="">{tx.mediaBrandPickAsset}</option>
            {imageAssets.map(a => (
              <option key={a.id} value={a.id}>{a.title || a.type}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{tx.mediaBrandProfile}</span>
          <select value={profileId} onChange={e => setProfileId(e.target.value)}>
            <option value="">{tx.mediaBrandPickAsset}</option>
            {imageAssets.map(a => (
              <option key={a.id} value={a.id}>{a.title || a.type}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{tx.mediaBrandTagline}</span>
          <input
            type="text"
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            placeholder={artistName}
            maxLength={120}
          />
        </label>
        <div className="media-brand-colors">
          <span>{tx.mediaBrandColors}</span>
          <div className="media-brand-color-inputs">
            {(['primary', 'secondary', 'accent'] as const).map(key => (
              <label key={key} className="media-brand-color-field">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={e => setColors(c => ({ ...c, [key]: e.target.value }))}
                />
                <span>{key}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <button type="button" className="btn-gold" disabled={saving} onClick={save} style={{ marginTop: 16 }}>
        {saving ? tx.saving : tx.save}
      </button>
    </div>
  )
}

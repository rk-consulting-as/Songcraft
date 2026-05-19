'use client'

import { useState } from 'react'
import { t, useLang } from '@/lib/i18n'
import type { MediaAsset } from '@/lib/mediaLibrary/types'
import type { CampaignMediaSettings } from '@/lib/mediaLibrary/epkSettings'
import { trackMediaUsage } from '@/lib/mediaLibrary/usage'
import AssetPicker from '@/components/media/AssetPicker'
import ZoomableImage from '@/components/ZoomableImage'

type SlotKey = 'graphic' | 'cover' | 'promo'

type Props = {
  artistId: string
  songId: string
  media: CampaignMediaSettings
  onUpdate: (media: CampaignMediaSettings) => void
}

const SLOTS: { key: SlotKey; types: MediaAsset['type'][]; labelKey: keyof (typeof t)['en'] }[] = [
  { key: 'graphic', types: ['campaign_graphic', 'banner', 'social_graphic', 'promo_image'], labelKey: 'mediaCampaignGraphic' },
  { key: 'cover', types: ['cover', 'promo_image'], labelKey: 'mediaCampaignCover' },
  { key: 'promo', types: ['promo_image', 'social_graphic', 'campaign_graphic'], labelKey: 'mediaCampaignPromo' },
]

export default function CampaignMediaSection({ artistId, songId, media, onUpdate }: Props) {
  const lang = useLang()
  const tx = t[lang]
  const [openSlot, setOpenSlot] = useState<SlotKey | null>(null)

  async function applySlot(slot: SlotKey, asset: MediaAsset) {
    await trackMediaUsage(asset.id, ['used_in_campaign'], { makePublic: true, artistId })
    onUpdate({
      ...media,
      [slot]: { asset_id: asset.id, url: asset.file_url },
    })
    setOpenSlot(null)
  }

  function clearSlot(slot: SlotKey) {
    const next = { ...media }
    delete next[slot]
    onUpdate(next)
  }

  const active = SLOTS.find(s => s.key === openSlot)

  return (
    <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(212,168,67,0.22)' }}>
      <h3 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 14, margin: '0 0 8px' }}>{tx.mediaCampaignAssets}</h3>
      <p style={{ color: '#8a7a60', fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>{tx.mediaCampaignAssetsDesc}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {SLOTS.map(({ key, types, labelKey }) => {
          const slot = media[key]
          return (
            <div key={key} style={{ border: '1px solid rgba(180,140,80,0.15)', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#a8b8e8', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                {tx[labelKey]}
              </div>
              {slot?.url ? (
                <ZoomableImage src={slot.url} alt={tx[labelKey]} style={{ width: '100%', maxWidth: 160, aspectRatio: '1', objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
              ) : (
                <div style={{ height: 80, borderRadius: 6, background: 'rgba(255,255,255,0.03)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a5a40', fontSize: 11 }}>
                  {tx.mediaBrandNoImage}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" className="btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setOpenSlot(key)}>
                  {tx.mediaPickerPick}
                </button>
                {slot?.url && (
                  <button type="button" className="btn-outline" style={{ fontSize: 11, padding: '4px 8px', color: '#c07070' }} onClick={() => clearSlot(key)}>
                    {tx.delete}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {active && (
        <AssetPicker
          open={!!openSlot}
          onClose={() => setOpenSlot(null)}
          artistId={artistId}
          types={active.types}
          selectedId={media[active.key]?.asset_id}
          onSelect={asset => applySlot(active.key, asset)}
          title={tx[active.labelKey]}
        />
      )}
    </div>
  )
}

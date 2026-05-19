'use client'

import { useState } from 'react'
import { t, useLang } from '@/lib/i18n'
import type { MediaAsset } from '@/lib/mediaLibrary/types'
import type { EpkSettings } from '@/lib/mediaLibrary/epkSettings'
import type { EpkSong } from '@/lib/epkSongs'
import { trackMediaUsage } from '@/lib/mediaLibrary/usage'
import AssetPicker from '@/components/media/AssetPicker'
import ZoomableImage from '@/components/ZoomableImage'

type Props = {
  artistId: string
  epk: EpkSettings
  songs: EpkSong[]
  onSave: (patch: Partial<EpkSettings>) => void
}

export default function EpkMediaSection({ artistId, epk, songs, onSave }: Props) {
  const lang = useLang()
  const tx = t[lang]
  const [pickerOpen, setPickerOpen] = useState(false)
  const [songPickerId, setSongPickerId] = useState<string | null>(null)

  async function applyEpkHero(asset: MediaAsset) {
    await trackMediaUsage(asset.id, ['used_in_epk'], { makePublic: true, artistId })
    onSave({
      epk_image_asset_id: asset.id,
      image_url: asset.file_url,
    })
    setPickerOpen(false)
  }

  async function applySongCover(songId: string, asset: MediaAsset) {
    await trackMediaUsage(asset.id, ['used_in_epk', 'used_as_cover'], { makePublic: true, artistId })
    const next = {
      ...(epk.song_cover_assets || {}),
      [songId]: { asset_id: asset.id, url: asset.file_url },
    }
    onSave({ song_cover_assets: next })
    setSongPickerId(null)
  }

  const heroUrl = epk.image_url || epk.cover_image_url || epk.press_image_url

  return (
    <div className="card" style={{ borderColor: 'rgba(112,144,208,0.18)', marginBottom: 16 }}>
      <h3 style={{ color: '#7090d0', fontWeight: 'normal', fontSize: 14, margin: '0 0 10px' }}>{tx.mediaEpkImages}</h3>
      <p style={{ color: '#8a7a60', fontSize: 12, margin: '0 0 12px', lineHeight: 1.5 }}>{tx.mediaEpkImagesDesc}</p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
        {heroUrl ? (
          <ZoomableImage src={heroUrl} alt="EPK" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
        ) : (
          <div style={{ width: 100, height: 100, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a5a40', fontSize: 12 }}>
            {tx.mediaBrandNoImage}
          </div>
        )}
        <button type="button" className="btn-outline" onClick={() => setPickerOpen(true)}>
          {tx.mediaPickerPickEpk}
        </button>
      </div>

      {songs.length > 0 && (
        <div>
          <h4 style={{ color: '#a8b8e8', fontSize: 12, fontWeight: 'normal', margin: '0 0 8px' }}>{tx.mediaEpkSongCovers}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {songs.map(song => {
              const override = epk.song_cover_assets?.[song.id]
              const cover = override?.url || song.cover_image_url || song.spotify_cover_url
              return (
                <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {cover ? (
                    <img src={cover} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
                  )}
                  <span style={{ flex: 1, color: '#c8c0b0', fontSize: 13 }}>{song.title}</span>
                  <button type="button" className="btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setSongPickerId(song.id)}>
                    {tx.mediaPickerPickCover}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        artistId={artistId}
        types={['epk_image', 'artist_photo', 'banner', 'promo_image', 'cover']}
        selectedId={epk.epk_image_asset_id}
        onSelect={applyEpkHero}
        title={tx.mediaPickerPickEpk}
      />

      {songPickerId && (
        <AssetPicker
          open={!!songPickerId}
          onClose={() => setSongPickerId(null)}
          artistId={artistId}
          types={['cover', 'promo_image', 'epk_image']}
          selectedId={epk.song_cover_assets?.[songPickerId]?.asset_id}
          onSelect={asset => applySongCover(songPickerId, asset)}
          title={tx.mediaPickerPickCover}
        />
      )}
    </div>
  )
}

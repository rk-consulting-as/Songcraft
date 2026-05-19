'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { t, useLang } from '@/lib/i18n'
import {
  MEDIA_ASSET_TYPES,
  type MediaAsset,
  type MediaAssetType,
} from '@/lib/mediaLibrary/types'
import { fetchMediaAssets } from '@/lib/mediaLibrary/client'
import ZoomableImage from '@/components/ZoomableImage'

const TYPE_LABEL_KEYS: Record<MediaAssetType, keyof (typeof t)['en']> = {
  cover: 'mediaTypeCover',
  logo: 'mediaTypeLogo',
  artist_photo: 'mediaTypeArtistPhoto',
  banner: 'mediaTypeBanner',
  epk_image: 'mediaTypeEpk',
  campaign_graphic: 'mediaTypeCampaign',
  qr_export: 'mediaTypeQr',
  promo_image: 'mediaTypePromo',
  social_graphic: 'mediaTypeSocial',
  activity_proof: 'mediaTypeActivityProof',
}

export default function AssetPicker({
  open,
  onClose,
  artistId,
  types,
  selectedId,
  onSelect,
  title,
}: {
  open: boolean
  onClose: () => void
  artistId: string
  types?: MediaAssetType[]
  selectedId?: string | null
  onSelect: (asset: MediaAsset) => void
  title?: string
}) {
  const lang = useLang()
  const tx = t[lang]
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [preview, setPreview] = useState<MediaAsset | null>(null)

  const allowedTypes = types?.length ? types : [...MEDIA_ASSET_TYPES]

  const load = useCallback(async () => {
    if (!open || !artistId) return
    setLoading(true)
    const data = await fetchMediaAssets({ artistId, limit: 200 })
    setAssets(data?.assets || [])
    setLoading(false)
  }, [open, artistId])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let list = assets.filter(a => allowedTypes.includes(a.type))
    if (filterType) list = list.filter(a => a.type === filterType)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        a =>
          a.title.toLowerCase().includes(q) ||
          (a.description || '').toLowerCase().includes(q) ||
          (a.tags || []).some(tag => tag.toLowerCase().includes(q))
      )
    }
    return list
  }, [assets, allowedTypes, filterType, search])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setFilterType('')
      setPreview(null)
    }
  }, [open])

  if (!open) return null

  const typeLabel = (type: MediaAssetType) => tx[TYPE_LABEL_KEYS[type]] || type

  return (
    <div
      className="asset-picker-backdrop"
      role="dialog"
      aria-modal
      aria-label={title || tx.mediaPickerTitle}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="asset-picker-panel">
        <div className="asset-picker-header">
          <h3>{title || tx.mediaPickerTitle}</h3>
          <button type="button" className="btn-outline" onClick={onClose} aria-label={tx.close}>
            ✕
          </button>
        </div>

        <div className="asset-picker-toolbar">
          <input
            type="search"
            placeholder={tx.mediaSearchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">{tx.mediaFilterAllTypes}</option>
            {allowedTypes.map(ty => (
              <option key={ty} value={ty}>{typeLabel(ty)}</option>
            ))}
          </select>
        </div>

        <div className="asset-picker-body">
          <div className="asset-picker-grid">
            {loading ? (
              <p style={{ color: '#8a7a60', fontSize: 13 }}>{tx.loading}</p>
            ) : filtered.length === 0 ? (
              <p style={{ color: '#8a7a60', fontSize: 13 }}>{tx.mediaEmpty}</p>
            ) : (
              filtered.map(asset => {
                const isSelected = selectedId === asset.id
                const isPreview = preview?.id === asset.id
                return (
                  <button
                    key={asset.id}
                    type="button"
                    className={`asset-picker-item${isSelected ? ' is-selected' : ''}${isPreview ? ' is-preview' : ''}`}
                    onClick={() => setPreview(asset)}
                    onDoubleClick={() => onSelect(asset)}
                  >
                    <img src={asset.thumbnail_url || asset.file_url} alt={asset.title} />
                    <span className="asset-picker-item-title">{asset.title}</span>
                    <span className="asset-picker-item-type">{typeLabel(asset.type)}</span>
                  </button>
                )
              })
            )}
          </div>

          {preview && (
            <div className="asset-picker-preview">
              <ZoomableImage src={preview.file_url} alt={preview.title} />
              <p style={{ color: '#e8e0d0', fontSize: 14, margin: '8px 0 4px' }}>{preview.title}</p>
              <p style={{ color: '#8a7a60', fontSize: 12, margin: 0 }}>
                {typeLabel(preview.type)} · {preview.visibility === 'public' ? tx.mediaVisibilityPublic : tx.mediaVisibilityPrivate}
              </p>
              <button
                type="button"
                className="btn-gold"
                style={{ marginTop: 12, width: '100%' }}
                onClick={() => onSelect(preview)}
              >
                {tx.mediaPickerUse}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { t, useLang } from '@/lib/i18n'
import {
  MEDIA_ASSET_TYPES,
  type MediaAsset,
  type MediaAssetType,
  type MediaAssetVisibility,
} from '@/lib/mediaLibrary/types'
import { formatBytes } from '@/lib/mediaLibrary/limits'
import {
  deleteMediaAsset,
  fetchMediaAssets,
  patchMediaAsset,
  uploadMediaAsset,
} from '@/lib/mediaLibrary/client'
import type { PlanId } from '@/lib/subscription'
import UpgradePrompt from '@/components/UpgradePrompt'
import ZoomableImage from '@/components/ZoomableImage'

type Props = {
  artistId?: string
  artists?: { id: string; name: string }[]
  planId?: PlanId
  compact?: boolean
}

const UPLOAD_ERROR_KEYS: Record<string, keyof (typeof t)['en']> = {
  asset_limit: 'mediaErrorasset_limit',
  not_authenticated: 'mediaErrornot_authenticated',
  too_large: 'mediaErrortoo_large',
  unsupported_type: 'mediaErrorunsupported_type',
  upload_failed: 'mediaErrorupload_failed',
}

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
}

export default function MediaLibraryPanel({ artistId, artists, planId: planIdProp, compact }: Props) {
  const lang = useLang()
  const tx = t[lang]
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [planId, setPlanId] = useState<PlanId>(planIdProp || 'free')
  const [limits, setLimits] = useState<{ maxAssets: number; maxFileBytes: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterArtist, setFilterArtist] = useState(artistId || '')
  const [filterType, setFilterType] = useState('')
  const [filterVisibility, setFilterVisibility] = useState('')
  const [search, setSearch] = useState('')
  const [uploadType, setUploadType] = useState<MediaAssetType>('promo_image')
  const [uploadVisibility, setUploadVisibility] = useState<MediaAssetVisibility>('private')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchMediaAssets({
      artistId: filterArtist || artistId || undefined,
      type: filterType || undefined,
      visibility: filterVisibility || undefined,
      q: search || undefined,
      limit: 120,
    })
    if (data) {
      setAssets(data.assets)
      setPlanId(data.planId)
      setLimits({ maxAssets: data.limits.maxAssets, maxFileBytes: data.limits.maxFileBytes })
    }
    setLoading(false)
  }, [artistId, filterArtist, filterType, filterVisibility, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (artistId) setFilterArtist(artistId)
  }, [artistId])

  const recent = useMemo(() => [...assets].slice(0, 6), [assets])
  const atLimit = limits ? assets.length >= limits.maxAssets : false

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!list.length) return
    if (atLimit) {
      setUploadError('asset_limit')
      return
    }
    setUploadError(null)
    for (const file of list) {
      setUploadProgress(0)
      const { asset, error } = await uploadMediaAsset(
        file,
        {
          type: uploadType,
          title: file.name.replace(/\.[^.]+$/, ''),
          artistId: filterArtist || artistId,
          visibility: uploadVisibility,
        },
        pct => setUploadProgress(pct)
      )
      setUploadProgress(null)
      if (error) {
        setUploadError(error)
        break
      }
      if (asset) setAssets(prev => [asset, ...prev])
    }
    await load()
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  async function toggleVisibility(asset: MediaAsset) {
    const next: MediaAssetVisibility = asset.visibility === 'public' ? 'private' : 'public'
    const updated = await patchMediaAsset(asset.id, { visibility: next })
    if (updated) setAssets(prev => prev.map(a => (a.id === asset.id ? updated : a)))
  }

  async function toggleFeatured(asset: MediaAsset) {
    const updated = await patchMediaAsset(asset.id, {
      is_featured: !asset.is_featured,
      artist_id: asset.artist_id || filterArtist || artistId,
    })
    if (updated) {
      setAssets(prev =>
        prev.map(a => {
          if (a.id === updated.id) return updated
          if (updated.is_featured && a.artist_id === updated.artist_id) return { ...a, is_featured: false }
          return a
        })
      )
    }
  }

  async function removeAsset(id: string) {
    if (!confirm(tx.mediaDeleteConfirm)) return
    const ok = await deleteMediaAsset(id)
    if (ok) setAssets(prev => prev.filter(a => a.id !== id))
  }

  const typeLabel = (type: MediaAssetType) => tx[TYPE_LABEL_KEYS[type]] || type

  return (
    <div className={`media-library${compact ? ' media-library--compact' : ''}`}>
      <div className="media-library-toolbar">
        <input
          type="search"
          className="media-library-search"
          placeholder={tx.mediaSearchPlaceholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} aria-label={tx.mediaFilterType}>
          <option value="">{tx.mediaFilterAllTypes}</option>
          {MEDIA_ASSET_TYPES.map(ty => (
            <option key={ty} value={ty}>{typeLabel(ty)}</option>
          ))}
        </select>
        <select value={filterVisibility} onChange={e => setFilterVisibility(e.target.value)} aria-label={tx.mediaFilterVisibility}>
          <option value="">{tx.mediaFilterAllVisibility}</option>
          <option value="private">{tx.mediaVisibilityPrivate}</option>
          <option value="public">{tx.mediaVisibilityPublic}</option>
        </select>
        {!artistId && artists && artists.length > 0 && (
          <select value={filterArtist} onChange={e => setFilterArtist(e.target.value)} aria-label={tx.mediaFilterArtist}>
            <option value="">{tx.mediaFilterAllArtists}</option>
            {artists.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
      </div>

      {planId === 'free' && (
        <UpgradePrompt
          title={tx.mediaFreeLimitTitle}
          description={tx.mediaFreeLimitDesc.replace('{max}', String(limits?.maxAssets ?? 25))}
          compact
        />
      )}

      <div
        ref={dropRef}
        className={`media-upload-zone${dragOver ? ' is-drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <p className="media-upload-hint">{tx.mediaUploadHint}</p>
        <div className="media-upload-controls">
          <select value={uploadType} onChange={e => setUploadType(e.target.value as MediaAssetType)}>
            {MEDIA_ASSET_TYPES.map(ty => (
              <option key={ty} value={ty}>{typeLabel(ty)}</option>
            ))}
          </select>
          <select value={uploadVisibility} onChange={e => setUploadVisibility(e.target.value as MediaAssetVisibility)}>
            <option value="private">{tx.mediaVisibilityPrivate}</option>
            <option value="public">{tx.mediaVisibilityPublic}</option>
          </select>
          <button type="button" className="btn-gold" disabled={atLimit || uploadProgress !== null} onClick={() => fileRef.current?.click()}>
            {tx.mediaUploadButton}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          multiple
          hidden
          onChange={e => {
            if (e.target.files?.length) handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        {uploadProgress !== null && (
          <div className="media-upload-progress" role="progressbar" aria-valuenow={uploadProgress}>
            <div style={{ width: `${uploadProgress}%` }} />
            <span>{uploadProgress}%</span>
          </div>
        )}
        {uploadError && (
          <p className="media-upload-error">
            {UPLOAD_ERROR_KEYS[uploadError] ? tx[UPLOAD_ERROR_KEYS[uploadError]] : uploadError}
          </p>
        )}
        {limits && (
          <p className="media-upload-meta">
            {assets.length} / {limits.maxAssets} · max {formatBytes(limits.maxFileBytes)}
          </p>
        )}
      </div>

      {!compact && recent.length > 0 && (
        <section className="media-library-section">
          <h4>{tx.mediaRecent}</h4>
          <div className="media-asset-grid media-asset-grid--compact">
            {recent.map(a => (
              <MediaAssetCard
                key={a.id}
                asset={a}
                typeLabel={typeLabel(a.type)}
                tx={tx}
                onToggleVisibility={() => toggleVisibility(a)}
                onToggleFeatured={() => toggleFeatured(a)}
                onDelete={() => removeAsset(a.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="media-library-section">
        <h4>{tx.mediaAllAssets}</h4>
        {loading ? (
          <p style={{ color: '#8a7a60', fontSize: 14 }}>{tx.loading}</p>
        ) : assets.length === 0 ? (
          <p style={{ color: '#8a7a60', fontSize: 14 }}>{tx.mediaEmpty}</p>
        ) : (
          <div className="media-asset-grid">
            {assets.map(a => (
              <MediaAssetCard
                key={a.id}
                asset={a}
                typeLabel={typeLabel(a.type)}
                tx={tx}
                onToggleVisibility={() => toggleVisibility(a)}
                onToggleFeatured={() => toggleFeatured(a)}
                onDelete={() => removeAsset(a.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MediaAssetCard({
  asset,
  typeLabel,
  tx,
  onToggleVisibility,
  onToggleFeatured,
  onDelete,
}: {
  asset: MediaAsset
  typeLabel: string
  tx: (typeof t)['en']
  onToggleVisibility: () => void
  onToggleFeatured: () => void
  onDelete: () => void
}) {
  const usageKeys = Object.entries(asset.usage || {}).filter(([, v]) => v).map(([k]) => k)

  return (
    <article className={`media-asset-card${asset.is_featured ? ' is-featured' : ''}`}>
      <div className="media-asset-thumb">
        <ZoomableImage src={asset.thumbnail_url || asset.file_url} alt={asset.title} />
        {asset.is_featured && <span className="media-asset-featured-badge">{tx.mediaFeatured}</span>}
      </div>
      <div className="media-asset-body">
        <strong className="media-asset-title">{asset.title}</strong>
        <span className="media-asset-type">{typeLabel}</span>
        <span className={`media-asset-visibility media-asset-visibility--${asset.visibility}`}>
          {asset.visibility === 'public' ? tx.mediaVisibilityPublic : tx.mediaVisibilityPrivate}
        </span>
        {usageKeys.length > 0 && (
          <div className="media-asset-usage">
            {usageKeys.map(k => (
              <span key={k} className="media-usage-pill">{k}</span>
            ))}
          </div>
        )}
        {(asset.tags || []).length > 0 && (
          <div className="media-asset-tags">
            {asset.tags.map(tag => (
              <span key={tag} className="media-tag">{tag}</span>
            ))}
          </div>
        )}
        <div className="media-asset-actions">
          <button type="button" className="btn-outline" onClick={onToggleVisibility}>
            {asset.visibility === 'public' ? tx.mediaMakePrivate : tx.mediaMakePublic}
          </button>
          <button type="button" className="btn-outline" onClick={onToggleFeatured}>
            {asset.is_featured ? tx.mediaUnfeature : tx.mediaFeature}
          </button>
          <button type="button" className="btn-outline media-asset-delete" onClick={onDelete}>
            {tx.delete}
          </button>
        </div>
      </div>
    </article>
  )
}

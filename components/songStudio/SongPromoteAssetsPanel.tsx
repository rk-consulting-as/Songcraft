'use client'

import CampaignMediaSection from '@/components/media/CampaignMediaSection'
import WorkspaceEmptyState from '@/components/WorkspaceEmptyState'
import { getCampaignMedia } from '@/lib/mediaLibrary/epkSettings'
import { t, useLang } from '@/lib/i18n'

type Asset = { key: string; label: string; rows: number }

type Props = {
  assets: Asset[]
  publishContent: Record<string, unknown>
  artistId?: string
  songId: string
  aiLoading: boolean
  isLoading: (key: string) => boolean
  onGenerate: (key: string) => void
  onCopy: (text: string) => void
  onUpdateAsset: (key: string, value: string) => void
  onUpdateMedia: (media: ReturnType<typeof getCampaignMedia>) => void
  onOpenReleaseCampaign: () => void
  canGenerate: boolean
}

export default function SongPromoteAssetsPanel({
  assets,
  publishContent,
  artistId,
  songId,
  aiLoading,
  isLoading,
  onGenerate,
  onCopy,
  onUpdateAsset,
  onUpdateMedia,
  onOpenReleaseCampaign,
  canGenerate,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const filledCount = assets.filter(a => !!publishContent[`campaign_${a.key}`]).length
  const campaignMedia = getCampaignMedia(publishContent)

  return (
    <section className="song-studio-promote-assets workspace-section" aria-labelledby="promote-assets-heading">
      <div className="song-studio-promote-assets__header">
        <div>
          <h2 id="promote-assets-heading" className="workspace-section-title">{tx.songStudioPromoteAssetsTitle}</h2>
          <p className="workspace-section-desc">{tx.songStudioPromoteAssetsDesc}</p>
        </div>
        <button type="button" className="btn-outline quick-action-btn" onClick={onOpenReleaseCampaign}>
          {tx.songStudioOpenFullRelease}
        </button>
      </div>

      {artistId && (
        <div className="card workspace-card workspace-glass">
          <CampaignMediaSection
            artistId={artistId}
            songId={songId}
            media={campaignMedia}
            onUpdate={onUpdateMedia}
          />
        </div>
      )}

      {filledCount === 0 && !canGenerate ? (
        <WorkspaceEmptyState
          icon="📣"
          title={tx.songStudioEmptyPromoteAssets}
          description={tx.songStudioEmptyPromoteAssetsDesc}
          action={(
            <button type="button" className="btn-gold quick-action-btn" onClick={onOpenReleaseCampaign}>
              {tx.songStudioOpenFullRelease}
            </button>
          )}
        />
      ) : (
        <div className="song-studio-promote-assets__grid">
          {assets.map(asset => {
            const value = String(publishContent[`campaign_${asset.key}`] || '')
            return (
              <article key={asset.key} className={`card workspace-card workspace-glass${value ? ' song-studio-promote-assets__card--filled' : ''}`}>
                <div className="song-studio-promote-assets__card-head">
                  <h3 className="workspace-card-title">{asset.label}</h3>
                  <div className="song-studio-promote-assets__card-actions">
                    {value && (
                      <button
                        type="button"
                        className="btn-outline quick-action-btn"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => onCopy(value)}
                        aria-label={`${tx.copy} ${asset.label}`}
                      >
                        {tx.copy}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-gold quick-action-btn"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => onGenerate(asset.key)}
                      disabled={aiLoading || !canGenerate}
                    >
                      {isLoading(`campaign_${asset.key}`) ? tx.generating : value ? '↻' : tx.generate}
                    </button>
                  </div>
                </div>
                <textarea
                  value={value}
                  onChange={e => onUpdateAsset(asset.key, e.target.value)}
                  rows={asset.rows}
                  placeholder={tx.campaignAssetPlaceholder}
                  aria-label={asset.label}
                />
              </article>
            )
          })}
        </div>
      )}

      <p className="workspace-section-desc song-studio-promote-assets__footnote">
        {tx.songStudioPromoteAssetsFootnote}
      </p>
    </section>
  )
}

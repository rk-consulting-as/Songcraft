'use client'

import Link from 'next/link'
import { t, useLang } from '@/lib/i18n'

type Song = {
  id: string
  title: string
  status: string
  publish_content?: any
  spotify_release_date?: string | null
}

function hasCampaign(song: Song) {
  const pc = song.publish_content || {}
  const timeline = Array.isArray(pc.campaign_timeline) ? pc.campaign_timeline : []
  return timeline.length > 0 || !!pc.distribution || !!pc.press_release || !!pc.wordpress_post
}

export default function ArtistCampaignsSummary({ songs }: { songs: Song[] }) {
  const lang = useLang()
  const tx = t[lang]
  const campaignSongs = songs.filter(hasCampaign)
  const otherSongs = songs.filter(s => !hasCampaign(s))

  return (
    <div className="workspace-section">
      <div className="card workspace-card">
        <h2 className="workspace-section-title">{tx.workspaceCampaignsTitle}</h2>
        <p style={{ color: '#8a7a60', fontSize: 13, margin: '0 0 16px', lineHeight: 1.55 }}>{tx.workspaceCampaignsDesc}</p>

        {campaignSongs.length === 0 ? (
          <p style={{ color: '#6a5a40', fontSize: 13, margin: 0 }}>{tx.workspaceCampaignsEmpty}</p>
        ) : (
          <div className="workspace-list">
            {campaignSongs.map(song => {
              const pc = song.publish_content || {}
              const steps = Array.isArray(pc.campaign_timeline) ? pc.campaign_timeline.length : 0
              return (
                <Link key={song.id} href={`/song/${song.id}`} className="workspace-list-row">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#e8e0d0', fontSize: 14, fontWeight: 600 }}>{song.title}</div>
                    <div style={{ color: '#8a7a60', fontSize: 12, marginTop: 4 }}>
                      {steps > 0 ? `${steps} ${tx.workspaceCampaignSteps}` : tx.workspaceCampaignStarted}
                      {song.spotify_release_date ? ` · ${song.spotify_release_date.slice(0, 10)}` : ''}
                    </div>
                  </div>
                  <span style={{ color: '#d4a843', fontSize: 12, flexShrink: 0 }}>→</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {otherSongs.length > 0 && (
        <div className="card workspace-card" style={{ marginTop: 14 }}>
          <h3 className="workspace-card-title">{tx.workspaceMoreSongs}</h3>
          <p style={{ color: '#8a7a60', fontSize: 12, margin: '0 0 12px' }}>{tx.workspaceMoreSongsDesc}</p>
          <div className="workspace-list">
            {otherSongs.slice(0, 12).map(song => (
              <Link key={song.id} href={`/song/${song.id}`} className="workspace-list-row">
                <span style={{ color: '#e8e0d0', fontSize: 13 }}>{song.title}</span>
                <span style={{ color: '#8a7a60', fontSize: 11, textTransform: 'capitalize' }}>{song.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

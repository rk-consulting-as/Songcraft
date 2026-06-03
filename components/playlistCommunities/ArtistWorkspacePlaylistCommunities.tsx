'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { t, useLang } from '@/lib/i18n'
import type { CampaignCardData, CreatorPlaylist } from '@/lib/playlistCommunities/types'
import type { PlaylistCommunityLimits } from '@/lib/playlistCommunities/limits'
import {
  createCampaign,
  createCreatorPlaylist,
  fetchCampaigns,
  fetchCreatorPlaylists,
  fetchParticipationSummary,
  fetchDiscoverCampaigns,
  fetchSpotifyPlaylistByUrl,
  requestJoinCampaign,
} from '@/lib/playlistCommunities/client'
import type { UserParticipationSummary } from '@/lib/playlistCommunities/participationSummary'
import { buildCampaignInviteUrl } from '@/lib/playlistCommunities/serialize'
import PlaylistCampaignCard from './PlaylistCampaignCard'
import PlaylistManageRow from './PlaylistManageRow'
import PlaylistCommunityDisclaimer from './PlaylistCommunityDisclaimer'
import PlaylistCommunityHints from './PlaylistCommunityHints'
import CommunityQualityBlurb from './CommunityQualityBlurb'
import ParticipationWorkspaceWidget from './ParticipationWorkspaceWidget'
import UpgradePrompt from '@/components/UpgradePrompt'

type Song = { id: string; title: string; spotify_url?: string | null; public_hidden?: boolean | null }

type Props = {
  artistId: string
  artistName: string
  songs: Song[]
}

type Panel = 'playlists' | 'campaigns' | 'joined' | 'discover'

export default function ArtistWorkspacePlaylistCommunities({ artistId, artistName, songs }: Props) {
  const lang = useLang()
  const tx = t[lang] as Record<string, string>
  const [panel, setPanel] = useState<Panel>('playlists')
  const [playlists, setPlaylists] = useState<CreatorPlaylist[]>([])
  const [ownedCampaigns, setOwnedCampaigns] = useState<CampaignCardData[]>([])
  const [joinedCampaigns, setJoinedCampaigns] = useState<CampaignCardData[]>([])
  const [discoverCampaigns, setDiscoverCampaigns] = useState<CampaignCardData[]>([])
  const [limits, setLimits] = useState<PlaylistCommunityLimits | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [showPlaylistForm, setShowPlaylistForm] = useState(false)
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('')
  const [campaignTitle, setCampaignTitle] = useState('')
  const [campaignRules, setCampaignRules] = useState('')
  const [campaignVisibility, setCampaignVisibility] = useState<'private' | 'public'>('public')
  const [campaignStatus, setCampaignStatus] = useState<'draft' | 'open'>('open')
  const [participationSummary, setParticipationSummary] = useState<UserParticipationSummary | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pl, owned, joined, part] = await Promise.all([
        fetchCreatorPlaylists(artistId),
        fetchCampaigns({ artistId, scope: 'owned' }),
        fetchCampaigns({ artistId, scope: 'joined' }),
        fetchParticipationSummary(),
      ])
      setPlaylists(pl?.playlists || [])
      const stats = part?.summary?.campaignStats || {}
      setOwnedCampaigns(
        ((owned?.campaigns || []) as CampaignCardData[]).map(c => ({
          ...c,
          membersNeedingAttention: stats[c.id]?.membersNeedingAttention ?? c.membersNeedingAttention,
        }))
      )
      setJoinedCampaigns((joined?.campaigns || []) as CampaignCardData[])
      setParticipationSummary(part?.summary || null)
      if (owned?.limits) setLimits(owned.limits)

      try {
        const disc = await fetchDiscoverCampaigns({ sort: 'trending' })
        setDiscoverCampaigns((disc.campaigns || []) as CampaignCardData[])
      } catch {
        setDiscoverCampaigns([])
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [artistId])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    ;(async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb.from('profiles').select('referral_code').eq('id', user.id).maybeSingle()
      if (data?.referral_code) setReferralCode(data.referral_code)
    })()
  }, [])

  const importPlaylist = async () => {
    setImporting(true)
    setError(null)
    try {
      const meta = await fetchSpotifyPlaylistByUrl(spotifyUrl)
      if (meta.playlist) {
        await createCreatorPlaylist({
          artist_id: artistId,
          spotify_url: meta.playlist.spotifyUrl,
          spotify_playlist_id: meta.playlist.id,
          title: meta.playlist.title,
          description: meta.playlist.description,
          image_url: meta.playlist.imageUrl,
          owner_name: meta.playlist.ownerName,
          visibility: 'private',
        })
      } else {
        await createCreatorPlaylist({
          artist_id: artistId,
          spotify_url: spotifyUrl,
          title: manualTitle || 'My playlist',
          visibility: 'private',
        })
      }
      setSpotifyUrl('')
      setManualTitle('')
      setShowPlaylistForm(false)
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const createNewCampaign = async () => {
    if (!selectedPlaylistId) return
    setError(null)
    try {
      await createCampaign({
        artist_id: artistId,
        playlist_id: selectedPlaylistId,
        title: campaignTitle || `${artistName} playlist community`,
        rules: campaignRules,
        visibility: campaignVisibility,
        status: campaignStatus,
        commitment_level: 'standard',
      })
      setShowCampaignForm(false)
      setCampaignTitle('')
      setCampaignRules('')
      await refresh()
      setPanel('campaigns')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setError(msg === 'campaign_limit_reached' ? tx.playlistCommunityLimitReached : msg)
    }
  }

  const copyInvite = (campaignId: string) => {
    const url = buildCampaignInviteUrl(campaignId, referralCode)
    void navigator.clipboard.writeText(url.startsWith('http') ? url : `${window.location.origin}${url}`)
  }

  const panels: { id: Panel; label: string }[] = [
    { id: 'playlists', label: tx.playlistCommunityMyPlaylists },
    { id: 'campaigns', label: tx.playlistCommunityMyCampaigns },
    { id: 'joined', label: tx.playlistCommunityJoined },
    { id: 'discover', label: tx.playlistCommunityDiscover },
  ]

  const atCampaignLimit = limits && ownedCampaigns.length >= limits.maxCampaigns

  return (
    <section className="artist-workspace-section playlist-communities-workspace">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 6px', color: '#d4a843', fontWeight: 'normal', fontSize: 18 }}>{tx.playlistCommunityTitle}</h2>
        <p style={{ margin: 0, color: '#8a7a60', fontSize: 13, maxWidth: 560, lineHeight: 1.5 }}>{tx.playlistCommunitySubtitle}</p>
        <p style={{ margin: '10px 0 0', fontSize: 12 }}>
          <Link href={`/growth?artist=${artistId}`} style={{ color: '#d4a843', textDecoration: 'none' }}>
            {tx.growthHubAlsoAvailable} →
          </Link>
        </p>
      </div>

      <PlaylistCommunityDisclaimer />
      <CommunityQualityBlurb compact />

      {!loading && (
        <PlaylistCommunityHints
          ownedCampaigns={ownedCampaigns}
          joinedCount={joinedCampaigns.length}
          artistId={artistId}
          participationSummary={participationSummary}
        />
      )}

      <ParticipationWorkspaceWidget />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '20px 0' }}>
        {panels.map(p => (
          <button
            key={p.id}
            type="button"
            className={panel === p.id ? 'btn-gold' : 'btn-outline'}
            style={{ fontSize: 12 }}
            onClick={() => setPanel(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <p style={{ color: '#c08060', fontSize: 13 }}>{error}</p>}
      {loading && <p style={{ color: '#8a7a60', fontSize: 14 }}>{tx.loading}</p>}

      {!loading && panel === 'playlists' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <p style={{ margin: 0, color: '#8a7a60', fontSize: 13 }}>{tx.playlistCommunityPlaylistsHint}</p>
            <button type="button" className="btn-gold" style={{ fontSize: 12 }} onClick={() => setShowPlaylistForm(v => !v)}>
              {tx.playlistCommunityAddPlaylist}
            </button>
          </div>
          {showPlaylistForm && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#8a7a60', marginBottom: 6 }}>{tx.playlistCommunitySpotifyUrl}</label>
              <input
                className="input"
                value={spotifyUrl}
                onChange={e => setSpotifyUrl(e.target.value)}
                placeholder="https://open.spotify.com/playlist/..."
                style={{ width: '100%', marginBottom: 10 }}
              />
              <label style={{ display: 'block', fontSize: 12, color: '#8a7a60', marginBottom: 6 }}>{tx.playlistCommunityManualTitle}</label>
              <input className="input" value={manualTitle} onChange={e => setManualTitle(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
              <button type="button" className="btn-gold" disabled={importing || !spotifyUrl.trim()} onClick={importPlaylist}>
                {importing ? tx.loading : tx.playlistCommunitySavePlaylist}
              </button>
            </div>
          )}
          {playlists.length === 0 ? (
            <p style={{ color: '#6a5a40', fontSize: 13 }}>{tx.playlistCommunityNoPlaylists}</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {playlists.map(pl => (
                <PlaylistManageRow key={pl.id} playlist={pl} onUpdated={refresh} />
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && panel === 'campaigns' && (
        <div>
          {atCampaignLimit && <UpgradePrompt title={tx.playlistCommunityLimitReached} compact />}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              type="button"
              className="btn-gold"
              style={{ fontSize: 12 }}
              disabled={atCampaignLimit || playlists.length === 0}
              onClick={() => {
                setSelectedPlaylistId(playlists[0]?.id || '')
                setShowCampaignForm(v => !v)
              }}
            >
              {tx.playlistCommunityCreateCampaign}
            </button>
          </div>
          {showCampaignForm && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <PlaylistCommunityDisclaimer compact />
              <label style={{ display: 'block', fontSize: 12, color: '#8a7a60', marginTop: 12, marginBottom: 6 }}>{tx.playlistCommunitySelectPlaylist}</label>
              <select className="input" value={selectedPlaylistId} onChange={e => setSelectedPlaylistId(e.target.value)} style={{ width: '100%', marginBottom: 10 }}>
                {playlists.map(pl => <option key={pl.id} value={pl.id}>{pl.title}</option>)}
              </select>
              <input className="input" value={campaignTitle} onChange={e => setCampaignTitle(e.target.value)} placeholder={tx.playlistCommunityCampaignTitle} style={{ width: '100%', marginBottom: 10 }} />
              <textarea className="input" value={campaignRules} onChange={e => setCampaignRules(e.target.value)} placeholder={tx.playlistCommunityRules} rows={4} style={{ width: '100%', marginBottom: 10 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8a7a60', marginBottom: 12 }}>
                <input type="checkbox" checked={campaignVisibility === 'public'} onChange={e => setCampaignVisibility(e.target.checked ? 'public' : 'private')} />
                {tx.playlistCommunityPublicCampaign}
              </label>
              <button type="button" className="btn-gold" onClick={createNewCampaign}>{tx.playlistCommunityCreateCampaign}</button>
            </div>
          )}
          {ownedCampaigns.length === 0 ? (
            <p style={{ color: '#6a5a40', fontSize: 13 }}>{tx.playlistCommunityNoCampaigns}</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {ownedCampaigns.map(c => (
                <div key={c.id}>
                  <PlaylistCampaignCard
                    campaign={{ ...c, isOwner: true }}
                    onManage={() => { window.location.href = `/playlist-campaigns/${c.id}` }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && panel === 'joined' && (
        <div>
          {joinedCampaigns.length === 0 ? (
            <p style={{ color: '#6a5a40', fontSize: 13 }}>{tx.playlistCommunityNoJoined}</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {joinedCampaigns.map(c => (
                <PlaylistCampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && panel === 'discover' && (
        <div>
          <p style={{ color: '#8a7a60', fontSize: 13, marginBottom: 16 }}>{tx.playlistCommunityDiscoverHint}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <Link href="/discover/campaigns" className="btn-gold" style={{ textDecoration: 'none', fontSize: 12 }}>
              {tx.discoverCampaignsTitle} →
            </Link>
            <Link href="/discover" className="btn-outline" style={{ textDecoration: 'none', fontSize: 12 }}>
              {tx.discoverEcosystemTitle} →
            </Link>
          </div>
          {discoverCampaigns.length === 0 ? (
            <p style={{ color: '#6a5a40', fontSize: 13 }}>{tx.playlistCommunityNoDiscover}</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {discoverCampaigns.map(c => (
                <PlaylistCampaignCard
                  key={c.id}
                  campaign={c}
                  onRequestJoin={async () => {
                    try {
                      await requestJoinCampaign(c.id, { artist_id: artistId, song_id: songs[0]?.id })
                      await refresh()
                    } catch (e: unknown) {
                      setError(e instanceof Error ? e.message : 'Request failed')
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

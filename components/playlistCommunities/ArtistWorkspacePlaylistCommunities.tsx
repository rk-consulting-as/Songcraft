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
  fetchSpotifyPlaylistByUrl,
  requestJoinCampaign,
} from '@/lib/playlistCommunities/client'
import { buildCampaignInviteUrl } from '@/lib/playlistCommunities/serialize'
import PlaylistCampaignCard from './PlaylistCampaignCard'
import PlaylistCommunityDisclaimer from './PlaylistCommunityDisclaimer'
import PlaylistCommunityHints from './PlaylistCommunityHints'
import CommunityQualityBlurb from './CommunityQualityBlurb'
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

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pl, owned, joined] = await Promise.all([
        fetchCreatorPlaylists(artistId),
        fetchCampaigns({ artistId, scope: 'owned' }),
        fetchCampaigns({ artistId, scope: 'joined' }),
      ])
      setPlaylists(pl?.playlists || [])
      setOwnedCampaigns((owned?.campaigns || []) as CampaignCardData[])
      setJoinedCampaigns((joined?.campaigns || []) as CampaignCardData[])
      if (owned?.limits) setLimits(owned.limits)

      const res = await fetch('/api/discover/catalog')
      if (res.ok) {
        const catalog = await res.json()
        setDiscoverCampaigns(
          (catalog.playlistCampaigns || []).map((c: {
            id: string
            title: string
            rules: string | null
            genre: string | null
            mood: string | null
            commitmentLevel: string
            status: string
            memberCount: number
            playlistTitle: string
            playlistImageUrl: string | null
            artistName: string | null
          }) => ({
            id: c.id,
            title: c.title,
            rules: c.rules,
            genre: c.genre,
            mood: c.mood,
            commitment_level: c.commitmentLevel as CampaignCardData['commitment_level'],
            status: c.status as CampaignCardData['status'],
            memberCount: c.memberCount,
            artistName: c.artistName,
            isOwner: false,
            playlist: { title: c.playlistTitle, image_url: c.playlistImageUrl, spotify_url: '', owner_name: null },
            user_id: '',
            artist_id: null,
            playlist_id: '',
            description: null,
            max_members: null,
            songs_per_member: 1,
            active_days_per_week: null,
            campaign_start_date: null,
            campaign_end_date: null,
            visibility: 'public' as const,
            admin_hidden: false,
            created_at: '',
            updated_at: '',
          }))
        )
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
      </div>

      <PlaylistCommunityDisclaimer />
      <CommunityQualityBlurb compact />

      {!loading && (
        <PlaylistCommunityHints
          ownedCampaigns={ownedCampaigns}
          joinedCount={joinedCampaigns.length}
          artistId={artistId}
        />
      )}

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
                <div key={pl.id} className="card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                  {pl.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pl.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 6, background: 'rgba(212,168,67,0.12)' }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#e8e0d0', fontSize: 14 }}>{pl.title}</div>
                    {pl.owner_name && <div style={{ fontSize: 11, color: '#6a5a40' }}>{pl.owner_name}</div>}
                  </div>
                  {pl.spotify_url && (
                    <a href={pl.spotify_url} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ fontSize: 11, textDecoration: 'none' }}>Spotify</a>
                  )}
                </div>
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
          <Link href="/discover" className="btn-outline" style={{ textDecoration: 'none', fontSize: 12, marginBottom: 16, display: 'inline-block' }}>
            {tx.discoverEcosystemTitle} →
          </Link>
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

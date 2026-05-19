'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, useLang } from '@/lib/i18n'
import {
  fetchCampaignDetail,
  requestJoinCampaign,
  updateCampaign,
  updateCampaignMember,
} from '@/lib/playlistCommunities/client'
import { buildCampaignInviteUrl } from '@/lib/playlistCommunities/serialize'
import { getSongEligibilityWarnings } from '@/lib/playlistCommunities/eligibility'
import PlaylistCommunityDisclaimer from '@/components/playlistCommunities/PlaylistCommunityDisclaimer'
import type { CampaignCardData } from '@/lib/playlistCommunities/types'

export default function PlaylistCampaignPage() {
  const params = useParams()
  const id = String(params?.id || '')
  const lang = useLang()
  const tx = t[lang] as Record<string, string>
  const [campaign, setCampaign] = useState<CampaignCardData | null>(null)
  const [members, setMembers] = useState<Array<Record<string, unknown>>>([])
  const [isOwner, setIsOwner] = useState(false)
  const [myMembership, setMyMembership] = useState<{ id: string; status: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [joinArtistId, setJoinArtistId] = useState('')
  const [joinSongId, setJoinSongId] = useState('')
  const [joinMessage, setJoinMessage] = useState('')
  const [songs, setSongs] = useState<Array<{ id: string; title: string; spotify_url?: string | null; public_hidden?: boolean | null }>>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCampaignDetail(id)
      if (!data) throw new Error('not_found')
      setCampaign(data.campaign as CampaignCardData)
      setMembers((data.members || []) as Array<Record<string, unknown>>)
      setIsOwner(data.isOwner)
      setMyMembership(data.myMembership ? { id: data.myMembership.id, status: data.myMembership.status } : null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    ;(async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: profile } = await sb.from('profiles').select('referral_code').eq('id', user.id).maybeSingle()
      if (profile?.referral_code) setReferralCode(profile.referral_code)
      const { data: artists } = await sb.from('artists').select('id').eq('user_id', user.id).limit(1)
      const artistId = artists?.[0]?.id
      if (artistId) {
        setJoinArtistId(artistId)
        const { data: songRows } = await sb.from('songs').select('id, title, spotify_url, public_hidden').eq('artist_id', artistId).limit(50)
        setSongs(songRows || [])
        if (songRows?.[0]) setJoinSongId(songRows[0].id)
      }
    })()
  }, [])

  const copyInvite = () => {
    const url = buildCampaignInviteUrl(id, referralCode)
    const full = url.startsWith('http') ? url : `${window.location.origin}${url}`
    void navigator.clipboard.writeText(full)
  }

  const handleJoin = async () => {
    const selected = songs.find(s => s.id === joinSongId)
    const warnings = getSongEligibilityWarnings(selected)
    if (warnings.length && !window.confirm(warnings.map(w => tx[w.messageKey] || w.messageKey).join('\n'))) return
    try {
      await requestJoinCampaign(id, { artist_id: joinArtistId, song_id: joinSongId, message: joinMessage })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
    }
  }

  const manageMember = async (memberId: string, status: string) => {
    try {
      await updateCampaignMember(id, memberId, { status })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const publishCampaign = async () => {
    try {
      await updateCampaign(id, { status: 'open', visibility: 'public' })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (loading) {
    return (
      <main className="public-surface" style={{ minHeight: '100vh', padding: 40, textAlign: 'center', color: '#8a7a60' }}>
        {tx.loading}
      </main>
    )
  }

  if (!campaign || error === 'not_found') {
    return (
      <main className="public-surface" style={{ minHeight: '100vh', padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#8a7a60' }}>{tx.playlistCommunityNotFound}</p>
        <Link href="/discover" className="btn-outline" style={{ textDecoration: 'none', marginTop: 16, display: 'inline-block' }}>{tx.discoverEcosystemTitle}</Link>
      </main>
    )
  }

  const pl = campaign.playlist
  const commitmentKey = `playlistCommitment${campaign.commitment_level.charAt(0).toUpperCase()}${campaign.commitment_level.slice(1)}`

  return (
    <main className="public-surface" style={{ minHeight: '100vh' }}>
      <header className="public-header">
        <Link href="/discover" className="public-header__back">← {tx.discoverEcosystemTitle}</Link>
        <Link href="/" className="public-header__brand">VIATONE</Link>
      </header>
      <div className="public-body" style={{ maxWidth: 720 }}>
        <div className="public-song-hero" style={{ marginBottom: 24 }}>
          {pl?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pl.image_url} alt="" className="public-song-cover" />
          ) : (
            <div className="public-song-cover public-song-cover--placeholder">♫</div>
          )}
          <div className="public-song-meta">
            <h1>{campaign.title}</h1>
            <p style={{ margin: '8px 0 0', color: '#8a7a60', fontSize: 14 }}>{pl?.title}</p>
            {campaign.artistName && <p style={{ margin: '4px 0 0', color: '#6a5a40', fontSize: 13 }}>{campaign.artistName}</p>}
            <div className="public-song-stats">
              <span>{tx[commitmentKey] || campaign.commitment_level}</span>
              <span>{tx.playlistCommunityMemberCount.replace('{n}', String(campaign.memberCount ?? 0))}</span>
              <span style={{ textTransform: 'capitalize' }}>{campaign.status}</span>
            </div>
          </div>
        </div>

        <PlaylistCommunityDisclaimer />

        {campaign.description && (
          <section className="public-section">
            <h2 className="public-section__title">{tx.playlistCommunityAbout}</h2>
            <p style={{ color: '#c8c0b0', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{campaign.description}</p>
          </section>
        )}

        {campaign.rules && (
          <section className="public-section">
            <h2 className="public-section__title">{tx.playlistCommunityRules}</h2>
            <p style={{ color: '#c8c0b0', fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0 }}>{campaign.rules}</p>
          </section>
        )}

        <section className="public-section">
          <h2 className="public-section__title">{tx.playlistCommunityMembers}</h2>
          {members.length === 0 ? (
            <p style={{ color: '#6a5a40', fontSize: 13 }}>{tx.playlistCommunityNoMembers}</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {members.map(m => (
                <li key={String(m.id)} className="public-track-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#e8e0d0', fontSize: 14 }}>{String(m.artistName || tx.playlistCommunityMember)}</div>
                    {m.songTitle ? <div style={{ fontSize: 12, color: '#8a7a60' }}>{String(m.songTitle)}</div> : null}
                    <div style={{ fontSize: 11, color: '#6a5a40', marginTop: 4, textTransform: 'capitalize' }}>{String(m.status)}</div>
                  </div>
                  {isOwner && m.status === 'requested' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="btn-gold" style={{ fontSize: 11 }} onClick={() => manageMember(String(m.id), 'approved')}>{tx.playlistCommunityApprove}</button>
                      <button type="button" className="btn-outline" style={{ fontSize: 11 }} onClick={() => manageMember(String(m.id), 'rejected')}>{tx.playlistCommunityReject}</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="public-section" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {isOwner && (
            <>
              <button type="button" className="btn-outline" onClick={copyInvite}>{tx.playlistCommunityCopyInvite}</button>
              {campaign.status === 'draft' && (
                <button type="button" className="btn-gold" onClick={publishCampaign}>{tx.playlistCommunityPublish}</button>
              )}
              <button type="button" className="btn-outline" style={{ fontSize: 12 }} disabled title={tx.playlistCommunityReportPlaceholder}>
                {tx.playlistCommunityReport}
              </button>
            </>
          )}
          {!isOwner && ['open', 'active'].includes(campaign.status) && (
            <>
              {myMembership?.status === 'approved' ? (
                <button type="button" className="btn-outline" onClick={() => myMembership && manageMember(myMembership.id, 'left')}>{tx.playlistCommunityLeave}</button>
              ) : myMembership?.status === 'requested' ? (
                <span style={{ color: '#8a7a60', fontSize: 13 }}>{tx.playlistCommunityPending}</span>
              ) : (
                <div style={{ width: '100%' }}>
                  <label style={{ fontSize: 12, color: '#8a7a60', display: 'block', marginBottom: 6 }}>{tx.playlistCommunitySelectSong}</label>
                  <select className="input" value={joinSongId} onChange={e => setJoinSongId(e.target.value)} style={{ width: '100%', marginBottom: 10 }}>
                    {songs.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                  <textarea className="input" value={joinMessage} onChange={e => setJoinMessage(e.target.value)} placeholder={tx.playlistCommunityJoinMessage} rows={2} style={{ width: '100%', marginBottom: 10 }} />
                  {getSongEligibilityWarnings(songs.find(s => s.id === joinSongId)).map(w => (
                    <p key={w.key} style={{ fontSize: 12, color: '#a08050', margin: '0 0 8px' }}>{tx[w.messageKey]}</p>
                  ))}
                  <button type="button" className="btn-gold" onClick={handleJoin}>{tx.playlistCommunityRequestJoin}</button>
                </div>
              )}
            </>
          )}
        </section>

        {error && <p style={{ color: '#c08060', fontSize: 13 }}>{error}</p>}
      </div>
    </main>
  )
}

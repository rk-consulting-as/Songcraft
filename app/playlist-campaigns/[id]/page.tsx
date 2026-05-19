'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { getSongEligibilityWarnings } from '@/lib/playlistCommunities/eligibility'
import { computeCampaignHealth } from '@/lib/playlistCommunities/health'
import { buildCampaignQualityChecklist } from '@/lib/playlistCommunities/qualityChecklist'
import { wasInviteCopied } from '@/lib/playlistCommunities/invite'
import { fetchUserPlaylistReputation } from '@/lib/playlistCommunities/fetchReputation'
import type { PlaylistReputationBadge } from '@/lib/playlistCommunities/reputation'
import type { CampaignCardData } from '@/lib/playlistCommunities/types'
import PlaylistCommunityDisclaimer from '@/components/playlistCommunities/PlaylistCommunityDisclaimer'
import PlaylistCampaignStatusBadge from '@/components/playlistCommunities/PlaylistCampaignStatusBadge'
import CampaignHealthIndicators from '@/components/playlistCommunities/CampaignHealthIndicators'
import CampaignQualityChecklist from '@/components/playlistCommunities/CampaignQualityChecklist'
import CampaignInvitePanel from '@/components/playlistCommunities/CampaignInvitePanel'
import PlaylistReputationBadges from '@/components/playlistCommunities/PlaylistReputationBadges'
import CommunityQualityBlurb from '@/components/playlistCommunities/CommunityQualityBlurb'
import CampaignParticipationSection from '@/components/playlistCommunities/CampaignParticipationSection'

type MemberRow = {
  id: string
  status: string
  artistName?: string | null
  songTitle?: string | null
  songHref?: string | null
  songSpotifyUrl?: string | null
  song_id?: string | null
}

export default function PlaylistCampaignPage() {
  const params = useParams()
  const id = String(params?.id || '')
  const lang = useLang()
  const tx = t[lang] as Record<string, string>
  const [campaign, setCampaign] = useState<CampaignCardData | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [myMembership, setMyMembership] = useState<{ id: string; status: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [ownerReputation, setOwnerReputation] = useState<PlaylistReputationBadge[]>([])
  const [inviteCopied, setInviteCopied] = useState(false)
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
      setMembers((data.members || []) as MemberRow[])
      setIsOwner(data.isOwner)
      setMyMembership(data.myMembership ? { id: data.myMembership.id, status: data.myMembership.status } : null)
      setInviteCopied(wasInviteCopied(id))
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
      if (campaign?.user_id) {
        const badges = await fetchUserPlaylistReputation(campaign.user_id)
        setOwnerReputation(badges)
      }
      const { data: artists } = await sb.from('artists').select('id').eq('user_id', user.id).limit(1)
      const artistId = artists?.[0]?.id
      if (artistId) {
        setJoinArtistId(artistId)
        const { data: songRows } = await sb.from('songs').select('id, title, spotify_url, public_hidden').eq('artist_id', artistId).limit(50)
        setSongs(songRows || [])
        if (songRows?.[0]) setJoinSongId(songRows[0].id)
      }
    })()
  }, [campaign?.user_id])

  const healthInput = useMemo(() => {
    if (!campaign) return null
    return {
      campaign,
      members: members.map(m => ({
        id: m.id,
        status: m.status,
        song_id: m.song_id,
        songTitle: m.songTitle,
        songSpotifyUrl: m.songSpotifyUrl,
        songHref: m.songHref,
      })),
    }
  }, [campaign, members])

  const healthSignals = healthInput ? computeCampaignHealth(healthInput) : []
  const qualityItems = healthInput
    ? buildCampaignQualityChecklist({ ...healthInput, inviteCopied })
    : []

  const submittedSongs = members.filter(m => m.status === 'approved' && (m.songTitle || m.songHref))
  const pendingRequests = members.filter(m => m.status === 'requested')

  const manageMember = async (memberId: string, status: string) => {
    try {
      await updateCampaignMember(id, memberId, { status })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const setCampaignStatus = async (status: string) => {
    try {
      await updateCampaign(id, { status })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const publishCampaign = () => setCampaignStatus('open')

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

  if (loading) {
    return (
      <main className="public-surface playlist-campaign-page" style={{ minHeight: '100vh', padding: 40, textAlign: 'center', color: '#8a7a60' }}>
        {tx.loading}
      </main>
    )
  }

  if (!campaign || error === 'not_found') {
    return (
      <main className="public-surface playlist-campaign-page" style={{ minHeight: '100vh', padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#8a7a60' }}>{tx.playlistCommunityNotFound}</p>
        <Link href="/discover" className="btn-outline" style={{ textDecoration: 'none', marginTop: 16, display: 'inline-block' }}>{tx.discoverEcosystemTitle}</Link>
      </main>
    )
  }

  const pl = campaign.playlist
  const commitmentKey = `playlistCommitment${campaign.commitment_level.charAt(0).toUpperCase()}${campaign.commitment_level.slice(1)}`
  const capacityLabel =
    campaign.max_members != null
      ? tx.playlistCapacityLabel.replace('{n}', String(campaign.memberCount ?? 0)).replace('{max}', String(campaign.max_members))
      : tx.playlistCommunityMemberCount.replace('{n}', String(campaign.memberCount ?? 0))

  return (
    <main className="public-surface playlist-campaign-page">
      <header className="public-header">
        <Link href="/discover" className="public-header__back">← {tx.discoverEcosystemTitle}</Link>
        <Link href="/" className="public-header__brand">VIATONE</Link>
      </header>

      <div className="public-body playlist-campaign-detail">
        <div className="playlist-campaign-detail__hero public-song-hero">
          {pl?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pl.image_url} alt="" className="public-song-cover" />
          ) : (
            <div className="public-song-cover public-song-cover--placeholder">♫</div>
          )}
          <div className="public-song-meta">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <PlaylistCampaignStatusBadge status={campaign.status} />
              {(campaign.genre || campaign.mood) && (
                <span className="playlist-meta-chip">{[campaign.genre, campaign.mood].filter(Boolean).join(' · ')}</span>
              )}
            </div>
            <h1>{campaign.title}</h1>
            <p className="playlist-campaign-detail__playlist-name">{pl?.title}</p>
            {campaign.artistName && <p className="playlist-campaign-detail__host">{tx.playlistCampaignHost}: {campaign.artistName}</p>}
            <div className="public-song-stats">
              <span>{tx[commitmentKey] || campaign.commitment_level}</span>
              <span>{capacityLabel}</span>
              {campaign.pendingCount ? (
                <span>{tx.playlistPendingCount.replace('{n}', String(campaign.pendingCount))}</span>
              ) : null}
            </div>
          </div>
        </div>

        {isOwner && <CampaignHealthIndicators signals={healthSignals} />}

        <CommunityQualityBlurb compact />
        <PlaylistCommunityDisclaimer />

        {ownerReputation.some(b => b.earned) && (
          <PlaylistReputationBadges badges={ownerReputation} />
        )}

        <div className="playlist-campaign-detail__grid">
          <div className="playlist-campaign-detail__main">
            {campaign.rules && (
              <section className="public-section playlist-rules-card card">
                <h2 className="public-section__title">{tx.playlistCommunityRules}</h2>
                <p className="playlist-rules-card__body">{campaign.rules}</p>
                <p className="playlist-rules-card__note">{tx.playlistRulesParticipationNote}</p>
              </section>
            )}

            <section className="public-section playlist-commitment-card card">
              <h2 className="public-section__title">{tx.playlistCommitmentSummary}</h2>
              <dl className="playlist-commitment-dl">
                <div><dt>{tx.playlistCommitmentLevel}</dt><dd>{tx[commitmentKey] || campaign.commitment_level}</dd></div>
                <div><dt>{tx.playlistSongsPerMember}</dt><dd>{campaign.songs_per_member}</dd></div>
                {campaign.active_days_per_week != null && (
                  <div><dt>{tx.playlistActiveDays}</dt><dd>{campaign.active_days_per_week}</dd></div>
                )}
                {(campaign.campaign_start_date || campaign.campaign_end_date) && (
                  <div>
                    <dt>{tx.playlistCampaignDates}</dt>
                    <dd>
                      {[campaign.campaign_start_date, campaign.campaign_end_date].filter(Boolean).join(' → ')}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {campaign.description && (
              <section className="public-section">
                <h2 className="public-section__title">{tx.playlistCommunityAbout}</h2>
                <p style={{ color: '#c8c0b0', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{campaign.description}</p>
              </section>
            )}

            <section className="public-section">
              <h2 className="public-section__title">{tx.playlistSubmittedSongs}</h2>
              {submittedSongs.length === 0 ? (
                <p style={{ color: '#6a5a40', fontSize: 13 }}>{tx.playlistNoSubmittedSongs}</p>
              ) : (
                <ul className="playlist-submitted-songs">
                  {submittedSongs.map(m => (
                    <li key={m.id} className="public-track-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#e8e0d0', fontSize: 14 }}>{m.artistName || tx.playlistCommunityMember}</div>
                        {m.songTitle && (
                          m.songHref ? (
                            <Link href={m.songHref} style={{ fontSize: 13, color: '#d4a843', textDecoration: 'none' }}>{m.songTitle}</Link>
                          ) : (
                            <div style={{ fontSize: 13, color: '#8a7a60' }}>{m.songTitle}</div>
                          )
                        )}
                        {isOwner && m.song_id && !m.songSpotifyUrl && (
                          <span className="playlist-missing-link-warn">{tx.playlistMissingSongLink}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <CampaignParticipationSection
              campaignId={id}
              isOwner={isOwner}
              isApprovedMember={myMembership?.status === 'approved'}
              activeDaysPerWeek={campaign.active_days_per_week}
              campaignActive={['open', 'active'].includes(campaign.status)}
            />

            {isOwner && pendingRequests.length > 0 && (
              <section className="public-section">
                <h2 className="public-section__title">{tx.playlistPendingRequests}</h2>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pendingRequests.map(m => (
                    <li key={m.id} className="public-track-row">
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#e8e0d0', fontSize: 14 }}>{m.artistName || tx.playlistCommunityMember}</div>
                        {m.songTitle && <div style={{ fontSize: 12, color: '#8a7a60' }}>{m.songTitle}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn-gold" style={{ fontSize: 11 }} onClick={() => manageMember(m.id, 'approved')}>{tx.playlistCommunityApprove}</button>
                        <button type="button" className="btn-outline" style={{ fontSize: 11 }} onClick={() => manageMember(m.id, 'rejected')}>{tx.playlistCommunityReject}</button>
                        <button type="button" className="btn-outline" style={{ fontSize: 11 }} onClick={() => manageMember(m.id, 'removed')}>{tx.playlistRemoveMember}</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!isOwner && members.filter(m => m.status === 'approved').length > 0 && (
              <section className="public-section">
                <h2 className="public-section__title">{tx.playlistCommunityMembers}</h2>
                <ul className="playlist-submitted-songs">
                  {members.filter(m => m.status === 'approved').map(m => (
                    <li key={m.id} className="public-track-row">
                      <span style={{ color: '#e8e0d0', fontSize: 14 }}>{m.artistName || tx.playlistCommunityMember}</span>
                      {m.songTitle && m.songHref && (
                        <Link href={m.songHref} style={{ fontSize: 12, color: '#8a7a60', marginLeft: 8, textDecoration: 'none' }}>{m.songTitle}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="playlist-campaign-detail__aside">
            {isOwner && (
              <>
                <CampaignQualityChecklist items={qualityItems} />
                <CampaignInvitePanel
                  campaignId={id}
                  campaignTitle={campaign.title}
                  playlistTitle={pl?.title}
                  referralCode={referralCode}
                  onCopied={() => setInviteCopied(true)}
                />
                <div className="playlist-owner-actions card">
                  <h3 className="playlist-owner-actions__title">{tx.playlistOwnerActions}</h3>
                  <div className="playlist-owner-actions__buttons">
                    {campaign.status === 'draft' && (
                      <button type="button" className="btn-gold" onClick={publishCampaign}>{tx.playlistCommunityPublish}</button>
                    )}
                    {['open', 'active'].includes(campaign.status) && (
                      <button type="button" className="btn-outline" onClick={() => setCampaignStatus('closed')}>{tx.playlistCloseCampaign}</button>
                    )}
                    {campaign.status === 'closed' && (
                      <button type="button" className="btn-outline" onClick={() => setCampaignStatus('archived')}>{tx.playlistArchiveCampaign}</button>
                    )}
                    <button type="button" className="btn-outline" disabled title={tx.playlistCommunityReportPlaceholder}>
                      {tx.playlistCommunityReport}
                    </button>
                  </div>
                </div>
              </>
            )}

            {!isOwner && ['open', 'active'].includes(campaign.status) && (
              <div className="playlist-join-panel card">
                <h3 className="playlist-join-panel__title">{tx.playlistCommunityRequestJoin}</h3>
                <p className="playlist-join-panel__desc">{tx.playlistJoinExpectations}</p>
                {myMembership?.status === 'approved' ? (
                  <button type="button" className="btn-outline" onClick={() => myMembership && manageMember(myMembership.id, 'left')}>{tx.playlistCommunityLeave}</button>
                ) : myMembership?.status === 'requested' ? (
                  <span style={{ color: '#8a7a60', fontSize: 13 }}>{tx.playlistCommunityPending}</span>
                ) : (
                  <>
                    <label className="playlist-join-label">{tx.playlistCommunitySelectSong}</label>
                    <select className="input" value={joinSongId} onChange={e => setJoinSongId(e.target.value)}>
                      {songs.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                    <textarea className="input" value={joinMessage} onChange={e => setJoinMessage(e.target.value)} placeholder={tx.playlistCommunityJoinMessage} rows={2} />
                    {getSongEligibilityWarnings(songs.find(s => s.id === joinSongId)).map(w => (
                      <p key={w.key} className="playlist-eligibility-warn">{tx[w.messageKey]}</p>
                    ))}
                    <button type="button" className="btn-gold" style={{ marginTop: 10 }} onClick={handleJoin}>{tx.playlistCommunityRequestJoin}</button>
                  </>
                )}
              </div>
            )}
          </aside>
        </div>

        {error && <p className="playlist-campaign-error">{error}</p>}
      </div>
    </main>
  )
}

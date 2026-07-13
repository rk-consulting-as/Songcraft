'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PlaybackReportCard from '@/components/playback/PlaybackReportCard'
import PlaybackListeningControls from '@/components/playback/PlaybackListeningControls'
import ListeningActivityCard from '@/components/playback/ListeningActivityCard'
import SpotifyConnectionCard from '@/components/spotify/SpotifyConnectionCard'
import SpotifyPlaylistPicker, { type SpotifyPickerPlaylist } from '@/components/spotify/SpotifyPlaylistPicker'
import SpotifyPlaylistSyncStatus from '@/components/spotify/SpotifyPlaylistSyncStatus'
import V2PlaylistListenButton from '@/components/v2/V2PlaylistListenButton'
import V2PlaylistRoomEngine from '@/components/v2/V2PlaylistRoomEngine'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SubmitSongPanel from '@/components/v2/V2SubmitSongPanel'
import V2CuratorReviewWorkspace from '@/components/v2/V2CuratorReviewWorkspace'
import V2CuratorAiMatchBadge from '@/components/v2/V2CuratorAiMatchBadge'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { PlaybackContextSummary } from '@/lib/playback/data/fetchPlaybackContext'
import type { PlaybackReport } from '@/lib/playback/types'
import type { V2CuratorRoomDashboard, V2PlaylistRoomActivity, V2Song } from '@/lib/v2/types'
import { CURATOR_LABELS } from '@/lib/v2/types'

type Props = {
  dashboard: V2CuratorRoomDashboard
  activity: V2PlaylistRoomActivity
  playbackSummary: PlaybackContextSummary
  playbackReport: PlaybackReport | null
  mySongs: V2Song[]
  isHost: boolean
  isLoggedIn: boolean
  userListened: boolean
  demoMode?: boolean
}

function syncStatusLabel(status: string) {
  const map: Record<string, string> = {
    connected: 'Connected',
    manual: 'Manual metadata',
    sync_unavailable: 'Sync unavailable',
    needs_configuration: 'Needs configuration',
  }
  return map[status] || status
}

export default function V2CuratorRoomDashboard({
  dashboard,
  activity,
  playbackSummary,
  playbackReport,
  mySongs,
  isHost,
  isLoggedIn,
  userListened,
  demoMode,
}: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const { room, linkedPlaylists, submissions, playlistItems, upcomingSession, recentSessions, hostName, saveCount, memberCount } = dashboard
  const dna = room.roomMeta?.dna
  const meta = room.roomMeta

  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const linkPlaylist = async (opts?: { url?: string; title?: string; platform?: string; spotifySync?: boolean }) => {
    const url = opts?.url || linkUrl
    if (!url.trim()) return
    setLinkBusy(true)
    try {
      const res = await v2ApiFetch<{ playlist: { id: string } }>(`/api/v2/community/playlists/${room.slug}/linked-playlists`, {
        method: 'POST',
        body: JSON.stringify({
          playlist_url: url,
          platform: opts?.platform || room.platform,
          title: opts?.title || linkTitle || undefined,
          create_snapshot: !!(opts?.title || linkTitle),
          spotify_sync: opts?.spotifySync ?? false,
        }),
      })
      if (opts?.spotifySync && res.playlist?.id) {
        await v2ApiFetch('/api/v2/integrations/spotify/sync-playlist', {
          method: 'POST',
          body: JSON.stringify({ linked_playlist_id: res.playlist.id }),
        })
      }
      showToast('Playlist linked')
      setLinkUrl('')
      setLinkTitle('')
      setShowPicker(false)
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Link failed')
    } finally {
      setLinkBusy(false)
    }
  }

  const pickSpotifyPlaylist = (p: SpotifyPickerPlaylist) => {
    linkPlaylist({ url: p.spotifyUrl, title: p.title, platform: 'spotify', spotifySync: true })
  }

  const syncLinkedPlaylist = async (linkedId: string) => {
    setSyncingId(linkedId)
    try {
      await v2ApiFetch('/api/v2/integrations/spotify/sync-playlist', {
        method: 'POST',
        body: JSON.stringify({ linked_playlist_id: linkedId }),
      })
      showToast('Playlist synced')
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncingId(null)
    }
  }

  const pendingCount = submissions.filter(s => ['pending', 'reviewing'].includes(s.status)).length

  return (
    <>
      <section className="v2-section" style={{ marginTop: 0 }}>
        <V2SectionHeader
          title="Linked playlists"
          lead="External playlists for this Curator Room. Snapshots stay immutable for Playback Evidence."
        />
        <div className="v2-grid cols-2">
          {linkedPlaylists.length === 0 && (
            <p className="v2-meta">No linked playlists yet. Hosts can add Spotify or YouTube URLs with manual metadata until sync is configured.</p>
          )}
          {linkedPlaylists.map(lp => (
            <article key={lp.id} className="v2-card">
              <div className="v2-tagrow">
                <span className="v2-tag">{lp.platform}</span>
                <span className="v2-tag">{syncStatusLabel(lp.syncStatus)}</span>
                <span className="v2-tag">{lp.trackCount} tracks</span>
              </div>
              <h4>{lp.title || 'Linked playlist'}</h4>
              {lp.description && <p className="v2-meta">{lp.description}</p>}
              {lp.platform === 'spotify' && (
                <SpotifyPlaylistSyncStatus
                  playlist={lp}
                  syncing={syncingId === lp.id}
                  onSync={isHost ? () => syncLinkedPlaylist(lp.id) : undefined}
                />
              )}
              <div className="v2-hero-actions" style={{ marginTop: 8 }}>
                <a href={lp.playlistUrl} target="_blank" rel="noopener noreferrer" className="v2-btn hot sm">Open in Spotify ↗</a>
              </div>
            </article>
          ))}
        </div>
        {isHost && (
          <div className="v2-card" style={{ marginTop: 16 }}>
            <h4 style={{ margin: '0 0 8px' }}>Link external playlist</h4>
            {room.platform === 'spotify' && (
              <div style={{ marginBottom: 12 }}>
                <SpotifyConnectionCard compact returnTo={`/community/playlists/${room.slug}`} />
                <button type="button" className="v2-btn secondary sm" style={{ marginTop: 8 }} onClick={() => setShowPicker(v => !v)}>
                  {showPicker ? 'Hide Spotify playlists' : 'Choose from my Spotify playlists'}
                </button>
                {showPicker && (
                  <div style={{ marginTop: 8 }}>
                    <SpotifyPlaylistPicker onSelect={pickSpotifyPlaylist} />
                  </div>
                )}
              </div>
            )}
            <input className="v2-input" placeholder="Paste Spotify playlist URL" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
            <input className="v2-input" placeholder="Title (optional manual metadata)" value={linkTitle} onChange={e => setLinkTitle(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
            <button type="button" className="v2-btn sm" disabled={linkBusy} onClick={() => linkPlaylist()}>Link playlist</button>
            <p className="v2-meta" style={{ marginTop: 8 }}>
              Connect Spotify to sync owned or collaborative playlists. Manual URL linking remains available if sync is forbidden.
            </p>
          </div>
        )}
      </section>

      {(dna || meta?.introduction) && (
        <section className="v2-section">
          <V2SectionHeader title="Playlist DNA" lead="What this room looks for — used for advisory AI Match." />
          <div className="v2-card v2-curator-dna">
            {meta?.introduction && <p>{meta.introduction}</p>}
            {dna?.genres?.length ? <p className="v2-meta"><b>Genres:</b> {dna.genres.join(', ')}</p> : null}
            {dna?.moods?.length ? <p className="v2-meta"><b>Mood:</b> {dna.moods.join(', ')}</p> : null}
            {dna?.tempoMin != null && <p className="v2-meta"><b>Tempo:</b> {dna.tempoMin}–{dna.tempoMax || '?'} BPM</p>}
            {dna?.curatorDirection && <p className="v2-meta"><b>Direction:</b> {dna.curatorDirection}</p>}
            {dna?.avoid?.length ? <p className="v2-meta"><b>Avoid:</b> {dna.avoid.join(', ')}</p> : null}
          </div>
        </section>
      )}

      <section className="v2-section">
        <V2SectionHeader
          title="Submission pipeline"
          lead={`${pendingCount} awaiting ${CURATOR_LABELS.review.toLowerCase()}. ${room.submissionOpen === false ? 'Submissions closed.' : 'Open for artists.'}`}
        />
        {isLoggedIn && room.submissionOpen !== false && (
          <div className="v2-card" style={{ marginBottom: 16 }}>
            <V2SubmitSongPanel target={{ type: 'playlist', slug: room.slug, label: room.name }} songs={mySongs} demoMode={demoMode} showPitch />
          </div>
        )}
        <V2CuratorReviewWorkspace roomSlug={room.slug} submissions={submissions} isHost={isHost} demoMode={demoMode} />
      </section>

      <section className="v2-section">
        <V2SectionHeader title="Current playlist songs" lead="Room queue and curator placements." />
        <div className="v2-card">
          {playlistItems.length === 0 && <p className="v2-meta">Accepted and playlist-placed songs appear here.</p>}
          {playlistItems.map(item => (
            <div key={item.id} className="v2-track">
              <span className="num">{item.position}</span>
              <div>
                <b>{item.title}</b>
                <span>{item.artistName}{item.featured ? ' · featured' : ''}</span>
                {item.curatorNoteShared && item.curatorNote && <span className="v2-meta">{item.curatorNote}</span>}
              </div>
              {item.aiMatch && <V2CuratorAiMatchBadge match={item.aiMatch} compact />}
            </div>
          ))}
        </div>
        {isHost && (
          <p className="v2-meta" style={{ marginTop: 8 }}>External playlist changes sync via Spotify when connected. ViaTone snapshots stay immutable for Playback Evidence.</p>
        )}
      </section>

      <section className="v2-section">
        <V2SectionHeader title="Listening sessions" lead="Sessions connected to this Curator Room circle." />
        {upcomingSession ? (
          <div className="v2-card">
            <div className="v2-eyebrow">Next session</div>
            <h4>{upcomingSession.title}</h4>
            <p className="v2-meta">{new Date(upcomingSession.startsAt).toLocaleString()} · {upcomingSession.status}</p>
            <Link href={V2_ROUTES.session(upcomingSession.id)} className="v2-btn hot sm" style={{ marginTop: 8 }}>Join next session</Link>
          </div>
        ) : (
          <p className="v2-meta">No upcoming session scheduled for this circle yet.</p>
        )}
        {isLoggedIn && (
          <div style={{ marginTop: 12 }}>
            <PlaybackListeningControls contextType="v2_playlist_room" contextId={room.id} demoMode={demoMode} />
          </div>
        )}
        {recentSessions.length > 0 && (
          <div className="v2-card" style={{ marginTop: 12 }}>
            <h4 style={{ margin: '0 0 8px' }}>Recent sessions</h4>
            {recentSessions.map(s => (
              <div key={s.id} className="v2-track">
                <span className="num">◎</span>
                <div><b>{s.title}</b><span>{s.status}</span></div>
                <Link href={V2_ROUTES.session(s.id)} className="v2-btn secondary sm">Open</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="v2-section">
        <V2SectionHeader title={CURATOR_LABELS.evidence} lead="Listening Activity and Playback Evidence for this room." />
        <div className="v2-grid cols-2">
          <ListeningActivityCard summary={playbackSummary} title={`${room.name} · ${CURATOR_LABELS.activity}`} />
          {playbackReport ? <PlaybackReportCard report={playbackReport} compact /> : (
            <div className="v2-card"><p className="v2-meta">Reports generate as listeners complete playback sessions.</p></div>
          )}
        </div>
      </section>

      <section className="v2-section">
        <V2SectionHeader title="Community activity" />
        {isLoggedIn && !isHost && (
          <V2PlaylistListenButton roomSlug={room.slug} initialListened={userListened} demoMode={demoMode} />
        )}
        <V2PlaylistRoomEngine roomSlug={room.slug} roomId={room.id} isHost={isHost} demoMode={demoMode} activity={activity} />
      </section>

      {(meta?.weeklyNote || meta?.selectionNotes || meta?.submissionGuidelines) && (
        <section className="v2-section">
          <V2SectionHeader title="Curator notes" lead="Public editorial identity for this room." />
          <div className="v2-card">
            {meta?.submissionGuidelines && <p><b>Submission guidelines:</b> {meta.submissionGuidelines}</p>}
            {meta?.weeklyNote && <p className="v2-meta" style={{ marginTop: 8 }}><b>Weekly note:</b> {meta.weeklyNote}</p>}
            {meta?.selectionNotes && <p className="v2-meta" style={{ marginTop: 8 }}><b>Why songs were selected:</b> {meta.selectionNotes}</p>}
          </div>
        </section>
      )}

      <section className="v2-section">
        <V2SectionHeader title="Room snapshot" lead={`${saveCount} saves · ${memberCount} circle members · Curated by ${hostName || 'host'}`} />
        {playbackReport && <PlaybackReportCard report={playbackReport} />}
      </section>
    </>
  )
}

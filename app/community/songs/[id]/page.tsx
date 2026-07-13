import Link from 'next/link'
import { notFound } from 'next/navigation'
import V2FeedbackPanel from '@/components/v2/V2FeedbackPanel'
import V2ReportButton from '@/components/v2/V2ReportButton'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SupporterProfileCard from '@/components/v2/V2SupporterProfileCard'
import V2PlaybackContextSection from '@/components/playback/V2PlaybackContextSection'
import { fetchSongFeedback } from '@/lib/v2/data/feedback'
import { fetchUserCommunityProfile } from '@/lib/v2/data/supporters'
import { fetchUserCuratorSubmissions } from '@/lib/v2/data/curatorRooms'
import { fetchCommunitySongById } from '@/lib/v2/data/songs'
import V2CuratorAiMatchBadge from '@/components/v2/V2CuratorAiMatchBadge'
import { CURATOR_LABELS } from '@/lib/v2/types'
import { V2_ROUTES } from '@/lib/v2/routes'
import { createServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Props = { params: { id: string } }

export default async function SongDetailPage({ params }: Props) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const { song, fromMock } = await fetchCommunitySongById(params.id)
  if (!song) notFound()

  const songId = song.legacySongId || song.id
  const feedback = fromMock ? [] : await fetchSongFeedback(songId)
  const curatorSubmissions = user && song.legacySongId && !fromMock
    ? await fetchUserCuratorSubmissions(user.id, song.legacySongId)
    : []
  let isOwner = false
  let myProfile = null
  if (!fromMock && user) {
    if (song.legacySongId) {
      const { data: owned } = await supabase.from('songs').select('id').eq('id', song.legacySongId).eq('user_id', user.id).maybeSingle()
      isOwner = !!owned
    }
    myProfile = await fetchUserCommunityProfile(user.id)
  }

  return (
    <>
      {fromMock && (
        <p className="v2-meta" style={{ marginBottom: 12 }}>Demo song — your catalog uses real song IDs from Legacy Studio.</p>
      )}
      <div className="v2-grid cols-2" style={{ gap: 24 }}>
        <div
          className="v2-cover"
          style={{
            ['--v2-cover-img' as string]: `url('${song.coverImageUrl}')`,
            height: 320,
            borderRadius: 28,
            margin: 0,
          }}
        />
        <div>
          <div className="v2-eyebrow">{song.releaseStatus.replace('_', ' ')}</div>
          <h1 style={{ margin: '8px 0', fontSize: 42, letterSpacing: '-0.05em' }}>{song.title}</h1>
          <p className="v2-meta" style={{ fontSize: 16 }}>
            <Link href={V2_ROUTES.artist(song.artistSlug)} style={{ color: 'var(--v2-brand2)' }}>
              {song.artistName}
            </Link>
          </p>
          {song.pitch && <p className="v2-meta" style={{ fontSize: 15, marginTop: 12 }}>{song.pitch}</p>}
          <div className="v2-tagrow">
            <span className={`v2-tag${song.creationType.includes('ai') ? ' ai' : ' human'}`}>{song.creationType}</span>
            {song.needsFeedback && <span className="v2-tag">Needs feedback</span>}
          </div>
          <div className="v2-hero-actions" style={{ marginTop: 20 }}>
            <Link href={V2_ROUTES.sessions} className="v2-btn hot">Find session</Link>
            {song.legacySongId && !fromMock && (
              <Link href={`/song/${song.legacySongId}`} className="v2-btn secondary">Song Studio</Link>
            )}
          </div>
          {!fromMock && song.legacySongId && (
            <div style={{ marginTop: 12 }}>
              <V2ReportButton targetType="song" targetId={song.legacySongId} />
            </div>
          )}
        </div>
      </div>

      {myProfile && (
        <section className="v2-section">
          <V2SectionHeader title="Your supporter profile" lead="Participation and badges as a community listener." />
          <V2SupporterProfileCard profile={myProfile} showHistoryLink compact />
        </section>
      )}

      <section className="v2-section">
        <V2SectionHeader title="Community feedback" lead="Ratings, reactions and notes from listeners." />
        <V2FeedbackPanel
          songId={songId}
          initialFeedback={feedback}
          isOwner={!!isOwner}
          demoMode={fromMock}
        />
      </section>

      {!fromMock && song.legacySongId && (
        <V2PlaybackContextSection
          contextType="song_page"
          contextId={song.legacySongId}
          isLoggedIn={!!user}
        />
      )}

      {curatorSubmissions.length > 0 && (
        <section className="v2-section">
          <V2SectionHeader title={`Submitted to ${CURATOR_LABELS.rooms}`} lead="Your curator review status across rooms." />
          <div className="v2-card">
            {curatorSubmissions.map(sub => (
              <div key={sub.id} className="v2-track">
                <span className="num">♫</span>
                <div>
                  <b>{sub.roomName || 'Curator Room'}</b>
                  <span>{sub.status.replace(/_/g, ' ')} · {new Date(sub.createdAt).toLocaleDateString()}</span>
                  {sub.curatorNoteShared && sub.curatorNote && <span className="v2-meta">{sub.curatorNote}</span>}
                </div>
                {sub.aiMatch && <V2CuratorAiMatchBadge match={sub.aiMatch} compact />}
                {sub.roomSlug && (
                  <Link href={V2_ROUTES.playlistRoom(sub.roomSlug)} className="v2-btn secondary sm">Open room</Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="v2-section">
        <V2SectionHeader title="Streaming links" />
        <div className="v2-grid cols-2">
          {Object.entries(song.platforms).map(([platform, url]) => (
            <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="v2-card" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ textTransform: 'capitalize' }}>{platform}</span>
              <span className="v2-meta">Open ↗</span>
            </a>
          ))}
          {!Object.keys(song.platforms).length && (
            <p className="v2-meta">No streaming links yet — add them in Song Studio (legacy).</p>
          )}
        </div>
      </section>
    </>
  )
}

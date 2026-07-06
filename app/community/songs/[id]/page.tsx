import Link from 'next/link'
import { notFound } from 'next/navigation'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import { fetchCommunitySongById } from '@/lib/v2/data/songs'
import { V2_ROUTES } from '@/lib/v2/routes'

export const dynamic = 'force-dynamic'

type Props = { params: { id: string } }

export default async function SongDetailPage({ params }: Props) {
  const { song, fromMock } = await fetchCommunitySongById(params.id)
  if (!song) notFound()

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
            <button type="button" className="v2-btn hot">Submit to session</button>
            <Link href={V2_ROUTES.sessions} className="v2-btn secondary">Find session</Link>
            {song.legacySongId && !fromMock && (
              <Link href={`/song/${song.legacySongId}`} className="v2-btn secondary">Song Studio</Link>
            )}
          </div>
        </div>
      </div>

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

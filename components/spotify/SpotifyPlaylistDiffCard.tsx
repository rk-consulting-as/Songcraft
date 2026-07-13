'use client'

type DiffSummary = {
  added: Array<{ title: string; artistName: string }>
  removed: Array<{ title: string; artistName: string }>
  reordered: Array<{ track: { title: string }; from: number; to: number }>
  metadataChanges: string[]
  previousTrackCount: number
  nextTrackCount: number
  durationDeltaSeconds: number
}

type Props = {
  diff: DiffSummary | null
  summary?: string
}

export default function SpotifyPlaylistDiffCard({ diff, summary }: Props) {
  if (!diff && !summary) return null

  return (
    <div className="v2-card v2-spotify-diff" style={{ marginTop: 8 }}>
      <div className="v2-eyebrow">Playlist changes</div>
      {summary && <p className="v2-meta">{summary}</p>}
      {diff && (
        <>
          <p className="v2-meta">
            Tracks: {diff.previousTrackCount} → {diff.nextTrackCount}
            {diff.durationDeltaSeconds !== 0 && ` · Duration Δ ${Math.round(diff.durationDeltaSeconds / 60)} min`}
          </p>
          {diff.added.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <b>Added</b>
              {diff.added.slice(0, 8).map((t, i) => (
                <div key={i} className="v2-meta">+ {t.title} — {t.artistName}</div>
              ))}
            </div>
          )}
          {diff.removed.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <b>Removed</b>
              {diff.removed.slice(0, 8).map((t, i) => (
                <div key={i} className="v2-meta">− {t.title} — {t.artistName}</div>
              ))}
            </div>
          )}
          {diff.reordered.length > 0 && (
            <p className="v2-meta" style={{ marginTop: 8 }}>{diff.reordered.length} track order change(s)</p>
          )}
          {diff.metadataChanges.length > 0 && (
            <p className="v2-meta" style={{ marginTop: 8 }}>{diff.metadataChanges.join(' · ')}</p>
          )}
          {(diff.added.length > 8 || diff.removed.length > 8) && (
            <p className="v2-meta" style={{ marginTop: 8 }}>Possible playlist change — curator confirmation required for ambiguous matches.</p>
          )}
        </>
      )}
    </div>
  )
}

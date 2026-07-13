'use client'

type Match = {
  snapshotTitle: string
  snapshotArtist: string
  trackTitle: string
  trackArtist: string
  playedAt: string
  matchType: string
  matchScore: number
}

type Props = {
  matches: Match[]
}

export default function SpotifyEvidenceDetails({ matches }: Props) {
  return (
    <div className="v2-spotify-evidence-details">
      {matches.slice(0, 12).map((m, i) => (
        <div key={i} className="v2-track" style={{ marginTop: 6 }}>
          <span className="num">♪</span>
          <div>
            <b>{m.trackTitle}</b>
            <span>{m.trackArtist}</span>
            <span className="v2-meta">
              {m.matchType.replace(/_/g, ' ')} · {new Date(m.playedAt).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
      {matches.length > 12 && <p className="v2-meta">+{matches.length - 12} more matches</p>}
      <p className="v2-meta" style={{ marginTop: 8 }}>
        Evidence source: Spotify Recently Played · Does not prove playlist origin or official stream count.
      </p>
    </div>
  )
}

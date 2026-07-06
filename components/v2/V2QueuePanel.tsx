import type { V2QueueTrack } from '@/lib/v2/types'

type Props = {
  tracks: V2QueueTrack[]
}

export default function V2QueuePanel({ tracks }: Props) {
  if (!tracks.length) return null
  return (
    <div className="v2-queue">
      {tracks.map(track => (
        <div key={track.position} className={`v2-track${track.isNowPlaying ? ' now' : ''}`}>
          <span className="num">{String(track.position).padStart(2, '0')}</span>
          <div>
            <b>{track.title}</b>
            <span>{track.artistName}</span>
          </div>
          <span>{track.duration}</span>
        </div>
      ))}
    </div>
  )
}

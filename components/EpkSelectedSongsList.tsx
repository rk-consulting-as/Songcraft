import { getEpkSongBlurb, getEpkSongCover, type EpkSong } from '@/lib/epkSongs'

export default function EpkSelectedSongsList({
  songs,
  variant = 'print',
  heading = 'Selected songs',
}: {
  songs: EpkSong[]
  variant?: 'print' | 'dark'
  heading?: string
}) {
  if (!songs.length) return null

  const isPrint = variant === 'print'
  const titleColor = isPrint ? '#8a6a20' : '#7090d0'
  const cardBorder = isPrint ? 'rgba(80,55,20,0.12)' : 'rgba(112,144,208,0.18)'
  const cardBg = isPrint ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.03)'
  const songTitleColor = isPrint ? '#18130c' : '#e8e0d0'
  const blurbColor = isPrint ? '#5f5138' : '#8a7a60'

  return (
    <div style={{ marginTop: isPrint ? 0 : 16 }}>
      <h4
        style={{
          color: titleColor,
          fontSize: isPrint ? 15 : 13,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          fontWeight: 'normal',
          margin: '0 0 12px',
        }}
      >
        {heading}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {songs.map(song => {
          const cover = getEpkSongCover(song)
          const blurb = getEpkSongBlurb(song, 180)
          return (
            <div
              key={song.id}
              className={isPrint ? 'epk-song-card' : undefined}
              style={{
                display: 'flex',
                gap: 12,
                padding: 12,
                border: `1px solid ${cardBorder}`,
                borderRadius: isPrint ? 12 : 8,
                background: cardBg,
                minWidth: 0,
              }}
            >
              {cover ? (
                <img
                  src={cover}
                  alt={song.title}
                  className={isPrint ? 'epk-song-cover' : undefined}
                  style={{
                    width: isPrint ? 58 : 52,
                    height: isPrint ? 58 : 52,
                    borderRadius: 8,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: isPrint ? 58 : 52,
                    height: isPrint ? 58 : 52,
                    borderRadius: 8,
                    background: isPrint ? '#eadcc7' : 'rgba(112,144,208,0.12)',
                    border: isPrint ? '1px solid rgba(80,55,20,0.12)' : '1px solid rgba(112,144,208,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isPrint ? '#8a6a20' : '#7090d0',
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  ♪
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, color: songTitleColor, fontSize: isPrint ? 16 : 14 }}>{song.title}</h3>
                {blurb && (
                  <p style={{ color: blurbColor, fontSize: 13, lineHeight: 1.45, margin: '5px 0 0' }}>{blurb}</p>
                )}
                {song.spotify_url && (
                  <a
                    href={song.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: isPrint ? '#1a7f3c' : '#7bc87b', fontSize: 12, marginTop: 6, display: 'inline-block' }}
                  >
                    Spotify
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

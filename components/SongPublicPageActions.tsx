'use client'

import { useState, type CSSProperties, type MouseEvent } from 'react'
import { clientPublicUrl } from '@/lib/appUrl'
import { t, useLang } from '@/lib/i18n'

export function isSongPublicPageAvailable(opts: {
  artistPageEnabled?: boolean
  artistAdminHidden?: boolean
  songPublicHidden?: boolean
}) {
  return !!(opts.artistPageEnabled && !opts.artistAdminHidden && !opts.songPublicHidden)
}

export default function SongPublicPageActions({
  songId,
  artistPageEnabled = false,
  artistAdminHidden = false,
  songPublicHidden = false,
  layout = 'inline',
  onClickCapture,
}: {
  songId: string
  artistPageEnabled?: boolean
  artistAdminHidden?: boolean
  songPublicHidden?: boolean
  layout?: 'inline' | 'compact'
  onClickCapture?: (e: MouseEvent) => void
}) {
  const lang = useLang()
  const tx = t[lang]
  const [copied, setCopied] = useState(false)
  const isPublic = isSongPublicPageAvailable({ artistPageEnabled, artistAdminHidden, songPublicHidden })
  const publicPath = `/s/${songId}`
  const publicUrl = clientPublicUrl(publicPath)

  const stop = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClickCapture?.(e)
  }

  const openPage = (e: MouseEvent) => {
    stop(e)
    if (!isPublic) return
    window.open(publicPath, '_blank', 'noopener,noreferrer')
  }

  const copyLink = async (e: MouseEvent) => {
    stop(e)
    if (!isPublic) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const btnStyle: CSSProperties = layout === 'compact'
    ? { padding: '5px 10px', fontSize: 11, borderRadius: 6, lineHeight: 1.2 }
    : { padding: '6px 12px', fontSize: 12, borderRadius: 6 }

  return (
    <div
      className={`song-public-actions song-public-actions--${layout}`}
      onClick={stop}
      role="group"
      aria-label={tx.openSongPage}
    >
      {isPublic ? (
        <>
          <button
            type="button"
            className="btn-outline song-public-actions-open"
            style={btnStyle}
            onClick={openPage}
          >
            ↗ {tx.openSongPage}
          </button>
          <button
            type="button"
            className="btn-outline song-public-actions-copy"
            style={btnStyle}
            onClick={copyLink}
          >
            ⧉ {copied ? tx.copied : tx.copySongLink}
          </button>
        </>
      ) : (
        <span className="song-public-actions-hint" title={tx.songPageNotPublic}>
          {tx.songPageNotPublic}
        </span>
      )}
    </div>
  )
}


'use client'
import { useEffect, useState, type CSSProperties } from 'react'

type Props = {
  src: string
  alt?: string
  /** Style applied to the thumbnail (the small version). */
  style?: CSSProperties
  /** Optional className for the thumbnail. */
  className?: string
  /** Optional caption shown below the full-size image in the lightbox. */
  caption?: string
}

/**
 * Click-to-zoom image. Renders the thumbnail using the supplied `style`. When clicked,
 * opens a full-screen overlay with the image at its natural size (capped to viewport).
 *
 * Keyboard: ESC closes. Click outside the image also closes.
 */
export default function ZoomableImage({ src, alt = '', style, className, caption }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    // Prevent background scroll while open.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!src) return null

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ ...style, cursor: 'zoom-in' }}
        onClick={e => { e.stopPropagation(); e.preventDefault(); setOpen(true) }}
      />
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={e => { e.stopPropagation(); setOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 24, cursor: 'zoom-out',
            backdropFilter: 'blur(2px)',
          }}
        >
          <button
            aria-label="Close"
            onClick={e => { e.stopPropagation(); setOpen(false) }}
            style={{
              position: 'absolute', top: 16, right: 20,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#e8e0d0', width: 38, height: 38, borderRadius: '50%',
              fontSize: 18, cursor: 'pointer', lineHeight: 1,
            }}
          >
            ×
          </button>
          <img
            src={src}
            alt={alt}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 'min(92vw, 1200px)',
              maxHeight: '85vh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              cursor: 'default',
            }}
          />
          {caption && (
            <p style={{ color: '#a09080', fontSize: 13, marginTop: 14, maxWidth: '80vw', textAlign: 'center' }}>
              {caption}
            </p>
          )}
          <p style={{ color: '#5a4a30', fontSize: 11, marginTop: 6 }}>ESC</p>
        </div>
      )}
    </>
  )
}

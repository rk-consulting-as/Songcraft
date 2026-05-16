'use client'
import { useState } from 'react'

/**
 * Share buttons for public song / artist pages.
 * - Native Share API on mobile
 * - Copy link button
 * - Quick share to X/Twitter, Facebook, WhatsApp
 */
export default function ShareButtons({
  url,
  title,
  text,
  accent = '#d4a843',
}: {
  url: string
  title: string
  text?: string
  accent?: string
}) {
  const [copied, setCopied] = useState(false)

  const fullUrl = (() => {
    if (typeof window === 'undefined') return url
    if (url.startsWith('http')) return url
    return window.location.origin + url
  })()

  const shareText = text || title

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: shareText, url: fullUrl })
      } catch {}
    } else {
      handleCopy()
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  const btn: React.CSSProperties = {
    background: 'rgba(212,168,67,0.1)',
    border: `1px solid ${accent}40`,
    color: '#e8e0d0',
    padding: '10px 16px',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    transition: 'background 0.2s',
  }

  const encodedUrl = encodeURIComponent(fullUrl)
  const encodedText = encodeURIComponent(shareText)

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <button onClick={handleNativeShare} style={btn} title="Share">
        📤 Share
      </button>
      <button onClick={handleCopy} style={btn} title="Copy link">
        {copied ? '✓ Copied!' : '🔗 Copy link'}
      </button>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        style={btn}
        title="Share on X"
      >
        𝕏
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        style={btn}
        title="Share on Facebook"
      >
        f
      </a>
      <a
        href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        style={btn}
        title="Share on WhatsApp"
      >
        💬
      </a>
    </div>
  )
}

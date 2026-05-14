'use client'
import { useEffect } from 'react'
import Link from 'next/link'

// Error boundary for the /u/[code] route. Replaces the generic 500 page with a
// friendly message + the actual error so we can diagnose what's wrong.
export default function UserProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[u/code] page error:', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)',
      color: '#e8e0d0',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div className="card" style={{ maxWidth: 600, borderColor: 'rgba(192,80,80,0.4)' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
        <h1 style={{ color: '#c05050', fontSize: 20, fontWeight: 'normal', margin: '0 0 12px' }}>
          Couldn't load this profile
        </h1>
        <p style={{ color: '#a09080', fontSize: 14, marginBottom: 16 }}>
          Something went wrong loading the profile page. The error message below should help diagnose it.
        </p>
        <pre style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(180,140,80,0.15)',
          borderRadius: 6,
          padding: 12,
          color: '#8a7a60',
          fontSize: 12,
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {error.message || 'No error message'}
          {error.digest && `\n\nDigest: ${error.digest}`}
        </pre>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            onClick={reset}
            className="btn-gold"
            style={{ padding: '8px 18px', fontSize: 13 }}
          >
            🔄 Try again
          </button>
          <Link href="/discover" style={{
            padding: '8px 18px',
            background: 'transparent',
            border: '1px solid rgba(180,140,80,0.3)',
            color: '#a09080',
            borderRadius: 4,
            textDecoration: 'none',
            fontSize: 13,
          }}>
            ← Discover
          </Link>
        </div>
      </div>
    </div>
  )
}

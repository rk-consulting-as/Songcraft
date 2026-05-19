'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app/error]', error)
  }, [error])

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 520, textAlign: 'center', borderColor: 'rgba(224,112,112,0.34)' }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>!</div>
        <h1 style={{ color: '#d4a843', fontWeight: 'normal', margin: '0 0 8px' }}>Noe gikk galt</h1>
        <p style={{ color: '#8a7a60', lineHeight: 1.55, margin: '0 0 18px' }}>
          ViaTone traff en feil. Prøv igjen, eller send feedback hvis dette skjer flere ganger.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-gold" onClick={reset}>Prøv igjen</button>
          <Link href="/dashboard" className="btn-outline" style={{ textDecoration: 'none' }}>Til dashboard</Link>
        </div>
        {error.digest && <p style={{ color: '#5a4a30', fontSize: 11, marginTop: 14 }}>Ref: {error.digest}</p>}
      </div>
    </main>
  )
}

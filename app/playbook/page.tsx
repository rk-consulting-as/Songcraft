'use client'

import { Suspense } from 'react'
import PlaybookPage from '@/components/PlaybookPage'

function PlaybookLoading() {
  return <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#8a7a60', padding: 40 }}>Loading…</div>
}

export default function PlaybookRoute() {
  return (
    <Suspense fallback={<PlaybookLoading />}>
      <PlaybookPage />
    </Suspense>
  )
}

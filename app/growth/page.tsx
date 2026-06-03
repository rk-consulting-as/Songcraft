'use client'

import { Suspense } from 'react'
import GrowthCommunityHub from '@/components/growth/GrowthCommunityHub'

export default function GrowthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#8a7a60', padding: 40 }}>…</div>}>
      <GrowthCommunityHub />
    </Suspense>
  )
}

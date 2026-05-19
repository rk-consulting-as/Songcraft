'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { t, useLang } from '@/lib/i18n'
import { getUserPlan, type PlanId } from '@/lib/subscription'
import MediaLibraryPanel from '@/components/media/MediaLibraryPanel'
import MediaExportPlaceholders from '@/components/media/MediaExportPlaceholders'

export default function MediaLibraryPage() {
  const lang = useLang()
  const tx = t[lang]
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [planId, setPlanId] = useState<PlanId>('free')
  const [artists, setArtists] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const sb = createClient()
    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        router.replace('/login?next=/library')
        return
      }
      const plan = await getUserPlan(sb, user.id)
      setPlanId(plan.id)
      const { data } = await sb.from('artists').select('id, name').eq('user_id', user.id).order('name')
      setArtists(data || [])
      setReady(true)
    })()
  }, [router])

  if (!ready) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a7a60' }}>
        {tx.loading}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)' }}>
      <header className="app-header" style={{ borderBottom: '1px solid rgba(180,140,80,0.2)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'normal', color: '#d4a843' }}>{tx.mediaLibraryPageTitle}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8a7a60' }}>{tx.mediaLibraryPageSubtitle}</p>
        </div>
        <Link href="/dashboard" className="btn-outline" style={{ textDecoration: 'none' }}>
          ← {tx.dashboard}
        </Link>
      </header>

      <main className="media-library-page" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px 48px' }}>
        <MediaLibraryPanel artists={artists} planId={planId} />

        <section style={{ marginTop: 40 }}>
          <h2 style={{ margin: '0 0 16px', color: '#d4a843', fontWeight: 'normal', fontSize: 18 }}>{tx.mediaExportSection}</h2>
          <MediaExportPlaceholders />
        </section>
      </main>
    </div>
  )
}

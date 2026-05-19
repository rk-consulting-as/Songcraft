'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getUserPlan, type PlanId } from '@/lib/subscription'
import { t, useLang } from '@/lib/i18n'
import type { MediaAsset } from '@/lib/mediaLibrary/types'
import { fetchMediaAssets } from '@/lib/mediaLibrary/client'
import MediaLibraryPanel from '@/components/media/MediaLibraryPanel'
import BrandKitPanel from '@/components/media/BrandKitPanel'
import MediaExportPlaceholders from '@/components/media/MediaExportPlaceholders'

type Artist = {
  id: string
  name: string
  avatar_url?: string | null
  page_settings?: Record<string, unknown> | null
}

type Props = {
  artist: Artist
}

export default function ArtistWorkspaceMedia({ artist }: Props) {
  const lang = useLang()
  const tx = t[lang]
  const [planId, setPlanId] = useState<PlanId>('free')
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [pageSettings, setPageSettings] = useState(artist.page_settings)

  const refresh = useCallback(async () => {
    const data = await fetchMediaAssets({ artistId: artist.id, limit: 200 })
    if (data) {
      setAssets(data.assets)
      setPlanId(data.planId)
    }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      const plan = await getUserPlan(sb, user.id)
      setPlanId(plan.id)
    }
    const { data: row } = await sb.from('artists').select('page_settings, avatar_url').eq('id', artist.id).maybeSingle()
    if (row) setPageSettings(row.page_settings as Record<string, unknown>)
  }, [artist.id])

  useEffect(() => { refresh() }, [refresh])

  return (
    <section className="artist-workspace-section media-workspace">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', color: '#d4a843', fontWeight: 'normal', fontSize: 18 }}>{tx.mediaWorkspaceTitle}</h2>
          <p style={{ margin: 0, color: '#8a7a60', fontSize: 13, maxWidth: 520, lineHeight: 1.5 }}>{tx.mediaWorkspaceSubtitle}</p>
        </div>
        <Link href="/library" className="btn-outline" style={{ textDecoration: 'none', fontSize: 13 }}>
          {tx.mediaOpenFullLibrary} →
        </Link>
      </div>

      <BrandKitPanel
        artistId={artist.id}
        artistName={artist.name}
        pageSettings={pageSettings}
        avatarUrl={artist.avatar_url}
        planId={planId}
        assets={assets}
        onSaved={refresh}
      />

      <div style={{ marginTop: 24 }}>
        <MediaLibraryPanel artistId={artist.id} planId={planId} />
      </div>

      <div style={{ marginTop: 32 }}>
        <h3 style={{ margin: '0 0 12px', color: '#d4a843', fontWeight: 'normal', fontSize: 16 }}>{tx.mediaExportSection}</h3>
        <MediaExportPlaceholders />
      </div>
    </section>
  )
}

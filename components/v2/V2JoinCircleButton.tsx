'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'

type Props = {
  slug: string
  initialIsMember?: boolean
  demoMode?: boolean
}

export default function V2JoinCircleButton({ slug, initialIsMember = false, demoMode }: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [isMember, setIsMember] = useState(initialIsMember)
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    if (demoMode) {
      showToast('Join circle when community data is seeded')
      return
    }
    setBusy(true)
    try {
      if (isMember) {
        await v2ApiFetch(`/api/v2/community/circles/${slug}/members`, { method: 'DELETE' })
        setIsMember(false)
        showToast('Left circle')
      } else {
        await v2ApiFetch(`/api/v2/community/circles/${slug}/members`, { method: 'POST' })
        setIsMember(true)
        showToast('Joined circle')
      }
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not update membership')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className={`v2-btn${isMember ? ' secondary' : ' hot'}`} onClick={toggle} disabled={busy}>
      {busy ? '…' : isMember ? 'Leave circle' : 'Join circle'}
    </button>
  )
}

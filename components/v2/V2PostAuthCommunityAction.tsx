'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { v2ApiFetch } from '@/lib/v2/apiClient'

type Props = {
  isLoggedIn: boolean
  circleSlug?: string
  hostUserId?: string
  sessionId?: string
  playlistSlug?: string
}

/** After login with ?action=, auto-invoke follow/save once. */
export default function V2PostAuthCommunityAction({ isLoggedIn, circleSlug, hostUserId, sessionId, playlistSlug }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ran = useRef(false)

  useEffect(() => {
    if (!isLoggedIn || ran.current) return
    const action = searchParams.get('action')
    if (!action) return
    ran.current = true

    const run = async () => {
      try {
        if (action === 'follow_circle' && circleSlug) {
          await v2ApiFetch(`/api/v2/community/circles/${circleSlug}/follow`, { method: 'POST' })
        } else if (action === 'follow_host' && hostUserId) {
          await v2ApiFetch(`/api/v2/community/hosts/${hostUserId}/follow`, { method: 'POST' })
        } else if (action === 'save_session' && sessionId) {
          await v2ApiFetch(`/api/v2/community/sessions/${sessionId}/save`, { method: 'POST' })
        } else if (action === 'save_room' && playlistSlug) {
          await v2ApiFetch(`/api/v2/community/playlists/${playlistSlug}/save`, { method: 'POST' })
        }
        router.replace(window.location.pathname)
        router.refresh()
      } catch {
        // user can retry manually
      }
    }
    run()
  }, [isLoggedIn, circleSlug, hostUserId, sessionId, playlistSlug, router, searchParams])

  return null
}

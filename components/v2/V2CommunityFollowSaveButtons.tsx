'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch, formatV2ApiError } from '@/lib/v2/apiClient'
import { buildLoginUrl } from '@/lib/v2/authReturn'

type ToggleProps = {
  apiPath: string
  returnPath: string
  actionParam: string
  initialActive: boolean
  activeLabel: string
  inactiveLabel: string
  count?: number
  countLabel?: string
  isLoggedIn: boolean
  demoMode?: boolean
  compact?: boolean
}

export function V2CommunityToggleButton({
  apiPath,
  returnPath,
  actionParam,
  initialActive,
  activeLabel,
  inactiveLabel,
  count,
  countLabel,
  isLoggedIn,
  demoMode,
  compact,
}: ToggleProps) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [active, setActive] = useState(initialActive)
  const [busy, setBusy] = useState(false)
  const [displayCount, setDisplayCount] = useState(count)

  const loginHref = buildLoginUrl(`${returnPath}${returnPath.includes('?') ? '&' : '?'}action=${actionParam}`)

  const toggle = async () => {
    if (!isLoggedIn) return
    if (demoMode) {
      showToast('Available when community data is seeded')
      return
    }
    setBusy(true)
    try {
      const res = await v2ApiFetch<{ followerCount?: number; saveCount?: number }>(apiPath, {
        method: active ? 'DELETE' : 'POST',
      })
      setActive(!active)
      if (res.followerCount != null) setDisplayCount(res.followerCount)
      if (res.saveCount != null) setDisplayCount(res.saveCount)
      showToast(active ? 'Removed' : 'Saved')
      router.refresh()
    } catch (e) {
      showToast(formatV2ApiError(e))
    } finally {
      setBusy(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className={`v2-community-toggle${compact ? ' compact' : ''}`}>
        <Link href={loginHref} className="v2-btn secondary sm">{inactiveLabel}</Link>
        {displayCount != null && countLabel && (
          <span className="v2-meta v2-community-toggle__count">{displayCount} {countLabel}</span>
        )}
      </div>
    )
  }

  return (
    <div className={`v2-community-toggle${compact ? ' compact' : ''}`}>
      <button
        type="button"
        className={`v2-btn sm${active ? ' hot' : ' secondary'}`}
        disabled={busy}
        onClick={toggle}
      >
        {busy ? '…' : active ? activeLabel : inactiveLabel}
      </button>
      {displayCount != null && countLabel && (
        <span className="v2-meta v2-community-toggle__count">{displayCount} {countLabel}</span>
      )}
    </div>
  )
}

export function V2FollowCircleButton(props: {
  slug: string
  returnPath: string
  initialFollowing?: boolean
  followerCount?: number
  isLoggedIn: boolean
  demoMode?: boolean
  compact?: boolean
}) {
  return (
    <V2CommunityToggleButton
      apiPath={`/api/v2/community/circles/${props.slug}/follow`}
      returnPath={props.returnPath}
      actionParam="follow_circle"
      initialActive={!!props.initialFollowing}
      activeLabel="Following"
      inactiveLabel="Follow circle"
      count={props.followerCount}
      countLabel="followers"
      isLoggedIn={props.isLoggedIn}
      demoMode={props.demoMode}
      compact={props.compact}
    />
  )
}

export function V2FollowHostButton(props: {
  hostUserId: string
  returnPath: string
  initialFollowing?: boolean
  followerCount?: number
  isLoggedIn: boolean
  compact?: boolean
}) {
  return (
    <V2CommunityToggleButton
      apiPath={`/api/v2/community/hosts/${props.hostUserId}/follow`}
      returnPath={props.returnPath}
      actionParam="follow_host"
      initialActive={!!props.initialFollowing}
      activeLabel="Following"
      inactiveLabel="Follow host"
      count={props.followerCount}
      countLabel="followers"
      isLoggedIn={props.isLoggedIn}
      compact={props.compact}
    />
  )
}

export function V2SaveSessionButton(props: {
  sessionId: string
  returnPath: string
  initialSaved?: boolean
  saveCount?: number
  isLoggedIn: boolean
  demoMode?: boolean
  compact?: boolean
}) {
  return (
    <V2CommunityToggleButton
      apiPath={`/api/v2/community/sessions/${props.sessionId}/save`}
      returnPath={props.returnPath}
      actionParam="save_session"
      initialActive={!!props.initialSaved}
      activeLabel="Saved"
      inactiveLabel="Save session"
      count={props.saveCount}
      countLabel="saved"
      isLoggedIn={props.isLoggedIn}
      demoMode={props.demoMode}
      compact={props.compact}
    />
  )
}

export function V2SavePlaylistRoomButton(props: {
  slug: string
  returnPath: string
  initialSaved?: boolean
  saveCount?: number
  isLoggedIn: boolean
  demoMode?: boolean
  compact?: boolean
}) {
  return (
    <V2CommunityToggleButton
      apiPath={`/api/v2/community/playlists/${props.slug}/save`}
      returnPath={props.returnPath}
      actionParam="save_room"
      initialActive={!!props.initialSaved}
      activeLabel="Saved"
      inactiveLabel="Save room"
      count={props.saveCount}
      countLabel="saved"
      isLoggedIn={props.isLoggedIn}
      demoMode={props.demoMode}
      compact={props.compact}
    />
  )
}

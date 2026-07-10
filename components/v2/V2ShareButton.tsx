'use client'

import { useState } from 'react'
import { useV2Toast } from '@/components/v2/V2Toast'
import { clientPublicUrl } from '@/lib/appUrl'

type Props = {
  path: string
  title: string
  inviteMessage?: string
  label?: string
  compact?: boolean
}

export default function V2ShareButton({ path, title, inviteMessage, label = 'Share', compact }: Props) {
  const { showToast } = useV2Toast()
  const [busy, setBusy] = useState(false)
  const url = clientPublicUrl(path)
  const message = inviteMessage || `Join me for ${title} on ViaTone.`

  const copyLink = async () => {
    setBusy(true)
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied')
    } catch {
      showToast('Could not copy link')
    } finally {
      setBusy(false)
    }
  }

  const nativeShare = async () => {
    if (!navigator.share) {
      await copyLink()
      return
    }
    setBusy(true)
    try {
      await navigator.share({ title, text: message, url })
    } catch {
      // user cancelled
    } finally {
      setBusy(false)
    }
  }

  const copyInvite = async () => {
    setBusy(true)
    try {
      await navigator.clipboard.writeText(`${message}\n${url}`)
      showToast('Invite message copied')
    } catch {
      showToast('Could not copy')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`v2-share${compact ? ' compact' : ''}`}>
      <button type="button" className="v2-btn secondary sm" disabled={busy} onClick={copyLink}>Copy link</button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button type="button" className="v2-btn secondary sm" disabled={busy} onClick={nativeShare}>{label}</button>
      )}
      <button type="button" className="v2-btn secondary sm" disabled={busy} onClick={copyInvite}>Copy invite</button>
    </div>
  )
}

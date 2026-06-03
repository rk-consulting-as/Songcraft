'use client'

import Link from 'next/link'
import { t, useLang } from '@/lib/i18n'

export type SongQuickAction = {
  id: string
  label: string
  icon?: string
  href?: string
  onClick?: () => void
  disabled?: boolean
  primary?: boolean
  ariaLabel?: string
}

export default function SongQuickActions({
  actions,
  compact = false,
}: {
  actions: SongQuickAction[]
  compact?: boolean
}) {
  const tx = t[useLang()] as Record<string, string>
  const visible = actions.filter(a => !a.disabled)
  if (visible.length === 0) return null

  return (
    <div className={`artist-quick-actions song-quick-actions${compact ? ' artist-quick-actions--compact' : ''}`} aria-label={tx.songStudioQuickActions}>
      {visible.map(action => {
        const className = `${action.primary ? 'btn-gold' : 'btn-outline'} quick-action-btn artist-quick-actions__btn`
        const content = (
          <>
            {action.icon && <span aria-hidden="true">{action.icon}</span>}
            <span>{action.label}</span>
          </>
        )
        if (action.href && !action.disabled) {
          return (
            <Link key={action.id} href={action.href} className={className} style={{ textDecoration: 'none' }} target={action.href.startsWith('http') ? '_blank' : undefined} rel={action.href.startsWith('http') ? 'noopener noreferrer' : undefined} aria-label={action.ariaLabel}>
              {content}
            </Link>
          )
        }
        return (
          <button key={action.id} type="button" className={className} onClick={action.onClick} disabled={action.disabled} aria-label={action.ariaLabel || action.label}>
            {content}
          </button>
        )
      })}
    </div>
  )
}

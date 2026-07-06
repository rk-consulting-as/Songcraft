'use client'

import Link from 'next/link'
import { V2_ROUTES } from '@/lib/v2/routes'

type Props = {
  onSearch?: (query: string) => void
  showSubmit?: boolean
}

export default function V2Topbar({ onSearch, showSubmit = true }: Props) {
  return (
    <header className="v2-topbar">
      <div className="v2-search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          placeholder="Search circles, sessions, artists or songs…"
          onChange={e => onSearch?.(e.target.value)}
          aria-label="Search community"
        />
      </div>
      <div className="v2-topbar-actions">
        <Link href="/dashboard" className="v2-btn secondary sm">Legacy studio</Link>
        <Link href={V2_ROUTES.artists} className="v2-btn secondary sm">+ Add artist</Link>
        {showSubmit && (
          <Link href={`${V2_ROUTES.home}#submit`} className="v2-btn sm">Submit song</Link>
        )}
      </div>
    </header>
  )
}

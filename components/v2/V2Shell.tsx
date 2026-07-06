'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import V2Sidebar from './V2Sidebar'
import V2Topbar from './V2Topbar'
import { V2ToastProvider } from './V2Toast'
import { V2_ROUTES } from '@/lib/v2/routes'

type Props = {
  children: ReactNode
  onSearch?: (query: string) => void
  showSubmit?: boolean
}

export default function V2Shell({ children, onSearch, showSubmit }: Props) {
  useEffect(() => {
    document.body.classList.add('v2-community-page')
    return () => document.body.classList.remove('v2-community-page')
  }, [])

  return (
    <V2ToastProvider>
      <div className="v2-community">
        <div className="v2-mobilebar">
          <Link href={V2_ROUTES.home} className="v2-brand" style={{ margin: 0, padding: 0 }}>
            <div className="v2-logo">V</div>
            <div>
              <h1>ViaTone</h1>
              <span>Community first</span>
            </div>
          </Link>
          <Link href={V2_ROUTES.sessions} className="v2-btn secondary sm">Sessions</Link>
        </div>
        <div className="v2-app">
          <V2Sidebar />
          <main className="v2-main">
            <V2Topbar onSearch={onSearch} showSubmit={showSubmit} />
            <div className="v2-content">{children}</div>
          </main>
        </div>
      </div>
    </V2ToastProvider>
  )
}

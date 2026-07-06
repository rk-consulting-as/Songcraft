'use client'

import Link from 'next/link'
import { V2_ROUTES } from '@/lib/v2/routes'

export default function V2StreamEngineBlock() {
  return (
    <div className="v2-card v2-engine">
      <div className="v2-engine-grid">
        <div>
          <div className="v2-eyebrow">
            <span className="v2-pulse" />
            ViaTone Stream Engine · Powered by Aigent4U
          </div>
          <h3 style={{ fontSize: 38, margin: '0 0 10px', letterSpacing: '-0.05em' }}>
            Manual-first listening rooms. Real play logs.
          </h3>
          <p className="v2-meta" style={{ fontSize: 16 }}>
            Beta hosts start sessions, mark tracks played, and generate recaps. Full Spotify Auto-Switch automation arrives via Aigent4U.
            <strong style={{ display: 'block', marginTop: 8, color: 'var(--v2-brand2)' }}>Stream Engine Beta — host-controlled playback</strong>
          </p>
          <div className="v2-tagrow">
            <span className="v2-tag">Play log</span>
            <span className="v2-tag">Live queue</span>
            <span className="v2-tag">Session recap</span>
            <span className="v2-tag">Participation</span>
          </div>
          <Link href={V2_ROUTES.sessions} className="v2-btn hot sm" style={{ marginTop: 14, display: 'inline-block' }}>
            Browse sessions
          </Link>
        </div>
        <div>
          <div className="v2-bars" aria-hidden="true">
            <i className="v2-bar" />
            <i className="v2-bar" />
            <i className="v2-bar" />
            <i className="v2-bar" />
            <i className="v2-bar" />
            <i className="v2-bar" />
          </div>
          <div className="v2-queue">
            <div className="v2-track now">
              <span className="num">▶</span>
              <div><b>Mark played</b><span>Host logs each track</span></div>
              <span>BETA</span>
            </div>
            <div className="v2-track">
              <span className="num">👂</span>
              <div><b>I listened</b><span>Member participation</span></div>
              <span>ON</span>
            </div>
            <div className="v2-track">
              <span className="num">◎</span>
              <div><b>Session recap</b><span>After host ends session</span></div>
              <span>LOG</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useV2Toast } from './V2Toast'

export default function V2StreamEngineBlock() {
  const { showToast } = useV2Toast()

  return (
    <div className="v2-card v2-engine">
      <div className="v2-engine-grid">
        <div>
          <div className="v2-eyebrow">
            <span className="v2-pulse" />
            ViaTone Stream Engine · Powered by Aigent4U
          </div>
          <h3 style={{ fontSize: 38, margin: '0 0 10px', letterSpacing: '-0.05em' }}>
            Automate the playlist. Document the support.
          </h3>
          <p className="v2-meta" style={{ fontSize: 16 }}>
            Hosts set rules: playlist queue, max minutes, pause between lists, shuffle per playlist, cloud session and report after completion. The community gets a real listening experience — not just a chat with links.
          </p>
          <div className="v2-tagrow">
            <span className="v2-tag">Auto-Switch</span>
            <span className="v2-tag">Cloud queue</span>
            <span className="v2-tag">Play log</span>
            <span className="v2-tag">Proof report</span>
          </div>
          <button type="button" className="v2-btn hot sm" style={{ marginTop: 14 }} onClick={() => showToast('Stream Engine — Host Pro integration TODO')}>
            Open engine
          </button>
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
              <div><b>Now switching</b><span>Dark Country Rotation</span></div>
              <span>02:14</span>
            </div>
            <div className="v2-track">
              <span className="num">↻</span>
              <div><b>Shuffle songs</b><span>Enabled per playlist</span></div>
              <span>ON</span>
            </div>
            <div className="v2-track">
              <span className="num">◎</span>
              <div><b>Session report</b><span>Generated after completion</span></div>
              <span>PRO</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

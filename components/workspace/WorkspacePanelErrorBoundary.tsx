'use client'

import { Component, type ReactNode } from 'react'
import { t, useLang } from '@/lib/i18n'

type Props = {
  children: ReactNode
  panelLabel?: string
}

type State = { error: Error | null }

function PanelErrorFallback({
  panelLabel,
  onRetry,
}: {
  panelLabel?: string
  onRetry: () => void
}) {
  const tx = t[useLang()] as Record<string, string>
  return (
    <div className="card workspace-card" style={{ borderColor: 'rgba(224,112,112,0.34)', padding: 20 }}>
      <h3 style={{ margin: '0 0 8px', color: '#e07070', fontWeight: 'normal', fontSize: 16 }}>
        {tx.workspacePanelErrorTitle}
      </h3>
      <p style={{ margin: '0 0 14px', color: '#8a7a60', fontSize: 13, lineHeight: 1.5 }}>
        {panelLabel
          ? `${panelLabel}: ${tx.workspacePanelErrorDesc}`
          : tx.workspacePanelErrorDesc}
      </p>
      <button type="button" className="btn-outline" onClick={onRetry}>
        {tx.workspacePanelErrorRetry}
      </button>
    </div>
  )
}

export default class WorkspacePanelErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ViaTone] Workspace panel error:', error, info.componentStack)
    }
  }

  render() {
    if (this.state.error) {
      return (
        <PanelErrorFallback
          panelLabel={this.props.panelLabel}
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}

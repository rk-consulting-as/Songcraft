export default function OfflinePage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 440, textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>♪</div>
        <h1 style={{ color: '#d4a843', fontWeight: 'normal', margin: '0 0 8px' }}>Songcraft offline</h1>
        <p style={{ color: '#8a7a60', lineHeight: 1.55, margin: 0 }}>
          Du er offline. Sider du nylig har åpnet kan fortsatt være tilgjengelige, ellers prøv igjen når nettet er tilbake.
        </p>
      </div>
    </main>
  )
}

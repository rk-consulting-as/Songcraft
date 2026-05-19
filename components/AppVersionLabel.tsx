export default function AppVersionLabel({ compact = false }: { compact?: boolean }) {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'
  const build = process.env.NEXT_PUBLIC_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local'

  return (
    <span style={{ color: '#5a4a30', fontSize: compact ? 10 : 11, letterSpacing: 0.5 }}>
      ViaTone v{version} · {build}
    </span>
  )
}

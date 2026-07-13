import { redirect } from 'next/navigation'
import SpotifyConnectionCard from '@/components/spotify/SpotifyConnectionCard'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import { V2_ROUTES } from '@/lib/v2/routes'
import { createServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function IntegrationsPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(V2_ROUTES.integrations)}`)

  return (
    <>
      <V2SectionHeader
        title="Integrations"
        lead="Connect external evidence providers. ViaTone never receives official Spotify stream counts."
      />
      <section className="v2-section" style={{ marginTop: 0 }}>
        <SpotifyConnectionCard returnTo={V2_ROUTES.integrations} />
      </section>
    </>
  )
}

import { redirect } from 'next/navigation'
import V2CommunitySavedClient from '@/components/v2/V2CommunitySavedClient'
import { fetchUserFollowSaveLibrary } from '@/lib/v2/data/followsSaves'
import { buildLoginUrl } from '@/lib/v2/authReturn'
import { V2_ROUTES } from '@/lib/v2/routes'
import { createServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function CommunitySavedPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(buildLoginUrl(V2_ROUTES.saved))

  const library = await fetchUserFollowSaveLibrary(user.id)
  return <V2CommunitySavedClient {...library} />
}

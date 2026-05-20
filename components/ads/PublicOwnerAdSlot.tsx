import { createClient } from '@supabase/supabase-js'
import { getUserPlan } from '@/lib/subscription'
import type { AdPlacement } from '@/lib/ads/config'
import { resolveAdsVisibility } from '@/lib/ads/shouldShowAds'
import AdSlot from './AdSlot'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

type Props = {
  ownerUserId: string
  placement: AdPlacement
  className?: string
}

/** Ads on public creator pages when the page owner is on the Free plan. */
export default async function PublicOwnerAdSlot({ ownerUserId, placement, className }: Props) {
  if (!ownerUserId) return null
  const plan = await getUserPlan(sb, ownerUserId)
  const { show } = resolveAdsVisibility({ planId: plan.id })
  return <AdSlot placement={placement} show={show} className={className} />
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getUserPlan, type PlanId } from '@/lib/subscription'
import type { AdPlacement } from '@/lib/ads/config'
import { resolveAdsVisibility } from '@/lib/ads/shouldShowAds'
import AdSlot from './AdSlot'

type Props = {
  placement: AdPlacement
  /** When set (e.g. dashboard), skips async plan lookup. */
  planId?: PlanId
  className?: string
}

/** Ads for logged-in Free users or anonymous visitors on allowed pages (discover, dashboard). */
export default function ViewerAdSlot({ placement, planId: planIdProp, className }: Props) {
  const pathname = usePathname()
  const [resolvedPlan, setResolvedPlan] = useState<PlanId | null>(planIdProp ?? null)

  useEffect(() => {
    if (planIdProp) return
    let cancelled = false
    ;(async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (cancelled) return
      if (!user) {
        setResolvedPlan('free')
        return
      }
      const plan = await getUserPlan(sb, user.id)
      if (!cancelled) setResolvedPlan(plan.id)
    })()
    return () => { cancelled = true }
  }, [planIdProp])

  const show = useMemo(() => {
    const planId = planIdProp ?? resolvedPlan
    if (planIdProp && planIdProp !== 'free') return false
    if (!planIdProp && resolvedPlan === null) return false
    if (!planIdProp && resolvedPlan === 'pro') return false
    return resolveAdsVisibility({ planId: planId || 'free', pathname }).show
  }, [planIdProp, resolvedPlan, pathname])

  return <AdSlot placement={placement} show={show} className={className} />
}

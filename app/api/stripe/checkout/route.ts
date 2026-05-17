import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function appUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || 'http://localhost:3000'
}

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY
    const priceId = process.env.STRIPE_PRO_PRICE_ID
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secretKey || !priceId || !serviceKey) {
      return NextResponse.json({ error: 'billing_not_configured' }, { status: 500 })
    }

    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const token = auth.slice(7)

    const sbAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
    )
    const { data: { user } } = await sbAuth.auth.getUser()
    if (!user?.id || !user.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const sbService = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } })
    const stripe = new Stripe(secretKey)

    const { data: existing } = await sbService
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let customerId = existing?.stripe_customer_id as string | undefined
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await sbService.from('subscriptions').upsert({
        user_id: user.id,
        plan_id: 'free',
        status: 'free',
        stripe_customer_id: customerId,
      }, { onConflict: 'user_id' })
    }

    const base = appUrl(req)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/settings/billing?success=1`,
      cancel_url: `${base}/settings/billing?canceled=1`,
      metadata: { user_id: user.id, plan_id: 'pro' },
      subscription_data: { metadata: { user_id: user.id, plan_id: 'pro' } },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('[stripe/checkout] crashed:', e?.message)
    return NextResponse.json({ error: 'checkout_failed' }, { status: 500 })
  }
}

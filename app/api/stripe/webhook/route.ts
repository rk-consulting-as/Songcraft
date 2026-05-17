import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } })
}

async function upsertSubscription(stripe: Stripe, subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const sub: any = subscription
  const userId = sub.metadata?.user_id
  if (!userId) return

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const item = sub.items?.data?.[0]
  const sb = serviceClient()
  await sb.from('subscriptions').upsert({
    user_id: userId,
    plan_id: sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due' ? 'pro' : 'free',
    status: sub.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
  }, { onConflict: 'user_id' })

  if (item?.price?.id) {
    await sb.from('plans').update({ stripe_price_id: item.price.id }).eq('id', 'pro')
  }
}

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secretKey || !webhookSecret) return NextResponse.json({ error: 'billing_not_configured' }, { status: 500 })

  const stripe = new Stripe(secretKey)
  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'missing_signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (e: any) {
    console.warn('[stripe/webhook] bad signature:', e?.message)
    return NextResponse.json({ error: 'bad_signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      if (subscriptionId) await upsertSubscription(stripe, subscriptionId)
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription
      await upsertSubscription(stripe, subscription.id)
    }

    return NextResponse.json({ received: true })
  } catch (e: any) {
    console.error('[stripe/webhook] handler failed:', e?.message)
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 })
  }
}

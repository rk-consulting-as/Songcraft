'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'
import { canUseFeature, getMonthlyAiUsage, getUserPlan, type UserPlan } from '@/lib/subscription'

export default function BillingPage() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>('en')
  const [plan, setPlan] = useState<UserPlan | null>(null)
  const [artistCount, setArtistCount] = useState(0)
  const [songCount, setSongCount] = useState(0)
  const [aiUsage, setAiUsage] = useState(0)
  const [limits, setLimits] = useState<Record<string, { allowed: boolean; limit: number | null; enabled: boolean }>>({})
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setLangState(useLang()); loadBilling() }, [])
  const tx = t[lang]

  const loadBilling = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [planData, artistsRes, songsRes, usage] = await Promise.all([
      getUserPlan(supabase, user.id),
      supabase.from('artists').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('songs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      getMonthlyAiUsage(supabase, user.id),
    ])
    setPlan(planData)
    setArtistCount(artistsRes.count || 0)
    setSongCount(songsRes.count || 0)
    setAiUsage(usage)

    const featureKeys = ['artists', 'songs', 'ai_generations_monthly', 'newsletter_analytics', 'qr_analytics', 'advanced_templates', 'embed_widget', 'custom_branding', 'remove_songcraft_branding'] as const
    const featureResults = await Promise.all(featureKeys.map(async key => {
      const current = key === 'artists' ? (artistsRes.count || 0) : key === 'songs' ? (songsRes.count || 0) : key === 'ai_generations_monthly' ? usage : 0
      const value = await canUseFeature(supabase, user.id, key, current)
      return [key, { allowed: value.allowed, limit: value.limit, enabled: value.enabled }] as const
    }))
    setLimits(Object.fromEntries(featureResults))
    setLoading(false)
  }

  const startCheckout = async () => {
    setCheckoutLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error || 'checkout_failed')
      window.location.href = data.url
    } catch (e: any) {
      setError(e?.message || tx.billingCheckoutError)
      setCheckoutLoading(false)
    }
  }

  const usageLine = (used: number, limit?: number | null) => limit === null || typeof limit === 'undefined'
    ? `${used} / ${tx.billingUnlimited}`
    : `${used} / ${limit}`

  if (loading) return <div style={{ color: '#6a5a40', padding: 40 }}>{tx.loading}</div>

  const isPro = plan?.id === 'pro'

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)' }}>
      <div style={{ borderBottom: '1px solid rgba(180,140,80,0.2)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/settings" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: 13 }}>← {tx.settings}</Link>
          <span style={{ color: '#3a3530' }}>|</span>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 'normal', color: '#d4a843' }}>{tx.billingTitle}</h1>
        </div>
      </div>

      <div style={{ padding: 32, maxWidth: 980, margin: '0 auto' }}>
        <div className="card" style={{ marginBottom: 22, borderColor: isPro ? 'rgba(123,200,123,0.35)' : 'rgba(212,168,67,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 8px' }}>{tx.billingCurrentPlan}</p>
              <h2 style={{ color: isPro ? '#7bc87b' : '#d4a843', margin: 0, fontSize: 30 }}>{isPro ? 'Pro' : 'Free'}</h2>
              <p style={{ color: '#8a7a60', fontSize: 13, margin: '8px 0 0' }}>{isPro ? tx.billingProDesc : tx.billingFreeDesc}</p>
              {plan?.current_period_end && <p style={{ color: '#5a4a30', fontSize: 12 }}>{tx.billingRenews}: {new Date(plan.current_period_end).toLocaleDateString(lang === 'no' ? 'nb-NO' : 'en-US')}</p>}
            </div>
            {!isPro && (
              <button className="btn-gold" onClick={startCheckout} disabled={checkoutLoading} style={{ fontSize: 15, padding: '12px 22px' }}>
                {checkoutLoading ? tx.loading : tx.billingUpgradeToPro}
              </button>
            )}
          </div>
          {error && <p style={{ color: '#c05050', fontSize: 12, margin: '12px 0 0' }}>{error}</p>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 22 }}>
          {[
            [tx.billingArtists, usageLine(artistCount, limits.artists?.limit)],
            [tx.billingSongs, usageLine(songCount, limits.songs?.limit)],
            [tx.billingAiThisMonth, usageLine(aiUsage, limits.ai_generations_monthly?.limit)],
          ].map(([label, value]) => (
            <div key={label} className="card" style={{ padding: 16 }}>
              <div style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
              <div style={{ color: '#e8e0d0', fontSize: 24, fontWeight: 600, marginTop: 6 }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 16, marginTop: 0 }}>{tx.billingIncluded}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {[
              ['newsletter_analytics', tx.billingFeatureNewsletterAnalytics],
              ['qr_analytics', tx.billingFeatureQrAnalytics],
              ['advanced_templates', tx.billingFeatureAdvancedTemplates],
              ['embed_widget', tx.billingFeatureEmbedWidget],
              ['custom_branding', tx.billingFeatureCustomBranding],
              ['remove_songcraft_branding', tx.billingFeatureRemoveBranding],
            ].map(([key, label]) => {
              const enabled = limits[key]?.enabled
              return (
                <div key={key} style={{ color: enabled ? '#7bc87b' : '#6a5a40', fontSize: 13, padding: '8px 10px', border: '1px solid rgba(180,140,80,0.12)', borderRadius: 6 }}>
                  {enabled ? '✓' : '○'} {label}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

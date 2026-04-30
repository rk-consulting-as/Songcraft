'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, useLang, setLang, type Lang } from '@/lib/i18n'
import { PLATFORM_RULES, type Platform } from '@/lib/platformRules'
import Link from 'next/link'

const PLATFORMS = Object.keys(PLATFORM_RULES) as Platform[]

export default function SettingsPage() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>('no')
  const [rules, setRules] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<Platform>('TikTok')

  useEffect(() => { setLangState(useLang()); fetchRules() }, [])

  const tx = t[lang]

  const fetchRules = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('platform_rules').select('*')
    if (data) {
      const mapped: Record<string, string> = {}
      data.forEach((r: any) => { mapped[r.platform] = r.custom_rules || '' })
      setRules(mapped)
    }
  }

  const saveRules = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    for (const platform of PLATFORMS) {
      const existing = await supabase.from('platform_rules').select('id').eq('platform', platform).eq('user_id', user?.id).single()
      if (existing.data) {
        await supabase.from('platform_rules').update({ custom_rules: rules[platform] || '', updated_at: new Date().toISOString() }).eq('id', existing.data.id)
      } else {
        await supabase.from('platform_rules').insert({ platform, custom_rules: rules[platform] || '', user_id: user?.id })
      }
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const changeLang = (l: Lang) => { setLang(l) }

  const currentPlatform = PLATFORM_RULES[activeTab]

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(180,140,80,0.2)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/dashboard" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: '13px' }}>← {tx.dashboard}</Link>
          <span style={{ color: '#3a3530' }}>|</span>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'normal', color: '#d4a843' }}>⚙ {tx.settings}</h1>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: '860px', margin: '0 auto' }}>

        {/* Studio page section */}
        <Link href="/studio-settings" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ marginBottom: '24px', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,168,67,0.5)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(180,140,80,0.2)')}>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '16px', marginTop: 0, marginBottom: '6px' }}>
              🌐 {lang === 'no' ? 'Rediger studio-side' : 'Edit studio page'}
            </h2>
            <p style={{ color: '#6a5a40', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
              {lang === 'no'
                ? 'Sett opp og rediger den offentlige hjemmesiden for ditt firma/manager-virksomhet. Bio, artister, prosjekter, tjenester og kontaktskjema.'
                : 'Set up and edit the public homepage for your company / management business. Bio, artists, projects, services and contact form.'}
            </p>
            <p style={{ color: '#d4a843', fontSize: '12px', margin: '10px 0 0' }}>
              {lang === 'no' ? 'Åpne editor →' : 'Open editor →'}
            </p>
          </div>
        </Link>

        {/* Language section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '16px', marginTop: 0, marginBottom: '16px' }}>
            🌐 {tx.language}
          </h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['no', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => changeLang(l)} style={{
                padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
                border: lang === l ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.2)',
                background: lang === l ? 'rgba(212,168,67,0.15)' : 'transparent',
                color: lang === l ? '#d4a843' : '#6a5a40',
              }}>
                {l === 'no' ? '🇳🇴 Norsk' : '🇬🇧 English'}
              </button>
            ))}
          </div>
        </div>

        {/* Platform rules section */}
        <div className="card">
          <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '16px', marginTop: 0, marginBottom: '6px' }}>
            📱 {lang === 'no' ? 'Plattformregler for captions' : 'Platform rules for captions'}
          </h2>
          <p style={{ color: '#6a5a40', fontSize: '13px', marginBottom: '20px', lineHeight: '1.6' }}>
            {lang === 'no'
              ? 'AI kjenner allerede de tekniske reglene for hver plattform. Her kan du legge til egne regler som alltid brukes – f.eks. fast artistnavn, merkevarespråk, hashtags du alltid vil ha med.'
              : 'AI already knows the technical rules for each platform. Here you can add your own rules that are always applied — e.g. fixed artist handle, brand language, hashtags you always want.'}
          </p>

          {/* Platform tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {PLATFORMS.map(p => (
              <button key={p} onClick={() => setActiveTab(p)} style={{
                padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
                border: activeTab === p ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.15)',
                background: activeTab === p ? 'rgba(212,168,67,0.12)' : 'transparent',
                color: activeTab === p ? '#d4a843' : '#6a5a40',
              }}>
                {PLATFORM_RULES[p].emoji} {p}
              </button>
            ))}
          </div>

          {/* Built-in rules display */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,80,0.1)', borderRadius: '6px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginTop: 0, marginBottom: '12px' }}>
              {lang === 'no' ? 'INNEBYGDE REGLER (alltid aktive)' : 'BUILT-IN RULES (always active)'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
              <div>
                <span style={{ color: '#5a4a30', fontSize: '11px' }}>{lang === 'no' ? 'Maks tegn:' : 'Max chars:'}</span>
                <span style={{ color: '#a09080', fontSize: '12px', marginLeft: '6px' }}>
                  {currentPlatform.maxChars ? currentPlatform.maxChars.toLocaleString() : '∞'}
                </span>
              </div>
              <div>
                <span style={{ color: '#5a4a30', fontSize: '11px' }}>{lang === 'no' ? 'Synlig uten "mer":' : 'Visible before "more":'}</span>
                <span style={{ color: '#a09080', fontSize: '12px', marginLeft: '6px' }}>{currentPlatform.visibleChars} tegn</span>
              </div>
              <div>
                <span style={{ color: '#5a4a30', fontSize: '11px' }}>Hashtags:</span>
                <span style={{ color: '#a09080', fontSize: '12px', marginLeft: '6px' }}>{currentPlatform.hashtagCount}</span>
              </div>
              <div>
                <span style={{ color: '#5a4a30', fontSize: '11px' }}>Tone:</span>
                <span style={{ color: '#a09080', fontSize: '12px', marginLeft: '6px' }}>{currentPlatform.tone.split(',')[0]}</span>
              </div>
            </div>
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(180,140,80,0.1)' }}>
              {currentPlatform.tips.map((tip, i) => (
                <div key={i} style={{ color: '#5a4a30', fontSize: '12px', marginBottom: '4px' }}>✓ {tip}</div>
              ))}
            </div>
          </div>

          {/* Custom rules input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '8px' }}>
              {lang === 'no' ? `EGNE REGLER FOR ${activeTab.toUpperCase()} (valgfritt)` : `CUSTOM RULES FOR ${activeTab.toUpperCase()} (optional)`}
            </label>
            <textarea
              value={rules[activeTab] || ''}
              onChange={e => setRules({ ...rules, [activeTab]: e.target.value })}
              placeholder={lang === 'no'
                ? `Eks:\n- Alltid nevn @${activeTab === 'TikTok' ? 'artistnavn' : 'artisthandle'}\n- Alltid inkluder #Nordfire og #NordNorge\n- Skriv alltid på norsk bokmål\n- Avslutt alltid med "Lytt nå på Spotify 🎧"`
                : `E.g.:\n- Always mention @artisthandle\n- Always include #BandName\n- Always end with "Listen now on Spotify 🎧"\n- Never use exclamation marks`}
              rows={6}
              style={{ lineHeight: '1.6' }}
            />
            <p style={{ color: '#5a4a30', fontSize: '12px', margin: '6px 0 0' }}>
              💡 {lang === 'no'
                ? 'Disse reglene sendes til AI hver gang du genererer en caption for denne plattformen.'
                : 'These rules are sent to AI every time you generate a caption for this platform.'}
            </p>
          </div>

          <button className="btn-gold" onClick={saveRules} disabled={saving}>
            {saving ? tx.saving : saved ? (lang === 'no' ? '✓ Lagret!' : '✓ Saved!') : (lang === 'no' ? 'Lagre alle regler' : 'Save all rules')}
          </button>
        </div>
      </div>
    </div>
  )
}

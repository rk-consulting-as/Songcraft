'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import UpgradePrompt from '@/components/UpgradePrompt'
import { t, useLang, type Lang } from '@/lib/i18n'
import type { AIProvider } from '@/lib/aiProvider'
import { aiOutputLanguageDirective, aiOutputLanguageName, normalizeAIOutputLang, type AIOutputLang } from '@/lib/aiOutputLanguage'

type Subscriber = {
  id: string
  email: string
  name?: string | null
  source_page?: string | null
  source?: string | null
  favorite_song?: string | null
  confirmed: boolean
  created_at: string
}

type Song = {
  id: string
  title: string
  lyrics_instructions?: string | null
  backstory?: string | null
  spotify_url?: string | null
  publish_content?: any
}

export default function FanHubPanel({
  artist,
  songs,
  subscribers,
  newsletterSources,
  planId,
  aiProvider,
}: {
  artist: any
  songs: Song[]
  subscribers: Subscriber[]
  newsletterSources: [string, number][]
  planId: 'free' | 'pro'
  aiProvider: AIProvider
}) {
  const [lang, setLang] = useState<Lang>('en')
  const [aiOutputLang, setAiOutputLang] = useState<AIOutputLang>('en')
  const tx = t[lang]
  const [newsletterSongId, setNewsletterSongId] = useState('')
  const [newsletterDraft, setNewsletterDraft] = useState(artist?.page_settings?.fan_hub?.newsletter_draft || '')
  const [newsletterGenerating, setNewsletterGenerating] = useState(false)
  const [resendEnabled, setResendEnabled] = useState(false)

  useEffect(() => {
    setLang(useLang())
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: profile } = await supabase.from('profiles').select('preferred_ai_output_lang, preferred_song_lang').eq('id', data.user.id).maybeSingle()
      setAiOutputLang(normalizeAIOutputLang((profile as any)?.preferred_ai_output_lang || ((profile as any)?.preferred_song_lang === 'no' ? 'no' : 'en')))
    }).catch(() => {})
    fetch('/api/newsletter/resend-status')
      .then(res => res.json())
      .then(data => setResendEnabled(!!data.enabled))
      .catch(() => setResendEnabled(false))
  }, [])

  const visibleSubscribers = planId === 'pro' ? subscribers : subscribers.slice(0, 10)

  const saveFanHub = async (updates: Record<string, any>) => {
    const nextSettings = {
      ...(artist.page_settings || {}),
      fan_hub: { ...((artist.page_settings || {}).fan_hub || {}), ...updates },
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('artists').update({ page_settings: nextSettings }).eq('id', artist.id).eq('user_id', user.id)
  }

  const exportSubscribersCsv = () => {
    if (planId !== 'pro') return
    const rows = [
      ['email', 'name', 'favorite_song', 'source', 'source_page', 'confirmed', 'created_at'],
      ...subscribers.map(sub => [sub.email, sub.name || '', sub.favorite_song || '', sub.source || '', sub.source_page || '', sub.confirmed ? 'true' : 'false', sub.created_at]),
    ]
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${artist?.name || 'viatone'}-subscribers.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const generateNewsletterDraft = async () => {
    const selectedSong = songs.find(s => s.id === newsletterSongId) || songs[0]
    if (!selectedSong) return
    setNewsletterGenerating(true)
    const campaign = selectedSong.publish_content || {}
    const campaignAssets = [
      campaign.campaign_newsletter_announcement,
      campaign.campaign_facebook_post,
      campaign.campaign_instagram_caption,
      campaign.campaign_press_bio,
      campaign.campaign_spotify_pitch,
    ].filter(Boolean).join('\n\n')
    const context = [
      `Artist: ${artist.name}`,
      artist.genre ? `Genre: ${artist.genre}` : '',
      artist.description ? `Artist description:\n${artist.description}` : '',
      `Song/release: ${selectedSong.title}`,
      selectedSong.lyrics_instructions ? `Song concept:\n${selectedSong.lyrics_instructions}` : '',
      selectedSong.backstory ? `Backstory:\n${selectedSong.backstory}` : '',
      campaignAssets ? `Campaign assets:\n${campaignAssets}` : '',
      artist.page_slug ? `Artist page: /p/${artist.page_slug}` : '',
      selectedSong.spotify_url ? `Spotify: ${selectedSong.spotify_url}` : '',
    ].filter(Boolean).join('\n\n')

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          provider: aiProvider,
          messages: [{ role: 'user', content: context }],
          system: [
            aiOutputLanguageDirective(aiOutputLang),
            `Write a fan newsletter announcement in ${aiOutputLanguageName(aiOutputLang)}.`,
            'Return a practical email draft with Subject, Preview text, Body, and CTA.',
            'Keep it warm, direct, and safe to copy into an email tool. Do not claim it has been sent.',
          ].join('\n'),
        }),
      })
      const data = await res.json()
      if (data.text) {
        setNewsletterDraft(data.text)
        await saveFanHub({ newsletter_draft: data.text, newsletter_song_id: selectedSong.id })
      }
    } catch {}
    setNewsletterGenerating(false)
  }

  return (
    <div className="card" style={{ marginTop: 36, borderColor: 'rgba(212,168,67,0.25)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 16, letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
            {tx.fanHubTitle}
          </h2>
          <p style={{ color: '#8a7a60', fontSize: 12, margin: '4px 0 0' }}>{tx.subscribersCount}: {subscribers.length}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-outline" onClick={exportSubscribersCsv} disabled={planId !== 'pro' || subscribers.length === 0} style={{ padding: '6px 14px', fontSize: 12 }}>
            {tx.fanHubExportCsv}
          </button>
          {artist?.page_enabled && artist?.page_slug && (
            <a href={`/p/${artist.page_slug}`} target="_blank" rel="noopener noreferrer" style={{ color: '#d4a843', fontSize: 12, textDecoration: 'none', padding: '6px 0' }}>
              /p/{artist.page_slug} ↗
            </a>
          )}
        </div>
      </div>

      {planId === 'free' && <UpgradePrompt compact title={tx.fanHubProTitle} description={tx.fanHubProDesc} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          [tx.fanHubTotalSubscribers, subscribers.length],
          [tx.fanHubConfirmed, subscribers.filter(s => s.confirmed).length],
          [tx.fanHubUnconfirmed, subscribers.filter(s => !s.confirmed).length],
          [tx.fanHubQrEmbedSources, subscribers.filter(s => s.source === 'qr' || s.source === 'embed').length],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,80,0.12)', borderRadius: 6, padding: 12 }}>
            <div style={{ color: '#8a7a60', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
            <div style={{ color: '#e8e0d0', fontSize: 22, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      {newsletterSources.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 8px' }}>{tx.fanHubSourceBreakdown}</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {newsletterSources.map(([source, count]) => (
              <span key={source} style={{ border: '1px solid rgba(212,168,67,0.25)', borderRadius: 16, padding: '4px 10px', color: '#c8c0b0', fontSize: 12 }}>{source}: {count}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
        <div>
          <h3 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>{tx.fanHubSubscriberList}</h3>
          {subscribers.length === 0 ? (
            <p style={{ color: '#5a4a30', fontSize: 13, margin: 0 }}>{tx.subscribersEmpty}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
              {visibleSubscribers.map(sub => (
                <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,80,0.12)', borderRadius: 6, padding: '10px 12px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#e8e0d0', fontSize: 13 }}>{sub.name || sub.email}</div>
                    {sub.name && <div style={{ color: '#8a7a60', fontSize: 12 }}>{sub.email}</div>}
                    {sub.favorite_song && <div style={{ color: '#6a5a40', fontSize: 11 }}>{tx.fanHubFavoriteSong}: {sub.favorite_song}</div>}
                  </div>
                  <div style={{ color: '#5a4a30', fontSize: 11, textAlign: 'right' }}>
                    <div>{new Date(sub.created_at).toLocaleDateString(lang === 'no' ? 'nb-NO' : 'en-US')}</div>
                    <div>{tx.subscribersSource}: {sub.source || sub.source_page || 'unknown'}</div>
                    {sub.source_page && <div>{sub.source_page}</div>}
                    <div>{tx.subscribersConfirmed}: {sub.confirmed ? tx.yes : tx.no}</div>
                  </div>
                </div>
              ))}
              {planId !== 'pro' && subscribers.length > visibleSubscribers.length && <p style={{ color: '#8a7a60', fontSize: 12, margin: 0 }}>{tx.fanHubFreeLimitHint}</p>}
            </div>
          )}
        </div>

        <div>
          <h3 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>{tx.fanHubNewsletterDraft}</h3>
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,80,0.12)', borderRadius: 8, padding: 12 }}>
            <label style={{ display: 'block', color: '#8a7a60', fontSize: 11, marginBottom: 5 }}>{tx.fanHubSelectRelease}</label>
            <select value={newsletterSongId || artist?.page_settings?.fan_hub?.newsletter_song_id || songs[0]?.id || ''} onChange={e => setNewsletterSongId(e.target.value)} style={{ marginBottom: 10 }}>
              {songs.map(song => <option key={song.id} value={song.id}>{song.title}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <button className="btn-gold" onClick={generateNewsletterDraft} disabled={newsletterGenerating || songs.length === 0} style={{ padding: '7px 14px', fontSize: 12 }}>
                {newsletterGenerating ? tx.generating : tx.fanHubGenerateNewsletter}
              </button>
              {newsletterDraft && (
                <button className="btn-outline" onClick={() => navigator.clipboard.writeText(newsletterDraft)} style={{ padding: '7px 14px', fontSize: 12 }}>📋 {tx.copy}</button>
              )}
            </div>
            <div style={{ color: resendEnabled ? '#7bc87b' : '#8a7a60', fontSize: 11, marginBottom: 8 }}>
              {resendEnabled ? tx.fanHubResendReady : tx.fanHubResendDisabled}
            </div>
            <textarea value={newsletterDraft} onChange={e => { setNewsletterDraft(e.target.value); saveFanHub({ newsletter_draft: e.target.value }) }} rows={12} placeholder={tx.fanHubNewsletterPlaceholder} />
          </div>
        </div>
      </div>
    </div>
  )
}

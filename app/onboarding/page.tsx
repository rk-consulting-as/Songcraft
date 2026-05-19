'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { canUseFeature, getUserPlan } from '@/lib/subscription'
import { setLang, t, useLang, type Lang } from '@/lib/i18n'
import QRCodeCard from '@/components/QRCodeCard'
import EmbedCodeGenerator from '@/components/EmbedCodeGenerator'
import UpgradePrompt from '@/components/UpgradePrompt'

const DEFAULT_PAGE_SETTINGS = {
  sections: { hero: true, spotify: true, youtube: true, albums: true, songs: true, bio: true, social: true, events: true, newsletter: true },
  accent_color: '#d4a843',
  youtube_videos: [] as string[],
}

type ArtistRow = {
  id: string
  name: string
  genre?: string | null
  page_enabled?: boolean
  page_slug?: string | null
}

type SongRow = {
  id: string
  title: string
  artist_id: string
  lyrics_instructions?: string | null
  spotify_url?: string | null
  media_links?: any[] | null
}

function slugify(value: string) {
  return value.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

function draftPrompt(lang: Lang, title: string, artist: string, genre: string) {
  if (lang === 'no') {
    return [
      `Skriv en ${genre || 'moderne pop'}-tekst for "${title || 'Min første låt'}" av ${artist || 'artisten'}.`,
      'Versene skal være konkrete og filmatiske, refrenget enkelt å synge med på.',
      'Tema: en ny start, et tydelig øyeblikk og en emosjonell vending mot håp.',
    ].join('\n')
  }
  return [
    `Write a ${genre || 'modern pop'} lyric for "${title || 'My First Song'}" by ${artist || 'the artist'}.`,
    'Make the verses concrete and cinematic, with a chorus that is easy to sing along to.',
    'Theme: a fresh start, one vivid moment, and an emotional turn toward hope.',
  ].join('\n')
}

export default function OnboardingPage() {
  const router = useRouter()
  const restartRequested = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('restart') === '1'
  const [lang, setLangState] = useState<Lang>('en')
  const tx = t[lang]

  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [planId, setPlanId] = useState<'free' | 'pro'>('free')
  const [artists, setArtists] = useState<ArtistRow[]>([])
  const [songs, setSongs] = useState<SongRow[]>([])
  const [artistId, setArtistId] = useState('')
  const [songId, setSongId] = useState('')
  const [artistName, setArtistName] = useState('')
  const [genre, setGenre] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [draft, setDraft] = useState('')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [pageSlug, setPageSlug] = useState('')
  const [skipped, setSkipped] = useState(false)
  const [completed, setCompleted] = useState(false)

  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const publicPath = pageSlug ? `/p/${pageSlug}` : ''
  const publicUrl = publicPath ? `${origin}${publicPath}` : ''
  const embedUrl = songId ? `${origin}/embed/song/${songId}?source=embed&theme=dark` : ''

  const metadata = useMemo(() => ({
    artistName,
    genre,
    songTitle,
    draft,
    spotifyUrl,
    youtubeUrl,
    pageSlug,
  }), [artistName, draft, genre, pageSlug, songTitle, spotifyUrl, youtubeUrl])

  useEffect(() => {
    setLangState(useLang())
    load()
  }, [])

  useEffect(() => {
    if (!hydrated || !userId) return
    const timer = window.setTimeout(() => {
      saveProgress({ metadata }).catch(() => {})
    }, 700)
    return () => window.clearTimeout(timer)
  }, [hydrated, metadata, userId])

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUserId(user.id)

    const [progressRes, artistsRes, songsRes, planData] = await Promise.all([
      supabase.from('onboarding_progress').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('artists').select('id, name, genre, page_enabled, page_slug').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('songs').select('id, title, artist_id, lyrics_instructions, spotify_url, media_links').eq('user_id', user.id).order('created_at', { ascending: true }),
      getUserPlan(supabase, user.id),
    ])

    const ownedArtists = (artistsRes.data || []) as ArtistRow[]
    const ownedSongs = (songsRes.data || []) as SongRow[]
    setArtists(ownedArtists)
    setSongs(ownedSongs)
    if (planData.id === 'pro') setPlanId('pro')

    if (restartRequested) {
      await supabase.from('onboarding_progress').upsert({
        user_id: user.id,
        current_step: 0,
        artist_id: null,
        song_id: null,
        metadata: {},
        skipped: false,
        completed: false,
      }, { onConflict: 'user_id' })
    }

    const progress = restartRequested ? null : progressRes.data
    const preferredArtist = ownedArtists.find(a => a.id === progress?.artist_id) || ownedArtists[0] || null
    const preferredSong = ownedSongs.find(s => s.id === progress?.song_id) || ownedSongs.find(s => s.artist_id === preferredArtist?.id) || ownedSongs[0] || null
    const meta = (progress?.metadata || {}) as Record<string, string>

    if (preferredArtist) {
      setArtistId(preferredArtist.id)
      setArtistName(meta.artistName || preferredArtist.name || '')
      setGenre(meta.genre || preferredArtist.genre || '')
      setPageSlug(meta.pageSlug || preferredArtist.page_slug || '')
    } else {
      setArtistName(meta.artistName || '')
      setGenre(meta.genre || '')
    }

    if (preferredSong) {
      setSongId(preferredSong.id)
      setSongTitle(meta.songTitle || preferredSong.title || '')
      setDraft(meta.draft || preferredSong.lyrics_instructions || '')
      setSpotifyUrl(meta.spotifyUrl || preferredSong.spotify_url || '')
      const youtube = (preferredSong.media_links || []).find((l: any) => (l.platform || '').toLowerCase() === 'youtube')?.url || ''
      setYoutubeUrl(meta.youtubeUrl || youtube)
    } else {
      setSongTitle(meta.songTitle || '')
      setDraft(meta.draft || '')
      setSpotifyUrl(meta.spotifyUrl || '')
      setYoutubeUrl(meta.youtubeUrl || '')
    }

    const setupComplete = !!preferredArtist?.page_enabled && !!preferredArtist?.page_slug && !!preferredSong
    setStep(progress?.current_step ?? (setupComplete ? 7 : 0))
    setSkipped(!!progress?.skipped)
    setCompleted(!!progress?.completed || setupComplete)
    setHydrated(true)
    setLoading(false)
  }

  const saveProgress = async (patch: Record<string, any> = {}) => {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('onboarding_progress').upsert({
      user_id: userId,
      current_step: step,
      artist_id: artistId || null,
      song_id: songId || null,
      metadata,
      skipped,
      completed,
      ...patch,
    }, { onConflict: 'user_id' })
  }

  const goStep = async (nextStep: number, patch: Record<string, any> = {}) => {
    setStep(nextStep)
    await saveProgress({ current_step: nextStep, ...patch })
  }

  const chooseLanguage = async (nextLang: Lang) => {
    setLang(nextLang)
    setLangState(nextLang)
    await goStep(1, { metadata: { ...metadata, lang: nextLang } })
  }

  const saveArtist = async () => {
    if (!artistName.trim()) return
    setSaving(true); setError('')
    const supabase = createClient()
    if (!artistId) {
      const limit = await canUseFeature(supabase, userId, 'artists', artists.length)
      if (!limit.allowed) {
        setError(tx.onboardingArtistLimit)
        setSaving(false)
        return
      }
      const { data, error } = await supabase.from('artists').insert({
        user_id: userId,
        name: artistName.trim(),
        genre: genre.trim(),
        description: '',
        song_structure: '',
        avatar_url: '',
        social_links: {},
        page_enabled: false,
        page_template: 'default',
        page_settings: DEFAULT_PAGE_SETTINGS,
      }).select('id, name, genre, page_enabled, page_slug').single()
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
      setArtistId(data.id)
      setArtists([...artists, data as ArtistRow])
      await goStep(2, { artist_id: data.id })
    } else {
      await supabase.from('artists').update({ name: artistName.trim() }).eq('id', artistId).eq('user_id', userId)
      await goStep(2)
    }
    setSaving(false)
  }

  const saveGenre = async () => {
    setSaving(true); setError('')
    const supabase = createClient()
    if (artistId) await supabase.from('artists').update({ genre: genre.trim() }).eq('id', artistId).eq('user_id', userId)
    await goStep(3)
    setSaving(false)
  }

  const saveSongTitle = async () => {
    if (!songTitle.trim() || !artistId) return
    setSaving(true); setError('')
    const supabase = createClient()
    if (!songId) {
      const limit = await canUseFeature(supabase, userId, 'songs', songs.length)
      if (!limit.allowed) {
        setError(tx.onboardingSongLimit)
        setSaving(false)
        return
      }
      const { data, error } = await supabase.from('songs').insert({
        user_id: userId,
        artist_id: artistId,
        title: songTitle.trim(),
        lyrics_instructions: draft,
        status: 'draft',
      }).select('id, title, artist_id, lyrics_instructions, spotify_url, media_links').single()
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
      setSongId(data.id)
      setSongs([...songs, data as SongRow])
      await goStep(4, { song_id: data.id })
    } else {
      await supabase.from('songs').update({ title: songTitle.trim() }).eq('id', songId).eq('user_id', userId)
      await goStep(4)
    }
    setSaving(false)
  }

  const generateDraft = async () => {
    const nextDraft = draftPrompt(lang, songTitle, artistName, genre)
    setDraft(nextDraft)
    if (songId) {
      const supabase = createClient()
      await supabase.from('songs').update({ lyrics_instructions: nextDraft }).eq('id', songId).eq('user_id', userId)
    }
    await saveProgress({ metadata: { ...metadata, draft: nextDraft } })
  }

  const saveDraft = async () => {
    setSaving(true); setError('')
    const supabase = createClient()
    if (songId) await supabase.from('songs').update({ lyrics_instructions: draft }).eq('id', songId).eq('user_id', userId)
    await goStep(5)
    setSaving(false)
  }

  const saveLinks = async () => {
    setSaving(true); setError('')
    const mediaLinks = [
      ...(youtubeUrl.trim() ? [{ platform: 'YouTube', url: youtubeUrl.trim(), label: 'YouTube' }] : []),
    ]
    const supabase = createClient()
    if (songId) {
      await supabase.from('songs').update({
        spotify_url: spotifyUrl.trim() || null,
        media_links: mediaLinks,
      }).eq('id', songId).eq('user_id', userId)
    }
    await goStep(6)
    setSaving(false)
  }

  const enablePublicPage = async () => {
    if (!artistId) return
    setSaving(true); setError('')
    const supabase = createClient()
    const base = slugify(pageSlug || artistName) || `artist-${artistId.slice(0, 8)}`
    let slug = base
    let { error } = await supabase.from('artists').update({
      page_enabled: true,
      page_slug: slug,
      page_settings: DEFAULT_PAGE_SETTINGS,
    }).eq('id', artistId).eq('user_id', userId)
    if (error?.code === '23505') {
      slug = `${base}-${artistId.slice(0, 6)}`
      const retry = await supabase.from('artists').update({
        page_enabled: true,
        page_slug: slug,
        page_settings: DEFAULT_PAGE_SETTINGS,
      }).eq('id', artistId).eq('user_id', userId)
      error = retry.error
    }
    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }
    setPageSlug(slug)
    setCompleted(true)
    await goStep(7, { completed: true, metadata: { ...metadata, pageSlug: slug } })
    setSaving(false)
  }

  const skipOnboarding = async () => {
    setSkipped(true)
    await saveProgress({ skipped: true })
    router.push('/dashboard')
  }

  const restart = () => {
    router.push('/onboarding?restart=1')
  }

  const stepLabels = [
    tx.onboardingStepLanguage,
    tx.onboardingStepArtist,
    tx.onboardingStepGenre,
    tx.onboardingStepSong,
    tx.onboardingStepDraft,
    tx.onboardingStepLinks,
    tx.onboardingStepPublic,
    tx.onboardingStepShare,
  ]

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#8a7a60', padding: 40 }}>{tx.loading}</div>
  }

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)', color: '#e8e0d0', padding: 24 }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ color: '#d4a843', textDecoration: 'none', letterSpacing: 3, fontSize: 13 }}>VIATONE</Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-outline" onClick={skipOnboarding}>{tx.onboardingSkip}</button>
            <button className="btn-outline" onClick={restart}>{tx.onboardingRestart}</button>
          </div>
        </div>

        <div className="card" style={{ borderColor: 'rgba(212,168,67,0.32)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, marginBottom: 22, flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: '#d4a843', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px' }}>{tx.onboardingEyebrow}</p>
              <h1 style={{ margin: 0, color: '#e8e0d0', fontSize: 30, fontWeight: 700 }}>{tx.onboardingTitle}</h1>
              <p style={{ color: '#a09080', margin: '10px 0 0', maxWidth: 620, lineHeight: 1.55 }}>{tx.onboardingSubtitle}</p>
            </div>
            <div style={{ color: '#8a7a60', fontSize: 12 }}>{tx.billingCurrentPlan}: {planId === 'pro' ? 'Pro' : 'Free'}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 24 }}>
            {stepLabels.map((label, index) => (
              <button
                key={label}
                onClick={() => setStep(index)}
                style={{
                  border: index === step ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.18)',
                  background: index === step ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.02)',
                  color: index <= step ? '#e8e0d0' : '#6a5a40',
                  borderRadius: 6,
                  padding: '8px 10px',
                  fontSize: 11,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ color: '#d4a843' }}>{index + 1}.</span> {label}
              </button>
            ))}
          </div>

          {error && <div style={{ color: '#e07070', background: 'rgba(192,80,80,0.08)', border: '1px solid rgba(192,80,80,0.25)', borderRadius: 6, padding: 12, marginBottom: 16 }}>{error}</div>}
          {skipped && <p style={{ color: '#8a7a60', fontSize: 12 }}>{tx.onboardingSkippedNotice}</p>}

          {step === 0 && (
            <section>
              <h2 style={{ color: '#d4a843', fontWeight: 'normal' }}>{tx.onboardingLanguageTitle}</h2>
              <p style={{ color: '#8a7a60' }}>{tx.onboardingLanguageDesc}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn-gold" onClick={() => chooseLanguage('en')}>English</button>
                <button className="btn-outline" onClick={() => chooseLanguage('no')}>Norsk</button>
              </div>
            </section>
          )}

          {step === 1 && (
            <section>
              <h2 style={{ color: '#d4a843', fontWeight: 'normal' }}>{tx.onboardingArtistTitle}</h2>
              <p style={{ color: '#8a7a60' }}>{tx.onboardingArtistDesc}</p>
              <input value={artistName} onChange={e => setArtistName(e.target.value)} placeholder={tx.artistNamePlaceholder} />
              {planId === 'free' && artists.length >= 1 && !artistId && <UpgradePrompt compact title={tx.upgradeArtistLimitTitle} description={tx.upgradeArtistLimitDesc} />}
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <button className="btn-gold" onClick={saveArtist} disabled={saving || !artistName.trim()}>{saving ? tx.saving : tx.next}</button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2 style={{ color: '#d4a843', fontWeight: 'normal' }}>{tx.onboardingGenreTitle}</h2>
              <p style={{ color: '#8a7a60' }}>{tx.onboardingGenreDesc}</p>
              <input value={genre} onChange={e => setGenre(e.target.value)} placeholder={tx.genrePlaceholder} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {['Pop', 'Rock', 'Country', 'Hip hop', 'Electronic', 'Singer-songwriter'].map(item => (
                  <button key={item} className="btn-outline" onClick={() => setGenre(item)}>{item}</button>
                ))}
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <button className="btn-gold" onClick={saveGenre} disabled={saving}>{saving ? tx.saving : tx.next}</button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2 style={{ color: '#d4a843', fontWeight: 'normal' }}>{tx.onboardingSongTitle}</h2>
              <p style={{ color: '#8a7a60' }}>{tx.onboardingSongDesc}</p>
              <input value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder={tx.songTitlePlaceholder} />
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <button className="btn-gold" onClick={saveSongTitle} disabled={saving || !songTitle.trim() || !artistId}>{saving ? tx.saving : tx.next}</button>
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h2 style={{ color: '#d4a843', fontWeight: 'normal' }}>{tx.onboardingDraftTitle}</h2>
              <p style={{ color: '#8a7a60' }}>{tx.onboardingDraftDesc}</p>
              <button className="btn-outline" onClick={generateDraft}>{tx.onboardingGenerateDraft}</button>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={8} style={{ marginTop: 12 }} placeholder={tx.onboardingDraftPlaceholder} />
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <button className="btn-gold" onClick={saveDraft} disabled={saving}>{saving ? tx.saving : tx.next}</button>
              </div>
            </section>
          )}

          {step === 5 && (
            <section>
              <h2 style={{ color: '#d4a843', fontWeight: 'normal' }}>{tx.onboardingLinksTitle}</h2>
              <p style={{ color: '#8a7a60' }}>{tx.onboardingLinksDesc}</p>
              <label style={{ color: '#8a7a60', fontSize: 12 }}>Spotify</label>
              <input value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)} placeholder="https://open.spotify.com/..." style={{ marginBottom: 10 }} />
              <label style={{ color: '#8a7a60', fontSize: 12 }}>YouTube</label>
              <input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />
              <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn-gold" onClick={saveLinks} disabled={saving}>{saving ? tx.saving : tx.next}</button>
                <button className="btn-outline" onClick={saveLinks}>{tx.skip}</button>
              </div>
            </section>
          )}

          {step === 6 && (
            <section>
              <h2 style={{ color: '#d4a843', fontWeight: 'normal' }}>{tx.onboardingPublicTitle}</h2>
              <p style={{ color: '#8a7a60' }}>{tx.onboardingPublicDesc}</p>
              <input value={pageSlug || slugify(artistName)} onChange={e => setPageSlug(slugify(e.target.value))} placeholder="artist-slug" />
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <button className="btn-gold" onClick={enablePublicPage} disabled={saving || !artistId}>{saving ? tx.saving : tx.onboardingEnablePublic}</button>
              </div>
            </section>
          )}

          {step === 7 && (
            <section>
              <h2 style={{ color: '#d4a843', fontWeight: 'normal' }}>{tx.onboardingShareTitle}</h2>
              <p style={{ color: '#8a7a60' }}>{tx.onboardingShareDesc}</p>
              {publicUrl && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#8a7a60', fontSize: 12, marginBottom: 6 }}>{tx.publicPage}</div>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#d4a843', wordBreak: 'break-all' }}>{publicUrl}</a>
                </div>
              )}
              {publicPath && <QRCodeCard path={publicPath} title={tx.qrArtistHint} />}
              {songId && (
                <div style={{ marginTop: 16 }}>
                  <EmbedCodeGenerator songId={songId} title={songTitle || 'ViaTone'} canRemoveBranding={planId === 'pro'} />
                  <div style={{ marginTop: 12, border: '1px solid rgba(180,140,80,0.18)', borderRadius: 14, overflow: 'hidden' }}>
                    <iframe src={embedUrl} title="ViaTone embed preview" style={{ width: '100%', height: 420, border: 0, display: 'block' }} />
                  </div>
                  {planId === 'free' && <UpgradePrompt compact title={tx.upgradeEmbedTitle} description={tx.upgradeEmbedDesc} />}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
                {artistId && <Link href={`/artist/${artistId}`} className="btn-gold" style={{ textDecoration: 'none' }}>{tx.onboardingOpenArtist}</Link>}
                {songId && <Link href={`/song/${songId}`} className="btn-outline" style={{ textDecoration: 'none' }}>{tx.onboardingOpenSong}</Link>}
                <Link href="/dashboard" className="btn-outline" style={{ textDecoration: 'none' }}>{tx.dashboard}</Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}

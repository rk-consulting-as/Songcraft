'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'
import Link from 'next/link'

const PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'YouTube', 'X/Twitter']
const MEDIA_PLATFORMS = ['Spotify', 'YouTube', 'TikTok', 'Instagram', 'Facebook', 'Apple Music', 'SoundCloud', 'Other']

export default function SongPage() {
  const params = useParams()
  const songId = params.id as string
  const [lang, setLangState] = useState<Lang>('no')
  const [tab, setTab] = useState('lyrics')
  const [song, setSong] = useState<any>(null)
  const [artist, setArtist] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiTarget, setAiTarget] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [lyricsInstructions, setLyricsInstructions] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [lyricsHistory, setLyricsHistory] = useState<any[]>([])
  const [lyricsChat, setLyricsChat] = useState('')
  const [useProfileForLyrics, setUseProfileForLyrics] = useState(true)

  const [sunoPrompt, setSunoPrompt] = useState('')

  const [captions, setCaptions] = useState<Record<string, string>>({})
  const [captionTone, setCaptionTone] = useState('')
  const [captionLangOverride, setCaptionLangOverride] = useState(false)
  const [captionForcedLang, setCaptionForcedLang] = useState<'no'|'en'|'auto'>('auto')

  const [coverStyle, setCoverStyle] = useState('')
  const [coverPrompt, setCoverPrompt] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)

  const [mediaLinks, setMediaLinks] = useState<{platform:string;url:string;label:string}[]>([])
  const [newPlatform, setNewPlatform] = useState('Spotify')
  const [newUrl, setNewUrl] = useState('')
  const [newLabel, setNewLabel] = useState('')

  const [publishContent, setPublishContent] = useState<Record<string,string>>({})
  const [title, setTitle] = useState('')

  useEffect(() => { setLangState(useLang()); fetchSong() }, [songId])

  const tx = t[lang]

  const TAB_LABELS: Record<string, string> = {
    lyrics: `🎵 ${tx.lyrics}`,
    suno: `🤖 ${tx.suno}`,
    captions: `📱 ${tx.captions}`,
    cover: `🖼️ ${tx.cover}`,
    media: `🔗 ${tx.media}`,
    publish: `📢 ${tx.publish}`,
  }

  const fetchSong = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('songs').select('*, artists(*)').eq('id', songId).single()
    if (data) {
      setSong(data); setArtist(data.artists)
      setTitle(data.title || '')
      setLyricsInstructions(data.lyrics_instructions || '')
      setLyrics(data.lyrics_text || '')
      setLyricsHistory(data.lyrics_history || [])
      setSunoPrompt(data.suno_prompt || '')
      setCaptions(data.captions || {})
      setCoverStyle(data.cover_style || '')
      setCoverPrompt(data.cover_prompt || '')
      setCoverImageUrl(data.cover_image_url || '')
      setMediaLinks(data.media_links || [])
      setPublishContent(data.publish_content || {})
    }
    setLoading(false)
  }

  const save = async (updates: any) => {
    const supabase = createClient()
    await supabase.from('songs').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', songId)
  }

  const callAI = async (messages: any[], system: string, targetKey: string) => {
    setAiLoading(true); setAiTarget(targetKey)
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, system }),
    })
    const data = await res.json()
    setAiLoading(false); setAiTarget('')
    return data.text || ''
  }

  const buildArtistContext = () => {
    if (!artist || !useProfileForLyrics) return ''
    const parts = []
    if (artist.genre) parts.push(`Genre: ${artist.genre}`)
    if (artist.description) parts.push(`Artist description: ${artist.description}`)
    if (artist.song_structure) parts.push(`Song structure/profile: ${artist.song_structure}`)
    return parts.length ? '\n\nArtist context:\n' + parts.join('\n') : ''
  }

  const generateLyrics = async () => {
    if (!lyricsInstructions.trim()) return
    const artistCtx = buildArtistContext()
    const msgs = [{ role: 'user', content: lyricsInstructions + artistCtx }]
    const sysLang = lang === 'no' ? 'Norwegian' : 'English'
    const result = await callAI(msgs,
      `You are a creative songwriter. Write song lyrics based on the user's instructions. Write in ${sysLang}. Format with Verse 1, Verse 2, Chorus, Bridge etc.${artist?.song_structure && useProfileForLyrics ? ' Follow the song structure profile provided.' : ''} Output only the lyrics, no explanations.`,
      'lyrics')
    const newHistory = [...msgs, { role: 'assistant', content: result }]
    setLyrics(result); setLyricsHistory(newHistory)
    await save({ lyrics_instructions: lyricsInstructions, lyrics_text: result, lyrics_history: newHistory, status: 'in_progress' })
  }

  const refineLyrics = async () => {
    if (!lyricsChat.trim()) return
    const newHistory = [...lyricsHistory, { role: 'user', content: lyricsChat }]
    const result = await callAI(newHistory,
      'You are a creative songwriter. Adjust the lyrics based on the feedback. Output only the updated lyrics.',
      'refine')
    const updatedHistory = [...newHistory, { role: 'assistant', content: result }]
    setLyrics(result); setLyricsHistory(updatedHistory); setLyricsChat('')
    await save({ lyrics_text: result, lyrics_history: updatedHistory })
  }

  const generateSuno = async () => {
    const result = await callAI(
      [{ role: 'user', content: `Lyrics:\n\n${lyrics}` }],
      'You are a Suno AI music generator expert. Create a detailed prompt based on the lyrics. Include genre, tempo, mood, instruments, vocal style and tags in [brackets]. Write in English, max 200 words.',
      'suno')
    setSunoPrompt(result)
    await save({ suno_prompt: result })
  }

  const getCaptionLang = () => {
    if (captionLangOverride) return captionForcedLang === 'no' ? 'Norwegian' : 'English'
    return lang === 'no' ? 'Norwegian' : 'English'
  }

  const generateCaption = async (platform: string) => {
    const captionLanguage = getCaptionLang()
    const supabase = createClient()
    const { data: ruleData } = await supabase.from('platform_rules').select('custom_rules').eq('platform', platform).single()
    const customRules = ruleData?.custom_rules || ''
    const { buildPlatformSystemPrompt } = await import('@/lib/platformRules')
    const systemPrompt = buildPlatformSystemPrompt(platform as any, captionLanguage, customRules)
    const result = await callAI(
      [{ role: 'user', content: `Song title: ${title}\nArtist: ${artist?.name}\nLyrics:\n\n${lyrics}${captionTone ? `\n\nRequested tone: ${captionTone}` : ''}` }],
      systemPrompt,
      `caption_${platform}`)
    const updated = { ...captions, [platform]: result }
    setCaptions(updated)
    await save({ captions: updated })
  }

  const generateCoverPrompt = async () => {
    const result = await callAI(
      [{ role: 'user', content: `Lyrics:\n\n${lyrics}\n\nDesired style: ${coverStyle || 'free interpretation'}` }],
      'You are an expert in AI image generation (Midjourney, DALL-E, Stable Diffusion). Create a detailed cover image prompt. Include subject, style, colors, mood, lighting. Format: Subject → Style → Colors → Mood → Technical. Write in English, max 150 words.',
      'cover')
    setCoverPrompt(result)
    await save({ cover_style: coverStyle, cover_prompt: result })
  }

  const uploadCover = async (file: File) => {
    setUploadingCover(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${songId}/cover.${ext}`
    const { error } = await supabase.storage.from('covers').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('covers').getPublicUrl(path)
      setCoverImageUrl(data.publicUrl)
      await save({ cover_image_url: data.publicUrl })
    }
    setUploadingCover(false)
  }

  const addMediaLink = async () => {
    if (!newUrl.trim()) return
    const updated = [...mediaLinks, { platform: newPlatform, url: newUrl, label: newLabel || newPlatform }]
    setMediaLinks(updated); setNewUrl(''); setNewLabel('')
    await save({ media_links: updated })
  }

  const removeMediaLink = async (i: number) => {
    const updated = mediaLinks.filter((_, idx) => idx !== i)
    setMediaLinks(updated)
    await save({ media_links: updated })
  }

  const generatePublish = async (type: string) => {
    const publishLang = lang === 'no' ? 'Norwegian' : 'English'
    const systemMap: Record<string,string> = {
      wordpress: `Write a WordPress blog post in ${publishLang} about this song. Include title (# Title), intro, background, lyric analysis, listen info. Use markdown. ~400 words.`,
      facebook: `Write a Facebook post in ${publishLang} about this song. Engaging, personal, with hashtags. ~150 words.`,
      instagram: `Write an Instagram post in ${publishLang}. Visual language, storytelling, hashtags. ~120 words.`,
      press: `Write a press release in ${publishLang} about this song. Professional tone, 5W structure, artist quote. ~300 words.`,
    }
    const context = `Song: ${title}\nArtist: ${artist?.name}\nGenre: ${artist?.genre}\nLyrics:\n${lyrics}\n\nMedia: ${mediaLinks.map(l => `${l.platform}: ${l.url}`).join(', ')}`
    const result = await callAI([{ role: 'user', content: context }], systemMap[type], `publish_${type}`)
    const updated = { ...publishContent, [type]: result }
    setPublishContent(updated)
    await save({ publish_content: updated })
  }

  const updateTitle = async (val: string) => {
    setTitle(val)
    await save({ title: val })
  }

  const updateStatus = async (status: string) => {
    await save({ status })
    setSong({ ...song, status })
  }

  const copy = (text: string) => navigator.clipboard.writeText(text)

  const isLoading = (key: string) => aiLoading && aiTarget === key

  if (loading) return <div style={{ color: '#6a5a40', padding: '40px' }}>{tx.loading}</div>

  const statusOptions = [
    { value: 'draft', label: tx.draft },
    { value: 'in_progress', label: tx.inProgress },
    { value: 'complete', label: tx.complete },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(180,140,80,0.2)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href={`/artist/${artist?.id}`} style={{ color: '#6a5a40', textDecoration: 'none', fontSize: '13px' }}>← {artist?.name}</Link>
          <span style={{ color: '#3a3530' }}>|</span>
          <input value={title} onChange={e => updateTitle(e.target.value)}
            style={{ background: 'none', border: 'none', color: '#e8e0d0', fontSize: '16px', outline: 'none', width: '220px', padding: '4px 0' }} />
        </div>
        <select value={song?.status || 'draft'} onChange={e => updateStatus(e.target.value)}
          style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}>
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '16px 32px', gap: '6px', borderBottom: '1px solid rgba(180,140,80,0.1)', flexWrap: 'wrap' }}>
        {Object.entries(TAB_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '8px 16px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer',
            border: key === tab ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.15)',
            background: key === tab ? 'rgba(212,168,67,0.12)' : 'transparent',
            color: key === tab ? '#d4a843' : '#6a5a40',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>

        {/* LYRICS TAB */}
        {tab === 'lyrics' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.lyrics}</h2>

            {lyricsInstructions && !lyrics && (
              <div style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 4px', color: '#d4a843', fontSize: '13px', fontWeight: '500' }}>{tx.readyToGenerate}</p>
                  <p style={{ margin: 0, color: '#8a7a60', fontSize: '12px' }}>{tx.readyHint}</p>
                </div>
                <button className="btn-gold" onClick={generateLyrics} disabled={aiLoading}>{isLoading('lyrics') ? tx.generating : tx.generateNow}</button>
              </div>
            )}

            {/* Artist profile toggle */}
            {(artist?.genre || artist?.description || artist?.song_structure) && (
              <div style={{ background: useProfileForLyrics ? 'rgba(212,168,67,0.05)' : 'transparent', border: `1px solid ${useProfileForLyrics ? 'rgba(212,168,67,0.2)' : 'rgba(180,140,80,0.1)'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={useProfileForLyrics} onChange={e => setUseProfileForLyrics(e.target.checked)}
                    style={{ accentColor: '#d4a843', width: '14px', height: '14px' }} />
                  <span style={{ color: useProfileForLyrics ? '#d4a843' : '#6a5a40', fontSize: '13px' }}>{tx.useProfileForLyrics}</span>
                  <span style={{ color: '#5a4a30', fontSize: '12px' }}>— {tx.useProfileHint}</span>
                </label>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.instructions}</label>
              <textarea value={lyricsInstructions} onChange={e => setLyricsInstructions(e.target.value)} placeholder={tx.instructionsPlaceholder} rows={4} />
            </div>
            <button className="btn-gold" onClick={generateLyrics} disabled={aiLoading || !lyricsInstructions.trim()} style={{ marginBottom: '24px' }}>
              {isLoading('lyrics') ? tx.generating : lyrics ? tx.regenerateLyrics : tx.generateLyrics}
            </button>

            {lyrics && (
              <>
                <div className="card" style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: '#d4a843', fontSize: '11px', letterSpacing: '1px' }}>{tx.lyricsLabel}</span>
                    <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => copy(lyrics)}>📋 {tx.copy}</button>
                  </div>
                  <textarea value={lyrics} onChange={e => { setLyrics(e.target.value); save({ lyrics_text: e.target.value }) }} rows={16} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input value={lyricsChat} onChange={e => setLyricsChat(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && refineLyrics()}
                    placeholder={tx.refineHint} style={{ flex: 1 }} />
                  <button className="btn-gold" onClick={refineLyrics} disabled={aiLoading || !lyricsChat.trim()}>
                    {isLoading('refine') ? tx.generating : tx.refine}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* SUNO TAB */}
        {tab === 'suno' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.sunoTitle}</h2>
            {!lyrics && <p style={{ color: '#e07070', fontSize: '13px' }}>{tx.sunoNoLyrics}</p>}
            <button className="btn-gold" onClick={generateSuno} disabled={aiLoading || !lyrics} style={{ marginBottom: '24px' }}>
              {isLoading('suno') ? tx.generating : sunoPrompt ? tx.sunoRegenerate : tx.sunoGenerate}
            </button>
            {sunoPrompt && (
              <>
                <div className="card" style={{ marginBottom: '16px', borderColor: 'rgba(80,160,80,0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: '#7bc87b', fontSize: '11px', letterSpacing: '1px' }}>{tx.sunoLabel}</span>
                    <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => copy(sunoPrompt)}>📋 {tx.sunoCopy}</button>
                  </div>
                  <textarea value={sunoPrompt} onChange={e => { setSunoPrompt(e.target.value); save({ suno_prompt: e.target.value }) }} rows={10} />
                </div>
                <div style={{ background: 'rgba(100,140,200,0.08)', border: '1px solid rgba(100,140,200,0.2)', borderRadius: '6px', padding: '14px 18px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#8090b0' }}>
                    💡 {tx.sunoHint} <a href="https://suno.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#7090d0' }}>suno.ai</a>
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* CAPTIONS TAB */}
        {tab === 'captions' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.captionsTitle}</h2>
            {!lyrics && <p style={{ color: '#e07070', fontSize: '13px' }}>{tx.sunoNoLyrics}</p>}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.toneLabel}</label>
              <input value={captionTone} onChange={e => setCaptionTone(e.target.value)} placeholder={tx.tonePlaceholder} />
            </div>

            {/* Language override */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,80,0.15)', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: captionLangOverride ? '10px' : '0' }}>
                <input type="checkbox" checked={captionLangOverride} onChange={e => setCaptionLangOverride(e.target.checked)}
                  style={{ accentColor: '#d4a843', width: '14px', height: '14px' }} />
                <span style={{ color: captionLangOverride ? '#d4a843' : '#6a5a40', fontSize: '13px' }}>
                  {lang === 'no' ? 'Overstyr språk for captions' : 'Override language for captions'}
                </span>
                {!captionLangOverride && (
                  <span style={{ color: '#5a4a30', fontSize: '12px' }}>
                    — {lang === 'no' ? `bruker nå: Norsk` : `currently using: English`}
                  </span>
                )}
              </label>
              {captionLangOverride && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['no', 'en', 'auto'] as const).map(l => (
                    <button key={l} onClick={() => setCaptionForcedLang(l)} style={{
                      padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                      border: captionForcedLang === l ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.2)',
                      background: captionForcedLang === l ? 'rgba(212,168,67,0.15)' : 'transparent',
                      color: captionForcedLang === l ? '#d4a843' : '#6a5a40',
                    }}>
                      {l === 'no' ? '🇳🇴 Norsk' : l === 'en' ? '🇬🇧 English' : '🔀 Auto'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => generateCaption(p)} disabled={aiLoading || !lyrics} style={{
                  padding: '10px 18px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
                  background: captions[p] ? 'rgba(80,160,80,0.12)' : 'rgba(212,168,67,0.08)',
                  border: captions[p] ? '1px solid rgba(80,160,80,0.35)' : '1px solid rgba(212,168,67,0.25)',
                  color: captions[p] ? '#7bc87b' : '#d4a843',
                }}>
                  {isLoading(`caption_${p}`) ? '...' : captions[p] ? `✓ ${p}` : p}
                </button>
              ))}
            </div>

            {PLATFORMS.filter(p => captions[p]).map(p => (
              <div key={p} className="card" style={{ marginBottom: '16px', borderColor: 'rgba(80,160,80,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#7bc87b', fontSize: '11px', letterSpacing: '1px' }}>{p.toUpperCase()}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => generateCaption(p)} disabled={aiLoading}>↻</button>
                    <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => copy(captions[p])}>📋 {tx.copy}</button>
                  </div>
                </div>
                <textarea value={captions[p]} onChange={e => { const u = { ...captions, [p]: e.target.value }; setCaptions(u); save({ captions: u }) }} rows={6} />
              </div>
            ))}
          </div>
        )}

        {/* COVER TAB */}
        {tab === 'cover' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.coverTitle}</h2>
            <div className="card" style={{ marginBottom: '24px' }}>
              <p style={{ color: '#8a7a60', fontSize: '12px', letterSpacing: '1px', marginTop: 0 }}>{tx.uploadCover}</p>
              {coverImageUrl && <img src={coverImageUrl} alt="cover" style={{ width: '180px', height: '180px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px', display: 'block' }} />}
              <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])} />
              <button className="btn-outline" onClick={() => fileRef.current?.click()} disabled={uploadingCover}>
                {uploadingCover ? tx.saving : coverImageUrl ? '↻ ' + tx.edit : '📁 ' + (lang === 'no' ? 'Velg bilde' : 'Choose image')}
              </button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.coverStyleLabel}</label>
              <input value={coverStyle} onChange={e => setCoverStyle(e.target.value)} placeholder={tx.coverStylePlaceholder} />
            </div>
            <button className="btn-gold" onClick={generateCoverPrompt} disabled={aiLoading || !lyrics} style={{ marginBottom: '24px' }}>
              {isLoading('cover') ? tx.generating : coverPrompt ? '↻ ' + tx.regenerate : tx.generateCoverPrompt}
            </button>
            {coverPrompt && (
              <div className="card" style={{ borderColor: 'rgba(160,100,200,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#c07bd0', fontSize: '11px', letterSpacing: '1px' }}>{tx.coverPromptLabel}</span>
                  <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => copy(coverPrompt)}>📋 {tx.copy}</button>
                </div>
                <textarea value={coverPrompt} onChange={e => { setCoverPrompt(e.target.value); save({ cover_prompt: e.target.value }) }} rows={8} />
                <p style={{ color: '#6a5a40', fontSize: '12px', marginBottom: 0 }}>
                  {tx.coverHint} <a href="https://midjourney.com" target="_blank" rel="noopener noreferrer" style={{ color: '#9080c0' }}>Midjourney</a>, <a href="https://openai.com/dall-e" target="_blank" rel="noopener noreferrer" style={{ color: '#9080c0' }}>DALL-E</a>
                </p>
              </div>
            )}
          </div>
        )}

        {/* MEDIA TAB */}
        {tab === 'media' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.mediaTitle}</h2>
            <div className="card" style={{ marginBottom: '24px' }}>
              <p style={{ color: '#8a7a60', fontSize: '12px', letterSpacing: '1px', marginTop: 0 }}>{tx.addLink}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)} style={{ width: 'auto' }}>
                  {MEDIA_PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
                <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..." />
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder={tx.labelPlaceholder} />
              </div>
              <button className="btn-gold" onClick={addMediaLink} disabled={!newUrl.trim()}>+ {lang === 'no' ? 'Legg til' : 'Add'}</button>
            </div>
            {mediaLinks.length === 0 ? <p style={{ color: '#6a5a40', fontSize: '13px' }}>{tx.noLinks}</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {mediaLinks.map((link, i) => (
                  <div key={i} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <div>
                      <span style={{ color: '#d4a843', fontSize: '13px', marginRight: '10px' }}>{link.platform}</span>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: '#7090d0', fontSize: '13px' }}>{link.label || link.url}</a>
                    </div>
                    <button onClick={() => removeMediaLink(i)} style={{ background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', fontSize: '18px' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PUBLISH TAB */}
        {tab === 'publish' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.publishTitle}</h2>
            {!lyrics && <p style={{ color: '#e07070', fontSize: '13px' }}>{tx.sunoNoLyrics}</p>}
            {[
              { key: 'wordpress', label: tx.wordpress, color: '#7090d0' },
              { key: 'facebook', label: tx.facebook, color: '#5080d0' },
              { key: 'instagram', label: tx.instagram, color: '#d070a0' },
              { key: 'press', label: tx.press, color: '#8a7a60' },
            ].map(({ key, label, color }) => (
              <div key={key} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ color, fontSize: '13px', letterSpacing: '1px' }}>{label.toUpperCase()}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {publishContent[key] && <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => copy(publishContent[key])}>📋 {tx.copy}</button>}
                    <button className="btn-gold" onClick={() => generatePublish(key)} disabled={aiLoading || !lyrics} style={{ padding: '6px 14px', fontSize: '12px' }}>
                      {isLoading(`publish_${key}`) ? tx.generating : publishContent[key] ? '↻' : tx.generate}
                    </button>
                  </div>
                </div>
                {publishContent[key] && (
                  <textarea value={publishContent[key]} onChange={e => { const u = { ...publishContent, [key]: e.target.value }; setPublishContent(u); save({ publish_content: u }) }} rows={10} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

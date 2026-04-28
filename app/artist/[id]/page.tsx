'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'
import Link from 'next/link'

type Song = { id: string; title: string; status: string; created_at: string; lyrics_instructions: string }
type Artist = { id: string; name: string; genre: string; description: string; song_structure: string }

const STATUS_COLORS: Record<string, string> = { draft: '#8a7a60', in_progress: '#d4a843', complete: '#7bc87b' }

export default function ArtistPage() {
  const params = useParams()
  const router = useRouter()
  const artistId = params.id as string
  const [lang, setLangState] = useState<Lang>('no')
  const [artist, setArtist] = useState<Artist | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerator, setShowGenerator] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [count, setCount] = useState(3)
  const [generating, setGenerating] = useState(false)
  const [generatedSongs, setGeneratedSongs] = useState<{ title: string; instructions: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [useProfile, setUseProfile] = useState(true)

  useEffect(() => { setLangState(useLang()); fetchData() }, [artistId])
  const tx = t[lang]

  const fetchData = async () => {
    const supabase = createClient()
    const { data: a } = await supabase.from('artists').select('*').eq('id', artistId).single()
    if (a) setArtist(a)
    const { data: s } = await supabase.from('songs').select('*').eq('artist_id', artistId).order('created_at', { ascending: false })
    if (s) setSongs(s)
    setLoading(false)
  }

  const buildArtistContext = () => {
    if (!artist || !useProfile) return ''
    const parts = []
    if (artist.name) parts.push(`Artist: ${artist.name}`)
    if (artist.genre) parts.push(`Genre: ${artist.genre}`)
    if (artist.description) parts.push(`Description: ${artist.description}`)
    if (artist.song_structure) parts.push(`Song structure/profile: ${artist.song_structure}`)
    return parts.join('\n')
  }

  const generateBatch = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setGeneratedSongs([])
    const artistContext = buildArtistContext()
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: `${artistContext ? artistContext + '\n\n' : ''}User request: ${prompt}\n\nNumber of songs: ${count}` }],
        system: `You are a creative music producer and songwriter. The user describes a theme or concept for multiple songs. Your task: Create EXACTLY ${count} song proposals with title and instructions for a songwriter.\n\nRespond ONLY with valid JSON, no text around it:\n[\n  {\n    "title": "Song title here",\n    "instructions": "Detailed instructions for the songwriter: theme, mood, verse structure, specific images/metaphors, chorus idea, tone and style. At least 3-4 sentences.${artist?.song_structure && useProfile ? ' Follow the song structure profile provided.' : ''}"\n  }\n]`,
      }),
    })
    const data = await res.json()
    try {
      const clean = data.text.replace(/```json|```/g, '').trim()
      setGeneratedSongs(JSON.parse(clean))
    } catch (e) { console.error('Parse error', e) }
    setGenerating(false)
  }

  const updateGenerated = (i: number, field: 'title' | 'instructions', value: string) => {
    const updated = [...generatedSongs]
    updated[i] = { ...updated[i], [field]: value }
    setGeneratedSongs(updated)
  }

  const saveAll = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('songs').insert(
      generatedSongs.map(s => ({ artist_id: artistId, user_id: user?.id, title: s.title, lyrics_instructions: s.instructions, status: 'draft' }))
    ).select()
    if (data) { setSongs([...data, ...songs]); setShowGenerator(false); setGeneratedSongs([]); setPrompt('') }
    setSaving(false)
  }

  const deleteSong = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm(lang === 'no' ? 'Slette denne låten?' : 'Delete this song?')) return
    const supabase = createClient()
    await supabase.from('songs').delete().eq('id', id)
    setSongs(songs.filter(s => s.id !== id))
  }

  if (loading) return <div style={{ color: '#6a5a40', padding: '40px' }}>{tx.loading}</div>

  const statusLabel = (s: string) => ({ draft: tx.draft, in_progress: tx.inProgress, complete: tx.complete }[s] || s)

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)' }}>
      <div style={{ borderBottom: '1px solid rgba(180,140,80,0.2)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/dashboard" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: '13px' }}>← {tx.dashboard}</Link>
          <span style={{ color: '#3a3530' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🎤</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'normal', color: '#d4a843' }}>{artist?.name}</h1>
              {artist?.genre && <p style={{ margin: 0, fontSize: '11px', color: '#6a5a40', letterSpacing: '1px' }}>{artist.genre.toUpperCase()}</p>}
            </div>
          </div>
        </div>
        <button className="btn-gold" onClick={() => { setShowGenerator(true); setGeneratedSongs([]) }}>{tx.generateWithAI}</button>
      </div>

      <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
        {showGenerator && (
          <div className="card" style={{ marginBottom: '32px', borderColor: 'rgba(212,168,67,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: '18px' }}>{tx.aiGenerator}</h2>
              <button className="btn-outline" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => { setShowGenerator(false); setGeneratedSongs([]) }}>{tx.close}</button>
            </div>

            {/* Artist profile toggle */}
            {(artist?.genre || artist?.description || artist?.song_structure) && (
              <div style={{ background: useProfile ? 'rgba(212,168,67,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${useProfile ? 'rgba(212,168,67,0.25)' : 'rgba(180,140,80,0.1)'}`, borderRadius: '6px', padding: '12px 16px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={useProfile} onChange={e => setUseProfile(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#d4a843', cursor: 'pointer' }} />
                  <div>
                    <span style={{ color: useProfile ? '#d4a843' : '#6a5a40', fontSize: '13px', fontWeight: '500' }}>{tx.useArtistProfile}</span>
                    <span style={{ color: '#5a4a30', fontSize: '12px', marginLeft: '8px' }}>— {tx.useArtistProfileHint}</span>
                  </div>
                </label>
                {useProfile && artist?.song_structure && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(212,168,67,0.1)', color: '#5a4a30', fontSize: '12px', lineHeight: '1.5' }}>
                    🎸 {artist.song_structure.length > 120 ? artist.song_structure.slice(0, 120) + '...' : artist.song_structure}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '8px' }}>{tx.describeTheme}</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={tx.themePlaceholder} rows={4} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '10px' }}>{tx.numberOfSongs}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                  <button key={n} onClick={() => setCount(n)} style={{
                    width: '42px', height: '42px', borderRadius: '4px', cursor: 'pointer',
                    border: count === n ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.2)',
                    background: count === n ? 'rgba(212,168,67,0.15)' : 'transparent',
                    color: count === n ? '#d4a843' : '#6a5a40',
                    fontSize: '14px', fontWeight: count === n ? 'bold' : 'normal',
                  }}>{n}</button>
                ))}
              </div>
            </div>

            <button className="btn-gold" onClick={generateBatch} disabled={generating || !prompt.trim()} style={{ marginBottom: generatedSongs.length > 0 ? '28px' : '0' }}>
              {generating ? tx.planningText.replace('{n}', String(count)) : tx.generateProposals.replace('{n}', String(count))}
            </button>

            {generating && (
              <div style={{ marginTop: '20px' }}>
                {Array.from({ length: count }).map((_, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,80,0.1)', borderRadius: '6px', padding: '16px', marginBottom: '10px', opacity: 0.4 }}>
                    <div style={{ height: '14px', background: 'rgba(212,168,67,0.15)', borderRadius: '3px', width: '40%', marginBottom: '10px' }} />
                    <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', width: '90%', marginBottom: '6px' }} />
                    <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', width: '70%' }} />
                  </div>
                ))}
              </div>
            )}

            {generatedSongs.length > 0 && (
              <div>
                <p style={{ color: '#8a7a60', fontSize: '12px', letterSpacing: '1px', marginBottom: '14px' }}>{tx.proposalsLabel}</p>
                {generatedSongs.map((s, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: '8px', padding: '18px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <span style={{ color: '#d4a843', fontSize: '13px', fontWeight: 'bold', minWidth: '24px' }}>#{i + 1}</span>
                      <input value={s.title} onChange={e => updateGenerated(i, 'title', e.target.value)} style={{ fontSize: '15px', flex: 1 }} />
                    </div>
                    <textarea value={s.instructions} onChange={e => updateGenerated(i, 'instructions', e.target.value)} rows={4} style={{ fontSize: '13px', color: '#a09080' }} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-gold" onClick={saveAll} disabled={saving}>
                    {saving ? tx.saving : tx.saveAll.replace('{n}', String(generatedSongs.length))}
                  </button>
                  <button className="btn-outline" onClick={generateBatch} disabled={generating}>{tx.regenerate}</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: '16px' }}>{tx.songsCount} ({songs.length})</h2>
        </div>

        {songs.length === 0 && !showGenerator ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎵</div>
            <p style={{ color: '#8a7a60', marginBottom: '20px' }}>{tx.noSongs}</p>
            <button className="btn-gold" onClick={() => setShowGenerator(true)}>{tx.generateWithAI}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {songs.map((song, i) => (
              <Link key={song.id} href={`/song/${song.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '16px 20px', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,168,67,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(180,140,80,0.2)')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                    <span style={{ color: '#3a3530', fontSize: '13px', minWidth: '28px' }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#e8e0d0', fontSize: '15px', marginBottom: '3px' }}>{song.title}</div>
                      {song.lyrics_instructions && (
                        <div style={{ color: '#5a4a30', fontSize: '12px', lineHeight: '1.4' }}>
                          {song.lyrics_instructions.length > 100 ? song.lyrics_instructions.slice(0, 100) + '...' : song.lyrics_instructions}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', letterSpacing: '1px', color: STATUS_COLORS[song.status] || '#8a7a60', border: `1px solid ${STATUS_COLORS[song.status] || '#8a7a60'}40`, padding: '3px 10px', borderRadius: '20px' }}>
                      {statusLabel(song.status)}
                    </span>
                    <button onClick={e => deleteSong(song.id, e)} style={{ background: 'none', border: 'none', color: '#3a3530', cursor: 'pointer', fontSize: '18px', padding: '4px 8px' }}>×</button>
                    <span style={{ color: '#6a5a40', fontSize: '13px' }}>→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

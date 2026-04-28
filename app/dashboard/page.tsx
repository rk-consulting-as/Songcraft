'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, useLang, setLang, type Lang } from '@/lib/i18n'
import Link from 'next/link'

type Artist = {
  id: string
  name: string
  genre: string
  description: string
  song_structure: string
  avatar_url: string
  song_count?: number
}

const emptyForm = { name: '', genre: '', description: '', song_structure: '' }

export default function Dashboard() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>('no')
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const tx = t[lang]

  useEffect(() => {
    setLangState(useLang())
    checkAuth()
    fetchArtists()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
  }

  const fetchArtists = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('artists').select('*, songs(count)').order('created_at', { ascending: false })
    if (data) setArtists(data.map((a: any) => ({ ...a, song_count: a.songs?.[0]?.count ?? 0 })))
    setLoading(false)
  }

  const openCreate = () => {
    setEditingArtist(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (artist: Artist, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingArtist(artist)
    setForm({ name: artist.name, genre: artist.genre || '', description: artist.description || '', song_structure: artist.song_structure || '' })
    setShowForm(true)
  }

  const saveArtist = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (editingArtist) {
      const { data } = await supabase.from('artists').update(form).eq('id', editingArtist.id).select().single()
      if (data) setArtists(artists.map(a => a.id === editingArtist.id ? { ...a, ...data } : a))
    } else {
      const { data } = await supabase.from('artists').insert({ ...form, user_id: user?.id }).select().single()
      if (data) setArtists([{ ...data, song_count: 0 }, ...artists])
    }
    setShowForm(false)
    setForm(emptyForm)
    setSaving(false)
  }

  const deleteArtist = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(tx.confirmDeleteArtist)) return
    const supabase = createClient()
    await supabase.from('artists').delete().eq('id', id)
    setArtists(artists.filter(a => a.id !== id))
  }

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const changeLang = (l: Lang) => {
    setLang(l)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(180,140,80,0.2)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>🎼</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'normal', color: '#d4a843', letterSpacing: '2px' }}>SONGCRAFT</h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#6a5a40', letterSpacing: '2px' }}>{tx.dashboard.toUpperCase()}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/settings" className="btn-outline" style={{ fontSize: '13px', textDecoration: 'none', padding: '10px 20px', display: 'inline-block' }}>⚙ {tx.settings}</Link>
          <button className="btn-outline" onClick={logout} style={{ fontSize: '13px' }}>{tx.logout}</button>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: tx.artists, value: artists.length },
            { label: tx.totalSongs, value: artists.reduce((s, a) => s + (a.song_count || 0), 0) },
            { label: tx.activeProjects, value: artists.filter(a => (a.song_count || 0) > 0).length },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#d4a843' }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: '#6a5a40', letterSpacing: '1px', marginTop: '4px' }}>{stat.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Artists header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: '18px' }}>{tx.yourArtists}</h2>
          <button className="btn-gold" onClick={openCreate}>{tx.newArtist}</button>
        </div>

        {/* Artist form modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', borderColor: 'rgba(212,168,67,0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: '18px' }}>
                  {editingArtist ? tx.editArtist : tx.createArtist}
                </h3>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', fontSize: '20px' }}>×</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.artistName.toUpperCase()} *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={tx.artistNamePlaceholder} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.genre.toUpperCase()}</label>
                  <input value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} placeholder={tx.genrePlaceholder} />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.description.toUpperCase()}</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={tx.descriptionPlaceholder} rows={3} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>
                  {tx.songStructure.toUpperCase()}
                </label>
                <textarea value={form.song_structure} onChange={e => setForm({ ...form, song_structure: e.target.value })} placeholder={tx.songStructurePlaceholder} rows={6} />
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#5a4a30', lineHeight: '1.5' }}>💡 {tx.songStructureHint}</p>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-gold" onClick={saveArtist} disabled={saving || !form.name.trim()}>
                    {saving ? tx.saving : editingArtist ? tx.save : tx.createArtist}
                  </button>
                  <button className="btn-outline" onClick={() => setShowForm(false)}>{tx.cancel}</button>
                </div>
                {editingArtist && (
                  <button onClick={e => { deleteArtist(editingArtist.id, e); setShowForm(false) }} style={{ background: 'none', border: '1px solid rgba(200,80,80,0.3)', color: '#c05050', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    {tx.deleteArtist}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Artist grid */}
        {loading ? (
          <p style={{ color: '#6a5a40' }}>{tx.loading}</p>
        ) : artists.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎤</div>
            <p style={{ color: '#8a7a60', marginBottom: '20px' }}>{tx.noArtists}</p>
            <button className="btn-gold" onClick={openCreate}>{tx.newArtist}</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {artists.map(artist => (
              <Link key={artist.id} href={`/artist/${artist.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.2s', position: 'relative' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,168,67,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(180,140,80,0.2)')}>

                  {/* Edit button */}
                  <button onClick={e => openEdit(artist, e)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(180,140,80,0.2)', color: '#6a5a40', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#d4a843'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6a5a40'}>
                    ✏️
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🎤</div>
                    <div>
                      <div style={{ color: '#e8e0d0', fontWeight: '500', fontSize: '16px' }}>{artist.name}</div>
                      {artist.genre && <div style={{ color: '#8a7a60', fontSize: '12px', marginTop: '2px' }}>{artist.genre}</div>}
                    </div>
                  </div>

                  {artist.description && (
                    <p style={{ color: '#6a5a40', fontSize: '13px', margin: '0 0 10px', lineHeight: '1.5' }}>
                      {artist.description.length > 80 ? artist.description.slice(0, 80) + '...' : artist.description}
                    </p>
                  )}

                  {artist.song_structure && (
                    <div style={{ background: 'rgba(212,168,67,0.05)', border: '1px solid rgba(212,168,67,0.1)', borderRadius: '4px', padding: '6px 10px', marginBottom: '10px' }}>
                      <span style={{ color: '#6a5a40', fontSize: '11px' }}>🎸 {artist.song_structure.length > 60 ? artist.song_structure.slice(0, 60) + '...' : artist.song_structure}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#d4a843', fontSize: '12px' }}>
                      {artist.song_count} {artist.song_count === 1 ? tx.song : tx.songs}
                    </span>
                    <span style={{ color: '#6a5a40', fontSize: '12px' }}>{tx.openArtist}</span>
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

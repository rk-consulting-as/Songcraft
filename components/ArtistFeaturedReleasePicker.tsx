'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { CreatorPageSettings, FeaturedReleaseRef } from '@/lib/creatorIdentity'
import { t, useLang } from '@/lib/i18n'

type Song = { id: string; title: string; public_hidden?: boolean | null }
type Album = { id: string; title: string }

type Props = {
  artistId: string
  pageSettings: CreatorPageSettings | null | undefined
  songs: Song[]
  albums: Album[]
  onSaved: (settings: CreatorPageSettings) => void
}

export default function ArtistFeaturedReleasePicker({ artistId, pageSettings, songs, albums, onSaved }: Props) {
  const lang = useLang()
  const tx = t[lang] as Record<string, string>
  const current = pageSettings?.featured_release
  const [type, setType] = useState<'song' | 'album' | ''>(current?.type || '')
  const [itemId, setItemId] = useState(current?.id || '')
  const [saving, setSaving] = useState(false)

  const publicSongs = songs.filter(s => !s.public_hidden)

  const save = async (nextRef: FeaturedReleaseRef | null) => {
    setSaving(true)
    const supabase = createClient()
    const nextSettings: CreatorPageSettings = {
      ...(pageSettings || {}),
      featured_release: nextRef,
    }
    const { error } = await supabase.from('artists').update({ page_settings: nextSettings }).eq('id', artistId)
    setSaving(false)
    if (!error) onSaved(nextSettings)
  }

  const handleApply = () => {
    if (!type || !itemId) {
      save(null)
      return
    }
    save({ type: type as 'song' | 'album', id: itemId })
  }

  const handleClear = () => {
    setType('')
    setItemId('')
    save(null)
  }

  return (
    <div className="card workspace-card" style={{ marginTop: 16 }}>
      <h3 className="workspace-section-title" style={{ fontSize: 14, marginBottom: 8 }}>{tx.featuredReleaseTitle}</h3>
      <p style={{ color: '#8a7a60', fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>{tx.featuredReleaseDesc}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button type="button" className={type === 'song' ? 'btn-gold' : 'btn-outline'} onClick={() => { setType('song'); setItemId('') }}>
          {tx.featuredReleaseSong}
        </button>
        <button type="button" className={type === 'album' ? 'btn-gold' : 'btn-outline'} onClick={() => { setType('album'); setItemId('') }}>
          {tx.featuredReleaseAlbum}
        </button>
      </div>

      {type === 'song' && (
        <select value={itemId} onChange={e => setItemId(e.target.value)} style={{ width: '100%', marginBottom: 12 }}>
          <option value="">{tx.featuredReleaseSelect}</option>
          {publicSongs.map(s => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      )}

      {type === 'album' && (
        <select value={itemId} onChange={e => setItemId(e.target.value)} style={{ width: '100%', marginBottom: 12 }}>
          <option value="">{tx.featuredReleaseSelect}</option>
          {albums.map(a => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn-gold" onClick={handleApply} disabled={saving}>
          {saving ? tx.saving : tx.save}
        </button>
        {current && (
          <button type="button" className="btn-outline" onClick={handleClear} disabled={saving}>
            {tx.featuredReleaseClear}
          </button>
        )}
      </div>
    </div>
  )
}

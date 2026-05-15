'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'
import { markdownToHtml } from '@/lib/markdown'
import Link from 'next/link'

type Service = { title: string; description?: string }
type Project = { title: string; description?: string; image_url?: string; link_url?: string }

type StudioPage = {
  id: string
  user_id: string
  slug: string
  enabled: boolean
  name: string
  tagline: string | null
  bio: string | null
  hero_image_url: string | null
  favicon_url: string | null
  accent_color: string | null
  contact_email: string | null
  show_contact_form: boolean
  services: Service[]
  featured_projects: Project[]
  featured_artist_ids: string[]
  social_links: Record<string, { url?: string; handle?: string }>
  sections: Record<string, boolean>
}

type Submission = {
  id: string
  from_name: string
  from_email: string
  message: string
  read_at: string | null
  archived_at: string | null
  created_at: string
}

const DEFAULT_SECTIONS = { hero: true, bio: true, services: true, artists: true, projects: true, contact: true, social: true }

const slugify = (s: string) => s.toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 60)

export default function StudioSettings() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>('no')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState<StudioPage | null>(null)
  const [artists, setArtists] = useState<{ id: string; name: string; avatar_url: string | null; spotify_image_url: string | null }[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [bioPreview, setBioPreview] = useState(false)
  const [tab, setTab] = useState<'edit' | 'inbox'>('edit')
  const [heroFileUploading, setHeroFileUploading] = useState(false)
  const heroFileRef = useRef<HTMLInputElement | null>(null)
  const [faviconUploading, setFaviconUploading] = useState(false)
  const faviconFileRef = useRef<HTMLInputElement | null>(null)

  const tx = t[lang]

  useEffect(() => { setLangState(useLang()); init() }, [])

  const init = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const userId = session.user.id
    const [pageRes, artistsRes] = await Promise.all([
      supabase.from('studio_pages').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('artists').select('id, name, avatar_url, spotify_image_url').eq('user_id', userId).order('name'),
    ])
    if (artistsRes.data) setArtists(artistsRes.data as any)
    if (pageRes.data) {
      setPage({
        ...pageRes.data,
        services: pageRes.data.services || [],
        featured_projects: pageRes.data.featured_projects || [],
        featured_artist_ids: pageRes.data.featured_artist_ids || [],
        social_links: pageRes.data.social_links || {},
        sections: { ...DEFAULT_SECTIONS, ...(pageRes.data.sections || {}) },
      } as StudioPage)
      // Load inbox.
      const { data: subs } = await supabase.from('contact_submissions')
        .select('*').eq('studio_page_id', pageRes.data.id).order('created_at', { ascending: false })
      if (subs) setSubmissions(subs as Submission[])
    } else {
      // First-time setup: stub a fresh page locally (not persisted yet).
      setPage({
        id: '', user_id: userId, slug: '', enabled: false, name: '', tagline: '',
        bio: '', hero_image_url: '', favicon_url: '', accent_color: '#d4a843', contact_email: '',
        show_contact_form: true, services: [], featured_projects: [],
        featured_artist_ids: [], social_links: {}, sections: { ...DEFAULT_SECTIONS },
      })
    }
    setLoading(false)
  }

  const update = (patch: Partial<StudioPage>) => setPage(p => p ? { ...p, ...patch } : p)

  // Hero image upload via Storage covers/studio/{user_id}/{ts}.{ext}
  const uploadHero = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setHeroFileUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const path = `studio/${user?.id || 'anon'}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('covers').upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data } = supabase.storage.from('covers').getPublicUrl(path)
      update({ hero_image_url: data.publicUrl })
    } else {
      alert(error.message)
    }
    setHeroFileUploading(false)
  }

  // Favicon upload — same pattern, separate path so it's easy to find later.
  const uploadFavicon = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setFaviconUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const path = `favicons/${user?.id || 'anon'}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('covers').upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data } = supabase.storage.from('covers').getPublicUrl(path)
      update({ favicon_url: data.publicUrl })
    } else {
      alert(error.message)
    }
    setFaviconUploading(false)
  }

  const save = async () => {
    if (!page) return
    if (page.enabled && !page.slug.trim()) {
      alert(tx.studioSlugRequired); return
    }
    if (!page.name.trim()) {
      alert(tx.studioNameRequired); return
    }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const payload: any = {
      user_id: user?.id,
      slug: page.slug.trim() || null,
      enabled: page.enabled,
      name: page.name.trim(),
      tagline: page.tagline || null,
      bio: page.bio || null,
      hero_image_url: page.hero_image_url || null,
      favicon_url: page.favicon_url || null,
      accent_color: page.accent_color || '#d4a843',
      contact_email: page.contact_email || null,
      show_contact_form: page.show_contact_form,
      services: page.services,
      featured_projects: page.featured_projects,
      featured_artist_ids: page.featured_artist_ids,
      social_links: page.social_links,
      sections: page.sections,
    }
    let res: { data: any; error: any }
    if (page.id) {
      res = await supabase.from('studio_pages').update(payload).eq('id', page.id).select().single()
    } else {
      res = await supabase.from('studio_pages').insert(payload).select().single()
    }
    if (res.error) {
      if (res.error.code === '23505' && /slug/.test(res.error.message || '')) alert(tx.studioSlugTaken)
      else alert(res.error.message || 'Save failed')
    } else if (res.data) {
      setPage({ ...page, id: res.data.id })
      alert(tx.studioSaved)
    }
    setSaving(false)
  }

  const toggleArtist = (id: string) => {
    if (!page) return
    const cur = page.featured_artist_ids
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
    update({ featured_artist_ids: next })
  }

  const updateService = (i: number, patch: Partial<Service>) => {
    if (!page) return
    const next = [...page.services]; next[i] = { ...next[i], ...patch }
    update({ services: next })
  }
  const addService = () => page && update({ services: [...page.services, { title: '', description: '' }] })
  const removeService = (i: number) => page && update({ services: page.services.filter((_, idx) => idx !== i) })

  const updateProject = (i: number, patch: Partial<Project>) => {
    if (!page) return
    const next = [...page.featured_projects]; next[i] = { ...next[i], ...patch }
    update({ featured_projects: next })
  }
  const addProject = () => page && update({ featured_projects: [...page.featured_projects, { title: '', description: '', image_url: '', link_url: '' }] })
  const removeProject = (i: number) => page && update({ featured_projects: page.featured_projects.filter((_, idx) => idx !== i) })

  const updateSocial = (key: string, url: string) => {
    if (!page) return
    const next = { ...page.social_links }
    if (url.trim()) next[key] = { url: url.trim() }
    else delete next[key]
    update({ social_links: next })
  }

  const markSubmissionRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('contact_submissions').update({ read_at: new Date().toISOString() }).eq('id', id)
    setSubmissions(submissions.map(s => s.id === id ? { ...s, read_at: new Date().toISOString() } : s))
  }
  const archiveSubmission = async (id: string) => {
    const supabase = createClient()
    await supabase.from('contact_submissions').update({ archived_at: new Date().toISOString() }).eq('id', id)
    setSubmissions(submissions.filter(s => s.id !== id))
  }

  if (loading) return <div style={{ color: '#6a5a40', padding: 40 }}>{tx.loading}</div>
  if (!page) return null

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)' }}>
      <div className="app-header" data-header="page" style={{ borderBottom: '1px solid rgba(180,140,80,0.2)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: 13 }}>← {tx.dashboard}</Link>
          <span style={{ color: '#3a3530' }}>|</span>
          <h1 style={{ margin: 0, fontSize: 18, color: '#d4a843', fontWeight: 'normal' }}>🌐 {tx.studioPageTitle}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {page.enabled && page.slug && (
            <a href={`/studio/${page.slug}`} target="_blank" rel="noopener noreferrer"
              style={{ padding: '8px 16px', background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.3)', color: '#d4a843', borderRadius: 4, textDecoration: 'none', fontSize: 13 }}>
              {tx.studioOpenLive} ↗
            </a>
          )}
          <button className="btn-gold" onClick={save} disabled={saving}>
            {saving ? tx.saving : tx.save}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '12px 32px', gap: 6, borderBottom: '1px solid rgba(180,140,80,0.1)' }}>
        {(['edit', 'inbox'] as const).map(k => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '8px 18px', borderRadius: 4, fontSize: 13, cursor: 'pointer',
            border: tab === k ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.15)',
            background: tab === k ? 'rgba(212,168,67,0.12)' : 'transparent',
            color: tab === k ? '#d4a843' : '#6a5a40',
          }}>
            {k === 'edit' ? '✏️ ' + tx.studioTabEdit : `📬 ${tx.studioTabInbox} (${submissions.filter(s => !s.read_at).length})`}
          </button>
        ))}
      </div>

      <div className="page-pad" style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
        {tab === 'edit' && (
          <>
            {/* Publish toggle + slug */}
            <div className="card" style={{ marginBottom: 22, borderColor: 'rgba(212,168,67,0.3)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: page.enabled ? 14 : 0 }}>
                <input type="checkbox" checked={page.enabled} onChange={e => {
                  const enabled = e.target.checked
                  update({ enabled, slug: enabled && !page.slug ? slugify(page.name) : page.slug })
                }} style={{ width: 18, height: 18, accentColor: '#d4a843' }} />
                <div>
                  <div style={{ color: page.enabled ? '#d4a843' : '#8a7a60', fontSize: 14, fontWeight: 500 }}>{tx.studioPublish}</div>
                  <div style={{ color: '#5a4a30', fontSize: 12 }}>{tx.studioPublishHint}</div>
                </div>
              </label>
              {page.enabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#5a4a30', fontSize: 12 }}>/studio/</span>
                  <input value={page.slug} onChange={e => update({ slug: slugify(e.target.value) })} placeholder="mitt-firma" style={{ flex: 1, padding: '6px 10px', fontSize: 13 }} />
                </div>
              )}
            </div>

            {/* Template picker */}
            {page.enabled && (
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', color: '#8a7a60', fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>
                  {tx.studioTemplateLabel}
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { key: 'default',  label: tx.templateDefault,  emoji: '🪟', hint: tx.templateStudioDefaultHint },
                    { key: 'minimal',  label: tx.templateMinimal,  emoji: '◇',  hint: tx.templateStudioMinimalHint },
                    { key: 'magazine', label: tx.templateMagazine, emoji: '📰', hint: tx.templateStudioMagazineHint },
                  ].map(t => {
                    const active = ((page as any).template || 'default') === t.key
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => update({ template: t.key } as any)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: active ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.2)',
                          background: active ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.02)',
                          color: active ? '#d4a843' : '#a09080',
                          cursor: 'pointer',
                          fontSize: 12,
                          textAlign: 'left',
                          minWidth: 140,
                        }}
                      >
                        <div style={{ fontSize: 14, marginBottom: 2 }}>{t.emoji} {t.label}</div>
                        <div style={{ fontSize: 10, color: active ? '#d4a843' : '#6a5a40', opacity: 0.8 }}>{t.hint}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Hero */}
            <Section title={tx.studioSectionHero}>
              <Field label={tx.studioName + ' *'}>
                <input value={page.name} onChange={e => update({ name: e.target.value })} placeholder={tx.studioNamePlaceholder} />
              </Field>
              <Field label={tx.studioTagline}>
                <input value={page.tagline || ''} onChange={e => update({ tagline: e.target.value })} placeholder={tx.studioTaglinePlaceholder} maxLength={140} />
              </Field>
              <Field label={tx.studioHeroImage}>
                <input value={page.hero_image_url || ''} onChange={e => update({ hero_image_url: e.target.value })} placeholder="https://..." />
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input ref={heroFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadHero(f); if (e.target) e.target.value = '' }} />
                  <button type="button" className="btn-outline" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => heroFileRef.current?.click()} disabled={heroFileUploading}>
                    {heroFileUploading ? tx.saving : '📁 ' + tx.studioHeroUpload}
                  </button>
                  {page.hero_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={page.hero_image_url} alt="" style={{ width: 100, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                  )}
                </div>
              </Field>
              <Field label={tx.studioAccentColor}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={page.accent_color || '#d4a843'} onChange={e => update({ accent_color: e.target.value })} style={{ width: 50, height: 34, padding: 0, cursor: 'pointer' }} />
                  <input value={page.accent_color || '#d4a843'} onChange={e => update({ accent_color: e.target.value })} style={{ flex: 1 }} />
                </div>
              </Field>
              <Field label={tx.studioFavicon}>
                <input value={page.favicon_url || ''} onChange={e => update({ favicon_url: e.target.value })} placeholder="https://..." />
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input ref={faviconFileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/x-icon,image/vnd.microsoft.icon" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadFavicon(f); if (e.target) e.target.value = '' }} />
                  <button type="button" className="btn-outline" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => faviconFileRef.current?.click()} disabled={faviconUploading}>
                    {faviconUploading ? tx.saving : '📁 ' + tx.studioFaviconUpload}
                  </button>
                  {page.favicon_url && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={page.favicon_url} alt="" style={{ width: 16, height: 16, objectFit: 'cover', borderRadius: 2, border: '1px solid rgba(180,140,80,0.3)' }} title="16×16" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={page.favicon_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(180,140,80,0.3)' }} title="32×32" />
                      <button type="button" className="btn-outline" style={{ padding: '6px 14px', fontSize: 12, color: '#c05050', borderColor: 'rgba(200,80,80,0.25)' }}
                        onClick={() => update({ favicon_url: '' })}>
                        {tx.studioFaviconRemove}
                      </button>
                    </>
                  )}
                </div>
                <p style={{ color: '#5a4a30', fontSize: 11, margin: '6px 0 0' }}>{tx.studioFaviconHint}</p>
              </Field>
            </Section>

            {/* Bio */}
            <Section title={tx.studioSectionBio}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: '#5a4a30', fontSize: 11 }}>{tx.studioBioHint}</span>
                <button type="button" onClick={() => setBioPreview(p => !p)} style={{ background: 'none', border: '1px solid rgba(180,140,80,0.2)', color: '#8a7a60', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                  {bioPreview ? tx.studioBioEdit : tx.studioBioPreview}
                </button>
              </div>
              {bioPreview ? (
                <div dangerouslySetInnerHTML={{ __html: markdownToHtml(page.bio || '') }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,80,0.2)', borderRadius: 4, padding: 14, color: '#c8c0b0', fontSize: 14, lineHeight: 1.7, minHeight: 120 }} />
              ) : (
                <textarea value={page.bio || ''} onChange={e => update({ bio: e.target.value })} placeholder={tx.studioBioPlaceholder} rows={10} />
              )}
            </Section>

            {/* Services */}
            <Section title={tx.studioSectionServices}>
              {page.services.map((sv, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, marginBottom: 8, alignItems: 'start' }}>
                  <input value={sv.title} onChange={e => updateService(i, { title: e.target.value })} placeholder={tx.studioServiceTitle} />
                  <input value={sv.description || ''} onChange={e => updateService(i, { description: e.target.value })} placeholder={tx.studioServiceDescription} />
                  <button onClick={() => removeService(i)} style={{ background: 'none', border: '1px solid rgba(200,80,80,0.2)', color: '#c05050', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>×</button>
                </div>
              ))}
              <button onClick={addService} className="btn-outline" style={{ padding: '6px 14px', fontSize: 12, marginTop: 4 }}>+ {tx.studioServiceAdd}</button>
            </Section>

            {/* Featured projects */}
            <Section title={tx.studioSectionProjects}>
              {page.featured_projects.map((pr, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,80,0.15)', borderRadius: 6, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                    <input value={pr.title} onChange={e => updateProject(i, { title: e.target.value })} placeholder={tx.studioProjectTitle} />
                    <button onClick={() => removeProject(i)} style={{ background: 'none', border: '1px solid rgba(200,80,80,0.2)', color: '#c05050', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>×</button>
                  </div>
                  <textarea value={pr.description || ''} onChange={e => updateProject(i, { description: e.target.value })} placeholder={tx.studioProjectDescription} rows={2} style={{ marginTop: 8 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                    <input value={pr.image_url || ''} onChange={e => updateProject(i, { image_url: e.target.value })} placeholder={tx.studioProjectImageUrl} />
                    <input value={pr.link_url || ''} onChange={e => updateProject(i, { link_url: e.target.value })} placeholder={tx.studioProjectLinkUrl} />
                  </div>
                </div>
              ))}
              <button onClick={addProject} className="btn-outline" style={{ padding: '6px 14px', fontSize: 12, marginTop: 4 }}>+ {tx.studioProjectAdd}</button>
            </Section>

            {/* Artists */}
            <Section title={tx.studioSectionArtists}>
              {artists.length === 0 ? (
                <p style={{ color: '#6a5a40', fontSize: 13 }}>{tx.studioNoArtists}</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {artists.map(a => {
                    const checked = page.featured_artist_ids.includes(a.id)
                    const cover = a.spotify_image_url || a.avatar_url
                    return (
                      <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: checked ? 'rgba(212,168,67,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${checked ? 'rgba(212,168,67,0.3)' : 'rgba(180,140,80,0.15)'}`, borderRadius: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleArtist(a.id)} style={{ accentColor: '#d4a843' }} />
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(212,168,67,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎤</span>
                        )}
                        <span style={{ fontSize: 13, color: '#e8e0d0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </Section>

            {/* Social */}
            <Section title={tx.studioSectionSocial}>
              {(['spotify', 'youtube', 'instagram', 'tiktok', 'linkedin', 'website'] as const).map(key => (
                <Field key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                  <input value={page.social_links[key]?.url || ''} onChange={e => updateSocial(key, e.target.value)} placeholder="https://..." />
                </Field>
              ))}
            </Section>

            {/* Contact */}
            <Section title={tx.studioSectionContact}>
              <Field label={tx.studioContactEmail}>
                <input type="email" value={page.contact_email || ''} onChange={e => update({ contact_email: e.target.value })} placeholder="kontakt@dittfirma.no" />
              </Field>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={page.show_contact_form} onChange={e => update({ show_contact_form: e.target.checked })} style={{ accentColor: '#d4a843' }} />
                <span style={{ color: '#8a7a60', fontSize: 13 }}>{tx.studioShowContactForm}</span>
              </label>
              <p style={{ color: '#5a4a30', fontSize: 11, marginTop: 8 }}>{tx.studioContactEmailHint}</p>
            </Section>

            {/* Section visibility */}
            <Section title={tx.studioSectionVisibility}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(['hero', 'bio', 'services', 'artists', 'projects', 'contact', 'social'] as const).map(key => {
                  const on = page.sections[key] !== false
                  return (
                    <button key={key} onClick={() => update({ sections: { ...page.sections, [key]: !on } })} style={{
                      padding: '6px 14px', borderRadius: 14, fontSize: 12, cursor: 'pointer',
                      border: `1px solid ${on ? 'rgba(212,168,67,0.5)' : 'rgba(180,140,80,0.2)'}`,
                      background: on ? 'rgba(212,168,67,0.15)' : 'transparent',
                      color: on ? '#d4a843' : '#5a4a30',
                    }}>{on ? '✓' : '○'} {key}</button>
                  )
                })}
              </div>
            </Section>

            <div style={{ display: 'flex', gap: 10, marginTop: 30 }}>
              <button className="btn-gold" onClick={save} disabled={saving}>{saving ? tx.saving : tx.save}</button>
              {page.enabled && page.slug && (
                <a href={`/studio/${page.slug}`} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  {tx.studioOpenLive} ↗
                </a>
              )}
            </div>
          </>
        )}

        {tab === 'inbox' && (
          <div>
            {submissions.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 50 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                <p style={{ color: '#8a7a60', margin: 0 }}>{tx.studioInboxEmpty}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {submissions.map(sub => (
                  <div key={sub.id} style={{ background: sub.read_at ? 'rgba(255,255,255,0.02)' : 'rgba(212,168,67,0.06)', border: `1px solid ${sub.read_at ? 'rgba(180,140,80,0.15)' : 'rgba(212,168,67,0.3)'}`, borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      <div>
                        <div style={{ color: '#e8e0d0', fontSize: 14, fontWeight: 500 }}>
                          {!sub.read_at && <span style={{ color: '#d4a843', marginRight: 6 }}>●</span>}
                          {sub.from_name}
                        </div>
                        <a href={`mailto:${sub.from_email}`} style={{ color: '#7090d0', fontSize: 12, textDecoration: 'none' }}>{sub.from_email}</a>
                      </div>
                      <div style={{ color: '#5a4a30', fontSize: 11 }}>
                        {new Date(sub.created_at).toLocaleString()}
                      </div>
                    </div>
                    <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap', color: '#c8c0b0', fontSize: 13, lineHeight: 1.5 }}>{sub.message}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <a href={`mailto:${sub.from_email}?subject=Re: din henvendelse`} className="btn-outline" style={{ padding: '4px 12px', fontSize: 12, textDecoration: 'none' }}>↩ {tx.studioInboxReply}</a>
                      {!sub.read_at && (
                        <button onClick={() => markSubmissionRead(sub.id)} className="btn-outline" style={{ padding: '4px 12px', fontSize: 12 }}>✓ {tx.studioInboxMarkRead}</button>
                      )}
                      <button onClick={() => archiveSubmission(sub.id)} className="btn-outline" style={{ padding: '4px 12px', fontSize: 12, color: '#c05050', borderColor: 'rgba(200,80,80,0.25)' }}>{tx.studioInboxArchive}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 22 }}>
      <h2 style={{ margin: '0 0 16px', color: '#d4a843', fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase' }}>{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', color: '#8a7a60', fontSize: 11, letterSpacing: 1, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

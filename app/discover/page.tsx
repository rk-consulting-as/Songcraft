'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import { CREATOR_ROLES, CREATOR_LANGUAGES, NORDIC_LOCATIONS } from '@/lib/creatorRoles'
import { t, useLang, type Lang } from '@/lib/i18n'

type Creator = {
  id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  referral_code: string
  roles: string[] | null
  location: string | null
  languages: string[] | null
  open_to_collab: boolean
  total_points: number
}

export default function DiscoverPage() {
  const [lang, setLangState] = useState<Lang>('en')
  const [loading, setLoading] = useState(true)
  const [creators, setCreators] = useState<Creator[]>([])
  const [search, setSearch] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedLangs, setSelectedLangs] = useState<string[]>([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [onlyCollab, setOnlyCollab] = useState(false)

  useEffect(() => { setLangState(useLang()); fetchCreators() }, [])

  const tx = t[lang]

  const fetchCreators = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, bio, avatar_url, referral_code, roles, location, languages, open_to_collab, total_points')
      .eq('visible_in_catalog', true)
      .order('total_points', { ascending: false })
      .limit(200)
    if (data) setCreators(data as Creator[])
    setLoading(false)
  }

  const toggleRole = (key: string) => setSelectedRoles(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  const toggleLang = (key: string) => setSelectedLangs(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const filtered = useMemo(() => {
    return creators.filter(c => {
      // Hide empty profiles to avoid a wall of "?" avatars
      if (!c.display_name && (!c.roles || c.roles.length === 0)) return false
      if (onlyCollab && !c.open_to_collab) return false
      if (selectedLocation && (c.location || '').toLowerCase() !== selectedLocation.toLowerCase()) return false
      if (selectedRoles.length > 0) {
        const has = (c.roles || []).some(r => selectedRoles.includes(r))
        if (!has) return false
      }
      if (selectedLangs.length > 0) {
        const has = (c.languages || []).some(l => selectedLangs.includes(l))
        if (!has) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const hay = `${c.display_name || ''} ${c.bio || ''} ${c.referral_code} ${(c.location || '')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [creators, search, selectedRoles, selectedLangs, selectedLocation, onlyCollab])

  // Unique locations from data for the filter dropdown
  const locationOptions = useMemo(() => {
    const set = new Set<string>()
    for (const c of creators) if (c.location) set.add(c.location)
    return Array.from(set).sort()
  }, [creators])

  const accent = '#d4a843'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)',
      color: '#e8e0d0',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(180,140,80,0.2)',
        padding: '14px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Link href="/" style={{ color: accent, textDecoration: 'none', fontSize: 14, letterSpacing: 2 }}>
          SONGCRAFT
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/dashboard" style={{ color: '#8a7a60', textDecoration: 'none', fontSize: 13 }}>
            {tx.dashboard}
          </Link>
          <Link href="/login" style={{ color: accent, textDecoration: 'none', fontSize: 13 }}>
            {tx.login}
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ color: accent, fontSize: 32, fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>
            🌍 {tx.discoverTitle}
          </h1>
          <p style={{ color: '#a09080', fontSize: 15, marginTop: 10, maxWidth: 580, margin: '10px auto 0' }}>
            {tx.discoverSubtitle}
          </p>
        </div>

        {/* Search + filters */}
        <div className="card" style={{ marginBottom: 20 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tx.discoverSearchPlaceholder}
            style={{ width: '100%', boxSizing: 'border-box', fontSize: 15, padding: '12px 14px' }}
          />

          <div style={{ marginTop: 14 }}>
            <div style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              {tx.discoverFilterRoles}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CREATOR_ROLES.map(r => {
                const active = selectedRoles.includes(r.key)
                return (
                  <button
                    key={r.key}
                    onClick={() => toggleRole(r.key)}
                    style={chip(active, accent)}
                  >
                    {r.emoji} {tx[r.labelKey as keyof typeof tx] as string || r.key}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                {tx.discoverFilterLangs}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CREATOR_LANGUAGES.map(l => {
                  const active = selectedLangs.includes(l.key)
                  return (
                    <button key={l.key} onClick={() => toggleLang(l.key)} style={chip(active, accent)}>
                      {l.flag} {tx[l.labelKey as keyof typeof tx] as string || l.key}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ flex: '0 1 200px' }}>
              <div style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                {tx.discoverFilterLocation}
              </div>
              <select
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                <option value="">{tx.discoverAllLocations}</option>
                {locationOptions.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#a09080', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={onlyCollab}
                onChange={e => setOnlyCollab(e.target.checked)}
              />
              🤝 {tx.discoverOnlyCollab}
            </label>
          </div>
        </div>

        <div style={{ color: '#6a5a40', fontSize: 12, marginBottom: 16 }}>
          {filtered.length} {filtered.length === 1 ? tx.discoverCreator : tx.discoverCreators}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#6a5a40', padding: 40 }}>{tx.loading}</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 50 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <p style={{ color: '#8a7a60' }}>{tx.discoverNoMatches}</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 14,
          }}>
            {filtered.map(c => (
              <Link key={c.id} href={`/u/${c.referral_code}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color 0.2s' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Avatar value={c.avatar_url} name={c.display_name} seed={c.id} size={52} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: '#e8e0d0', fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.display_name || c.referral_code}
                      </div>
                      {c.location && (
                        <div style={{ color: '#8a7a60', fontSize: 11, marginTop: 2 }}>📍 {c.location}</div>
                      )}
                    </div>
                  </div>
                  {c.bio && (
                    <p style={{ color: '#a09080', fontSize: 12, margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {c.bio}
                    </p>
                  )}
                  {(c.roles || []).length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
                      {(c.roles || []).slice(0, 4).map(rk => {
                        const r = CREATOR_ROLES.find(x => x.key === rk)
                        if (!r) return null
                        return (
                          <span key={rk} style={{
                            background: 'rgba(212,168,67,0.08)',
                            border: '1px solid rgba(212,168,67,0.25)',
                            color: accent,
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 10,
                          }}>
                            {r.emoji} {tx[r.labelKey as keyof typeof tx] as string || rk}
                          </span>
                        )
                      })}
                      {(c.roles || []).length > 4 && (
                        <span style={{ color: '#6a5a40', fontSize: 11, padding: '2px 4px' }}>
                          +{(c.roles || []).length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  {c.open_to_collab && (
                    <div style={{ color: '#7bc87b', fontSize: 11, marginTop: 4 }}>
                      🤝 {tx.discoverOpenToCollab}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function chip(active: boolean, accent: string): React.CSSProperties {
  return {
    padding: '4px 10px',
    fontSize: 12,
    borderRadius: 12,
    border: active ? `1px solid ${accent}` : '1px solid rgba(180,140,80,0.2)',
    background: active ? `${accent}1a` : 'rgba(255,255,255,0.02)',
    color: active ? accent : '#a09080',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  }
}

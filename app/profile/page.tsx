'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { t, useLang, setLang, type Lang } from '@/lib/i18n'
import Avatar, { AVATAR_PRESETS, type AvatarValue } from '@/components/Avatar'
import { CREATOR_ROLES, CREATOR_LANGUAGES, NORDIC_LOCATIONS } from '@/lib/creatorRoles'

type Profile = {
  id: string
  email?: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  role: string
  paid_status: boolean
  paid_at: string | null
  total_points: number
  referral_code: string
  preferred_lang: 'no' | 'en' | null
  preferred_song_lang: 'no' | 'en' | 'auto' | null
  created_at: string
  roles?: string[] | null
  location?: string | null
  languages?: string[] | null
  open_to_collab?: boolean | null
  visible_in_catalog?: boolean | null
}

const BIO_MAX = 280

export default function ProfilePage() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>('no')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState<string>('')

  // Editable fields
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<AvatarValue>(null)
  const [prefLang, setPrefLang] = useState<'no' | 'en'>('no')
  const [prefSongLang, setPrefSongLang] = useState<'no' | 'en' | 'auto'>('auto')

  // Creator profile (Nordic catalog)
  const [creatorRoles, setCreatorRoles] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [creationLangs, setCreationLangs] = useState<string[]>([])
  const [openToCollab, setOpenToCollab] = useState(false)
  const [visibleInCatalog, setVisibleInCatalog] = useState(true)
  const [savingCreator, setSavingCreator] = useState(false)

  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarFileRef = useRef<HTMLInputElement | null>(null)
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const tx = t[lang]

  useEffect(() => { setLangState(useLang()); init() }, [])

  const init = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (prof) {
      const p = prof as Profile
      setProfile(p)
      setDisplayName(p.display_name || '')
      setBio(p.bio || '')
      setAvatarUrl(p.avatar_url)
      setPrefLang((p.preferred_lang as any) || 'no')
      setPrefSongLang((p.preferred_song_lang as any) || 'auto')
      setCreatorRoles(Array.isArray(p.roles) ? p.roles : [])
      setLocation(p.location || '')
      setCreationLangs(Array.isArray(p.languages) ? p.languages : [])
      setOpenToCollab(!!p.open_to_collab)
      setVisibleInCatalog(p.visible_in_catalog !== false)
    }
    setEmail(session.user.email || '')
    setLoading(false)
  }

  const showOk = (msg: string) => {
    setStatusMsg(msg); setErrorMsg(null)
    setTimeout(() => setStatusMsg(null), 3000)
  }
  const showErr = (msg: string) => {
    setErrorMsg(msg); setStatusMsg(null)
    setTimeout(() => setErrorMsg(null), 5000)
  }

  // ----- Avatar upload -----
  const uploadAvatar = async (file: File) => {
    if (!file.type.startsWith('image/')) { showErr(tx.profileErrNotImage); return }
    if (file.size > 5 * 1024 * 1024) { showErr(tx.profileErrFileTooLarge); return }
    setAvatarUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `avatars/${user.id}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('covers').upload(path, file, {
        upsert: true,
        contentType: file.type,
      })
      if (error) { showErr(`${tx.profileErrUpload}: ${error.message}`); return }
      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path)
      setAvatarUrl(urlData.publicUrl)
      showOk(tx.profileAvatarUploaded)
    } finally {
      setAvatarUploading(false)
    }
  }

  const pickPreset = (key: string) => {
    setAvatarUrl(key)
  }

  const clearAvatar = () => {
    setAvatarUrl(null)
  }

  // ----- Save identity (avatar + display_name + bio) -----
  const saveIdentity = async () => {
    if (!profile) return
    setSavingIdentity(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
    setSavingIdentity(false)
    if (error) { showErr(`${tx.profileErrSave}: ${error.message}`); return }
    setProfile({ ...profile, display_name: displayName.trim() || null, bio: bio.trim() || null, avatar_url: typeof avatarUrl === 'string' ? avatarUrl : null })
    showOk(tx.profileIdentitySaved)
  }

  // ----- Save preferences (UI lang + song lang) -----
  const savePreferences = async () => {
    if (!profile) return
    setSavingPrefs(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        preferred_lang: prefLang,
        preferred_song_lang: prefSongLang,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
    setSavingPrefs(false)
    if (error) { showErr(`${tx.profileErrSave}: ${error.message}`); return }
    // Sync localStorage so UI lang reflects immediately
    setLang(prefLang)
    setLangState(prefLang)
    showOk(tx.profilePrefsSaved)
  }

  // ----- Save creator profile -----
  const saveCreatorProfile = async () => {
    if (!profile) return
    setSavingCreator(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        roles: creatorRoles,
        location: location.trim() || null,
        languages: creationLangs,
        open_to_collab: openToCollab,
        visible_in_catalog: visibleInCatalog,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
    setSavingCreator(false)
    if (error) { showErr(`${tx.profileErrSave}: ${error.message}`); return }
    showOk(tx.profileCreatorSaved)
  }

  const toggleRole = (key: string) => {
    setCreatorRoles(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }
  const toggleLang = (key: string) => {
    setCreationLangs(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  // ----- Change password -----
  const changePassword = async () => {
    if (newPassword.length < 6) { showErr(tx.profileErrPasswordShort); return }
    if (newPassword !== newPasswordConfirm) { showErr(tx.profileErrPasswordMismatch); return }
    setChangingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setChangingPassword(false)
    if (error) { showErr(`${tx.profileErrSave}: ${error.message}`); return }
    setNewPassword(''); setNewPasswordConfirm(''); setShowPasswordForm(false)
    showOk(tx.profilePasswordChanged)
  }

  if (loading) return <div style={{ color: '#6a5a40', padding: 40 }}>{tx.loading}</div>
  if (!profile) return null

  const accent = '#d4a843'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)',
      color: '#e8e0d0',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    }}>
      <div className="app-header" data-header="page" style={{
        borderBottom: '1px solid rgba(180,140,80,0.2)',
        padding: '20px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: 13 }}>← {tx.dashboard}</Link>
          <span style={{ color: '#3a3530' }}>|</span>
          <h1 style={{ margin: 0, fontSize: 18, color: accent, fontWeight: 'normal' }}>👤 {tx.profileTitle}</h1>
        </div>
      </div>

      <div className="page-pad" style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>

        {/* Transient banner */}
        {(statusMsg || errorMsg) && (
          <div style={{
            position: 'fixed', top: 80, right: 32, zIndex: 100,
            background: '#14101a',
            color: '#e8e0d0',
            border: `1px solid ${errorMsg ? '#c05050' : accent}`,
            padding: '10px 18px', borderRadius: 6, fontSize: 13,
            boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
            maxWidth: 380,
          }}>{statusMsg || errorMsg}</div>
        )}

        {/* ===== Identity ===== */}
        <Section title={`🪪 ${tx.profileSectionIdentity}`}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Avatar value={avatarUrl} name={displayName} seed={profile.id} size={120} borderColor={accent} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  className="btn-outline"
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={avatarUploading}
                  style={{ fontSize: 12, padding: '6px 12px' }}
                >
                  {avatarUploading ? '⏳ …' : '📤 ' + tx.profileBtnUpload}
                </button>
                {avatarUrl && (
                  <button
                    onClick={clearAvatar}
                    style={{ background: 'transparent', border: '1px solid rgba(192,80,80,0.4)', color: '#c05050', padding: '6px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer' }}
                  >
                    ✕ {tx.profileBtnClearAvatar}
                  </button>
                )}
              </div>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = '' }}
              />
            </div>

            <div style={{ flex: '1 1 280px', minWidth: 0 }}>
              <Label>{tx.profileFieldDisplayName}</Label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={tx.profilePlaceholderDisplayName}
                maxLength={60}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />

              <Label style={{ marginTop: 16 }}>{tx.profileFieldBio}</Label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, BIO_MAX))}
                placeholder={tx.profilePlaceholderBio}
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
              />
              <div style={{ textAlign: 'right', color: bio.length > BIO_MAX - 30 ? '#c05050' : '#5a4a30', fontSize: 11, marginTop: 4 }}>
                {bio.length} / {BIO_MAX}
              </div>
            </div>
          </div>

          {/* Preset gallery */}
          <div>
            <Label>{tx.profileAvatarPresets}</Label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {AVATAR_PRESETS.map(p => {
                const active = avatarUrl === p.key
                return (
                  <button
                    key={p.key}
                    onClick={() => pickPreset(p.key)}
                    title={tx[p.labelKey as keyof typeof tx] as string || p.key}
                    style={{
                      background: 'transparent',
                      border: active ? `2px solid ${p.color}` : '2px solid transparent',
                      borderRadius: '50%',
                      padding: 2,
                      cursor: 'pointer',
                      transition: 'transform 0.15s, border-color 0.2s',
                      transform: active ? 'scale(1.06)' : 'scale(1)',
                    }}
                  >
                    <Avatar value={p.key} size={44} />
                  </button>
                )
              })}
            </div>
            <p style={{ color: '#5a4a30', fontSize: 11, marginTop: 8 }}>
              {tx.profileAvatarHint}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn-gold" onClick={saveIdentity} disabled={savingIdentity}>
              {savingIdentity ? tx.saving : '💾 ' + tx.save}
            </button>
          </div>
        </Section>

        {/* ===== Preferences ===== */}
        <Section title={`⚙️ ${tx.profileSectionPreferences}`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div>
              <Label>{tx.profileFieldUiLang}</Label>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {(['no', 'en'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setPrefLang(l)}
                    style={pillBtn(prefLang === l, accent)}
                  >
                    {l === 'no' ? '🇳🇴 Norsk' : '🇬🇧 English'}
                  </button>
                ))}
              </div>
              <p style={{ color: '#5a4a30', fontSize: 11, marginTop: 6 }}>{tx.profileFieldUiLangHint}</p>
            </div>

            <div>
              <Label>{tx.profileFieldSongLang}</Label>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {([
                  { v: 'auto', label: '🤖 ' + tx.profileSongLangAuto },
                  { v: 'no',   label: '🇳🇴 Norsk' },
                  { v: 'en',   label: '🇬🇧 English' },
                ] as const).map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setPrefSongLang(opt.v as any)}
                    style={pillBtn(prefSongLang === opt.v, accent)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p style={{ color: '#5a4a30', fontSize: 11, marginTop: 6 }}>{tx.profileFieldSongLangHint}</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn-gold" onClick={savePreferences} disabled={savingPrefs}>
              {savingPrefs ? tx.saving : '💾 ' + tx.save}
            </button>
          </div>
        </Section>

        {/* ===== Creator profile (Nordic catalog) ===== */}
        <Section title={`🎼 ${tx.profileSectionCreator}`}>
          <p style={{ color: '#8a7a60', fontSize: 13, marginTop: 0 }}>{tx.profileCreatorIntro}</p>

          <Label style={{ marginTop: 16 }}>{tx.profileFieldRoles}</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CREATOR_ROLES.map(r => {
              const active = creatorRoles.includes(r.key)
              return (
                <button
                  key={r.key}
                  onClick={() => toggleRole(r.key)}
                  style={chipBtn(active, accent)}
                  type="button"
                >
                  {r.emoji} {tx[r.labelKey as keyof typeof tx] as string || r.key}
                </button>
              )
            })}
          </div>

          <Label style={{ marginTop: 18 }}>{tx.profileFieldLocation}</Label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder={tx.profilePlaceholderLocation}
            list="nordic-locations"
            maxLength={80}
            style={{ width: '100%', boxSizing: 'border-box', maxWidth: 360 }}
          />
          <datalist id="nordic-locations">
            {NORDIC_LOCATIONS.map(l => <option key={l} value={l} />)}
          </datalist>

          <Label style={{ marginTop: 18 }}>{tx.profileFieldCreationLangs}</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CREATOR_LANGUAGES.map(l => {
              const active = creationLangs.includes(l.key)
              return (
                <button
                  key={l.key}
                  onClick={() => toggleLang(l.key)}
                  style={chipBtn(active, accent)}
                  type="button"
                >
                  {l.flag} {tx[l.labelKey as keyof typeof tx] as string || l.key}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 18 }}>
            <ToggleRow
              label={`🤝 ${tx.profileToggleOpenToCollab}`}
              hint={tx.profileToggleOpenToCollabHint}
              checked={openToCollab}
              onChange={setOpenToCollab}
              accent={accent}
            />
            <ToggleRow
              label={`🌍 ${tx.profileToggleVisibleInCatalog}`}
              hint={tx.profileToggleVisibleInCatalogHint}
              checked={visibleInCatalog}
              onChange={setVisibleInCatalog}
              accent={accent}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn-gold" onClick={saveCreatorProfile} disabled={savingCreator}>
              {savingCreator ? tx.saving : '💾 ' + tx.save}
            </button>
          </div>
        </Section>

        {/* ===== Account & security ===== */}
        <Section title={`🔐 ${tx.profileSectionAccount}`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <ReadOnlyRow label={tx.profileFieldEmail} value={email} mono />
            <ReadOnlyRow label={tx.profileFieldRole} value={profile.role} pill pillColor={accent} />
            <ReadOnlyRow label={tx.profileFieldMemberSince} value={new Date(profile.created_at).toLocaleDateString()} />
            <ReadOnlyRow label={tx.profileFieldPoints} value={profile.total_points.toLocaleString()} accent={accent} />
            <ReadOnlyRow label={tx.profileFieldPaidStatus} value={profile.paid_status ? '✓ ' + tx.referralsPaid : '—'} accent={profile.paid_status ? '#7bc87b' : '#8a7a60'} />
            <ReadOnlyRow label={tx.profileFieldReferralCode} value={profile.referral_code} mono accent={accent} />
          </div>

          <div style={{ marginTop: 20, borderTop: '1px solid rgba(180,140,80,0.15)', paddingTop: 16 }}>
            {!showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="btn-outline"
                style={{ fontSize: 13 }}
              >
                🔑 {tx.profileBtnChangePassword}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
                <Label>{tx.profileFieldNewPassword}</Label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  minLength={6}
                  placeholder="••••••••"
                />
                <Label>{tx.profileFieldNewPasswordConfirm}</Label>
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={e => setNewPasswordConfirm(e.target.value)}
                  minLength={6}
                  placeholder="••••••••"
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button className="btn-gold" onClick={changePassword} disabled={changingPassword}>
                    {changingPassword ? tx.saving : '🔑 ' + tx.profileBtnSavePassword}
                  </button>
                  <button
                    className="btn-outline"
                    onClick={() => { setShowPasswordForm(false); setNewPassword(''); setNewPasswordConfirm('') }}
                    disabled={changingPassword}
                  >
                    {tx.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Section>

      </div>
    </div>
  )
}

/* ---------- helpers ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ color: '#d4a843', fontSize: 15, fontWeight: 'normal', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>
        {title}
      </h2>
      <div className="card">{children}</div>
    </div>
  )
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{
      display: 'block',
      color: '#8a7a60',
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 6,
      ...style,
    }}>{children}</label>
  )
}

function chipBtn(active: boolean, accent: string): React.CSSProperties {
  return {
    padding: '6px 12px',
    fontSize: 12,
    borderRadius: 6,
    border: active ? `1px solid ${accent}` : '1px solid rgba(180,140,80,0.2)',
    background: active ? `${accent}1a` : 'rgba(255,255,255,0.02)',
    color: active ? accent : '#a09080',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  }
}

function ToggleRow({ label, hint, checked, onChange, accent }: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  accent: string
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 12px',
        border: `1px solid ${checked ? accent : 'rgba(180,140,80,0.2)'}`,
        borderRadius: 6,
        background: checked ? `${accent}0d` : 'rgba(255,255,255,0.02)',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <div style={{
        marginTop: 2,
        width: 36, height: 20,
        borderRadius: 10,
        background: checked ? accent : 'rgba(180,140,80,0.25)',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute',
          top: 2, left: checked ? 18 : 2,
          width: 16, height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: checked ? '#e8e0d0' : '#a09080', fontSize: 13, fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ color: '#6a5a40', fontSize: 11, marginTop: 2 }}>{hint}</div>}
      </div>
    </div>
  )
}

function pillBtn(active: boolean, accent: string): React.CSSProperties {
  return {
    padding: '6px 14px',
    fontSize: 12,
    borderRadius: 14,
    border: active ? `1px solid ${accent}` : '1px solid rgba(180,140,80,0.2)',
    background: active ? `${accent}1a` : 'transparent',
    color: active ? accent : '#8a7a60',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }
}

function ReadOnlyRow({ label, value, mono, accent, pill, pillColor }: {
  label: string
  value: string
  mono?: boolean
  accent?: string
  pill?: boolean
  pillColor?: string
}) {
  return (
    <div>
      <Label>{label}</Label>
      {pill ? (
        <span style={{
          display: 'inline-block',
          padding: '4px 10px',
          fontSize: 11,
          letterSpacing: 1,
          color: pillColor || '#e8e0d0',
          border: `1px solid ${(pillColor || '#e8e0d0')}55`,
          background: `${pillColor || '#e8e0d0'}11`,
          borderRadius: 12,
        }}>{value}</span>
      ) : (
        <div style={{
          color: accent || '#e8e0d0',
          fontFamily: mono ? 'monospace' : undefined,
          fontSize: 14,
          padding: '4px 0',
        }}>{value}</div>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Avatar from '@/components/Avatar'

type Candidate = {
  id: string
  display_name: string | null
  avatar_url: string | null
  referral_code: string
}

/**
 * "New group" creation modal. Lets the user title the group and pick members
 * from the people they follow + people who follow them.
 */
export default function NewGroupModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [search, setSearch] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => { if (open) loadCandidates() }, [open])

  const loadCandidates = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Union of follows you have AND people who follow you
    const [outRes, inRes] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', user.id),
      supabase.from('follows').select('follower_id').eq('following_id', user.id),
    ])
    const ids = new Set<string>()
    for (const r of (outRes.data as any[]) || []) ids.add(r.following_id)
    for (const r of (inRes.data as any[]) || []) ids.add(r.follower_id)
    if (ids.size === 0) { setCandidates([]); return }
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, referral_code')
      .in('id', Array.from(ids))
    setCandidates((profs as Candidate[]) || [])
  }

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const filtered = candidates.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (c.display_name || '').toLowerCase().includes(q) || c.referral_code.toLowerCase().includes(q)
  })

  const create = async () => {
    if (title.trim().length < 2 || selected.size === 0) return
    setCreating(true)
    setErrorMsg(null)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('create_group_conversation', {
      group_title: title.trim(),
      member_ids: Array.from(selected),
    })
    setCreating(false)
    if (error) { setErrorMsg(error.message); return }
    if (data && (data as any).error) { setErrorMsg((data as any).error); return }
    const convId = (data as any)?.conversation_id
    if (convId) { onClose(); router.push(`/messages/${convId}`) }
  }

  if (!open) return null

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto', borderColor: 'rgba(212,168,67,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <h3 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: 18 }}>👥 New group</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        <label style={{ display: 'block', color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Group title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Hellwater Saints crew"
          maxLength={80}
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 14, padding: 10 }}
          autoFocus
        />

        <label style={{ display: 'block', color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 16, marginBottom: 6 }}>
          Invite members ({selected.size})
        </label>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, padding: 8, marginBottom: 8 }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <p style={{ color: '#6a5a40', fontSize: 13, textAlign: 'center', padding: 20 }}>
              {candidates.length === 0 ? 'You need to follow someone first.' : 'No matches.'}
            </p>
          ) : (
            filtered.map(c => {
              const isSelected = selected.has(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    background: isSelected ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid ' + (isSelected ? 'rgba(212,168,67,0.4)' : 'rgba(180,140,80,0.15)'),
                    borderRadius: 6,
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#e8e0d0',
                  }}
                >
                  <Avatar value={c.avatar_url} name={c.display_name} seed={c.id} size={32} />
                  <span style={{ flex: 1, fontSize: 14 }}>{c.display_name || c.referral_code}</span>
                  {isSelected && <span style={{ color: '#d4a843' }}>✓</span>}
                </button>
              )
            })
          )}
        </div>

        {errorMsg && <div style={{ color: '#c05050', fontSize: 12, marginTop: 10 }}>{errorMsg}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn-gold"
            onClick={create}
            disabled={creating || title.trim().length < 2 || selected.size === 0}
          >
            {creating ? '⏳ Creating...' : `Create group (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}

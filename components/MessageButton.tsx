'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

/**
 * "Send message" button on a public creator profile. Calls the RPC to find or
 * create a direct conversation with the target user, then navigates to it.
 * Hides itself when viewer = target.
 */
export default function MessageButton({
  targetUserId,
}: {
  targetUserId: string
}) {
  const router = useRouter()
  const [meId, setMeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => { init() }, [])

  const init = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setMeId(user?.id || null)
    setLoading(false)
  }

  const openConversation = async () => {
    if (!meId) { router.push('/login'); return }
    if (meId === targetUserId) return
    setBusy(true)
    setErrorMsg(null)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('get_or_create_direct_conversation', { other_user_id: targetUserId })
    setBusy(false)
    if (error) { setErrorMsg(error.message); return }
    if (data && (data as any).error) {
      const errKey = (data as any).error
      setErrorMsg(errKey === 'blocked' ? 'Blocked' : errKey)
      return
    }
    const convId = (data as any)?.conversation_id
    if (convId) router.push(`/messages/${convId}`)
  }

  if (loading || meId === targetUserId) return null

  return (
    <div>
      <button
        onClick={openConversation}
        disabled={busy}
        style={{
          padding: '8px 18px',
          borderRadius: 6,
          border: '1px solid rgba(180,140,80,0.4)',
          background: 'rgba(255,255,255,0.03)',
          color: '#e8e0d0',
          fontSize: 13,
          fontWeight: 600,
          cursor: busy ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? '⏳' : '💬'} Message
      </button>
      {errorMsg && <div style={{ color: '#c05050', fontSize: 11, marginTop: 6 }}>{errorMsg}</div>}
    </div>
  )
}

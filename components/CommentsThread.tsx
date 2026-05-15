'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Avatar from '@/components/Avatar'

type Comment = {
  id: string
  song_id: string
  user_id: string
  content: string
  parent_id: string | null
  hidden: boolean
  created_at: string
  author?: { display_name: string | null; avatar_url: string | null; referral_code: string }
}

export default function CommentsThread({
  songId,
  songOwnerId,
}: {
  songId: string
  songOwnerId: string
}) {
  const router = useRouter()
  const [meId, setMeId] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [composer, setComposer] = useState('')
  const [sending, setSending] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const composerRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id || null))
    load()
    const channel = supabase.channel(`song-comments-${songId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'song_comments', filter: `song_id=eq.${songId}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId])

  const load = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('song_comments')
      .select('*')
      .eq('song_id', songId)
      .eq('hidden', false)
      .order('created_at', { ascending: true })
    if (!data) { setComments([]); return }
    // Fetch author profiles
    const userIds = Array.from(new Set((data as any[]).map(c => c.user_id)))
    const { data: profs } = userIds.length > 0
      ? await supabase.from('profiles').select('id, display_name, avatar_url, referral_code').in('id', userIds)
      : { data: [] }
    const profMap: Record<string, any> = {}
    for (const p of (profs as any[]) || []) profMap[p.id] = p
    setComments((data as any[]).map(c => ({ ...c, author: profMap[c.user_id] })))
  }

  const submit = async (content: string, parentId: string | null = null): Promise<boolean> => {
    if (!content.trim()) return false
    if (!meId) { router.push('/login'); return false }
    setSending(true)
    const supabase = createClient()
    const { error } = await supabase.from('song_comments').insert({
      song_id: songId,
      user_id: meId,
      content: content.trim(),
      parent_id: parentId,
    })
    setSending(false)
    if (error) { alert(error.message); return false }
    await load()
    return true
  }

  const deleteComment = async (id: string) => {
    if (!confirm('Delete this comment?')) return
    const supabase = createClient()
    const { error } = await supabase.from('song_comments').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setComments(prev => prev.filter(c => c.id !== id))
  }

  const sendTopLevel = async () => {
    const ok = await submit(composer)
    if (ok) setComposer('')
  }

  const sendReply = async (parentId: string) => {
    const ok = await submit(replyText, parentId)
    if (ok) { setReplyText(''); setReplyingTo(null) }
  }

  const topLevel = comments.filter(c => !c.parent_id)
  const repliesByParent: Record<string, Comment[]> = {}
  for (const c of comments) {
    if (c.parent_id) {
      if (!repliesByParent[c.parent_id]) repliesByParent[c.parent_id] = []
      repliesByParent[c.parent_id].push(c)
    }
  }

  const accent = '#d4a843'

  return (
    <div>
      {/* New top-level comment */}
      <div className="card" style={{ marginBottom: 20 }}>
        <textarea
          ref={composerRef}
          value={composer}
          onChange={e => setComposer(e.target.value)}
          placeholder={meId ? 'Add a comment...' : 'Sign in to comment'}
          rows={3}
          maxLength={2000}
          disabled={!meId}
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 14, padding: 10, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div style={{ color: '#5a4a30', fontSize: 11 }}>{composer.length} / 2000</div>
          {meId ? (
            <button
              className="btn-gold"
              onClick={sendTopLevel}
              disabled={sending || !composer.trim()}
              style={{ padding: '8px 18px', fontSize: 13 }}
            >
              {sending ? '⏳ Posting...' : '💬 Post comment'}
            </button>
          ) : (
            <Link href="/login" style={{
              padding: '8px 18px',
              background: accent,
              color: '#0a0a0f',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
            }}>Sign in</Link>
          )}
        </div>
      </div>

      {/* Comments list */}
      {topLevel.length === 0 ? (
        <div style={{ color: '#6a5a40', textAlign: 'center', padding: 30, fontSize: 14 }}>
          No comments yet. Be the first to leave one!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {topLevel.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              replies={repliesByParent[c.id] || []}
              meId={meId}
              songOwnerId={songOwnerId}
              onDelete={deleteComment}
              onReply={(text) => sendReply(c.id)}
              replyText={replyingTo === c.id ? replyText : ''}
              setReplyText={setReplyText}
              isReplying={replyingTo === c.id}
              setReplyingTo={setReplyingTo}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CommentItem({
  comment, replies, meId, songOwnerId,
  onDelete, onReply, replyText, setReplyText, isReplying, setReplyingTo,
}: {
  comment: Comment
  replies: Comment[]
  meId: string | null
  songOwnerId: string
  onDelete: (id: string) => void
  onReply: (text: string) => void
  replyText: string
  setReplyText: (s: string) => void
  isReplying: boolean
  setReplyingTo: (id: string | null) => void
}) {
  const canDelete = meId === comment.user_id || meId === songOwnerId
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(180,140,80,0.15)',
      borderRadius: 8,
      padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Avatar value={comment.author?.avatar_url} name={comment.author?.display_name} seed={comment.user_id} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {comment.author?.referral_code ? (
            <Link href={`/u/${comment.author.referral_code}`} style={{ color: '#e8e0d0', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              {comment.author?.display_name || 'Anonymous'}
            </Link>
          ) : (
            <div style={{ color: '#e8e0d0', fontSize: 13, fontWeight: 600 }}>{comment.author?.display_name || 'Anonymous'}</div>
          )}
          <div style={{ color: '#6a5a40', fontSize: 11 }}>{new Date(comment.created_at).toLocaleString()}</div>
        </div>
        {canDelete && (
          <button
            onClick={() => onDelete(comment.id)}
            style={{ background: 'none', border: 'none', color: '#c05050', cursor: 'pointer', fontSize: 14, padding: 4 }}
            title="Delete"
          >🗑️</button>
        )}
      </div>
      <div style={{ color: '#c8c0b0', fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginLeft: 42 }}>
        {comment.content}
      </div>
      <div style={{ marginLeft: 42, marginTop: 8 }}>
        {meId && !isReplying && (
          <button
            onClick={() => setReplyingTo(comment.id)}
            style={{ background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', fontSize: 12, padding: 0 }}
          >↩ Reply</button>
        )}
        {isReplying && (
          <div style={{ marginTop: 6 }}>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              maxLength={2000}
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, padding: 8 }}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
              <button onClick={() => { setReplyingTo(null); setReplyText('') }} className="btn-outline" style={{ fontSize: 11, padding: '4px 10px' }}>Cancel</button>
              <button onClick={() => onReply(replyText)} className="btn-gold" disabled={!replyText.trim()} style={{ fontSize: 11, padding: '4px 12px' }}>Post reply</button>
            </div>
          </div>
        )}
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div style={{ marginLeft: 32, marginTop: 12, paddingLeft: 12, borderLeft: '2px solid rgba(180,140,80,0.12)' }}>
          {replies.map(r => (
            <div key={r.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar value={r.author?.avatar_url} name={r.author?.display_name} seed={r.user_id} size={24} />
                <span style={{ color: '#e8e0d0', fontSize: 12, fontWeight: 600 }}>{r.author?.display_name || 'Anonymous'}</span>
                <span style={{ color: '#5a4a30', fontSize: 10 }}>{new Date(r.created_at).toLocaleString()}</span>
                {(meId === r.user_id || meId === songOwnerId) && (
                  <button
                    onClick={() => onDelete(r.id)}
                    style={{ background: 'none', border: 'none', color: '#c05050', cursor: 'pointer', fontSize: 11, padding: 0, marginLeft: 'auto' }}
                  >🗑️</button>
                )}
              </div>
              <div style={{ color: '#a09080', fontSize: 13, marginLeft: 32, marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

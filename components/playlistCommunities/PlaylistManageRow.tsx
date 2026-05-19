'use client'

import { useState } from 'react'
import type { CreatorPlaylist } from '@/lib/playlistCommunities/types'
import {
  archiveCreatorPlaylist,
  deleteCreatorPlaylist,
  refreshPlaylistMetadata,
  updateCreatorPlaylist,
} from '@/lib/playlistCommunities/client'
import { t, useLang } from '@/lib/i18n'

type Props = {
  playlist: CreatorPlaylist
  onUpdated: () => void
}

export default function PlaylistManageRow({ playlist, onUpdated }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(playlist.title)
  const [genre, setGenre] = useState(playlist.genre || '')
  const [mood, setMood] = useState(playlist.mood || '')
  const [spotifyUrl, setSpotifyUrl] = useState(playlist.spotify_url || '')
  const [visibility, setVisibility] = useState(playlist.visibility)
  const [busy, setBusy] = useState(false)

  const archived = !!playlist.archived_at

  const save = async () => {
    setBusy(true)
    try {
      await updateCreatorPlaylist(playlist.id, { title, genre, mood, spotify_url: spotifyUrl, visibility })
      setEditing(false)
      onUpdated()
    } finally {
      setBusy(false)
    }
  }

  const refresh = async () => {
    setBusy(true)
    try {
      await refreshPlaylistMetadata(playlist.id)
      onUpdated()
    } finally {
      setBusy(false)
    }
  }

  const archive = async () => {
    if (!window.confirm(tx.playlistArchiveConfirm)) return
    setBusy(true)
    try {
      await archiveCreatorPlaylist(playlist.id)
      onUpdated()
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(tx.playlistDeleteConfirm)) return
    setBusy(true)
    try {
      await deleteCreatorPlaylist(playlist.id)
      onUpdated()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      alert(msg === 'has_active_campaigns' ? tx.playlistDeleteHasCampaigns : msg || 'Failed')
      setBusy(false)
    }
  }

  return (
    <div className={`card playlist-manage-row${archived ? ' playlist-manage-row--archived' : ''}`}>
      <div className="playlist-manage-row__main">
        {playlist.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={playlist.image_url} alt="" className="playlist-manage-row__cover" />
        ) : (
          <div className="playlist-manage-row__cover playlist-manage-row__cover--empty">♫</div>
        )}
        <div className="playlist-manage-row__meta">
          {editing ? (
            <div className="playlist-manage-row__edit">
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={tx.playlistCommunityManualTitle} />
              <input className="input" value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)} placeholder={tx.playlistCommunitySpotifyUrl} />
              <div className="playlist-manage-row__edit-row">
                <input className="input" value={genre} onChange={e => setGenre(e.target.value)} placeholder={tx.playlistGenrePlaceholder} />
                <input className="input" value={mood} onChange={e => setMood(e.target.value)} placeholder={tx.playlistMoodPlaceholder} />
              </div>
              <select className="input" value={visibility} onChange={e => setVisibility(e.target.value as CreatorPlaylist['visibility'])}>
                <option value="private">{tx.playlistVisibilityPrivate}</option>
                <option value="public">{tx.playlistVisibilityPublic}</option>
                <option value="unlisted">{tx.playlistVisibilityUnlisted}</option>
              </select>
              <div className="playlist-manage-row__actions">
                <button type="button" className="btn-gold" disabled={busy} onClick={save}>{tx.save}</button>
                <button type="button" className="btn-outline" onClick={() => setEditing(false)}>{tx.cancel}</button>
              </div>
            </div>
          ) : (
            <>
              <div className="playlist-manage-row__title">
                {playlist.title}
                {archived && <span className="playlist-archived-badge">{tx.playlistArchived}</span>}
              </div>
              {playlist.owner_name && <div className="playlist-manage-row__sub">{playlist.owner_name}</div>}
            </>
          )}
        </div>
      </div>
      {!editing && (
        <div className="playlist-manage-row__toolbar">
          <button type="button" className="btn-outline" style={{ fontSize: 11 }} disabled={busy} onClick={() => setEditing(true)}>{tx.edit}</button>
          <button type="button" className="btn-outline" style={{ fontSize: 11 }} disabled={busy || !playlist.spotify_url} onClick={refresh}>{tx.playlistRefreshMetadata}</button>
          {!archived && (
            <button type="button" className="btn-outline" style={{ fontSize: 11 }} disabled={busy} onClick={archive}>{tx.playlistArchive}</button>
          )}
          {archived && (
            <button type="button" className="btn-outline" style={{ fontSize: 11, color: '#c05050' }} disabled={busy} onClick={remove}>{tx.delete}</button>
          )}
          {playlist.spotify_url && (
            <a href={playlist.spotify_url} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ fontSize: 11, textDecoration: 'none' }}>Spotify</a>
          )}
        </div>
      )}
    </div>
  )
}

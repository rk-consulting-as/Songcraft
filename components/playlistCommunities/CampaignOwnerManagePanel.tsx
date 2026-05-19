'use client'

import { useState } from 'react'
import type { CampaignCardData } from '@/lib/playlistCommunities/types'
import { deleteCampaign, updateCampaign } from '@/lib/playlistCommunities/client'
import { t, useLang } from '@/lib/i18n'

type Props = {
  campaign: CampaignCardData
  onUpdated: () => void
}

export default function CampaignOwnerManagePanel({ campaign, onUpdated }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState(campaign.title)
  const [rules, setRules] = useState(campaign.rules || '')
  const [description, setDescription] = useState(campaign.description || '')
  const [genre, setGenre] = useState(campaign.genre || '')
  const [mood, setMood] = useState(campaign.mood || '')
  const [visibility, setVisibility] = useState(campaign.visibility)
  const [maxMembers, setMaxMembers] = useState(campaign.max_members != null ? String(campaign.max_members) : '')

  const saveEdit = async () => {
    setBusy(true)
    try {
      await updateCampaign(campaign.id, {
        title,
        rules,
        description: description || null,
        genre: genre || null,
        mood: mood || null,
        visibility,
        max_members: maxMembers ? parseInt(maxMembers, 10) : null,
      })
      setEditing(false)
      onUpdated()
    } finally {
      setBusy(false)
    }
  }

  const setStatus = async (status: string) => {
    setBusy(true)
    try {
      await updateCampaign(campaign.id, { status })
      onUpdated()
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(tx.campaignDeleteConfirm)) return
    setBusy(true)
    try {
      await deleteCampaign(campaign.id)
      window.location.href = '/dashboard'
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      alert(msg === 'archive_before_delete' ? tx.campaignDeleteRequiresArchive : msg || 'Failed')
      setBusy(false)
    }
  }

  return (
    <div className="playlist-owner-actions card playlist-owner-manage">
      <h3 className="playlist-owner-actions__title">{tx.playlistOwnerActions}</h3>

      {editing ? (
        <div className="playlist-owner-manage__edit">
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={tx.playlistCommunityCampaignTitle} />
          <textarea className="input" value={rules} onChange={e => setRules(e.target.value)} placeholder={tx.playlistCommunityRules} rows={4} />
          <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder={tx.playlistCommunityAbout} rows={2} />
          <div className="playlist-manage-row__edit-row">
            <input className="input" value={genre} onChange={e => setGenre(e.target.value)} placeholder={tx.playlistGenrePlaceholder} />
            <input className="input" value={mood} onChange={e => setMood(e.target.value)} placeholder={tx.playlistMoodPlaceholder} />
          </div>
          <input className="input" value={maxMembers} onChange={e => setMaxMembers(e.target.value)} placeholder={tx.playlistMaxMembersPlaceholder} inputMode="numeric" />
          <select className="input" value={visibility} onChange={e => setVisibility(e.target.value as CampaignCardData['visibility'])}>
            <option value="private">{tx.playlistVisibilityPrivate}</option>
            <option value="public">{tx.playlistCommunityPublicCampaign}</option>
            <option value="unlisted">{tx.playlistVisibilityUnlisted}</option>
          </select>
          <div className="playlist-owner-actions__buttons">
            <button type="button" className="btn-gold" disabled={busy} onClick={saveEdit}>{tx.save}</button>
            <button type="button" className="btn-outline" onClick={() => setEditing(false)}>{tx.cancel}</button>
          </div>
        </div>
      ) : (
        <>
          <p className="playlist-owner-manage__hint">{tx.campaignOwnerManageHint}</p>
          <div className="playlist-owner-actions__buttons">
            <button type="button" className="btn-outline" disabled={busy} onClick={() => setEditing(true)}>{tx.campaignEdit}</button>
            {campaign.status === 'draft' && (
              <button type="button" className="btn-gold" disabled={busy} onClick={() => setStatus('open')}>{tx.playlistCommunityPublish}</button>
            )}
            {['open', 'active'].includes(campaign.status) && (
              <button type="button" className="btn-outline" disabled={busy} onClick={() => setStatus('closed')}>{tx.playlistCloseCampaign}</button>
            )}
            {campaign.status === 'closed' && (
              <button type="button" className="btn-outline" disabled={busy} onClick={() => setStatus('archived')}>{tx.playlistArchiveCampaign}</button>
            )}
            {campaign.status === 'archived' && (
              <button type="button" className="btn-outline" style={{ color: '#c05050' }} disabled={busy} onClick={remove}>{tx.campaignDelete}</button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

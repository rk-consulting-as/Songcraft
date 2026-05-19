import { createClient } from '@/lib/supabase'
import type { ParticipationPayload } from './activityTypes'
import type {
  CampaignCardData,
  CreatorPlaylist,
  PlaylistCampaign,
  PlaylistCampaignMember,
} from './types'
import type { ActivityProofLimits } from './activityLimits'
import type { PlaylistCommunityLimits } from './limits'
import type { CampaignActivityLog } from './activityTypes'

export async function getPlaylistAuthHeaders(): Promise<Record<string, string>> {
  const sb = createClient()
  const { data } = await sb.auth.getSession()
  const token = data.session?.access_token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const headers = await getPlaylistAuthHeaders()
  if (!headers.Authorization && init?.method && init.method !== 'GET') return null
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...headers, ...init?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || res.statusText)
  }
  return res.json() as Promise<T>
}

export async function fetchSpotifyPlaylistByUrl(url: string) {
  const sp = new URLSearchParams({ url })
  const res = await fetch(`/api/spotify/playlist-by-url?${sp}`)
  return res.json() as Promise<{ playlist: Record<string, unknown> | null; error?: string }>
}

export async function fetchCreatorPlaylists(artistId?: string) {
  const sp = new URLSearchParams()
  if (artistId) sp.set('artist_id', artistId)
  return apiFetch<{ playlists: CreatorPlaylist[] }>(`/api/playlist-communities/playlists?${sp}`)
}

export async function createCreatorPlaylist(body: Record<string, unknown>) {
  return apiFetch<{ playlist: CreatorPlaylist }>('/api/playlist-communities/playlists', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateCreatorPlaylist(id: string, body: Record<string, unknown>) {
  return apiFetch<{ playlist: CreatorPlaylist }>(`/api/playlist-communities/playlists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteCreatorPlaylist(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/playlist-communities/playlists/${id}`, { method: 'DELETE' })
}

export async function fetchCampaigns(params: { artistId?: string; scope?: 'owned' | 'joined' | 'all' }) {
  const sp = new URLSearchParams()
  if (params.artistId) sp.set('artist_id', params.artistId)
  if (params.scope) sp.set('scope', params.scope)
  return apiFetch<{ campaigns: CampaignCardData[]; limits: PlaylistCommunityLimits; planId: string }>(
    `/api/playlist-communities/campaigns?${sp}`
  )
}

export async function createCampaign(body: Record<string, unknown>) {
  return apiFetch<{ campaign: PlaylistCampaign }>('/api/playlist-communities/campaigns', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateCampaign(id: string, body: Record<string, unknown>) {
  return apiFetch<{ campaign: PlaylistCampaign }>(`/api/playlist-communities/campaigns/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function fetchCampaignDetail(id: string) {
  return apiFetch<{
    campaign: CampaignCardData
    members: Array<PlaylistCampaignMember & { artistName?: string; songTitle?: string }>
    isOwner: boolean
    myMembership: PlaylistCampaignMember | null
  }>(`/api/playlist-communities/campaigns/${id}`)
}

export async function requestJoinCampaign(
  campaignId: string,
  body: { artist_id?: string; song_id?: string; message?: string }
) {
  return apiFetch<{ member: PlaylistCampaignMember }>(
    `/api/playlist-communities/campaigns/${campaignId}/members`,
    { method: 'POST', body: JSON.stringify(body) }
  )
}

export async function updateCampaignMember(
  campaignId: string,
  memberId: string,
  body: { status: string }
) {
  return apiFetch<{ member: PlaylistCampaignMember }>(
    `/api/playlist-communities/campaigns/${campaignId}/members/${memberId}`,
    { method: 'PATCH', body: JSON.stringify(body) }
  )
}

export async function fetchCampaignParticipation(campaignId: string) {
  return apiFetch<
    ParticipationPayload & {
      limits: ActivityProofLimits & { canUseAiReview: boolean }
      planId: string
      role: 'owner' | 'member'
    }
  >(`/api/playlist-communities/campaigns/${campaignId}/participation`)
}

export async function submitCampaignActivityProof(campaignId: string, form: FormData) {
  const headers = await getPlaylistAuthHeaders()
  if (!headers.Authorization) return null
  const res = await fetch(`/api/playlist-communities/campaigns/${campaignId}/activity`, {
    method: 'POST',
    headers,
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || res.statusText)
  }
  return res.json() as Promise<{ log: CampaignActivityLog }>
}

export async function reviewCampaignActivityLog(
  campaignId: string,
  logId: string,
  body: { status?: string; owner_note?: string; proof_text?: string; proof_type?: string }
) {
  return apiFetch<{ log: CampaignActivityLog }>(
    `/api/playlist-communities/campaigns/${campaignId}/activity/${logId}`,
    { method: 'PATCH', body: JSON.stringify(body) }
  )
}

export async function runCampaignActivityAiReview(campaignId: string, logId: string) {
  return apiFetch<{ log: CampaignActivityLog; disclaimer: string }>(
    `/api/playlist-communities/campaigns/${campaignId}/activity/${logId}/ai-review`,
    { method: 'POST' }
  )
}

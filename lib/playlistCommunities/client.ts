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
import { classifyError } from '@/lib/errors/userFacing'

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
    const raw = (err as { error?: string }).error || res.statusText
    throw new Error(classifyError(raw) !== 'unknown' ? raw : raw)
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

export async function archiveCreatorPlaylist(id: string) {
  return updateCreatorPlaylist(id, { archive: true })
}

export async function unarchiveCreatorPlaylist(id: string) {
  return updateCreatorPlaylist(id, { unarchive: true })
}

export async function refreshPlaylistMetadata(id: string) {
  return apiFetch<{ playlist: CreatorPlaylist }>(`/api/playlist-communities/playlists/${id}/refresh`, {
    method: 'POST',
  })
}

export async function deleteCampaign(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/playlist-communities/campaigns/${id}`, { method: 'DELETE' })
}

export async function fetchDiscoverCampaigns(params: {
  genre?: string
  mood?: string
  commitment?: string
  sort?: string
  lookingForMembers?: boolean
}) {
  const sp = new URLSearchParams()
  if (params.genre) sp.set('genre', params.genre)
  if (params.mood) sp.set('mood', params.mood)
  if (params.commitment) sp.set('commitment', params.commitment)
  if (params.sort) sp.set('sort', params.sort)
  if (params.lookingForMembers) sp.set('looking_for_members', '1')
  const res = await fetch(`/api/discover/campaigns?${sp}`)
  if (!res.ok) throw new Error('discover_campaigns_failed')
  return res.json() as Promise<{ campaigns: CampaignCardData[]; filters: { genres: string[]; moods: string[] } }>
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

export type LastfmActivitySuggestion = {
  campaignId: string
  campaignTitle: string
  playlistTitle: string
  playlistImageUrl: string | null
  memberId: string
  matchedCount: number
  playlistTrackCount: number
  scrobbleCount: number
  completionPercent: number
  confidence: string
  clusterCount: number
  sequenceMatches: number
  sessions: { startIso: string; endIso: string; durationMinutes: number; matchCount: number }[]
  sessionLabel: string | null
  summaryText: string
  explanation: string
  fromDate: string
  toDate: string
  activityDate: string
  headline: string
}

export async function fetchActivitySuggestions() {
  return apiFetch<{ suggestions: import('@/lib/passiveParticipation/types').ActivitySuggestion[] }>(
    '/api/playlist-communities/activity-suggestions'
  )
}

export async function syncActivitySuggestions(force = false) {
  return apiFetch<{
    created: number
    skipped: number
    scanned: number
    suggestions: import('@/lib/passiveParticipation/types').ActivitySuggestion[]
  }>('/api/playlist-communities/activity-suggestions', {
    method: 'POST',
    body: JSON.stringify({ action: 'sync', force }),
  })
}

export async function approveActivitySuggestion(suggestionId: string) {
  return apiFetch<{ ok: boolean }>('/api/playlist-communities/activity-suggestions', {
    method: 'POST',
    body: JSON.stringify({ action: 'approve', suggestion_id: suggestionId }),
  })
}

export async function ignoreActivitySuggestion(suggestionId: string) {
  return apiFetch<{ ok: boolean }>('/api/playlist-communities/activity-suggestions', {
    method: 'POST',
    body: JSON.stringify({ action: 'ignore', suggestion_id: suggestionId }),
  })
}

export async function fetchCampaignPassiveHealth(campaignId: string) {
  return apiFetch<{ health: import('@/lib/passiveParticipation/types').CampaignHealthScore }>(
    `/api/playlist-communities/campaigns/${campaignId}/health-score`
  )
}

export async function fetchPassiveParticipation(view?: 'widget' | 'digest' | 'all') {
  const sp = view ? `?view=${view}` : ''
  return apiFetch<{
    widget?: import('@/lib/passiveParticipation/types').ParticipationWidgetStats
    digest?: import('@/lib/passiveParticipation/types').PassiveParticipationDigest
  }>(`/api/playlist-communities/passive-participation${sp}`)
}

export async function detectLastfmActivity(body: {
  lastfm_username?: string
  from_date?: string
  to_date?: string
  campaign_id?: string
}) {
  return apiFetch<{
    suggestions: LastfmActivitySuggestion[]
    scrobbleCount: number
    fromDate: string
    toDate: string
    campaignsScanned: number
  }>('/api/playlist-communities/lastfm/detect', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function previewLastfmImport(
  campaignId: string,
  body: { lastfm_username: string; from_date: string; to_date: string }
) {
  return apiFetch<{
    preview: boolean
    analysis: {
      completionPercent: number
      confidence: string
      matchedCount: number
      scrobbleCount: number
      playlistTrackCount: number
      summaryText: string
      explanation: string
      clusterCount: number
      sequenceMatches: number
    }
  }>(`/api/playlist-communities/campaigns/${campaignId}/activity/lastfm-import`, {
    method: 'POST',
    body: JSON.stringify({ ...body, preview: true }),
  })
}

export async function submitLastfmImportProof(
  campaignId: string,
  body: { lastfm_username: string; from_date: string; to_date: string; activity_date?: string }
) {
  return apiFetch<{ log: CampaignActivityLog; analysis: { confidence: string; completionPercent: number } }>(
    `/api/playlist-communities/campaigns/${campaignId}/activity/lastfm-import`,
    { method: 'POST', body: JSON.stringify(body) }
  )
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

export async function fetchParticipationSummary() {
  return apiFetch<{ summary: import('./participationSummary').UserParticipationSummary }>(
    '/api/playlist-communities/participation-summary'
  )
}

export async function runCampaignActivityAiReview(campaignId: string, logId: string) {
  return apiFetch<{ log: CampaignActivityLog; disclaimer: string }>(
    `/api/playlist-communities/campaigns/${campaignId}/activity/${logId}/ai-review`,
    { method: 'POST' }
  )
}

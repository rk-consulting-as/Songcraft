import { createClient } from '@/lib/supabase'
import type { MediaAsset, MediaAssetType, MediaAssetVisibility } from './types'
import type { MediaLibraryLimits } from './types'

export async function getMediaAuthHeaders(): Promise<Record<string, string>> {
  const sb = createClient()
  const { data } = await sb.auth.getSession()
  const token = data.session?.access_token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export type MediaAssetsListResponse = {
  assets: MediaAsset[]
  limits: MediaLibraryLimits
  planId: 'free' | 'pro'
}

export async function fetchMediaAssets(params: {
  artistId?: string
  type?: string
  visibility?: string
  q?: string
  limit?: number
}): Promise<MediaAssetsListResponse | null> {
  const headers = await getMediaAuthHeaders()
  if (!headers.Authorization) return null

  const sp = new URLSearchParams()
  if (params.artistId) sp.set('artist_id', params.artistId)
  if (params.type) sp.set('type', params.type)
  if (params.visibility) sp.set('visibility', params.visibility)
  if (params.q) sp.set('q', params.q)
  if (params.limit) sp.set('limit', String(params.limit))

  const res = await fetch(`/api/media/assets?${sp}`, { headers })
  if (!res.ok) return null
  return res.json()
}

export function uploadMediaAsset(
  file: File,
  fields: {
    type: MediaAssetType
    title?: string
    artistId?: string
    songId?: string
    visibility?: MediaAssetVisibility
    tags?: string[]
  },
  onProgress?: (pct: number) => void
): Promise<{ asset?: MediaAsset; error?: string }> {
  return new Promise(async resolve => {
    const headers = await getMediaAuthHeaders()
    if (!headers.Authorization) {
      resolve({ error: 'not_authenticated' })
      return
    }

    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', fields.type)
    if (fields.title) fd.append('title', fields.title)
    if (fields.artistId) fd.append('artist_id', fields.artistId)
    if (fields.songId) fd.append('song_id', fields.songId)
    if (fields.visibility) fd.append('visibility', fields.visibility)
    if (fields.tags?.length) fd.append('tags', JSON.stringify(fields.tags))

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/media/assets')
    xhr.setRequestHeader('Authorization', headers.Authorization)

    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}')
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ asset: data.asset })
        } else {
          resolve({ error: data.error || 'upload_failed' })
        }
      } catch {
        resolve({ error: 'upload_failed' })
      }
    }
    xhr.onerror = () => resolve({ error: 'network_error' })
    xhr.send(fd)
  })
}

export async function patchMediaAsset(
  id: string,
  patch: Record<string, unknown>
): Promise<MediaAsset | null> {
  const headers = await getMediaAuthHeaders()
  if (!headers.Authorization) return null
  const res = await fetch(`/api/media/assets/${id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.asset || null
}

export async function deleteMediaAsset(id: string): Promise<boolean> {
  const headers = await getMediaAuthHeaders()
  if (!headers.Authorization) return false
  const res = await fetch(`/api/media/assets/${id}`, { method: 'DELETE', headers })
  return res.ok
}

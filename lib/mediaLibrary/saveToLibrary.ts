import { uploadMediaAsset } from './client'
import type { MediaAssetType } from './types'

/** Register an existing image URL as a media library asset (re-upload from blob). */
export async function saveUrlToMediaLibrary(
  url: string,
  opts: {
    type: MediaAssetType
    title: string
    artistId?: string
    songId?: string
    visibility?: 'private' | 'public'
  }
): Promise<{ asset?: import('./types').MediaAsset; error?: string }> {
  try {
    const res = await fetch(url)
    if (!res.ok) return { error: 'fetch_failed' }
    const blob = await res.blob()
    const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'
    const file = new File([blob], `${opts.title}.${ext}`, { type: blob.type || 'image/jpeg' })
    return uploadMediaAsset(file, {
      type: opts.type,
      title: opts.title,
      artistId: opts.artistId,
      songId: opts.songId,
      visibility: opts.visibility || 'private',
    })
  } catch {
    return { error: 'upload_failed' }
  }
}

export async function saveDataUrlToMediaLibrary(
  dataUrl: string,
  opts: {
    type: MediaAssetType
    title: string
    artistId?: string
    songId?: string
    visibility?: 'private' | 'public'
  }
) {
  return saveUrlToMediaLibrary(dataUrl, opts)
}

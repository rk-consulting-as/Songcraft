import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CreateSnapshotInput,
  PlaybackEvidence,
  PlaybackEvidenceInput,
  PlaylistSnapshot,
  PlaylistSnapshotTrack,
} from './types'
import { scoreEvidenceRow, scoreToConfidence } from './PlaybackScoring'

export function mapSnapshotRow(row: Record<string, unknown>): PlaylistSnapshot {
  return {
    id: String(row.id),
    platform: row.platform as PlaylistSnapshot['platform'],
    externalPlaylistId: row.external_playlist_id ? String(row.external_playlist_id) : undefined,
    name: String(row.name),
    description: row.description ? String(row.description) : undefined,
    coverImageUrl: row.cover_image_url ? String(row.cover_image_url) : undefined,
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : undefined,
    ownerDisplayName: row.owner_display_name ? String(row.owner_display_name) : undefined,
    trackCount: Number(row.track_count || 0),
    totalDurationSeconds: Number(row.total_duration_seconds || 0),
    tracks: (row.tracks as PlaylistSnapshotTrack[]) || [],
    linkedContextType: row.linked_context_type as PlaylistSnapshot['linkedContextType'],
    linkedContextId: row.linked_context_id ? String(row.linked_context_id) : undefined,
    snapshotAt: String(row.snapshot_at),
    createdAt: String(row.created_at),
  }
}

export function mapEvidenceRow(row: Record<string, unknown>): PlaybackEvidence {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    trackPosition: row.track_position != null ? Number(row.track_position) : undefined,
    trackExternalId: row.track_external_id ? String(row.track_external_id) : undefined,
    trackTitle: row.track_title ? String(row.track_title) : undefined,
    trackArtist: row.track_artist ? String(row.track_artist) : undefined,
    provider: row.provider as PlaybackEvidence['provider'],
    evidenceType: row.evidence_type as PlaybackEvidence['evidenceType'],
    confidence: row.confidence as PlaybackEvidence['confidence'],
    confidenceScore: Number(row.confidence_score || 0),
    observedAt: String(row.observed_at),
    metadata: (row.metadata as Record<string, unknown>) || undefined,
  }
}

function sumDuration(tracks: PlaylistSnapshotTrack[]): number {
  return tracks.reduce((s, t) => s + (t.durationSeconds || 0), 0)
}

/** Create immutable playlist snapshot — never updated after insert. */
export async function createPlaylistSnapshot(
  sb: SupabaseClient,
  input: CreateSnapshotInput,
): Promise<PlaylistSnapshot> {
  const tracks = input.tracks.map((t, i) => ({ ...t, position: t.position || i + 1 }))
  const { data, error } = await sb
    .from('playlist_snapshots')
    .insert({
      platform: input.platform,
      external_playlist_id: input.externalPlaylistId || null,
      name: input.name,
      description: input.description || null,
      cover_image_url: input.coverImageUrl || null,
      owner_user_id: input.ownerUserId || null,
      owner_display_name: input.ownerDisplayName || null,
      track_count: tracks.length,
      total_duration_seconds: sumDuration(tracks),
      tracks,
      linked_context_type: input.linkedContextType || null,
      linked_context_id: input.linkedContextId || null,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapSnapshotRow(data as Record<string, unknown>)
}

export async function getPlaylistSnapshot(
  sb: SupabaseClient,
  id: string,
): Promise<PlaylistSnapshot | null> {
  const { data } = await sb.from('playlist_snapshots').select('*').eq('id', id).maybeSingle()
  return data ? mapSnapshotRow(data as Record<string, unknown>) : null
}

/** Persist evidence rows for a session. */
export async function persistEvidence(
  sb: SupabaseClient,
  sessionId: string,
  inputs: PlaybackEvidenceInput[],
): Promise<PlaybackEvidence[]> {
  if (!inputs.length) return []

  const rows = inputs.map(e => {
    const score = e.confidenceScore ?? scoreEvidenceRow(e)
    return {
      session_id: sessionId,
      track_position: e.trackPosition ?? null,
      track_external_id: e.trackExternalId || null,
      track_title: e.trackTitle || null,
      track_artist: e.trackArtist || null,
      provider: e.provider,
      evidence_type: e.evidenceType,
      confidence: e.confidence || scoreToConfidence(score),
      confidence_score: score,
      observed_at: e.observedAt || new Date().toISOString(),
      metadata: e.metadata || {},
    }
  })

  const { data, error } = await sb.from('playback_evidence').insert(rows).select('*')
  if (error) throw new Error(error.message)
  return (data || []).map(r => mapEvidenceRow(r as Record<string, unknown>))
}

export async function listSessionEvidence(
  sb: SupabaseClient,
  sessionId: string,
): Promise<PlaybackEvidence[]> {
  const { data } = await sb
    .from('playback_evidence')
    .select('*')
    .eq('session_id', sessionId)
    .order('observed_at', { ascending: true })
  return (data || []).map(r => mapEvidenceRow(r as Record<string, unknown>))
}

/** Merge evidence from multiple providers, dedupe by position+provider. */
export function mergeEvidence(inputs: PlaybackEvidenceInput[]): PlaybackEvidenceInput[] {
  const seen = new Set<string>()
  const out: PlaybackEvidenceInput[] = []
  for (const e of inputs) {
    const key = `${e.trackPosition ?? 'x'}:${e.provider}:${e.trackTitle}:${e.observedAt}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}

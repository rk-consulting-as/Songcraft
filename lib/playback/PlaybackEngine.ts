import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlaybackProvider } from './PlaybackProviders'
import { getProviderRegistry, collectViaToneStreamEvidence } from './providers'
import type {
  CreateSnapshotInput,
  PlaybackEvidenceInput,
  PlaybackProviderContext,
  PlaybackQueue,
  PlaybackReport,
  PlaybackSession,
  PlaylistSnapshot,
  StartPlaybackSessionInput,
} from './types'
import { finishPlaybackSessionFlow } from './PlaybackEvidence'
import { generatePlaybackReport } from './PlaybackReport'
import { createPlaylistSnapshot, getPlaylistSnapshot, mergeEvidence } from './PlaylistSnapshot'
import {
  createPlaybackSession,
  getPlaybackSession,
  listContextPlaybackSessions,
} from './PlaybackSession'
import {
  addQueueItem,
  createPlaybackQueue,
  finishQueue,
  getPlaybackQueue,
  startQueue,
} from './QueueEngine'

/**
 * Central playback orchestrator.
 * Community pages and APIs must go through PlaybackEngine — never call providers directly.
 */
export class PlaybackEngine {
  private providers: Record<string, PlaybackProvider>

  constructor(private sb: SupabaseClient, providers?: Record<string, PlaybackProvider>) {
    this.providers = providers || getProviderRegistry()
  }

  getProvider(id: string): PlaybackProvider | undefined {
    return this.providers[id]
  }

  listProviders(): PlaybackProvider[] {
    return Object.values(this.providers)
  }

  // ─── Snapshots ───────────────────────────────────────────────

  async createSnapshot(input: CreateSnapshotInput): Promise<PlaylistSnapshot> {
    return createPlaylistSnapshot(this.sb, input)
  }

  async getSnapshot(id: string): Promise<PlaylistSnapshot | null> {
    return getPlaylistSnapshot(this.sb, id)
  }

  /** Link external playlist URL — stores snapshot immediately (manual track list until API sync). */
  async linkPlaylistSnapshot(input: CreateSnapshotInput): Promise<PlaylistSnapshot> {
    return this.createSnapshot(input)
  }

  // ─── Sessions ────────────────────────────────────────────────

  async startSession(input: StartPlaybackSessionInput): Promise<PlaybackSession> {
    let expected = input.expectedTrackCount || 0
    if (input.playlistSnapshotId && !expected) {
      const snap = await getPlaylistSnapshot(this.sb, input.playlistSnapshotId)
      expected = snap?.trackCount || 0
    }

    const session = await createPlaybackSession(this.sb, { ...input, expectedTrackCount: expected })
    const ctx = await this.buildContext(session)

    await Promise.all(
      Object.values(this.providers)
        .filter(p => p.isConfigured)
        .map(p => p.startPlayback(ctx).catch(() => {})),
    )

    return session
  }

  async finishSession(sessionId: string): Promise<PlaybackEvidenceInput[]> {
    const session = await getPlaybackSession(this.sb, sessionId)
    if (!session) throw new Error('session_not_found')

    const ctx = await this.buildContext({ ...session, endedAt: new Date().toISOString() })
    const batches: PlaybackEvidenceInput[][] = []

    for (const provider of Object.values(this.providers)) {
      if (!provider.isConfigured && provider.id !== 'manual') continue
      try {
        const rows = await provider.finishPlayback(ctx)
        if (rows.length) batches.push(rows)
      } catch {
        // provider not ready
      }
    }

    // ViaTone stream engine evidence (always attempt for v2 sessions)
    if (ctx.contextType === 'v2_session') {
      const vt = await collectViaToneStreamEvidence(this.sb, ctx)
      if (vt.length) batches.push(vt)
    }

    return mergeEvidence(batches.flat())
  }

  async collectSessionEvidence(sessionId: string): Promise<PlaybackEvidenceInput[]> {
    const session = await getPlaybackSession(this.sb, sessionId)
    if (!session) throw new Error('session_not_found')

    const ctx = await this.buildContext(session)
    const batches: PlaybackEvidenceInput[][] = []

    for (const provider of Object.values(this.providers)) {
      if (!provider.isConfigured && provider.id !== 'manual') continue
      try {
        const rows = await provider.collectEvidence(ctx)
        if (rows.length) batches.push(rows)
      } catch {}
    }

    if (ctx.contextType === 'v2_session') {
      const vt = await collectViaToneStreamEvidence(this.sb, ctx)
      if (vt.length) batches.push(vt)
    }

    return mergeEvidence(batches.flat())
  }

  async completeSession(sessionId: string): Promise<{
    session: PlaybackSession
    evidence: Awaited<ReturnType<typeof finishPlaybackSessionFlow>>['evidence']
  }> {
    const result = await finishPlaybackSessionFlow(this, this.sb, sessionId)
    if (!result.session) throw new Error('session_not_found')
    return { session: result.session, evidence: result.evidence }
  }

  async getSession(sessionId: string): Promise<PlaybackSession | null> {
    return getPlaybackSession(this.sb, sessionId)
  }

  async listContextSessions(contextType: string, contextId: string): Promise<PlaybackSession[]> {
    return listContextPlaybackSessions(this.sb, contextType, contextId)
  }

  // ─── Reports ─────────────────────────────────────────────────

  async generateReport(input: Parameters<typeof generatePlaybackReport>[1]): Promise<PlaybackReport> {
    return generatePlaybackReport(this.sb, input)
  }

  // ─── Queue ───────────────────────────────────────────────────

  async createQueue(userId: string, name: string, snapshotIds: string[]): Promise<PlaybackQueue> {
    return createPlaybackQueue(this.sb, userId, name, snapshotIds)
  }

  async getQueue(queueId: string): Promise<PlaybackQueue | null> {
    return getPlaybackQueue(this.sb, queueId)
  }

  async addToQueue(queueId: string, snapshotId: string): Promise<PlaybackQueue> {
    return addQueueItem(this.sb, queueId, snapshotId)
  }

  async startQueueListening(queueId: string, userId: string, platform: StartPlaybackSessionInput['platform']) {
    const queue = await startQueue(this.sb, queueId)
    const first = queue.items[0]
    if (!first) throw new Error('queue_empty')

    const session = await this.startSession({
      userId,
      platform,
      playlistSnapshotId: first.snapshotId,
      queueId,
      contextType: 'queue',
      contextId: queueId,
      expectedTrackCount: queue.estimatedTrackCount,
    })

    return { queue, session }
  }

  async finishQueueListening(queueId: string, userId: string): Promise<{
    queue: PlaybackQueue
    report: PlaybackReport
  }> {
    const sessions = await listContextPlaybackSessions(this.sb, 'queue', queueId, 100)
    for (const s of sessions.filter(x => x.userId === userId && x.status === 'started')) {
      await this.completeSession(s.id)
    }

    const queue = await finishQueue(this.sb, queueId)
    const report = await generatePlaybackReport(this.sb, {
      queueId,
      contextType: 'queue',
      contextId: queueId,
      title: queue.name,
    })

    return { queue, report }
  }

  // ─── Internal ────────────────────────────────────────────────

  private async buildContext(session: PlaybackSession & { endedAt?: string }): Promise<PlaybackProviderContext> {
    const snapshot = session.playlistSnapshotId
      ? await getPlaylistSnapshot(this.sb, session.playlistSnapshotId)
      : undefined

    return {
      userId: session.userId,
      sessionId: session.id,
      platform: session.platform,
      snapshot: snapshot || undefined,
      contextType: session.contextType,
      contextId: session.contextId,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    }
  }
}

export function createPlaybackEngine(sb: SupabaseClient): PlaybackEngine {
  return new PlaybackEngine(sb)
}

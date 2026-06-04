'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AssetPicker from '@/components/media/AssetPicker'
import UpgradePrompt from '@/components/UpgradePrompt'
import WorkspaceEmptyState from '@/components/WorkspaceEmptyState'
import StoryPreviewModal from '@/components/artistStories/StoryPreviewModal'
import ArtistStoryAssistant from '@/components/artistStories/ArtistStoryAssistant'
import type { SongStorySource } from '@/lib/artistStories/generateFromSong'
import type { GeneratedStoryDraft } from '@/lib/artistStories/types'
import type { AIOutputLang } from '@/lib/aiOutputLanguage'
import {
  canGenerateStoryWithAi,
  canPublishMoreStories,
  canUseStorySeoControls,
  countStoriesTowardLimit,
  getPublishedStoriesLimit,
} from '@/lib/artistStories/limits'
import { resolveStoryOgImage } from '@/lib/artistStories/metadata'
import { estimateReadTimeMinutes, formatReadTimeLabel } from '@/lib/artistStories/readTime'
import {
  getStoryPublicUrl,
  getStoryShareCopyUrl,
  getStoryShareState,
  isStoryLive,
  type StoryShareState,
} from '@/lib/artistStories/publicUrl'
import { slugifyStoryTitle, uniqueStorySlug } from '@/lib/artistStories/slug'
import { isStoryPubliclyLive } from '@/lib/artistStories/visibility'
import { useStoryAnalytics } from '@/lib/artistStories/useStoryAnalytics'
import { buildSongListenLinks, songHasListenLinks } from '@/lib/songs/publicListenLinks'
import { STORY_TYPES, type ArtistStory, type StoryStatus, type StoryType } from '@/lib/artistStories/types'
import { t, useLang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase'
import type { MediaAsset } from '@/lib/mediaLibrary/types'
import type { PlanId } from '@/lib/subscription'

type Props = {
  artistId: string
  artistName: string
  pageSlug?: string | null
  pageEnabled?: boolean
  planId: PlanId
  songs: SongStorySource[]
  artistGenre?: string | null
  artistDescription?: string | null
  artistSongStructure?: string | null
  aiOutputLang?: AIOutputLang
  initialSongId?: string | null
}

const STORY_TYPE_LABEL_KEYS: Record<StoryType, string> = {
  behind_the_song: 'storyTypeBehindTheSong',
  release_story: 'storyTypeReleaseStory',
  artist_journal: 'storyTypeArtistJournal',
  lyrics_meaning: 'storyTypeLyricsMeaning',
  campaign_update: 'storyTypeCampaignUpdate',
  playlist_feature: 'storyTypePlaylistFeature',
  news: 'storyTypeNews',
}

const EMPTY_FORM = {
  id: '' as string,
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  story_type: 'artist_journal' as StoryType,
  song_id: '' as string,
  cover_image_url: '',
  cover_asset_id: '' as string,
  seo_title: '',
  seo_description: '',
  og_image_url: '',
  status: 'draft' as StoryStatus,
  public_hidden: false,
  schedule_at: '',
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function scheduleAtToIso(local: string): string | null {
  if (!local.trim()) return null
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function statusLabel(story: ArtistStory, tx: Record<string, string>): string {
  if (story.status === 'scheduled') return tx.storyStatusScheduled
  if (story.status === 'published' && story.published_at && !isStoryPubliclyLive(story)) return tx.storyStatusScheduled
  if (story.status === 'published') return tx.storyStatusPublished
  if (story.status === 'archived') return tx.storyStatusArchived
  return tx.storyStatusDraft
}

const SHARE_STATE_LABEL_KEYS: Record<Exclude<StoryShareState, 'live'>, string> = {
  draft: 'storyShareStateDraft',
  scheduled: 'storyShareStateScheduled',
  hidden: 'storyShareStateHidden',
  artist_not_public: 'storyShareStateArtistNotPublic',
  missing_slug: 'storyShareStateMissingSlug',
}

function shareStateLabel(
  state: StoryShareState,
  tx: Record<string, string>,
  publishedAt?: string | null,
): string {
  if (state === 'live') return ''
  const key = SHARE_STATE_LABEL_KEYS[state]
  const template = tx[key] || ''
  if (state === 'scheduled' && publishedAt) {
    return template.replace('{date}', new Date(publishedAt).toLocaleString())
  }
  return template
}

function LinkedSongPreviewCard({
  song,
  tx,
}: {
  song: SongStorySource
  tx: Record<string, string>
}) {
  const cover = song.cover_image_url || song.spotify_cover_url
  const linkCount = buildSongListenLinks(song).length
  const isPublic = !!song.publicSongUrl && !song.public_hidden
  return (
    <div className="artist-stories-manager__linked-song card workspace-card">
      <p className="artist-stories-manager__label" style={{ marginTop: 0 }}>{tx.storyLinkedSongPreview}</p>
      <div className="artist-stories-manager__linked-song-row">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="artist-stories-manager__linked-song-cover" />
        ) : (
          <div className="artist-stories-manager__linked-song-cover artist-stories-manager__linked-song-cover--empty" aria-hidden>🎵</div>
        )}
        <div>
          <p className="workspace-card-title" style={{ margin: 0 }}>{song.title}</p>
          <p className="workspace-section-desc">
            {isPublic ? tx.storyLinkedSongPublic : tx.storyLinkedSongPrivate}
            {linkCount > 0 && ` · ${(tx.storyLinkedSongMediaCount || '').replace('{count}', String(linkCount))}`}
          </p>
          {!songHasListenLinks(song) && (
            <p className="artist-stories-manager__linked-song-warn">{tx.storyLinkedSongNoMedia}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ArtistStoriesManager({
  artistId,
  artistName,
  pageSlug,
  pageEnabled,
  planId,
  songs,
  artistGenre,
  artistDescription,
  artistSongStructure,
  aiOutputLang = 'en',
  initialSongId,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [stories, setStories] = useState<ArtistStory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storyDirection, setStoryDirection] = useState('')
  const [form, setForm] = useState({ ...EMPTY_FORM, song_id: initialSongId || '' })
  const [editing, setEditing] = useState(false)
  const [coverPickerOpen, setCoverPickerOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<ArtistStory | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const publishLimit = getPublishedStoriesLimit(planId)
  const slotCount = useMemo(() => countStoriesTowardLimit(stories), [stories])
  const canPublishMore = canPublishMoreStories(planId, stories)
  const seoEnabled = canUseStorySeoControls(planId)
  const aiEnabled = canGenerateStoryWithAi(planId)

  const { byStoryId, loading: analyticsLoading } = useStoryAnalytics(
    artistId,
    stories.map(s => ({ id: s.id, slug: s.slug })),
  )

  const artistShareCtx = useMemo(
    () => ({ id: artistId, page_slug: pageSlug, page_enabled: pageEnabled, admin_hidden: false }),
    [artistId, pageSlug, pageEnabled],
  )

  const songSources = useMemo(
    () =>
      songs.map(s => ({
        ...s,
        id: s.id || '',
        genre: s.genre ?? artistGenre,
        artistName: s.artistName ?? artistName,
        artistDescription: s.artistDescription ?? artistDescription,
        artistSongStructure: s.artistSongStructure ?? artistSongStructure,
      })),
    [songs, artistGenre, artistName, artistDescription, artistSongStructure],
  )

  const linkedSongForForm = useMemo(
    () => songSources.find(s => s.id === form.song_id),
    [songSources, form.song_id],
  )

  const editingStory = useMemo(
    () => (form.id ? stories.find(s => s.id === form.id) : null),
    [form.id, stories],
  )

  const formPublishedAt = useMemo(() => {
    if (form.status === 'scheduled') return scheduleAtToIso(form.schedule_at)
    if (form.status === 'published') return editingStory?.published_at || new Date().toISOString()
    return null
  }, [form.status, form.schedule_at, editingStory?.published_at])

  const formShareState = useMemo(
    () =>
      getStoryShareState(
        {
          slug: form.slug,
          status: form.status,
          published_at: formPublishedAt,
          public_hidden: form.public_hidden,
          admin_hidden: editingStory?.admin_hidden ?? false,
        },
        artistShareCtx,
      ),
    [form.slug, form.status, formPublishedAt, form.public_hidden, editingStory?.admin_hidden, artistShareCtx],
  )

  const loadStories = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('artist_stories')
      .select('*')
      .eq('artist_id', artistId)
      .order('updated_at', { ascending: false })
    setStories((data || []) as ArtistStory[])
    setLoading(false)
  }, [artistId])

  useEffect(() => { loadStories() }, [loadStories])

  useEffect(() => {
    if (initialSongId && !editing) {
      setForm(f => ({ ...f, song_id: initialSongId, story_type: 'behind_the_song' }))
    }
  }, [initialSongId, editing])

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, song_id: initialSongId || '' })
    setEditing(false)
  }

  const openEdit = (story: ArtistStory) => {
    setForm({
      id: story.id,
      title: story.title,
      slug: story.slug,
      excerpt: story.excerpt || '',
      body: story.body || '',
      story_type: story.story_type,
      song_id: story.song_id || '',
      cover_image_url: story.cover_image_url || '',
      cover_asset_id: story.cover_asset_id || '',
      seo_title: story.seo_title || '',
      seo_description: story.seo_description || '',
      og_image_url: story.og_image_url || '',
      status: story.status,
      public_hidden: story.public_hidden,
      schedule_at: story.status === 'scheduled' || (story.published_at && !isStoryPubliclyLive(story))
        ? toDatetimeLocalValue(story.published_at)
        : '',
    })
    setEditing(true)
  }

  const buildPayload = (status: StoryStatus, publishedAt: string | null) => {
    const slugs = stories.filter(s => s.id !== form.id).map(s => s.slug)
    const slug = form.slug.trim() ? slugifyStoryTitle(form.slug) : uniqueStorySlug(form.title, slugs)
    return {
      artist_id: artistId,
      title: form.title.trim(),
      slug,
      excerpt: form.excerpt.trim() || null,
      body: form.body.trim() || null,
      story_type: form.story_type,
      song_id: form.song_id || null,
      cover_image_url: form.cover_image_url || null,
      cover_asset_id: form.cover_asset_id || null,
      seo_title: seoEnabled ? (form.seo_title.trim() || null) : null,
      seo_description: seoEnabled ? (form.seo_description.trim() || null) : null,
      og_image_url: seoEnabled ? (form.og_image_url.trim() || null) : null,
      status,
      public_hidden: form.public_hidden,
      published_at: publishedAt,
    }
  }

  const persistForm = async (status: StoryStatus, publishedAt: string | null) => {
    if (!form.title.trim()) return false
    setSaving(true)
    const supabase = createClient()
    const payload = buildPayload(status, publishedAt)
    let error
    if (form.id) {
      ({ error } = await supabase.from('artist_stories').update(payload).eq('id', form.id))
    } else {
      ({ error } = await supabase.from('artist_stories').insert(payload))
    }
    setSaving(false)
    if (error) {
      setToast(tx.storySaveError)
      return false
    }
    return true
  }

  const saveDraft = async () => {
    const ok = await persistForm('draft', null)
    if (!ok) return
    setToast(tx.storySavedSuccess)
    resetForm()
    loadStories()
  }

  const publishNow = async () => {
    if (!canPublishMore && form.status !== 'published') {
      setToast(tx.storyPublishLimit)
      return
    }
    const ok = await persistForm('published', new Date().toISOString())
    if (!ok) return
    setToast(tx.storyPublishedSuccess)
    resetForm()
    loadStories()
  }

  const schedulePublish = async () => {
    const at = scheduleAtToIso(form.schedule_at)
    if (!at) {
      setToast(tx.storyScheduleInvalid)
      return
    }
    if (new Date(at).getTime() <= Date.now()) {
      setToast(tx.storyScheduleFuture)
      return
    }
    if (!canPublishMore && form.status !== 'scheduled' && form.status !== 'published') {
      setToast(tx.storyPublishLimit)
      return
    }
    const ok = await persistForm('scheduled', at)
    if (!ok) return
    setToast(tx.storyScheduledSuccess)
    resetForm()
    loadStories()
  }

  const publishStory = async (story: ArtistStory) => {
    if (!canPublishMoreStories(planId, stories.filter(s => s.id !== story.id))) {
      setToast(tx.storyPublishLimit)
      return
    }
    const supabase = createClient()
    await supabase.from('artist_stories').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', story.id)
    setToast(tx.storyPublishedSuccess)
    loadStories()
  }

  const confirmArchive = async () => {
    if (!archiveTarget) return
    const supabase = createClient()
    await supabase.from('artist_stories').update({ status: 'archived', published_at: null }).eq('id', archiveTarget.id)
    setArchiveTarget(null)
    setToast(tx.storyArchivedSuccess)
    loadStories()
  }

  const unpublishStory = async (story: ArtistStory) => {
    const supabase = createClient()
    await supabase.from('artist_stories').update({ status: 'draft', published_at: null }).eq('id', story.id)
    loadStories()
  }

  const applyGeneratedDraft = (draft: GeneratedStoryDraft, mode: 'merge' | 'replace') => {
    const slugs = stories.map(s => s.slug)
    setForm(f => ({
      ...f,
      title: mode === 'replace' || !f.title.trim() ? draft.title : f.title,
      slug: mode === 'replace' || !f.slug.trim() ? uniqueStorySlug(draft.slug, slugs) : f.slug,
      excerpt: mode === 'replace' ? draft.excerpt : (f.excerpt.trim() ? f.excerpt : draft.excerpt),
      body: mode === 'replace' ? draft.body : (f.body.trim() ? f.body : draft.body),
      seo_title: mode === 'replace' || !f.seo_title.trim() ? draft.seo_title : f.seo_title,
      seo_description: mode === 'replace' || !f.seo_description.trim() ? draft.seo_description : f.seo_description,
      story_type: draft.story_type,
      song_id: form.song_id || f.song_id,
      status: 'draft',
    }))
    setEditing(true)
    setToast(tx.storyGeneratedDraft)
  }

  const onCoverSelect = (asset: MediaAsset) => {
    setForm(f => ({
      ...f,
      cover_image_url: asset.file_url,
      cover_asset_id: asset.id,
      og_image_url: f.og_image_url || asset.file_url,
    }))
    setCoverPickerOpen(false)
  }

  const sharePreviewImage = resolveStoryOgImage(
    { og_image_url: form.og_image_url, cover_image_url: form.cover_image_url },
    null,
  )
  const shareTitle = form.seo_title.trim() || form.title.trim() || artistName
  const shareDescription = form.seo_description.trim() || form.excerpt.trim()

  const copyStoryUrl = (url: string, toastKey?: string) => {
    if (!url) return
    navigator.clipboard.writeText(url).then(() => setToast(tx[toastKey || 'copied'] || tx.copied)).catch(() => {})
  }

  const copyShareForStory = (story: ArtistStory) => {
    const { url, state } = getStoryShareCopyUrl(story, artistShareCtx)
    copyStoryUrl(url, state === 'live' ? 'copied' : 'storyCopyUrlNotLive')
  }

  return (
    <div className="artist-stories-manager workspace-section">
      {toast && (
        <div className="artist-stories-manager__toast" role="status">{toast}</div>
      )}

      <div className="card workspace-card workspace-glass">
        <div className="artist-stories-manager__header">
          <div>
            <h2 className="workspace-section-title">{tx.artistSiteStoriesTitle}</h2>
            <p className="workspace-section-desc">{tx.artistSiteStoriesDesc}</p>
            <p className="workspace-section-desc">
              {tx.storyPublishLimitLabel}: {slotCount}{publishLimit !== null ? ` / ${publishLimit}` : ''}
            </p>
          </div>
          <button type="button" className="btn-gold quick-action-btn" onClick={() => { resetForm(); setEditing(true) }}>
            {tx.storyCreateNew}
          </button>
        </div>
      </div>

      {planId === 'free' && (
        <UpgradePrompt compact title={tx.storyFreeLimitTitle} description={tx.storyFreeLimitDesc} />
      )}

      <ArtistStoryAssistant
        songs={songSources.filter(s => s.id)}
        planId={planId}
        aiEnabled={aiEnabled}
        aiOutputLang={aiOutputLang}
        linkedSongId={form.song_id}
        storyType={form.story_type}
        direction={storyDirection}
        onLinkedSongIdChange={id => setForm(f => ({ ...f, song_id: id }))}
        onStoryTypeChange={type => setForm(f => ({ ...f, story_type: type }))}
        onDirectionChange={setStoryDirection}
        onApplyDraft={applyGeneratedDraft}
        onToast={setToast}
      />

      {editing && (
        <div className="card workspace-card workspace-glass artist-stories-manager__editor">
          <h3 className="workspace-card-title">{form.id ? tx.storyEditTitle : tx.storyCreateNew}</h3>

          <label className="artist-stories-manager__label">{tx.storyFieldTitle}</label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: f.slug || slugifyStoryTitle(e.target.value) }))}
            aria-label={tx.storyFieldTitle}
          />

          <label className="artist-stories-manager__label">{tx.storyFieldSlug}</label>
          <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} aria-label={tx.storyFieldSlug} />

          <label className="artist-stories-manager__label">{tx.storyFieldType}</label>
          <select value={form.story_type} onChange={e => setForm(f => ({ ...f, story_type: e.target.value as StoryType }))}>
            {STORY_TYPES.map(type => (
              <option key={type} value={type}>{tx[STORY_TYPE_LABEL_KEYS[type]]}</option>
            ))}
          </select>

          <label className="artist-stories-manager__label">{tx.storyFieldLinkedSong}</label>
          <select value={form.song_id} onChange={e => setForm(f => ({ ...f, song_id: e.target.value }))}>
            <option value="">{tx.storyNoLinkedSong}</option>
            {songs.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>

          {linkedSongForForm?.id && (
            <LinkedSongPreviewCard song={linkedSongForForm} tx={tx} />
          )}

          <label className="artist-stories-manager__label">{tx.storyFieldExcerpt}</label>
          <textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} rows={2} />

          <label className="artist-stories-manager__label">{tx.storyFieldBody}</label>
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={10} className="artist-stories-manager__body" />

          <div className="artist-stories-manager__cover-row">
            {form.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.cover_image_url} alt="" className="artist-stories-manager__cover-preview" />
            )}
            <button type="button" className="btn-outline quick-action-btn" onClick={() => setCoverPickerOpen(true)}>
              {tx.storyPickCover}
            </button>
          </div>

          {seoEnabled ? (
            <>
              <label className="artist-stories-manager__label">{tx.storyFieldSeoTitle}</label>
              <input value={form.seo_title} onChange={e => setForm(f => ({ ...f, seo_title: e.target.value }))} />
              <label className="artist-stories-manager__label">{tx.storyFieldSeoDescription}</label>
              <textarea value={form.seo_description} onChange={e => setForm(f => ({ ...f, seo_description: e.target.value }))} rows={2} />
            </>
          ) : (
            <UpgradePrompt compact title={tx.storySeoProTitle} description={tx.storySeoProDesc} />
          )}

          <div className="artist-stories-manager__share-preview card workspace-card">
            <h4 className="workspace-card-title">{tx.storySharePreviewTitle}</h4>
            {sharePreviewImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sharePreviewImage} alt="" className="artist-stories-manager__og-preview" />
            ) : (
              <p className="workspace-section-desc">{tx.storySharePreviewNoImage}</p>
            )}
            <p className="artist-stories-manager__share-title"><strong>{shareTitle}</strong></p>
            <p className="workspace-section-desc">{shareDescription || '—'}</p>
            {formShareState !== 'live' && (
              <>
                <p className="artist-stories-manager__share-state">{shareStateLabel(formShareState, tx, formPublishedAt)}</p>
                <p className="workspace-section-desc">{tx.storySharePreviewPrivate}</p>
                <p className="workspace-section-desc artist-stories-manager__share-social-note">{tx.storySharePreviewSocialNote}</p>
              </>
            )}
            {form.slug && (
              <div className="artist-stories-manager__share-actions">
                <button
                  type="button"
                  className="btn-outline quick-action-btn"
                  onClick={() => {
                    const { url, state } = getStoryShareCopyUrl(
                      {
                        slug: form.slug,
                        status: form.status,
                        published_at: formPublishedAt,
                        public_hidden: form.public_hidden,
                        admin_hidden: editingStory?.admin_hidden ?? false,
                      },
                      artistShareCtx,
                    )
                    copyStoryUrl(url, state === 'live' ? 'copied' : 'storyCopyUrlNotLive')
                  }}
                  disabled={!form.slug.trim()}
                >
                  {formShareState === 'live' ? tx.storyCopyPublicUrl : tx.storyCopyWorkspaceUrl}
                </button>
                {formShareState === 'live' && (
                  <a
                    href={getStoryPublicUrl({ slug: form.slug }, artistShareCtx)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline quick-action-btn"
                    style={{ textDecoration: 'none' }}
                  >
                    {tx.storyViewPublic}
                  </a>
                )}
              </div>
            )}
          </div>

          <label className="artist-stories-manager__label">{tx.storyScheduleAt}</label>
          <input
            type="datetime-local"
            value={form.schedule_at}
            onChange={e => setForm(f => ({ ...f, schedule_at: e.target.value }))}
            aria-label={tx.storyScheduleAt}
            className="artist-stories-manager__schedule-input"
          />

          <label className="artist-stories-manager__checkbox">
            <input type="checkbox" checked={form.public_hidden} onChange={e => setForm(f => ({ ...f, public_hidden: e.target.checked }))} />
            {tx.storyPublicHidden}
          </label>

          <div className="artist-stories-manager__actions">
            <button type="button" className="btn-gold quick-action-btn" onClick={saveDraft} disabled={saving || !form.title.trim()}>
              {saving ? tx.saving : tx.storySaveDraft}
            </button>
            <button type="button" className="btn-outline quick-action-btn" onClick={publishNow} disabled={saving || !form.title.trim() || !canPublishMore}>
              {tx.storyPublishNow}
            </button>
            <button type="button" className="btn-outline quick-action-btn" onClick={schedulePublish} disabled={saving || !form.title.trim() || !form.schedule_at || !canPublishMore}>
              {tx.storySchedule}
            </button>
            <button type="button" className="btn-outline quick-action-btn" onClick={() => setPreviewOpen(true)} disabled={!form.title.trim()}>
              {tx.storyPreview}
            </button>
            <button type="button" className="btn-outline quick-action-btn" onClick={resetForm}>{tx.cancel}</button>
          </div>
          <p className="workspace-section-desc">{tx.storyDraftOnlyNote}</p>
        </div>
      )}

      {loading ? (
        <p className="workspace-section-desc">{tx.loading}</p>
      ) : stories.length === 0 ? (
        <WorkspaceEmptyState icon="📖" title={tx.storyEmptyTitle} description={tx.storyEmptyDesc} />
      ) : (
        <ul className="artist-stories-manager__list">
          {stories.map(story => {
            const shareState = getStoryShareState(story, artistShareCtx)
            const live = isStoryLive(story, artistShareCtx)
            const publicUrl = live ? getStoryPublicUrl(story, artistShareCtx) : ''
            const linkedSong = story.song_id ? songSources.find(s => s.id === story.song_id) : null
            const stats = byStoryId[story.id]
            const readMins = estimateReadTimeMinutes(story.body, story.excerpt)
            const readLabel = formatReadTimeLabel(readMins, { minRead: tx.storyMinRead })
            const hasActivity = stats && (stats.views > 0 || stats.newsletterSignups > 0 || stats.songClicks > 0)

            return (
              <li key={story.id} className="card workspace-card workspace-glass artist-stories-manager__item">
                <div className="artist-stories-manager__item-main">
                  <h4 className="workspace-card-title">{story.title}</h4>
                  <p className="workspace-section-desc">
                    {tx[STORY_TYPE_LABEL_KEYS[story.story_type]]} · {statusLabel(story, tx)} · {readLabel}
                  </p>
                  {shareState !== 'live' && (
                    <p className="artist-stories-manager__share-state">{shareStateLabel(shareState, tx, story.published_at)}</p>
                  )}
                  {story.published_at && story.status !== 'draft' && (
                    <p className="artist-stories-manager__schedule-hint">
                      {tx.storyPublishAt}: {new Date(story.published_at).toLocaleString()}
                    </p>
                  )}
                  {story.excerpt && <p className="artist-stories-manager__excerpt">{story.excerpt}</p>}
                  {linkedSong?.id && <LinkedSongPreviewCard song={linkedSong} tx={tx} />}

                  {analyticsLoading ? (
                    <p className="workspace-section-desc">{tx.loading}</p>
                  ) : !hasActivity ? (
                    <p className="artist-stories-manager__analytics-empty">{tx.storyAnalyticsEmpty}</p>
                  ) : (
                    <ul className="artist-stories-manager__analytics">
                      <li><span>{tx.storyAnalyticsViews}</span><strong>{stats?.views ?? 0}</strong></li>
                      <li><span>{tx.storyAnalyticsRecent}</span><strong>{stats?.recentViews ?? 0}</strong></li>
                      <li><span>{tx.storyAnalyticsNewsletter}</span><strong>{stats?.newsletterSignups ?? 0}</strong></li>
                      <li><span>{tx.storyAnalyticsSongClicks}</span><strong>{stats?.songClicks ?? 0}</strong></li>
                    </ul>
                  )}
                </div>
                <div className="artist-stories-manager__item-actions">
                  <button type="button" className="btn-outline quick-action-btn" onClick={() => openEdit(story)}>{tx.edit}</button>
                  <button type="button" className="btn-outline quick-action-btn" onClick={() => { openEdit(story); setPreviewOpen(true) }}>{tx.storyPreview}</button>
                  {!live && story.status !== 'archived' && (
                    <button type="button" className="btn-gold quick-action-btn" onClick={() => publishStory(story)} disabled={!canPublishMoreStories(planId, stories.filter(s => s.id !== story.id))}>
                      {tx.storyPublishNow}
                    </button>
                  )}
                  {live && (
                    <button type="button" className="btn-outline quick-action-btn" onClick={() => unpublishStory(story)}>{tx.storyUnpublish}</button>
                  )}
                  {story.status !== 'archived' && (
                    <button type="button" className="btn-outline quick-action-btn" onClick={() => setArchiveTarget(story)}>{tx.storyArchive}</button>
                  )}
                  {story.slug && (
                    <button type="button" className="btn-outline quick-action-btn" onClick={() => copyShareForStory(story)}>
                      {live ? tx.storyCopyPublicUrl : tx.storyCopyWorkspaceUrl}
                    </button>
                  )}
                  {publicUrl && (
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn-outline quick-action-btn" style={{ textDecoration: 'none' }}>{tx.storyViewPublic}</a>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {pageSlug && pageEnabled && (
        <Link href={`/p/${pageSlug}/stories`} target="_blank" className="btn-outline quick-action-btn" style={{ textDecoration: 'none', alignSelf: 'flex-start' }}>
          {tx.storyViewAllPublic} ↗
        </Link>
      )}

      <StoryPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        story={{
          title: form.title,
          excerpt: form.excerpt,
          body: form.body,
          cover_image_url: form.cover_image_url,
        }}
        artistName={artistName}
        privateNote={formShareState !== 'live' ? tx.storySharePreviewPrivate : undefined}
      />

      {archiveTarget && (
        <div className="modal-overlay story-archive-confirm" role="dialog" aria-modal="true">
          <div className="card workspace-card story-archive-confirm__panel">
            <h3 className="workspace-card-title">{tx.storyArchiveConfirmTitle}</h3>
            <p className="workspace-section-desc">{tx.storyArchiveConfirmDesc}</p>
            <div className="artist-stories-manager__actions">
              <button type="button" className="btn-outline quick-action-btn" onClick={() => setArchiveTarget(null)}>{tx.cancel}</button>
              <button type="button" className="btn-gold quick-action-btn" onClick={confirmArchive}>{tx.storyArchive}</button>
            </div>
          </div>
        </div>
      )}

      {coverPickerOpen && (
        <AssetPicker
          open={coverPickerOpen}
          onClose={() => setCoverPickerOpen(false)}
          onSelect={onCoverSelect}
          artistId={artistId}
          types={['cover', 'promo_image', 'social_graphic', 'epk_image']}
        />
      )}
    </div>
  )
}

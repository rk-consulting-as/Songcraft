'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AssetPicker from '@/components/media/AssetPicker'
import UpgradePrompt from '@/components/UpgradePrompt'
import WorkspaceEmptyState from '@/components/WorkspaceEmptyState'
import { buildBehindTheSongPrompt, parseGeneratedStoryJson } from '@/lib/artistStories/generateFromSong'
import { canGenerateStoryWithAi, canPublishMoreStories, canUseStorySeoControls, getPublishedStoriesLimit } from '@/lib/artistStories/limits'
import { slugifyStoryTitle, uniqueStorySlug } from '@/lib/artistStories/slug'
import { STORY_TYPES, type ArtistStory, type StoryStatus, type StoryType } from '@/lib/artistStories/types'
import { clientPublicUrl } from '@/lib/appUrl'
import { t, useLang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase'
import type { MediaAsset } from '@/lib/mediaLibrary/types'
import type { PlanId } from '@/lib/subscription'

type SongOption = { id: string; title: string; lyrics_text?: string | null; backstory?: string | null }

type Props = {
  artistId: string
  artistName: string
  pageSlug?: string | null
  pageEnabled?: boolean
  planId: PlanId
  songs: SongOption[]
  artistGenre?: string | null
  artistDescription?: string | null
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
  initialSongId,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [stories, setStories] = useState<ArtistStory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM, song_id: initialSongId || '' })
  const [editing, setEditing] = useState(false)
  const [coverPickerOpen, setCoverPickerOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const publishedCount = useMemo(() => stories.filter(s => s.status === 'published').length, [stories])
  const publishLimit = getPublishedStoriesLimit(planId)
  const canPublish = canPublishMoreStories(planId, publishedCount) || form.status === 'published'
  const seoEnabled = canUseStorySeoControls(planId)
  const aiEnabled = canGenerateStoryWithAi(planId)

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
    })
    setEditing(true)
  }

  const saveStory = async (nextStatus?: StoryStatus) => {
    if (!form.title.trim()) return
    setSaving(true)
    const supabase = createClient()
    const slugs = stories.filter(s => s.id !== form.id).map(s => s.slug)
    const slug = form.slug.trim() ? slugifyStoryTitle(form.slug) : uniqueStorySlug(form.title, slugs)
    const status = nextStatus || form.status
    const payload = {
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
    }

    let error
    if (form.id) {
      ({ error } = await supabase.from('artist_stories').update(payload).eq('id', form.id))
    } else {
      ({ error } = await supabase.from('artist_stories').insert(payload))
    }

    setSaving(false)
    if (error) {
      setToast(tx.storySaveError)
      return
    }
    setToast(status === 'published' ? tx.storyPublishedSuccess : tx.storySavedSuccess)
    resetForm()
    loadStories()
  }

  const publishStory = async (story: ArtistStory) => {
    if (!canPublishMoreStories(planId, publishedCount)) {
      setToast(tx.storyPublishLimit)
      return
    }
    const supabase = createClient()
    await supabase.from('artist_stories').update({ status: 'published' }).eq('id', story.id)
    setToast(tx.storyPublishedSuccess)
    loadStories()
  }

  const archiveStory = async (story: ArtistStory) => {
    const supabase = createClient()
    await supabase.from('artist_stories').update({ status: 'archived' }).eq('id', story.id)
    loadStories()
  }

  const unpublishStory = async (story: ArtistStory) => {
    const supabase = createClient()
    await supabase.from('artist_stories').update({ status: 'draft', published_at: null }).eq('id', story.id)
    loadStories()
  }

  const generateFromSong = async () => {
    const song = songs.find(s => s.id === form.song_id)
    if (!song || !aiEnabled) return
    setGenerating(true)
    const { system, user } = buildBehindTheSongPrompt({
      title: song.title,
      lyrics: song.lyrics_text,
      backstory: song.backstory,
      genre: artistGenre,
      artistName,
      artistDescription,
    })
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: user }],
          system,
          feature: 'story_behind_the_song',
        }),
      })
      const json = await res.json()
      const draft = parseGeneratedStoryJson(json.content || json.text || '', song.title)
      if (!draft) {
        setToast(tx.storyGenerateError)
        return
      }
      const slugs = stories.map(s => s.slug)
      setForm(f => ({
        ...f,
        title: draft.title,
        slug: uniqueStorySlug(draft.slug, slugs),
        excerpt: draft.excerpt,
        body: draft.body,
        seo_title: draft.seo_title,
        seo_description: draft.seo_description,
        story_type: 'behind_the_song',
        song_id: song.id,
        status: 'draft',
      }))
      setEditing(true)
      setToast(tx.storyGeneratedDraft)
    } catch {
      setToast(tx.storyGenerateError)
    } finally {
      setGenerating(false)
    }
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

  const publicStoryUrl = (storySlug: string) =>
    pageSlug && pageEnabled ? clientPublicUrl(`/p/${pageSlug}/stories/${storySlug}`) : ''

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
              {tx.storyPublishLimitLabel}: {publishedCount}{publishLimit !== null ? ` / ${publishLimit}` : ''}
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

          {form.song_id && (
            <button type="button" className="btn-outline quick-action-btn" onClick={generateFromSong} disabled={generating || !aiEnabled}>
              {generating ? tx.generating : tx.storyGenerateBehindTheSong}
            </button>
          )}
          {!aiEnabled && form.song_id && (
            <UpgradePrompt compact title={tx.storyAiProTitle} description={tx.storyAiProDesc} />
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

          <label className="artist-stories-manager__checkbox">
            <input type="checkbox" checked={form.public_hidden} onChange={e => setForm(f => ({ ...f, public_hidden: e.target.checked }))} />
            {tx.storyPublicHidden}
          </label>

          <div className="artist-stories-manager__actions">
            <button type="button" className="btn-gold quick-action-btn" onClick={() => saveStory('draft')} disabled={saving || !form.title.trim()}>
              {saving ? tx.saving : tx.storySaveDraft}
            </button>
            <button
              type="button"
              className="btn-outline quick-action-btn"
              onClick={() => saveStory('published')}
              disabled={saving || !form.title.trim() || !canPublish}
            >
              {tx.storyPublish}
            </button>
            {publicStoryUrl(form.slug) && (
              <a href={publicStoryUrl(form.slug)} target="_blank" rel="noopener noreferrer" className="btn-outline quick-action-btn" style={{ textDecoration: 'none' }}>
                {tx.storyPreview}
              </a>
            )}
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
            const url = publicStoryUrl(story.slug)
            return (
              <li key={story.id} className="card workspace-card workspace-glass artist-stories-manager__item">
                <div className="artist-stories-manager__item-main">
                  <h4 className="workspace-card-title">{story.title}</h4>
                  <p className="workspace-section-desc">
                    {tx[STORY_TYPE_LABEL_KEYS[story.story_type]]} · {story.status}
                  </p>
                  {story.excerpt && <p className="artist-stories-manager__excerpt">{story.excerpt}</p>}
                </div>
                <div className="artist-stories-manager__item-actions">
                  <button type="button" className="btn-outline quick-action-btn" onClick={() => openEdit(story)}>{tx.edit}</button>
                  {story.status !== 'published' && (
                    <button type="button" className="btn-gold quick-action-btn" onClick={() => publishStory(story)} disabled={!canPublishMoreStories(planId, publishedCount)}>
                      {tx.storyPublish}
                    </button>
                  )}
                  {story.status === 'published' && (
                    <button type="button" className="btn-outline quick-action-btn" onClick={() => unpublishStory(story)}>{tx.storyUnpublish}</button>
                  )}
                  {story.status !== 'archived' && (
                    <button type="button" className="btn-outline quick-action-btn" onClick={() => archiveStory(story)}>{tx.storyArchive}</button>
                  )}
                  {url && story.status === 'published' && !story.public_hidden && (
                    <>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="btn-outline quick-action-btn" style={{ textDecoration: 'none' }}>{tx.storyViewPublic}</a>
                      <button type="button" className="btn-outline quick-action-btn" onClick={() => navigator.clipboard.writeText(url)}>{tx.storyCopyUrl}</button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {pageSlug && pageEnabled && (
        <Link href={clientPublicUrl(`/p/${pageSlug}/stories`)} target="_blank" className="btn-outline quick-action-btn" style={{ textDecoration: 'none', alignSelf: 'flex-start' }}>
          {tx.storyViewAllPublic} ↗
        </Link>
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

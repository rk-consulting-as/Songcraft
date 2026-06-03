'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'
import { type AIProvider, getStoredProvider, setStoredProvider } from '@/lib/aiProvider'
import ZoomableImage from '@/components/ZoomableImage'
import SongStudioShell from '@/components/songStudio/SongStudioShell'
import SongStudioHero from '@/components/songStudio/SongStudioHero'
import SongStudioNav from '@/components/songStudio/SongStudioNav'
import SongStudioMobileNavigator from '@/components/songStudio/SongStudioMobileNavigator'
import SongStudioSubNav from '@/components/songStudio/SongStudioSubNav'
import SongStudioOverview from '@/components/songStudio/SongStudioOverview'
import SongStudioSettingsPanel from '@/components/songStudio/SongStudioSettingsPanel'
import SongStudioWorkspaceContext from '@/components/songStudio/SongStudioWorkspaceContext'
import ImportFinishedTrackCard from '@/components/songStudio/ImportFinishedTrackCard'
import SongPromoteAssetsPanel from '@/components/songStudio/SongPromoteAssetsPanel'
import SongStudioToast from '@/components/songStudio/SongStudioToast'
import ContentLimitCounter from '@/components/songStudio/ContentLimitCounter'
import AiPlatformSelector from '@/components/songStudio/AiPlatformSelector'
import WorkspaceEmptyState from '@/components/WorkspaceEmptyState'
import {
  buildSongStudioHash,
  defaultPanelForArea,
  getActivePanel,
  legacyPanelToRoute,
  parseSongStudioHash,
  type SongStudioArea,
  type SongStudioRoute,
  type WritePanel,
  type ProducePanel,
  type ReleasePanel,
  type PublishPanel,
} from '@/lib/songStudio/routes'
import { cleanLyricsText } from '@/lib/lyricsCleanup'
import {
  buildAdaptLyricsSystem,
  buildLyricsGenerationSystem,
  buildLyricsRefineSystem,
  buildStylePromptGenerationConstraints,
  getContentLimit,
  getPlatformProfile,
  getTextCharCount,
  isWithinHardLimit,
  lyricsFitPlatform,
  shouldShowAdaptAction,
  stylePromptFitPlatform,
} from '@/lib/aiPlatformProfiles/limits'
import {
  buildAdaptActionKey,
  buildCopyLimitWarningKey,
  buildReadinessLyricsLabelKey,
  buildReadinessPromptLabelKey,
  resolveSongAiPlatformSettings,
} from '@/lib/aiPlatformProfiles/copy'
import { normalizePlatformId } from '@/lib/aiPlatformProfiles/profiles'
import type { CustomPlatformLimits, PlatformId } from '@/lib/aiPlatformProfiles/types'
import Link from 'next/link'
import DistributionModal from '@/components/DistributionModal'
import DistributionWorkflow from '@/components/DistributionWorkflow'
import ClickStats from '@/components/ClickStats'
import QRCodeCard from '@/components/QRCodeCard'
import AssetPicker from '@/components/media/AssetPicker'
import { saveUrlToMediaLibrary } from '@/lib/mediaLibrary/saveToLibrary'
import { trackMediaUsage } from '@/lib/mediaLibrary/usage'
import type { MediaAsset } from '@/lib/mediaLibrary/types'
import UpgradePrompt from '@/components/UpgradePrompt'
import EmbedCodeGenerator from '@/components/EmbedCodeGenerator'
import MobileQuickActions from '@/components/MobileQuickActions'
import { isSongPublicPageAvailable } from '@/components/SongPublicPageActions'
import { clientPublicUrl } from '@/lib/appUrl'
import { canUseFeature, getMonthlyAiUsage, getUserPlan } from '@/lib/subscription'
import { AI_OUTPUT_LANGUAGES, aiOutputLanguageDirective, aiOutputLanguageName, normalizeAIOutputLang, type AIOutputLang } from '@/lib/aiOutputLanguage'
import { generateSongDNA } from '@/lib/songDNA/generateSongDNA'
import { normalizeSongDNA, type SongDNA } from '@/lib/songDNA/types'
import { compressSunoPrompt } from '@/lib/songCreation/compressSunoPrompt'
import { prepareSunoPromptPair, SUNO_CREATE_URL, sunoSystemPromptForMode } from '@/lib/songCreation/exportPrompt'
import type { SunoPromptMode } from '@/lib/songCreation/types'
import SongDNAPanel from '@/components/songCreation/SongDNAPanel'
import SunoPromptToolbar from '@/components/songCreation/SunoPromptToolbar'

const PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'YouTube', 'X/Twitter']
const MEDIA_PLATFORMS = ['Spotify', 'YouTube', 'TikTok', 'Instagram', 'Facebook', 'Apple Music', 'SoundCloud', 'Other']

export default function SongPage() {
  const params = useParams()
  const router = useRouter()
  const songId = params.id as string
  const [lang, setLangState] = useState<Lang>('en')
  const [studioRoute, setStudioRoute] = useState<SongStudioRoute>({ area: 'overview' })
  const [song, setSong] = useState<any>(null)
  const [artist, setArtist] = useState<any>(null)
  const [planId, setPlanId] = useState<'free' | 'pro'>('free')
  const [linkedStory, setLinkedStory] = useState<{
    id: string; title: string; slug: string; status: string
    published_at?: string | null; public_hidden?: boolean; admin_hidden?: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiTarget, setAiTarget] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [lyricsInstructions, setLyricsInstructions] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [lyricsHistory, setLyricsHistory] = useState<any[]>([])
  const [lyricsChat, setLyricsChat] = useState('')
  const [useProfileForLyrics, setUseProfileForLyrics] = useState(true)

  const [sunoPrompt, setSunoPrompt] = useState('')
  const [sunoPromptDetailed, setSunoPromptDetailed] = useState('')
  const [sunoPromptMode, setSunoPromptMode] = useState<SunoPromptMode>('compact')
  const [songDna, setSongDna] = useState<SongDNA | null>(null)
  const [proposalMeta, setProposalMeta] = useState<{ genre?: string; mood?: string } | null>(null)
  const [dnaRegenerating, setDnaRegenerating] = useState(false)
  const [backstory, setBackstory] = useState('')

  const [captions, setCaptions] = useState<Record<string, string>>({})
  const [captionTone, setCaptionTone] = useState('')
  const [captionLangOverride, setCaptionLangOverride] = useState(false)
  const [captionForcedLang, setCaptionForcedLang] = useState<'no'|'en'|'auto'>('auto')

  const [coverStyle, setCoverStyle] = useState('')
  const [coverPrompt, setCoverPrompt] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  // Cover style/mood preset chips and image generation knobs
  const [coverStyleChips, setCoverStyleChips] = useState<string[]>([])
  const [coverMoodChips, setCoverMoodChips] = useState<string[]>([])
  const [coverAspect, setCoverAspect] = useState<'1:1' | '9:16' | '16:9'>('1:1')
  const [coverQuality, setCoverQuality] = useState<'low' | 'medium' | 'high'>('medium')

  const [mediaLinks, setMediaLinks] = useState<{platform:string;url:string;label:string}[]>([])
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [savingSpotify, setSavingSpotify] = useState(false)
  const [newPlatform, setNewPlatform] = useState('Spotify')
  const [newUrl, setNewUrl] = useState('')
  const [newLabel, setNewLabel] = useState('')

  const [publishContent, setPublishContent] = useState<Record<string, any>>({})
  const [showDistribution, setShowDistribution] = useState(false)
  const [title, setTitle] = useState('')
  const [studioToast, setStudioToast] = useState<{
    message: string
    tone: 'success' | 'error' | 'info' | 'warning'
    actions?: { label: string; onClick: () => void; variant?: 'gold' | 'outline' }[]
  } | null>(null)
  const [featuredReleaseSaving, setFeaturedReleaseSaving] = useState(false)
  const [sunoCopied, setSunoCopied] = useState(false)

  // AI provider (persisted in localStorage)
  const [aiProvider, setAiProvider] = useState<AIProvider>('anthropic')

  // Per-song output language for AI generations (independent from UI language).
  const [aiOutputLang, setAiOutputLang] = useState<AIOutputLang>('en')

  // Whether to include the song's lyrics in publish-tab generations (WordPress, FB, etc.).
  const [includeLyricsInPublish, setIncludeLyricsInPublish] = useState(false)

  // Clean-text modal
  const [showCleanLyrics, setShowCleanLyrics] = useState(false)

  // AI image generation state
  const [imageGenerating, setImageGenerating] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [coverPickerOpen, setCoverPickerOpen] = useState(false)
  const [saveCoverToLibrary, setSaveCoverToLibrary] = useState(true)

  // Lyrics history viewer
  const [showHistory, setShowHistory] = useState(false)

  // Suno import
  type SunoPreview = {
    id: string | null
    sunoUrl: string
    title: string | null
    coverUrl: string | null
    audioUrl: string | null
    description: string | null
    tags: string | null
    lyrics: string | null
  }
  const [sunoUrlInput, setSunoUrlInput] = useState('')
  const [sunoFetching, setSunoFetching] = useState(false)
  const [sunoError, setSunoError] = useState<string | null>(null)
  const [sunoPreview, setSunoPreview] = useState<SunoPreview | null>(null)
  const [sunoSaving, setSunoSaving] = useState(false)

  // Canvas (short looping video, e.g. for Spotify Canvas)
  const [canvasPrompt, setCanvasPrompt] = useState('')
  const [canvasUrl, setCanvasUrl] = useState('')
  const [canvasProvider, setCanvasProvider] = useState<string>('')
  const [canvasMeta, setCanvasMeta] = useState<any>({})
  const [canvasAspect, setCanvasAspect] = useState<'9:16' | '16:9' | '1:1'>('9:16')
  const [canvasDuration, setCanvasDuration] = useState<number>(5)
  const [canvasMode, setCanvasMode] = useState<'text-to-video' | 'image-to-video'>('text-to-video')
  const [canvasImageSource, setCanvasImageSource] = useState<'cover' | 'upload'>('cover')
  const [canvasImageUrl, setCanvasImageUrl] = useState<string>('')
  const [canvasImageUploading, setCanvasImageUploading] = useState(false)
  const [canvasI2vImageGenerating, setCanvasI2vImageGenerating] = useState(false)
  const canvasImageFileRef = useRef<HTMLInputElement | null>(null)
  const [canvasGenerating, setCanvasGenerating] = useState(false)
  const [canvasGenStatus, setCanvasGenStatus] = useState<string>('')
  const [canvasError, setCanvasError] = useState<string | null>(null)
  const [canvasUploading, setCanvasUploading] = useState(false)
  const [canvasExternalInput, setCanvasExternalInput] = useState('')
  const canvasFileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const l = useLang()
    setLangState(l)
    setAiProvider(getStoredProvider())
    fetchSong()
  }, [songId])

  useEffect(() => {
    const syncFromHash = () => setStudioRoute(parseSongStudioHash(window.location.hash))
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  const pickProvider = (p: AIProvider) => { setAiProvider(p); setStoredProvider(p) }

  const tx = t[lang] as Record<string, string>
  const { platformId: aiPlatformId, customLimits: aiPlatformCustomLimits } = resolveSongAiPlatformSettings(
    publishContent,
    artist?.page_settings,
  )
  const platformProfile = getPlatformProfile(aiPlatformId, aiPlatformCustomLimits)
  const platformLabel = tx[platformProfile.labelKey] || platformProfile.id
  const lyricsContentLimit = getContentLimit(aiPlatformId, 'lyrics', aiPlatformCustomLimits)
  const adaptLyricsLabel = tx[buildAdaptActionKey(aiPlatformId)] || tx.aiAdaptForSuno

  const navigateToRoute = (route: SongStudioRoute) => {
    setStudioRoute(route)
    if (typeof window === 'undefined') return
    const hash = buildSongStudioHash(route)
    const next = hash ? `#${hash}` : ''
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`)
    }
  }
  const navigateToArea = (area: SongStudioArea) => navigateToRoute(defaultPanelForArea(area))
  const navigateToPanel = (panel: string) => navigateToRoute(legacyPanelToRoute(panel))
  const panel = getActivePanel(studioRoute)

  const fetchSong = async () => {
    const supabase = createClient()
    // Explicit owner check — admin role should not be able to open another user's song
    // through direct URL navigation. Use eq('user_id', ...) so RLS isn't the only gate.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const currentPlan = await getUserPlan(supabase, user.id)
    setPlanId(currentPlan.id)
    const { data: profilePrefs } = await supabase
      .from('profiles')
      .select('preferred_ai_output_lang, preferred_song_lang')
      .eq('id', user.id)
      .maybeSingle()
    setAiOutputLang(normalizeAIOutputLang((profilePrefs as any)?.preferred_ai_output_lang || ((profilePrefs as any)?.preferred_song_lang === 'no' ? 'no' : 'en')))
    const { data } = await supabase
      .from('songs')
      .select('*, artists(*)')
      .eq('id', songId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!data) {
      // Not your song — bounce to dashboard.
      router.push('/dashboard')
      return
    }
    if (data) {
      setSong(data); setArtist(data.artists)
      setTitle(data.title || '')
      setLyricsInstructions(data.lyrics_instructions || '')
      setLyrics(data.lyrics_text || '')
      setLyricsHistory(data.lyrics_history || [])
      setSunoPrompt(data.suno_prompt || '')
      setSunoPromptDetailed(data.suno_prompt_detailed || '')
      setSongDna(data.song_dna ? normalizeSongDNA(data.song_dna) : null)
      setProposalMeta(data.proposal_meta || null)
      if (!data.song_dna && (data.lyrics_text || data.lyrics_instructions)) {
        setSongDna(generateSongDNA({
          title: data.title,
          instructions: data.lyrics_instructions,
          lyrics: data.lyrics_text,
          genre: data.proposal_meta?.genre,
          mood: data.proposal_meta?.mood,
          backstory: data.backstory,
        }))
      }
      setBackstory(data.backstory || '')
      setCaptions(data.captions || {})
      setCoverStyle(data.cover_style || '')
      setCoverPrompt(data.cover_prompt || '')
      setCoverImageUrl(data.cover_image_url || '')
      setMediaLinks(data.media_links || [])
      setSpotifyUrl(data.spotify_url || '')
      setCanvasPrompt(data.canvas_prompt || '')
      setCanvasUrl(data.canvas_video_url || '')
      setCanvasProvider(data.canvas_provider || '')
      setCanvasMeta(data.canvas_meta || {})
      setPublishContent(data.publish_content || {})
      const artistRow = data.artists as { id?: string } | null
      if (artistRow?.id) {
        const { data: storyRows } = await supabase
          .from('artist_stories')
          .select('id, title, slug, status, published_at, public_hidden, admin_hidden')
          .eq('song_id', songId)
          .eq('artist_id', artistRow.id)
          .neq('status', 'archived')
          .order('updated_at', { ascending: false })
          .limit(1)
        setLinkedStory(storyRows?.[0] || null)
      } else {
        setLinkedStory(null)
      }
    }
    setLoading(false)
  }

  const save = async (updates: any) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('songs').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', songId).eq('user_id', user.id)
  }

  const callAI = async (messages: any[], system: string, targetKey: string) => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (userId) {
      const usage = await getMonthlyAiUsage(supabase, userId)
      const access = await canUseFeature(supabase, userId, 'ai_generations_monthly', usage)
      if (!access.allowed) {
        alert(tx.upgradeAiDesc)
        return ''
      }
    }
    setAiLoading(true); setAiTarget(targetKey)
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        messages,
        system: `${aiOutputLanguageDirective(aiOutputLang)}\n${system}`,
        provider: aiProvider,
      }),
    })
    const data = await res.json()
    setAiLoading(false); setAiTarget('')
    return data.text || ''
  }

  // AI cover image generation: takes the prompt, calls /api/image, uploads base64 to Storage,
  // then sets cover_image_url. Stays in the existing 'covers' Supabase Storage bucket.
  const generateCoverImage = async () => {
    if (!coverPrompt.trim()) return
    setImageGenerating(true)
    setImageError(null)
    // Map our aspect-ratio to gpt-image-1 sizes (only specific values are supported).
    const size = coverAspect === '9:16' ? '1024x1536' : coverAspect === '16:9' ? '1536x1024' : '1024x1024'
    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: coverPrompt, size, quality: coverQuality }),
      })
      const data = await res.json()
      if (data.error) {
        setImageError(data.error)
        setImageGenerating(false)
        return
      }
      // Decode base64 to a Blob and upload to Supabase Storage.
      const b64: string = data.b64
      const mime: string = data.mime || 'image/png'
      const binStr = atob(b64)
      const bytes = new Uint8Array(binStr.length)
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i)
      const blob = new Blob([bytes], { type: mime })
      const supabase = createClient()
      const path = `${songId}/cover-${Date.now()}.png`
      const { error: upErr } = await supabase.storage.from('covers').upload(path, blob, {
        upsert: true,
        contentType: mime,
      })
      if (upErr) {
        setImageError(upErr.message)
        setImageGenerating(false)
        return
      }
      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path)
      setCoverImageUrl(urlData.publicUrl)
      await save({ cover_image_url: urlData.publicUrl })
      await maybeSaveCoverToLibrary(urlData.publicUrl)
    } catch (e: any) {
      setImageError(e?.message || 'Image generation failed')
    }
    setImageGenerating(false)
  }

  // ───── Canvas: AI prompt generation, video generation, manual upload, manual URL paste ─────

  /**
   * Generate a Canvas video prompt using everything we know about the song:
   * artist context, lyrics instructions, cover prompt, lyrics excerpt, target aspect/duration.
   * Uses the same AI provider toggle (Claude / GPT) as the rest of the app.
   */
  const generateCanvasPrompt = async () => {
    const artistCtx = buildArtistContext()
    const lyricsExcerpt = lyrics ? lyrics.slice(0, 600) : ''
    const userContent = [
      title ? `Song title: ${title}` : '',
      artistCtx ? artistCtx.trim() : '',
      lyricsInstructions ? `Theme / concept: ${lyricsInstructions}` : '',
      coverPrompt ? `Cover image prompt (for visual consistency): ${coverPrompt}` : '',
      coverStyle ? `Visual style: ${coverStyle}` : '',
      lyricsExcerpt ? `Lyrics excerpt:\n${lyricsExcerpt}` : '',
      `Target format: ${canvasAspect} aspect ratio, ${canvasDuration} seconds, looping clip.`,
    ].filter(Boolean).join('\n\n')

    const system = [
      'You are an expert in AI video generation (Seedance, Runway, Sora) for Spotify Canvas — short 3-10 second looping video clips that play behind a track.',
      '',
      'Write a single video prompt that captures the song\'s aesthetic and mood. Guidelines:',
      '- Focus on ATMOSPHERE and MOTION rather than narrative. Canvas videos loop, so the scene should not have a clear beginning or end.',
      '- Be specific about: subject, camera motion (slow dolly, locked off, gentle pan, drift), lighting (warm, cool, neon, golden hour, fog, smoky), colors, texture, mood.',
      '- Keep visual consistency with the cover image when one is provided — same palette and feel.',
      '- Avoid hard cuts, fast action, cluttered scenes, or text overlays. Spotify Canvas works best with hypnotic, dreamy clips.',
      '- Output only the prompt itself — no preamble, no markdown, no headers. Plain English, max 100 words.',
      '- End with a phrase like "looping motion" or "seamless loop" to hint at loopability.',
    ].join('\n')

    const result = await callAI([{ role: 'user', content: userContent }], system, 'canvas_prompt')
    if (result) {
      setCanvasPrompt(result)
      await save({ canvas_prompt: result })
    }
  }


  /** Helper: download a video from an external URL via the server proxy and upload to Storage. */
  const persistVideoFromUrl = async (sourceUrl: string, provider: string, meta: any): Promise<string | null> => {
    setCanvasError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const proxyUrl = `/api/canvas/proxy?url=${encodeURIComponent(sourceUrl)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || `Proxy ${res.status}`)
      }
      const blob = await res.blob()
      const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('webm') ? 'webm' : 'mp4'
      const path = `canvas/${user?.id || 'anon'}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('covers').upload(path, blob, {
        upsert: true,
        contentType: blob.type || 'video/mp4',
      })
      if (upErr) throw new Error(upErr.message)
      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      // Persist on the song row.
      await save({
        canvas_video_url: publicUrl,
        canvas_prompt: canvasPrompt || null,
        canvas_provider: provider,
        canvas_meta: meta,
      })
      setCanvasUrl(publicUrl)
      setCanvasProvider(provider)
      setCanvasMeta(meta)
      return publicUrl
    } catch (e: any) {
      setCanvasError(e?.message || 'Could not save video')
      return null
    }
  }

  const generateCanvas = async () => {
    if (!canvasPrompt.trim() || canvasGenerating) return
    // For image-to-video, derive the source URL from cover or upload, and require it.
    let sourceImageUrl = ''
    if (canvasMode === 'image-to-video') {
      sourceImageUrl = canvasImageSource === 'cover' ? coverImageUrl : canvasImageUrl
      if (!sourceImageUrl) {
        setCanvasError(lang === 'no'
          ? 'Velg eller last opp et startbilde først.'
          : 'Choose or upload a starting image first.')
        return
      }
    }
    setCanvasGenerating(true)
    setCanvasError(null)
    setCanvasGenStatus(tx.canvasStatusSubmitting)
    try {
      const submitRes = await fetch('/api/canvas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: canvasPrompt,
          mode: canvasMode,
          image_url: sourceImageUrl || undefined,
          aspect_ratio: canvasAspect,
          duration: canvasDuration,
        }),
      })
      const submit = await submitRes.json()
      if (submit.error) throw new Error(submit.error)
      const { request_id, status_url, response_url, model } = submit

      // Poll status every 4 seconds, max ~3 minutes (45 attempts).
      let videoUrl: string | null = null
      let lastResponse: any = null
      for (let i = 0; i < 45; i++) {
        await new Promise(r => setTimeout(r, 4000))
        const sRes = await fetch(`/api/canvas/status?status_url=${encodeURIComponent(status_url)}&response_url=${encodeURIComponent(response_url)}`)
        const s = await sRes.json()
        if (s.error) throw new Error(s.error)
        setCanvasGenStatus(`${tx.canvasStatusGenerating} (${s.status || '...'})`)
        lastResponse = s.raw_response
        if (s.status === 'COMPLETED') {
          if (s.video_url) { videoUrl = s.video_url; break }
          // COMPLETED but no URL — can't recover from polling. Show details so user can paste manually.
          throw new Error(
            (lang === 'no' ? 'Generering ferdig men fant ikke video-URL i svaret. Sjekk Vercel logs for hele responsen, eller lim inn URL-en manuelt fra fal.ai i feltet under.' : 'Generation completed but no video URL was found. Check Vercel logs for the full response, or paste the URL manually below.')
            + '\n\nResponse: ' + JSON.stringify(s.raw_response).slice(0, 500)
          )
        }
        if (s.status === 'FAILED' || s.status === 'CANCELLED') {
          throw new Error(`fal.ai ${s.status}: ${s?.raw_response?.error || 'unknown'}`)
        }
      }
      if (!videoUrl) throw new Error('Timed out waiting for video (3 min)')

      setCanvasGenStatus(tx.canvasStatusUploading)
      const meta = {
        aspect_ratio: canvasAspect,
        duration_seconds: canvasDuration,
        model,
        request_id,
        mode: canvasMode,
        ...(canvasMode === 'image-to-video' ? { source_image_url: sourceImageUrl } : {}),
      }
      await persistVideoFromUrl(videoUrl, canvasMode === 'image-to-video' ? 'fal-seedance-i2v' : 'fal-seedance', meta)
      setCanvasGenStatus('')
    } catch (e: any) {
      setCanvasError(e?.message || 'Canvas generation failed')
      setCanvasGenStatus('')
    }
    setCanvasGenerating(false)
  }

  /**
   * Generate a 9:16 starting-frame image specifically for canvas image-to-video,
   * using the existing cover prompt so the visual style stays consistent. The
   * 1:1 album cover is left untouched — the new image is saved separately to
   * canvasImageUrl, and the source mode is switched to "upload".
   */
  const generateCanvasI2vImage = async () => {
    if (!coverPrompt.trim()) {
      setCanvasError(lang === 'no'
        ? 'Du må generere et cover-prompt på Cover-tab først.'
        : 'Generate a cover prompt on the Cover tab first.')
      return
    }
    setCanvasI2vImageGenerating(true)
    setCanvasError(null)
    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: coverPrompt, size: '1024x1536', quality: coverQuality || 'medium' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const b64: string = data.b64
      const mime: string = data.mime || 'image/png'
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const blob = new Blob([bytes], { type: mime })
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const path = `canvas-i2v/${user?.id || 'anon'}/${Date.now()}.png`
      const { error: upErr } = await supabase.storage.from('covers').upload(path, blob, {
        upsert: true,
        contentType: mime,
      })
      if (upErr) throw new Error(upErr.message)
      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path)
      setCanvasImageUrl(urlData.publicUrl)
      setCanvasImageSource('upload')
    } catch (e: any) {
      setCanvasError(e?.message || 'Image generation failed')
    }
    setCanvasI2vImageGenerating(false)
  }

  /** Upload a starting-frame image for canvas image-to-video. Stores in covers/canvas/i2v/{user}/{ts}. */
  const uploadCanvasImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setCanvasError(lang === 'no' ? 'Filen er ikke et bilde' : 'File is not an image')
      return
    }
    setCanvasImageUploading(true)
    setCanvasError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `canvas-i2v/${user?.id || 'anon'}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('covers').upload(path, file, {
        upsert: true,
        contentType: file.type,
      })
      if (error) throw new Error(error.message)
      const { data } = supabase.storage.from('covers').getPublicUrl(path)
      setCanvasImageUrl(data.publicUrl)
    } catch (e: any) {
      setCanvasError(e?.message || 'Image upload failed')
    }
    setCanvasImageUploading(false)
  }

  const uploadCanvasFile = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setCanvasError(lang === 'no' ? 'Filen er ikke en video' : 'File is not a video')
      return
    }
    setCanvasUploading(true)
    setCanvasError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const ext = (file.name.split('.').pop() || 'mp4').toLowerCase()
      const path = `canvas/${user?.id || 'anon'}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('covers').upload(path, file, {
        upsert: true,
        contentType: file.type,
      })
      if (upErr) throw new Error(upErr.message)
      const { data } = supabase.storage.from('covers').getPublicUrl(path)
      const meta = { source: 'manual-upload', original_name: file.name }
      await save({
        canvas_video_url: data.publicUrl,
        canvas_prompt: canvasPrompt || null,
        canvas_provider: 'manual-upload',
        canvas_meta: meta,
      })
      setCanvasUrl(data.publicUrl)
      setCanvasProvider('manual-upload')
      setCanvasMeta(meta)
    } catch (e: any) {
      setCanvasError(e?.message || 'Upload failed')
    }
    setCanvasUploading(false)
  }

  const saveCanvasFromExternalUrl = async (url: string) => {
    if (!url.trim()) return
    setCanvasUploading(true)
    setCanvasError(null)
    // Try to download via proxy and host on Supabase. Falls back to storing the raw URL
    // if the host is not in our allow-list (proxy returns 403).
    const result = await persistVideoFromUrl(url.trim(), 'manual-url', { original_url: url.trim() })
    if (!result) {
      // Allow saving raw URL even if proxy rejected the host.
      try {
        await save({
          canvas_video_url: url.trim(),
          canvas_prompt: canvasPrompt || null,
          canvas_provider: 'manual-url',
          canvas_meta: { original_url: url.trim(), note: 'External URL — not stored in Supabase' },
        })
        setCanvasUrl(url.trim())
        setCanvasProvider('manual-url')
        setCanvasError(null)
      } catch (e: any) {
        setCanvasError(e?.message || 'Save failed')
      }
    }
    setCanvasUploading(false)
  }

  const clearCanvas = async () => {
    if (!confirm(tx.canvasClearConfirm)) return
    await save({ canvas_video_url: null, canvas_provider: null, canvas_meta: null })
    setCanvasUrl('')
    setCanvasProvider('')
    setCanvasMeta({})
  }

  const buildArtistContext = () => {
    if (!artist || !useProfileForLyrics) return ''
    const parts = []
    if (artist.genre) parts.push(`Genre: ${artist.genre}`)
    if (artist.description) parts.push(`Artist description: ${artist.description}`)
    if (artist.song_structure) parts.push(`Song structure/profile: ${artist.song_structure}`)
    return parts.length ? '\n\nArtist context:\n' + parts.join('\n') : ''
  }

  const computeAndSaveSongDna = async (extra?: Partial<{ title: string; lyrics: string }>) => {
    const dna = generateSongDNA({
      title: extra?.title ?? title,
      instructions: lyricsInstructions,
      lyrics: extra?.lyrics ?? lyrics,
      genre: proposalMeta?.genre,
      mood: proposalMeta?.mood,
      backstory,
    })
    setSongDna(dna)
    await save({ song_dna: dna })
    return dna
  }

  const regenerateSongDna = async () => {
    setDnaRegenerating(true)
    try {
      await computeAndSaveSongDna()
    } finally {
      setDnaRegenerating(false)
    }
  }

  const generateLyrics = async () => {
    if (!lyricsInstructions.trim()) return
    const artistCtx = buildArtistContext()
    const msgs = [{ role: 'user', content: lyricsInstructions + artistCtx }]
    const sysLang = aiOutputLanguageName(aiOutputLang)
    let result = await callAI(
      msgs,
      buildLyricsGenerationSystem(sysLang, !!(artist?.song_structure && useProfileForLyrics), aiPlatformId, aiPlatformCustomLimits),
      'lyrics',
    )
    if (!result) return
    result = await enforcePlatformLyricsLength(result)
    const newHistory = [...msgs, { role: 'assistant', content: result }]
    setLyrics(result); setLyricsHistory(newHistory)
    await save({ lyrics_instructions: lyricsInstructions, lyrics_text: result, lyrics_history: newHistory, status: 'in_progress' })
    await computeAndSaveSongDna({ lyrics: result })
  }

  const enforcePlatformLyricsLength = async (text: string): Promise<string> => {
    const limit = getContentLimit(aiPlatformId, 'lyrics', aiPlatformCustomLimits)
    if (isWithinHardLimit(getTextCharCount(text), limit)) return text
    const shortened = await callAI(
      [{ role: 'user', content: `These lyrics are ${text.length} characters. Adapt for ${platformLabel}:\n\n${text}` }],
      buildAdaptLyricsSystem(aiPlatformId, aiPlatformCustomLimits),
      'adapt_lyrics',
    )
    if (!shortened) return limit.hardMax != null ? text.slice(0, limit.hardMax) : text
    if (!isWithinHardLimit(getTextCharCount(shortened), limit)) {
      return limit.hardMax != null ? shortened.slice(0, limit.hardMax) : shortened
    }
    return shortened
  }

  const adaptLyricsForPlatform = async () => {
    if (!lyrics.trim()) return
    const result = await callAI(
      [{ role: 'user', content: `Adapt these lyrics for ${platformLabel}:\n\n${lyrics}` }],
      buildAdaptLyricsSystem(aiPlatformId, aiPlatformCustomLimits),
      'adapt_lyrics',
    )
    if (!result) return
    const finalText = await enforcePlatformLyricsLength(result)
    setLyrics(finalText)
    await save({ lyrics_text: finalText })
    await computeAndSaveSongDna({ lyrics: finalText })
  }

  const generateBackstory = async () => {
    const artistCtx = buildArtistContext()
    const lang = aiOutputLanguageName(aiOutputLang)
    const parts: string[] = []
    if (lyrics) parts.push(`LYRICS:\n${lyrics}`)
    if (sunoPrompt) parts.push(`SUNO PROMPT:\n${sunoPrompt}`)
    if (captions && Object.keys(captions).length > 0) {
      const captionsText = Object.entries(captions).map(([k, v]) => `${k}: ${v}`).join('\n')
      parts.push(`CAPTIONS:\n${captionsText}`)
    }
    const context = parts.join('\n\n')
    const userMsg = `Write a short, engaging backstory for this song (3-5 paragraphs). Tell the story behind the song: inspiration, theme, the emotion it captures, what listeners should know. Write in ${lang}, first person from the artist's perspective if natural. Don't quote the lyrics verbatim — describe what they're about.${artistCtx}\n\n${context}`
    const result = await callAI(
      [{ role: 'user', content: userMsg }],
      `You are a music journalist + the artist's storyteller. Craft a compelling backstory for a song that gives context, mood, and motivation. ${lang}. Markdown OK. Aim for 3-5 paragraphs.`,
      'backstory'
    )
    setBackstory(result)
    await save({ backstory: result })
  }

  const refineLyrics = async () => {
    if (!lyricsChat.trim()) return
    const newHistory = [...lyricsHistory, { role: 'user', content: lyricsChat }]
    let result = await callAI(newHistory, buildLyricsRefineSystem(aiPlatformId, aiPlatformCustomLimits), 'refine')
    if (!result) return
    result = await enforcePlatformLyricsLength(result)
    const updatedHistory = [...newHistory, { role: 'assistant', content: result }]
    setLyrics(result); setLyricsHistory(updatedHistory); setLyricsChat('')
    await save({ lyrics_text: result, lyrics_history: updatedHistory })
    await computeAndSaveSongDna({ lyrics: result })
  }

  // Fetch metadata for a Suno song URL via our server route.
  const fetchSunoTrack = async () => {
    if (!sunoUrlInput.trim()) return
    setSunoFetching(true)
    setSunoError(null)
    setSunoPreview(null)
    try {
      const res = await fetch(`/api/suno/track?url=${encodeURIComponent(sunoUrlInput.trim())}`)
      const data = await res.json()
      if (data.error) {
        setSunoError(data.error)
      } else {
        setSunoPreview(data as SunoPreview)
      }
    } catch (e: any) {
      setSunoError(e?.message || 'Failed to fetch')
    }
    setSunoFetching(false)
  }

  // Persist the Suno track on the current song. Optionally pull cover/lyrics if missing.
  const saveSunoToSong = async (opts: { useCover: boolean; useLyrics: boolean }) => {
    if (!sunoPreview) return
    setSunoSaving(true)
    const updates: any = {
      suno_url: sunoPreview.sunoUrl,
      suno_audio_url: sunoPreview.audioUrl,
      suno_track_id: sunoPreview.id,
    }
    if (opts.useCover && sunoPreview.coverUrl && !coverImageUrl) {
      updates.cover_image_url = sunoPreview.coverUrl
    }
    if (opts.useLyrics && sunoPreview.lyrics && !lyrics) {
      updates.lyrics_text = sunoPreview.lyrics
    }
    // Also append to media_links so it shows in the Media tab.
    const next = [
      ...mediaLinks.filter(l => l.url !== sunoPreview.sunoUrl),
      { platform: 'Suno', url: sunoPreview.sunoUrl, label: sunoPreview.title || 'Suno track' },
    ]
    updates.media_links = next
    await save(updates)
    setSong({ ...song, ...updates })
    if (updates.cover_image_url) setCoverImageUrl(updates.cover_image_url)
    if (updates.lyrics_text) setLyrics(updates.lyrics_text)
    setMediaLinks(next)
    setSunoUrlInput('')
    setSunoPreview(null)
    setSunoSaving(false)
  }

  const clearSunoFromSong = async () => {
    if (!confirm(tx.sunoImportClearConfirm)) return
    const updates = { suno_url: null, suno_audio_url: null, suno_track_id: null }
    await save(updates)
    setSong({ ...song, ...updates })
  }

  const generateSuno = async () => {
    const langName = aiOutputLanguageName(aiOutputLang)
    const detailedRaw = await callAI(
      [{ role: 'user', content: `Song title: ${title}\n\nLyrics:\n\n${lyrics}` }],
      sunoSystemPromptForMode('detailed', langName),
      'suno_detailed',
    )
    const compactLimits = buildStylePromptGenerationConstraints(aiPlatformId, 'compact', aiPlatformCustomLimits)
    const { compact, detailed } = prepareSunoPromptPair(
      detailedRaw,
      compactLimits.hardMax ?? undefined,
      compactLimits.targetMax,
    )
    setSunoPromptDetailed(detailed)
    setSunoPrompt(compact)
    const dna = await computeAndSaveSongDna()
    await save({ suno_prompt: compact, suno_prompt_detailed: detailed, song_dna: dna })
  }

  const updateSunoPromptField = (value: string) => {
    const compactLimits = buildStylePromptGenerationConstraints(aiPlatformId, 'compact', aiPlatformCustomLimits)
    if (sunoPromptMode === 'compact') {
      const next = compressSunoPrompt(
        value,
        compactLimits.targetMax,
        compactLimits.hardMax ?? undefined,
      )
      setSunoPrompt(next)
      save({ suno_prompt: next })
    } else {
      setSunoPromptDetailed(value)
      save({ suno_prompt_detailed: value })
    }
  }

  const activeSunoPrompt = sunoPromptMode === 'compact' ? sunoPrompt : sunoPromptDetailed

  const getCaptionLang = () => {
    if (captionLangOverride) return captionForcedLang === 'no' ? 'Norwegian' : 'English'
    return aiOutputLanguageName(aiOutputLang)
  }

  const generateCaption = async (platform: string) => {
    const captionLanguage = getCaptionLang()
    const supabase = createClient()
    const { data: ruleData } = await supabase.from('platform_rules').select('custom_rules').eq('platform', platform).single()
    const customRules = ruleData?.custom_rules || ''
    const { buildPlatformSystemPrompt } = await import('@/lib/platformRules')
    const systemPrompt = buildPlatformSystemPrompt(platform as any, captionLanguage, customRules)
    const result = await callAI(
      [{ role: 'user', content: `Song title: ${title}\nArtist: ${artist?.name}\nLyrics:\n\n${lyrics}${captionTone ? `\n\nRequested tone: ${captionTone}` : ''}` }],
      systemPrompt,
      `caption_${platform}`)
    const updated = { ...captions, [platform]: result }
    setCaptions(updated)
    await save({ captions: updated })
  }

  const generateCoverPrompt = async () => {
    const artistCtx = artist ? [
      artist.name ? `Artist: ${artist.name}` : '',
      artist.genre ? `Genre: ${artist.genre}` : '',
      artist.description ? `Artist description: ${artist.description}` : '',
    ].filter(Boolean).join('\n') : ''
    const userContent = [
      title ? `Song: ${title}` : '',
      artistCtx,
      lyrics ? `Lyrics:\n${lyrics.slice(0, 800)}` : '',
      coverStyle ? `Free-form style notes: ${coverStyle}` : '',
      coverStyleChips.length ? `Selected styles: ${coverStyleChips.join(', ')}` : '',
      coverMoodChips.length ? `Selected mood: ${coverMoodChips.join(', ')}` : '',
      `Target format: ${coverAspect} aspect ratio, ${coverQuality} quality.`,
    ].filter(Boolean).join('\n\n')

    const system = [
      'You are an expert in AI image generation (DALL-E, gpt-image-1, Midjourney, Stable Diffusion). Write a detailed prompt for an album/song cover image.',
      '',
      'Guidelines:',
      '- Lead with the subject (what is in the frame), then style, lighting, colors, mood, composition.',
      '- Honor the selected styles and mood — work them in naturally.',
      '- Match the song\'s feeling. If the lyrics are dark/melancholic, choose colors and lighting accordingly.',
      '- Be specific about: lighting (golden hour, neon, fog, harsh sun, candlelight), camera/composition (close-up, wide shot, low angle, symmetrical), texture (grainy film, smooth digital, oil-painted), and palette (specify 2-4 dominant colors).',
      '- Add quality modifiers at the end: "8k", "ultra-detailed", "professional photography" for photoreal, or "masterpiece" / "trending on ArtStation" for stylized.',
      `- Output only the prompt — no preamble, no markdown, no headers. Write the output in: ${aiOutputLanguageName(aiOutputLang)}. Max 150 words.`,
    ].join('\n')

    const result = await callAI([{ role: 'user', content: userContent }], system, 'cover')
    setCoverPrompt(result)
    await save({ cover_style: coverStyle, cover_prompt: result })
  }

  const maybeSaveCoverToLibrary = async (url: string) => {
    if (!saveCoverToLibrary || !artist?.id) return
    const { asset } = await saveUrlToMediaLibrary(url, {
      type: 'cover',
      title: title || 'Cover',
      artistId: artist.id,
      songId,
    })
    if (asset) await trackMediaUsage(asset.id, ['used_as_cover'], { artistId: artist.id })
  }

  const applyCoverFromLibrary = async (asset: MediaAsset) => {
    if (!artist?.id) return
    await trackMediaUsage(asset.id, ['used_as_cover'], { makePublic: true, artistId: artist.id })
    setCoverImageUrl(asset.file_url)
    await save({ cover_image_url: asset.file_url })
    setCoverPickerOpen(false)
  }

  const uploadCover = async (file: File) => {
    setUploadingCover(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${songId}/cover.${ext}`
    const { error } = await supabase.storage.from('covers').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('covers').getPublicUrl(path)
      setCoverImageUrl(data.publicUrl)
      await save({ cover_image_url: data.publicUrl })
      await maybeSaveCoverToLibrary(data.publicUrl)
    }
    setUploadingCover(false)
  }

  const addMediaLink = async () => {
    if (!newUrl.trim()) return
    const updated = [...mediaLinks, { platform: newPlatform, url: newUrl, label: newLabel || newPlatform }]
    setMediaLinks(updated); setNewUrl(''); setNewLabel('')
    await save({ media_links: updated })
  }

  const removeMediaLink = async (i: number) => {
    const updated = mediaLinks.filter((_, idx) => idx !== i)
    setMediaLinks(updated)
    await save({ media_links: updated })
  }

  const saveSpotifyUrl = async () => {
    setSavingSpotify(true)
    const url = spotifyUrl.trim() || null
    await save({ spotify_url: url })
    setSong((prev: any) => (prev ? { ...prev, spotify_url: url } : prev))
    setSavingSpotify(false)
  }

  const generatePublish = async (type: string) => {
    const publishLang = aiOutputLanguageName(aiOutputLang)
    const lyricsDirective = includeLyricsInPublish && lyrics
      ? ' Include the full song lyrics inside the post body, formatted as a clearly-set-off block (e.g., a markdown blockquote or a "Lyrics" section with a heading). Use the cleaned lyrics provided — preserve verse breaks, do not include section markers like [Verse 1].'
      : ' Reference the lyrics naturally but do NOT include the full lyrics text.'
    const systemMap: Record<string,string> = {
      wordpress: `Write a WordPress blog post in ${publishLang} about this song. Include title (# Title), intro, background, lyric analysis, listen info. Use markdown. ~400 words.${lyricsDirective}`,
      facebook: `Write a Facebook post in ${publishLang} about this song. Engaging, personal, with hashtags. ~150 words.`,
      instagram: `Write an Instagram post in ${publishLang}. Visual language, storytelling, hashtags. ~120 words.`,
      press: `Write a press release in ${publishLang} about this song. Professional tone, 5W structure, artist quote. ~300 words.${lyricsDirective}`,
    }
    const cleanedLyrics = lyrics ? cleanLyricsText(lyrics) : ''
    const lyricsBlock = type === 'wordpress' || type === 'press'
      ? (includeLyricsInPublish && cleanedLyrics ? `\n\nCleaned lyrics (use these verbatim if including in post):\n${cleanedLyrics}` : `\n\nLyrics excerpt for context:\n${cleanedLyrics.slice(0, 600)}`)
      : `\n\nLyrics excerpt for context:\n${cleanedLyrics.slice(0, 400)}`
    const context = `Song: ${title}\nArtist: ${artist?.name}\nGenre: ${artist?.genre}${lyricsBlock}\n\nMedia: ${mediaLinks.map(l => `${l.platform}: ${l.url}`).join(', ')}`
    const result = await callAI([{ role: 'user', content: context }], systemMap[type], `publish_${type}`)
    const updated = { ...publishContent, [type]: result }
    setPublishContent(updated)
    await save({ publish_content: updated })
  }

  const campaignAssets = [
    { key: 'spotify_pitch', label: tx.campaignSpotifyPitch, rows: 8 },
    { key: 'tiktok_caption', label: tx.campaignTikTokCaption, rows: 5 },
    { key: 'instagram_caption', label: tx.campaignInstagramCaption, rows: 5 },
    { key: 'youtube_shorts_caption', label: tx.campaignYouTubeShortsCaption, rows: 5 },
    { key: 'facebook_post', label: tx.campaignFacebookPost, rows: 6 },
    { key: 'press_bio', label: tx.campaignPressBio, rows: 6 },
    { key: 'newsletter_announcement', label: tx.campaignNewsletterAnnouncement, rows: 8 },
  ]

  const promoteCampaignAssets = campaignAssets.filter(asset =>
    ['tiktok_caption', 'instagram_caption', 'youtube_shorts_caption', 'facebook_post', 'newsletter_announcement'].includes(asset.key),
  )

  const campaignChecklist = [
    { key: 'cover_ready', label: tx.campaignChecklistCover },
    { key: 'canvas_ready', label: tx.campaignChecklistCanvas },
    { key: 'spotify_link_added', label: tx.campaignChecklistSpotify },
    { key: 'public_page_enabled', label: tx.campaignChecklistPublicPage },
    { key: 'qr_generated', label: tx.campaignChecklistQr },
    { key: 'newsletter_drafted', label: tx.campaignChecklistNewsletter },
    { key: 'social_captions_ready', label: tx.campaignChecklistSocial },
  ]

  const campaignChecklistState = (publishContent.campaign_checklist || {}) as Record<string, boolean>
  const campaignReleaseDate = String(publishContent.campaign_release_date || song?.spotify_release_date || '').slice(0, 10)
  const publicArtistPath = artist?.page_enabled && artist?.page_slug ? `/p/${artist.page_slug}` : ''
  const songPublicPageAvailable = isSongPublicPageAvailable({
    artistPageEnabled: !!artist?.page_enabled,
    artistAdminHidden: !!artist?.admin_hidden,
    songPublicHidden: !!song?.public_hidden,
  })
  const audioReady = !!song?.suno_audio_url || !!song?.audio_url || mediaLinks.some(l => ['suno', 'soundcloud'].includes((l.platform || '').toLowerCase()))
  const coverReady = !!coverImageUrl || !!song?.spotify_cover_url
  const campaignTimeline = Array.isArray(publishContent.campaign_timeline) ? publishContent.campaign_timeline : []
  const campaignAssetCount = campaignAssets.filter(asset => !!publishContent[`campaign_${asset.key}`]).length
  const artistEpk = (artist?.page_settings || {}).epk || {}
  const hasArtistEpk = !!(artistEpk.short_bio || artistEpk.long_bio || artistEpk.release_highlight || artistEpk.public_enabled)
  const lyricsFitTarget = !lyrics?.trim() || lyricsFitPlatform(lyrics, aiPlatformId, aiPlatformCustomLimits)
  const promptFitTarget = !sunoPrompt?.trim() || stylePromptFitPlatform(sunoPrompt, aiPlatformId, aiPlatformCustomLimits, 'compact')
  const releaseReviewChecks = [
    { key: 'lyrics', label: tx.reviewCheckLyrics, points: 12, done: !!lyrics?.trim(), action: tx.reviewActionLyrics },
    {
      key: 'lyrics_platform',
      label: tx[buildReadinessLyricsLabelKey(aiPlatformId, lyricsFitTarget && !!lyrics?.trim())],
      points: 4,
      done: lyricsFitTarget,
      action: tx.reviewActionLyricsPlatform,
    },
    { key: 'suno', label: tx.reviewCheckSuno, points: 8, done: !!sunoPrompt?.trim(), action: tx.reviewActionSuno },
    {
      key: 'prompt_platform',
      label: tx[buildReadinessPromptLabelKey(aiPlatformId, promptFitTarget && !!sunoPrompt?.trim())],
      points: 4,
      done: promptFitTarget,
      action: tx.reviewActionPromptPlatform,
    },
    { key: 'backstory', label: tx.reviewCheckBackstory, points: 10, done: !!backstory?.trim(), action: tx.reviewActionBackstory },
    { key: 'cover', label: tx.reviewCheckCover, points: 10, done: coverReady, action: tx.reviewActionCover },
    { key: 'canvas', label: tx.reviewCheckCanvas, points: 8, done: !!canvasPrompt?.trim() || !!canvasUrl, action: tx.reviewActionCanvas },
    { key: 'media', label: tx.reviewCheckMedia, points: 10, done: !!song?.spotify_url || mediaLinks.length > 0, action: tx.reviewActionMedia },
    { key: 'public', label: tx.reviewCheckPublicPage, points: 8, done: !!publicArtistPath, action: tx.reviewActionPublicPage },
    { key: 'share', label: tx.reviewCheckShareTools, points: 0, done: !!songId, action: tx.reviewActionShareTools },
    { key: 'campaign', label: tx.reviewCheckCampaignAssets, points: 10, done: campaignAssetCount >= 4, action: tx.reviewActionCampaignAssets },
    { key: 'timeline', label: tx.reviewCheckTimeline, points: 8, done: campaignTimeline.length > 0, action: tx.reviewActionTimeline },
    { key: 'epk', label: tx.reviewCheckEpk, points: 8, done: hasArtistEpk, action: tx.reviewActionEpk },
  ]
  const releaseReadinessScore = releaseReviewChecks.reduce((sum, item) => sum + (item.done ? item.points : 0), 0)
  const releaseMissingItems = releaseReviewChecks.filter(item => !item.done)
  const releaseHighImpactFixes = releaseMissingItems.filter(item => item.points >= 10)
  const releaseRecommendedActions = releaseMissingItems.slice(0, 4)
  const timelineTemplates = [
    { id: 'cover_canvas', offset: -28, title: tx.timelineTaskCoverCanvas, pro: false },
    { id: 'distribute', offset: -21, title: tx.timelineTaskDistribute, pro: true },
    { id: 'spotify_pitch', offset: -14, title: tx.timelineTaskSpotifyPitch, pro: false },
    { id: 'teaser_posts', offset: -10, title: tx.timelineTaskTeaserCreate, pro: true },
    { id: 'post_teaser', offset: -7, title: tx.timelineTaskTeaserPost, pro: false },
    { id: 'newsletter_ready', offset: -3, title: tx.timelineTaskNewsletter, pro: true },
    { id: 'release_day', offset: 0, title: tx.timelineTaskReleaseDay, pro: false },
    { id: 'follow_up', offset: 3, title: tx.timelineTaskFollowUp, pro: true },
  ]

  const updateAiPlatform = (platformId: PlatformId) => {
    void updatePublishContent({ ai_platform: platformId })
  }

  const updateAiPlatformCustomLimits = (limits: CustomPlatformLimits) => {
    void updatePublishContent({ ai_platform_custom: limits })
  }

  const updatePublishContent = async (updates: Record<string, any>) => {
    const updated = { ...publishContent, ...updates }
    setPublishContent(updated)
    await save({ publish_content: updated })
  }

  const updateCampaignAsset = async (key: string, value: string) => {
    await updatePublishContent({ [`campaign_${key}`]: value })
  }

  const updateCampaignChecklist = async (key: string, checked: boolean) => {
    await updatePublishContent({ campaign_checklist: { ...campaignChecklistState, [key]: checked } })
  }

  const addDays = (date: string, days: number) => {
    const d = new Date(`${date}T12:00:00`)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }

  const timelineBadge = (task: any) => {
    if (task.status === 'done') return { label: tx.timelineDone, color: '#7bc87b', bg: 'rgba(123,200,123,0.08)' }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(`${task.due_date}T00:00:00`)
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86400000)
    if (diffDays < 0) return { label: tx.timelineOverdue, color: '#e07070', bg: 'rgba(224,112,112,0.08)' }
    if (diffDays <= 7) return { label: tx.timelineUpcoming, color: '#d4a843', bg: 'rgba(212,168,67,0.08)' }
    return { label: tx.timelinePlanned, color: '#8a7a60', bg: 'rgba(255,255,255,0.025)' }
  }

  const generateTimeline = async (reset = false) => {
    if (!campaignReleaseDate) return
    const existingById = new Map(campaignTimeline.map((task: any) => [task.id, task]))
    const templates = timelineTemplates.filter(template => planId === 'pro' || !template.pro)
    const tasks = templates.map(template => {
      const existing = reset ? null : existingById.get(template.id) as any
      return {
        id: template.id,
        title: template.title,
        due_date: addDays(campaignReleaseDate, template.offset),
        status: existing?.status || 'todo',
        notes: existing?.notes || '',
      }
    }).sort((a, b) => a.due_date.localeCompare(b.due_date))
    await updatePublishContent({ campaign_timeline: tasks })
  }

  const resetTimeline = async () => {
    await updatePublishContent({ campaign_timeline: [] })
  }

  const updateTimelineTask = async (taskId: string, updates: Record<string, any>) => {
    const tasks = campaignTimeline.map((task: any) => task.id === taskId ? { ...task, ...updates } : task)
    await updatePublishContent({ campaign_timeline: tasks })
  }

  const copyTimeline = () => {
    const text = campaignTimeline
      .map((task: any) => `${task.due_date} · ${task.status.toUpperCase()} · ${task.title}${task.notes ? `\n${task.notes}` : ''}`)
      .join('\n\n')
    copy(text)
  }

  const generateReleaseReview = async () => {
    if (planId !== 'pro') return
    const reviewText = await callAI(
      [{ role: 'user', content: [
        `Readiness score: ${releaseReadinessScore}/100`,
        `Missing items: ${releaseMissingItems.map(item => `${item.label} (${item.points} pts)`).join(', ') || 'None'}`,
        campaignContext(),
        campaignAssets.map(asset => {
          const value = publishContent[`campaign_${asset.key}`]
          return value ? `${asset.label}:\n${value}` : ''
        }).filter(Boolean).join('\n\n'),
      ].filter(Boolean).join('\n\n') }],
      [
        `You are a practical release manager for independent artists. Write the output in: ${aiOutputLanguageName(aiOutputLang)}.`,
        'Review the lyrics, Suno prompt, backstory, campaign text, and missing readiness items.',
        'Return concise, actionable improvement tips. Use sections: Quick verdict, High impact fixes, Copy/content improvements, Release risk.',
        'Do not block publishing; this is advisory only.',
      ].join('\n'),
      'release_review'
    )
    if (!reviewText) return
    await updatePublishContent({
      release_review_ai: {
        text: reviewText,
        score: releaseReadinessScore,
        created_at: new Date().toISOString(),
      },
    })
  }

  const campaignContext = () => {
    const cleanedLyrics = lyrics ? cleanLyricsText(lyrics) : ''
    return [
      `Song title: ${title}`,
      `Artist: ${artist?.name || ''}`,
      `Genre/style: ${artist?.genre || ''}`,
      campaignReleaseDate ? `Release date: ${campaignReleaseDate}` : '',
      lyricsInstructions ? `Song concept / instructions:\n${lyricsInstructions}` : '',
      sunoPrompt ? `Suno prompt:\n${sunoPrompt}` : '',
      backstory ? `Backstory:\n${backstory}` : '',
      cleanedLyrics ? `Lyrics:\n${cleanedLyrics.slice(0, 1800)}` : '',
      mediaLinks.length ? `Links:\n${mediaLinks.map(l => `${l.platform}: ${l.url}`).join('\n')}` : '',
      publicArtistPath ? `Public artist page: ${publicArtistPath}` : '',
    ].filter(Boolean).join('\n\n')
  }

  const generateCampaignAsset = async (key: string) => {
    const outLang = aiOutputLanguageName(aiOutputLang)
    const systemMap: Record<string, string> = {
      spotify_pitch: `Write a concise Spotify for Artists playlist pitch in ${outLang}. Max 500 characters. Include mood, genre, instrumentation, audience, and release angle. No markdown.`,
      tiktok_caption: `Write a TikTok release caption in ${outLang}. Short hook, personality, 3-5 hashtags, no more than 500 characters.`,
      instagram_caption: `Write an Instagram release caption in ${outLang}. Visual, personal, includes a call to listen and 5-8 relevant hashtags.`,
      youtube_shorts_caption: `Write a YouTube Shorts caption in ${outLang}. Strong first line, brief context, call to action, 3-5 hashtags.`,
      facebook_post: `Write a Facebook release post in ${outLang}. Warm and personal, 100-160 words, includes listen/share call to action.`,
      press_bio: `Write a short press release artist/song bio in ${outLang}. Professional tone, 120-180 words, suitable for media outreach.`,
      newsletter_announcement: `Write an email/newsletter announcement in ${outLang}. Include subject line, preview text, short body, and call to listen/share.`,
    }
    const result = await callAI([{ role: 'user', content: campaignContext() }], systemMap[key], `campaign_${key}`)
    if (!result) return
    const updatedChecklist = { ...campaignChecklistState }
    if (key === 'newsletter_announcement') updatedChecklist.newsletter_drafted = true
    if (['tiktok_caption', 'instagram_caption', 'youtube_shorts_caption', 'facebook_post'].includes(key)) updatedChecklist.social_captions_ready = true
    await updatePublishContent({ [`campaign_${key}`]: result, campaign_checklist: updatedChecklist })
  }

  const copyAllCampaign = () => {
    const parts = campaignAssets
      .map(asset => {
        const value = publishContent[`campaign_${asset.key}`]
        return value ? `${asset.label}\n${value}` : ''
      })
      .filter(Boolean)
    if (publicArtistPath) parts.push(`${tx.publicPage}\n${typeof window !== 'undefined' ? window.location.origin : ''}${publicArtistPath}`)
    parts.push(`${tx.embedGeneratorTitle}\n${typeof window !== 'undefined' ? window.location.origin : ''}/embed/song/${songId}?source=embed&theme=dark`)
    copy(parts.join('\n\n---\n\n'))
  }

  const generateAllCampaignAssets = async () => {
    for (const asset of campaignAssets) {
      if (!publishContent[`campaign_${asset.key}`]) {
        await generateCampaignAsset(asset.key)
      }
    }
  }

  const updateTitle = async (val: string) => {
    setTitle(val)
    await save({ title: val })
  }

  const updateStatus = async (status: string) => {
    await save({ status })
    setSong({ ...song, status })
  }

  const copy = (text: string) => navigator.clipboard.writeText(text)

  const copyLyrics = async () => {
    if (!lyrics) return
    const limit = getContentLimit(aiPlatformId, 'lyrics', aiPlatformCustomLimits)
    if (!isWithinHardLimit(getTextCharCount(lyrics), limit)) {
      const warningKey = buildCopyLimitWarningKey('lyrics')
      setStudioToast({
        message: (tx[warningKey] || tx.aiCopyLimitLyrics).replace('{platform}', platformLabel),
        tone: 'warning',
        actions: [
          {
            label: tx.aiCopyAnyway,
            onClick: () => {
              copy(lyrics)
              setStudioToast(null)
            },
            variant: 'outline',
          },
          {
            label: adaptLyricsLabel,
            onClick: () => {
              setStudioToast(null)
              void adaptLyricsForPlatform()
            },
            variant: 'gold',
          },
        ],
      })
      return
    }
    try {
      await navigator.clipboard.writeText(lyrics)
    } catch { /* ignore */ }
  }

  const copySunoPrompt = () => {
    const text = activeSunoPrompt
    if (!text) return
    const limit = getContentLimit(aiPlatformId, 'stylePrompt', aiPlatformCustomLimits)
    if (sunoPromptMode === 'compact' && !isWithinHardLimit(getTextCharCount(text), limit)) {
      const warningKey = buildCopyLimitWarningKey('stylePrompt')
      setStudioToast({
        message: (tx[warningKey] || tx.aiCopyLimitStylePrompt).replace('{platform}', platformLabel),
        tone: 'warning',
        actions: [
          {
            label: tx.aiCopyAnyway,
            onClick: () => {
              copy(text)
              setSunoCopied(true)
              window.setTimeout(() => setSunoCopied(false), 2000)
              setStudioToast(null)
            },
            variant: 'outline',
          },
        ],
      })
      return
    }
    copy(text)
    setSunoCopied(true)
    window.setTimeout(() => setSunoCopied(false), 2000)
  }

  const isLoading = (key: string) => aiLoading && aiTarget === key

  if (loading) return <div style={{ color: '#6a5a40', padding: '40px' }}>{tx.loading}</div>

  const statusOptions = [
    { value: 'draft', label: tx.draft },
    { value: 'in_progress', label: tx.inProgress },
    { value: 'complete', label: tx.complete },
  ]

  const featuredReleaseSet =
    artist?.page_settings?.featured_release?.type === 'song' &&
    artist?.page_settings?.featured_release?.id === songId

  const setFeaturedRelease = async () => {
    if (!artist?.id || featuredReleaseSaving) return
    setFeaturedReleaseSaving(true)
    const supabase = createClient()
    const pageSettings = {
      ...(artist.page_settings || {}),
      featured_release: { type: 'song' as const, id: songId },
    }
    const { error } = await supabase.from('artists').update({ page_settings: pageSettings }).eq('id', artist.id)
    setFeaturedReleaseSaving(false)
    if (!error) {
      setArtist({ ...artist, page_settings: pageSettings })
      setStudioToast({ message: tx.songStudioFeaturedSuccess, tone: 'success' })
    } else {
      setStudioToast({ message: tx.songStudioFeaturedError, tone: 'error' })
    }
  }

  const heroCoverUrl = coverImageUrl || song?.spotify_cover_url || song?.cover_image_url || null
  const statusLabel = statusOptions.find(o => o.value === (song?.status || 'draft'))?.label
  const hasSpotifyLink = !!(spotifyUrl.trim() || song?.spotify_url)
  const distributionStatusLabel = song?.distribution_status
    ? String(song.distribution_status).replace(/_/g, ' ')
    : null

  const subNavConfig = (() => {
    switch (studioRoute.area) {
      case 'write':
        return {
          items: [
            { id: 'lyrics', label: tx.lyrics },
            { id: 'backstory', label: tx.backstory },
            { id: 'dna', label: tx.songDnaTab },
          ],
          active: studioRoute.writePanel || 'lyrics',
          onChange: (id: string) => navigateToRoute({ area: 'write', writePanel: id as WritePanel }),
        }
      case 'produce':
        return {
          items: [
            { id: 'suno', label: tx.suno },
            { id: 'cover', label: tx.cover },
            { id: 'canvas', label: tx.canvas },
          ],
          active: studioRoute.producePanel || 'suno',
          onChange: (id: string) => navigateToRoute({ area: 'produce', producePanel: id as ProducePanel }),
        }
      case 'promote':
        return {
          items: [
            { id: 'captions', label: tx.captions },
            { id: 'assets', label: tx.songStudioCampaignAssets },
          ],
          active: studioRoute.promotePanel === 'assets' ? 'assets' : 'captions',
          onChange: (id: string) => navigateToRoute({ area: 'promote', promotePanel: id === 'assets' ? 'assets' : 'captions' }),
        }
      case 'release':
        return {
          items: [
            { id: 'campaign', label: tx.campaignTitle },
            { id: 'distribution', label: tx.distributionTab },
          ],
          active: studioRoute.releasePanel || 'campaign',
          onChange: (id: string) => navigateToRoute({ area: 'release', releasePanel: id as ReleasePanel }),
        }
      case 'publish':
        return {
          items: [
            { id: 'media', label: tx.media },
            { id: 'publish', label: tx.publish },
          ],
          active: studioRoute.publishPanel || 'media',
          onChange: (id: string) => navigateToRoute({ area: 'publish', publishPanel: id as PublishPanel }),
        }
      default:
        return { items: [] as { id: string; label: string }[], active: '', onChange: (_id: string) => {} }
    }
  })()

  return (
    <div className="song-studio-page" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)' }}>
      {studioToast && (
        <SongStudioToast
          message={studioToast.message}
          tone={studioToast.tone}
          actions={studioToast.actions}
          onDismiss={() => setStudioToast(null)}
        />
      )}
      <SongStudioShell
        activeArea={studioRoute.area}
        nav={(
          <>
            <SongStudioHero
              artistId={artist?.id}
              artistName={artist?.name}
              title={title}
              onTitleChange={updateTitle}
              coverUrl={heroCoverUrl}
              status={song?.status}
              statusLabel={statusLabel}
              publicPageAvailable={songPublicPageAvailable}
              publicPageHidden={!!song?.public_hidden}
              hasSpotifyLink={hasSpotifyLink}
              hasMediaLinks={mediaLinks.length > 0}
              readinessScore={releaseReadinessScore}
              onCopySunoPrompt={sunoPrompt ? copySunoPrompt : undefined}
              onOpenSuno={() => window.open(SUNO_CREATE_URL, '_blank', 'noopener,noreferrer')}
              onViewPublicSong={songPublicPageAvailable && !song?.public_hidden
                ? () => window.open(clientPublicUrl(`/s/${songId}`), '_blank', 'noopener,noreferrer')
                : undefined}
              onSetFeaturedRelease={artist?.id ? setFeaturedRelease : undefined}
              onOpenReleaseCampaign={() => navigateToPanel('campaign')}
              featuredReleaseSet={featuredReleaseSet}
              featuredReleaseSaving={featuredReleaseSaving}
              sunoCopied={sunoCopied}
            />
            <SongStudioNav active={studioRoute.area} onChange={navigateToArea} />
            <SongStudioMobileNavigator active={studioRoute.area} onChange={navigateToArea} />
            <SongStudioSubNav
              items={subNavConfig.items}
              active={subNavConfig.active}
              onChange={subNavConfig.onChange}
              ariaLabel={tx.songStudioSubNavLabel}
            />
          </>
        )}
      >
        <div className="song-studio-body">
        <SongStudioWorkspaceContext
          route={studioRoute}
          songTitle={title || song?.title || ''}
          artistId={artist?.id}
          artistName={artist?.name}
          publicSongAvailable={songPublicPageAvailable}
          publicSongHidden={!!song?.public_hidden}
          songId={songId}
        />
        <MobileQuickActions
          title={tx.mobileQuickActions}
          actions={[
            { label: tx.mobileGenerateCaption, icon: '✦', onClick: () => { navigateToPanel('captions'); generateCaption('TikTok') }, disabled: aiLoading || !lyrics },
            { label: tx.mobileCopyCampaign, icon: '⧉', onClick: copyAllCampaign },
            { label: tx.mobileOpenPublicPage, icon: '↗', href: publicArtistPath || undefined, disabled: !publicArtistPath },
            { label: tx.mobileCopyShareLink, icon: '⌁', onClick: () => copy(clientPublicUrl(`/s/${songId}`)), disabled: !songPublicPageAvailable },
          ]}
        />

        {panel === 'overview' && (
          <SongStudioOverview
            songId={songId}
            internalPlayCount={song?.internal_play_count}
            embedClickCount={song?.embed_click_count}
            readinessScore={releaseReadinessScore}
            missingItems={releaseMissingItems}
            recommendedActions={releaseRecommendedActions}
            statusLabel={statusLabel}
            publicPageAvailable={songPublicPageAvailable}
            distributionStatus={distributionStatusLabel}
            campaignTimelineCount={campaignTimeline.length}
            artistId={artist?.id}
            pageSlug={artist?.page_slug}
            pageEnabled={!!artist?.page_enabled}
            linkedStory={linkedStory}
            onGoToPanel={navigateToPanel}
          />
        )}

        {/* LYRICS */}
        {panel === 'lyrics' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.lyrics}</h2>
            {!lyrics && !lyricsInstructions && (
              <WorkspaceEmptyState
                icon="✎"
                title={tx.songStudioEmptyLyrics}
                description={tx.songStudioEmptyLyricsDesc}
              />
            )}
            {planId === 'free' && (
              <UpgradePrompt compact title={tx.upgradeAiTitle} description={tx.upgradeAiDesc} />
            )}

            <div className="card workspace-card workspace-glass" style={{ marginBottom: 16, padding: 14 }}>
              <AiPlatformSelector
                platformId={normalizePlatformId(aiPlatformId)}
                customLimits={aiPlatformCustomLimits}
                onPlatformChange={updateAiPlatform}
                onCustomLimitsChange={updateAiPlatformCustomLimits}
                disabled={aiLoading}
              />
            </div>

            {/* Artist profile toggle */}
            {(artist?.genre || artist?.description || artist?.song_structure) && (
              <div style={{ background: useProfileForLyrics ? 'rgba(212,168,67,0.05)' : 'transparent', border: `1px solid ${useProfileForLyrics ? 'rgba(212,168,67,0.2)' : 'rgba(180,140,80,0.1)'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={useProfileForLyrics} onChange={e => setUseProfileForLyrics(e.target.checked)}
                    style={{ accentColor: '#d4a843', width: '14px', height: '14px' }} />
                  <span style={{ color: useProfileForLyrics ? '#d4a843' : '#6a5a40', fontSize: '13px' }}>{tx.useProfileForLyrics}</span>
                  <span style={{ color: '#5a4a30', fontSize: '12px' }}>— {tx.useProfileHint}</span>
                </label>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.instructions}</label>
              <textarea value={lyricsInstructions} onChange={e => setLyricsInstructions(e.target.value)} placeholder={tx.instructionsPlaceholder} rows={4} />
            </div>
            <div className="song-studio-lyrics-generate">
              <p className="song-studio-lyrics-generate__hint">
                {!lyricsInstructions.trim()
                  ? tx.lyricsGenerateHintNoInstructions
                  : lyrics
                    ? tx.lyricsGenerateHintRegenerate
                    : tx.lyricsGenerateHintGenerate}
              </p>
              <button
                className="btn-gold song-studio-lyrics-generate__btn"
                onClick={generateLyrics}
                disabled={aiLoading || !lyricsInstructions.trim()}
              >
                {isLoading('lyrics') ? tx.generating : lyrics ? tx.regenerateLyrics : tx.generateLyrics}
              </button>
            </div>

            {/* Lyrics editor — always visible. User can paste their own or use the AI generator above. */}
            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ color: '#d4a843', fontSize: '11px', letterSpacing: '1px' }}>{tx.lyricsLabel}</span>
                {lyrics && (
                  <div className="song-studio-lyrics-toolbar">
                    {shouldShowAdaptAction(getTextCharCount(lyrics), lyricsContentLimit) && (
                      <button
                        type="button"
                        className="btn-outline song-studio-lyrics-toolbar__shorten"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={adaptLyricsForPlatform}
                        disabled={aiLoading}
                        title={tx.lyricsShortenForSunoHint}
                      >
                        {isLoading('adapt_lyrics') ? tx.generating : adaptLyricsLabel}
                      </button>
                    )}
                    {lyricsHistory.filter(m => m.role === 'assistant').length > 1 && (
                      <button
                        className="btn-outline"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => setShowHistory(true)}
                        title={tx.historyHint}
                      >
                        📜 {tx.historyButton} ({lyricsHistory.filter(m => m.role === 'assistant').length})
                      </button>
                    )}
                    <button
                      className="btn-outline"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => setShowCleanLyrics(true)}
                      title={tx.copyCleanHint}
                    >
                      📄 {tx.viewClean}
                    </button>
                    <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={copyLyrics}>
                      📋 {tx.copy}
                    </button>
                  </div>
                )}
              </div>
              <ContentLimitCounter
                text={lyrics}
                contentType="lyrics"
                platformId={aiPlatformId}
                customLimits={aiPlatformCustomLimits}
              />
              <textarea
                value={lyrics}
                onChange={e => { setLyrics(e.target.value); save({ lyrics_text: e.target.value }) }}
                placeholder={tx.lyricsManualPlaceholder}
                rows={16}
              />
              {!lyrics && (
                <p style={{ color: '#5a4a30', fontSize: 12, margin: '8px 0 0' }}>
                  💡 {tx.lyricsManualHint}
                </p>
              )}
            </div>

            {lyrics && (
              <>

                {/* Clean-lyrics view modal */}
                {showCleanLyrics && lyrics && (() => {
                  const cleaned = cleanLyricsText(lyrics)
                  const wordpressFormat = `<blockquote class="lyrics">\n${cleaned.split('\n').map(l => l.trim() ? `  ${l}` : '').join('\n')}\n</blockquote>`
                  return (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}
                      onClick={() => setShowCleanLyrics(false)}
                    >
                      <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', borderColor: 'rgba(212,168,67,0.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                          <h3 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: 17 }}>📄 {tx.cleanLyricsTitle}</h3>
                          <button onClick={() => setShowCleanLyrics(false)} style={{ background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', fontSize: 22 }}>×</button>
                        </div>
                        <p style={{ color: '#5a4a30', fontSize: 12, margin: '0 0 14px' }}>{tx.cleanLyricsHint}</p>

                        <pre style={{ color: '#e8e0d0', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, background: 'rgba(0,0,0,0.3)', padding: 14, borderRadius: 6, maxHeight: 360, overflowY: 'auto' }}>
                          {cleaned || tx.cleanLyricsEmpty}
                        </pre>

                        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                          <button
                            className="btn-gold"
                            onClick={() => copy(cleaned)}
                          >
                            📋 {tx.cleanLyricsCopyText}
                          </button>
                          <button
                            className="btn-outline"
                            onClick={() => copy(wordpressFormat)}
                            title={tx.cleanLyricsCopyHtmlHint}
                          >
                            ❮❯ {tx.cleanLyricsCopyHtml}
                          </button>
                          <button className="btn-outline" onClick={() => setShowCleanLyrics(false)}>{tx.close}</button>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Lyrics history modal */}
                {showHistory && (
                  <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}
                    onClick={() => setShowHistory(false)}
                  >
                    <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', borderColor: 'rgba(212,168,67,0.4)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: 17 }}>📜 {tx.historyTitle}</h3>
                        <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', fontSize: 22 }}>×</button>
                      </div>
                      {(() => {
                        const versions: { index: number; content: string; userPrompt?: string }[] = []
                        for (let i = 0; i < lyricsHistory.length; i++) {
                          const m = lyricsHistory[i]
                          if (m.role !== 'assistant') continue
                          // Find the latest user message before this assistant message
                          let userPrompt: string | undefined
                          for (let j = i - 1; j >= 0; j--) {
                            if (lyricsHistory[j].role === 'user') { userPrompt = lyricsHistory[j].content; break }
                          }
                          versions.push({ index: versions.length + 1, content: m.content, userPrompt })
                        }
                        if (versions.length === 0) {
                          return <p style={{ color: '#6a5a40', fontSize: 13 }}>{tx.historyEmpty}</p>
                        }
                        // Show newest first.
                        return versions.reverse().map(v => {
                          const isCurrent = v.content === lyrics
                          return (
                            <div key={v.index} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${isCurrent ? 'rgba(212,168,67,0.4)' : 'rgba(180,140,80,0.15)'}`, borderRadius: 6, padding: 14, marginBottom: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                                <span style={{ color: isCurrent ? '#d4a843' : '#8a7a60', fontSize: 12, fontWeight: 500 }}>
                                  {tx.historyVersion} {v.index}{isCurrent ? ` · ${tx.historyCurrent}` : ''}
                                </span>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    className="btn-outline"
                                    style={{ padding: '4px 12px', fontSize: 11 }}
                                    onClick={() => { copy(v.content) }}
                                  >📋 {tx.copy}</button>
                                  {!isCurrent && (
                                    <button
                                      className="btn-outline"
                                      style={{ padding: '4px 12px', fontSize: 11, color: '#d4a843', borderColor: 'rgba(212,168,67,0.4)' }}
                                      onClick={() => {
                                        if (!confirm(tx.historyRestoreConfirm)) return
                                        setLyrics(v.content)
                                        save({ lyrics_text: v.content })
                                        setShowHistory(false)
                                      }}
                                    >↩ {tx.historyRestore}</button>
                                  )}
                                </div>
                              </div>
                              {v.userPrompt && (
                                <div style={{ color: '#6a5a40', fontSize: 11, marginBottom: 6, fontStyle: 'italic' }}>
                                  💬 {v.userPrompt.length > 140 ? v.userPrompt.slice(0, 140) + '...' : v.userPrompt}
                                </div>
                              )}
                              <pre style={{ color: '#a09080', fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, maxHeight: 200, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 4 }}>
                                {v.content}
                              </pre>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                )}
                <div className="song-studio-lyrics-refine">
                  <p className="song-studio-lyrics-refine__label">{tx.lyricsRefineLabel}</p>
                  <p className="song-studio-lyrics-refine__hint">{tx.lyricsRefineDesc}</p>
                  <div className="song-studio-lyrics-refine__row">
                    <input
                      value={lyricsChat}
                      onChange={e => setLyricsChat(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && refineLyrics()}
                      placeholder={tx.refineHint}
                    />
                    <button className="btn-outline song-studio-lyrics-refine__btn" onClick={refineLyrics} disabled={aiLoading || !lyricsChat.trim()}>
                      {isLoading('refine') ? tx.generating : tx.refineLyrics}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* BACKSTORY TAB */}
        {panel === 'backstory' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>📖 {tx.backstoryTitle}</h2>
            <p style={{ color: '#8a7a60', fontSize: 13, marginTop: 6 }}>{tx.backstoryDesc}</p>

            <div style={{ marginTop: 14, marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className="btn-gold"
                onClick={generateBackstory}
                disabled={isLoading('backstory')}
                style={{ padding: '8px 18px', fontSize: 13 }}
              >
                {isLoading('backstory') ? tx.generating : (backstory ? '🔄 ' + tx.backstoryRegenerate : '✨ ' + tx.backstoryGenerate)}
              </button>
              {backstory && (
                <button
                  className="btn-outline"
                  onClick={() => copy(backstory)}
                  style={{ padding: '8px 14px', fontSize: 13 }}
                  title={lang === 'no' ? 'Kopier backstory til utklippstavlen' : 'Copy backstory to clipboard'}
                >
                  📋 {tx.copy}
                </button>
              )}
              {backstory && (
                <button
                  className="btn-outline"
                  onClick={async () => { await save({ backstory }); }}
                  style={{ padding: '8px 14px', fontSize: 13 }}
                  title={lang === 'no' ? 'Lagre nå' : 'Save now'}
                >
                  💾 {tx.save}
                </button>
              )}
              <span style={{ color: '#5a4a30', fontSize: 11, alignSelf: 'center' }}>
                {tx.backstoryAiHint}
              </span>
            </div>

            <textarea
              value={backstory}
              onChange={e => setBackstory(e.target.value)}
              onBlur={() => save({ backstory })}
              placeholder={tx.backstoryPlaceholder}
              rows={14}
              maxLength={5000}
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 14, padding: 14, fontFamily: 'inherit', resize: 'vertical', minHeight: 240 }}
            />
            <div style={{ color: '#5a4a30', fontSize: 11, textAlign: 'right', marginTop: 4 }}>
              {backstory.length} / 5000
            </div>
            <p style={{ color: '#6a5a40', fontSize: 12, marginTop: 14 }}>
              💡 {tx.backstoryTip}
            </p>
          </div>
        )}

        {/* SUNO TAB */}
        {panel === 'suno' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.sunoTitle}</h2>

            {!lyrics && <p style={{ color: '#e07070', fontSize: '13px' }}>{tx.sunoNoLyrics}</p>}
            <button className="btn-gold" onClick={generateSuno} disabled={aiLoading || !lyrics} style={{ marginBottom: '24px' }}>
              {isLoading('suno') ? tx.generating : sunoPrompt ? tx.sunoRegenerate : tx.sunoGenerate}
            </button>
            {sunoPrompt && (
              <>
                <div className="card" style={{ marginBottom: '16px', borderColor: 'rgba(80,160,80,0.25)' }}>
                  <SunoPromptToolbar
                    prompt={activeSunoPrompt}
                    mode={sunoPromptMode}
                    platformId={aiPlatformId}
                    customLimits={aiPlatformCustomLimits}
                    onModeChange={setSunoPromptMode}
                    onCopy={copySunoPrompt}
                  />
                  <ContentLimitCounter
                    text={activeSunoPrompt}
                    contentType="stylePrompt"
                    platformId={aiPlatformId}
                    customLimits={aiPlatformCustomLimits}
                    showTarget={false}
                  />
                  <textarea
                    value={activeSunoPrompt}
                    onChange={e => updateSunoPromptField(e.target.value)}
                    rows={10}
                    style={{ marginTop: 12 }}
                  />
                </div>
                <div style={{ background: 'rgba(100,140,200,0.08)', border: '1px solid rgba(100,140,200,0.2)', borderRadius: '6px', padding: '14px 18px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#8090b0' }}>
                    💡 {tx.sunoHint}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {panel === 'dna' && (
          <SongDNAPanel
            dna={songDna}
            genre={proposalMeta?.genre}
            mood={proposalMeta?.mood}
            onRegenerate={regenerateSongDna}
            regenerating={dnaRegenerating}
          />
        )}

        {/* CAPTIONS TAB */}
        {panel === 'captions' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.captionsTitle}</h2>
            {!lyrics && <p style={{ color: '#e07070', fontSize: '13px' }}>{tx.sunoNoLyrics}</p>}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.toneLabel}</label>
              <input value={captionTone} onChange={e => setCaptionTone(e.target.value)} placeholder={tx.tonePlaceholder} />
            </div>

            {/* Language override */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,80,0.15)', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: captionLangOverride ? '10px' : '0' }}>
                <input type="checkbox" checked={captionLangOverride} onChange={e => setCaptionLangOverride(e.target.checked)}
                  style={{ accentColor: '#d4a843', width: '14px', height: '14px' }} />
                <span style={{ color: captionLangOverride ? '#d4a843' : '#6a5a40', fontSize: '13px' }}>
                  {lang === 'no' ? 'Overstyr språk for captions' : 'Override language for captions'}
                </span>
                {!captionLangOverride && (
                  <span style={{ color: '#5a4a30', fontSize: '12px' }}>
                    — {lang === 'no' ? `bruker nå: ${aiOutputLanguageName(aiOutputLang)}` : `currently using: ${aiOutputLanguageName(aiOutputLang)}`}
                  </span>
                )}
              </label>
              {captionLangOverride && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['no', 'en', 'auto'] as const).map(l => (
                    <button key={l} onClick={() => setCaptionForcedLang(l)} style={{
                      padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                      border: captionForcedLang === l ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.2)',
                      background: captionForcedLang === l ? 'rgba(212,168,67,0.15)' : 'transparent',
                      color: captionForcedLang === l ? '#d4a843' : '#6a5a40',
                    }}>
                      {l === 'no' ? '🇳🇴 Norsk' : l === 'en' ? '🇬🇧 English' : '🔀 Auto'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => generateCaption(p)} disabled={aiLoading || !lyrics} style={{
                  padding: '10px 18px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
                  background: captions[p] ? 'rgba(80,160,80,0.12)' : 'rgba(212,168,67,0.08)',
                  border: captions[p] ? '1px solid rgba(80,160,80,0.35)' : '1px solid rgba(212,168,67,0.25)',
                  color: captions[p] ? '#7bc87b' : '#d4a843',
                }}>
                  {isLoading(`caption_${p}`) ? '...' : captions[p] ? `✓ ${p}` : p}
                </button>
              ))}
            </div>

            {PLATFORMS.filter(p => captions[p]).map(p => (
              <div key={p} className="card" style={{ marginBottom: '16px', borderColor: 'rgba(80,160,80,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#7bc87b', fontSize: '11px', letterSpacing: '1px' }}>{p.toUpperCase()}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => generateCaption(p)} disabled={aiLoading}>↻</button>
                    <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => copy(captions[p])}>📋 {tx.copy}</button>
                  </div>
                </div>
                <textarea value={captions[p]} onChange={e => { const u = { ...captions, [p]: e.target.value }; setCaptions(u); save({ captions: u }) }} rows={6} />
              </div>
            ))}
          </div>
        )}

        {panel === 'promote-assets' && (
          <SongPromoteAssetsPanel
            assets={promoteCampaignAssets}
            publishContent={publishContent}
            artistId={artist?.id}
            songId={songId}
            aiLoading={aiLoading}
            isLoading={isLoading}
            onGenerate={generateCampaignAsset}
            onCopy={copy}
            onUpdateAsset={updateCampaignAsset}
            onUpdateMedia={media => updatePublishContent({ campaign_media: media })}
            onOpenReleaseCampaign={() => navigateToPanel('campaign')}
            canGenerate={!!(lyrics || lyricsInstructions || backstory || sunoPrompt)}
          />
        )}

        {/* COVER TAB */}
        {panel === 'cover' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.coverTitle}</h2>
            {!coverImageUrl && !song?.spotify_cover_url && (
              <WorkspaceEmptyState
                icon="🖼️"
                title={tx.songStudioEmptyCover}
                description={tx.songStudioEmptyCoverDesc}
              />
            )}
            <div className="card" style={{ marginBottom: '24px' }}>
              <p style={{ color: '#8a7a60', fontSize: '12px', letterSpacing: '1px', marginTop: 0 }}>{tx.uploadCover}</p>
              {coverImageUrl && (
                <ZoomableImage
                  src={coverImageUrl}
                  alt={title || 'cover'}
                  caption={title || undefined}
                  style={{ width: '180px', height: '180px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px', display: 'block' }}
                />
              )}
              <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn-outline" onClick={() => fileRef.current?.click()} disabled={uploadingCover}>
                  {uploadingCover ? tx.saving : coverImageUrl ? '↻ ' + tx.edit : '📁 ' + (lang === 'no' ? 'Velg bilde' : 'Choose image')}
                </button>
                {artist?.id && (
                  <button type="button" className="btn-outline" onClick={() => setCoverPickerOpen(true)}>
                    {tx.mediaCoverFromLibrary}
                  </button>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: '#8a7a60', fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={saveCoverToLibrary}
                  onChange={e => setSaveCoverToLibrary(e.target.checked)}
                  style={{ accentColor: '#d4a843' }}
                />
                {tx.mediaSaveCoverToLibrary}
              </label>
            </div>
            {artist?.id && (
              <AssetPicker
                open={coverPickerOpen}
                onClose={() => setCoverPickerOpen(false)}
                artistId={artist.id}
                types={['cover', 'promo_image', 'campaign_graphic']}
                onSelect={applyCoverFromLibrary}
                title={tx.mediaCoverFromLibrary}
              />
            )}
            {/* Style preset chips */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: '#8a7a60', fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>{tx.coverStyleChips}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {[
                  'Cinematic', 'Photorealistic', 'Vintage film', 'Polaroid', 'Oil painting',
                  'Watercolor', 'Anime', '3D render', 'Sketch', 'Vaporwave', 'Noir', 'Documentary',
                ].map(s => {
                  const active = coverStyleChips.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCoverStyleChips(prev => active ? prev.filter(x => x !== s) : [...prev, s])}
                      style={{
                        padding: '4px 10px', borderRadius: 14, fontSize: 11, cursor: 'pointer',
                        border: `1px solid ${active ? 'rgba(212,168,67,0.5)' : 'rgba(180,140,80,0.2)'}`,
                        background: active ? 'rgba(212,168,67,0.15)' : 'transparent',
                        color: active ? '#d4a843' : '#6a5a40',
                      }}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Mood preset chips */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: '#8a7a60', fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>{tx.coverMoodChips}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {[
                  'Dark', 'Dreamy', 'Melancholic', 'Hopeful', 'Energetic',
                  'Peaceful', 'Mysterious', 'Intense', 'Gritty', 'Nostalgic', 'Epic', 'Warm',
                ].map(m => {
                  const active = coverMoodChips.includes(m)
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCoverMoodChips(prev => active ? prev.filter(x => x !== m) : [...prev, m])}
                      style={{
                        padding: '4px 10px', borderRadius: 14, fontSize: 11, cursor: 'pointer',
                        border: `1px solid ${active ? 'rgba(160,100,200,0.5)' : 'rgba(180,140,80,0.2)'}`,
                        background: active ? 'rgba(160,100,200,0.15)' : 'transparent',
                        color: active ? '#c07bd0' : '#6a5a40',
                      }}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Free-form style + format/quality */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#8a7a60', fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>{tx.coverStyleLabel}</label>
              <input value={coverStyle} onChange={e => setCoverStyle(e.target.value)} placeholder={tx.coverStylePlaceholder} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', color: '#8a7a60', fontSize: 11, letterSpacing: 1, marginBottom: 4 }}>{tx.coverAspect}</label>
                <select value={coverAspect} onChange={e => setCoverAspect(e.target.value as any)}>
                  <option value="1:1">1:1 — {tx.coverAspectSquare}</option>
                  <option value="9:16">9:16 — {tx.coverAspectPortrait}</option>
                  <option value="16:9">16:9 — {tx.coverAspectLandscape}</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: '#8a7a60', fontSize: 11, letterSpacing: 1, marginBottom: 4 }}>{tx.coverQuality}</label>
                <select value={coverQuality} onChange={e => setCoverQuality(e.target.value as any)}>
                  <option value="low">Low — ~$0.02 · {tx.coverQualityLowHint}</option>
                  <option value="medium">Medium — ~$0.04 · {tx.coverQualityMediumHint}</option>
                  <option value="high">High — ~$0.07 · {tx.coverQualityHighHint}</option>
                </select>
              </div>
            </div>

            <button className="btn-gold" onClick={generateCoverPrompt} disabled={aiLoading || !lyrics} style={{ marginBottom: '24px' }}>
              {isLoading('cover') ? tx.generating : coverPrompt ? '↻ ' + tx.regenerate : tx.generateCoverPrompt}
            </button>
            {coverPrompt && (
              <div className="card" style={{ borderColor: 'rgba(160,100,200,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#c07bd0', fontSize: '11px', letterSpacing: '1px' }}>{tx.coverPromptLabel}</span>
                  <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => copy(coverPrompt)}>📋 {tx.copy}</button>
                </div>
                <textarea value={coverPrompt} onChange={e => { setCoverPrompt(e.target.value); save({ cover_prompt: e.target.value }) }} rows={8} />

                {/* AI image generation directly from the prompt */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 6px' }}>
                  <button
                    className="btn-gold"
                    onClick={generateCoverImage}
                    disabled={imageGenerating || !coverPrompt.trim()}
                    style={{ background: 'linear-gradient(135deg, #c07bd0, #9060c0)', borderColor: '#9060c0', color: '#fff' }}
                  >
                    {imageGenerating ? tx.coverImageGenerating : (coverImageUrl ? '↻ ' + tx.coverImageRegenerate : tx.coverImageGenerate)}
                  </button>
                  <span style={{ color: '#6a5a40', fontSize: 11 }}>{tx.coverImageHint}</span>
                </div>
                {imageError && (
                  <div style={{ background: 'rgba(200,80,80,0.08)', border: '1px solid rgba(200,80,80,0.3)', color: '#c05050', padding: '8px 12px', borderRadius: 4, fontSize: 12, marginTop: 8 }}>
                    {imageError}
                  </div>
                )}

                <p style={{ color: '#6a5a40', fontSize: '12px', margin: '14px 0 0' }}>
                  {tx.coverHint} <a href="https://midjourney.com" target="_blank" rel="noopener noreferrer" style={{ color: '#9080c0' }}>Midjourney</a>, <a href="https://openai.com/dall-e" target="_blank" rel="noopener noreferrer" style={{ color: '#9080c0' }}>DALL-E</a>
                </p>
              </div>
            )}
          </div>
        )}

        {/* CANVAS TAB */}
        {panel === 'canvas' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.canvasTitle}</h2>

            {/* Existing canvas preview */}
            {canvasUrl && (
              <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(160,100,200,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ color: '#c07bd0', fontSize: 11, letterSpacing: 1 }}>
                    {tx.canvasCurrent} {canvasProvider ? `· ${canvasProvider}` : ''}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-outline" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => copy(canvasUrl)}>📋 {tx.copy}</button>
                    <button onClick={clearCanvas} style={{ background: 'none', border: '1px solid rgba(200,80,80,0.25)', color: '#c05050', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>{tx.canvasClear}</button>
                  </div>
                </div>
                <video
                  src={canvasUrl}
                  controls
                  loop
                  playsInline
                  style={{ width: '100%', maxWidth: 320, borderRadius: 8, display: 'block' }}
                />
                {canvasMeta?.aspect_ratio && (
                  <p style={{ color: '#6a5a40', fontSize: 11, margin: '8px 0 0' }}>
                    {canvasMeta.aspect_ratio} · {canvasMeta.duration_seconds || '?'}s
                    {canvasMeta.model ? ` · ${canvasMeta.model}` : ''}
                  </p>
                )}
              </div>
            )}

            {/* Format controls + AI generation */}
            <div className="card" style={{ marginBottom: 18, borderColor: 'rgba(160,100,200,0.3)' }}>
              <p style={{ color: '#c07bd0', fontSize: 11, letterSpacing: 1, marginTop: 0, marginBottom: 12 }}>
                {tx.canvasGenerateLabel}
              </p>

              {/* Mode toggle: text-to-video vs image-to-video */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
                {(['text-to-video', 'image-to-video'] as const).map(m => {
                  const active = canvasMode === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCanvasMode(m)}
                      style={{
                        padding: '6px 14px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                        border: `1px solid ${active ? 'rgba(160,100,200,0.5)' : 'rgba(180,140,80,0.2)'}`,
                        background: active ? 'rgba(160,100,200,0.18)' : 'transparent',
                        color: active ? '#c07bd0' : '#6a5a40',
                        fontWeight: active ? 500 : 400,
                      }}
                    >
                      {m === 'text-to-video' ? '✨ ' + tx.canvasModeText : '🖼️ ' + tx.canvasModeImage}
                    </button>
                  )
                })}
              </div>

              {/* Image-to-video source picker */}
              {canvasMode === 'image-to-video' && (
                <div style={{ marginBottom: 14, padding: 12, background: 'rgba(160,100,200,0.05)', border: '1px solid rgba(160,100,200,0.2)', borderRadius: 6 }}>
                  <p style={{ margin: '0 0 8px', color: '#c07bd0', fontSize: 10, letterSpacing: 1 }}>{tx.canvasImageSource}</p>
                  <p style={{ margin: '0 0 10px', color: '#e0a050', fontSize: 11, lineHeight: 1.5 }}>
                    ⚠ {tx.canvasI2vAspectWarning}
                  </p>

                  {/* Quick action: generate a 9:16 version of the cover for canvas use */}
                  {coverPrompt && (
                    <button
                      type="button"
                      onClick={generateCanvasI2vImage}
                      disabled={canvasI2vImageGenerating}
                      style={{
                        background: 'linear-gradient(135deg, #d4a843, #b08a35)',
                        color: '#0a0a0f',
                        border: 'none',
                        padding: '7px 14px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: canvasI2vImageGenerating ? 'wait' : 'pointer',
                        marginBottom: 10,
                        opacity: canvasI2vImageGenerating ? 0.6 : 1,
                      }}
                      title={tx.canvasI2vGenerate916Hint}
                    >
                      {canvasI2vImageGenerating ? tx.canvasI2vGenerating916 : '✨ ' + tx.canvasI2vGenerate916}
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                    {(['cover', 'upload'] as const).map(src => {
                      const active = canvasImageSource === src
                      const disabled = src === 'cover' && !coverImageUrl
                      return (
                        <button
                          key={src}
                          type="button"
                          onClick={() => !disabled && setCanvasImageSource(src)}
                          disabled={disabled}
                          style={{
                            padding: '5px 12px', borderRadius: 4, fontSize: 11, cursor: disabled ? 'not-allowed' : 'pointer',
                            border: `1px solid ${active ? 'rgba(212,168,67,0.4)' : 'rgba(180,140,80,0.15)'}`,
                            background: active ? 'rgba(212,168,67,0.1)' : 'transparent',
                            color: disabled ? '#3a3530' : active ? '#d4a843' : '#6a5a40',
                          }}
                        >
                          {src === 'cover' ? tx.canvasUseSongCover : tx.canvasUploadStartFrame}
                        </button>
                      )
                    })}
                  </div>

                  {canvasImageSource === 'cover' && (
                    coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverImageUrl} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                    ) : (
                      <p style={{ color: '#5a4a30', fontSize: 11, margin: 0 }}>{tx.canvasNoCover}</p>
                    )
                  )}

                  {canvasImageSource === 'upload' && (
                    <div>
                      <input
                        ref={canvasImageFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadCanvasImage(f); if (e.target) e.target.value = '' }}
                      />
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: '5px 12px', fontSize: 11 }}
                          onClick={() => canvasImageFileRef.current?.click()}
                          disabled={canvasImageUploading}
                        >
                          {canvasImageUploading ? tx.saving : '📁 ' + tx.canvasUploadImage}
                        </button>
                        {canvasImageUrl && (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={canvasImageUrl} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                            <button
                              type="button"
                              onClick={() => setCanvasImageUrl('')}
                              style={{ background: 'none', border: '1px solid rgba(200,80,80,0.25)', color: '#c05050', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                            >×</button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', color: '#8a7a60', fontSize: 11, letterSpacing: 1, marginBottom: 4 }}>
                    {tx.canvasAspectRatio}
                    {canvasMode === 'image-to-video' && (
                      <span style={{ color: '#5a4a30', fontWeight: 'normal', textTransform: 'none', letterSpacing: 0 }}> — {tx.canvasI2vAspectIgnored}</span>
                    )}
                  </label>
                  <select
                    value={canvasAspect}
                    onChange={e => setCanvasAspect(e.target.value as any)}
                    disabled={canvasMode === 'image-to-video'}
                    style={canvasMode === 'image-to-video' ? { opacity: 0.5 } : undefined}
                  >
                    <option value="9:16">9:16 — {tx.canvasVertical}</option>
                    <option value="16:9">16:9 — {tx.canvasHorizontal}</option>
                    <option value="1:1">1:1 — {tx.canvasSquare}</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#8a7a60', fontSize: 11, letterSpacing: 1, marginBottom: 4 }}>{tx.canvasDuration}</label>
                  <select value={canvasDuration} onChange={e => setCanvasDuration(Number(e.target.value))}>
                    {[3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n}s{n >= 3 && n <= 7 ? ' ✓ Spotify' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Spotify Canvas requirements info */}
              <div style={{ background: 'rgba(30,215,96,0.06)', border: '1px solid rgba(30,215,96,0.25)', borderRadius: 6, padding: 10, marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 11, color: '#7bc87b', lineHeight: 1.5 }}>
                  <strong>{tx.canvasSpotifySpecTitle}</strong><br/>
                  {tx.canvasSpotifySpecBody}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                <label style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1 }}>{tx.canvasPromptLabel}</label>
                <button
                  type="button"
                  onClick={generateCanvasPrompt}
                  disabled={aiLoading || (!lyricsInstructions && !coverPrompt && !lyrics && !title)}
                  style={{ background: 'rgba(212,168,67,0.12)', border: '1px solid rgba(212,168,67,0.3)', color: '#d4a843', padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                  title={tx.canvasPromptAiHint}
                >
                  {isLoading('canvas_prompt') ? tx.generating : '✨ ' + tx.canvasPromptGenerate}
                </button>
              </div>
              <textarea
                value={canvasPrompt}
                onChange={e => { setCanvasPrompt(e.target.value); save({ canvas_prompt: e.target.value }) }}
                placeholder={tx.canvasPromptPlaceholder}
                rows={4}
                style={{ marginBottom: 12 }}
              />

              <button
                onClick={generateCanvas}
                disabled={canvasGenerating || canvasPrompt.trim().length < 5}
                className="btn-gold"
                style={{ background: 'linear-gradient(135deg, #c07bd0, #9060c0)', borderColor: '#9060c0', color: '#fff' }}
              >
                {canvasGenerating ? (canvasGenStatus || tx.canvasGenerating) : '🎬 ' + tx.canvasGenerate}
              </button>

              <p style={{ color: '#5a4a30', fontSize: 11, margin: '8px 0 0' }}>
                {tx.canvasGenerateHint}
              </p>

              {canvasError && (
                <div style={{ background: 'rgba(200,80,80,0.08)', border: '1px solid rgba(200,80,80,0.3)', color: '#c05050', padding: '8px 12px', borderRadius: 4, fontSize: 12, marginTop: 10 }}>
                  {canvasError}
                </div>
              )}
            </div>

            {/* Manual: file upload */}
            <div className="card" style={{ marginBottom: 18 }}>
              <p style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, marginTop: 0, marginBottom: 12 }}>{tx.canvasManualUpload}</p>
              <input
                ref={canvasFileRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadCanvasFile(f); if (e.target) e.target.value = '' }}
              />
              <button
                type="button"
                className="btn-outline"
                onClick={() => canvasFileRef.current?.click()}
                disabled={canvasUploading}
              >
                {canvasUploading ? tx.saving : '📁 ' + tx.canvasUploadFile}
              </button>
              <p style={{ color: '#5a4a30', fontSize: 11, margin: '8px 0 0' }}>{tx.canvasUploadHint}</p>
            </div>

            {/* Manual: paste URL */}
            <div className="card">
              <p style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, marginTop: 0, marginBottom: 12 }}>{tx.canvasManualUrl}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={canvasExternalInput}
                  onChange={e => setCanvasExternalInput(e.target.value)}
                  placeholder={tx.canvasUrlPlaceholder}
                  style={{ flex: '1 1 220px', minWidth: 0 }}
                  disabled={canvasUploading}
                />
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => { saveCanvasFromExternalUrl(canvasExternalInput); setCanvasExternalInput('') }}
                  disabled={canvasUploading || !canvasExternalInput.trim()}
                >
                  {tx.canvasUrlSave}
                </button>
              </div>
              <p style={{ color: '#5a4a30', fontSize: 11, margin: '8px 0 0' }}>{tx.canvasUrlHint}</p>
            </div>
          </div>
        )}

        {/* MEDIA TAB */}
        {panel === 'media' && (
          <div className="song-studio-publish-media">
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.mediaTitle}</h2>

            <section className="song-studio-publish-section">
              <h3 className="workspace-card-title">{tx.mediaTitle}</h3>
              <div className="card song-streaming-links" style={{ marginBottom: 16 }}>
                <p style={{ color: '#8a7a60', fontSize: 12, letterSpacing: 1, marginTop: 0 }}>{tx.songStreamingLinksTitle}</p>
                <label style={{ display: 'block', fontSize: 12, color: '#8a7a60', marginBottom: 6 }}>{tx.songSpotifyUrlLabel}</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    value={spotifyUrl}
                    onChange={e => setSpotifyUrl(e.target.value)}
                    placeholder="https://open.spotify.com/track/..."
                    style={{ flex: '1 1 220px', minWidth: 0 }}
                  />
                  <button type="button" className="btn-gold" onClick={saveSpotifyUrl} disabled={savingSpotify}>
                    {savingSpotify ? tx.saving : tx.save}
                  </button>
                </div>
                <p style={{ color: '#5a4a30', fontSize: 11, margin: '8px 0 0' }}>{tx.songSpotifyUrlHint}</p>
                {!spotifyUrl.trim() && (
                  <p className="playlist-eligibility-warn playlist-eligibility-warn--strong" style={{ marginTop: 10, marginBottom: 0 }}>
                    {tx.playlistCommunityWarnSpotifyLink}
                  </p>
                )}
              </div>
              <div className="card" style={{ marginBottom: 0 }}>
                <p style={{ color: '#8a7a60', fontSize: '12px', letterSpacing: '1px', marginTop: 0 }}>{tx.addLink}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)} style={{ width: 'auto' }}>
                    {MEDIA_PLATFORMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                  <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..." />
                  <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder={tx.labelPlaceholder} />
                </div>
                <button className="btn-gold" onClick={addMediaLink} disabled={!newUrl.trim()}>+ {lang === 'no' ? 'Legg til' : 'Add'}</button>
              </div>
              {mediaLinks.length === 0 ? (
                <WorkspaceEmptyState
                  icon="🔗"
                  title={tx.songStudioEmptyMedia}
                  description={tx.songStudioEmptyMediaDesc}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 16 }}>
                  {mediaLinks.map((link, i) => (
                    <div key={i} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                      <div>
                        <span style={{ color: '#d4a843', fontSize: '13px', marginRight: '10px' }}>{link.platform}</span>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: '#7090d0', fontSize: '13px' }}>{link.label || link.url}</a>
                      </div>
                      <button onClick={() => removeMediaLink(i)} style={{ background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', fontSize: '18px' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <ImportFinishedTrackCard
              song={song}
              sunoPreview={sunoPreview}
              sunoUrlInput={sunoUrlInput}
              onUrlInputChange={setSunoUrlInput}
              onFetch={fetchSunoTrack}
              sunoFetching={sunoFetching}
              sunoError={sunoError}
              sunoSaving={sunoSaving}
              hasLyrics={!!lyrics?.trim()}
              onSave={saveSunoToSong}
              onClearSaved={clearSunoFromSong}
              onDismissPreview={() => { setSunoPreview(null); setSunoUrlInput('') }}
            />

            <section className="song-studio-publish-section">
              <h3 className="workspace-card-title">{tx.songStudioPublishShareTitle}</h3>
              <div className="song-studio-publish-tools">
                <div style={{ marginBottom: 24 }}>
                  <QRCodeCard path={`/s/${songId}`} title={tx.qrSongHint} artistId={artist?.id} songId={songId} saveLabel={title} />
                  {planId === 'free' && (
                    <UpgradePrompt compact title={tx.upgradeQrTitle} description={tx.upgradeQrDesc} />
                  )}
                </div>
                <div style={{ marginBottom: 0 }}>
                  <EmbedCodeGenerator songId={songId} title={title || song?.title || 'ViaTone'} canRemoveBranding={planId === 'pro'} />
                  {planId === 'free' && (
                    <UpgradePrompt compact title={tx.upgradeEmbedTitle} description={tx.upgradeEmbedDesc} />
                  )}
                </div>
              </div>
            </section>

            <section className="card song-studio-publish-section" style={{ marginTop: 28 }}>
              <h3 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>
                📊 {lang === 'no' ? 'Klikkstatistikk' : 'Click stats'}
              </h3>
              <p style={{ color: '#8a7a60', fontSize: 12, margin: '0 0 14px' }}>
                {lang === 'no'
                  ? 'Klikk fra den offentlige låt-siden (/s/...) på Spotify, YouTube og andre lenker.'
                  : 'Clicks from the public song page (/s/...) on Spotify, YouTube and other links.'}
              </p>
              <ClickStats songId={songId} />
            </section>
          </div>
        )}

        {/* CAMPAIGN TAB */}
        {panel === 'campaign' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 18 }}>
              <div>
                <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 18, margin: 0 }}>{tx.campaignTitle}</h2>
                <p style={{ color: '#8a7a60', fontSize: 13, margin: '6px 0 0', lineHeight: 1.5 }}>{tx.campaignDesc}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn-outline" onClick={copyAllCampaign} style={{ padding: '7px 14px', fontSize: 12 }}>
                  📋 {tx.campaignCopyAll}
                </button>
                <button className="btn-gold" onClick={generateAllCampaignAssets} disabled={aiLoading || (!lyrics && !lyricsInstructions && !backstory && !sunoPrompt)} style={{ padding: '7px 14px', fontSize: 12 }}>
                  {aiLoading && aiTarget.startsWith('campaign_') ? tx.generating : tx.campaignGenerateMissing}
                </button>
              </div>
            </div>

            {planId === 'free' && (
              <UpgradePrompt compact title={tx.upgradeAiTitle} description={tx.upgradeAiDesc} />
            )}

            {!campaignReleaseDate && campaignTimeline.length === 0 && (
              <WorkspaceEmptyState
                icon="📅"
                title={tx.songStudioEmptyReleaseCampaign}
                description={tx.songStudioEmptyReleaseCampaignDesc}
              />
            )}

            <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(112,144,208,0.22)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(180px, 240px)', gap: 14 }}>
                <div>
                  <h3 style={{ color: '#7090d0', fontWeight: 'normal', fontSize: 14, margin: '0 0 8px' }}>{tx.campaignReleaseInfo}</h3>
                  <p style={{ color: '#8a7a60', fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>{tx.campaignReleaseInfoDesc}</p>
                  <input
                    type="date"
                    value={campaignReleaseDate}
                    onChange={e => updatePublishContent({ campaign_release_date: e.target.value })}
                    aria-label={tx.campaignReleaseDate}
                  />
                </div>
                <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,80,0.12)', borderRadius: 8, padding: 12 }}>
                  <div style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{tx.campaignInputs}</div>
                  <div style={{ color: '#c8c0b0', fontSize: 12, lineHeight: 1.6 }}>
                    <div>{tx.song}: <span style={{ color: '#e8e0d0' }}>{title || '—'}</span></div>
                    <div>{tx.artistName}: <span style={{ color: '#e8e0d0' }}>{artist?.name || '—'}</span></div>
                    <div>{tx.genre}: <span style={{ color: '#e8e0d0' }}>{artist?.genre || '—'}</span></div>
                    <div>{tx.lyrics}: <span style={{ color: lyrics ? '#7bc87b' : '#6a5a40' }}>{lyrics ? tx.yes : tx.no}</span></div>
                    <div>{tx.backstory}: <span style={{ color: backstory ? '#7bc87b' : '#6a5a40' }}>{backstory ? tx.yes : tx.no}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20, borderColor: releaseReadinessScore >= 80 ? 'rgba(123,200,123,0.34)' : releaseReadinessScore >= 55 ? 'rgba(212,168,67,0.34)' : 'rgba(224,112,112,0.28)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
                <div>
                  <h3 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 16, margin: '0 0 6px' }}>{tx.reviewTitle}</h3>
                  <p style={{ color: '#8a7a60', fontSize: 12, lineHeight: 1.5, margin: 0 }}>{tx.reviewDesc}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: releaseReadinessScore >= 80 ? '#7bc87b' : releaseReadinessScore >= 55 ? '#d4a843' : '#e07070', fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
                    {releaseReadinessScore}
                  </div>
                  <div style={{ color: '#6a5a40', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{tx.reviewScore}</div>
                </div>
              </div>

              <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ width: `${releaseReadinessScore}%`, height: '100%', background: releaseReadinessScore >= 80 ? '#7bc87b' : releaseReadinessScore >= 55 ? '#d4a843' : '#e07070' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 16 }}>
                {releaseReviewChecks.map(item => (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 6, border: item.done ? '1px solid rgba(123,200,123,0.24)' : '1px solid rgba(224,112,112,0.22)', background: item.done ? 'rgba(123,200,123,0.07)' : 'rgba(224,112,112,0.05)' }}>
                    <span style={{ color: item.done ? '#c8e0c8' : '#c8b0a0', fontSize: 12 }}>{item.done ? '✓' : '•'} {item.label}</span>
                    <span style={{ color: item.done ? '#7bc87b' : '#8a7a60', fontSize: 11 }}>{item.points}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div>
                  <h4 style={{ color: '#a8b8e8', fontWeight: 'normal', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 8px' }}>{tx.reviewMissingItems}</h4>
                  {releaseMissingItems.length === 0 ? (
                    <p style={{ color: '#7bc87b', fontSize: 13, margin: 0 }}>{tx.reviewNothingMissing}</p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18, color: '#c8c0b0', fontSize: 13, lineHeight: 1.6 }}>
                      {releaseMissingItems.map(item => <li key={item.key}>{item.label}</li>)}
                    </ul>
                  )}
                </div>
                <div>
                  <h4 style={{ color: '#a8b8e8', fontWeight: 'normal', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 8px' }}>{tx.reviewNextActions}</h4>
                  <ul style={{ margin: 0, paddingLeft: 18, color: '#c8c0b0', fontSize: 13, lineHeight: 1.6 }}>
                    {(releaseRecommendedActions.length ? releaseRecommendedActions : releaseReviewChecks.slice(0, 1)).map(item => <li key={item.key}>{item.done ? tx.reviewReadyAction : item.action}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 style={{ color: '#a8b8e8', fontWeight: 'normal', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 8px' }}>{tx.reviewHighImpact}</h4>
                  {releaseHighImpactFixes.length === 0 ? (
                    <p style={{ color: '#7bc87b', fontSize: 13, margin: 0 }}>{tx.reviewNoHighImpact}</p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18, color: '#c8c0b0', fontSize: 13, lineHeight: 1.6 }}>
                      {releaseHighImpactFixes.map(item => <li key={item.key}>{item.action}</li>)}
                    </ul>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn-gold" onClick={generateReleaseReview} disabled={planId !== 'pro' || aiLoading} style={{ padding: '7px 14px', fontSize: 12 }}>
                  {isLoading('release_review') ? tx.generating : tx.reviewAiButton}
                </button>
                {planId === 'free' && <span style={{ color: '#8a7a60', fontSize: 12 }}>{tx.reviewAiProHint}</span>}
              </div>
              {planId === 'free' && (
                <UpgradePrompt compact title={tx.reviewAiProTitle} description={tx.reviewAiProDesc} />
              )}
              {publishContent.release_review_ai?.text && (
                <div style={{ marginTop: 14, padding: 14, borderRadius: 8, border: '1px solid rgba(112,144,208,0.22)', background: 'rgba(112,144,208,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: '#a8b8e8', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>{tx.reviewLatestAi}</span>
                    <button className="btn-outline" onClick={() => copy(publishContent.release_review_ai.text)} style={{ padding: '4px 10px', fontSize: 11 }}>📋 {tx.copy}</button>
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', color: '#c8c0b0', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.55, margin: 0 }}>{publishContent.release_review_ai.text}</pre>
                </div>
              )}
            </div>

            <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(123,200,123,0.22)' }}>
              <h3 style={{ color: '#7bc87b', fontWeight: 'normal', fontSize: 14, margin: '0 0 12px' }}>{tx.campaignChecklist}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
                {campaignChecklist.map(item => {
                  const derived: Record<string, boolean> = {
                    cover_ready: !!coverImageUrl || !!song?.spotify_cover_url,
                    canvas_ready: !!canvasUrl,
                    spotify_link_added: !!song?.spotify_url || mediaLinks.some(l => (l.platform || '').toLowerCase() === 'spotify'),
                    public_page_enabled: !!publicArtistPath,
                    qr_generated: true,
                    newsletter_drafted: !!publishContent.campaign_newsletter_announcement,
                    social_captions_ready: ['tiktok_caption', 'instagram_caption', 'youtube_shorts_caption', 'facebook_post'].some(k => !!publishContent[`campaign_${k}`]),
                  }
                  const checked = campaignChecklistState[item.key] ?? derived[item.key] ?? false
                  return (
                    <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8, color: checked ? '#c8e0c8' : '#8a7a60', fontSize: 13, background: checked ? 'rgba(123,200,123,0.08)' : 'rgba(255,255,255,0.02)', border: checked ? '1px solid rgba(123,200,123,0.25)' : '1px solid rgba(180,140,80,0.12)', borderRadius: 6, padding: '8px 10px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={checked} onChange={e => updateCampaignChecklist(item.key, e.target.checked)} style={{ accentColor: '#7bc87b' }} />
                      {item.label}
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(212,168,67,0.28)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
                <div>
                  <h3 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 15, margin: '0 0 6px' }}>{tx.timelineTitle}</h3>
                  <p style={{ color: '#8a7a60', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                    {planId === 'pro' ? tx.timelineDescPro : tx.timelineDescFree}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-gold" onClick={() => generateTimeline(false)} disabled={!campaignReleaseDate} style={{ padding: '6px 12px', fontSize: 12 }}>
                    {tx.timelineGenerate}
                  </button>
                  <button className="btn-outline" onClick={() => generateTimeline(true)} disabled={!campaignReleaseDate} style={{ padding: '6px 12px', fontSize: 12 }}>
                    {tx.timelineRegenerate}
                  </button>
                  {campaignTimeline.length > 0 && (
                    <button className="btn-outline" onClick={copyTimeline} style={{ padding: '6px 12px', fontSize: 12 }}>
                      📋 {tx.timelineCopy}
                    </button>
                  )}
                  {campaignTimeline.length > 0 && (
                    <button className="btn-outline" onClick={resetTimeline} style={{ padding: '6px 12px', fontSize: 12, color: '#c07070' }}>
                      {tx.timelineReset}
                    </button>
                  )}
                </div>
              </div>

              {!campaignReleaseDate && (
                <p style={{ color: '#c07070', fontSize: 12, margin: '0 0 12px' }}>{tx.timelineNeedsReleaseDate}</p>
              )}
              {planId === 'free' && (
                <UpgradePrompt compact title={tx.timelineProTitle} description={tx.timelineProDesc} />
              )}

              {campaignTimeline.length === 0 ? (
                <p style={{ color: '#6a5a40', fontSize: 13, margin: 0 }}>{tx.timelineEmpty}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {campaignTimeline.map((task: any) => {
                    const badge = timelineBadge(task)
                    return (
                      <div key={task.id} style={{ border: `1px solid ${badge.color}33`, background: badge.bg, borderRadius: 8, padding: 12 }}>
                        <div className="song-studio-timeline-task" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 130px 110px', gap: 8, alignItems: 'center' }}>
                          <input
                            value={task.title}
                            onChange={e => updateTimelineTask(task.id, { title: e.target.value })}
                            aria-label={tx.timelineTaskTitle}
                            style={{ color: '#e8e0d0', fontWeight: 600 }}
                          />
                          <input
                            type="date"
                            value={task.due_date || ''}
                            onChange={e => updateTimelineTask(task.id, { due_date: e.target.value })}
                            aria-label={tx.timelineDueDate}
                          />
                          <select value={task.status || 'todo'} onChange={e => updateTimelineTask(task.id, { status: e.target.value })} aria-label={tx.timelineStatus}>
                            <option value="todo">{tx.timelineTodo}</option>
                            <option value="doing">{tx.timelineDoing}</option>
                            <option value="done">{tx.timelineDone}</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginTop: 8 }}>
                          <span style={{ color: badge.color, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{badge.label}</span>
                          <span style={{ color: '#6a5a40', fontSize: 11 }}>{task.due_date}</span>
                        </div>
                        <textarea
                          value={task.notes || ''}
                          onChange={e => updateTimelineTask(task.id, { notes: e.target.value })}
                          rows={2}
                          placeholder={tx.timelineNotes}
                          style={{ marginTop: 8, fontSize: 12 }}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 22 }}>
              {campaignAssets.map(asset => {
                const value = publishContent[`campaign_${asset.key}`] || ''
                return (
                  <div key={asset.key} className="card" style={{ borderColor: value ? 'rgba(123,200,123,0.22)' : 'rgba(180,140,80,0.14)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ color: value ? '#7bc87b' : '#d4a843', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>{asset.label}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {value && <button className="btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => copy(value)}>📋</button>}
                        <button className="btn-gold" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => generateCampaignAsset(asset.key)} disabled={aiLoading}>
                          {isLoading(`campaign_${asset.key}`) ? tx.generating : value ? '↻' : tx.generate}
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={value}
                      onChange={e => updateCampaignAsset(asset.key, e.target.value)}
                      rows={asset.rows}
                      placeholder={tx.campaignAssetPlaceholder}
                    />
                  </div>
                )
              })}
            </div>

            <div style={{ marginBottom: 18 }}>
              <QRCodeCard path={`/s/${songId}`} title={tx.qrSongHint} artistId={artist?.id} songId={songId} saveLabel={title} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <EmbedCodeGenerator songId={songId} title={title || song?.title || 'ViaTone'} canRemoveBranding={planId === 'pro'} />
              {planId === 'free' && (
                <UpgradePrompt compact title={tx.upgradeEmbedTitle} description={tx.upgradeEmbedDesc} />
              )}
            </div>

            {publicArtistPath ? (
              <div className="card" style={{ borderColor: 'rgba(112,144,208,0.22)' }}>
                <div style={{ color: '#7090d0', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{tx.publicPage}</div>
                <a href={publicArtistPath} target="_blank" rel="noopener noreferrer" style={{ color: '#d4a843', wordBreak: 'break-all' }}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}{publicArtistPath}
                </a>
              </div>
            ) : (
              <div className="card" style={{ borderColor: 'rgba(192,120,80,0.25)' }}>
                <p style={{ color: '#a09080', fontSize: 13, margin: 0 }}>{tx.campaignPublicPageMissing}</p>
                {artist?.id && <Link href={`/artist/${artist.id}`} style={{ color: '#d4a843', fontSize: 13 }}>{tx.onboardingOpenArtist}</Link>}
              </div>
            )}
          </div>
        )}

        {/* DISTRIBUTION TAB */}
        {panel === 'distribution' && (
          <DistributionWorkflow
            songId={songId}
            title={title || song?.title || ''}
            artist={artist}
            publishContent={publishContent}
            lyrics={lyrics}
            sunoPrompt={sunoPrompt}
            backstory={backstory}
            coverReady={coverReady}
            audioReady={audioReady}
            releaseDate={campaignReleaseDate}
            planId={planId}
            aiLoading={aiLoading}
            callAI={callAI}
            updatePublishContent={updatePublishContent}
            copy={copy}
          />
        )}

        {/* PUBLISH TAB */}
        {panel === 'publish' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.publishTitle}</h2>

            {/* Distribute to streaming platforms */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(212,168,67,0.12) 0%, rgba(30,215,96,0.08) 100%)',
              border: '1px solid rgba(212,168,67,0.3)',
              borderRadius: 8,
              padding: 18,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}>
              <div style={{ fontSize: 36 }}>🚀</div>
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                <h3 style={{ color: '#e8e0d0', margin: 0, fontSize: 16, fontWeight: 600 }}>
                  {tx.distributePublishTitle}
                </h3>
                <p style={{ color: '#a09080', fontSize: 13, margin: '6px 0 0' }}>
                  {tx.distributePublishDesc}
                </p>
                {(song?.distribution_status === 'exported' || song?.distribution_status === 'submitted') && (
                  <p style={{ color: '#7bc87b', fontSize: 12, margin: '6px 0 0' }}>
                    ✓ {tx.distributeAlreadyExported}: {song.distribution_partner || '—'}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowDistribution(true)}
                className="btn-gold"
                style={{ padding: '10px 22px', fontSize: 14, fontWeight: 700 }}
              >
                📤 {tx.distributePublishCta}
              </button>
            </div>

            {!lyrics && <p style={{ color: '#e07070', fontSize: '13px' }}>{tx.sunoNoLyrics}</p>}

            {/* Options bar — language + include-lyrics flag */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,80,0.15)', borderRadius: 6, padding: '10px 14px', marginBottom: 22, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
              <span style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1 }}>{tx.publishLangLabel}: <span style={{ color: '#d4a843', fontWeight: 500 }}>{aiOutputLanguageName(aiOutputLang)}</span></span>
              <span style={{ color: '#5a4a30', fontSize: 11 }}>↑ {tx.publishLangChangeHint}</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: lyrics ? 'pointer' : 'not-allowed', opacity: lyrics ? 1 : 0.5 }}>
                <input
                  type="checkbox"
                  checked={includeLyricsInPublish}
                  onChange={e => setIncludeLyricsInPublish(e.target.checked)}
                  disabled={!lyrics}
                  style={{ accentColor: '#d4a843', width: 14, height: 14 }}
                />
                <span style={{ color: includeLyricsInPublish ? '#d4a843' : '#8a7a60', fontSize: 13 }}>{tx.publishIncludeLyrics}</span>
                <span style={{ color: '#5a4a30', fontSize: 11 }}>— {tx.publishIncludeLyricsHint}</span>
              </label>
            </div>

            {[
              { key: 'wordpress', label: tx.wordpress, color: '#7090d0' },
              { key: 'facebook', label: tx.facebook, color: '#5080d0' },
              { key: 'instagram', label: tx.instagram, color: '#d070a0' },
              { key: 'press', label: tx.press, color: '#8a7a60' },
            ].map(({ key, label, color }) => (
              <div key={key} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ color, fontSize: '13px', letterSpacing: '1px' }}>{label.toUpperCase()}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {publishContent[key] && <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => copy(publishContent[key])}>📋 {tx.copy}</button>}
                    <button className="btn-gold" onClick={() => generatePublish(key)} disabled={aiLoading || !lyrics} style={{ padding: '6px 14px', fontSize: '12px' }}>
                      {isLoading(`publish_${key}`) ? tx.generating : publishContent[key] ? '↻' : tx.generate}
                    </button>
                  </div>
                </div>
                {publishContent[key] && (
                  <textarea value={publishContent[key]} onChange={e => { const u = { ...publishContent, [key]: e.target.value }; setPublishContent(u); save({ publish_content: u }) }} rows={10} />
                )}
              </div>
            ))}
          </div>
        )}

        {panel === 'settings' && (
          <SongStudioSettingsPanel
            songId={songId}
            artistPageEnabled={!!artist?.page_enabled}
            artistAdminHidden={!!artist?.admin_hidden}
            songPublicHidden={!!song?.public_hidden}
            status={song?.status || 'draft'}
            statusOptions={statusOptions}
            onStatusChange={updateStatus}
            aiProvider={aiProvider}
            onAiProviderChange={pickProvider}
            aiOutputLang={aiOutputLang}
            onAiOutputLangChange={setAiOutputLang}
            aiPlatformId={normalizePlatformId(aiPlatformId)}
            aiPlatformCustomLimits={aiPlatformCustomLimits}
            onAiPlatformChange={updateAiPlatform}
            onAiPlatformCustomLimitsChange={updateAiPlatformCustomLimits}
            aiLoading={aiLoading}
            imageGenerating={imageGenerating}
          />
        )}
        </div>
      </SongStudioShell>

      {song && (
        <DistributionModal
          open={showDistribution}
          onClose={() => setShowDistribution(false)}
          song={{
            id: song.id,
            title: song.title,
            lyrics_text: song.lyrics_text,
            suno_audio_url: song.suno_audio_url,
            spotify_url: song.spotify_url,
            cover_image_url: song.cover_image_url,
            spotify_cover_url: song.spotify_cover_url,
            isrc: (song as any).isrc,
            spotify_album: song.spotify_album,
            spotify_release_date: song.spotify_release_date,
            artists: artist ? { name: artist.name, genre: artist.genre } : null,
          }}
        />
      )}
    </div>
  )
}

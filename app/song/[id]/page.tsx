'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'
import { type AIProvider, getStoredProvider, setStoredProvider } from '@/lib/aiProvider'
import AIProviderPicker from '@/components/AIProviderPicker'
import ZoomableImage from '@/components/ZoomableImage'
import { cleanLyricsText } from '@/lib/lyricsCleanup'
import Link from 'next/link'

const PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'YouTube', 'X/Twitter']
const MEDIA_PLATFORMS = ['Spotify', 'YouTube', 'TikTok', 'Instagram', 'Facebook', 'Apple Music', 'SoundCloud', 'Other']

export default function SongPage() {
  const params = useParams()
  const songId = params.id as string
  const [lang, setLangState] = useState<Lang>('no')
  const [tab, setTab] = useState('lyrics')
  const [song, setSong] = useState<any>(null)
  const [artist, setArtist] = useState<any>(null)
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
  const [newPlatform, setNewPlatform] = useState('Spotify')
  const [newUrl, setNewUrl] = useState('')
  const [newLabel, setNewLabel] = useState('')

  const [publishContent, setPublishContent] = useState<Record<string,string>>({})
  const [title, setTitle] = useState('')

  // AI provider (persisted in localStorage)
  const [aiProvider, setAiProvider] = useState<AIProvider>('anthropic')

  // AI image generation state
  const [imageGenerating, setImageGenerating] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

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
  const canvasImageFileRef = useRef<HTMLInputElement | null>(null)
  const [canvasGenerating, setCanvasGenerating] = useState(false)
  const [canvasGenStatus, setCanvasGenStatus] = useState<string>('')
  const [canvasError, setCanvasError] = useState<string | null>(null)
  const [canvasUploading, setCanvasUploading] = useState(false)
  const [canvasExternalInput, setCanvasExternalInput] = useState('')
  const canvasFileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { setLangState(useLang()); setAiProvider(getStoredProvider()); fetchSong() }, [songId])

  const pickProvider = (p: AIProvider) => { setAiProvider(p); setStoredProvider(p) }

  const tx = t[lang]

  const TAB_LABELS: Record<string, string> = {
    lyrics: `🎵 ${tx.lyrics}`,
    suno: `🤖 ${tx.suno}`,
    captions: `📱 ${tx.captions}`,
    cover: `🖼️ ${tx.cover}`,
    canvas: `🎬 ${tx.canvas}`,
    media: `🔗 ${tx.media}`,
    publish: `📢 ${tx.publish}`,
  }

  const fetchSong = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('songs').select('*, artists(*)').eq('id', songId).single()
    if (data) {
      setSong(data); setArtist(data.artists)
      setTitle(data.title || '')
      setLyricsInstructions(data.lyrics_instructions || '')
      setLyrics(data.lyrics_text || '')
      setLyricsHistory(data.lyrics_history || [])
      setSunoPrompt(data.suno_prompt || '')
      setCaptions(data.captions || {})
      setCoverStyle(data.cover_style || '')
      setCoverPrompt(data.cover_prompt || '')
      setCoverImageUrl(data.cover_image_url || '')
      setMediaLinks(data.media_links || [])
      setCanvasPrompt(data.canvas_prompt || '')
      setCanvasUrl(data.canvas_video_url || '')
      setCanvasProvider(data.canvas_provider || '')
      setCanvasMeta(data.canvas_meta || {})
      setPublishContent(data.publish_content || {})
    }
    setLoading(false)
  }

  const save = async (updates: any) => {
    const supabase = createClient()
    await supabase.from('songs').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', songId)
  }

  const callAI = async (messages: any[], system: string, targetKey: string) => {
    setAiLoading(true); setAiTarget(targetKey)
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, system, provider: aiProvider }),
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

  const generateLyrics = async () => {
    if (!lyricsInstructions.trim()) return
    const artistCtx = buildArtistContext()
    const msgs = [{ role: 'user', content: lyricsInstructions + artistCtx }]
    const sysLang = lang === 'no' ? 'Norwegian' : 'English'
    const result = await callAI(msgs,
      `You are a creative songwriter. Write song lyrics based on the user's instructions. Write in ${sysLang}. Format with Verse 1, Verse 2, Chorus, Bridge etc.${artist?.song_structure && useProfileForLyrics ? ' Follow the song structure profile provided.' : ''} Output only the lyrics, no explanations.`,
      'lyrics')
    const newHistory = [...msgs, { role: 'assistant', content: result }]
    setLyrics(result); setLyricsHistory(newHistory)
    await save({ lyrics_instructions: lyricsInstructions, lyrics_text: result, lyrics_history: newHistory, status: 'in_progress' })
  }

  const refineLyrics = async () => {
    if (!lyricsChat.trim()) return
    const newHistory = [...lyricsHistory, { role: 'user', content: lyricsChat }]
    const result = await callAI(newHistory,
      'You are a creative songwriter. Adjust the lyrics based on the feedback. Output only the updated lyrics.',
      'refine')
    const updatedHistory = [...newHistory, { role: 'assistant', content: result }]
    setLyrics(result); setLyricsHistory(updatedHistory); setLyricsChat('')
    await save({ lyrics_text: result, lyrics_history: updatedHistory })
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
    const result = await callAI(
      [{ role: 'user', content: `Lyrics:\n\n${lyrics}` }],
      'You are a Suno AI music generator expert. Create a detailed prompt based on the lyrics. Include genre, tempo, mood, instruments, vocal style and tags in [brackets]. Write in English, max 200 words.',
      'suno')
    setSunoPrompt(result)
    await save({ suno_prompt: result })
  }

  const getCaptionLang = () => {
    if (captionLangOverride) return captionForcedLang === 'no' ? 'Norwegian' : 'English'
    return lang === 'no' ? 'Norwegian' : 'English'
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
      '- Output only the prompt — no preamble, no markdown, no headers. Plain English, max 150 words.',
    ].join('\n')

    const result = await callAI([{ role: 'user', content: userContent }], system, 'cover')
    setCoverPrompt(result)
    await save({ cover_style: coverStyle, cover_prompt: result })
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

  const generatePublish = async (type: string) => {
    const publishLang = lang === 'no' ? 'Norwegian' : 'English'
    const systemMap: Record<string,string> = {
      wordpress: `Write a WordPress blog post in ${publishLang} about this song. Include title (# Title), intro, background, lyric analysis, listen info. Use markdown. ~400 words.`,
      facebook: `Write a Facebook post in ${publishLang} about this song. Engaging, personal, with hashtags. ~150 words.`,
      instagram: `Write an Instagram post in ${publishLang}. Visual language, storytelling, hashtags. ~120 words.`,
      press: `Write a press release in ${publishLang} about this song. Professional tone, 5W structure, artist quote. ~300 words.`,
    }
    const context = `Song: ${title}\nArtist: ${artist?.name}\nGenre: ${artist?.genre}\nLyrics:\n${lyrics}\n\nMedia: ${mediaLinks.map(l => `${l.platform}: ${l.url}`).join(', ')}`
    const result = await callAI([{ role: 'user', content: context }], systemMap[type], `publish_${type}`)
    const updated = { ...publishContent, [type]: result }
    setPublishContent(updated)
    await save({ publish_content: updated })
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

  const isLoading = (key: string) => aiLoading && aiTarget === key

  if (loading) return <div style={{ color: '#6a5a40', padding: '40px' }}>{tx.loading}</div>

  const statusOptions = [
    { value: 'draft', label: tx.draft },
    { value: 'in_progress', label: tx.inProgress },
    { value: 'complete', label: tx.complete },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)' }}>
      {/* Header */}
      <div className="app-header" data-header="page" style={{ borderBottom: '1px solid rgba(180,140,80,0.2)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href={`/artist/${artist?.id}`} style={{ color: '#6a5a40', textDecoration: 'none', fontSize: '13px' }}>← {artist?.name}</Link>
          <span style={{ color: '#3a3530' }}>|</span>
          <input value={title} onChange={e => updateTitle(e.target.value)}
            style={{ background: 'none', border: 'none', color: '#e8e0d0', fontSize: '16px', outline: 'none', width: '220px', padding: '4px 0' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#5a4a30', fontSize: 11, letterSpacing: 1 }}>{tx.aiProviderLabel}</span>
          <AIProviderPicker value={aiProvider} onChange={pickProvider} disabled={aiLoading || imageGenerating} />
          <select value={song?.status || 'draft'} onChange={e => updateStatus(e.target.value)}
            style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}>
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '16px 32px', gap: '6px', borderBottom: '1px solid rgba(180,140,80,0.1)', flexWrap: 'wrap' }}>
        {Object.entries(TAB_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '8px 16px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer',
            border: key === tab ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.15)',
            background: key === tab ? 'rgba(212,168,67,0.12)' : 'transparent',
            color: key === tab ? '#d4a843' : '#6a5a40',
          }}>{label}</button>
        ))}
      </div>

      <div className="page-pad" style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>

        {/* LYRICS TAB */}
        {tab === 'lyrics' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.lyrics}</h2>

            {lyricsInstructions && !lyrics && (
              <div style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 4px', color: '#d4a843', fontSize: '13px', fontWeight: '500' }}>{tx.readyToGenerate}</p>
                  <p style={{ margin: 0, color: '#8a7a60', fontSize: '12px' }}>{tx.readyHint}</p>
                </div>
                <button className="btn-gold" onClick={generateLyrics} disabled={aiLoading}>{isLoading('lyrics') ? tx.generating : tx.generateNow}</button>
              </div>
            )}

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
            <button className="btn-gold" onClick={generateLyrics} disabled={aiLoading || !lyricsInstructions.trim()} style={{ marginBottom: '24px' }}>
              {isLoading('lyrics') ? tx.generating : lyrics ? tx.regenerateLyrics : tx.generateLyrics}
            </button>

            {lyrics && (
              <>
                <div className="card" style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ color: '#d4a843', fontSize: '11px', letterSpacing: '1px' }}>{tx.lyricsLabel}</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
                        onClick={() => copy(cleanLyricsText(lyrics))}
                        title={tx.copyCleanHint}
                      >
                        📄 {tx.copyClean}
                      </button>
                      <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => copy(lyrics)}>
                        📋 {tx.copy}
                      </button>
                    </div>
                  </div>
                  <textarea value={lyrics} onChange={e => { setLyrics(e.target.value); save({ lyrics_text: e.target.value }) }} rows={16} />
                </div>

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
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input value={lyricsChat} onChange={e => setLyricsChat(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && refineLyrics()}
                    placeholder={tx.refineHint} style={{ flex: 1 }} />
                  <button className="btn-gold" onClick={refineLyrics} disabled={aiLoading || !lyricsChat.trim()}>
                    {isLoading('refine') ? tx.generating : tx.refine}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* SUNO TAB */}
        {tab === 'suno' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.sunoTitle}</h2>

            {/* Import-section: paste URL of a finished Suno track */}
            <div style={{ background: 'rgba(80,160,80,0.05)', border: '1px solid rgba(80,160,80,0.25)', borderRadius: 6, padding: 14, marginBottom: 22 }}>
              <p style={{ margin: '0 0 8px', color: '#7bc87b', fontSize: 11, letterSpacing: 1 }}>
                {tx.sunoImportLabel}
              </p>

              {/* Already-saved Suno track on this song */}
              {song?.suno_url && !sunoPreview && (
                <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(80,160,80,0.3)', borderRadius: 6, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: '#7bc87b', fontSize: 12, fontWeight: 500 }}>✓ {tx.sunoImportSaved}</div>
                      <a href={song.suno_url} target="_blank" rel="noopener noreferrer" style={{ color: '#a09080', fontSize: 11, textDecoration: 'none', wordBreak: 'break-all' }}>{song.suno_url}</a>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-outline" style={{ padding: '4px 12px', fontSize: 11 }} onClick={clearSunoFromSong}>{tx.sunoImportClear}</button>
                    </div>
                  </div>
                  {song?.suno_audio_url && (
                    <audio src={song.suno_audio_url} controls style={{ width: '100%', marginTop: 10 }} />
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={sunoUrlInput}
                  onChange={e => setSunoUrlInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') fetchSunoTrack() }}
                  placeholder={tx.sunoImportPlaceholder}
                  style={{ flex: '1 1 220px', minWidth: 0 }}
                />
                <button
                  type="button"
                  onClick={fetchSunoTrack}
                  disabled={sunoFetching || !sunoUrlInput.trim()}
                  style={{ background: 'rgba(80,160,80,0.18)', border: '1px solid rgba(80,160,80,0.45)', color: '#7bc87b', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                >
                  {sunoFetching ? '...' : tx.sunoImportFetch}
                </button>
              </div>

              {sunoError && (
                <div style={{ background: 'rgba(200,80,80,0.08)', border: '1px solid rgba(200,80,80,0.3)', color: '#c05050', padding: '6px 10px', borderRadius: 4, fontSize: 12, marginTop: 8 }}>
                  {sunoError}
                </div>
              )}

              {sunoPreview && (
                <div style={{ marginTop: 14, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(80,160,80,0.3)', borderRadius: 6, padding: 14 }}>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {sunoPreview.coverUrl ? (
                      <img src={sunoPreview.coverUrl} alt={sunoPreview.title || ''} style={{ width: 100, height: 100, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 100, height: 100, borderRadius: 6, background: 'rgba(80,160,80,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, flexShrink: 0 }}>🎵</div>
                    )}
                    <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                      <div style={{ color: '#e8e0d0', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{sunoPreview.title || '(untitled)'}</div>
                      {sunoPreview.tags && (
                        <div style={{ color: '#6a5a40', fontSize: 11, marginBottom: 6 }}>{sunoPreview.tags}</div>
                      )}
                      {sunoPreview.description && (
                        <div style={{ color: '#8a7a60', fontSize: 12, lineHeight: 1.4, marginBottom: 8, maxHeight: 60, overflow: 'auto' }}>
                          {sunoPreview.description}
                        </div>
                      )}
                      {sunoPreview.audioUrl && (
                        <audio src={sunoPreview.audioUrl} controls style={{ width: '100%' }} />
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <button
                      className="btn-gold"
                      onClick={() => saveSunoToSong({ useCover: true, useLyrics: false })}
                      disabled={sunoSaving}
                      style={{ background: '#7bc87b', borderColor: '#7bc87b', color: '#0a0f0a' }}
                    >
                      {sunoSaving ? tx.saving : tx.sunoImportSave}
                    </button>
                    {sunoPreview.lyrics && !lyrics && (
                      <button
                        className="btn-outline"
                        onClick={() => saveSunoToSong({ useCover: true, useLyrics: true })}
                        disabled={sunoSaving}
                      >
                        {tx.sunoImportSaveWithLyrics}
                      </button>
                    )}
                    <button className="btn-outline" onClick={() => { setSunoPreview(null); setSunoUrlInput('') }}>{tx.cancel}</button>
                  </div>
                </div>
              )}
            </div>

            {!lyrics && <p style={{ color: '#e07070', fontSize: '13px' }}>{tx.sunoNoLyrics}</p>}
            <button className="btn-gold" onClick={generateSuno} disabled={aiLoading || !lyrics} style={{ marginBottom: '24px' }}>
              {isLoading('suno') ? tx.generating : sunoPrompt ? tx.sunoRegenerate : tx.sunoGenerate}
            </button>
            {sunoPrompt && (
              <>
                <div className="card" style={{ marginBottom: '16px', borderColor: 'rgba(80,160,80,0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: '#7bc87b', fontSize: '11px', letterSpacing: '1px' }}>{tx.sunoLabel}</span>
                    <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => copy(sunoPrompt)}>📋 {tx.sunoCopy}</button>
                  </div>
                  <textarea value={sunoPrompt} onChange={e => { setSunoPrompt(e.target.value); save({ suno_prompt: e.target.value }) }} rows={10} />
                </div>
                <div style={{ background: 'rgba(100,140,200,0.08)', border: '1px solid rgba(100,140,200,0.2)', borderRadius: '6px', padding: '14px 18px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#8090b0' }}>
                    💡 {tx.sunoHint} <a href="https://suno.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#7090d0' }}>suno.ai</a>
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* CAPTIONS TAB */}
        {tab === 'captions' && (
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
                    — {lang === 'no' ? `bruker nå: Norsk` : `currently using: English`}
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

        {/* COVER TAB */}
        {tab === 'cover' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.coverTitle}</h2>
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
              <button className="btn-outline" onClick={() => fileRef.current?.click()} disabled={uploadingCover}>
                {uploadingCover ? tx.saving : coverImageUrl ? '↻ ' + tx.edit : '📁 ' + (lang === 'no' ? 'Velg bilde' : 'Choose image')}
              </button>
            </div>
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
        {tab === 'canvas' && (
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
        {tab === 'media' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.mediaTitle}</h2>
            <div className="card" style={{ marginBottom: '24px' }}>
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
            {mediaLinks.length === 0 ? <p style={{ color: '#6a5a40', fontSize: '13px' }}>{tx.noLinks}</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
          </div>
        )}

        {/* PUBLISH TAB */}
        {tab === 'publish' && (
          <div>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0 }}>{tx.publishTitle}</h2>
            {!lyrics && <p style={{ color: '#e07070', fontSize: '13px' }}>{tx.sunoNoLyrics}</p>}
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
      </div>
    </div>
  )
}

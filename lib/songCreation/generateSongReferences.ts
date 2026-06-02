import { generateSongDNA } from '@/lib/songDNA/generateSongDNA'
import { normalizeSongDNA, type SongDNA } from '@/lib/songDNA/types'
import type { InspirationControls, SongReference } from './types'

const FOCUS_LABELS: Record<keyof InspirationControls, string> = {
  themes: 'themes and subject matter',
  storytelling: 'narrative approach and story arcs',
  atmosphere: 'mood, imagery, and atmosphere',
  structure: 'verse/chorus structure and pacing',
  chorusStyle: 'chorus style and hook characteristics',
  vocabulary: 'word choice and vocabulary',
  melodicFeel: 'melodic feel and phrasing (do not copy melodies)',
}

export function buildInspirationAnalysisInstruction(controls: InspirationControls): string {
  const active = (Object.keys(controls) as (keyof InspirationControls)[])
    .filter(k => controls[k])
    .map(k => FOCUS_LABELS[k])

  if (!active.length) return ''

  return [
    'Analyze the selected reference songs and extract inspiration for NEW material only.',
    `Focus on: ${active.join('; ')}.`,
    'Extract: themes, emotional tone, imagery, pacing, structure, chorus characteristics.',
    'Do NOT copy lyrics, titles, melodies, or hooks from references.',
    'Use references only as stylistic inspiration.',
  ].join(' ')
}

export function summarizeReferenceSong(song: SongReference, controls: InspirationControls): string {
  const lines = [`Reference: "${song.title}"`]
  if (controls.themes || controls.vocabulary) {
    if (song.lyrics_instructions) lines.push(`Concept: ${song.lyrics_instructions.slice(0, 400)}`)
  }
  if (controls.storytelling || controls.atmosphere) {
    if (song.backstory) lines.push(`Story/atmosphere notes: ${song.backstory.slice(0, 300)}`)
  }
  if (controls.structure || controls.chorusStyle) {
    const excerpt = song.lyrics_text?.slice(0, 500)
    if (excerpt) lines.push(`Structure excerpt (do not copy): ${excerpt}`)
  }
  return lines.join('\n')
}

export function generateSongReferencesContext(
  songs: SongReference[],
  controls: InspirationControls
): { context: string; referenceDna: SongDNA | null } {
  if (!songs.length) return { context: '', referenceDna: null }

  const blocks = songs.map(s => summarizeReferenceSong(s, controls))
  const dnas = songs.map(s =>
    s.song_dna ? normalizeSongDNA(s.song_dna) : generateSongDNA({
      title: s.title,
      instructions: s.lyrics_instructions || undefined,
      lyrics: s.lyrics_text || undefined,
      backstory: s.backstory || undefined,
    })
  )

  const avg = dnas.length
    ? dnas.reduce(
        (acc, d) => {
          for (const k of Object.keys(acc) as (keyof SongDNA)[]) acc[k] += d[k]
          return acc
        },
        { energy: 0, darkness: 0, emotion: 0, storytelling: 0, singalong: 0, radioAppeal: 0, cinematicFeel: 0 }
      )
    : null

  const referenceDna = avg
    ? (Object.fromEntries(
        (Object.keys(avg) as (keyof SongDNA)[]).map(k => [k, Math.round(avg[k] / dnas.length)])
      ) as SongDNA)
    : null

  const instruction = buildInspirationAnalysisInstruction(controls)
  const context = [instruction, ...blocks].filter(Boolean).join('\n\n')

  return { context, referenceDna }
}

export function formatSongDnaContext(dna: SongDNA, label = 'Target Song DNA'): string {
  return [
    `${label} (0-10 scale — match feel, create new material):`,
    `Energy ${dna.energy}, Darkness ${dna.darkness}, Emotion ${dna.emotion}, Storytelling ${dna.storytelling}, Singalong ${dna.singalong}, Radio appeal ${dna.radioAppeal}, Cinematic feel ${dna.cinematicFeel}`,
  ].join('\n')
}

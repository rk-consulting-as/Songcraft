'use client'

import { useEffect, useMemo, useState } from 'react'
import { t, useLang, type Lang } from '@/lib/i18n'
import UpgradePrompt from '@/components/UpgradePrompt'

type DistributionData = {
  distributor?: string
  status?: 'setup' | 'submitted' | 'live'
  release_date?: string
  audio_status?: string
  explicit?: string
  language?: string
  isrc?: string
  upc?: string
  songwriter_credits?: string
  producer_credits?: string
  copyright_owner?: string
  publishing_owner?: string
  description?: string
  release_notes?: string
  ai_review?: string
}

export default function DistributionWorkflow({
  songId,
  title,
  artist,
  publishContent,
  lyrics,
  sunoPrompt,
  backstory,
  coverReady,
  audioReady,
  releaseDate,
  planId,
  aiLoading,
  callAI,
  updatePublishContent,
  copy,
}: {
  songId: string
  title: string
  artist: any
  publishContent: Record<string, any>
  lyrics: string
  sunoPrompt: string
  backstory: string
  coverReady: boolean
  audioReady: boolean
  releaseDate: string
  planId: 'free' | 'pro'
  aiLoading: boolean
  callAI: (messages: any[], system: string, targetKey: string) => Promise<string>
  updatePublishContent: (updates: Record<string, any>) => Promise<void>
  copy: (text: string) => void
}) {
  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => setLang(useLang()), [])
  const tx = t[lang]

  const distribution: DistributionData = {
    status: 'setup',
    distributor: 'DistroKid',
    explicit: 'unknown',
    audio_status: audioReady ? 'ready' : 'missing',
    release_date: releaseDate,
    language: 'English',
    ...((publishContent.distribution || {}) as DistributionData),
  }

  const updateDistribution = async (updates: Partial<DistributionData>) => {
    await updatePublishContent({
      distribution: {
        ...distribution,
        ...updates,
        updated_at: new Date().toISOString(),
      },
    })
  }

  const checks = [
    { key: 'artist', label: tx.distributionCheckArtist, points: 10, done: !!artist?.name },
    { key: 'title', label: tx.distributionCheckTitle, points: 10, done: !!title?.trim() },
    { key: 'date', label: tx.distributionCheckDate, points: 10, done: !!distribution.release_date },
    { key: 'cover', label: tx.distributionCheckCover, points: 10, done: coverReady },
    { key: 'audio', label: tx.distributionCheckAudio, points: 10, done: distribution.audio_status === 'ready' || audioReady },
    { key: 'explicit', label: tx.distributionCheckExplicit, points: 5, done: distribution.explicit === 'yes' || distribution.explicit === 'no' },
    { key: 'genre', label: tx.distributionCheckGenre, points: 8, done: !!artist?.genre },
    { key: 'language', label: tx.distributionCheckLanguage, points: 7, done: !!distribution.language },
    { key: 'credits', label: tx.distributionCheckCredits, points: 15, done: !!distribution.songwriter_credits || !!distribution.producer_credits },
    { key: 'copyright', label: tx.distributionCheckCopyright, points: 8, done: !!distribution.copyright_owner },
    { key: 'publishing', label: tx.distributionCheckPublishing, points: 7, done: !!distribution.publishing_owner },
  ]
  const readiness = Math.min(100, checks.reduce((sum, check) => sum + (check.done ? check.points : 0), 0))
  const missing = checks.filter(check => !check.done)

  const summary = useMemo(() => [
    'ViaTone distribution prep',
    '',
    `${tx.artistName}: ${artist?.name || '-'}`,
    `${tx.song}: ${title || '-'}`,
    `${tx.distributionReleaseDate}: ${distribution.release_date || '-'}`,
    `${tx.genre}: ${artist?.genre || '-'}`,
    `${tx.distributionLanguage}: ${distribution.language || '-'}`,
    `${tx.distributionDistributor}: ${distribution.distributor || '-'}`,
    `${tx.distributionStatus}: ${distribution.status || 'setup'}`,
    `${tx.distributionExplicit}: ${distribution.explicit || 'unknown'}`,
    `${tx.distributionAudioStatus}: ${distribution.audio_status || '-'}`,
    `${tx.distributionIsrc}: ${distribution.isrc || '-'}`,
    `${tx.distributionUpc}: ${distribution.upc || '-'}`,
    `${tx.distributionSongwriterCredits}: ${distribution.songwriter_credits || '-'}`,
    `${tx.distributionProducerCredits}: ${distribution.producer_credits || '-'}`,
    `${tx.distributionCopyrightOwner}: ${distribution.copyright_owner || '-'}`,
    `${tx.distributionPublishingOwner}: ${distribution.publishing_owner || '-'}`,
    '',
    `${tx.distributionDescription}:`,
    distribution.description || '-',
    '',
    `${tx.distributionReleaseNotes}:`,
    distribution.release_notes || '-',
    '',
    tx.distributionLegalNote,
  ].join('\n'), [artist?.genre, artist?.name, distribution, title, tx])

  const generateAi = async (kind: 'description' | 'notes' | 'review') => {
    if (planId !== 'pro') return
    const context = [
      `Song: ${title}`,
      `Artist: ${artist?.name || ''}`,
      `Genre: ${artist?.genre || ''}`,
      `Release date: ${distribution.release_date || ''}`,
      `Explicit: ${distribution.explicit || ''}`,
      `Language: ${distribution.language || ''}`,
      `Songwriter credits: ${distribution.songwriter_credits || ''}`,
      `Producer credits: ${distribution.producer_credits || ''}`,
      backstory ? `Backstory:\n${backstory}` : '',
      sunoPrompt ? `Suno prompt:\n${sunoPrompt}` : '',
      lyrics ? `Lyrics excerpt:\n${lyrics.slice(0, 1600)}` : '',
      `Missing metadata: ${missing.map(item => item.label).join(', ') || 'none'}`,
    ].filter(Boolean).join('\n\n')
    const systems = {
      description: `${tx.distributionAiSystemBase} ${tx.distributionAiDescriptionSystem}`,
      notes: `${tx.distributionAiSystemBase} ${tx.distributionAiNotesSystem}`,
      review: `${tx.distributionAiSystemBase} ${tx.distributionAiReviewSystem}`,
    }
    const result = await callAI([{ role: 'user', content: context }], systems[kind], `distribution_${kind}`)
    if (!result) return
    if (kind === 'description') await updateDistribution({ description: result })
    if (kind === 'notes') await updateDistribution({ release_notes: result })
    if (kind === 'review') await updateDistribution({ ai_review: result })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 18, margin: 0 }}>{tx.distributionTitle}</h2>
          <p style={{ color: '#8a7a60', fontSize: 13, margin: '6px 0 0', lineHeight: 1.5 }}>{tx.distributionDesc}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: readiness >= 80 ? '#7bc87b' : readiness >= 55 ? '#d4a843' : '#e07070', fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{readiness}</div>
          <div style={{ color: '#6a5a40', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{tx.distributionReadiness}</div>
        </div>
      </div>

      {planId === 'free' && <UpgradePrompt compact title={tx.distributionProTitle} description={tx.distributionProDesc} />}

      <div className="card" style={{ marginBottom: 18, borderColor: readiness >= 80 ? 'rgba(123,200,123,0.3)' : 'rgba(212,168,67,0.24)' }}>
        <div style={{ height: 8, borderRadius: 99, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', marginBottom: 14 }}>
          <div style={{ width: `${readiness}%`, height: '100%', background: readiness >= 80 ? '#7bc87b' : readiness >= 55 ? '#d4a843' : '#e07070' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
          {checks.map(check => (
            <div key={check.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, border: check.done ? '1px solid rgba(123,200,123,0.22)' : '1px solid rgba(224,112,112,0.18)', background: check.done ? 'rgba(123,200,123,0.06)' : 'rgba(224,112,112,0.04)', borderRadius: 6, padding: '8px 10px' }}>
              <span style={{ color: check.done ? '#c8e0c8' : '#c8b0a0', fontSize: 12 }}>{check.done ? '✓' : '○'} {check.label}</span>
              <span style={{ color: '#6a5a40', fontSize: 11 }}>{check.points}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 0.8fr)', gap: 16, marginBottom: 18 }}>
        <div className="card">
          <h3 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 14, margin: '0 0 12px' }}>{tx.distributionMetadata}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
            <Field label={tx.distributionReleaseDate}><input type="date" value={distribution.release_date || ''} onChange={e => updateDistribution({ release_date: e.target.value })} /></Field>
            <Field label={tx.distributionAudioStatus}>
              <select value={distribution.audio_status || 'missing'} onChange={e => updateDistribution({ audio_status: e.target.value })}>
                <option value="missing">{tx.distributionAudioMissing}</option>
                <option value="demo">{tx.distributionAudioDemo}</option>
                <option value="ready">{tx.distributionAudioReady}</option>
              </select>
            </Field>
            <Field label={tx.distributionExplicit}>
              <select value={distribution.explicit || 'unknown'} onChange={e => updateDistribution({ explicit: e.target.value })}>
                <option value="unknown">{tx.distributionUnknown}</option>
                <option value="no">{tx.no}</option>
                <option value="yes">{tx.yes}</option>
              </select>
            </Field>
            <Field label={tx.distributionLanguage}><input value={distribution.language || ''} onChange={e => updateDistribution({ language: e.target.value })} /></Field>
            <Field label={tx.distributionIsrc}><input value={distribution.isrc || ''} onChange={e => updateDistribution({ isrc: e.target.value })} placeholder="NOXXX..." /></Field>
            <Field label={tx.distributionUpc}><input value={distribution.upc || ''} onChange={e => updateDistribution({ upc: e.target.value })} /></Field>
            <Field label={tx.distributionSongwriterCredits}><textarea rows={3} value={distribution.songwriter_credits || ''} onChange={e => updateDistribution({ songwriter_credits: e.target.value })} /></Field>
            <Field label={tx.distributionProducerCredits}><textarea rows={3} value={distribution.producer_credits || ''} onChange={e => updateDistribution({ producer_credits: e.target.value })} /></Field>
            <Field label={tx.distributionCopyrightOwner}><input value={distribution.copyright_owner || ''} onChange={e => updateDistribution({ copyright_owner: e.target.value })} /></Field>
            <Field label={tx.distributionPublishingOwner}><input value={distribution.publishing_owner || ''} onChange={e => updateDistribution({ publishing_owner: e.target.value })} /></Field>
          </div>
          <p style={{ color: '#6a5a40', fontSize: 11, lineHeight: 1.5 }}>{tx.distributionLegalNote}</p>
        </div>

        <div className="card">
          <h3 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 14, margin: '0 0 12px' }}>{tx.distributionDistributorPanel}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {['DistroKid', 'TuneCore', 'CD Baby', 'Amuse', 'Other'].map(name => (
              <button key={name} type="button" onClick={() => updateDistribution({ distributor: name })} style={{ border: distribution.distributor === name ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.18)', color: distribution.distributor === name ? '#d4a843' : '#8a7a60', background: distribution.distributor === name ? 'rgba(212,168,67,0.1)' : 'transparent', borderRadius: 16, padding: '6px 12px', cursor: 'pointer' }}>{name}</button>
            ))}
          </div>
          <Field label={tx.distributionStatus}>
            <select value={distribution.status || 'setup'} onChange={e => updateDistribution({ status: e.target.value as DistributionData['status'] })}>
              <option value="setup">{tx.distributionStatusSetup}</option>
              <option value="submitted">{tx.distributionStatusSubmitted}</option>
              <option value="live">{tx.distributionStatusLive}</option>
            </select>
          </Field>
          <div style={{ marginTop: 14, color: '#8a7a60', fontSize: 12, lineHeight: 1.55 }}>
            {tx.distributionDistributorHint}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 18 }}>
        <div className="card">
          <HeaderWithButton title={tx.distributionDescription} button={tx.distributionAiDescription} onClick={() => generateAi('description')} disabled={planId !== 'pro' || aiLoading} />
          <textarea rows={8} value={distribution.description || ''} onChange={e => updateDistribution({ description: e.target.value })} placeholder={tx.distributionDescriptionPlaceholder} />
        </div>
        <div className="card">
          <HeaderWithButton title={tx.distributionReleaseNotes} button={tx.distributionAiReleaseNotes} onClick={() => generateAi('notes')} disabled={planId !== 'pro' || aiLoading} />
          <textarea rows={8} value={distribution.release_notes || ''} onChange={e => updateDistribution({ release_notes: e.target.value })} placeholder={tx.distributionNotesPlaceholder} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18, borderColor: 'rgba(112,144,208,0.24)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          <h3 style={{ color: '#7090d0', fontWeight: 'normal', fontSize: 14, margin: 0 }}>{tx.distributionAiConsistency}</h3>
          <button className="btn-gold" onClick={() => generateAi('review')} disabled={planId !== 'pro' || aiLoading} style={{ padding: '6px 12px', fontSize: 12 }}>{tx.distributionAiCheck}</button>
        </div>
        {distribution.ai_review ? (
          <pre style={{ whiteSpace: 'pre-wrap', color: '#c8c0b0', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.55, margin: 0 }}>{distribution.ai_review}</pre>
        ) : (
          <p style={{ color: '#6a5a40', fontSize: 13, margin: 0 }}>{tx.distributionAiEmpty}</p>
        )}
      </div>

      <div className="card" style={{ borderColor: 'rgba(123,200,123,0.22)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          <h3 style={{ color: '#7bc87b', fontWeight: 'normal', fontSize: 14, margin: 0 }}>{tx.distributionExportSummary}</h3>
          <button className="btn-outline" onClick={() => copy(summary)} disabled={planId !== 'pro'} style={{ padding: '6px 12px', fontSize: 12 }}>📋 {tx.copy}</button>
        </div>
        <textarea readOnly rows={12} value={summary} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }} />
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  )
}

function HeaderWithButton({ title, button, onClick, disabled }: { title: string; button: string; onClick: () => void; disabled: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 10 }}>
      <h3 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 14, margin: 0 }}>{title}</h3>
      <button className="btn-gold" onClick={onClick} disabled={disabled} style={{ padding: '5px 10px', fontSize: 11 }}>✨ {button}</button>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function Home() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
    })
  }, [])

  const accent = '#d4a843'

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>
      {/* ── Top nav ───────────────────────────────────────── */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 32px',
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(180,140,80,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>🎼</span>
          <span style={{ color: accent, fontSize: 18, letterSpacing: '2px', fontWeight: 600 }}>SONGCRAFT</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {loggedIn === true ? (
            <Link href="/dashboard" style={{
              padding: '9px 22px', background: accent, color: '#0a0a0f',
              borderRadius: 4, textDecoration: 'none', fontWeight: 600, fontSize: 13,
            }}>Åpne dashboard →</Link>
          ) : loggedIn === false ? (
            <>
              <Link href="/login" style={{
                padding: '9px 18px', color: '#8a7a60',
                border: '1px solid rgba(180,140,80,0.25)', borderRadius: 4,
                textDecoration: 'none', fontSize: 13,
              }}>Logg inn</Link>
              <Link href="/login" style={{
                padding: '9px 22px', background: accent, color: '#0a0a0f',
                borderRadius: 4, textDecoration: 'none', fontWeight: 600, fontSize: 13,
              }}>Kom i gang</Link>
            </>
          ) : <div style={{ width: 100 }} />}
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        padding: '100px 24px 120px',
        textAlign: 'center',
        background: `radial-gradient(circle at 50% 0%, ${accent}1a 0%, transparent 60%),
                     linear-gradient(180deg, #0a0a0f 0%, #12071e 100%)`,
        borderBottom: '1px solid rgba(212,168,67,0.15)',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: 980, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <span style={{
            display: 'inline-block', padding: '6px 14px', borderRadius: 20,
            background: 'rgba(212,168,67,0.1)', border: `1px solid ${accent}33`,
            color: accent, fontSize: 11, letterSpacing: 2, marginBottom: 28,
          }}>
            AI MUSIC STUDIO · FOR ARTISTS, PRODUCERS &amp; MANAGERS
          </span>
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(40px, 7vw, 80px)',
            fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05,
            color: '#fff',
          }}>
            Fra <span style={{ color: accent }}>idé</span> til <span style={{ color: '#1ed760' }}>utgitt låt</span>
            <br />på samme sted.
          </h1>
          <p style={{
            margin: '28px auto 0', maxWidth: 640,
            fontSize: 18, color: '#c8c0b0', lineHeight: 1.6,
          }}>
            Songcraft samler hele den kreative produksjonsflyten i ett verktøy.
            Skriv sangtekst med AI, lag Suno-prompter, generer cover-bilder og
            Spotify Canvas-videoer, og publiser til alle plattformer — fra én katalog.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap' }}>
            <Link href="/login" style={{
              padding: '14px 30px', background: accent, color: '#0a0a0f',
              borderRadius: 6, textDecoration: 'none', fontWeight: 700, fontSize: 15,
              letterSpacing: '0.5px',
            }}>{loggedIn ? 'Åpne dashboard →' : 'Kom i gang gratis →'}</Link>
            <a href="#features" style={{
              padding: '14px 24px', color: '#c8c0b0',
              border: '1px solid rgba(180,140,80,0.3)', borderRadius: 6,
              textDecoration: 'none', fontSize: 14,
            }}>Se hva du får</a>
          </div>
          <p style={{ margin: '24px 0 0', color: '#5a4a30', fontSize: 12 }}>
            Drevet av Anthropic Claude · OpenAI · Spotify · Suno · fal.ai
          </p>
        </div>
      </section>

      {/* ── Workflow strip ────────────────────────────────── */}
      <section style={{ padding: '60px 24px', borderBottom: '1px solid rgba(180,140,80,0.08)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 2, textAlign: 'center', margin: '0 0 32px' }}>
            DEN KREATIVE FLYTEN
          </p>
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: 0, alignItems: 'center',
          }}>
            {[
              { icon: '🎵', label: 'Lyrics' },
              { icon: '🤖', label: 'Suno-prompt' },
              { icon: '🖼️', label: 'Cover' },
              { icon: '🎬', label: 'Canvas video' },
              { icon: '📱', label: 'Captions' },
              { icon: '📢', label: 'Publish' },
            ].map((step, i, arr) => (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  textAlign: 'center', padding: '12px 18px',
                  minWidth: 100,
                }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{step.icon}</div>
                  <div style={{ color: accent, fontSize: 12, fontWeight: 500 }}>{step.label}</div>
                </div>
                {i < arr.length - 1 && (
                  <span style={{ color: '#3a3530', fontSize: 18, padding: '0 4px' }}>→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────── */}
      <section id="features" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center', margin: '0 0 14px',
            fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: '#fff',
            letterSpacing: '-0.01em',
          }}>
            Alt du trenger bak innloggingen
          </h2>
          <p style={{
            textAlign: 'center', color: '#a09080', maxWidth: 620, margin: '0 auto 48px',
            fontSize: 15, lineHeight: 1.6,
          }}>
            Songcraft er bygget for artister som vil ha hele produksjonen samlet — fra første ord til ferdig publisert spor.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {[
              {
                icon: '✍️',
                title: 'AI-drevet sangtekst',
                body: 'Beskriv tema og stemning — Claude eller GPT skriver tekstene. Versjonshistorikk, refine-mode, og ren tekst klar for publisering.',
              },
              {
                icon: '🤖',
                title: 'Suno-prompt + import',
                body: 'Auto-generer detaljerte Suno-prompter fra lyricsene dine. Lim inn ferdig Suno-link — vi henter audio, cover og tags automatisk.',
              },
              {
                icon: '🎨',
                title: 'Cover-bilde med AI',
                body: 'OpenAI gpt-image-1 lager profesjonelle cover-bilder fra prompts. Velg stil og stemning fra forhåndsdefinerte chips, eller skriv egen.',
              },
              {
                icon: '🎬',
                title: 'Spotify Canvas-video',
                body: 'Generer korte loop-videoer med Seedance via fal.ai — direkte fra cover-bildet eller fra tekst. Klar for Spotify for Artists.',
              },
              {
                icon: '📱',
                title: 'Captions for alle plattformer',
                body: 'TikTok, Instagram, Facebook, YouTube, X — AI tilpasser tone, lengde og hashtags til hver plattform. Egne regler kan lagres per bruker.',
              },
              {
                icon: '🎵',
                title: 'Spotify-katalog import',
                body: 'Søk artister, importer top-tracks eller enkeltsanger via URL. Streaming-data, cover og release-datoer kommer med automatisk.',
              },
              {
                icon: '🌐',
                title: 'Offentlig artist-side',
                body: 'Publiser hver artist på en /p/-URL med hero, bio, social-knapper, Spotify-embed, YouTube-videoer og tracks. Konfigurerbart per artist.',
              },
              {
                icon: '🏢',
                title: 'Studio / manager-side',
                body: 'For manager/produsent: én /studio/-side som viser hele rosteren med spilleliste per artist, prosjekter, tjenester og kontaktskjema.',
              },
              {
                icon: '📢',
                title: 'Publiser overalt',
                body: 'Auto-generer WordPress-blogginnlegg, Facebook-poster, Instagram-tekst og pressemelding. Norsk eller engelsk — med eller uten sangtekst.',
              },
            ].map(f => (
              <div key={f.title} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(180,140,80,0.15)',
                borderRadius: 10, padding: 22,
                transition: 'border-color 0.2s, transform 0.2s',
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ margin: '0 0 8px', color: accent, fontSize: 16, fontWeight: 600 }}>
                  {f.title}
                </h3>
                <p style={{ margin: 0, color: '#a09080', fontSize: 13, lineHeight: 1.6 }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Two-column showcase ───────────────────────────── */}
      <section style={{ padding: '60px 24px 100px', borderTop: '1px solid rgba(180,140,80,0.08)', background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, alignItems: 'center' }}>
          <div>
            <p style={{ color: accent, fontSize: 11, letterSpacing: 2, margin: '0 0 12px' }}>FOR PRODUSENTER &amp; MANAGER</p>
            <h2 style={{ margin: '0 0 18px', fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              Hele rosteren din på ett sted —<br />med publiserbar hjemmeside.
            </h2>
            <p style={{ color: '#c8c0b0', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
              Bygg artist-katalog, knytt sanger til album, hent inn Spotify-data, og publiser
              en offentlig studio-side med bio, prosjekter, kontaktskjema og spilleliste per artist.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#a09080', fontSize: 14, lineHeight: 1.9 }}>
              <li>✓ Mini-spilleliste per artist på studio-siden</li>
              <li>✓ Innebygd kontakt-innboks (valgfri e-post-videresending)</li>
              <li>✓ Custom favicon, accent color, markdown bio</li>
              <li>✓ Klar for custom domain når du vil</li>
            </ul>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${accent}33`,
            borderRadius: 14,
            padding: 28,
            boxShadow: `0 20px 60px ${accent}11`,
          }}>
            <div style={{ color: '#5a4a30', fontSize: 11, letterSpacing: 1, marginBottom: 16 }}>STUDIO PAGE · EKSEMPEL</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 8 }}>
              Aigent4u
            </div>
            <div style={{ color: '#a09080', fontSize: 14, marginBottom: 20 }}>
              Music producer · independent management
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
              <span style={{ padding: '4px 10px', background: '#1ed760', color: '#000', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>♪ Spotify</span>
              <span style={{ padding: '4px 10px', background: '#ff0000', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>▶ YouTube</span>
              <span style={{ padding: '4px 10px', background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>◎ Instagram</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(180,140,80,0.15)', paddingTop: 16 }}>
              <p style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, margin: '0 0 10px' }}>ROSTER</p>
              {['Hellwater Saints · Country', 'Nordfire · Glam Rock', 'Lydia Croise · Acoustic'].map(a => (
                <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', color: '#c8c0b0', fontSize: 13 }}>
                  <span style={{ width: 30, height: 30, borderRadius: '50%', background: `${accent}22`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎤</span>
                  {a}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section style={{
        padding: '80px 24px',
        textAlign: 'center',
        background: `radial-gradient(circle at 50% 100%, ${accent}1a 0%, transparent 60%)`,
        borderTop: '1px solid rgba(180,140,80,0.1)',
      }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
          Klar til å lage neste låt?
        </h2>
        <p style={{ color: '#a09080', fontSize: 15, maxWidth: 540, margin: '0 auto 32px', lineHeight: 1.6 }}>
          Gratis å starte. Bring din egen AI-nøkkel (Anthropic + valgfritt OpenAI) — vi tar hånd om resten.
        </p>
        <Link href="/login" style={{
          display: 'inline-block',
          padding: '16px 36px', background: accent, color: '#0a0a0f',
          borderRadius: 6, textDecoration: 'none', fontWeight: 700, fontSize: 15,
          letterSpacing: '0.5px',
        }}>
          {loggedIn ? 'Åpne dashboard →' : 'Kom i gang →'}
        </Link>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer style={{
        padding: '32px 24px',
        textAlign: 'center',
        color: '#5a4a30', fontSize: 12,
        borderTop: '1px solid rgba(180,140,80,0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 12, flexWrap: 'wrap' }}>
          <a href="https://docs.claude.com" target="_blank" rel="noopener noreferrer" style={{ color: '#5a4a30', textDecoration: 'none' }}>Anthropic</a>
          <a href="https://openai.com" target="_blank" rel="noopener noreferrer" style={{ color: '#5a4a30', textDecoration: 'none' }}>OpenAI</a>
          <a href="https://developer.spotify.com" target="_blank" rel="noopener noreferrer" style={{ color: '#5a4a30', textDecoration: 'none' }}>Spotify</a>
          <a href="https://suno.com" target="_blank" rel="noopener noreferrer" style={{ color: '#5a4a30', textDecoration: 'none' }}>Suno</a>
          <a href="https://fal.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#5a4a30', textDecoration: 'none' }}>fal.ai</a>
        </div>
        <p style={{ margin: 0 }}>
          🎼 Songcraft — AI Music Studio
        </p>
      </footer>
    </div>
  )
}

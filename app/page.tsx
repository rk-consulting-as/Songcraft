'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Lang = 'en' | 'no'

const i18n = {
  en: {
    navLogin: 'Log in',
    navGetStarted: 'Get started',
    navOpenDashboard: 'Open dashboard →',
    heroBadge: 'ONLINE ARTIST PLATFORM · FOR ARTISTS, PRODUCERS & MANAGERS',
    heroTitleA: 'From ',
    heroTitleHighlight1: 'idea',
    heroTitleB: ' to ',
    heroTitleHighlight2: 'released track',
    heroTitleC: 'in one place.',
    heroSubtitle: 'Create, release, promote and grow your music. ViaTone brings lyrics, prompts, cover art, campaigns, fan pages and analytics into one artist operating system.',
    heroCtaPrimary: 'Get started free →',
    heroCtaPrimaryLoggedIn: 'Open dashboard →',
    heroCtaSecondary: 'See what you get',
    heroPoweredBy: 'Powered by Anthropic Claude · OpenAI · Spotify · Suno · fal.ai',
    flowHeader: 'THE CREATIVE FLOW',
    flow: ['Lyrics', 'Suno prompt', 'Cover', 'Canvas video', 'Captions', 'Publish'],
    featuresTitle: 'Everything you need behind the login',
    featuresSubtitle: 'ViaTone is built for artists who want creation, release planning, promotion and growth in one place — from the first word to the released track.',
    features: [
      { icon: '✍️', title: 'AI-powered lyrics', body: 'Describe theme and mood — Claude or GPT writes the lyrics. Version history, refine mode, and clean text ready for publishing.' },
      { icon: '🤖', title: 'Suno prompt + import', body: 'Auto-generate detailed Suno prompts from your lyrics. Paste a finished Suno link — we fetch audio, cover and tags automatically.' },
      { icon: '🎨', title: 'AI cover image', body: 'OpenAI gpt-image-1 creates professional cover art from prompts. Choose style and mood from preset chips, or write your own.' },
      { icon: '🎬', title: 'Spotify Canvas video', body: 'Generate short looping videos with Seedance via fal.ai — directly from the cover image or from text. Ready for Spotify for Artists.' },
      { icon: '📱', title: 'Captions for every platform', body: 'TikTok, Instagram, Facebook, YouTube, X — AI tailors tone, length and hashtags per platform. Save custom rules per account.' },
      { icon: '🎵', title: 'Spotify catalogue import', body: 'Search artists, import top tracks or single songs via URL. Streaming data, cover art and release dates come along automatically.' },
      { icon: '🌐', title: 'Public artist page', body: 'Publish each artist on a /p/ URL with hero, bio, social buttons, Spotify embed, YouTube videos and tracks. Configurable per artist.' },
      { icon: '🏢', title: 'Studio / manager page', body: 'For managers / producers: one /studio/ page showing the whole roster with a mini playlist per artist, projects, services and contact form.' },
      { icon: '📢', title: 'Publish everywhere', body: 'Auto-generate WordPress blog posts, Facebook posts, Instagram captions and press releases. English or Norwegian — with or without lyrics.' },
    ],
    communityBadge: 'BUILT-IN COMMUNITY',
    communityTitle: 'Connect with creators —',
    communityTitle2: 'not just upload to streaming.',
    communitySubtitle: 'ViaTone is also a creator community. Find collaborators, get feedback on your songs, climb the charts, and reach paying fans.',
    communityFeatures: [
      { icon: '🌍', title: 'Discover Nordic creators',     body: 'Search by role (vocalist, producer, songwriter), language, location. See who is open for collaboration.' },
      { icon: '💬', title: 'Chat, groups & support',      body: 'Real-time direct messages, group rooms for bands/labels, and structured support tickets. Slide-in dock works on any page.' },
      { icon: '📈', title: 'Charts + reactions',          body: 'Weekly and all-time top songs. Listeners react with emojis and leave comments — discover what works.' },
      { icon: '🤝', title: 'Referrals + creator points',  body: 'Invite friends — earn points up to 5 levels deep. Listen to others to earn more. Climb badge tiers (Bronze → Platinum).' },
      { icon: '🚀', title: 'Publish via DistroKid',        body: 'Validated metadata, downloadable bundle, one click to publish to Spotify, Apple Music, YouTube Music + 100+ platforms.' },
      { icon: '🎁', title: 'Activity feed',                body: 'See what creators you follow are publishing. Get notified when someone messages, follows, or hits a tier.' },
    ],
    studioBadge: 'FOR PRODUCERS & MANAGERS',
    studioTitle: 'Your whole roster in one place —',
    studioTitle2: 'with a publishable homepage.',
    studioBody: 'Build an artist catalogue, link songs to albums, import Spotify data, and publish a public studio page with bio, projects, contact form and a playlist per artist.',
    studioBullets: [
      'Mini playlist per artist on the studio page',
      'Built-in contact inbox (optional email forwarding)',
      'Custom favicon, accent color, markdown bio',
      'Ready for custom domain when you want',
    ],
    studioExample: 'STUDIO PAGE · EXAMPLE',
    studioRoster: 'ROSTER',
    studioTagline: 'Music producer · independent management',
    ctaTitle: 'Ready to make the next track?',
    ctaBody: 'Free to start. Bring your own AI key (Anthropic + optional OpenAI) — we handle the rest.',
    ctaButton: 'Get started →',
    ctaButtonLoggedIn: 'Open dashboard →',
    footerTag: 'Online Artist Platform',
  },
  no: {
    navLogin: 'Logg inn',
    navGetStarted: 'Kom i gang',
    navOpenDashboard: 'Åpne dashboard →',
    heroBadge: 'ONLINE ARTIST PLATFORM · FOR ARTISTER, PRODUSENTER & MANAGERE',
    heroTitleA: 'Fra ',
    heroTitleHighlight1: 'idé',
    heroTitleB: ' til ',
    heroTitleHighlight2: 'utgitt låt',
    heroTitleC: 'på samme sted.',
    heroSubtitle: 'Skap, release, promoter og voks med musikken din. ViaTone samler tekst, prompter, cover, kampanjer, fan-sider og analytics i ett artist-operativsystem.',
    heroCtaPrimary: 'Kom i gang gratis →',
    heroCtaPrimaryLoggedIn: 'Åpne dashboard →',
    heroCtaSecondary: 'Se hva du får',
    heroPoweredBy: 'Drevet av Anthropic Claude · OpenAI · Spotify · Suno · fal.ai',
    flowHeader: 'DEN KREATIVE FLYTEN',
    flow: ['Sangtekst', 'Suno-prompt', 'Cover', 'Canvas-video', 'Captions', 'Publiser'],
    featuresTitle: 'Alt du trenger bak innloggingen',
    featuresSubtitle: 'ViaTone er bygget for artister som vil ha produksjon, release, promoter og vekst samlet — fra første ord til ferdig publisert spor.',
    features: [
      { icon: '✍️', title: 'AI-drevet sangtekst', body: 'Beskriv tema og stemning — Claude eller GPT skriver tekstene. Versjonshistorikk, refine-mode, og ren tekst klar for publisering.' },
      { icon: '🤖', title: 'Suno-prompt + import', body: 'Auto-generer detaljerte Suno-prompter fra lyricsene dine. Lim inn ferdig Suno-link — vi henter audio, cover og tags automatisk.' },
      { icon: '🎨', title: 'Cover-bilde med AI', body: 'OpenAI gpt-image-1 lager profesjonelle cover-bilder fra prompts. Velg stil og stemning fra forhåndsdefinerte chips, eller skriv egen.' },
      { icon: '🎬', title: 'Spotify Canvas-video', body: 'Generer korte loop-videoer med Seedance via fal.ai — direkte fra cover-bildet eller fra tekst. Klar for Spotify for Artists.' },
      { icon: '📱', title: 'Captions for alle plattformer', body: 'TikTok, Instagram, Facebook, YouTube, X — AI tilpasser tone, lengde og hashtags til hver plattform. Egne regler kan lagres per bruker.' },
      { icon: '🎵', title: 'Spotify-katalog import', body: 'Søk artister, importer top-tracks eller enkeltsanger via URL. Streaming-data, cover og release-datoer kommer med automatisk.' },
      { icon: '🌐', title: 'Offentlig artist-side', body: 'Publiser hver artist på en /p/-URL med hero, bio, social-knapper, Spotify-embed, YouTube-videoer og tracks. Konfigurerbart per artist.' },
      { icon: '🏢', title: 'Studio / manager-side', body: 'For manager/produsent: én /studio/-side som viser hele rosteren med spilleliste per artist, prosjekter, tjenester og kontaktskjema.' },
      { icon: '📢', title: 'Publiser overalt', body: 'Auto-generer WordPress-blogginnlegg, Facebook-poster, Instagram-tekst og pressemelding. Norsk eller engelsk — med eller uten sangtekst.' },
    ],
    communityBadge: 'INNEBYGD KREATØR-MILJØ',
    communityTitle: 'Knytt kontakt med skapere —',
    communityTitle2: 'ikke bare strøm til Spotify.',
    communitySubtitle: 'ViaTone er også et kreatør-community. Finn samarbeidspartnere, få tilbakemelding på sangene dine, kom på topplistene, og bygg et betalende publikum.',
    communityFeatures: [
      { icon: '🌍', title: 'Finn nordiske skapere',      body: 'Søk etter rolle (vokalist, produsent, låtskriver), språk, sted. Se hvem som er åpen for samarbeid.' },
      { icon: '💬', title: 'Chat, grupper & support',   body: 'Direkte meldinger i sanntid, gruppe-rom for band/labels, og strukturerte support-henvendelser. Skyv-inn-panel virker på enhver side.' },
      { icon: '📈', title: 'Topplister + reaksjoner',   body: 'Ukens og tidenes mest spilte sanger. Lyttere reagerer med emoji og legger kommentarer — oppdag hva som funker.' },
      { icon: '🤝', title: 'Verving + skaper-poeng',    body: 'Inviter venner — tjen poeng opptil 5 ledd dypt. Lytt til andre for å tjene mer. Klatre i badge-nivåer (Bronse → Platina).' },
      { icon: '🚀', title: 'Publiser via DistroKid',    body: 'Validert metadata, nedlastbar bundle, ett klikk for å publisere til Spotify, Apple Music, YouTube Music + 100+ plattformer.' },
      { icon: '🎁', title: 'Aktivitetsfeed',            body: 'Se hva skaperne du følger publiserer. Få varsler når noen sender melding, følger, eller når et nytt nivå.' },
    ],
    studioBadge: 'FOR PRODUSENTER & MANAGERE',
    studioTitle: 'Hele rosteren din på ett sted —',
    studioTitle2: 'med publiserbar hjemmeside.',
    studioBody: 'Bygg artist-katalog, knytt sanger til album, hent inn Spotify-data, og publiser en offentlig studio-side med bio, prosjekter, kontaktskjema og spilleliste per artist.',
    studioBullets: [
      'Mini-spilleliste per artist på studio-siden',
      'Innebygd kontakt-innboks (valgfri e-post-videresending)',
      'Custom favicon, accent color, markdown bio',
      'Klar for custom domain når du vil',
    ],
    studioExample: 'STUDIO-SIDE · EKSEMPEL',
    studioRoster: 'ROSTER',
    studioTagline: 'Music producer · independent management',
    ctaTitle: 'Klar til å lage neste låt?',
    ctaBody: 'Gratis å starte. Bring din egen AI-nøkkel (Anthropic + valgfritt OpenAI) — vi tar hånd om resten.',
    ctaButton: 'Kom i gang →',
    ctaButtonLoggedIn: 'Åpne dashboard →',
    footerTag: 'Online Artist Platform',
  },
} as const

export default function Home() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [pageLang, setPageLang] = useState<Lang>('en')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
    })
    // Default landing-page language is English, but respect a prior choice.
    const stored = typeof window !== 'undefined' ? localStorage.getItem('songcraft_lang') : null
    if (stored === 'no' || stored === 'en') setPageLang(stored as Lang)
  }, [])

  const setLang = (l: Lang) => {
    setPageLang(l)
    if (typeof window !== 'undefined') localStorage.setItem('songcraft_lang', l)
  }

  const t = i18n[pageLang]
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
        flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/brand/viatone-logo.png" alt="ViaTone — Online Artist Platform" style={{ height: 36, width: 'auto', display: 'block' }} />
          <span style={{ color: accent, fontSize: 18, letterSpacing: '2px', fontWeight: 600 }}>VIATONE</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Language toggle */}
          <div role="radiogroup" aria-label="Language" style={{
            display: 'inline-flex',
            border: '1px solid rgba(180,140,80,0.25)',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            {(['en', 'no'] as const).map(l => {
              const active = pageLang === l
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  aria-checked={active}
                  role="radio"
                  style={{
                    padding: '7px 12px',
                    background: active ? 'rgba(212,168,67,0.15)' : 'transparent',
                    border: 'none',
                    borderLeft: l === 'no' ? '1px solid rgba(180,140,80,0.2)' : 'none',
                    color: active ? accent : '#8a7a60',
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    letterSpacing: '0.5px',
                    fontFamily: 'inherit',
                  }}
                >
                  {l === 'en' ? 'EN' : 'NO'}
                </button>
              )
            })}
          </div>

          {loggedIn === true ? (
            <Link href="/dashboard" style={{
              padding: '9px 22px', background: accent, color: '#0a0a0f',
              borderRadius: 4, textDecoration: 'none', fontWeight: 600, fontSize: 13,
            }}>{t.navOpenDashboard}</Link>
          ) : loggedIn === false ? (
            <>
              <Link href="/login" style={{
                padding: '9px 18px', color: '#8a7a60',
                border: '1px solid rgba(180,140,80,0.25)', borderRadius: 4,
                textDecoration: 'none', fontSize: 13,
              }}>{t.navLogin}</Link>
              <Link href="/login" style={{
                padding: '9px 22px', background: accent, color: '#0a0a0f',
                borderRadius: 4, textDecoration: 'none', fontWeight: 600, fontSize: 13,
              }}>{t.navGetStarted}</Link>
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
            {t.heroBadge}
          </span>
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(40px, 7vw, 80px)',
            fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05,
            color: '#fff',
          }}>
            {t.heroTitleA}<span style={{ color: accent }}>{t.heroTitleHighlight1}</span>{t.heroTitleB}<span style={{ color: '#1ed760' }}>{t.heroTitleHighlight2}</span>,
            <br />{t.heroTitleC}
          </h1>
          <p style={{
            margin: '28px auto 0', maxWidth: 640,
            fontSize: 18, color: '#c8c0b0', lineHeight: 1.6,
          }}>
            {t.heroSubtitle}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap' }}>
            <Link href="/login" style={{
              padding: '14px 30px', background: accent, color: '#0a0a0f',
              borderRadius: 6, textDecoration: 'none', fontWeight: 700, fontSize: 15,
              letterSpacing: '0.5px',
            }}>{loggedIn ? t.heroCtaPrimaryLoggedIn : t.heroCtaPrimary}</Link>
            <a href="#features" style={{
              padding: '14px 24px', color: '#c8c0b0',
              border: '1px solid rgba(180,140,80,0.3)', borderRadius: 6,
              textDecoration: 'none', fontSize: 14,
            }}>{t.heroCtaSecondary}</a>
          </div>
          <p style={{ margin: '24px 0 0', color: '#5a4a30', fontSize: 12 }}>
            {t.heroPoweredBy}
          </p>
        </div>
      </section>

      {/* ── Workflow strip ────────────────────────────────── */}
      <section style={{ padding: '60px 24px', borderBottom: '1px solid rgba(180,140,80,0.08)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 2, textAlign: 'center', margin: '0 0 32px' }}>
            {t.flowHeader}
          </p>
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: 0, alignItems: 'center',
          }}>
            {[
              { icon: '🎵', label: t.flow[0] },
              { icon: '🤖', label: t.flow[1] },
              { icon: '🖼️', label: t.flow[2] },
              { icon: '🎬', label: t.flow[3] },
              { icon: '📱', label: t.flow[4] },
              { icon: '📢', label: t.flow[5] },
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
            {t.featuresTitle}
          </h2>
          <p style={{
            textAlign: 'center', color: '#a09080', maxWidth: 620, margin: '0 auto 48px',
            fontSize: 15, lineHeight: 1.6,
          }}>
            {t.featuresSubtitle}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {t.features.map(f => (
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

      {/* ── Community / growth section ──────────────────── */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid rgba(180,140,80,0.08)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <p style={{ color: accent, fontSize: 11, letterSpacing: 2, margin: '0 0 12px' }}>{t.communityBadge}</p>
            <h2 style={{ margin: '0 0 14px', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              {t.communityTitle}<br />{t.communityTitle2}
            </h2>
            <p style={{ color: '#a09080', fontSize: 16, maxWidth: 640, margin: '0 auto', lineHeight: 1.55 }}>
              {t.communitySubtitle}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {t.communityFeatures.map((f, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(180,140,80,0.18)',
                borderRadius: 10,
                padding: 22,
                transition: 'border-color 0.2s, transform 0.2s',
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ color: '#e8e0d0', fontSize: 16, margin: '0 0 6px', fontWeight: 600 }}>{f.title}</h3>
                <p style={{ color: '#8a7a60', fontSize: 13, lineHeight: 1.55, margin: 0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Two-column showcase ───────────────────────────── */}
      <section style={{ padding: '60px 24px 100px', borderTop: '1px solid rgba(180,140,80,0.08)', background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, alignItems: 'center' }}>
          <div>
            <p style={{ color: accent, fontSize: 11, letterSpacing: 2, margin: '0 0 12px' }}>{t.studioBadge}</p>
            <h2 style={{ margin: '0 0 18px', fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              {t.studioTitle}<br />{t.studioTitle2}
            </h2>
            <p style={{ color: '#c8c0b0', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
              {t.studioBody}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#a09080', fontSize: 14, lineHeight: 1.9 }}>
              {t.studioBullets.map(b => <li key={b}>✓ {b}</li>)}
            </ul>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${accent}33`,
            borderRadius: 14,
            padding: 28,
            boxShadow: `0 20px 60px ${accent}11`,
          }}>
            <div style={{ color: '#5a4a30', fontSize: 11, letterSpacing: 1, marginBottom: 16 }}>{t.studioExample}</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 8 }}>
              Aigent4u
            </div>
            <div style={{ color: '#a09080', fontSize: 14, marginBottom: 20 }}>
              {t.studioTagline}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
              <span style={{ padding: '4px 10px', background: '#1ed760', color: '#000', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>♪ Spotify</span>
              <span style={{ padding: '4px 10px', background: '#ff0000', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>▶ YouTube</span>
              <span style={{ padding: '4px 10px', background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>◎ Instagram</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(180,140,80,0.15)', paddingTop: 16 }}>
              <p style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, margin: '0 0 10px' }}>{t.studioRoster}</p>
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
          {t.ctaTitle}
        </h2>
        <p style={{ color: '#a09080', fontSize: 15, maxWidth: 540, margin: '0 auto 32px', lineHeight: 1.6 }}>
          {t.ctaBody}
        </p>
        <Link href="/login" style={{
          display: 'inline-block',
          padding: '16px 36px', background: accent, color: '#0a0a0f',
          borderRadius: 6, textDecoration: 'none', fontWeight: 700, fontSize: 15,
          letterSpacing: '0.5px',
        }}>
          {loggedIn ? t.ctaButtonLoggedIn : t.ctaButton}
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
          🎼 ViaTone — {t.footerTag}
        </p>
      </footer>
    </div>
  )
}

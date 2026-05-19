// ViaTone design tokens — same values as design/songcraft-design.css.
// Use this when you want the colors as JS/TS constants for React inline styles
// or for Tailwind config in another project.
//
//   import { tokens } from '@/lib/tokens'
//   <div style={{ background: tokens.bg.gradient, color: tokens.text.bright }} />

export const tokens = {
  /** Brand colors */
  brand: {
    gold: '#d4a843',
    goldBright: '#e8c050',
    goldDim: 'rgba(212, 168, 67, 0.3)',
    goldTint: 'rgba(212, 168, 67, 0.08)',
    purple: '#c07bd0',
    purpleDim: 'rgba(160, 100, 200, 0.3)',
    purpleTint: 'rgba(160, 100, 200, 0.08)',
  },

  /** Page / surface backgrounds */
  bg: {
    base: '#0a0a0f',
    panel: '#14101a',
    panelLight: '#1a1520',
    gradient: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)',
    surface: 'rgba(255, 255, 255, 0.03)',
    surface2: 'rgba(255, 255, 255, 0.04)',
    border: 'rgba(180, 140, 80, 0.2)',
    borderStrong: 'rgba(180, 140, 80, 0.4)',
  },

  /** Text — warm beige/brown scale, top to bottom = brightest to dimmest */
  text: {
    bright: '#e8e0d0',   // titles, primary content
    body: '#c8c0b0',     // body text
    mid: '#a09080',      // secondary
    muted: '#8a7a60',    // labels
    dim: '#6a5a40',      // minor labels
    faint: '#5a4a30',    // hints
    disabled: '#3a3530', // disabled / placeholder dark
  },

  /** Song/track workflow status colors */
  status: {
    draft: '#8a7a60',
    inProgress: '#d4a843',
    complete: '#7bc87b',
    released: '#1ed760',
  },

  /** External brand colors (Spotify, YouTube, Instagram, etc.) */
  external: {
    spotify: '#1ed760',
    youtube: '#ff0000',
    tiktok: '#000000',
    facebook: '#1877f2',
    linkedin: '#0a66c2',
    appleMusic: '#fa233b',
    soundcloud: '#ff5500',
    instagramGradient: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
  },

  /** Functional / signaling */
  signal: {
    error: '#c05050',
    errorTint: 'rgba(200, 80, 80, 0.08)',
    warning: '#e0a050',
    info: '#7090d0',
    infoBlue: '#8090b0',
  },

  /** Typography */
  font: {
    stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  },

  /** Border radii */
  radius: {
    sm: 4,
    md: 6,
    lg: 8,
    pill: 14,
    circle: '50%',
  },

  /** Common shadow used on modals */
  shadow: {
    modal: '0 20px 60px rgba(0, 0, 0, 0.6)',
  },
} as const

export type Tokens = typeof tokens

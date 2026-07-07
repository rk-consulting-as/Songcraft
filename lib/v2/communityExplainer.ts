import { V2_ROUTES } from '@/lib/v2/routes'

/**
 * Shared, English-only explainer content for ViaTone Community.
 * Reused across /community, /community/host, onboarding, empty states and CTA cards.
 * Tone: warm, clear, community-driven. Avoid "verified streams" / growth-hack language.
 */

export type ExplainerCard = {
  id: string
  headline: string
  description: string
  examples?: string[]
  href: string
  cta: string
}

export type HowItWorksSection = {
  id: string
  title: string
  points: string[]
}

export type FirstStepTrack = {
  id: 'artist' | 'supporter' | 'host'
  headline: string
  intro: string
  steps: string[]
  primaryCta: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
}

export type GlossaryTerm = {
  term: string
  definition: string
}

export const communityWelcomeContent = {
  title: 'Welcome to the ViaTone Community',
  intro:
    'ViaTone Community is where artists and supporters help each other grow through listening sessions, song feedback, playlist rooms, and release support.',
  quickSummary: [
    'Join circles',
    'Submit songs',
    'Join sessions',
    'Give feedback',
    'Build your supporter score',
    'Become a host if you want to run your own community',
  ],
}

export const communityExplainerCards: ExplainerCard[] = [
  {
    id: 'circles',
    headline: 'Join a Circle',
    description:
      'Circles are communities built around a genre, mood, or purpose. Join circles to meet artists like you, discover sessions, and submit songs for support or feedback.',
    examples: ['Dark Country', 'AI Metal', 'Song Feedback', 'New Release Boost'],
    href: V2_ROUTES.circles,
    cta: 'Explore circles',
  },
  {
    id: 'sessions',
    headline: 'Join a Session',
    description:
      'Sessions are hosted listening events. Submit a song, listen to others, leave feedback, and build momentum around releases together.',
    href: V2_ROUTES.sessions,
    cta: 'Browse sessions',
  },
  {
    id: 'playlist-rooms',
    headline: 'Use Playlist Rooms',
    description:
      'Playlist rooms help communities organize listening rounds, shared support, and song discovery around playlists or campaign-style promotion.',
    href: V2_ROUTES.playlists,
    cta: 'Open playlist rooms',
  },
]

export const communityHowItWorksSections: HowItWorksSection[] = [
  {
    id: 'join-circle',
    title: 'Join a Circle',
    points: [
      'Find a circle that matches your genre, goals, or vibe.',
      'Join to discover sessions, songs, and other members.',
    ],
  },
  {
    id: 'join-session',
    title: 'Join a Session',
    points: [
      'Sessions are listening events where members submit songs, support each other, and leave feedback.',
      'Some sessions focus on feedback, others on release support.',
    ],
  },
  {
    id: 'playlist-rooms',
    title: 'Use Playlist Rooms',
    points: [
      'Playlist rooms help communities organize listening rounds and support activity around shared playlists.',
    ],
  },
  {
    id: 'feedback-support',
    title: 'Give feedback and support',
    points: [
      'Support others by listening, leaving feedback, and showing up consistently.',
    ],
  },
  {
    id: 'supporter-score',
    title: 'Build your supporter score',
    points: [
      'Your supporter score reflects participation like sessions joined, feedback given, songs supported, and room activity.',
      'It is community participation, not "verified streams".',
    ],
  },
  {
    id: 'become-host',
    title: 'Become a Host',
    points: [
      'Hosts create circles, run sessions, manage playlist rooms, and build community around music they care about.',
    ],
  },
]

export const communityFirstSteps: FirstStepTrack[] = [
  {
    id: 'artist',
    headline: 'I want feedback and support for my music',
    intro: 'Turn a release into a community moment and get real listener notes.',
    steps: [
      'Add your artist and at least one song in Studio',
      'Join a circle that matches your genre',
      'Submit one song to a feedback circle or session',
      'Leave feedback on 2–3 other songs',
      'Join your first listening session',
    ],
    primaryCta: { label: 'Find a circle', href: V2_ROUTES.circles },
    secondaryCta: { label: 'Open Studio', href: V2_ROUTES.legacyStudio },
  },
  {
    id: 'supporter',
    headline: 'I want to support other artists and discover music',
    intro: 'Show up, listen, and become someone artists remember.',
    steps: [
      'Join a circle you like',
      'Listen in a session',
      'Leave feedback on a song',
      'Build your supporter score by showing up regularly',
    ],
    primaryCta: { label: 'Browse sessions', href: V2_ROUTES.sessions },
    secondaryCta: { label: 'Explore circles', href: V2_ROUTES.circles },
  },
  {
    id: 'host',
    headline: 'I want to run sessions and build a community',
    intro: 'Bring artists together around the music you care about.',
    steps: [
      'Open the Host Dashboard',
      'Create a circle, session, or playlist room',
      'Invite artists to submit songs',
      'Run a listening round and recap it afterwards',
    ],
    primaryCta: { label: 'Open Host Dashboard', href: V2_ROUTES.host },
    secondaryCta: { label: 'See Host Pro', href: V2_ROUTES.pricing },
  },
]

export const communityBenefits = {
  title: 'Why use ViaTone Community?',
  points: [
    'Get real feedback from artists and listeners',
    'Build momentum around your releases',
    'Find your first supporters, not just passive followers',
    'Turn releases into community events instead of one-off posts',
    'Discover new artists through circles and sessions',
    'Grow as both an artist and a supporter',
  ],
}

export const communityHostIntro = {
  title: 'Host your own music community',
  intro:
    'Hosts bring artists together, run listening events, and build a loyal supporter base around music and discovery.',
  can: [
    'Create circles',
    'Run sessions',
    'Manage playlist rooms',
    'Approve song submissions',
    'Lead listening rounds',
    'Build a loyal supporter base around music and discovery',
  ],
  checklist: [
    'Create your first circle',
    'Schedule a session',
    'Add a playlist room',
    'Invite artists to submit songs',
    'Run a listening round',
    'Review participation and recap results',
  ],
}

export const communityGlossary: GlossaryTerm[] = [
  {
    term: 'Circle',
    definition: 'A community built around a genre, mood, or purpose. Join to meet artists and find sessions.',
  },
  {
    term: 'Session',
    definition: 'A hosted listening event where members submit songs, listen together, and leave feedback.',
  },
  {
    term: 'Playlist Room',
    definition: 'A space to organize listening rounds and shared support around a playlist.',
  },
  {
    term: 'Supporter Score',
    definition: 'A reflection of your participation — sessions joined, feedback given, songs supported, and room activity. Community participation, not verified streams.',
  },
  {
    term: 'Host',
    definition: 'A member who creates circles, runs sessions, and builds a community around music they care about.',
  },
  {
    term: 'Listening confirmed',
    definition: 'A manual confirmation that you listened in a session or playlist room.',
  },
  {
    term: 'Feedback',
    definition: 'Ratings, reactions, and notes you leave to help other artists improve and feel supported.',
  },
]

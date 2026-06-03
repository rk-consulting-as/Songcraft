# ViaTone Design & Architecture Audit (Phase 49.9)

**Status:** Analysis only — no UI, schema, or behavior changes.  
**Date:** May 2026  
**Design references:** `DESIGN.md` (root), `docs/DESIGN.md` (Sonic Ether tokens), `docs/sonic_ether_technical_export_for_cursor_claude.md`, `docs/PUBLIC_VISIBILITY_AUDIT.md`

---

## Executive Summary

ViaTone (repo: **songcraft**) is a mature creator platform spanning songwriting, release tooling, fan growth, playlist communities, public pages, and admin operations. The **shipped product** follows a **warm gold-on-near-black** aesthetic documented in root `DESIGN.md` and `app/globals.css`. The **target redesign** documented in `docs/DESIGN.md` and the Sonic Ether export describes a **different system**: purple/cyan glassmorphism, Montserrat/Inter, sidebar shell — not yet implemented in production UI.

The platform’s greatest structural strengths are deep feature coverage (artist → song → publish → community) and a consistent public-surface layer (`public-surface`, templates). The greatest risks are **navigation fragmentation**, **overlapping concepts** (especially “campaign” and analytics), **settings split across many surfaces**, and **design-system drift** (inline styles + unused tokens + a parallel Sonic Ether spec).

**Before any redesign:** stabilize information architecture, consolidate duplicate surfaces, fix broken mobile/dashboard hashes, and choose one design direction (evolve gold ViaTone vs migrate to Sonic Ether).

---

## Top 10 UX Problems

1. **Broken dashboard deep links** — Mobile bottom nav and playbook link to `/dashboard#songs`, `#artists`, `#campaign`; dashboard has no matching anchors (`app/dashboard/page.tsx`).
2. **“Campaign” naming collision** — Release campaign (song tab), playlist community campaigns, and mobile “Campaign” nav item refer to different concepts.
3. **Public presence settings are fragmented** — Page template, sections, accent, and slug live in dashboard artist modal; featured release in artist Public tab; EPK is a separate tab and URL (`/p/` vs `/epk/`).
4. **Analytics in four+ places** — `/analytics`, artist Analytics tab, dashboard top-streamed widget, `/charts`, song Media `ClickStats`; unclear canonical metrics.
5. **12-tab artist workspace** — Horizontal scroll tab bar is dense on mobile; Growth, Playbook, Campaigns, and Playlists overlap conceptually with dashboard widgets.
6. **Song editor is a 11-tab monolith** — High cognitive load; Distribution, Campaign, Publish, and Captions compete for “go live” attention.
7. **Dual design systems in docs vs code** — Production uses gold/warm; `docs/DESIGN.md` specifies purple glassmorphism — team risk building against the wrong spec.
8. **Legacy Songcraft naming in runtime** — `songcraft_lang`, `songcraft:open-chat`, package name `songcraft` undermine ViaTone brand coherence.
9. **Creator onboarding ends without playbook handoff** — 8 steps complete to dashboard; growth missions and playlist communities appear later without a single “what’s next” hub.
10. **Studio page vs artist page confusion** — `/studio/[slug]` (manager roster) vs `/p/[slug]` (fan page) use different templates and configuration paths.

---

## Top 10 Quick Wins (no redesign required)

1. Implement `#songs`, `#artists`, `#campaign` anchors on dashboard or redirect mobile nav to `/artist/[id]#songs`.
2. Rename UI strings: “Release campaign” vs “Playlist campaign” (i18n only).
3. Add one “Public presence” summary card on artist Overview linking to Public, EPK, and Settings.
4. Document canonical analytics: which page uses which data source (README or in-app tooltip).
5. Wire `lib/tokens.ts` into 3–5 high-traffic components to reduce color literal duplication.
6. Collapse duplicate Analytics link in ProfileMenu when already on `/analytics`.
7. Show playbook completion % on dashboard only (remove duplicate growth card if redundant).
8. Add `aria-current` and skip-link on artist workspace tablist (accessibility).
9. Unify empty states: one `EmptyState` variant with `WorkspaceEmptyState` + `PublicEmptyState` props.
10. Rename localStorage keys with ViaTone prefix on next safe migration window (document mapping).

---

## Part 1 — Platform Inventory

### Legend for recommended actions

| Action | Meaning |
|--------|---------|
| **Keep** | Core value; minor polish only |
| **Improve** | Keep structure; UX/visual/consistency work |
| **Merge** | Combine with another surface |
| **Replace** | Rebuild in redesign (Phase 50+) |
| **Remove later** | Deprecate after migration |

---

### Dashboard

| Item | Purpose | Primary users | UX quality | Complexity | Action |
|------|---------|---------------|------------|------------|--------|
| `/dashboard` | Account hub: stats, artists, release widgets, search | Logged-in creators | Medium — busy, mixed inline/CSS | High | **Improve** |
| Stats grid | Artist/song counts | All | Good | Low | **Keep** |
| Artist create/edit modal | Full artist + **public page config** | All | Medium — powerful but hidden in modal | High | **Merge** → dedicated Public settings |
| Release timeline / readiness / distribution | Pro release ops | Pro | Good for power users | Medium | **Improve** |
| `PlaybookGrowthCoach` | Growth score teaser | All | Good | Low | **Merge** with Playbook entry |
| `PlaylistCommunityDashboardBanner` | Community CTA | Community users | Good | Medium | **Keep** |
| `DashboardDiscoverHighlights` | Discover teaser | All | Good | Low | **Keep** |
| `MobileQuickActions` | Shortcuts | Mobile | Good | Low | **Improve** (fix hrefs) |
| `ViewerAdSlot` | Free-tier ads | Free | Good | Low | **Keep** |

**Routes:** `app/dashboard/page.tsx`  
**Components:** `PlaylistCommunityDashboardBanner`, `PlaybookGrowthCoach`, `DashboardDiscoverHighlights`, `MobileQuickActions`, `UpgradePrompt`

---

### Artist Workspace

| Item | Purpose | Primary users | UX quality | Complexity | Action |
|------|---------|---------------|------------|------------|--------|
| `/artist/[id]` | 12-tab workspace | Creators | Medium — tab overload | Very high | **Replace** (Phase 50A) |
| Overview | Stats + quick actions | All | Good entry | Medium | **Keep** |
| Songs & Albums | Catalog + `SongCreationStudio` + Spotify import | All | Good after Phase 51 | High | **Improve** |
| Campaigns tab | `ArtistCampaignsSummary` (release) | Active releasers | Medium — name clash | Medium | **Merge** → Release hub |
| Playlists tab | Playlist communities | Collaborators | Good | High | **Keep** |
| Fan Hub | Subscribers, comms | Growth-focused | Medium | Medium | **Merge** with Growth/Public |
| Growth | `GrowthEnginePanel` | All | Good but duplicate of Playbook | Medium | **Merge** |
| Analytics | Per-artist traffic, QR, embeds | All | Good | High | **Improve** |
| Media | Brand kit + library | Pro/visual | Good | Medium | **Keep** |
| EPK | Press kit editor | Pro/press | Good | High | **Improve** |
| Public | Preview, QR, featured release | All | Medium — partial settings | Medium | **Merge** |
| Events | Live dates | Touring artists | Good | Low | **Keep** |
| Settings | Artist metadata + page toggle | All | Good | Medium | **Improve** |

**Nav:** `components/ArtistWorkspaceNav.tsx`, `lib/artistWorkspaceTabs.ts`

---

### Songs

| Item | Purpose | Primary users | UX quality | Complexity | Action |
|------|---------|---------------|------------|------------|--------|
| `/song/[id]` | 11-tab song editor | Creators | Medium — long horizontal tabs | Very high | **Replace** (Phase 50C) |
| Lyrics / DNA / Backstory | Creation narrative | All | Good (post-51) | Medium | **Keep** |
| Suno | Prompt compact/detailed | AI music users | Good (post-51) | Medium | **Keep** |
| Captions | Social copy | Promoters | Good | Medium | **Keep** |
| Cover / Canvas | Visual assets | Visual creators | Good | High | **Improve** |
| Media | Links + clicks | All | Good | Medium | **Keep** |
| Campaign | Release checklist + AI assets | Releasers | Good | High | **Improve** |
| Distribution | DistroKid-style flow | Releasers | Good | Medium | **Keep** |
| Publish | QR, embed, public song page | All | Good | Medium | **Keep** |

**Components:** `SongCreationStudio`, `SongDNAPanel`, `SunoPromptToolbar`, `DistributionWorkflow`, `CampaignMediaSection`

---

### Albums

| Item | Purpose | Primary users | UX quality | Complexity | Action |
|------|---------|---------------|------------|------------|--------|
| Album CRUD | Inside artist Songs tab | Album artists | Adequate | Medium | **Improve** |
| Spotify album import | Modal in artist page | Importers | Good | Medium | **Keep** |

No dedicated `/albums` route — embedded in workspace.

---

### Campaigns (two domains)

| Domain | Routes / surfaces | Action |
|--------|-------------------|--------|
| **Release campaigns** | Song tab Campaign, dashboard widgets, artist Campaigns tab | **Merge** naming + hub |
| **Playlist communities** | `/playlist-campaigns/[id]`, `/discover/campaigns`, artist Playlists tab, dashboard banner | **Keep** |

---

### Playlist Communities

| Item | Purpose | UX quality | Complexity | Action |
|------|---------|------------|------------|--------|
| Campaign detail page | Join, proof, health, owner tools | Good | Very high | **Improve** |
| Last.fm / passive participation | Suggestions, streaks, digest | Good | High | **Keep** |
| Discover campaigns | Browse open campaigns | Good | Medium | **Keep** |

**Components:** `ArtistWorkspacePlaylistCommunities`, `PlaylistCampaignCard`, `DetectedActivityInboxCard`, `ParticipationBoard`, etc.

---

### Fan Hub

| Item | Purpose | Action |
|------|---------|--------|
| `FanHubPanel` | Newsletter subscribers, AI fan comms | **Merge** with Growth or dedicated COMMUNITY hub |

---

### Analytics

| Surface | Purpose | Action |
|---------|---------|--------|
| `/analytics` | Account-wide summary API | **Keep** (canonical account view) |
| Artist → Analytics | Event-level public analytics | **Improve** (label as “Public traffic”) |
| `/charts` | Leaderboard | **Merge** or link from analytics |
| Dashboard widget | Top internal plays | **Improve** (cross-link) |
| Song Media `ClickStats` | Per-song | **Keep** |

---

### Growth Engine

| Surface | Purpose | Action |
|---------|---------|--------|
| `/playbook` | Roadmap + growth missions | **Keep** |
| Artist Growth tab | Same engine | **Merge** |
| `PlaybookGrowthCoach` on dashboard | Teaser | **Keep** |
| `GrowthEnginePanel` | Full panel | **Keep** |

**Lib:** `lib/playbook/*`, `lib/playbook/computeEngine.ts`

---

### Media Library

| Item | Purpose | Action |
|------|---------|--------|
| `/library` | Global assets | **Keep** |
| Artist Media tab | Per-artist brand kit | **Merge** navigation with library |
| `AssetPicker`, `MediaLibraryPanel` | Pickers in song/EPK | **Keep** |

---

### EPK

| Item | Purpose | Action |
|------|---------|--------|
| Artist EPK tab | Editor + `public_enabled` | **Improve** |
| `/epk/[artistSlug]` | Public press page (Pro) | **Keep** |
| `EpkMediaSection`, song selectors | Content | **Keep** |

---

### Public Pages

| Route | Template | Action |
|-------|----------|--------|
| `/p/[slug]` | default / minimal / cinematic | **Replace** (50B) |
| `/s/[id]` | Song public page | **Improve** |
| `/embed/song/[id]` | Widget | **Keep** |
| `/u/[code]` | Referral profile | **Improve** |

---

### Admin

| Tab | Purpose | Action |
|-----|---------|--------|
| SaaS control center | Metrics, beta, visibility | **Keep** |
| Users / ledger / tickets / moderation | Ops | **Keep** |

**Route:** `app/admin/page.tsx`, `components/AdminControlCenter.tsx`

---

### Discovery

| Route | Purpose | Action |
|-------|---------|--------|
| `/discover` | Ecosystem hub | **Improve** |
| `/discover/campaigns` | Playlist campaigns | **Keep** |
| `/creators` | Collaborator catalog | **Merge** with discover? |
| `/charts` | Charts | **Improve** |

---

### Playbook

| Route | Purpose | Action |
|-------|---------|--------|
| `/playbook` | Guided roadmap + growth | **Keep** — elevate as onboarding successor |

---

### Notifications

| Surface | Purpose | Action |
|---------|---------|--------|
| `ChatDock` + `/messages` | DMs + support | **Keep** |
| `MessageButton`, notify dispatch API | Triggers | **Keep** |
| Profile notification prefs | Email toggles | **Keep** |

---

### Settings

| Route | Purpose | Action |
|-------|---------|--------|
| `/settings` | Platform rules, Last.fm, AI lang | **Keep** |
| `/settings/billing` | Stripe | **Keep** |
| `/profile` | Identity, catalog visibility | **Keep** |
| `/studio-settings` | Manager studio page | **Keep** |
| Artist Settings tab | Artist fields | **Merge** with profile where overlap |

---

### Full route list (35 app pages + APIs)

**Marketing:** `/`, `/login`, `/offline`  
**Creator:** `/dashboard`, `/artist/[id]`, `/song/[id]`, `/playbook`, `/analytics`, `/library`, `/feed`, `/messages`, `/messages/[id]`, `/profile`, `/settings`, `/settings/billing`, `/studio-settings`, `/referrals`, `/support/new`, `/onboarding`, `/playlist-campaigns/[id]`  
**Discover:** `/discover`, `/discover/campaigns`, `/creators`, `/charts`  
**Public:** `/p/[slug]`, `/s/[id]`, `/epk/[artistSlug]`, `/studio/[slug]`, `/u/[code]`, `/u/[code]/followers`, `/u/[code]/following`, `/embed/song/[id]`  
**Admin:** `/admin`

---

## Part 2 — Navigation Audit

### Navigation inventory

| System | Location | Items |
|--------|----------|-------|
| **Dashboard header nav** | `app/dashboard/page.tsx` | Discover, Charts, Analytics, Playbook, Library, Messages (event), ProfileMenu |
| **ProfileMenu dropdown** | `components/ProfileMenu.tsx` | Profile, Studio, Feed, Analytics (dup), Referrals, Settings, Admin, Logout |
| **Mobile bottom nav** | `components/MobileBottomNav.tsx` | Dashboard, Songs†, Artists†, Campaign†, Settings |
| **Artist workspace tabs** | `ArtistWorkspaceNav` | 12 hash-routed tabs |
| **Song editor tabs** | `app/song/[id]/page.tsx` | 11 tabs + hash `#campaign` |
| **Playbook internal** | `PlaybookPage` | Roadmap / Growth |
| **Discover header** | `DiscoverEcosystemPage` | Charts, Creators, Dashboard |
| **Public pages** | Minimal — logo + ViaTone branding | |
| **Admin tabs** | 6 top-level tabs | |
| **MobileQuickActions** | Dashboard, Artist overview, Song page | Context-specific chips |
| **Overview quick actions** | `ArtistWorkspaceOverview` | Create song, public page, EPK, analytics, playbook |

†Broken or misleading on dashboard (no anchors).

### Strengths

- Artist workspace hash routing works (`#songs`, `#growth`, etc.).
- ProfileMenu successfully collapses infrequent links.
- Public surfaces intentionally minimize nav noise.
- Playbook deep-links into artist/song contexts via `lib/playbook/registry.ts`.

### Weaknesses

- No persistent **sidebar**; wayfinding differs per page (header vs tabs vs cards).
- Dashboard and mobile nav disagree on IA (artists vs songs vs campaign).
- Analytics linked from 3+ places with same label.
- Messages use custom event `songcraft:open-chat` instead of route — hard to discover.
- 12 workspace tabs exceed comfortable mobile thumb reach.

### Redundancies

| Redundant pair | Recommendation |
|----------------|----------------|
| Dashboard analytics widget + `/analytics` + artist Analytics | Single “Insights” hub with drill-down |
| Playbook + Growth tab + PlaybookGrowthCoach | One growth entry point |
| Discover + Creators + Charts | Discover as parent; charts/creators as filters |
| Settings + Artist Settings + Profile | Account vs Artist vs Public split |

### Recommended future navigation architecture

```
┌─────────────────────────────────────────────────────────┐
│ Top bar: Logo | Search | Messages | Profile             │
├──────────┬──────────────────────────────────────────────┤
│ Sidebar  │ Main content                                 │
│          │                                              │
│ Home     │  (Dashboard → artist-scoped when 1 artist)   │
│ Create   │  Songs · Albums · Studio (song editor)       │
│ Grow     │  Playbook · Analytics · Fan hub              │
│ Community│  Playlist campaigns · Discover               │
│ Publish  │  Public pages · EPK · Distribution           │
│ Library  │  Media                                       │
│ ─────    │                                              │
│ Settings │                                              │
└──────────┴──────────────────────────────────────────────┘
```

Mobile: bottom nav **Home | Create | Grow | Community | More** (5 max).

---

## Part 3 — Artist Workspace Audit

### Section analysis

| Section | Likely usage | Overlap | Recommendation |
|---------|--------------|---------|----------------|
| **Overview** | High — landing | Quick actions duplicate dashboard | **Keep** as artist home; sync actions with dashboard |
| **Songs** | Very high | Contains albums + generator + import | **Keep**; consider sub-nav Songs | Albums |
| **Campaigns** | Medium | Same data as song Campaign tab | **Merge** into “Release” or link-out only |
| **Playlists** | Medium (niche) | Dashboard banner duplicates | **Keep**; community hub |
| **Fan Hub** | Low–medium | Overlaps Growth + Public newsletter | **Merge** into Grow |
| **Growth** | Medium | Duplicates `/playbook` | **Remove tab** → link to Playbook |
| **Analytics** | Medium | Duplicates `/analytics` | **Keep** scoped view; rename “Insights” |
| **Media** | Medium | Overlaps `/library` | **Keep** artist-scoped; link global library |
| **EPK** | Low–medium | Overlaps Public + bio in settings | **Keep** for Pro press workflow |
| **Public** | Medium | Overlaps dashboard modal + settings | **Become** unified “Publish” sub-area |
| **Events** | Low | None | **Keep** (optional expand later) |
| **Settings** | Medium | Profile overlap | **Keep** artist-specific only |

### Workspace redesign recommendations

1. **Reduce tabs from 12 → 6:** Overview | Create | Release | Community | Insights | Publish (Settings as gear icon).
2. **Move Growth tab** to global Playbook (already linked).
3. **Unify Public + EPK + Events** under Publish with sub-sections.
4. **Campaigns tab** → “Release status” list linking to song `#campaign`.
5. **Sticky artist context header** (name, avatar, public link) across all sections — partially exists; extend.
6. **Desktop: vertical sub-nav** inside workspace instead of horizontal scroll only.

---

## Part 4 — Public Page Audit

### Surfaces

| Surface | Strengths | Weaknesses |
|---------|-----------|------------|
| **Artist `/p/[slug]`** | Strong hero templates; `PublicCreatorIdentityBlock`; section toggles; Spotify/YouTube embeds; acquisition CTAs | Template picker only in dashboard modal; inconsistent templates (default rich vs minimal/cinematic); SEO depends on slug discipline |
| **Song `/s/[id]`** | Player, lyrics, reactions, comments, newsletter | Competes with Spotify for “canonical listen”; SEO for single songs variable |
| **EPK `/epk/[slug]`** | Pro positioning; structured bios | Separate URL from fan page; discoverability low |
| **Discover** | Spotlight, campaigns, releases, creators | Dense; competes with `/creators` and `/charts` |

### SEO opportunities

- `app/sitemap.ts` already filters hidden content — extend structured data (MusicGroup, MusicRecording).
- Consistent `buildPublicMetadata` usage — audit all public routes.
- Artist slug uniqueness and `page_enabled` gating — document for creators.
- EPK and `/p/` duplicate content risk — canonical tags between them.

### Storytelling opportunities

- Featured release picker exists but underused on default template hero.
- `PublicCreatorIdentityBlock` — expand narrative on cinematic template.
- Song backstory on `/s/[id]` — cross-link from artist page tracks.

### Community opportunities

- Playlist campaign cards on discover — strong differentiator.
- Reactions/comments on song pages — lightweight fan engagement.
- Newsletter signup — tie to Fan Hub metrics in workspace.

### Growth opportunities

- `CreatorAcquisitionCta` on public pages — measure conversion.
- Referral `/u/[code]` — integrate into public footer.
- QR flows from artist Public tab — connect to analytics.

### Public experience audit summary

| Action | Items |
|--------|-------|
| **Keep** | Template system, public-surface CSS, embed widget, analytics tracker |
| **Improve** | Unified public settings panel, SEO metadata, mobile hero performance |
| **Replace** | Phase 50B — Sonic Ether–style glass cards if design direction shifts |
| **Merge** | EPK content blocks into optional `/p/` press section |

---

## Part 5 — Design System Audit

### Reference documents (source of truth tension)

| Document | Aesthetic | Status in production |
|----------|-----------|----------------------|
| Root `DESIGN.md` | Gold `#d4a843`, warm text, vintage-cinematic | **Implemented** via `globals.css` |
| `lib/tokens.ts` | Mirrors root DESIGN | **Defined, not imported in app** |
| `design/songcraft-design.css` | `.sc-*` classes | **Not bundled** in Next.js |
| `docs/DESIGN.md` | Sonic Ether: purple `#d0bcff`, teal secondary, Montserrat/Inter, glass | **Not implemented** |
| `docs/sonic_ether_technical_export_for_cursor_claude.md` | Tailwind purple/cyan, sidebar shell | **Not implemented** |

**Critical finding:** Redesign must **explicitly choose** whether Phase 50 follows root gold ViaTone (evolution) or Sonic Ether (replacement). Screenshots referenced by the user likely show **current gold UI** (production) vs **target purple UI** (design export) — explaining “two themes” if both appear in Figma vs production.

### Components following ViaTone gold system

- `.btn-gold`, `.btn-outline`, `.card` — globals.css
- `.artist-workspace-*`, `.workspace-*`, `.playbook-*`, `.discover-*`
- `.public-surface`, `.public-hero`, status pills
- `WorkspaceEmptyState`, playlist community cards (recent phases)

### Components not following design system

- Large pages with **inline** `#d4a843`, `rgba(180,140,80,0.2)` literals: `dashboard`, `artist/[id]`, `song/[id]`, `admin`, `onboarding`, `analytics`
- Song editor tab buttons — custom inline styles per tab
- Some Spotify-green one-offs (import UI) — intentional brand exception
- Admin tables — mixed patterns

### Design debt report

| Category | Issue | Severity |
|----------|-------|----------|
| **Typography** | System fonts in app vs Montserrat/Inter in Sonic Ether spec | High (if migrating) |
| **Color** | Hundreds of hardcoded gold literals vs tokens | Medium |
| **Spacing** | No shared spacing scale in code; Sonic Ether has 4px grid in docs | Medium |
| **Cards** | `.card` vs inline bordered divs vs glass spec | Medium |
| **Buttons** | `.btn-gold` vs inline button styles | Medium |
| **Theme** | No CSS variables for theme switch; dark only | Low |
| **Elevation** | Borders used; Sonic Ether expects blur/glow | High (if migrating) |
| **Naming** | `sc-*` vs `btn-gold` dual naming | Low |
| **Unused assets** | `tokens.ts`, `songcraft-design.css` | Medium |

---

## Part 6 — Duplicate Component Audit

### Consolidation opportunities

| Duplicate | Locations | Recommendation |
|-----------|-----------|----------------|
| **Empty states** | `WorkspaceEmptyState`, `PublicEmptyState` | Single `EmptyState` with variant prop |
| **Upgrade prompts** | `UpgradePrompt` (good) but repeated compact wrappers | Keep component; centralize limit checks |
| **Quick actions** | `MobileQuickActions`, overview action grid, dashboard mobile | Shared `QuickActionBar` config |
| **Campaign summaries** | `ArtistCampaignsSummary`, song Campaign tab, dashboard release widgets | `ReleaseProgressService` + one summary component |
| **Growth panels** | `GrowthEnginePanel`, `PlaybookGrowthCoach`, playbook page | Single data hook `useGrowthEngine()` |
| **Analytics displays** | Analytics page, artist analytics, charts, stat cards | Shared `MetricCard` + `Sparkline` |
| **Community cards** | `PlaylistCampaignCard`, discover variants, dashboard banner | Already close — extract shared `CampaignCard` |
| **Copy-to-clipboard** | Multiple ad-hoc `navigator.clipboard` patterns | `useCopyFeedback` hook (Suno toolbar does this) |
| **QR + embed** | Onboarding, song Publish, artist Public | `ShareToolkit` component |
| **Modals** | Artist form on dashboard, album modal, event form | `Modal` primitive with consistent header/footer |
| **Stat grids** | Dashboard, overview, participation widget | `StatGrid` component |
| **Acquisition CTAs** | `CreatorAcquisitionCta` variants | Keep — already extracted |
| **Disclaimer blurbs** | Playlist community, activity proof, quality | `ComplianceNotice` with i18n keys |

---

## Part 7 — Mobile Experience Audit

### Area-by-area

| Area | Issues | Priority |
|------|--------|----------|
| **Dashboard** | Header nav wraps; many stacked cards; broken bottom-nav hashes | **Critical** |
| **Artist workspace** | 12-tab horizontal scroll; long pages; inline layouts | **High** |
| **Song editor** | 11 tabs overflow; small touch targets on tabs | **High** |
| **Campaign pages** | Complex owner/participant panels; proof upload | **High** |
| **Playlist communities** | Multi-panel forms; suggestion cards | **Medium** |
| **Media library** | Grid density; picker modals | **Medium** |
| **EPK** | Long form sections | **Medium** |
| **Discover** | Filter chips wrap well (CSS); large grids | **Low** |
| **Public artist page** | Heroes strong; track rows tight on narrow screens | **Medium** |

### Mobile UX issues (prioritized)

**Critical**
- Dashboard `#songs` / `#artists` / `#campaign` dead links from `MobileBottomNav`.
- Song/artist tab bars without overflow menu — risk of hidden tabs off-screen.

**High**
- Artist workspace header + tabs consume vertical space before content.
- Song editor primary actions below fold after tab strip.
- Playlist campaign proof flow on small screens — multi-step.

**Medium**
- Inline-styled forms (dashboard artist modal) — small inputs hard to scan.
- Discover campaign grid — card actions cramped.
- Duplicate bottom nav + quick actions — redundant entry points.

**Low**
- Public pages generally responsive via `public-surface` CSS.
- EPK print-oriented layout rarely used on mobile.

---

## Part 8 — Creator Journey Audit

### Journey map

| Step | Touchpoint | Friction |
|------|------------|----------|
| 1. Create account | `/login` | Referral code optional — OK |
| 2. Onboarding (8 steps) | `/onboarding` | Long; language first; can skip |
| 3. Dashboard | First landing | Busy; unclear priority vs playbook |
| 4. Create artist | Onboarding or dashboard modal | Public page config buried in modal |
| 5. Create song | Onboarding or `SongCreationStudio` | Strong after Phase 51; many options |
| 6. Generate assets | Song tabs (lyrics → suno → cover) | 11 tabs — no guided path |
| 7. Publish release | Campaign + Distribution + Publish | Split across 3 tabs |
| 8. Build audience | Playbook, Fan Hub, newsletter | Scattered |
| 9. Join communities | Playlists tab, discover | Late discovery |
| 10. Track growth | Analytics, playbook, growth coach | Metric confusion |
| 11. Paying customer | `/settings/billing`, upgrade prompts | Clear Pro gates |

### Friction & confusion

- **Too many clicks** to enable public page with right template (dashboard → edit artist → scroll modal).
- **Dead ends:** Dashboard campaign hash; Creators vs Discover overlap.
- **Missing guidance:** No single post-onboarding checklist (playbook exists but competes with dashboard cards).
- **Concept overload:** Campaign, playbook missions, growth score — related but differently named.

### Creator journey report — recommendations

1. Post-onboarding → Playbook with 5 missions, not raw dashboard.
2. Guided “first release” path: Song → Lyrics → Suno → Publish (wizard overlay).
3. Single **Publish** hub for public page + EPK + QR.
4. Community discovery at day 3 — email/in-app nudge to `/discover/campaigns`.
5. Billing upgrade at natural gates (analytics, EPK, templates) — already partially done.

---

## Part 9 — Feature Organization Audit

### Proposed pillars vs current structure

| Pillar | Intended scope | Current home (fragmented) |
|--------|----------------|-------------------------|
| **CREATE** | Artists, songs, albums, lyrics, Suno, cover, canvas, DNA | Artist Songs tab, `/song/[id]`, library |
| **GROW** | Playbook, analytics, fan hub, newsletter, referrals, charts | Playbook, Growth tab, `/analytics`, `/referrals`, Fan Hub |
| **COMMUNITY** | Playlist campaigns, discover, participation, Last.fm | Playlists tab, discover routes, passive engine |
| **PUBLISH** | Public pages, EPK, distribution, embed, QR, captions | Public tab, EPK tab, song Publish/Distribution/Campaign |
| **ADMIN** | Settings, billing, profile, studio, admin | `/settings*`, `/profile`, `/admin` |

### Gap analysis

- **CREATE** is strong but editor is tab-heavy.
- **GROW** is powerful but duplicated 4×.
- **COMMUNITY** is differentiated but buried in tab 4 of 12.
- **PUBLISH** is the most fragmented pillar.
- **ADMIN** is appropriately separate.

### Future information architecture proposal

```
ViaTone
├── CREATE          → Song Studio (per artist)
├── RELEASE         → Campaign + Distribution (merged)
├── AUDIENCE        → Playbook + Analytics + Fan tools
├── COMMUNITY       → Playlist campaigns + Discover
├── PUBLISH         → Public site + EPK + Embeds
└── ACCOUNT         → Profile, billing, settings, studio
```

Aligns sidebar nav with mental models and reduces “campaign” ambiguity by renaming RELEASE vs COMMUNITY.

---

## Part 10 — Phase 50 Roadmap

### Phase 50A — Workspace Redesign

| | |
|--|--|
| **Goals** | Reduce artist workspace tabs; unify navigation; consolidate Growth/Public/Settings entry points |
| **Scope** | `ArtistWorkspaceNav`, tab content grouping, overview redesign, hash routing, mobile sub-nav |
| **Complexity** | High (12+ tab contents, `app/artist/[id]/page.tsx` ~2200 lines) |
| **Risk** | Medium — regression on hash links from playbook |
| **Dependencies** | IA decision (Part 9); design direction (gold vs Sonic Ether) |

### Phase 50B — Public Artist Sites 2.0

| | |
|--|--|
| **Goals** | Unified public settings; template parity; SEO; storytelling; optional Sonic Ether visual language |
| **Scope** | `/p/[slug]`, templates, `page_settings` editor relocation, featured release, sitemap/metadata |
| **Complexity** | High (3 templates + SSR + OG) |
| **Risk** | Medium — live public URLs must not break |
| **Dependencies** | Design tokens decision; migration of settings out of dashboard modal |

### Phase 50C — Studio Redesign (Song Editor)

| | |
|--|--|
| **Goals** | Lower tab cognitive load; guided create→release flow; group Suno/cover/canvas under CREATE |
| **Scope** | `/song/[id]` tab model → stepper or grouped nav; Suno/DNA integration prominent |
| **Complexity** | Very high (largest single page) |
| **Risk** | High — daily driver for creators |
| **Dependencies** | 50A nav patterns; Phase 51 song creation studio patterns |

### Phase 50D — Growth & Community Hub

| | |
|--|--|
| **Goals** | Single community entry; clarify playlist vs release; merge growth surfaces |
| **Scope** | Discover, playlist campaigns, playbook merge, dashboard banners, rename i18n |
| **Complexity** | Medium–high |
| **Risk** | Low–medium if naming-only first |
| **Dependencies** | Passive participation engine stable; discover APIs |

---

## Recommended Redesign Roadmap (sequenced)

| Order | Phase | Rationale |
|-------|-------|-----------|
| 1 | **49.9** (this audit) | Alignment before code |
| 2 | **Quick wins** | Dashboard hashes, naming, docs on analytics |
| 3 | **50D** | Community/growth clarity — marketing differentiator |
| 4 | **50A** | Workspace IA — unlocks daily UX |
| 5 | **Design decision** | Gold evolution vs Sonic Ether migration |
| 6 | **50B** | Public sites — outward-facing value |
| 7 | **50C** | Song editor — highest build risk last |

---

## Appendix A — Major components (115+ in `components/`)

Grouped for redesign planning:

- **Workspace:** `ArtistWorkspaceNav`, `ArtistWorkspaceOverview`, `ArtistWorkspaceAnalytics`, `ArtistWorkspaceGrowth`, `ArtistWorkspaceMedia`, `ArtistWorkspacePlaylistCommunities`, `ArtistSettingsPanel`, `WorkspaceEmptyState`, `WorkspaceCollapsible`
- **Song creation:** `SongCreationStudio`, `SongDNAPanel`, `SunoPromptToolbar`
- **Playlist communities:** 20+ components (`PlaylistCampaignCard`, `ParticipationBoard`, `DetectedActivityInboxCard`, etc.)
- **Discover:** `DiscoverEcosystemPage`, `DiscoverCreatorCard`, `DiscoverReleaseCard`, etc.
- **Public:** `PublicEmptyState`, `PublicStickyListen`, `PublicAnalyticsTracker`, artist templates
- **Platform:** `CreatorAcquisitionCta`, `ViaToneBranding`, `UpgradePrompt`, `BetaLaunchKit`
- **Media:** `MediaLibraryPanel`, `AssetPicker`, `BrandKitPanel`, `EpkMediaSection`
- **Admin:** `AdminControlCenter`, `AdminSystemHealthPanel`

---

## Appendix B — QA verification (audit phase)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |
| Code changes in audit phase | None (report only) |
| ReadLints | N/A — no files modified |

---

## Appendix C — What to keep vs move vs merge vs remove (summary)

| Keep | Move | Merge | Replace later | Remove later |
|------|------|-------|-----------------|--------------|
| Song creation studio | Public template picker → Publish hub | Growth tab → Playbook | Artist 12-tab layout | Duplicate analytics widgets |
| Playlist communities | Featured release → Publish | Fan Hub → Grow | Song 11-tab layout | `songcraft_*` storage keys |
| Public templates | EPK settings → Publish | Release campaigns naming | Dashboard modal artist form | Broken dashboard hashes |
| Playbook engine | Studio settings (OK separate) | Discover + Creators | Sonic Ether visuals (if chosen) | Horizontal-only workspace nav |
| Admin control center | | Campaign summaries | | Unused `songcraft-design.css` in bundle |

---

*End of Phase 49.9 audit. No application code was modified.*

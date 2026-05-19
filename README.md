# ViaTone

**Online Artist Platform** — create, release, promote and grow your music. Built for artists, producers and managers, with Spotify and Suno integration and publishable landing pages for artists and studios.

ViaTone helps you go from blank page to released track:
**lyrics → Suno prompt → cover image → captions → press release → published landing page.**

Live: <https://songcraft-lilac.vercel.app>

---

## Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Public pages — for sharing & embedding](#public-pages--for-sharing--embedding)
- [Linking ViaTone from another site](#linking-viatone-from-another-site)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Data model](#data-model)
- [Routes overview](#routes-overview)
- [Deployment](#deployment)
- [Common workflows](#common-workflows)
- [Future / monetization ideas](#future--monetization-ideas)

---

## What it does

### Songwriting workflow

- **Lyrics** — describe theme, AI generates lyrics, refine with chat-style follow-up prompts. Full version history with restore.
- **Clean lyrics export** — copies only the lyrics (no `[Verse 1]`, `(Chorus)`, markdown) for pasting into WordPress / press releases.
- **Suno prompt generator** — turns your lyrics into a detailed Suno prompt (style, instrumentation, vocal direction).
- **Suno track import** — paste a finished Suno song link, we fetch metadata (cover, audio URL, tags) and attach it to the song. Audio plays inline.
- **Captions** — per-platform (TikTok, Instagram, Facebook, YouTube, X) with platform-specific rules + your own custom rules.
- **Cover image** — write a prompt manually or let AI generate one, then create the image with OpenAI `gpt-image-1`. Saves to Supabase Storage.
- **Canvas (short video loop)** — Spotify-Canvas-style 3–10 second video clips. Generate with AI via fal.ai (Seedance Pro) directly inside ViaTone, or upload a video you made elsewhere (e.g. artlist.io). Stored in Supabase Storage. Aspect ratio + duration configurable per generation.
- **Publish** — auto-generates WordPress post, Facebook post, Instagram post, press release.

### Catalogue management

- **Artists** with Spotify search + verification, social links (YouTube, Instagram, TikTok, …), and an artist roster.
- **Albums** with cover image (manual upload, AI generation, or fetched from a Spotify album link). Songs can be assigned to one album.
- **Spotify import** — bring released tracks into ViaTone via top-tracks list, search fallback, or a single Spotify track URL. Stores cover, popularity, release date, ISRC.
- **Status tracking** — Draft / In progress / Complete / Released, plus filtering and search.
- **Drag & drop reorder** + up/down buttons on every song.

### Public landing pages

- **`/p/{slug}` — Artist page**: hero, social buttons, Spotify embed, featured YouTube videos, albums, tracks list with audio. Configurable per artist; off by default.
- **`/studio/{slug}` — Studio / manager page**: hero, markdown bio, services, featured projects, artist roster (each with mini playlist of starred songs), contact form, social links. One per ViaTone account.
- Both pages support **custom favicons**, **accent colors**, OG/Twitter meta tags for sharing.

### AI provider switching

Per-call toggle (Claude / GPT) on every AI button. Default Anthropic; OpenAI for variety or fallback. Choice persists in `localStorage`.

---

## Tech stack

| Layer            | Tech                                                   |
|------------------|--------------------------------------------------------|
| Framework        | Next.js 14 (App Router)                                |
| Database / Auth  | Supabase (Postgres + Auth + Storage + RLS)             |
| Hosting          | Vercel                                                 |
| AI — text        | Anthropic Claude (`claude-opus-4-6`) + OpenAI (`gpt-4o`) |
| AI — images      | OpenAI `gpt-image-1`                                   |
| Music data       | Spotify Web API (Client Credentials)                   |
| Suno             | Server-side scraping of public Suno song pages         |
| Email            | Resend (optional, for studio contact form)             |
| Markdown render  | Custom `lib/markdown.ts` — no extra dependency, XSS-safe |
| Languages        | Norwegian + English UI                                 |

---

## Public pages — for sharing & embedding

### Artist page — `/p/{slug}`

Each artist can opt-in to a public landing page from the artist edit modal in ViaTone:

- Slug auto-generated from artist name (editable, must be unique)
- Toggle visibility per section (hero, social links, bio, Spotify embed, YouTube videos, albums, songs)
- Featured YouTube videos (paste links, one per line)
- Custom favicon
- Public link from the artist's detail page in ViaTone

### Studio / manager page — `/studio/{slug}`

One per ViaTone account, edited at `/studio-settings`. Includes:

- Hero with name, tagline, background image, accent color, custom favicon
- Markdown bio with live preview
- Services list
- Featured projects (manual cards: title, description, image, link)
- Artist roster — pick which of your ViaTone artists to feature, each with its own **mini playlist** of songs you've starred
- Contact form (saved to inbox, optionally forwarded to email via Resend)
- Social links (Spotify, YouTube, Instagram, TikTok, LinkedIn, website)

The starred-songs playlist is populated by clicking the ★ next to any song in the artist's song list. The track plays inline (when a Suno audio URL is attached) and links to Spotify when available.

---

## Linking ViaTone from another site

If you already run a website (`yoursite.com`) and want to point visitors to ViaTone pages:

### Direct links

Just link to the public pages:

```html
<a href="https://songcraft-lilac.vercel.app/studio/your-slug">Our roster</a>
<a href="https://songcraft-lilac.vercel.app/p/artist-slug">Listen to Artist Name</a>
```

OG meta tags are set on every public page, so links posted to Facebook / Twitter / LinkedIn / WhatsApp render proper preview cards with the artist/studio image and description.

### Embedding sections

You can embed an artist or studio page inside an `<iframe>`:

```html
<iframe
  src="https://songcraft-lilac.vercel.app/p/your-artist-slug"
  width="100%"
  height="800"
  frameborder="0"
  loading="lazy"
></iframe>
```

For a more native feel, link to the Spotify/YouTube embeds directly using IDs you can also see in ViaTone data.

### Future: custom domain mapping

When the paid tier launches, you'll be able to map `youstudio.com` → `/studio/your-slug` via Vercel domain forwarding + middleware so the URL feels like your own.

### Cross-site deep linking

Common patterns:

- From your blog post → individual song page only externally via Spotify/Suno; songs themselves are private inside ViaTone.
- From your "Roster"-page → `/studio/{slug}` (full roster + contact form).
- From "Press"-page → individual artist `/p/{slug}` with bio + tracks + social.

---

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/yourname/songcraft.git
cd songcraft
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Open SQL Editor and run every file in `supabase/migrations/` in chronological order (the filenames are ISO-dated). The schema includes:
   - `artists`, `songs`, `albums`, `studio_pages`, `contact_submissions`, `platform_rules`
   - All RLS policies
3. In Supabase **Storage**, create a public bucket called `covers`. This holds song covers, album covers, hero images, favicons.

### 3. Set up env vars

Copy `.env.example` to `.env.local` and fill in values:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# AI
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

# Spotify (Client Credentials)
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...

# Optional: Resend for studio contact form forwarding
# RESEND_API_KEY=re_...
# RESEND_FROM=ViaTone <onboarding@resend.dev>
```

See [Environment variables](#environment-variables) below for details on each.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>, sign up, start creating.

---

## Environment variables

| Variable                          | Required | Used by                                     | Notes |
|-----------------------------------|----------|---------------------------------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL`        | ✅       | Everywhere (browser + server)               | From Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | ✅       | Everywhere                                   | Public anon key (safe in browser) |
| `ANTHROPIC_API_KEY`               | ✅       | `/api/ai` when provider = anthropic          | Get one at [console.anthropic.com](https://console.anthropic.com) |
| `OPENAI_API_KEY`                  | Optional | `/api/ai` (provider=openai), `/api/image`    | Required for GPT chat + cover image generation. [platform.openai.com](https://platform.openai.com/api-keys) |
| `SPOTIFY_CLIENT_ID`               | Optional | All Spotify routes                           | Required for artist/track import. [developer.spotify.com](https://developer.spotify.com/dashboard) |
| `SPOTIFY_CLIENT_SECRET`           | Optional | All Spotify routes                           | Pair with above |
| `RESEND_API_KEY`                  | Optional | `/api/studio/contact`                        | If set, contact form submissions are emailed to the studio's `contact_email`. Otherwise saved to DB only. [resend.com](https://resend.com) |
| `RESEND_FROM`                     | Optional | `/api/studio/contact`                        | Default `ViaTone <onboarding@resend.dev>`. Use a verified domain in production. |
| `FAL_KEY`                         | Optional | `/api/canvas/*`                              | Required for inline AI video generation (Spotify Canvas). [fal.ai](https://fal.ai) — ~$0.10–0.30 per video. |
| `FAL_VIDEO_MODEL`                 | Optional | `/api/canvas/generate`                       | Override the default Seedance model path. Defaults to `fal-ai/bytedance/seedance-1-pro/text-to-video`. |

---

## Data model

Simplified — see migration files for the full schema.

```
auth.users (Supabase managed)
   │
   ├── studio_pages (1:1)        ← /studio/{slug}
   │      └── contact_submissions (1:N)
   │
   ├── artists (1:N)              ← /p/{slug}
   │      ├── albums (1:N)
   │      └── songs (1:N)
   │             ├── album_id     → albums (optional)
   │             ├── lyrics, lyrics_history
   │             ├── suno_url + suno_audio_url
   │             ├── spotify_track_id + popularity + cover
   │             ├── media_links (jsonb)
   │             ├── featured_on_studio_page (★)
   │             └── status (draft / in_progress / complete / released)
   │
   └── platform_rules (1:N per platform)  ← caption rules per user
```

**Key flags:**

- `artists.page_enabled` — opt-in to public artist page
- `artists.page_settings` (jsonb) — section visibility, accent color, featured YouTube videos
- `studio_pages.enabled` — opt-in to studio page
- `studio_pages.featured_artist_ids` (jsonb array) — which artists appear on the studio page
- `songs.featured_on_studio_page` — show this song under its artist on the studio page

**RLS gist:**

- Owner can read/write their own rows (always).
- `artists`/`songs`/`albums` rows are publicly readable when the related artist has `page_enabled = true`.
- `studio_pages` rows are publicly readable when `enabled = true`.
- `contact_submissions` accepts public INSERTs; only the page owner can read/update/delete.

---

## Routes overview

### Authenticated app

| Route                            | Description                                          |
|----------------------------------|------------------------------------------------------|
| `/login`                         | Email/password sign-in (Supabase auth)               |
| `/dashboard`                     | Artist grid + global search                          |
| `/artist/[id]`                   | Artist detail: songs, albums, Spotify import         |
| `/song/[id]`                     | Song detail: tabs for Lyrics, Suno, Captions, Cover, Media, Publish |
| `/settings`                      | Language + per-platform caption rules + studio editor link |
| `/studio-settings`               | Studio page editor (with Inbox tab)                  |

### Public

| Route                            | Description                                          |
|----------------------------------|------------------------------------------------------|
| `/p/{slug}`                      | Public artist landing page                           |
| `/studio/{slug}`                 | Public studio / manager landing page                 |

### API

| Route                                  | Method | Description |
|----------------------------------------|--------|-------------|
| `/api/ai`                              | POST   | Unified text-AI dispatch — Anthropic or OpenAI based on `provider` field |
| `/api/image`                           | POST   | Cover image generation via `gpt-image-1`. Returns base64. |
| `/api/spotify`                         | GET    | Artist search by name |
| `/api/spotify/tracks`                  | GET    | Artist's top tracks (with search fallback) |
| `/api/spotify/track-by-url`            | GET    | Single track from URL/URI/ID |
| `/api/spotify/album-by-url`            | GET    | Single album from URL/URI/ID |
| `/api/suno/track`                      | GET    | Suno song metadata from public page (title, audio, cover, tags, lyrics) |
| `/api/canvas/generate`                 | POST   | Submit a Canvas video generation job to fal.ai (Seedance Pro). Returns request IDs. |
| `/api/canvas/status`                   | GET    | Poll fal.ai for job status. Returns video URL when complete. |
| `/api/canvas/proxy`                    | GET    | Server-side stream of an external video URL (CORS workaround) — used to download generated videos before re-uploading to Supabase Storage. |
| `/api/studio/contact`                  | POST   | Public contact-form submission. Saves to DB; optionally emails via Resend. |

---

## Deployment

The app is deployed on Vercel. Pushing to the `main` branch triggers a deploy automatically.

### After a schema change

1. Push the migration file to GitHub.
2. Run the migration manually in Supabase SQL Editor (Vercel doesn't run migrations).
3. If the new schema isn't picked up, run `NOTIFY pgrst, 'reload schema';` or restart the Supabase API.

### Setting env vars on Vercel

Vercel Dashboard → Project → Settings → Environment Variables. Mark sensitive ones as **Sensitive**. After changing env vars, **redeploy** (Deployments → ⋮ → Redeploy) — env-var changes don't auto-trigger.

---

## Common workflows

### Write and publish a new song

1. Dashboard → Open artist → **Generate songs with AI** (or **+ New song** manually)
2. Open the song → Lyrics tab → write instructions → **Generate lyrics**
3. Suno tab → **Generate Suno prompt** → copy → run in Suno → paste finished URL back to import
4. Cover tab → write a prompt or **Generate AI image prompt** → **Generate cover image**
5. Captions tab → click each platform you publish on
6. Publish tab → generate WordPress / FB / IG / press release content
7. Set status → Released

### Set up the studio landing page

1. Dashboard header → **Set up studio page** (or `/studio-settings`)
2. Tick **Publish studio page**, name + auto-slug
3. Fill hero, bio (markdown), services, featured projects
4. Tick which artists are part of your roster
5. ★ a few songs per artist back on the artist page (those become the mini playlist)
6. Save → **Open public page** ↗

### Receive contact form submissions

Without Resend: open `/studio-settings` → Inbox tab.
With Resend: same as above, plus emails arrive at the studio `contact_email` (Reply-To set to the sender).

---

## Future / monetization ideas

Schema and architecture are designed to support a paid tier without invasive refactors:

- **Custom domain mapping** — `yourstudio.com` → `/studio/{slug}` via Vercel + middleware
- **White-label mode** — hide "Powered by ViaTone" footer on public pages
- **Featured-songs cap** — free tier = N tracks per artist on studio page; pro = unlimited
- **Project / artist limits** — gate roster size on free tier
- **Analytics** — page views, contact-form conversion, top tracks
- **Real Spotify stream counts** via Songstats / Chartmetric API (paid services)
- **Booking calendar** with Stripe payments
- **AI bio writer** — turn bullet points into a polished bio
- **Audio uploads** — first-class audio hosting beyond just linking Suno tracks
- **Collaborator seats** — invite co-producers to your studio account

`page_settings` and `studio_pages.sections` (both JSONB) are deliberately open-ended so new toggles can be added without migrations.

---

## Known gaps / tech debt

Pragmatic notes for whoever maintains this next (including future-you):

- **Base schema is not in `supabase/migrations/`.** The `artists`, `songs`, `platform_rules` tables were created in Supabase Studio early on, before we adopted file-based migrations. Migrations from `20260428_albums.sql` onwards assume those tables already exist. **Recommended fix:** run `supabase db dump --schema-only --schema public > supabase/migrations/00000000_base.sql` once, commit, and you can spin up a fresh dev/staging Supabase from scratch.
- **Lyrics live as `songs.lyrics_text` + `songs.lyrics_history` (jsonb).** The history holds the full assistant chat transcript so you can restore any past version. Already exposed in the song detail page (📜 Versions).
- **Suno prompt is `songs.suno_prompt` (single field).** Not versioned. If iterating on prompts becomes important, add a `song_prompts` table with `version int, prompt_text, ai_provider, created_at` and link by `song_id`. Easy follow-up.
- **No automated tests.** Fine for a solo project; worth adding integration tests for the Supabase queries + critical API routes (`/api/ai`, `/api/spotify/*`, `/api/studio/contact`) before opening up to paying users.
- **Spotify production credentials issue.** A previous Spotify app's tokens were rejected by the API even though credentials succeeded at the token endpoint. Workaround: create a fresh Spotify Web API app and replace `SPOTIFY_CLIENT_ID`/`SECRET` on Vercel.
- **Server-side Suno scraping.** Reads OG/JSON-LD/`__NEXT_DATA__` from Suno song pages. Will break if Suno restructures their pages — keep it best-effort, fall back to "couldn't fetch metadata, paste manually" if that happens.

---

## Recommended next steps

Roadmap with sane priority order. Each item is small enough to deliver in one sitting.

1. **Dump base schema → migration.** Removes the worst piece of tech debt; future onboarding is one `supabase db push` away.
2. **Public JSON API for the studio page** — `GET /api/public/studio/{slug}` returns the same data as `/studio/{slug}` but as JSON. Lets you render your music portfolio inside a different website (e.g. `rk-consulting.no`) using its own design instead of an iframe.
3. **Custom domain mapping** — Vercel domain forwarding + a small middleware so `musikk.rk-consulting.no` routes to `/studio/{your-slug}`.
4. **Prompts versioning table** — `song_prompts (song_id, version, prompt_text, ai_provider, notes, created_at)`. Treat each generation as a checkpoint; valuable when productizing.
5. **Stripe + signup gate** — open up paying users. Schema is already multi-tenant with RLS, so most of this work is auth flow + Stripe webhook + tier-checks against `studio_pages.page_settings.tier`.

---

## License

Private project, all rights reserved (for now).

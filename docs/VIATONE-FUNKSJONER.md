# ViaTone / Songcraft — Funksjoner og muligheter

**ViaTone** er en online artist-plattform for å skape, utgi, promotere og vokse med musikken din. Plattformen dekker hele reisen fra idé til utgitt låt — med AI-assistanse, offentlige sider, kampanjeverktøy og creator-fellesskap.

> **Merk:** I kodebasen heter prosjektet fortsatt *Songcraft*; produktnavnet i brukergrensesnittet er **ViaTone**.

**Språk:** Norsk og engelsk i grensesnittet.  
**Planer:** Free og Pro (Stripe + manuell Pro-overstyring for admin).

---

## Innholdsfortegnelse

1. [Kort oversikt](#kort-oversikt)
2. [Dashboard og onboarding](#dashboard-og-onboarding)
3. [Artist Workspace](#artist-workspace)
4. [Opprette nye låter (AI)](#opprette-nye-låter-ai)
5. [Song Studio](#song-studio)
6. [Kreativ retning og ekstern inspirasjon](#kreativ-retning-og-ekstern-inspirasjon)
7. [Stories og innholdsmarkedsføring](#stories-og-innholdsmarkedsføring)
8. [Kampanje og release](#kampanje-og-release)
9. [Distribusjon](#distribusjon)
10. [Media Library](#media-library)
11. [Offentlige sider og deling](#offentlige-sider-og-deling)
12. [Discover, sosialt og vekst](#discover-sosialt-og-vekst)
13. [Playlist-fellesskap](#playlist-fellesskap)
14. [Meldinger og support](#meldinger-og-support)
15. [Analyse](#analyse)
16. [Innstillinger, profil og fakturering](#innstillinger-profil-og-fakturering)
17. [AI-muligheter](#ai-muligheter)
18. [Integrasjoner](#integrasjoner)
19. [Free vs Pro](#free-vs-pro)
20. [Kommende funksjoner](#kommende-funksjoner)

---

## Kort oversikt

ViaTone hjelper uavhengige artister og managere med:

| Område | Hva du kan gjøre |
|--------|------------------|
| **Skape** | AI-genererte låtideer, tekster, Suno-prompt, cover, canvas-video |
| **Organisere** | Artister, låter, album, media, creative direction |
| **Utgi** | Release-tidslinje, kampanjeinnhold, distribusjonsforberedelse |
| **Publisere** | Offentlig artistside, låtside, EPK, embed-spiller, stories |
| **Vokse** | Discover, følgere, playlist-kampanjer, growth hub, referrals |
| **Forstå** | Analyse av avspillinger, klikk, sidevisninger, QR, nyhetsbrev |

**Typisk arbeidsflyt:**

```
Ny låt → Lyrics → Suno prompt → Backstory → Cover/Canvas
       → Kampanje → Distribusjon → Publiser → Story → Vekst
```

---

## Dashboard og onboarding

### Dashboard (`/dashboard`)

Kommandosenter etter innlogging:

- **Oversikt** over artister, aktive releases og neste steg
- **Release readiness** — score per låt (hva mangler før utgivelse)
- **Release tasks** — oppgaver med forfallsdato
- **Quick actions** — opprett artist, ny låt, åpne studio-side
- **Activity feed** — siste aktivitet på kontoen
- **Growth opportunities** og discover-highlights
- **Distribution overview** — status på tvers av låter
- **Artist-administrasjon** — opprett/rediger artist, Spotify-kobling, offentlig side

### Onboarding (`/onboarding`)

8-trinns veiviser for nye brukere:

1. Språk
2. Artistnavn
3. Sjanger
4. Låttittel
5. Tekstutkast
6. Lenker (Spotify, YouTube)
7. Offentlig side (slug, aktivering)
8. Deling (QR, embed-kode)

### Playbook (`/playbook`)

Personlig veiviser med release- og growth-score:

- **Roadmap** — fremdrift % og anbefalte neste oppgaver
- **Growth** — tier (Bronze → Platinum), oppdrag og anbefalinger
- Filtrering per artist

### Landing page (`/`)

Markedsføringsside med produktbeskrivelse og CTA til registrering.

---

## Artist Workspace

**Rute:** `/artist/[id]` med hash-navigasjon mellom seksjoner.

### Oversikt

- Artist-hero med navn, sjanger og Spotify-status
- Hurtighandlinger (ny låt, AI-generering, offentlig side, EPK, growth)
- Statistikk, health score og featured release
- Kampanje- og growth-sammendrag

### Innhold

| Seksjon | Funksjoner |
|---------|------------|
| **Låter** | Liste med status (Draft / In progress / Complete / Released), søk, sortering, drag-and-drop rekkefølge, manuell opprettelse, AI-generering, åpne Song Studio, offentlig/skjult, Spotify-import |
| **Album** | Opprett/rediger album, cover, releasedato, tildel låter |
| **Media** | Artist-spesifikk medievisning (koblet til Media Library) |
| **Stories** | Artist Stories Manager (se [Stories](#stories-og-innholdsmarkedsføring)) |

### Promotering

- **Release-kampanjer** — oversikt over låter med aktiv kampanje
- **Playlist-kampanjer** — egne og joinede fellesskapskampanjer

### Growth

Artist-spesifikke vekstanbefalinger, koblet til Growth Hub og Playbook.

### Brand (Artist Site Studio)

| Panel | Beskrivelse |
|-------|-------------|
| **Overview** | Samlet status for offentlig tilstedeværelse |
| **Theme** | Accent-farge, mal (default/minimal/cinematic), favicon |
| **Homepage** | Seksjoner: hero, Spotify, YouTube, album, låter, bio, sosial, events, newsletter |
| **Stories** | Stories på offentlig artistside |
| **SEO** | Meta-tittel, beskrivelse, OG-bilde |
| **Sharing** | Delingslenker, forhåndsvisning, QR |
| **EPK** | Electronic Press Kit-editor |
| **Fan Hub** | Nyhetsbrev, subscribers, AI-utkast |
| **Events** | Konserter/arrangementer |
| **Analytics** | Artist-spesifikke innsikter |

### Innstillinger (artist)

- Metadata, sjanger, beskrivelse, song structure profile
- Spotify-kobling og sosiale lenker
- AI output language
- Offentlig side slug og enable/disable

**Mobil:** Kompakt hero, mini-header, bottom navigation og «More»-sheet for alle seksjoner.

---

## Opprette nye låter (AI)

**Song Creation Studio** (modal fra Artist Workspace → «Generate songs with AI»):

### Steg 1 — Kontekst

- **Artistprofil** — sjanger, beskrivelse, song structure
- **Produksjons-DNA** — sjanger, vokalstil og produksjonstrekk fra katalogen

### Steg 2 — Intern inspirasjon

Velg eksisterende låter fra katalogen og hva som skal analyseres:

- Temaer, fortelling, atmosfære, struktur, refrengstil, ordvalg, melodisk følelse
- **Song DNA** fra valgte låter (valgfritt)

### Ekstern inspirasjon

Referer til kjente artister/låter **kun for høynivå-inspirasjon** (ikke kopiering):

- Inspirert av artister/band (f.eks. Tool, Evanescence)
- Inspirert av låter (f.eks. Schism by Tool)
- Trekk å låne: mood, energi, struktur, instrumentering, vokalstil, rytme/groove, atmosfære, teksttemaer, produksjonsstil
- Fritekst: «Hva skal ViaTone forstå fra disse referansene?»

### Steg 3 — Beskriv idé

Fritekst om tema, konsept og retning.

### Steg 4 — Generer

- Velg antall låter (1–10)
- AI-provider (Claude / GPT)
- Output-språk
- Generer forslag → rediger tittel/instruksjoner → lagre alle

Ved lagring lagres **kreativ retning** i `publish_content` for videre bruk i Song Studio.

---

## Song Studio

**Rute:** `/song/[id]` med hash-navigasjon mellom paneler.

### Oversikt

- **Release readiness** — score og hva som mangler
- **Creative Direction** — kort med interne/eksterne referanser, trekk og notater
- Offentlig status, engasjement (avspillinger, embed, QR, nyhetsbrev)
- Neste steg og hurtighandlinger

### Write — Lyrics

- Instruksjoner + **AI-generer tekst**
- Chat-stil refine («juster teksten…»)
- **Versjonshistorikk** med gjenoppretting
- **Clean lyrics export** (uten `[Verse]`, markdown)
- **Content limit counter** per AI-plattform (Suno/Udio)
- **Adapt lyrics** — tilpass lengde til plattform
- Artist production profile (valgfritt)
- **Canonical title** — AI endrer ikke lagret låttittel

### Write — Backstory

AI-generert eller manuell bakgrunnshistorie. Vises på offentlig låtside. Beskriver låten med brede musikalske trekk — ikke «høres ut som [artist]».

### Write — Song DNA

Automatisk profil over energi, stemning og karakter (sliders). Regenererbar. Brukes i creative direction.

### Produce — Suno

- **Generate Suno prompt** (compact / detailed)
- Creative direction alignment og komprimering (≤ 1000 tegn for compact)
- **Suno import** — lim inn Suno-URL → henter metadata, audio, cover, tags, lyrics
- Inline audio-avspilling
- Kopier prompt, åpne suno.com/create
- **Import Finished Track** — importer ferdig spor

### Produce — Cover

- Manuell eller **AI-generert** bildeprompt
- **Generate cover** via OpenAI gpt-image-1
- Stil-/mood-chips, aspect ratio, kvalitet
- Opplasting + Asset Picker fra Media Library

### Produce — Canvas

Spotify Canvas-stil 3–10 sek loop-video:

- AI-generering via fal.ai (Seedance Pro) fra prompt eller cover
- Opplasting av egen video
- Aspect ratio og varighet

### Promote — Captions

Per plattform: TikTok, Instagram, Facebook, YouTube, X/Twitter

- AI med plattformregler + egne custom rules
- Tone-valg og språkoverride

### Promote — Kampanjeinnhold

Spotify pitch, sosiale captions, press bio, nyhetsbrev-teaser — AI per asset-type.

### Release — Campaign

- **Release-tidslinje** med forhåndsdefinerte oppgaver (Spotify pitch -14d, sosiale poster, osv.)
- Redigerbare tasks med datoer og status
- WordPress-post, Facebook, Instagram, press release
- Valgfritt inkludere full tekst i publish-generering

### Release — Distribution

Distribusjonsforberedelse (DistroKid-orientert):

- Readiness-score (cover, audio, metadata, credits, osv.)
- ISRC, UPC, distributor, status (setup/submitted/live)
- AI review av distribusjonspakke
- Last ned sammendrag

### Publish — Media

Medielenker: Spotify, YouTube, TikTok, Instagram, Facebook, Apple Music, SoundCloud, Other. Spotify track import via URL. Click tracking.

### Publish — Share

- Offentlig låtside enable/disable
- **QR-kode** (Pro: QR-analytics)
- **Embed player** (`/embed/song/[id]`)
- Delingsknapper og click stats

### Innstillinger

Metadata, status, offentlig synlighet, AI-innstillinger (provider, språk, plattformprofil), koblet story.

---

## Kreativ retning og ekstern inspirasjon

**Creative Continuity Engine** sikrer at låtens retning følges gjennom hele produksjonsflyten.

### Hva lagres

I `publish_content.creative_direction` per låt:

- Artistprofil og produksjons-DNA brukt
- Interne referanselåter (ID + tittel)
- Eksterne artister og låter
- Inspirasjonstrekk (mood, energi, struktur, osv.)
- Brukernotater og original prompt
- Generert konseptsammendrag

### Hvordan det brukes

Alle song-spesifikke AI-kall etter opprettelse mottar:

- **Canonical song title** — tittelen endres ikke uten at du ber om det
- **Creative direction** — konsept, trekk og notater
- **Kontinuitetsregel** — ikke drift i sjanger, mood eller konsept
- **Sikker inspirasjonsregel** — ingen kopiering av tekst, melodier eller hooks

### Creative Direction-kort (Song Studio)

Viser interne/eksterne referanser, trekk og notater.

**Handlinger:**

- **Rediger kreativ retning** — oppdater uten å endre tekst automatisk
- **Bruk på Lyrics** — naviger til tekst med retning
- **Bruk på Suno Prompt** — regenerer Suno-prompt i tråd med retningen

### Kjente artister — sikker formulering

AI oversetter referanser til brede trekk (sjanger, rytme, atmosfære, struktur) — ikke «lag en kopi av Schism».

---

## Stories og innholdsmarkedsføring

### Artist Stories Manager

**Story-typer:**

- Behind the song
- Release story
- Artist journal
- Lyrics meaning
- Campaign update
- Playlist feature
- News

**Workflow:**

1. Opprett/rediger (tittel, slug, excerpt, body, cover, type)
2. Koble til låt
3. Status: draft / scheduled / published / archived
4. **AI Story Assistant** (Pro) — generer fra låt med creative direction
5. SEO-felter (Pro): seo_title, seo_description, og_image
6. Forhåndsvisning og delings-URL

**Offentlige URLer:**

- `/p/{artistSlug}/stories` — liste
- `/p/{artistSlug}/stories/{storySlug}` — enkeltstory

Draft-stories kopierer workspace-lenke (ikke 404 public URL). Publiserte stories viser offentlig lenke med linked song CTAs.

### Fan Hub

- Nyhetsbrev-subscribers fra offentlige sider
- Kilde-statistikk
- **AI newsletter draft** fra valgt låt/kampanjeinnhold
- CSV-eksport (Pro)

### Events

Offentlige konserter på artistsiden når seksjonen er aktivert.

---

## Kampanje og release

### Per-låt (Song Studio Release)

- Tidslinje med dato-offsets
- AI-genererte kampanjeassets
- WordPress, Facebook, Instagram, press release
- Release task tracking på dashboard

### Release readiness

Automatisk score basert på:

- Lyrics, Suno prompt, backstory
- Cover, canvas, media links
- Offentlig side, EPK, kampanjeinnhold
- Plattformtilpasset tekst/prompt

---

## Distribusjon

**Distribution Workflow** forbereder utgivelse (ingen direkte DistroKid-API):

| Felt | Beskrivelse |
|------|-------------|
| Readiness | Checklist → 100% score |
| Metadata | Tittel, artist, dato, explicit, språk, sjanger |
| Identifikatorer | ISRC, UPC |
| Credits | Songwriter, producer, copyright/publishing |
| Status | setup → submitted → live |
| AI review | Advisory feedback på pakken |

---

## Media Library

**Rute:** `/library` (+ integrert i artist workspace og Song Studio)

| Funksjon | Beskrivelse |
|----------|-------------|
| Opplasting | Drag-and-drop, søk, filtrering |
| Asset-typer | Cover, logo, artist photo, banner, EPK, kampanje, QR, sosiale grafikker, proof |
| Synlighet | Private / public / unlisted |
| Featured | Fremhevet på offentlige sider |
| Brand Kit | Pro — samlet visuell profil |
| Campaign packs | Pro — kampanjepakker |
| Usage tracking | Hvilke sider som bruker asset |

---

## Offentlige sider og deling

| Side | URL | Beskrivelse |
|------|-----|-------------|
| Artist landing | `/p/{slug}` | Konfigurerbar artistside med maler |
| Låtside | `/s/{id}` | Cover, player, backstory, lyrics, reaksjoner, kommentarer |
| Story | `/p/{slug}/stories/{storySlug}` | Bloggpost med linked song CTAs |
| EPK | `/epk/{artistSlug}` | Press kit, print-vennlig |
| Embed | `/embed/song/{id}` | Embedbar spiller |
| Studio | `/studio/{slug}` | Manager/studio-side |
| Creator | `/u/{code}` | Creator-profil med follow/message |

### Artist landing page — seksjoner

Hero, bio, sosiale lenker, Spotify embed, YouTube, album, låter (inline audio), events, newsletter, stories, playlist-kampanjer, featured media.

**Maler:** Default, Minimal, Cinematic.

### Deling og SEO

- OG/Twitter meta på alle offentlige sider
- QR-koder med sporbarhet (Pro)
- Trackable links
- JSON-LD for stories og låter

---

## Discover, sosialt og vekst

### Discover (`/discover`)

- Creator-katalog: trending, featured, recently active
- Featured releases
- Offentlige playlist-kampanjer
- Søk og filtrering på sjanger

### Creators (`/creators`)

Søkbar katalog med roller (artist, producer, songwriter, manager, osv.), språk, lokasjon og «open to collab».

### Growth Hub (`/growth`)

- Proofs due, pending reviews
- Growth Engine score og tier
- Playlist-kampanjer
- Fan stats (subscribers, page views, QR, embed)
- Lenker til Playbook og Fan Hub

### Sosialt

| Funksjon | Beskrivelse |
|----------|-------------|
| **Follow** | Følg creators |
| **Reactions** | Emoji på offentlige låter |
| **Comments** | Tråd på låtsider |
| **Referrals** | Poeng, downline, badge tiers |
| **Activity feed** | Following / Everyone |
| **Creator points** | Achievements og badges |

---

## Playlist-fellesskap

**Discover:** `/discover/campaigns`  
**Detalj:** `/playlist-campaigns/[id]`

### Eier

- Opprett kampanje knyttet til Spotify-spilleliste
- Invitasjonslenke, kvalitetssjekkliste, health score
- Godkjenne/avvise medlemmer
- Activity dashboard, Last.fm import
- AI review av aktivitetsbevis (Pro)

### Deltaker

- Be om å bli med (artist + låt + melding)
- Proof submission (lyttebevis, screenshots)
- Participation board, weekly digest
- Streaks og passive participation (Last.fm)

---

## Meldinger og support

| Kanal | Beskrivelse |
|-------|-------------|
| **Direct** | 1:1 mellom creators |
| **Group** | Gruppechat |
| **Support** | Support tickets |
| **ChatDock** | Flytende meldingspanel på tvers av sider |

Realtime via Supabase. Filvedlegg støttes. Uleste badges og mark as read.

---

## Analyse

### Konto-analyse (`/analytics`)

Periode 7/30/90/365 dager, filter per artist:

- Plays, link clicks, comments, reactions, followers
- Daglige grafer, top songs, platform/source breakdown
- Engagement rate, click-through rate

### Charts (`/charts`)

Ukentlig topp 50 og all-time topp 100.

### Per artist / per låt

- Sidevisninger, QR-besøk, embed views/clicks
- Media link clicks, newsletter signups
- Story analytics (per story)

### Pro-analyse

Newsletter analytics, QR analytics, advanced analytics.

---

## Innstillinger, profil og fakturering

### Settings (`/settings`)

- UI-språk (no/en)
- AI output language
- Platform caption rules (egne regler per sosial plattform)
- Last.fm brukernavn + auto-sync

### Studio Settings (`/studio-settings`)

- Studio/offentlig managerside (navn, slug, bio, services, roster)
- Contact form inbox

### Profile (`/profile`)

- Display name, bio, avatar
- Creator catalog: roller, lokasjon, språk, open to collab
- Notification preferences
- Password change

### Billing (`/settings/billing`)

- Current plan, usage (artists, songs, AI denne måneden)
- Upgrade to Pro via Stripe Checkout

---

## AI-muligheter

### Tekst-AI

| Provider | Modell | Bruk |
|----------|--------|------|
| Anthropic | Claude Opus | Standard for tekst |
| OpenAI | GPT-4o | Alternativ provider |

### Bilde-AI

| Provider | Modell | Bruk |
|----------|--------|------|
| OpenAI | gpt-image-1 | Cover-generering |

### Video-AI

| Provider | Modell | Bruk |
|----------|--------|------|
| fal.ai | Seedance Pro | Canvas video |

### AI-plattformprofiler (innholdsgrenser)

| Plattform | Lyrics max | Style prompt max |
|-----------|------------|------------------|
| Suno | ~5000 tegn | ~1000 tegn |
| Udio | ~10000 tegn | ~2000 tegn |
| Generic | Ingen harde grenser | — |
| Custom | Brukerdefinerte | — |

### Output-språk

English, Norwegian, Swedish, Danish, German, French, Spanish, Custom.

### Hva AI brukes til

- Låtideer og konsepter
- Lyrics, refine, adapt
- Suno prompt (compact + detailed)
- Backstory
- Song DNA
- Captions (per plattform)
- Publish-innhold (WordPress, press, sosiale)
- Kampanjeassets
- Cover prompt og bilde
- Canvas prompt og video
- Stories og newsletter
- Distribution review
- EPK-bio
- Playlist activity review (Pro)

---

## Integrasjoner

| Tjeneste | Funksjon |
|----------|----------|
| **Supabase** | Auth, database, storage, realtime |
| **Spotify** | Artist search, track/album/playlist import, metadata |
| **Suno** | Import av ferdig spor via URL |
| **Stripe** | Pro-abonnement og webhooks |
| **OpenAI** | GPT-4o tekst + gpt-image-1 bilder |
| **Anthropic** | Claude tekst |
| **fal.ai** | Canvas video-generering |
| **Resend** | E-post (contact form, newsletter) |
| **Last.fm** | Auto-sync lytteaktivitet for playlist proof |
| **DistroKid** | Referanse i distribusjonsworkflow (manuell) |

---

## Free vs Pro

| Funksjon | Free | Pro |
|----------|------|-----|
| Artister | 1 | Ubegrenset |
| Låter | 10 | Ubegrenset |
| Offentlige sider | 1 | Ubegrenset |
| AI-genereringer/mnd | 25 | 1000 |
| Media assets | 25 × 5 MB | 500 × 20 MB |
| Brand Kit / Campaign packs | Nei | Ja |
| Publiserte stories | 3 | 100 |
| Story AI + SEO | Nei | Ja |
| Playlist-kampanjer | 1 | 20 |
| Proof upload (bilde/CSV) | Nei | Ja |
| Newsletter/QR/advanced analytics | Nei | Ja |
| Embed widget, templates, branding | Nei | Ja |
| Fan Hub CSV + full subscriber list | Nei | Ja |
| Reklame på offentlige sider | Ja | Nei |

---

## Kommende funksjoner

Synlig i kode/UI som «kommer snart» eller disabled:

- Sidebar: **Rapporter**, **Integrasjoner**, **Maler**
- Custom domain og white-label
- Booking calendar
- Collaborator seats
- Direkte audio upload
- Media export placeholders
- Admin campaign safety (utvidet moderering)

---

## Navigasjon — ruteoversikt

### Autentisert

`/dashboard` · `/onboarding` · `/artist/[id]` · `/song/[id]` · `/settings` · `/settings/billing` · `/studio-settings` · `/profile` · `/library` · `/analytics` · `/charts` · `/growth` · `/playbook` · `/discover` · `/discover/campaigns` · `/playlist-campaigns/[id]` · `/creators` · `/feed` · `/referrals` · `/messages` · `/support/new` · `/admin`

### Offentlig

`/` · `/p/[slug]` · `/p/[slug]/stories` · `/s/[id]` · `/embed/song/[id]` · `/epk/[artistSlug]` · `/studio/[slug]` · `/u/[code]` · `/discover` · `/charts` · `/creators` · `/offline`

---

*Sist oppdatert: mai 2026. Basert på ViaTone/Songcraft-kodebasen.*

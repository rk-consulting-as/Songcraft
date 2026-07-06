# ViaTone 2.0 — Audit & Route Plan

## Executive summary

ViaTone 1.x grew into a powerful but **heavy internal artist OS**: Song Studio (10+ panels), Artist Workspace (13 hash sections), dashboard command center, and many parallel tools. That depth is valuable for power users but **hurts first impression** — it feels like admin software, not a music community.

**ViaTone 2.0 reframes the product** around community-first discovery: Circles, Sessions, listening together, and beautiful artist presence. Legacy tools remain reachable but are **de-emphasized**, not deleted.

---

## What to reuse (keep, wire later)

| Existing concept | Maps to v2 | Notes |
|------------------|------------|-------|
| `artists` table | **Artists** | Simpler profile UX; slug via `page_slug` |
| `songs` table | **Songs** | Community submissions; links in `media_links` |
| `/p/[slug]` | **Public artist pages** | Upgrade visuals; link from v2 artist detail |
| `/s/[id]` | **Public song pages** | Keep; link from song cards |
| `playlist_campaigns` | **Circles / Sessions** (evolve) | Closest existing “community unit” |
| `/discover`, `/creators` | **Community discovery** | Merge into Community Home over time |
| `/growth`, `/playbook` | **Growth / Pro** | Secondary nav, not home |
| Messaging / ChatDock | **Session chat** (later) | Keep global chat |
| `profiles`, follow system | **Supporters / reputation** | Soft scores |
| Analytics tables | **Host reports / recap** | Pro feature |
| Free / Pro (`lib/subscription.ts`) | **Pricing hooks** | Extend with Host Pro tier |

---

## What to de-emphasize in v2 MVP (not deleted)

| Legacy surface | Why hide from v2 home |
|----------------|----------------------|
| `/dashboard` | Feels like enterprise dashboard; replace with `/community` |
| `/artist/[id]` full workspace | 13 sections = cognitive overload for new users |
| `/song/[id]` Song Studio | 10 AI panels; overkill for “submit song + get heard” |
| Sidebar Growth/Analytics/Assets first | Wrong priority order for community promise |
| Distribution workflow | Important but post-community MVP |
| Song Creation Studio batch AI | Power feature; not first-run |

**Access pattern:** Legacy routes stay at `/dashboard`, `/artist/…`, `/song/…`. v2 adds “Studio tools” link in settings/overflow for power users.

---

## What maps well today

| v2 pillar | Closest v1 feature |
|-----------|-------------------|
| **Community Home** | `/discover` + `/growth` highlights |
| **Circles** | Playlist communities (genre/mood tags exist) |
| **Sessions** | Playlist campaign listening events + Aigent4U engine |
| **Artists** | Artist records + public pages |
| **Songs** | Songs + media links + public pages |
| **Playlists** | `creator_playlists` + campaign playlists |
| **Stream Engine** | Aigent4U (queue, auto-switch, play logs) |

---

## Assumptions (MVP)

1. **Mock-first UI** for Circles/Sessions; typed data layer ready for Supabase.
2. **Artists/Songs** can later load from existing tables; MVP uses mock + TODO markers.
3. **Route group** at `/community/*` with **own shell** (no legacy sidebar).
4. **Login default** stays `/dashboard` until we flip a feature flag to `/community`.
5. **Host Pro** is UI/pricing only in MVP — no new Stripe products yet.

---

## Proposed route structure (implemented)

```
/community                          → Community Home
/community/circles                  → Circles index
/community/circles/[slug]           → Circle detail
/community/sessions                 → Sessions index
/community/sessions/[id]            → Session detail (+ Stream Engine block)
/community/artists                  → Artists index
/community/artists/[slug]           → Artist detail (public-style)
/community/songs                    → Songs index
/community/songs/[id]               → Song detail (simple)
/community/playlists                → Playlist rooms index
/community/pricing                  → Free / Pro Artist / Host Pro
```

### Legacy (unchanged)

```
/dashboard, /artist/[id], /song/[id], /discover, /growth, …
/p/[slug], /s/[id], /epk/…
```

### Future aliases

- `/community` → default post-login (feature flag)
- `/circles` → redirect to `/community/circles` (optional shorthand)

---

## v2 navigation (sidebar)

1. Community (home)
2. Circles
3. Sessions
4. Artists
5. Songs
6. Playlists
7. Pricing / Upgrade

Footer card: **ViaTone Stream Engine** — Powered by Aigent4U

---

## Data model evolution (post-MVP)

| New / evolved entity | Suggested approach |
|---------------------|------------------|
| `circles` | New table OR extend `playlist_campaigns` with `type=circle` |
| `sessions` | New table linked to `circles`, schedule, platform |
| `session_submissions` | Link `songs` to `sessions` with feedback state |
| `playlist_rooms` | Persistent queue + `creator_playlists` |
| `supporter_scores` | Materialized from activity logs |
| Stream Engine | Aigent4U API integration layer in `lib/v2/streamEngine/` |

---

## Design system

See `app/community/v2-community.css` and `components/v2/`. Tokens match `viatone-v2-community-mvp.html`:

- Dark cinematic base (`#05060d`)
- Purple/cyan accents (`#8b5cf6`, `#00e5ff`)
- Glass cards, gradient heroes, large cover art
- Tags: human / AI / hybrid / platform pills

---

## Success criteria for Phase 1

After login (manual nav to `/community`), user should quickly understand:

1. Who is here (circles, live stats)
2. What sessions are happening
3. How to submit a song
4. How to join a circle
5. How ViaTone helps them get heard

---

*Phase 1 implemented: community shell + MVP screens with mock data.*

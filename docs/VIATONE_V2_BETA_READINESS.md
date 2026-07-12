# ViaTone 2.0 — Closed Beta Readiness Audit (Phase 5C)

**Date:** July 2026  
**Scope:** ViaTone 2.0 Community (`/community/*`) — **not** Legacy Studio (`/dashboard`)  
**Target:** 5–10 real beta users  
**Language:** Community surfaces are **English-only**

---

## Executive summary

| Area | Status | Notes |
|------|--------|-------|
| Core journeys (artist / supporter / host) | **Ready with caveats** | All paths exist; requires migrations + seed |
| Migrations | **Ready** | 10 v2 migrations through `20260706200000` |
| RLS & privacy | **Ready with manual QA** | Default-deny public discovery; checklist provided |
| API error UX | **Improved** | Friendly messages; migration-missing detection added |
| Mobile layout | **Ready with spot-check** | CSS breakpoints at 768px; manual width QA required |
| Notification dedupe | **Ready** | 24h dedupe on follow/save kinds; reminders are read-time only |
| Demo / seed data | **Ready** | Seed + beta readiness migration |
| Admin health panel | **Extended** | V2 community block in Admin → System |
| Feedback capture | **Ready** | Global floating button + community context metadata |
| Performance | **Acceptable for beta** | Discovery summary cached 120s; no blocking N+1 found |
| Beta invite flow | **Ready** | `/community/invite?ref=&entity=&slug=` |

### Go / no-go recommendation

**GO for controlled closed beta (5–10 users)** after:

1. All v2 migrations applied on the target Supabase project (see checklist below).
2. Seed migrations run (`20260706140100` + `20260706200000`).
3. At least **3 test accounts** created: artist, supporter, host (host needs manual Pro override or Host Pro).
4. Admin verifies **System → ViaTone 2.0 Community health** shows migrations OK and upcoming sessions > 0.
5. One person completes `docs/VIATONE_V2_BETA_TEST_SCRIPT.md` end-to-end.

**NO-GO** if v2 tables are missing (app falls back to mock data with yellow “Demo” banners — confusing for real testers).

---

## Part 1 — End-to-end user journeys

### A. New artist

| Step | Route / API | Verified | Notes |
|------|-------------|----------|-------|
| Sign up | `/login?signup=1&next=/community` | ✓ Code | Returns to community after auth |
| Land in community | `/community` | ✓ | Logged-out users redirect to `/community/explore` |
| Onboarding | Welcome modal, Start Here, How it works | ✓ | Low-activity users see guided blocks |
| Create artist/song | `/dashboard` (Legacy Studio) | ✓ Out of scope | Community submit requires `legacySongId` |
| Join circle | `POST /api/v2/community/circles/[slug]/members` | ✓ | `V2JoinCircleButton` |
| Submit song | Circle/session/room submit panels | ✓ | `join_circle_first` if not member |
| Receive feedback | `/community/songs/[id]` | ✓ | `v2_song_feedback` |
| RSVP session | `POST /api/v2/community/sessions/[id]/rsvp` | ✓ | Going auto-saves session (Phase 5B) |
| Participate | Stream Engine join + listen confirm | ✓ | Participation tracked |
| Follow/save | Follow/save APIs + post-auth `?action=` | ✓ | Phase 5B |

**Gap:** Artist must visit Legacy Studio once before community submit — documented in empty states.

### B. Supporter

| Step | Verified | Notes |
|------|----------|-------|
| Discover public content | ✓ | `/community/explore`, entity pages |
| Sign up with `?next=` | ✓ | `buildLoginUrl` / `sanitizeAuthReturnPath` |
| Follow circle | ✓ | Logged-out → login → auto-follow |
| Join session | ✓ | RSVP + optional live join |
| Leave feedback | ✓ | Song page feedback form |
| Supporter score | ✓ | Home + `/community/participation` |
| Notifications | ✓ | In-app center; deduped follow/save kinds |

### C. Host

| Step | Verified | Notes |
|------|----------|-------|
| Host dashboard | ✓ | `/community/host` |
| Create circle/session/room | ✓ | Host Pro gate (`host_pro_required` friendly message) |
| Approve submission | ✓ | Host dashboard + session queue |
| Start/end session | ✓ | Stream Engine `POST .../engine` |
| Complete playlist round | ✓ | `complete_round` action |
| View recap | ✓ | Ended sessions show `V2SessionRecapCard` |
| Host alerts | ✓ | Notifications + host schedule panel |

---

## Part 2 — Migration health

### Required migrations (apply in order)

| Migration file | Layer |
|----------------|-------|
| `20260706120000_v2_community_layer.sql` | Circles, sessions, rooms, feedback, RLS base |
| `20260706140000_v2_community_workflows.sql` | Submission workflows |
| `20260706140100_v2_community_seed.sql` | Demo circles, sessions, rooms |
| `20260706150000_v2_stream_engine_beta.sql` | Play logs, engine meta |
| `20260706160000_v2_supporter_participation.sql` | Scores, badges, participation |
| `20260706170000_v2_community_notifications.sql` | In-app notifications |
| `20260706180000_v2_session_scheduling.sql` | RSVP, calendar, recurrence |
| `20260706190000_v2_community_follows_saves.sql` | Follows, saves, follower counts |
| `20260706190100_v2_community_analytics.sql` | Community analytics event types |
| `20260706200000_v2_beta_readiness.sql` | Demo labels, private QA fixtures |

### Admin check

**Admin → System → ViaTone 2.0 Community health** reports:

- Per-table v2 migration presence
- Upcoming / live session counts
- Public vs private circle counts
- Notification row count
- Orphaned session songs / room items
- Community feedback (30d)
- Active community users (7d)
- Seed detection (`dark-country-circle`)
- Warnings list

### Missing migration behavior

- Data layer returns `fromMock: true` and UI shows **“Demo circle/session…”** banners.
- API errors containing `does not exist` / `PGRST205` map to: *“Community database is not fully set up yet…”*

---

## Part 3 — RLS & privacy

See **`docs/VIATONE_V2_RLS_TEST_CHECKLIST.md`** for step-by-step tests.

**Design principles (implemented):**

- `publicDiscovery.ts` uses service role with explicit `visibility = 'public'` filters.
- `V2PublicRestrictedState` for private/invite entities (no content leak).
- Public queues: **approved only** (`filterPublicSessionQueue`).
- Notifications, follows, saves: **owner-managed** RLS.
- Host actions: `canManageSessionHost` / `canManagePlaylistRoomHost` on APIs.

**Beta QA fixtures** (`20260706200000`):

- `beta-private-lab` circle (`private`)
- `beta-private-session` on that circle — must not appear on explore

---

## Part 4 — Permission & error UX

### API error mapping (`lib/v2/apiErrors.ts`)

| Code | User message |
|------|----------------|
| 401 / `not_authenticated` | Log in to continue. |
| 403 / `host_only` | Only the host can manage this session or room. |
| 403 / `host_pro_required` | Host Pro is required… |
| 404 / `not_found` | We could not find that community item. |
| `join_circle_first` | Join this circle before submitting… |
| Migration missing | Community database is not fully set up yet… |

Client calls use `v2ApiFetch` → `formatV2ApiError` → toast (no raw JSON shown).

### Pages audited

All `/community/*` pages use restricted states or auth CTAs instead of infinite spinners. Empty states guide next action.

---

## Part 5 — Mobile QA

### Breakpoints tested in CSS (`v2-community.css`)

- Global `overflow-x: hidden` on `.v2-community`
- `@media (max-width: 768px)` — hero CTAs, calendar tabs, RSVP rows, share buttons, follow/save toggles
- Feedback FAB z-index raised on community pages (`z-index: 90`)

### Manual test widths (required before beta)

320, 360, 390, 414, 768 — on:

- `/community`, `/community/explore`, `/community/circles/[slug]`, `/community/sessions/[id]`, `/community/playlists/[slug]`, `/community/calendar`, `/community/saved`, `/community/host`, `/community/hosts/[id]`

**Known limitation:** Legacy-styled feedback modal (`BetaLaunchKit`) uses dashboard theme on community pages — functional but visually mixed.

---

## Part 6 — Notification dedupe & spam safety

| Mechanism | Implementation |
|-----------|----------------|
| Follow/save notifications | `filterDeduped()` — same `kind` + `entity_id` + `user_id` within **24h** |
| Session started (joined members) | Existing `session_started` kind — no per-minute repeat from engine |
| Badge earned | One-shot on threshold cross |
| Home reminders | **Computed on read** in `fetchCommunityReminders()` — no DB writes |
| Saved session starting soon | `maybeNotifySavedSessionsStartingSoon()` on home load — deduped |

**Manual verify:** Start same session twice within 24h — followers should get at most one “live” notification.

---

## Part 7 — Demo / seed data

After `20260706140100` + `20260706200000`:

| Entity | Examples |
|--------|----------|
| Public circles (3+) | `dark-country-circle`, `ai-metal-lab`, `nordic-indie-discovery` |
| Upcoming sessions (2+) | `friday-dark-country`, `ai-metal-feedback-night` |
| Completed session | `tidal-discovery-hour` (with recap meta) |
| Playlist room | `weekly-support` |
| Private QA | `beta-private-lab` / `beta-private-session` |
| Host | First `auth.users` row |
| Supporter | Second test account (manual) |

Descriptions prefixed with **`[Beta demo]`** after readiness migration.

---

## Part 8 — Beta admin checklist

Admin panel (`/admin` → System):

- [ ] Legacy migration health (existing)
- [ ] **V2 community health** (new)
- [ ] Public visibility audit (existing)
- [ ] Feedback inbox (filter pages starting with `/community`)
- [ ] Grant Host Pro manual override for beta host account
- [ ] Share invite link: `/community/invite?ref=YOUR_CODE`

---

## Part 9 — Feedback capture

- **Floating button** (all pages including `/community/*`) via `BetaLaunchKit`
- **POST `/api/feedback`** — stores page, type, message, user_agent, community flag, viewport width, ref
- **Screenshot:** placeholder text in modal (no upload in beta)
- Admin inbox: Admin → Feedback

---

## Part 10 — Performance audit

| Area | Finding | Action taken |
|------|---------|--------------|
| Public explore | Service-role queries, limited to 24–32 rows | OK for beta |
| Discovery summary | Uncached aggregate queries | **Cached 120s** (`unstable_cache`) |
| Home personalization | Parallel fetches; follow activity for logged-in users | Acceptable |
| Supporter score | Computed per home load | Acceptable for <10 users |
| Notification dedupe | Per-input DB lookup | OK at beta scale |
| Images | Unsplash URLs with width params | OK |

**Not changed:** Permission-sensitive data is not cached across users.

---

## Part 11 — Beta invite flow

**Invite URL pattern:**

```
/community/invite?ref=BETA01
/community/invite?ref=BETA01&entity=circle&slug=dark-country-circle
/community/invite?ref=BETA01&entity=session&id=<session-uuid>
/community/invite?ref=BETA01&entity=host&id=<user-uuid>
```

After signup/login, user returns to entity with `?ref=` preserved for analytics.

---

## Part 12 — Related docs

- `docs/VIATONE_V2_RLS_TEST_CHECKLIST.md` — privacy QA (technical)
- `docs/VIATONE_V2_BETA_TEST_SCRIPT.md` — non-technical tester script
- `docs/V2-COMMUNITY-BETA-CHECKLIST.md` — earlier phase checklist (still valid)

---

## Part 13 — Critical issues found & fixed in 5C

| Issue | Severity | Fix |
|-------|----------|-----|
| No v2-specific admin health | High | `lib/admin/v2MigrationHealth.ts` + admin panel section |
| API errors for missing migrations opaque | Medium | `formatV2ApiError` migration detection |
| Feedback lacked community context | Low | Metadata: viewport, community flag, ref |
| No dedicated beta invite landing | Medium | `/community/invite` |
| Demo data not clearly labeled in DB | Low | `20260706200000` description prefixes |
| No private QA fixtures | Medium | `beta-private-lab` in readiness migration |
| Discovery summary uncached | Low | 120s cache |

---

## Known limitations (beta)

1. **Host Pro** — soft gating; Stripe may be optional if manual override granted.
2. **English only** on community — by design.
3. **Stream Engine** — manual host playback; not true synchronized streaming.
4. **Participation** — honor-system listen confirm; not verified streams.
5. **Calendar tab URL** — internal fetch only (does not update browser URL).
6. **Feedback modal styling** — legacy theme on community pages.
7. **No automated E2E** — manual test script required.
8. **Playlist room RLS** — public discovery joins circle visibility explicitly; direct slug access still needs member check on page.

---

## Beta test accounts & data needed

| Account | Role | Setup |
|---------|------|-------|
| `beta-host@…` | Host | Manual Pro override; runs seed as oldest user |
| `beta-artist@…` | Artist | 1 artist + 1 song in Legacy Studio |
| `beta-supporter@…` | Supporter | No songs; joins/follows/feedback only |
| `beta-admin@…` | Admin | `profiles.role = admin` for health panel |

**Data:** Run both seed migrations after first user exists.

---

## Migration checklist (deploy)

```bash
# Apply all migrations in supabase/migrations/ (20260706120000 through 20260706200000)
# Verify in Admin → System → ViaTone 2.0 Community health
# Create test accounts
# Share: https://YOUR_DOMAIN/community/invite?ref=BETA01
```

---

*Phase 5C complete. Legacy Studio unchanged. Community shell unchanged.*

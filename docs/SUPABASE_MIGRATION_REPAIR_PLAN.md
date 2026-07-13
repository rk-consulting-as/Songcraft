# Supabase Migration History Audit & Repair Plan

**Project:** `C:\Users\runek\OneDrive\Dokumenter\GitHub\Songcraft`  
**Audit date:** 2026-07-13  
**Local migration files:** 65  
**Status:** Renames completed 2026-07-13 — see **Implementation** section below.

---

## Executive summary

The local `supabase/migrations` folder contains **8 duplicate migration version groups** (28 files sharing 8 short numeric prefixes). Supabase CLI records migrations by **numeric version only** (the leading digits before the first `_`). When multiple files share a version (e.g. `20260428`), only **one row** can exist in `supabase_migrations.schema_migrations`, and `db push` cannot reliably apply the full intended history.

Remote history currently shows only version **`20260428`**, while prior `db push` output indicated many tables/columns/indexes **already exist** on the remote database. This pattern means:

1. Schema was likely applied **partially via CLI**, **via SQL Editor**, or through **duplicate-version collisions**.
2. Remote migration history is **far behind** actual schema state.
3. Phase **6A–6C** migrations (`20260713*`) are **very likely not applied** until verified.
4. Repair requires **read-only verification first**, then **filename normalization**, then **selective `migration repair`**, then **`db push` only for genuinely new migrations**.

---

## Commands that must NOT be run yet

Do **not** execute any of these until this plan is reviewed and remote verification is complete:

```bash
# DO NOT RUN YET
supabase db push
supabase migration repair --status applied ...
supabase migration repair --status reverted ...
supabase db reset
supabase db pull   # overwrites local migration assumptions
```

Also avoid:

- Renaming migration files before reviewing verification results
- Marking migrations `applied` without matching schema evidence
- Re-running non-idempotent seed migrations on production

---

## Duplicate version groups

Supabase treats the version as the leading integer. These groups collide:

| Version | Files | Count |
|---------|-------|------:|
| `20260428` | `albums`, `artist_spotify_links`, `song_spotify_import` | 3 |
| `20260429` | `artist_public_page`, `song_position`, `song_suno_audio`, `studio_pages` | 4 |
| `20260430` | `favicons`, `song_canvas`, `song_featured_studio` | 3 |
| `20260514` | `fix_signup_trigger`, `multitenant_rls`, `profile_settings_columns`, `signup_referral_metadata`, `spotify_claim_uniqueness` | 5 |
| `20260515` | `follows_activity_feed`, `profile_creator_fields`, `transfer_referrer_rpc` | 3 |
| `20260516` | `chat_rls_fix`, `chat_system`, `log_song_play_rpc`, `song_plays` | 4 |
| `20260517` | `chat_extensions`, `notification_prefs`, `notification_triggers`, `song_comments_reactions` | 4 |
| `20260518` | `distribution_tracking`, `page_templates` | 2 |

**Total duplicate-group files:** 28  
**Unique-version files (no collision):** 37

### Additional concern: near-duplicate content

| File | Issue |
|------|--------|
| `20260517_song_comments_reactions.sql` | Creates `song_comments`, `song_reactions` |
| `20260517180106_add_project_tables.sql` | **Also** creates `song_comments`, `song_reactions` |

These have **different versions** but overlapping DDL. If both ran, idempotent `CREATE TABLE IF NOT EXISTS` is safe; policies/triggers may have been applied twice. Verify table exists once; do not re-push both blindly.

---

## Proposed filename mapping

**Rule:** Preserve remote-recorded **`20260428`** on exactly **one** file. Assign **unique 14-digit timestamps** to all other files in duplicate groups, ordered by **logical dependency** within each day.

### Group `20260428` — preserve remote version

Remote `schema_migrations` contains `20260428`. **Default hypothesis:** the recorded version maps to the **lexicographically first** local file (Supabase CLI behavior when versions collide).

| Current filename | Proposed filename | Action |
|------------------|-------------------|--------|
| `20260428_albums.sql` | **`20260428_albums.sql`** | **KEEP** (matches remote version) |
| `20260428_artist_spotify_links.sql` | `20260428100000_artist_spotify_links.sql` | Rename (runs before albums logically) |
| `20260428_song_spotify_import.sql` | `20260428100100_song_spotify_import.sql` | Rename |

**Verification override:** If remote has `artists.spotify_url` + `songs.spotify_track_id` but **no** `albums` table, keep `20260428` on `artist_spotify_links` instead and renumber `albums`. Run `scripts/verify-remote-migrations.sql` section 2.

### Group `20260429`

| Current | Proposed |
|---------|----------|
| `20260429_artist_public_page.sql` | `20260429100000_artist_public_page.sql` |
| `20260429_song_position.sql` | `20260429100100_song_position.sql` |
| `20260429_song_suno_audio.sql` | `20260429100200_song_suno_audio.sql` |
| `20260429_studio_pages.sql` | `20260429100300_studio_pages.sql` |

### Group `20260430`

| Current | Proposed |
|---------|----------|
| `20260430_favicons.sql` | `20260430100000_favicons.sql` |
| `20260430_song_canvas.sql` | `20260430100100_song_canvas.sql` |
| `20260430_song_featured_studio.sql` | `20260430100200_song_featured_studio.sql` |

### Group `20260514`

| Current | Proposed |
|---------|----------|
| `20260514_profile_settings_columns.sql` | `20260514100000_profile_settings_columns.sql` |
| `20260514_signup_referral_metadata.sql` | `20260514100100_signup_referral_metadata.sql` |
| `20260514_fix_signup_trigger.sql` | `20260514100200_fix_signup_trigger.sql` |
| `20260514_multitenant_rls.sql` | `20260514100300_multitenant_rls.sql` |
| `20260514_spotify_claim_uniqueness.sql` | `20260514100400_spotify_claim_uniqueness.sql` |

### Group `20260515`

| Current | Proposed |
|---------|----------|
| `20260515_follows_activity_feed.sql` | `20260515100000_follows_activity_feed.sql` |
| `20260515_profile_creator_fields.sql` | `20260515100100_profile_creator_fields.sql` |
| `20260515_transfer_referrer_rpc.sql` | `20260515100200_transfer_referrer_rpc.sql` |

### Group `20260516`

| Current | Proposed |
|---------|----------|
| `20260516_chat_system.sql` | `20260516100000_chat_system.sql` |
| `20260516_chat_rls_fix.sql` | `20260516100100_chat_rls_fix.sql` |
| `20260516_log_song_play_rpc.sql` | `20260516100200_log_song_play_rpc.sql` |
| `20260516_song_plays.sql` | `20260516100300_song_plays.sql` |

### Group `20260517`

| Current | Proposed |
|---------|----------|
| `20260517_notification_prefs.sql` | `20260517100000_notification_prefs.sql` |
| `20260517_notification_triggers.sql` | `20260517100100_notification_triggers.sql` |
| `20260517_chat_extensions.sql` | `20260517100200_chat_extensions.sql` |
| `20260517_song_comments_reactions.sql` | `20260517100300_song_comments_reactions.sql` |

Note: `20260517180106_add_project_tables.sql` already has a unique 14-digit version — **no rename**.

### Group `20260518`

| Current | Proposed |
|---------|----------|
| `20260518_distribution_tracking.sql` | `20260518100000_distribution_tracking.sql` |
| `20260518_page_templates.sql` | `20260518100100_page_templates.sql` |

### Files already using unique 14-digit versions (no rename)

`20260501_profiles_referrals.sql`, `20260517180106_add_project_tables.sql`, `20260519120000_discover_spotlight_setting.sql`, `20260519140000_media_assets.sql`, `20260520120000_playlist_communities.sql`, `20260521120000_campaign_activity_logs.sql`, `20260524120000_playlist_archive.sql`, `20260525120000_lastfm_proof_import.sql`, `20260526120000_passive_participation_engine.sql`, `20260528120000_song_creation_studio.sql`, `20260529120000_artist_stories.sql`, `20260530120000_story_analytics_scheduled.sql`, and all `20260706*` / `20260713*` files.

### Singleton 8-digit files (unique but recommend eventual normalization)

These do not collide today but are inconsistent with 14-digit convention:

`20260519_song_backstory_link_clicks.sql`, `20260520_fan_growth_pack.sql`, `20260521_fan_growth_quality_tracking.sql`, `20260522_stripe_free_pro_plans.sql`, `20260523_embed_widget_events.sql`, `20260524_onboarding_wizard.sql`, `20260525_fan_hub_newsletter_activation.sql`, `20260526_saas_admin_control_center.sql`, `20260527_beta_launch_polish.sql`, `20260528_manual_pro_access.sql`, `20260529_english_default_ai_output_language.sql`

**Optional later:** renumber to `20260519100000_*` etc. Not required for duplicate repair.

---

## Migration safety classification

Legend:

- **A** — Likely already applied remotely (schema + production usage)
- **B** — Possibly applied; requires `verify-remote-migrations.sql`
- **C** — Likely not applied; safe to `db push` after history repair
- **⚠** — Not safely idempotent; extra care on re-run

### Era: 20260428–20260501 (foundation)

| File | Class | Key objects | Idempotency notes |
|------|-------|-------------|-----------------|
| `20260428_albums` | **A/B** | `albums`, `songs.album_id`, RLS | Guarded policies ✓ |
| `20260428_artist_spotify_links` | **A** | `artists.spotify_*`, `social_links` | `ADD COLUMN IF NOT EXISTS` ✓ |
| `20260428_song_spotify_import` | **A** | `songs.spotify_*`, status CHECK | **⚠** drops/recreates `songs_status_check` |
| `20260429_*` (×4) | **A/B** | artist page cols, song cols, `studio_pages` | Mostly IF NOT EXISTS |
| `20260430_*` (×3) | **A/B** | favicon cols, canvas, featured | ALTER IF NOT EXISTS |
| `20260501_profiles_referrals` | **A** | `profiles`, referrals, points, triggers | **⚠** INSERT seeds, CREATE TRIGGER |

### Era: 20260514–20260518 (RLS, social, chat)

| File | Class | Key objects | Idempotency notes |
|------|-------|-------------|-----------------|
| `20260514_*` (×5) | **A** | multitenant RLS, signup fn, spotify claim | **⚠** policies without guards in multitenant_rls |
| `20260515_*` (×3) | **A** | `follows`, `activity_feed`, triggers | **⚠** INSERT + triggers |
| `20260516_*` (×4) | **A** | chat tables, `song_plays`, RPCs | chat_rls_fix uses DROP POLICY ✓ |
| `20260517_*` (×4) | **A** | notifications, comments, chat ext | **⚠** bulk INSERT notification prefs |
| `20260517180106_add_project_tables` | **A/B** | duplicate comments tables? | Verify before repair |
| `20260518_*` (×2) | **A/B** | `affiliate_clicks`, page templates | |

### Era: 20260519–20260530 (growth, billing, stories)

| File | Class | Key objects | Idempotency notes |
|------|-------|-------------|-----------------|
| `20260519_song_backstory_link_clicks` | **A** | `link_clicks` | |
| `20260519120000_discover_spotlight_setting` | **A/B** | admin settings INSERT | **⚠** INSERT |
| `20260519140000_media_assets` | **A** | `media_assets`, storage bucket | **⚠** storage INSERT |
| `20260520_fan_growth_pack` | **A** | newsletter, events | |
| `20260520120000_playlist_communities` | **A** | playlist campaigns | |
| `20260521_fan_growth_quality_tracking` | **A** | `analytics_events` | |
| `20260521120000_campaign_activity_logs` | **A** | activity logs | |
| `20260522_stripe_free_pro_plans` | **A** | plans, subscriptions, AI usage | **⚠** INSERT plans/limits |
| `20260523_embed_widget_events` | **A** | analytics constraint | **⚠** DROP/CREATE constraint |
| `20260524_onboarding_wizard` | **A** | onboarding | DROP/CREATE policies |
| `20260524120000_playlist_archive` | **A** | archive cols | |
| `20260525_fan_hub_newsletter_activation` | **A** | newsletter cols | |
| `20260525120000_lastfm_proof_import` | **A** | lastfm cols | |
| `20260526_saas_admin_control_center` | **A** | admin tables | **⚠** INSERT settings |
| `20260526120000_passive_participation_engine` | **A** | streaks, suggestions | |
| `20260527_beta_launch_polish` | **A** | `beta_feedback` | **⚠** INSERT |
| `20260528_manual_pro_access` | **A** | manual overrides | |
| `20260528120000_song_creation_studio` | **A** | song studio cols | |
| `20260529_english_default_ai_output_language` | **A** | profile default | |
| `20260529120000_artist_stories` | **A** | `artist_stories` | |
| `20260530120000_story_analytics_scheduled` | **A** | story scheduling, analytics | **⚠** DROP/CREATE policies + constraints |

### Era: 20260706* — ViaTone 2.0 community

| File | Class | Key objects | Idempotency notes |
|------|-------|-------------|-----------------|
| `20260706120000_v2_community_layer` | **B/C** | all `v2_*` core tables | Guarded policies ✓ |
| `20260706140000_v2_community_workflows` | **B/C** | `v2_circle_songs`, reports, extra RLS | DROP POLICY guarded |
| `20260706140100_v2_community_seed` | **B/C** | seed circles/sessions | **⚠** INSERT; uses ON CONFLICT in DO block |
| `20260706150000_v2_stream_engine_beta` | **B/C** | `v2_session_play_logs` | |
| `20260706160000_v2_supporter_participation` | **B/C** | playlist participation | |
| `20260706170000_v2_community_notifications` | **B/C** | notifications table | |
| `20260706180000_v2_session_scheduling` | **B/C** | RSVP/scheduling cols | |
| `20260706190000_v2_community_follows_saves` | **B/C** | follows, saves | trigger |
| `20260706190100_v2_community_analytics` | **B/C** | analytics_events constraints | **⚠** DROP/CREATE constraints |
| `20260706200000_v2_beta_readiness` | **B/C** | extra seed | **⚠** INSERT; overlaps seed migration |

### Era: 20260713* — Phase 6A–6C (playback, curator, Spotify)

| File | Class | Key objects | Idempotency notes |
|------|-------|-------------|-----------------|
| `20260713120000_playback_evidence_engine` | **C** | `playlist_snapshots`, `playback_*` | Guarded policies ✓ |
| `20260713140000_v2_curator_rooms` | **C** | `v2_curator_linked_playlists`, room cols | **⚠** DROP/ADD status CHECK |
| `20260713160000_v2_spotify_connections` | **C** | Spotify OAuth tables | **⚠** ALTER sync_status CHECK |
| `20260713161000_spotify_analytics_events` | **C** | analytics spotify event types | **⚠** DROP/CREATE constraints |

---

## Non-idempotent migration patterns (project-wide)

| Pattern | Examples | Risk if re-run |
|---------|----------|----------------|
| `CREATE POLICY` without `pg_policies` guard | `20260514_multitenant_rls.sql`, many chat policies | `policy already exists` error |
| `INSERT INTO` without `ON CONFLICT` | `20260522` plans, `20260527` beta settings, seeds | duplicate rows |
| `DROP CONSTRAINT` + `ADD CONSTRAINT` | `analytics_events` (60523, 60706190100, 60713161000) | brief lock; fails if constraint name differs |
| `CREATE TRIGGER` without `DROP IF EXISTS` | some older files | duplicate trigger error |
| `ALTER TABLE songs` status CHECK drop/recreate | `20260428_song_spotify_import` | may fail if constraint renamed |
| Seed migrations | `20260706140100`, `20260706200000` | duplicate seed slugs if ON CONFLICT missing |
| Storage bucket INSERT | `20260519140000_media_assets` | duplicate bucket error |

**Mitigation:** For **repair --status applied**, never re-execute these on remote. Only mark applied after verification. For **db push**, only run migrations classified **C** that are missing.

---

## Likely repair vs push matrix

After running `scripts/verify-remote-migrations.sql`:

### Likely `migration repair --status applied` (schema EXISTS, history MISSING)

All migrations classified **A** where verification shows objects exist, **plus** any **B** confirmed present — **except** do not mark **C** as applied without evidence.

**Candidates (if schema confirmed):**

- Entire pre-`20260706` chain (37+ files depending on verification)
- Possibly all `20260706120000` → `20260706200000` if `v2_circles` exists
- **Not** `20260713*` unless tables exist

### Should actually be pushed (`db push` executes SQL)

**Expected push targets (if verification shows MISSING):**

1. `20260713120000_playback_evidence_engine.sql`
2. `20260713140000_v2_curator_rooms.sql`
3. `20260713160000_v2_spotify_connections.sql`
4. `20260713161000_spotify_analytics_events.sql`

And any `20260706*` files where `v2_*` / playback tables are missing.

### Requires manual remote verification before any action

| Migration | Verify |
|-----------|--------|
| `20260428_*` | Which of albums / artist spotify / song spotify exists; maps to preserved `20260428` |
| `20260517180106` vs `20260517_song_comments` | Single `song_comments` table only |
| `20260706140100` + `20260706200000` | Seed slugs present without duplicates |
| `20260706190100` vs `20260713161000` | analytics constraint includes community + spotify types |
| `20260713140000` before `20260713160000` | curator linked playlists before Spotify alters sync_status |

---

## Recommended repair sequence (execute later)

### Phase 0 — Backup & baseline (required)

```bash
# 1. Full logical backup (Supabase dashboard → Database → Backups, or pg_dump)
# 2. Export current migration history
# Run in SQL editor:
#   SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
# 3. Run scripts/verify-remote-migrations.sql — save results
```

### Phase 1 — Review & approve renames (local only)

After verification review, rename **20 files** per mapping above (keep `20260428_albums.sql` as-is unless verification overrides).

```bash
# Example only — DO NOT RUN until approved
# git mv supabase/migrations/20260428_artist_spotify_links.sql supabase/migrations/20260428100000_artist_spotify_links.sql
```

Use `git mv` to preserve history. Commit renames alone.

### Phase 2 — Align remote history (no SQL execution)

For each migration where verification returned **EXISTS**, mark applied:

```bash
# DO NOT RUN YET — example pattern only
supabase migration repair --status applied 20260428
supabase migration repair --status applied 20260428100000
supabase migration repair --status applied 20260428100100
# ... continue in chronological order for every verified migration
```

**Critical rules:**

- One `repair` per **unique** version after renames
- Chronological order must match dependency order
- **Never** mark `20260713*` applied unless `playlist_snapshots` / `v2_spotify_connections` exist

### Phase 3 — Push only missing migrations

```bash
# DO NOT RUN YET
supabase db push
```

Expect only **C**-classified migrations to execute. If push attempts to re-create existing objects, **stop** and mark that migration `applied` instead.

### Phase 4 — Post-push verification

```bash
# Re-run scripts/verify-remote-migrations.sql section 1 + 9
npm run build
npx tsc --noEmit
```

Admin → System health → confirm v2 + playback + Spotify tables.

---

## Rollback / backup precautions

1. **Take a backup** before any `repair` or `push` (Supabase Pro PITR or manual `pg_dump`).
2. **Never `db reset`** on production-linked project.
3. **`migration repair` is history-only** — it does not roll back schema. Wrong `applied` mark causes future push to skip needed DDL.
4. **Wrong `reverted` mark** can cause `db push` to re-run destructive/non-idempotent SQL.
5. Keep a CSV of `schema_migrations` before/after repair.
6. Test the full repair sequence on a **Supabase branch** or staging project first if available.

---

## Phase 6A–6C dependency order (push order)

When pushing fresh:

```
20260713120000_playback_evidence_engine.sql
20260713140000_v2_curator_rooms.sql      -- requires v2_playlist_rooms
20260713160000_v2_spotify_connections.sql -- requires playback_sessions, v2_curator_linked_playlists
20260713161000_spotify_analytics_events.sql -- requires analytics_events
```

All require `20260706120000_v2_community_layer.sql` (and curator migration requires playlist room items).

---

## Local QA (completed for this audit)

```text
npm run build     — passed (2026-07-13 audit run)
npx tsc --noEmit  — passed
```

---

## Next actions for maintainer

1. Run `scripts/verify-remote-migrations.sql` on remote; save output.
2. Decide whether `20260428` maps to `albums` or `artist_spotify_links` (section 2 results).
3. Approve rename mapping in this document.
4. Apply renames locally (`git mv`).
5. Execute Phase 2 `migration repair` list (generated from verification).
6. Execute `db push` only for confirmed-missing migrations.
7. Update `lib/admin/v2MigrationHealth.ts` migration hints if filenames change.

---

## Appendix: full chronological file list (current names)

<details>
<summary>65 files sorted by effective version</summary>

1. `20260428_albums.sql` **(KEEP remote version)**
2. `20260428_artist_spotify_links.sql` → rename
3. `20260428_song_spotify_import.sql` → rename
4. `20260429_artist_public_page.sql` → rename
5. `20260429_song_position.sql` → rename
6. `20260429_song_suno_audio.sql` → rename
7. `20260429_studio_pages.sql` → rename
8. `20260430_favicons.sql` → rename
9. `20260430_song_canvas.sql` → rename
10. `20260430_song_featured_studio.sql` → rename
11. `20260501_profiles_referrals.sql`
12. `20260514_fix_signup_trigger.sql` → rename
13. `20260514_multitenant_rls.sql` → rename
14. `20260514_profile_settings_columns.sql` → rename
15. `20260514_signup_referral_metadata.sql` → rename
16. `20260514_spotify_claim_uniqueness.sql` → rename
17. `20260515_follows_activity_feed.sql` → rename
18. `20260515_profile_creator_fields.sql` → rename
19. `20260515_transfer_referrer_rpc.sql` → rename
20. `20260516_chat_rls_fix.sql` → rename
21. `20260516_chat_system.sql` → rename
22. `20260516_log_song_play_rpc.sql` → rename
23. `20260516_song_plays.sql` → rename
24. `20260517_chat_extensions.sql` → rename
25. `20260517_notification_prefs.sql` → rename
26. `20260517_notification_triggers.sql` → rename
27. `20260517_song_comments_reactions.sql` → rename
28. `20260517180106_add_project_tables.sql`
29. `20260518_distribution_tracking.sql` → rename
30. `20260518_page_templates.sql` → rename
31. `20260519_song_backstory_link_clicks.sql`
32. `20260519120000_discover_spotlight_setting.sql`
33. `20260519140000_media_assets.sql`
34. `20260520_fan_growth_pack.sql`
35. `20260520120000_playlist_communities.sql`
36. `20260521_fan_growth_quality_tracking.sql`
37. `20260521120000_campaign_activity_logs.sql`
38. `20260522_stripe_free_pro_plans.sql`
39. `20260523_embed_widget_events.sql`
40. `20260524_onboarding_wizard.sql`
41. `20260524120000_playlist_archive.sql`
42. `20260525_fan_hub_newsletter_activation.sql`
43. `20260525120000_lastfm_proof_import.sql`
44. `20260526_saas_admin_control_center.sql`
45. `20260526120000_passive_participation_engine.sql`
46. `20260527_beta_launch_polish.sql`
47. `20260528_manual_pro_access.sql`
48. `20260528120000_song_creation_studio.sql`
49. `20260529_english_default_ai_output_language.sql`
50. `20260529120000_artist_stories.sql`
51. `20260530120000_story_analytics_scheduled.sql`
52. `20260706120000_v2_community_layer.sql`
53. `20260706140000_v2_community_workflows.sql`
54. `20260706140100_v2_community_seed.sql`
55. `20260706150000_v2_stream_engine_beta.sql`
56. `20260706160000_v2_supporter_participation.sql`
57. `20260706170000_v2_community_notifications.sql`
58. `20260706180000_v2_session_scheduling.sql`
59. `20260706190000_v2_community_follows_saves.sql`
60. `20260706190100_v2_community_analytics.sql`
61. `20260706200000_v2_beta_readiness.sql`
62. `20260713120000_playback_evidence_engine.sql`
63. `20260713140000_v2_curator_rooms.sql`
64. `20260713160000_v2_spotify_connections.sql`
65. `20260713161000_spotify_analytics_events.sql`

</details>

---

## Implementation (2026-07-13)

### Final rename mapping (completed via `git mv`)

| Old filename | New filename |
|--------------|--------------|
| `20260428_albums.sql` | **unchanged** (remote version `20260428`) |
| `20260428_artist_spotify_links.sql` | `20260428100000_artist_spotify_links.sql` |
| `20260428_song_spotify_import.sql` | `20260428100100_song_spotify_import.sql` |
| `20260429_artist_public_page.sql` | `20260429100000_artist_public_page.sql` |
| `20260429_song_position.sql` | `20260429100100_song_position.sql` |
| `20260429_song_suno_audio.sql` | `20260429100200_song_suno_audio.sql` |
| `20260429_studio_pages.sql` | `20260429100300_studio_pages.sql` |
| `20260430_favicons.sql` | `20260430100000_favicons.sql` |
| `20260430_song_canvas.sql` | `20260430100100_song_canvas.sql` |
| `20260430_song_featured_studio.sql` | `20260430100200_song_featured_studio.sql` |
| `20260514_profile_settings_columns.sql` | `20260514100000_profile_settings_columns.sql` |
| `20260514_signup_referral_metadata.sql` | `20260514100100_signup_referral_metadata.sql` |
| `20260514_fix_signup_trigger.sql` | `20260514100200_fix_signup_trigger.sql` |
| `20260514_multitenant_rls.sql` | `20260514100300_multitenant_rls.sql` |
| `20260514_spotify_claim_uniqueness.sql` | `20260514100400_spotify_claim_uniqueness.sql` |
| `20260515_follows_activity_feed.sql` | `20260515100000_follows_activity_feed.sql` |
| `20260515_profile_creator_fields.sql` | `20260515100100_profile_creator_fields.sql` |
| `20260515_transfer_referrer_rpc.sql` | `20260515100200_transfer_referrer_rpc.sql` |
| `20260516_chat_system.sql` | `20260516100000_chat_system.sql` |
| `20260516_chat_rls_fix.sql` | `20260516100100_chat_rls_fix.sql` |
| `20260516_log_song_play_rpc.sql` | `20260516100200_log_song_play_rpc.sql` |
| `20260516_song_plays.sql` | `20260516100300_song_plays.sql` |
| `20260517_notification_prefs.sql` | `20260517100000_notification_prefs.sql` |
| `20260517_notification_triggers.sql` | `20260517100100_notification_triggers.sql` |
| `20260517_chat_extensions.sql` | `20260517100200_chat_extensions.sql` |
| `20260517_song_comments_reactions.sql` | `20260517100300_song_comments_reactions.sql` |
| `20260518_distribution_tracking.sql` | `20260518100000_distribution_tracking.sql` |
| `20260518_page_templates.sql` | `20260518100100_page_templates.sql` |

**Result:** 65 files, **zero duplicate version prefixes**.

### Why `migration repair` does not execute SQL

`supabase migration repair --status applied <version>` only inserts a row into `supabase_migrations.schema_migrations`. It tells the CLI the migration was already applied. It does **not** run the `.sql` file. This is safe when remote schema already matches the migration's intended effect.

### Why renamed files need matching repaired versions

Supabase matches history by **version number** extracted from the filename. After renames, local files have new unique versions. Remote must have matching version rows or `db push` will attempt to run SQL again (causing "already exists" errors).

### Repair tooling

| Artifact | Purpose |
|----------|---------|
| `docs/SUPABASE_MIGRATION_APPLIED_VERSIONS.md` | Verified version list |
| `scripts/repair-supabase-migration-history.ps1` | Dry-run / execute repair |
| `scripts/verify-supabase-migration-repair.ps1` | Post-repair alignment check |
| `scripts/verify-remote-migrations.sql` | Remote schema verification |

### Dry-run (default)

```powershell
cd C:\Users\runek\OneDrive\Dokumenter\GitHub\Songcraft
.\scripts\repair-supabase-migration-history.ps1
```

Prints 62 `migration repair --status applied` commands. **Does not modify remote.**

### Execute (after review)

```powershell
.\scripts\repair-supabase-migration-history.ps1 -Execute
```

- Requires clean git tree (or `-Force`)
- Confirms `YES` then confirms each batch of 10
- Logs to `logs/supabase-migration-repair-<timestamp>.log`
- **Does not run `db push`**

### Post-repair verification

```powershell
.\scripts\verify-supabase-migration-repair.ps1
```

### Manual-review migrations (repair separately)

After section 10 SQL checks in `verify-remote-migrations.sql`:

- `20260517180106`
- `20260706140100`
- `20260706200000`

### Future migration naming policy

1. **Every new migration** must use a **unique 14-digit timestamp**: `YYYYMMDDHHMMSS`
2. **No day-only prefixes** (`20260428` style) — causes version collisions
3. **Format:** `YYYYMMDDHHMMSS_short_description.sql`
4. **Example:** `20260713170000_add_feature_x.sql`
5. Before commit, run: `.\scripts\verify-supabase-migration-repair.ps1`

### Rollback / restore precautions

1. Export `supabase_migrations.schema_migrations` before repair
2. Full database backup before any `db push`
3. Wrong `applied` mark → fix with `migration repair --status reverted <version>` (use carefully)
4. Repair logs are gitignored under `logs/`

### Expected `db push` outcome after full repair

| Scenario | `db push` |
|----------|-----------|
| All 62 verified + 3 manual marked applied | No pending migrations |
| 62 verified only; 3 manual unapplied | May attempt seed INSERTs — review first |
| Repair not run | **Unsafe** — duplicate version / replay errors |


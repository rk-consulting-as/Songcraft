# Supabase Migration Applied Versions

**Generated:** 2026-07-13  
**Purpose:** Definitive list for `supabase migration repair --status applied`  
**Source:** Read-only remote verification + production schema parity  
**Script:** `scripts/repair-supabase-migration-history.ps1`

---

## Summary

| Category | Count | Action |
|----------|------:|--------|
| Verified applied (repair) | 62 | `migration repair --status applied` |
| Manual review required | 3 | Verify seed/duplicate DDL before repair |
| Remote pre-existing | 1 | `20260428` already on remote — skip or no-op |
| **Total local migrations** | **65** | |

After repair, `db push` should be safe **except** for the 3 manual-review versions (if still local-only).

---

## Verified applied (62 versions)

These migrations' schema effects are confirmed on remote. Mark as applied **without re-running SQL**.

| Version | Filename | Expected object(s) | Verification evidence | Action |
|---------|----------|-------------------|----------------------|--------|
| `20260428` | `20260428_albums.sql` | `albums`, `songs.album_id` | Remote history + `albums` EXISTS | **Already on remote** |
| `20260428100000` | `20260428100000_artist_spotify_links.sql` | `artists.spotify_url`, etc. | Column EXISTS | repair applied |
| `20260428100100` | `20260428100100_song_spotify_import.sql` | `songs.spotify_track_id`, etc. | Column EXISTS | repair applied |
| `20260429100000` | `20260429100000_artist_public_page.sql` | `artists.page_slug`, page cols | Production artist pages | repair applied |
| `20260429100100` | `20260429100100_song_position.sql` | `songs.position` | Idempotent ALTER; prod ordering | repair applied |
| `20260429100200` | `20260429100200_song_suno_audio.sql` | `songs.suno_*` cols | Production Suno features | repair applied |
| `20260429100300` | `20260429100300_studio_pages.sql` | `studio_pages`, `contact_submissions` | Table EXISTS | repair applied |
| `20260430100000` | `20260430100000_favicons.sql` | favicon cols | Idempotent ALTER | repair applied |
| `20260430100100` | `20260430100100_song_canvas.sql` | canvas cols on songs | Production canvas | repair applied |
| `20260430100200` | `20260430100200_song_featured_studio.sql` | `songs.studio_featured` | Idempotent ALTER | repair applied |
| `20260501` | `20260501_profiles_referrals.sql` | `profiles`, referrals, points | Table EXISTS | repair applied |
| `20260514100000` | `20260514100000_profile_settings_columns.sql` | profile settings cols | Dependency of profiles | repair applied |
| `20260514100100` | `20260514100100_signup_referral_metadata.sql` | signup trigger metadata | Profiles/signup in prod | repair applied |
| `20260514100200` | `20260514100200_fix_signup_trigger.sql` | `create_profile_for_new_user` | Auth signup works | repair applied |
| `20260514100300` | `20260514100300_multitenant_rls.sql` | `artists_owner_all` policy | Policy EXISTS | repair applied |
| `20260514100400` | `20260514100400_spotify_claim_uniqueness.sql` | `check_spotify_claim` | Spotify claim in prod | repair applied |
| `20260515100000` | `20260515100000_follows_activity_feed.sql` | `follows`, `activity_feed` | Social features | repair applied |
| `20260515100100` | `20260515100100_profile_creator_fields.sql` | creator profile cols | Profile UI | repair applied |
| `20260515100200` | `20260515100200_transfer_referrer_rpc.sql` | `transfer_referrer` | Admin referrals | repair applied |
| `20260516100000` | `20260516100000_chat_system.sql` | `conversations`, messages | Table EXISTS | repair applied |
| `20260516100100` | `20260516100100_chat_rls_fix.sql` | chat RLS policies | Chat works in prod | repair applied |
| `20260516100200` | `20260516100200_log_song_play_rpc.sql` | `log_song_play` | Play logging | repair applied |
| `20260516100300` | `20260516100300_song_plays.sql` | `song_plays` | Analytics plays | repair applied |
| `20260517100000` | `20260517100000_notification_prefs.sql` | `notification_preferences` | Notifications | repair applied |
| `20260517100100` | `20260517100100_notification_triggers.sql` | notification triggers | Notify dispatch | repair applied |
| `20260517100200` | `20260517100200_chat_extensions.sql` | group chat cols | Messages UI | repair applied |
| `20260517100300` | `20260517100300_song_comments_reactions.sql` | `song_comments`, `song_reactions` | Comments feature | repair applied |
| `20260518100000` | `20260518100000_distribution_tracking.sql` | `affiliate_clicks` | Distribution | repair applied |
| `20260518100100` | `20260518100100_page_templates.sql` | page template cols | Studio pages | repair applied |
| `20260519` | `20260519_song_backstory_link_clicks.sql` | `link_clicks` | Link tracking | repair applied |
| `20260519120000` | `20260519120000_discover_spotlight_setting.sql` | admin settings INSERT | Discover | repair applied |
| `20260519140000` | `20260519140000_media_assets.sql` | `media_assets`, storage bucket | Media library | repair applied |
| `20260520` | `20260520_fan_growth_pack.sql` | newsletter, events | Fan growth | repair applied |
| `20260520120000` | `20260520120000_playlist_communities.sql` | playlist campaigns | Campaign UI | repair applied |
| `20260521` | `20260521_fan_growth_quality_tracking.sql` | `analytics_events` | Analytics | repair applied |
| `20260521120000` | `20260521120000_campaign_activity_logs.sql` | activity logs | Last.fm proof | repair applied |
| `20260522` | `20260522_stripe_free_pro_plans.sql` | `subscriptions`, plans | Table EXISTS | repair applied |
| `20260523` | `20260523_embed_widget_events.sql` | analytics constraint | Embed events | repair applied |
| `20260524` | `20260524_onboarding_wizard.sql` | `onboarding_progress` | Onboarding | repair applied |
| `20260524120000` | `20260524120000_playlist_archive.sql` | archive cols | Playlists | repair applied |
| `20260525` | `20260525_fan_hub_newsletter_activation.sql` | newsletter cols | Newsletter | repair applied |
| `20260525120000` | `20260525120000_lastfm_proof_import.sql` | lastfm cols | Last.fm | repair applied |
| `20260526` | `20260526_saas_admin_control_center.sql` | admin tables | Admin center | repair applied |
| `20260526120000` | `20260526120000_passive_participation_engine.sql` | streaks, suggestions | Participation | repair applied |
| `20260527` | `20260527_beta_launch_polish.sql` | `beta_feedback` | Beta feedback | repair applied |
| `20260528` | `20260528_manual_pro_access.sql` | `manual_plan_overrides` | Manual pro | repair applied |
| `20260528120000` | `20260528120000_song_creation_studio.sql` | song studio cols | Song studio | repair applied |
| `20260529` | `20260529_english_default_ai_output_language.sql` | profile language default | AI language | repair applied |
| `20260529120000` | `20260529120000_artist_stories.sql` | `artist_stories` | Stories | repair applied |
| `20260530120000` | `20260530120000_story_analytics_scheduled.sql` | story scheduling | Story analytics | repair applied |
| `20260706120000` | `20260706120000_v2_community_layer.sql` | `v2_circles`, sessions, rooms | Table EXISTS | repair applied |
| `20260706140000` | `20260706140000_v2_community_workflows.sql` | `v2_circle_songs`, reports | Table EXISTS | repair applied |
| `20260706150000` | `20260706150000_v2_stream_engine_beta.sql` | `v2_session_play_logs` | Table EXISTS | repair applied |
| `20260706160000` | `20260706160000_v2_supporter_participation.sql` | `v2_playlist_room_participation` | V2 participation UI | repair applied |
| `20260706170000` | `20260706170000_v2_community_notifications.sql` | `v2_community_notifications` | Table EXISTS | repair applied |
| `20260706180000` | `20260706180000_v2_session_scheduling.sql` | RSVP/scheduling cols | Session calendar | repair applied |
| `20260706190000` | `20260706190000_v2_community_follows_saves.sql` | `v2_circle_follows`, saves | Table EXISTS | repair applied |
| `20260706190100` | `20260706190100_v2_community_analytics.sql` | analytics_events constraints | Community events in CHECK | repair applied |
| `20260713120000` | `20260713120000_playback_evidence_engine.sql` | `playlist_snapshots`, `playback_*` | Table EXISTS | repair applied |
| `20260713140000` | `20260713140000_v2_curator_rooms.sql` | `v2_curator_linked_playlists` | Table EXISTS | repair applied |
| `20260713160000` | `20260713160000_v2_spotify_connections.sql` | `v2_spotify_connections` | Table EXISTS | repair applied |
| `20260713161000` | `20260713161000_spotify_analytics_events.sql` | spotify event types in CHECK | Constraint EXISTS | repair applied |

---

## Manual review required (3 versions)

Do **not** auto-repair until verification section 10 passes.

| Version | Filename | Expected effect | Why uncertain | SQL check |
|---------|----------|-----------------|---------------|-----------|
| `20260517180106` | `20260517180106_add_project_tables.sql` | `song_comments`, `song_reactions` (duplicate) | Overlaps `20260517100300`; may have been applied via either file | `song_comments` EXISTS (section 10) |
| `20260706140100` | `20260706140100_v2_community_seed.sql` | INSERT seed circles/sessions | Data-only; non-idempotent if re-run | `dark-country-circle` slug (section 10) |
| `20260706200000` | `20260706200000_v2_beta_readiness.sql` | INSERT supplemental seed | Overlaps community seed | Fixed UUID sessions count (section 10) |

**If seed rows exist:** mark applied after confirmation to prevent `db push` re-inserting.  
**If seed rows absent:** leave unapplied and run migration once on staging, or mark applied and insert seed manually.

---

## Repair command order

Run via `scripts/repair-supabase-migration-history.ps1 -Execute` (skips `20260428` if already remote).

Chronological order matches the `$VerifiedVersions` array in the PowerShell script (62 entries; `20260428` included for completeness — CLI may no-op if already applied).

---

## Post-repair expectation

| Check | Expected |
|-------|----------|
| Duplicate local versions | 0 |
| `migration list` local-only | 0–3 (manual review only) |
| `db push` | Safe when local-only ⊆ manual review set |

Verify with: `.\scripts\verify-supabase-migration-repair.ps1`

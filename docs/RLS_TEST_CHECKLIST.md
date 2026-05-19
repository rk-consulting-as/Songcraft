# ViaTone RLS & Security Test Checklist (Beta)

Run these tests with two test accounts (User A, User B) and one admin. Use Supabase SQL or the app UI.

## Media & private assets

- [ ] User A cannot `SELECT` User B's `media_assets` where `visibility = 'private'`
- [ ] Logged-out user cannot read private `media_assets` URLs via API
- [ ] Public `media_assets` only appear when artist page is public and `page_enabled`

## Playlist campaigns & activity proof

- [ ] Non-member cannot `INSERT` into `campaign_activity_logs`
- [ ] Non-member cannot `SELECT` proof logs for a campaign they do not own or participate in
- [ ] Logged-out user cannot read `campaign_activity_logs` (API returns 401/403/404)
- [ ] Approved member can submit and read **own** logs only
- [ ] Campaign owner can read/review all logs for **their** campaigns
- [ ] Admin can `SELECT` all logs (`is_admin()` policy)

## Public campaign visibility

- [ ] `visibility = private` campaigns are not in `/api/discover/catalog`
- [ ] `admin_hidden = true` campaigns are not in discover
- [ ] Draft/closed/archived campaigns are not listed as joinable on discover
- [ ] Anonymous `GET /api/playlist-communities/campaigns/[id]` returns 404 for private campaigns

## Artists & songs

- [ ] `admin_hidden` artists do not appear on `/p/[slug]`, discover, or sitemap
- [ ] `public_hidden` songs do not appear on `/s/[id]` or public artist pages
- [ ] EPK only shows when `epk.public_enabled` and artist is public

## Admin moderation

- [ ] Only `admin` / `super_admin` can access `/api/admin/control-center`
- [ ] Hide artist/song actions are audit-logged in `admin_audit_log`
- [ ] Manual Pro override grants Pro features without Stripe

## Plan gating (app layer)

- [ ] Free user hits upload/AI limits with clear message (not a crash)
- [ ] Manual Pro override user has Pro features after `manual_plan_overrides` row
- [ ] Missing `subscriptions` table → app defaults to Free (`safeGetUserPlan`)

## Notes

- Activity proof is **participation evidence**, not Spotify stream verification.
- Do not expose proof attachments on public pages.

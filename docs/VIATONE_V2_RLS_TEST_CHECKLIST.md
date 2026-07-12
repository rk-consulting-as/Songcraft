# ViaTone 2.0 — RLS & Privacy Test Checklist

Use this checklist before inviting beta users. Tests assume **two accounts**: `User A` (member) and `User B` (non-member), plus optional `Host` and `Admin`.

**Fixtures after `20260706200000_v2_beta_readiness.sql`:**

- Public: `dark-country-circle`, sessions on public circles
- Private QA: `beta-private-lab`, `beta-private-session`

---

## How to run

1. Apply all v2 migrations.
2. Log in as User B (not a member of private circles).
3. Log out and test anonymous access where noted.
4. Mark each row: **PASS** / **FAIL** / **N/A**

---

## 1. Circle visibility

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 1.1 | Private circle not on explore | Visit `/community/explore` logged out | `beta-private-lab` **not** listed | |
| 1.2 | Private circle URL blocked | Visit `/community/circles/beta-private-lab` as User B | Restricted state; **no** name/description/queue | |
| 1.3 | Public circle visible | Visit `/community/circles/dark-country-circle` logged out | Name, description, approved songs visible | |
| 1.4 | Private circle not in sitemap | Check sitemap or public API discover | Only `visibility = public` circles | |
| 1.5 | Follow private circle blocked | `POST /api/v2/community/circles/beta-private-lab/follow` | 403 `circle_not_public` | |

---

## 2. Session visibility

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 2.1 | Private session not public | Visit session on `beta-private-lab` as User B | Restricted state | |
| 2.2 | Public session readable | Visit public upcoming session logged out | Schedule, public queue (approved only) | |
| 2.3 | Pending queue hidden | View session page as non-host | Only **approved** tracks in public queue | |
| 2.4 | RSVP on private session | User B RSVPs private session API | 403 `session_not_public` | |
| 2.5 | Save private session | User B saves private session | 403 `session_not_public` | |

---

## 3. Playlist room visibility

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 3.1 | Room on private circle | Room linked to private circle as User B | Restricted or member-only | |
| 3.2 | Public room readable | `weekly-support` logged out | Name, description visible; submit needs login | |
| 3.3 | Save private room | API save on non-public room | 403 | |

---

## 4. Participation & notes privacy

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 4.1 | Participation rows | User A joins session; User B queries participation | User B cannot read User A's row via client API | |
| 4.2 | Host notes in stream meta | Non-host views live session | Host notes visible only in host panel context (not leaked via public API) | |
| 4.3 | RSVP list identities | Public session page | RSVP **counts** only; no public follower list | |

---

## 5. Notifications

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 5.1 | Owner-only read | User A lists notifications | Only User A's rows | |
| 5.2 | User B cannot read A | Direct API with User B token for A's notification id | Denied / empty | |
| 5.3 | Dedupe | Trigger same follow notification twice in 1h | At most one row per kind+entity+user in 24h | |

---

## 6. Follows & saves

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 6.1 | Follow list private | View another user's follows | **Not** exposed (only aggregate counts on public pages) | |
| 6.2 | Saved items private | User B cannot query User A's `v2_saved_community_items` | RLS blocks | |
| 6.3 | Self manage follow | User A unfollows circle | Row deleted; follower count updates | |

---

## 7. Host boundaries

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 7.1 | Host A cannot start Host B session | `POST .../sessions/{B}/engine` action start | 403 `host_only` | |
| 7.2 | Host A cannot approve B queue | PATCH submission on B's session | 403 | |
| 7.3 | Host A cannot complete B's room round | Playlist engine API | 403 | |
| 7.4 | Member cannot host actions | User A starts session they don't host | 403 friendly message | |

---

## 8. Admin moderation

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 8.1 | Admin report | User submits `V2ReportButton` on circle | Row in reports table | |
| 8.2 | Admin health | Admin → System → V2 community health | Migrations OK, counts visible | |
| 8.3 | Admin feedback | Community feedback appears in admin inbox | Page path includes `/community` | |

---

## 9. Analytics & aggregates

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 9.1 | Explore highlights | Top circles/hosts on explore | Counts only; **no** user identities | |
| 9.2 | Community analytics events | `community_public_view` insert | No PII in `analytics_events` metadata | |
| 9.3 | Invite ref | Land with `?ref=TEST` | `community_invite_landing` event; ref in metadata | |

---

## 10. Regression — must not break

| # | Test | Expected | Result |
|---|------|----------|--------|
| 10.1 | Legacy Studio `/dashboard` | Loads unchanged | |
| 10.2 | Billing `/settings/billing` | Unchanged | |
| 10.3 | Logged-out `/community` | Redirects to explore | |
| 10.4 | Logged-in `/community` | Personalized home | |

---

## Sign-off

| Role | Name | Date | All critical PASS? |
|------|------|------|-------------------|
| Engineering | | | |
| Product | | | |

**Critical tests:** 1.2, 2.1, 2.3, 5.1, 6.2, 7.1, 10.1

---

*Complement with `docs/VIATONE_V2_BETA_READINESS.md` for full audit context.*

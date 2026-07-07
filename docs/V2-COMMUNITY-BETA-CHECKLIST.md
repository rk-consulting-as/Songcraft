# ViaTone 2.0 Community — Beta Safety Checklist

Manual QA before inviting real beta users. Legacy Studio (`/dashboard`) is out of scope unless noted for catalog setup.

## Prerequisites

- [ ] Migrations applied through `20260706160000_v2_supporter_participation.sql`
- [ ] Seed applied (`20260706140100_v2_community_seed.sql`) or manual test data created
- [ ] At least two test accounts: **member** and **host** (plus **admin** optional)

## 1. Joining

- [ ] Logged-out visitor sees community onboarding (dismissible)
- [ ] Member can join a public circle
- [ ] Member can join an upcoming/live session (“I joined this session”)
- [ ] Member cannot manage host controls on session page
- [ ] Friendly message shown: “Only the host can manage this session”

## 2. Submissions

- [ ] Member with songs in Legacy Studio can submit to session (pending)
- [ ] Member must join circle before circle song submit (`join_circle_first` message)
- [ ] Submit without login shows friendly auth message
- [ ] Empty state guides user to Legacy Studio when no songs exist

## 3. Feedback

- [ ] Member can leave feedback on a community song page
- [ ] Song owner sees feedback received count on community home
- [ ] Empty “no feedback received” state shows for new creators

## 4. Host approval

- [ ] Host sees pending submissions on `/community/host`
- [ ] Host can approve / remove from dashboard and session page
- [ ] Approved tracks appear in session queue
- [ ] Non-host PATCH returns friendly host-only message

## 5. Session playback (Stream Engine beta)

- [ ] Host can start session → live badge
- [ ] Host can mark played / skip / bump next
- [ ] Host can end session → recap visible
- [ ] Play log records manual host actions

## 6. Participation

- [ ] Member can confirm “I listened” on live session
- [ ] Member can confirm playlist room listening
- [ ] Participation appears in `/community/participation`

## 7. Supporter score

- [ ] Community home shows supporter score and badges
- [ ] Participation history updates after join/listen/feedback
- [ ] Circle page shows top supporters (when data exists)

## 8. Host onboarding

- [ ] `/community/host` shows dismissible curator onboarding
- [ ] First-session checklist tracks progress
- [ ] Host Pro upgrade prompt visible for free users
- [ ] Create circle / session / playlist room works in soft gating mode

## 9. Mobile smoke test

- [ ] `/community` readable on narrow viewport
- [ ] Onboarding and checklist stack vertically
- [ ] Session cards and track rows wrap without horizontal scroll
- [ ] Host dashboard analytics grid collapses to single column

## 10. Regression

- [ ] Legacy Studio `/dashboard` still loads unchanged
- [ ] Pro Artist billing `/settings/billing` unchanged
- [ ] `npm run build` and `npx tsc --noEmit` pass

---

**Notes:** Participation is manual and community-scoped — not verified streams. Set `V2_HOST_PRO_STRICT=true` when Host Pro Stripe is live.

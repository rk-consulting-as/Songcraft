# ViaTone 2.0 Community — Beta Test Script

**For non-technical beta testers**  
**Time:** ~45–60 minutes  
**You need:** A computer or phone, modern browser (Chrome, Safari, Firefox), email for signup

**Feedback:** Use the **Feedback** button (bottom-right corner) on any page. Choose **Bug** for broken things, **Idea** for suggestions.

---

## Before you start

Your invite link may look like:

`https://viatone.app/community/invite?ref=BETA01`

Or you may have a direct link to a circle or session. That's fine — start there.

---

## Test 1 — Explore as a visitor (5 min)

1. Open the invite link **without** logging in.
2. Browse **Explore** — circles, sessions, playlist rooms.
3. Open one **circle** page. Read the description and upcoming sessions.
4. Open one **session** page. You should see schedule info and RSVP counts.
5. Tap **Follow circle** or **Save session** — you should be asked to **sign in**.

**Pass if:** Pages load, no blank screens, login prompt appears when you try to follow/save.

**Report if:** You see private content you weren't invited to, or pages show raw error codes.

---

## Test 2 — Create your account (5 min)

1. Click **Sign up** / **Create account**.
2. Complete signup with your email.
3. After signup, you should land back on the page you were viewing.

**Pass if:** You return to community (not stuck on login).

**Report if:** Signup fails or you land on a wrong page.

---

## Test 3 — Join a circle (5 min)

1. Go to **Explore** → pick a public circle (e.g. "Dark Country Circle").
2. Click **Join circle** (or **Sign in to join** if needed).
3. Confirm you are a member (button should change).

**Pass if:** Join succeeds with a clear message.

**Report if:** Join fails with a confusing error.

---

## Test 4 — Follow & save (5 min)

1. On the same circle, click **Follow circle**.
2. Open an upcoming **session** → click **Save session**.
3. Go to **Saved** in the sidebar (or `/community/saved`).
4. Check **Following** and **Saved Sessions** tabs.

**Pass if:** Circle appears under Following; session under Saved Sessions.

---

## Test 5 — Artist path: connect a song (10 min)

> You need at least one song in Legacy Studio first.

1. Open **Legacy Studio** (Dashboard) from the sidebar or profile.
2. If you have no songs: create a simple artist + one song (title only is OK for beta).
3. Return to your circle → **Submit your song**.
4. Select your song and submit.

**Pass if:** Submission shows as pending or approved.

**Report if:** Submit blocked with no clear next step.

---

## Test 6 — RSVP to a session (5 min)

1. Open an **upcoming session**.
2. Choose **Going** or **Interested**.
3. Check **Saved** → **My RSVPs** tab.

**Pass if:** RSVP status updates and counts change.

---

## Test 7 — Leave feedback (5 min)

1. Go to **Songs** in community.
2. Open a song that isn't yours (or ask the team for a link).
3. Leave a short rating or comment.

**Pass if:** Feedback submits with confirmation.

---

## Test 8 — Notifications (5 min)

1. Go to **Community Home** (`/community`).
2. Look for the **notifications** area (bell / activity).
3. If the host starts a session while you're testing, you may get a "session live" alert.

**Pass if:** Notifications appear readable; no duplicate spam for the same event.

**Report if:** You get many identical notifications in a short time.

---

## Test 9 — Mobile check (10 min)

On your phone (or narrow browser window):

1. Visit **Community Home**, **Explore**, one **session** page.
2. Check buttons are not cut off.
3. Try **RSVP** and **Follow** — buttons should be tappable.
4. Open the **Feedback** button — modal should fit the screen.

**Pass if:** No horizontal scrolling; buttons usable.

**Report if:** Buttons overlap or text is clipped.

---

## Test 10 — Host path (optional, host testers only)

1. Open **Host** in the sidebar.
2. Create a test **session** (or use existing).
3. Open the session → **Stream Engine** → **Start** session.
4. Mark a track played → **End** session.
5. Confirm **recap** appears.

**Pass if:** Host controls work; members see live status.

---

## Quick bug report template

Copy into the Feedback form:

```
Page: [paste URL]
What I tried: 
What happened: 
What I expected: 
Device: iPhone / Android / Desktop
Browser: Safari / Chrome / other
```

---

## You're done!

Thank you for testing ViaTone Community beta. Your feedback directly shapes the next release.

**Questions?** Reply to your invite email or use the in-app Feedback button.

---

*Technical checklist: `docs/VIATONE_V2_RLS_TEST_CHECKLIST.md`*  
*Full audit: `docs/VIATONE_V2_BETA_READINESS.md`*

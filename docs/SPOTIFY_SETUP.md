# Spotify Setup for ViaTone 2.0

## 1. Create a Spotify app

1. Open [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app (e.g. "ViaTone Community")
3. Note **Client ID** and **Client Secret**

## 2. Redirect URIs

Add these in the app settings (exact match required):

| Environment | Redirect URI |
|-------------|--------------|
| Local | `http://localhost:3000/api/v2/integrations/spotify/callback` |
| Production | `https://viatone.io/api/v2/integrations/spotify/callback` |
| Vercel preview | `https://<your-preview>.vercel.app/api/v2/integrations/spotify/callback` |

Set `SPOTIFY_REDIRECT_URI` explicitly in production to avoid preview/production mismatch.

## 3. Environment variables

```env
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
SPOTIFY_REDIRECT_URI=https://viatone.io/api/v2/integrations/spotify/callback
SPOTIFY_TOKEN_ENCRYPTION_KEY=64-char-hex-or-strong-secret
NEXT_PUBLIC_SPOTIFY_CONNECTION_ENABLED=true
NEXT_PUBLIC_APP_URL=https://viatone.io
```

- **Never** expose `SPOTIFY_CLIENT_SECRET` to the browser
- `NEXT_PUBLIC_SPOTIFY_CONNECTION_ENABLED=false` disables the connect UI
- If `SPOTIFY_REDIRECT_URI` is unset, ViaTone derives from `NEXT_PUBLIC_APP_URL` or `VERCEL_URL`

## 4. Required OAuth scopes (read-only)

- `user-read-private`
- `user-read-email`
- `user-read-recently-played`
- `playlist-read-private`
- `playlist-read-collaborative`

No playback-control or playlist-write scopes in Phase 6C.

## 5. Database migration

Apply:

```
supabase/migrations/20260713160000_v2_spotify_connections.sql
```

After Phase 6A (`playback_evidence_engine`) and 6B (`v2_curator_rooms`).

## 6. Test user authorization

In **Development Mode**, add Spotify accounts under **User Management** in the developer dashboard. Only authorized users can complete OAuth.

## 7. Development Mode limitations

- Limited number of authorized users
- Some endpoints may be unavailable until app review
- Rate limits apply — ViaTone respects `Retry-After` on 429
- Do not poll Recently Played on every page load; sync is user-triggered or on session finish

## 8. Production review

Before public launch:

- Request extended quota if needed
- Document privacy policy for Recently Played access
- Use HTTPS redirect URIs only on production
- Verify Admin → System health shows Spotify configured

## 9. Manual QA checklist

1. Connect authorized test account at `/community/settings/integrations`
2. Link owned/collaborative playlist in a Curator Room
3. Sync playlist — confirm immutable snapshot created
4. Change playlist in Spotify, sync again — diff shown
5. Start Playback Session, listen in Spotify, finish session
6. Review Spotify evidence — submit voluntarily
7. Confirm Curator Room aggregates update; no private history exposed
8. Disconnect — tokens removed

## 10. Policy wording

ViaTone uses **Spotify listening match**, **Recently Played match**, and **Spotify-sourced Playback Evidence**. Never use "verified streams" or "official stream count" in product copy.

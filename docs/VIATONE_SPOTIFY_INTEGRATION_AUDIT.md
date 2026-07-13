# ViaTone Spotify Integration Audit (Phase 6C)

Date: 2026-07-13

## Existing Spotify functionality (reused)

| Area | Location | Role |
|------|----------|------|
| App-level Client Credentials | `lib/spotify.ts` | Public metadata: search, playlist import for campaigns |
| Playlist URL parsing | `lib/playlistCommunities/spotifyPlaylist.ts` | `extractSpotifyPlaylistId`, `mapSpotifyPlaylist` |
| Public playlist tracks | `lib/lastfm/playlistTracks.ts` | Paginated tracks via app token |
| Legacy API routes | `app/api/spotify/route.ts` | Artist search (Client Credentials) |
| Playlist communities | `app/api/playlist-communities/**` | Campaign playlist URLs |
| Song listen links | `lib/songs/publicListenLinks.ts` | Display Spotify URLs on songs |

**Not replaced:** `lib/spotify.ts` remains the app-token path. User OAuth lives in `lib/spotify/*` (oauth, connections, userApi, playlistApi).

## New Phase 6C components

| Component | Location |
|-----------|----------|
| OAuth (Authorization Code) | `app/api/v2/integrations/spotify/*` |
| Token storage | `v2_spotify_connections` migration |
| SpotifyProvider | `lib/playback/providers/spotify/SpotifyProvider.ts` |
| Playlist sync | `lib/spotify/playlistSync.ts` → `PlaybackEngine.linkPlaylistSnapshot` |
| Recently Played match | `lib/spotify/evidence.ts`, `matchTracks.ts` |
| Evidence consent | `v2_spotify_evidence_pending` |
| UI | `components/spotify/*`, `/community/settings/integrations` |
| Curator Room wiring | `V2CuratorRoomDashboard.tsx` |

## Replaced placeholders

- `SpotifyProvider` in `lib/playback/providers/index.ts` (`isConfigured: false` stub)
- Curator Room manual-only linked playlist copy
- Phase 6C comment in curator dashboard about future sync

## Architecture

```
Community UI → /api/v2/integrations/spotify/* → lib/spotify/*
                    ↓
              PlaybackEngine → SpotifyProvider → PlaylistSnapshot / PlaybackEvidence / PlaybackScoring
```

Community pages **never** call `api.spotify.com` directly.

## Token security

- AES-256-GCM encryption via `lib/spotify/tokenCrypto.ts`
- Key: `SPOTIFY_TOKEN_ENCRYPTION_KEY` (falls back to service role key in dev only)
- Tokens never returned to browser or logs
- RLS: users read own connection metadata; service role writes tokens

## Remaining limitations

1. **No in-app Spotify streaming** — no Web Playback SDK in this phase
2. **Recently Played ≠ playlist proof** — matches document listening activity only
3. **Development Mode** — Spotify may cap authorized users and endpoint access
4. **403 on private/followed playlists** — sync shows `forbidden`; manual link remains
5. **No write scopes** — playlist edits happen in Spotify; ViaTone reads snapshots only
6. **Last.fm corroboration** — separate evidence rows; `PlaybackScoring.aggregateSessionConfidence` boosts multi-provider matches
7. **Queue ambiguity** — `queueMatch.ts` flags duplicate plays across queue items
8. **Minimal Recently Played retention** — dedupe table stores only synced rows for evidence

## Environment variables

See `docs/SPOTIFY_SETUP.md`.

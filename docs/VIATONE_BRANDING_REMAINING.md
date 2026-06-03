# ViaTone Branding — Remaining Internal References

Phase 49.95 updated **user-facing UI** to use ViaTone. The items below are intentionally unchanged for stability and should be migrated in a dedicated branding pass.

## Package & repository

| Location | Reference | Notes |
|----------|-----------|-------|
| `package.json` | `"name": "songcraft"` | npm package name |
| `package-lock.json` | `"name": "songcraft"` | lockfile |
| `README.md` | `songcraft-lilac.vercel.app`, clone paths | docs / deploy URLs |
| `DEPLOY.md` | `Songcraft` repository path | ops doc |

## Runtime storage keys (breaking if renamed without migration)

| Key / event | File(s) |
|-------------|---------|
| `songcraft_lang` | `lib/i18n.ts`, `app/page.tsx` |
| `songcraft_referral_code` | `app/login/page.tsx` |
| `songcraft_chat_open`, `songcraft_chat_side` | `components/ChatDock.tsx` |
| `songcraft:open-chat`, `songcraft:close-chat` | `ChatDock.tsx`, `MessageButton.tsx`, `app/dashboard/page.tsx` |
| `songcraft_beta_checklist_v1` | `components/BetaLaunchKit.tsx` |
| `songcraft_ai_provider` | `lib/aiProvider.ts` |
| `data-songcraft-dynfavicon` | `components/DynamicFavicon.tsx` |

## Database / API / billing identifiers

| Reference | File(s) |
|-----------|---------|
| `remove_songcraft_branding` | `lib/subscription.ts`, `app/settings/billing/page.tsx` |
| `songcraft-default-salt` (fallback) | `app/api/song/play/route.ts`, `app/api/link/click/route.ts` |

## Design assets (internal names)

| Asset | Notes |
|-------|-------|
| `design/songcraft-design.css` | Vanilla CSS export; not bundled in Next app |
| `lib/tokens.ts` | comment references `songcraft-design.css` |
| Root / `docs/DESIGN.md` | historical Songcraft naming |

## Migrations & SQL

No user-facing strings; migration filenames may contain legacy names from earlier phases.

## Recommended Phase 50+ cleanup order

1. **Alias storage keys** — read old keys, write new `viatone_*` keys with one release of dual-read support.
2. **Rename custom events** — dispatch both `songcraft:open-chat` and `viatone:open-chat` during transition.
3. **Billing feature flag** — add `remove_viatone_branding` alias in subscription layer; deprecate old key.
4. **Package rename** — optional; low user impact unless publishing to npm.
5. **Design CSS** — rename `songcraft-design.css` → `viatone-design.css` when Sonic Ether / gold direction is finalized.

## User-facing status after 49.95

- App header, login, landing, metadata titles: **ViaTone**
- No remaining `Songcraft` strings in TSX user copy (grep verified)
- Internal comments and ops docs may still mention Songcraft

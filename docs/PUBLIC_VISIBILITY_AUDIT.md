# Public Visibility Audit (ViaTone Beta)

Rules are defined in code at `lib/admin/publicVisibilityRules.ts` and surfaced in **Admin → SaaS Control Center → System / Beta**.

## Surfaces checked

| Surface | Hidden when |
|---------|-------------|
| Discover | `admin_hidden`, `public_hidden`, private campaigns |
| `/p/[slug]` | `!page_enabled` or `admin_hidden` |
| `/s/[id]` | `public_hidden` or artist hidden |
| `/epk/[slug]` | EPK not `public_enabled` or artist hidden |
| `/playlist-campaigns/[id]` | Not public/open/active unless member/owner |
| Sitemap | Same filters as public pages |
| Activity proof | Auth + membership only (never public) |

## Manual QA

1. Hide an artist (`admin_hidden`) → confirm absent from discover and `/p/`.
2. Set song `public_hidden` → confirm `/s/[id]` returns not found.
3. Private campaign → not on discover; anonymous GET returns 404.

# ViaTone Design System

A self-contained design system you can reuse in other projects. The aesthetic is **dark, warm, vintage-cinematic** — gold accent on near-black background with beige/brown text. Inspired by music studio interiors and album cover typography.

This doc tells you what's where, how to copy it out, and gives ready-to-use snippets.

---

## What's in this folder

| File                              | Use it when |
|-----------------------------------|-------------|
| [`design/songcraft-design.css`](design/songcraft-design.css) | Vanilla HTML/CSS, any framework. Drop in and use `sc-*` classes. |
| [`lib/tokens.ts`](lib/tokens.ts)  | React/TypeScript projects. Import for inline styles, or generate a Tailwind config from it. |
| [`app/globals.css`](app/globals.css) | This is the production CSS ViaTone uses. Slightly different class names (`btn-gold`, `card`) — but same look. |

---

## Color palette

### Brand
| Token                | Value                          | Use                              |
|----------------------|--------------------------------|-----------------------------------|
| `--sc-gold`          | `#d4a843`                      | Primary accent, buttons, headings |
| `--sc-gold-bright`   | `#e8c050`                      | Hover state for gold              |
| `--sc-gold-dim`      | `rgba(212,168,67,0.3)`         | Borders on gold elements          |
| `--sc-gold-tint`     | `rgba(212,168,67,0.08)`        | Subtle gold-tinted backgrounds    |
| `--sc-purple`        | `#c07bd0`                      | Alt accent (creative/canvas)      |

### Background
| Token                | Value                          | Use                       |
|----------------------|--------------------------------|---------------------------|
| `--sc-bg`            | `#0a0a0f`                      | Main page background      |
| `--sc-bg-2`          | `#14101a`                      | Modal panel               |
| `--sc-bg-3`          | `#1a1520`                      | Dropdown options          |
| `--sc-bg-gradient`   | dark gradient (see CSS)        | Body background           |
| `--sc-surface`       | `rgba(255,255,255,0.03)`       | Card background           |

### Text — a warm beige/brown scale (NOT pure grey)

This is what gives ViaTone its distinctive "vintage" feel. Instead of cool greys (#666, #888, #aaa), text uses warm tones:

| Token                | Value      | Use              |
|----------------------|------------|------------------|
| `--sc-text-bright`   | `#e8e0d0`  | Titles, primary  |
| `--sc-text-body`     | `#c8c0b0`  | Body text        |
| `--sc-text-mid`      | `#a09080`  | Secondary        |
| `--sc-text-muted`    | `#8a7a60`  | Labels           |
| `--sc-text-dim`      | `#6a5a40`  | Minor labels     |
| `--sc-text-faint`    | `#5a4a30`  | Hints            |
| `--sc-text-disabled` | `#3a3530`  | Disabled         |

### External brand colors

Used as circular badges next to artist/track names.

| Token                | Value                          |
|----------------------|--------------------------------|
| `--sc-spotify`       | `#1ed760` (Spotify green)      |
| `--sc-youtube`       | `#ff0000`                      |
| `--sc-instagram-gradient` | `linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)` |
| `--sc-tiktok`        | `#000` + white border          |
| `--sc-facebook`      | `#1877f2`                      |
| `--sc-linkedin`      | `#0a66c2`                      |
| `--sc-apple-music`   | `#fa233b`                      |
| `--sc-soundcloud`    | `#ff5500`                      |

---

## Typography

System font stack — no web fonts. Loads instantly, looks native on every OS.

```
font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

Hierarchy (used inline throughout the app):
- **Page title (h1)**: 22px, normal weight, gold, 2px letter-spacing
- **Section heading (h2)**: 18px, normal weight, gold, no letter-spacing
- **Section label**: 11px, uppercase, 1px letter-spacing, muted text (used above form fields)
- **Body**: 14px, regular weight
- **Small hint**: 11–12px, faint text

---

## Components

### Card

```html
<div class="sc-card">
  <h2 class="sc-h2">Section title</h2>
  <p>Content goes here.</p>
</div>
```

### Buttons

```html
<button class="sc-btn-gold">Primary action</button>
<button class="sc-btn-outline">Secondary action</button>
<button class="sc-btn-danger">Delete</button>
```

### Form fields

```html
<label class="sc-section-label">Artist name</label>
<input class="sc-input" type="text" placeholder="..." />

<label class="sc-section-label">Description</label>
<textarea class="sc-textarea" rows="4"></textarea>

<label class="sc-section-label">Genre</label>
<select class="sc-select">
  <option>Rock</option>
  <option>Pop</option>
</select>
```

### Chips (toggleable filters)

```html
<button class="sc-chip is-active">All</button>
<button class="sc-chip">Draft</button>
<button class="sc-chip">Released</button>
```

Toggle `is-active` to show the selected state.

### Status pills

```html
<span class="sc-status sc-status-released">Released</span>
<span class="sc-status sc-status-draft">Draft</span>
```

### Brand badges

Small clickable circles for external links (Spotify, YouTube, etc.):

```html
<a class="sc-badge sc-badge-spotify" href="...">♪</a>
<a class="sc-badge sc-badge-youtube" href="...">▶</a>
<a class="sc-badge sc-badge-instagram" href="...">◎</a>
```

### Modal

```html
<div class="sc-modal-overlay" onclick="close()">
  <div class="sc-modal" onclick="event.stopPropagation()">
    <h3 class="sc-h2">Modal title</h3>
    <p>Content…</p>
    <button class="sc-btn-gold">Save</button>
    <button class="sc-btn-outline">Cancel</button>
  </div>
</div>
```

### Tabs row

```html
<div class="sc-tabs">
  <button class="sc-tab is-active">🎵 Lyrics</button>
  <button class="sc-tab">🤖 Suno</button>
  <button class="sc-tab">📱 Captions</button>
</div>
```

---

## Layout patterns

### Page structure

```html
<div class="sc-app">
  <div class="sc-header">
    <h1 class="sc-h1">VIATONE</h1>
    <button class="sc-btn-outline">Logout</button>
  </div>

  <div class="sc-page-pad">
    <!-- content -->
  </div>
</div>
```

### Hero with cover-image background (artist page style)

```html
<section style="
  min-height: 480px;
  padding: 60px 24px;
  text-align: center;
  background:
    linear-gradient(180deg, rgba(10,10,15,0.55) 0%, rgba(10,10,15,0.85) 70%, #0a0a0f 100%),
    url('cover.jpg') center/cover no-repeat;
  border-bottom: 1px solid rgba(212,168,67,0.2);
">
  <img src="avatar.jpg" style="
    width: 180px; height: 180px;
    border-radius: 50%;
    border: 3px solid var(--sc-gold);
    box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  " />
  <h1 style="
    font-size: clamp(36px, 6vw, 64px);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
  ">Artist Name</h1>
</section>
```

### Grid of cards

```html
<div style="
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
">
  <div class="sc-card">…</div>
  <div class="sc-card">…</div>
</div>
```

---

## How to copy this to another project

### Option 1 — Plain HTML / non-React framework

1. Copy `design/songcraft-design.css` into your project's CSS folder
2. Add `<link rel="stylesheet" href="songcraft-design.css">` to your HTML head
3. Use `class="sc-card"`, `class="sc-btn-gold"` etc. on your elements
4. Reference colors via `var(--sc-gold)` in your own CSS

### Option 2 — Next.js / React with TypeScript

1. Copy both `design/songcraft-design.css` AND `lib/tokens.ts`
2. Import the CSS in your `layout.tsx`:
   ```ts
   import './songcraft-design.css'
   ```
3. Use class names like above, OR use inline styles via tokens:
   ```tsx
   import { tokens } from '@/lib/tokens'
   <div style={{ background: tokens.bg.gradient, color: tokens.text.bright }}>…</div>
   ```

### Option 3 — Tailwind

Add to `tailwind.config.js`:

```js
const { tokens } = require('./lib/tokens')

module.exports = {
  theme: {
    extend: {
      colors: {
        gold: tokens.brand.gold,
        'gold-tint': tokens.brand.goldTint,
        ink: tokens.bg.base,
        body: tokens.text.body,
        muted: tokens.text.muted,
        spotify: tokens.external.spotify,
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
}
```

Then use `bg-ink text-body border-gold` etc.

---

## Design decisions worth keeping

These are the small choices that make ViaTone feel coherent. Worth keeping if you reuse this:

1. **Warm text scale, not cold grey**. Pure greys (`#888`) make UIs feel cold and "tech-y". ViaTone uses beige/brown gradients (`#e8e0d0`, `#a09080`, `#6a5a40`) that feel analog and warm — fits the music/creative domain.

2. **Single accent color (gold)** for primary actions. No secondary "blue" or "green". This makes the UI quieter and more sophisticated. Use external brand colors (Spotify green, YouTube red) only as small circular badges, never as primary UI elements.

3. **Borders, not fills**. Cards use `rgba(255,255,255,0.03)` backgrounds with thin gold borders. This creates depth without heaviness.

4. **Letter-spacing on labels**. Section labels get `letter-spacing: 1px` + uppercase — gives it editorial / album-credits feel.

5. **System font, not custom web fonts**. Loads instantly, looks native everywhere, no FOUC. The vintage feel comes from color, not typography.

6. **Status pills use color but stay neutral**. Each status has its own color (draft=beige, complete=green, released=Spotify-green) but they're outlined pills, not loud filled buttons. They inform without screaming.

7. **Hover transitions are subtle**: `border-color 0.2s`, `opacity 0.2s`. No transforms, no shadows. Keeps things calm.

8. **Mobile breaks at 700px**. Below that: headers stack, cards lose padding, modals go full-bleed.

---

## Anti-patterns (what NOT to copy)

If you reuse this in a non-music context, watch out for:

- **Status workflow colors** (`draft / in_progress / complete / released`) — only relevant for media production. Either drop them or rename to match your domain.
- **External brand colors** (Spotify green, etc.) — only include if your product touches those platforms.
- **Gold-on-black** is a strong aesthetic — works for music, film, hospitality, jewelry. May feel wrong for clinical/medical/SaaS-CRM domains. Consider swapping `--sc-gold` for a different accent and the rest of the system holds up.

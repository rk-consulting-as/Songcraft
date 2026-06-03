---
name: Sonic Ether
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393e'
  surface-container-lowest: '#0c0e12'
  surface-container-low: '#1a1c20'
  surface-container: '#1e2024'
  surface-container-high: '#282a2e'
  surface-container-highest: '#333539'
  on-surface: '#e2e2e8'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e2e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#44e2cd'
  on-secondary: '#003731'
  secondary-container: '#03c6b2'
  on-secondary-container: '#004d44'
  tertiary: '#ffb690'
  on-tertiary: '#552100'
  tertiary-container: '#ec6a06'
  on-tertiary-container: '#4a1c00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#62fae3'
  secondary-fixed-dim: '#3cddc7'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005047'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb690'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#783200'
  background: '#111317'
  on-background: '#e2e2e8'
  surface-variant: '#333539'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style

The brand personality is high-energy, futuristic, and creatively empowering, specifically designed for music producers and digital artists. It targets a demographic that thrives on late-night sessions and cutting-edge technology. 

The design style is **Dark-Mode Glassmorphism**. This aesthetic utilizes deep, multi-layered dark surfaces contrasted against vibrant, neon accents to mimic the interface of high-end digital audio workstations (DAWs) and nocturnal studio environments. Visual interest is driven by translucent layers, soft background blurs, and subtle mesh gradients that suggest depth and fluidity. The emotional response should be one of "infinite creative space"—a premium, immersive environment where the user feels like they are operating at the forefront of the music industry.

## Colors

The palette is anchored by a deep charcoal base to reduce eye strain during long production sessions.

- **Primary (Vivid Purple):** Used for core branding, active states, and primary actions. It represents creativity and the "ether."
- **Secondary (Teal):** Used for success states, data visualizations, and playhead indicators. It provides a cool, technical contrast.
- **Accent (Orange):** Reserved for high-priority calls to action, recording indicators, and limited-time offers to ensure maximum visibility.
- **Surface Strategy:** Layers are built using progressively lighter shades of slate to define hierarchy, moving from `#0F1115` at the base to `#1A1D23` for elevated containers.

## Typography

The typography system balances the bold, geometric impact of **Montserrat** for headings with the systematic precision of **Inter** for UI and body text. 

Headlines utilize tight letter-spacing and heavy weights to command attention, reflecting the energy of music titles and artist names. Body text is optimized for legibility against dark backgrounds, using a slightly increased line-height to prevent "haloing" and visual fatigue. Labels and metadata (like BPM, Key, or Bitrate) utilize Inter’s medium and semi-bold weights to maintain clarity at smaller scales.

## Layout & Spacing

This design system employs a **12-column fluid grid** for desktop and a **4-column fluid grid** for mobile. The spacing rhythm is based on a 4px baseline, ensuring all components align to a consistent mathematical scale.

- **Desktop (1440px+):** 12 columns, 24px gutters, 48px side margins.
- **Tablet (768px - 1439px):** 8 columns, 20px gutters, 32px side margins.
- **Mobile (Up to 767px):** 4 columns, 16px gutters, 16px side margins.

Layouts should favor generous whitespace (the `lg` and `xl` tokens) between major sections to let photography and artwork breathe, while using tighter spacing (`xs` and `sm`) within functional toolbars and control panels.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** combined with **Glassmorphism**. 

1. **Background (Z-0):** The deepest layer, using `#0F1115`.
2. **Standard Surface (Z-1):** Cards and main containers using `#1A1D23`.
3. **Glass Overlay (Z-2):** Modals, navigation bars, and floating controls use a semi-transparent fill (`rgba(26, 29, 35, 0.7)`) with a `20px` backdrop blur.
4. **Interactive Focus (Z-3):** Active elements or dragged items feature a subtle primary-tinted outer glow (`rgba(139, 92, 246, 0.3)`) rather than a traditional black shadow.

Shadows are "Ambient Shadows"—diffused, low-opacity, and slightly tinted with the Primary Purple color to maintain the neon, emissive feel of the UI.

## Shapes

The design system uses a **Rounded** shape language to create a soft, modern, and premium feel that offsets the technicality of the dark theme.

- **Small Components (Buttons, Inputs):** Use `rounded` (0.5rem / 8px).
- **Standard Containers (Cards, Modals):** Use `rounded-lg` (1rem / 16px).
- **Large Sections (Feature Blocks):** Use `rounded-xl` (1.5rem / 24px).
- **Status Indicators (Avatars, Tags):** Use pill-shaped (full radius) to distinguish them from functional containers.

## Components

### Buttons
- **Primary:** Solid Primary Purple gradient (to a slightly darker purple) with white text. 16px corner radius.
- **Secondary:** Transparent with a 1.5px Teal border.
- **Ghost:** No background, Secondary Text color, turning Primary Purple on hover.

### Input Fields
Inputs should use the Surface color with a subtle 1px border (`#374151`). On focus, the border transitions to Primary Purple with a soft glow. Placeholder text should use the Secondary Text color.

### Glass Cards
Used for track listings or artist profiles. Features a 1px "inner-stroke" (border-top/left) in a light highlight color (`rgba(255, 255, 255, 0.1)`) to simulate the edge of glass catching the light.

### Audio Visualizers
Use the Secondary Teal for waveform displays. Active regions of the waveform should glow, while inactive regions should be desaturated.

### Chips & Tags
Small, pill-shaped elements with low-opacity background tints of the Primary or Secondary colors. Text within chips should be semi-bold and capitalized for readability at small sizes.

### Sliders (Mixer Controls)
Knobs and faders should be tactile. Use a Primary-to-Secondary gradient for "filled" tracks to represent signal flow or progress.
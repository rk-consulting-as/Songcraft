# Technical Design Specification: Sonic Ether (VIBE_LAB)

This document provides the design tokens and component specifications for the "Sonic Ether" music platform. Use this as a reference for your Tailwind configuration and component library in Cursor/Claude.

## 1. Design Tokens (Tailwind Theme Extension)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8B5CF6', // Vivid Purple
          light: '#A78BFA',
          dark: '#7C3AED',
        },
        accent: {
          cyan: '#00F2EA', // Electric Cyan
          coral: '#FF6B6B',
        },
        surface: {
          DEFAULT: '#111317', // Main Background
          container: '#1A1C20', // Card/Section Background
          bright: '#37393E',
          dim: '#0C0E12',
        },
        on: {
          surface: '#FFFFFF',
          'surface-variant': '#94A3B8',
        }
      },
      fontFamily: {
        headline: ['Montserrat', 'sans-serif'],
        body: ['Montserrat', 'sans-serif'],
      },
      borderRadius: {
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-cyan': '0 0 20px rgba(0, 242, 234, 0.3)',
      },
      backdropBlur: {
        'xl': '20px',
      }
    }
  }
}
```

## 2. Visual Identity & Atmosphere
- **Style:** Futurism / Glassmorphism.
- **Backgrounds:** Deep dark greys (`#111317`) with subtle gradients.
- **Effects:** High use of `backdrop-blur-xl`, `bg-opacity/70`, and thin borders (`border-white/10`).
- **Glows:** Primary actions and active states should have a soft purple outer glow.

## 3. Core Component Library

### Navigation Shell
- **TopNavBar:** Fixed top, blurred background (`bg-surface/70 backdrop-blur-xl`), thin bottom border.
- **SideNavBar:** Persistent left on desktop, 256px wide, grouping: Main (Feed, Studio, Profile), Financial (Earnings), and Library.

### UI Components
- **Primary Button:** Gradient from `primary-dark` to `primary`, white text, rounded-lg, hover:scale-105.
- **Ghost Button:** `border border-primary text-primary`, hover:bg-primary/10.
- **Stat Cards:** `bg-surface-container`, rounded-xl, padding 6, border 1px white/5. Include sparkline charts in Cyan.
- **Artist Cards:** Image-heavy, gradient overlay for text legibility, quick action menus.

## 4. Screen Architecture Reference
1. **Producer Dashboard:** Multi-artist view with global analytics (Cyan) and project status trackers.
2. **AI Studio:** Stepper-based wizard (Ideation -> Structure -> Lyrics -> Visuals). Chat-like interface for AI interaction.
3. **Artist Profile:** Hero image header, discography grid, and "Support the Journey" donation/merch section.
4. **Affiliate Dashboard:** Hierarchical node map (Network Topology) and commission ledger.

## 5. Implementation Prompt for Claude/Cursor
"I am implementing the Sonic Ether design system for a music producer platform. The tech stack is React, Tailwind CSS, and Lucide/Material icons. Use the provided Tailwind config for colors and fonts. Focus on a high-end studio feel using glassmorphism and purple/cyan accents. Start by creating a responsive 'DashboardLayout' with the sidebar and top navigation."

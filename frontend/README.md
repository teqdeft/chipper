# Chipper — Organ-on-a-Chip landing page

A premium, production-ready marketing site for **Chipper**, an open community
platform for microphysiological systems (organ-on-a-chip designs). Built to the
**Chipper Design System v6** — warm canvas, coral lead, periwinkle counter-anchor,
aubergine ink, Bricolage Grotesque + Inter.
.
## Stack

- **Vite 6** + **React 18** + **TypeScript**
- **Tailwind CSS** — design tokens encode the full v6 palette, type scale, radii, shadows
- **Framer Motion** — scroll reveals, staggers, magnetic CTAs, count-ups
- **GSAP ScrollTrigger** — the pinned hero scrub
- **Lenis** — smooth scroll (one shared scroll system, slaved to ScrollTrigger)

## The hero

The centrepiece is a **scroll-scrubbed film**: the shared organ-on-a-chip footage
is decoded to an image sequence and painted to a `<canvas>`, one frame per scroll
position. Scrolling *is* the camera move — the chip floats, its lid lifts to reveal
the glowing microfluidic channels, then the view dives into the fluid detail. The
cool footage is warmed into the brand with a canvas-edge vignette, a soft-light
coral/periwinkle wash and a legibility scrim. Desktop and mobile use separate frame
sets; `prefers-reduced-motion` shows a static first frame.

### Regenerating the hero frames

Frames live in `public/frames/{desktop,mobile}/`. To regenerate from a source video:

```bash
# desktop: 1280-wide, 15fps (~150 frames)
ffmpeg -i source.mp4 -vf "fps=15,scale=1280:-2" -q:v 4 public/frames/desktop/f-%03d.jpg
# mobile: 720-wide, 12fps (~120 frames)
ffmpeg -i source.mp4 -vf "fps=12,scale=720:-2"  -q:v 6 public/frames/mobile/f-%03d.jpg
```

If the frame counts change, update `DESKTOP`/`MOBILE` in
`src/components/hero/FrameSequence.tsx`.

## Content

All copy, specs and figures are grounded in the design-system document — the
component specs (2.0 µL/min, 5 kPa, ±2%, 0.5–12 µL/min, 40 kPa), ISO 22916, the
licences, organ tags, materials, fabrication methods and community numbers
(13 labs · 248 designs · 1.2k reuses) are taken from it verbatim. Nothing was
invented. See `src/lib/content.ts`.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the production build
```

## Structure

```
public/
  favicon.svg
  frames/               desktop + mobile hero frame sequences
src/
  app/                  App shell, entry, providers
    App.tsx
    main.tsx
    providers/          SmoothScrollProvider (Lenis + ScrollTrigger)
  components/
    hero/               Hero (scroll pin) + FrameSequence (canvas film)
    layout/             Navbar, Footer
    sections/           About, Platform, Library, Organs, Applications,
                        Workflow, Materials, Stats, Featured, CTA
    ui/                 Section, SectionHeading, Reveal, MagneticButton,
                        AnimatedNumber, ScrollProgress, Logo
  hooks/                useReducedMotion, useDeviceTier
  lib/                  content, utilities, heroScroll store
  styles/               global Tailwind + design tokens
```

## Accessibility & performance

- Semantic landmarks, single H1, ordered headings, skip link, keyboard-visible focus rings
- `prefers-reduced-motion` respected across reveals, hero and count-ups
- Decorative canvas/animations are `aria-hidden`; meaning lives in real text
- Hero paints on the first frame and streams the rest in the background
- Production build splits React, motion, and scroll vendors into separate chunks

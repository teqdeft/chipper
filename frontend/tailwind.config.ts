import type { Config } from 'tailwindcss';

/**
 * Chipper Design System v6 — tokenised.
 * Colours carry their intended ROLE, not just a hex.
 * Primary builds every screen; secondary colours do one job each.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // GROUNDS AND INK
        canvas: '#FFFCF9', // page ground
        surface: '#FFFFFF', // cards, panels, blocks
        aubergine: '#45081F', // ink — all text, dark blocks, button outline
        muted: '#6B4451', // secondary text, labels
        line: '#F0E9E3', // hairlines, card borders
        'line-strong': '#DFD5CD', // input borders, hover border

        // LEAD AND ACCENTS
        coral: '#FC7147', // the lead, logo, ISO pill, active filter
        'deep-coral': '#B8431F', // accent text only (small coral fails)
        yellow: '#FFD98A', // primary button, start something
        pink: '#FFBBD6', // tag, one avatar

        // COOL ANCHOR
        periwinkle: '#9999DD', // cool blocks, light strength
        'deep-periwinkle': '#403DD6', // download button, app icon
        'periwinkle-tint': '#E4E6FB', // together badge, ghost hover

        // TINTS
        'coral-tint': '#FFE7DE', // avatar fill, tint surfaces
        'yellow-tint': '#FFF3D9', // gradient end stop

        // STATUS GREEN · confirm and verified only
        green: '#22C88A', // checkmark, confirm
        'published-green': '#0A7A50', // published status text and dot

        // HOVERS
        'yellow-hover': '#F7C25A', // primary button hover
        'deep-periwinkle-hover': '#2F2CA6', // download hover

        // Preflight hard-codes `colors.gray.400` as the placeholder colour.
        // Point it at muted so no grey ever reaches the built CSS.
        gray: { 400: '#6B4451' },
      },
      // Framework defaults pulled onto the palette. Tailwind's preflight and its
      // ring/border machinery otherwise emit gray-200 / blue-500 into the build,
      // and the client diffs the built CSS against the tokens.
      borderColor: { DEFAULT: '#F0E9E3' }, // line
      ringColor: { DEFAULT: '#FC7147' }, // coral
      ringOffsetColor: { DEFAULT: '#FFFCF9' }, // canvas
      fontFamily: {
        display: ['var(--font-bricolage)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Fluid display scale — slightly tighter floor on small phones
        // Hero headline — capped for MacBook/laptop (client: was way too big at 7.5rem)
        'display-xl': ['clamp(2.35rem, 5.2vw, 4.75rem)', { lineHeight: '0.96', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(2.15rem, 5.5vw, 5rem)', { lineHeight: '0.98', letterSpacing: '-0.025em' }],
        'display-md': ['clamp(1.75rem, 4vw, 3.5rem)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        'display-sm': ['clamp(1.4rem, 3vw, 2.5rem)', { lineHeight: '1.06', letterSpacing: '-0.015em' }],
      },
      letterSpacing: {
        eyebrow: '0.12em', // Inter 600 caps eyebrows/labels
      },
      borderRadius: {
        // Styleguide v6 radii — buttons 999px · cards 14px · inputs 6px
        btn: '999px',
        field: '6px',
        card: '14px',
        'card-lg': '14px', // one card radius in v6; alias kept for call sites
        pill: '999px',
      },
      backgroundImage: {
        // Preview gradient — coral tint → yellow tint, 135deg. Preview and spec blocks.
        preview: 'linear-gradient(135deg, #FFE7DE 0%, #FFF3D9 100%)',
      },
      boxShadow: {
        // Soft, aubergine-tinted. Restraint over drama.
        soft: '0 1px 2px rgba(69,8,31,0.04), 0 8px 24px -12px rgba(69,8,31,0.14)',
        'card-hover': '0 2px 4px rgba(69,8,31,0.05), 0 24px 48px -20px rgba(69,8,31,0.30)',
        lift: '0 30px 80px -40px rgba(69,8,31,0.35)',
        ring: '0 0 0 4px rgba(252,113,71,0.28)', // accent focus ring
      },
      maxWidth: {
        content: '1200px',
        prose: '68ch',
      },
      spacing: {
        // Mobile keeps sections close; tablet+ stays generous
        section: 'clamp(5rem, 10vw, 11rem)',
        gutter: 'clamp(1.25rem, 4.5vw, 3rem)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)', // expensive, calm ease-out
        'ease-in-out-soft': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      keyframes: {
        'flow-dash': {
          to: { strokeDashoffset: '-1000' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drift: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        // Overlays: no travel, just a fast settle. Anything slower reads as lag
        // on a control the user just clicked.
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'zoom-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'flow-dash': 'flow-dash 8s linear infinite',
        'fade-up': 'fade-up 0.8s cubic-bezier(0.22,1,0.36,1) both',
        drift: 'drift 9s ease-in-out infinite',
        'fade-in': 'fade-in 180ms ease-out both',
        'zoom-in': 'zoom-in 220ms cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
};

export default config;

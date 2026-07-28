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
        // PRIMARY · what the page is made of
        canvas: '#FFFCF9', // warm white — the ground
        coral: '#FC7147', // the lead
        periwinkle: '#9999DD', // the cool anchor
        aubergine: '#45081F', // ink — all text, dark blocks, button outline

        // SECONDARY · one job each
        'deep-coral': '#B8431F', // accent text only (coral fails as small type)
        'deep-periwinkle': '#403DD6', // the "get something" button, app icon
        'periwinkle-tint': '#E4E6FB', // anchor at low strength — surfaces
        yellow: '#FFD98A', // "start something" button only
        'yellow-hover': '#F7C25A',
        'deep-periwinkle-hover': '#2F2CA6',
        pink: '#FFBBD6', // the lift — badges, previews
        green: '#22C88A', // status only — confirmed / verified

        // Neutral ink steps derived from aubergine for restrained hierarchy
        'ink-70': 'rgba(69, 8, 31, 0.70)',
        'ink-55': 'rgba(69, 8, 31, 0.55)',
        'ink-40': 'rgba(69, 8, 31, 0.40)',
        line: 'rgba(69, 8, 31, 0.10)', // restrained border
        'line-strong': 'rgba(69, 8, 31, 0.22)', // hover / active border
      },
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
        btn: '10px', // --btn-radius
        field: '6px', // forms — radius halved from 12 to 6
        card: '20px',
        'card-lg': '28px',
        pill: '999px',
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
      },
      animation: {
        'flow-dash': 'flow-dash 8s linear infinite',
        'fade-up': 'fade-up 0.8s cubic-bezier(0.22,1,0.36,1) both',
        drift: 'drift 9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;

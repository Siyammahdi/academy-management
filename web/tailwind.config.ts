import type { Config } from 'tailwindcss';

// Every value here is a literal transcription of docs/09-ui-design-system.md
// §2 (Palette), §3 (Typography), §4 (Space and layout). Nothing here is
// invented — if a color, size, or radius isn't in that document, it isn't
// in this file either. Components must use these tokens exclusively; no
// arbitrary Tailwind values.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    // Replaces Tailwind's default palette entirely — doc 09 §2 is a closed set.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',

      paper: {
        DEFAULT: 'var(--paper)', // marketing
        app: 'var(--paper-app)', // application
        raised: 'var(--paper-raised)',
        sunken: 'var(--paper-sunken)',
      },
      ink: {
        DEFAULT: 'var(--ink)',
        muted: 'var(--ink-muted)',
        faint: 'var(--ink-faint)',
      },
      rule: {
        DEFAULT: 'var(--rule)',
        strong: 'var(--rule-strong)',
      },
      // Accent — deep purple (doc 09 §2). purple: primary fill/links,
      // purple-deep: hover/darker, purple-wash: light ring/background wash,
      // purple-tint: surface tint (equals the marketing --paper value).
      purple: {
        DEFAULT: 'var(--purple)',
        deep: 'var(--purple-deep)',
        wash: 'var(--purple-wash)',
        tint: 'var(--purple-tint)',
      },
      paid: {
        DEFAULT: 'var(--paid)',
        wash: 'var(--paid-wash)',
      },
      pending: {
        DEFAULT: 'var(--pending)',
        wash: 'var(--pending-wash)',
      },
      overdue: {
        DEFAULT: 'var(--overdue)',
        wash: 'var(--overdue-wash)',
      },
      neutral: {
        DEFAULT: 'var(--neutral)',
        wash: 'var(--neutral-wash)',
      },
    },

    // Replaces Tailwind's default families — doc 09 §3's three roles only.
    fontFamily: {
      display: ['var(--font-display)', 'Georgia', 'serif'],
      body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      numeric: ['var(--font-numeric)', 'ui-monospace', 'monospace'],
    },

    // Replaces Tailwind's default scale — doc 09 §3's seven steps only.
    fontSize: {
      display: 'var(--text-display)', // 44px
      h1: 'var(--text-h1)', // 32px
      h2: 'var(--text-h2)', // 24px
      h3: 'var(--text-h3)', // 18px
      body: 'var(--text-body)', // 15px — base
      sm: 'var(--text-sm)', // 13px
      xs: 'var(--text-xs)', // 11px
    },

    // doc 09 §3: 1.65 prose, 1.4 UI, 1.2 display.
    lineHeight: {
      display: '1.2',
      ui: '1.4',
      prose: '1.65',
    },

    // doc 09 §3: 400 body, 500 UI emphasis/labels, 600 headings. Never 700+
    // — so bold/extrabold/black simply don't exist as tokens.
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
    },

    letterSpacing: {
      normal: '0',
      // doc 09 §3 — eyebrow labels (section markers, table headers)
      eyebrow: '0.08em',
    },

    // Replaces Tailwind's default spacing scale — doc 09 §4's 8px-base
    // steps only (plus 0, which needs no justification).
    spacing: {
      0: '0px',
      1: 'var(--space-1)', // 4px
      2: 'var(--space-2)', // 8px
      3: 'var(--space-3)', // 12px
      4: 'var(--space-4)', // 16px
      6: 'var(--space-6)', // 24px
      8: 'var(--space-8)', // 32px
      12: 'var(--space-12)', // 48px
      16: 'var(--space-16)', // 64px
      24: 'var(--space-24)', // 96px
    },

    // doc 09 §4 — restrained. Nothing fully rounded except avatars (`full`).
    borderRadius: {
      none: '0px',
      sm: 'var(--radius-sm)', // 4px — inputs, pills
      md: 'var(--radius-md)', // 8px — cards, panels
      full: '9999px', // avatars only
    },

    // doc 09 §4 — two shadows. Application cards never use `card`; they
    // stay flat (hairline rules only). Marketing-only (doc 09 §9).
    boxShadow: {
      none: 'none',
      overlay: 'var(--shadow-overlay)', // modals, drawers
      card: 'var(--shadow-card)', // marketing cards only
    },

    // doc 09 §4 — container widths.
    maxWidth: {
      marketing: '1120px',
      app: '1280px',
      reading: '68ch',
    },

    extend: {
      // doc 09 §5 gives these as explicit prose dimensions (not part of the
      // 8px spacing scale) — tokenized here so components never hardcode
      // an arbitrary height. Buttons and inputs are both 40px (36px compact).
      height: {
        control: '40px',
        'control-compact': '36px',
        dot: '6px', // the status-pill dot (§5)
      },
      width: {
        dot: '6px',
      },
      // Not in doc 09 — it only defines the 3 page-container widths.
      // Auth/narrow forms need something in between those and the input
      // controls above; this is a reasonable, clearly-scoped named token
      // rather than an arbitrary value in a component.
      maxWidth: {
        narrow: '28rem',
      },
    },
  },
  plugins: [],
};

export default config;

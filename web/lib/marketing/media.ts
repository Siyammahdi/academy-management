/**
 * Marketing photography registry.
 *
 * Every public-site image is declared here so the client's own photography
 * can replace these placeholders in one file. Swap `src` for a path under
 * `/public` (or a CDN URL added to `next.config.ts` remotePatterns) and keep
 * the aspect ratios listed beside each entry — the layouts are built around
 * them.
 *
 * Placeholders are freely licensed Unsplash photographs.
 */

export interface MarketingImage {
  src: string
  /** Empty string marks a purely decorative image. */
  alt: string
}

function unsplash(id: string, width: number): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`
}

export const MEDIA = {
  /** Hero, portrait 4:5 — a student in an online session. */
  heroPrimary: {
    src: unsplash('photo-1597933471507-1ca5765185d8', 1200),
    alt: 'A student following an online class from a laptop at home.',
  },
  /** Hero inset, square — handwritten study notes. */
  heroDetail: {
    src: unsplash('photo-1520569495996-b5e1219cb625', 800),
    alt: 'Handwritten notes beside an open book on a desk.',
  },

  /** About the academy, portrait 3:4 — manuscript calligraphy. */
  academyPrimary: {
    src: unsplash('photo-1720701574998-d68020bce2bd', 1200),
    alt: 'Arabic calligraphy on an old manuscript page with gold detailing.',
  },
  /** About the academy, landscape — an open book on a table. */
  academyDetail: {
    src: unsplash('photo-1725007995235-6979cb34ff8e', 900),
    alt: 'An open book resting on a wooden table.',
  },

  /** Flagship program — Arabic. Landscape 5:4. */
  programArabic: {
    src: unsplash('photo-1646229227468-ba6eb534d368', 1400),
    alt: 'Arabic calligraphy inscribed across an ornamented ceiling.',
  },
  /** Flagship program — Qur'an. Landscape 5:4. */
  programQuran: {
    src: unsplash('photo-1542816417-0983c9c9ad53', 1400),
    alt: 'An open Qur’an resting on a wooden stand.',
  },

  /** Weekly rhythm panels, portrait 3:4. */
  experienceClass: {
    src: unsplash('photo-1513258496099-48168024aec0', 1000),
    alt: 'A student wearing headphones during a live online session.',
  },
  experienceHomework: {
    src: unsplash('photo-1512238972088-8acb84db0771', 1000),
    alt: 'A student writing an assignment at a desk.',
  },
  experienceRecording: {
    src: unsplash('photo-1616587226960-4a03badbe8bf', 1000),
    alt: 'A student rewatching a recorded class on a laptop.',
  },
  experienceFees: {
    src: unsplash('photo-1547567667-1aa64e6f58dc', 1000),
    alt: 'A person turning the page of a book at a quiet desk.',
  },

  /** Trust section, landscape — a teacher working through a point. */
  assurance: {
    src: unsplash('photo-1522881193457-37ae97c905bf', 1200),
    alt: 'A teacher explaining a point to a student.',
  },
  /** Enrollment journey, portrait — students reading together. */
  journey: {
    src: unsplash('photo-1663162550932-f67b561e656f', 1000),
    alt: 'A small group of students reading from a book together.',
  },

  /** Closing call to action, wide full-bleed. */
  closing: {
    src: unsplash('photo-1577561426384-62154a1e9457', 1800),
    alt: '',
  },
} as const satisfies Record<string, MarketingImage>

export type MediaKey = keyof typeof MEDIA

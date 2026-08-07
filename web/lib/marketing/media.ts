/**
 * Marketing photography registry.
 *
 * Every public-site image is declared here so photography can be swapped in
 * one place. Assets live under `/public` — prefer `/marketing/*` for section
 * photography and `/poster_square/*` for course posters.
 *
 * Sources: Unsplash (free license). Swap `src` for client photography when ready.
 */

export interface MarketingImage {
  src: string
  /** Empty string marks a purely decorative image. */
  alt: string
}

export const MEDIA = {
  /** Landing hero full-bleed background. */
  heroBg: {
    src: '/backgrounds/hero-bg.jpg',
    alt: '',
  },
  /** Portrait — Blue Mosque, Shah Alam. */
  heroPrimary: {
    src: '/marketing/hero-primary.jpg',
    alt: 'The Blue Mosque in Shah Alam under warm evening light.',
  },
  /** Detail — Arabic manuscript page. */
  heroDetail: {
    src: '/marketing/hero-detail.jpg',
    alt: 'Arabic calligraphy on an illuminated manuscript page.',
  },

  /** About the academy — manuscript calligraphy. */
  academyPrimary: {
    src: '/marketing/academy-primary.jpg',
    alt: 'Arabic calligraphy on an old manuscript page with gold detailing.',
  },
  /** About the academy — sacred architecture. */
  academyDetail: {
    src: '/marketing/academy-detail.jpg',
    alt: 'The Kaaba and pilgrims in the courtyard of Masjid al-Haram.',
  },

  /** Flagship program — Arabic calligraphy. */
  programArabic: {
    src: '/marketing/program-arabic.jpg',
    alt: 'Backlit Arabic calligraphy cut into a modern architectural panel.',
  },
  /** Flagship program — Qur’an. */
  programQuran: {
    src: '/marketing/program-quran.jpg',
    alt: 'A navy Qur’an with gold embossing on a dark surface.',
  },

  /** Experience — live class on a laptop. */
  experienceClass: {
    src: '/marketing/experience-class.jpg',
    alt: 'A student wearing headphones during a live online session.',
  },
  /** Experience — homework and study materials. */
  experienceHomework: {
    src: '/marketing/experience-homework.jpg',
    alt: 'A stack of study books on a desk.',
  },
  /** Experience — recordings / revisiting lessons. */
  experienceRecording: {
    src: '/marketing/experience-recording.jpg',
    alt: 'Glowing Arabic calligraphy across an architectural surface.',
  },
  /** Experience — clear fees and dues. */
  experienceFees: {
    src: '/marketing/experience-fees.jpg',
    alt: 'A Qur’an with gold calligraphy under warm light.',
  },

  /** Trust section. */
  assurance: {
    src: '/marketing/assurance.jpg',
    alt: 'A Qur’an with gold calligraphy resting in soft light.',
  },
  /** Enrollment journey. */
  journey: {
    src: '/marketing/journey.jpg',
    alt: 'Al-Masjid an-Nabawi under warm evening light.',
  },

  /** Closing call to action — full-bleed. */
  closing: {
    src: '/marketing/closing.jpg',
    alt: '',
  },

  /** Extra Islamic architecture — available for about / contact. */
  mosqueCourtyard: {
    src: '/marketing/mosque-courtyard.jpg',
    alt: 'The Kaaba and pilgrims in the courtyard of Masjid al-Haram.',
  },
  studyBooks: {
    src: '/marketing/study-books.jpg',
    alt: 'A stack of colourful study books.',
  },

  /** Hero marquee — academy course posters from /public/poster_square. */
  posterArabic: {
    src: '/poster_square/learning_arabic.png',
    alt: 'Learning Arabic course poster',
  },
  posterAleema: {
    src: '/poster_square/aleema.png',
    alt: 'Aleema course poster',
  },
  posterFiqh: {
    src: '/poster_square/fiqhun_nisa.png',
    alt: 'Fiqh for women course poster',
  },
  posterAkhlaq: {
    src: '/poster_square/husnul_khuluk.png',
    alt: 'Husnul Khuluq course poster',
  },
  posterParenting: {
    src: '/poster_square/parenting.png',
    alt: 'Parenting course poster',
  },
} as const satisfies Record<string, MarketingImage>

/** Ordered set used by the landing hero infinite marquee. */
export const HERO_POSTERS = [
  MEDIA.posterArabic,
  MEDIA.posterAleema,
  MEDIA.posterFiqh,
  MEDIA.posterAkhlaq,
  MEDIA.posterParenting,
] as const

export type MediaKey = keyof typeof MEDIA

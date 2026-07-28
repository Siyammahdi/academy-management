/**
 * Marketing copy entry points.
 *
 * Prefer `useMarketingCopy()` in client components. Static pages that need
 * English-only defaults can import from here; Bangla lives in `bn.ts`.
 */

export type {
  MarketingCopy,
  MarketingFact,
  MarketingProgramCopy,
} from '@/lib/marketing/types'
export { getMarketingCopy, CONTACT, ACADEMY } from '@/lib/marketing/dictionary'
export { en } from '@/lib/marketing/en'
export { bn } from '@/lib/marketing/bn'

/** Shared program keyword list for matching live API titles (not translated). */
export const FLAGSHIP_KEYWORDS = [
  'arabic',
  'qur',
  'quran',
  'koran',
  'hifz',
  'tajweed',
] as const

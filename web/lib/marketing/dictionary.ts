import type { Locale } from '@/lib/i18n/locale'
import { bn } from '@/lib/marketing/bn'
import { en } from '@/lib/marketing/en'
import type { MarketingCopy } from '@/lib/marketing/types'

const DICTIONARIES: Record<Locale, MarketingCopy> = {
  en,
  bn,
}

export function getMarketingCopy(locale: Locale): MarketingCopy {
  return DICTIONARIES[locale]
}

/** Locale-invariant contact details (same address in both languages). */
export const CONTACT = en.contact

/** @deprecated Prefer getMarketingCopy(locale) — kept for gradual migration. */
export const ACADEMY = en.academy

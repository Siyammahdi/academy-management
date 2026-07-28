export type Locale = 'en' | 'bn'

export const LOCALES: readonly Locale[] = ['en', 'bn'] as const

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_STORAGE_KEY = 'annahda-locale'

export const LOCALE_LABELS: Record<Locale, { short: string; native: string }> = {
  en: { short: 'EN', native: 'English' },
  bn: { short: 'বাং', native: 'বাংলা' },
}

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'bn'
}

export function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    return isLocale(raw) ? raw : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

export function writeStoredLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Private mode / blocked storage — preference simply does not persist.
  }
}

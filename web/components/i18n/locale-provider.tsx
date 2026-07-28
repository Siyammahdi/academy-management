'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import {
  DEFAULT_LOCALE,
  readStoredLocale,
  writeStoredLocale,
  type Locale,
} from '@/lib/i18n/locale'
import { getMarketingCopy } from '@/lib/marketing/dictionary'
import type { MarketingCopy } from '@/lib/marketing/types'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  copy: MarketingCopy
}

const listeners = new Set<() => void>()
let currentLocale: Locale = DEFAULT_LOCALE
let hydrated = false

function ensureHydrated(): void {
  if (hydrated || typeof window === 'undefined') return
  currentLocale = readStoredLocale()
  document.documentElement.lang = currentLocale
  hydrated = true
}

function subscribe(onStoreChange: () => void): () => void {
  ensureHydrated()
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

function getSnapshot(): Locale {
  ensureHydrated()
  return currentLocale
}

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE
}

function emit(): void {
  listeners.forEach((listener) => listener())
}

/**
 * Public-site locale only. Dashboards stay English — this provider is
 * mounted exclusively under `app/(public)`.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setLocale = useCallback((next: Locale) => {
    if (next === currentLocale && hydrated) {
      document.documentElement.lang = next
      return
    }
    currentLocale = next
    hydrated = true
    writeStoredLocale(next)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next
    }
    emit()
  }, [])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      copy: getMarketingCopy(locale),
    }),
    [locale, setLocale],
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return ctx
}

/** Marketing copy for the active public-site locale. */
export function useMarketingCopy(): MarketingCopy {
  return useLocale().copy
}

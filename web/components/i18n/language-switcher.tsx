'use client'

import { useLocale } from '@/components/i18n/locale-provider'
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/locale'
import { cn } from '@/lib/utils'

/** Compact EN / বাং toggle for the public header. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale()

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        'inline-flex items-center rounded-lg bg-muted p-0.5',
        className,
      )}
    >
      {LOCALES.map((code) => (
        <LocaleButton
          key={code}
          code={code}
          active={locale === code}
          onSelect={setLocale}
        />
      ))}
    </div>
  )
}

function LocaleButton({
  code,
  active,
  onSelect,
}: {
  code: Locale
  active: boolean
  onSelect: (locale: Locale) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={LOCALE_LABELS[code].native}
      onClick={() => onSelect(code)}
      className={cn(
        'min-h-8 min-w-9 rounded-md px-2 text-xs font-medium transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {LOCALE_LABELS[code].short}
    </button>
  )
}

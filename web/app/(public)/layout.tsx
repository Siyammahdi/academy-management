import type { ReactNode } from 'react'

import { LocaleProvider } from '@/components/i18n/locale-provider'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'

/**
 * doc 09 §9 — the public marketing surface.
 *
 * Sections pre-hide the elements GSAP is about to reveal, which would leave
 * them invisible with scripting off. The noscript rule below restores them.
 * Any new reveal hook must be listed here too.
 */
const NO_SCRIPT_REVEAL = `[data-hero-eyebrow],[data-hero-fade],[data-hero-fact],[data-hero-detail],[data-cta-fade],[data-page-fade]{opacity:1!important;transform:none!important}`

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <div className="flex min-h-svh flex-col bg-background">
        <noscript>
          <style>{NO_SCRIPT_REVEAL}</style>
        </noscript>
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </LocaleProvider>
  )
}

'use client'

import Link from 'next/link'

import { useLocale, useMarketingCopy } from '@/components/i18n/locale-provider'
import { AboutSections } from '@/components/marketing/about-sections'
import { LandingCta } from '@/components/marketing/landing-cta'
import { MarketingPageHero } from '@/components/marketing/marketing-page-hero'
import { Button } from '@/components/ui/button'

export function AboutPageContent() {
  const { locale } = useLocale()
  const t = useMarketingCopy()

  return (
    <div key={locale}>
      <MarketingPageHero
        eyebrow={t.about.eyebrow}
        title={t.about.title}
        lead={t.about.lead}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="min-h-11" render={<Link href="/#programs" />}>
            {t.about.seePrograms}
          </Button>
          <Button
            variant="ghost"
            className="min-h-11 text-primary-strong hover:bg-background/70"
            render={<Link href="/contact" />}
          >
            {t.about.contactAdmissions}
          </Button>
        </div>
      </MarketingPageHero>

      <AboutSections />
      <LandingCta />
    </div>
  )
}

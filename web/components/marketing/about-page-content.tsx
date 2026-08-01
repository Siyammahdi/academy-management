'use client'

import Link from 'next/link'

import { useLocale, useMarketingCopy } from '@/components/i18n/locale-provider'
import { AboutSections } from '@/components/marketing/about-sections'
import { LandingCta } from '@/components/marketing/landing-cta'
import { MarketingPageHero } from '@/components/marketing/marketing-page-hero'
import { Container } from '@/components/layout/container'
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

      <Container width="marketing" className="py-12 sm:py-16">
        <div className="max-w-2xl rounded-xl bg-primary-wash px-6 py-6 sm:px-8 sm:py-8">
          <p className="text-xs font-medium tracking-wide text-primary-strong uppercase">
            {t.about.registrationHeading}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t.about.registrationBody}
          </p>
          <p className="mt-5 text-sm text-foreground">
            <span className="font-medium">{t.about.tradeLicenseLabel}:</span>{' '}
            <span className="font-heading text-base font-semibold tabular-nums tracking-tight">
              {t.contact.tradeLicense}
            </span>
          </p>
        </div>
      </Container>

      <AboutSections />
      <LandingCta />
    </div>
  )
}

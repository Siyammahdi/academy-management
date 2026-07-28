'use client'

import { AcademyDataProvider } from '@/components/marketing/academy-data'
import { LandingHero } from '@/components/marketing/landing-hero'
import { LandingAcademy } from '@/components/marketing/landing-academy'
import { LandingPrograms } from '@/components/marketing/landing-programs'
import { LandingExperience } from '@/components/marketing/landing-experience'
import { LandingEnrollment } from '@/components/marketing/landing-enrollment'
import { LandingAssurance } from '@/components/marketing/landing-assurance'
import { LandingFaq } from '@/components/marketing/landing-faq'
import { LandingCta } from '@/components/marketing/landing-cta'
import { LandingSmoothScroll } from '@/components/marketing/landing-smooth-scroll'
import { useLocale } from '@/components/i18n/locale-provider'

/**
 * Public home page.
 *
 * Remounts on locale change so GSAP timelines re-run with the new copy.
 * Lenis smooth scroll is landing-only and respects reduced motion.
 */
export function LandingPage() {
  const { locale } = useLocale()

  return (
    <LandingSmoothScroll>
      <AcademyDataProvider>
        <div key={locale}>
          <LandingHero />
          <LandingAcademy />
          <LandingPrograms />
          <LandingExperience />
          <LandingEnrollment />
          <LandingAssurance />
          <LandingFaq />
          <LandingCta />
        </div>
      </AcademyDataProvider>
    </LandingSmoothScroll>
  )
}

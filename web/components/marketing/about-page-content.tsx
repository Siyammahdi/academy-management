'use client'

import Link from 'next/link'
import { useRef } from 'react'

import { useLocale, useMarketingCopy } from '@/components/i18n/locale-provider'
import { AboutLocations } from '@/components/marketing/about-locations'
import { AboutSections } from '@/components/marketing/about-sections'
import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingCta } from '@/components/marketing/landing-cta'
import { MarketingImage } from '@/components/marketing/marketing-image'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { fadeRise, imageReveal, wordRise } from '@/lib/gsap/motion'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import { MEDIA } from '@/lib/marketing/media'
import { cn } from '@/lib/utils'

export function AboutPageContent() {
  const { locale } = useLocale()
  const t = useMarketingCopy()
  const heroRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()

  useGsapContext(heroRef, (gsap) => {
    const root = heroRef.current
    if (!root) return

    const headline = root.querySelector<HTMLElement>('[data-about-title]')
    if (headline) wordRise(gsap, headline, { stagger: 0.04, start: 'top 95%' })

    const soft = root.querySelectorAll('[data-about-fade]')
    if (soft.length) {
      fadeRise(gsap, soft, { stagger: 0.1, y: 18, start: 'top 95%' })
    }

    const frame = root.querySelector('[data-about-hero-frame]')
    if (frame) imageReveal(gsap, frame, { trigger: root, start: 'top 90%' })
  }, [])

  const hidden = !reduced ? 'opacity-0' : undefined

  return (
    <div key={locale}>
      <section className="relative overflow-hidden" ref={heroRef}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-primary-wash"
        />
        <Container
          width="marketing"
          className="relative grid items-end gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:gap-14 lg:py-24"
        >
          <div className="lg:col-span-6">
            <Eyebrow className={hidden} data-about-fade>
              {t.about.eyebrow}
            </Eyebrow>
            <h1
              data-about-title
              className="mt-6 font-heading text-4xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-5xl"
            >
              {t.about.title}
            </h1>
            <p
              data-about-fade
              className={cn(
                'mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg',
                hidden,
              )}
            >
              {t.about.lead}
            </p>
            <div
              data-about-fade
              className={cn('mt-8 flex flex-col gap-3 sm:flex-row', hidden)}
            >
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
          </div>

          <div className="lg:col-span-5 lg:col-start-8">
            <div data-about-hero-frame>
            <MarketingImage
              image={MEDIA.heroPrimary}
              className="aspect-4/5 w-full sm:aspect-5/4 lg:aspect-4/5"
              sizes="(min-width: 1024px) 40vw, 100vw"
            />
            </div>
          </div>
        </Container>
      </section>

      <AboutSections />
      <AboutLocations />
      <LandingCta />
    </div>
  )
}

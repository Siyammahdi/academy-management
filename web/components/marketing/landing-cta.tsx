'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { MarketingImage } from '@/components/marketing/marketing-image'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { fadeRise, parallax, wordRise } from '@/lib/gsap/motion'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { useMagnetic } from '@/lib/gsap/use-magnetic'
import { MEDIA } from '@/lib/marketing/media'
import { useMarketingCopy } from '@/components/i18n/locale-provider'

/** Closing invitation: full-bleed photograph, one magnetic primary action. */
export function LandingCta() {
  const t = useMarketingCopy()
  const closing = t.closing
  const rootRef = useRef<HTMLElement>(null)
  const magneticRef = useMagnetic<HTMLAnchorElement>(0.22)

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const headline = root.querySelector<HTMLElement>('[data-cta-headline]')
    if (headline) wordRise(gsap, headline, { stagger: 0.04, start: 'top 80%' })

    const soft = root.querySelectorAll('[data-cta-fade]')
    if (soft.length) fadeRise(gsap, soft, { stagger: 0.1, y: 20, start: 'top 78%' })

    const picture = root.querySelector('[data-image]')
    if (picture) parallax(gsap, picture, { amount: 30, trigger: root })
  }, [])

  return (
    <section
      ref={rootRef}
      className="relative isolate overflow-hidden bg-primary-strong py-24 text-primary-foreground sm:py-32"
      aria-labelledby="cta-heading"
    >
      <MarketingImage
        image={MEDIA.closing}
        className="absolute inset-0 -z-10 h-full w-full rounded-none"
        imageClassName="scale-110"
        sizes="100vw"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-primary-strong/85"
      />
      <LandingAtmosphere tone="deep" density="rich" className="-z-10" />

      <Container width="marketing" className="relative z-10">
        <div className="max-w-3xl">
          <Eyebrow tone="inverse" data-cta-fade>
            {closing.eyebrow}
          </Eyebrow>
          <h2
            id="cta-heading"
            data-cta-headline
            className="mt-6 font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
          >
            {closing.heading}
          </h2>
          <p
            data-cta-fade
            className="mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/75 sm:text-lg"
          >
            {closing.lead}
          </p>

          <div
            data-cta-fade
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button
              size="lg"
              className="min-h-12 bg-primary-foreground px-6 text-primary-strong hover:bg-primary-foreground/90"
              render={<Link ref={magneticRef} href="/register" />}
            >
              {closing.createAccount}
              <ArrowRightIcon />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="min-h-12 bg-primary-foreground/10 px-5 text-primary-foreground hover:bg-primary-foreground/20"
              render={<Link href="/pay" />}
            >
              {closing.payFees}
            </Button>
          </div>

          <p data-cta-fade className="mt-8 text-sm text-primary-foreground/60">
            {closing.preferAsk}{' '}
            <a
              href={`mailto:${t.contact.email}`}
              className="text-primary-foreground underline-offset-4 hover:underline"
            >
              {t.contact.email}
            </a>{' '}
            {closing.orCall} {t.contact.phone}.
          </p>
        </div>
      </Container>
    </section>
  )
}

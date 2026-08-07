'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { MarketingImage } from '@/components/marketing/marketing-image'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { blurRise, parallax, scrubScale, wordRise } from '@/lib/gsap/motion'
import { EASE } from '@/lib/gsap'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { useMagnetic } from '@/lib/gsap/use-magnetic'
import { MEDIA } from '@/lib/marketing/media'
import { useMarketingCopy } from '@/components/i18n/locale-provider'
import { usePublicAuth } from '@/lib/use-public-auth'

/** Closing invitation: full-bleed photograph, one magnetic primary action. */
export function LandingCta() {
  const t = useMarketingCopy()
  const auth = usePublicAuth()
  const closing = t.closing
  const primary = auth.authenticated
    ? { href: auth.homeHref, label: t.nav.goToApp }
    : { href: '/register', label: closing.createAccount }
  const rootRef = useRef<HTMLElement>(null)
  const magneticRef = useMagnetic<HTMLAnchorElement>(0.28)

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const headline = root.querySelector<HTMLElement>('[data-cta-headline]')
    if (headline) {
      wordRise(gsap, headline, { stagger: 0.045, start: 'top 82%', rotate: 5 })
    }

    const soft = root.querySelectorAll('[data-cta-fade]')
    if (soft.length) {
      blurRise(gsap, soft, {
        stagger: 0.12,
        y: 28,
        blur: 10,
        start: 'top 80%',
      })
    }

    const picture = root.querySelector('[data-image]')
    if (picture) {
      parallax(gsap, picture, { amount: 36, trigger: root })
      scrubScale(gsap, picture, { from: 1.2, to: 1.05, trigger: root })
    }

    const wash = root.querySelector('[data-cta-wash]')
    if (wash) {
      gsap.fromTo(
        wash,
        { opacity: 0.95 },
        {
          opacity: 0.78,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      )
    }

    const arrow = root.querySelector('[data-cta-arrow]')
    if (arrow) {
      gsap.to(arrow, {
        x: 5,
        duration: 0.9,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        scrollTrigger: { trigger: root, start: 'top 75%', once: true },
      })
    }

    // Soft scale of the whole CTA block as it enters.
    gsap.fromTo(
      root.querySelector('[data-cta-content]'),
      { y: 48, scale: 0.97 },
      {
        y: 0,
        scale: 1,
        duration: 1.15,
        ease: EASE.expo,
        scrollTrigger: { trigger: root, start: 'top 78%', once: true },
      },
    )
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
        data-cta-wash
        className="absolute inset-0 -z-10 bg-primary-strong/85"
      />
      <LandingAtmosphere tone="deep" density="rich" className="-z-10" />

      <Container width="marketing" className="relative z-10">
        <div data-cta-content className="max-w-3xl will-change-transform">
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
              render={<Link ref={magneticRef} href={primary.href} />}
            >
              {primary.label}
              <span data-cta-arrow className="inline-flex">
                <ArrowRightIcon />
              </span>
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
            {closing.orCall}{' '}
            <a
              href={`tel:${t.contact.phoneHref}`}
              className="text-primary-foreground underline-offset-4 hover:underline"
            >
              {t.contact.phone}
            </a>
            .
          </p>
        </div>
      </Container>
    </section>
  )
}

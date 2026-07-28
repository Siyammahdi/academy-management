'use client'

import { useRef } from 'react'
import Link from 'next/link'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { MarketingImage } from '@/components/marketing/marketing-image'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { imageReveal, wordRise } from '@/lib/gsap/motion'
import { EASE } from '@/lib/gsap'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { MEDIA } from '@/lib/marketing/media'
import { useMarketingCopy } from '@/components/i18n/locale-provider'

/**
 * The trust section. Each row draws its own hairline before the copy
 * arrives, so the list reads as a ledger of commitments rather than a
 * feature grid.
 */
export function LandingAssurance() {
  const t = useMarketingCopy()
  const assurances = t.assurances
  const rootRef = useRef<HTMLElement>(null)

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const headline = root.querySelector<HTMLElement>('[data-assurance-headline]')
    if (headline) wordRise(gsap, headline, { stagger: 0.035 })

    const frame = root.querySelector('[data-assurance-image] [data-image-frame]')
    if (frame) imageReveal(gsap, frame, { from: 'left' })

    root.querySelectorAll('[data-assurance-row]').forEach((row) => {
      const rule = row.querySelector('[data-assurance-rule]')
      const copy = row.querySelectorAll('[data-assurance-copy]')
      const tl = gsap.timeline({
        scrollTrigger: { trigger: row, start: 'top 88%', once: true },
      })

      if (rule) {
        tl.fromTo(
          rule,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.7, ease: EASE.inOut, transformOrigin: 'left' },
        )
      }
      tl.fromTo(
        copy,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: EASE.out },
        '-=0.45',
      )
    })
  }, [])

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden bg-primary-strong py-24 text-primary-foreground sm:py-32"
      aria-labelledby="assurance-heading"
    >
      <LandingAtmosphere tone="deep" density="rich" />
      <Container width="marketing" className="relative z-10">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <Eyebrow tone="inverse">{assurances.eyebrow}</Eyebrow>
              <h2
                id="assurance-heading"
                data-assurance-headline
                className="mt-6 font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl"
              >
                {assurances.heading}
              </h2>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-primary-foreground/70">
                {assurances.lead}
              </p>

              <div data-assurance-image className="mt-10 hidden lg:block">
                <MarketingImage
                  image={MEDIA.assurance}
                  className="aspect-video w-full"
                  sizes="30vw"
                />
              </div>

              <Button
                variant="secondary"
                className="mt-8 min-h-11 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
                render={<Link href="/pay" />}
              >
                {assurances.guestCta}
              </Button>
            </div>
          </div>

          <ul className="lg:col-span-7 lg:col-start-6">
            {assurances.items.map((item, index) => (
              <li
                key={item.title}
                data-assurance-row
                className="relative pt-8 pb-8 first:pt-0"
              >
                <span
                  aria-hidden
                  data-assurance-rule
                  className="absolute inset-x-0 top-0 h-px origin-left bg-primary-foreground/20 first:hidden"
                />
                <div className="flex gap-6">
                  <span
                    data-assurance-copy
                    className="font-heading text-sm font-semibold tabular-nums text-primary-foreground/50"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3
                      data-assurance-copy
                      className="font-heading text-xl font-semibold tracking-tight text-balance sm:text-2xl"
                    >
                      {item.title}
                    </h3>
                    <p
                      data-assurance-copy
                      className="mt-3 max-w-xl text-base leading-relaxed text-pretty text-primary-foreground/70"
                    >
                      {item.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  )
}

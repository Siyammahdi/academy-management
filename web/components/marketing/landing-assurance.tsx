'use client'

import { useRef } from 'react'
import Link from 'next/link'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { MarketingImage } from '@/components/marketing/marketing-image'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import {
  blurRise,
  imageReveal,
  scrubScale,
  scrubY,
  wordRise,
} from '@/lib/gsap/motion'
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
    if (headline) wordRise(gsap, headline, { stagger: 0.04, rotate: 4 })

    const lead = root.querySelector('[data-assurance-lead]')
    if (lead) blurRise(gsap, lead, { y: 20, blur: 8 })

    const frame = root.querySelector('[data-assurance-image] [data-image-frame]')
    const picture = root.querySelector('[data-assurance-image] [data-image]')
    if (frame) imageReveal(gsap, frame, { from: 'left', scale: 1.2 })
    if (picture) {
      scrubScale(gsap, picture, {
        from: 1.1,
        to: 1,
        trigger: root.querySelector('[data-assurance-image]'),
      })
    }

    root.querySelectorAll('[data-assurance-row]').forEach((row) => {
      const rule = row.querySelector('[data-assurance-rule]')
      const index = row.querySelector('[data-assurance-index]')
      const copy = row.querySelectorAll('[data-assurance-copy]')
      const tl = gsap.timeline({
        scrollTrigger: { trigger: row, start: 'top 88%', once: true },
      })

      if (rule) {
        tl.fromTo(
          rule,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.85,
            ease: EASE.expoInOut,
            transformOrigin: 'left',
          },
        )
      }
      if (index) {
        tl.fromTo(
          index,
          { opacity: 0, y: 16, rotateZ: -8 },
          { opacity: 1, y: 0, rotateZ: 0, duration: 0.65, ease: EASE.back },
          '-=0.5',
        )
      }
      tl.fromTo(
        copy,
        { opacity: 0, y: 24, filter: 'blur(8px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.85,
          stagger: 0.07,
          ease: EASE.expo,
        },
        '-=0.4',
      )

      // Soft opacity scrub while the row travels the viewport.
      gsap.fromTo(
        row,
        { opacity: 0.55 },
        {
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: row,
            start: 'top 90%',
            end: 'top 45%',
            scrub: true,
          },
        },
      )
    })

    const sticky = root.querySelector('[data-assurance-sticky]')
    if (sticky) {
      scrubY(gsap, sticky, {
        from: 28,
        to: -12,
        trigger: root,
        start: 'top bottom',
        end: 'bottom top',
      })
    }
  }, [])

  return (
    <section
      ref={rootRef}
      className="relative bg-primary-strong py-24 text-primary-foreground sm:py-32"
      aria-labelledby="assurance-heading"
    >
      <LandingAtmosphere tone="deep" density="rich" />
      <Container width="marketing" className="relative z-10">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <div data-assurance-sticky className="lg:sticky lg:top-28">
              <Eyebrow tone="inverse">{assurances.eyebrow}</Eyebrow>
              <h2
                id="assurance-heading"
                data-assurance-headline
                className="mt-6 font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl"
              >
                {assurances.heading}
              </h2>
              <p
                data-assurance-lead
                className="mt-5 max-w-sm text-base leading-relaxed text-primary-foreground/70"
              >
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
                className="group/row relative pt-8 pb-8 transition-transform duration-500 first:pt-0 hover:translate-x-1"
              >
                <span
                  aria-hidden
                  data-assurance-rule
                  className="absolute inset-x-0 top-0 h-px origin-left bg-primary-foreground/20 first:hidden"
                />
                <div className="flex gap-6">
                  <span
                    data-assurance-index
                    className="font-heading text-sm font-semibold tabular-nums text-primary-foreground/50 transition-colors duration-300 group-hover/row:text-primary-foreground"
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

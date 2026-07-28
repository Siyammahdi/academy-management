'use client'

import { useRef } from 'react'
import Link from 'next/link'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { MarketingImage } from '@/components/marketing/marketing-image'
import { useAcademyData } from '@/components/marketing/academy-data'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { countUp, fadeRise, imageReveal, lineDraw, wordRise } from '@/lib/gsap/motion'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { MEDIA } from '@/lib/marketing/media'
import { useMarketingCopy } from '@/components/i18n/locale-provider'

/**
 * How enrollment works, opened by the academy's live state. Every figure in
 * the rail is counted from the public API — there are no invented numbers on
 * this site, so the rail simply hides itself when there is nothing open.
 */
export function LandingEnrollment() {
  const t = useMarketingCopy()
  const journey = t.journey
  const rootRef = useRef<HTMLElement>(null)

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const headline = root.querySelector<HTMLElement>('[data-journey-headline]')
    if (headline) wordRise(gsap, headline, { stagger: 0.035 })

    const steps = root.querySelectorAll('[data-journey-step]')
    if (steps.length) fadeRise(gsap, steps, { stagger: 0.14, y: 30 })

    const line = root.querySelector('[data-journey-line]')
    const list = root.querySelector('[data-journey-list]')
    if (line && list) {
      lineDraw(gsap, line, { trigger: list, start: 'top 75%', end: 'bottom 80%' })
    }

    const frame = root.querySelector('[data-journey-image] [data-image-frame]')
    if (frame) imageReveal(gsap, frame)
  }, [])

  return (
    <section
      ref={rootRef}
      id="enrollment"
      className="relative scroll-mt-24 overflow-hidden bg-background py-24 sm:py-32"
      aria-labelledby="journey-heading"
    >
      <LandingAtmosphere tone="wash" />
      <Container width="marketing" className="relative z-10">
        <LiveRail />

        <div className="mt-16 grid gap-14 sm:mt-20 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <Eyebrow>{journey.eyebrow}</Eyebrow>
            <h2
              id="journey-heading"
              data-journey-headline
              className="mt-6 max-w-xl font-heading text-3xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl"
            >
              {journey.heading}
            </h2>

            <ol data-journey-list className="relative mt-12 space-y-10 pl-10">
              <span
                aria-hidden
                className="absolute top-2 bottom-2 left-3 w-px bg-border"
              />
              <span
                aria-hidden
                data-journey-line
                className="absolute top-2 bottom-2 left-3 w-px origin-top bg-primary"
              />

              {journey.steps.map((step) => (
                <li key={step.index} data-journey-step className="relative">
                  <span
                    aria-hidden
                    className="absolute top-1.5 -left-10 flex size-6 items-center justify-center rounded-md bg-primary-wash text-xs font-semibold tabular-nums text-primary-strong"
                  >
                    {step.index}
                  </span>
                  <h3 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-base leading-relaxed text-pretty text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <div data-journey-image className="lg:sticky lg:top-28">
              <MarketingImage
                image={MEDIA.journey}
                className="aspect-4/5 w-full"
                sizes="(min-width: 1024px) 30vw, 100vw"
              />
              <div className="mt-6 rounded-xl bg-muted p-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {journey.aside}
                </p>
                <Button
                  variant="outline"
                  className="mt-4 min-h-11 w-full"
                  render={<Link href="/contact" />}
                >
                  {journey.talkAdmissions}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

/** Live counters. Renders nothing unless the API actually returns figures. */
function LiveRail() {
  const t = useMarketingCopy()
  const railRef = useRef<HTMLDivElement>(null)
  const { status, courses, openBatches } = useAcademyData()

  const programCount = courses.length
  const openCount = openBatches.length
  const seatCount = openBatches.reduce(
    (total, batch) => total + Math.max(0, batch.seatsRemaining),
    0,
  )
  const dueWindow = openBatches[0]
    ? `${openBatches[0].dueDayStart}–${openBatches[0].dueDayEnd}`
    : null

  useGsapContext(
    railRef,
    (gsap) => {
      const rail = railRef.current
      if (!rail) return
      rail.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
        const value = Number(el.dataset.count ?? '0')
        countUp(gsap, el, value, { trigger: rail })
      })
      fadeRise(gsap, rail.querySelectorAll('[data-rail-item]'), {
        trigger: rail,
        stagger: 0.08,
        y: 18,
      })
    },
    [status, programCount, openCount, seatCount],
  )

  if (status !== 'ready' || programCount === 0) return null

  const figures = [
    { label: t.glance.programsOffered, value: programCount },
    { label: t.glance.batchesOpen, value: openCount },
    { label: t.glance.seatsFree, value: seatCount },
  ]

  return (
    <div ref={railRef}>
      <div className="grid gap-8 border-y border-border py-10 sm:grid-cols-2 lg:grid-cols-4">
        {figures.map((figure) => (
          <div key={figure.label} data-rail-item>
            <p className="font-heading text-4xl font-semibold tabular-nums text-foreground sm:text-5xl">
              <span data-count={figure.value}>{figure.value}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{figure.label}</p>
          </div>
        ))}
        <div data-rail-item>
          <p className="font-heading text-4xl font-semibold tabular-nums text-foreground sm:text-5xl">
            {dueWindow ?? '—'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {dueWindow ? t.glance.dueWindow : t.glance.nextWindow}
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        {t.glance.liveNote}
      </p>
    </div>
  )
}

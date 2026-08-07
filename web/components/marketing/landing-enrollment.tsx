'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ArrowRightIcon, ArrowUpRightIcon } from 'lucide-react'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { MarketingImage } from '@/components/marketing/marketing-image'
import { useAcademyData } from '@/components/marketing/academy-data'
import { useMarketingCopy } from '@/components/i18n/locale-provider'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { EASE } from '@/lib/gsap'
import {
  blurRise,
  countUp,
  imageReveal,
  ruleDraw,
  scrubScale,
  scrubY,
  wordRise,
} from '@/lib/gsap/motion'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { useMagnetic } from '@/lib/gsap/use-magnetic'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import { MEDIA } from '@/lib/marketing/media'
import { cn } from '@/lib/utils'

/**
 * Enrollment journey — premium process layout with live academy figures,
 * scroll-activated steps, and a calm admissions close.
 */
export function LandingEnrollment() {
  const t = useMarketingCopy()
  const journey = t.journey
  const rootRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()
  const ctaRef = useMagnetic<HTMLAnchorElement>(0.28)

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const headline = root.querySelector<HTMLElement>('[data-journey-headline]')
    if (headline) wordRise(gsap, headline, { stagger: 0.035, rotate: 3 })

    const lead = root.querySelector('[data-journey-lead]')
    if (lead) blurRise(gsap, lead, { y: 22, blur: 8 })

    const steps = gsap.utils.toArray<HTMLElement>(
      root.querySelectorAll('[data-journey-step]'),
    )

    steps.forEach((step, i) => {
      const rule = step.querySelector('[data-journey-rule]')
      const index = step.querySelector('[data-journey-index]')
      const copy = step.querySelectorAll('[data-journey-copy]')

      const tl = gsap.timeline({
        scrollTrigger: { trigger: step, start: 'top 82%', once: true },
      })

      if (rule) {
        tl.fromTo(
          rule,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.85,
            ease: EASE.expoInOut,
            transformOrigin: 'left center',
          },
        )
      }

      tl.fromTo(
        [index, ...copy],
        { opacity: 0, y: 28, filter: 'blur(8px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.9,
          stagger: 0.07,
          ease: EASE.expo,
        },
        rule ? '-=0.5' : 0,
      )

      if (index) {
        scrubY(gsap, index, {
          from: 18,
          to: -10,
          trigger: step,
        })
      }

      gsap.to(step, {
        scrollTrigger: {
          trigger: step,
          start: 'top 60%',
          end: 'bottom 40%',
          onEnter: () => setActiveStep(steps, i),
          onEnterBack: () => setActiveStep(steps, i),
        },
      })
    })

    const frame = root.querySelector('[data-journey-visual] [data-image-frame]')
    const picture = root.querySelector('[data-journey-visual] [data-image]')
    if (frame) imageReveal(gsap, frame, { from: 'right', scale: 1.2 })
    if (picture) {
      scrubScale(gsap, picture, {
        from: 1.1,
        to: 1,
        trigger: root.querySelector('[data-journey-visual]'),
      })
    }

    const close = root.querySelector('[data-journey-close]')
    if (close) {
      blurRise(gsap, close, { y: 32, blur: 10, start: 'top 88%' })
      const closeRule = close.querySelector('[data-journey-close-rule]')
      if (closeRule) {
        ruleDraw(gsap, closeRule, { trigger: close, start: 'top 85%' })
      }
    }
  }, [])

  return (
    <section
      ref={rootRef}
      id="enrollment"
      className="relative scroll-mt-24 overflow-hidden bg-background py-24 sm:py-32"
      aria-labelledby="journey-heading"
    >
      <LandingAtmosphere tone="wash" density="sparse" />

      <Container width="marketing" className="relative z-10">
        {/* Opening */}
        <div className="grid items-end gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <Eyebrow>{journey.eyebrow}</Eyebrow>
            <h2
              id="journey-heading"
              data-journey-headline
              className="mt-6 max-w-xl font-heading text-3xl leading-[1.1] font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl"
            >
              {journey.heading}
            </h2>
          </div>
          <p
            data-journey-lead
            className={cn(
              'max-w-sm text-base leading-relaxed text-muted-foreground sm:text-lg lg:col-span-4 lg:col-start-9 lg:justify-self-end',
              !reduced && 'opacity-0',
            )}
          >
            {journey.lead}
          </p>
        </div>

        <LivePulse />

        {/* Process steps — editorial bands, not a generic timeline */}
        <ol className="mt-20 flex flex-col sm:mt-24">
          {journey.steps.map((step, i) => (
            <li
              key={step.index}
              data-journey-step
              data-active={i === 0 ? 'true' : 'false'}
              className={cn(
                'group/step relative grid gap-6 border-t border-border py-10 transition-[opacity,transform] duration-500 sm:grid-cols-12 sm:gap-10 sm:py-14',
                'group-data-[active=true]/step:translate-x-0',
                !reduced && i > 0 && 'opacity-45',
              )}
            >
              <div
                data-journey-rule
                aria-hidden
                className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-primary"
              />

              <div className="sm:col-span-3">
                <p
                  data-journey-index
                  className={cn(
                    'font-heading text-5xl font-semibold tracking-tight text-primary/25 tabular-nums transition-colors duration-500 sm:text-6xl lg:text-7xl',
                    'group-data-[active=true]/step:text-primary',
                    !reduced && 'opacity-0',
                  )}
                >
                  {step.index}
                </p>
              </div>

              <div className="flex flex-col justify-center sm:col-span-8 sm:col-start-5">
                <h3
                  data-journey-copy
                  className={cn(
                    'font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl',
                    !reduced && 'opacity-0',
                  )}
                >
                  {step.title}
                </h3>
                <p
                  data-journey-copy
                  className={cn(
                    'mt-3 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg',
                    !reduced && 'opacity-0',
                  )}
                >
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* Close — visual + actions */}
        <div
          data-journey-close
          className={cn(
            'mt-8 grid overflow-hidden rounded-xl bg-primary-wash lg:grid-cols-12',
            !reduced && 'opacity-0',
          )}
        >
          <div
            data-journey-visual
            className="relative min-h-64 lg:col-span-5 lg:min-h-full"
          >
            <MarketingImage
              image={MEDIA.journey}
              className="absolute inset-0 h-full w-full rounded-none"
              sizes="(min-width: 1024px) 40vw, 100vw"
            />
          </div>

          <div className="flex flex-col justify-between gap-8 p-6 sm:p-8 lg:col-span-7 lg:p-10">
            <div>
              <div
                data-journey-close-rule
                aria-hidden
                className="mb-6 h-px w-16 origin-left scale-x-0 bg-primary"
              />
              <p className="font-heading text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-3xl">
                {journey.aside}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="min-h-12 gap-2 px-6"
                render={<Link ref={ctaRef} href="/register" />}
              >
                {t.nav.register}
                <ArrowRightIcon className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="min-h-12 gap-2 px-5 text-primary-strong"
                render={<Link href="/contact" />}
              >
                {journey.talkAdmissions}
                <ArrowUpRightIcon className="size-4 opacity-70" />
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

/** Live counters from the API — hidden when there is nothing to show. */
function LivePulse() {
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
      gsap.fromTo(
        rail.querySelectorAll('[data-rail-item]'),
        { opacity: 0, y: 20, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.85,
          stagger: 0.08,
          ease: EASE.expo,
          scrollTrigger: { trigger: rail, start: 'top 88%', once: true },
        },
      )
      const pulse = rail.querySelector('[data-rail-pulse]')
      if (pulse) {
        gsap.to(pulse, {
          opacity: 0.35,
          duration: 1.4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          scrollTrigger: { trigger: rail, start: 'top 90%', once: true },
        })
      }
    },
    [status, programCount, openCount, seatCount],
  )

  if (status !== 'ready' || programCount === 0) return null

  const figures: Array<{ label: string; value: string; count?: number }> = [
    {
      label: t.glance.programsOffered,
      value: String(programCount),
      count: programCount,
    },
    {
      label: t.glance.batchesOpen,
      value: String(openCount),
      count: openCount,
    },
    {
      label: t.glance.seatsFree,
      value: String(seatCount),
      count: seatCount,
    },
    {
      label: dueWindow ? t.glance.dueWindow : t.glance.nextWindow,
      value: dueWindow ?? '—',
    },
  ]

  return (
    <div ref={railRef} className="mt-14 sm:mt-16">
      <div className="relative overflow-hidden rounded-xl bg-primary-wash">
        <span
          data-rail-pulse
          aria-hidden
          className="pointer-events-none absolute top-4 right-4 size-2 rounded-full bg-status-paid"
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4">
          {figures.map((figure, i) => (
            <div
              key={figure.label}
              data-rail-item
              className={cn(
                'group/rail relative px-6 py-7 transition-colors duration-300 hover:bg-primary/5 sm:px-7 sm:py-8',
                i > 0 && 'border-t border-primary/10 sm:border-t-0',
                i % 2 === 1 && 'sm:border-l sm:border-primary/10',
                i >= 2 && 'lg:border-l lg:border-primary/10',
              )}
            >
              <p className="font-heading text-3xl font-semibold tracking-tight text-foreground tabular-nums sm:text-4xl">
                {figure.count != null ? (
                  <span data-count={figure.count}>{figure.value}</span>
                ) : (
                  figure.value
                )}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{figure.label}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t.glance.liveNote}</p>
    </div>
  )
}

function setActiveStep(steps: HTMLElement[], activeIndex: number) {
  steps.forEach((step, i) => {
    const on = i === activeIndex
    step.dataset.active = on ? 'true' : 'false'
    step.style.opacity = on ? '1' : '0.4'
  })
}

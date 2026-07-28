'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { MarketingImage } from '@/components/marketing/marketing-image'
import { useAcademyData } from '@/components/marketing/academy-data'
import { useMarketingCopy } from '@/components/i18n/locale-provider'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { EASE } from '@/lib/gsap'
import { splitChars, splitWords } from '@/lib/gsap/split-text'
import { parallax, scrubScale } from '@/lib/gsap/motion'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { useMagnetic } from '@/lib/gsap/use-magnetic'
import { useTilt } from '@/lib/gsap/use-tilt'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import { MEDIA } from '@/lib/marketing/media'
import { cn } from '@/lib/utils'

/**
 * Opening statement. One cinematic load timeline: eyebrow rule draws, the
 * headline rises letter-by-letter, photography unmasks with scale settle,
 * and the inset detail drifts in. Scroll continues the image scrub.
 */
export function LandingHero() {
  const t = useMarketingCopy()
  const rootRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()
  const magneticRef = useMagnetic<HTMLAnchorElement>(0.36)
  const tiltRef = useTilt<HTMLDivElement>(6)

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const q = <T extends Element = HTMLElement>(selector: string) =>
      root.querySelector<T>(selector)

    const eyebrow = q('[data-hero-eyebrow]')
    const rule = q('[data-eyebrow-rule]')
    const headline = q<HTMLElement>('[data-hero-headline]')
    const frame = q('[data-hero-visual] [data-image-frame]')
    const picture = q('[data-hero-visual] [data-image]')
    const detail = q('[data-hero-detail]')
    const soft = root.querySelectorAll('[data-hero-fade]')
    const facts = root.querySelectorAll('[data-hero-fact]')
    const arrow = q('[data-hero-arrow]')

    if (!headline || !frame) return

    // Prefer letter kinetic on short Latin-leaning headlines; fall back to
    // words when the split would be impractically long (e.g. dense BN copy).
    const preferChars = (headline.textContent?.trim().length ?? 0) <= 56
    const units = preferChars ? splitChars(headline) : splitWords(headline)

    gsap.set(units, { yPercent: 130, rotateZ: preferChars ? 10 : 5, opacity: 0 })
    gsap.set([soft, facts, detail].filter(Boolean), { opacity: 0 })
    if (frame) gsap.set(frame, { clipPath: 'inset(14% 10% 14% 10%)', scale: 0.92 })

    const tl = gsap.timeline({ defaults: { ease: EASE.expo } })

    if (eyebrow) {
      tl.fromTo(
        eyebrow,
        { opacity: 0, y: 16, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7 },
      )
    }
    if (rule) {
      tl.fromTo(
        rule,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.75, ease: EASE.expoInOut },
        '-=0.45',
      )
    }

    tl.to(
      units,
      {
        yPercent: 0,
        rotateZ: 0,
        opacity: 1,
        duration: preferChars ? 0.9 : 1.1,
        stagger: preferChars ? 0.016 : 0.04,
        ease: preferChars ? EASE.backSoft : EASE.expo,
      },
      '-=0.25',
    )
      .fromTo(
        frame,
        {
          opacity: 1,
          clipPath: 'inset(14% 10% 14% 10%)',
          scale: 0.92,
        },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          scale: 1,
          duration: 1.4,
          ease: EASE.expoInOut,
        },
        '-=0.85',
      )
      .fromTo(
        soft,
        { opacity: 0, y: 28, filter: 'blur(10px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.95,
          stagger: 0.14,
        },
        '-=0.95',
      )

    if (picture) {
      tl.fromTo(
        picture,
        { scale: 1.32, rotate: 2 },
        { scale: 1, rotate: 0, duration: 1.7, ease: EASE.expo },
        '-=1.7',
      )
      scrubScale(gsap, picture, { from: 1.08, to: 1, trigger: root })
    }

    if (detail) {
      tl.fromTo(
        detail,
        { opacity: 0, x: -40, y: 36, rotate: -4, scale: 0.9 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          rotate: 0,
          scale: 1,
          duration: 1.05,
          ease: EASE.back,
        },
        '-=1.1',
      )
      parallax(gsap, detail, { amount: 48, trigger: root })
    }

    tl.fromTo(
      facts,
      { opacity: 0, y: 22, filter: 'blur(6px)' },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.7,
        stagger: 0.1,
      },
      '-=0.35',
    )

    if (arrow) {
      gsap.to(arrow, {
        x: 4,
        duration: 0.85,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: tl.duration(),
      })
    }

  }, [])

  const hidden = !reduced ? 'opacity-0' : undefined

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden pb-14 sm:pb-20"
      aria-labelledby="hero-heading"
    >
      <LandingAtmosphere tone="hero" density="rich" />

      <Container width="marketing" className="relative z-10 pt-12 sm:pt-16 lg:pt-20">
        <div className="grid items-end gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <Eyebrow className={hidden} data-hero-eyebrow>
              {t.hero.eyebrow}
            </Eyebrow>

            <h1
              id="hero-heading"
              data-hero-headline
              className="mt-6 font-heading text-4xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl"
            >
              {t.hero.headline}
            </h1>

            <p
              data-hero-fade
              className={cn(
                'mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg',
                hidden,
              )}
            >
              {t.hero.lead}
            </p>

            <div
              data-hero-fade
              className={cn(
                'mt-9 flex flex-col gap-3 sm:flex-row sm:items-center',
                hidden,
              )}
            >
              <Button
                size="lg"
                className="min-h-12 px-6"
                render={<Link ref={magneticRef} href="#programs" />}
              >
                {t.hero.ctaPrograms}
                <span data-hero-arrow className="inline-flex">
                  <ArrowRightIcon />
                </span>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="min-h-12 px-5 text-primary-strong hover:bg-background/70"
                render={<Link href="/register" />}
              >
                {t.hero.ctaRegister}
              </Button>
            </div>
          </div>

          <div className="relative lg:col-span-5">
            <div ref={tiltRef} data-hero-visual className="will-change-transform">
              <MarketingImage
                image={MEDIA.heroPrimary}
                className="aspect-4/5 w-full"
                sizes="(min-width: 1024px) 40vw, 100vw"
                priority
              />
            </div>

            <div
              data-hero-detail
              className={cn(
                'absolute -bottom-8 -left-4 hidden w-40 sm:block lg:-left-12 lg:w-48',
                hidden,
              )}
            >
              <MarketingImage
                image={MEDIA.heroDetail}
                className="aspect-square w-full ring-8 ring-background"
                sizes="200px"
              />
            </div>

            <LiveBatchChip />
          </div>
        </div>

        <dl className="mt-16 grid gap-6 border-t border-border pt-8 sm:mt-20 sm:grid-cols-3">
          {t.hero.facts.map((fact) => (
            <div key={fact.label} data-hero-fact className={hidden}>
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {fact.label}
              </dt>
              <dd className="mt-2 font-heading text-lg font-medium tracking-tight text-foreground">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  )
}

/** Live enrollment state, straight from the API — never a static claim. */
function LiveBatchChip() {
  const t = useMarketingCopy()
  const { status, openBatches } = useAcademyData()
  if (status !== 'ready') return null

  const seats = openBatches.reduce(
    (total, batch) => total + Math.max(0, batch.seatsRemaining),
    0,
  )
  const open = openBatches.length

  const label =
    open === 0 ? t.hero.chipClosed : t.hero.chipOpen(open, seats)

  return (
    // Mounts after its data arrives, so it fades itself in rather than
    // joining the load timeline.
    <div className="absolute top-4 left-4 flex animate-in items-center gap-2 rounded-lg bg-background/90 px-3 py-2 fade-in slide-in-from-top-2 duration-700 backdrop-blur-sm">
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full',
          open > 0 ? 'bg-status-paid' : 'bg-status-neutral',
        )}
      />
      <span className="text-xs font-medium tabular-nums text-foreground">
        {label}
      </span>
    </div>
  )
}

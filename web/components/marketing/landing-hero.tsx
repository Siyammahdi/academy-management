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
import { splitWords } from '@/lib/gsap/split-text'
import { parallax } from '@/lib/gsap/motion'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { useMagnetic } from '@/lib/gsap/use-magnetic'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import { MEDIA } from '@/lib/marketing/media'
import { cn } from '@/lib/utils'

/**
 * Opening statement. One cinematic timeline on load: the rule draws, the
 * headline rises word by word out of its masks, and the photography unmasks
 * behind the inset detail. Nothing here loops or repeats on scroll.
 */
export function LandingHero() {
  const t = useMarketingCopy()
  const rootRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()
  const magneticRef = useMagnetic<HTMLAnchorElement>()

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

    if (!headline || !frame) return

    const words = splitWords(headline)
    const tl = gsap.timeline({ defaults: { ease: EASE.out } })

    if (eyebrow) {
      tl.fromTo(
        eyebrow,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5 },
      )
    }
    if (rule) {
      tl.fromTo(
        rule,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.6, ease: EASE.inOut },
        '-=0.3',
      )
    }

    tl.fromTo(
      words,
      { yPercent: 115 },
      { yPercent: 0, duration: 1.05, stagger: 0.04 },
      '-=0.3',
    )
      .fromTo(
        frame,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: EASE.inOut },
        '-=0.95',
      )
      .fromTo(
        soft,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 },
        '-=0.85',
      )

    if (picture) {
      tl.fromTo(picture, { scale: 1.25 }, { scale: 1, duration: 1.6 }, '-=1.6')
    }
    if (detail) {
      tl.fromTo(
        detail,
        { opacity: 0, x: -28, y: 20 },
        { opacity: 1, x: 0, y: 0, duration: 0.9 },
        '-=0.9',
      )
    }
    tl.fromTo(
      facts,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 },
      '-=0.4',
    )

    if (detail) {
      parallax(gsap, detail, { amount: 40, trigger: rootRef.current })
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
                <ArrowRightIcon />
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
            <div data-hero-visual>
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

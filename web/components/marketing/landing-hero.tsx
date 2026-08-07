'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'

import {
  TelegramIcon,
  ZoomIcon,
} from '@/components/brand/social-icons'
import { HeroCourseMarquee } from '@/components/marketing/hero-course-marquee'
import { useMarketingCopy } from '@/components/i18n/locale-provider'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { EASE } from '@/lib/gsap'
import { splitChars, splitWords } from '@/lib/gsap/split-text'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { useMagnetic } from '@/lib/gsap/use-magnetic'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import { MEDIA } from '@/lib/marketing/media'
import { cn } from '@/lib/utils'
import { usePublicAuth } from '@/lib/use-public-auth'

/**
 * Centered academy opening over a soft-loading photo background, with a
 * course-poster marquee as the visual floor. Intro stack: brand marks,
 * proof line, then a bold Bangladesh positioning statement.
 */
export function LandingHero() {
  const t = useMarketingCopy()
  const auth = usePublicAuth()
  const secondaryCta = auth.authenticated
    ? { href: auth.homeHref, label: t.nav.goToApp }
    : { href: '/register', label: t.hero.ctaRegister }
  const rootRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()
  const magneticRef = useMagnetic<HTMLAnchorElement>(0.36)

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const bg = root.querySelector<HTMLElement>('[data-hero-bg]')
    const veil = root.querySelector('[data-hero-veil]')
    const intro = root.querySelector('[data-hero-intro]')
    const headline = root.querySelector<HTMLElement>('[data-hero-headline]')
    const soft = root.querySelectorAll('[data-hero-fade]')
    const arrow = root.querySelector('[data-hero-arrow]')

    if (!headline) return

    const preferChars = (headline.textContent?.trim().length ?? 0) <= 56
    const units = preferChars ? splitChars(headline) : splitWords(headline)

    gsap.set(units, {
      yPercent: 110,
      rotateZ: preferChars ? 6 : 3,
      opacity: 0,
    })
    gsap.set([intro, soft].filter(Boolean), { opacity: 0, y: 22 })
    if (bg) gsap.set(bg, { opacity: 0, scale: 1.08 })
    if (veil) gsap.set(veil, { opacity: 0 })

    const tl = gsap.timeline({ defaults: { ease: EASE.expo } })

    if (bg) {
      tl.to(
        bg,
        { opacity: 1, scale: 1, duration: 1.55, ease: EASE.expoInOut },
        0,
      )
    }
    if (veil) {
      tl.to(veil, { opacity: 1, duration: 1.1 }, 0.15)
    }

    if (intro) {
      tl.to(intro, { opacity: 1, y: 0, duration: 0.75 }, '-=0.85')
    }

    tl.to(
      units,
      {
        yPercent: 0,
        rotateZ: 0,
        opacity: 1,
        duration: preferChars ? 0.85 : 1.05,
        stagger: preferChars ? 0.014 : 0.035,
        ease: preferChars ? EASE.backSoft : EASE.expo,
      },
      '-=0.35',
    ).fromTo(
      soft,
      { opacity: 0, y: 22, filter: 'blur(8px)' },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.9,
        stagger: 0.12,
      },
      '-=0.65',
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

    // Background drifts upward as the hero leaves — quiet scroll scrub.
    if (bg) {
      gsap.to(bg, {
        yPercent: 12,
        scale: 1.06,
        ease: 'none',
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: 'bottom top',
          scrub: 1.2,
        },
      })
    }

    const marks = root.querySelector('[data-hero-marks]')
    if (marks) {
      gsap.fromTo(
        marks,
        { scale: 0.82, rotate: -6 },
        {
          scale: 1,
          rotate: 0,
          duration: 1,
          ease: EASE.back,
          delay: 0.15,
        },
      )
    }
  }, [])

  const hidden = !reduced ? 'opacity-0' : undefined

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <Image
          data-hero-bg
          src={MEDIA.heroBg.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className={cn(
            'object-cover object-center',
            !reduced && 'opacity-0',
          )}
        />
        <div
          data-hero-veil
          className={cn('absolute inset-0', !reduced && 'opacity-0')}
        >
          <div className="absolute inset-0 bg-background/55" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary-wash/50 via-background/45 to-background" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        </div>
      </div>

      <Container
        width="marketing"
        className="relative z-10 flex flex-col items-center pt-10 text-center sm:pt-14 lg:pt-16"
      >
        <div
          data-hero-intro
          className={cn(
            'flex max-w-xl flex-col items-center gap-3.5 sm:gap-4',
            hidden,
          )}
        >
          <div
            data-hero-marks
            className="relative flex h-12 items-center justify-center sm:h-14"
            aria-label="Live on Zoom and Telegram"
          >
            <span className="relative z-10 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background transition-transform duration-300 hover:scale-105 sm:size-12">
              <ZoomIcon className="size-5" />
              <span className="sr-only">Zoom</span>
            </span>
            <span className="-ml-3 flex size-11 items-center justify-center rounded-full bg-primary-strong text-primary-foreground ring-2 ring-background transition-transform duration-300 hover:scale-105 sm:size-12">
              <TelegramIcon className="size-5" />
              <span className="sr-only">Telegram</span>
            </span>
          </div>

          {/* <p className="text-sm font-medium tracking-wide text-foreground/75 sm:text-[0.9375rem]">
            {t.hero.kicker}
          </p> */}

          <p className="font-heading text-base font-semibold tracking-tight text-balance text-foreground sm:text-lg md:text-xl">
            {t.hero.identity}
          </p>
        </div>

        <h1
          id="hero-heading"
          data-hero-headline
          className="mt-7 max-w-3xl font-heading text-3xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:mt-8 sm:text-5xl lg:text-6xl"
        >
          {t.hero.headline}
        </h1>

        <p
          data-hero-fade
          className={cn(
            'mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:mt-6 sm:text-lg',
            hidden,
          )}
        >
          {t.hero.lead}
        </p>

        <div
          data-hero-fade
          className={cn(
            'mt-8 flex w-full max-w-md flex-col gap-3 sm:mt-10 sm:max-w-none sm:w-auto sm:flex-row sm:items-center sm:justify-center',
            hidden,
          )}
        >
          <Button
            size="lg"
            className="min-h-12 w-full px-7 sm:w-auto"
            render={<Link ref={magneticRef} href="#programs" />}
          >
            {t.hero.ctaPrograms}
            <span data-hero-arrow className="inline-flex">
              <ArrowRightIcon />
            </span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="min-h-12 w-full border-border/80 bg-background/75 px-6 backdrop-blur-sm sm:w-auto"
            render={<Link href={secondaryCta.href} />}
          >
            {secondaryCta.label}
          </Button>
        </div>
      </Container>

      <div className="relative z-10 mt-12 pb-4 sm:mt-16 sm:pb-6 lg:mt-20">
        <HeroCourseMarquee />
      </div>
    </section>
  )
}

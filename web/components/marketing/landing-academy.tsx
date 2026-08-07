'use client'

import { useRef } from 'react'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { MarketingImage } from '@/components/marketing/marketing-image'
import { useMarketingCopy } from '@/components/i18n/locale-provider'
import { Container } from '@/components/layout/container'
import { EASE } from '@/lib/gsap'
import {
  blurRise,
  imageReveal,
  parallax,
  popIn,
  ruleDraw,
  scrubScale,
  scrubY,
  wordRise,
} from '@/lib/gsap/motion'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import { MEDIA } from '@/lib/marketing/media'
import { cn } from '@/lib/utils'

/**
 * Premium academy narrative — Framer / Awwwards pacing:
 * quiet typography opening, sticky media + scrolling chapters with a live
 * spine, then a single structured coda. One idea per beat.
 */
export function LandingAcademy() {
  const t = useMarketingCopy()
  const story = t.academyStory
  const rootRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const headline = root.querySelector<HTMLElement>('[data-academy-headline]')
    if (headline) wordRise(gsap, headline, { stagger: 0.028, rotate: 3 })

    const lead = root.querySelector('[data-academy-lead]')
    if (lead) blurRise(gsap, lead, { y: 24, blur: 10, start: 'top 92%' })

    // Sticky media — mask in, then slow scrub zoom while the story scrolls.
    const media = root.querySelector('[data-academy-media]')
    const mediaFrame = media?.querySelector('[data-image-frame]')
    const mediaImage = media?.querySelector('[data-image]')
    if (media && mediaFrame) {
      imageReveal(gsap, mediaFrame, {
        from: 'bottom',
        scale: 1.2,
        start: 'top 80%',
      })
      if (mediaImage) {
        scrubScale(gsap, mediaImage, {
          from: 1.12,
          to: 1,
          trigger: root.querySelector('[data-academy-story]'),
        })
      }
      parallax(gsap, media, { amount: 28 })
    }

    const inset = root.querySelector('[data-academy-inset] [data-image-frame]')
    if (inset) {
      imageReveal(gsap, inset, { from: 'left', scale: 1.16, start: 'top 85%' })
    }

    // Chapter spine + active-state scrub (desktop storytelling).
    const storyBlock = root.querySelector('[data-academy-story]')
    const spine = root.querySelector<HTMLElement>('[data-academy-spine-fill]')
    const chapters = gsap.utils.toArray<HTMLElement>(
      root.querySelectorAll('[data-academy-chapter]'),
    )

    if (storyBlock && spine && chapters.length) {
      gsap.set(spine, { scaleY: 0, transformOrigin: 'top center' })
      gsap.to(spine, {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: storyBlock,
          start: 'top 55%',
          end: 'bottom 55%',
          scrub: true,
        },
      })

      chapters.forEach((chapter, i) => {
        const index = chapter.querySelector('[data-chapter-index]')
        const title = chapter.querySelector('[data-chapter-title]')
        const body = chapter.querySelector('[data-chapter-body]')
        const rule = chapter.querySelector('[data-chapter-rule]')

        const enter = gsap.timeline({
          scrollTrigger: {
            trigger: chapter,
            start: 'top 78%',
            once: true,
          },
        })

        if (rule) {
          enter.fromTo(
            rule,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 0.9,
              ease: EASE.expoInOut,
              transformOrigin: 'left center',
            },
          )
        }
        enter.fromTo(
          [index, title, body].filter(Boolean),
          { opacity: 0, y: 28, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.95,
            stagger: 0.08,
            ease: EASE.expo,
          },
          rule ? '-=0.55' : 0,
        )

        // Soften inactive chapters while the active one is centered.
        gsap.to(chapter, {
          opacity: 1,
          scrollTrigger: {
            trigger: chapter,
            start: 'top 65%',
            end: 'bottom 35%',
            onEnter: () => setChapterActive(chapters, i),
            onEnterBack: () => setChapterActive(chapters, i),
          },
        })
      })
    }

    // Structure coda — connector line + staggered steps.
    const coda = root.querySelector('[data-academy-coda]')
    const connector = root.querySelector('[data-academy-connector]')
    const steps = root.querySelectorAll('[data-academy-step]')
    if (coda) {
      gsap.fromTo(
        coda,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1.05,
          ease: EASE.expo,
          scrollTrigger: { trigger: coda, start: 'top 86%', once: true },
        },
      )
    }
    if (connector) {
      ruleDraw(gsap, connector, {
        trigger: coda,
        start: 'top 78%',
        origin: 'left',
      })
    }
    if (steps.length) {
      popIn(gsap, steps, {
        stagger: 0.14,
        start: 'top 80%',
        trigger: coda,
      })
    }

    const bodyCopy = root.querySelectorAll('[data-academy-body]')
    if (bodyCopy.length) {
      blurRise(gsap, bodyCopy, { stagger: 0.12, y: 26, start: 'top 88%' })
    }

    const opening = root.querySelector('[data-academy-opening]')
    if (opening) {
      scrubY(gsap, opening, {
        from: 20,
        to: -16,
        trigger: opening,
        start: 'top bottom',
        end: 'bottom top',
      })
    }
  }, [])

  return (
    <section
      ref={rootRef}
      id="academy"
      className="relative scroll-mt-24 overflow-hidden bg-background"
      aria-labelledby="academy-heading"
    >
      <LandingAtmosphere tone="wash" density="sparse" />

      {/* 1 — Quiet opening */}
      <Container width="marketing" className="relative z-10 pt-24 sm:pt-28 lg:pt-36">
        <div data-academy-opening className="max-w-3xl will-change-transform">
          <Eyebrow>{story.eyebrow}</Eyebrow>
          <h2
            id="academy-heading"
            data-academy-headline
            className="mt-6 font-heading text-3xl leading-[1.1] font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl"
          >
            {story.heading}
          </h2>
          <p
            data-academy-lead
            className={cn(
              'mt-8 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground sm:text-xl',
              !reduced && 'opacity-0',
            )}
          >
            {story.quote}
          </p>
        </div>
      </Container>

      {/* 2 — Sticky media + scrolling chapters */}
      <Container
        width="marketing"
        className="relative z-10 mt-20 sm:mt-28 lg:mt-32"
      >
        <div
          data-academy-story
          className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16"
        >
          <div className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
            <div data-academy-media className="relative">
              <MarketingImage
                image={MEDIA.academyPrimary}
                className="aspect-4/5 w-full"
                sizes="(min-width: 1024px) 40vw, 100vw"
              />
              <div
                data-academy-inset
                className="absolute -right-3 -bottom-6 hidden w-36 sm:block lg:-right-8 lg:w-44"
              >
                <MarketingImage
                  image={MEDIA.academyDetail}
                  className="aspect-square w-full ring-8 ring-background"
                  sizes="176px"
                />
              </div>
            </div>
          </div>

          <div className="relative lg:col-span-6 lg:col-start-7">
            {/* Vertical spine */}
            <div
              aria-hidden
              className="pointer-events-none absolute top-2 bottom-2 left-0 hidden w-px bg-border lg:block"
            >
              <div
                data-academy-spine-fill
                className="h-full w-full origin-top bg-primary"
              />
            </div>

            <ol className="flex flex-col gap-14 sm:gap-20 lg:pl-10">
              {story.pillars.map((pillar, i) => (
                <li
                  key={pillar.index}
                  data-academy-chapter
                  className={cn(
                    'relative transition-[opacity,transform] duration-500',
                    !reduced && i > 0 && 'opacity-40',
                  )}
                >
                  <div
                    data-chapter-rule
                    aria-hidden
                    className="mb-6 h-px origin-left scale-x-0 bg-border"
                  />
                  <p
                    data-chapter-index
                    className={cn(
                      'font-heading text-xs font-semibold tracking-[0.2em] text-primary-strong uppercase',
                      !reduced && 'opacity-0',
                    )}
                  >
                    {pillar.index}
                  </p>
                  <h3
                    data-chapter-title
                    className={cn(
                      'mt-3 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl',
                      !reduced && 'opacity-0',
                    )}
                  >
                    {pillar.title}
                  </h3>
                  <p
                    data-chapter-body
                    className={cn(
                      'mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg',
                      !reduced && 'opacity-0',
                    )}
                  >
                    {pillar.body}
                  </p>
                </li>
              ))}
            </ol>
{/* 
            <div className="mt-16 space-y-5 border-t border-border pt-12 sm:mt-20">
              {story.body.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 24)}
                  data-academy-body
                  className={cn(
                    'text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg',
                    !reduced && 'opacity-0',
                  )}
                >
                  {paragraph}
                </p>
              ))}
            </div> */}
          </div>
        </div>
      </Container>

      {/* 3 — Structure coda */}
      <Container width="marketing" className="relative z-10 py-24 sm:py-32">
        <div
          data-academy-coda
          className={cn(!reduced && 'opacity-0')}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-primary-strong uppercase">
                {story.aside.label}
              </p>
              <p className="mt-3 max-w-md font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {story.aside.value}
              </p>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {story.aside.note}
            </p>
          </div>

          <div className="relative mt-14">
            <div
              data-academy-connector
              aria-hidden
              className="absolute top-5 right-8 left-8 hidden h-px origin-left scale-x-0 bg-primary/30 sm:block"
            />
            <ul className="grid gap-8 sm:grid-cols-3 sm:gap-6">
              {story.levels.map((level, i) => (
                <li
                  key={level.id}
                  data-academy-step
                  className={cn(
                    'rounded-xl p-1 transition-transform duration-500 hover:-translate-y-1',
                    !reduced && 'opacity-0',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary-wash font-heading text-sm font-semibold tabular-nums text-primary-strong">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
                      {level.label}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {level.note}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  )
}

function setChapterActive(chapters: HTMLElement[], activeIndex: number) {
  chapters.forEach((chapter, i) => {
    const on = i === activeIndex
    chapter.style.opacity = on ? '1' : '0.35'
    chapter.style.transform = on ? 'translateY(0)' : 'translateY(4px)'
  })
}

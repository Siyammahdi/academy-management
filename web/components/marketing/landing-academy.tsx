'use client'

import { useRef } from 'react'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { MarketingImage } from '@/components/marketing/marketing-image'
import { Container } from '@/components/layout/container'
import {
  blurRise,
  imageReveal,
  parallax,
  scrubScale,
  skewRise,
  wordRise,
} from '@/lib/gsap/motion'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { MEDIA } from '@/lib/marketing/media'
import { useMarketingCopy } from '@/components/i18n/locale-provider'

/**
 * The academy's position, told as an editorial spread: a sticky statement
 * on the left, a tall photograph that unmasks and drifts on the right.
 */
export function LandingAcademy() {
  const t = useMarketingCopy()
  const story = t.academyStory
  const rootRef = useRef<HTMLElement>(null)

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const headline = root.querySelector<HTMLElement>('[data-academy-headline]')
    if (headline) wordRise(gsap, headline, { stagger: 0.04, rotate: 5 })

    const quote = root.querySelector('[data-academy-quote]')
    if (quote) skewRise(gsap, quote, { y: 40, skew: 4, start: 'top 88%' })

    const tall = root.querySelector('[data-academy-tall]')
    const tallFrame = tall?.querySelector('[data-image-frame]')
    const tallImage = tall?.querySelector('[data-image]')
    if (tall && tallFrame) {
      imageReveal(gsap, tallFrame, { from: 'bottom', scale: 1.28 })
      parallax(gsap, tall, { amount: 32 })
      if (tallImage) scrubScale(gsap, tallImage, { from: 1.15, to: 1, trigger: tall })
    }

    const detailFrame = root.querySelector(
      '[data-academy-detail] [data-image-frame]',
    )
    if (detailFrame) imageReveal(gsap, detailFrame, { from: 'left', scale: 1.2 })

    const paragraphs = root.querySelectorAll('[data-academy-copy]')
    if (paragraphs.length) blurRise(gsap, paragraphs, { stagger: 0.14, y: 32 })

    const aside = root.querySelector('[data-academy-aside]')
    if (aside) {
      skewRise(gsap, aside, { y: 48, skew: 3, start: 'top 90%' })
    }
  }, [])

  return (
    <section
      ref={rootRef}
      id="academy"
      className="relative scroll-mt-24 bg-background py-24 sm:py-32"
      aria-labelledby="academy-heading"
    >
      <LandingAtmosphere tone="wash" />
      <Container width="marketing" className="relative z-10">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <Eyebrow>{story.eyebrow}</Eyebrow>
              <h2
                id="academy-heading"
                data-academy-headline
                className="mt-6 font-heading text-3xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl"
              >
                {story.heading}
              </h2>

              <blockquote
                data-academy-quote
                className="mt-8 border-l-2 border-primary pl-5 text-lg leading-relaxed text-pretty text-primary-strong sm:text-xl"
              >
                {story.quote}
              </blockquote>

              <div
                data-academy-detail
                className="mt-10 hidden max-w-xs lg:block"
              >
                <MarketingImage
                  image={MEDIA.academyDetail}
                  className="aspect-video w-full"
                  sizes="320px"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <div data-academy-tall>
              <MarketingImage
                image={MEDIA.academyPrimary}
                className="aspect-3/4 w-full sm:aspect-4/5"
                sizes="(min-width: 1024px) 45vw, 100vw"
              />
            </div>

            <div className="mt-10 space-y-6">
              {story.body.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 24)}
                  data-academy-copy
                  className="text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <div
              data-academy-aside
              className="mt-10 rounded-xl bg-primary-wash p-6 sm:p-8"
            >
              <p className="text-xs font-medium tracking-wide text-primary-strong uppercase">
                {story.aside.label}
              </p>
              <p className="mt-3 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {story.aside.value}
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                {story.aside.note}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

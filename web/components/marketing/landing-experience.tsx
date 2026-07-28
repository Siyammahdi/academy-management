'use client'

import { useRef } from 'react'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { MarketingImage } from '@/components/marketing/marketing-image'
import { Container } from '@/components/layout/container'
import { fadeRise, wordRise } from '@/lib/gsap/motion'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { useMarketingCopy } from '@/components/i18n/locale-provider'

/**
 * The month of study, told as a horizontal sequence. On desktop the section
 * pins and the track moves sideways with the scroll; on touch it stays a
 * swipeable snap row, which is the same gesture without the machinery.
 */
export function LandingExperience() {
  const t = useMarketingCopy()
  const experience = t.experience
  const rootRef = useRef<HTMLElement>(null)

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const headline = root.querySelector<HTMLElement>(
      '[data-experience-headline]',
    )
    if (headline) wordRise(gsap, headline, { stagger: 0.035, start: 'top 85%' })

    const lead = root.querySelector('[data-experience-lead]')
    if (lead) fadeRise(gsap, lead, { y: 18 })

    const track = root.querySelector<HTMLElement>('[data-experience-track]')
    if (!track) return

    const mm = gsap.matchMedia()

    mm.add('(min-width: 1024px)', () => {
      const distance = () =>
        Math.max(0, track.scrollWidth - root.clientWidth + 96)

      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
    })

    mm.add('(max-width: 1023px)', () => {
      gsap.fromTo(
        track.querySelectorAll('[data-experience-panel]'),
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          scrollTrigger: { trigger: track, start: 'top 85%', once: true },
        },
      )
    })
  }, [])

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden bg-primary-strong py-20 text-primary-foreground sm:py-24 lg:flex lg:h-svh lg:flex-col lg:justify-center lg:py-0"
      aria-labelledby="experience-heading"
    >
      <LandingAtmosphere tone="deep" density="rich" />
      <Container width="marketing" className="relative z-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Eyebrow tone="inverse">{experience.eyebrow}</Eyebrow>
            <h2
              id="experience-heading"
              data-experience-headline
              className="mt-5 font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl"
            >
              {experience.heading}
            </h2>
          </div>
          <p
            data-experience-lead
            className="max-w-sm text-base leading-relaxed text-primary-foreground/70"
          >
            {experience.lead}
          </p>
        </div>
      </Container>

      <div className="relative z-10 mt-12 overflow-x-auto pb-4 lg:mt-14 lg:overflow-visible lg:pb-0">
        {/* The left pad lines the first panel up with the container gutter. */}
        <ul
          data-experience-track
          className="flex w-max snap-x snap-mandatory gap-4 px-4 sm:px-6 lg:gap-6 lg:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]"
        >
          {experience.panels.map((panel) => (
            <li
              key={panel.index}
              data-experience-panel
              className="w-72 shrink-0 snap-start sm:w-80 lg:w-96"
            >
              {/* Height stays modest so the pinned view fits short laptops. */}
              <div className="relative h-96 overflow-hidden rounded-xl lg:h-100">
                <MarketingImage
                  image={panel.image}
                  className="absolute inset-0 h-full w-full rounded-none"
                  sizes="(min-width: 1024px) 24rem, 20rem"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-primary-strong via-primary-strong/70 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <span className="font-heading text-xs font-semibold tabular-nums text-primary-foreground/60">
                    {panel.index}
                  </span>
                  <h3 className="mt-2 font-heading text-xl font-semibold tracking-tight">
                    {panel.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-primary-foreground/75">
                    {panel.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

'use client'

import { useRef } from 'react'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { MarketingImage } from '@/components/marketing/marketing-image'
import { Container } from '@/components/layout/container'
import { blurRise, wordRise } from '@/lib/gsap/motion'
import { EASE } from '@/lib/gsap'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { useMarketingCopy } from '@/components/i18n/locale-provider'

/**
 * Horizontal scrub gallery. Desktop pins an inner stage (not the outer
 * section) so Lenis + ScrollTrigger stay aligned; touch keeps a snap row.
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
    if (headline) {
      wordRise(gsap, headline, { stagger: 0.04, start: 'top 85%', rotate: 3 })
    }

    const lead = root.querySelector('[data-experience-lead]')
    if (lead) blurRise(gsap, lead, { y: 20, blur: 8 })

    const stage = root.querySelector<HTMLElement>('[data-experience-stage]')
    const track = root.querySelector<HTMLElement>('[data-experience-track]')
    const progress = root.querySelector<HTMLElement>('[data-experience-progress]')
    if (!stage || !track) return

    const panels = gsap.utils.toArray<HTMLElement>(
      track.querySelectorAll('[data-experience-panel]'),
    )
    const mm = gsap.matchMedia()

    mm.add('(min-width: 1024px)', () => {
      const getDistance = () =>
        Math.max(0, track.scrollWidth - stage.clientWidth)

      // Reset before measuring — avoids leftover transform from prior runs.
      gsap.set(track, { x: 0 })
      gsap.set(panels, { clearProps: 'scale,opacity' })

      const tween = gsap.to(track, {
        x: () => -getDistance(),
        ease: 'none',
        scrollTrigger: {
          trigger: stage,
          start: 'top top',
          end: () => `+=${Math.max(getDistance(), window.innerHeight * 0.6)}`,
          pin: true,
          pinSpacing: true,
          scrub: 0.65,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          fastScrollEnd: true,
          onUpdate: (self) => {
            if (progress) gsap.set(progress, { scaleX: self.progress })

            const center = window.innerWidth * 0.5
            panels.forEach((panel) => {
              const rect = panel.getBoundingClientRect()
              const panelCenter = rect.left + rect.width / 2
              const dist = Math.abs(panelCenter - center)
              const norm = Math.min(1, dist / (center * 0.9))
              gsap.set(panel, {
                scale: 1 - norm * 0.06,
                opacity: 1 - norm * 0.28,
              })
            })
          },
        },
      })

      return () => {
        tween.scrollTrigger?.kill()
        tween.kill()
      }
    })

    mm.add('(max-width: 1023px)', () => {
      gsap.fromTo(
        panels,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: EASE.expo,
          scrollTrigger: { trigger: track, start: 'top 85%', once: true },
        },
      )
    })
  }, [])

  return (
    <section
      ref={rootRef}
      className="relative bg-primary-strong text-primary-foreground"
      aria-labelledby="experience-heading"
    >
      <LandingAtmosphere tone="deep" density="rich" />

      <div
        data-experience-stage
        className="relative z-10 flex flex-col justify-center py-20 sm:py-24 lg:h-svh lg:py-0"
      >
        <Container width="marketing">
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

          <div
            aria-hidden
            className="mt-8 hidden h-0.5 overflow-hidden rounded-full bg-primary-foreground/15 lg:block"
          >
            <div
              data-experience-progress
              className="h-full w-full origin-left scale-x-0 rounded-full bg-primary-foreground/70"
            />
          </div>
        </Container>

        <div className="mt-12 overflow-x-auto pb-4 lg:mt-14 lg:overflow-hidden lg:pb-0">
          <ul
            data-experience-track
            className="flex w-max snap-x snap-mandatory gap-4 px-4 will-change-transform sm:px-6 lg:gap-6 lg:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] lg:pr-16"
          >
            {experience.panels.map((panel) => (
              <li
                key={panel.index}
                data-experience-panel
                className="w-72 shrink-0 snap-start sm:w-80 lg:w-96"
              >
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
      </div>
    </section>
  )
}

'use client'

import { useRef } from 'react'

import { useMarketingCopy } from '@/components/i18n/locale-provider'
import { MarketingImage } from '@/components/marketing/marketing-image'
import { Container } from '@/components/layout/container'
import { fadeRise, imageReveal } from '@/lib/gsap/motion'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { cn } from '@/lib/utils'

/** The academy explained in three spreads, alternating side to side. */
export function AboutSections() {
  const t = useMarketingCopy()
  const rootRef = useRef<HTMLDivElement>(null)

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    root.querySelectorAll('[data-about-block]').forEach((block) => {
      const frame = block.querySelector('[data-image-frame]')
      if (frame) imageReveal(gsap, frame, { trigger: block })

      const copy = block.querySelectorAll('[data-about-copy]')
      if (copy.length) fadeRise(gsap, copy, { trigger: block, stagger: 0.1 })
    })
  }, [])

  return (
    <div ref={rootRef} className="bg-background">
      <Container width="marketing">
        <div className="flex flex-col gap-20 py-24 sm:gap-28 sm:py-32">
          {t.about.sections.map((section, index) => {
            const reversed = index % 2 === 1
            return (
              <section
                key={section.index}
                data-about-block
                className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14"
              >
                <div
                  className={cn(
                    'lg:row-start-1',
                    reversed
                      ? 'lg:col-span-6 lg:col-start-7'
                      : 'lg:col-span-6 lg:col-start-1',
                  )}
                >
                  <MarketingImage
                    image={section.image}
                    className="aspect-5/4 w-full"
                    sizes="(min-width: 1024px) 45vw, 100vw"
                  />
                </div>

                <div
                  className={cn(
                    'lg:row-start-1',
                    reversed
                      ? 'lg:col-span-5 lg:col-start-1'
                      : 'lg:col-span-5 lg:col-start-8',
                  )}
                >
                  <p
                    data-about-copy
                    className="font-heading text-sm font-semibold tabular-nums text-primary-strong"
                  >
                    {section.index}
                  </p>
                  <h2
                    data-about-copy
                    className="mt-4 font-heading text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-3xl"
                  >
                    {section.heading}
                  </h2>
                  <div className="mt-5 space-y-4">
                    {section.body.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 24)}
                        data-about-copy
                        className="text-base leading-relaxed text-pretty text-muted-foreground"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      </Container>
    </div>
  )
}

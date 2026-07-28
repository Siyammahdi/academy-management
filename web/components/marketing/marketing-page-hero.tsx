'use client'

import { useRef, type ReactNode } from 'react'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { Container } from '@/components/layout/container'
import { fadeRise, wordRise } from '@/lib/gsap/motion'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import { cn } from '@/lib/utils'

interface MarketingPageHeroProps {
  eyebrow: string
  title: string
  lead: string
  children?: ReactNode
}

/** Shared opening for the secondary public pages, matching the home page voice. */
export function MarketingPageHero({
  eyebrow,
  title,
  lead,
  children,
}: MarketingPageHeroProps) {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const headline = root.querySelector<HTMLElement>('[data-page-title]')
    if (headline) wordRise(gsap, headline, { stagger: 0.04, start: 'top 95%' })

    const soft = root.querySelectorAll('[data-page-fade]')
    if (soft.length) {
      fadeRise(gsap, soft, { stagger: 0.1, y: 18, start: 'top 95%' })
    }
  }, [])

  const hidden = !reduced ? 'opacity-0' : undefined

  return (
    <section className="relative overflow-hidden" ref={rootRef}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-primary-wash"
      />
      <Container
        width="marketing"
        className="relative py-16 sm:py-20 lg:py-24"
      >
        <div className="max-w-3xl">
          <Eyebrow className={hidden} data-page-fade>
            {eyebrow}
          </Eyebrow>
          <h1
            data-page-title
            className="mt-6 font-heading text-4xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-5xl"
          >
            {title}
          </h1>
          <p
            data-page-fade
            className={cn(
              'mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg',
              hidden,
            )}
          >
            {lead}
          </p>
          {children ? (
            <div data-page-fade className={cn('mt-8', hidden)}>
              {children}
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  )
}

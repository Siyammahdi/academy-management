'use client'

import { useRef } from 'react'

import { useMarketingCopy } from '@/components/i18n/locale-provider'
import { EASE, ScrollTrigger } from '@/lib/gsap'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { cn } from '@/lib/utils'

/**
 * Dual-direction kinetic band with scroll-scrubbed drift and velocity boost.
 * Decorative only — aria-hidden.
 */
export function LandingMarquee({ className }: { className?: string }) {
  const t = useMarketingCopy()
  const rootRef = useRef<HTMLDivElement>(null)

  const phrases = [
    t.academy.name,
    ...t.flagship.slice(0, 3).map((p) => p.name),
    t.hero.facts[0]?.value,
    t.hero.facts[1]?.value,
    t.hero.kicker,
  ].filter(Boolean) as string[]

  useGsapContext(
    rootRef,
    (gsap) => {
      const root = rootRef.current
      if (!root) return

      const tracks = root.querySelectorAll<HTMLElement>('[data-marquee-track]')

      tracks.forEach((track, i) => {
        const width = track.scrollWidth / 2
        const tween = gsap.fromTo(
          track,
          { x: i % 2 === 0 ? 0 : -width },
          {
            x: i % 2 === 0 ? -width : 0,
            duration: 34 + i * 10,
            ease: 'none',
            repeat: -1,
          },
        )

        ScrollTrigger.create({
          trigger: root,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (self) => {
            const boost = Math.min(Math.abs(self.getVelocity()) / 900, 2.4)
            tween.timeScale(1 + boost)
          },
        })
      })

      gsap.fromTo(
        root,
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.95,
          ease: EASE.expo,
          scrollTrigger: { trigger: root, start: 'top 92%', once: true },
        },
      )

      gsap.fromTo(
        root,
        { y: 16 },
        {
          y: -16,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.2,
          },
        },
      )
    },
    [phrases.join('|')],
  )

  const loop = [...phrases, ...phrases]

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={cn(
        'relative overflow-hidden border-y border-primary/15 bg-background py-6 sm:py-8',
        className,
      )}
    >
      <div className="flex flex-col gap-3">
        <div
          data-marquee-track
          className="flex w-max items-center gap-8 will-change-transform sm:gap-12"
        >
          {loop.map((phrase, i) => (
            <MarqueeItem key={`a-${phrase}-${i}`} phrase={phrase} />
          ))}
        </div>
        <div
          data-marquee-track
          className="flex w-max items-center gap-8 will-change-transform opacity-60 sm:gap-12"
        >
          {[...loop].reverse().map((phrase, i) => (
            <MarqueeItem key={`b-${phrase}-${i}`} phrase={phrase} muted />
          ))}
        </div>
      </div>
    </div>
  )
}

function MarqueeItem({
  phrase,
  muted,
}: {
  phrase: string
  muted?: boolean
}) {
  return (
    <span className="flex shrink-0 items-center gap-8 sm:gap-12">
      <span
        className={cn(
          'font-heading text-sm font-semibold tracking-tight sm:text-base',
          muted ? 'text-primary/70' : 'text-primary-strong',
        )}
      >
        {phrase}
      </span>
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          muted ? 'bg-primary/30' : 'bg-primary/50',
        )}
      />
    </span>
  )
}

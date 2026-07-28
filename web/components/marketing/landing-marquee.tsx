'use client'

import { useRef } from 'react'

import { useMarketingCopy } from '@/components/i18n/locale-provider'
import { EASE } from '@/lib/gsap'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { cn } from '@/lib/utils'

/**
 * Kinetic typography band — endless horizontal drift of short academy
 * phrases. Purely decorative; aria-hidden. Plays between editorial sections.
 */
export function LandingMarquee({ className }: { className?: string }) {
  const t = useMarketingCopy()
  const rootRef = useRef<HTMLDivElement>(null)

  const phrases = [
    t.academy.name,
    ...t.flagship.slice(0, 3).map((p) => p.name),
    t.hero.facts[0]?.value,
    t.hero.facts[1]?.value,
  ].filter(Boolean) as string[]

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const tracks = root.querySelectorAll<HTMLElement>('[data-marquee-track]')
    tracks.forEach((track, i) => {
      const width = track.scrollWidth / 2
      gsap.fromTo(
        track,
        { x: i % 2 === 0 ? 0 : -width },
        {
          x: i % 2 === 0 ? -width : 0,
          duration: 28 + i * 6,
          ease: 'none',
          repeat: -1,
        },
      )
    })

    gsap.fromTo(
      root,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: EASE.expo,
        scrollTrigger: { trigger: root, start: 'top 92%', once: true },
      },
    )
  }, [phrases.join('|')])

  const loop = [...phrases, ...phrases]

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={cn(
        'relative overflow-hidden border-y border-primary/15 bg-background py-5 sm:py-6',
        className,
      )}
    >
      <div
        data-marquee-track
        className="flex w-max items-center gap-8 will-change-transform sm:gap-12"
      >
        {loop.map((phrase, i) => (
          <span
            key={`${phrase}-${i}`}
            className="flex shrink-0 items-center gap-8 sm:gap-12"
          >
            <span className="font-heading text-sm font-semibold tracking-tight text-primary-strong sm:text-base">
              {phrase}
            </span>
            <span className="size-1.5 shrink-0 rounded-full bg-primary/50" />
          </span>
        ))}
      </div>
    </div>
  )
}

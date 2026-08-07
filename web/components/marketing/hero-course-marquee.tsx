'use client'

import Image from 'next/image'
import { useRef } from 'react'

import { EASE, ScrollTrigger } from '@/lib/gsap'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import { HERO_POSTERS } from '@/lib/marketing/media'
import { cn } from '@/lib/utils'

/**
 * Infinite horizontal strip of academy course posters — the visual floor of
 * the redesigned hero. Duplicates the set so the loop has no seam. Scroll
 * velocity gently speeds the loop; hover pauses.
 */
export function HeroCourseMarquee({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const reduced = usePrefersReducedMotion()

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const track = root.querySelector<HTMLElement>('[data-hero-marquee-track]')
    if (!track) return

    gsap.fromTo(
      root,
      { opacity: 0, y: 36 },
      {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: EASE.expo,
        delay: 0.35,
      },
    )

    const cards = track.querySelectorAll<HTMLElement>('[data-hero-poster]')
    gsap.fromTo(
      cards,
      { opacity: 0, y: 28, scale: 0.94 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.85,
        stagger: 0.045,
        ease: EASE.backSoft,
        delay: 0.45,
      },
    )

    // Three identical sets; advance by one set so the loop seams cleanly.
    const width = track.scrollWidth / 3
    const tween = gsap.fromTo(
      track,
      { x: 0 },
      {
        x: -width,
        duration: 42,
        ease: 'none',
        repeat: -1,
      },
    )
    tweenRef.current = tween

    ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        if (root.dataset.paused === 'true') return
        const boost = Math.min(Math.abs(self.getVelocity()) / 1100, 2)
        tween.timeScale(1 + boost)
      },
    })

    // Subtle vertical scrub so the strip floats with page scroll.
    gsap.fromTo(
      root,
      { y: 12 },
      {
        y: -20,
        ease: 'none',
        scrollTrigger: {
          trigger: root,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.4,
        },
      },
    )
  }, [])

  return (
    <div
      ref={rootRef}
      aria-hidden
      onPointerEnter={() => {
        const root = rootRef.current
        if (root) root.dataset.paused = 'true'
        tweenRef.current?.timeScale(0.12)
      }}
      onPointerLeave={() => {
        const root = rootRef.current
        if (root) root.dataset.paused = 'false'
        tweenRef.current?.timeScale(1)
      }}
      className={cn(
        'relative w-full overflow-hidden',
        !reduced && 'opacity-0',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent sm:w-16 md:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent sm:w-16 md:w-24" />

      <div
        data-hero-marquee-track
        className="flex w-max items-end gap-3 px-2 will-change-transform sm:gap-4 sm:px-3 md:gap-5"
      >
        {loop.map((poster, i) => {
          const tall = i % 3 === 1
          return (
            <div
              key={`${poster.src}-${i}`}
              data-hero-poster
              className={cn(
                'relative shrink-0 overflow-hidden rounded-xl bg-primary-wash transition-transform duration-500 ease-out hover:scale-105',
                tall
                  ? 'h-44 w-36 sm:h-56 sm:w-44 md:h-72 md:w-56 lg:h-80 lg:w-60'
                  : 'h-40 w-32 sm:h-52 sm:w-40 md:h-64 md:w-52 lg:h-72 lg:w-56',
              )}
            >
              <Image
                src={poster.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 240px, (min-width: 640px) 176px, 128px"
                className="object-cover"
                priority={i < 5}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Three copies keep the strip dense on wide screens without a visible gap.
const loop = [...HERO_POSTERS, ...HERO_POSTERS, ...HERO_POSTERS]

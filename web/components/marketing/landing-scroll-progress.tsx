'use client'

import { useRef } from 'react'

import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'

/**
 * Thin top progress bar that tracks page scroll — a quiet Awwwards cue that
 * the page is in motion. Hidden under prefers-reduced-motion.
 */
export function LandingScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useGsapContext(barRef, (gsap) => {
    const bar = barRef.current
    if (!bar) return

    gsap.fromTo(
      bar,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        transformOrigin: 'left center',
        scrollTrigger: {
          start: 0,
          end: 'max',
          scrub: 0.35,
        },
      },
    )
  }, [])

  if (reduced) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
    >
      <div
        ref={barRef}
        className="h-full w-full origin-left scale-x-0 bg-primary"
      />
    </div>
  )
}

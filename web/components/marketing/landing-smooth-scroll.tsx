'use client'

import { useEffect, type ReactNode } from 'react'
import { ReactLenis, useLenis } from 'lenis/react'

import { registerGsap, ScrollTrigger } from '@/lib/gsap'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'

/**
 * Lenis smooth scrolling for the landing page only. ScrollTrigger stays in
 * sync so pin/scrub sections remain accurate. Off under prefers-reduced-motion.
 */
export function LandingSmoothScroll({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion()

  if (reduced) return children

  return (
    <ReactLenis
      root
      options={{
        autoRaf: true,
        lerp: 0.08,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 0.9,
      }}
    >
      <ScrollTriggerBridge />
      {children}
    </ReactLenis>
  )
}

function ScrollTriggerBridge() {
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) return
    registerGsap()

    const onScroll = () => {
      ScrollTrigger.update()
    }
    lenis.on('scroll', onScroll)
    return () => {
      lenis.off('scroll', onScroll)
    }
  }, [lenis])

  return null
}

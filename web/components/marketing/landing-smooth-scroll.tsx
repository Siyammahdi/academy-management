'use client'

import { useEffect, type ReactNode } from 'react'
import { ReactLenis, useLenis } from 'lenis/react'

import { registerGsap, ScrollTrigger } from '@/lib/gsap'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'

/**
 * Lenis smooth scrolling for the landing page only. ScrollTrigger stays in
 * sync so pin/scrub/sticky math remain accurate. Off under prefers-reduced-motion.
 */
export function LandingSmoothScroll({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion()

  if (reduced) return children

  return (
    <ReactLenis
      root
      options={{
        autoRaf: true,
        lerp: 0.075,
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
    const gsap = registerGsap()

    // Keep ScrollTrigger's scroll position in lockstep with Lenis.
    const onScroll = () => {
      ScrollTrigger.update()
    }
    lenis.on('scroll', onScroll)

    // Recalculate pin/start/end after layout, fonts, and late images settle.
    const refresh = () => ScrollTrigger.refresh()
    const raf = requestAnimationFrame(refresh)
    window.addEventListener('load', refresh)
    window.addEventListener('resize', refresh)

    // Images inside marketing frames can shift trigger positions when they load.
    const images = document.querySelectorAll('img')
    images.forEach((img) => {
      if (!img.complete) img.addEventListener('load', refresh, { once: true })
    })

    // Soften pin jumps when Lenis is driving the scroll proxy.
    gsap.config({ force3D: true })
    ScrollTrigger.config({ ignoreMobileResize: true })

    return () => {
      cancelAnimationFrame(raf)
      lenis.off('scroll', onScroll)
      window.removeEventListener('load', refresh)
      window.removeEventListener('resize', refresh)
    }
  }, [lenis])

  return null
}

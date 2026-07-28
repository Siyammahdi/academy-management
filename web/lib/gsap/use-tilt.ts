'use client'

import { useEffect, useRef } from 'react'

import { registerGsap } from '@/lib/gsap'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'

/**
 * Subtle 3D tilt toward the pointer. Fine pointers only — touch and
 * reduced-motion users see a static frame.
 */
export function useTilt<T extends HTMLElement>(maxTilt = 7) {
  const ref = useRef<T>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    if (!window.matchMedia('(pointer: fine)').matches) return

    const gsap = registerGsap()
    gsap.set(el, { transformPerspective: 900, transformStyle: 'preserve-3d' })

    const rotX = gsap.quickTo(el, 'rotateX', { duration: 0.55, ease: 'power3.out' })
    const rotY = gsap.quickTo(el, 'rotateY', { duration: 0.55, ease: 'power3.out' })

    function handleMove(event: PointerEvent) {
      const bounds = el!.getBoundingClientRect()
      const px = (event.clientX - bounds.left) / bounds.width - 0.5
      const py = (event.clientY - bounds.top) / bounds.height - 0.5
      rotY(px * maxTilt * 2)
      rotX(-py * maxTilt * 2)
    }

    function handleLeave() {
      rotX(0)
      rotY(0)
    }

    el.addEventListener('pointermove', handleMove)
    el.addEventListener('pointerleave', handleLeave)
    return () => {
      el.removeEventListener('pointermove', handleMove)
      el.removeEventListener('pointerleave', handleLeave)
      gsap.set(el, { rotateX: 0, rotateY: 0 })
    }
  }, [reduced, maxTilt])

  return ref
}

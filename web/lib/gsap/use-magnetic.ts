'use client'

import { useEffect, useRef } from 'react'

import { registerGsap } from '@/lib/gsap'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'

/**
 * Pulls an element gently toward the pointer. Applied only to the single
 * primary call to action per page, and only for fine pointers — touch
 * devices and reduced-motion users get a plain button.
 */
export function useMagnetic<T extends HTMLElement>(strength = 0.28) {
  const ref = useRef<T>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    if (!window.matchMedia('(pointer: fine)').matches) return

    const gsap = registerGsap()
    const moveX = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3.out' })
    const moveY = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3.out' })

    function handleMove(event: PointerEvent) {
      const bounds = el!.getBoundingClientRect()
      moveX((event.clientX - (bounds.left + bounds.width / 2)) * strength)
      moveY((event.clientY - (bounds.top + bounds.height / 2)) * strength)
    }

    function handleLeave() {
      moveX(0)
      moveY(0)
    }

    el.addEventListener('pointermove', handleMove)
    el.addEventListener('pointerleave', handleLeave)
    return () => {
      el.removeEventListener('pointermove', handleMove)
      el.removeEventListener('pointerleave', handleLeave)
      gsap.set(el, { x: 0, y: 0 })
    }
  }, [reduced, strength])

  return ref
}

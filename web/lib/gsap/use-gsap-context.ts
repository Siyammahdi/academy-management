'use client'

import {
  useEffect,
  useLayoutEffect,
  type DependencyList,
  type RefObject,
} from 'react'

import { registerGsap } from '@/lib/gsap'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'

type GsapFactory = (
  gsap: ReturnType<typeof registerGsap>,
) => void | (() => void)

// Client components still render on the server, where useLayoutEffect warns.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Runs a GSAP setup inside `gsap.context` scoped to `scope`, and reverts on
 * unmount. Skips animation when the user prefers reduced motion.
 */
export function useGsapContext(
  scope: RefObject<HTMLElement | null>,
  factory: GsapFactory,
  deps: DependencyList = [],
): void {
  const reducedMotion = usePrefersReducedMotion()

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !scope.current) return

    const gsap = registerGsap()
    const ctx = gsap.context(() => {
      factory(gsap)
    }, scope)

    return () => ctx.revert()
  }, [reducedMotion, scope, ...deps])
}

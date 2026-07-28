'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

/** Register GSAP plugins once on the client. Safe to call repeatedly. */
export function registerGsap(): typeof gsap {
  if (typeof window !== 'undefined' && !registered) {
    gsap.registerPlugin(ScrollTrigger)
    registered = true
  }
  return gsap
}

export { gsap, ScrollTrigger }

/**
 * Expressive easings for marketing motion. Application UI stays on Luma
 * defaults — these are landing-only.
 */
export const EASE = {
  out: 'power3.out',
  inOut: 'power2.inOut',
  soft: 'power2.out',
  /** Snappy Webflow-style settle. */
  expo: 'expo.out',
  expoInOut: 'expo.inOut',
  /** Soft overshoot for playful entrances. */
  back: 'back.out(1.35)',
  backSoft: 'back.out(1.1)',
  /** Smooth cinematic glide. */
  power4: 'power4.out',
  circ: 'circ.out',
} as const

export const DURATION = {
  hero: 1.15,
  reveal: 0.95,
  stagger: 0.08,
  hover: 0.4,
  scrub: 1.2,
} as const

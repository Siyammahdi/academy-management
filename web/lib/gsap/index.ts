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

/** Default ease for premium, restrained motion. */
export const EASE = {
  out: 'power3.out',
  inOut: 'power2.inOut',
  soft: 'power2.out',
} as const

export const DURATION = {
  hero: 1.05,
  reveal: 0.85,
  stagger: 0.1,
  hover: 0.35,
} as const

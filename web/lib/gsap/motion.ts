import type { gsap as GsapNS } from 'gsap'

import { DURATION, EASE } from '@/lib/gsap'
import { splitWords } from '@/lib/gsap/split-text'

type Gsap = typeof GsapNS

interface ScrollOptions {
  /** Element that triggers the animation. Defaults to the first target. */
  trigger?: Element | null
  start?: string
  delay?: number
}

function firstElement(targets: gsap.TweenTarget): Element | undefined {
  if (targets instanceof Element) return targets
  if (targets instanceof NodeList) return targets[0] as Element | undefined
  if (Array.isArray(targets)) return targets[0] as Element | undefined
  return undefined
}

/**
 * Quiet entrance for body copy and small clusters. Used sparingly — the
 * sections carry their own signature motion instead.
 */
export function fadeRise(
  gsap: Gsap,
  targets: gsap.TweenTarget,
  options: ScrollOptions & { y?: number; stagger?: number } = {},
): void {
  const { y = 24, stagger = 0.08, start = 'top 85%', trigger, delay = 0 } = options
  const scrollTarget = trigger ?? firstElement(targets)

  gsap.fromTo(
    targets,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration: DURATION.reveal,
      stagger,
      delay,
      ease: EASE.out,
      scrollTrigger: scrollTarget
        ? { trigger: scrollTarget, start, once: true }
        : undefined,
    },
  )
}

/**
 * Headline reveal: each word rises out of its own mask. Returns the word
 * elements so a timeline can sequence them.
 */
export function wordRise(
  gsap: Gsap,
  headline: HTMLElement,
  options: ScrollOptions & { stagger?: number } = {},
): HTMLElement[] {
  const { stagger = 0.045, start = 'top 82%', trigger, delay = 0 } = options
  const words = splitWords(headline)
  if (words.length === 0) return words

  gsap.fromTo(
    words,
    { yPercent: 115 },
    {
      yPercent: 0,
      duration: DURATION.hero,
      stagger,
      delay,
      ease: EASE.out,
      scrollTrigger: { trigger: trigger ?? headline, start, once: true },
    },
  )

  return words
}

/**
 * Photography reveal: the frame unmasks from the bottom while the image
 * itself settles back from a slight scale — the layered look, not a fade.
 */
export function imageReveal(
  gsap: Gsap,
  frame: Element,
  options: ScrollOptions & { from?: 'bottom' | 'left' } = {},
): void {
  const { start = 'top 85%', trigger, delay = 0, from = 'bottom' } = options
  const inner = frame.querySelector('[data-image]')

  const clipFrom =
    from === 'bottom' ? 'inset(100% 0% 0% 0%)' : 'inset(0% 100% 0% 0%)'

  const tl = gsap.timeline({
    scrollTrigger: { trigger: trigger ?? frame, start, once: true },
    delay,
  })

  tl.fromTo(
    frame,
    { clipPath: clipFrom },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.15, ease: EASE.inOut },
  )

  if (inner) {
    tl.fromTo(
      inner,
      { scale: 1.18 },
      { scale: 1, duration: 1.4, ease: EASE.out },
      0,
    )
  }
}

/** Slow vertical drift tied to scroll position. */
export function parallax(
  gsap: Gsap,
  target: Element,
  options: { amount?: number; trigger?: Element | null } = {},
): void {
  const { amount = 60, trigger } = options

  gsap.fromTo(
    target,
    { yPercent: -amount / 10 },
    {
      yPercent: amount / 10,
      ease: 'none',
      scrollTrigger: {
        trigger: trigger ?? target,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    },
  )
}

/** Vertical rule that draws itself as the section scrolls past. */
export function lineDraw(
  gsap: Gsap,
  line: Element,
  options: { trigger?: Element | null; start?: string; end?: string } = {},
): void {
  const { trigger, start = 'top 70%', end = 'bottom 70%' } = options

  gsap.fromTo(
    line,
    { scaleY: 0 },
    {
      scaleY: 1,
      transformOrigin: 'top center',
      ease: 'none',
      scrollTrigger: {
        trigger: trigger ?? line,
        start,
        end,
        scrub: true,
      },
    },
  )
}

/**
 * Counts an integer up when it scrolls into view. Only ever called with
 * real values read from the API — the site states no invented figures.
 */
export function countUp(
  gsap: Gsap,
  el: Element,
  value: number,
  options: ScrollOptions = {},
): void {
  const { start = 'top 85%', trigger } = options
  const counter = { value: 0 }

  // Start from zero immediately so the figure never visibly resets. Without
  // motion (reduced-motion users) the rendered value is left untouched.
  el.textContent = '0'

  gsap.to(counter, {
    value,
    duration: 1.4,
    ease: EASE.out,
    onUpdate: () => {
      el.textContent = String(Math.round(counter.value))
    },
    scrollTrigger: { trigger: trigger ?? el, start, once: true },
  })
}

/** Cards that lift in sequence, each with a touch of rotation settling out. */
export function cardsIn(
  gsap: Gsap,
  targets: gsap.TweenTarget,
  options: ScrollOptions & { stagger?: number } = {},
): void {
  const { stagger = 0.09, start = 'top 85%', trigger } = options
  const scrollTarget = trigger ?? firstElement(targets)

  gsap.fromTo(
    targets,
    { opacity: 0, y: 40, scale: 0.985 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.9,
      stagger,
      ease: EASE.out,
      scrollTrigger: scrollTarget
        ? { trigger: scrollTarget, start, once: true }
        : undefined,
    },
  )
}

import type { gsap as GsapNS } from 'gsap'

import { DURATION, EASE } from '@/lib/gsap'
import { splitChars, splitWords } from '@/lib/gsap/split-text'

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
  const { y = 28, stagger = 0.08, start = 'top 85%', trigger, delay = 0 } = options
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
      ease: EASE.power4,
      scrollTrigger: scrollTarget
        ? { trigger: scrollTarget, start, once: true }
        : undefined,
    },
  )
}

/**
 * Soft-focus rise — the Framer-style blur settle used on leads and asides.
 */
export function blurRise(
  gsap: Gsap,
  targets: gsap.TweenTarget,
  options: ScrollOptions & { y?: number; stagger?: number; blur?: number } = {},
): void {
  const {
    y = 36,
    stagger = 0.1,
    blur = 12,
    start = 'top 86%',
    trigger,
    delay = 0,
  } = options
  const scrollTarget = trigger ?? firstElement(targets)

  gsap.fromTo(
    targets,
    { opacity: 0, y, filter: `blur(${blur}px)` },
    {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 1.05,
      stagger,
      delay,
      ease: EASE.expo,
      scrollTrigger: scrollTarget
        ? { trigger: scrollTarget, start, once: true }
        : undefined,
    },
  )
}

/**
 * Playful entrance with a settling skew — signature of kinetic templates.
 */
export function skewRise(
  gsap: Gsap,
  targets: gsap.TweenTarget,
  options: ScrollOptions & {
    y?: number
    skew?: number
    stagger?: number
  } = {},
): void {
  const {
    y = 60,
    skew = 6,
    stagger = 0.1,
    start = 'top 88%',
    trigger,
    delay = 0,
  } = options
  const scrollTarget = trigger ?? firstElement(targets)

  gsap.fromTo(
    targets,
    { opacity: 0, y, skewY: skew, transformOrigin: 'left bottom' },
    {
      opacity: 1,
      y: 0,
      skewY: 0,
      duration: 1.05,
      stagger,
      delay,
      ease: EASE.expo,
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
  options: ScrollOptions & { stagger?: number; rotate?: number } = {},
): HTMLElement[] {
  const {
    stagger = 0.045,
    start = 'top 82%',
    trigger,
    delay = 0,
    rotate = 4,
  } = options
  const words = splitWords(headline)
  if (words.length === 0) return words

  gsap.fromTo(
    words,
    { yPercent: 120, rotateZ: rotate, opacity: 0.15 },
    {
      yPercent: 0,
      rotateZ: 0,
      opacity: 1,
      duration: DURATION.hero,
      stagger,
      delay,
      ease: EASE.expo,
      scrollTrigger: { trigger: trigger ?? headline, start, once: true },
    },
  )

  return words
}

/**
 * Letter-level kinetic reveal. Best for short headlines; grapheme-safe.
 */
export function charRise(
  gsap: Gsap,
  headline: HTMLElement,
  options: ScrollOptions & { stagger?: number } = {},
): HTMLElement[] {
  const { stagger = 0.018, start = 'top 82%', trigger, delay = 0 } = options
  const chars = splitChars(headline)
  if (chars.length === 0) return chars

  gsap.fromTo(
    chars,
    { yPercent: 130, rotateZ: 8, opacity: 0 },
    {
      yPercent: 0,
      rotateZ: 0,
      opacity: 1,
      duration: 0.95,
      stagger,
      delay,
      ease: EASE.backSoft,
      scrollTrigger: { trigger: trigger ?? headline, start, once: true },
    },
  )

  return chars
}

/**
 * Photography reveal: the frame unmasks while the image settles from scale.
 */
export function imageReveal(
  gsap: Gsap,
  frame: Element,
  options: ScrollOptions & {
    from?: 'bottom' | 'left' | 'right' | 'top'
    scale?: number
  } = {},
): void {
  const {
    start = 'top 85%',
    trigger,
    delay = 0,
    from = 'bottom',
    scale = 1.22,
  } = options
  const inner = frame.querySelector('[data-image]')

  const clipFrom = {
    bottom: 'inset(100% 0% 0% 0%)',
    top: 'inset(0% 0% 100% 0%)',
    left: 'inset(0% 100% 0% 0%)',
    right: 'inset(0% 0% 0% 100%)',
  }[from]

  const tl = gsap.timeline({
    scrollTrigger: { trigger: trigger ?? frame, start, once: true },
    delay,
  })

  tl.fromTo(
    frame,
    { clipPath: clipFrom },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.35, ease: EASE.expoInOut },
  )

  if (inner) {
    tl.fromTo(
      inner,
      { scale, rotate: from === 'left' || from === 'right' ? -1.5 : 1.5 },
      { scale: 1, rotate: 0, duration: 1.55, ease: EASE.expo },
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

/**
 * Image zooms gently as it scrolls through the viewport — cinematic scrub.
 */
export function scrubScale(
  gsap: Gsap,
  target: Element,
  options: {
    from?: number
    to?: number
    trigger?: Element | null
  } = {},
): void {
  const { from = 1.18, to = 1, trigger } = options

  gsap.fromTo(
    target,
    { scale: from },
    {
      scale: to,
      ease: 'none',
      scrollTrigger: {
        trigger: trigger ?? target,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.1,
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
    duration: 1.6,
    ease: EASE.expo,
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
    { opacity: 0, y: 48, scale: 0.94, rotateZ: 1.5 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateZ: 0,
      duration: 1,
      stagger,
      ease: EASE.expo,
      scrollTrigger: scrollTarget
        ? { trigger: scrollTarget, start, once: true }
        : undefined,
    },
  )
}

/**
 * Horizontal wipe for rules and progress bars — origin left by default.
 */
export function ruleDraw(
  gsap: Gsap,
  line: Element,
  options: ScrollOptions & { origin?: 'left' | 'right' | 'center' } = {},
): void {
  const {
    start = 'top 88%',
    trigger,
    delay = 0,
    origin = 'left',
  } = options

  gsap.fromTo(
    line,
    { scaleX: 0 },
    {
      scaleX: 1,
      transformOrigin: origin,
      duration: 0.9,
      delay,
      ease: EASE.expoInOut,
      scrollTrigger: {
        trigger: trigger ?? line,
        start,
        once: true,
      },
    },
  )
}

/**
 * Pop-in with soft overshoot — for step indices and small markers.
 */
export function popIn(
  gsap: Gsap,
  targets: gsap.TweenTarget,
  options: ScrollOptions & { stagger?: number } = {},
): void {
  const { stagger = 0.12, start = 'top 88%', trigger, delay = 0 } = options
  const scrollTarget = trigger ?? firstElement(targets)

  gsap.fromTo(
    targets,
    { opacity: 0, scale: 0.5, rotateZ: -12 },
    {
      opacity: 1,
      scale: 1,
      rotateZ: 0,
      duration: 0.75,
      stagger,
      delay,
      ease: EASE.back,
      scrollTrigger: scrollTarget
        ? { trigger: scrollTarget, start, once: true }
        : undefined,
    },
  )
}

/**
 * Vertical drift scrubbed to scroll — for sticky media and band accents.
 */
export function scrubY(
  gsap: Gsap,
  target: gsap.TweenTarget,
  options: {
    from?: number
    to?: number
    trigger?: Element | null
    start?: string
    end?: string
  } = {},
): void {
  const {
    from = 40,
    to = -40,
    trigger,
    start = 'top bottom',
    end = 'bottom top',
  } = options
  const scrollTarget = trigger ?? firstElement(target)
  if (!scrollTarget) return

  gsap.fromTo(
    target,
    { y: from },
    {
      y: to,
      ease: 'none',
      scrollTrigger: {
        trigger: scrollTarget,
        start,
        end,
        scrub: 1.1,
      },
    },
  )
}

/**
 * Opacity scrub across a section’s viewport travel.
 */
export function scrubFade(
  gsap: Gsap,
  target: gsap.TweenTarget,
  options: {
    from?: number
    to?: number
    trigger?: Element | null
    start?: string
    end?: string
  } = {},
): void {
  const {
    from = 0.35,
    to = 1,
    trigger,
    start = 'top 90%',
    end = 'top 40%',
  } = options
  const scrollTarget = trigger ?? firstElement(target)
  if (!scrollTarget) return

  gsap.fromTo(
    target,
    { opacity: from },
    {
      opacity: to,
      ease: 'none',
      scrollTrigger: {
        trigger: scrollTarget,
        start,
        end,
        scrub: true,
      },
    },
  )
}

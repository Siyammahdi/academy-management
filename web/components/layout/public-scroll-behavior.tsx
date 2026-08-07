'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'

const HEADER_OFFSET_PX = 96

function scrollToHash(hash: string, smooth: boolean): void {
  const id = decodeURIComponent(hash.replace(/^#/, ''))
  if (!id) return
  const el = document.getElementById(id)
  if (!el) return

  const lenis = (
    window as Window & {
      __lenis?: { scrollTo: (target: HTMLElement, opts?: object) => void }
    }
  ).__lenis

  if (lenis) {
    lenis.scrollTo(el, {
      offset: -HEADER_OFFSET_PX,
      duration: smooth ? 1.15 : 0,
    })
    return
  }

  el.scrollIntoView({
    behavior: smooth ? 'smooth' : 'auto',
    block: 'start',
  })
}

/**
 * Public marketing scroll behaviour:
 * - Path changes without a hash jump to the top of the page.
 * - Hash links (in-page or `/#section`) scroll smoothly to the target.
 */
export function PublicScrollBehavior() {
  const pathname = usePathname()
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const run = () => scrollToHash(hash, !reduced)
      // Wait a frame so the destination route has painted (and Lenis mounted).
      const raf = requestAnimationFrame(() => {
        run()
        // Landing sections mount async; retry once after layout settles.
        window.setTimeout(run, 120)
      })
      return () => cancelAnimationFrame(raf)
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    const lenis = (
      window as Window & { __lenis?: { scrollTo: (n: number) => void } }
    ).__lenis
    lenis?.scrollTo(0)
  }, [pathname, reduced])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const anchor = (event.target as Element | null)?.closest('a')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }

      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      if (!url.hash) return

      const samePath =
        url.pathname === window.location.pathname ||
        (url.pathname === '/' && window.location.pathname === '/')

      // Same-page hash: intercept and smooth-scroll.
      if (samePath && url.pathname === window.location.pathname) {
        event.preventDefault()
        if (window.location.hash !== url.hash) {
          history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`)
        }
        scrollToHash(url.hash, !reduced)
        return
      }

      // `/#section` while already on `/` (href may be absolute or relative).
      if (pathname === '/' && url.pathname === '/' && url.hash) {
        event.preventDefault()
        if (window.location.hash !== url.hash) {
          history.pushState(null, '', `/${url.search}${url.hash}`)
        }
        scrollToHash(url.hash, !reduced)
      }
    }

    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [pathname, reduced])

  return null
}

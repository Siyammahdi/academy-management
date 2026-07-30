'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MenuIcon, XIcon } from 'lucide-react'

import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { useMarketingCopy } from '@/components/i18n/locale-provider'
import { Container } from './container'
import { Button } from '@/components/ui/button'
import { usePublicAuth } from '@/lib/use-public-auth'
import { cn } from '@/lib/utils'

/**
 * doc 09 §9 — marketing chrome. Sits transparent over the hero wash and
 * settles onto a solid surface once the page scrolls. Auth CTAs swap when
 * a session cookie is present.
 */
export function SiteHeader() {
  const t = useMarketingCopy()
  const auth = usePublicAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { href: '/#programs', label: t.nav.programs },
    { href: '/#enrollment', label: t.nav.enrollment },
    { href: '/#faq', label: t.nav.questions },
    { href: '/about', label: t.nav.about },
    { href: '/pay', label: t.nav.payFees },
  ] as const

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const showAuth = auth.ready
  const loggedIn = showAuth && auth.authenticated

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-colors duration-300',
        scrolled
          ? 'border-b border-border bg-background/90 backdrop-blur-md'
          : 'border-b border-transparent',
      )}
    >
      <Container width="marketing">
        <div className="flex h-16 items-center justify-between gap-4 sm:h-18">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-heading text-base font-semibold tracking-tight text-foreground"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              AN
            </span>
            <span className="hidden sm:inline">{t.academy.name}</span>
            <span className="sm:hidden">{t.academy.shortName}</span>
          </Link>

          <nav
            className="hidden items-center gap-7 lg:flex"
            aria-label={t.nav.primaryNav}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            {loggedIn ? (
              <Button
                size="sm"
                className="hidden min-h-9 sm:inline-flex"
                render={<Link href={auth.homeHref} />}
              >
                {t.nav.goToApp}
              </Button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden px-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:inline"
                >
                  {t.nav.logIn}
                </Link>
                <Button
                  size="sm"
                  className="hidden min-h-9 sm:inline-flex"
                  render={<Link href="/register" />}
                >
                  {t.nav.register}
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <XIcon /> : <MenuIcon />}
            </Button>
          </div>
        </div>
      </Container>

      {menuOpen ? (
        <div className="border-t border-border bg-background lg:hidden">
          <Container width="marketing">
            <nav className="flex flex-col py-2" aria-label={t.nav.primaryNav}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center text-base text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">
                  {t.nav.language}
                </span>
                <LanguageSwitcher />
              </div>
              {loggedIn ? (
                <Button
                  className="mt-2 mb-4 min-h-11"
                  render={<Link href={auth.homeHref} />}
                  onClick={() => setMenuOpen(false)}
                >
                  {t.nav.goToApp}
                </Button>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center text-base text-muted-foreground"
                  >
                    {t.nav.logIn}
                  </Link>
                  <Button
                    className="mt-2 mb-4 min-h-11"
                    render={<Link href="/register" />}
                  >
                    {t.nav.register}
                  </Button>
                </>
              )}
            </nav>
          </Container>
        </div>
      ) : null}
    </header>
  )
}

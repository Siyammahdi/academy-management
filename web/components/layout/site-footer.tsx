'use client'

import Link from 'next/link'

import { AcademyLogo } from '@/components/brand/academy-logo'
import { useMarketingCopy } from '@/components/i18n/locale-provider'
import { Container } from './container'

export function SiteFooter() {
  const t = useMarketingCopy()

  const columns = [
    {
      title: t.footer.academyColumn,
      links: [
        { href: '/#programs', label: t.footer.programs },
        { href: '/#enrollment', label: t.footer.howEnrollment },
        { href: '/about', label: t.footer.about },
        { href: '/#faq', label: t.footer.questions },
      ],
    },
    {
      title: t.footer.studentsColumn,
      links: [
        { href: '/register', label: t.footer.createAccount },
        { href: '/login', label: t.footer.logIn },
        { href: '/pay', label: t.footer.payGuest },
        { href: '/contact', label: t.footer.contact },
      ],
    },
    {
      title: t.footer.legalColumn,
      links: [
        { href: '/terms', label: t.footer.terms },
        { href: '/privacy', label: t.footer.privacy },
        { href: '/refund-policy', label: t.footer.refund },
      ],
    },
  ] as const

  return (
    <footer className="border-t border-border bg-background">
      <Container width="marketing">
        <div className="grid gap-12 py-14 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 font-heading text-base font-semibold tracking-tight text-foreground"
            >
              <AcademyLogo size={32} decorative />
              {t.academy.name}
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t.footer.blurb}
            </p>
            <div className="mt-6 flex flex-col gap-1.5 text-sm">
              <a
                href={`mailto:${t.contact.email}`}
                className="text-primary-strong underline-offset-4 hover:underline"
              >
                {t.contact.email}
              </a>
              <a
                href={`tel:${t.contact.phone.replace(/[^+\d]/g, '')}`}
                className="text-muted-foreground hover:text-foreground"
              >
                {t.contact.phone}
              </a>
              <p className="pt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t.footer.tradeLicenseLabel}:
                </span>{' '}
                <span className="tabular-nums">{t.contact.tradeLicense}</span>
              </p>
            </div>
          </div>

          {columns.map((column) => (
            <nav
              key={column.title}
              className="lg:col-span-3"
              aria-label={column.title}
            >
              <h2 className="text-xs font-medium tracking-wide text-primary-strong uppercase">
                {column.title}
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {t.academy.name}
          </p>
          <p className="text-xs text-muted-foreground">{t.footer.classesNote}</p>
        </div>
      </Container>
    </footer>
  )
}

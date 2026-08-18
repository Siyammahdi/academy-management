'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpIcon, MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react'

import { AcademyLogo } from '@/components/brand/academy-logo'
import {
  FacebookIcon,
  TelegramIcon,
  WhatsAppIcon,
} from '@/components/brand/social-icons'
import { useMarketingCopy } from '@/components/i18n/locale-provider'
import { Container } from '@/components/layout/container'
import { cn } from '@/lib/utils'

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

  const social = [
    {
      href: t.contact.social.facebook,
      label: t.footer.social.facebook,
      Icon: FacebookIcon,
    },
    {
      href: t.contact.social.whatsapp,
      label: t.footer.social.whatsapp,
      Icon: WhatsAppIcon,
    },
    {
      href: t.contact.social.telegram,
      label: t.footer.social.telegram,
      Icon: TelegramIcon,
    },
  ] as const

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="relative overflow-hidden border-t border-border bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary-wash/70 to-transparent"
      />

      <Container width="marketing" className="relative">
        {/* Brand + social */}
        <div className="flex flex-col gap-8 border-b border-border py-12 sm:py-14 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-md">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 font-heading text-lg font-semibold tracking-tight text-foreground"
            >
              <AcademyLogo size={36} decorative />
              {t.academy.name}
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {t.footer.blurb}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium tracking-wide text-primary-strong uppercase">
              {t.footer.followLabel}
            </p>
            <ul className="mt-3 flex items-center gap-2">
              {social.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className={cn(
                      'inline-flex size-11 items-center justify-center rounded-lg',
                      'bg-primary-wash text-primary-strong',
                      'transition-colors duration-300',
                      'hover:bg-primary hover:text-primary-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                  >
                    <Icon className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Link columns + contact */}
        <div className="grid gap-10 py-12 sm:grid-cols-2 sm:gap-12 lg:grid-cols-12 lg:py-14">
          {columns.map((column) => (
            <nav
              key={column.title}
              className="lg:col-span-2"
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

          <div className="sm:col-span-2 lg:col-span-6 lg:pl-6">
            <h2 className="text-xs font-medium tracking-wide text-primary-strong uppercase">
              {t.footer.connectColumn}
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a
                href={`mailto:${t.contact.email}`}
                className="group flex items-start gap-3 rounded-xl bg-primary-wash/70 p-4 transition-colors hover:bg-primary-wash"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary-strong">
                  <MailIcon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-muted-foreground">
                    {t.contactPage.email}
                  </span>
                  <span className="mt-0.5 block break-all text-sm font-medium text-primary-strong group-hover:underline group-hover:underline-offset-4">
                    {t.contact.email}
                  </span>
                </span>
              </a>

              <a
                href={`tel:${t.contact.phoneHref}`}
                className="group flex items-start gap-3 rounded-xl bg-primary-wash/70 p-4 transition-colors hover:bg-primary-wash"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary-strong">
                  <PhoneIcon className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">
                    {t.contactPage.phone}
                  </span>
                  <span className="mt-0.5 block text-sm font-medium text-primary-strong group-hover:underline group-hover:underline-offset-4">
                    {t.contact.phone}
                  </span>
                </span>
              </a>
            </div>

            <div className="group flex items-start gap-3 rounded-xl bg-primary-wash/70 p-4 transition-colors hover:bg-primary-wash mt-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary-strong">
                <MapPinIcon className="size-4" aria-hidden />
              </span>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t.footer.officeLabel}
                  </p>
                  <p className="mt-0.5 leading-relaxed text-primary-strong group-hover:underline group-hover:underline-offset-4">
                    {t.contact.officeAddress}
                  </p>
                </div>
                {/* <div>
                  <p className="text-xs text-muted-foreground">
                    {t.footer.registeredLabel}
                  </p>
                  <p className="mt-0.5 leading-relaxed text-muted-foreground">
                    {t.contact.registeredAddress}
                  </p>
                </div> */}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-4 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} {t.academy.name}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {t.footer.tradeLicenseLabel}:
              </span>{' '}
              <span className="tabular-nums">{t.contact.tradeLicense}</span>
              <span className="mx-1.5 text-border">·</span>
              <span className="tabular-nums">{t.contact.tradeLicenseId}</span>
            </p>
            <p className="text-xs text-muted-foreground">{t.footer.classesNote}</p>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-3 text-sm font-medium',
              'text-primary-strong transition-colors hover:bg-primary-wash',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-auto',
            )}
          >
            {t.footer.backToTop}
            <ArrowUpIcon className="size-4" aria-hidden />
          </button>
        </div>

        <div className="border-t border-border py-5 sm:py-6">
          <Image
            src="/payment/payment-banner.png"
            alt={t.footer.paymentBannerAlt}
            width={5235}
            height={586}
            sizes="(min-width: 1280px) 1120px, calc(100vw - 2rem)"
            className="h-auto w-full max-w-full object-contain"
          />
        </div>
      </Container>
    </footer>
  )
}

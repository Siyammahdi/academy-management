'use client'

import Link from 'next/link'
import { MailIcon, PhoneIcon } from 'lucide-react'

import { useLocale, useMarketingCopy } from '@/components/i18n/locale-provider'
import { MarketingImage } from '@/components/marketing/marketing-image'
import { MarketingPageHero } from '@/components/marketing/marketing-page-hero'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { MEDIA } from '@/lib/marketing/media'

export function ContactPageContent() {
  const { locale } = useLocale()
  const t = useMarketingCopy()
  const page = t.contactPage

  const routes = [
    {
      title: page.alreadyStudent,
      body: page.alreadyStudentBody,
      href: '/login',
      action: page.alreadyStudentAction,
    },
    {
      title: page.payingSomeone,
      body: page.payingSomeoneBody,
      href: '/pay',
      action: page.payingSomeoneAction,
    },
    {
      title: page.newHere,
      body: page.newHereBody,
      href: '/register',
      action: page.newHereAction,
    },
  ] as const

  return (
    <div key={locale}>
      <MarketingPageHero
        eyebrow={page.eyebrow}
        title={page.title}
        lead={page.lead}
      />

      <Container width="marketing">
        <div className="grid gap-12 py-20 sm:py-24 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <dl className="flex flex-col">
              <div className="flex items-center justify-between gap-6 border-b border-border py-5">
                <dt className="flex items-center gap-3 text-base text-muted-foreground">
                  <MailIcon className="size-4" aria-hidden />
                  {page.email}
                </dt>
                <dd>
                  <a
                    href={`mailto:${t.contact.email}`}
                    className="text-base font-medium text-primary-strong underline-offset-4 hover:underline"
                  >
                    {t.contact.email}
                  </a>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-6 border-b border-border py-5">
                <dt className="flex items-center gap-3 text-base text-muted-foreground">
                  <PhoneIcon className="size-4" aria-hidden />
                  {page.phone}
                </dt>
                <dd>
                  <a
                    href={`tel:${t.contact.phone.replace(/[^+\d]/g, '')}`}
                    className="text-base font-medium text-primary-strong underline-offset-4 hover:underline"
                  >
                    {t.contact.phone}
                  </a>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-6 border-b border-border py-5">
                <dt className="text-base text-muted-foreground">{page.hours}</dt>
                <dd className="text-base text-foreground">{page.hoursValue}</dd>
              </div>
            </dl>

            <div className="mt-12 flex flex-col gap-4">
              {routes.map((route) => (
                <div
                  key={route.title}
                  className="flex flex-col gap-3 rounded-xl bg-primary-wash p-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="max-w-sm">
                    <h2 className="font-heading text-base font-semibold text-foreground">
                      {route.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {route.body}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="min-h-11 shrink-0"
                    render={<Link href={route.href} />}
                  >
                    {route.action}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 lg:col-start-8">
            <MarketingImage
              image={MEDIA.assurance}
              className="aspect-4/5 w-full"
              sizes="(min-width: 1024px) 40vw, 100vw"
            />
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {page.teachingNote}
            </p>
          </div>
        </div>
      </Container>
    </div>
  )
}

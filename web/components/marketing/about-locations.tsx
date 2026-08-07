'use client'

import { useRef } from 'react'

import { useMarketingCopy } from '@/components/i18n/locale-provider'
import { Eyebrow } from '@/components/marketing/eyebrow'
import { Container } from '@/components/layout/container'
import { fadeRise } from '@/lib/gsap/motion'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'

/** Registered vs office addresses — same editorial voice as the about spreads. */
export function AboutLocations() {
  const t = useMarketingCopy()
  const rootRef = useRef<HTMLElement>(null)

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return
    const soft = root.querySelectorAll('[data-locations-fade]')
    if (soft.length) {
      fadeRise(gsap, soft, { trigger: root, stagger: 0.1, y: 20 })
    }
  }, [])

  const places = [
    {
      label: t.about.registeredAddressLabel,
      value: t.contact.registeredAddress,
    },
    {
      label: t.about.officeAddressLabel,
      value: t.contact.officeAddress,
    },
  ] as const

  return (
    <section ref={rootRef} className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-primary-wash"
      />
      <Container width="marketing" className="relative py-24 sm:py-32">
        <div className="max-w-2xl">
          <Eyebrow data-locations-fade>{t.about.locationsEyebrow}</Eyebrow>
          <h2
            data-locations-fade
            className="mt-6 font-heading text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t.about.locationsHeading}
          </h2>
          <p
            data-locations-fade
            className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {t.about.locationsLead}
          </p>
        </div>

        <dl
          data-locations-fade
          className="mt-14 grid gap-10 border-t border-border/60 pt-10 sm:grid-cols-2 sm:gap-14"
        >
          {places.map((place) => (
            <div key={place.label}>
              <dt className="text-xs font-medium tracking-wide text-primary-strong uppercase">
                {place.label}
              </dt>
              <dd className="mt-3 max-w-sm font-heading text-lg leading-snug font-semibold tracking-tight text-foreground sm:text-xl">
                {place.value}
              </dd>
            </div>
          ))}
        </dl>

        <dl
          data-locations-fade
          className="mt-12 grid gap-4 border-t border-border/60 pt-10 sm:grid-cols-2 sm:gap-14"
        >
          <div className="flex items-baseline justify-between gap-6 sm:block">
            <dt className="text-sm text-muted-foreground">
              {t.about.tradeLicenseLabel}
            </dt>
            <dd className="font-heading text-base font-semibold tabular-nums tracking-tight text-foreground sm:mt-2">
              {t.contact.tradeLicense}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-6 sm:block">
            <dt className="text-sm text-muted-foreground">
              {t.about.tradeLicenseIdLabel}
            </dt>
            <dd className="font-heading text-base font-semibold tabular-nums tracking-tight text-foreground sm:mt-2">
              {t.contact.tradeLicenseId}
            </dd>
          </div>
        </dl>
      </Container>
    </section>
  )
}

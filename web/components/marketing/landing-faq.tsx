'use client'

import { useRef } from 'react'
import Link from 'next/link'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { Container } from '@/components/layout/container'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { blurRise, skewRise, wordRise } from '@/lib/gsap/motion'
import { EASE } from '@/lib/gsap'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { useMarketingCopy } from '@/components/i18n/locale-provider'

/** The questions admissions actually gets, answered by the rules we follow. */
export function LandingFaq() {
  const t = useMarketingCopy()
  const faq = t.faq
  const rootRef = useRef<HTMLElement>(null)

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const headline = root.querySelector<HTMLElement>('[data-faq-headline]')
    if (headline) wordRise(gsap, headline, { stagger: 0.04, rotate: 3 })

    const items = root.querySelectorAll('[data-faq-item]')
    if (items.length) {
      skewRise(gsap, items, { stagger: 0.08, y: 28, skew: 2, start: 'top 90%' })
    }

    const aside = root.querySelector('[data-faq-aside]')
    if (aside) blurRise(gsap, aside, { y: 24, blur: 10 })

    const footer = root.querySelector('[data-faq-footer]')
    if (footer) {
      gsap.fromTo(
        footer,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: EASE.expo,
          scrollTrigger: { trigger: footer, start: 'top 92%', once: true },
        },
      )
    }
  }, [])

  return (
    <section
      ref={rootRef}
      id="faq"
      className="relative scroll-mt-24 bg-background py-24 sm:py-32"
      aria-labelledby="faq-heading"
    >
      <LandingAtmosphere tone="wash" />
      <Container width="marketing" className="relative z-10">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <Eyebrow>{faq.eyebrow}</Eyebrow>
              <h2
                id="faq-heading"
                data-faq-headline
                className="mt-6 font-heading text-3xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
              >
                {faq.heading}
              </h2>

              <div
                data-faq-aside
                className="mt-8 rounded-xl bg-primary-wash p-6"
              >
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {faq.aside}
                </p>
                <a
                  href={`mailto:${t.contact.email}`}
                  className="mt-3 inline-block text-sm font-medium text-primary-strong underline-offset-4 hover:underline"
                >
                  {t.contact.email}
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 lg:col-start-6">
            <Accordion className="border-t border-border">
              {faq.items.map((item, index) => (
                <AccordionItem
                  key={item.question}
                  value={index}
                  data-faq-item
                >
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <p
              data-faq-footer
              className="mt-8 text-sm text-muted-foreground"
            >
              {faq.readyPrefix}{' '}
              <Link
                href="/register"
                className="font-medium text-primary-strong underline-offset-4 hover:underline"
              >
                {faq.readyLink}
              </Link>
              .
            </p>
          </div>
        </div>
      </Container>
    </section>
  )
}

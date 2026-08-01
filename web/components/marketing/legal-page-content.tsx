'use client'

import { useLocale, useMarketingCopy } from '@/components/i18n/locale-provider'
import { MarketingPageHero } from '@/components/marketing/marketing-page-hero'
import { Container } from '@/components/layout/container'
import type { LegalDocumentCopy } from '@/lib/marketing/types'

export type LegalDocumentKey = 'terms' | 'privacy' | 'refund'

export function LegalPageContent({ document }: { document: LegalDocumentKey }) {
  const { locale } = useLocale()
  const t = useMarketingCopy()
  const copy: LegalDocumentCopy = t.legal[document]

  return (
    <div key={locale}>
      <MarketingPageHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        lead={copy.lead}
      />

      <Container width="reading" className="py-12 sm:py-16">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {copy.updated}
        </p>
        <div className="mt-10 flex flex-col gap-10">
          {copy.sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-base leading-relaxed text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </Container>
    </div>
  )
}

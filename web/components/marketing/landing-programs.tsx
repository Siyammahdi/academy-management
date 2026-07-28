'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowUpRightIcon } from 'lucide-react'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { MarketingImage } from '@/components/marketing/marketing-image'
import {
  useAcademyData,
  useCourseByKeywords,
} from '@/components/marketing/academy-data'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { BatchWithSeats, Course } from '@/lib/api-client'
import { formatDate, formatMoney } from '@/lib/format'
import { blurRise, wordRise } from '@/lib/gsap/motion'
import { EASE, ScrollTrigger } from '@/lib/gsap'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { useMarketingCopy } from '@/components/i18n/locale-provider'
import type { MarketingCopy, MarketingProgramCopy } from '@/lib/marketing/types'
import { cn } from '@/lib/utils'

/**
 * Sticky stack of course cards. Each card pins near the top of the viewport
 * while the next slides over it and scales the one beneath — the classic
 * Awwwards stack pattern. Parent must not use overflow:hidden or sticky dies.
 */
export function LandingPrograms() {
  const t = useMarketingCopy()
  const rootRef = useRef<HTMLElement>(null)
  const { status } = useAcademyData()
  // First three flagship entries drive the stack (Arabic, Qur’an, Path).
  const cards = t.flagship.slice(0, 3)

  useEffect(() => {
    if (status !== 'ready') return
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [status])

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const headline = root.querySelector<HTMLElement>('[data-programs-headline]')
    if (headline) wordRise(gsap, headline, { stagger: 0.04, rotate: 3 })

    const lead = root.querySelector('[data-programs-lead]')
    if (lead) blurRise(gsap, lead, { y: 20, blur: 8 })

    const stackCards = root.querySelectorAll<HTMLElement>('[data-stack-card]')
    const mm = gsap.matchMedia()

    mm.add('(min-width: 768px)', () => {
      stackCards.forEach((card, index) => {
        const inner = card.querySelector<HTMLElement>('[data-stack-inner]')
        if (!inner) return

        // Scale + dim the card underneath as the next one covers it.
        if (index < stackCards.length - 1) {
          const next = stackCards[index + 1]
          gsap.fromTo(
            inner,
            { scale: 1, filter: 'brightness(1)' },
            {
              scale: 0.94,
              filter: 'brightness(0.92)',
              ease: 'none',
              transformOrigin: 'center top',
              scrollTrigger: {
                trigger: next,
                start: 'top bottom',
                end: 'top 12%',
                scrub: true,
              },
            },
          )
        }

        const pieces = inner.querySelectorAll('[data-stack-reveal]')
        if (pieces.length) {
          gsap.fromTo(
            pieces,
            { opacity: 0, y: 28 },
            {
              opacity: 1,
              y: 0,
              duration: 0.85,
              stagger: 0.08,
              ease: EASE.expo,
              scrollTrigger: {
                trigger: card,
                start: 'top 78%',
                once: true,
              },
            },
          )
        }
      })
    })

    mm.add('(max-width: 767px)', () => {
      stackCards.forEach((card) => {
        const inner = card.querySelector('[data-stack-inner]')
        if (!inner) return
        gsap.fromTo(
          inner,
          { opacity: 0, y: 36 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            ease: EASE.expo,
            scrollTrigger: { trigger: card, start: 'top 88%', once: true },
          },
        )
      })
    })
  }, [cards.length])

  return (
    <section
      ref={rootRef}
      id="programs"
      className="relative scroll-mt-24 bg-background py-24 sm:py-32"
      aria-labelledby="programs-heading"
    >
      <LandingAtmosphere tone="wash" density="rich" />
      <Container width="marketing" className="relative z-10">
        <div className="max-w-3xl">
          <Eyebrow>{t.programs.eyebrow}</Eyebrow>
          <h2
            id="programs-heading"
            data-programs-headline
            className="mt-6 font-heading text-3xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl"
          >
            {t.programs.heading}
          </h2>
          <p
            data-programs-lead
            className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {t.programs.lead}
          </p>
        </div>

        <div className="relative mt-14 space-y-6 pb-[2vh] sm:mt-20 sm:space-y-8">
          {cards.map((program, index) => (
            <StackCard
              key={program.slug}
              program={program}
              index={index}
              total={cards.length}
            />
          ))}
        </div>
      </Container>
    </section>
  )
}

/**
 * Soft three-tone stack — cream, lavender, mint — so every card reads as
 * its own colour while staying on design-system surface tokens (doc 09 §2).
 */
const CARD_THEMES = [
  {
    surface: 'bg-status-pending-bg border-status-pending/20',
    label: 'text-status-pending',
    title: 'text-foreground',
    emphasis: 'text-status-pending',
    body: 'text-muted-foreground',
    focus: 'text-foreground',
    item: 'text-foreground',
    dot: 'bg-status-pending',
    imageRing: 'ring-8 ring-background/70',
    button: 'bg-status-pending text-primary-foreground hover:bg-status-pending/90',
    buttonVariant: 'default' as const,
    iconWrap: 'bg-primary-foreground/20',
    inverse: false,
  },
  {
    surface: 'bg-primary-wash border-primary/25',
    label: 'text-primary-strong',
    title: 'text-primary-strong',
    emphasis: 'text-primary',
    body: 'text-primary-strong/70',
    focus: 'text-primary-strong',
    item: 'text-primary-strong',
    dot: 'bg-primary',
    imageRing: 'ring-8 ring-background/70',
    button: '',
    buttonVariant: 'default' as const,
    iconWrap: 'bg-primary-foreground/20',
    inverse: false,
  },
  {
    surface: 'bg-status-paid-bg border-status-paid/20',
    label: 'text-status-paid',
    title: 'text-foreground',
    emphasis: 'text-status-paid',
    body: 'text-muted-foreground',
    focus: 'text-foreground',
    item: 'text-foreground',
    dot: 'bg-status-paid',
    imageRing: 'ring-8 ring-background/70',
    button: 'bg-status-paid text-primary-foreground hover:bg-status-paid/90',
    buttonVariant: 'default' as const,
    iconWrap: 'bg-primary-foreground/20',
    inverse: false,
  },
] as const

function StackCard({
  program,
  index,
  total,
}: {
  program: MarketingProgramCopy
  index: number
  total: number
}) {
  const t = useMarketingCopy()
  const ui = t.programs
  const { status, openBatchByCourseId } = useAcademyData()
  const course = useCourseByKeywords(program.keywords)
  const batch = course ? (openBatchByCourseId.get(course.id) ?? null) : null
  const canEnroll = Boolean(batch && batch.seatsRemaining > 0)
  const isPath = program.slug === 'path'
  const theme = CARD_THEMES[index % CARD_THEMES.length] ?? CARD_THEMES[0]

  // Sticky offset steps slightly so edges of lower cards peek out.
  const top = `calc(5.5rem + ${index * 0.75}rem)`

  return (
    <article
      data-stack-card
      className="md:sticky"
      style={{ top, zIndex: 10 + index }}
    >
      <div
        data-stack-inner
        className={cn(
          'will-change-transform rounded-3xl border p-6 sm:p-8 lg:p-10',
          theme.surface,
        )}
      >
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left — identity + story */}
          <div className="lg:col-span-4">
            <p
              data-stack-reveal
              className={cn(
                'text-xs font-medium tracking-wide uppercase',
                theme.label,
              )}
            >
              {program.index}
              {program.category ? ` / ${program.category}` : ''}
            </p>

            <h3
              data-stack-reveal
              className={cn(
                'mt-5 font-heading text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl lg:text-4xl',
                theme.title,
              )}
            >
              {course?.title ?? program.name}
              {program.emphasis ? (
                <>
                  {' '}
                  <em
                    className={cn(
                      'font-heading font-medium italic',
                      theme.emphasis,
                    )}
                  >
                    {program.emphasis}
                  </em>
                </>
              ) : null}
            </h3>

            <p
              data-stack-reveal
              className={cn(
                'mt-5 max-w-sm text-sm leading-relaxed text-pretty sm:text-base',
                theme.body,
              )}
            >
              {course?.description?.trim() || program.description}
            </p>

            <div data-stack-reveal className="mt-6">
              <BatchState
                status={status}
                batch={batch}
                hasCourse={course !== null}
                isPath={isPath}
                labels={ui}
              />
            </div>
          </div>

          {/* Center — photograph */}
          <div data-stack-reveal className="lg:col-span-4">
            <MarketingImage
              image={program.image}
              className={cn(
                'aspect-4/5 w-full sm:aspect-square',
                theme.imageRing,
              )}
              sizes="(min-width: 1024px) 28vw, 100vw"
            />
          </div>

          {/* Right — features + CTA */}
          <div className="lg:col-span-4">
            {program.focus ? (
              <p
                data-stack-reveal
                className={cn(
                  'font-heading text-lg font-semibold tracking-tight sm:text-xl',
                  theme.focus,
                )}
              >
                {program.focus}
              </p>
            ) : null}

            <ul data-stack-reveal className="mt-5 space-y-3">
              {program.includes.map((item) => (
                <li
                  key={item}
                  className={cn(
                    'flex items-start gap-2.5 text-sm leading-relaxed',
                    theme.item,
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mt-1.5 size-1.5 shrink-0 rounded-full',
                      theme.dot,
                    )}
                  />
                  {item}
                </li>
              ))}
            </ul>

            <div data-stack-reveal className="mt-8">
              <ProgramTerms
                status={status}
                course={course}
                batch={batch}
                isPath={isPath}
                labels={ui}
                inverse={theme.inverse}
              />
            </div>

            <div data-stack-reveal className="mt-8">
              <Button
                className={cn(
                  'min-h-11 gap-2 rounded-full px-5',
                  theme.button || undefined,
                )}
                variant={
                  theme.button
                    ? 'default'
                    : canEnroll
                      ? 'default'
                      : 'outline'
                }
                render={
                  <Link
                    href={
                      canEnroll
                        ? '/register'
                        : isPath
                          ? '#enrollment'
                          : '/contact'
                    }
                  />
                }
              >
                {canEnroll
                  ? ui.register
                  : isPath
                    ? ui.viewProgram
                    : ui.askNext}
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full',
                    theme.iconWrap,
                  )}
                >
                  <ArrowUpRightIcon className="size-3.5" />
                </span>
              </Button>
            </div>

            {/* Keep last card from feeling cut off under the sticky stack. */}
            {index === total - 1 ? <span className="sr-only" /> : null}
          </div>
        </div>
      </div>
    </article>
  )
}

function BatchState({
  status,
  batch,
  hasCourse,
  isPath,
  labels,
}: {
  status: 'loading' | 'ready' | 'error'
  batch: BatchWithSeats | null
  hasCourse: boolean
  isPath: boolean
  labels: MarketingCopy['programs']
}) {
  if (isPath) return null

  if (status === 'loading') {
    return <Skeleton className="h-6 w-28 rounded-md" />
  }

  if (status === 'error' || !hasCourse) {
    return (
      <span className="rounded-md bg-status-neutral-bg px-2.5 py-1 text-xs font-medium text-status-neutral">
        {labels.batchOnRequest}
      </span>
    )
  }

  if (!batch) {
    return (
      <span className="rounded-md bg-status-neutral-bg px-2.5 py-1 text-xs font-medium text-status-neutral">
        {labels.enrollmentClosed}
      </span>
    )
  }

  if (batch.seatsRemaining <= 0) {
    return (
      <span className="rounded-md bg-status-pending-bg px-2.5 py-1 text-xs font-medium text-status-pending">
        {labels.fullNext}
      </span>
    )
  }

  return (
    <span className="rounded-md bg-status-paid-bg px-2.5 py-1 text-xs font-medium text-status-paid">
      {labels.enrollmentOpen}
    </span>
  )
}

function ProgramTerms({
  status,
  course,
  batch,
  isPath,
  labels,
  inverse = false,
}: {
  status: 'loading' | 'ready' | 'error'
  course: Course | null
  batch: BatchWithSeats | null
  isPath: boolean
  labels: MarketingCopy['programs']
  inverse?: boolean
}) {
  if (isPath) return null

  if (status === 'loading') {
    return <Skeleton className="h-16 w-full rounded-xl" />
  }

  const muted = inverse
    ? 'text-primary-foreground/60'
    : 'text-muted-foreground'
  const strong = inverse ? 'text-primary-foreground' : 'text-foreground'
  const rule = inverse ? 'border-primary-foreground/20' : 'border-primary/15'

  if (!course) {
    return (
      <p className={cn('text-sm leading-relaxed', muted)}>
        {labels.feesPending}
      </p>
    )
  }

  return (
    <dl className={cn('flex flex-wrap gap-x-8 gap-y-4 border-t pt-5', rule)}>
      <div>
        <dt
          className={cn(
            'text-xs font-medium tracking-wide uppercase',
            muted,
          )}
        >
          {labels.entryFee}
        </dt>
        <dd
          className={cn(
            'mt-1 font-heading text-lg font-semibold tabular-nums',
            strong,
          )}
        >
          {formatMoney(course.enrollmentFee)}
        </dd>
      </div>
      {course.billingType === 'monthly' ? (
        <div>
          <dt
            className={cn(
              'text-xs font-medium tracking-wide uppercase',
              muted,
            )}
          >
            {labels.monthly}
          </dt>
          <dd
            className={cn(
              'mt-1 font-heading text-lg font-semibold tabular-nums',
              strong,
            )}
          >
            {formatMoney(course.monthlyFee)}
          </dd>
        </div>
      ) : null}
      {batch ? (
        <div>
          <dt
            className={cn(
              'text-xs font-medium tracking-wide uppercase',
              muted,
            )}
          >
            {labels.seatsLeft}
          </dt>
          <dd
            className={cn(
              'mt-1 font-heading text-lg font-semibold tabular-nums',
              strong,
            )}
          >
            {batch.seatsRemaining}
          </dd>
        </div>
      ) : null}
      {batch ? (
        <p className={cn('basis-full text-xs', muted)}>
          {labels.batchMeta(
            batch.name,
            formatDate(batch.courseStartDate),
            formatDate(batch.enrollmentClosesAt),
          )}
        </p>
      ) : null}
    </dl>
  )
}

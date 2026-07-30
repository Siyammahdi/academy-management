'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowUpRightIcon } from 'lucide-react'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { useAcademyData } from '@/components/marketing/academy-data'
import { CourseCover } from '@/components/student/course-cover'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { BatchWithSeats, Course } from '@/lib/api-client'
import { formatDate, formatMoney } from '@/lib/format'
import { blurRise, wordRise } from '@/lib/gsap/motion'
import { EASE, ScrollTrigger } from '@/lib/gsap'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { useMarketingCopy } from '@/components/i18n/locale-provider'
import type { MarketingCopy } from '@/lib/marketing/types'
import { resolveEnrollCta } from '@/lib/marketing/enroll-cta'
import { usePublicAuth } from '@/lib/use-public-auth'
import { cn } from '@/lib/utils'

/**
 * Sticky stack of featured courses — editorial marketing layout driven by
 * admin `featured` + marketing fields, not traditional course cards.
 */
export function LandingPrograms() {
  const t = useMarketingCopy()
  const rootRef = useRef<HTMLElement>(null)
  const { status, featuredCourses } = useAcademyData()
  const cards = featuredCourses

  useEffect(() => {
    if (status !== 'ready') return
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [status, cards.length])

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
          {status === 'loading' ? (
            <>
              <Skeleton className="h-80 w-full rounded-3xl" />
              <Skeleton className="h-80 w-full rounded-3xl" />
            </>
          ) : null}

          {status === 'ready' && cards.length === 0 ? (
            <p className="rounded-3xl bg-muted/50 px-6 py-10 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Featured programs will appear here when admissions marks a course
              as featured. In the meantime, ask about the next open batch.
            </p>
          ) : null}

          {cards.map((course, index) => (
            <StackCard
              key={course.id}
              course={course}
              index={index}
              total={cards.length}
            />
          ))}
        </div>
      </Container>
    </section>
  )
}

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
    iconWrap: 'bg-primary-foreground/20',
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
    iconWrap: 'bg-primary-foreground/20',
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
    iconWrap: 'bg-primary-foreground/20',
  },
] as const

function StackCard({
  course,
  index,
  total,
}: {
  course: Course
  index: number
  total: number
}) {
  const t = useMarketingCopy()
  const ui = t.programs
  const auth = usePublicAuth()
  const { status, openBatchByCourseId } = useAcademyData()
  const batch = openBatchByCourseId.get(course.id) ?? null
  const canEnroll = Boolean(batch && batch.seatsRemaining > 0)
  const enrollCta = resolveEnrollCta(auth, canEnroll, {
    register: ui.register,
    enrollNow: ui.enrollNow,
    goToApp: t.nav.goToApp,
    askNext: ui.askNext,
  })
  const theme = CARD_THEMES[index % CARD_THEMES.length] ?? CARD_THEMES[0]
  const highlights = course.highlights?.length
    ? course.highlights
    : []
  const indexLabel = String(index + 1).padStart(2, '0')
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
          <div className="lg:col-span-4">
            <p
              data-stack-reveal
              className={cn(
                'text-xs font-medium tracking-wide uppercase',
                theme.label,
              )}
            >
              {indexLabel}
              {course.category ? ` / ${course.category}` : ''}
            </p>

            <h3
              data-stack-reveal
              className={cn(
                'mt-5 font-heading text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl lg:text-4xl',
                theme.title,
              )}
            >
              {course.title}
              {course.emphasis ? (
                <>
                  {' '}
                  <em
                    className={cn(
                      'font-heading font-medium italic',
                      theme.emphasis,
                    )}
                  >
                    {course.emphasis}
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
              {course.tagline?.trim() ||
                course.description?.trim() ||
                'Details on the course page.'}
            </p>

            <div data-stack-reveal className="mt-6">
              <BatchState status={status} batch={batch} labels={ui} />
            </div>
          </div>

          <div data-stack-reveal className="lg:col-span-4">
            <CourseCover
              courseId={course.id}
              title={course.title}
              hasThumbnail={course.hasThumbnail}
              updatedAt={course.updatedAt}
              className={cn(
                'aspect-4/5 w-full rounded-2xl sm:aspect-square',
                theme.imageRing,
              )}
            />
          </div>

          <div className="lg:col-span-4">
            {course.focus ? (
              <p
                data-stack-reveal
                className={cn(
                  'font-heading text-lg font-semibold tracking-tight sm:text-xl',
                  theme.focus,
                )}
              >
                {course.focus}
              </p>
            ) : null}

            {highlights.length > 0 ? (
              <ul data-stack-reveal className="mt-5 space-y-3">
                {highlights.map((item) => (
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
            ) : null}

            <div data-stack-reveal className="mt-8">
              <ProgramTerms
                status={status}
                course={course}
                batch={batch}
                labels={ui}
              />
            </div>

            <div data-stack-reveal className="mt-8 flex flex-wrap gap-3">
              <Button
                className={cn(
                  'min-h-11 gap-2 rounded-full px-5',
                  theme.button || undefined,
                )}
                variant={theme.button ? 'default' : 'default'}
                render={<Link href={`/courses/${course.slug}`} />}
              >
                {ui.viewProgram}
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full',
                    theme.iconWrap,
                  )}
                >
                  <ArrowUpRightIcon className="size-3.5" />
                </span>
              </Button>
              <Button
                variant="outline"
                className="min-h-11 rounded-full px-5"
                render={<Link href={enrollCta.href} />}
              >
                {enrollCta.label}
              </Button>
            </div>

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
  labels,
}: {
  status: 'loading' | 'ready' | 'error'
  batch: BatchWithSeats | null
  labels: MarketingCopy['programs']
}) {
  if (status === 'loading') {
    return <Skeleton className="h-6 w-28 rounded-md" />
  }

  if (status === 'error') {
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
  labels,
}: {
  status: 'loading' | 'ready' | 'error'
  course: Course
  batch: BatchWithSeats | null
  labels: MarketingCopy['programs']
}) {
  if (status === 'loading') {
    return <Skeleton className="h-16 w-full rounded-xl" />
  }

  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-4 border-t border-primary/15 pt-5">
      <div>
        <dt className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
          {labels.entryFee}
        </dt>
        <dd className="mt-1 font-heading text-lg font-semibold tabular-nums text-foreground">
          {formatMoney(course.enrollmentFee)}
        </dd>
      </div>
      {course.billingType === 'monthly' ? (
        <div>
          <dt className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
            {labels.monthly}
          </dt>
          <dd className="mt-1 font-heading text-lg font-semibold tabular-nums text-foreground">
            {formatMoney(course.monthlyFee)}
          </dd>
        </div>
      ) : null}
      {batch ? (
        <div>
          <dt className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
            {labels.seatsLeft}
          </dt>
          <dd className="mt-1 font-heading text-lg font-semibold tabular-nums text-foreground">
            {batch.seatsRemaining}
          </dd>
        </div>
      ) : null}
      {batch ? (
        <p className="basis-full text-xs text-muted-foreground">
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

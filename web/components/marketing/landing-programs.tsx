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

/** Site header clearance for sticky cards. */
const STACK_TOP_BASE = '5.5rem'

/**
 * Sticky program stack — equal-height cards, consistent peek, no scale
 * transforms (those left uneven gaps between layers).
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
    if (headline) wordRise(gsap, headline, { stagger: 0.04, rotate: 2 })

    const lead = root.querySelector('[data-programs-lead]')
    if (lead) blurRise(gsap, lead, { y: 18, blur: 6 })

    const stackCards = root.querySelectorAll<HTMLElement>('[data-stack-card]')
    const mm = gsap.matchMedia()

    mm.add('(min-width: 768px)', () => {
      stackCards.forEach((card, index) => {
        const inner = card.querySelector<HTMLElement>('[data-stack-inner]')
        if (!inner) return

        // Dim prior cards as the next one covers them — brightness only,
        // never scale (scale shrinks the face and opens uneven gaps).
        if (index < stackCards.length - 1) {
          const next = stackCards[index + 1]
          gsap.fromTo(
            inner,
            { filter: 'brightness(1)' },
            {
              filter: 'brightness(0.88)',
              ease: 'none',
              scrollTrigger: {
                trigger: next,
                start: 'top bottom',
                end: 'top 20%',
                scrub: true,
              },
            },
          )
        }

        gsap.fromTo(
          inner,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            ease: EASE.expo,
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              once: true,
            },
          },
        )
      })
    })

    mm.add('(max-width: 767px)', () => {
      stackCards.forEach((card) => {
        const inner = card.querySelector('[data-stack-inner]')
        if (!inner) return
        gsap.fromTo(
          inner,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            ease: EASE.expo,
            scrollTrigger: { trigger: card, start: 'top 90%', once: true },
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
        <div className="max-w-2xl">
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
            className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {t.programs.lead}
          </p>
        </div>

        <div className="relative mt-14 flex flex-col gap-5 pb-8 sm:mt-20 md:gap-6">
          {status === 'loading' ? (
            <>
              <Skeleton className="aspect-video w-full rounded-xl md:h-96 md:aspect-auto" />
              <Skeleton className="aspect-video w-full rounded-xl md:h-96 md:aspect-auto" />
            </>
          ) : null}

          {status === 'ready' && cards.length === 0 ? (
            <p className="rounded-xl bg-primary-wash px-6 py-12 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Featured programs will appear here when admissions marks a course
              as featured. In the meantime, ask about the next open batch.
            </p>
          ) : null}

          {cards.map((course, index) => (
            <StackCard key={course.id} course={course} index={index} />
          ))}
        </div>
      </Container>
    </section>
  )
}

function StackCard({
  course,
  index,
}: {
  course: Course
  index: number
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

  const indexLabel = String(index + 1).padStart(2, '0')
  // Each layer peeks the same amount; last card still sticks so the stack holds.
  const top = `calc(${STACK_TOP_BASE} + ${index * 0.75}rem)`
  const tagline = course.tagline?.trim() || course.description?.trim() || null
  const monthly =
    course.billingType === 'monthly' ? formatMoney(course.monthlyFee) : null

  return (
    <article
      data-stack-card
      className="relative w-full md:sticky"
      style={{
        top,
        zIndex: 10 + index,
      }}
    >
      <div
        data-stack-inner
        className={cn(
          'group/stack w-full overflow-hidden rounded-xl bg-card ring-1 ring-foreground/5',
          'transition-[filter,ring-color] duration-500 hover:ring-primary/25',
          // Equal height on desktop — uneven heights were letting taller
          // prior cards poke out beside shorter ones.
          'md:h-96',
        )}
      >
        <div className="grid h-full md:grid-cols-12 md:items-stretch">
          <div className="relative overflow-hidden md:col-span-5 md:h-full">
            <div className="aspect-4/3 w-full md:absolute md:inset-0 md:aspect-auto md:h-full">
              <CourseCover
                courseId={course.id}
                title={course.title}
                hasThumbnail={course.hasThumbnail}
                updatedAt={course.updatedAt}
                className="h-full min-h-full w-full transition-transform duration-700 ease-out group-hover/stack:scale-105"
              />
            </div>
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-3 left-4 font-heading text-5xl font-semibold tracking-tight text-primary-foreground/25 md:bottom-5 md:left-6 md:text-6xl"
            >
              {indexLabel}
            </span>
          </div>

          <div className="flex flex-col justify-between gap-6 p-6 sm:p-8 md:col-span-7 md:h-full md:gap-5 lg:p-9">
            <div className="min-h-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <p className="text-xs font-medium tracking-wide text-primary-strong uppercase">
                  {course.category?.trim() || ui.eyebrow}
                </p>
                <span
                  aria-hidden
                  className="hidden size-1 rounded-full bg-border sm:inline-block"
                />
                <EnrollmentCue status={status} batch={batch} labels={ui} />
              </div>

              <h3 className="mt-4 line-clamp-2 font-heading text-2xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-3xl">
                {course.title}
              </h3>
              {course.emphasis ? (
                <span className="mt-1 line-clamp-1 block font-heading text-lg font-medium tracking-tight text-primary-strong/75 italic sm:text-xl">
                  {course.emphasis}
                </span>
              ) : null}

              {tagline ? (
                <p className="mt-3 line-clamp-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {tagline}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 space-y-4">
              <FeeStrip
                status={status}
                course={course}
                monthly={monthly}
                labels={ui}
              />

              {batch ? (
                <p className="line-clamp-1 text-xs leading-relaxed text-muted-foreground">
                  {ui.batchMeta(
                    batch.name,
                    formatDate(batch.courseStartDate),
                    formatDate(batch.enrollmentClosesAt),
                  )}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  className="min-h-11 gap-2"
                  render={<Link href={`/courses/${course.slug}`} />}
                >
                  {ui.viewProgram}
                  <ArrowUpRightIcon className="size-4 opacity-80" />
                </Button>
                <Button
                  variant="ghost"
                  className="min-h-11 text-primary-strong"
                  render={<Link href={enrollCta.href} />}
                >
                  {enrollCta.label}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function EnrollmentCue({
  status,
  batch,
  labels,
}: {
  status: 'loading' | 'ready' | 'error'
  batch: BatchWithSeats | null
  labels: MarketingCopy['programs']
}) {
  if (status === 'loading') {
    return <Skeleton className="h-4 w-24 rounded" />
  }

  if (status === 'error' || !batch) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        {status === 'error' ? labels.batchOnRequest : labels.enrollmentClosed}
      </span>
    )
  }

  if (batch.seatsRemaining <= 0) {
    return (
      <span className="text-xs font-medium text-status-pending">
        {labels.fullNext}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-status-paid">
      <span aria-hidden className="size-1.5 rounded-full bg-status-paid" />
      {labels.enrollmentOpen}
      {batch.seatsRemaining > 0 ? (
        <span className="font-normal text-muted-foreground">
          · {batch.seatsRemaining} {labels.seatsLeft.toLowerCase()}
        </span>
      ) : null}
    </span>
  )
}

function FeeStrip({
  status,
  course,
  monthly,
  labels,
}: {
  status: 'loading' | 'ready' | 'error'
  course: Course
  monthly: string | null
  labels: MarketingCopy['programs']
}) {
  if (status === 'loading') {
    return <Skeleton className="h-14 w-full max-w-sm rounded-xl" />
  }

  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3">
      <div>
        <dt className="text-xs text-muted-foreground">{labels.entryFee}</dt>
        <dd className="mt-0.5 font-heading text-xl font-semibold tabular-nums tracking-tight text-foreground">
          {formatMoney(course.enrollmentFee)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">
          {monthly ? labels.monthly : labels.billing}
        </dt>
        <dd className="mt-0.5 font-heading text-xl font-semibold tabular-nums tracking-tight text-foreground">
          {monthly ?? labels.onePayment}
        </dd>
      </div>
    </dl>
  )
}

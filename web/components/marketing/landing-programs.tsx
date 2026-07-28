'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ArrowRightIcon, CheckIcon } from 'lucide-react'

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
import { fadeRise, imageReveal, wordRise } from '@/lib/gsap/motion'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { useMarketingCopy } from '@/components/i18n/locale-provider'
import type { MarketingCopy, MarketingProgramCopy } from '@/lib/marketing/types'
import { cn } from '@/lib/utils'

/**
 * The academy runs a deliberately small catalogue, so the two flagship
 * programs get full editorial spreads instead of a card grid. Fees and seat
 * counts are read live from the public course/batch endpoints; when a
 * program has no course record yet the panel degrades to copy and a
 * contact route rather than inventing a price.
 */
export function LandingPrograms() {
  const t = useMarketingCopy()
  const rootRef = useRef<HTMLElement>(null)

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const headline = root.querySelector<HTMLElement>('[data-programs-headline]')
    if (headline) wordRise(gsap, headline, { stagger: 0.035 })

    const lead = root.querySelector('[data-programs-lead]')
    if (lead) fadeRise(gsap, lead, { y: 18 })

    root.querySelectorAll('[data-program-panel]').forEach((panel) => {
      const frame = panel.querySelector('[data-image-frame]')
      if (frame) imageReveal(gsap, frame, { trigger: panel })

      const copy = panel.querySelectorAll('[data-program-copy]')
      if (copy.length) {
        fadeRise(gsap, copy, { stagger: 0.09, trigger: panel, y: 26 })
      }
    })
  }, [])

  return (
    <section
      ref={rootRef}
      id="programs"
      className="relative scroll-mt-24 overflow-hidden bg-primary-wash py-24 sm:py-32"
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

        <div className="mt-16 flex flex-col gap-20 sm:mt-20 sm:gap-28">
          {t.flagship.map((program, index) => (
            <ProgramPanel
              key={program.slug}
              program={program}
              reversed={index % 2 === 1}
            />
          ))}
        </div>

        {/* <OtherCourses /> */}
      </Container>
    </section>
  )
}

function ProgramPanel({
  program,
  reversed,
}: {
  program: MarketingProgramCopy
  reversed: boolean
}) {
  const t = useMarketingCopy()
  const ui = t.programs
  const { status, openBatchByCourseId } = useAcademyData()
  const course = useCourseByKeywords(program.keywords)
  const batch = course ? (openBatchByCourseId.get(course.id) ?? null) : null

  return (
    <article
      data-program-panel
      className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14"
    >
      <div
        className={cn(
          'lg:row-start-1',
          reversed ? 'lg:col-span-7 lg:col-start-6' : 'lg:col-span-7',
        )}
      >
        <MarketingImage
          image={program.image}
          className="aspect-5/4 w-full"
          sizes="(min-width: 1024px) 55vw, 100vw"
        />
      </div>

      <div
        className={cn(
          'lg:row-start-1',
          reversed
            ? 'lg:col-span-5 lg:col-start-1'
            : 'lg:col-span-5 lg:col-start-8',
        )}
      >
        <div data-program-copy className="flex items-center gap-4">
          <span className="font-heading text-sm font-semibold tabular-nums text-primary-strong">
            {program.index}
          </span>
          <span className="h-px flex-1 bg-primary/30" aria-hidden />
          <BatchState
            status={status}
            batch={batch}
            hasCourse={course !== null}
            labels={ui}
          />
        </div>

        <h3
          data-program-copy
          className="mt-6 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          {course?.title ?? program.name}
        </h3>
        <p data-program-copy className="mt-2 text-base text-primary-strong">
          {program.tagline}
        </p>
        <p
          data-program-copy
          className="mt-5 text-base leading-relaxed text-pretty text-muted-foreground"
        >
          {course?.description?.trim() || program.description}
        </p>

        <ul data-program-copy className="mt-7 grid gap-3 sm:grid-cols-2">
          {program.includes.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <CheckIcon
                className="mt-0.5 size-4 shrink-0 text-primary-strong"
                aria-hidden
              />
              <span className="text-sm leading-relaxed text-foreground">
                {item}
              </span>
            </li>
          ))}
        </ul>

        <div data-program-copy className="mt-8">
          <ProgramTerms
            status={status}
            course={course}
            batch={batch}
            labels={ui}
          />
        </div>

        <div data-program-copy className="mt-8">
          <Button
            className="min-h-11"
            variant={batch && batch.seatsRemaining > 0 ? 'default' : 'outline'}
            render={
              <Link
                href={
                  batch && batch.seatsRemaining > 0 ? '/register' : '/contact'
                }
              />
            }
          >
            {batch && batch.seatsRemaining > 0 ? ui.register : ui.askNext}
            <ArrowRightIcon />
          </Button>
        </div>
      </div>
    </article>
  )
}

function BatchState({
  status,
  batch,
  hasCourse,
  labels,
}: {
  status: 'loading' | 'ready' | 'error'
  batch: BatchWithSeats | null
  hasCourse: boolean
  labels: MarketingCopy['programs']
}) {
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

/** Fees and dates, always taken from the API — never hard-coded in copy. */
function ProgramTerms({
  status,
  course,
  batch,
  labels,
}: {
  status: 'loading' | 'ready' | 'error'
  course: Course | null
  batch: BatchWithSeats | null
  labels: MarketingCopy['programs']
}) {
  if (status === 'loading') {
    return <Skeleton className="h-20 w-full rounded-xl" />
  }

  if (!course) {
    return (
      <p className="border-t border-primary/20 pt-6 text-sm leading-relaxed text-muted-foreground">
        {labels.feesPending}
      </p>
    )
  }

  return (
    <div className="border-t border-primary/20 pt-6">
      <dl className="flex flex-wrap gap-x-10 gap-y-5">
        <div>
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {labels.entryFee}
          </dt>
          <dd className="mt-1.5 font-heading text-xl font-semibold tabular-nums text-foreground">
            {formatMoney(course.enrollmentFee)}
          </dd>
        </div>
        {course.billingType === 'monthly' ? (
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {labels.monthly}
            </dt>
            <dd className="mt-1.5 font-heading text-xl font-semibold tabular-nums text-foreground">
              {formatMoney(course.monthlyFee)}
            </dd>
          </div>
        ) : (
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {labels.billing}
            </dt>
            <dd className="mt-1.5 font-heading text-xl font-semibold tracking-tight text-foreground">
              {labels.onePayment}
            </dd>
          </div>
        )}
        {batch ? (
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {labels.seatsLeft}
            </dt>
            <dd className="mt-1.5 font-heading text-xl font-semibold tabular-nums text-foreground">
              {batch.seatsRemaining}
            </dd>
          </div>
        ) : null}
      </dl>

      {batch ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {labels.batchMeta(
            batch.name,
            formatDate(batch.courseStartDate),
            formatDate(batch.enrollmentClosesAt),
          )}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Anything else the academy is running gets an honest mention without
 * competing with the flagship programs for attention.
 */
function OtherCourses() {
  const t = useMarketingCopy()
  const { status, courses, openBatchByCourseId } = useAcademyData()

  if (status !== 'ready') return null

  const flagshipKeywords = t.flagship.flatMap((p) => p.keywords)
  const others = courses.filter((course) => {
    const title = course.title.toLowerCase()
    return !flagshipKeywords.some((keyword) => title.includes(keyword))
  })

  if (others.length === 0) return null

  return (
    <div className="mt-20 border-t border-primary/20 pt-10 sm:mt-28">
      <h3 className="text-xs font-medium tracking-wide text-primary-strong uppercase">
        {t.programs.alsoRunning}
      </h3>
      <ul className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
        {others.map((course) => {
          const batch = openBatchByCourseId.get(course.id)
          return (
            <li
              key={course.id}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-primary/15 pb-4"
            >
              <span className="font-heading text-base font-medium text-foreground">
                {course.title}
              </span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {course.billingType === 'monthly'
                  ? `${formatMoney(course.monthlyFee)} ${t.programs.perMonth}`
                  : formatMoney(course.enrollmentFee)}
                {batch && batch.seatsRemaining > 0 ? t.programs.openSuffix : ''}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

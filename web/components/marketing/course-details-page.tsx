'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRightIcon, BookOpenIcon } from 'lucide-react'

import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { LandingCta } from '@/components/marketing/landing-cta'
import { CourseCover } from '@/components/student/course-cover'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getBatch,
  getCourse,
  isEnrollmentWindowOpen,
  type BatchWithSeats,
  type CourseDetail,
} from '@/lib/api-client'
import { formatDate, formatMoney } from '@/lib/format'
import { resolveEnrollCta } from '@/lib/marketing/enroll-cta'
import { usePublicAuth } from '@/lib/use-public-auth'
import { cn } from '@/lib/utils'

export function CourseDetailsPage({ slug }: { slug: string }) {
  const auth = usePublicAuth()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [batches, setBatches] = useState<BatchWithSeats[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      setStatus('loading')
      try {
        const loaded = await getCourse(slug)
        if (cancelled) return

        const open = loaded.batches.filter(
          (b) => b.status !== 'completed' && isEnrollmentWindowOpen(b),
        )
        const enriched = await Promise.all(
          open.map((batch) => getBatch(batch.id).catch(() => null)),
        )
        if (cancelled) return

        setCourse(loaded)
        setBatches(
          enriched.filter((b): b is BatchWithSeats => b !== null),
        )
        setStatus('ready')
      } catch {
        if (!cancelled) {
          setCourse(null)
          setBatches([])
          setStatus('error')
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (status === 'loading') {
    return (
      <div className="bg-background py-16 sm:py-24">
        <Container width="marketing" className="space-y-8">
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-16 w-3/4 max-w-2xl rounded-md" />
          <Skeleton className="aspect-video w-full rounded-3xl" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-40 rounded-2xl lg:col-span-2" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </Container>
      </div>
    )
  }

  if (status === 'error' || !course) {
    return (
      <div className="bg-background py-24 sm:py-32">
        <Container width="marketing" className="max-w-xl text-center">
          <p className="font-heading text-2xl font-semibold text-foreground">
            Course not found
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This program may be archived or the link is out of date.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button className="min-h-11" render={<Link href="/#programs" />}>
              See programs
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              render={<Link href="/contact" />}
            >
              Contact admissions
            </Button>
          </div>
        </Container>
      </div>
    )
  }

  const openBatch =
    batches.find((b) => b.seatsRemaining > 0) ?? batches[0] ?? null
  const canEnroll = Boolean(openBatch && openBatch.seatsRemaining > 0)
  const enrollCta = resolveEnrollCta(auth, canEnroll, {
    register: 'Register to enroll',
    enrollNow: 'Enroll now',
    goToApp: 'Go to dashboard',
    askNext: 'Ask about the next batch',
  })
  const highlights = course.highlights ?? []
  const outcomes = course.outcomes ?? []
  const parts = course.parts ?? []

  return (
    <div className="bg-background">
      <section className="relative overflow-hidden border-b border-primary/10 pb-16 pt-12 sm:pb-20 sm:pt-16">
        <LandingAtmosphere tone="wash" density="sparse" />
        <Container width="marketing" className="relative z-10">
          <p className="text-xs font-medium tracking-wide text-primary-strong uppercase">
            {course.category ?? 'Program'}
          </p>
          <h1 className="mt-4 max-w-3xl font-heading text-4xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
            {course.title}
            {course.emphasis ? (
              <>
                {' '}
                <em className="font-heading font-medium text-primary italic">
                  {course.emphasis}
                </em>
              </>
            ) : null}
          </h1>
          {course.tagline || course.focus ? (
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {course.tagline ?? course.focus}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              className="min-h-11 gap-2"
              render={<Link href={enrollCta.href} />}
            >
              {enrollCta.label}
              <ArrowUpRightIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              render={<Link href="/#programs" />}
            >
              All programs
            </Button>
          </div>
        </Container>
      </section>

      <section className="relative py-12 sm:py-16">
        <Container width="marketing">
          <CourseCover
            courseId={course.id}
            title={course.title}
            hasThumbnail={course.hasThumbnail}
            updatedAt={course.updatedAt}
            className="aspect-video w-full rounded-3xl"
          />

          <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-14">
            <div className="space-y-10 lg:col-span-7">
              {course.description ? (
                <div>
                  <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                    About this program
                  </h2>
                  <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
                    {course.description}
                  </p>
                </div>
              ) : null}

              {course.audience ? (
                <div>
                  <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                    Who it is for
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                    {course.audience}
                  </p>
                </div>
              ) : null}

              {highlights.length > 0 ? (
                <div>
                  <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                    What you get
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-base leading-relaxed text-foreground"
                      >
                        <span
                          aria-hidden
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {outcomes.length > 0 ? (
                <div>
                  <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                    Outcomes
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {outcomes.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-base leading-relaxed text-foreground"
                      >
                        <span
                          aria-hidden
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-status-paid"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {parts.length > 0 ? (
                <div>
                  <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                    Curriculum parts
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Descriptive stages — they do not change billing on their
                    own.
                  </p>
                  <ol className="mt-5 space-y-3">
                    {parts.map((part, index) => (
                      <li
                        key={`${part.name}-${index}`}
                        className="flex items-center justify-between gap-4 rounded-2xl bg-muted/50 px-4 py-3"
                      >
                        <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                          <span className="flex size-8 items-center justify-center rounded-lg bg-primary-wash text-primary-strong">
                            <BookOpenIcon className="size-4" />
                          </span>
                          {part.name}
                        </span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {part.durationMonths} mo
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>

            <aside className="space-y-6 lg:col-span-5">
              <div className="rounded-3xl bg-primary-wash px-6 py-6 sm:px-7 sm:py-7">
                <h2 className="font-heading text-lg font-semibold text-primary-strong">
                  Fees
                </h2>
                <p className="mt-2 text-sm text-primary-strong/70">
                  Current price list. An open batch freezes these amounts for
                  everyone in it.
                </p>
                <dl className="mt-6 space-y-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-sm text-primary-strong/80">
                      Enrollment
                    </dt>
                    <dd className="font-heading text-xl font-semibold tabular-nums text-primary-strong">
                      {formatMoney(course.enrollmentFee)}
                    </dd>
                  </div>
                  {course.billingType === 'monthly' ? (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-sm text-primary-strong/80">
                        Monthly
                      </dt>
                      <dd className="font-heading text-xl font-semibold tabular-nums text-primary-strong">
                        {formatMoney(course.monthlyFee)}
                      </dd>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-sm text-primary-strong/80">
                        Billing
                      </dt>
                      <dd className="text-sm font-medium text-primary-strong">
                        One-time
                      </dd>
                    </div>
                  )}
                </dl>
                <Button
                  className="mt-7 min-h-11 w-full"
                  render={<Link href={enrollCta.href} />}
                >
                  {canEnroll ? enrollCta.label : 'Ask admissions'}
                </Button>
              </div>

              <div className="rounded-3xl border border-primary/15 px-6 py-6 sm:px-7 sm:py-7">
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Open batches
                </h2>
                {batches.length === 0 ? (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    No enrollment window is open right now. Contact admissions
                    for the next cohort.
                  </p>
                ) : (
                  <ul className="mt-5 space-y-4">
                    {batches.map((batch) => (
                      <li
                        key={batch.id}
                        className={cn(
                          'rounded-2xl bg-muted/50 px-4 py-4',
                          batch.seatsRemaining <= 0 && 'opacity-70',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium text-foreground">
                            {batch.name}
                          </p>
                          <span
                            className={cn(
                              'rounded-md px-2 py-0.5 text-xs font-medium',
                              batch.seatsRemaining > 0
                                ? 'bg-status-paid-bg text-status-paid'
                                : 'bg-status-pending-bg text-status-pending',
                            )}
                          >
                            {batch.seatsRemaining > 0
                              ? `${batch.seatsRemaining} seats`
                              : 'Full'}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          Starts {formatDate(batch.courseStartDate)} · closes{' '}
                          {formatDate(batch.enrollmentClosesAt)}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Entry {formatMoney(batch.enrollmentFee)}
                          {course.billingType === 'monthly'
                            ? ` · monthly ${formatMoney(batch.monthlyFee)}`
                            : null}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <LandingCta />
    </div>
  )
}

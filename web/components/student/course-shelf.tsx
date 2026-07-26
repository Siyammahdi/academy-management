'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { AmountCell } from '@/components/money/amount-cell'
import { StatusBadge } from '@/components/money/status-badge'
import { CourseCover } from '@/components/student/course-cover'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { periodAttention } from '@/lib/period-status'
import type {
  BillingPeriodWithContext,
  EnrollmentWithBatch,
} from '@/lib/api-client'

interface CourseShelfProps {
  enrollments: EnrollmentWithBatch[]
  periodFor: (enrollmentId: string) => BillingPeriodWithContext | undefined
  onPay: (period: BillingPeriodWithContext) => void
}

async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url)
    toast.success('Class link copied')
    return true
  } catch {
    toast.error('Could not copy the link.')
    return false
  }
}

export function CourseShelf({
  enrollments,
  periodFor,
  onPay,
}: CourseShelfProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl bg-primary-wash px-6 py-14 text-center">
        <CourseCover
          courseId="empty"
          title="An Nahda"
          compact
          className="size-20 rounded-xl"
        />
        <div className="space-y-1">
          <p className="font-heading text-base font-semibold text-foreground">
            No courses yet
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Browse open batches to enroll. Your course cover, dues, and class
            link will appear on this shelf.
          </p>
        </div>
        <Button size="lg" render={<Link href="/dashboard/batches" />}>
          Browse open batches
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {enrollments.map((enrollment) => {
        const period = periodFor(enrollment.id)
        const attention = period
          ? periodAttention(period.status, period.dueDate)
          : null
        const canPay =
          period &&
          (period.status === 'unpaid' || period.status === 'partially_paid')
        const classLink =
          enrollment.status === 'active' ? enrollment.batch.classLink : null

        return (
          <article
            key={enrollment.id}
            className="flex flex-col overflow-hidden rounded-xl bg-card"
          >
            <CourseCover
              courseId={enrollment.batch.course.id}
              title={enrollment.batch.course.title}
              className="aspect-video w-full"
            />

            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    {enrollment.batch.course.title}
                  </h3>
                  <StatusBadge
                    tone={
                      enrollment.status === 'active'
                        ? 'paid'
                        : enrollment.status === 'pending'
                          ? 'pending'
                          : 'neutral'
                    }
                    label={
                      enrollment.status === 'active'
                        ? 'Active'
                        : enrollment.status === 'pending'
                          ? 'Pending'
                          : 'Withdrawn'
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {enrollment.batch.name}
                  {enrollment.inPenalty ? ' · Penalty on file' : ''}
                </p>
              </div>

              {period && attention ? (
                <div className="rounded-lg bg-muted/70 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(period.periodMonth, 'month')} · Due{' '}
                        <span className="tabular-nums">
                          {formatDate(period.dueDate)}
                        </span>
                      </p>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <AmountCell
                          amount={period.amountOwed}
                          className="text-sm font-semibold"
                        />
                        {period.status !== 'paid' ? (
                          <AmountCell
                            amount={period.outstanding}
                            outstanding
                            labeled
                            className="text-xs"
                          />
                        ) : null}
                      </div>
                    </div>
                    <StatusBadge
                      tone={attention.tone}
                      label={attention.label}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No billing period yet.
                </p>
              )}

              <div className="mt-auto flex flex-col gap-2 pt-1">
                {classLink ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="min-h-10 flex-1"
                      render={
                        <a
                          href={classLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      Join
                      <ExternalLinkIcon />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="min-h-10 flex-1"
                      onClick={() => {
                        void copyLink(classLink).then((ok) => {
                          if (!ok) return
                          setCopiedId(enrollment.id)
                          window.setTimeout(() => setCopiedId(null), 2000)
                        })
                      }}
                    >
                      {copiedId === enrollment.id ? (
                        <CheckIcon />
                      ) : (
                        <CopyIcon />
                      )}
                      {copiedId === enrollment.id ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                ) : null}

                <div className="flex gap-2">
                  {canPay ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10 flex-1"
                      onClick={() => onPay(period)}
                    >
                      Pay this due
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-h-10 flex-1 text-muted-foreground"
                      render={<Link href="/dashboard/dues" />}
                    >
                      View dues
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CompassIcon, RefreshCwIcon, WalletIcon } from 'lucide-react'

import { CourseCover } from '@/components/student/course-cover'
import { StatusBadge } from '@/components/money/status-badge'
import { StudentPageHeader } from '@/components/student/student-page-header'
import { useStudentEnrollment } from '@/components/student/student-enrollment-provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'

/**
 * Pending enrollments (ENR-07) — applications awaiting payment verification.
 * Visible in nav only when the student has pending seats and no active ones,
 * or reachable from the onboarding dashboard.
 */
export default function StudentApplicationsPage() {
  const { applications, loading, error, reload, hasPending } =
    useStudentEnrollment()

  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!loading) setReady(true)
  }, [loading])

  if (!ready || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <StudentPageHeader
        eyebrow="Applications"
        title="My Applications"
        description="Batches you applied to that are still waiting for payment verification. Classroom tools unlock once an enrollment becomes active."
        actions={
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => {
              void reload()
            }}
          >
            <RefreshCwIcon />
            Refresh
          </Button>
        }
      />

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      {!hasPending ? (
        <div className="rounded-xl bg-muted/50 px-4 py-6 sm:px-6">
          <p className="font-heading text-lg font-semibold text-foreground">
            No open applications
          </p>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            When you enroll in a batch and payment is still pending verification,
            it will show up here.
          </p>
          <Button
            className="mt-4 min-h-11"
            render={<Link href="/dashboard/enroll" />}
          >
            <CompassIcon />
            Browse courses
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {applications.map((enrollment) => (
            <li
              key={enrollment.id}
              className="overflow-hidden rounded-xl bg-muted/40"
            >
              <CourseCover
                courseId={enrollment.batch.course.id}
                title={enrollment.batch.course.title}
                className="aspect-video w-full"
              />
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-heading font-semibold text-foreground">
                      {enrollment.batch.course.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {enrollment.batch.name}
                    </p>
                  </div>
                  <StatusBadge tone="pending" label="Pending" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied {formatDate(enrollment.enrolledAt, 'short')}
                </p>
                <Button
                  variant="secondary"
                  className="min-h-11 w-full"
                  render={<Link href="/dashboard/dues" />}
                >
                  <WalletIcon />
                  Complete payment
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

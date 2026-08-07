'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { EnrollFirstState } from '@/components/student/enroll-first-state'
import { useStudentEnrollment } from '@/components/student/student-enrollment-provider'
import { Skeleton } from '@/components/ui/skeleton'
import {
  requiresActiveEnrollment,
  requiresBillableEnrollment,
} from '@/lib/enrollment-access'

/**
 * Blocks enrollment-only routes until GET /me/enrollments confirms access.
 * Nav hiding alone is not enough — deep links must be gated too.
 */
export function EnrollmentRouteGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { loading, hasActive, hasBillable, hasPending } =
    useStudentEnrollment()

  const needsActive = requiresActiveEnrollment(pathname)
  const needsBillable = requiresBillableEnrollment(pathname)

  if (!needsActive && !needsBillable) {
    return children
  }

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (needsActive && !hasActive) {
    return (
      <EnrollFirstState
        showApplications={hasPending}
        description={
          hasPending
            ? 'Your application is waiting for payment to clear. Online payments unlock class as soon as the bank confirms — no teacher review. Manual payments wait for verification.'
            : 'Class links, homework, and your courses unlock after you have an active enrollment in a batch.'
        }
      />
    )
  }

  if (needsBillable && !hasBillable) {
    return (
      <EnrollFirstState
        title="No payment status yet"
        description="Payment status appears after you enroll in a batch. Browse open courses to get started."
      />
    )
  }

  return children
}

import type { EnrollmentWithBatch } from '@/lib/api-client'

/** ENR — active seat in a batch (class features unlock here). */
export function isActiveEnrollment(
  enrollment: Pick<EnrollmentWithBatch, 'status'>,
): boolean {
  return enrollment.status === 'active'
}

/** Applied / awaiting payment verification (ENR-07). */
export function isPendingEnrollment(
  enrollment: Pick<EnrollmentWithBatch, 'status'>,
): boolean {
  return enrollment.status === 'pending'
}

export function hasActiveEnrollment(
  enrollments: readonly Pick<EnrollmentWithBatch, 'status'>[],
): boolean {
  return enrollments.some(isActiveEnrollment)
}

export function pendingApplications(
  enrollments: readonly EnrollmentWithBatch[],
): EnrollmentWithBatch[] {
  return enrollments.filter(isPendingEnrollment)
}

export function hasPendingApplication(
  enrollments: readonly Pick<EnrollmentWithBatch, 'status'>[],
): boolean {
  return enrollments.some(isPendingEnrollment)
}

/** Any non-withdrawn enrollment — dues may still apply. */
export function hasBillableEnrollment(
  enrollments: readonly Pick<EnrollmentWithBatch, 'status'>[],
): boolean {
  return enrollments.some(
    (e) => e.status === 'active' || e.status === 'pending',
  )
}

/**
 * Paths that require at least one active enrollment.
 * Direct visits by non-enrolled students are gated in the portal shell.
 */
export const ACTIVE_ENROLLMENT_PATH_PREFIXES = [
  '/dashboard/courses',
  '/dashboard/classroom',
  '/dashboard/homework',
  '/dashboard/recordings',
] as const

/** Paths that need a pending or active enrollment (payment surfaces). */
export const BILLABLE_ENROLLMENT_PATH_PREFIXES = [
  '/dashboard/dues',
  '/dashboard/payments',
] as const

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function requiresActiveEnrollment(pathname: string): boolean {
  return ACTIVE_ENROLLMENT_PATH_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix),
  )
}

export function requiresBillableEnrollment(pathname: string): boolean {
  return BILLABLE_ENROLLMENT_PATH_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix),
  )
}

'use client'

import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'
import { EnrollmentRouteGate } from '@/components/student/enrollment-route-gate'
import {
  StudentEnrollmentProvider,
  useStudentEnrollment,
} from '@/components/student/student-enrollment-provider'
import { studentMobileTabs, studentNavSections } from '@/lib/student-nav'

/**
 * Student chrome that adapts to enrollment lifecycle.
 * Uses GET /me/enrollments only — no new APIs.
 */
export function StudentPortalShell({ children }: { children: ReactNode }) {
  return (
    <StudentEnrollmentProvider>
      <StudentPortalChrome>{children}</StudentPortalChrome>
    </StudentEnrollmentProvider>
  )
}

function StudentPortalChrome({ children }: { children: ReactNode }) {
  const { loading, hasActive, hasPending } = useStudentEnrollment()

  // While loading, keep the simplified nav so enrollment-only items never flash.
  const hasActiveEnrollment = !loading && hasActive
  const hasPendingApplications = !loading && hasPending

  const sections = studentNavSections({
    hasActiveEnrollment,
    hasPendingApplications,
  })
  const tabs = studentMobileTabs({
    hasActiveEnrollment,
    hasPendingApplications,
  }).map(({ href, label, shortLabel }) => ({
    href,
    label: shortLabel ?? label,
  }))

  return (
    <AppShell
      title="An Nahda"
      sections={sections}
      items={tabs}
      mobileNav="tabs"
    >
      <EnrollmentRouteGate>{children}</EnrollmentRouteGate>
    </AppShell>
  )
}

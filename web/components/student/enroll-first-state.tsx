'use client'

import Link from 'next/link'
import { CompassIcon, GraduationCapIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface EnrollFirstStateProps {
  /** Short reason — e.g. why this page is locked. */
  title?: string
  description?: string
  /** When true, also link to applications (pending enrollments). */
  showApplications?: boolean
}

/**
 * Informative gate for enrollment-only surfaces.
 * Used when a non-enrolled student hits a deep link.
 */
export function EnrollFirstState({
  title = 'You need to enroll first',
  description = 'Class links, homework, and your courses unlock after you have an active enrollment in a batch.',
  showApplications = false,
}: EnrollFirstStateProps) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-5 py-6 sm:py-10">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary-wash text-primary-strong">
        <GraduationCapIcon className="size-6" />
      </div>
      <div className="max-w-lg space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button
          className="min-h-11 w-full sm:w-auto"
          render={<Link href="/dashboard/enroll" />}
        >
          <CompassIcon />
          Browse courses
        </Button>
        {showApplications ? (
          <Button
            variant="secondary"
            className="min-h-11 w-full sm:w-auto"
            render={<Link href="/dashboard/applications" />}
          >
            My applications
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="min-h-11 w-full sm:w-auto"
            render={<Link href="/dashboard" />}
          >
            Back to dashboard
          </Button>
        )}
      </div>
    </div>
  )
}

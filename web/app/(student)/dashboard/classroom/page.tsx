'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCwIcon } from 'lucide-react'

import { ClassroomSpotlight } from '@/components/student/classroom-spotlight'
import { ClassJoinControls } from '@/components/student/class-join-controls'
import { CourseCover } from '@/components/student/course-cover'
import { StudentPageHeader } from '@/components/student/student-page-header'
import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { activeClassrooms } from '@/lib/student-dashboard'
import {
  listMyEnrollments,
  type EnrollmentWithBatch,
} from '@/lib/api-client'

/**
 * Student — Class Links
 * Join URLs from active enrollments; join unlocks 5 minutes before schedule.
 */
export default function StudentClassroomPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentWithBatch[] | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  async function reload(): Promise<void> {
    try {
      const result = await listMyEnrollments(1, 100)
      setEnrollments(result.data)
      setError(null)
    } catch {
      setError('Class links could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    reload().catch(() => {
      if (!cancelled) setError('Class links could not be loaded. Try again.')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const classrooms = enrollments ? activeClassrooms(enrollments) : []
  const activeWithoutLink =
    enrollments?.filter(
      (e) => e.status === 'active' && !e.batch.classLink,
    ) ?? []

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <StudentPageHeader
        eyebrow="Learning"
        title="Class Links"
        description="Join live class for each active enrollment. The join button unlocks five minutes before the scheduled start and locks again at the end time."
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

      {!enrollments && !error ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : null}

      {enrollments ? (
        <>
          <ClassroomSpotlight classrooms={classrooms} />

          {activeWithoutLink.length > 0 ? (
            <aside className="rounded-xl bg-status-pending-bg px-4 py-3 text-sm text-muted-foreground">
              {activeWithoutLink.length} active course
              {activeWithoutLink.length === 1 ? '' : 's'} still waiting for a
              class link from your teacher.
            </aside>
          ) : null}

          {enrollments.length === 0 ? (
            <div className="rounded-xl bg-muted/50 px-6 py-14 text-center">
              <p className="font-heading text-base font-semibold text-foreground">
                No enrollments yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Enroll in an open batch to get a class link here.
              </p>
              <Button
                className="mt-4 min-h-11"
                render={<Link href="/dashboard/enroll" />}
              >
                Browse & enroll
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {enrollments.map((enrollment) => {
                const isActive = enrollment.status === 'active'
                return (
                  <li
                    key={enrollment.id}
                    className="overflow-hidden rounded-xl bg-muted/50"
                  >
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                      <CourseCover
                        courseId={enrollment.batch.course.id}
                        title={enrollment.batch.course.title}
                        hasThumbnail={enrollment.batch.course.hasThumbnail}
                        updatedAt={enrollment.batch.course.updatedAt}
                        compact
                        className="size-16 shrink-0 rounded-xl sm:size-20"
                      />
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-heading text-base font-semibold text-foreground">
                              {enrollment.batch.course.title}
                            </h2>
                            <StatusBadge
                              tone={
                                enrollment.status === 'active'
                                  ? 'paid'
                                  : enrollment.status === 'pending'
                                    ? 'pending'
                                    : 'neutral'
                              }
                              label={enrollment.status}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {enrollment.batch.name}
                          </p>
                        </div>
                        {isActive ? (
                          <ClassJoinControls batch={enrollment.batch} />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Class join unlocks after your enrollment is active.
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      ) : null}
    </div>
  )
}

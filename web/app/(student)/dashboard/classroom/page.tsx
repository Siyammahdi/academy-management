'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { ClassroomSpotlight } from '@/components/student/classroom-spotlight'
import { CourseCover } from '@/components/student/course-cover'
import { StudentPageHeader } from '@/components/student/student-page-header'
import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  activeClassrooms,
} from '@/lib/student-dashboard'
import {
  listMyEnrollments,
  type EnrollmentWithBatch,
} from '@/lib/api-client'

/**
 * Student — Class Links
 * Join URLs from active enrollments (batch.classLink on GET /me/enrollments).
 */
export default function StudentClassroomPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentWithBatch[] | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

  async function copyLink(id: string, url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Class link copied')
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error('Could not copy the link.')
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <StudentPageHeader
        eyebrow="Learning"
        title="Class Links"
        description="Join live class for each active enrollment. Teaching happens off-platform — open the link or copy it for another device."
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
              class link from your manager.
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
                const link =
                  enrollment.status === 'active'
                    ? enrollment.batch.classLink
                    : null
                return (
                  <li
                    key={enrollment.id}
                    className="overflow-hidden rounded-xl bg-muted/50"
                  >
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <CourseCover
                        courseId={enrollment.batch.course.id}
                        title={enrollment.batch.course.title}
                        hasThumbnail={enrollment.batch.course.hasThumbnail}
                        updatedAt={enrollment.batch.course.updatedAt}
                        compact
                        className="size-16 shrink-0 rounded-xl sm:size-20"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
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
                          {enrollment.status === 'active' ? (
                            <StatusBadge
                              tone={link ? 'paid' : 'pending'}
                              label={link ? 'Link ready' : 'No link'}
                            />
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {enrollment.batch.name}
                        </p>
                        {link ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {link}
                          </p>
                        ) : null}
                      </div>
                      {link ? (
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            className="min-h-11"
                            render={
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            }
                          >
                            <ExternalLinkIcon />
                            Join class
                          </Button>
                          <Button
                            variant="secondary"
                            className="min-h-11"
                            onClick={() => {
                              void copyLink(enrollment.id, link)
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

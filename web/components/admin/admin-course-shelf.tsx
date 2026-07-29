import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'

import { AmountCell } from '@/components/money/amount-cell'
import { StatusBadge } from '@/components/money/status-badge'
import { CourseCover } from '@/components/student/course-cover'
import { Button } from '@/components/ui/button'
import type { Course } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface AdminCourseShelfProps {
  courses: Course[]
}

export function AdminCourseShelf({ courses }: AdminCourseShelfProps) {
  if (courses.length === 0) {
    return (
      <div className="rounded-xl bg-primary-wash px-5 py-12 text-center">
        <p className="font-heading text-base font-semibold text-foreground">
          No courses yet
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Create a course with enrollment and monthly fees, then open batches
          under it.
        </p>
        <Button className="mt-4 min-h-11" render={<Link href="/admin/courses" />}>
          Create a course
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        '-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        'md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0',
        'xl:grid-cols-3',
      )}
    >
      {courses.map((course) => (
        <article
          key={course.id}
          className={cn(
            'flex w-72 max-w-full shrink-0 snap-center flex-col overflow-hidden rounded-xl bg-muted/60',
            'md:w-auto md:max-w-none',
          )}
        >
          <CourseCover
            courseId={course.id}
            title={course.title}
            hasThumbnail={course.hasThumbnail}
            updatedAt={course.updatedAt}
            className="aspect-video w-full"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-base font-semibold text-foreground">
                  {course.title}
                </h3>
                <StatusBadge
                  tone={course.status === 'active' ? 'paid' : 'neutral'}
                  label={course.status === 'active' ? 'Active' : 'Archived'}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {course.billingType === 'monthly' ? 'Monthly' : 'One-time'}
              </p>
            </div>

            <div className="space-y-1 text-sm">
              <p className="flex items-baseline justify-between gap-2 text-muted-foreground">
                <span>Enrollment</span>
                <AmountCell amount={course.enrollmentFee} />
              </p>
              <p className="flex items-baseline justify-between gap-2 text-muted-foreground">
                <span>Monthly</span>
                <AmountCell amount={course.monthlyFee} />
              </p>
            </div>

            <Button
              size="sm"
              className="mt-auto min-h-11 w-full"
              render={<Link href="/admin/courses" />}
            >
              Manage
              <ArrowRightIcon />
            </Button>
          </div>
        </article>
      ))}
    </div>
  )
}

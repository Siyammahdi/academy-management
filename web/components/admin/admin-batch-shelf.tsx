import Link from 'next/link'

import { BatchCard } from '@/components/batches/batch-card'
import { Button } from '@/components/ui/button'
import type { Batch, Course } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface AdminBatchShelfProps {
  batches: Batch[]
  courseById: Map<string, Pick<Course, 'title' | 'hasThumbnail' | 'updatedAt'>>
}

export function AdminBatchShelf({
  batches,
  courseById,
}: AdminBatchShelfProps) {
  if (batches.length === 0) {
    return (
      <div className="rounded-xl bg-primary-wash px-5 py-12 text-center">
        <p className="font-heading text-base font-semibold text-foreground">
          No batches yet
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Open a batch under a course to set capacity, windows, and managers.
        </p>
        <Button className="mt-4 min-h-11" render={<Link href="/admin/batches" />}>
          Create a batch
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
      {batches.map((batch) => {
        const course = courseById.get(batch.courseId)
        return (
          <BatchCard
            key={batch.id}
            courseId={batch.courseId}
            name={batch.name}
            status={batch.status}
            capacity={batch.capacity}
            courseStartDate={batch.courseStartDate}
            course={{
              title: course?.title ?? 'Course',
              hasThumbnail: course?.hasThumbnail,
              updatedAt: course?.updatedAt,
            }}
            workspaceHref={`/admin/batches/${batch.id}`}
            secondaryActions={[
              {
                label: 'All batches',
                href: '/admin/batches',
              },
              {
                label: 'Roster',
                href: `/admin/batches/${batch.id}/roster`,
              },
            ]}
            className="w-72 max-w-full shrink-0 snap-center md:w-auto md:max-w-none"
          />
        )
      })}
    </div>
  )
}

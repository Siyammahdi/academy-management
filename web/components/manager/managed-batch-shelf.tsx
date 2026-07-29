import { BatchCard } from '@/components/batches/batch-card'
import type { BatchWithSeats, Course } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface ManagedBatchShelfProps {
  batches: BatchWithSeats[]
  courseById: Map<string, Pick<Course, 'title' | 'hasThumbnail' | 'updatedAt'>>
}

export function ManagedBatchShelf({
  batches,
  courseById,
}: ManagedBatchShelfProps) {
  if (batches.length === 0) {
    return (
      <div className="rounded-xl bg-primary-wash px-5 py-12 text-center">
        <p className="font-heading text-base font-semibold text-foreground">
          No batches assigned
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Ask an admin to assign you to a batch. Once assigned, roster and
          classroom tools appear here.
        </p>
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
            seatsRemaining={batch.seatsRemaining}
            course={{
              title: course?.title ?? 'Course',
              hasThumbnail: course?.hasThumbnail,
              updatedAt: course?.updatedAt,
            }}
            workspaceHref={`/manager/batches/${batch.id}`}
            facts={[batch.classLink ? 'Class link set' : 'No class link']}
            secondaryActions={[
              {
                label: 'Roster',
                href: `/manager/batches/${batch.id}/roster`,
              },
              {
                label: 'Classroom',
                href: `/manager/batches/${batch.id}/classroom`,
              },
            ]}
            className="w-72 max-w-full shrink-0 snap-center md:w-auto md:max-w-none"
          />
        )
      })}
    </div>
  )
}

import Link from 'next/link'
import {
  BookOpenIcon,
  ExternalLinkIcon,
  UsersIcon,
} from 'lucide-react'

import { CourseCover } from '@/components/student/course-cover'
import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import type { BatchStatus, BatchWithSeats } from '@/lib/api-client'
import { cn } from '@/lib/utils'

const STATUS_TONE: Record<BatchStatus, 'neutral' | 'pending' | 'paid'> = {
  upcoming: 'neutral',
  enrolling: 'pending',
  running: 'paid',
  completed: 'neutral',
}

const STATUS_LABEL: Record<BatchStatus, string> = {
  upcoming: 'Upcoming',
  enrolling: 'Enrolling',
  running: 'Running',
  completed: 'Completed',
}

interface ManagedBatchShelfProps {
  batches: BatchWithSeats[]
  courseTitleById: Map<string, string>
}

export function ManagedBatchShelf({
  batches,
  courseTitleById,
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
        // Mobile: edge-to-edge hand-swipe shelf (same pattern as student course shelf)
        '-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        // Tablet+: restore grid
        'md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0',
        'xl:grid-cols-3',
      )}
    >
      {batches.map((batch) => (
        <BatchCard
          key={batch.id}
          batch={batch}
          title={courseTitleById.get(batch.courseId) ?? 'Course'}
        />
      ))}
    </div>
  )
}

function BatchCard({
  batch,
  title,
}: {
  batch: BatchWithSeats
  title: string
}) {
  const hasLink = Boolean(batch.classLink)

  return (
    <article
      className={cn(
        'flex w-72 max-w-full shrink-0 snap-center flex-col overflow-hidden rounded-xl bg-muted/60',
        'md:w-auto md:max-w-none',
      )}
    >
      <div className="relative">
        <CourseCover
          courseId={batch.courseId}
          title={title}
          className="aspect-video w-full"
        />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <StatusBadge
            tone={STATUS_TONE[batch.status]}
            label={STATUS_LABEL[batch.status]}
          />
          {hasLink ? (
            <span className="rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium text-primary-strong">
              Link set
            </span>
          ) : (
            <span className="rounded-md bg-status-pending-bg px-2 py-0.5 text-xs font-medium text-status-pending">
              No link
            </span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="min-w-0 space-y-0.5">
          <p className="font-heading text-base font-semibold text-foreground">
            {batch.name}
          </p>
          <p className="truncate text-sm text-muted-foreground">{title}</p>
        </div>
        <p className="text-xs tabular-nums text-muted-foreground">
          Starts {formatDate(batch.courseStartDate)} · {batch.seatsRemaining}/
          {batch.capacity} seats left
        </p>

        <div className="mt-auto grid grid-cols-2 gap-2">
          <Button
            size="sm"
            className="min-h-11"
            render={<Link href={`/manager/batches/${batch.id}`} />}
          >
            Workspace
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="min-h-11"
            render={<Link href={`/manager/batches/${batch.id}/roster`} />}
          >
            <UsersIcon />
            Roster
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="col-span-2 min-h-11"
            render={<Link href={`/manager/batches/${batch.id}/classroom`} />}
          >
            <BookOpenIcon />
            Classroom
          </Button>
          {hasLink ? (
            <Button
              size="sm"
              variant="ghost"
              className="col-span-2 min-h-11 text-muted-foreground"
              render={
                <a
                  href={batch.classLink!}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              Open class link
              <ExternalLinkIcon />
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

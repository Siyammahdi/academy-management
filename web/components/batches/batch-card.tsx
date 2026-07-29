'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRightIcon, MoreHorizontalIcon } from 'lucide-react'

import { CourseCover } from '@/components/student/course-cover'
import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate } from '@/lib/format'
import type { BatchStatus } from '@/lib/api-client'
import { cn } from '@/lib/utils'

export const BATCH_STATUS_TONE: Record<
  BatchStatus,
  'neutral' | 'pending' | 'paid'
> = {
  upcoming: 'neutral',
  enrolling: 'pending',
  running: 'paid',
  completed: 'neutral',
}

export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  upcoming: 'Upcoming',
  enrolling: 'Enrolling',
  running: 'Running',
  completed: 'Completed',
}

export interface BatchCardCourse {
  title: string
  hasThumbnail?: boolean
  updatedAt?: string
}

export interface BatchCardSecondaryAction {
  label: string
  href?: string
  onClick?: () => void
}

export interface BatchCardMenuAction {
  label: string
  onClick: () => void
}

interface BatchCardProps {
  courseId: string
  name: string
  status: BatchStatus
  capacity: number
  courseStartDate: string
  course: BatchCardCourse
  workspaceHref: string
  seatsRemaining?: number
  /** Quiet facts under the capacity row (managers, link state, etc.). */
  facts?: string[]
  secondaryActions?: BatchCardSecondaryAction[]
  menuActions?: BatchCardMenuAction[]
  className?: string
  children?: ReactNode
}

function CapacityBar({
  capacity,
  seatsRemaining,
}: {
  capacity: number
  seatsRemaining?: number
}) {
  const filled =
    seatsRemaining === undefined
      ? null
      : Math.min(capacity, Math.max(0, capacity - seatsRemaining))
  const pct =
    filled === null || capacity <= 0
      ? 0
      : Math.round((filled / capacity) * 100)
  const isFull = seatsRemaining !== undefined && seatsRemaining <= 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Seats</span>
        <span
          className={cn(
            'tabular-nums font-medium',
            isFull ? 'text-status-overdue' : 'text-foreground',
          )}
        >
          {seatsRemaining === undefined
            ? `Capacity ${capacity}`
            : isFull
              ? 'Full'
              : `${seatsRemaining} of ${capacity} left`}
        </span>
      </div>
      {seatsRemaining !== undefined ? (
        <div
          className="h-1.5 w-full overflow-hidden rounded-md bg-muted"
          aria-hidden
        >
          <div
            className={cn(
              'h-full rounded-md transition-[width]',
              isFull ? 'bg-status-overdue' : 'bg-primary',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  )
}

/**
 * Shared batch surface for admin/manager shelves and list pages.
 * Cover → title → capacity → one primary CTA; secondary work stays quiet.
 */
export function BatchCard({
  courseId,
  name,
  status,
  capacity,
  courseStartDate,
  course,
  workspaceHref,
  seatsRemaining,
  facts,
  secondaryActions,
  menuActions,
  className,
  children,
}: BatchCardProps) {
  const hasMenu = Boolean(menuActions && menuActions.length > 0)

  return (
    <article
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-xl bg-muted/60',
        className,
      )}
    >
      <div className="relative">
        <CourseCover
          courseId={courseId}
          title={course.title}
          hasThumbnail={course.hasThumbnail}
          updatedAt={course.updatedAt}
          className="aspect-video w-full"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/55 to-transparent px-3 pt-10 pb-3">
          <StatusBadge
            tone={BATCH_STATUS_TONE[status]}
            label={BATCH_STATUS_LABEL[status]}
            className="pointer-events-auto bg-background/95"
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
        <div className="min-w-0 space-y-1">
          <h2 className="font-heading text-base font-semibold leading-snug text-foreground">
            {name}
          </h2>
          <p className="truncate text-sm text-muted-foreground">{course.title}</p>
        </div>

        <div className="space-y-3">
          <CapacityBar capacity={capacity} seatsRemaining={seatsRemaining} />
          <p className="text-xs tabular-nums text-muted-foreground">
            Starts {formatDate(courseStartDate)}
          </p>
          {facts && facts.length > 0 ? (
            <p className="text-xs text-muted-foreground">{facts.join(' · ')}</p>
          ) : null}
        </div>

        {children}

        <div className="mt-auto space-y-2">
          <div className="flex gap-2">
            <Button
              className="min-h-11 flex-1"
              render={<Link href={workspaceHref} />}
            >
              Open workspace
              <ArrowRightIcon />
            </Button>
            {hasMenu ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 w-11 shrink-0 px-0"
                      aria-label="More actions"
                    />
                  }
                >
                  <MoreHorizontalIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  {menuActions!.map((action) => (
                    <DropdownMenuItem
                      key={action.label}
                      onClick={action.onClick}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          {secondaryActions && secondaryActions.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {secondaryActions.map((action) =>
                action.href ? (
                  <Button
                    key={action.label}
                    variant="ghost"
                    className="min-h-11 text-muted-foreground"
                    render={<Link href={action.href} />}
                  >
                    {action.label}
                  </Button>
                ) : (
                  <Button
                    key={action.label}
                    type="button"
                    variant="ghost"
                    className="min-h-11 text-muted-foreground"
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                ),
              )}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

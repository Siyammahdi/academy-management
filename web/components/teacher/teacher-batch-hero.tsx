'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  LinkIcon,
  RefreshCwIcon,
  UsersIcon,
} from 'lucide-react'

import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { BatchStatus, BatchWithSeats, Course } from '@/lib/api-client'
import { formatDate } from '@/lib/format'

const STATUS_LABELS: Record<BatchStatus, string> = {
  upcoming: 'Upcoming',
  enrolling: 'Enrolling',
  running: 'Running',
  completed: 'Completed',
}

const STATUS_TONE: Record<BatchStatus, 'neutral' | 'pending' | 'paid'> = {
  upcoming: 'neutral',
  enrolling: 'pending',
  running: 'paid',
  completed: 'neutral',
}

interface TeacherBatchHeroProps {
  batch: BatchWithSeats | null
  course: Course | null
  error?: string | null
  onRefresh?: () => void
  busy?: boolean
  actions?: ReactNode
  /** Optional roster count when already loaded on the page. */
  rosterCount?: number | null
  penaltyCount?: number | null
}

export function TeacherBatchHero({
  batch,
  course,
  error,
  onRefresh,
  busy,
  actions,
  rosterCount,
  penaltyCount,
}: TeacherBatchHeroProps) {
  if (error) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <Link
          href="/teacher/batches"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary-strong underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon className="size-4" />
          My batches
        </Link>
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <Skeleton className="h-5 w-28 rounded-md" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    )
  }

  const seatsTaken = batch.capacity - batch.seatsRemaining
  const onRoster = rosterCount ?? seatsTaken

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/teacher/batches"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-strong underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon className="size-4" />
          My batches
        </Link>
        {onRefresh ? (
          <Button
            variant="outline"
            className="min-h-11"
            disabled={busy}
            onClick={onRefresh}
          >
            <RefreshCwIcon />
            Refresh
          </Button>
        ) : null}
      </div>

      <div className="relative overflow-hidden rounded-xl bg-primary-wash">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/20"
        />
        <div className="relative space-y-5 p-5 sm:p-6">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-medium text-primary-strong">
                {course?.title ?? 'Batch'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {batch.name}
                </h1>
                <StatusBadge
                  tone={STATUS_TONE[batch.status]}
                  label={STATUS_LABELS[batch.status]}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Starts {formatDate(batch.courseStartDate)} · Due days{' '}
                <span className="tabular-nums">
                  {batch.dueDayStart}–{batch.dueDayEnd}
                </span>
              </p>
            </div>
            {actions ? (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {actions}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric
              label="Seats left"
              value={
                <>
                  {batch.seatsRemaining}
                  <span className="text-sm font-medium text-muted-foreground">
                    {' '}
                    / {batch.capacity}
                  </span>
                </>
              }
            />
            <Metric
              label="On roster"
              value={
                <span className="flex items-center gap-1.5">
                  <UsersIcon className="size-4 text-primary-strong" />
                  {onRoster}
                </span>
              }
            />
            <Metric
              label="Class link"
              value={
                <span className="flex items-center gap-1.5">
                  <LinkIcon className="size-4 text-primary-strong" />
                  {batch.classLink ? 'Set' : 'Missing'}
                </span>
              }
            />
            <Metric
              label="In penalty"
              value={
                <span
                  className={
                    (penaltyCount ?? 0) > 0
                      ? 'text-status-overdue'
                      : undefined
                  }
                >
                  {penaltyCount ?? '—'}
                </span>
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="rounded-xl bg-background/80 px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  )
}

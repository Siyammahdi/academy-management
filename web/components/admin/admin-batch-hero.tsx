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

interface AdminBatchHeroProps {
  batch: BatchWithSeats | null
  course: Course | null
  error?: string | null
  onRefresh?: () => void
  busy?: boolean
  actions?: ReactNode
}

export function AdminBatchHero({
  batch,
  course,
  error,
  onRefresh,
  busy,
  actions,
}: AdminBatchHeroProps) {
  if (error) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <Link
          href="/admin/batches"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary-strong underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon className="size-4" />
          All batches
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
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    )
  }

  const seatsTaken = batch.capacity - batch.seatsRemaining

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin/batches"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-strong underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon className="size-4" />
          All batches
        </Link>
        {onRefresh ? (
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
            disabled={busy}
            onClick={onRefresh}
          >
            <RefreshCwIcon />
            Refresh
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl bg-primary p-5 text-primary-foreground sm:p-6">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium text-primary-foreground/75">
              {course?.title ?? 'Batch'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                {batch.name}
              </h1>
              <StatusBadge
                tone={STATUS_TONE[batch.status]}
                label={STATUS_LABELS[batch.status]}
              />
            </div>
            <p className="text-sm text-primary-foreground/80">
              Starts {formatDate(batch.courseStartDate)} · Due days{' '}
              <span className="tabular-nums">
                {batch.dueDayStart}–{batch.dueDayEnd}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-primary-foreground/10 px-3 py-3">
            <p className="text-xs text-primary-foreground/70">Seats left</p>
            <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
              {batch.seatsRemaining}
              <span className="text-sm font-medium text-primary-foreground/70">
                {' '}
                / {batch.capacity}
              </span>
            </p>
          </div>
          <div className="rounded-lg bg-primary-foreground/10 px-3 py-3">
            <p className="text-xs text-primary-foreground/70">On roster</p>
            <p className="mt-1 flex items-center gap-1.5 font-heading text-xl font-semibold tabular-nums">
              <UsersIcon className="size-4 opacity-80" />
              {seatsTaken}
            </p>
          </div>
          <div className="rounded-lg bg-primary-foreground/10 px-3 py-3">
            <p className="text-xs text-primary-foreground/70">Teachers</p>
            <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
              {batch.teachers.length}
            </p>
          </div>
          <div className="rounded-lg bg-primary-foreground/10 px-3 py-3">
            <p className="text-xs text-primary-foreground/70">Class link</p>
            <p className="mt-1 flex items-center gap-1.5 font-heading text-xl font-semibold">
              <LinkIcon className="size-4 opacity-80" />
              {batch.classLink ? 'Set' : 'None'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

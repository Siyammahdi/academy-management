'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { RefreshCwIcon, SearchIcon } from 'lucide-react'

import { ManagerPageHeader } from '@/components/manager/manager-page-header'
import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getManagedBatches, listCourses } from '@/lib/api-client'
import type { BatchStatus, BatchWithSeats } from '@/lib/api-client'
import { formatDate } from '@/lib/format'

const STATUS_TONE: Record<BatchStatus, 'neutral' | 'pending' | 'paid'> = {
  upcoming: 'neutral',
  enrolling: 'pending',
  running: 'paid',
  completed: 'neutral',
}

const STATUS_LABELS: Record<BatchStatus, string> = {
  upcoming: 'Upcoming',
  enrolling: 'Enrolling',
  running: 'Running',
  completed: 'Completed',
}

/**
 * Manager — My Batches
 * Only batches this manager is assigned to (GET /me/managed-batches).
 */
export default function ManagerBatchesPage() {
  const [batches, setBatches] = useState<BatchWithSeats[] | null>(null)
  const [courseTitleById, setCourseTitleById] = useState<Map<string, string>>(
    () => new Map(),
  )
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  async function reload(): Promise<void> {
    try {
      const [batchList, courses] = await Promise.all([
        getManagedBatches(),
        listCourses(1, 100),
      ])
      setBatches(batchList)
      setCourseTitleById(new Map(courses.data.map((c) => [c.id, c.title])))
      setError(null)
    } catch {
      setError('Your batches could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    reload().catch(() => {
      if (!cancelled) setError('Your batches could not be loaded. Try again.')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!batches) return []
    const q = query.trim().toLowerCase()
    return batches.filter((batch) => {
      if (statusFilter !== 'all' && batch.status !== statusFilter) return false
      if (!q) return true
      const course = courseTitleById.get(batch.courseId) ?? ''
      return (
        batch.name.toLowerCase().includes(q) ||
        course.toLowerCase().includes(q)
      )
    })
  }, [batches, courseTitleById, query, statusFilter])

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ManagerPageHeader
        eyebrow="Teaching"
        title="Your Batches"
        description="Batches you are assigned to. Open a workspace for roster and classroom tools. You cannot create or delete batches — that stays with admin."
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="min-h-11 pl-9"
            placeholder="Search batch or course"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search batches"
          />
        </div>
        <FilterDropdown
          className="w-full sm:w-48"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'enrolling', label: 'Enrolling' },
            { value: 'running', label: 'Running' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
      </div>

      {!batches && !error ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {batches && batches.length === 0 ? (
        <div className="rounded-xl bg-muted/50 px-6 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            No assigned batches
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask an admin to assign you to a batch.
          </p>
        </div>
      ) : null}

      {batches && batches.length > 0 && filtered.length === 0 ? (
        <div className="rounded-xl bg-muted/50 px-6 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            No matching batches
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search or status filter.
          </p>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {filtered.map((batch) => (
            <li
              key={batch.id}
              className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-base font-semibold text-foreground">
                    {batch.name}
                  </h2>
                  <StatusBadge
                    tone={STATUS_TONE[batch.status]}
                    label={STATUS_LABELS[batch.status]}
                  />
                  <StatusBadge
                    tone={batch.classLink ? 'paid' : 'pending'}
                    label={batch.classLink ? 'Link set' : 'No link'}
                  />
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {courseTitleById.get(batch.courseId) ?? 'Course'} · Starts{' '}
                  <span className="tabular-nums">
                    {formatDate(batch.courseStartDate)}
                  </span>
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {batch.seatsRemaining} of {batch.capacity} seats left
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="min-h-11"
                  render={
                    <Link href={`/manager/batches/${batch.id}/roster`} />
                  }
                >
                  Roster
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11"
                  render={
                    <Link href={`/manager/batches/${batch.id}/classroom`} />
                  }
                >
                  Classroom
                </Button>
                <Button
                  className="min-h-11"
                  render={<Link href={`/manager/batches/${batch.id}`} />}
                >
                  Open workspace
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

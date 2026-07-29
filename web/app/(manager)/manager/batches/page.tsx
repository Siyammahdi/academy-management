'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCwIcon, SearchIcon } from 'lucide-react'

import { BatchCard } from '@/components/batches/batch-card'
import { ManagerPageHeader } from '@/components/manager/manager-page-header'
import { Button } from '@/components/ui/button'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getManagedBatches, listCourses } from '@/lib/api-client'
import type { BatchStatus, BatchWithSeats, Course } from '@/lib/api-client'

/**
 * Manager — My Batches
 * Only batches this manager is assigned to (GET /me/managed-batches).
 */
export default function ManagerBatchesPage() {
  const [batches, setBatches] = useState<BatchWithSeats[] | null>(null)
  const [courseById, setCourseById] = useState<Map<string, Course>>(
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
      setCourseById(new Map(courses.data.map((c) => [c.id, c])))
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
      const course = courseById.get(batch.courseId)?.title ?? ''
      return (
        batch.name.toLowerCase().includes(q) ||
        course.toLowerCase().includes(q)
      )
    })
  }, [batches, courseById, query, statusFilter])

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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
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
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((batch) => {
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
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

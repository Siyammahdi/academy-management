'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCwIcon, SearchIcon } from 'lucide-react'

import { HomeworkBoard } from '@/components/student/homework-board'
import { StudentPageHeader } from '@/components/student/student-page-header'
import { Button } from '@/components/ui/button'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  listMyHomework,
  type HomeworkWithContext,
} from '@/lib/api-client'
import { isDueToday, isPastDue } from '@/lib/homework-status'

type DueFilter = 'all' | 'today' | 'overdue' | 'upcoming'

/**
 * Student — Homework
 * Cross-enrollment board from GET /me/homework (read-only).
 */
export default function StudentHomeworkPage() {
  const [items, setItems] = useState<HomeworkWithContext[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [dueFilter, setDueFilter] = useState<DueFilter>('all')

  async function reload(): Promise<void> {
    try {
      setItems(await listMyHomework())
      setError(null)
    } catch {
      setError('Homework could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    reload().catch(() => {
      if (!cancelled) setError('Homework could not be loaded. Try again.')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!items) return []
    const q = query.trim().toLowerCase()
    return items.filter((hw) => {
      if (dueFilter === 'today' && !isDueToday(hw.dueDate)) return false
      if (dueFilter === 'overdue' && !isPastDue(hw.dueDate)) return false
      if (
        dueFilter === 'upcoming' &&
        (isPastDue(hw.dueDate) || isDueToday(hw.dueDate))
      ) {
        return false
      }
      if (!q) return true
      return (
        hw.title.toLowerCase().includes(q) ||
        hw.batch.name.toLowerCase().includes(q) ||
        hw.batch.course.title.toLowerCase().includes(q)
      )
    })
  }, [items, query, dueFilter])

  const todayCount = items?.filter((h) => isDueToday(h.dueDate)).length ?? 0
  const overdueCount = items?.filter((h) => isPastDue(h.dueDate)).length ?? 0

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <StudentPageHeader
        eyebrow="Learning"
        title="Your Homework"
        description="Assignments across your enrollments. Due dates end of day Asia/Dhaka. Finish work offline — this board is for tracking."
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
            placeholder="Search title, course, or batch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search homework"
          />
        </div>
        <FilterDropdown
          className="w-full sm:w-48"
          value={dueFilter}
          onChange={(v) => setDueFilter(v as DueFilter)}
          options={[
            { value: 'all', label: 'All due dates' },
            { value: 'today', label: `Due today (${todayCount})` },
            { value: 'overdue', label: `Overdue (${overdueCount})` },
            { value: 'upcoming', label: 'Upcoming' },
          ]}
        />
      </div>

      {!items && !error ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : null}

      {items && filtered.length === 0 && items.length > 0 ? (
        <div className="rounded-xl bg-muted/50 px-6 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            No matching homework
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search or filter.
          </p>
        </div>
      ) : null}

      {items && (filtered.length > 0 || items.length === 0) ? (
        <HomeworkBoard items={filtered} />
      ) : null}
    </div>
  )
}

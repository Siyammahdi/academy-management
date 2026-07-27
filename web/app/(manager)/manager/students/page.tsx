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
import {
  getManagedBatches,
  getRoster,
  listCourses,
  type BatchWithSeats,
  type RosterEntry,
} from '@/lib/api-client'
import { formatDate } from '@/lib/format'

type StudentRow = RosterEntry & {
  batchId: string
  batchName: string
  courseTitle: string
}

/**
 * Manager — Students
 * Read-only aggregation of GET /batches/:id/roster. Enrollment mutate is admin-only.
 * Deep-link: /manager/students?penalty=1 filters to in-penalty students.
 */
export default function ManagerStudentsPage() {
  const [batches, setBatches] = useState<BatchWithSeats[] | null>(null)
  const [rows, setRows] = useState<StudentRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [batchFilter, setBatchFilter] = useState('all')
  const [penaltyFilter, setPenaltyFilter] = useState('all')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('penalty') === '1') {
      setPenaltyFilter('penalty')
    }
  }, [])

  async function reload(): Promise<void> {
    try {
      const [batchList, courses] = await Promise.all([
        getManagedBatches(),
        listCourses(1, 100),
      ])
      const courseTitleById = new Map(courses.data.map((c) => [c.id, c.title]))
      setBatches(batchList)

      const rosters = await Promise.all(
        batchList.map(async (batch) => {
          const entries = await getRoster(batch.id)
          return entries.map(
            (entry): StudentRow => ({
              ...entry,
              batchId: batch.id,
              batchName: batch.name,
              courseTitle: courseTitleById.get(batch.courseId) ?? 'Course',
            }),
          )
        }),
      )

      setRows(
        rosters
          .flat()
          .sort((a, b) => a.fullName.localeCompare(b.fullName)),
      )
      setError(null)
    } catch {
      setError('Students could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    reload().catch(() => {
      if (!cancelled) setError('Students could not be loaded. Try again.')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (batchFilter !== 'all' && row.batchId !== batchFilter) return false
      if (penaltyFilter === 'penalty' && !row.inPenalty) return false
      if (penaltyFilter === 'clear' && row.inPenalty) return false
      if (!q) return true
      return (
        row.fullName.toLowerCase().includes(q) ||
        row.studentId.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q) ||
        row.batchName.toLowerCase().includes(q)
      )
    })
  }, [rows, query, batchFilter, penaltyFilter])

  const penaltyCount = rows?.filter((r) => r.inPenalty).length ?? 0

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ManagerPageHeader
        eyebrow="Students"
        title="Students"
        description="Everyone enrolled in your assigned batches. You can review roster and penalty status — adding or withdrawing students stays with admin."
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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="min-h-11 pl-9"
            placeholder="Search name, student id, phone, or batch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search students"
          />
        </div>
        <FilterDropdown
          className="w-full lg:w-56"
          value={batchFilter}
          onChange={setBatchFilter}
          options={[
            { value: 'all', label: 'All batches' },
            ...(batches ?? []).map((b) => ({
              value: b.id,
              label: b.name,
            })),
          ]}
        />
        <FilterDropdown
          className="w-full lg:w-48"
          value={penaltyFilter}
          onChange={setPenaltyFilter}
          options={[
            { value: 'all', label: 'All students' },
            { value: 'penalty', label: `In penalty (${penaltyCount})` },
            { value: 'clear', label: 'Not in penalty' },
          ]}
        />
      </div>

      {!rows && !error ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {rows && rows.length === 0 ? (
        <div className="rounded-xl bg-muted/50 px-6 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            No students on your batches
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            When students enroll in batches you manage, they appear here.
          </p>
        </div>
      ) : null}

      {rows && rows.length > 0 && filtered.length === 0 ? (
        <div className="rounded-xl bg-muted/50 px-6 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            No matching students
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search or filter.
          </p>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {filtered.map((row) => (
            <li
              key={`${row.enrollmentId}-${row.batchId}`}
              className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-base font-semibold text-foreground">
                    {row.fullName}
                  </h2>
                  <StatusBadge
                    tone={
                      row.enrollmentStatus === 'active' ? 'paid' : 'neutral'
                    }
                    label={row.enrollmentStatus}
                  />
                  {row.inPenalty ? (
                    <StatusBadge tone="overdue" label="In penalty" />
                  ) : null}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {row.courseTitle} · {row.batchName}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {row.studentId} · {row.phone} · Enrolled{' '}
                  {formatDate(row.enrolledAt)}
                </p>
              </div>
              <Button
                variant="outline"
                className="min-h-11 shrink-0"
                render={<Link href={`/manager/batches/${row.batchId}/roster`} />}
              >
                Open roster
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

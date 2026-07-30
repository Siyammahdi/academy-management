'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { SearchIcon } from 'lucide-react'

import { ManagerBatchHero } from '@/components/manager/manager-batch-hero'
import { StatusBadge } from '@/components/money/status-badge'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getBatch,
  getCourse,
  getRoster,
  type BatchWithSeats,
  type Course,
  type RosterEntry,
} from '@/lib/api-client'
import { formatDate } from '@/lib/format'

const ENROLLMENT_TONE: Record<
  string,
  { tone: 'paid' | 'pending' | 'neutral' | 'overdue'; label: string }
> = {
  active: { tone: 'paid', label: 'Active' },
  pending: { tone: 'pending', label: 'Pending' },
  withdrawn: { tone: 'neutral', label: 'Withdrawn' },
}

/**
 * Manager batch workspace — Roster
 * Read-only student list for an assigned batch (no late joiner / withdraw).
 */
export default function ManagerBatchRosterPage() {
  const params = useParams<{ id: string }>()
  const batchId = params.id

  const [batch, setBatch] = useState<BatchWithSeats | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [roster, setRoster] = useState<RosterEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [penaltyFilter, setPenaltyFilter] = useState('all')

  async function load(): Promise<void> {
    setBusy(true)
    try {
      const [loadedBatch, loadedRoster] = await Promise.all([
        getBatch(batchId),
        getRoster(batchId),
      ])
      const loadedCourse = await getCourse(loadedBatch.courseId)
      setBatch(loadedBatch)
      setCourse(loadedCourse)
      setRoster(loadedRoster)
      setError(null)
    } catch {
      setError(
        'This batch could not be loaded. You may not be assigned to it.',
      )
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    load().catch(() => {
      if (!cancelled) {
        setError(
          'This batch could not be loaded. You may not be assigned to it.',
        )
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId])

  const counts = useMemo(() => {
    const rows = roster ?? []
    return {
      total: rows.length,
      active: rows.filter((r) => r.enrollmentStatus === 'active').length,
      pending: rows.filter((r) => r.enrollmentStatus === 'pending').length,
      withdrawn: rows.filter((r) => r.enrollmentStatus === 'withdrawn').length,
      penalty: rows.filter((r) => r.inPenalty).length,
    }
  }, [roster])

  const filtered = useMemo(() => {
    if (!roster) return []
    const q = query.trim().toLowerCase()
    return roster.filter((entry) => {
      if (statusFilter !== 'all' && entry.enrollmentStatus !== statusFilter) {
        return false
      }
      if (penaltyFilter === 'penalty' && !entry.inPenalty) return false
      if (penaltyFilter === 'clear' && entry.inPenalty) return false
      if (!q) return true
      return (
        entry.fullName.toLowerCase().includes(q) ||
        entry.studentId.toLowerCase().includes(q) ||
        entry.phone.toLowerCase().includes(q)
      )
    })
  }, [roster, query, statusFilter, penaltyFilter])

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ManagerBatchHero
        batch={batch}
        course={course}
        error={error}
        busy={busy}
        rosterCount={counts.total}
        penaltyCount={counts.penalty}
        onRefresh={() => {
          void load()
        }}
      />

      {batch ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <CountTile label="Total" value={counts.total} />
            <CountTile label="Active" value={counts.active} />
            <CountTile label="Pending" value={counts.pending} />
            <CountTile
              label="In penalty"
              value={counts.penalty}
              warn={counts.penalty > 0}
            />
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="min-h-11 pl-9"
                placeholder="Search name, student id, or phone"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search roster"
              />
            </div>
            <FilterDropdown
              className="w-full lg:w-44"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'active', label: `Active (${counts.active})` },
                { value: 'pending', label: `Pending (${counts.pending})` },
                {
                  value: 'withdrawn',
                  label: `Withdrawn (${counts.withdrawn})`,
                },
              ]}
            />
            <FilterDropdown
              className="w-full lg:w-44"
              value={penaltyFilter}
              onChange={setPenaltyFilter}
              options={[
                { value: 'all', label: 'All students' },
                {
                  value: 'penalty',
                  label: `In penalty (${counts.penalty})`,
                },
                { value: 'clear', label: 'Not in penalty' },
              ]}
            />
          </div>

          <aside className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            Read-only roster. To add a late joiner or withdraw a student, ask an
            admin.
          </aside>

          {!roster ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : null}

          {roster && roster.length === 0 ? (
            <div className="rounded-xl bg-muted/50 px-6 py-14 text-center">
              <p className="font-heading text-base font-semibold text-foreground">
                No students yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                When students enroll in this batch, they appear here.
              </p>
            </div>
          ) : null}

          {roster && roster.length > 0 && filtered.length === 0 ? (
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
            <>
              {/* Mobile cards */}
              <ul className="flex flex-col gap-2 md:hidden">
                {filtered.map((entry) => {
                  const status = ENROLLMENT_TONE[entry.enrollmentStatus]
                  return (
                    <li
                      key={entry.enrollmentId}
                      className="rounded-xl bg-muted/50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-heading text-base font-semibold text-foreground">
                          {entry.fullName}
                        </p>
                        {status ? (
                          <StatusBadge
                            tone={status.tone}
                            label={status.label}
                          />
                        ) : null}
                        {entry.inPenalty ? (
                          <StatusBadge tone="overdue" label="In penalty" />
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                        {entry.studentId} · {entry.phone}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        Enrolled {formatDate(entry.enrolledAt)}
                      </p>
                    </li>
                  )
                })}
              </ul>

              {/* Desktop table */}
              <ScrollArea className="hidden w-full rounded-xl bg-muted/50 md:block">
                <table className="w-full min-w-[40rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                        Student
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                        Phone
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                        Enrolled
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((entry) => {
                      const status = ENROLLMENT_TONE[entry.enrollmentStatus]
                      return (
                        <tr
                          key={entry.enrollmentId}
                          className="border-b border-border/40 last:border-0"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">
                              {entry.fullName}
                            </p>
                            <p className="text-xs tabular-nums text-muted-foreground">
                              {entry.studentId}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                            {entry.phone}
                          </td>
                          <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                            {formatDate(entry.enrolledAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {status ? (
                                <StatusBadge
                                  tone={status.tone}
                                  label={status.label}
                                />
                              ) : (
                                entry.enrollmentStatus
                              )}
                              {entry.inPenalty ? (
                                <StatusBadge
                                  tone="overdue"
                                  label="In penalty"
                                />
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function CountTile({
  label,
  value,
  warn,
}: {
  label: string
  value: number
  warn?: boolean
}) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          warn
            ? 'mt-1 font-heading text-xl font-semibold tabular-nums text-status-overdue'
            : 'mt-1 font-heading text-xl font-semibold tabular-nums text-foreground'
        }
      >
        {value}
      </p>
    </div>
  )
}

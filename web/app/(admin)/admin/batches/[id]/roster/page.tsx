'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { SearchIcon, UserPlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { AdminBatchHero } from '@/components/admin/admin-batch-hero'
import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import {
  addLateJoiner,
  getBatch,
  getCourse,
  getRoster,
  listStudents,
  withdrawEnrollment,
  reinstateEnrollment,
  type BatchWithSeats,
  type Course,
  type RosterEntry,
  type StudentListItem,
} from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/error-message'
import { formatDate } from '@/lib/format'

const ENROLLMENT_TONE: Record<
  string,
  { tone: 'paid' | 'pending' | 'neutral' | 'overdue'; label: string }
> = {
  active: { tone: 'paid', label: 'Active' },
  pending: { tone: 'pending', label: 'Pending' },
  withdrawn: { tone: 'neutral', label: 'Withdrawn' },
}

export default function AdminBatchRosterPage() {
  const params = useParams<{ id: string }>()
  const batchId = params.id

  const [batch, setBatch] = useState<BatchWithSeats | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [roster, setRoster] = useState<RosterEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'pending' | 'withdrawn'
  >('all')
  const [busy, setBusy] = useState(false)

  const [lateOpen, setLateOpen] = useState(false)
  const [lateQuery, setLateQuery] = useState('')
  const [lateResults, setLateResults] = useState<StudentListItem[] | null>(null)
  const [lateError, setLateError] = useState<string | null>(null)
  const [lateBusy, setLateBusy] = useState(false)
  const [selectedStudent, setSelectedStudent] =
    useState<StudentListItem | null>(null)

  const [withdrawTarget, setWithdrawTarget] = useState<RosterEntry | null>(null)
  const [withdrawBusy, setWithdrawBusy] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const [reinstateBusyId, setReinstateBusyId] = useState<string | null>(null)

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
      setError('This batch roster could not be loaded.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([getBatch(batchId), getRoster(batchId)])
      .then(async ([loadedBatch, loadedRoster]) => {
        if (cancelled) return
        setBatch(loadedBatch)
        setRoster(loadedRoster)
        const loadedCourse = await getCourse(loadedBatch.courseId)
        if (!cancelled) {
          setCourse(loadedCourse)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) setError('This batch roster could not be loaded.')
      })
    return () => {
      cancelled = true
    }
  }, [batchId])

  const filtered = useMemo(() => {
    if (!roster) return []
    const q = query.trim().toLowerCase()
    return roster.filter((entry) => {
      if (statusFilter !== 'all' && entry.enrollmentStatus !== statusFilter) {
        return false
      }
      if (!q) return true
      return (
        entry.fullName.toLowerCase().includes(q) ||
        entry.studentId.toLowerCase().includes(q) ||
        entry.phone.toLowerCase().includes(q)
      )
    })
  }, [roster, query, statusFilter])

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

  async function searchStudents(): Promise<void> {
    setLateBusy(true)
    setLateError(null)
    try {
      const result = await listStudents({
        page: 1,
        limit: 10,
        q: lateQuery.trim() || undefined,
        status: 'active',
      })
      setLateResults(result.data)
    } catch {
      setLateError('Students could not be searched.')
    } finally {
      setLateBusy(false)
    }
  }

  async function handleLateJoin(): Promise<void> {
    if (!selectedStudent) return
    setLateBusy(true)
    setLateError(null)
    try {
      await addLateJoiner(batchId, selectedStudent.id)
      toast.success(`${selectedStudent.fullName} added to the roster`)
      setLateOpen(false)
      setSelectedStudent(null)
      setLateQuery('')
      setLateResults(null)
      await load()
    } catch (err) {
      setLateError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'This student could not be enrolled.')
          : 'This student could not be enrolled.',
      )
    } finally {
      setLateBusy(false)
    }
  }

  async function handleWithdraw(): Promise<void> {
    if (!withdrawTarget) return
    setWithdrawBusy(true)
    setWithdrawError(null)
    try {
      await withdrawEnrollment(withdrawTarget.enrollmentId)
      toast.success(`${withdrawTarget.fullName} withdrawn`)
      setWithdrawTarget(null)
      await load()
    } catch (err) {
      setWithdrawError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'This enrollment could not be withdrawn.')
          : 'This enrollment could not be withdrawn.',
      )
    } finally {
      setWithdrawBusy(false)
    }
  }

  async function handleReinstate(entry: RosterEntry): Promise<void> {
    setReinstateBusyId(entry.enrollmentId)
    try {
      await reinstateEnrollment(entry.enrollmentId)
      toast.success(`${entry.fullName} reinstated`)
      await load()
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'This student could not be reinstated.')
          : 'This student could not be reinstated.',
      )
    } finally {
      setReinstateBusyId(null)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminBatchHero
        batch={batch}
        course={course}
        error={error}
        busy={busy}
        onRefresh={() => {
          void load()
        }}
        actions={
          batch ? (
            <Button
              className="min-h-11 bg-primary-foreground text-primary-strong hover:bg-primary-foreground/90"
              onClick={() => {
                setLateError(null)
                setSelectedStudent(null)
                setLateResults(null)
                setLateQuery('')
                setLateOpen(true)
              }}
            >
              <UserPlusIcon />
              Late joiner
            </Button>
          ) : null
        }
      />

      {batch ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-xs text-muted-foreground">All rows</p>
              <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
                {counts.total}
              </p>
            </div>
            <div className="rounded-xl bg-status-paid-bg p-4">
              <p className="text-xs text-status-paid">Active</p>
              <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-status-paid">
                {counts.active}
              </p>
            </div>
            <div className="rounded-xl bg-status-pending-bg p-4">
              <p className="text-xs text-status-pending">Pending</p>
              <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-status-pending">
                {counts.pending}
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-xs text-muted-foreground">In penalty</p>
              <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-status-overdue">
                {counts.penalty}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, ANA id, or phone"
                className="min-h-11 pl-9"
                aria-label="Search roster"
              />
            </div>
            <ScrollArea className="max-w-full sm:max-w-none">
              <div className="flex w-max gap-1 pb-1">
              {(
                [
                  ['all', 'All'],
                  ['active', 'Active'],
                  ['pending', 'Pending'],
                  ['withdrawn', 'Withdrawn'],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  variant={statusFilter === value ? 'default' : 'secondary'}
                  size="sm"
                  className="min-h-11 shrink-0"
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                </Button>
              ))}
              </div>
            </ScrollArea>
          </div>

          {!roster ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : null}

          {roster && filtered.length === 0 ? (
            <div className="rounded-xl bg-primary-wash px-5 py-12 text-center">
              <p className="font-heading text-base font-semibold text-foreground">
                {roster.length === 0 ? 'No students yet' : 'No matches'}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {roster.length === 0
                  ? 'Add a late joiner, or wait for students to enroll while the window is open.'
                  : 'Try a different search or status filter.'}
              </p>
              {roster.length === 0 ? (
                <Button
                  className="mt-4 min-h-11"
                  onClick={() => setLateOpen(true)}
                >
                  <UserPlusIcon />
                  Late joiner
                </Button>
              ) : null}
            </div>
          ) : null}

          {filtered.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {filtered.map((entry) => {
                const status =
                  ENROLLMENT_TONE[entry.enrollmentStatus] ?? {
                    tone: 'neutral' as const,
                    label: entry.enrollmentStatus,
                  }
                const canWithdraw =
                  entry.enrollmentStatus === 'active' ||
                  entry.enrollmentStatus === 'pending'
                const canReinstate = entry.enrollmentStatus === 'withdrawn'

                return (
                  <li
                    key={entry.enrollmentId}
                    className="rounded-xl bg-muted/60 px-4 py-4 sm:px-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">
                            {entry.fullName}
                          </p>
                          <StatusBadge tone={status.tone} label={status.label} />
                          {entry.inPenalty ? (
                            <StatusBadge tone="overdue" label="Penalty" />
                          ) : null}
                          <span className="rounded-md bg-background/80 px-2 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                            {entry.studentId}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {entry.phone} · Enrolled{' '}
                          {formatDate(entry.enrolledAt)}
                        </p>
                      </div>
                      {canWithdraw ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="min-h-11 shrink-0"
                          onClick={() => {
                            setWithdrawError(null)
                            setWithdrawTarget(entry)
                          }}
                        >
                          Withdraw
                        </Button>
                      ) : null}
                      {canReinstate ? (
                        <Button
                          size="sm"
                          className="min-h-11 shrink-0"
                          disabled={reinstateBusyId === entry.enrollmentId}
                          onClick={() => {
                            void handleReinstate(entry)
                          }}
                        >
                          {reinstateBusyId === entry.enrollmentId
                            ? 'Reinstating…'
                            : 'Reinclude'}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </>
      ) : null}

      <Modal
        isOpen={lateOpen}
        onClose={() => setLateOpen(false)}
        title="Add late joiner"
        footer={
          <>
            <Button
              variant="secondary"
              className="min-h-11"
              onClick={() => setLateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="min-h-11"
              disabled={lateBusy || !selectedStudent}
              onClick={() => {
                void handleLateJoin()
              }}
            >
              {lateBusy ? 'Adding…' : 'Add to batch'}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-muted-foreground">
          Bypasses the enrollment window. Capacity and duplicate checks still
          apply.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={lateQuery}
            onChange={(e) => setLateQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void searchStudents()
              }
            }}
            placeholder="Search ANA id, name, phone, or email"
            className="min-h-11"
            aria-label="Search students to enroll"
          />
          <Button
            className="min-h-11"
            variant="secondary"
            disabled={lateBusy}
            onClick={() => {
              void searchStudents()
            }}
          >
            Search
          </Button>
        </div>

        {lateResults && lateResults.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No students matched that search.
          </p>
        ) : null}

        {lateResults && lateResults.length > 0 ? (
          <ScrollArea className="mt-4 h-64">
            <ul className="flex flex-col gap-2 pr-3">
              {lateResults.map((student) => {
                const selected = selectedStudent?.id === student.id
                return (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full rounded-lg px-3 py-3 text-left transition-colors ${
                        selected
                          ? 'bg-primary-wash text-primary-strong'
                          : 'bg-muted/60 hover:bg-muted'
                      }`}
                    >
                      <p className="font-medium">{student.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.studentId} · {student.phone}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        ) : null}

        {lateError ? (
          <p className="mt-3 text-sm text-status-overdue" role="alert">
            {lateError}
          </p>
        ) : null}
      </Modal>

      <Modal
        isOpen={withdrawTarget !== null}
        onClose={() => setWithdrawTarget(null)}
        title="Withdraw student"
        footer={
          <>
            <Button
              variant="secondary"
              className="min-h-11"
              onClick={() => setWithdrawTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="min-h-11"
              disabled={withdrawBusy}
              onClick={() => {
                void handleWithdraw()
              }}
            >
              {withdrawBusy ? 'Withdrawing…' : 'Withdraw'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Withdraw{' '}
          <span className="font-medium text-foreground">
            {withdrawTarget?.fullName}
          </span>{' '}
          ({withdrawTarget?.studentId}) from this batch? They will free a seat.
          Existing billing history is kept.
        </p>
        {withdrawError ? (
          <p className="mt-3 text-sm text-status-overdue" role="alert">
            {withdrawError}
          </p>
        ) : null}
      </Modal>
    </div>
  )
}

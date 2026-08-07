'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  AlertTriangleIcon,
  ClipboardCheckIcon,
  LinkIcon,
  NotebookPenIcon,
  UsersIcon,
} from 'lucide-react'

import { TeacherBatchHero } from '@/components/teacher/teacher-batch-hero'
import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getBatch,
  getCourse,
  getRoster,
  listBatchHomework,
  type BatchWithSeats,
  type Course,
  type Homework,
  type RosterEntry,
} from '@/lib/api-client'
import { formatDate } from '@/lib/format'
import { isDueToday, isPastDue } from '@/lib/homework-status'

/**
 * Teacher batch workspace — Overview
 * Read-only ops snapshot for an assigned batch. No fee/status/teacher edits.
 */
export default function TeacherBatchOverviewPage() {
  const params = useParams<{ id: string }>()
  const batchId = params.id

  const [batch, setBatch] = useState<BatchWithSeats | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [roster, setRoster] = useState<RosterEntry[] | null>(null)
  const [homework, setHomework] = useState<Homework[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load(): Promise<void> {
    setBusy(true)
    try {
      const [loadedBatch, loadedRoster, loadedHomework] = await Promise.all([
        getBatch(batchId),
        getRoster(batchId),
        listBatchHomework(batchId).catch(() => [] as Homework[]),
      ])
      const loadedCourse = await getCourse(loadedBatch.courseId)
      setBatch(loadedBatch)
      setCourse(loadedCourse)
      setRoster(loadedRoster)
      setHomework(loadedHomework)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on batch change only
  }, [batchId])

  const counts = useMemo(() => {
    const rows = roster ?? []
    return {
      total: rows.length,
      active: rows.filter((r) => r.enrollmentStatus === 'active').length,
      pending: rows.filter((r) => r.enrollmentStatus === 'pending').length,
      penalty: rows.filter((r) => r.inPenalty).length,
    }
  }, [roster])

  const dueToday =
    homework?.filter((hw) => isDueToday(hw.dueDate)).length ?? 0
  const overdue =
    homework?.filter((hw) => isPastDue(hw.dueDate)).length ?? 0
  const recentEnrollments = useMemo(() => {
    if (!roster) return []
    return [...roster]
      .sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt))
      .slice(0, 5)
  }, [roster])

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <TeacherBatchHero
        batch={batch}
        course={course}
        error={error}
        busy={busy}
        rosterCount={counts.total}
        penaltyCount={counts.penalty}
        onRefresh={() => {
          void load()
        }}
        actions={
          batch ? (
            <>
              <Button
                className="min-h-11"
                render={
                  <Link href={`/teacher/batches/${batchId}/classroom`} />
                }
              >
                <LinkIcon />
                Classroom
              </Button>
              <Button
                variant="secondary"
                className="min-h-11"
                render={<Link href={`/teacher/batches/${batchId}/roster`} />}
              >
                <UsersIcon />
                Roster
              </Button>
            </>
          ) : null
        }
      />

      {!batch && !error ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : null}

      {batch ? (
        <>
          {!batch.classLink || counts.penalty > 0 || dueToday > 0 ? (
            <div className="flex flex-col gap-2">
              {!batch.classLink ? (
                <AttentionRow
                  tone="pending"
                  title="Class link missing"
                  body="Students cannot join until you set a join URL."
                  href={`/teacher/batches/${batchId}/classroom`}
                  action="Set link"
                  icon={LinkIcon}
                />
              ) : null}
              {counts.penalty > 0 ? (
                <AttentionRow
                  tone="overdue"
                  title={`${counts.penalty} student${counts.penalty === 1 ? '' : 's'} in penalty`}
                  body="Review the roster. Only an admin can reverse a penalty."
                  href={`/teacher/batches/${batchId}/roster`}
                  action="Open roster"
                  icon={AlertTriangleIcon}
                />
              ) : null}
              {dueToday > 0 ? (
                <AttentionRow
                  tone="pending"
                  title={`${dueToday} homework due today`}
                  body={
                    overdue > 0
                      ? `${overdue} also past due on this batch.`
                      : 'Check descriptions and keep students informed.'
                  }
                  href={`/teacher/batches/${batchId}/classroom`}
                  action="Open classroom"
                  icon={NotebookPenIcon}
                />
              ) : null}
            </div>
          ) : null}

          <section className="min-w-0 space-y-3">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Quick actions
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction
                href={`/teacher/batches/${batchId}/classroom`}
                label="Update class link"
                icon={LinkIcon}
              />
              <QuickAction
                href={`/teacher/batches/${batchId}/classroom`}
                label="Publish homework"
                icon={NotebookPenIcon}
              />
              <QuickAction
                href={`/teacher/batches/${batchId}/roster`}
                label="View students"
                icon={UsersIcon}
              />
              <QuickAction
                href="/teacher/payments"
                label="Verify payments"
                icon={ClipboardCheckIcon}
              />
            </div>
          </section>

          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <section className="rounded-xl bg-muted/50 p-5">
              <h2 className="font-heading text-base font-semibold text-foreground">
                Enrollment window
              </h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <Meta
                  label="Opens"
                  value={formatDate(batch.enrollmentOpensAt)}
                />
                <Meta
                  label="Closes"
                  value={formatDate(batch.enrollmentClosesAt)}
                />
                <Meta
                  label="Course starts"
                  value={formatDate(batch.courseStartDate)}
                />
                <Meta
                  label="Due days"
                  value={`${batch.dueDayStart}–${batch.dueDayEnd}`}
                />
              </dl>
            </section>

            <section className="rounded-xl bg-muted/50 p-5">
              <h2 className="font-heading text-base font-semibold text-foreground">
                Roster snapshot
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Total" value={counts.total} />
                <Stat label="Active" value={counts.active} />
                <Stat label="Pending" value={counts.pending} />
                <Stat
                  label="Penalty"
                  value={counts.penalty}
                  warn={counts.penalty > 0}
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                You can review students here. Adding or withdrawing enrollments
                stays with admin.
              </p>
            </section>
          </div>

          <section className="rounded-xl bg-muted/50 p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-heading text-base font-semibold text-foreground">
                  Recent enrollments
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Newest students on this batch
                </p>
              </div>
              <Button
                variant="ghost"
                className="min-h-11"
                render={<Link href={`/teacher/batches/${batchId}/roster`} />}
              >
                Full roster
              </Button>
            </div>

            {roster && recentEnrollments.length === 0 ? (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                No students enrolled yet.
              </p>
            ) : null}

            {!roster ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : null}

            {recentEnrollments.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-2">
                {recentEnrollments.map((entry) => (
                  <li
                    key={entry.enrollmentId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-background/80 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {entry.fullName}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {entry.studentId} · {formatDate(entry.enrolledAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge
                        tone={
                          entry.enrollmentStatus === 'active'
                            ? 'paid'
                            : entry.enrollmentStatus === 'pending'
                              ? 'pending'
                              : 'neutral'
                        }
                        label={entry.enrollmentStatus}
                      />
                      {entry.inPenalty ? (
                        <StatusBadge tone="overdue" label="Penalty" />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="rounded-xl bg-muted/50 p-5">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Co-teachers
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Other teachers assigned to this batch (read-only).
            </p>
            {batch.teachers.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No teachers listed on this batch yet.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {batch.teachers.map((m) => (
                  <li
                    key={m.userId}
                    className="rounded-xl bg-background/80 px-4 py-3 text-sm text-foreground"
                  >
                    {m.email}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string
  value: number
  warn?: boolean
}) {
  return (
    <div className="rounded-xl bg-background/80 px-3 py-3">
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

function QuickAction({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: typeof LinkIcon
}) {
  return (
    <Button
      variant="secondary"
      className="min-h-11 justify-start"
      render={<Link href={href} />}
    >
      <Icon />
      {label}
    </Button>
  )
}

function AttentionRow({
  tone,
  title,
  body,
  href,
  action,
  icon: Icon,
}: {
  tone: 'pending' | 'overdue'
  title: string
  body: string
  href: string
  action: string
  icon: typeof LinkIcon
}) {
  return (
    <div
      className={
        tone === 'overdue'
          ? 'flex flex-col gap-3 rounded-xl bg-status-overdue-bg p-4 sm:flex-row sm:items-center sm:justify-between'
          : 'flex flex-col gap-3 rounded-xl bg-status-pending-bg p-4 sm:flex-row sm:items-center sm:justify-between'
      }
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={
            tone === 'overdue'
              ? 'flex size-9 shrink-0 items-center justify-center rounded-lg bg-status-overdue/15 text-status-overdue'
              : 'flex size-9 shrink-0 items-center justify-center rounded-lg bg-status-pending/15 text-status-pending'
          }
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-sm font-semibold text-foreground">
            {title}
          </p>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
      </div>
      <Button className="min-h-11 shrink-0" render={<Link href={href} />}>
        {action}
      </Button>
    </div>
  )
}

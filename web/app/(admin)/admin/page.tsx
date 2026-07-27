'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BookOpenIcon,
  ClipboardCheckIcon,
  LayersIcon,
  RefreshCwIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'

import { AdminHomeSkeleton } from '@/components/admin/admin-home-skeleton'
import { PendingVerifyStrip } from '@/components/manager/pending-verify-strip'
import { WorkspaceHero } from '@/components/layout/workspace-hero'
import { StatusBadge } from '@/components/money/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getMe, type AuthUser } from '@/lib/auth'
import { formatDate, formatMoney } from '@/lib/format'
import {
  formatDhakaClock,
  formatDhakaToday,
} from '@/lib/student-dashboard'
import {
  getBatch,
  getStudentCount,
  listBatches,
  listCourses,
  listPendingPayments,
  listAuditLogs,
  listReportsLedger,
  listReportsOutstanding,
  listReportsRevenue,
  type AuditLogEntry,
  type BatchWithSeats,
  type LedgerEntry,
  type LedgerReport,
  type PendingPayment,
  type Paginated,
  type OutstandingReport,
  type RevenueReport,
} from '@/lib/api-client'
import { cn } from '@/lib/utils'

const PREVIEW_LIMIT = 5
const CAPACITY_CHECK_LIMIT = 12

interface AdminHomeData {
  user: AuthUser
  studentCount: number
  activeCourseCount: number
  courseTotal: number
  activeBatchCount: number
  batchTotal: number
  pending: PendingPayment[]
  pendingTotal: number
  tightBatches: BatchWithSeats[]
  unassignedBatches: BatchWithSeats[]
  revenue: RevenueReport
  outstanding: OutstandingReport
  recentLedger: LedgerReport
  recentAuditLogs: Paginated<AuditLogEntry>
}

async function fetchHomeData(): Promise<AdminHomeData> {
  const [
    user,
    coursesPage,
    batchesPage,
    enrollingMeta,
    runningMeta,
    pendingPage,
    students,
    revenue,
    outstanding,
    recentLedger,
    recentAuditLogs,
  ] = await Promise.all([
    getMe(),
    listCourses(1, 100),
    listBatches({ page: 1, limit: CAPACITY_CHECK_LIMIT }),
    listBatches({ status: 'enrolling', limit: 1 }),
    listBatches({ status: 'running', limit: 1 }),
    listPendingPayments(1, PREVIEW_LIMIT),
    getStudentCount(),
    listReportsRevenue({}),
    listReportsOutstanding({ page: 1, limit: 5 }),
    listReportsLedger({ page: 1, limit: 6 }),
    listAuditLogs({ page: 1, limit: 6 }),
  ])

  const activeCourses = coursesPage.data.filter((c) => c.status === 'active')
  const candidates = batchesPage.data.filter(
    (b) => b.status === 'enrolling' || b.status === 'running',
  )

  const detailed = await Promise.all(
    candidates.slice(0, CAPACITY_CHECK_LIMIT).map((b) => getBatch(b.id)),
  )

  const tightBatches = detailed
    .filter((b) => b.seatsRemaining <= Math.max(2, Math.floor(b.capacity * 0.1)))
    .sort((a, b) => a.seatsRemaining - b.seatsRemaining)

  const unassignedBatches = detailed.filter((b) => b.managers.length === 0)

  return {
    user,
    studentCount: students.count,
    activeCourseCount: activeCourses.length,
    courseTotal: coursesPage.meta.total,
    activeBatchCount: enrollingMeta.meta.total + runningMeta.meta.total,
    batchTotal: batchesPage.meta.total,
    pending: pendingPage.data,
    pendingTotal: pendingPage.meta.total,
    tightBatches,
    unassignedBatches,
    revenue,
    outstanding,
    recentLedger,
    recentAuditLogs,
  }
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminHomeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clock, setClock] = useState(() => formatDhakaClock())

  async function reload(): Promise<void> {
    try {
      setData(await fetchHomeData())
      setError(null)
    } catch {
      setError('The academy dashboard could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    fetchHomeData()
      .then((next) => {
        if (!cancelled) {
          setData(next)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('The academy dashboard could not be loaded. Try again.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock(formatDhakaClock())
    }, 30_000)
    return () => window.clearInterval(id)
  }, [])

  if (error && !data) {
    return (
      <div className="flex flex-col items-start gap-4 py-8">
        <div
          role="alert"
          className="w-full rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
        <Button
          className="min-h-11 w-full sm:w-auto"
          variant="outline"
          onClick={() => {
            void reload()
          }}
        >
          <RefreshCwIcon />
          Try again
        </Button>
      </div>
    )
  }

  if (!data) {
    return <AdminHomeSkeleton />
  }

  const attentionCount =
    data.pendingTotal + data.tightBatches.length + data.unassignedBatches.length

  const metrics = [
    {
      key: 'students',
      label: 'Students',
      value: data.studentCount,
      hint: 'Registered profiles',
      href: '/admin/students',
      icon: UsersIcon,
      tone: 'brand' as const,
    },
    {
      key: 'courses',
      label: 'Active courses',
      value: data.activeCourseCount,
      hint: `${data.courseTotal} in catalog`,
      href: '/admin/courses',
      icon: BookOpenIcon,
      tone: 'wash' as const,
    },
    {
      key: 'batches',
      label: 'Active batches',
      value: data.activeBatchCount,
      hint: 'Enrolling + running',
      href: '/admin/batches',
      icon: LayersIcon,
      tone: 'calm' as const,
    },
    {
      key: 'pending',
      label: 'Pending payments',
      value: data.pendingTotal,
      hint: data.pendingTotal === 0 ? 'Queue clear' : 'Need verify',
      href: '/admin/payments',
      icon: ClipboardCheckIcon,
      tone: data.pendingTotal > 0 ? ('warm' as const) : ('calm' as const),
    },
  ]

  const toneClass = {
    brand: {
      tile: 'bg-primary text-primary-foreground',
      muted: 'text-primary-foreground/75',
      icon: 'bg-primary-foreground/15',
    },
    warm: {
      tile: 'bg-status-pending-bg text-foreground',
      muted: 'text-muted-foreground',
      icon: 'bg-status-pending/15 text-status-pending',
    },
    wash: {
      tile: 'bg-primary-wash text-primary-strong',
      muted: 'text-muted-foreground',
      icon: 'bg-primary/15 text-primary-strong',
    },
    calm: {
      tile: 'bg-status-paid-bg text-foreground',
      muted: 'text-muted-foreground',
      icon: 'bg-status-paid/15 text-status-paid',
    },
  }

  return (
    <div className="flex min-w-0 flex-col gap-5 sm:gap-7">
      <WorkspaceHero
        user={data.user}
        description={
          attentionCount > 0
            ? `${attentionCount} item${attentionCount === 1 ? '' : 's'} need your attention — seat pressure, money waiting, and batches still without a manager.`
            : 'Seat pressure, money waiting on confirmation, and managers who still need a batch — not classroom homework. That stays with course managers.'
        }
        aside={
          <div className="shrink-0 rounded-xl bg-background/80 px-2.5 py-1.5 text-right sm:px-3 sm:py-2">
            <p className="font-heading text-sm font-semibold tabular-nums text-foreground sm:text-lg">
              {clock}
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {formatDhakaToday()}
            </p>
          </div>
        }
        actions={
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              className="min-h-11 min-w-0"
              render={<Link href="/admin/payments" />}
            >
              <ClipboardCheckIcon />
              Verify payments
            </Button>
            <Button
              variant="secondary"
              className="min-h-11 min-w-0"
              render={<Link href="/admin/batches" />}
            >
              <LayersIcon />
              Batches
            </Button>
            <Button
              variant="ghost"
              className="col-span-2 min-h-11 text-muted-foreground sm:col-span-1"
              onClick={() => {
                void reload()
              }}
            >
              <RefreshCwIcon />
              Refresh
            </Button>
          </div>
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

      <section className="min-w-0 space-y-3">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Academy pulse
          </h2>
          <p className="text-sm text-muted-foreground">
            Counts the backend can answer today — students, catalog, open
            batches, and manual payments waiting on a human.
          </p>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4">
          {metrics.map((metric) => {
            const tone = toneClass[metric.tone]
            const Icon = metric.icon
            return (
              <Link
                key={metric.key}
                href={metric.href}
                className={cn(
                  'rounded-xl p-3 transition-transform active:scale-[0.98] sm:p-4',
                  tone.tile,
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      'flex size-7 items-center justify-center rounded-lg sm:size-8',
                      tone.icon,
                    )}
                  >
                    <Icon className="size-3.5 sm:size-4" />
                  </span>
                  <span
                    className={cn('truncate text-xs font-medium', tone.muted)}
                  >
                    {metric.label}
                  </span>
                </div>
                <p className="mt-2 font-heading text-xl font-semibold tabular-nums tracking-tight sm:mt-3 sm:text-3xl">
                  {metric.value}
                </p>
                <p className={cn('mt-0.5 truncate text-xs', tone.muted)}>
                  {metric.hint}
                </p>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="min-w-0 space-y-3">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Needs your attention
          </h2>
          <p className="text-sm text-muted-foreground">
            Owner decisions only — verification, full batches, missing managers.
          </p>
        </div>

        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <AttentionPanel
            title="Seat pressure"
            empty="No enrolling or running batches are near capacity in the sample checked."
            items={data.tightBatches.map((batch) => ({
              id: batch.id,
              href: `/admin/batches/${batch.id}`,
              primary: batch.name,
              secondary: `${batch.seatsRemaining} of ${batch.capacity} seats left`,
              badge:
                batch.seatsRemaining === 0
                  ? { tone: 'overdue' as const, label: 'Full' }
                  : { tone: 'pending' as const, label: 'Tight' },
            }))}
          />
          <AttentionPanel
            title="Batches without a manager"
            empty="Every checked active batch has at least one manager."
            items={data.unassignedBatches.map((batch) => ({
              id: batch.id,
              href: `/admin/batches/${batch.id}`,
              primary: batch.name,
              secondary: 'Assign a manager so verification and classroom stay covered',
              badge: { tone: 'pending' as const, label: 'Unassigned' },
            }))}
          />
        </div>
      </section>

      <PendingVerifyStrip
        key={`${data.pendingTotal}-${data.pending.map((p) => p.id).join(',')}`}
        initial={data.pending}
        total={data.pendingTotal}
        queueHref="/admin/payments"
        onChanged={() => {
          void reload()
        }}
      />

      <section className="min-w-0 space-y-3">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Quick actions
          </h2>
          <p className="text-sm text-muted-foreground">
            The moves an academy owner makes most days.
          </p>
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/admin/courses"
            icon={BookOpenIcon}
            label="Manage courses"
            hint="Fees and catalog"
          />
          <QuickAction
            href="/admin/batches"
            icon={LayersIcon}
            label="Open a batch"
            hint="Capacity and windows"
          />
          <QuickAction
            href="/admin/managers"
            icon={UserPlusIcon}
            label="See managers"
            hint="Who can verify"
          />
          <QuickAction
            href="/admin/payments"
            icon={ClipboardCheckIcon}
            label="Payment queue"
            hint="Confirm arrivals"
          />
        </div>
      </section>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-muted/50 p-4 sm:p-5">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Revenue (this month)
          </h2>
          <p className="mt-2 text-2xl font-heading font-semibold tabular-nums text-primary-strong sm:text-3xl">
            {formatMoney(data.revenue.totalRevenue)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Net of refunds (verified payments minus admin refunds).
          </p>

          <div className="mt-4 space-y-2">
            {data.revenue.byMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No verified payments in this month yet.
              </p>
            ) : (
              data.revenue.byMonth.slice(0, 3).map((m) => (
                <div
                  key={m.periodMonth}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-sm text-muted-foreground">
                    {formatDate(m.periodMonth, 'month')}
                  </span>
                  <span className="font-numeric text-sm tabular-nums text-foreground">
                    {formatMoney(m.revenue)}
                  </span>
                </div>
              ))
            )}
          </div>

          <Button
            variant="ghost"
            className="mt-4 min-h-11 w-full justify-center"
            render={<Link href="/admin/reports" />}
          >
            View reports
          </Button>
        </div>

        <div className="rounded-xl bg-muted/50 p-4 sm:p-5">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Outstanding (unpaid balance)
          </h2>
          <p className="mt-2 text-2xl font-heading font-semibold tabular-nums text-primary-strong sm:text-3xl">
            {formatMoney(data.outstanding.totalOutstanding)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.outstanding.dueCount} due periods across monthly enrollments.
          </p>

          <div className="mt-4 space-y-2">
            {data.outstanding.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing outstanding for this month.
              </p>
            ) : (
              data.outstanding.items.map((item) => (
                <Link
                  key={item.billingPeriodId}
                  href="/admin/reports"
                  className="block rounded-lg bg-background/50 px-3 py-2 transition-colors hover:bg-background"
                >
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.courseTitle} — {item.batchName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(item.periodMonth, 'month')}
                  </p>
                  <p className="mt-1 text-sm font-heading font-semibold tabular-nums text-foreground">
                    {formatMoney(item.amountOutstanding)}
                  </p>
                </Link>
              ))
            )}
          </div>

          <Button
            variant="ghost"
            className="mt-4 min-h-11 w-full justify-center"
            render={<Link href="/admin/reports" />}
          >
            View outstanding
          </Button>
        </div>
      </section>

      <section className="grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="rounded-xl bg-muted/50 p-4 sm:p-5">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Recent payments & refunds
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The newest ledger entries for this month.
          </p>

          <div className="mt-4 space-y-2">
            {data.recentLedger.entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payment or refund records yet.
              </p>
            ) : (
              data.recentLedger.entries.map((entry: LedgerEntry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-background/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {entry.courseTitle} — {entry.batchName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(entry.periodMonth, 'month')} —{' '}
                      {entry.kind === 'refund' ? 'Refund' : entry.status}
                    </p>
                    {entry.kind === 'refund' && entry.refundReason ? (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {entry.refundReason}
                      </p>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      'font-heading text-sm font-semibold tabular-nums',
                      entry.kind === 'refund'
                        ? 'text-status-overdue'
                        : 'text-foreground',
                    )}
                  >
                    {formatMoney(entry.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl bg-muted/50 p-4 sm:p-5">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Recent activity (audit trail)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Owner-visible events: payments verified/rejected and penalties
            applied.
          </p>

          <div className="mt-4 space-y-2">
            {data.recentAuditLogs.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No audit entries yet.
              </p>
            ) : (
              data.recentAuditLogs.data.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg bg-background/50 px-3 py-2"
                >
                  <p className="text-sm font-medium text-foreground">
                    {log.action}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(log.createdAt, 'short')} — Target {log.targetType}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function AttentionPanel({
  title,
  empty,
  items,
}: {
  title: string
  empty: string
  items: Array<{
    id: string
    href: string
    primary: string
    secondary: string
    badge: { tone: 'pending' | 'overdue' | 'neutral'; label: string }
  }>
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-4 sm:p-5">
      <h3 className="font-heading text-base font-semibold text-foreground">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start justify-between gap-3 rounded-lg bg-background/80 px-3 py-3 transition-colors hover:bg-background"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {item.primary}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.secondary}
                  </p>
                </div>
                <StatusBadge tone={item.badge.tone} label={item.badge.label} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string
  icon: typeof BookOpenIcon
  label: string
  hint: string
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 transition-colors hover:bg-muted"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-wash text-primary-strong">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </Link>
  )
}

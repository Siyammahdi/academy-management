'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  DownloadIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AmountCell } from '@/components/money/amount-cell'
import { StatusBadge } from '@/components/money/status-badge'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import {
  MonthPicker,
  addMonthsToYearMonth,
  currentYearMonthDhaka,
  formatYearMonthLabel,
} from '@/components/ui/month-picker'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import { apiErrorMessage } from '@/lib/error-message'
import { formatDate } from '@/lib/format'
import {
  downloadReportsExport,
  listAuditLogs,
  listBatches,
  listReportsEnrollments,
  listReportsLedger,
  listReportsOutstanding,
  listReportsRevenue,
  type AuditLogEntry,
  type Batch,
  type EnrollmentReport,
  type LedgerEntry,
  type LedgerReport,
  type OutstandingReport,
  type Paginated,
  type RevenueReport,
} from '@/lib/api-client'
import { cn } from '@/lib/utils'

type ReportTab =
  | 'overview'
  | 'revenue'
  | 'outstanding'
  | 'enrollments'
  | 'ledger'
  | 'audit'

type RangePreset =
  | 'this_month'
  | 'last_3'
  | 'last_6'
  | 'ytd'
  | 'all_time'
  | 'custom'

const TABS: Array<{ id: ReportTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'outstanding', label: 'Outstanding' },
  { id: 'enrollments', label: 'Enrollments' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'audit', label: 'Audit' },
]

const PRESET_OPTIONS = [
  { value: 'last_6', label: 'Last 6 months' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_3', label: 'Last 3 months' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all_time', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
]

const DUES_SCOPE_OPTIONS = [
  {
    value: 'all_open',
    label: 'All open dues',
    description: 'Every unpaid period, any month',
  },
  {
    value: 'in_range',
    label: 'In selected months',
    description: 'Only billing months in the range above',
  },
]

const AUDIT_ACTION_OPTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'payment_verified', label: 'Payment verified' },
  { value: 'payment_rejected', label: 'Payment rejected' },
  { value: 'payment_submitted', label: 'Payment submitted' },
  { value: 'refund_issued', label: 'Refund issued' },
  { value: 'enrollment_created', label: 'Enrollment created' },
  { value: 'enrollment_status_changed', label: 'Enrollment status changed' },
  { value: 'batch_status_changed', label: 'Batch status changed' },
  { value: 'penalty_applied', label: 'Penalty applied' },
]

function resolvePreset(preset: RangePreset): { from: string; to: string } {
  const to = currentYearMonthDhaka()
  switch (preset) {
    case 'last_3':
      return { from: addMonthsToYearMonth(to, -2), to }
    case 'last_6':
      return { from: addMonthsToYearMonth(to, -5), to }
    case 'ytd': {
      const year = to.slice(0, 4)
      return { from: `${year}-01`, to }
    }
    case 'all_time':
      return { from: '2020-01', to: addMonthsToYearMonth(to, 12) }
    case 'this_month':
    default:
      return { from: to, to }
  }
}

export default function AdminReportsPage() {
  const initialRange = resolvePreset('last_6')
  const [tab, setTab] = useState<ReportTab>('overview')
  const [preset, setPreset] = useState<RangePreset>('last_6')
  const [from, setFrom] = useState(initialRange.from)
  const [to, setTo] = useState(initialRange.to)
  const [duesScope, setDuesScope] = useState<'all_open' | 'in_range'>('all_open')
  const [batchId, setBatchId] = useState('all')
  const [batches, setBatches] = useState<Batch[]>([])
  const [auditAction, setAuditAction] = useState('all')
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [revenue, setRevenue] = useState<RevenueReport | null>(null)
  const [outstanding, setOutstanding] = useState<OutstandingReport | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentReport | null>(null)
  const [ledger, setLedger] = useState<LedgerReport | null>(null)
  const [ledgerPage, setLedgerPage] = useState(1)
  const [outstandingPage, setOutstandingPage] = useState(1)
  const [auditLogs, setAuditLogs] = useState<Paginated<AuditLogEntry> | null>(
    null,
  )
  const [auditPage, setAuditPage] = useState(1)

  const batchOptions = useMemo(
    () => [
      { value: 'all', label: 'All batches' },
      ...batches.map((b) => ({
        value: b.id,
        label: b.name,
        description: b.status,
      })),
    ],
    [batches],
  )

  const rangeLabel =
    from === to
      ? formatYearMonthLabel(from)
      : `${formatYearMonthLabel(from)} → ${formatYearMonthLabel(to)}`

  function applyPreset(next: RangePreset): void {
    setPreset(next)
    if (next === 'custom') return
    const range = resolvePreset(next)
    setFrom(range.from)
    setTo(range.to)
    setLedgerPage(1)
    setOutstandingPage(1)
  }

  async function loadReports(): Promise<{
    revenue: RevenueReport
    outstanding: OutstandingReport
    enrollments: EnrollmentReport
    ledger: LedgerReport
    audit: Paginated<AuditLogEntry>
  }> {
    const batchParam = batchId === 'all' ? undefined : batchId
    const outstandingMonths =
      duesScope === 'all_open'
        ? { from: undefined, to: undefined }
        : { from, to }
    const [r, o, e, l, a] = await Promise.all([
      listReportsRevenue({ from, to, batchId: batchParam }),
      listReportsOutstanding({
        from: outstandingMonths.from,
        to: outstandingMonths.to,
        batchId: batchParam,
        page: outstandingPage,
        limit: 12,
      }),
      listReportsEnrollments({ batchId: batchParam }),
      listReportsLedger({
        from,
        to,
        batchId: batchParam,
        page: ledgerPage,
        limit: 12,
      }),
      listAuditLogs({
        page: auditPage,
        limit: 12,
        action: auditAction === 'all' ? undefined : auditAction,
      }),
    ])
    return { revenue: r, outstanding: o, enrollments: e, ledger: l, audit: a }
  }

  useEffect(() => {
    let cancelled = false
    listBatches({ page: 1, limit: 100 })
      .then((result) => {
        if (!cancelled) setBatches(result.data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadReports()
      .then((next) => {
        if (cancelled) return
        setRevenue(next.revenue)
        setOutstanding(next.outstanding)
        setEnrollments(next.enrollments)
        setLedger(next.ledger)
        setAuditLogs(next.audit)
        setError(null)
      })
      .catch(() => {
        if (!cancelled) setError('Reports could not be loaded. Try again.')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, batchId, duesScope, ledgerPage, outstandingPage, auditPage, auditAction])

  async function refresh(): Promise<void> {
    setBusy(true)
    try {
      const next = await loadReports()
      setRevenue(next.revenue)
      setOutstanding(next.outstanding)
      setEnrollments(next.enrollments)
      setLedger(next.ledger)
      setAuditLogs(next.audit)
      setError(null)
      toast.success('Reports refreshed')
    } catch {
      setError('Reports could not be loaded. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleExport(): Promise<void> {
    setExporting(true)
    try {
      await downloadReportsExport({
        from,
        to,
        batchId: batchId === 'all' ? undefined : batchId,
      })
      toast.success('CSV downloaded')
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'Export could not be downloaded.')
          : 'Export could not be downloaded.',
      )
    } finally {
      setExporting(false)
    }
  }

  const loaded = Boolean(
    revenue && outstanding && enrollments && ledger && auditLogs,
  )

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminPageHeader
        eyebrow="Reports"
        title="Academy reports"
        description="Revenue is verified payments minus refunds. Outstanding is unpaid billing periods (amount owed − amount paid). Course fees alone never appear here until a student enrolls and a period exists."
        actions={
          <>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={busy || exporting}
              onClick={() => {
                void handleExport()
              }}
            >
              <DownloadIcon />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={busy}
              onClick={() => {
                void refresh()
              }}
            >
              <RefreshCwIcon />
              Refresh
            </Button>
          </>
        }
      />

      <section className="rounded-xl bg-muted/50 p-4 sm:p-5">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FilterDropdown
            label="Range"
            value={preset}
            options={PRESET_OPTIONS}
            onChange={(value) => applyPreset(value as RangePreset)}
          />
          <FilterDropdown
            label="Batch"
            value={batchId}
            options={batchOptions}
            onChange={(value) => {
              setBatchId(value)
              setLedgerPage(1)
              setOutstandingPage(1)
            }}
            contentClassName="min-w-72"
          />
          <MonthPicker
            label="From"
            value={from}
            allowClear={false}
            onChange={(ym) => {
              if (!ym) return
              setPreset('custom')
              setFrom(ym)
              setLedgerPage(1)
              setOutstandingPage(1)
            }}
          />
          <MonthPicker
            label="To"
            value={to}
            allowClear={false}
            onChange={(ym) => {
              if (!ym) return
              setPreset('custom')
              setTo(ym)
              setLedgerPage(1)
              setOutstandingPage(1)
            }}
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FilterDropdown
            label="Outstanding scope"
            value={duesScope}
            options={DUES_SCOPE_OPTIONS}
            onChange={(value) => {
              setDuesScope(value as 'all_open' | 'in_range')
              setOutstandingPage(1)
            }}
            className="sm:col-span-2 xl:col-span-2"
            contentClassName="min-w-72"
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Revenue & ledger: <span className="font-medium text-foreground">{rangeLabel}</span>
          {batchId !== 'all' ? (
            <>
              {' '}
              ·{' '}
              <span className="font-medium text-foreground">
                {batchOptions.find((b) => b.value === batchId)?.label}
              </span>
            </>
          ) : null}
          . Outstanding:{' '}
          <span className="font-medium text-foreground">
            {duesScope === 'all_open' ? 'all open dues' : 'months in range'}
          </span>
          . Months use Asia/Dhaka.
        </p>
      </section>

      <ScrollArea className="w-full pb-1">
      <nav
        aria-label="Report sections"
        className="-mx-1 flex w-max gap-1 px-1"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'shrink-0 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors',
              tab === item.id
                ? 'bg-primary-wash text-primary-strong'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
      </ScrollArea>

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      {!loaded ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      ) : null}

      {loaded && revenue && outstanding && enrollments && ledger && auditLogs ? (
        <>
          {tab === 'overview' ? (
            <OverviewPanel
              revenue={revenue}
              outstanding={outstanding}
              enrollments={enrollments}
              ledger={ledger}
              duesScope={duesScope}
              onOpenTab={setTab}
            />
          ) : null}

          {tab === 'revenue' ? <RevenuePanel revenue={revenue} /> : null}

          {tab === 'outstanding' ? (
            <OutstandingPanel
              report={outstanding}
              page={outstandingPage}
              onPageChange={setOutstandingPage}
            />
          ) : null}

          {tab === 'enrollments' ? (
            <EnrollmentsPanel report={enrollments} />
          ) : null}

          {tab === 'ledger' ? (
            <LedgerPanel
              report={ledger}
              page={ledgerPage}
              onPageChange={setLedgerPage}
            />
          ) : null}

          {tab === 'audit' ? (
            <AuditPanel
              logs={auditLogs}
              page={auditPage}
              action={auditAction}
              onActionChange={(value) => {
                setAuditAction(value)
                setAuditPage(1)
              }}
              onPageChange={setAuditPage}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function OverviewPanel({
  revenue,
  outstanding,
  enrollments,
  ledger,
  duesScope,
  onOpenTab,
}: {
  revenue: RevenueReport
  outstanding: OutstandingReport
  enrollments: EnrollmentReport
  ledger: LedgerReport
  duesScope: 'all_open' | 'in_range'
  onOpenTab: (tab: ReportTab) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Revenue"
          value={<AmountCell amount={revenue.totalRevenue} className="text-2xl font-semibold" />}
          hint="Verified − refunds"
          onClick={() => onOpenTab('revenue')}
        />
        <MetricTile
          label="Outstanding"
          value={
            <AmountCell
              amount={outstanding.totalOutstanding}
              outstanding
              className="text-2xl font-semibold"
            />
          }
          hint={
            duesScope === 'all_open'
              ? `${outstanding.dueCount} open periods`
              : `${outstanding.dueCount} in selected months`
          }
          onClick={() => onOpenTab('outstanding')}
        />
        <MetricTile
          label="Seats filled"
          value={
            <span className="font-heading text-2xl font-semibold tabular-nums">
              {enrollments.totals.filled}
            </span>
          }
          hint={`${enrollments.totals.pending} pending · ${enrollments.totals.fullBatches} full`}
          onClick={() => onOpenTab('enrollments')}
        />
        <MetricTile
          label="Ledger rows"
          value={
            <span className="font-heading text-2xl font-semibold tabular-nums">
              {ledger.meta.total}
            </span>
          }
          hint="Payments & refunds in range"
          onClick={() => onOpenTab('ledger')}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl bg-muted/50 p-5">
          <h2 className="font-heading text-base font-semibold">Revenue by month</h2>
          <div className="mt-4 space-y-2">
            {revenue.byMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No verified payments in this range. Submit a manual proof and
                verify it on Payments — course fees alone are not revenue.
              </p>
            ) : (
              revenue.byMonth.slice(0, 6).map((m) => (
                <div
                  key={m.periodMonth}
                  className="flex items-center justify-between gap-3 rounded-lg bg-background/80 px-3 py-2"
                >
                  <span className="text-sm text-muted-foreground">
                    {formatDate(m.periodMonth, 'month')}
                  </span>
                  <AmountCell amount={m.revenue} />
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl bg-muted/50 p-5">
          <h2 className="font-heading text-base font-semibold">
            Top outstanding
          </h2>
          <div className="mt-4 space-y-2">
            {outstanding.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open dues. Outstanding appears after a student enrolls and
                their billing period is unpaid, pending, or partially paid.
              </p>
            ) : (
              outstanding.items.slice(0, 6).map((item) => (
                <div
                  key={item.billingPeriodId}
                  className="rounded-lg bg-background/80 px-3 py-2"
                >
                  <p className="truncate text-sm font-medium">
                    {item.courseTitle} · {item.batchName}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.periodMonth, 'month')}
                    </span>
                    <AmountCell amount={item.amountOutstanding} outstanding />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function MetricTile({
  label,
  value,
  hint,
  onClick,
}: {
  label: string
  value: ReactNode
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl bg-muted/60 p-4 text-left transition-colors hover:bg-muted"
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-2 text-foreground">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </button>
  )
}

function RevenuePanel({ revenue }: { revenue: RevenueReport }) {
  return (
    <section className="rounded-xl bg-muted/50 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold">Revenue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verified payments minus admin refunds for the selected months.
          </p>
        </div>
        <AmountCell
          amount={revenue.totalRevenue}
          className="text-2xl font-semibold text-primary-strong"
        />
      </div>
      <div className="mt-5 space-y-2">
        {revenue.byMonth.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No verified payments in this range. Revenue is cash that cleared —
            pending proofs on the Payments queue do not count until verified.
          </p>
        ) : (
          revenue.byMonth.map((m) => (
            <div
              key={m.periodMonth}
              className="flex items-center justify-between gap-3 rounded-lg bg-background/80 px-4 py-3"
            >
              <span className="text-sm font-medium">
                {formatDate(m.periodMonth, 'month')}
              </span>
              <AmountCell amount={m.revenue} className="text-base font-semibold" />
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function OutstandingPanel({
  report,
  page,
  onPageChange,
}: {
  report: OutstandingReport
  page: number
  onPageChange: (page: number) => void
}) {
  return (
    <section className="rounded-xl bg-muted/50 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold">Outstanding</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Unpaid, pending, and partially paid periods — server totals only.
          </p>
        </div>
        <div className="text-right">
          <AmountCell
            amount={report.totalOutstanding}
            outstanding
            className="text-2xl font-semibold"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {report.dueCount} due periods
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {report.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No open dues for this scope. Enroll a student (or add a late joiner)
            so a billing period exists with amount owed.
          </p>
        ) : (
          report.items.map((item) => (
            <div
              key={item.billingPeriodId}
              className="flex flex-col gap-2 rounded-lg bg-background/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {item.courseTitle} · {item.batchName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(item.periodMonth, 'month')}
                </p>
              </div>
              <AmountCell
                amount={item.amountOutstanding}
                outstanding
                className="text-base font-semibold"
              />
            </div>
          ))
        )}
      </div>
      <Pager
        page={page}
        totalPages={report.meta.totalPages}
        onPageChange={onPageChange}
      />
    </section>
  )
}

function EnrollmentsPanel({ report }: { report: EnrollmentReport }) {
  return (
    <section className="rounded-xl bg-muted/50 p-5">
      <div className="flex flex-wrap gap-2">
        <StatChip label="Filled" value={report.totals.filled} />
        <StatChip label="Pending" value={report.totals.pending} />
        <StatChip label="Full batches" value={report.totals.fullBatches} />
      </div>
      <div className="mt-5 space-y-2">
        {report.batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No batches to report.</p>
        ) : (
          report.batches.map((batch) => (
            <div
              key={batch.batchId}
              className="rounded-lg bg-background/80 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{batch.batchName}</p>
                  <p className="text-xs text-muted-foreground">
                    {batch.courseTitle}
                  </p>
                </div>
                <StatusBadge
                  tone={
                    batch.status === 'running'
                      ? 'paid'
                      : batch.status === 'enrolling'
                        ? 'pending'
                        : 'neutral'
                  }
                  label={batch.status}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted/60 px-2 py-2">
                  <p className="text-xs text-muted-foreground">Filled</p>
                  <p className="font-heading text-lg font-semibold tabular-nums">
                    {batch.filled}
                    <span className="text-xs font-medium text-muted-foreground">
                      /{batch.capacity}
                    </span>
                  </p>
                </div>
                <div className="rounded-md bg-muted/60 px-2 py-2">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="font-heading text-lg font-semibold tabular-nums">
                    {batch.pendingCount}
                  </p>
                </div>
                <div className="rounded-md bg-muted/60 px-2 py-2">
                  <p className="text-xs text-muted-foreground">Seats left</p>
                  <p className="font-heading text-lg font-semibold tabular-nums">
                    {batch.seatRemaining}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function LedgerPanel({
  report,
  page,
  onPageChange,
}: {
  report: LedgerReport
  page: number
  onPageChange: (page: number) => void
}) {
  return (
    <section className="rounded-xl bg-muted/50 p-5">
      <h2 className="font-heading text-base font-semibold">Ledger</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Every payment and refund in range — {report.meta.total} rows.
      </p>
      <div className="mt-5 space-y-2">
        {report.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No ledger entries in this range yet.
          </p>
        ) : (
          report.entries.map((entry: LedgerEntry) => (
            <div
              key={`${entry.kind}-${entry.id}`}
              className="flex flex-col gap-2 rounded-lg bg-background/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">
                    {entry.courseTitle} · {entry.batchName}
                  </p>
                  <StatusBadge
                    tone={
                      entry.kind === 'refund'
                        ? 'overdue'
                        : entry.status === 'verified'
                          ? 'paid'
                          : 'pending'
                    }
                    label={
                      entry.kind === 'refund'
                        ? 'Refund'
                        : (entry.status ?? entry.kind)
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(entry.periodMonth, 'month')} ·{' '}
                  {formatDate(entry.createdAt)}
                  {entry.method ? ` · ${entry.method}` : ''}
                  {entry.transactionReference
                    ? ` · ${entry.transactionReference}`
                    : ''}
                </p>
                {entry.refundReason ? (
                  <p className="text-xs text-muted-foreground">
                    {entry.refundReason}
                  </p>
                ) : null}
              </div>
              <AmountCell
                amount={entry.amount}
                outstanding={entry.kind === 'refund'}
                className="text-base font-semibold"
              />
            </div>
          ))
        )}
      </div>
      <Pager
        page={page}
        totalPages={report.meta.totalPages}
        onPageChange={onPageChange}
      />
    </section>
  )
}

function AuditPanel({
  logs,
  page,
  action,
  onActionChange,
  onPageChange,
}: {
  logs: Paginated<AuditLogEntry>
  page: number
  action: string
  onActionChange: (value: string) => void
  onPageChange: (page: number) => void
}) {
  return (
    <section className="rounded-xl bg-muted/50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Audit trail</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Append-only events — filter by action for money and enrollment work.
          </p>
        </div>
        <FilterDropdown
          label="Action"
          value={action}
          options={AUDIT_ACTION_OPTIONS}
          onChange={onActionChange}
          className="sm:w-64"
        />
      </div>
      <div className="mt-5 space-y-2">
        {logs.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit entries yet.</p>
        ) : (
          logs.data.map((log) => (
            <div
              key={log.id}
              className="rounded-lg bg-background/80 px-4 py-3"
            >
              <p className="font-medium">{log.action}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(log.createdAt)} · {log.targetType} ·{' '}
                <span className="font-mono">{log.targetId.slice(0, 10)}…</span>
              </p>
            </div>
          ))
        )}
      </div>
      <Pager
        page={page}
        totalPages={logs.meta.totalPages}
        onPageChange={onPageChange}
      />
    </section>
  )
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-background/80 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function Pager({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <Button
        variant="secondary"
        className="min-h-11"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <p className="text-sm tabular-nums text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <Button
        variant="secondary"
        className="min-h-11"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  )
}

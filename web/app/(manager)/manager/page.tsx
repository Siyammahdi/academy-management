'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangleIcon,
  ClipboardCheckIcon,
  LinkIcon,
  NotebookPenIcon,
  RefreshCwIcon,
  UsersIcon,
  VideoIcon,
} from 'lucide-react'

import {
  ManagerFocusCard,
  resolveManagerFocus,
} from '@/components/manager/manager-focus-card'
import { ManagedBatchShelf } from '@/components/manager/managed-batch-shelf'
import { ManagerHomeSkeleton } from '@/components/manager/manager-home-skeleton'
import { PendingVerifyStrip } from '@/components/manager/pending-verify-strip'
import { WorkspaceHero } from '@/components/layout/workspace-hero'
import { Button } from '@/components/ui/button'
import { getMe, type AuthUser } from '@/lib/auth'
import {
  formatDhakaClock,
  formatDhakaToday,
} from '@/lib/student-dashboard'
import {
  getAtRiskCount,
  getManagedBatches,
  listBatchHomework,
  listBatchRecordings,
  listCourses,
  listPendingPayments,
  type BatchWithSeats,
  type Course,
  type Homework,
  type PendingPayment,
  type Recording,
} from '@/lib/api-client'
import { formatDate } from '@/lib/format'
import { isDueToday, isPastDue } from '@/lib/homework-status'
import { cn } from '@/lib/utils'

const PREVIEW_LIMIT = 5

interface HomeworkPreview extends Homework {
  batchName: string
}

interface RecordingPreview extends Recording {
  batchName: string
}

interface ManagerHomeData {
  user: AuthUser
  batches: BatchWithSeats[]
  pending: PendingPayment[]
  pendingTotal: number
  atRiskCount: number
  courseById: Map<string, Pick<Course, 'title' | 'hasThumbnail' | 'updatedAt'>>
  homeworkDueToday: HomeworkPreview[]
  homeworkOverdue: number
  recentRecordings: RecordingPreview[]
  recentEnrollments: number
}

async function fetchHomeData(): Promise<ManagerHomeData> {
  const [user, batches, pendingPage, atRisk, courses] = await Promise.all([
    getMe(),
    getManagedBatches(),
    listPendingPayments(1, PREVIEW_LIMIT),
    getAtRiskCount(),
    listCourses(1, 100),
  ])

  const courseById = new Map(
    courses.data.map((c) => [
      c.id,
      {
        title: c.title,
        hasThumbnail: c.hasThumbnail,
        updatedAt: c.updatedAt,
      },
    ]),
  )

  const [homeworkLists, recordingLists, seatSnapshots] = await Promise.all([
    Promise.all(
      batches.map(async (batch) => {
        try {
          const items = await listBatchHomework(batch.id)
          return items.map((hw) => ({ ...hw, batchName: batch.name }))
        } catch {
          return [] as HomeworkPreview[]
        }
      }),
    ),
    Promise.all(
      batches.map(async (batch) => {
        try {
          const items = await listBatchRecordings(batch.id)
          return items.map((rec) => ({ ...rec, batchName: batch.name }))
        } catch {
          return [] as RecordingPreview[]
        }
      }),
    ),
    // seatsRemaining is capacity - active; recent enrollments aren't listed —
    // surface filled seats as a proxy for "students across my batches".
    Promise.resolve(
      batches.reduce((sum, b) => sum + (b.capacity - b.seatsRemaining), 0),
    ),
  ])

  const allHomework = homeworkLists.flat()
  const homeworkDueToday = allHomework
    .filter((hw) => isDueToday(hw.dueDate))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const homeworkOverdue = allHomework.filter((hw) => isPastDue(hw.dueDate)).length

  const recentRecordings = recordingLists
    .flat()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  return {
    user,
    batches,
    pending: pendingPage.data,
    pendingTotal: pendingPage.meta.total,
    atRiskCount: atRisk.count,
    courseById,
    homeworkDueToday,
    homeworkOverdue,
    recentRecordings,
    recentEnrollments: seatSnapshots,
  }
}

export default function ManagerOverviewPage() {
  const [data, setData] = useState<ManagerHomeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clock, setClock] = useState(() => formatDhakaClock())

  async function reload(): Promise<void> {
    try {
      setData(await fetchHomeData())
      setError(null)
    } catch {
      setError('The manager portal could not be loaded. Try again.')
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
          setError('The manager portal could not be loaded. Try again.')
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
    return <ManagerHomeSkeleton />
  }

  const {
    user,
    batches,
    pending,
    pendingTotal,
    atRiskCount,
    courseById,
    homeworkDueToday,
    homeworkOverdue,
    recentRecordings,
    recentEnrollments,
  } = data

  const runningCount = batches.filter((b) => b.status === 'running').length
  const missingLink = batches.filter(
    (b) => b.status !== 'completed' && !b.classLink,
  )
  const focus = resolveManagerFocus({
    pending,
    pendingTotal,
    batchesMissingLink: missingLink,
    atRiskCount,
  })

  const metrics = [
    {
      key: 'students',
      label: 'Your students',
      value: recentEnrollments,
      hint: 'Across batches',
      tone: 'brand' as const,
      href: '/manager/students',
      icon: UsersIcon,
    },
    {
      key: 'pending',
      label: 'Your queue',
      value: pendingTotal,
      hint: pendingTotal === 0 ? 'Clear' : 'Waiting',
      tone: pendingTotal > 0 ? ('warm' as const) : ('calm' as const),
      href: '/manager/payments',
      icon: ClipboardCheckIcon,
    },
    {
      key: 'homework',
      label: 'Due today',
      value: homeworkDueToday.length,
      hint: homeworkOverdue > 0 ? `${homeworkOverdue} overdue` : 'Homework',
      tone:
        homeworkDueToday.length > 0 || homeworkOverdue > 0
          ? ('warm' as const)
          : ('calm' as const),
      href: '/manager/homework',
      icon: NotebookPenIcon,
    },
    {
      key: 'links',
      label: 'No link',
      value: missingLink.length,
      hint: missingLink.length === 0 ? 'All set' : 'Needs URL',
      tone: missingLink.length > 0 ? ('wash' as const) : ('calm' as const),
      href: '/manager/class-links',
      icon: LinkIcon,
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

  const quickActions = [
    {
      href: '/manager/class-links',
      label: 'Update class link',
      icon: LinkIcon,
    },
    {
      href: '/manager/homework',
      label: 'Create homework',
      icon: NotebookPenIcon,
    },
    {
      href: '/manager/recordings',
      label: 'Upload recording',
      icon: VideoIcon,
    },
    {
      href: '/manager/payments',
      label: 'Your pending verifications',
      icon: ClipboardCheckIcon,
    },
    {
      href: '/manager/students',
      label: 'Your students',
      icon: UsersIcon,
    },
  ]

  return (
    <div className="flex min-w-0 flex-col gap-5 sm:gap-7">
      <WorkspaceHero
        user={user}
        description={
          runningCount > 0
            ? `${runningCount} running batch${runningCount === 1 ? '' : 'es'} on your desk · confirm payments and run the classroom — money movement stays with admin.`
            : 'Confirm payments and run the classroom for your assigned batches — money movement stays with admin.'
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
              render={<Link href="/manager/payments" />}
            >
              <ClipboardCheckIcon />
              Verify
            </Button>
            <Button
              variant="secondary"
              className="min-h-11 min-w-0"
              render={<Link href="/manager/batches" />}
            >
              <UsersIcon />
              Your batches
            </Button>
            <Button
              variant="ghost"
              className="col-span-2 min-h-11 text-muted-foreground sm:col-span-1 sm:w-auto"
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
                <span className={cn('truncate text-xs font-medium', tone.muted)}>
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

      <ManagerFocusCard focus={focus} />

      <section className="min-w-0 space-y-3">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Quick actions
          </h2>
          <p className="text-sm text-muted-foreground">
            Jump into the work you do most often
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.href}
                variant="secondary"
                className="min-h-11 justify-start"
                render={<Link href={action.href} />}
              >
                <Icon />
                {action.label}
              </Button>
            )
          })}
        </div>
      </section>

      <PendingVerifyStrip
        key={`${pendingTotal}-${pending.map((p) => p.id).join(',')}`}
        initial={pending}
        total={pendingTotal}
        onChanged={() => {
          void reload()
        }}
      />

      <div className="grid min-w-0 gap-5 lg:grid-cols-2 lg:gap-6">
        <section className="min-w-0 space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div className="space-y-1">
              <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                Homework due today
              </h2>
              <p className="text-sm text-muted-foreground">
                End of day Asia/Dhaka
              </p>
            </div>
            <Button
              variant="ghost"
              className="min-h-11 shrink-0"
              render={<Link href="/manager/homework" />}
            >
              View all
            </Button>
          </div>
          {homeworkDueToday.length === 0 ? (
            <div className="rounded-xl bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing due today
              {homeworkOverdue > 0
                ? ` · ${homeworkOverdue} overdue on the board`
                : ''}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {homeworkDueToday.slice(0, 5).map((hw) => (
                <li
                  key={hw.id}
                  className="rounded-xl bg-status-pending-bg px-4 py-3"
                >
                  <Link
                    href={`/manager/batches/${hw.batchId}/classroom`}
                    className="block min-w-0 space-y-0.5"
                  >
                    <p className="truncate font-medium text-foreground">
                      {hw.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {hw.batchName} · Due {formatDate(hw.dueDate)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div className="space-y-1">
              <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                Recent recordings
              </h2>
              <p className="text-sm text-muted-foreground">
                Latest YouTube uploads
              </p>
            </div>
            <Button
              variant="ghost"
              className="min-h-11 shrink-0"
              render={<Link href="/manager/recordings" />}
            >
              View all
            </Button>
          </div>
          {recentRecordings.length === 0 ? (
            <div className="rounded-xl bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
              No recordings yet — add one from Recordings
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {recentRecordings.map((rec) => (
                <li key={rec.id} className="rounded-xl bg-muted/50 px-4 py-3">
                  <Link
                    href={`/manager/batches/${rec.batchId}/classroom`}
                    className="block min-w-0 space-y-0.5"
                  >
                    <p className="truncate font-medium text-foreground">
                      {rec.title}
                    </p>
                    <p className="truncate text-xs tabular-nums text-muted-foreground">
                      {rec.batchName} · {formatDate(rec.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {atRiskCount > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl bg-status-overdue-bg p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-status-overdue/15 text-status-overdue">
              <AlertTriangleIcon className="size-4" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="font-heading text-base font-semibold text-foreground">
                {atRiskCount} student{atRiskCount === 1 ? '' : 's'} in penalty
              </p>
              <p className="text-sm text-muted-foreground">
                On your batches. Only admin can reverse a penalty — review the
                list and keep verifying payments on time.
              </p>
            </div>
          </div>
          <Button
            className="min-h-11 shrink-0"
            render={<Link href="/manager/students?penalty=1" />}
          >
            Review students
          </Button>
        </div>
      ) : null}

      <section className="min-w-0 space-y-3">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Your batches
          </h2>
          <p className="text-sm text-muted-foreground md:hidden">
            Swipe sideways to browse
          </p>
          <p className="hidden text-sm text-muted-foreground md:block">
            Workspace, roster, and classroom per batch
          </p>
        </div>
        <ManagedBatchShelf
          batches={batches}
          courseById={courseById}
        />
      </section>
    </div>
  )
}

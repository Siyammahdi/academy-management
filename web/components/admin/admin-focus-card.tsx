'use client'

import Link from 'next/link'
import {
  BookOpenIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  LayersIcon,
} from 'lucide-react'

import { AmountCell } from '@/components/money/amount-cell'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import type { PendingPayment } from '@/lib/api-client'

export type AdminFocus =
  | { kind: 'verify'; payment: PendingPayment; pendingCount: number }
  | { kind: 'courses'; count: number }
  | { kind: 'batches' }
  | { kind: 'clear' }

interface AdminFocusCardProps {
  focus: AdminFocus
}

export function resolveAdminFocus(input: {
  pending: PendingPayment[]
  pendingTotal: number
  courseCount: number
  activeBatchCount: number
}): AdminFocus {
  if (input.pending[0]) {
    return {
      kind: 'verify',
      payment: input.pending[0],
      pendingCount: input.pendingTotal,
    }
  }
  if (input.courseCount === 0) {
    return { kind: 'courses', count: 0 }
  }
  if (input.activeBatchCount === 0) {
    return { kind: 'batches' }
  }
  return { kind: 'clear' }
}

export function AdminFocusCard({ focus }: AdminFocusCardProps) {
  if (focus.kind === 'clear') {
    return (
      <div className="relative flex h-full min-w-0 flex-col justify-between overflow-hidden rounded-xl bg-status-paid-bg p-5 sm:p-6">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-status-paid/15 px-2 py-1 text-xs font-medium text-status-paid">
            <CheckCircle2Icon className="size-3.5" />
            All clear
          </span>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Nothing urgent right now
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Queue is clear and the catalog is running. Use courses and batches
            when you need to open seats or adjust fees.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            className="min-h-11 w-full sm:w-auto"
            render={<Link href="/admin/batches" />}
          >
            Browse batches
          </Button>
        </div>
      </div>
    )
  }

  if (focus.kind === 'verify') {
    const { payment, pendingCount } = focus
    const enrollment = payment.billingPeriod.enrollment
    const course = enrollment.batch.course.title
    const batch = enrollment.batch.name

    return (
      <div className="relative flex h-full min-w-0 flex-col justify-between overflow-hidden rounded-xl bg-status-pending-bg p-5 sm:p-6">
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-status-pending"
        />
        <div className="space-y-3 pl-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Next action · Verify
            </span>
            {pendingCount > 1 ? (
              <span className="rounded-md bg-background/70 px-2 py-0.5 text-xs tabular-nums text-status-pending">
                {pendingCount} in queue
              </span>
            ) : null}
          </div>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            {enrollment.student.fullName}
          </h2>
          <p className="text-sm text-muted-foreground">
            {course} · {batch} ·{' '}
            {formatDate(payment.billingPeriod.periodMonth, 'month')}
          </p>
          <AmountCell
            amount={payment.amount}
            className="text-xl font-semibold tracking-tight sm:text-2xl"
          />
          <p className="break-words text-xs tabular-nums text-muted-foreground">
            Submitted {formatDate(payment.createdAt)}
            {payment.transactionReference
              ? ` · Ref ${payment.transactionReference}`
              : ''}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 pl-2">
          <Button
            className="min-h-11 w-full sm:w-auto"
            render={<Link href="/admin/payments" />}
          >
            <ClipboardCheckIcon />
            Open queue
          </Button>
        </div>
      </div>
    )
  }

  if (focus.kind === 'courses') {
    return (
      <div className="relative flex h-full min-w-0 flex-col justify-between overflow-hidden rounded-xl bg-primary-wash p-5 sm:p-6">
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-primary"
        />
        <div className="space-y-3 pl-2">
          <span className="text-xs font-medium tracking-wide text-primary-strong uppercase">
            Catalog setup
          </span>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Create your first course
          </h2>
          <p className="text-sm text-muted-foreground">
            Courses define fees and billing. Batches and enrollments start
            from here.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 pl-2">
          <Button
            className="min-h-11 w-full sm:w-auto"
            render={<Link href="/admin/courses" />}
          >
            <BookOpenIcon />
            Open courses
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-w-0 flex-col justify-between overflow-hidden rounded-xl bg-primary-wash p-5 sm:p-6">
      <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <div className="space-y-3 pl-2">
        <span className="text-xs font-medium tracking-wide text-primary-strong uppercase">
          Enrollment window
        </span>
        <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          Open a batch
        </h2>
        <p className="text-sm text-muted-foreground">
          No batches are enrolling or running. Create one so students can
          join.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 pl-2">
        <Button
          className="min-h-11 w-full sm:w-auto"
          render={<Link href="/admin/batches" />}
        >
          <LayersIcon />
          Open batches
        </Button>
      </div>
    </div>
  )
}

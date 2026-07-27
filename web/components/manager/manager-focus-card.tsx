'use client'

import Link from 'next/link'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  LinkIcon,
} from 'lucide-react'

import { AmountCell } from '@/components/money/amount-cell'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import type { PendingPayment } from '@/lib/api-client'
import type { BatchWithSeats } from '@/lib/api-client'

export type ManagerFocus =
  | { kind: 'verify'; payment: PendingPayment; pendingCount: number }
  | { kind: 'class_link'; batch: BatchWithSeats; missingCount: number }
  | { kind: 'at_risk'; count: number }
  | { kind: 'clear' }

interface ManagerFocusCardProps {
  focus: ManagerFocus
}

export function resolveManagerFocus(input: {
  pending: PendingPayment[]
  pendingTotal: number
  batchesMissingLink: BatchWithSeats[]
  atRiskCount: number
}): ManagerFocus {
  if (input.pending[0]) {
    return {
      kind: 'verify',
      payment: input.pending[0],
      pendingCount: input.pendingTotal,
    }
  }
  if (input.batchesMissingLink[0]) {
    return {
      kind: 'class_link',
      batch: input.batchesMissingLink[0],
      missingCount: input.batchesMissingLink.length,
    }
  }
  if (input.atRiskCount > 0) {
    return { kind: 'at_risk', count: input.atRiskCount }
  }
  return { kind: 'clear' }
}

export function ManagerFocusCard({ focus }: ManagerFocusCardProps) {
  if (focus.kind === 'clear') {
    return (
      <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl bg-status-paid-bg p-5 sm:p-6">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-status-paid/15 px-2 py-1 text-xs font-medium text-status-paid">
            <CheckCircle2Icon className="size-3.5" />
            All clear
          </span>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Nothing needs you right now
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            No payments waiting, class links are set, and no one is in
            penalty on your batches. Check back when students submit
            proof.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            className="min-h-11 w-full sm:w-auto"
            render={<Link href="/manager/batches" />}
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
      <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl bg-status-pending-bg p-5 sm:p-6">
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
            render={<Link href="/manager/payments" />}
          >
            <ClipboardCheckIcon />
            Open queue
          </Button>
        </div>
      </div>
    )
  }

  if (focus.kind === 'class_link') {
    return (
      <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl bg-primary-wash p-5 sm:p-6">
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-primary"
        />
        <div className="space-y-3 pl-2">
          <span className="text-xs font-medium tracking-wide text-primary-strong uppercase">
            Classroom setup
          </span>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Add a class link
          </h2>
          <p className="text-sm text-muted-foreground">
            {focus.batch.name}
            {focus.missingCount > 1
              ? ` · ${focus.missingCount} batches missing a link`
              : ' · students need a join URL'}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 pl-2">
          <Button
            className="min-h-11 w-full sm:w-auto"
            render={<Link href="/manager/class-links" />}
          >
            <LinkIcon />
            Update class links
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl bg-status-overdue-bg p-5 sm:p-6">
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 bg-status-overdue"
      />
      <div className="space-y-3 pl-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-status-overdue uppercase">
          <AlertTriangleIcon className="size-3.5" />
          Penalty on file
        </span>
        <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          {focus.count} student{focus.count === 1 ? '' : 's'} in penalty
        </h2>
        <p className="text-sm text-muted-foreground">
          On your assigned batches. Only an admin can reverse a penalty —
          review the roster and keep verifying payments on time.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 pl-2">
        <Button
          className="min-h-11 w-full sm:w-auto"
          render={<Link href="/manager/students?penalty=1" />}
        >
          Review students
        </Button>
      </div>
    </div>
  )
}

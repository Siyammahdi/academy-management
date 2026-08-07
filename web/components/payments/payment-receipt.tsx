'use client'

import { useRef } from 'react'
import { PrinterIcon } from 'lucide-react'

import { AcademyLogo } from '@/components/brand/academy-logo'
import { Button } from '@/components/ui/button'
import type { PaymentWithContext } from '@/lib/api-client'
import { formatDate, formatMoney } from '@/lib/format'

interface PaymentReceiptProps {
  payment: PaymentWithContext
  /** Optional payer label when guest fields are absent from the type. */
  payerName?: string | null
  studentIdLabel?: string | null
}

/**
 * Printable academy receipt for verified (and pending) payments.
 * Uses window.print — no PDF library required.
 */
export function PaymentReceipt({
  payment,
  payerName,
  studentIdLabel,
}: PaymentReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const { batch, student } = payment.billingPeriod.enrollment
  const receiptNo = `ANR-${payment.id.slice(-8).toUpperCase()}`
  const name = payerName ?? student.fullName
  const sid = studentIdLabel ?? student.studentId

  function handlePrint(): void {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-muted-foreground">
          Official payment receipt — print or save as PDF from your browser.
        </p>
        <Button className="min-h-11" onClick={handlePrint}>
          <PrinterIcon />
          Print / Save PDF
        </Button>
      </div>

      <div
        ref={printRef}
        className="rounded-xl bg-background px-6 py-8 text-foreground sm:px-10 print:rounded-none print:px-0 print:py-0"
      >
        <header className="border-b border-primary/20 pb-6">
          <div className="flex items-center gap-3">
            <AcademyLogo size={48} decorative />
            <p className="text-xs font-medium tracking-wide text-primary-strong uppercase">
              An Nahda Academy
            </p>
          </div>
          <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight">
            Payment receipt
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Receipt {receiptNo}
          </p>
        </header>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Paid by
            </dt>
            <dd className="mt-1 text-sm font-medium">{name}</dd>
            <dd className="text-xs tabular-nums text-muted-foreground">{sid}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Date
            </dt>
            <dd className="mt-1 text-sm tabular-nums">
              {formatDate(payment.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Program
            </dt>
            <dd className="mt-1 text-sm font-medium">{batch.course.title}</dd>
            <dd className="text-xs text-muted-foreground">{batch.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Billing period
            </dt>
            <dd className="mt-1 text-sm tabular-nums">
              {formatDate(payment.billingPeriod.periodMonth, 'month')}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Method
            </dt>
            <dd className="mt-1 text-sm">
              {payment.method === 'gateway'
                ? 'Online (SSLCommerz)'
                : 'Manual transfer'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Reference
            </dt>
            <dd className="mt-1 text-sm tabular-nums break-all">
              {payment.transactionReference ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Status
            </dt>
            <dd className="mt-1 text-sm capitalize">{payment.status}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Amount paid
            </dt>
            <dd className="mt-1 font-heading text-xl font-semibold tabular-nums">
              {formatMoney(payment.amount)}
            </dd>
          </div>
        </dl>

        <footer className="mt-10 border-t border-primary/15 pt-4 text-xs leading-relaxed text-muted-foreground">
          This receipt confirms a payment recorded by An Nahda Academy. Online
          payments settle when the bank confirms; manual payments show as
          verified after teacher review. Keep this for your records.
          <span className="mt-2 block">
            annahda.net@gmail.com · +880 1717-215070 · House 32, Road 1, Aram
            Model Town, Mohammadpur, Dhaka-1207 · Licence 002806
          </span>
        </footer>
      </div>
    </div>
  )
}

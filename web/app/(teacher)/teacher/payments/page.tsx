'use client'

import { PendingPaymentsQueue } from '@/components/payments/pending-payments-queue'

/**
 * Teacher — Pending Verification
 * Manual payment queue scoped to assigned batches. Self-approval blocked
 * by the API (RBAC-03). Gateway payments never appear here.
 */
export default function TeacherPaymentsPage() {
  return (
    <PendingPaymentsQueue
      eyebrow="Payments"
      description="Manual payments in your assigned batches. Verify or reject — never your own enrollment. Gateway payments settle from the webhook and stay out of this queue."
    />
  )
}

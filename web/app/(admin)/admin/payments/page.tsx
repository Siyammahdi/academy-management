'use client'

import { PendingPaymentsQueue } from '@/components/payments/pending-payments-queue'
import { AdminPageHeader } from '@/components/admin/admin-page-header'

export default function AdminPaymentsPage() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminPageHeader
        eyebrow="Finance"
        title="Payments"
        description="Manual payment proofs waiting for a human. Gateway settlements arrive via webhook and never appear here. Verify or reject each proof — amounts stay per payment."
      />
      <PendingPaymentsQueue hideHeader />
    </div>
  )
}

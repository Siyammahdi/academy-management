'use client';

import { PendingPaymentsQueue } from '../../../../components/payments/pending-payments-queue';

export default function ManagerPaymentsPage() {
  return (
    <PendingPaymentsQueue
      eyebrow="Manager"
      description="Manual payments awaiting verification in your assigned batches. Gateway payments settle automatically from the SSLCommerz webhook and never appear here."
    />
  );
}

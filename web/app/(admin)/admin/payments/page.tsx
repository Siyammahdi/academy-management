'use client';

import { PendingPaymentsQueue } from '../../../../components/payments/pending-payments-queue';

export default function AdminPaymentsPage() {
  return (
    <PendingPaymentsQueue
      eyebrow="Admin"
      description="Manual payments awaiting verification. Gateway payments settle automatically from the SSLCommerz webhook and never appear here."
    />
  );
}

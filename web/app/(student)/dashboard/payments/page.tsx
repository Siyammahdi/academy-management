'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../../../../components/layout/page-header';
import { Pill } from '../../../../components/ui/pill';
import type { PillStatus } from '../../../../components/ui/pill';
import { formatDate, formatMoney } from '../../../../lib/format';
import { listMyPayments } from '../../../../lib/api-client';
import type { PaymentStatus, PaymentWithContext } from '../../../../lib/api-client';

const PAYMENT_STATUS_PILL: Record<
  PaymentStatus,
  { status: PillStatus; label: string }
> = {
  pending: { status: 'pending', label: 'Pending' },
  verified: { status: 'paid', label: 'Verified' },
  rejected: { status: 'overdue', label: 'Rejected' },
  expired: { status: 'unpaid', label: 'Expired' },
};

export default function StudentPaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithContext[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyPayments(1, 100)
      .then((result) => {
        if (!cancelled) {
          setPayments(result.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Your payment history could not be loaded. Try again.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Payments"
        description="Your full payment history, across every enrollment."
      />

      {error ? (
        <p className="font-body text-sm text-overdue" role="alert">
          {error}
        </p>
      ) : null}

      {!error && !payments ? (
        <p className="font-body text-body text-ink-muted">Loading…</p>
      ) : null}

      {payments && payments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-body text-body text-ink-muted">
            You have not made any payments yet.
          </p>
        </div>
      ) : null}

      {payments && payments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-paper-sunken">
                <th
                  scope="col"
                  className="px-3 py-2 text-left font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                >
                  Course · Batch
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                >
                  Method
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const pill = PAYMENT_STATUS_PILL[payment.status];
                const { batch } = payment.billingPeriod.enrollment;
                return (
                  <tr
                    key={payment.id}
                    className="border-t border-rule hover:bg-paper-sunken"
                  >
                    <td className="px-3 py-3 font-body text-body text-ink">
                      {batch.course.title} · {batch.name}
                    </td>
                    <td className="px-3 py-3 font-body text-body text-ink-muted">
                      {payment.method === 'gateway' ? 'Online' : 'Manual'}
                    </td>
                    <td className="px-3 py-3 text-right font-numeric text-body text-ink">
                      {formatMoney(payment.amount)}
                    </td>
                    <td className="px-3 py-3 font-numeric text-body text-ink-muted">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <Pill status={pill.status} label={pill.label} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

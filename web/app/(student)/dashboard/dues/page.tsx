'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../../../../components/layout/page-header';
import { Select } from '../../../../components/ui/select';
import { Button } from '../../../../components/ui/button';
import { LedgerLine } from '../../../../components/ledger/ledger-line';
import { PaymentModal } from '../../../../components/payments/payment-modal';
import { formatDate } from '../../../../lib/format';
import { PERIOD_STATUS_PILL } from '../../../../lib/period-status';
import { listMyBillingPeriods } from '../../../../lib/api-client';
import type {
  BillingPeriodWithContext,
  PeriodStatus,
} from '../../../../lib/api-client';

const STATUS_OPTIONS: PeriodStatus[] = [
  'unpaid',
  'pending',
  'partially_paid',
  'paid',
];

export default function StudentDuesPage() {
  const [statusFilter, setStatusFilter] = useState<PeriodStatus | ''>('');
  const [periods, setPeriods] = useState<BillingPeriodWithContext[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [payingPeriod, setPayingPeriod] =
    useState<BillingPeriodWithContext | null>(null);

  async function reload(): Promise<void> {
    try {
      const result = await listMyBillingPeriods(
        statusFilter || undefined,
        1,
        100,
      );
      setPeriods(result.data);
    } catch {
      setError('Your dues could not be loaded. Try again.');
    }
  }

  useEffect(() => {
    let cancelled = false;
    listMyBillingPeriods(statusFilter || undefined, 1, 100)
      .then((result) => {
        if (!cancelled) {
          setPeriods(result.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Your dues could not be loaded. Try again.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Dues"
        description="Every billing period across every enrollment, shown separately — never combined into one total."
      />

      <Select
        label="Status"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as PeriodStatus | '')}
        className="max-w-xs"
      >
        <option value="">All</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {PERIOD_STATUS_PILL[s].label}
          </option>
        ))}
      </Select>

      {error ? (
        <p className="font-body text-sm text-overdue" role="alert">
          {error}
        </p>
      ) : null}

      {!error && !periods ? (
        <p className="font-body text-body text-ink-muted">Loading…</p>
      ) : null}

      {periods && periods.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-body text-body text-ink-muted">
            No billing periods match this filter.
          </p>
        </div>
      ) : null}

      {periods && periods.length > 0 ? (
        <div className="flex flex-col">
          {periods.map((period) => {
            const pill = PERIOD_STATUS_PILL[period.status];
            const canPay =
              period.status === 'unpaid' || period.status === 'partially_paid';
            return (
              <div key={period.id} className="flex flex-col gap-2 py-1">
                <LedgerLine
                  periodLabel={formatDate(period.periodMonth, 'month')}
                  detailLabel={`${period.enrollment.batch.course.title} · ${period.enrollment.batch.name}`}
                  dueLabel={`Due ${formatDate(period.dueDate)}`}
                  status={pill.status}
                  statusLabel={pill.label}
                  amount={period.amountOwed}
                  outstanding={
                    period.status !== 'paid' ? period.outstanding : undefined
                  }
                />
                {canPay ? (
                  <div className="flex justify-end pb-3">
                    <Button
                      size="compact"
                      onClick={() => setPayingPeriod(period)}
                    >
                      Pay this due
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {payingPeriod ? (
        <PaymentModal
          isOpen
          onClose={() => setPayingPeriod(null)}
          billingPeriodId={payingPeriod.id}
          periodLabel={`${payingPeriod.enrollment.batch.course.title} · ${payingPeriod.enrollment.batch.name} · ${formatDate(payingPeriod.periodMonth, 'month')}`}
          outstanding={payingPeriod.outstanding}
          onSubmitted={() => {
            setPayingPeriod(null);
            void reload();
          }}
        />
      ) : null}
    </div>
  );
}

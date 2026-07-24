'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../components/layout/page-header';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { LedgerLine } from '../../../components/ledger/ledger-line';
import { PaymentModal } from '../../../components/payments/payment-modal';
import { formatDate } from '../../../lib/format';
import { PERIOD_STATUS_PILL } from '../../../lib/period-status';
import {
  listMyBillingPeriods,
  listMyEnrollments,
} from '../../../lib/admin-api';
import type {
  BillingPeriodWithContext,
  EnrollmentWithBatch,
} from '../../../lib/admin-api';

interface DashboardData {
  enrollments: EnrollmentWithBatch[];
  periods: BillingPeriodWithContext[];
}

// Plain fetcher (no setState) so the effect can call it directly without
// tripping react-hooks/set-state-in-effect — the actual setState happens in
// the effect's own .then()/.catch().
async function fetchDashboardData(): Promise<DashboardData> {
  const [enrollmentResult, periodResult] = await Promise.all([
    listMyEnrollments(1, 100),
    listMyBillingPeriods(undefined, 1, 100),
  ]);
  return { enrollments: enrollmentResult.data, periods: periodResult.data };
}

export default function StudentDashboardPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentWithBatch[] | null>(
    null,
  );
  const [periods, setPeriods] = useState<BillingPeriodWithContext[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [payingPeriod, setPayingPeriod] =
    useState<BillingPeriodWithContext | null>(null);

  async function reload(): Promise<void> {
    try {
      const data = await fetchDashboardData();
      setEnrollments(data.enrollments);
      setPeriods(data.periods);
    } catch {
      setError('Your dashboard could not be loaded. Try again.');
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetchDashboardData()
      .then((data) => {
        if (!cancelled) {
          setEnrollments(data.enrollments);
          setPeriods(data.periods);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Your dashboard could not be loaded. Try again.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Never merge dues across enrollments (BIL-07) — each enrollment gets its
  // own section and its own current period, shown separately.
  function currentPeriodFor(
    enrollmentId: string,
  ): BillingPeriodWithContext | undefined {
    return periods
      ?.filter((p) => p.enrollmentId === enrollmentId)
      .sort((a, b) => b.periodMonth.localeCompare(a.periodMonth))[0];
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Your enrollments"
        description="Each enrollment's current billing period, shown on its own — dues from different courses are never combined into one total."
      />

      {error ? (
        <p className="font-body text-sm text-overdue" role="alert">
          {error}
        </p>
      ) : null}

      {!error && !enrollments ? (
        <p className="font-body text-body text-ink-muted">Loading…</p>
      ) : null}

      {enrollments && enrollments.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="font-body text-body text-ink-muted">
            You have no enrollments yet.
          </p>
          <Link href="/dashboard/batches">
            <Button>Browse open batches</Button>
          </Link>
        </div>
      ) : null}

      {enrollments && enrollments.length > 0 ? (
        <div className="flex flex-col gap-6">
          {enrollments.map((enrollment) => {
            const period = currentPeriodFor(enrollment.id);
            const pill = period ? PERIOD_STATUS_PILL[period.status] : null;
            const canPay =
              period &&
              (period.status === 'unpaid' ||
                period.status === 'partially_paid');
            return (
              <Card key={enrollment.id} className="flex flex-col gap-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-h3 font-semibold text-ink">
                    {enrollment.batch.course.title}
                  </h2>
                  <span className="font-body text-sm text-ink-muted">
                    {enrollment.batch.name}
                  </span>
                </div>
                {period && pill ? (
                  <>
                    <LedgerLine
                      periodLabel={formatDate(period.periodMonth, 'month')}
                      detailLabel={`${enrollment.batch.course.title} · ${enrollment.batch.name}`}
                      dueLabel={`Due ${formatDate(period.dueDate)}`}
                      status={pill.status}
                      statusLabel={pill.label}
                      amount={period.amountOwed}
                      outstanding={
                        period.status !== 'paid' ? period.outstanding : undefined
                      }
                    />
                    {canPay ? (
                      <Button
                        className="self-start"
                        onClick={() => setPayingPeriod(period)}
                      >
                        Pay this due
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <p className="font-body text-sm text-ink-muted">
                    No billing period yet.
                  </p>
                )}
              </Card>
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

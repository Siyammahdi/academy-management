'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../components/layout/page-header';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Pill } from '../../../components/ui/pill';
import { LedgerLine } from '../../../components/ledger/ledger-line';
import { PaymentModal } from '../../../components/payments/payment-modal';
import { YoutubeEmbed } from '../../../components/media/youtube-embed';
import { formatDate } from '../../../lib/format';
import { isPastDue } from '../../../lib/homework-status';
import { PERIOD_STATUS_PILL } from '../../../lib/period-status';
import {
  listMyBillingPeriods,
  listMyEnrollments,
  listMyHomework,
  listMyRecordings,
} from '../../../lib/admin-api';
import type {
  BillingPeriodWithContext,
  EnrollmentWithBatch,
  HomeworkWithContext,
  RecordingWithContext,
} from '../../../lib/admin-api';

interface DashboardData {
  enrollments: EnrollmentWithBatch[];
  periods: BillingPeriodWithContext[];
  homework: HomeworkWithContext[];
  recordings: RecordingWithContext[];
}

// Plain fetcher (no setState) so the effect can call it directly without
// tripping react-hooks/set-state-in-effect — the actual setState happens in
// the effect's own .then()/.catch().
async function fetchDashboardData(): Promise<DashboardData> {
  const [enrollmentResult, periodResult, homework, recordings] =
    await Promise.all([
      listMyEnrollments(1, 100),
      listMyBillingPeriods(undefined, 1, 100),
      listMyHomework(),
      listMyRecordings(),
    ]);
  return {
    enrollments: enrollmentResult.data,
    periods: periodResult.data,
    homework,
    recordings,
  };
}

export default function StudentDashboardPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentWithBatch[] | null>(
    null,
  );
  const [periods, setPeriods] = useState<BillingPeriodWithContext[] | null>(
    null,
  );
  const [homework, setHomework] = useState<HomeworkWithContext[] | null>(
    null,
  );
  const [recordings, setRecordings] = useState<
    RecordingWithContext[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [payingPeriod, setPayingPeriod] =
    useState<BillingPeriodWithContext | null>(null);

  async function reload(): Promise<void> {
    try {
      const data = await fetchDashboardData();
      setEnrollments(data.enrollments);
      setPeriods(data.periods);
      setHomework(data.homework);
      setRecordings(data.recordings);
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
          setHomework(data.homework);
          setRecordings(data.recordings);
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
                {enrollment.status === 'active' && enrollment.batch.classLink ? (
                  <a
                    href={enrollment.batch.classLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-start font-body text-sm font-medium text-purple underline underline-offset-2"
                  >
                    Join class →
                  </a>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : null}

      {homework && homework.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-h3 font-semibold text-ink">
            Homework
          </h2>
          <div className="flex flex-col gap-4">
            {homework.map((hw) => {
              const pastDue = isPastDue(hw.dueDate);
              return (
                <Card key={hw.id} className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-body text-body font-medium text-ink">
                      {hw.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <Pill
                        status={pastDue ? 'overdue' : 'unpaid'}
                        label={pastDue ? 'Past due' : 'Upcoming'}
                      />
                      <span className="font-numeric text-sm text-ink-faint">
                        Due {formatDate(hw.dueDate)}
                      </span>
                    </div>
                  </div>
                  <span className="font-body text-sm text-ink-muted">
                    {hw.batch.course.title} · {hw.batch.name}
                  </span>
                  <p className="font-body text-sm text-ink-muted">
                    {hw.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {recordings && recordings.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-h3 font-semibold text-ink">
            Recorded classes
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {recordings.map((rec) => (
              <Card key={rec.id} className="flex flex-col gap-2">
                <YoutubeEmbed videoId={rec.youtubeVideoId} title={rec.title} />
                <span className="font-body text-body font-medium text-ink">
                  {rec.title}
                </span>
                <span className="font-body text-sm text-ink-muted">
                  {rec.batch.course.title} · {rec.batch.name}
                </span>
                <span className="font-numeric text-sm text-ink-faint">
                  Recorded {formatDate(rec.recordedFor)}
                </span>
              </Card>
            ))}
          </div>
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

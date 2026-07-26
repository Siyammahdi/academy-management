'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../components/layout/page-header';
import { Card } from '../../../components/ui/card';
import {
  getAtRiskCount,
  getManagedBatches,
  listPendingPayments,
} from '../../../lib/api-client';

interface OverviewStats {
  assignedBatches: number;
  pendingPayments: number;
  studentsAtRisk: number;
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const card = (
    <Card className="flex flex-col gap-2">
      <span className="font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint">
        {label}
      </span>
      <span className="font-numeric text-h1 font-semibold text-ink">
        {value}
      </span>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export default function ManagerOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const [batches, pending, atRisk] = await Promise.all([
          getManagedBatches(),
          listPendingPayments(1, 1),
          getAtRiskCount(),
        ]);
        if (cancelled) {
          return;
        }
        setStats({
          assignedBatches: batches.length,
          pendingPayments: pending.meta.total,
          studentsAtRisk: atRisk.count,
        });
      } catch {
        if (!cancelled) {
          setError('The overview could not be loaded. Try again.');
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Manager"
        title="Overview"
        description="Your assigned batches, payments awaiting your verification, and students at risk of penalty."
      />
      {error ? (
        <p className="font-body text-sm text-overdue" role="alert">
          {error}
        </p>
      ) : null}
      {!error && !stats ? (
        <p className="font-body text-body text-ink-muted">Loading…</p>
      ) : null}
      {stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Assigned batches"
            value={stats.assignedBatches}
            href="/manager/batches"
          />
          <StatCard
            label="Pending payments"
            value={stats.pendingPayments}
            href="/manager/payments"
          />
          <StatCard
            label="Students at risk"
            value={stats.studentsAtRisk}
          />
        </div>
      ) : null}
    </div>
  );
}

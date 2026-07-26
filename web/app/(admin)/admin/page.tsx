'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../components/layout/page-header';
import { Card } from '../../../components/ui/card';
import {
  getStudentCount,
  listBatches,
  listPendingPayments,
} from '../../../lib/api-client';

interface OverviewStats {
  activeBatches: number;
  students: number;
  pendingPayments: number;
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

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const [enrolling, running, pending, students] = await Promise.all([
          listBatches({ status: 'enrolling', limit: 1 }),
          listBatches({ status: 'running', limit: 1 }),
          listPendingPayments(1, 1),
          getStudentCount(),
        ]);
        if (cancelled) {
          return;
        }
        setStats({
          activeBatches: enrolling.meta.total + running.meta.total,
          students: students.count,
          pendingPayments: pending.meta.total,
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
        eyebrow="Admin"
        title="Overview"
        description="Active batches, enrolled students, and payments waiting on verification."
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
            label="Active batches"
            value={stats.activeBatches}
            href="/admin/batches"
          />
          <StatCard label="Students" value={stats.students} />
          <StatCard
            label="Pending payments"
            value={stats.pendingPayments}
            href="/admin/payments"
          />
        </div>
      ) : null}
    </div>
  );
}

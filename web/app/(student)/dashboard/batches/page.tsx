'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../../../../components/layout/page-header';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { ApiError } from '../../../../lib/api';
import { formatDate, formatMoney } from '../../../../lib/format';
import {
  enrollInBatch,
  getBatch,
  listBatches,
  listCourses,
} from '../../../../lib/admin-api';
import type { BatchWithSeats, Course } from '../../../../lib/admin-api';

function enrollErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    // doc 09 §7 — exact voice for a full batch.
    if (err.body.error === 'BATCH_FULL') {
      return 'Full — try next batch.';
    }
    if (err.body.error === 'ENROLLMENT_WINDOW_CLOSED') {
      return 'Enrollment for this batch has closed.';
    }
    if (err.body.error === 'ALREADY_ENROLLED') {
      return "You're already enrolled in this batch.";
    }
  }
  return 'Enrollment could not be completed. Try again or contact an admin.';
}

export default function StudentBrowseBatchesPage() {
  const [batches, setBatches] = useState<BatchWithSeats[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const [list, courseList] = await Promise.all([
          listBatches({ status: 'enrolling', limit: 50 }),
          listCourses(1, 100),
        ]);
        const enriched = await Promise.all(
          list.data.map((batch) => getBatch(batch.id)),
        );
        if (!cancelled) {
          setBatches(enriched);
          setCourses(courseList.data);
        }
      } catch {
        if (!cancelled) {
          setError('Open batches could not be loaded. Try again.');
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const courseTitleById = new Map(courses.map((c) => [c.id, c.title]));

  async function handleEnroll(batch: BatchWithSeats): Promise<void> {
    setRowErrors((prev) => ({ ...prev, [batch.id]: '' }));
    setBusyId(batch.id);
    try {
      await enrollInBatch(batch.id);
      setEnrolledIds((prev) => new Set(prev).add(batch.id));
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [batch.id]: enrollErrorMessage(err) }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Enroll in a batch"
        description="Batches currently open for enrollment."
      />

      {error ? (
        <p className="font-body text-sm text-overdue" role="alert">
          {error}
        </p>
      ) : null}

      {!error && !batches ? (
        <p className="font-body text-body text-ink-muted">Loading…</p>
      ) : null}

      {batches && batches.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-body text-body text-ink-muted">
            No batches are open for enrollment right now.
          </p>
        </div>
      ) : null}

      {batches && batches.length > 0 ? (
        <div className="flex flex-col gap-4">
          {batches.map((batch) => {
            const isFull = batch.seatsRemaining <= 0;
            const isEnrolled = enrolledIds.has(batch.id);
            const rowError = rowErrors[batch.id];
            return (
              <Card key={batch.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-h3 font-semibold text-ink">
                    {courseTitleById.get(batch.courseId) ?? 'Course'}
                  </h2>
                  <span className="font-body text-sm text-ink-muted">
                    {batch.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 font-body text-sm text-ink-muted">
                  <span>
                    Enrollment fee {formatMoney(batch.enrollmentFee)}
                  </span>
                  <span>Monthly fee {formatMoney(batch.monthlyFee)}</span>
                  <span>
                    Enrolls by {formatDate(batch.enrollmentClosesAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  {isFull ? (
                    <span className="font-body text-body text-ink-muted">
                      Full — try next batch.
                    </span>
                  ) : (
                    <span className="font-numeric text-sm text-ink-muted">
                      {batch.seatsRemaining} seats remaining
                    </span>
                  )}
                  {isEnrolled ? (
                    <span className="font-body text-body text-paid">
                      Enrolled
                    </span>
                  ) : (
                    <Button
                      disabled={isFull || busyId === batch.id}
                      onClick={() => handleEnroll(batch)}
                    >
                      {busyId === batch.id ? 'Enrolling…' : 'Enroll'}
                    </Button>
                  )}
                </div>
                {rowError ? (
                  <p className="font-body text-sm text-overdue" role="alert">
                    {rowError}
                  </p>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

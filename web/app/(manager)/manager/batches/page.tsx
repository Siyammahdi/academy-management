'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../../components/layout/page-header';
import { getManagedBatches, listCourses } from '../../../../lib/api-client';
import type { BatchStatus, BatchWithSeats, Course } from '../../../../lib/api-client';

const STATUS_LABELS: Record<BatchStatus, string> = {
  upcoming: 'Upcoming',
  enrolling: 'Enrolling',
  running: 'Running',
  completed: 'Completed',
};

export default function ManagerBatchesPage() {
  const [batches, setBatches] = useState<BatchWithSeats[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getManagedBatches(), listCourses(1, 100)])
      .then(([batchList, courseList]) => {
        if (!cancelled) {
          setBatches(batchList);
          setCourses(courseList.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Your batches could not be loaded. Try again.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const courseTitleById = new Map(courses.map((c) => [c.id, c.title]));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Manager"
        title="Batches"
        description="Batches you're assigned to manage."
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
            You have no assigned batches yet.
          </p>
        </div>
      ) : null}

      {batches && batches.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-paper-sunken">
                <th
                  scope="col"
                  className="px-3 py-2 text-left font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                >
                  Course
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                >
                  Seats remaining
                </th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr
                  key={batch.id}
                  className="border-t border-rule hover:bg-paper-sunken"
                >
                  <td className="px-3 py-3 font-body text-body text-ink">
                    <Link
                      href={`/manager/batches/${batch.id}`}
                      className="text-purple hover:text-purple-deep"
                    >
                      {batch.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 font-body text-body text-ink-muted">
                    {courseTitleById.get(batch.courseId) ?? '—'}
                  </td>
                  <td className="px-3 py-3 font-body text-body text-ink-muted">
                    {STATUS_LABELS[batch.status]}
                  </td>
                  <td className="px-3 py-3 text-right font-numeric text-body text-ink">
                    {batch.seatsRemaining} / {batch.capacity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

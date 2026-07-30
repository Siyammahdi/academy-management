'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../layout/page-header';
import { Card } from '../ui/card';
import { Pill } from '../ui/pill';
import type { PillStatus } from '../ui/pill';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { HomeworkPanel } from './homework-panel';
import { RecordingsPanel } from './recordings-panel';
import { formatDate } from '../../lib/format';
import {
  getBatch,
  getCourse,
  getRoster,
  updateClassLink,
} from '../../lib/api-client';
import type { BatchWithSeats, Course, RosterEntry } from '../../lib/api-client';
import { apiErrorMessage } from '../../lib/error-message';
import { ApiError } from '../../lib/api';

// Roster entries are enrollment-lifecycle rows, not money rows — there is
// no amount to show. Reusing the ledger StatusPill for the
// enrollment-status column borrows its tone mapping rather than its
// financial meaning: "active" reads as the settled/paid tone, "pending" as
// pending, "withdrawn" as neutral.
const ENROLLMENT_STATUS_PILL: Record<
  string,
  { status: PillStatus; label: string }
> = {
  active: { status: 'paid', label: 'Active' },
  pending: { status: 'pending', label: 'Pending' },
  withdrawn: { status: 'unpaid', label: 'Withdrawn' },
};

export interface BatchRosterProps {
  batchId: string;
  eyebrow?: string;
  /** Shown in the error state when the batch can't be loaded (e.g. a
   * manager isn't assigned to it, vs. it simply not existing). */
  loadErrorMessage?: string;
  /**
   * Which blocks to render.
   * - `full` — admin / legacy single page (default)
   * - `overview` — header + batch meta only
   * - `roster` — header + student table
   * - `classroom` — header + class link, homework, recordings
   */
  mode?: 'full' | 'overview' | 'roster' | 'classroom';
}

// Used by both /admin/batches/:id (any batch, admin's own management
// surface) and /manager/batches/:id (only batches the manager is assigned
// to — GET /batches/:id itself is public, but GET .../roster is guarded by
// BatchScopeGuard, so an unassigned manager simply gets the error state).
export function BatchRoster({
  batchId,
  loadErrorMessage = 'This batch could not be loaded.',
  mode = 'full',
}: BatchRosterProps) {
  const [batch, setBatch] = useState<BatchWithSeats | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [classLinkInput, setClassLinkInput] = useState('');
  const [savingClassLink, setSavingClassLink] = useState(false);
  const [classLinkError, setClassLinkError] = useState<string | null>(null);

  const showMeta = mode === 'full' || mode === 'overview'
  const showClassroom = mode === 'full' || mode === 'classroom'
  const showRoster = mode === 'full' || mode === 'roster'
  // Overview still needs roster for a seat count cue; classroom needs batch only.
  const needsRoster = showRoster || mode === 'overview'

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      try {
        const loadedBatch = await getBatch(batchId)
        if (cancelled) {
          return
        }
        setBatch(loadedBatch)
        setClassLinkInput(loadedBatch.classLink ?? '')
        const loadedCourse = await getCourse(loadedBatch.courseId)
        if (cancelled) {
          return
        }
        setCourse(loadedCourse)
        if (needsRoster) {
          const loadedRoster = await getRoster(batchId)
          if (cancelled) {
            return
          }
          setRoster(loadedRoster)
        }
      } catch {
        if (!cancelled) {
          setError(loadErrorMessage)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [batchId, loadErrorMessage, needsRoster])

  async function handleSaveClassLink(): Promise<void> {
    setClassLinkError(null);
    setSavingClassLink(true);
    try {
      const updated = await updateClassLink(batchId, {
        classLink: classLinkInput.trim(),
      });
      setBatch((prev) =>
        prev
          ? {
              ...prev,
              classLink: updated.classLink,
              classStartsAt: updated.classStartsAt,
              classEndsAt: updated.classEndsAt,
            }
          : prev,
      );
      setClassLinkInput(updated.classLink ?? '');
    } catch (err) {
      if (err instanceof ApiError) {
        setClassLinkError(
          apiErrorMessage(err.body, 'Could not save the class link.'),
        );
      } else {
        setClassLinkError('Could not save the class link.');
      }
    } finally {
      setSavingClassLink(false);
    }
  }

  if (error) {
    return (
      <p className="font-body text-sm text-overdue" role="alert">
        {error}
      </p>
    );
  }

  if (!batch) {
    return <p className="font-body text-body text-ink-muted">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={course?.title ?? 'Batch'}
        title={batch.name}
        description={`${batch.seatsRemaining} of ${batch.capacity} seats remaining · Course starts ${formatDate(batch.courseStartDate)}`}
      />

      {showMeta ? (
      <Card className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <span className="font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint">
            Enrollment opens
          </span>
          <span className="font-numeric text-body text-ink">
            {formatDate(batch.enrollmentOpensAt)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint">
            Enrollment closes
          </span>
          <span className="font-numeric text-body text-ink">
            {formatDate(batch.enrollmentClosesAt)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint">
            Due days
          </span>
          <span className="font-numeric text-body text-ink">
            {batch.dueDayStart}–{batch.dueDayEnd}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint">
            Managers
          </span>
          <span className="font-body text-body text-ink">
            {batch.managers.length > 0
              ? batch.managers.map((m) => m.email).join(', ')
              : 'None assigned'}
          </span>
        </div>
      </Card>
      ) : null}

      {showClassroom ? (
      <>
      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-h3 font-semibold text-ink">
          Class link
        </h2>
        <p className="font-body text-sm text-ink-muted">
          Where students join class — a Telegram group or a Zoom/Meet room.
          Teaching itself happens off-platform.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              type="url"
              label="Class link"
              placeholder="https://t.me/your-batch or https://meet.google.com/..."
              value={classLinkInput}
              onChange={(e) => setClassLinkInput(e.target.value)}
              error={classLinkError ?? undefined}
            />
          </div>
          <Button
            type="button"
            onClick={() => void handleSaveClassLink()}
            disabled={savingClassLink}
          >
            {savingClassLink ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Card>

      <HomeworkPanel batchId={batchId} />

      <RecordingsPanel batchId={batchId} />
      </>
      ) : null}

      {showRoster ? (
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-h3 font-semibold text-ink">
          Roster
        </h2>
        {roster && roster.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="font-body text-body text-ink-muted">
              No students enrolled in this batch yet.
            </p>
          </div>
        ) : null}
        {roster && roster.length > 0 ? (
          <ScrollArea className="w-full">
            <table className="w-full min-w-[36rem] border-collapse">
              <thead>
                <tr className="bg-paper-sunken">
                  <th
                    scope="col"
                    className="px-3 py-2 text-left font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                  >
                    Student
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                  >
                    Phone
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                  >
                    Enrolled
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
                {roster.map((entry) => {
                  const pill = ENROLLMENT_STATUS_PILL[entry.enrollmentStatus];
                  return (
                    <tr
                      key={entry.enrollmentId}
                      className="border-t border-rule hover:bg-paper-sunken"
                    >
                      <td className="px-3 py-3 font-body text-body text-ink">
                        {entry.fullName}{' '}
                        <span className="font-numeric text-sm text-ink-faint">
                          {entry.studentId}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-numeric text-body text-ink-muted">
                        {entry.phone}
                      </td>
                      <td className="px-3 py-3 font-numeric text-body text-ink-muted">
                        {formatDate(entry.enrolledAt)}
                      </td>
                      <td className="px-3 py-3">
                        {pill ? (
                          <Pill status={pill.status} label={pill.label} />
                        ) : (
                          entry.enrollmentStatus
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        ) : null}
        {!roster ? (
          <p className="font-body text-body text-ink-muted">Loading…</p>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}

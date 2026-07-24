'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../../components/layout/page-header';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Modal } from '../../../../components/ui/modal';
import { ApiError } from '../../../../lib/api';
import { apiErrorMessage } from '../../../../lib/error-message';
import { formatMoney } from '../../../../lib/format';
import {
  assignManager,
  changeBatchStatus,
  createBatch,
  getBatch,
  listBatches,
  listCourses,
  listUsers,
  removeManager,
  updateBatch,
} from '../../../../lib/admin-api';
import type {
  Batch,
  BatchStatus,
  BatchWithSeats,
  Course,
  CreateBatchInput,
  UpdateBatchInput,
  UserSummary,
} from '../../../../lib/admin-api';

const STATUS_OPTIONS: BatchStatus[] = [
  'upcoming',
  'enrolling',
  'running',
  'completed',
];

const STATUS_LABELS: Record<BatchStatus, string> = {
  upcoming: 'Upcoming',
  enrolling: 'Enrolling',
  running: 'Running',
  completed: 'Completed',
};

function isoToDateInput(iso: string): string {
  return iso.slice(0, 10);
}

function dateInputToIso(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function isoToDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateTimeLocalToIso(value: string): string {
  return new Date(value).toISOString();
}

interface BatchFormState {
  courseId: string;
  name: string;
  capacity: string;
  entryDiscountPercent: string;
  courseStartDate: string;
  enrollmentOpensAt: string;
  enrollmentClosesAt: string;
  dueDayStart: string;
  dueDayEnd: string;
}

function emptyBatchForm(defaultCourseId: string): BatchFormState {
  return {
    courseId: defaultCourseId,
    name: '',
    capacity: '30',
    entryDiscountPercent: '0',
    courseStartDate: '',
    enrollmentOpensAt: '',
    enrollmentClosesAt: '',
    dueDayStart: '1',
    dueDayEnd: '5',
  };
}

function batchToForm(batch: Batch): BatchFormState {
  return {
    courseId: batch.courseId,
    name: batch.name,
    capacity: String(batch.capacity),
    entryDiscountPercent: String(batch.entryDiscountPercent),
    courseStartDate: isoToDateInput(batch.courseStartDate),
    enrollmentOpensAt: isoToDateTimeLocal(batch.enrollmentOpensAt),
    enrollmentClosesAt: isoToDateTimeLocal(batch.enrollmentClosesAt),
    dueDayStart: String(batch.dueDayStart),
    dueDayEnd: String(batch.dueDayEnd),
  };
}

function BatchForm({
  mode,
  batchId,
  initial,
  courses,
  onCancel,
  onSaved,
}: {
  mode: 'create' | 'edit';
  batchId?: string;
  initial: BatchFormState;
  courses: Course[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCourse = courses.find((c) => c.id === form.courseId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    if (mode === 'create' && !form.courseId) {
      setError('Choose a course.');
      return;
    }
    if (!form.enrollmentOpensAt || !form.enrollmentClosesAt || !form.courseStartDate) {
      setError('Set the course start date and the enrollment window.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const input: CreateBatchInput = {
          courseId: form.courseId,
          name: form.name,
          capacity: Number.parseInt(form.capacity, 10),
          entryDiscountPercent: Number.parseInt(form.entryDiscountPercent, 10),
          courseStartDate: dateInputToIso(form.courseStartDate),
          enrollmentOpensAt: dateTimeLocalToIso(form.enrollmentOpensAt),
          enrollmentClosesAt: dateTimeLocalToIso(form.enrollmentClosesAt),
          dueDayStart: Number.parseInt(form.dueDayStart, 10),
          dueDayEnd: Number.parseInt(form.dueDayEnd, 10),
        };
        await createBatch(input);
        onSaved();
      } else {
        const input: UpdateBatchInput = {
          name: form.name,
          capacity: Number.parseInt(form.capacity, 10),
          entryDiscountPercent: Number.parseInt(form.entryDiscountPercent, 10),
          courseStartDate: dateInputToIso(form.courseStartDate),
          enrollmentOpensAt: dateTimeLocalToIso(form.enrollmentOpensAt),
          enrollmentClosesAt: dateTimeLocalToIso(form.enrollmentClosesAt),
          dueDayStart: Number.parseInt(form.dueDayStart, 10),
          dueDayEnd: Number.parseInt(form.dueDayEnd, 10),
        };
        await updateBatch(batchId ?? '', input);
        onSaved();
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(
              err.body,
              'This batch could not be saved. Try again or contact an admin.',
            )
          : 'This batch could not be saved. Try again or contact an admin.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {mode === 'create' ? (
        <Select
          label="Course"
          required
          value={form.courseId}
          onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value }))}
        >
          <option value="">Select a course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </Select>
      ) : null}
      {selectedCourse ? (
        <p className="font-body text-sm text-ink-muted">
          This batch will inherit {formatMoney(selectedCourse.enrollmentFee)}{' '}
          enrollment fee and {formatMoney(selectedCourse.monthlyFee)} monthly
          fee from {selectedCourse.title}. Fees are set on the course, not
          here.
        </p>
      ) : null}
      <Input
        label="Name"
        required
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Capacity"
          type="number"
          min={1}
          required
          value={form.capacity}
          onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
        />
        <Input
          label="Entry discount (%)"
          type="number"
          min={0}
          max={100}
          value={form.entryDiscountPercent}
          onChange={(e) =>
            setForm((p) => ({ ...p, entryDiscountPercent: e.target.value }))
          }
        />
      </div>
      <Input
        label="Course start date"
        type="date"
        required
        value={form.courseStartDate}
        onChange={(e) =>
          setForm((p) => ({ ...p, courseStartDate: e.target.value }))
        }
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Enrollment opens"
          type="datetime-local"
          required
          value={form.enrollmentOpensAt}
          onChange={(e) =>
            setForm((p) => ({ ...p, enrollmentOpensAt: e.target.value }))
          }
        />
        <Input
          label="Enrollment closes"
          type="datetime-local"
          required
          value={form.enrollmentClosesAt}
          onChange={(e) =>
            setForm((p) => ({ ...p, enrollmentClosesAt: e.target.value }))
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Due day start"
          type="number"
          min={1}
          max={28}
          value={form.dueDayStart}
          onChange={(e) =>
            setForm((p) => ({ ...p, dueDayStart: e.target.value }))
          }
        />
        <Input
          label="Due day end"
          type="number"
          min={1}
          max={28}
          value={form.dueDayEnd}
          onChange={(e) => setForm((p) => ({ ...p, dueDayEnd: e.target.value }))}
        />
      </div>

      {error ? (
        <p className="font-body text-sm text-overdue" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Saving…'
            : mode === 'create'
              ? 'Create batch'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

function ManagersModal({
  batch,
  onClose,
  onChanged,
}: {
  batch: BatchWithSeats;
  onClose: () => void;
  onChanged: (batch: BatchWithSeats) => void;
}) {
  const [managerUsers, setManagerUsers] = useState<UserSummary[] | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    listUsers('manager')
      .then(setManagerUsers)
      .catch(() => setError('Managers could not be loaded.'));
  }, []);

  async function refresh(): Promise<void> {
    onChanged(await getBatch(batch.id));
  }

  async function handleAssign(): Promise<void> {
    if (!selectedUserId) {
      return;
    }
    setError(null);
    setIsBusy(true);
    try {
      await assignManager(batch.id, selectedUserId);
      setSelectedUserId('');
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'This manager could not be assigned.')
          : 'This manager could not be assigned.',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRemove(userId: string): Promise<void> {
    setError(null);
    setIsBusy(true);
    try {
      await removeManager(batch.id, userId);
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'This manager could not be removed.')
          : 'This manager could not be removed.',
      );
    } finally {
      setIsBusy(false);
    }
  }

  const assignableUsers = (managerUsers ?? []).filter(
    (u) => !batch.managers.some((m) => m.userId === u.id),
  );

  return (
    <Modal isOpen onClose={onClose} title={`Managers · ${batch.name}`}>
      <div className="flex flex-col gap-4">
        {batch.managers.length === 0 ? (
          <p className="font-body text-sm text-ink-muted">
            No managers assigned yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {batch.managers.map((m) => (
              <li
                key={m.userId}
                className="flex items-center justify-between border-t border-rule py-2 first:border-t-0"
              >
                <span className="font-body text-body text-ink">
                  {m.email}
                </span>
                <Button
                  variant="ghost"
                  size="compact"
                  disabled={isBusy}
                  onClick={() => handleRemove(m.userId)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-2 border-t border-rule pt-4">
          <Select
            label="Assign a manager"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1"
          >
            <option value="">Select a manager</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            disabled={isBusy || !selectedUserId}
            onClick={handleAssign}
          >
            Assign
          </Button>
        </div>

        {error ? (
          <p className="font-body text-sm text-overdue" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

// Plain fetcher (no setState) so effects can call it directly without
// tripping react-hooks/set-state-in-effect — the actual setState happens in
// the effect's own .then()/.catch(), the same shape as the courses fetch
// below. GET /batches doesn't return seatsRemaining (only GET /batches/:id
// does), hence the per-row enrichment.
async function fetchBatches(status: BatchStatus | ''): Promise<BatchWithSeats[]> {
  const list = await listBatches({ status: status || undefined, limit: 20 });
  return Promise.all(list.data.map((batch) => getBatch(batch.id)));
}

export default function AdminBatchesPage() {
  const [batches, setBatches] = useState<BatchWithSeats[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [statusFilter, setStatusFilter] = useState<BatchStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [statusTarget, setStatusTarget] = useState<BatchWithSeats | null>(
    null,
  );
  const [newStatus, setNewStatus] = useState<BatchStatus>('upcoming');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [managersTarget, setManagersTarget] = useState<BatchWithSeats | null>(
    null,
  );

  const courseTitleById = new Map(courses.map((c) => [c.id, c.title]));

  async function reload(): Promise<void> {
    try {
      setBatches(await fetchBatches(statusFilter));
    } catch {
      setError('Batches could not be loaded. Try again.');
    }
  }

  useEffect(() => {
    listCourses(1, 100)
      .then((result) => setCourses(result.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchBatches(statusFilter)
      .then((data) => {
        if (!cancelled) {
          setBatches(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Batches could not be loaded. Try again.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  function handleSaved(): void {
    setIsCreateOpen(false);
    setEditingBatch(null);
    void reload();
  }

  function openStatusModal(batch: BatchWithSeats): void {
    setStatusTarget(batch);
    setNewStatus(batch.status);
    setStatusError(null);
  }

  async function handleChangeStatus(): Promise<void> {
    if (!statusTarget) {
      return;
    }
    setStatusError(null);
    setIsChangingStatus(true);
    try {
      await changeBatchStatus(statusTarget.id, newStatus);
      setStatusTarget(null);
      await reload();
    } catch (err) {
      setStatusError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'The status could not be changed.')
          : 'The status could not be changed.',
      );
    } finally {
      setIsChangingStatus(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Admin"
        title="Batches"
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>New batch</Button>
        }
      />

      <Select
        label="Status"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as BatchStatus | '')}
        className="max-w-xs"
      >
        <option value="">All</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </Select>

      {error ? (
        <p className="font-body text-sm text-overdue" role="alert">
          {error}
        </p>
      ) : null}

      {!error && !batches ? (
        <p className="font-body text-body text-ink-muted">Loading…</p>
      ) : null}

      {batches && batches.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="font-body text-body text-ink-muted">
            No batches match this filter.
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
                <th scope="col" className="px-3 py-2" />
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
                      href={`/admin/batches/${batch.id}`}
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
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="ghost"
                        size="compact"
                        onClick={() => setEditingBatch(batch)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="compact"
                        onClick={() => openStatusModal(batch)}
                      >
                        Status
                      </Button>
                      <Button
                        variant="ghost"
                        size="compact"
                        onClick={() => setManagersTarget(batch)}
                      >
                        Managers
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="New batch"
      >
        <BatchForm
          mode="create"
          initial={emptyBatchForm(courses[0]?.id ?? '')}
          courses={courses}
          onCancel={() => setIsCreateOpen(false)}
          onSaved={handleSaved}
        />
      </Modal>

      <Modal
        isOpen={editingBatch !== null}
        onClose={() => setEditingBatch(null)}
        title="Edit batch"
      >
        {editingBatch ? (
          <BatchForm
            mode="edit"
            batchId={editingBatch.id}
            initial={batchToForm(editingBatch)}
            courses={courses}
            onCancel={() => setEditingBatch(null)}
            onSaved={handleSaved}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        title={`Change status · ${statusTarget?.name ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleChangeStatus} disabled={isChangingStatus}>
              {isChangingStatus ? 'Saving…' : 'Change status'}
            </Button>
          </>
        }
      >
        <Select
          label="New status"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value as BatchStatus)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        {newStatus === 'completed' ? (
          <p className="font-body text-sm text-ink-muted">
            This stops billing for its periods.
          </p>
        ) : null}
        {statusError ? (
          <p className="font-body text-sm text-overdue" role="alert">
            {statusError}
          </p>
        ) : null}
      </Modal>

      {managersTarget ? (
        <ManagersModal
          batch={managersTarget}
          onClose={() => setManagersTarget(null)}
          onChanged={(updated) => {
            setManagersTarget(updated);
            setBatches(
              (prev) =>
                prev?.map((b) => (b.id === updated.id ? updated : b)) ?? null,
            );
          }}
        />
      ) : null}
    </div>
  );
}

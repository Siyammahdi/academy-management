'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { PageHeader } from '../../../../components/layout/page-header';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Modal } from '../../../../components/ui/modal';
import { ApiError } from '../../../../lib/api';
import { apiErrorMessage } from '../../../../lib/error-message';
import { formatMoney } from '../../../../lib/format';
import {
  archiveCourse,
  createCourse,
  listCourses,
  updateCourse,
} from '../../../../lib/api-client';
import type {
  BillingType,
  Course,
  CoursePart,
  CreateCourseInput,
} from '../../../../lib/api-client';

const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  monthly: 'Monthly',
  one_time: 'One-time',
};

interface CourseFormState {
  title: string;
  description: string;
  billingType: BillingType;
  enrollmentFee: string;
  monthlyFee: string;
  parts: CoursePart[];
}

function emptyForm(): CourseFormState {
  return {
    title: '',
    description: '',
    billingType: 'monthly',
    enrollmentFee: '',
    monthlyFee: '',
    parts: [],
  };
}

function courseToForm(course: Course): CourseFormState {
  return {
    title: course.title,
    description: course.description ?? '',
    billingType: course.billingType,
    enrollmentFee: course.enrollmentFee,
    monthlyFee: course.monthlyFee,
    parts: course.parts ?? [],
  };
}

const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

function CourseForm({
  mode,
  courseId,
  initial,
  onCancel,
  onSaved,
}: {
  mode: 'create' | 'edit';
  courseId?: string;
  initial: CourseFormState;
  onCancel: () => void;
  onSaved: (course: Course, mode: 'create' | 'edit') => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updatePart(index: number, patch: Partial<CoursePart>): void {
    setForm((prev) => ({
      ...prev,
      parts: prev.parts.map((part, i) =>
        i === index ? { ...part, ...patch } : part,
      ),
    }));
  }

  function removePart(index: number): void {
    setForm((prev) => ({
      ...prev,
      parts: prev.parts.filter((_, i) => i !== index),
    }));
  }

  function addPart(): void {
    setForm((prev) => ({
      ...prev,
      parts: [...prev.parts, { name: '', durationMonths: 1 }],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    if (!DECIMAL_PATTERN.test(form.enrollmentFee)) {
      setError('Enter the enrollment fee as an amount like 1000.00.');
      return;
    }
    if (!DECIMAL_PATTERN.test(form.monthlyFee)) {
      setError('Enter the monthly fee as an amount like 500.00.');
      return;
    }

    const input: CreateCourseInput = {
      title: form.title,
      description: form.description || undefined,
      billingType: form.billingType,
      enrollmentFee: form.enrollmentFee,
      monthlyFee: form.monthlyFee,
      parts: form.parts.length > 0 ? form.parts : undefined,
    };

    setIsSubmitting(true);
    try {
      onSaved(
        mode === 'create'
          ? await createCourse(input)
          : await updateCourse(courseId ?? '', input),
        mode,
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(
              err.body,
              'This course could not be saved. Try again or contact an admin.',
            )
          : 'This course could not be saved. Try again or contact an admin.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Title"
        required
        value={form.title}
        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
      />
      <div className="flex flex-col gap-1">
        <label className="font-body text-sm font-medium text-ink-muted">
          Description
        </label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) =>
            setForm((p) => ({ ...p, description: e.target.value }))
          }
          className="w-full rounded-sm border border-rule bg-paper-sunken px-3 py-2 font-body text-body text-ink focus-visible:border-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-wash"
        />
      </div>
      <Select
        label="Billing type"
        required
        value={form.billingType}
        onChange={(e) =>
          setForm((p) => ({
            ...p,
            billingType: e.target.value as BillingType,
          }))
        }
      >
        <option value="monthly">Monthly</option>
        <option value="one_time">One-time</option>
      </Select>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Enrollment fee (৳)"
          required
          inputMode="decimal"
          placeholder="1000.00"
          value={form.enrollmentFee}
          onChange={(e) =>
            setForm((p) => ({ ...p, enrollmentFee: e.target.value }))
          }
        />
        <Input
          label="Monthly fee (৳)"
          required
          inputMode="decimal"
          placeholder="500.00"
          value={form.monthlyFee}
          onChange={(e) =>
            setForm((p) => ({ ...p, monthlyFee: e.target.value }))
          }
        />
      </div>
      {mode === 'edit' ? (
        <p className="font-body text-sm text-ink-muted">
          Changing fees here does not change existing batches — they keep
          the fees they were created with.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="font-body text-sm font-medium text-ink-muted">
          Parts
        </span>
        {form.parts.map((part, index) => (
          <div key={index} className="flex items-end gap-2">
            <Input
              label="Name"
              value={part.name}
              onChange={(e) => updatePart(index, { name: e.target.value })}
              className="flex-1"
            />
            <Input
              label="Duration (months)"
              type="number"
              min={1}
              value={part.durationMonths}
              onChange={(e) =>
                updatePart(index, {
                  durationMonths: Number.parseInt(e.target.value, 10) || 1,
                })
              }
              className="w-40"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => removePart(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="compact"
          onClick={addPart}
          className="self-start"
        >
          Add part
        </Button>
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
              ? 'Create course'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [archivingCourse, setArchivingCourse] = useState<Course | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    listCourses(1, 100)
      .then((result) => setCourses(result.data))
      .catch(() => setError('Courses could not be loaded. Try again.'));
  }, []);

  function handleSaved(course: Course, mode: 'create' | 'edit'): void {
    setCourses((prev) => {
      if (!prev) {
        return [course];
      }
      if (mode === 'create') {
        return [course, ...prev];
      }
      return prev.map((c) => (c.id === course.id ? course : c));
    });
    setIsCreateOpen(false);
    setEditingCourse(null);
  }

  async function handleConfirmArchive(): Promise<void> {
    if (!archivingCourse) {
      return;
    }
    setArchiveError(null);
    setIsArchiving(true);
    try {
      await archiveCourse(archivingCourse.id);
      setCourses(
        (prev) => prev?.filter((c) => c.id !== archivingCourse.id) ?? null,
      );
      setArchivingCourse(null);
    } catch (err) {
      setArchiveError(
        err instanceof ApiError
          ? apiErrorMessage(
              err.body,
              'This course could not be archived. Try again.',
            )
          : 'This course could not be archived. Try again.',
      );
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Admin"
        title="Courses"
        description="Active courses only — archiving a course removes it from this list, but its existing batches keep running unchanged."
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>New course</Button>
        }
      />

      {error ? (
        <p className="font-body text-sm text-overdue" role="alert">
          {error}
        </p>
      ) : null}

      {!error && !courses ? (
        <p className="font-body text-body text-ink-muted">Loading…</p>
      ) : null}

      {courses && courses.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="font-body text-body text-ink-muted">
            No courses yet.
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>New course</Button>
        </div>
      ) : null}

      {courses && courses.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-paper-sunken">
                <th
                  scope="col"
                  className="px-3 py-2 text-left font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                >
                  Title
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                >
                  Billing
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                >
                  Enrollment fee
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint"
                >
                  Monthly fee
                </th>
                <th scope="col" className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr
                  key={course.id}
                  className="border-t border-rule hover:bg-paper-sunken"
                >
                  <td className="px-3 py-3 font-body text-body text-ink">
                    {course.title}
                  </td>
                  <td className="px-3 py-3 font-body text-body text-ink-muted">
                    {BILLING_TYPE_LABELS[course.billingType]}
                  </td>
                  <td className="px-3 py-3 text-right font-numeric text-body text-ink">
                    {formatMoney(course.enrollmentFee)}
                  </td>
                  <td className="px-3 py-3 text-right font-numeric text-body text-ink">
                    {formatMoney(course.monthlyFee)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="ghost"
                        size="compact"
                        onClick={() => setEditingCourse(course)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="compact"
                        onClick={() => setArchivingCourse(course)}
                      >
                        Archive
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
        title="New course"
      >
        <CourseForm
          mode="create"
          initial={emptyForm()}
          onCancel={() => setIsCreateOpen(false)}
          onSaved={handleSaved}
        />
      </Modal>

      <Modal
        isOpen={editingCourse !== null}
        onClose={() => setEditingCourse(null)}
        title="Edit course"
      >
        {editingCourse ? (
          <CourseForm
            mode="edit"
            courseId={editingCourse.id}
            initial={courseToForm(editingCourse)}
            onCancel={() => setEditingCourse(null)}
            onSaved={handleSaved}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={archivingCourse !== null}
        onClose={() => setArchivingCourse(null)}
        title="Archive this course?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setArchivingCourse(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmArchive}
              disabled={isArchiving}
            >
              {isArchiving ? 'Archiving…' : 'Archive course'}
            </Button>
          </>
        }
      >
        <p className="font-body text-body text-ink-muted">
          It stops appearing here and in new batch creation. Batches that
          already exist for {archivingCourse?.title} are unaffected.
        </p>
        {archiveError ? (
          <p className="font-body text-sm text-overdue" role="alert">
            {archiveError}
          </p>
        ) : null}
      </Modal>
    </div>
  );
}

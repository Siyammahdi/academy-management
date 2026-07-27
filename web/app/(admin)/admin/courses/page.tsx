'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import {
  ArchiveIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AmountCell } from '@/components/money/amount-cell'
import { StatusBadge } from '@/components/money/status-badge'
import { CourseCover } from '@/components/student/course-cover'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import { apiErrorMessage } from '@/lib/error-message'
import {
  archiveCourse,
  createCourse,
  listCourses,
  updateCourse,
  type BillingType,
  type Course,
  type CoursePart,
  type CreateCourseInput,
} from '@/lib/api-client'

const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  monthly: 'Monthly',
  one_time: 'One-time',
}

interface CourseFormState {
  title: string
  description: string
  billingType: BillingType
  enrollmentFee: string
  monthlyFee: string
  parts: CoursePart[]
}

function emptyForm(): CourseFormState {
  return {
    title: '',
    description: '',
    billingType: 'monthly',
    enrollmentFee: '',
    monthlyFee: '',
    parts: [],
  }
}

function courseToForm(course: Course): CourseFormState {
  return {
    title: course.title,
    description: course.description ?? '',
    billingType: course.billingType,
    enrollmentFee: course.enrollmentFee,
    monthlyFee: course.monthlyFee,
    parts: course.parts ?? [],
  }
}

const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/

function CourseForm({
  mode,
  courseId,
  initial,
  onCancel,
  onSaved,
}: {
  mode: 'create' | 'edit'
  courseId?: string
  initial: CourseFormState
  onCancel: () => void
  onSaved: (course: Course, mode: 'create' | 'edit') => void
}) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updatePart(index: number, patch: Partial<CoursePart>): void {
    setForm((prev) => ({
      ...prev,
      parts: prev.parts.map((part, i) =>
        i === index ? { ...part, ...patch } : part,
      ),
    }))
  }

  function removePart(index: number): void {
    setForm((prev) => ({
      ...prev,
      parts: prev.parts.filter((_, i) => i !== index),
    }))
  }

  function addPart(): void {
    setForm((prev) => ({
      ...prev,
      parts: [...prev.parts, { name: '', durationMonths: 1 }],
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    if (!form.title.trim()) {
      setError('Enter a course title.')
      return
    }
    if (!DECIMAL_PATTERN.test(form.enrollmentFee)) {
      setError('Enter the enrollment fee as an amount like 1000.00.')
      return
    }
    if (!DECIMAL_PATTERN.test(form.monthlyFee)) {
      setError('Enter the monthly fee as an amount like 500.00.')
      return
    }

    const input: CreateCourseInput = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      billingType: form.billingType,
      enrollmentFee: form.enrollmentFee,
      monthlyFee: form.monthlyFee,
      parts: form.parts.length > 0 ? form.parts : undefined,
    }

    setIsSubmitting(true)
    try {
      onSaved(
        mode === 'create'
          ? await createCourse(input)
          : await updateCourse(courseId ?? '', input),
        mode,
      )
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(
              err.body,
              'This course could not be saved. Try again.',
            )
          : 'This course could not be saved. Try again.',
      )
    } finally {
      setIsSubmitting(false)
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
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">
          Description
        </label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) =>
            setForm((p) => ({ ...p, description: e.target.value }))
          }
          className="w-full rounded-lg border border-transparent bg-input/50 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </div>
      <FilterDropdown
        label="Billing type"
        value={form.billingType}
        options={[
          { value: 'monthly', label: 'Monthly' },
          { value: 'one_time', label: 'One-time' },
        ]}
        onChange={(value) =>
          setForm((p) => ({
            ...p,
            billingType: value as BillingType,
          }))
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <p className="text-sm text-muted-foreground">
          Changing fees here does not change existing batches — they keep the
          fees they were created with.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-muted-foreground">Parts</span>
        {form.parts.map((part, index) => (
          <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input
              label="Name"
              value={part.name}
              onChange={(e) => updatePart(index, { name: e.target.value })}
              className="flex-1"
            />
            <Input
              label="Months"
              type="number"
              min={1}
              value={part.durationMonths}
              onChange={(e) =>
                updatePart(index, {
                  durationMonths: Number.parseInt(e.target.value, 10) || 1,
                })
              }
              className="sm:w-28"
            />
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => removePart(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 self-start"
          onClick={addPart}
        >
          Add part
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-status-overdue" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" className="min-h-11" disabled={isSubmitting}>
          {isSubmitting
            ? 'Saving…'
            : mode === 'create'
              ? 'Create course'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [archivingCourse, setArchivingCourse] = useState<Course | null>(null)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)

  async function reload(): Promise<void> {
    try {
      const result = await listCourses(1, 100)
      setCourses(result.data)
      setError(null)
    } catch {
      setError('Courses could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    listCourses(1, 100)
      .then((result) => {
        if (!cancelled) {
          setCourses(result.data)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Courses could not be loaded. Try again.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!courses) return []
    const q = query.trim().toLowerCase()
    if (!q) return courses
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        BILLING_TYPE_LABELS[c.billingType].toLowerCase().includes(q),
    )
  }, [courses, query])

  function handleSaved(course: Course, mode: 'create' | 'edit'): void {
    setCourses((prev) => {
      if (!prev) return [course]
      if (mode === 'create') return [course, ...prev]
      return prev.map((c) => (c.id === course.id ? course : c))
    })
    setIsCreateOpen(false)
    setEditingCourse(null)
    toast.success(mode === 'create' ? 'Course created' : 'Course saved')
  }

  async function handleConfirmArchive(): Promise<void> {
    if (!archivingCourse) return
    setArchiveError(null)
    setIsArchiving(true)
    try {
      await archiveCourse(archivingCourse.id)
      setCourses(
        (prev) => prev?.filter((c) => c.id !== archivingCourse.id) ?? null,
      )
      setArchivingCourse(null)
      toast.success('Course archived')
    } catch (err) {
      setArchiveError(
        err instanceof ApiError
          ? apiErrorMessage(
              err.body,
              'This course could not be archived. Try again.',
            )
          : 'This course could not be archived. Try again.',
      )
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminPageHeader
        eyebrow="Academy"
        title="Courses"
        description="Define what you teach and what it costs. Editing fees never rewrites existing batches — they keep the fee snapshot from when they were opened."
        actions={
          <>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                void reload()
              }}
            >
              <RefreshCwIcon />
              Refresh
            </Button>
            <Button className="min-h-11" onClick={() => setIsCreateOpen(true)}>
              <PlusIcon />
              New course
            </Button>
          </>
        }
      />

      <div className="relative min-w-0">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or billing type"
          className="min-h-11 pl-9"
          aria-label="Search courses"
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      {!courses && !error ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : null}

      {courses && filtered.length === 0 ? (
        <div className="rounded-xl bg-primary-wash px-5 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            {courses.length === 0 ? 'No courses yet' : 'No matches'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {courses.length === 0
              ? 'Create a course with enrollment and monthly fees, then open batches under it.'
              : 'Try a different search.'}
          </p>
          {courses.length === 0 ? (
            <Button
              className="mt-4 min-h-11"
              onClick={() => setIsCreateOpen(true)}
            >
              <PlusIcon />
              New course
            </Button>
          ) : null}
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => (
            <article
              key={course.id}
              className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-muted/60"
            >
              <CourseCover
                courseId={course.id}
                title={course.title}
                className="aspect-video w-full"
              />
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-base font-semibold text-foreground">
                      {course.title}
                    </h2>
                    <StatusBadge
                      tone="paid"
                      label={BILLING_TYPE_LABELS[course.billingType]}
                    />
                  </div>
                  {course.description ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {course.description}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1 text-sm">
                  <p className="flex items-baseline justify-between gap-2 text-muted-foreground">
                    <span>Enrollment</span>
                    <AmountCell amount={course.enrollmentFee} />
                  </p>
                  <p className="flex items-baseline justify-between gap-2 text-muted-foreground">
                    <span>Monthly</span>
                    <AmountCell amount={course.monthlyFee} />
                  </p>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    className="min-h-11"
                    onClick={() => setEditingCourse(course)}
                  >
                    <PencilIcon />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-11"
                    render={
                      <Link href={`/admin/batches?courseId=${course.id}`} />
                    }
                  >
                    <LayersIcon />
                    Batches
                  </Button>
                  <Button
                    variant="destructive"
                    className="col-span-2 min-h-11"
                    onClick={() => setArchivingCourse(course)}
                  >
                    <ArchiveIcon />
                    Archive
                  </Button>
                </div>
              </div>
            </article>
          ))}
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
              className="min-h-11"
              onClick={() => setArchivingCourse(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="min-h-11"
              onClick={() => {
                void handleConfirmArchive()
              }}
              disabled={isArchiving}
            >
              {isArchiving ? 'Archiving…' : 'Archive course'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          It stops appearing here and in new batch creation. Batches that
          already exist for {archivingCourse?.title} keep running unchanged.
        </p>
        {archiveError ? (
          <p className="mt-3 text-sm text-status-overdue" role="alert">
            {archiveError}
          </p>
        ) : null}
      </Modal>
    </div>
  )
}

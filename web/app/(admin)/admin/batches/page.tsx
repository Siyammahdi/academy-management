'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AssignTeachersPanel } from '@/components/admin/assign-teachers-panel'
import { BatchCard } from '@/components/batches/batch-card'
import { AmountCell } from '@/components/money/amount-cell'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import {
  changeBatchStatus,
  createBatch,
  getBatch,
  listBatches,
  listCourses,
  updateBatch,
  type Batch,
  type BatchStatus,
  type BatchWithSeats,
  type Course,
  type CreateBatchInput,
  type UpdateBatchInput,
} from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/error-message'

const STATUS_OPTIONS: BatchStatus[] = [
  'upcoming',
  'enrolling',
  'running',
  'completed',
]

const STATUS_LABELS: Record<BatchStatus, string> = {
  upcoming: 'Upcoming',
  enrolling: 'Enrolling',
  running: 'Running',
  completed: 'Completed',
}

function isoToDateInput(iso: string): string {
  return iso.slice(0, 10)
}

function dateInputToIso(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isoToDateTimeLocal(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function dateTimeLocalToIso(value: string): string {
  return new Date(value).toISOString()
}

interface BatchFormState {
  courseId: string
  name: string
  capacity: string
  entryDiscountPercent: string
  courseStartDate: string
  enrollmentOpensAt: string
  enrollmentClosesAt: string
  dueDayStart: string
  dueDayEnd: string
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
  }
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
  }
}

function BatchForm({
  mode,
  batchId,
  initial,
  courses,
  onCancel,
  onSaved,
}: {
  mode: 'create' | 'edit'
  batchId?: string
  initial: BatchFormState
  courses: Course[]
  onCancel: () => void
  onSaved: (mode: 'create' | 'edit') => void
}) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedCourse = courses.find((c) => c.id === form.courseId)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    if (mode === 'create' && !form.courseId) {
      setError('Choose a course.')
      return
    }
    if (!form.enrollmentOpensAt || !form.enrollmentClosesAt || !form.courseStartDate) {
      setError('Set the course start date and the enrollment window.')
      return
    }

    setIsSubmitting(true)
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
        }
        await createBatch(input)
        onSaved('create')
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
        }
        await updateBatch(batchId ?? '', input)
        onSaved('edit')
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(
              err.body,
              'This batch could not be saved. Try again or contact an admin.',
            )
          : 'This batch could not be saved. Try again or contact an admin.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {mode === 'create' ? (
        <FilterDropdown
          label="Course"
          value={form.courseId || '__none__'}
          placeholder="Select a course"
          options={[
            { value: '__none__', label: 'Select a course' },
            ...courses.map((c) => ({ value: c.id, label: c.title })),
          ]}
          onChange={(value) =>
            setForm((p) => ({
              ...p,
              courseId: value === '__none__' ? '' : value,
            }))
          }
          contentClassName="min-w-72"
        />
      ) : null}

      {selectedCourse ? (
        <p className="text-sm text-muted-foreground">
          This batch will inherit{' '}
          <AmountCell amount={selectedCourse.enrollmentFee} className="inline" />{' '}
          enrollment fee and{' '}
          <AmountCell amount={selectedCourse.monthlyFee} className="inline" />{' '}
          monthly fee from {selectedCourse.title}. Fees are set on the course,
          not here.
        </p>
      ) : null}

      <Input
        label="Name"
        required
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      <DatePicker
        label="Course start date"
        required
        value={form.courseStartDate}
        onChange={(courseStartDate) =>
          setForm((p) => ({ ...p, courseStartDate }))
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DateTimePicker
          label="Enrollment opens"
          required
          value={form.enrollmentOpensAt}
          onChange={(enrollmentOpensAt) =>
            setForm((p) => ({ ...p, enrollmentOpensAt }))
          }
        />
        <DateTimePicker
          label="Enrollment closes"
          required
          value={form.enrollmentClosesAt}
          onChange={(enrollmentClosesAt) =>
            setForm((p) => ({ ...p, enrollmentClosesAt }))
          }
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <Button type="submit" className="min-h-11" loading={isSubmitting}>
          {isSubmitting
            ? 'Saving…'
            : mode === 'create'
              ? 'Create batch'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

function TeachersModal({
  batch,
  onClose,
  onChanged,
}: {
  batch: BatchWithSeats
  onClose: () => void
  onChanged: (batch: BatchWithSeats) => void
}) {
  return (
    <Modal isOpen onClose={onClose} title={`Teachers · ${batch.name}`}>
      <AssignTeachersPanel
        batchId={batch.id}
        teachers={batch.teachers}
        onChanged={async () => {
          onChanged(await getBatch(batch.id))
        }}
      />
    </Modal>
  )
}

// GET /batches doesn't return seatsRemaining (only GET /batches/:id does),
// hence the per-row enrichment via getBatch.
async function fetchBatches(
  status: BatchStatus | '',
  courseId?: string,
): Promise<BatchWithSeats[]> {
  const list = await listBatches({
    status: status || undefined,
    courseId: courseId || undefined,
    limit: 100,
  })
  return Promise.all(list.data.map((batch) => getBatch(batch.id)))
}

function AdminBatchesPageContent() {
  const searchParams = useSearchParams()
  const courseIdFromUrl = searchParams.get('courseId') ?? ''

  const [batches, setBatches] = useState<BatchWithSeats[] | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [statusFilter, setStatusFilter] = useState<BatchStatus | ''>('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
  const [statusTarget, setStatusTarget] = useState<BatchWithSeats | null>(null)
  const [newStatus, setNewStatus] = useState<BatchStatus>('upcoming')
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [teachersTarget, setTeachersTarget] = useState<BatchWithSeats | null>(
    null,
  )

  const courseById = useMemo(
    () => new Map(courses.map((c) => [c.id, c])),
    [courses],
  )

  const courseFilterTitle = courseIdFromUrl
    ? (courseById.get(courseIdFromUrl)?.title ?? null)
    : null

  async function reload(): Promise<void> {
    try {
      setBatches(await fetchBatches(statusFilter, courseIdFromUrl || undefined))
      setError(null)
    } catch {
      setError('Batches could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    listCourses(1, 100)
      .then((result) => setCourses(result.data))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchBatches(statusFilter, courseIdFromUrl || undefined)
      .then((data) => {
        if (!cancelled) {
          setBatches(data)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Batches could not be loaded. Try again.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [statusFilter, courseIdFromUrl])

  const filtered = useMemo(() => {
    if (!batches) return []
    const q = query.trim().toLowerCase()
    if (!q) return batches
    return batches.filter((batch) => {
      const courseTitle = courseById.get(batch.courseId)?.title ?? ''
      return (
        batch.name.toLowerCase().includes(q) ||
        courseTitle.toLowerCase().includes(q)
      )
    })
  }, [batches, query, courseById])

  function handleSaved(mode: 'create' | 'edit'): void {
    setIsCreateOpen(false)
    setEditingBatch(null)
    toast.success(mode === 'create' ? 'Batch created' : 'Batch saved')
    void reload()
  }

  function openStatusModal(batch: BatchWithSeats): void {
    setStatusTarget(batch)
    setNewStatus(batch.status)
    setStatusError(null)
  }

  async function handleChangeStatus(): Promise<void> {
    if (!statusTarget) return
    setStatusError(null)
    setIsChangingStatus(true)
    try {
      await changeBatchStatus(statusTarget.id, newStatus)
      setStatusTarget(null)
      toast.success('Status updated')
      await reload()
    } catch (err) {
      setStatusError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'The status could not be changed.')
          : 'The status could not be changed.',
      )
    } finally {
      setIsChangingStatus(false)
    }
  }

  const defaultCourseId =
    courseIdFromUrl || courses[0]?.id || ''

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminPageHeader
        eyebrow="Academy"
        title="Batches"
        description="Open seats under a course — capacity, enrollment window, due days, and teachers. Status moves the batch through upcoming → enrolling → running → completed."
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
              New batch
            </Button>
          </>
        }
      />

      {courseIdFromUrl ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-primary-wash px-4 py-3 text-sm">
          <span className="text-muted-foreground">Filtered by course:</span>
          <span className="font-medium text-primary-strong">
            {courseFilterTitle ?? 'Selected course'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11"
            render={<Link href="/admin/batches" />}
          >
            Clear
          </Button>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by batch name or course"
            className="min-h-11 pl-9"
            aria-label="Search batches"
          />
        </div>
        <FilterDropdown
          label="Status"
          value={statusFilter || 'all'}
          options={[
            { value: 'all', label: 'All' },
            ...STATUS_OPTIONS.map((s) => ({
              value: s,
              label: STATUS_LABELS[s],
            })),
          ]}
          onChange={(value) =>
            setStatusFilter(value === 'all' ? '' : (value as BatchStatus))
          }
          className="sm:w-48"
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

      {!batches && !error ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : null}

      {batches && filtered.length === 0 ? (
        <div className="rounded-xl bg-primary-wash px-5 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            {batches.length === 0 ? 'No batches yet' : 'No matches'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {batches.length === 0
              ? 'Create a batch under a course to set capacity, windows, and teachers.'
              : 'Try a different search or status filter.'}
          </p>
          {batches.length === 0 ? (
            <Button
              className="mt-4 min-h-11"
              onClick={() => setIsCreateOpen(true)}
            >
              <PlusIcon />
              New batch
            </Button>
          ) : null}
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((batch) => {
            const course = courseById.get(batch.courseId)
            const teacherCount = batch.teachers.length

            return (
              <BatchCard
                key={batch.id}
                courseId={batch.courseId}
                name={batch.name}
                status={batch.status}
                capacity={batch.capacity}
                courseStartDate={batch.courseStartDate}
                seatsRemaining={batch.seatsRemaining}
                course={{
                  title: course?.title ?? 'Course',
                  hasThumbnail: course?.hasThumbnail,
                  updatedAt: course?.updatedAt,
                }}
                workspaceHref={`/admin/batches/${batch.id}`}
                facts={[
                  `${teacherCount} teacher${teacherCount === 1 ? '' : 's'}`,
                ]}
                secondaryActions={[
                  {
                    label: 'Roster',
                    href: `/admin/batches/${batch.id}/roster`,
                  },
                  {
                    label: 'Teachers',
                    onClick: () => setTeachersTarget(batch),
                  },
                ]}
                menuActions={[
                  {
                    label: 'Edit batch',
                    onClick: () => setEditingBatch(batch),
                  },
                  {
                    label: 'Change status',
                    onClick: () => openStatusModal(batch),
                  },
                ]}
              />
            )
          })}
        </div>
      ) : null}

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="New batch"
      >
        <BatchForm
          mode="create"
          initial={emptyBatchForm(defaultCourseId)}
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
            <Button
              variant="secondary"
              className="min-h-11"
              onClick={() => setStatusTarget(null)}
            >
              Cancel
            </Button>
            <Button
              className="min-h-11"
              onClick={() => {
                void handleChangeStatus()
              }}
              disabled={isChangingStatus}
            >
              {isChangingStatus ? 'Saving…' : 'Change status'}
            </Button>
          </>
        }
      >
        <FilterDropdown
          label="New status"
          value={newStatus}
          options={STATUS_OPTIONS.map((s) => ({
            value: s,
            label: STATUS_LABELS[s],
          }))}
          onChange={(value) => setNewStatus(value as BatchStatus)}
        />
        {newStatus === 'completed' ? (
          <p className="mt-3 text-sm text-muted-foreground">
            This stops billing for its periods.
          </p>
        ) : null}
        {statusError ? (
          <p className="mt-3 text-sm text-status-overdue" role="alert">
            {statusError}
          </p>
        ) : null}
      </Modal>

      {teachersTarget ? (
        <TeachersModal
          batch={teachersTarget}
          onClose={() => setTeachersTarget(null)}
          onChanged={(updated) => {
            setTeachersTarget(updated)
            setBatches(
              (prev) =>
                prev?.map((b) => (b.id === updated.id ? updated : b)) ?? null,
            )
          }}
        />
      ) : null}
    </div>
  )
}

export default function AdminBatchesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-w-0 flex-col gap-6">
          <Skeleton className="h-20 w-full max-w-xl rounded-xl" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <AdminBatchesPageContent />
    </Suspense>
  )
}

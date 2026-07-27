'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRightIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  UsersIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AmountCell } from '@/components/money/amount-cell'
import { StatusBadge } from '@/components/money/status-badge'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
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
  type Batch,
  type BatchStatus,
  type BatchWithSeats,
  type Course,
  type CreateBatchInput,
  type UpdateBatchInput,
  type UserSummary,
} from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/error-message'
import { formatDate } from '@/lib/format'

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

const STATUS_TONE: Record<BatchStatus, 'neutral' | 'pending' | 'paid'> = {
  upcoming: 'neutral',
  enrolling: 'pending',
  running: 'paid',
  completed: 'neutral',
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
      <Input
        label="Course start date"
        type="date"
        required
        value={form.courseStartDate}
        onChange={(e) =>
          setForm((p) => ({ ...p, courseStartDate: e.target.value }))
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <Button type="submit" className="min-h-11" disabled={isSubmitting}>
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

function ManagersModal({
  batch,
  onClose,
  onChanged,
}: {
  batch: BatchWithSeats
  onClose: () => void
  onChanged: (batch: BatchWithSeats) => void
}) {
  const [managerUsers, setManagerUsers] = useState<UserSummary[] | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    listUsers('manager')
      .then(setManagerUsers)
      .catch(() => setError('Managers could not be loaded.'))
  }, [])

  async function refresh(): Promise<void> {
    onChanged(await getBatch(batch.id))
  }

  async function handleAssign(): Promise<void> {
    if (!selectedUserId) return
    setError(null)
    setIsBusy(true)
    try {
      await assignManager(batch.id, selectedUserId)
      setSelectedUserId('')
      await refresh()
      toast.success('Manager assigned')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'This manager could not be assigned.')
          : 'This manager could not be assigned.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  async function handleRemove(userId: string): Promise<void> {
    setError(null)
    setIsBusy(true)
    try {
      await removeManager(batch.id, userId)
      await refresh()
      toast.success('Manager removed')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'This manager could not be removed.')
          : 'This manager could not be removed.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  const assignableUsers = (managerUsers ?? []).filter(
    (u) => !batch.managers.some((m) => m.userId === u.id),
  )

  return (
    <Modal isOpen onClose={onClose} title={`Managers · ${batch.name}`}>
      <div className="flex flex-col gap-4">
        {batch.managers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No managers assigned yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {batch.managers.map((m) => (
              <li
                key={m.userId}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm text-foreground">
                  {m.email}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="min-h-11 shrink-0"
                  disabled={isBusy}
                  onClick={() => {
                    void handleRemove(m.userId)
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end">
          <FilterDropdown
            label="Assign a manager"
            value={selectedUserId || '__none__'}
            placeholder="Select a manager"
            options={[
              { value: '__none__', label: 'Select a manager' },
              ...assignableUsers.map((u) => ({
                value: u.id,
                label: u.email,
              })),
            ]}
            onChange={(value) =>
              setSelectedUserId(value === '__none__' ? '' : value)
            }
            className="flex-1"
            contentClassName="min-w-72"
          />
          <Button
            type="button"
            className="min-h-11"
            disabled={isBusy || !selectedUserId}
            onClick={() => {
              void handleAssign()
            }}
          >
            Assign
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-status-overdue" role="alert">
            {error}
          </p>
        ) : null}
      </div>
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
  const [managersTarget, setManagersTarget] = useState<BatchWithSeats | null>(
    null,
  )

  const courseTitleById = useMemo(
    () => new Map(courses.map((c) => [c.id, c.title])),
    [courses],
  )

  const courseFilterTitle = courseIdFromUrl
    ? (courseTitleById.get(courseIdFromUrl) ?? null)
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
      const courseTitle = courseTitleById.get(batch.courseId) ?? ''
      return (
        batch.name.toLowerCase().includes(q) ||
        courseTitle.toLowerCase().includes(q)
      )
    })
  }, [batches, query, courseTitleById])

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
        description="Open seats under a course — capacity, enrollment window, due days, and managers. Status moves the batch through upcoming → enrolling → running → completed."
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
              ? 'Create a batch under a course to set capacity, windows, and managers.'
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
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((batch) => {
            const courseTitle =
              courseTitleById.get(batch.courseId) ?? 'Course'
            const managerCount = batch.managers.length

            return (
              <article
                key={batch.id}
                className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-muted/60"
              >
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-base font-semibold text-foreground">
                        {batch.name}
                      </h2>
                      <StatusBadge
                        tone={STATUS_TONE[batch.status]}
                        label={STATUS_LABELS[batch.status]}
                      />
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {courseTitle}
                    </p>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="tabular-nums">
                      {batch.seatsRemaining} / {batch.capacity} seats left
                    </p>
                    <p>
                      {managerCount} manager{managerCount === 1 ? '' : 's'}
                    </p>
                    <p className="tabular-nums">
                      Starts {formatDate(batch.courseStartDate)}
                    </p>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <Button
                      className="min-h-11"
                      render={
                        <Link href={`/admin/batches/${batch.id}`} />
                      }
                    >
                      Open workspace
                      <ArrowRightIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-11"
                      render={
                        <Link href={`/admin/batches/${batch.id}/roster`} />
                      }
                    >
                      Roster
                    </Button>
                    <Button
                      variant="secondary"
                      className="min-h-11"
                      onClick={() => setEditingBatch(batch)}
                    >
                      <PencilIcon />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      onClick={() => openStatusModal(batch)}
                    >
                      Status
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      onClick={() => setManagersTarget(batch)}
                    >
                      <UsersIcon />
                      Managers
                    </Button>
                  </div>
                </div>
              </article>
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

      {managersTarget ? (
        <ManagersModal
          batch={managersTarget}
          onClose={() => setManagersTarget(null)}
          onChanged={(updated) => {
            setManagersTarget(updated)
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

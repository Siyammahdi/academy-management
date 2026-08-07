'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  PencilIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { AdminBatchHero } from '@/components/admin/admin-batch-hero'
import { AssignTeachersPanel } from '@/components/admin/assign-teachers-panel'
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
  getBatch,
  getCourse,
  updateBatch,
  type BatchStatus,
  type BatchWithSeats,
  type Course,
  type UpdateBatchInput,
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

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isoToDateInput(iso: string): string {
  return iso.slice(0, 10)
}

function dateInputToIso(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

function isoToDateTimeLocal(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function dateTimeLocalToIso(value: string): string {
  return new Date(value).toISOString()
}

interface EditFormState {
  name: string
  capacity: string
  entryDiscountPercent: string
  courseStartDate: string
  enrollmentOpensAt: string
  enrollmentClosesAt: string
  dueDayStart: string
  dueDayEnd: string
}

function batchToEditForm(batch: BatchWithSeats): EditFormState {
  return {
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

export default function AdminBatchOverviewPage() {
  const params = useParams<{ id: string }>()
  const batchId = params.id

  const [batch, setBatch] = useState<BatchWithSeats | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  const [statusOpen, setStatusOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<BatchStatus>('upcoming')
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)

  const [teachersOpen, setTeachersOpen] = useState(false)

  async function load(): Promise<void> {
    setBusy(true)
    try {
      const loaded = await getBatch(batchId)
      const loadedCourse = await getCourse(loaded.courseId)
      setBatch(loaded)
      setCourse(loadedCourse)
      setError(null)
    } catch {
      setError('This batch could not be loaded.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    getBatch(batchId)
      .then(async (loaded) => {
        if (cancelled) return
        setBatch(loaded)
        const loadedCourse = await getCourse(loaded.courseId)
        if (!cancelled) {
          setCourse(loadedCourse)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) setError('This batch could not be loaded.')
      })
    return () => {
      cancelled = true
    }
  }, [batchId])

  function openEdit(): void {
    if (!batch) return
    setEditForm(batchToEditForm(batch))
    setEditError(null)
    setEditOpen(true)
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!editForm) return
    setEditError(null)
    setEditSaving(true)
    try {
      const input: UpdateBatchInput = {
        name: editForm.name,
        capacity: Number.parseInt(editForm.capacity, 10),
        entryDiscountPercent: Number.parseInt(editForm.entryDiscountPercent, 10),
        courseStartDate: dateInputToIso(editForm.courseStartDate),
        enrollmentOpensAt: dateTimeLocalToIso(editForm.enrollmentOpensAt),
        enrollmentClosesAt: dateTimeLocalToIso(editForm.enrollmentClosesAt),
        dueDayStart: Number.parseInt(editForm.dueDayStart, 10),
        dueDayEnd: Number.parseInt(editForm.dueDayEnd, 10),
      }
      await updateBatch(batchId, input)
      setEditOpen(false)
      toast.success('Batch saved')
      await load()
    } catch (err) {
      setEditError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'This batch could not be saved.')
          : 'This batch could not be saved.',
      )
    } finally {
      setEditSaving(false)
    }
  }

  function openStatus(): void {
    if (!batch) return
    setNewStatus(batch.status)
    setStatusError(null)
    setStatusOpen(true)
  }

  async function handleStatus(): Promise<void> {
    setStatusError(null)
    setStatusSaving(true)
    try {
      await changeBatchStatus(batchId, newStatus)
      setStatusOpen(false)
      toast.success('Status updated')
      await load()
    } catch (err) {
      setStatusError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'The status could not be changed.')
          : 'The status could not be changed.',
      )
    } finally {
      setStatusSaving(false)
    }
  }

  function openTeachers(): void {
    setTeachersOpen(true)
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminBatchHero
        batch={batch}
        course={course}
        error={error}
        busy={busy}
        onRefresh={() => {
          void load()
        }}
        actions={
          batch ? (
            <>
              <Button
                variant="secondary"
                className="min-h-11 bg-primary-foreground text-primary-strong hover:bg-primary-foreground/90"
                onClick={openEdit}
              >
                <PencilIcon />
                Edit
              </Button>
              <Button
                variant="outline"
                className="min-h-11 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                onClick={openStatus}
              >
                Status
              </Button>
              <Button
                variant="outline"
                className="min-h-11 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => {
                  openTeachers()
                }}
              >
                <UsersIcon />
                Teachers
              </Button>
            </>
          ) : null
        }
      />

      {batch ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-xs text-muted-foreground">Enrollment fee</p>
              <div className="mt-2">
                <AmountCell amount={batch.enrollmentFee} />
              </div>
              {batch.entryDiscountPercent > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Entry discount{' '}
                  <span className="tabular-nums">
                    {batch.entryDiscountPercent}%
                  </span>
                </p>
              ) : null}
            </div>
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-xs text-muted-foreground">Monthly fee</p>
              <div className="mt-2">
                <AmountCell amount={batch.monthlyFee} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Snapshotted from the course
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-xs text-muted-foreground">Enrollment opens</p>
              <p className="mt-2 text-sm font-medium tabular-nums text-foreground">
                {formatDate(batch.enrollmentOpensAt)}
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-xs text-muted-foreground">Enrollment closes</p>
              <p className="mt-2 text-sm font-medium tabular-nums text-foreground">
                {formatDate(batch.enrollmentClosesAt)}
              </p>
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl bg-muted/50 p-5">
              <h2 className="font-heading text-base font-semibold text-foreground">
                Teachers
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Who can verify payments and run classroom tools for this batch.
              </p>
              {batch.teachers.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No teachers assigned yet.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-2">
                  {batch.teachers.map((m) => (
                    <li
                      key={m.userId}
                      className="rounded-lg bg-background/80 px-3 py-2 text-sm text-foreground"
                    >
                      {m.email}
                    </li>
                  ))}
                </ul>
              )}
              <Button
                className="mt-4 min-h-11"
                variant="secondary"
                onClick={() => {
                  openTeachers()
                }}
              >
                <UserPlusIcon />
                Manage teachers
              </Button>
            </div>

            <div className="rounded-xl bg-muted/50 p-5">
              <h2 className="font-heading text-base font-semibold text-foreground">
                Quick links
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Jump into the work surfaces for this batch.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  className="min-h-11"
                  render={<Link href={`/admin/batches/${batchId}/roster`} />}
                >
                  Open roster
                </Button>
                <Button
                  variant="secondary"
                  className="min-h-11"
                  render={
                    <Link href={`/admin/batches/${batchId}/classroom`} />
                  }
                >
                  Classroom tools
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11"
                  render={<Link href="/admin/payments" />}
                >
                  Verify payments
                </Button>
                {course ? (
                  <Button
                    variant="ghost"
                    className="min-h-11"
                    render={
                      <Link href={`/admin/batches?courseId=${course.id}`} />
                    }
                  >
                    Sibling batches
                  </Button>
                ) : null}
              </div>
            </div>
          </section>
        </>
      ) : !error ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : null}

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit batch"
      >
        {editForm ? (
          <form
            onSubmit={(e) => {
              void handleEdit(e)
            }}
            className="flex flex-col gap-4"
            noValidate
          >
            <Input
              label="Name"
              required
              value={editForm.name}
              onChange={(e) =>
                setEditForm((p) => (p ? { ...p, name: e.target.value } : p))
              }
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Capacity"
                type="number"
                min={1}
                required
                value={editForm.capacity}
                onChange={(e) =>
                  setEditForm((p) =>
                    p ? { ...p, capacity: e.target.value } : p,
                  )
                }
              />
              <Input
                label="Entry discount (%)"
                type="number"
                min={0}
                max={100}
                value={editForm.entryDiscountPercent}
                onChange={(e) =>
                  setEditForm((p) =>
                    p ? { ...p, entryDiscountPercent: e.target.value } : p,
                  )
                }
              />
            </div>
            <DatePicker
              label="Course start date"
              required
              value={editForm.courseStartDate}
              onChange={(courseStartDate) =>
                setEditForm((p) => (p ? { ...p, courseStartDate } : p))
              }
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DateTimePicker
                label="Enrollment opens"
                required
                value={editForm.enrollmentOpensAt}
                onChange={(enrollmentOpensAt) =>
                  setEditForm((p) => (p ? { ...p, enrollmentOpensAt } : p))
                }
              />
              <DateTimePicker
                label="Enrollment closes"
                required
                value={editForm.enrollmentClosesAt}
                onChange={(enrollmentClosesAt) =>
                  setEditForm((p) => (p ? { ...p, enrollmentClosesAt } : p))
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Due day start"
                type="number"
                min={1}
                max={28}
                value={editForm.dueDayStart}
                onChange={(e) =>
                  setEditForm((p) =>
                    p ? { ...p, dueDayStart: e.target.value } : p,
                  )
                }
              />
              <Input
                label="Due day end"
                type="number"
                min={1}
                max={28}
                value={editForm.dueDayEnd}
                onChange={(e) =>
                  setEditForm((p) =>
                    p ? { ...p, dueDayEnd: e.target.value } : p,
                  )
                }
              />
            </div>
            {editError ? (
              <p className="text-sm text-status-overdue" role="alert">
                {editError}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="min-h-11" loading={editSaving}>
                {editSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        isOpen={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Change status"
        footer={
          <>
            <Button
              variant="secondary"
              className="min-h-11"
              onClick={() => setStatusOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="min-h-11"
              disabled={statusSaving}
              onClick={() => {
                void handleStatus()
              }}
            >
              {statusSaving ? 'Saving…' : 'Change status'}
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
            Completing a batch stops billing for its periods.
          </p>
        ) : null}
        {statusError ? (
          <p className="mt-3 text-sm text-status-overdue" role="alert">
            {statusError}
          </p>
        ) : null}
      </Modal>

      <Modal
        isOpen={teachersOpen}
        onClose={() => setTeachersOpen(false)}
        title={`Teachers · ${batch?.name ?? ''}`}
      >
        {batch ? (
          <AssignTeachersPanel
            batchId={batchId}
            teachers={batch.teachers}
            onChanged={async () => {
              await load()
            }}
          />
        ) : null}
      </Modal>
    </div>
  )
}

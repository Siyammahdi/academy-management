'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { PlusIcon, RefreshCwIcon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'

import { ManagerPageHeader } from '@/components/manager/manager-page-header'
import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api'
import {
  createHomework,
  deleteHomework,
  getManagedBatches,
  listBatchHomework,
  listCourses,
  type BatchWithSeats,
  type Homework,
} from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/error-message'
import { formatDate } from '@/lib/format'
import { isDueToday, isPastDue } from '@/lib/homework-status'

type HomeworkRow = Homework & {
  batchName: string
  courseTitle: string
}

type DueFilter = 'all' | 'today' | 'overdue' | 'upcoming'

/**
 * Manager — Homework
 * Aggregates GET /batches/:id/homework across managed batches (no cross-batch API).
 */
export default function ManagerHomeworkPage() {
  const [batches, setBatches] = useState<BatchWithSeats[] | null>(null)
  const [rows, setRows] = useState<HomeworkRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [dueFilter, setDueFilter] = useState<DueFilter>('all')
  const [batchFilter, setBatchFilter] = useState('all')
  const [creating, setCreating] = useState(false)

  async function reload(): Promise<void> {
    try {
      const [batchList, courses] = await Promise.all([
        getManagedBatches(),
        listCourses(1, 100),
      ])
      const courseTitleById = new Map(courses.data.map((c) => [c.id, c.title]))
      setBatches(batchList)

      const homeworkLists = await Promise.all(
        batchList.map(async (batch) => {
          const items = await listBatchHomework(batch.id)
          return items.map(
            (hw): HomeworkRow => ({
              ...hw,
              batchName: batch.name,
              courseTitle: courseTitleById.get(batch.courseId) ?? 'Course',
            }),
          )
        }),
      )

      setRows(
        homeworkLists.flat().sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
      )
      setError(null)
    } catch {
      setError('Homework could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    reload().catch(() => {
      if (!cancelled) setError('Homework could not be loaded. Try again.')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (batchFilter !== 'all' && row.batchId !== batchFilter) return false
      if (dueFilter === 'today' && !isDueToday(row.dueDate)) return false
      if (dueFilter === 'overdue' && !isPastDue(row.dueDate)) return false
      if (
        dueFilter === 'upcoming' &&
        (isPastDue(row.dueDate) || isDueToday(row.dueDate))
      ) {
        return false
      }
      if (!q) return true
      return (
        row.title.toLowerCase().includes(q) ||
        row.batchName.toLowerCase().includes(q) ||
        row.courseTitle.toLowerCase().includes(q)
      )
    })
  }, [rows, query, dueFilter, batchFilter])

  const todayCount = rows?.filter((r) => isDueToday(r.dueDate)).length ?? 0
  const overdueCount = rows?.filter((r) => isPastDue(r.dueDate)).length ?? 0

  async function handleDelete(id: string): Promise<void> {
    if (!window.confirm('Delete this homework item? This cannot be undone.')) {
      return
    }
    try {
      await deleteHomework(id)
      toast.success('Homework deleted')
      await reload()
    } catch {
      toast.error('This item could not be deleted.')
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ManagerPageHeader
        eyebrow="Teaching"
        title="Homework"
        description="Assignments across your batches. Due dates end of day Asia/Dhaka. Create from here or inside a batch classroom."
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
            <Button
              className="min-h-11"
              disabled={!batches || batches.length === 0}
              onClick={() => setCreating(true)}
            >
              <PlusIcon />
              Create homework
            </Button>
          </>
        }
      />

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="min-h-11 pl-9"
            placeholder="Search title, batch, or course"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search homework"
          />
        </div>
        <FilterDropdown
          className="w-full lg:w-44"
          value={dueFilter}
          onChange={(v) => setDueFilter(v as DueFilter)}
          options={[
            { value: 'all', label: 'All due dates' },
            { value: 'today', label: `Due today (${todayCount})` },
            { value: 'overdue', label: `Overdue (${overdueCount})` },
            { value: 'upcoming', label: 'Upcoming' },
          ]}
        />
        <FilterDropdown
          className="w-full lg:w-56"
          value={batchFilter}
          onChange={setBatchFilter}
          options={[
            { value: 'all', label: 'All batches' },
            ...(batches ?? []).map((b) => ({
              value: b.id,
              label: b.name,
            })),
          ]}
        />
      </div>

      {!rows && !error ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {rows && rows.length === 0 ? (
        <div className="rounded-xl bg-muted/50 px-6 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            No homework yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an assignment for one of your batches.
          </p>
        </div>
      ) : null}

      {rows && rows.length > 0 && filtered.length === 0 ? (
        <div className="rounded-xl bg-muted/50 px-6 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            No matching homework
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search or filter.
          </p>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {filtered.map((row) => {
            const past = isPastDue(row.dueDate)
            const today = isDueToday(row.dueDate)
            return (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-base font-semibold text-foreground">
                      {row.title}
                    </h2>
                    <StatusBadge
                      tone={past ? 'overdue' : today ? 'pending' : 'neutral'}
                      label={
                        past ? 'Past due' : today ? 'Due today' : 'Upcoming'
                      }
                    />
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {row.courseTitle} · {row.batchName}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    Due {formatDate(row.dueDate)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="min-h-11"
                    render={
                      <Link
                        href={`/manager/batches/${row.batchId}/classroom`}
                      />
                    }
                  >
                    Open classroom
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-11 text-status-overdue"
                    onClick={() => {
                      void handleDelete(row.id)
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {creating && batches ? (
        <CreateHomeworkModal
          batches={batches}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            void reload()
          }}
        />
      ) : null}
    </div>
  )
}

function CreateHomeworkModal({
  batches,
  onClose,
  onSaved,
}: {
  batches: BatchWithSeats[]
  onClose: () => void
  onSaved: () => void
}) {
  const [batchId, setBatchId] = useState(batches[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!batchId || !title.trim() || !description.trim() || !dueDate) {
      setError('Choose a batch and fill in title, description, and due date.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createHomework(batchId, {
        title: title.trim(),
        description: description.trim(),
        dueDate,
      })
      toast.success('Homework added')
      onSaved()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'Homework could not be saved.')
          : 'Homework could not be saved.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Create homework">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FilterDropdown
          label="Batch"
          value={batchId}
          onChange={setBatchId}
          options={batches.map((b) => ({ value: b.id, label: b.name }))}
        />
        <Input
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          label="Description"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          label="Due date"
          type="date"
          required
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
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
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" className="min-h-11" loading={saving}>
            {saving ? 'Saving…' : 'Add homework'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

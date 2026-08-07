'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { PlusIcon, RefreshCwIcon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'

import { TeacherPageHeader } from '@/components/teacher/teacher-page-header'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import {
  createRecording,
  deleteRecording,
  getTaughtBatches,
  listBatchRecordings,
  listCourses,
  type BatchWithSeats,
  type Recording,
} from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/error-message'
import { formatDate } from '@/lib/format'

type RecordingRow = Recording & {
  batchName: string
  courseTitle: string
}

/**
 * Teacher — Recordings
 * YouTube recorded classes across managed batches (R-05 resources not built).
 */
export default function TeacherRecordingsPage() {
  const [batches, setBatches] = useState<BatchWithSeats[] | null>(null)
  const [rows, setRows] = useState<RecordingRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [batchFilter, setBatchFilter] = useState('all')
  const [creating, setCreating] = useState(false)

  async function reload(): Promise<void> {
    try {
      const [batchList, courses] = await Promise.all([
        getTaughtBatches(),
        listCourses(1, 100),
      ])
      const courseTitleById = new Map(courses.data.map((c) => [c.id, c.title]))
      setBatches(batchList)

      const lists = await Promise.all(
        batchList.map(async (batch) => {
          const items = await listBatchRecordings(batch.id)
          return items.map(
            (rec): RecordingRow => ({
              ...rec,
              batchName: batch.name,
              courseTitle: courseTitleById.get(batch.courseId) ?? 'Course',
            }),
          )
        }),
      )

      setRows(
        lists
          .flat()
          .sort((a, b) => b.recordedFor.localeCompare(a.recordedFor)),
      )
      setError(null)
    } catch {
      setError('Recordings could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    reload().catch(() => {
      if (!cancelled) setError('Recordings could not be loaded. Try again.')
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
      if (!q) return true
      return (
        row.title.toLowerCase().includes(q) ||
        row.batchName.toLowerCase().includes(q) ||
        row.courseTitle.toLowerCase().includes(q) ||
        row.youtubeVideoId.toLowerCase().includes(q)
      )
    })
  }, [rows, query, batchFilter])

  async function handleDelete(id: string): Promise<void> {
    if (!window.confirm('Delete this recording? This cannot be undone.')) {
      return
    }
    try {
      await deleteRecording(id)
      toast.success('Recording deleted')
      await reload()
    } catch {
      toast.error('This recording could not be deleted.')
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <TeacherPageHeader
        eyebrow="Teaching"
        title="Recordings"
        description="YouTube class recordings for your batches. Notes and file resources are not in the product yet."
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
              Add recording
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="min-h-11 pl-9"
            placeholder="Search title, batch, or video id"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search recordings"
          />
        </div>
        <FilterDropdown
          className="w-full sm:w-56"
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
            No recordings yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a YouTube recording for a batch students can replay.
          </p>
        </div>
      ) : null}

      {rows && rows.length > 0 && filtered.length === 0 ? (
        <div className="rounded-xl bg-muted/50 px-6 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            No matching recordings
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search or batch filter.
          </p>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {filtered.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <h2 className="font-heading text-base font-semibold text-foreground">
                  {row.title}
                </h2>
                <p className="truncate text-sm text-muted-foreground">
                  {row.courseTitle} · {row.batchName}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  Class day {formatDate(row.recordedFor)} · Added{' '}
                  {formatDate(row.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="min-h-11"
                  render={
                    <a
                      href={`https://www.youtube.com/watch?v=${row.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  Watch
                </Button>
                <Button
                  variant="ghost"
                  className="min-h-11"
                  render={
                    <Link href={`/teacher/batches/${row.batchId}/classroom`} />
                  }
                >
                  Classroom
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
          ))}
        </ul>
      ) : null}

      {creating && batches ? (
        <CreateRecordingModal
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

function CreateRecordingModal({
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
  const [youtubeVideoId, setYoutubeVideoId] = useState('')
  const [recordedFor, setRecordedFor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!batchId || !title.trim() || !youtubeVideoId.trim() || !recordedFor) {
      setError('Choose a batch and fill in title, video id, and class day.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createRecording(batchId, {
        title: title.trim(),
        youtubeVideoId: youtubeVideoId.trim(),
        recordedFor,
      })
      toast.success('Recording added')
      onSaved()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'Recording could not be saved.')
          : 'Recording could not be saved.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Add recording">
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
        <Input
          label="YouTube video id"
          required
          value={youtubeVideoId}
          onChange={(e) => setYoutubeVideoId(e.target.value)}
          placeholder="dQw4w9WgXcQ"
        />
        <DatePicker
          label="Class day"
          required
          value={recordedFor}
          onChange={setRecordedFor}
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
            {saving ? 'Saving…' : 'Add recording'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ExternalLinkIcon,
  LinkIcon,
  RefreshCwIcon,
  SearchIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { TeacherPageHeader } from '@/components/teacher/teacher-page-header'
import { ClassLinkForm } from '@/components/batches/class-link-form'
import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getTaughtBatches,
  listCourses,
  type Batch,
  type BatchStatus,
  type BatchWithSeats,
} from '@/lib/api-client'
import { formatDate } from '@/lib/format'

const STATUS_TONE: Record<BatchStatus, 'neutral' | 'pending' | 'paid'> = {
  upcoming: 'neutral',
  enrolling: 'pending',
  running: 'paid',
  completed: 'neutral',
}

const STATUS_LABELS: Record<BatchStatus, string> = {
  upcoming: 'Upcoming',
  enrolling: 'Enrolling',
  running: 'Running',
  completed: 'Completed',
}

/**
 * Teacher — Class Links
 * Cross-batch view of join URLs. Updates use PATCH /batches/:id/class-link.
 * Last-touched uses Batch.updatedAt (any batch edit) until classLinkUpdatedAt exists.
 */
export default function TeacherClassLinksPage() {
  const [batches, setBatches] = useState<BatchWithSeats[] | null>(null)
  const [courseTitleById, setCourseTitleById] = useState<Map<string, string>>(
    () => new Map(),
  )
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [linkFilter, setLinkFilter] = useState('all')
  const [editing, setEditing] = useState<BatchWithSeats | null>(null)

  async function reload(): Promise<void> {
    try {
      const [batchList, courses] = await Promise.all([
        getTaughtBatches(),
        listCourses(1, 100),
      ])
      setBatches(batchList)
      setCourseTitleById(new Map(courses.data.map((c) => [c.id, c.title])))
      setError(null)
    } catch {
      setError('Class links could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    reload().catch(() => {
      if (!cancelled) setError('Class links could not be loaded. Try again.')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!batches) return []
    const q = query.trim().toLowerCase()
    return batches.filter((batch) => {
      if (linkFilter === 'missing' && batch.classLink) return false
      if (linkFilter === 'set' && !batch.classLink) return false
      if (!q) return true
      const course = courseTitleById.get(batch.courseId) ?? ''
      return (
        batch.name.toLowerCase().includes(q) ||
        course.toLowerCase().includes(q)
      )
    })
  }, [batches, courseTitleById, linkFilter, query])

  const missingCount = batches?.filter((b) => !b.classLink).length ?? 0

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <TeacherPageHeader
        eyebrow="Teaching"
        title="Class Links"
        description="Join URLs for your assigned batches. Students see these on their dashboard. Batch updated time is shown until a dedicated class-link timestamp ships."
        actions={
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
            placeholder="Search batch or course"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search batches"
          />
        </div>
        <FilterDropdown
          className="w-full sm:w-48"
          value={linkFilter}
          onChange={setLinkFilter}
          options={[
            { value: 'all', label: 'All links' },
            { value: 'missing', label: `Missing (${missingCount})` },
            { value: 'set', label: 'Link set' },
          ]}
        />
      </div>

      {!batches && !error ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {batches && batches.length === 0 ? (
        <EmptyState
          title="No assigned batches"
          body="Ask an admin to assign you to a batch before setting class links."
        />
      ) : null}

      {batches && batches.length > 0 && filtered.length === 0 ? (
        <EmptyState
          title="No matching batches"
          body="Try a different search or link filter."
        />
      ) : null}

      {filtered.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {filtered.map((batch) => {
            const course = courseTitleById.get(batch.courseId) ?? 'Course'
            const hasLink = Boolean(batch.classLink)
            return (
              <li
                key={batch.id}
                className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-base font-semibold text-foreground">
                      {batch.name}
                    </h2>
                    <StatusBadge
                      tone={STATUS_TONE[batch.status]}
                      label={STATUS_LABELS[batch.status]}
                    />
                    <StatusBadge
                      tone={hasLink ? 'paid' : 'pending'}
                      label={hasLink ? 'Link set' : 'Missing'}
                    />
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {course}
                  </p>
                  {hasLink ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {batch.classLink}
                    </p>
                  ) : (
                    <p className="text-xs text-status-pending">
                      Students cannot join until a link is set.
                    </p>
                  )}
                  <p className="text-xs tabular-nums text-muted-foreground">
                    Batch updated {formatDate(batch.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {hasLink ? (
                    <Button
                      variant="outline"
                      className="min-h-11"
                      render={
                        <a
                          href={batch.classLink!}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      <ExternalLinkIcon />
                      Open
                    </Button>
                  ) : null}
                  <Button
                    className="min-h-11"
                    onClick={() => setEditing(batch)}
                  >
                    <LinkIcon />
                    {hasLink ? 'Update link' : 'Set link'}
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-11"
                    render={
                      <Link href={`/teacher/batches/${batch.id}/classroom`} />
                    }
                  >
                    Classroom
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {editing ? (
        <ClassLinkModal
          batch={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setBatches((prev) =>
              prev
                ? prev.map((b) =>
                    b.id === updated.id
                      ? {
                          ...b,
                          classLink: updated.classLink,
                          classStartsAt: updated.classStartsAt,
                          classEndsAt: updated.classEndsAt,
                          updatedAt: updated.updatedAt,
                        }
                      : b,
                  )
                : prev,
            )
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-6 py-14 text-center">
      <p className="font-heading text-base font-semibold text-foreground">
        {title}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}

function ClassLinkModal({
  batch,
  onClose,
  onSaved,
}: {
  batch: BatchWithSeats
  onClose: () => void
  onSaved: (batch: BatchWithSeats) => void
}) {
  return (
    <Modal isOpen onClose={onClose} title={`Class link · ${batch.name}`}>
      <ClassLinkForm
        batchId={batch.id}
        initialLink={batch.classLink}
        initialStartsAt={batch.classStartsAt}
        initialEndsAt={batch.classEndsAt}
        onCancel={onClose}
        onSaved={(updated: Batch) => {
          toast.success('Class link saved')
          onSaved({
            ...batch,
            classLink: updated.classLink,
            classStartsAt: updated.classStartsAt,
            classEndsAt: updated.classEndsAt,
            updatedAt: updated.updatedAt,
          })
        }}
      />
    </Modal>
  )
}

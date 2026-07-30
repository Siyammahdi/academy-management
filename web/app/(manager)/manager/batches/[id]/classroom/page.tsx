'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'

import { ManagerBatchHero } from '@/components/manager/manager-batch-hero'
import { ClassLinkForm } from '@/components/batches/class-link-form'
import { HomeworkPanel } from '@/components/batches/homework-panel'
import { RecordingsPanel } from '@/components/batches/recordings-panel'
import { StatusBadge } from '@/components/money/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getBatch,
  getCourse,
  getRoster,
  type BatchWithSeats,
  type Course,
} from '@/lib/api-client'
import { formatDate } from '@/lib/format'

/**
 * Manager batch workspace — Classroom
 * Class link + schedule, homework, and recordings for an assigned batch.
 */
export default function ManagerBatchClassroomPage() {
  const params = useParams<{ id: string }>()
  const batchId = params.id

  const [batch, setBatch] = useState<BatchWithSeats | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [penaltyCount, setPenaltyCount] = useState<number | null>(null)
  const [rosterCount, setRosterCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load(): Promise<void> {
    setBusy(true)
    try {
      const [loaded, roster] = await Promise.all([
        getBatch(batchId),
        getRoster(batchId).catch(() => null),
      ])
      const loadedCourse = await getCourse(loaded.courseId)
      setBatch(loaded)
      setCourse(loadedCourse)
      if (roster) {
        setRosterCount(roster.length)
        setPenaltyCount(roster.filter((r) => r.inPenalty).length)
      }
      setError(null)
    } catch {
      setError(
        'This batch could not be loaded. You may not be assigned to it.',
      )
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    load().catch(() => {
      if (!cancelled) {
        setError(
          'This batch could not be loaded. You may not be assigned to it.',
        )
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId])

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ManagerBatchHero
        batch={batch}
        course={course}
        error={error}
        busy={busy}
        rosterCount={rosterCount}
        penaltyCount={penaltyCount}
        onRefresh={() => {
          void load()
        }}
      />

      {!batch && !error ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : null}

      {batch ? (
        <>
          <section className="rounded-xl bg-muted/50 p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-base font-semibold text-foreground">
                Class link & schedule
              </h2>
              <StatusBadge
                tone={batch.classLink ? 'paid' : 'pending'}
                label={batch.classLink ? 'Set' : 'Missing'}
              />
              <StatusBadge
                tone={
                  batch.classStartsAt && batch.classEndsAt ? 'paid' : 'pending'
                }
                label={
                  batch.classStartsAt && batch.classEndsAt
                    ? 'Scheduled'
                    : 'No schedule'
                }
              />
            </div>
            <p className="mb-1 text-sm text-muted-foreground">
              Students join from 5 minutes before start until end. Without a
              schedule, Join stays locked.
            </p>
            <p className="mb-4 text-xs tabular-nums text-muted-foreground">
              Batch updated {formatDate(batch.updatedAt)}
            </p>
            <ClassLinkForm
              batchId={batchId}
              initialLink={batch.classLink}
              initialStartsAt={batch.classStartsAt}
              initialEndsAt={batch.classEndsAt}
              onSaved={(updated) => {
                setBatch((prev) =>
                  prev
                    ? {
                        ...prev,
                        classLink: updated.classLink,
                        classStartsAt: updated.classStartsAt,
                        classEndsAt: updated.classEndsAt,
                        updatedAt: updated.updatedAt,
                      }
                    : prev,
                )
                toast.success('Class link saved')
              }}
            />
          </section>

          <HomeworkPanel batchId={batchId} />
          <RecordingsPanel batchId={batchId} />
        </>
      ) : null}
    </div>
  )
}

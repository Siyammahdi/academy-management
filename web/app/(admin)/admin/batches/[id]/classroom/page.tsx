'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'

import { AdminBatchHero } from '@/components/admin/admin-batch-hero'
import { ClassLinkForm } from '@/components/batches/class-link-form'
import { HomeworkPanel } from '@/components/batches/homework-panel'
import { RecordingsPanel } from '@/components/batches/recordings-panel'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getBatch,
  getCourse,
  type BatchWithSeats,
  type Course,
} from '@/lib/api-client'

export default function AdminBatchClassroomPage() {
  const params = useParams<{ id: string }>()
  const batchId = params.id

  const [batch, setBatch] = useState<BatchWithSeats | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load(): Promise<void> {
    setBusy(true)
    try {
      const loaded = await getBatch(batchId)
      const loadedCourse = await getCourse(loaded.courseId)
      setBatch(loaded)
      setCourse(loadedCourse)
      setError(null)
    } catch {
      setError('This batch classroom could not be loaded.')
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
        if (!cancelled) setError('This batch classroom could not be loaded.')
      })
    return () => {
      cancelled = true
    }
  }, [batchId])

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
      />

      {batch ? (
        <>
          <section className="rounded-xl bg-muted/50 p-5">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Class link & schedule
            </h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              Students can join from 5 minutes before the start time until the
              end time. Without a schedule, Join stays locked.
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
      ) : !error ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : null}
    </div>
  )
}

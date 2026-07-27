'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CopyIcon, ExternalLinkIcon } from 'lucide-react'
import { toast } from 'sonner'

import { ManagerBatchHero } from '@/components/manager/manager-batch-hero'
import { HomeworkPanel } from '@/components/batches/homework-panel'
import { RecordingsPanel } from '@/components/batches/recordings-panel'
import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import {
  getBatch,
  getCourse,
  getRoster,
  updateClassLink,
  type BatchWithSeats,
  type Course,
} from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/error-message'
import { formatDate } from '@/lib/format'

/**
 * Manager batch workspace — Classroom
 * Class link, homework, and recordings for an assigned batch.
 */
export default function ManagerBatchClassroomPage() {
  const params = useParams<{ id: string }>()
  const batchId = params.id

  const [batch, setBatch] = useState<BatchWithSeats | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [penaltyCount, setPenaltyCount] = useState<number | null>(null)
  const [rosterCount, setRosterCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [classLinkInput, setClassLinkInput] = useState('')
  const [savingClassLink, setSavingClassLink] = useState(false)
  const [classLinkError, setClassLinkError] = useState<string | null>(null)
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
      setClassLinkInput(loaded.classLink ?? '')
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

  async function handleSaveClassLink(): Promise<void> {
    const trimmed = classLinkInput.trim()
    if (!trimmed) {
      setClassLinkError('Enter a class link URL.')
      return
    }
    setClassLinkError(null)
    setSavingClassLink(true)
    try {
      const updated = await updateClassLink(batchId, trimmed)
      setBatch((prev) =>
        prev
          ? {
              ...prev,
              classLink: updated.classLink,
              updatedAt: updated.updatedAt,
            }
          : prev,
      )
      setClassLinkInput(updated.classLink ?? '')
      toast.success('Class link saved')
    } catch (err) {
      setClassLinkError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'Could not save the class link.')
          : 'Could not save the class link.',
      )
    } finally {
      setSavingClassLink(false)
    }
  }

  async function handleCopy(): Promise<void> {
    const link = classLinkInput.trim()
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy the link')
    }
  }

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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-base font-semibold text-foreground">
                    Class link
                  </h2>
                  <StatusBadge
                    tone={batch.classLink ? 'paid' : 'pending'}
                    label={batch.classLink ? 'Set' : 'Missing'}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Where students join class — Telegram, Zoom, or Meet. Teaching
                  happens off-platform; this is what they open from their
                  dashboard.
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  Batch updated {formatDate(batch.updatedAt)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Input
                  type="url"
                  label="Join URL"
                  placeholder="https://t.me/… or https://meet.google.com/…"
                  value={classLinkInput}
                  onChange={(e) => setClassLinkInput(e.target.value)}
                  error={classLinkError ?? undefined}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="min-h-11"
                  disabled={savingClassLink}
                  onClick={() => {
                    void handleSaveClassLink()
                  }}
                >
                  {savingClassLink ? 'Saving…' : 'Save link'}
                </Button>
                <Button
                  variant="secondary"
                  className="min-h-11"
                  disabled={!classLinkInput.trim()}
                  onClick={() => {
                    void handleCopy()
                  }}
                >
                  <CopyIcon />
                  Copy
                </Button>
                {classLinkInput.trim() ? (
                  <Button
                    variant="outline"
                    className="min-h-11"
                    render={
                      <a
                        href={classLinkInput.trim()}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    <ExternalLinkIcon />
                    Open
                  </Button>
                ) : null}
              </div>
            </div>
          </section>

          <HomeworkPanel batchId={batchId} />
          <RecordingsPanel batchId={batchId} />
        </>
      ) : null}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CopyIcon, ExternalLinkIcon } from 'lucide-react'
import { toast } from 'sonner'

import { AdminBatchHero } from '@/components/admin/admin-batch-hero'
import { HomeworkPanel } from '@/components/batches/homework-panel'
import { RecordingsPanel } from '@/components/batches/recordings-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import {
  getBatch,
  getCourse,
  updateClassLink,
  type BatchWithSeats,
  type Course,
} from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/error-message'

export default function AdminBatchClassroomPage() {
  const params = useParams<{ id: string }>()
  const batchId = params.id

  const [batch, setBatch] = useState<BatchWithSeats | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [classLinkInput, setClassLinkInput] = useState('')
  const [savingClassLink, setSavingClassLink] = useState(false)
  const [classLinkError, setClassLinkError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load(): Promise<void> {
    setBusy(true)
    try {
      const loaded = await getBatch(batchId)
      const loadedCourse = await getCourse(loaded.courseId)
      setBatch(loaded)
      setCourse(loadedCourse)
      setClassLinkInput(loaded.classLink ?? '')
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
        setClassLinkInput(loaded.classLink ?? '')
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

  async function handleSaveClassLink(): Promise<void> {
    setClassLinkError(null)
    setSavingClassLink(true)
    try {
      const updated = await updateClassLink(batchId, classLinkInput.trim())
      setBatch((prev) =>
        prev ? { ...prev, classLink: updated.classLink } : prev,
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
              Class link
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Where students join class — Telegram, Zoom, or Meet. Teaching
              happens off-platform; this link is what they open from their
              dashboard.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Input
                  type="url"
                  label="Class link"
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
      ) : !error ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : null}
    </div>
  )
}

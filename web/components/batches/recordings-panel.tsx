'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ApiError } from '@/lib/api'
import {
  createRecording,
  deleteRecording,
  listBatchRecordings,
  updateRecording,
  type Recording,
} from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/error-message'
import { formatDate } from '@/lib/format'

function isoToDateInput(iso: string): string {
  return iso.slice(0, 10)
}

interface RecordingFormState {
  title: string
  youtubeVideoId: string
  recordedFor: string
}

function emptyForm(): RecordingFormState {
  return { title: '', youtubeVideoId: '', recordedFor: '' }
}

function recordingToForm(rec: Recording): RecordingFormState {
  return {
    title: rec.title,
    youtubeVideoId: rec.youtubeVideoId,
    recordedFor: isoToDateInput(rec.recordedFor),
  }
}

export function RecordingsPanel({ batchId }: { batchId: string }) {
  const [items, setItems] = useState<Recording[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Recording | 'new' | null>(null)

  async function reload(): Promise<void> {
    try {
      setItems(await listBatchRecordings(batchId))
      setError(null)
    } catch {
      setError('Recordings could not be loaded.')
    }
  }

  useEffect(() => {
    let cancelled = false
    listBatchRecordings(batchId)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch(() => {
        if (!cancelled) setError('Recordings could not be loaded.')
      })
    return () => {
      cancelled = true
    }
  }, [batchId])

  async function handleDelete(id: string): Promise<void> {
    if (!window.confirm('Delete this recording? This cannot be undone.')) {
      return
    }
    try {
      await deleteRecording(id)
      toast.success('Recording deleted')
      await reload()
    } catch {
      setError('This recording could not be deleted. Try again.')
    }
  }

  return (
    <section className="rounded-xl bg-muted/50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">
            Recorded classes
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            YouTube recordings students can replay from their dashboard.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-11"
          onClick={() => setEditing('new')}
        >
          Add recording
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-status-overdue" role="alert">
          {error}
        </p>
      ) : null}

      {items && items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No recordings added yet.
        </p>
      ) : null}

      {items && items.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {items.map((rec) => (
            <li
              key={rec.id}
              className="rounded-lg bg-background/80 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{rec.title}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  Recorded {formatDate(rec.recordedFor)}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                youtu.be/{rec.youtubeVideoId}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11"
                  onClick={() => setEditing(rec)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="min-h-11"
                  onClick={() => {
                    void handleDelete(rec.id)
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!items ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : null}

      {editing ? (
        <RecordingFormModal
          batchId={batchId}
          recording={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void reload()
          }}
        />
      ) : null}
    </section>
  )
}

function RecordingFormModal({
  batchId,
  recording,
  onClose,
  onSaved,
}: {
  batchId: string
  recording: Recording | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<RecordingFormState>(
    recording ? recordingToForm(recording) : emptyForm(),
  )
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setError(null)

    if (
      !form.title.trim() ||
      !form.youtubeVideoId.trim() ||
      !form.recordedFor
    ) {
      setError('Fill in a title, a YouTube link or id, and the class date.')
      return
    }

    setIsSubmitting(true)
    try {
      if (recording) {
        await updateRecording(recording.id, form)
      } else {
        await createRecording(batchId, form)
      }
      toast.success(recording ? 'Recording saved' : 'Recording added')
      onSaved()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'This recording could not be saved.')
          : 'This recording could not be saved.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={recording ? 'Edit recording' : 'Add recording'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Title"
          required
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
        />
        <Input
          label="YouTube link or video id"
          required
          placeholder="https://youtu.be/... or https://www.youtube.com/watch?v=..."
          value={form.youtubeVideoId}
          onChange={(e) =>
            setForm((p) => ({ ...p, youtubeVideoId: e.target.value }))
          }
        />
        <Input
          label="Class date"
          type="date"
          required
          value={form.recordedFor}
          onChange={(e) =>
            setForm((p) => ({ ...p, recordedFor: e.target.value }))
          }
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
          <Button type="submit" className="min-h-11" disabled={isSubmitting}>
            {isSubmitting
              ? 'Saving…'
              : recording
                ? 'Save changes'
                : 'Add recording'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'

import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api'
import {
  createHomework,
  deleteHomework,
  listBatchHomework,
  updateHomework,
  type Homework,
} from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/error-message'
import { formatDate } from '@/lib/format'
import { isDueToday, isPastDue } from '@/lib/homework-status'

function isoToDateInput(iso: string): string {
  return iso.slice(0, 10)
}

interface HomeworkFormState {
  title: string
  description: string
  dueDate: string
}

function emptyForm(): HomeworkFormState {
  return { title: '', description: '', dueDate: '' }
}

function homeworkToForm(hw: Homework): HomeworkFormState {
  return {
    title: hw.title,
    description: hw.description,
    dueDate: isoToDateInput(hw.dueDate),
  }
}

export function HomeworkPanel({ batchId }: { batchId: string }) {
  const [items, setItems] = useState<Homework[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Homework | 'new' | null>(null)

  async function reload(): Promise<void> {
    try {
      setItems(await listBatchHomework(batchId))
      setError(null)
    } catch {
      setError('Homework could not be loaded.')
    }
  }

  useEffect(() => {
    let cancelled = false
    listBatchHomework(batchId)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch(() => {
        if (!cancelled) setError('Homework could not be loaded.')
      })
    return () => {
      cancelled = true
    }
  }, [batchId])

  async function handleDelete(id: string): Promise<void> {
    if (!window.confirm('Delete this homework item? This cannot be undone.')) {
      return
    }
    try {
      await deleteHomework(id)
      toast.success('Homework deleted')
      await reload()
    } catch {
      setError('This item could not be deleted. Try again.')
    }
  }

  return (
    <section className="rounded-xl bg-muted/50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">
            Homework
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Assignments for this batch — due dates end of day Asia/Dhaka.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-11"
          onClick={() => setEditing('new')}
        >
          Add homework
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-status-overdue" role="alert">
          {error}
        </p>
      ) : null}

      {items && items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No homework assigned yet.
        </p>
      ) : null}

      {items && items.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {items.map((hw) => {
            const pastDue = isPastDue(hw.dueDate)
            const today = isDueToday(hw.dueDate)
            return (
              <li
                key={hw.id}
                className="rounded-lg bg-background/80 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{hw.title}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      tone={pastDue ? 'overdue' : today ? 'pending' : 'neutral'}
                      label={
                        pastDue ? 'Past due' : today ? 'Due today' : 'Upcoming'
                      }
                    />
                    <span className="text-xs tabular-nums text-muted-foreground">
                      Due {formatDate(hw.dueDate)}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hw.description}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-11"
                    onClick={() => setEditing(hw)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="min-h-11"
                    onClick={() => {
                      void handleDelete(hw.id)
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

      {!items ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : null}

      {editing ? (
        <HomeworkFormModal
          batchId={batchId}
          homework={editing === 'new' ? null : editing}
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

function HomeworkFormModal({
  batchId,
  homework,
  onClose,
  onSaved,
}: {
  batchId: string
  homework: Homework | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<HomeworkFormState>(
    homework ? homeworkToForm(homework) : emptyForm(),
  )
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setError(null)

    if (!form.title.trim() || !form.description.trim() || !form.dueDate) {
      setError('Fill in a title, description, and due date.')
      return
    }

    setIsSubmitting(true)
    try {
      if (homework) {
        await updateHomework(homework.id, form)
      } else {
        await createHomework(batchId, form)
      }
      toast.success(homework ? 'Homework saved' : 'Homework added')
      onSaved()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'This homework could not be saved.')
          : 'This homework could not be saved.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={homework ? 'Edit homework' : 'Add homework'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Title"
          required
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
        />
        <Textarea
          label="Description"
          required
          value={form.description}
          onChange={(e) =>
            setForm((p) => ({ ...p, description: e.target.value }))
          }
        />
        <Input
          label="Due date"
          type="date"
          required
          value={form.dueDate}
          onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
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
          <Button type="submit" className="min-h-11" loading={isSubmitting}>
            {isSubmitting
              ? 'Saving…'
              : homework
                ? 'Save changes'
                : 'Add homework'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

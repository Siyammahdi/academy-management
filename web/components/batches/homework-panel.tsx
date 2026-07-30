'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { FileTextIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { toast } from 'sonner'

import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  RichTextEditor,
  RichTextHtml,
} from '@/components/ui/rich-text-editor'
import { ApiError } from '@/lib/api'
import {
  createHomework,
  deleteHomework,
  homeworkPdfUrl,
  listBatchHomework,
  updateHomework,
  type Homework,
  type HomeworkPdfInput,
} from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/error-message'
import { formatDate } from '@/lib/format'
import { isDueToday, isPastDue } from '@/lib/homework-status'
import { getAccessToken } from '@/lib/session'

const PDF_MAX_BYTES = 5 * 1024 * 1024

function isoToDateInput(iso: string): string {
  return iso.slice(0, 10)
}

async function fileToPdf(file: File): Promise<HomeworkPdfInput> {
  if (file.type !== 'application/pdf') {
    throw new Error('Attach a PDF file.')
  }
  if (file.size > PDF_MAX_BYTES) {
    throw new Error('PDF must be 5 MB or smaller.')
  }
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return { mimeType: 'application/pdf', data: btoa(binary) }
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

function descriptionIsEmpty(html: string): boolean {
  return html.replace(/<[^>]+>/g, '').trim().length === 0
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
            Rich-text assignments with an optional PDF worksheet. Due dates end
            of day Asia/Dhaka.
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
                    {hw.hasPdf ? (
                      <StatusBadge tone="neutral" label="PDF" />
                    ) : null}
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
                <RichTextHtml html={hw.description} className="mt-2" />
                {hw.hasPdf ? (
                  <a
                    href={homeworkPdfUrl(hw.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary-strong"
                    onClick={(e) => {
                      const token = getAccessToken()
                      if (!token) return
                      e.preventDefault()
                      void fetch(homeworkPdfUrl(hw.id), {
                        headers: { Authorization: `Bearer ${token}` },
                      })
                        .then((r) => r.blob())
                        .then((blob) => {
                          const url = URL.createObjectURL(blob)
                          window.open(url, '_blank', 'noopener,noreferrer')
                        })
                    }}
                  >
                    <FileTextIcon className="size-4" />
                    Open PDF
                  </a>
                ) : null}
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
  const fileInputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<HomeworkFormState>(
    homework ? homeworkToForm(homework) : emptyForm(),
  )
  const [pdf, setPdf] = useState<HomeworkPdfInput | null>(null)
  const [pdfName, setPdfName] = useState<string | null>(null)
  const [clearPdf, setClearPdf] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setError(null)

    if (
      !form.title.trim() ||
      descriptionIsEmpty(form.description) ||
      !form.dueDate
    ) {
      setError('Fill in a title, description, and due date.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description,
        dueDate: form.dueDate,
        ...(pdf ? { pdf } : {}),
      }
      if (homework) {
        await updateHomework(homework.id, {
          ...payload,
          ...(clearPdf && !pdf ? { clearPdf: true } : {}),
        })
      } else {
        await createHomework(batchId, payload)
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
        <RichTextEditor
          label="Description"
          value={form.description}
          onChange={(description) => setForm((p) => ({ ...p, description }))}
        />
        <DatePicker
          label="Due date"
          required
          value={form.dueDate}
          onChange={(dueDate) => setForm((p) => ({ ...p, dueDate }))}
        />

        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">
            PDF worksheet (optional)
          </span>
          <input
            ref={fileRef}
            id={fileInputId}
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              void fileToPdf(file)
                .then((next) => {
                  setPdf(next)
                  setPdfName(file.name)
                  setClearPdf(false)
                  setError(null)
                })
                .catch((err: unknown) => {
                  setError(
                    err instanceof Error ? err.message : 'Could not read PDF.',
                  )
                })
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              onClick={() => fileRef.current?.click()}
            >
              <UploadIcon />
              {pdfName || (homework?.hasPdf && !clearPdf)
                ? 'Replace PDF'
                : 'Upload PDF'}
            </Button>
            {pdfName || (homework?.hasPdf && !clearPdf) ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                onClick={() => {
                  setPdf(null)
                  setPdfName(null)
                  if (homework?.hasPdf) setClearPdf(true)
                }}
              >
                <Trash2Icon />
                Remove
              </Button>
            ) : null}
          </div>
          {pdfName ? (
            <p className="text-xs text-muted-foreground">{pdfName}</p>
          ) : homework?.hasPdf && !clearPdf ? (
            <p className="text-xs text-muted-foreground">
              A PDF is already attached.
            </p>
          ) : null}
        </div>

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

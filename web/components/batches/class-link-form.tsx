'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api'
import { updateClassLink, type Batch } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/error-message'
import { formatDate } from '@/lib/format'

function isoToDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function dateTimeLocalToIso(value: string): string {
  return new Date(value).toISOString()
}

/**
 * Teacher/admin form: class URL + optional session window. Join opens
 * 5 minutes before start and closes at end (student UI).
 */
export function ClassLinkForm({
  batchId,
  initialLink,
  initialStartsAt,
  initialEndsAt,
  onSaved,
  onCancel,
}: {
  batchId: string
  initialLink: string | null
  initialStartsAt: string | null
  initialEndsAt: string | null
  onSaved: (batch: Batch) => void
  onCancel?: () => void
}) {
  const [link, setLink] = useState(initialLink ?? '')
  const [startsAt, setStartsAt] = useState(isoToDateTimeLocal(initialStartsAt))
  const [endsAt, setEndsAt] = useState(isoToDateTimeLocal(initialEndsAt))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const trimmed = link.trim()
    if (!trimmed) {
      setError('Enter a class link URL.')
      return
    }

    const hasStart = startsAt.trim().length > 0
    const hasEnd = endsAt.trim().length > 0
    if (hasStart !== hasEnd) {
      setError('Set both start and end time, or clear both.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const hadSchedule = Boolean(initialStartsAt && initialEndsAt)
      const clearSchedule = hadSchedule && !hasStart && !hasEnd
      const updated = await updateClassLink(batchId, {
        classLink: trimmed,
        ...(hasStart && hasEnd
          ? {
              classStartsAt: dateTimeLocalToIso(startsAt),
              classEndsAt: dateTimeLocalToIso(endsAt),
            }
          : clearSchedule
            ? { clearSchedule: true }
            : {}),
      })
      onSaved(updated)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'Class link could not be saved.')
          : 'Class link could not be saved.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Class link</span>
        <Input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://…"
          className="min-h-11"
          required
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <DateTimePicker
          label="Class starts"
          value={startsAt}
          onChange={setStartsAt}
          placeholder="Pick start"
          allowClear
        />
        <DateTimePicker
          label="Class ends"
          value={endsAt}
          onChange={setEndsAt}
          placeholder="Pick end"
          allowClear
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Students can join from 5 minutes before start until end. Leave times
        empty if the schedule is not set yet
        {initialStartsAt
          ? ` (current start ${formatDate(initialStartsAt)})`
          : ''}
        .
      </p>

      {error ? (
        <p role="alert" className="text-sm text-status-overdue">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="submit" className="min-h-11" disabled={saving}>
          {saving ? 'Saving…' : 'Save class link'}
        </Button>
      </div>
    </form>
  )
}

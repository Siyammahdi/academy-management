'use client'

import { useEffect, useState } from 'react'
import { RefreshCwIcon } from 'lucide-react'

import { RecordingsTimeline } from '@/components/student/recordings-timeline'
import { StudentPageHeader } from '@/components/student/student-page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  listMyRecordings,
  type RecordingWithContext,
} from '@/lib/api-client'

/**
 * Student — Recordings
 * YouTube class replays from GET /me/recordings (grouped by Dhaka class day).
 */
export default function StudentRecordingsPage() {
  const [items, setItems] = useState<RecordingWithContext[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload(): Promise<void> {
    try {
      setItems(await listMyRecordings())
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

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <StudentPageHeader
        eyebrow="Learning"
        title="Recordings"
        description="Recorded classes for your enrollments, organised by class day. Notes and file resources are not in the product yet."
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

      {!items && !error ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : null}

      {items ? <RecordingsTimeline items={items} /> : null}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { SearchIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ApiError } from '@/lib/api'
import {
  assignTeacher,
  listUsers,
  removeTeacher,
  type BatchTeacherSummary,
  type UserSummary,
} from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/error-message'

function teacherLabel(user: { email: string; fullName?: string | null }): string {
  if (user.fullName?.trim()) {
    return `${user.fullName.trim()} · ${user.email}`
  }
  return user.email
}

/**
 * Searchable teacher assigner — matches email or linked student name via
 * GET /users?role=teacher&q=.
 */
export function AssignTeachersPanel({
  batchId,
  teachers,
  onChanged,
}: {
  batchId: string
  teachers: BatchTeacherSummary[]
  onChanged: () => Promise<void> | void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSummary[] | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [loadingList, setLoadingList] = useState(false)

  useEffect(() => {
    let cancelled = false
    const handle = window.setTimeout(() => {
      setLoadingList(true)
      listUsers('teacher', query.trim() || undefined)
        .then((users) => {
          if (!cancelled) setResults(users)
        })
        .catch(() => {
          if (!cancelled) setError('Teachers could not be loaded.')
        })
        .finally(() => {
          if (!cancelled) setLoadingList(false)
        })
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [query])

  const assignable = useMemo(() => {
    const assigned = new Set(teachers.map((m) => m.userId))
    return (results ?? []).filter((u) => !assigned.has(u.id))
  }, [teachers, results])

  const selected = assignable.find((u) => u.id === selectedUserId) ?? null

  async function handleAssign(): Promise<void> {
    if (!selectedUserId) return
    setError(null)
    setIsBusy(true)
    try {
      await assignTeacher(batchId, selectedUserId)
      setSelectedUserId(null)
      setQuery('')
      await onChanged()
      toast.success('Teacher assigned')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'This teacher could not be assigned.')
          : 'This teacher could not be assigned.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  async function handleRemove(userId: string): Promise<void> {
    setError(null)
    setIsBusy(true)
    try {
      await removeTeacher(batchId, userId)
      await onChanged()
      toast.success('Teacher removed')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'This teacher could not be removed.')
          : 'This teacher could not be removed.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {teachers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No teachers assigned yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {teachers.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm text-foreground">
                {teacherLabel(m)}
              </span>
              <Button
                variant="destructive"
                size="sm"
                className="min-h-11 shrink-0"
                disabled={isBusy}
                onClick={() => {
                  void handleRemove(m.userId)
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 border-t border-border pt-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">
            Find a teacher
          </span>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedUserId(null)
              }}
              placeholder="Search by name or email"
              className="min-h-11 pl-9"
              aria-label="Search teachers by name or email"
            />
          </div>
        </label>

        <ScrollArea className="h-48 rounded-lg border border-border">
          {loadingList && !results ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {results && assignable.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              {query.trim()
                ? 'No matching teachers.'
                : 'All teachers are already assigned, or none exist yet.'}
            </p>
          ) : null}
          {assignable.map((user) => {
            const active = user.id === selectedUserId
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUserId(user.id)}
                className={
                  active
                    ? 'flex w-full flex-col items-start gap-0.5 bg-primary-wash px-3 py-2.5 text-left'
                    : 'flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-muted/60'
                }
              >
                <span className="text-sm font-medium text-foreground">
                  {user.fullName?.trim() || user.email}
                </span>
                {user.fullName?.trim() ? (
                  <span className="text-xs text-muted-foreground">
                    {user.email}
                  </span>
                ) : null}
              </button>
            )
          })}
        </ScrollArea>

        <Button
          className="min-h-11 w-full sm:w-auto"
          disabled={isBusy || !selected}
          onClick={() => {
            void handleAssign()
          }}
        >
          {isBusy ? 'Assigning…' : selected ? `Assign ${selected.fullName?.trim() || selected.email}` : 'Assign selected'}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-status-overdue">
          {error}
        </p>
      ) : null}
    </div>
  )
}

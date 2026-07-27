'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  LayersIcon,
  RefreshCwIcon,
  SearchIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getBatch,
  listBatches,
  listUsers,
  type BatchWithSeats,
  type UserSummary,
} from '@/lib/api-client'

interface ManagerRow {
  user: UserSummary
  batches: Array<{ id: string; name: string; courseTitle?: string }>
}

async function loadManagers(): Promise<ManagerRow[]> {
  const [users, batchesPage] = await Promise.all([
    listUsers('manager'),
    listBatches({ page: 1, limit: 100 }),
  ])

  const active = batchesPage.data.filter((b) => b.status !== 'completed')
  const detailed: BatchWithSeats[] = await Promise.all(
    active.map((b) => getBatch(b.id)),
  )

  return users.map((user) => ({
    user,
    batches: detailed
      .filter((batch) => batch.managers.some((m) => m.userId === user.id))
      .map((batch) => ({ id: batch.id, name: batch.name })),
  }))
}

export default function AdminManagersPage() {
  const [rows, setRows] = useState<ManagerRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  async function reload(): Promise<void> {
    try {
      setRows(await loadManagers())
      setError(null)
    } catch {
      setError('Managers could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    loadManagers()
      .then((next) => {
        if (!cancelled) {
          setRows(next)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Managers could not be loaded. Try again.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (row) =>
        row.user.email.toLowerCase().includes(q) ||
        row.batches.some((b) => b.name.toLowerCase().includes(q)),
    )
  }, [rows, query])

  const assignedCount = rows?.filter((r) => r.batches.length > 0).length ?? 0
  const unassignedCount = rows ? rows.length - assignedCount : 0

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminPageHeader
        eyebrow="Academy"
        title="Managers"
        description="People who can verify payments and run classrooms on assigned batches. Assign or remove them from a batch — granting the manager role still happens outside this UI."
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

      {rows ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-primary p-4 text-primary-foreground">
            <p className="text-xs text-primary-foreground/75">Managers</p>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
              {rows.length}
            </p>
          </div>
          <div className="rounded-xl bg-status-paid-bg p-4">
            <p className="text-xs text-muted-foreground">On a batch</p>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground">
              {assignedCount}
            </p>
          </div>
          <div className="col-span-2 rounded-xl bg-status-pending-bg p-4 sm:col-span-1">
            <p className="text-xs text-muted-foreground">Unassigned</p>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground">
              {unassignedCount}
            </p>
          </div>
        </div>
      ) : null}

      <div className="relative min-w-0">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email or batch"
          className="min-h-11 pl-9"
          aria-label="Search managers"
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      {!rows && !error ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {rows && filtered.length === 0 ? (
        <div className="rounded-xl bg-primary-wash px-5 py-12 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            {rows.length === 0 ? 'No managers yet' : 'No matches'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {rows.length === 0
              ? 'Users with the manager role appear here. Role assignment is not in the API yet — grant the role in ops, then assign them on a batch.'
              : 'Try a different email or batch name.'}
          </p>
          <Button
            className="mt-4 min-h-11"
            render={<Link href="/admin/batches" />}
          >
            <LayersIcon />
            Open batches
          </Button>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <ul className="flex min-w-0 flex-col gap-2">
          {filtered.map(({ user, batches }) => (
            <li
              key={user.id}
              className="rounded-xl bg-muted/60 px-4 py-4 sm:px-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary-wash text-primary-strong">
                      <UsersIcon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.roles.join(' · ')}
                      </p>
                    </div>
                    {batches.length === 0 ? (
                      <StatusBadge tone="pending" label="Unassigned" />
                    ) : (
                      <StatusBadge
                        tone="paid"
                        label={`${batches.length} batch${batches.length === 1 ? '' : 'es'}`}
                      />
                    )}
                  </div>

                  {batches.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Not on any active batch in the current catalog sample.
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-1.5">
                      {batches.map((batch) => (
                        <li key={batch.id}>
                          <Link
                            href={`/admin/batches/${batch.id}`}
                            className="inline-flex rounded-md bg-primary-wash px-2.5 py-1 text-xs font-medium text-primary-strong"
                          >
                            {batch.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  className="min-h-11 shrink-0"
                  render={<Link href="/admin/batches" />}
                >
                  <UserPlusIcon />
                  Assign on batch
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Assignment uses existing batch manager endpoints. Creating or revoking
        the manager role itself requires a role-management API that is not
        built yet.
      </p>
    </div>
  )
}

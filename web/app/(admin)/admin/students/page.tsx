'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LayersIcon,
  RefreshCwIcon,
  SearchIcon,
  UsersIcon,
} from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { StatusBadge } from '@/components/money/status-badge'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import {
  getStudentCount,
  listBatches,
  listStudents,
  type Batch,
  type StudentListItem,
} from '@/lib/api-client'

const PAGE_SIZE = 20

export default function AdminStudentsPage() {
  const [count, setCount] = useState<number | null>(null)
  const [students, setStudents] = useState<StudentListItem[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active')
  const [batches, setBatches] = useState<Batch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function fetchDirectory(
    nextPage: number,
    nextQuery: string,
    nextStatus: 'active' | 'inactive' | 'all',
  ) {
    const [countResult, listResult, batchesPage] = await Promise.all([
      getStudentCount(),
      listStudents({
        page: nextPage,
        limit: PAGE_SIZE,
        q: nextQuery || undefined,
        status: nextStatus === 'all' ? undefined : nextStatus,
      }),
      listBatches({ page: 1, limit: 12 }),
    ])
    return {
      count: countResult.count,
      students: listResult.data,
      total: listResult.meta.total,
      totalPages: Math.max(1, listResult.meta.totalPages),
      page: listResult.meta.page,
      batches: batchesPage.data,
    }
  }

  function applyDirectory(next: Awaited<ReturnType<typeof fetchDirectory>>) {
    setCount(next.count)
    setStudents(next.students)
    setTotal(next.total)
    setTotalPages(next.totalPages)
    setPage(next.page)
    setBatches(next.batches)
    setError(null)
  }

  async function loadDirectory(
    nextPage: number,
    nextQuery: string,
    nextStatus: 'active' | 'inactive' | 'all',
  ): Promise<void> {
    setBusy(true)
    try {
      applyDirectory(await fetchDirectory(nextPage, nextQuery, nextStatus))
    } catch {
      setError('Students could not be loaded. Try again.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    fetchDirectory(1, '', 'active')
      .then((next) => {
        if (cancelled) return
        setCount(next.count)
        setStudents(next.students)
        setTotal(next.total)
        setTotalPages(next.totalPages)
        setPage(next.page)
        setBatches(next.batches)
        setError(null)
      })
      .catch(() => {
        if (!cancelled) setError('Students could not be loaded. Try again.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  function applySearch(): void {
    setAppliedQuery(query.trim())
    void loadDirectory(1, query.trim(), status)
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminPageHeader
        eyebrow="Academy"
        title="Students"
        description="Academy student profiles — search by ANA id, name, phone, or email. Open a batch roster to manage enrollments on a specific class."
        actions={
          <Button
            variant="outline"
            className="min-h-11"
            disabled={busy}
            onClick={() => {
              void loadDirectory(page, appliedQuery, status)
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-primary p-4 text-primary-foreground sm:col-span-1">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-4 opacity-80" />
            <p className="text-xs text-primary-foreground/75">All profiles</p>
          </div>
          <p className="mt-2 font-heading text-3xl font-semibold tabular-nums">
            {count ?? '—'}
          </p>
        </div>
        <div className="rounded-xl bg-muted/60 p-4">
          <p className="text-xs text-muted-foreground">Showing</p>
          <p className="mt-2 font-heading text-3xl font-semibold tabular-nums text-foreground">
            {total}
          </p>
        </div>
        <div className="col-span-2 rounded-xl bg-primary-wash p-4 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Page</p>
          <p className="mt-2 font-heading text-3xl font-semibold tabular-nums text-primary-strong">
            {page}
            <span className="text-base font-medium text-muted-foreground">
              {' '}
              / {totalPages}
            </span>
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch()
            }}
            placeholder="Search ANA id, name, phone, or email"
            className="min-h-11 pl-9"
            aria-label="Search students"
          />
        </div>
        <FilterDropdown
          label="Status"
          value={status}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          onChange={(value) => {
            const next = value as 'active' | 'inactive' | 'all'
            setStatus(next)
            void loadDirectory(1, appliedQuery, next)
          }}
          className="sm:w-40"
        />
        <Button className="min-h-11" onClick={applySearch} disabled={busy}>
          Search
        </Button>
      </div>

      {!students && !error ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {students && students.length === 0 ? (
        <div className="rounded-xl bg-primary-wash px-5 py-12 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            No students found
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {appliedQuery
              ? 'Try a different search or clear the status filter.'
              : 'Student profiles appear here after registration.'}
          </p>
        </div>
      ) : null}

      {students && students.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {students.map((student) => (
            <li
              key={student.id}
              className="rounded-xl bg-muted/60 px-4 py-4 sm:px-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {student.fullName}
                    </p>
                    <StatusBadge
                      tone={student.status === 'active' ? 'paid' : 'neutral'}
                      label={student.status === 'active' ? 'Active' : 'Inactive'}
                    />
                    <span className="rounded-md bg-background/80 px-2 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                      {student.studentId}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {student.phone}
                    {student.email ? ` · ${student.email}` : ' · No login'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Joined {formatDate(student.createdAt)} ·{' '}
                    {student.activeEnrollments} active enrollment
                    {student.activeEnrollments === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {students && totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            className="min-h-11"
            disabled={busy || page <= 1}
            onClick={() => {
              void loadDirectory(page - 1, appliedQuery, status)
            }}
          >
            Previous
          </Button>
          <p className="text-sm tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <Button
            variant="secondary"
            className="min-h-11"
            disabled={busy || page >= totalPages}
            onClick={() => {
              void loadDirectory(page + 1, appliedQuery, status)
            }}
          >
            Next
          </Button>
        </div>
      ) : null}

      <section className="rounded-xl bg-muted/50 p-5">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Enrollment actions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Late joiners and withdrawals happen on a batch roster — pick a batch
          below.
        </p>
        {batches.length === 0 ? (
          <Button
            className="mt-4 min-h-11"
            render={<Link href="/admin/batches" />}
          >
            <LayersIcon />
            Browse batches
          </Button>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {batches.slice(0, 8).map((batch) => (
              <li key={batch.id}>
                <Button
                  size="sm"
                  variant="secondary"
                  className="min-h-11"
                  render={<Link href={`/admin/batches/${batch.id}`} />}
                >
                  {batch.name}
                </Button>
              </li>
            ))}
            <li>
              <Button
                size="sm"
                variant="ghost"
                className="min-h-11"
                render={<Link href="/admin/batches" />}
              >
                All batches
              </Button>
            </li>
          </ul>
        )}
      </section>
    </div>
  )
}

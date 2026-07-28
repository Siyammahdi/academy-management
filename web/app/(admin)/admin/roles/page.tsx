'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldIcon,
  UsersIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { StatusBadge } from '@/components/money/status-badge'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import { getMe, type AuthUser } from '@/lib/auth'
import { apiErrorMessage } from '@/lib/error-message'
import { formatDate } from '@/lib/format'
import {
  assignUserRole,
  createUser,
  listUsers,
  removeUserRole,
  type RoleName,
  type UserSummary,
} from '@/lib/api-client'
import { cn } from '@/lib/utils'

const ALL_ROLES: RoleName[] = ['admin', 'manager', 'student']

const ROLE_LABELS: Record<RoleName, string> = {
  admin: 'Super Admin',
  manager: 'Course Manager',
  student: 'Student',
}

const ROLE_TONE: Record<RoleName, 'paid' | 'pending' | 'neutral'> = {
  admin: 'paid',
  manager: 'pending',
  student: 'neutral',
}

const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: 'All roles' },
  { value: 'admin', label: 'Admins' },
  { value: 'manager', label: 'Managers' },
  { value: 'student', label: 'Students' },
]

function roleErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.body.error === 'LAST_ADMIN') {
      return 'At least one admin must remain.'
    }
    if (err.body.error === 'CANNOT_STRIP_OWN_ADMIN') {
      return 'You cannot remove your own admin role.'
    }
    if (err.body.error === 'EMAIL_ALREADY_REGISTERED') {
      return 'That email is already registered.'
    }
    if (err.body.error === 'CONFLICT') {
      return 'That role is already assigned.'
    }
    if (err.body.error === 'NOT_FOUND') {
      return 'User or role was not found.'
    }
    return apiErrorMessage(err.body, fallback)
  }
  return fallback
}

interface CreateFormState {
  email: string
  password: string
  roles: RoleName[]
  fullName: string
  phone: string
}

function emptyCreateForm(): CreateFormState {
  return {
    email: '',
    password: '',
    roles: ['manager'],
    fullName: '',
    phone: '',
  }
}

export default function AdminRolesPage() {
  const [me, setMe] = useState<AuthUser | null>(null)
  const [users, setUsers] = useState<UserSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createBusy, setCreateBusy] = useState(false)

  async function load(
    nextQuery = appliedQuery,
    nextRole = roleFilter,
  ): Promise<void> {
    try {
      const roleParam = nextRole === 'all' ? undefined : nextRole
      const [meResult, list] = await Promise.all([
        getMe(),
        listUsers(roleParam, nextQuery || undefined),
      ])
      setMe(meResult)
      setUsers(list)
      setError(null)
    } catch {
      setError('Users could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([getMe(), listUsers()])
      .then(([meResult, list]) => {
        if (cancelled) return
        setMe(meResult)
        setUsers(list)
        setError(null)
      })
      .catch(() => {
        if (!cancelled) setError('Users could not be loaded. Try again.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filteredLocal = useMemo(() => {
    if (!users) return []
    const q = query.trim().toLowerCase()
    if (!q || q === appliedQuery.toLowerCase()) return users
    return users.filter((u) => u.email.toLowerCase().includes(q))
  }, [users, query, appliedQuery])

  const counts = useMemo(() => {
    const rows = users ?? []
    return {
      total: rows.length,
      admin: rows.filter((u) => u.roles.includes('admin')).length,
      manager: rows.filter((u) => u.roles.includes('manager')).length,
      student: rows.filter((u) => u.roles.includes('student')).length,
    }
  }, [users])

  function applySearch(): void {
    const next = query.trim()
    setAppliedQuery(next)
    void load(next, roleFilter)
  }

  function toggleCreateRole(role: RoleName): void {
    setCreateForm((prev) => {
      const has = prev.roles.includes(role)
      const roles = has
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role]
      return { ...prev, roles }
    })
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setCreateError(null)

    if (createForm.roles.length === 0) {
      setCreateError('Select at least one role.')
      return
    }
    if (createForm.password.length < 8) {
      setCreateError('Password must be at least 8 characters.')
      return
    }
    if (
      createForm.roles.includes('student') &&
      (!createForm.fullName.trim() || !createForm.phone.trim())
    ) {
      setCreateError('Name and phone are required for a student account.')
      return
    }

    setCreateBusy(true)
    try {
      const created = await createUser({
        email: createForm.email.trim(),
        password: createForm.password,
        roles: createForm.roles,
        fullName: createForm.roles.includes('student')
          ? createForm.fullName.trim()
          : undefined,
        phone: createForm.roles.includes('student')
          ? createForm.phone.trim()
          : undefined,
      })
      setUsers((prev) => {
        if (!prev) return [created]
        const without = prev.filter((u) => u.id !== created.id)
        return [...without, created].sort((a, b) =>
          a.email.localeCompare(b.email),
        )
      })
      setCreateOpen(false)
      setCreateForm(emptyCreateForm())
      toast.success(`Created ${created.email}`)
    } catch (err) {
      setCreateError(
        roleErrorMessage(err, 'This user could not be created. Try again.'),
      )
    } finally {
      setCreateBusy(false)
    }
  }

  async function toggleRole(
    user: UserSummary,
    role: RoleName,
    hasRole: boolean,
  ): Promise<void> {
    const key = `${user.id}:${role}`
    setBusyKey(key)
    try {
      const updated = hasRole
        ? await removeUserRole(user.id, role)
        : await assignUserRole(user.id, role)
      setUsers((prev) =>
        prev
          ? prev.map((row) => (row.id === updated.id ? updated : row))
          : prev,
      )
      toast.success(
        hasRole
          ? `${ROLE_LABELS[role]} removed from ${user.email}`
          : `${ROLE_LABELS[role]} granted to ${user.email}`,
      )
    } catch (err) {
      toast.error(
        roleErrorMessage(
          err,
          hasRole
            ? 'This role could not be removed.'
            : 'This role could not be assigned.',
        ),
      )
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminPageHeader
        eyebrow="Workspace"
        title="Roles"
        description="Create accounts and grant or revoke admin, manager, and student. A user may hold several roles at once. Changes are audited."
        actions={
          <>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                void load()
              }}
            >
              <RefreshCwIcon />
              Refresh
            </Button>
            <Button
              className="min-h-11"
              onClick={() => {
                setCreateError(null)
                setCreateForm(emptyCreateForm())
                setCreateOpen(true)
              }}
            >
              <PlusIcon />
              New user
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-primary p-4 text-primary-foreground">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-4 opacity-80" />
            <p className="text-xs text-primary-foreground/75">Users</p>
          </div>
          <p className="mt-2 font-heading text-3xl font-semibold tabular-nums">
            {users ? counts.total : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-status-paid-bg p-4">
          <p className="text-xs text-status-paid">Admins</p>
          <p className="mt-2 font-heading text-3xl font-semibold tabular-nums text-status-paid">
            {users ? counts.admin : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-status-pending-bg p-4">
          <p className="text-xs text-status-pending">Managers</p>
          <p className="mt-2 font-heading text-3xl font-semibold tabular-nums text-status-pending">
            {users ? counts.manager : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-muted/60 p-4">
          <p className="text-xs text-muted-foreground">Students</p>
          <p className="mt-2 font-heading text-3xl font-semibold tabular-nums text-foreground">
            {users ? counts.student : '—'}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch()
            }}
            placeholder="Search by email"
            className="min-h-11 pl-9"
            aria-label="Search users"
          />
        </div>
        <FilterDropdown
          label="Role"
          value={roleFilter}
          options={ROLE_FILTER_OPTIONS}
          onChange={(value) => {
            setRoleFilter(value)
            void load(appliedQuery, value)
          }}
          className="sm:w-48"
        />
        <Button className="min-h-11" onClick={applySearch}>
          Search
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      {!users && !error ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {users && filteredLocal.length === 0 ? (
        <div className="rounded-xl bg-primary-wash px-5 py-12 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            No users found
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Create a user, or try a different email search or role filter.
          </p>
          <Button
            className="mt-4 min-h-11"
            onClick={() => {
              setCreateError(null)
              setCreateForm(emptyCreateForm())
              setCreateOpen(true)
            }}
          >
            <PlusIcon />
            New user
          </Button>
        </div>
      ) : null}

      {filteredLocal.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {filteredLocal.map((user) => {
            const isSelf = me?.id === user.id
            return (
              <li
                key={user.id}
                className="rounded-xl bg-muted/60 px-4 py-4 sm:px-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{user.email}</p>
                      {isSelf ? (
                        <StatusBadge tone="pending" label="You" />
                      ) : null}
                      {user.hasStudentProfile ? (
                        <span className="rounded-md bg-background/80 px-2 py-0.5 text-xs text-muted-foreground">
                          Student profile
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {user.roles.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          No roles assigned
                        </span>
                      ) : (
                        user.roles.map((role) => (
                          <StatusBadge
                            key={role}
                            tone={ROLE_TONE[role as RoleName] ?? 'neutral'}
                            label={ROLE_LABELS[role as RoleName] ?? role}
                          />
                        ))
                      )}
                    </div>
                    {user.createdAt ? (
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDate(user.createdAt)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {ALL_ROLES.map((role) => {
                      const hasRole = user.roles.includes(role)
                      const key = `${user.id}:${role}`
                      const lockedSelfAdmin =
                        isSelf && role === 'admin' && hasRole

                      return (
                        <Button
                          key={role}
                          size="sm"
                          variant={hasRole ? 'default' : 'outline'}
                          className="min-h-11"
                          disabled={busyKey === key || lockedSelfAdmin}
                          title={
                            lockedSelfAdmin
                              ? 'You cannot remove your own admin role'
                              : undefined
                          }
                          onClick={() => {
                            void toggleRole(user, role, hasRole)
                          }}
                        >
                          <ShieldIcon />
                          {hasRole ? 'Remove' : 'Grant'} {ROLE_LABELS[role]}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New user"
      >
        <form
          onSubmit={(e) => {
            void handleCreate(e)
          }}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label="Email"
            type="email"
            required
            autoComplete="off"
            value={createForm.email}
            onChange={(e) =>
              setCreateForm((p) => ({ ...p, email: e.target.value }))
            }
          />
          <Input
            label="Temporary password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={createForm.password}
            onChange={(e) =>
              setCreateForm((p) => ({ ...p, password: e.target.value }))
            }
          />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Roles</p>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((role) => {
                const selected = createForm.roles.includes(role)
                return (
                  <Button
                    key={role}
                    type="button"
                    size="sm"
                    variant={selected ? 'default' : 'outline'}
                    className={cn('min-h-11', !selected && 'font-normal')}
                    onClick={() => toggleCreateRole(role)}
                  >
                    {ROLE_LABELS[role]}
                  </Button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Student includes an ANA profile. Manager/admin can be staff-only.
            </p>
          </div>

          {createForm.roles.includes('student') ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                required
                value={createForm.fullName}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, fullName: e.target.value }))
                }
              />
              <Input
                label="Phone"
                required
                value={createForm.phone}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>
          ) : null}

          {createError ? (
            <p className="text-sm text-status-overdue" role="alert">
              {createError}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="min-h-11" loading={createBusy}>
              {createBusy ? 'Creating…' : 'Create user'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

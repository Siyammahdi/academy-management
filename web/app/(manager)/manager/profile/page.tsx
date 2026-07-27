'use client'

import { useEffect, useState } from 'react'
import { RefreshCwIcon } from 'lucide-react'

import { ManagerPageHeader } from '@/components/manager/manager-page-header'
import { UserAvatar } from '@/components/layout/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getMe, type AuthUser } from '@/lib/auth'
import {
  displayName,
  possessiveProfileTitle,
  primaryRole,
  roleLabel,
} from '@/lib/user-display'

/**
 * Manager — Profile
 * Identity from GET /auth/me. No profile-edit API.
 */
export default function ManagerProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload(): Promise<void> {
    try {
      setUser(await getMe())
      setError(null)
    } catch {
      setError('Your profile could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    getMe()
      .then((next) => {
        if (!cancelled) {
          setUser(next)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Your profile could not be loaded. Try again.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ManagerPageHeader
        eyebrow="Account"
        title={user ? possessiveProfileTitle(user) : 'Your profile'}
        description="Your account on An Nahda — name, email, roles, and linked student id if any. Password changes use the public reset flow."
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

      {!user && !error ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : null}

      {user ? (
        <div className="rounded-xl bg-muted/50 p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <UserAvatar user={user} size="lg" />
            <div className="min-w-0">
              <p className="font-heading text-lg font-semibold text-foreground">
                {displayName(user)}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">
                Linked student id
              </dt>
              <dd className="text-sm text-foreground">
                {user.studentId ??
                  'None — you can still manage batches without a student profile'}
              </dd>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">
                Roles
              </dt>
              <dd className="flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <Badge
                    key={role}
                    className={
                      role === primaryRole(user.roles)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary-wash text-primary-strong'
                    }
                  >
                    {roleLabel(role)}
                  </Badge>
                ))}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      <aside className="rounded-xl bg-muted/50 px-4 py-4 text-sm text-muted-foreground">
        Your authority is limited to assigned batches: verify payments, set
        class links, publish homework, and add recordings. Money movement and
        academy settings stay with admin.
      </aside>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { RefreshCwIcon } from 'lucide-react'

import { ManagerPageHeader } from '@/components/manager/manager-page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getMe, type AuthUser } from '@/lib/auth'

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
        title="Profile"
        description="Your account on An Nahda — email, roles, and linked student id if any. Password changes use the public reset flow."
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
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">
                Email
              </dt>
              <dd className="truncate text-sm font-medium text-foreground">
                {user.email}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">
                User id
              </dt>
              <dd className="truncate font-mono text-xs text-foreground">
                {user.id}
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
                      role === 'manager'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary-wash text-primary-strong'
                    }
                  >
                    {role}
                  </Badge>
                ))}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">
                Linked student id
              </dt>
              <dd className="text-sm text-foreground">
                {user.studentId ??
                  'None — you can still manage batches without a student profile'}
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

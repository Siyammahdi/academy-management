'use client'

import { useEffect, useState } from 'react'
import { RefreshCwIcon } from 'lucide-react'

import { UserAvatar } from '@/components/layout/user-avatar'
import { StudentPageHeader } from '@/components/student/student-page-header'
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
 * Student — Profile
 * Identity from GET /auth/me (now includes fullName when linked).
 */
export default function StudentProfilePage() {
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
      <StudentPageHeader
        eyebrow="Account"
        title={user ? possessiveProfileTitle(user) : 'Your profile'}
        description="Your An Nahda account — name, email, roles, and student id. Password changes use the public reset flow."
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
                Student id
              </dt>
              <dd className="text-sm font-medium text-foreground">
                {user.studentId ?? 'Not linked'}
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
        You can join class, view homework and recordings, and pay your own
        dues. Course management and payment verification stay with staff.
      </aside>
    </div>
  )
}

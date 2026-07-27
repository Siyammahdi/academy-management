'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { UserAvatar } from '@/components/layout/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { AuthUser } from '@/lib/auth'
import {
  resolveActiveRole,
  roleFromPathname,
  workspaceLabel,
} from '@/lib/active-role'
import { personalizedGreeting } from '@/lib/user-display'
import { cn } from '@/lib/utils'

interface WorkspaceHeroProps {
  user: AuthUser | null
  /** Supporting line under the name — mandate / today’s focus. */
  description?: string
  /** Extra chrome on the right (clock, actions). */
  aside?: ReactNode
  /** Primary action row under the greeting. */
  actions?: ReactNode
  className?: string
}

/** Personalized portal hero — name first, active workspace as secondary signal. */
export function WorkspaceHero({
  user,
  description,
  aside,
  actions,
  className,
}: WorkspaceHeroProps) {
  const pathname = usePathname()

  if (!user) {
    return (
      <header
        className={cn(
          'relative overflow-hidden rounded-xl bg-primary-wash p-4 sm:p-6',
          className,
        )}
      >
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      </header>
    )
  }

  const greeting = personalizedGreeting(user)
  const fromPath = roleFromPathname(pathname)
  const role =
    (fromPath && user.roles.includes(fromPath) ? fromPath : null) ??
    resolveActiveRole(user.roles)

  return (
    <header
      className={cn(
        'relative overflow-hidden rounded-xl bg-primary-wash',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-12 size-36 rounded-full bg-primary/20 sm:size-48"
      />
      <div className="relative space-y-4 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <UserAvatar
              user={user}
              size="lg"
              className="mt-0.5 hidden sm:flex"
            />
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-primary-strong sm:text-sm">
                  {greeting.eyebrow}
                </p>
                <Badge className="bg-primary text-primary-foreground">
                  {workspaceLabel(role)}
                </Badge>
                {user.studentId && role === 'student' ? (
                  <Badge
                    variant="secondary"
                    className="bg-background/80 text-foreground"
                  >
                    {user.studentId}
                  </Badge>
                ) : null}
              </div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {greeting.title}
              </h1>
              {description ? (
                <p className="hidden max-w-lg text-sm leading-relaxed text-muted-foreground sm:block">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {aside}
        </div>
        {actions}
      </div>
    </header>
  )
}

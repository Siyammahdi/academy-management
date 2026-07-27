'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CheckIcon, LogOutIcon, UserIcon } from 'lucide-react'

import { UserAvatar } from '@/components/layout/user-avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { apiFetch } from '@/lib/api'
import type { AuthUser, RoleName } from '@/lib/auth'
import {
  homePathForRole,
  profilePathForRole,
  resolveActiveRole,
  roleFromPathname,
  setStoredActiveRole,
  switchableRoles,
  workspaceLabel,
  workspaceRoleLabel,
} from '@/lib/active-role'
import { clearSession, getRefreshToken } from '@/lib/session'
import { displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'

interface UserMenuProps {
  user: AuthUser
  /** Compact trigger for mobile header. */
  compact?: boolean
  className?: string
  align?: 'start' | 'end' | 'center'
}

export function UserMenu({
  user,
  compact = false,
  className,
  align = 'end',
}: UserMenuProps) {
  const router = useRouter()
  const pathname = usePathname()
  const name = displayName(user)
  const roles = switchableRoles(user.roles)
  const fromPath = roleFromPathname(pathname)
  const currentRole =
    (fromPath && user.roles.includes(fromPath) ? fromPath : null) ??
    resolveActiveRole(user.roles)
  const profileHref = currentRole
    ? profilePathForRole(currentRole)
    : '/dashboard/profile'
  const canSwitch = roles.length > 1

  function switchWorkspace(role: RoleName): void {
    if (role === currentRole) return
    setStoredActiveRole(role)
    router.push(homePathForRole(role))
    router.refresh()
  }

  async function handleLogout(): Promise<void> {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      try {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        })
      } catch {
        // Local clear still happens.
      }
    }
    clearSession()
    router.push('/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className={cn(
              compact
                ? 'size-11 shrink-0 rounded-lg p-0'
                : 'h-auto min-h-11 w-full justify-start gap-2.5 rounded-lg px-2 py-2',
              className,
            )}
            aria-label={`${name}, ${workspaceRoleLabel(currentRole)}`}
          />
        }
      >
        <UserAvatar user={user} size={compact ? 'default' : 'sm'} />
        {!compact ? (
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium text-foreground">
              {name}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {workspaceRoleLabel(currentRole)}
            </span>
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="min-w-64 rounded-xl p-1.5"
      >
        <div className="flex items-start gap-3 px-2.5 py-2.5">
          <UserAvatar user={user} size="lg" />
          <div className="min-w-0 space-y-0.5">
            <p className="truncate font-heading text-sm font-semibold text-foreground">
              {name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <p className="text-xs font-medium text-primary-strong">
              {workspaceLabel(currentRole)}
              {user.studentId ? ` · ${user.studentId}` : ''}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide">
            Current role
          </DropdownMenuLabel>
          <div className="flex min-h-11 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground">
            <CheckIcon className="size-4 text-primary-strong" />
            {workspaceRoleLabel(currentRole)}
          </div>
        </DropdownMenuGroup>

        {canSwitch ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide">
                Switch workspace
              </DropdownMenuLabel>
              {roles.map((role) => {
                const isCurrent = role === currentRole
                return (
                  <DropdownMenuItem
                    key={role}
                    className="min-h-11 cursor-pointer gap-2 rounded-lg"
                    disabled={isCurrent}
                    onClick={() => switchWorkspace(role)}
                  >
                    <span
                      className={cn(
                        'flex size-4 items-center justify-center',
                        isCurrent ? 'text-primary-strong' : 'opacity-0',
                      )}
                    >
                      <CheckIcon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block">{workspaceRoleLabel(role)}</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {workspaceLabel(role)}
                      </span>
                    </span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="min-h-11 cursor-pointer gap-2 rounded-lg"
          render={<Link href={profileHref} />}
        >
          <UserIcon className="size-4 opacity-70" />
          {name.split(/\s+/)[0]}&apos;s profile
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          className="min-h-11 cursor-pointer gap-2 rounded-lg"
          onClick={() => {
            void handleLogout()
          }}
        >
          <LogOutIcon className="size-4 opacity-70" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

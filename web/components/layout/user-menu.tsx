'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOutIcon, UserIcon } from 'lucide-react'

import { UserAvatar } from '@/components/layout/user-avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { apiFetch } from '@/lib/api'
import type { AuthUser } from '@/lib/auth'
import { clearSession, getRefreshToken } from '@/lib/session'
import {
  displayName,
  primaryRole,
  profilePathForRoles,
  roleLabel,
} from '@/lib/user-display'
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
  const name = displayName(user)
  const role = primaryRole(user.roles)
  const profileHref = profilePathForRoles(user.roles)

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
            aria-label={`${name}, ${roleLabel(role)}`}
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
              {roleLabel(role)}
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
              {roleLabel(role)}
              {user.studentId ? ` · ${user.studentId}` : ''}
            </p>
          </div>
        </div>
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

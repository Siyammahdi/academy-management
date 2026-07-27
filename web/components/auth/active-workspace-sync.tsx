'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { useCurrentUser } from '@/components/auth/current-user-provider'
import {
  roleFromPathname,
  setStoredActiveRole,
} from '@/lib/active-role'

/**
 * Keeps the preferred workspace in sync with the portal the user is in.
 * Survives logout so the next login restores this workspace (if still permitted).
 */
export function ActiveWorkspaceSync({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user } = useCurrentUser()

  useEffect(() => {
    const fromPath = roleFromPathname(pathname)
    if (fromPath && user?.roles.includes(fromPath)) {
      setStoredActiveRole(fromPath)
    }
  }, [pathname, user])

  return children
}

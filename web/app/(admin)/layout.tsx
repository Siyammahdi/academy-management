import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'
import { ADMIN_NAV_SECTIONS } from '@/lib/admin-nav'

// Real access control is middleware + API RolesGuard. This layout only
// supplies the owner-console chrome: grouped sidebar, drawer on mobile.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      title="An Nahda Admin"
      sections={ADMIN_NAV_SECTIONS}
      mobileNav="drawer"
    >
      {children}
    </AppShell>
  )
}

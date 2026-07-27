import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'
import {
  MANAGER_MOBILE_TABS,
  MANAGER_NAV_SECTIONS,
} from '@/lib/manager-nav'

const MOBILE_ITEMS = MANAGER_MOBILE_TABS.map(({ href, label, shortLabel }) => ({
  href,
  label: shortLabel ?? label,
}))

// Real access control is middleware + API RolesGuard / BatchScopeGuard /
// SelfApprovalGuard. This layout only supplies chrome.
export default function ManagerLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      title="An Nahda Manager"
      sections={MANAGER_NAV_SECTIONS}
      items={MOBILE_ITEMS}
      mobileNav="tabs"
    >
      {children}
    </AppShell>
  )
}

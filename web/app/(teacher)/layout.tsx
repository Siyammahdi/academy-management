import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'
import {
  TEACHER_MOBILE_TABS,
  TEACHER_NAV_SECTIONS,
} from '@/lib/teacher-nav'

const MOBILE_ITEMS = TEACHER_MOBILE_TABS.map(({ href, label, shortLabel }) => ({
  href,
  label: shortLabel ?? label,
}))

// Real access control is middleware + API RolesGuard / BatchScopeGuard /
// SelfApprovalGuard. This layout only supplies chrome.
export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      title="An Nahda Teacher"
      sections={TEACHER_NAV_SECTIONS}
      items={MOBILE_ITEMS}
      mobileNav="tabs"
    >
      {children}
    </AppShell>
  )
}

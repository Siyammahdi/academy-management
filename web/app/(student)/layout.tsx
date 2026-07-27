import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'
import {
  STUDENT_MOBILE_TABS,
  STUDENT_NAV_SECTIONS,
} from '@/lib/student-nav'

const MOBILE_ITEMS = STUDENT_MOBILE_TABS.map(({ href, label, shortLabel }) => ({
  href,
  label: shortLabel ?? label,
}))

// Real access control is middleware + API scoping. This layout only
// supplies chrome — sidebar sections on desktop, tabs on phone.
export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      title="An Nahda"
      sections={STUDENT_NAV_SECTIONS}
      items={MOBILE_ITEMS}
      mobileNav="tabs"
    >
      {children}
    </AppShell>
  )
}

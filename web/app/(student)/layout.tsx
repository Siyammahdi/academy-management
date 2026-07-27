import type { ReactNode } from 'react'

import { StudentPortalShell } from '@/components/student/student-portal-shell'

// Real access control is middleware + API scoping. This layout supplies
// enrollment-aware chrome and gates deep links to classroom features.
export default function StudentLayout({ children }: { children: ReactNode }) {
  return <StudentPortalShell>{children}</StudentPortalShell>
}

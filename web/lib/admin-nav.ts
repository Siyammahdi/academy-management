/**
 * Super Admin information architecture.
 *
 * Dashboard · Academy · Workspace (finance, reports, ops, account).
 * Grace requests and notifications remain ⛔ NOT BUILT (docs/10 + 12).
 */

export interface AdminNavItem {
  href: string
  label: string
}

export interface AdminNavSection {
  /** Omit for the top-level Dashboard item. */
  label?: string
  items: AdminNavItem[]
}

/**
 * Grouped sidebar for the academy owner.
 *
 * Dashboard — how is the academy today?
 * Academy — catalog, seats, who teaches, who learns
 * Workspace — money, reports, roles, settings, profile
 */
export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    items: [{ href: '/admin', label: 'Dashboard' }],
  },
  {
    label: 'Academy',
    items: [
      { href: '/admin/courses', label: 'Courses' },
      { href: '/admin/batches', label: 'Batches' },
      { href: '/admin/teachers', label: 'Teachers' },
      { href: '/admin/students', label: 'Students' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { href: '/admin/payments', label: 'Payments' },
      { href: '/admin/reports', label: 'Reports' },
      { href: '/admin/roles', label: 'Roles' },
      { href: '/admin/settings', label: 'Settings' },
      { href: '/admin/profile', label: 'Profile' },
    ],
  },
]

/** Flat list for shells that still need a simple item array. */
export const ADMIN_NAV_FLAT: AdminNavItem[] = ADMIN_NAV_SECTIONS.flatMap(
  (section) => section.items,
)

export interface AdminBatchWorkspaceTab {
  href: string
  label: string
  description: string
}

/** Secondary nav inside an admin batch playground. */
export function adminBatchWorkspaceTabs(
  batchId: string,
): AdminBatchWorkspaceTab[] {
  const base = `/admin/batches/${batchId}`
  return [
    {
      href: base,
      label: 'Overview',
      description: 'Fees, windows, status, and teachers',
    },
    {
      href: `${base}/roster`,
      label: 'Roster',
      description: 'Students, late joiners, withdrawals',
    },
    {
      href: `${base}/classroom`,
      label: 'Classroom',
      description: 'Class link, homework, recordings',
    },
  ]
}

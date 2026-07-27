/**
 * Course Manager information architecture.
 *
 * Scoped to what the backend enforces today (doc 04 + 10):
 * assigned batches, payment verify/reject, roster, class link, homework,
 * recordings. Grace, notifications, and learning resources (R-05) are
 * not in the menu.
 */

export interface ManagerNavItem {
  href: string
  label: string
  /** Shorter label for the mobile tab bar. */
  shortLabel?: string
}

export interface ManagerNavSection {
  /** Omit for the top-level Dashboard item. */
  label?: string
  items: ManagerNavItem[]
}

/**
 * Grouped sidebar for daily manager work.
 *
 * Dashboard — what needs me today?
 * Teaching — batches, links, homework, recordings
 * Students — cross-batch roster (read-only)
 * Payments — verify queue
 * Account — profile
 */
export const MANAGER_NAV_SECTIONS: ManagerNavSection[] = [
  {
    items: [{ href: '/manager', label: 'Dashboard' }],
  },
  {
    label: 'Teaching',
    items: [
      { href: '/manager/batches', label: 'Your Batches' },
      { href: '/manager/class-links', label: 'Class Links' },
      { href: '/manager/homework', label: 'Homework' },
      { href: '/manager/recordings', label: 'Recordings' },
    ],
  },
  {
    label: 'Students',
    items: [{ href: '/manager/students', label: 'Your Students' }],
  },
  {
    label: 'Payments',
    items: [
      { href: '/manager/payments', label: 'Pending Verifications' },
    ],
  },
  {
    label: 'Account',
    items: [{ href: '/manager/profile', label: 'Profile' }],
  },
]
/** Flat list for shells / lookups. */
export const MANAGER_NAV_FLAT: ManagerNavItem[] =
  MANAGER_NAV_SECTIONS.flatMap((section) => section.items)

/**
 * Primary chrome on phone — four daily destinations.
 * Full IA stays in the desktop sidebar.
 */
export const MANAGER_MOBILE_TABS: ManagerNavItem[] = [
  { href: '/manager', label: 'Home', shortLabel: 'Home' },
  { href: '/manager/batches', label: 'Batches', shortLabel: 'Batches' },
  { href: '/manager/payments', label: 'Verify', shortLabel: 'Verify' },
  { href: '/manager/students', label: 'Students', shortLabel: 'Students' },
]

export interface BatchWorkspaceTab {
  href: string
  label: string
  description: string
}

/** Secondary nav inside a batch workspace. */
export function batchWorkspaceTabs(batchId: string): BatchWorkspaceTab[] {
  const base = `/manager/batches/${batchId}`
  return [
    {
      href: base,
      label: 'Overview',
      description: 'Windows, seats, and today’s focus for this batch',
    },
    {
      href: `${base}/roster`,
      label: 'Roster',
      description: 'Students enrolled in this batch',
    },
    {
      href: `${base}/classroom`,
      label: 'Classroom',
      description: 'Class link, homework, and recordings',
    },
  ]
}

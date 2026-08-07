/**
 * Course Teacher information architecture.
 *
 * Scoped to what the backend enforces today (doc 04 + 10):
 * assigned batches, payment verify/reject, roster, class link, homework,
 * recordings. Grace, notifications, and learning resources (R-05) are
 * not in the menu.
 */

export interface TeacherNavItem {
  href: string
  label: string
  /** Shorter label for the mobile tab bar. */
  shortLabel?: string
}

export interface TeacherNavSection {
  /** Omit for the top-level Dashboard item. */
  label?: string
  items: TeacherNavItem[]
}

/**
 * Grouped sidebar for daily teacher work.
 *
 * Dashboard — what needs me today?
 * Teaching — batches, links, homework, recordings
 * Students — cross-batch roster (read-only)
 * Payments — verify queue
 * Account — profile
 */
export const TEACHER_NAV_SECTIONS: TeacherNavSection[] = [
  {
    items: [{ href: '/teacher', label: 'Dashboard' }],
  },
  {
    label: 'Teaching',
    items: [
      { href: '/teacher/batches', label: 'Your Batches' },
      { href: '/teacher/class-links', label: 'Class Links' },
      { href: '/teacher/homework', label: 'Homework' },
      { href: '/teacher/recordings', label: 'Recordings' },
    ],
  },
  {
    label: 'Students',
    items: [{ href: '/teacher/students', label: 'Your Students' }],
  },
  {
    label: 'Payments',
    items: [
      { href: '/teacher/payments', label: 'Pending Verifications' },
    ],
  },
  {
    label: 'Account',
    items: [{ href: '/teacher/profile', label: 'Profile' }],
  },
]
/** Flat list for shells / lookups. */
export const TEACHER_NAV_FLAT: TeacherNavItem[] =
  TEACHER_NAV_SECTIONS.flatMap((section) => section.items)

/**
 * Primary chrome on phone — four daily destinations.
 * Full IA stays in the desktop sidebar.
 */
export const TEACHER_MOBILE_TABS: TeacherNavItem[] = [
  { href: '/teacher', label: 'Home', shortLabel: 'Home' },
  { href: '/teacher/batches', label: 'Batches', shortLabel: 'Batches' },
  { href: '/teacher/payments', label: 'Verify', shortLabel: 'Verify' },
  { href: '/teacher/students', label: 'Students', shortLabel: 'Students' },
]

export interface BatchWorkspaceTab {
  href: string
  label: string
  description: string
}

/** Secondary nav inside a batch workspace. */
export function batchWorkspaceTabs(batchId: string): BatchWorkspaceTab[] {
  const base = `/teacher/batches/${batchId}`
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

/**
 * Student portal information architecture.
 *
 * Scoped to what the backend enforces today (doc 04 + 10):
 * enrollments, class links, homework, recordings, billing periods,
 * payments, self-enroll. Announcements, resources (R-05), and
 * notifications (R-01) are not in the menu.
 */

export interface StudentNavItem {
  href: string
  label: string
  shortLabel?: string
}

export interface StudentNavSection {
  label?: string
  items: StudentNavItem[]
}

/**
 * Grouped sidebar for daily student work.
 *
 * Dashboard — join, homework, dues at a glance
 * Learning — courses, classroom, homework, recordings
 * Payments — status + history
 * Discover — browse open batches
 * Account — profile
 */
export const STUDENT_NAV_SECTIONS: StudentNavSection[] = [
  {
    items: [{ href: '/dashboard', label: 'Dashboard' }],
  },
  {
    label: 'Learning',
    items: [
      { href: '/dashboard/courses', label: 'Your Courses' },
      { href: '/dashboard/classroom', label: 'Class Links' },
      { href: '/dashboard/homework', label: 'Your Homework' },
      { href: '/dashboard/recordings', label: 'Recordings' },
    ],
  },
  {
    label: 'Payments',
    items: [
      { href: '/dashboard/dues', label: 'Payment Status' },
      { href: '/dashboard/payments', label: 'Payment History' },
    ],
  },
  {
    label: 'Discover',
    items: [{ href: '/dashboard/enroll', label: 'Browse & Enroll' }],
  },
  {
    label: 'Account',
    items: [{ href: '/dashboard/profile', label: 'Profile' }],
  },
]
export const STUDENT_NAV_FLAT: StudentNavItem[] =
  STUDENT_NAV_SECTIONS.flatMap((section) => section.items)

/** Primary chrome on phone — four daily destinations. */
export const STUDENT_MOBILE_TABS: StudentNavItem[] = [
  { href: '/dashboard', label: 'Home', shortLabel: 'Home' },
  { href: '/dashboard/classroom', label: 'Class', shortLabel: 'Class' },
  { href: '/dashboard/dues', label: 'Dues', shortLabel: 'Dues' },
  { href: '/dashboard/courses', label: 'Courses', shortLabel: 'Courses' },
]

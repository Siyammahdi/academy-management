/**
 * Student portal information architecture.
 *
 * Enrollment-aware (lifecycle):
 * - No active enrollment → onboarding nav only
 * - Active enrollment → full learning + payments experience
 *
 * Scoped to what the backend enforces today (doc 04 + 10).
 * Announcements / resources (R-05) / notifications are not in the menu.
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

export interface StudentNavOptions {
  /** At least one enrollment with status `active`. */
  hasActiveEnrollment: boolean
  /** At least one enrollment with status `pending` (applications). */
  hasPendingApplications: boolean
}

/**
 * Adaptive sidebar for the student's lifecycle.
 * Expands automatically once GET /me/enrollments reports an active seat.
 */
export function studentNavSections({
  hasActiveEnrollment,
  hasPendingApplications,
}: StudentNavOptions): StudentNavSection[] {
  if (!hasActiveEnrollment) {
    const items: StudentNavItem[] = [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/dashboard/enroll', label: 'Browse Courses' },
    ]
    if (hasPendingApplications) {
      items.push({
        href: '/dashboard/applications',
        label: 'My Applications',
      })
    }
    items.push({ href: '/dashboard/profile', label: 'Profile' })
    return [{ items }]
  }

  return [
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
}

/** Primary chrome on phone — adapts with enrollment status. */
export function studentMobileTabs({
  hasActiveEnrollment,
  hasPendingApplications,
}: StudentNavOptions): StudentNavItem[] {
  if (!hasActiveEnrollment) {
    const tabs: StudentNavItem[] = [
      { href: '/dashboard', label: 'Home', shortLabel: 'Home' },
      {
        href: '/dashboard/enroll',
        label: 'Browse',
        shortLabel: 'Browse',
      },
    ]
    if (hasPendingApplications) {
      tabs.push({
        href: '/dashboard/applications',
        label: 'Apps',
        shortLabel: 'Apps',
      })
    }
    tabs.push({
      href: '/dashboard/profile',
      label: 'Profile',
      shortLabel: 'Profile',
    })
    return tabs
  }

  return [
    { href: '/dashboard', label: 'Home', shortLabel: 'Home' },
    { href: '/dashboard/classroom', label: 'Class', shortLabel: 'Class' },
    { href: '/dashboard/dues', label: 'Dues', shortLabel: 'Dues' },
    { href: '/dashboard/courses', label: 'Courses', shortLabel: 'Courses' },
  ]
}

/** @deprecated Prefer studentNavSections() — kept for static imports during load. */
export const STUDENT_NAV_SECTIONS: StudentNavSection[] = studentNavSections({
  hasActiveEnrollment: false,
  hasPendingApplications: false,
})

export const STUDENT_NAV_FLAT: StudentNavItem[] =
  STUDENT_NAV_SECTIONS.flatMap((section) => section.items)

export const STUDENT_MOBILE_TABS: StudentNavItem[] = studentMobileTabs({
  hasActiveEnrollment: false,
  hasPendingApplications: false,
})

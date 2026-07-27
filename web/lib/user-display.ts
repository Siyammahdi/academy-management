import type { AuthUser, RoleName } from '@/lib/auth'
import { greetingForDhaka } from '@/lib/student-dashboard'

/** Prefer linked student name; otherwise a cleaned email local-part. */
export function displayName(user: Pick<AuthUser, 'email' | 'fullName'>): string {
  const named = user.fullName?.trim()
  if (named) return named
  const local = user.email.split('@')[0] ?? user.email
  return local
    .replace(/[._+-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

export function firstName(user: Pick<AuthUser, 'email' | 'fullName'>): string {
  const full = displayName(user)
  return full.split(/\s+/)[0] ?? full
}

export function initials(user: Pick<AuthUser, 'email' | 'fullName'>): string {
  const full = displayName(user)
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'AN'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

/** Primary portal role for chrome labels. */
export function primaryRole(roles: readonly RoleName[]): RoleName | null {
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('manager')) return 'manager'
  if (roles.includes('student')) return 'student'
  return null
}

export function roleLabel(role: RoleName | null): string {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'manager':
      return 'Manager'
    case 'student':
      return 'Student'
    default:
      return 'Member'
  }
}

export function profilePathForRoles(roles: readonly RoleName[]): string {
  if (roles.includes('admin')) return '/admin/profile'
  if (roles.includes('manager')) return '/manager/profile'
  return '/dashboard/profile'
}

/**
 * Personalized greeting for dashboard heroes.
 * Full name is always the title — the first thing that says "this is yours."
 */
export function personalizedGreeting(
  user: Pick<AuthUser, 'email' | 'fullName'>,
  now = new Date(),
): { eyebrow: string; title: string } {
  const full = displayName(user)
  const tod = greetingForDhaka(now)
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka',
      hour: 'numeric',
      hour12: false,
    }).format(now),
  )

  if (hour >= 5 && hour < 11) {
    return { eyebrow: 'Assalamu Alaikum', title: full }
  }
  if (hour >= 17) {
    return { eyebrow: tod, title: full }
  }
  return { eyebrow: 'Welcome back', title: full }
}

/** "{Name}'s Profile" — use once on the profile page. */
export function possessiveProfileTitle(
  user: Pick<AuthUser, 'email' | 'fullName'>,
): string {
  return `${displayName(user)}'s Profile`
}

/** "{Name}'s Courses" — use on the student courses page. */
export function possessiveCoursesTitle(
  user: Pick<AuthUser, 'email' | 'fullName'>,
): string {
  return `${firstName(user)}'s Courses`
}

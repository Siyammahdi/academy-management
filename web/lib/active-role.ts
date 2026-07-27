import type { RoleName } from '@/lib/auth'

const ACTIVE_ROLE_COOKIE = 'nahda_active_role'
const ACTIVE_ROLE_STORAGE_KEY = 'nahda_active_role'
/** Survives logout so the next login restores the last workspace. */
const ACTIVE_ROLE_MAX_AGE = 365 * 24 * 60 * 60

const ROLE_PRIORITY: RoleName[] = ['admin', 'manager', 'student']

function isRoleName(value: string): value is RoleName {
  return value === 'admin' || value === 'manager' || value === 'student'
}

function cookieOptions(maxAge: number): string {
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? '; secure'
      : ''
  return `path=/; max-age=${maxAge}; samesite=lax${secure}`
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

/** Last selected workspace — cookie for middleware, localStorage as backup. */
export function getStoredActiveRole(): RoleName | null {
  if (typeof window === 'undefined') return null
  const fromCookie = readCookie(ACTIVE_ROLE_COOKIE)
  if (fromCookie && isRoleName(fromCookie)) return fromCookie
  try {
    const fromStorage = window.localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY)
    if (fromStorage && isRoleName(fromStorage)) return fromStorage
  } catch {
    // Private mode / blocked storage.
  }
  return null
}

/**
 * Persist preferred workspace across sessions (RBAC-01 UX).
 * Does not affect JWT or API permissions — chrome only.
 */
export function setStoredActiveRole(role: RoleName): void {
  if (typeof window === 'undefined') return
  document.cookie = `${ACTIVE_ROLE_COOKIE}=${encodeURIComponent(role)}; ${cookieOptions(ACTIVE_ROLE_MAX_AGE)}`
  try {
    window.localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, role)
  } catch {
    // Ignore quota / private mode.
  }
}

/** Default when no preference — operational consoles first. */
export function defaultRoleForRoles(
  roles: readonly string[],
): RoleName | null {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role
  }
  return null
}

/**
 * Preferred role if the account still holds it; otherwise the default.
 */
export function resolveActiveRole(
  roles: readonly string[],
  preferred: RoleName | null = getStoredActiveRole(),
): RoleName | null {
  if (preferred && roles.includes(preferred)) return preferred
  return defaultRoleForRoles(roles)
}

export function homePathForRole(role: RoleName): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'manager':
      return '/manager'
    case 'student':
      return '/dashboard'
  }
}

export function profilePathForRole(role: RoleName): string {
  switch (role) {
    case 'admin':
      return '/admin/profile'
    case 'manager':
      return '/manager/profile'
    case 'student':
      return '/dashboard/profile'
  }
}

/** Infer workspace from the current portal path. */
export function roleFromPathname(pathname: string): RoleName | null {
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/manager')) return 'manager'
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/payments')) {
    return 'student'
  }
  return null
}

/** Human label for the role chip / switcher. */
export function workspaceRoleLabel(role: RoleName | null): string {
  switch (role) {
    case 'admin':
      return 'Super Admin'
    case 'manager':
      return 'Course Manager'
    case 'student':
      return 'Student'
    default:
      return 'Member'
  }
}

/** Dashboard / chrome workspace name. */
export function workspaceLabel(role: RoleName | null): string {
  switch (role) {
    case 'admin':
      return 'Super Admin Workspace'
    case 'manager':
      return 'Course Manager Workspace'
    case 'student':
      return 'Student Workspace'
    default:
      return 'Your workspace'
  }
}

/** Roles the account can switch into, stable order. */
export function switchableRoles(roles: readonly RoleName[]): RoleName[] {
  return ROLE_PRIORITY.filter((role) => roles.includes(role))
}

// Plain (non-httpOnly) cookies: readable by middleware for UX gates.
// Hardened production would proxy auth through a BFF so tokens never
// reach client-side JS — see docs/11-hardening.md when it lands.

const ACCESS_TOKEN_COOKIE = 'nahda_access_token'
const REFRESH_TOKEN_COOKIE = 'nahda_refresh_token'
const ROLES_COOKIE = 'nahda_roles'
const ACCESS_TOKEN_MAX_AGE = 15 * 60 // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 // 7 days

function cookieOptions(maxAge: number): string {
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? '; secure'
      : ''
  return `path=/; max-age=${maxAge}; samesite=lax${secure}`
}

/**
 * Persist tokens + roles after login/register/refresh.
 * Roles are UX-only for middleware; the API re-reads roles from the DB.
 */
export function storeSession(
  accessToken: string,
  refreshToken: string,
  roles: string[],
): void {
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${accessToken}; ${cookieOptions(ACCESS_TOKEN_MAX_AGE)}`
  document.cookie = `${REFRESH_TOKEN_COOKIE}=${refreshToken}; ${cookieOptions(REFRESH_TOKEN_MAX_AGE)}`
  document.cookie = `${ROLES_COOKIE}=${roles.join(',')}; ${cookieOptions(REFRESH_TOKEN_MAX_AGE)}`
}

export function clearSession(): void {
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0`
  document.cookie = `${REFRESH_TOKEN_COOKIE}=; path=/; max-age=0`
  document.cookie = `${ROLES_COOKIE}=; path=/; max-age=0`
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null
  }
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
  return match ? match.slice(name.length + 1) : null
}

export function getAccessToken(): string | null {
  return readCookie(ACCESS_TOKEN_COOKIE)
}

export function getRefreshToken(): string | null {
  return readCookie(REFRESH_TOKEN_COOKIE)
}

export function getRoles(): string[] {
  const raw = readCookie(ROLES_COOKIE)
  return raw ? raw.split(',').filter(Boolean) : []
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken())
}

/** Prefer admin → teacher → student dashboard for logged-in marketing CTAs. */
export function homePathForRoles(roles: string[] = getRoles()): string {
  if (roles.includes('admin')) return '/admin'
  if (roles.includes('teacher')) return '/teacher'
  return '/dashboard'
}

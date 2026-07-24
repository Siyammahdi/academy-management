// Plain (non-httpOnly) cookies: the simplest storage a future middleware.ts
// (doc 07 §11) can still read server-side. A hardened build would proxy
// auth through a BFF route so tokens never reach client-side JS at all —
// out of scope for this pass.

const ACCESS_TOKEN_COOKIE = 'nahda_access_token';
const REFRESH_TOKEN_COOKIE = 'nahda_refresh_token';
const ROLES_COOKIE = 'nahda_roles';
const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes — doc 07 §9 JWT_ACCESS_EXPIRY
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days — doc 07 §9 JWT_REFRESH_EXPIRY

// The access token itself carries no roles (it's just `{ sub }` — see the
// API's JwtStrategy, which re-reads roles from the DB on every request).
// Roles are only ever handed to the client once, in the login/register/
// refresh response body, so they're persisted alongside the tokens here for
// middleware.ts and the admin layout to read. This is a UX-only gate — the
// cookie is plain and could be edited by the user, but that changes nothing:
// the API's own RolesGuard is the real authority on every request.
export function storeSession(
  accessToken: string,
  refreshToken: string,
  roles: string[],
): void {
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${accessToken}; path=/; max-age=${ACCESS_TOKEN_MAX_AGE}; samesite=lax`;
  document.cookie = `${REFRESH_TOKEN_COOKIE}=${refreshToken}; path=/; max-age=${REFRESH_TOKEN_MAX_AGE}; samesite=lax`;
  document.cookie = `${ROLES_COOKIE}=${roles.join(',')}; path=/; max-age=${REFRESH_TOKEN_MAX_AGE}; samesite=lax`;
}

export function clearSession(): void {
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${REFRESH_TOKEN_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${ROLES_COOKIE}=; path=/; max-age=0`;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

export function getAccessToken(): string | null {
  return readCookie(ACCESS_TOKEN_COOKIE);
}

export function getRefreshToken(): string | null {
  return readCookie(REFRESH_TOKEN_COOKIE);
}

export function getRoles(): string[] {
  const raw = readCookie(ROLES_COOKIE);
  return raw ? raw.split(',').filter(Boolean) : [];
}

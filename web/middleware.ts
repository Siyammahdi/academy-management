import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'nahda_access_token';
const ROLES_COOKIE = 'nahda_roles';

// doc 07 §11 — this is a UX gate only. The access token carries no roles
// (it's just `{ sub }`; see the API's JwtStrategy) and this middleware
// cannot verify the token's signature without the API's secret, so it can
// only check "does a plausible session exist and did the last login say
// this role". The API's own RolesGuard on every route is the real
// authority — a forged cookie gets past this middleware but not past that.
const REQUIRED_ROLE_BY_PREFIX: Array<{ prefix: string; role: string }> = [
  { prefix: '/admin', role: 'admin' },
  { prefix: '/manager', role: 'manager' },
  { prefix: '/dashboard', role: 'student' },
  // Gateway redirect landing pages — reached mid-flow by an authenticated
  // student, same as /dashboard. Guest checkout, if it exists, lives under
  // a separate /guest prefix (doc 06 §8), not here.
  { prefix: '/payments', role: 'student' },
];

export function middleware(request: NextRequest): NextResponse {
  const match = REQUIRED_ROLE_BY_PREFIX.find(({ prefix }) =>
    request.nextUrl.pathname.startsWith(prefix),
  );
  if (!match) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const roles = request.cookies.get(ROLES_COOKIE)?.value?.split(',') ?? [];

  if (!token || !roles.includes(match.role)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/manager/:path*',
    '/dashboard/:path*',
    '/payments/:path*',
  ],
};

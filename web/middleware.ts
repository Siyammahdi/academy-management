import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ACCESS_TOKEN_COOKIE = 'nahda_access_token'
const ROLES_COOKIE = 'nahda_roles'
const ACTIVE_ROLE_COOKIE = 'nahda_active_role'

// UX gate only — the API RolesGuard is the real authority (doc 07 §11).
const REQUIRED_ROLE_BY_PREFIX: Array<{ prefix: string; role: string }> = [
  { prefix: '/admin', role: 'admin' },
  { prefix: '/teacher', role: 'teacher' },
  { prefix: '/dashboard', role: 'student' },
  // /payments/* is public — SSLCommerz redirects students AND guests here
  // after checkout. The page never settles payment (PAY-03); it only shows status.
]

const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password']

function isRoleName(value: string): value is 'admin' | 'teacher' | 'student' {
  return value === 'admin' || value === 'teacher' || value === 'student'
}

function homePathForRoles(roles: string[], preferred: string | undefined): string {
  if (preferred && isRoleName(preferred) && roles.includes(preferred)) {
    if (preferred === 'admin') return '/admin'
    if (preferred === 'teacher') return '/teacher'
    return '/dashboard'
  }
  if (roles.includes('admin')) return '/admin'
  if (roles.includes('teacher')) return '/teacher'
  if (roles.includes('student')) return '/dashboard'
  return '/'
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  const roles =
    request.cookies.get(ROLES_COOKIE)?.value?.split(',').filter(Boolean) ?? []
  const preferred = request.cookies.get(ACTIVE_ROLE_COOKIE)?.value

  // Already signed in → leave auth pages for the restored workspace.
  if (AUTH_PAGES.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    if (token && roles.length > 0) {
      return NextResponse.redirect(
        new URL(homePathForRoles(roles, preferred), request.url),
      )
    }
    return NextResponse.next()
  }

  const match = REQUIRED_ROLE_BY_PREFIX.find(({ prefix }) =>
    pathname.startsWith(prefix),
  )
  if (!match) {
    return NextResponse.next()
  }

  if (!token || !roles.includes(match.role)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/admin/:path*',
    '/teacher/:path*',
    '/dashboard/:path*',
  ],
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ACCESS_TOKEN_COOKIE = 'nahda_access_token'
const ROLES_COOKIE = 'nahda_roles'

// UX gate only — the API RolesGuard is the real authority (doc 07 §11).
const REQUIRED_ROLE_BY_PREFIX: Array<{ prefix: string; role: string }> = [
  { prefix: '/admin', role: 'admin' },
  { prefix: '/manager', role: 'manager' },
  { prefix: '/dashboard', role: 'student' },
  { prefix: '/payments', role: 'student' },
]

const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password']

function homePathForRoles(roles: string[]): string {
  if (roles.includes('admin')) return '/admin'
  if (roles.includes('manager')) return '/manager'
  if (roles.includes('student')) return '/dashboard'
  return '/'
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  const roles =
    request.cookies.get(ROLES_COOKIE)?.value?.split(',').filter(Boolean) ?? []

  // Already signed in → leave auth pages for the role home.
  if (AUTH_PAGES.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    if (token && roles.length > 0) {
      return NextResponse.redirect(new URL(homePathForRoles(roles), request.url))
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
    '/manager/:path*',
    '/dashboard/:path*',
    '/payments/:path*',
  ],
}

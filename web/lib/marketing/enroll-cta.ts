import type { PublicAuthState } from '@/lib/use-public-auth'

/** Marketing enroll / register CTA that respects session cookies. */
export function resolveEnrollCta(
  auth: PublicAuthState,
  canEnroll: boolean,
  labels: {
    register: string
    enrollNow: string
    goToApp: string
    askNext: string
  },
): { href: string; label: string } {
  if (!canEnroll) {
    return { href: '/contact', label: labels.askNext }
  }
  if (!auth.ready || !auth.authenticated) {
    return { href: '/register', label: labels.register }
  }
  if (auth.homeHref === '/dashboard') {
    return { href: '/dashboard/enroll', label: labels.enrollNow }
  }
  return { href: auth.homeHref, label: labels.goToApp }
}

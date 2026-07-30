'use client'

import { useEffect, useState } from 'react'

import {
  getRoles,
  homePathForRoles,
  isAuthenticated,
} from '@/lib/session'

export interface PublicAuthState {
  ready: boolean
  authenticated: boolean
  homeHref: string
}

/**
 * Client-only auth snapshot for marketing chrome / CTAs. Roles cookie is
 * UX-only; the API still authorizes every request.
 */
export function usePublicAuth(): PublicAuthState {
  const [state, setState] = useState<PublicAuthState>({
    ready: false,
    authenticated: false,
    homeHref: '/dashboard',
  })

  useEffect(() => {
    const authenticated = isAuthenticated()
    setState({
      ready: true,
      authenticated,
      homeHref: homePathForRoles(getRoles()),
    })
  }, [])

  return state
}

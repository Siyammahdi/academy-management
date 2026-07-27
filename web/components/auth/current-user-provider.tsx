'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { getMe, type AuthUser } from '@/lib/auth'

interface CurrentUserContextValue {
  user: AuthUser | null
  loading: boolean
  reload: () => Promise<void>
}

const CurrentUserContext = createContext<CurrentUserContextValue>({
  user: null,
  loading: true,
  reload: async () => undefined,
})

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function reload(): Promise<void> {
    try {
      setUser(await getMe())
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    getMe()
      .then((next) => {
        if (!cancelled) {
          setUser(next)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <CurrentUserContext.Provider value={{ user, loading, reload }}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser(): CurrentUserContextValue {
  return useContext(CurrentUserContext)
}

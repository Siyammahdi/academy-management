'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { getMe, type AuthUser } from '@/lib/auth'
import { fetchProfileAvatarObjectUrl } from '@/lib/profile'

interface CurrentUserContextValue {
  user: AuthUser | null
  avatarUrl: string | null
  loading: boolean
  reload: () => Promise<void>
}

const CurrentUserContext = createContext<CurrentUserContextValue>({
  user: null,
  avatarUrl: null,
  loading: true,
  reload: async () => undefined,
})

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const avatarObjectUrlRef = useRef<string | null>(null)

  const revokeAvatarUrl = useCallback(() => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current)
      avatarObjectUrlRef.current = null
    }
    setAvatarUrl(null)
  }, [])

  const syncAvatar = useCallback(
    async (next: AuthUser | null) => {
      revokeAvatarUrl()
      if (!next) return
      const url = await fetchProfileAvatarObjectUrl()
      if (url) {
        avatarObjectUrlRef.current = url
        setAvatarUrl(url)
      }
    },
    [revokeAvatarUrl],
  )

  const reload = useCallback(async (): Promise<void> => {
    try {
      const next = await getMe()
      setUser(next)
      await syncAvatar(next)
    } catch {
      setUser(null)
      revokeAvatarUrl()
    } finally {
      setLoading(false)
    }
  }, [revokeAvatarUrl, syncAvatar])

  useEffect(() => {
    let cancelled = false
    getMe()
      .then(async (next) => {
        if (cancelled) return
        setUser(next)
        await syncAvatar(next)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null)
          revokeAvatarUrl()
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [revokeAvatarUrl, syncAvatar])

  useEffect(() => {
    return () => {
      revokeAvatarUrl()
    }
  }, [revokeAvatarUrl])

  return (
    <CurrentUserContext.Provider
      value={{ user, avatarUrl, loading, reload }}
    >
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser(): CurrentUserContextValue {
  return useContext(CurrentUserContext)
}

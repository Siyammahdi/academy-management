'use client'

import { useEffect, useState } from 'react'

import { useCurrentUser } from '@/components/auth/current-user-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { fetchUserAvatarObjectUrl } from '@/lib/api-client'
import type { AuthUser } from '@/lib/auth'
import { fetchProfileAvatarObjectUrl } from '@/lib/profile'
import { initials } from '@/lib/user-display'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  user: Pick<AuthUser, 'id' | 'email' | 'fullName' | 'hasAvatar'>
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function UserAvatar({
  user,
  size = 'default',
  className,
}: UserAvatarProps) {
  const { user: currentUser, avatarUrl: currentAvatarUrl } = useCurrentUser()
  const [ownUrl, setOwnUrl] = useState<string | null>(null)
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null)

  const isCurrentUser = currentUser?.id === user.id
  const displayUser = isCurrentUser && currentUser ? currentUser : user
  const imageUrl = isCurrentUser
    ? (currentAvatarUrl ?? ownUrl)
    : remoteUrl

  useEffect(() => {
    if (!isCurrentUser) {
      if (!user.hasAvatar) {
        setRemoteUrl(null)
        return
      }

      let cancelled = false
      let objectUrl: string | null = null

      void fetchUserAvatarObjectUrl(user.id).then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        objectUrl = url
        setRemoteUrl(url)
      })

      return () => {
        cancelled = true
        if (objectUrl) URL.revokeObjectURL(objectUrl)
      }
    }

    if (currentAvatarUrl) {
      setOwnUrl(null)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null

    void fetchProfileAvatarObjectUrl().then((url) => {
      if (cancelled) {
        if (url) URL.revokeObjectURL(url)
        return
      }
      objectUrl = url
      setOwnUrl(url)
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [currentAvatarUrl, isCurrentUser, user.hasAvatar, user.id])

  return (
    <Avatar size={size} className={cn('bg-primary-wash', className)}>
      {imageUrl ? <AvatarImage src={imageUrl} alt="" /> : null}
      <AvatarFallback className="bg-primary-wash font-semibold text-primary-strong">
        {initials(displayUser)}
      </AvatarFallback>
    </Avatar>
  )
}

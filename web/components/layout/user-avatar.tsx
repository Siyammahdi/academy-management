'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { AuthUser } from '@/lib/auth'
import { initials } from '@/lib/user-display'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  user: Pick<AuthUser, 'email' | 'fullName'>
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function UserAvatar({
  user,
  size = 'default',
  className,
}: UserAvatarProps) {
  return (
    <Avatar size={size} className={cn('bg-primary-wash', className)}>
      <AvatarFallback className="bg-primary-wash font-semibold text-primary-strong">
        {initials(user)}
      </AvatarFallback>
    </Avatar>
  )
}

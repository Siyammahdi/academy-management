import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export type ContainerWidth = 'marketing' | 'app' | 'reading'

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  width?: ContainerWidth
}

const WIDTH_CLASSES: Record<ContainerWidth, string> = {
  marketing: 'max-w-6xl',
  app: 'max-w-7xl',
  reading: 'max-w-prose',
}

export function Container({
  width = 'marketing',
  className,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6',
        WIDTH_CLASSES[width],
        className,
      )}
      {...props}
    />
  )
}

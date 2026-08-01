import Image from 'next/image'

import { cn } from '@/lib/utils'

/** Mark only — Arabic calligraphy in an arch; no English wordmark. */
export const ACADEMY_LOGO_SRC = '/logo.png'

interface AcademyLogoProps {
  className?: string
  /** Square edge in CSS pixels. Defaults to 36 (matches size-9 slots). */
  size?: number
  priority?: boolean
  /**
   * When the academy name sits beside the mark, pass true so screen readers
   * don't hear the brand twice.
   */
  decorative?: boolean
}

export function AcademyLogo({
  className,
  size = 36,
  priority = false,
  decorative = false,
}: AcademyLogoProps) {
  return (
    <Image
      src={ACADEMY_LOGO_SRC}
      alt={decorative ? '' : 'An Nahda Academy'}
      width={size}
      height={size}
      priority={priority}
      className={cn('shrink-0 rounded-lg object-contain', className)}
      aria-hidden={decorative || undefined}
    />
  )
}

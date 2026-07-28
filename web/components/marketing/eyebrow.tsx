import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

interface EyebrowProps extends ComponentProps<'p'> {
  children: string
  /** Inverted sections sit on deep purple. */
  tone?: 'default' | 'inverse'
}

/** Section label with a short rule — the repeating editorial mark of the site. */
export function Eyebrow({
  children,
  tone = 'default',
  className,
  ...props
}: EyebrowProps) {
  return (
    <p
      className={cn(
        'flex items-center gap-3 text-xs font-medium tracking-wide uppercase',
        tone === 'inverse'
          ? 'text-primary-foreground/70'
          : 'text-primary-strong',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        data-eyebrow-rule
        className={cn(
          'h-px w-8 origin-left',
          tone === 'inverse' ? 'bg-primary-foreground/40' : 'bg-primary',
        )}
      />
      {children}
    </p>
  )
}

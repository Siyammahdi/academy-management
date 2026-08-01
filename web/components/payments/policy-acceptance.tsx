'use client'

import Link from 'next/link'

import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

export interface PolicyAcceptanceCopy {
  agreePrefix: string
  terms: string
  privacy: string
  refund: string
}

export interface PolicyAcceptanceProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  copy: PolicyAcceptanceCopy
  /** Open policy links in a new tab (preferred inside payment modals). */
  openInNewTab?: boolean
  className?: string
  invalid?: boolean
}

/**
 * Checkout gate: customer must accept linked T&C, privacy, and refund policies.
 */
export function PolicyAcceptance({
  checked,
  onCheckedChange,
  copy,
  openInNewTab = true,
  className,
  invalid,
}: PolicyAcceptanceProps) {
  const linkClass =
    'font-medium text-primary-strong underline-offset-4 hover:underline'
  const linkProps = openInNewTab
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {}

  return (
    <label
      className={cn(
        'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-1 py-1',
        className,
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-1 size-5"
        aria-invalid={invalid || undefined}
      />
      <span className="text-sm leading-relaxed text-muted-foreground">
        {copy.agreePrefix}{' '}
        <Link href="/terms" className={linkClass} {...linkProps}>
          {copy.terms}
        </Link>
        {', '}
        <Link href="/privacy" className={linkClass} {...linkProps}>
          {copy.privacy}
        </Link>
        {', '}
        <Link href="/refund-policy" className={linkClass} {...linkProps}>
          {copy.refund}
        </Link>
        .
      </span>
    </label>
  )
}

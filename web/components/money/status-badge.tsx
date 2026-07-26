import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export type StatusTone = 'paid' | 'pending' | 'overdue' | 'neutral' | 'partial'

const TONE_CLASS: Record<StatusTone, string> = {
  paid: 'bg-status-paid-bg text-status-paid',
  pending: 'bg-status-pending-bg text-status-pending',
  overdue: 'bg-status-overdue-bg text-status-overdue',
  neutral: 'bg-status-neutral-bg text-status-neutral',
  partial: 'bg-status-pending-bg text-status-pending',
}

const DOT_CLASS: Record<StatusTone, string> = {
  paid: 'bg-status-paid',
  pending: 'bg-status-pending',
  overdue: 'bg-status-overdue',
  neutral: 'bg-status-neutral',
  partial: 'bg-status-pending',
}

interface StatusBadgeProps {
  tone: StatusTone
  label: string
  className?: string
}

/** Status is never color alone — text label + colored dot (doc 09 §5/§11). */
export function StatusBadge({ tone, label, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 border-transparent font-medium',
        TONE_CLASS[tone],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', DOT_CLASS[tone])}
      />
      {label}
    </Badge>
  )
}

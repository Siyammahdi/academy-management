import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/format'

interface AmountCellProps {
  amount: string
  className?: string
  /** Outstanding amounts use the overdue tone and an explicit label. */
  outstanding?: boolean
  /** When true, prefixes with "Outstanding ". */
  labeled?: boolean
}

export function AmountCell({
  amount,
  className,
  outstanding = false,
  labeled = false,
}: AmountCellProps) {
  const formatted = formatMoney(amount)
  return (
    <span
      className={cn(
        'font-numeric text-sm tabular-nums',
        outstanding ? 'font-medium text-status-overdue' : 'text-foreground',
        className,
      )}
    >
      {labeled && outstanding ? `Outstanding ${formatted}` : formatted}
    </span>
  )
}

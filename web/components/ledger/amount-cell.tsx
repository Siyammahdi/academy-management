import { formatMoney } from '../../lib/format';
import { cx } from '../../lib/cx';

export interface AmountCellProps {
  amount: string;
  // doc 09 §6 — outstanding balances show the shortfall beneath the
  // amount, labelled, in --overdue. Never a bare minus sign.
  outstanding?: string;
  className?: string;
}

export function AmountCell({ amount, outstanding, className }: AmountCellProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-end gap-1 font-numeric text-body text-ink',
        className,
      )}
    >
      <span>{formatMoney(amount)}</span>
      {outstanding ? (
        <span className="text-sm text-overdue">
          Outstanding {formatMoney(outstanding)}
        </span>
      ) : null}
    </div>
  );
}

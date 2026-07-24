import { cx } from '../../lib/cx';
import { AmountCell } from './amount-cell';
import { StatusPill } from './status-pill';
import type { PillStatus } from './status-pill';

export interface LedgerLineProps {
  /** e.g. "March 2026" — a period month, set in the numeric face (doc 09 §3). */
  periodLabel: string;
  /** e.g. "Learning Arabic · Batch 8" */
  detailLabel: string;
  /** e.g. "Due 5 Mar" — a date, also the numeric face. */
  dueLabel: string;
  status: PillStatus;
  statusLabel: string;
  amount: string;
  outstanding?: string;
  className?: string;
}

// doc 09 §5 — the signature component. Hairline rules above/below, no
// card, no shadow, no fill; amount right-aligned in the numeric face;
// status pill inline, never a row background. This is the one motif
// every financial surface (dues, verification queue, reports) composes
// from — build it once here, correctly, and reuse it everywhere.
export function LedgerLine({
  periodLabel,
  detailLabel,
  dueLabel,
  status,
  statusLabel,
  amount,
  outstanding,
  className,
}: LedgerLineProps) {
  return (
    <div
      className={cx(
        'grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-x-4 gap-y-1 border-t border-b border-rule py-3',
        className,
      )}
    >
      <span className="font-numeric text-body text-ink">{periodLabel}</span>
      <span className="font-body text-body text-ink">{detailLabel}</span>
      <div className="row-span-2 self-center">
        <AmountCell amount={amount} outstanding={outstanding} />
      </div>
      <span className="font-numeric text-sm text-ink-muted">{dueLabel}</span>
      <div>
        <StatusPill status={status} label={statusLabel} />
      </div>
    </div>
  );
}

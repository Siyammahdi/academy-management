import { cx } from '../../lib/cx';

// doc 09 §5 — Status pills. "Partially paid" shares the pending tone;
// "In penalty" shares the overdue tone (see the token-pair table).
export type PillStatus =
  | 'paid'
  | 'pending'
  | 'partiallyPaid'
  | 'unpaid'
  | 'overdue'
  | 'inPenalty';

export interface PillProps {
  status: PillStatus;
  label: string;
  className?: string;
}

type Tone = 'paid' | 'pending' | 'overdue' | 'neutral';

const TONE_BY_STATUS: Record<PillStatus, Tone> = {
  paid: 'paid',
  pending: 'pending',
  partiallyPaid: 'pending',
  unpaid: 'neutral',
  overdue: 'overdue',
  inPenalty: 'overdue',
};

const WASH_CLASSES: Record<Tone, string> = {
  paid: 'bg-paid-wash text-paid',
  pending: 'bg-pending-wash text-pending',
  overdue: 'bg-overdue-wash text-overdue',
  neutral: 'bg-neutral-wash text-neutral',
};

const DOT_CLASSES: Record<Tone, string> = {
  paid: 'bg-paid',
  pending: 'bg-pending',
  overdue: 'bg-overdue',
  neutral: 'bg-neutral',
};

// Status is never conveyed by color alone (doc 09 §11) — the dot is
// decorative; `label` is the text that actually carries the meaning.
export function Pill({ status, label, className }: PillProps) {
  const tone = TONE_BY_STATUS[status];

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-sm px-2 py-1 font-body text-xs font-medium uppercase',
        WASH_CLASSES[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx('h-dot w-dot rounded-full', DOT_CLASSES[tone])}
      />
      {label}
    </span>
  );
}

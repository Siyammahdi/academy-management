import type { PillStatus } from '../components/ui/pill';
import type { PeriodStatus } from './api-client';

// doc 09 §5 — the status pill token-pair table, applied to PeriodStatus
// specifically (shared by the dashboard, dues, and payments pages).
export const PERIOD_STATUS_PILL: Record<
  PeriodStatus,
  { status: PillStatus; label: string }
> = {
  unpaid: { status: 'unpaid', label: 'Unpaid' },
  pending: { status: 'pending', label: 'Pending' },
  partially_paid: { status: 'partiallyPaid', label: 'Partially paid' },
  paid: { status: 'paid', label: 'Paid' },
};

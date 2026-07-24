// doc 09 §5's "Status pills" spec is one concept, listed in both the ui/
// and ledger/ folders in §12's file tree — this re-exports the single
// real implementation (components/ui/pill.tsx) under the ledger-facing
// name rather than duplicating the status/tone mapping.
export { Pill as StatusPill } from '../ui/pill';
export type { PillProps as StatusPillProps, PillStatus } from '../ui/pill';

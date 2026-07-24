// doc 07 §5 — background jobs. Plain constants/types only; no NestJS
// decorators here so both the HTTP app (producing/scheduling) and the
// worker (consuming) can import this without pulling in either bootstrap.

export const QUEUE_NAMES = {
  penaltySweep: 'penalty-sweep',
  billingGeneration: 'billing-generation',
  gatewayExpiry: 'gateway-expiry',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Each queue here only ever runs one kind of job, but BullMQ jobs are
// always named — these are the names used both for the repeatable
// schedule and for the manual-trigger endpoint's one-off jobs.
export const JOB_NAMES = {
  penaltySweep: 'sweep',
  billingGeneration: 'generate',
  gatewayExpiry: 'expire',
} as const;

// doc 07 §5's exact schedules, Asia/Dhaka explicit (PEN-01/TIME-03, BIL-04).
export const JOB_SCHEDULES = {
  [QUEUE_NAMES.penaltySweep]: { pattern: '0 0 6 * *', tz: 'Asia/Dhaka' },
  [QUEUE_NAMES.billingGeneration]: { pattern: '0 1 1 * *', tz: 'Asia/Dhaka' },
  [QUEUE_NAMES.gatewayExpiry]: { pattern: '*/15 * * * *', tz: 'Asia/Dhaka' },
} as const;

// No payload needed — every job reads current state from the database at
// run time rather than carrying data through the queue.
export type PenaltySweepJobData = Record<string, never>;
export type BillingGenerationJobData = Record<string, never>;
export type GatewayExpiryJobData = Record<string, never>;

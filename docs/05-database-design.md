# 05 — Database Design

**Database:** PostgreSQL 16
**ORM:** Prisma

**Purpose:** the physical schema, its constraints, and the transactional patterns that keep money correct.

---

## 1. Non-negotiable conventions

**Money is `Decimal(10,2)`. Never `Float`.**
Floating-point arithmetic drifts. `amountOwed − amountPaid` must be exact or ledgers silently corrupt over months. This is the single most common money bug in ORM projects.

**IDs are `cuid()`**, except `Student.studentId` which is sequential and human-readable (`ANA-0001`) because guests read it aloud over the phone.

**Timestamps are `DateTime` in UTC.** Business-date evaluation happens in `Asia/Dhaka` at the application layer (TIME-01, TIME-02).

**Enums live in the database**, not as loose strings — Postgres rejects invalid states outright.

**Soft delete is not used.** Archive via status fields (`Course.status = archived`, `User.status = disabled`). Financial records are never deleted.

---

## 2. Prisma schema

**Prisma 7.** The `datasource` block carries only the provider — the connection URL lives in `prisma.config.ts` (loaded via `dotenv`), not in the schema file. Prisma 7 has no built-in query engine for SQL providers: `PrismaClient` is constructed with a driver adapter (`PrismaPg` from `@prisma/adapter-pg`) rather than a bare `new PrismaClient()`. See §2.1.

Every field whose camelCase Prisma name differs from its snake_case column carries an explicit `@map(...)` — Prisma does not snake_case columns on its own, only `@@map(...)` renames the table itself. Without the field-level `@map`, the columns referenced by the raw SQL in §3 would not exist.

This is the actual, current `api/prisma/schema.prisma` — kept verbatim here so this document cannot drift from the real schema. If they ever disagree, `api/prisma/schema.prisma` is correct and this copy is stale; fix the copy.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

enum RoleName {
  admin
  manager
  student
}

enum UserStatus {
  active
  disabled
}

enum StudentStatus {
  active
  inactive
}

enum BillingType {
  monthly
  one_time
}

enum CourseStatus {
  active
  archived
}

enum BatchStatus {
  upcoming
  enrolling
  running
  completed
}

enum EnrollmentStatus {
  pending
  active
  withdrawn
}

enum PeriodStatus {
  unpaid
  pending
  partially_paid
  paid
}

enum PaymentMethod {
  gateway
  manual
}

enum PaymentStatus {
  pending
  verified
  rejected
  expired
}

enum PaidBy {
  student
  guest
}

enum RequestType {
  grace
  partial_payment
}

enum RequestStatus {
  pending
  approved
  rejected
}

enum NotificationChannel {
  dashboard
  email
  // sms — deferred; adding a value requires no logic change (NTF-05)
}

// ─────────────────────────────────────────────
// AUTH & IDENTITY
// ─────────────────────────────────────────────

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  passwordHash String     @map("password_hash")
  status       UserStatus @default(active)
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  roles         UserRole[]
  student       Student?
  managedBatches BatchManager[]
  refreshTokens RefreshToken[]
  passwordResetTokens PasswordResetToken[]

  // Actions this user has taken
  verifiedPayments Payment[]  @relation("PaymentVerifier")
  decidedRequests  Request[]  @relation("RequestDecider")
  issuedRefunds    Refund[]   @relation("RefundIssuer")
  auditEntries     AuditLog[] @relation("AuditActor")
  notifications    Notification[]

  @@index([status])
  @@map("users")
}

/// A user holds a SET of roles — one person may be both manager and student (RBAC-01).
model UserRole {
  id     String   @id @default(cuid())
  userId String   @map("user_id")
  role   RoleName

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, role])
  @@index([role])
  @@map("user_roles")
}

model RefreshToken {
  id        String    @id @default(cuid())
  userId    String    @map("user_id")
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

/// Single-use password-reset token. Only the SHA-256 hash is stored —
/// the raw token is emailed once and never persisted. Same hashing
/// pattern as RefreshToken. Expires in 30 minutes; `usedAt` marks
/// single-use consumption.
model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String    @map("user_id")
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("password_reset_tokens")
}

/// Academic/financial profile. userId is OPTIONAL — a student may have no login.
model Student {
  id        String        @id @default(cuid())
  studentId String        @unique @map("student_id")              // ANA-0001, sequential, guest-facing
  userId    String?       @unique @map("user_id")
  fullName  String        @map("full_name")
  phone     String
  status    StudentStatus @default(active)
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")

  user        User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
  enrollments Enrollment[]

  @@index([phone])        // guest lookup by phone
  @@index([status])
  @@map("students")
}

/// Backs sequential studentId generation. Single row, incremented in a transaction.
model StudentIdSequence {
  id      Int @id @default(1)
  current Int @default(0)

  @@map("student_id_sequence")
}

// ─────────────────────────────────────────────
// CATALOG
// ─────────────────────────────────────────────

/// The template — current price list. Batches SNAPSHOT these fees (FEE-02).
/// Editing them never affects existing batches (FEE-03).
model Course {
  id            String       @id @default(cuid())
  title         String
  description   String?
  billingType   BillingType  @map("billing_type")
  enrollmentFee Decimal      @map("enrollment_fee") @db.Decimal(10, 2)
  monthlyFee    Decimal      @map("monthly_fee") @db.Decimal(10, 2)   // unused when one_time (FEE-07)
  parts         Json?        // [{ name, durationMonths }] — descriptive only, drives nothing
  status        CourseStatus @default(active)
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")

  batches Batch[]

  @@index([status])
  @@map("courses")
}

/// The ENROLLABLE UNIT. Freezes course pricing at creation.
model Batch {
  id       String @id @default(cuid())
  courseId String @map("course_id")
  name     String

  // Frozen snapshot — never re-read from Course (FEE-02)
  enrollmentFee        Decimal @map("enrollment_fee") @db.Decimal(10, 2)  // also the penalty amount (PEN-03)
  monthlyFee           Decimal @map("monthly_fee") @db.Decimal(10, 2)
  entryDiscountPercent Int     @default(0) @map("entry_discount_percent")         // 0–100, entry ONLY (FEE-06)

  capacity          Int
  courseStartDate   DateTime    @map("course_start_date")   // its month = first billing period (BIL-03)
  enrollmentOpensAt DateTime    @map("enrollment_opens_at")
  enrollmentClosesAt DateTime   @map("enrollment_closes_at")
  dueDayStart       Int         @default(1) @map("due_day_start")
  dueDayEnd         Int         @default(5) @map("due_day_end")
  status            BatchStatus @default(upcoming)
  classLink         String?     @map("class_link")   // Telegram/Zoom link — teaching happens off-platform
  createdAt         DateTime    @default(now()) @map("created_at")
  updatedAt         DateTime    @updatedAt @map("updated_at")

  course      Course         @relation(fields: [courseId], references: [id], onDelete: Restrict)
  managers    BatchManager[]
  enrollments Enrollment[]
  homework    Homework[]
  recordings  RecordedClass[]

  @@index([courseId])
  @@index([status])
  @@index([enrollmentOpensAt, enrollmentClosesAt])
  @@map("batches")
}

/// A batch may have SEVERAL managers; a manager may hold several batches.
model BatchManager {
  id         String   @id @default(cuid())
  batchId    String   @map("batch_id")
  userId     String   @map("user_id")
  assignedAt DateTime @default(now()) @map("assigned_at")

  batch Batch @relation(fields: [batchId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([batchId, userId])
  @@index([userId])          // "which batches does this manager have?" — hot path for BatchScopeGuard
  @@map("batch_managers")
}

/// A deferred course-management feature (doc 07 §12): attaches to Batch,
/// touches nothing else. dueDate is a real point-in-time deadline (end of
/// the chosen Dhaka calendar day), the same convention BillingPeriod.dueDate
/// uses (TIME-02/TIME-03) — not a bare calendar date.
model Homework {
  id          String   @id @default(cuid())
  batchId     String   @map("batch_id")
  title       String
  description String
  dueDate     DateTime @map("due_date")
  createdAt   DateTime @default(now()) @map("created_at")

  batch Batch @relation(fields: [batchId], references: [id], onDelete: Cascade)

  @@index([batchId, dueDate])
  @@map("homeworks")
}

/// A deferred course-management feature (doc 07 §12): attaches to Batch,
/// touches nothing else. Stores only the YouTube video id, never a URL —
/// the frontend builds the embed from it. recordedFor is a pure calendar
/// date (the class date, no deadline semantics), so — unlike Homework's
/// dueDate — it is stored as-is (TIME-04's periodMonth convention), not
/// resolved through the Dhaka end-of-day helper.
model RecordedClass {
  id             String   @id @default(cuid())
  batchId        String   @map("batch_id")
  title          String
  youtubeVideoId String   @map("youtube_video_id")
  recordedFor    DateTime @map("recorded_for")
  createdAt      DateTime @default(now()) @map("created_at")

  batch Batch @relation(fields: [batchId], references: [id], onDelete: Cascade)

  @@index([batchId, recordedFor])
  @@map("recorded_classes")
}

// ─────────────────────────────────────────────
// ENROLLMENT & BILLING
// ─────────────────────────────────────────────

/// THE SPINE. Everything financial hangs off this.
model Enrollment {
  id         String           @id @default(cuid())
  studentId  String           @map("student_id")
  batchId    String           @map("batch_id")
  status     EnrollmentStatus @default(pending)
  inPenalty  Boolean          @default(false) @map("in_penalty")   // guard against stacking (PEN-06)
  enrolledAt DateTime         @default(now()) @map("enrolled_at")
  updatedAt  DateTime         @updatedAt @map("updated_at")

  student        Student         @relation(fields: [studentId], references: [id], onDelete: Restrict)
  batch          Batch           @relation(fields: [batchId], references: [id], onDelete: Restrict)
  billingPeriods BillingPeriod[]

  @@unique([studentId, batchId])   // no double enrollment (ENR-10)
  @@index([batchId, status])       // roster queries
  @@index([studentId])
  @@index([inPenalty])
  @@map("enrollments")
}

/// One month's LEDGER. Tracks money, not merely status (BIL-07).
model BillingPeriod {
  id           String       @id @default(cuid())
  enrollmentId String       @map("enrollment_id")
  periodMonth  DateTime     @map("period_month") @db.Date    // first day of month, UTC (TIME-04)
  amountOwed   Decimal      @map("amount_owed") @db.Decimal(10, 2)
  amountPaid   Decimal      @default(0) @map("amount_paid") @db.Decimal(10, 2)  // VERIFIED payments only (BIL-08)
  dueDate      DateTime     @map("due_date")
  status       PeriodStatus @default(unpaid)
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")

  enrollment Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  payments   Payment[]
  requests   Request[]

  @@unique([enrollmentId, periodMonth])  // idempotent generation (BIL-12)
  @@index([status, dueDate])             // penalty job scan
  @@index([enrollmentId])
  @@map("billing_periods")
}

// ─────────────────────────────────────────────
// MONEY MOVEMENT
// ─────────────────────────────────────────────

/// One payment settles EXACTLY ONE period (PAY-01).
model Payment {
  id                   String        @id @default(cuid())
  billingPeriodId      String        @map("billing_period_id")
  amount               Decimal       @db.Decimal(10, 2)
  method               PaymentMethod
  status               PaymentStatus @default(pending)
  paidBy               PaidBy        @map("paid_by")
  guestName            String?       @map("guest_name")
  guestPhone           String?       @map("guest_phone")
  transactionReference String?       @unique @map("transaction_reference")   // idempotency anchor for webhooks (PAY-04)
  proofUrl             String?       @map("proof_url")                 // manual only
  verifiedById         String?       @map("verified_by_id")
  verifiedAt           DateTime?     @map("verified_at")
  createdAt            DateTime      @default(now()) @map("created_at")
  updatedAt            DateTime      @updatedAt @map("updated_at")

  billingPeriod BillingPeriod @relation(fields: [billingPeriodId], references: [id], onDelete: Restrict)
  verifiedBy    User?         @relation("PaymentVerifier", fields: [verifiedById], references: [id], onDelete: SetNull)
  refunds       Refund[]

  @@index([billingPeriodId])
  @@index([status, method])        // "pending manual payments" queue
  @@index([status, createdAt])     // gateway expiry sweep (PAY-05)
  @@map("payments")
}

/// Admin-only. Reverses a payment and reopens the balance (RFD-04).
model Refund {
  id           String   @id @default(cuid())
  paymentId    String   @map("payment_id")
  amount       Decimal  @db.Decimal(10, 2)
  reason       String
  refundedById String   @map("refunded_by_id")
  refundedAt   DateTime @default(now()) @map("refunded_at")

  payment    Payment @relation(fields: [paymentId], references: [id], onDelete: Restrict)
  refundedBy User    @relation("RefundIssuer", fields: [refundedById], references: [id], onDelete: Restrict)

  @@index([paymentId])
  @@map("refunds")
}

/// Grace (moves a DATE) and partial payment (moves MONEY) — one shape, two types.
model Request {
  id              String        @id @default(cuid())
  billingPeriodId String        @map("billing_period_id")
  type            RequestType
  status          RequestStatus @default(pending)
  requestedAmount Decimal?      @map("requested_amount") @db.Decimal(10, 2)  // partial_payment only
  extendedDueDate DateTime?     @map("extended_due_date")                          // grace only
  reason          String
  decidedById     String?       @map("decided_by_id")
  decidedAt       DateTime?     @map("decided_at")
  createdAt       DateTime      @default(now()) @map("created_at")

  billingPeriod BillingPeriod @relation(fields: [billingPeriodId], references: [id], onDelete: Cascade)
  decidedBy     User?         @relation("RequestDecider", fields: [decidedById], references: [id], onDelete: SetNull)

  @@index([billingPeriodId])
  @@index([status, type])   // pending queues, split by approver authority
  @@map("requests")
}

// ─────────────────────────────────────────────
// SUPPORTING
// ─────────────────────────────────────────────

model Notification {
  id              String              @id @default(cuid())
  recipientUserId String              @map("recipient_user_id")
  eventType       String              @map("event_type")
  channel         NotificationChannel
  relatedType     String?             @map("related_type")
  relatedId       String?             @map("related_id")
  readAt          DateTime?           @map("read_at")
  sentAt          DateTime            @default(now()) @map("sent_at")

  recipient User @relation(fields: [recipientUserId], references: [id], onDelete: Cascade)

  @@index([recipientUserId, readAt])   // unread badge
  @@map("notifications")
}

/// APPEND-ONLY. Never updated, never deleted (AUD-03).
model AuditLog {
  id          String   @id @default(cuid())
  actorUserId String?  @map("actor_user_id")             // null = system actor (the penalty job)
  action      String
  targetType  String   @map("target_type")
  targetId    String   @map("target_id")
  details     Json?
  createdAt   DateTime @default(now()) @map("created_at")

  actor User? @relation("AuditActor", fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([targetType, targetId])
  @@index([actorUserId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

---

### 2.1 Client setup (Prisma 7)

The connection URL is not in `schema.prisma`. It lives in `prisma.config.ts` at the project root, loaded via `dotenv`:

```ts
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
```

`PrismaClient` has no built-in query engine for SQL providers in v7 — it must be constructed with a driver adapter. `src/prisma/prisma.service.ts` wires this up once, behind NestJS's module lifecycle:

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

Every other module injects `PrismaService`, never instantiates `PrismaClient` directly.

---

## 3. Constraints Prisma cannot express

Add these as raw SQL in a migration. They are the last line of defence when application code has a bug.

```sql
-- Money is never negative
ALTER TABLE billing_periods
  ADD CONSTRAINT chk_amount_owed_non_negative CHECK (amount_owed >= 0),
  ADD CONSTRAINT chk_amount_paid_non_negative CHECK (amount_paid >= 0);

ALTER TABLE payments
  ADD CONSTRAINT chk_payment_amount_positive CHECK (amount > 0);   -- PAY-10

ALTER TABLE refunds
  ADD CONSTRAINT chk_refund_amount_positive CHECK (amount > 0);

-- Discount is a valid percentage (FEE-04)
ALTER TABLE batches
  ADD CONSTRAINT chk_discount_range CHECK (entry_discount_percent BETWEEN 0 AND 100);

-- Due window is a valid, ordered day range
ALTER TABLE batches
  ADD CONSTRAINT chk_due_days CHECK (
    due_day_start BETWEEN 1 AND 28
    AND due_day_end BETWEEN 1 AND 28
    AND due_day_start <= due_day_end
  );

-- Capacity is meaningful
ALTER TABLE batches
  ADD CONSTRAINT chk_capacity_positive CHECK (capacity > 0);

-- Enrollment window is ordered
ALTER TABLE batches
  ADD CONSTRAINT chk_enrollment_window CHECK (enrollment_opens_at < enrollment_closes_at);

-- periodMonth is always the first of the month (TIME-04)
ALTER TABLE billing_periods
  ADD CONSTRAINT chk_period_month_is_first CHECK (EXTRACT(DAY FROM period_month) = 1);

-- Request type/field coherence
ALTER TABLE requests
  ADD CONSTRAINT chk_request_fields CHECK (
    (type = 'partial_payment' AND requested_amount IS NOT NULL)
    OR (type = 'grace' AND extended_due_date IS NOT NULL)
    OR status = 'pending'
  );

-- Manual payments require proof (PAY-06)
ALTER TABLE payments
  ADD CONSTRAINT chk_manual_requires_proof CHECK (
    method <> 'manual' OR (transaction_reference IS NOT NULL AND proof_url IS NOT NULL)
  );

-- Guest payments identify the payer (PAY-11)
ALTER TABLE payments
  ADD CONSTRAINT chk_guest_identified CHECK (
    paid_by <> 'guest' OR (guest_name IS NOT NULL AND guest_phone IS NOT NULL)
  );
```

`due_day` is capped at 28 so every month has that day — a due day of 30 would be undefined in February.

**Deliberately not a database constraint:** `amountPaid <= amountOwed`. Overpayment is possible in reality (a guest pays too much), and the correct handling is a business decision surfaced to an admin, not a hard database rejection that loses the record of money received.

**Applied.** All of the above are live via `prisma/migrations/20260723131350_add_check_constraints/migration.sql` — confirmed present, not just documented intent.

---

## 4. Transactional patterns

These four operations MUST run inside `prisma.$transaction`. Getting them wrong corrupts ledgers.

### 4.1 Enrollment with capacity check (ENR-04)

A naive `count → compare → insert` allows two students to take the final seat concurrently. Serialize on the batch row:

```ts
await prisma.$transaction(async (tx) => {
  // Lock the batch row for the duration
  await tx.$executeRaw`SELECT id FROM batches WHERE id = ${batchId} FOR UPDATE`;

  const active = await tx.enrollment.count({
    where: { batchId, status: { in: ['pending', 'active'] } },
  });
  if (active >= batch.capacity) throw new BatchFullException();

  const enrollment = await tx.enrollment.create({ ... });
  await tx.billingPeriod.create({ ...firstPeriod });   // BIL-03
  await tx.auditLog.create({ ...enrollmentCreated });
  return enrollment;
}, { isolationLevel: 'Serializable' });
```

The unique constraint on `(studentId, batchId)` is the second line of defence against duplicate enrollment. The real implementation also bounds retries on Postgres's Serializable-conflict error (`P2034`) rather than looping unbounded — see `enrollment.service.ts`.

### 4.2 Payment verification (PAY-08)

`amountPaid` and period `status` must move together, or a crash between them leaves an inconsistent ledger:

```ts
await prisma.$transaction(async (tx) => {
  const payment = await tx.payment.update({
    where: { id, status: 'pending' },      // guards double-verification
    data: { status: 'verified', verifiedById, verifiedAt: new Date() },
  });

  const period = await tx.billingPeriod.update({
    where: { id: payment.billingPeriodId },
    data: { amountPaid: { increment: payment.amount } },
  });

  await tx.billingPeriod.update({
    where: { id: period.id },
    data: { status: derivePeriodStatus(period) },   // BIL-09
  });

  await maybeClearPenaltyFlag(tx, period.enrollmentId);   // PEN-07

  // ENR-06/07 — a verified payment (manual or gateway) also activates the
  // enrollment. Real code guards this with `where: { status: 'pending' }`
  // so it's a no-op if already active or withdrawn — see "Lessons from
  // implementation" in doc 08 for why this transition was once missing.
  await tx.enrollment.updateMany({
    where: { id: period.enrollmentId, status: 'pending' },
    data: { status: 'active' },
  });

  await tx.auditLog.create({ ...paymentVerified });
});
```

### 4.3 Webhook idempotency (PAY-04)

SSLCommerz may deliver the same callback twice. The unique index on `transactionReference` makes double-crediting impossible:

```ts
const existing = await prisma.payment.findUnique({
  where: { transactionReference: payload.tran_id },
});
if (existing?.status === 'verified') return { ok: true };   // already handled
```

Then settle inside the same transaction shape as 4.2.

### 4.4 Penalty application (PEN-04, PEN-06)

```ts
await prisma.$transaction(async (tx) => {
  const enrollment = await tx.enrollment.update({
    where: { id: enrollmentId, inPenalty: false },   // guards stacking
    data: { inPenalty: true },
  });

  await tx.billingPeriod.update({
    where: { id: periodId },
    data: { amountOwed: { increment: batch.enrollmentFee } },   // undiscounted (FEE-06)
  });

  await tx.auditLog.create({ ...penaltyApplied, actorUserId: null });   // system actor
});
```

---

## 5. Index rationale

Every index answers a specific hot query. Do not add others speculatively.

| Index | Query it serves |
|---|---|
| `billing_periods (status, dueDate)` | The penalty job's monthly scan for unpaid overdue periods |
| `billing_periods (enrollmentId, periodMonth)` unique | Idempotent generation; "this student's March" |
| `payments (status, method)` | The manager's pending-manual-payment queue |
| `payments (status, createdAt)` | The 60-minute gateway expiry sweep |
| `payments (transactionReference)` unique | Webhook idempotency |
| `enrollments (batchId, status)` | Batch roster and capacity counting |
| `enrollments (studentId, batchId)` unique | Prevents double enrollment |
| `batch_managers (userId)` | `BatchScopeGuard` — runs on nearly every manager request |
| `students (phone)` | Guest lookup by phone |
| `requests (status, type)` | Pending queues split by approver authority |
| `notifications (recipientUserId, readAt)` | Unread badge |
| `homeworks (batchId, dueDate)` | Batch homework list + student's `/me/homework`, both ordered by due date |
| `recorded_classes (batchId, recordedFor)` | Batch recordings list + student's `/me/recordings`, both ordered newest-first |

---

## 6. Sequential student ID

`studentId` must be sequential and human-readable, which a `cuid` cannot provide. Generate it inside the enrollment transaction:

```ts
const seq = await tx.studentIdSequence.update({
  where: { id: 1 },
  data: { current: { increment: 1 } },
});
const studentId = `ANA-${String(seq.current).padStart(4, '0')}`;
```

The `UPDATE ... RETURNING` is atomic, so concurrent requests cannot collide.

**Known tradeoff:** sequential IDs are enumerable, and the guest lookup returns a name for any valid ID. Rate limiting on the lookup endpoint is the mitigation, deferred — see `11-hardening.md` H-04.

---

## 7. Migration discipline

- **Every schema change is a migration.** Never `prisma db push` against anything but a local scratch database.
- **Migrations are immutable once merged.** Fix forward with a new migration; never edit a committed one.
- **Raw SQL constraints (§3) live in their own migration**, applied after the tables exist.
- **Seed data** (`prisma/seed.ts`) creates: one admin user, one sample course, one open batch. It MUST be idempotent — safe to run repeatedly.
- **Class-management tables (`homeworks`, `recorded_classes`) and the `Batch.classLink` field were each added as their own additive-only migration** — no existing table was altered. This is the extensibility principle (doc 01 §13) proven in practice; follow the same pattern for the next addition (see `12-roadmap.md`).

---

## 8. What is deliberately absent

- **No `currentPart` on `Enrollment`** — derived from the batch timeline.
- **No waitlist table** — a full batch refuses enrollment.
- **No `Teacher` table** — teachers work off-platform.
- **No attendance, exam, or certificate tables** — deferred. They will attach to `Enrollment` and `Batch` as new tables without altering these. *(Homework and recorded-class tables, once on this list, are now built — see §2's schema.)*
- **No `Resource` table yet** — planned (`12-roadmap.md` R-05): will attach to `Batch` with a `url` field first, object storage later.
- **No soft-delete columns** — status fields handle archival; financial records are never deleted.

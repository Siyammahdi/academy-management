# 03 — Domain Model

**Purpose:** the conceptual model — entities, their meaning, states, relationships, and invariants. This is the bridge between the business rules and the database schema.

This document describes *what things are*. `05-database-design.md` describes *how they are stored*.

---

## Model overview

```
Course ──spawns──▶ Batch ──has──▶ Enrollment ──owns──▶ BillingPeriod ──settled by──▶ Payment
  │                  │                 ▲                      ▲                          │
  │                  │                 │                      │                          │
  └ price list       └ frozen contract └ Student         Request (grace/partial)     Refund
```

**The shape in one line:** *Course defines → Batch freezes → Enrollment subscribes → BillingPeriod owes → Payment settles*, with `Request` and `Refund` as the human-override paths and `AuditLog` observing everything.

---

## Entity index

| Entity | Responsibility |
|---|---|
| `User` | Authentication identity and roles |
| `Role` | Role assignment (many-to-many with User) |
| `Student` | Academic/financial profile; guest-lookup target |
| `Course` | Template — definition and current pricing |
| `Batch` | The enrollable unit; frozen pricing and operations |
| `BatchManager` | Manager assignment (many-to-many) |
| `Enrollment` | One student in one batch — the spine |
| `BillingPeriod` | One month's ledger: owed, paid, outstanding |
| `Payment` | One money event settling one period |
| `Refund` | Reverses a payment |
| `Request` | Grace or partial-payment application |
| `Notification` | Dispatched message record |
| `AuditLog` | Append-only record of who did what |
| `Homework` | Batch homework with a due date (added scope) |
| `RecordedClass` | Batch YouTube recording (added scope) |

*`Batch` also carries a `classLink` field (added scope). `Homework` and `RecordedClass` are covered in §12.*

---

## 1. `User`

The **login identity**. Deliberately separate from `Student`.

**Why separate:** managers and admins are users but not students (they would carry empty student columns); the guest lookup must query student data without any auth account; and a student may exist with **no** login at all.

| Field | Notes |
|---|---|
| `id` | cuid |
| `email` | Unique. The login handle. |
| `passwordHash` | argon2. Never store plaintext. |
| `status` | `active` \| `disabled` |
| `createdAt` | |

**Roles** — a user holds a **set** of roles (`admin`, `manager`, `student`), not a single value, because one person may be both a manager and a student (RBAC-01).

**Relationships**
- `User` 1 ─ 0..1 `Student`
- `User` * ─ * `Role`
- `User` * ─ * `Batch` (as manager, via `BatchManager`)
- Referenced by `Payment.verifiedBy`, `Request.decidedBy`, `Refund.refundedBy`, `AuditLog.actorUserId`

---

## 2. `Student`

The **academic and financial profile**. This is what enrollments hang off and what the guest lookup finds.

| Field | Notes |
|---|---|
| `id` | cuid |
| `studentId` | Sequential, human-readable (`ANA-0001`). The primary guest-facing handle. |
| `userId` | **Optional** — a student may have no login account. |
| `fullName` | Shown to guests during payment confirmation. |
| `phone` | Required. A fallback lookup handle. |
| `status` | `active` \| `inactive` |
| `createdAt` | |

**Note on email:** the student's email lives on `User`. The guest lookup therefore joins across `User` for email, and finds phone and `studentId` locally.

**Relationships**
- `Student` 0..1 ─ 1 `User`
- `Student` 1 ─ * `Enrollment` (concurrent enrollments allowed, ENR-09)

---

## 3. `Course`

The **template** — what a program is and what it *currently* costs. Not enrollable.

| Field | Notes |
|---|---|
| `id` | cuid |
| `slug` | Unique public URL segment (`/courses/[slug]`) |
| `title` | |
| `description` | |
| `billingType` | `monthly` \| `one_time` |
| `enrollmentFee` | Decimal. Current price. Also the penalty basis. |
| `monthlyFee` | Decimal. Unused when `one_time`. |
| `parts` | Ordered list of `{ name, durationMonths }` — **descriptive only** |
| `thumbnail` / `thumbnailMimeType` | Optional cover image stored as bytes in Postgres — **not** a URL. Never returned in JSON; clients use `GET /courses/:id/thumbnail` and the `hasThumbnail` flag. |
| `featured` / `featuredOrder` | Landing-page marketing flag + sort order (lower first). Cleared on archive. |
| `tagline`, `category`, `emphasis`, `focus`, `highlights`, `audience`, `outcomes` | Marketing copy for landing + public course page. Inert for billing. |
| `status` | `active` \| `archived` |
| `createdAt` | |

**Parts are inert.** They describe curriculum structure (e.g. Basic / Intermediate / Advanced, 8 months each) for display. They drive no billing, gate no progression, and are **not** stored per student — which part a student is in is derived from the batch's timeline.

**Critical behaviour:** these fees are the *current* price list. Batches copy them at creation. Editing them never touches existing batches (FEE-03).

**Relationships**
- `Course` 1 ─ * `Batch`

---

## 4. `Batch`

A concrete offering — one cohort with its own roster, managers, dates, and **frozen** financial terms. **The enrollable unit.**

| Field | Notes |
|---|---|
| `id` | cuid |
| `courseId` | |
| `name` | e.g. "Batch 8" |
| `enrollmentFee` | **Snapshot** from course. Also the penalty amount. |
| `monthlyFee` | **Snapshot** from course. |
| `entryDiscountPercent` | 0–100. Applies to **entry only**, never the penalty. |
| `capacity` | Max active enrollments |
| `courseStartDate` | Its month is the first billing period |
| `enrollmentOpensAt` / `enrollmentClosesAt` | Self-enrollment window |
| `dueDayStart` / `dueDayEnd` | Monthly payment window (default 1–5) |
| `status` | `upcoming` \| `enrolling` \| `running` \| `completed` |
| `createdAt` | |

**Status is flipped manually by an admin** — no date-driven automation. `completed` stops billing-period generation (BIL-11). Status is **not** what gates self-enrollment: ENR-02 uses `enrollmentOpensAt`/`enrollmentClosesAt`. A batch may be `running` (classes started) while its enrollment window is still open.

**Worked example.** Course: enrollment fee 1000, monthly 500. Batch opened with a 100% entry discount:
- Student pays at enrollment: `0 (entry) + 500 (first month) = 500`
- Monthly thereafter: `500`
- If they later lapse, the penalty added is **1000** — the full undiscounted snapshot fee.

**Relationships**
- `Batch` * ─ 1 `Course`
- `Batch` * ─ * `User` (managers, via `BatchManager`)
- `Batch` 1 ─ * `Enrollment`

---

## 5. `Enrollment`

**The spine.** Everything financial hangs off this.

| Field | Notes |
|---|---|
| `id` | cuid |
| `studentId` | |
| `batchId` | |
| `status` | `pending` \| `active` \| `withdrawn` |
| `inPenalty` | Boolean guard preventing penalty stacking (PEN-06) |
| `enrolledAt` | |

**Status meanings**
- `pending` — enrolled via manual payment, awaiting verification
- `active` — verified; gateway enrollments land here immediately
- `withdrawn` — admin removed them

**A penalised student stays `active`.** The penalty adds a fee; it never ejects. `inPenalty` is a separate flag precisely so status and penalty state cannot be conflated (ENR-11, PEN-02).

**Invariants**
- Unique on `(studentId, batchId)` — no double enrollment (ENR-10)
- `inPenalty` clears when all periods are `paid` (PEN-07)

**Relationships**
- `Enrollment` * ─ 1 `Student`, * ─ 1 `Batch`
- `Enrollment` 1 ─ * `BillingPeriod`

---

## 6. `BillingPeriod`

One month's dues on one enrollment. **Tracks money, not merely status** — this is what makes partial payments reconcilable.

| Field | Notes |
|---|---|
| `id` | cuid |
| `enrollmentId` | |
| `periodMonth` | The month this covers |
| `amountOwed` | Decimal. First period includes entry fee. |
| `amountPaid` | Decimal. **Verified payments only.** |
| `dueDate` | Derived from the batch's due window |
| `status` | `unpaid` \| `pending` \| `partially_paid` \| `paid` |
| `createdAt` | |

**Outstanding = `amountOwed − amountPaid`, and it stays on this period.** A student owing 800 who pays an approved 600 has 200 outstanding *on that month* — it never merges into the next (BIL-07). This is what keeps monthly revenue reports reconcilable.

**Invariants**
- Unique on `(enrollmentId, periodMonth)` — guarantees idempotent generation (BIL-02, BIL-12)
- `amountPaid` derives from verified payments minus refunds; never set directly
- `status` derives from amounts, never assigned manually (BIL-09)

---

## 7. `Payment`

One money event, settling exactly one period.

| Field | Notes |
|---|---|
| `id` | cuid |
| `billingPeriodId` | Exactly one (PAY-01) |
| `amount` | Decimal, > 0 |
| `method` | `gateway` \| `manual` |
| `status` | `pending` \| `verified` \| `rejected` \| `expired` |
| `paidBy` | `student` \| `guest` |
| `guestName` / `guestPhone` | Guest payments only |
| `transactionReference` | Gateway txn id, or the bKash/bank reference |
| `proofUrl` | Screenshot — manual only |
| `verifiedBy` / `verifiedAt` | The deciding user |
| `createdAt` | |

**Behaviour**
- **Gateway** — created `pending` on redirect; the **webhook** settles it to `verified` (PAY-03). Expires after 60 minutes without a callback (PAY-05).
- **Manual** — created `pending`; a manager verifies or rejects. It does **not** contribute to `amountPaid` while pending, but it **does** protect from the penalty (PEN-05).

---

## 8. `Refund`

Reverses a payment. Admin-only, rare, and deliberately its own entity — a refund carries a reason and an authorizer that a payment does not, and mixing them would force every revenue query to filter on sign.

| Field | Notes |
|---|---|
| `id` | cuid |
| `paymentId` | The payment being reversed |
| `amount` | May be partial |
| `reason` | Required |
| `refundedBy` | Admin user |
| `refundedAt` | |

Issuing a refund decreases the linked period's `amountPaid`, honestly reopening the balance (RFD-04).

---

## 9. `Request`

Grace and partial payment are **mechanically different** — one moves a date, the other moves money — but share one approval shape, so they are one entity with a discriminating `type`.

| Field | Notes |
|---|---|
| `id` | cuid |
| `billingPeriodId` | The month concerned |
| `type` | `grace` \| `partial_payment` |
| `status` | `pending` \| `approved` \| `rejected` |
| `requestedAmount` | `partial_payment` only |
| `extendedDueDate` | `grace` only |
| `reason` | The student's explanation |
| `decidedBy` / `decidedAt` | |
| `createdAt` | |

**Authority:** `grace` → manager or admin. `partial_payment` → **admin only** (it accepts less money than owed, and managers never move money).

**Initiation:** a student applies (lands `pending`), or staff create a `grace` directly (created already `approved`).

A `pending` request protects from the penalty exactly like a pending payment (REQ-05).

---

## 10. `Notification`

| Field | Notes |
|---|---|
| `id` | cuid |
| `recipientUserId` | |
| `eventType` | See NTF table in `02-business-rules.md` |
| `channel` | `dashboard` \| `email` (extensible) |
| `relatedType` / `relatedId` | The period, payment, or batch referenced |
| `readAt` | Null until seen |
| `sentAt` | |

`channel` is **data, not branching logic** — adding SMS later is a new value, not a rewrite (NTF-05).

---

## 11. `AuditLog`

Append-only. Never updated, never deleted.

| Field | Notes |
|---|---|
| `id` | cuid |
| `actorUserId` | Nullable — the penalty job writes with `system` as actor |
| `action` | See AUD-04 for the full enumeration |
| `targetType` / `targetId` | |
| `details` | JSON — before/after values where relevant |
| `createdAt` | |

**Why it matters:** when a payment dispute arrives six months later, you must reconstruct *what the system believed and when*, not merely what a human clicked. `batch_status_changed` is especially important — flipping a batch to `completed` silently stops billing for everyone in it.

---

## Cross-cutting invariants

These hold across the whole model and MUST be enforced in the service layer:

1. **Money is never floating point.** Every amount is `Decimal(10,2)`.
2. **`amountPaid` is derived, never assigned.** It moves only via verified payments and refunds, inside a transaction.
3. **A period's outstanding balance never migrates.** Shortfalls stay on their own month.
4. **The penalty flag is a guard, not a status.** It prevents stacking; it does not describe enrollment state.
5. **Snapshots are immutable.** Once a batch copies a fee, nothing upstream may change it.
6. **Self-approval is impossible.** A manager may never decide anything on their own enrollment (RBAC-03).
7. **Every state change that touches money writes an audit entry.**

---

## 12. Class-management entities (added scope)

These attach to `Batch` and touch no billing table. They are the proof of the extensibility principle in practice.

### `Homework`
| Field | Notes |
|---|---|
| `id`, `batchId` | |
| `title`, `description` | |
| `dueDate` | End-of-Dhaka-day instant for the supplied calendar date |
| `createdAt` | Indexed on `(batchId, dueDate)` |

Students read homework across their **active** enrollments via `/me/homework`. Manager writes are batch-scoped.

### `RecordedClass`
| Field | Notes |
|---|---|
| `id`, `batchId` | |
| `title` | |
| `youtubeVideoId` | The **id**, not a URL — extracted on input |
| `recordedFor` | The class date (plain date; no deadline semantics) |
| `createdAt` | Indexed on `(batchId, recordedFor)` |

### `Batch.classLink`
A nullable field on `Batch`, not a separate entity — a single live-class link, manager-editable, shown to students on their active enrollments.

### `Batch.classStartsAt` / `Batch.classEndsAt`
Optional next-session window. Students may join from **5 minutes before** `classStartsAt` until `classEndsAt`. If either is unset, the join control stays locked with “schedule is not set yet.”

---

## What deliberately does not exist

Named here so implementers do not add them:

- **No `Teacher` entity** — teachers work off-platform.
- **No `currentPart` on `Enrollment`** — derived from the batch timeline.
- **No waitlist** — a full batch simply refuses enrollment.
- **No merged balance across enrollments** — each enrollment bills independently.
- **No attendance, exam, or certificate entities** — deferred. They will attach to `Enrollment` and `Batch` without altering existing tables. *(Homework and recorded classes, once deferred, are now built — see §12.)*
- **No `Resource` entity yet** — planned; will attach to `Batch` with a `url` field first, object storage later.

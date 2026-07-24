# 02 — Business Rules

**Purpose:** the authoritative, testable catalogue of every rule the system enforces. Each rule has a stable ID. Reference these IDs in code comments, commit messages, and test names.

**Precedence:** if this document conflicts with any other document, **this one wins**. If it conflicts with code, the code is wrong.

---

## Conventions

- **MUST / MUST NOT** — hard requirements. A violation is a bug.
- **Money** — all amounts are `Decimal(10,2)`. Never floating point.
- **Timezone** — all business dates evaluate in **Asia/Dhaka**. All timestamps persist in **UTC**.

---

## FEE — Fees and pricing

**FEE-01** — A `Course` MUST hold the *current* `enrollmentFee` and `monthlyFee`. These are the price list.

**FEE-02** — When a `Batch` is created it MUST **copy** (snapshot) the course's `enrollmentFee` and `monthlyFee` onto itself.

**FEE-03** — Editing a course's fees MUST NOT affect any existing batch or any enrolled student. Course edits apply only to batches created afterwards.

**FEE-04** — A `Batch` MAY define an `entryDiscountPercent` between `0` and `100` inclusive.

**FEE-05** — The **entry amount** a student pays at enrollment is:
`batch.enrollmentFee × (1 − entryDiscountPercent / 100)`
A 100% discount yields an entry amount of `0.00`.

**FEE-06** — The entry discount applies **ONLY** to enrollment. It MUST NOT reduce the penalty amount (see PEN-03).

**FEE-07** — `monthlyFee` is unused for courses where `billingType = one_time`.

---

## ENR — Enrollment

**ENR-01** — The **enrollable unit is the `Batch`**, never the `Course`.

**ENR-02** — A student MAY self-enroll **only** while `now` is within the batch's enrollment window (`enrollmentOpensAt` ≤ now ≤ `enrollmentClosesAt`).

**ENR-03** — Enrollment MUST be refused when the batch's active enrollment count has reached `capacity`. The user-facing message is **"Full — try next batch."** No waitlist exists.

**ENR-04** — Capacity checks MUST be concurrency-safe. Two simultaneous enrollments MUST NOT both succeed on the final seat.

**ENR-05** — At enrollment the student owes **entry amount (FEE-05) + first month's `monthlyFee`**, combined into the first billing period (BIL-03).

**ENR-06** — A gateway payment MUST set enrollment status to `active` immediately upon webhook confirmation.

**ENR-07** — A manual payment MUST leave enrollment status `pending` until a manager verifies the payment.

**ENR-08** — Only an **admin** MAY add a late joiner (enrolling a student after `enrollmentClosesAt`). Students MUST NOT be able to self-enroll late.

**ENR-09** — A student MAY hold multiple concurrent enrollments across different batches.

**ENR-10** — A student MUST NOT hold two active enrollments in the **same batch**. Enforced by a unique constraint.

**ENR-11** — A penalised student remains `active`. The penalty MUST NOT change enrollment status (see PEN-02).

---

## BIL — Billing periods

**BIL-01** — Billing periods apply **only** to courses where `billingType = monthly`. `one_time` courses MUST have no billing periods after the initial payment.

**BIL-02** — A billing period represents **one calendar month** of one enrollment. It is uniquely identified by `(enrollmentId, periodMonth)`.

**BIL-03** — The **first** billing period is the month containing the batch's `courseStartDate`. Its `amountOwed` = entry amount + `monthlyFee`.

**BIL-04** — Every subsequent period's `amountOwed` = the batch's snapshot `monthlyFee`.

**BIL-05** — A period's `dueDate` is derived from the batch's `dueDayStart`/`dueDayEnd` within that period's month.

**BIL-06** — The billing schedule is **anchored to the calendar**. A late payment MUST NOT shift any future period's `dueDate`.

**BIL-07** — Outstanding balance = `amountOwed − amountPaid`, and it MUST remain attached to its own period. A shortfall MUST NOT roll into the next month.

**BIL-08** — `amountPaid` MUST only ever increase from **verified** payments. Pending payments MUST NOT contribute.

**BIL-09** — Period status derives from amounts, not manual assignment:
| Condition | Status |
|---|---|
| `amountPaid = 0` and no pending payment | `unpaid` |
| a pending payment exists | `pending` |
| `0 < amountPaid < amountOwed` | `partially_paid` |
| `amountPaid ≥ amountOwed` | `paid` |

**BIL-10** — Advance payment MUST be refused unless every earlier period on that enrollment is `paid`.

**BIL-11** — When a batch's status becomes `completed`, no further billing periods MUST be generated for its enrollments. Existing unpaid periods remain owed.

**BIL-12** — Period generation MUST be **idempotent**. Running it twice for the same month MUST NOT create duplicates (guaranteed by BIL-02's unique constraint).

---

## PAY — Payments

**PAY-01** — One `Payment` MUST settle **exactly one** billing period. Clearing three months requires three payment records.

**PAY-02** — A gateway payment MUST be created with status `pending` when the user is redirected to SSLCommerz, carrying the transaction reference.

**PAY-03** — The **webhook/IPN callback is the sole source of truth** for gateway payment outcomes. The browser redirect MUST NOT be trusted to settle a payment.

**PAY-04** — Webhook handling MUST be **idempotent**. A duplicate callback for the same transaction MUST NOT double-credit a period.

**PAY-05** — A gateway payment still `pending` after **60 minutes** MUST be marked `expired` by a cleanup job.

**PAY-06** — A manual payment MUST require a `transactionReference` and a `proofUrl`, and MUST be created `pending`.

**PAY-07** — Only an assigned manager of the payment's batch, or an admin, MAY verify or reject a manual payment.

**PAY-08** — Verifying a payment MUST increase the period's `amountPaid` by the payment amount, atomically.

**PAY-09** — Rejecting a payment MUST NOT change `amountPaid`, and MUST remove that payment's penalty protection (PEN-05).

**PAY-10** — A payment amount MUST be greater than zero.

**PAY-11** — Payments MUST record `paidBy` (`student` | `guest`) and, for guests, `guestName` and `guestPhone`.

---

## GST — Guest payment

**GST-01** — A guest MUST be able to look up a student by **email, phone, or student ID** without authenticating.

**GST-02** — The lookup MUST return the student's **name** and a list of **each outstanding due separately** (course, batch, period month, amount outstanding).

**GST-03** — The guest MUST select which due(s) to pay. The system MUST NOT merge dues into a single combined total.

**GST-04** — An unmatched identifier MUST return no result and MUST NOT permit payment to proceed.

**GST-05** — The lookup MUST expose only name and amounts. No phone, email, address, or other profile data.

---

## PEN — Penalty (auto-cancel)

**PEN-01** — The penalty job MUST run at **00:00 Asia/Dhaka on the 6th of each month**, so a payment made at any time on the 5th still counts.

**PEN-02** — The penalty MUST NOT remove, withdraw, or deactivate the student. It adds a fee to their balance only.

**PEN-03** — The penalty amount is the batch's **full snapshot `enrollmentFee`**, undiscounted (FEE-06).

**PEN-04** — The penalty applies to an enrollment **only when all three hold**:
1. the period is `unpaid`, **and**
2. no `pending` payment exists for it, **and**
3. no approved grace covers it.

**PEN-05** — A `pending` payment **or** a `pending` request MUST protect the enrollment from the penalty. If that payment or request is later **rejected**, the penalty MUST be applied at the point of rejection.

**PEN-06** — The penalty MUST NOT stack. `enrollment.inPenalty` guards this: while `true`, no further penalty may be applied.

**PEN-07** — `enrollment.inPenalty` MUST clear to `false` once every billing period on that enrollment is `paid`.

**PEN-08** — The penalty applies **per enrollment**, not per student. Lapsing in one batch MUST NOT affect a student's other enrollments.

**PEN-09** — Only an **admin** MAY reverse an applied penalty.

**PEN-10** — Every penalty application MUST write an audit entry with the system as actor.

---

## REQ — Grace and partial payment requests

**REQ-01** — Two request types exist: `grace` (extends a deadline) and `partial_payment` (accepts less than owed).

**REQ-02** — A `grace` request MAY be decided by a **manager or an admin**.

**REQ-03** — A `partial_payment` request MUST be decided by an **admin only**.

**REQ-04** — A student MAY create either request type. Staff MAY additionally create a `grace` request directly, in which case it is created already `approved` with `decidedBy` set.

**REQ-05** — A `pending` request MUST protect its period from the penalty (PEN-05).

**REQ-06** — An approved `grace` MUST set an `extendedDueDate`, after which the penalty may apply if still unpaid.

**REQ-07** — An approved `partial_payment` MUST allow the student to pay `requestedAmount` without penalty. The shortfall remains outstanding on that period (BIL-07).

**REQ-08** — No notification is sent when a request is decided.

---

## RBAC — Authorization invariants

> Full matrix in `04-rbac.md`. These are the invariants that MUST be enforced regardless of route.

**RBAC-01** — A user MAY hold multiple roles simultaneously (`admin`, `manager`, `student`).

**RBAC-02** — A manager's authority is scoped to batches they are assigned to. Access to any other batch MUST be denied.

**RBAC-03** — **A manager MUST NOT verify a payment, reject a payment, or decide a request on their own enrollment.** Such actions MUST be refused and escalated to an admin. This applies even when the manager is legitimately assigned to that batch.

**RBAC-04** — All money-affecting actions — waivers, refunds, penalty reversal, marking a period paid without money, partial-payment approval — are **admin only**.

**RBAC-05** — A manager MUST NOT create or edit courses or batches, add late joiners, or remove students.

---

## RFD — Refunds

**RFD-01** — Only an **admin** MAY issue a refund.

**RFD-02** — A refund MUST reference the original `Payment` it reverses.

**RFD-03** — A refund MAY be partial (less than the original payment amount).

**RFD-04** — Issuing a refund MUST decrease the linked period's `amountPaid` by the refund amount, reopening the balance.

**RFD-05** — A refund MUST record `reason` and `refundedBy`.

---

## NTF — Notifications

**NTF-01** — Student-facing events MUST dispatch to **both** dashboard and email.

**NTF-02** — Manager-facing events MUST dispatch to **dashboard only**.

**NTF-03** — Notification dispatch MUST NOT block the business transaction that triggered it. Email sending MUST be queued.

**NTF-04** — A failed email MUST NOT roll back or fail the originating action.

**NTF-05** — Channel is a data value, not branching logic, so new channels (e.g. SMS) require no change to billing or payment code.

---

## AUD — Audit

**AUD-01** — Every money-affecting action and every discretionary override MUST write an `AuditLog` entry.

**AUD-02** — An audit entry MUST record: actor (user or `system`), action, target type, target id, timestamp, and relevant before/after values.

**AUD-03** — Audit entries MUST be **append-only**. They MUST NOT be updated or deleted.

**AUD-04** — Actions requiring an audit entry:
`enrollment_created`, `enrollment_status_changed`, `batch_created`, `batch_status_changed`, `course_created`, `course_updated`, `payment_submitted`, `payment_verified`, `payment_rejected`, `penalty_applied`, `penalty_reversed`, `refund_issued`, `request_created`, `request_decided`, `grace_granted`, `late_joiner_added`, `student_removed`, `user_role_changed`, `period_marked_paid_manually`, `class_link_updated`, `homework_created`, `homework_updated`, `homework_deleted`.

---

## TIME — Dates and timezone

**TIME-01** — All timestamps MUST persist in **UTC**.

**TIME-02** — All business-date evaluation (due dates, the penalty cutoff, period months) MUST occur in **Asia/Dhaka**.

**TIME-03** — The penalty cutoff is the **end of the 5th**, Asia/Dhaka. The job runs at 00:00 on the 6th.

**TIME-04** — `periodMonth` MUST be stored in a form that cannot be misread across timezones (first day of the month at 00:00 UTC, or a `YYYY-MM` string).

---

## Rule-to-test mapping

Every rule above MUST have at least one automated test referencing its ID in the test name:

```ts
describe('PEN-06: penalty must not stack', () => { ... });
describe('RBAC-03: manager cannot verify own enrollment payment', () => { ... });
```

Rules most likely to be violated by a naive implementation, and therefore requiring explicit test coverage before merge:

`ENR-04` · `BIL-07` · `BIL-08` · `BIL-10` · `PAY-04` · `PEN-04` · `PEN-05` · `PEN-06` · `RBAC-03` · `FEE-06`

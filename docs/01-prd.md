# 01 — Product Requirements Document

**Project:** An Nahda Academy — Enrollment & Subscription-Billing Platform
**Version:** 1.0
**Status:** Approved — baseline for all engineering work

---

## 1. Product summary

An Nahda Academy is an **enrollment and subscription-billing back-office** for a madrasa-style academy.

Teaching happens entirely off-platform (Telegram groups, Zoom sessions). This application is **not a learning platform** and delivers no course content. Its single responsibility is to be the **source of truth for who is enrolled and who has paid**.

The system manages courses, batches, enrollments, monthly subscription billing, manual and gateway payments, guest payments, penalties, notifications, and reporting.

**Design posture:** the system is a *scoreboard*, not an *enforcer*. It computes and records financial state and notifies the relevant people; humans act on that information outside the system.

---

## 2. Goals

- Be the authoritative record of enrollment and payment status.
- Run a deterministic, auditable monthly billing engine.
- Support payment by the student **or** by any third party (guest payment).
- Give admins academy-wide financial visibility with exportable history.
- Keep the core model clean so future features attach without rework.

## 3. Non-goals

Explicitly out of scope. These are **not** to be built, and no code should anticipate them beyond not blocking them:

- Course content delivery or live classes (teaching lives in Telegram/Zoom).
- In-app messaging.
- Attendance tracking, exams/assessments, class reports, certificates — **deferred to a later phase**.
- SMS notifications — deferred; the notification architecture must not block adding it.
- A `Teacher` role. Teachers operate off-platform and do not log in.

### Scope added since v1.0 (now built)

The client expanded scope after the original PRD. These attach to `Batch` and touch no core billing table, and are **built** (see `10-current-state.md`):

- **Class links** — a teacher sets a live-class link on a batch; students see it on their dashboard.
- **Homework** — teachers assign homework with a due date; students see it across their active enrollments.
- **Recorded classes** — teachers share YouTube recordings, embedded and viewable on the site.
- **Resources / notes** — *planned, not yet built* — teachers share links to materials; file upload deferred to object storage later.

These are course-management features on top of the enrollment/billing core, not a shift away from the product's identity as a billing back-office.

---

## 4. Users and roles

| Role | Scope | Summary |
|---|---|---|
| **Admin** | Global | Configures courses, opens/edits batches, adds late joiners, owns **all money-affecting actions**. Sees everything. The escape hatch for anything the system does not handle automatically. |
| **Teacher** | Assigned batch(es) only | Verifies/rejects manual payments, grants grace, views their batch's students and reporting. Cannot move money or leave their batch scope. |
| **Student** | Self | Enrolls during an open window, holds subscriptions, pays, monitors status via dashboard. |
| **Guest** | None (unauthenticated) | Pays on behalf of a student without an account. Not a persistent user. |

A single person may hold **multiple roles** (e.g. a teacher who is also enrolled as a student).

---

## 5. Core domain concepts

**Course** — the template. Name, description, billing type (`monthly` | `one_time`), current enrollment fee, current monthly fee, and an ordered list of descriptive parts (e.g. Basic / Intermediate / Advanced, 8 months each). Parts drive no logic.

**Batch** — a concrete instance of a course, created fresh each time enrollment opens. **This is the enrollable unit.** Owns capacity, enrollment window, course start date, payment due window, assigned teachers, and a **frozen snapshot of the course's fees** plus an optional entry discount.

**Enrollment** — one student in one batch. Carries the subscription. This is the spine of the system; payments attribute to an enrollment's periods, never to a payer.

**Billing period** — one month's dues on one enrollment. Tracks **money** (owed / paid / outstanding), not merely a status.

**Payment** — one money event, attributed to exactly one billing period. Originates from the student or a guest, via gateway or manual channel.

**Request** — a student-initiated (or staff-initiated) application for **grace** (deadline extension) or **partial payment** (approved short-payment).

---

## 6. Enrollment lifecycle

1. A batch opens for enrollment within its window. Enrollment is possible **only** while the window is open.
2. Capacity is admin-set and editable. When full, the system shows **"Full — try next batch."** No waitlist.
3. At enrollment the student pays **entry fee + first month's fee together**. Entry fee = the batch's snapshot enrollment fee, reduced by the batch's entry discount (0–100%).
4. **Gateway payment → enrolled instantly.** **Manual payment → enrollment `pending`** until a teacher verifies.
5. **Late joiners** may be added **only by an admin**, after the window closes. Students cannot self-join late.
6. Enrollment persists as an ongoing subscription (monthly courses) or terminates on the single payment (one-time courses).

---

## 7. Billing

> Applies to `monthly` courses only. **`one_time` courses skip billing entirely** — the student pays once, is enrolled, and has no periods, no due window, and no penalty.

- **Due window:** configured per batch (default 1st–5th of the month).
- **Anchored schedule:** the schedule follows the calendar, not the student's behaviour. Late payment settles its own period but **never shifts** future due dates.
- **First period:** the month containing the batch's `courseStartDate`. Its `amountOwed` includes the entry fee plus the first month's fee.
- **Period states:** `unpaid → pending → partially_paid → paid`.
- **Advance payment:** permitted only when the current month is settled. Paying ahead never allows skipping an unpaid month.
- **Billing stops** when a batch is marked `completed`. Existing unpaid dues survive.

### Penalty (auto-cancel)

A scheduled job runs at **00:00 Asia/Dhaka on the 6th** (so a payment made any time on the 5th still counts).

A penalty applies **only if all three hold**:
1. the period is unpaid, **and**
2. there is **no pending payment** on file for it, **and**
3. there is **no approved grace** covering it.

When applied, the batch's **full snapshot enrollment fee** (never discounted) is added once to the student's balance.

**Critical constraints:**
- It **does not remove the student.** "Cancellation" means only that the re-enrollment fee is added. The student keeps their place.
- It **never stacks.** At most once per lapse, regardless of months missed. The flag clears once all dues are settled.
- **Timely-pending submissions are protected.** A pending payment or pending request shields the student. If a teacher later *rejects* it, the penalty applies at the point of rejection.

---

## 8. Payments

**Channels:** gateway (SSLCommerz — trusted, instant) and manual (transaction reference + proof screenshot — `pending` until a teacher verifies).

**Attribution:** one payment settles **exactly one** billing period. Three months of arrears = three payment records.

**Gateway authority:** the **webhook/IPN callback is the source of truth**, never the browser redirect. A payment is created `pending` on redirect and resolved by the webhook; if no callback arrives within 60 minutes it expires.

**Guest payments:**
1. Guest enters the student's **email, phone, or Student ID**.
2. System returns the matched **student name** and a **list of each outstanding due separately** (course, month, amount).
3. Guest selects which due(s) to pay and pays by gateway or manual channel.

Because the guest must confirm a matched student and a real amount before paying, an unmatched identifier cannot proceed — orphaned money is prevented at entry.

*Accepted privacy tradeoff:* the lookup reveals a student's name to anyone entering a valid identifier. No data beyond name and amounts is exposed. Rate limiting is deferred.

---

## 9. Requests: grace and partial payment

Two distinct mechanisms sharing one approval shape.

| | **Grace** | **Partial payment** |
|---|---|---|
| Changes | A **date** — extends the deadline | **Money** — accepts less than owed now |
| Approver | Teacher **or** admin | **Admin only** |
| Initiated by | Student request, or staff directly | Student request |
| Effect | Full amount still owed, later | Shortfall stays outstanding **on that period** |

A `pending` request protects the student from the penalty, exactly like a pending payment.

**A teacher may never decide a request, verify a payment, or grant grace on their own enrollment** — it must escalate to an admin.

No notification is sent when a request is decided; the student checks their dashboard.

---

## 10. Student identity

- **Verified email** — the unique identifier and login handle (stored on `User`).
- **Phone** — required on every student profile; a fallback lookup handle.
- **Student ID** — sequential, human-readable (e.g. `ANA-0001`); the primary guest-facing lookup handle.
- A student **may exist without a login account** (created by an admin, paid for by a guest, managed offline).
- A student may hold **multiple concurrent enrollments** across different courses and batches.

---

## 11. Notifications

Decoupled subsystem driven by a rule table so channels can be added without touching billing logic.

**Policy:** student-facing events → **dashboard + email**. Teacher-facing events → **dashboard only**.

| Event | Audience |
|---|---|
| Payment due soon | Student |
| Payment received / verified | Student |
| Manual payment rejected | Student |
| Penalty applied | Student |
| Fell behind on payment | Student |
| New batch opening | Student |
| Pending payments awaiting verification | Teacher |
| Students at risk of penalty | Teacher |

---

## 12. Reporting

Scope follows the permission boundary: **teachers see only their batch(es); admins see academy-wide.**

- **Revenue** — collected this month, per batch and total; expected vs. actual.
- **Outstanding / overdue** — students in penalty or unpaid, and total owed.
- **Enrollment counts** — active students per batch and course; seats filled vs. capacity.
- **Payment ledger** — every transaction, verifiable.
- **Audit trail** — every money-affecting and discretionary action, with actor and timestamp.

**Admin-only:** exportable month-by-month historical financial records.

---

## 13. Extensibility principle

Future features (exams, certificates, attendance, class reports, SMS, file uploads) attach to `Enrollment` and `Batch` without schema changes to existing tables.

**This has been proven in practice.** Five features — guest payments, class links, homework, recorded classes, and the penalty engine — attached without a single migration to a core billing table. The class features each added one table (or one field) referencing `Batch` and reused the existing `BatchScopeGuard` unchanged.

**The rule for implementers:** do not build deferred features, and do not add speculative fields or abstractions for them. Extensibility is protected by correct boundaries — payment attributed to a period, notifications behind a rule table, a deterministic billing engine with all discretion pushed into logged human actions — not by anticipatory code.

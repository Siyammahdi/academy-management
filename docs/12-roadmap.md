# 12 — Roadmap

**Purpose:** what remains, in the order it should be built, with the rule IDs each feature must satisfy. An agent picking up any item here should be able to open the referenced rules and know exactly what "correct" means.

---

## Guiding principle

Every remaining feature attaches to the existing model without altering core tables — the same property that made the class features easy. Payment attributes to a period; content attaches to a batch; notifications sit behind a rule table. **Do not restructure existing entities to add a feature.** If a change seems to require altering `Enrollment`, `BillingPeriod`, or `Payment`, stop and reconsider — it almost certainly doesn't.

---

## Phase 1 — Complete the specified core

These were in the original specification and remain unbuilt. They finish the product as designed.

### R-01 · Notifications (NTF family)
**Why first:** the product's job is telling students who owe money. Right now nothing notifies anyone. This is the largest functional gap against the original PRD.

- Dispatch subsystem driven by a rule table (NTF-05) — channel is data, not branching logic.
- Student events → dashboard + email (NTF-01). Teacher events → dashboard only (NTF-02).
- Email sent via a queued BullMQ job (NTF-03); a failed email must not roll back the triggering action (NTF-04).
- Events per doc 02 NTF table: due-soon, payment received/verified, payment rejected, penalty applied, fell behind, new batch, plus the teacher-facing queue/at-risk notices.
- Needs an email provider (Resend or similar) behind an interface.

**Attaches to:** a new `Notification` consumer + the existing `email` BullMQ queue slot. Triggers fire from existing services (payment verify, penalty apply) — add dispatch calls, do not restructure those services.

### R-02 · Grace and partial-payment requests (REQ family)
**Why:** the `Request` model exists in the schema but has no behaviour. These are the human-override paths the penalty engine already expects (PEN-05 protects pending requests).

- Student creates `grace` or `partial_payment` requests (REQ-01, REQ-04).
- `grace` decided by teacher or admin (REQ-02); `partial_payment` **admin only** (REQ-03).
- A teacher may never decide a request on their own enrollment (RBAC-03) — reuse `SelfApprovalGuard`.
- A pending request protects from the penalty (REQ-05, PEN-05) — the penalty job already checks for this; confirm the query includes pending requests.
- Approved grace sets `extendedDueDate` (REQ-06); approved partial payment permits short payment, shortfall stays on the period (REQ-07, BIL-07).
- No notification on decision (REQ-08).

**Attaches to:** `Request` (already in schema) → `BillingPeriod`. The penalty gate already anticipates this — verify PEN-04 condition 3 reads approved grace correctly.

### R-03 · Reporting and export
**Why:** admins need financial visibility; teachers need their batch's state.

- Revenue, outstanding, enrollment counts, payment ledger, audit trail (doc 06 §11).
- Scope by role: teachers see their batches only, admins see academy-wide (RBAC-02).
- Admin-only CSV export, month-by-month (doc 01 §12).

**Attaches to:** read-only queries over existing tables. No new writable entities. Money aggregation uses `Decimal`, computed server-side.

### R-04 · Role-management UI
**Why:** roles are currently assigned only through Prisma Studio. The client cannot add a teacher after handover without developer help.

- Admin-only: list users, view and toggle roles, assign/disable (doc 06 §11, RBAC-04).
- `user_role_changed` audit entry (AUD-04).

**Attaches to:** `User` / `UserRole` (exist). One admin page + endpoints.

---

## Phase 2 — Client-added scope

### R-05 · Resources / notes / files
Teacher-shared materials on a batch.

- New `Resource` table → `Batch`: title, type, `url`, createdAt. Teacher-scoped writes.
- **Ship with a `url` field first** — teachers paste links (Drive, etc.). No storage code needed.
- **Later:** object storage (Cloudflare R2 — S3-compatible, zero egress) behind the same `url` field. The data model does not change when upload is added.
- Same pattern as homework/recordings: attaches to `Batch`, reuses `BatchScopeGuard`.

---

## Phase 3 — Deferred from the very beginning

Named in doc 01 as non-goals. Only build when the client explicitly prioritizes them.

- Attendance tracking
- Exams / assessments / grading
- Class reports
- Certificates
- SMS notifications (the channel slot already exists — NTF-05 makes this additive)

Each attaches to `Enrollment` or `Batch` as new tables. None require changing existing schema.

---

## Scaling guidance

The architecture is single-instance and correct for an academy's load (a few hundred students, monthly billing spikes). If genuine scale ever arrives:

- **The worker is already a separate process** — it scales independently of the API.
- **Reads dominate** around the billing window; add Redis caching (Redis is already present) on hot read paths before adding instances.
- **The penalty and billing jobs are batched** (chunks of 100) — they already handle growth in enrollment count without loading everything into memory.
- **Horizontal API scaling** needs only session-statelessness, which JWT already provides.

None of this is needed now. The point is that the boundaries were drawn so scale is an operational change, not a rewrite.

---

## The rule that governs all of it

Every item above has rule IDs or a clear attachment point. **Build to the rules, test to the rule IDs, and do not add fields, tables, or abstractions the spec doesn't call for.** The system's coherence comes from that discipline — the same discipline that let five features (guest payments, class link, homework, recordings, and the penalty engine) attach without a single migration to a core table.

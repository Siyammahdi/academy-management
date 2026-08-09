# 10 — Current State

**Purpose:** an honest inventory of what exists, what's tested, what's verified, and what's known-broken or unverified. This is the map for anyone building on top of the system.

**Reliability note.** Test counts and behaviour below are as reported by the implementation process. Passing tests confirm *specified behaviour under test conditions* — they do not confirm the UI renders correctly or that flows work end to end in a browser. Where something has **not** been verified, it says so. Trust this document's "unverified" flags as much as its "done" ones.

---

## 1. Status legend

| Mark | Meaning |
|---|---|
| ✅ Built + tested | Implemented, has automated tests, behaviour verified against real Postgres |
| 🟡 Built, thin coverage | Implemented, compiles, but limited or no automated tests |
| 🌐 Unverified in browser | Backend contract verified; the rendered UI has never been visually checked |
| ⛔ Not built | Specified but not implemented |
| ⚠️ Known issue | A defect or risk that needs attention before production |

---

## 2. Backend modules

| Module | State | Notes |
|---|---|---|
| Auth | ✅ | Register, login, JWT + refresh rotation (SHA-256 hashed, rotated on use), argon2 passwords, 4 guards; `lastLoginAt` on login |
| Profile | 🟡 🌐 | `GET/PATCH /me/profile`, avatar binary, password change; shared UI on admin/teacher/student |
| Users / Roles | ✅ 🌐 | List/create users; additive assign/remove; `PUT /users/:id/roles` replace-one; admin detail pages |
| Students | ✅ 🌐 | Directory + `GET /students/:id` detail (billing + audit); admin UI |
| Courses | ✅ | CRUD, archive, fee definitions, parts (JSON, inert), in-DB cover thumbnail, public `slug`, marketing fields (`featured`, tagline, highlights, …), `GET /courses?featured=true`, resolve by id or slug |
| Batches | ✅ | CRUD, **fee snapshotting** (FEE-02/03 tested), capacity, windows, multi-teacher assignment |
| Enrollment | ✅ | Self-enroll, late joiners, withdrawal; concurrency-safe capacity with `SELECT FOR UPDATE` + Serializable + bounded P2034 retry |
| Billing | ✅ | Period generation, amount-derived status, `/me/billing-periods` |
| Payments | ✅ | Manual + gateway, verify, reject, refund, expiry; period status persisted on write (BIL-09) |
| Gateway (SSLCommerz) | 🟡 🌐 | Sandbox credentials configured via env. Session init + IPN signature + Order Validation API. Still needs one live sandbox round-trip with a public IPN URL (H-01). |
| Guest payments | ✅ | Lookup + pay, sharing the payments write path; GST-05 field-leak discipline enforced |
| Jobs (BullMQ) | ✅ | Penalty sweep, billing generation, gateway expiry; batched, idempotent, observable; admin manual-trigger endpoints |
| Audit | ✅ | Append-only, written on every money-affecting and content mutation |
| Class link | ✅ | Field on `Batch`, teacher-editable |
| Homework | ✅ | Table → `Batch`, due date at end-of-Dhaka-day, student `/me/homework` |
| Recorded classes | ✅ | Table → `Batch`, YouTube video-id stored (not URL), student `/me/recordings` |

### Not built (backend)

| Feature | Rule family | Notes |
|---|---|---|
| Notifications | NTF | ⛔ No dispatch, no email, no rule table. Nothing notifies anyone. |
| Grace / partial-payment requests | REQ | ⛔ `Request` model exists in schema; no service, controller, or approval flow |
| Reporting + CSV export | — | Built in reporting module; verify against doc 06 §11 |
| Payment reminders / email dispatch jobs | NTF | ⛔ Listed in doc 07 §5; not implemented |
| Resources / notes / files | — | ⛔ Client-requested; not started. Plan: `url` field first, object storage later |

---

## 3. Frontend

| Area | State |
|---|---|
| Design tokens (`tailwind.config.ts`) | ✅ 🌐 Purple palette, type, spacing per doc 09 |
| Primitives (Button, Input, Card, Pill, Select, Modal, Textarea) | 🟡 🌐 |
| Ledger components (LedgerLine, AmountCell, StatusPill) | 🟡 🌐 The signature component |
| Auth pages (login, register, verify-email, forgot/reset password) | 🌐 Register requires OTP verify; password reset uses queued HTML email + single-use 30-min token |
| Public: about, contact | 🌐 Editorial rebuild; photography from `lib/marketing/media.ts` |
| Public: landing page | 🌐 Eight editorial sections, GSAP motion; featured courses drive the programs stack (`GET /courses?featured=true`); fees/seats from live API |
| Public: course details (`/courses/[slug]`) | 🌐 Dynamic from `GET /courses/:slug` — marketing copy, parts, fees, open batches |
| Public: marketing copy + photography registries (`lib/marketing/`) | 🌐 Section chrome + i18n. Program body copy comes from course marketing fields. **Unsplash placeholders** pending client photography / course covers |
| Marketing motion utilities (`lib/gsap/`) | 🌐 Mask reveals, parallax, counters, line draw, magnetic CTA; all gated on `prefers-reduced-motion` |
| Public: guest payment (`/pay`) | 🌐 Three-step flow |
| Admin: overview, courses, batches, roster, payments | 🌐 |
| Teacher: overview, batches, roster, verification queue | 🌐 |
| Student: dashboard (featured onboarding home), dues, payments, browse/enroll, payment modal | 🌐 |
| Class features UI (link, homework, recordings) | 🌐 |

**Deliberately absent from the public site:** testimonials, student success stories, and any aggregate statistic the platform cannot evidence. The live figures on the home page are counted from `GET /courses` and `GET /batches` and hide themselves when there is nothing open. Add a testimonials section only when real, attributable quotes exist.

**Every ✅/🟡 frontend item is also 🌐 — no page in this application has been visually verified in a browser.** Layout, contrast, responsive behaviour, and visual alignment are unconfirmed. This is the single largest verification gap.

---

## 4. Known issues and risks

Ordered by severity for a system that handles money.

### High

- **⚠️ SSLCommerz never tested against a live sandbox.** Signature verification is implemented from documentation. If it's wrong, every real payment is rejected. Must be proven with one real sandbox round-trip before any production use. *(Owner has credentials; integration planned but not done.)*
- **⚠️ No end-to-end browser verification.** ~20+ pages have never been rendered and clicked. The `Enrollment.status` bug (below) is direct evidence that "tests pass" has diverged from "works" at least once.

### Medium

- **⚠️ Auth token in a non-`httpOnly` cookie.** Readable by JavaScript, so XSS-exposed. Acceptable for development; must be hardened before production (see `11-hardening.md`).
- **⚠️ No rate limiting anywhere.** The public guest-lookup endpoint returns a student's name for any valid identifier, and student IDs are sequential/enumerable. Deferred by decision; revisit before launch.
- **⚠️ `middleware.ts` uses a convention Next 16 deprecates.** Functional, emits a build warning. Migrate to the `proxy.ts` convention when its contract is confirmed.

### Resolved (recorded so the class of bug is remembered)

- **`Enrollment.status` never transitioned `pending → active`.** Payment verification updated the period and penalty flag but not the enrollment, so every "active enrollment" filter returned nothing. Fixed idempotently on both manual and gateway paths, with a test. *Lesson: earlier features were never verified through a real activation — the exact gap browser testing would have caught.*
- **Period status was corrected at read-time only**, leaving the DB column stale — which the penalty job (reading the column directly) would have misread. Fixed at the write layer.
- **BullMQ connection leak** from passing a pre-built ioredis client. Fixed by letting BullMQ own its connections.

---

## 5. Test coverage snapshot

As reported: **~85 unit tests, ~48 e2e tests** against real Postgres, all passing.

Coverage is strongest exactly where it should be — billing, payments, penalty, and RBAC invariants, each with tests named for their rule IDs (`PEN-06`, `BIL-07`, `RBAC-03`, etc.). Frontend has no automated tests; it relies on typecheck, lint, build, and API-contract verification.

**What tests do not cover:** visual rendering, responsive layout, real gateway round-trips, and any flow a human would notice but a typechecker would not.

---

## 6. Deviations from the original docs

Recorded so the docs stay trustworthy:

- **Class features (link, homework, recordings) were "deferred non-goals" in doc 01** and are now built. Doc 01 §3 and doc 03's "what deliberately does not exist" should be updated to reflect this.
- **Three auth error codes** (`EMAIL_ALREADY_REGISTERED`, `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`) were added beyond doc 06 §1's list.
- **Email verification** (`isEmailVerified`, `OtpCode`, `POST /auth/verify-email`, `POST /auth/resend-email-verification`, `EMAIL_NOT_VERIFIED`) — register no longer issues tokens until the email OTP is verified.
- **Several audit actions** were added beyond doc 02 AUD-04's enumeration: `payment_expired`, `class_link_updated`, `homework_created/updated/deleted`, `recording_added/updated/deleted`.
- **Prisma 7** conventions (driver adapter, `url` out of schema) supersede doc 05's original Prisma 6 form; doc 05 §2/§2.1 were updated to match.
- **Guest lookup omits `studentId`** from its response, following GST-05's rule over doc 06 §8's illustrative JSON.

None of these are problems — they're drift that the next person needs to know about so the docs remain the source of truth.

---

## 7. What "done" would mean from here

The core product from the original specification is **functionally complete and tested**: enrollment, billing, the penalty engine, payments (manual + gateway + guest), and the class features. What stands between this and a confident production delivery:

1. One real SSLCommerz sandbox round-trip.
2. A full browser walk-through of every role's flow.
3. The hardening items in `11-hardening.md`.
4. The remaining specified features in `12-roadmap.md`, in priority order.

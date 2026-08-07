# 06 — API Design

**Base URL:** `/api/v1`
**Format:** JSON. All money serialized as **strings** (`"1500.00"`) to survive JSON's float imprecision.

---

## 1. Conventions

### Naming
- Resources are **plural nouns**: `/courses`, `/batches`, `/payments`.
- Actions that are not CRUD are **sub-resource verbs**: `POST /payments/:id/verify`, `POST /requests/:id/decide`.
- Self-scoped reads live under `/me`: `GET /me/profile`, `GET /me/enrollments`, etc.

### Status codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Validation failure |
| `401` | Missing/invalid token |
| `403` | Authenticated but not permitted |
| `404` | Not found |
| `409` | Business-rule conflict (batch full, duplicate enrollment, already verified) |
| `422` | Semantically invalid (advance payment while arrears exist) |
| `500` | Unhandled |

### Error shape

Every error returns this envelope. No exceptions.

```json
{
  "statusCode": 409,
  "error": "BATCH_FULL",
  "message": "Full — try next batch.",
  "details": null,
  "timestamp": "2026-07-23T10:04:00.000Z",
  "path": "/api/v1/batches/clx123/enroll"
}
```

`error` is a stable machine-readable code — the frontend switches on it, never on `message`. Validation failures populate `details` with per-field messages.

### Error codes

`BATCH_FULL` · `ENROLLMENT_WINDOW_CLOSED` · `ALREADY_ENROLLED` · `ARREARS_EXIST` · `PAYMENT_ALREADY_SETTLED` · `PAYMENT_AMOUNT_INVALID` · `SELF_APPROVAL_FORBIDDEN` · `BATCH_NOT_ASSIGNED` · `INSUFFICIENT_PERMISSIONS` · `STUDENT_NOT_FOUND` · `PERIOD_ALREADY_PAID` · `INVALID_WEBHOOK_SIGNATURE` · `INVALID_RESET_TOKEN` · `RESET_TOKEN_EXPIRED` · `TOO_MANY_REQUESTS` · `EMAIL_ALREADY_REGISTERED` · `INVALID_CREDENTIALS` · `INVALID_REFRESH_TOKEN` · `EMAIL_NOT_VERIFIED` · `EMAIL_ALREADY_VERIFIED` · `OTP_EXPIRED` · `OTP_INVALID` · `OTP_TOO_MANY_ATTEMPTS` · `OTP_NOT_FOUND` · `OTP_RESEND_COOLDOWN` · `THUMBNAIL_INVALID` · `COURSE_SLUG_TAKEN` · `GATEWAY_SESSION_FAILED` · `GATEWAY_NOT_CONFIGURED`

Auth (added during implementation): `EMAIL_ALREADY_REGISTERED` · `INVALID_CREDENTIALS` · `INVALID_REFRESH_TOKEN` · `EMAIL_NOT_VERIFIED` · `EMAIL_ALREADY_VERIFIED` · OTP codes (`OTP_*`)

### Pagination

List endpoints accept `?page=1&limit=20` (max `100`) and return:

```json
{
  "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 143, "totalPages": 8 }
}
```

### Dates
Requests and responses use **ISO 8601 UTC** (`2026-03-01T00:00:00.000Z`). `periodMonth` serializes as `"2026-03"`. The client renders in Asia/Dhaka.

---

## 2. Auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Creates `User` + `Student`, assigns `student` role. Does **not** issue tokens. Sends email verification OTP. |
| `POST` | `/auth/verify-email` | Public | `{ email, code }` — marks `isEmailVerified`. Rate-limited. |
| `POST` | `/auth/resend-email-verification` | Public | `{ email }` — new OTP + email. Cooldown + rate-limited. Always opaque success when unknown. |
| `POST` | `/auth/login` | Public | Returns access + refresh token. Rejects `EMAIL_NOT_VERIFIED` until verified. |
| `POST` | `/auth/refresh` | Public | Rotates the refresh token |
| `POST` | `/auth/forgot-password` | Public | Always `200`. Emails a reset link when the address is registered; never reveals whether it is. Rate-limited (5/min/IP). |
| `POST` | `/auth/reset-password` | Public | `{ token, newPassword }` — single-use, 30-min token; revokes all refresh tokens on success |
| `POST` | `/auth/logout` | Auth | Revokes the refresh token |
| `GET` | `/auth/me` | Auth | Current user, roles, linked student (`fullName` from `User.fullName` with Student fallback) |

### Profile (self-service)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/me/profile` | Auth | Full profile: personal, contact, account (read-only), role-specific academic blocks |
| `GET` | `/me/profile/avatar` | Auth | Binary avatar bytes (`Content-Type` from stored mime). `404 AVATAR_NOT_FOUND` when unset |
| `PATCH` | `/me/profile` | Auth | Update own profile only. Cannot change role, status, or permissions |
| `PATCH` | `/me/profile/password` | Auth | `{ currentPassword, newPassword, confirmPassword }` — revokes all refresh tokens on success |
| `DELETE` | `/me/profile` | Auth | `{ password, confirmation }` — `confirmation` must match account email. Disables account, scrubs PII, revokes sessions. Blocks deleting the last active admin (`LAST_ADMIN_DELETE_BLOCKED`) |

### Users & students (admin directory)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/users?role=&q=` | Admin | Directory / teacher picker |
| `GET` | `/users/:id` | Admin | Full user detail (profile, teacher block, audit) |
| `GET` | `/users/:id/avatar` | Admin | Binary avatar |
| `POST` | `/users` | Admin | Provision account + roles |
| `PUT` | `/users/:id/roles` | Admin | `{ role }` — **replaces** the role set with exactly one role; audits `user_role_changed` (`change: 'replaced'`); returns `{ user, warnings[] }` |
| `POST` | `/users/:id/roles` | Admin | Additive assign (RBAC-01) |
| `DELETE` | `/users/:id/roles/:role` | Admin | Remove one role; `LAST_ADMIN` / `CANNOT_STRIP_OWN_ADMIN` |
| `GET` | `/students?page&limit&q&status` | Admin | Student directory |
| `GET` | `/students/count` | Admin | |
| `GET` | `/students/:id` | Admin | Full student detail (linked user, billing, payments, audit) |

```jsonc
// PUT /users/:id/roles → 200
{ "user": { "id": "…", "email": "…", "roles": ["teacher"], "…" }, "warnings": ["…"] }
```

```jsonc
// GET /me/profile → 200 (abridged)
{
  "id": "clx...",
  "email": "teacher@example.com",
  "status": "active",
  "fullName": "Ayesha Rahman",
  "phone": "017…",
  "gender": "female",
  "dateOfBirth": "1990-05-12",
  "bloodGroup": "B+",
  "nationality": "Bangladeshi",
  "nationalId": null,
  "addressLine": "…",
  "city": "Dhaka",
  "district": "Dhaka",
  "postalCode": "1207",
  "country": "Bangladesh",
  "hasAvatar": true,
  "lastLoginAt": "2026-07-30T08:00:00.000Z",
  "createdAt": "…",
  "updatedAt": "…",
  "roles": ["teacher"],
  "emailVerified": false,   // verification flows not built yet
  "phoneVerified": false,
  "teacher": {
    "employeeId": "T-12",
    "designation": "Instructor",
    "department": "Quran",
    "bio": "…",
    "qualifications": "…",
    "experience": "…",
    "joiningDate": "2024-01-15",
    "assignedCourses": [{ "id": "…", "title": "…", "slug": "…" }],
    "assignedBatches": [{ "id": "…", "name": "…", "course": { "id": "…", "title": "…", "slug": "…" } }]
  },
  "student": null,
  "admin": null
}

// PATCH /me/profile — editable scalars + optional nested teacher/student + avatar
// avatar: { mimeType, data } (base64 / data-URL), or clearAvatar: true
// Errors: 409 EMAIL_TAKEN · 409 PHONE_TAKEN · 400 AVATAR_INVALID

// PATCH /me/profile/password → 204
// Errors: 400 CURRENT_PASSWORD_INCORRECT · 400 PASSWORD_CONFIRMATION_MISMATCH

// DELETE /me/profile → 204
// Body: { "password": "…", "confirmation": "user@example.com" }
// Errors: 400 CURRENT_PASSWORD_INCORRECT · 400 ACCOUNT_DELETE_CONFIRMATION_INVALID · 409 LAST_ADMIN_DELETE_BLOCKED
```

```jsonc
// POST /auth/login → 200
{
  "accessToken": "eyJ...",       // 15 min
  "refreshToken": "eyJ...",      // 7 days, rotated on use
  "user": {
    "id": "clx...",
    "email": "student@example.com",
    "roles": ["student", "teacher"],
    "studentId": "ANA-0042"
  }
}
```

```jsonc
// POST /auth/forgot-password → 200 (empty body)
{ "email": "student@example.com" }

// POST /auth/reset-password → 200 (empty body)
{ "token": "…", "newPassword": "at-least-8-chars" }
// Errors: 400 INVALID_RESET_TOKEN · 400 RESET_TOKEN_EXPIRED · 429 TOO_MANY_REQUESTS (forgot only)
```

---

## 3. Courses

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/courses` | Public | Active only. Optional `?featured=true` (ordered by `featuredOrder`). Each course includes `hasThumbnail` (boolean) and marketing fields. Image bytes are never inlined. |
| `GET` | `/courses/:idOrSlug` | Public | By cuid **or** slug. Includes batches whose enrollment window is open now (ENR-02), including `running` if the window has not closed. |
| `GET` | `/courses/:idOrSlug/thumbnail` | Public | Raw cover image (`Content-Type` from stored mime). `404` when none. |
| `POST` | `/courses` | Admin | Optional slug (auto from title), marketing fields, `thumbnail: { mimeType, data }` (base64) |
| `PATCH` | `/courses/:id` | Admin | **Never affects existing batches** (FEE-03). Optional thumbnail replace, or `clearThumbnail: true` |
| `POST` | `/courses/:id/archive` | Admin | Also clears `featured` |

```jsonc
// POST /courses
{
  "title": "Learning Arabic Language",
  "slug": "learning-arabic-language", // optional — auto from title
  "description": "...",
  "billingType": "monthly",
  "enrollmentFee": "1000.00",
  "monthlyFee": "500.00",
  "parts": [
    { "name": "Basic", "durationMonths": 8 },
    { "name": "Intermediate", "durationMonths": 8 },
    { "name": "Advanced", "durationMonths": 8 }
  ],
  "featured": true,
  "featuredOrder": 0,
  "tagline": "Read, write, and speak with confidence.",
  "category": "Arabic",
  "emphasis": "from the foundations",
  "focus": "A clear path from alphabet to fluency.",
  "highlights": ["Live classes with recorded catch-up"],
  "audience": "Beginners and returning students…",
  "outcomes": ["Everyday conversation confidence"],
  // optional — jpeg/png/webp/gif, decoded size ≤ 2 MB, stored as Bytes on the row
  "thumbnail": {
    "mimeType": "image/jpeg",
    "data": "<base64>"
  }
}
```

Error codes: `THUMBNAIL_INVALID` (400) · `COURSE_SLUG_TAKEN` (409).
---

## 4. Batches

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/batches` | Public | Filter `?status=enrolling&courseId=` · `?open=true` = within enrollment window (ENR-02), not only status `enrolling` |
| `GET` | `/batches/:id` | Public | Includes `seatsRemaining` |
| `POST` | `/batches` | Admin | **Snapshots course fees** (FEE-02) |
| `PATCH` | `/batches/:id` | Admin | |
| `POST` | `/batches/:id/status` | Admin | `completed` stops billing (BIL-11) |
| `POST` | `/batches/:id/teachers` | Admin | Assign a teacher |
| `DELETE` | `/batches/:id/teachers/:userId` | Admin | |
| `GET` | `/batches/:id/roster` | Teacher (own) / Admin | |
| `GET` | `/me/taught-batches` | Teacher / Admin | Batches the actor is assigned to |
| `GET` | `/me/taught-batches/at-risk-count` | Teacher / Admin | Count of assigned batches needing attention |

```jsonc
// POST /batches — fees are NOT accepted from the client; they are copied from the course
{
  "courseId": "clx...",
  "name": "Batch 8",
  "capacity": 30,
  "entryDiscountPercent": 100,
  "courseStartDate": "2026-08-01T00:00:00.000Z",
  "enrollmentOpensAt": "2026-07-15T00:00:00.000Z",
  "enrollmentClosesAt": "2026-07-31T23:59:59.000Z",
  "dueDayStart": 1,
  "dueDayEnd": 5
}
```

---

## 5. Enrollment

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/batches/:id/enroll` | Student | Window + capacity checked (ENR-02, ENR-04) |
| `POST` | `/batches/:id/late-joiner` | **Admin** | Bypasses the window (ENR-08) |
| `POST` | `/enrollments/:id/withdraw` | **Admin** | |
| `POST` | `/enrollments/:id/reinstate` | **Admin** | Reinclude withdrawn student (capacity checked → `active`) |
| `GET` | `/me/enrollments` | Student | |

```jsonc
// POST /batches/:id/enroll → 201
{
  "enrollment": { "id": "clx...", "status": "pending" },
  "firstPeriod": {
    "id": "clx...",
    "periodMonth": "2026-08",
    "amountOwed": "500.00",     // entry (0 after 100% discount) + monthly 500
    "dueDate": "2026-08-05T17:59:59.000Z"
  },
  "paymentUrl": "https://sandbox.sslcommerz.com/..."   // gateway only
}
```

Errors: `409 BATCH_FULL` · `409 ALREADY_ENROLLED` · `403 ENROLLMENT_WINDOW_CLOSED`

---

## 6. Billing

| Method | Path | Auth | Notes | Built? |
|---|---|---|---|---|
| `GET` | `/me/billing-periods` | Student | Filter `?status=unpaid` | ✅ |
| `GET` | `/enrollments/:id/billing-periods` | Teacher (own) / Admin | | ⛔ **NOT BUILT** |
| `POST` | `/billing-periods/:id/mark-paid` | **Admin** | Waiver — no money (RBAC-04) | ⛔ **NOT BUILT** |

The two unbuilt rows have no controller, service method, or route today — see `10-current-state.md` §2 and `12-roadmap.md`. Do not build a frontend call against them yet.

---

## 7. Payments

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/billing-periods/:id/pay/gateway` | Student | Returns SSLCommerz redirect URL |
| `POST` | `/billing-periods/:id/pay/manual` | Student | Requires reference + https `proofUrl` (PAY-06). Amount MUST equal full outstanding (`PAYMENT_AMOUNT_INVALID` otherwise). |
| `GET` | `/payments/pending` | Teacher (own) / Admin | Verification queue |
| `POST` | `/payments/:id/verify` | Teacher (own) / Admin | **Blocked on own enrollment** (RBAC-03) |
| `POST` | `/payments/:id/reject` | Teacher (own) / Admin | Removes penalty protection (PAY-09) |
| `POST` | `/payments/:id/refund` | **Admin** | |
| `GET` | `/me/payments` | Student | |

```jsonc
// POST /billing-periods/:id/pay/manual → 201
{
  "amount": "500.00",
  "transactionReference": "BKS7X9K2M1",
  "proofUrl": "https://storage.../proof.jpg"
}
```

Advance payment while earlier periods are unpaid → `422 ARREARS_EXIST` (BIL-10).

---

## 8. Guest payment

Unauthenticated. The only public write surface besides auth.

| Method | Path | Notes |
|---|---|---|
| `POST` | `/guest/lookup` | Name + outstanding dues only (GST-05) |
| `POST` | `/guest/pay/gateway` | |
| `POST` | `/guest/pay/manual` | |

```jsonc
// POST /guest/lookup  { "identifier": "ANA-0042" }
{
  "student": { "studentId": "ANA-0042", "fullName": "Abdullah Rahman" },
  "outstandingDues": [
    {
      "billingPeriodId": "clx...",
      "courseTitle": "Learning Arabic Language",
      "batchName": "Batch 8",
      "periodMonth": "2026-03",
      "amountOutstanding": "500.00"
    },
    {
      "billingPeriodId": "clx...",
      "courseTitle": "Quran Memorization",
      "batchName": "Batch 3",
      "periodMonth": "2026-03",
      "amountOutstanding": "400.00"
    }
  ]
}
```

**Each due is listed separately and never merged** (GST-03) — a payer often intends to cover one specific course. An unmatched identifier returns `404 STUDENT_NOT_FOUND` with no other detail (GST-04).

**Implementation note:** the live response omits `studentId` (shown above for illustration), following GST-05's rule to expose only name and amounts over doc 06's illustrative JSON. When these disagree, the GST rule wins.

---

## 9. Requests

⛔ **NOT BUILT.** The `Request` model exists in the schema (doc 05 §2); `src/modules/requests/` is an empty module stub, registered nowhere. None of the routes below exist yet. This section describes the target shape for `12-roadmap.md` R-02 — do not build a frontend call against any of them.

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/billing-periods/:id/requests` | Student | `grace` or `partial_payment` |
| `GET` | `/requests/pending` | Teacher (own) / Admin | Teachers see `grace` only |
| `POST` | `/requests/:id/decide` | See below | |
| `POST` | `/billing-periods/:id/grace` | Teacher (own) / Admin | Direct grant, auto-approved (REQ-04) |

**Decision authority:** `grace` → teacher or admin. `partial_payment` → **admin only** (REQ-03). A teacher attempting to decide a `partial_payment` receives `403 INSUFFICIENT_PERMISSIONS`; on their own enrollment, `403 SELF_APPROVAL_FORBIDDEN`.

No notification fires on decision (REQ-08).

---

## 10. SSLCommerz webhook

| Method | Path | Auth |
|---|---|---|
| `POST` | `/webhooks/sslcommerz` | **Signature verification only** |
| `POST` | `/payments/gateway/confirm` | Public | `{ transactionReference, valId }` — Order Validation API, then settle |

**PAY-03:** the browser is never trusted alone. Settlement requires SSLCommerz **Order Validation** (via IPN or the success-return confirm endpoint).

On success (`VALID` / `VALIDATED` + amount match): payment `verified`, period updated, **enrollment → `active` (ENR-06)** — no teacher verification for online pay. Manual pay still needs verify (ENR-07).

IPN flow:
1. Verify signature. Invalid → `401 INVALID_WEBHOOK_SIGNATURE`.
2. Look up payment by `transactionReference`. Already `verified` → `200` (PAY-04).
3. Validate with Order Validation API; settle or leave pending / reject.
4. Always `200` for handled callbacks.

Success return: SSLCommerz POSTs to `/payments/sslcommerz-return` → redirects to `/payments/success?tran_id&val_id` → client calls confirm. Fail/cancel pages are status-only.

---

## 11. Reporting

⛔ **NOT BUILT.** `src/modules/reporting/` is an empty module stub, registered nowhere. No revenue, outstanding, enrollment, ledger, export, or audit-log-read endpoint exists yet — including `GET /audit-logs`: the audit trail is written on every mutation (doc 02 AUD-01) but has no read endpoint. This section is the target shape for `12-roadmap.md` R-03 — do not build a frontend call against any of them.

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/reports/revenue` | Teacher (own) / Admin | `?from=&to=&batchId=` |
| `GET` | `/reports/outstanding` | Teacher (own) / Admin | |
| `GET` | `/reports/enrollments` | Teacher (own) / Admin | Seats filled vs capacity |
| `GET` | `/reports/ledger` | Teacher (own) / Admin | Every transaction |
| `GET` | `/reports/export` | **Admin** | CSV, month-by-month |
| `GET` | `/audit-logs` | **Admin** | Filter by actor, action, target |

Teachers receive their batches only; the service applies the scope, never the client (RBAC-02).

---

## 12. Notifications

⛔ **NOT BUILT.** `src/modules/notifications/` is an empty module stub, registered nowhere. Nothing dispatches, and there is no read endpoint. This is the target shape for `12-roadmap.md` R-01 — the single largest functional gap against the original PRD (nothing currently tells a student they owe money). Do not build a frontend call against any of them.

| Method | Path | Auth |
|---|---|---|
| `GET` | `/me/notifications` | Auth |
| `POST` | `/me/notifications/:id/read` | Auth |
| `POST` | `/me/notifications/read-all` | Auth |

---

## 12b. Class management (added scope)

Content that attaches to a batch. All teacher-write routes are batch-scoped via `BatchScopeGuard` (teacher on their own batch, or admin); the batch is resolved from the resource id on `PATCH`/`DELETE` via the shared target-resolver.

**Class link**

| Method | Path | Auth | Notes |
|---|---|---|---|
| `PATCH` | `/batches/:id/class-link` | Teacher (own) / Admin | `{ classLink, classStartsAt?, classEndsAt?, clearSchedule? }` — join opens 5 minutes before start |

The link and schedule are returned by `GET /batches/:id` and surfaced to students on `GET /me/enrollments`.

**Homework**

| Method | Path | Auth |
|---|---|---|
| `POST` | `/batches/:id/homework` | Teacher (own) / Admin |
| `GET` | `/batches/:id/homework` | Teacher (own) / Admin |
| `PATCH` | `/homework/:id` | Teacher (own) / Admin |
| `DELETE` | `/homework/:id` | Teacher (own) / Admin |
| `GET` | `/me/homework` | Student — across active enrollments, sorted by dueDate |

`dueDate` stores the end-of-Dhaka-day instant for the calendar date supplied, so upcoming/past-due comparison is a plain instant comparison.

**Recorded classes**

| Method | Path | Auth |
|---|---|---|
| `POST` | `/batches/:id/recordings` | Teacher (own) / Admin |
| `GET` | `/batches/:id/recordings` | Teacher (own) / Admin |
| `PATCH` | `/recordings/:id` | Teacher (own) / Admin |
| `DELETE` | `/recordings/:id` | Teacher (own) / Admin |
| `GET` | `/me/recordings` | Student — active enrollments, newest first |

The API stores the **YouTube video id**, not a URL — a pasted full link (`youtube.com/watch`, `youtu.be`, `/shorts/`, `/embed/`, `m.youtube.com`) is reduced to the id on input. The frontend builds the embed from the id via `youtube-nocookie.com`.

## 13. Validation

Every request body has a DTO with `class-validator` decorators. Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` — unknown fields are rejected, never silently ignored.

Money fields validate as decimal strings with at most two places:

```ts
@IsDecimal({ decimal_digits: '0,2' })
@IsPositive()
amount: string;
```

**Never accept fees from the client on batch creation.** They are copied server-side from the course (FEE-02). A client-supplied fee is an attack vector.

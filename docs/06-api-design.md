# 06 — API Design

**Base URL:** `/api/v1`
**Format:** JSON. All money serialized as **strings** (`"1500.00"`) to survive JSON's float imprecision.

---

## 1. Conventions

### Naming
- Resources are **plural nouns**: `/courses`, `/batches`, `/payments`.
- Actions that are not CRUD are **sub-resource verbs**: `POST /payments/:id/verify`, `POST /requests/:id/decide`.
- Self-scoped reads live under `/me`: `GET /me/enrollments`.

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

`BATCH_FULL` · `ENROLLMENT_WINDOW_CLOSED` · `ALREADY_ENROLLED` · `ARREARS_EXIST` · `PAYMENT_ALREADY_SETTLED` · `SELF_APPROVAL_FORBIDDEN` · `BATCH_NOT_ASSIGNED` · `INSUFFICIENT_PERMISSIONS` · `STUDENT_NOT_FOUND` · `PERIOD_ALREADY_PAID` · `INVALID_WEBHOOK_SIGNATURE`

Auth (added during implementation): `EMAIL_ALREADY_REGISTERED` · `INVALID_CREDENTIALS` · `INVALID_REFRESH_TOKEN`

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
| `POST` | `/auth/register` | Public | Creates `User` + `Student`, assigns `student` role |
| `POST` | `/auth/login` | Public | Returns access + refresh token |
| `POST` | `/auth/refresh` | Public | Rotates the refresh token |
| `POST` | `/auth/logout` | Auth | Revokes the refresh token |
| `GET` | `/auth/me` | Auth | Current user, roles, linked student |

```jsonc
// POST /auth/login → 200
{
  "accessToken": "eyJ...",       // 15 min
  "refreshToken": "eyJ...",      // 7 days, rotated on use
  "user": {
    "id": "clx...",
    "email": "student@example.com",
    "roles": ["student", "manager"],
    "studentId": "ANA-0042"
  }
}
```

---

## 3. Courses

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/courses` | Public | Active only |
| `GET` | `/courses/:id` | Public | Includes open batches |
| `POST` | `/courses` | Admin | |
| `PATCH` | `/courses/:id` | Admin | **Never affects existing batches** (FEE-03) |
| `POST` | `/courses/:id/archive` | Admin | |

```jsonc
// POST /courses
{
  "title": "Learning Arabic Language",
  "description": "...",
  "billingType": "monthly",
  "enrollmentFee": "1000.00",
  "monthlyFee": "500.00",
  "parts": [
    { "name": "Basic", "durationMonths": 8 },
    { "name": "Intermediate", "durationMonths": 8 },
    { "name": "Advanced", "durationMonths": 8 }
  ]
}
```

---

## 4. Batches

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/batches` | Public | Filter `?status=enrolling&courseId=` |
| `GET` | `/batches/:id` | Public | Includes `seatsRemaining` |
| `POST` | `/batches` | Admin | **Snapshots course fees** (FEE-02) |
| `PATCH` | `/batches/:id` | Admin | |
| `POST` | `/batches/:id/status` | Admin | `completed` stops billing (BIL-11) |
| `POST` | `/batches/:id/managers` | Admin | Assign a manager |
| `DELETE` | `/batches/:id/managers/:userId` | Admin | |
| `GET` | `/batches/:id/roster` | Manager (own) / Admin | |

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

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/me/billing-periods` | Student | Filter `?status=unpaid` |
| `GET` | `/enrollments/:id/billing-periods` | Manager (own) / Admin | |
| `POST` | `/billing-periods/:id/mark-paid` | **Admin** | Waiver — no money (RBAC-04) |

---

## 7. Payments

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/billing-periods/:id/pay/gateway` | Student | Returns SSLCommerz redirect URL |
| `POST` | `/billing-periods/:id/pay/manual` | Student | Requires reference + proof (PAY-06) |
| `GET` | `/payments/pending` | Manager (own) / Admin | Verification queue |
| `POST` | `/payments/:id/verify` | Manager (own) / Admin | **Blocked on own enrollment** (RBAC-03) |
| `POST` | `/payments/:id/reject` | Manager (own) / Admin | Removes penalty protection (PAY-09) |
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

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/billing-periods/:id/requests` | Student | `grace` or `partial_payment` |
| `GET` | `/requests/pending` | Manager (own) / Admin | Managers see `grace` only |
| `POST` | `/requests/:id/decide` | See below | |
| `POST` | `/billing-periods/:id/grace` | Manager (own) / Admin | Direct grant, auto-approved (REQ-04) |

**Decision authority:** `grace` → manager or admin. `partial_payment` → **admin only** (REQ-03). A manager attempting to decide a `partial_payment` receives `403 INSUFFICIENT_PERMISSIONS`; on their own enrollment, `403 SELF_APPROVAL_FORBIDDEN`.

No notification fires on decision (REQ-08).

---

## 10. SSLCommerz webhook

| Method | Path | Auth |
|---|---|---|
| `POST` | `/webhooks/sslcommerz` | **Signature verification only** |

**The webhook is the sole source of truth** (PAY-03). The browser redirect updates the UI; it never settles a payment.

Flow:
1. Verify the signature. Invalid → `401 INVALID_WEBHOOK_SIGNATURE`, log, stop.
2. Look up the payment by `transactionReference`. Already `verified` → return `200` (PAY-04).
3. On success: settle inside a transaction — payment `verified`, `amountPaid` incremented, period status recomputed, penalty flag re-evaluated, audit written, notification queued.
4. On failure: mark `rejected`.
5. Always return `200` for handled callbacks so SSLCommerz stops retrying.

Redirect endpoints (`/payments/success`, `/payments/fail`, `/payments/cancel`) are **frontend routes** that display status. They may show "processing" if the webhook has not yet landed.

---

## 11. Reporting

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/reports/revenue` | Manager (own) / Admin | `?from=&to=&batchId=` |
| `GET` | `/reports/outstanding` | Manager (own) / Admin | |
| `GET` | `/reports/enrollments` | Manager (own) / Admin | Seats filled vs capacity |
| `GET` | `/reports/ledger` | Manager (own) / Admin | Every transaction |
| `GET` | `/reports/export` | **Admin** | CSV, month-by-month |
| `GET` | `/audit-logs` | **Admin** | Filter by actor, action, target |

Managers receive their batches only; the service applies the scope, never the client (RBAC-02).

---

## 12. Notifications

| Method | Path | Auth |
|---|---|---|
| `GET` | `/me/notifications` | Auth |
| `POST` | `/me/notifications/:id/read` | Auth |
| `POST` | `/me/notifications/read-all` | Auth |

---

## 12b. Class management (added scope)

Content that attaches to a batch. All manager-write routes are batch-scoped via `BatchScopeGuard` (manager on their own batch, or admin); the batch is resolved from the resource id on `PATCH`/`DELETE` via the shared target-resolver.

**Class link**

| Method | Path | Auth |
|---|---|---|
| `PATCH` | `/batches/:id/class-link` | Manager (own) / Admin |

The link is returned by `GET /batches/:id` and surfaced to students on `GET /me/enrollments`.

**Homework**

| Method | Path | Auth |
|---|---|---|
| `POST` | `/batches/:id/homework` | Manager (own) / Admin |
| `GET` | `/batches/:id/homework` | Manager (own) / Admin |
| `PATCH` | `/homework/:id` | Manager (own) / Admin |
| `DELETE` | `/homework/:id` | Manager (own) / Admin |
| `GET` | `/me/homework` | Student — across active enrollments, sorted by dueDate |

`dueDate` stores the end-of-Dhaka-day instant for the calendar date supplied, so upcoming/past-due comparison is a plain instant comparison.

**Recorded classes**

| Method | Path | Auth |
|---|---|---|
| `POST` | `/batches/:id/recordings` | Manager (own) / Admin |
| `GET` | `/batches/:id/recordings` | Manager (own) / Admin |
| `PATCH` | `/recordings/:id` | Manager (own) / Admin |
| `DELETE` | `/recordings/:id` | Manager (own) / Admin |
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

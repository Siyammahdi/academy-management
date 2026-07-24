# 04 — Role-Based Access Control

**Purpose:** the complete authorization specification. Every permission decision in the system traces back to this document.

**Core principle:** *a manager may confirm money and pause the billing engine, but may never move money.*

---

## 1. Roles

| Role | Scope | Definition |
|---|---|---|
| `admin` | Global | Full authority everywhere. Owns every money-affecting action. The escape hatch for anything the system does not handle automatically. |
| `manager` | Assigned batches only | Operational authority within their batch(es): verify payments, grant grace, view students and reporting. |
| `student` | Self only | Their own enrollments, dues, payments, and requests. |
| *(guest)* | None | Not a role and not a user. An unauthenticated payer. |

**A user may hold multiple roles simultaneously** (RBAC-01). A manager who is also enrolled as a student holds both `manager` and `student` on one account — one login, one email, one payment history.

Roles are a **set**, never a single column. Permission checks ask *"does this user **have** role X?"*, never *"is this user's role X?"*.

---

## 2. Permission matrix

`✓` permitted · `—` denied · `⚠` permitted with constraints

| Action | Student | Manager | Admin |
|---|:---:|:---:|:---:|
| **Courses** | | | |
| View active courses | ✓ | ✓ | ✓ |
| Create / edit / archive a course | — | — | ✓ |
| **Batches** | | | |
| View open batches | ✓ | ✓ | ✓ |
| Create a batch, set fees / capacity / dates / discount | — | — | ✓ |
| Edit a batch | — | — | ✓ |
| Change batch status | — | — | ✓ |
| Assign managers to a batch | — | — | ✓ |
| View batch roster | — | ⚠ own batches | ✓ |
| **Enrollment** | | | |
| Self-enroll in an open batch | ✓ | ✓ | ✓ |
| Add a late joiner | — | — | ✓ |
| Withdraw / remove a student | — | — | ✓ |
| **Payments** | | | |
| Submit own payment | ✓ | ✓ | ✓ |
| Verify a manual payment | — | ⚠ own batches, not own enrollment | ✓ |
| Reject a manual payment | — | ⚠ own batches, not own enrollment | ✓ |
| Mark a period paid without money | — | — | ✓ |
| Issue a refund | — | — | ✓ |
| **Requests** | | | |
| Create a grace request | ✓ own | ✓ own | ✓ |
| Create a partial-payment request | ✓ own | ✓ own | ✓ |
| Decide a **grace** request | — | ⚠ own batches, not own enrollment | ✓ |
| Decide a **partial-payment** request | — | — | ✓ |
| Grant grace directly (no request) | — | ⚠ own batches, not own enrollment | ✓ |
| **Penalty** | | | |
| Reverse an applied penalty | — | — | ✓ |
| **Reporting** | | | |
| View own dues and payment history | ✓ | ✓ | ✓ |
| View batch reporting | — | ⚠ own batches | ✓ |
| View academy-wide reporting | — | — | ✓ |
| Export financial records | — | — | ✓ |
| View audit log | — | — | ✓ |
| **Users** | | | |
| Change a user's roles | — | — | ✓ |
| Disable a user | — | — | ✓ |

---

## 3. The three constraints

Every `⚠` in the matrix reduces to one of these. They are the whole of the authorization logic.

### 3.1 Batch scope

A manager's authority extends **only** to batches they are assigned to (RBAC-02).

Applies to: viewing rosters, verifying/rejecting payments, deciding grace requests, granting grace, viewing batch reporting.

A manager attempting any of these on an unassigned batch receives `403`.

### 3.2 Self-approval prohibition

**A manager MUST NOT verify a payment, reject a payment, decide a request, or grant grace on their own enrollment** (RBAC-03).

This holds *even when the manager is legitimately assigned to that batch*. It closes the loophole where a manager who is also a student in their own batch could approve their own money.

The check: *does the target enrollment belong to the acting user's own Student profile?* If yes → refuse, escalate to admin.

Mechanically it is one comparison at the point of decision, applied at three call sites: payment verification, payment rejection, and request decision.

### 3.3 Money boundary

**All money-affecting actions are admin-only** (RBAC-04): waivers, refunds, penalty reversal, marking a period paid without money, and partial-payment approval.

Grace is the deliberate exception granted to managers — it moves a *date*, not an *amount*, and it is time-critical (it must be exercisable before the penalty job runs on the 6th). Routing grace through an admin would defeat its purpose.

Every grace grant is therefore logged and attributable: which manager, which student, which period, when.

---

## 4. Implementation

### 4.1 Guards

Three NestJS guards carry the entire model. They compose; a route may use several.

| Guard | Responsibility |
|---|---|
| `JwtAuthGuard` | Validates the access token, populates `request.user` |
| `RolesGuard` | Does the user hold at least one of the required roles? |
| `BatchScopeGuard` | Is this manager assigned to the batch this request targets? (admins bypass) |
| `SelfApprovalGuard` | Does the target enrollment belong to the acting user? If so, refuse. |

**Guards enforce coarse access. Fine-grained ownership checks belong in the service layer**, where the entity has already been loaded — a guard should not re-query what the service is about to fetch.

### 4.2 Route decoration pattern

```ts
@Post('payments/:id/verify')
@Roles('manager', 'admin')
@UseGuards(JwtAuthGuard, RolesGuard, BatchScopeGuard, SelfApprovalGuard)
verifyPayment(@Param('id') id: string, @CurrentUser() user: AuthUser) { ... }
```

**Admins bypass `BatchScopeGuard` and `SelfApprovalGuard`.** An admin has global authority by definition; an admin is not expected to be enrolled as a student, and if they are, their global authority already exceeds the concern these guards address.

### 4.3 Failure semantics

| Condition | Status | Body message |
|---|---|---|
| No / invalid token | `401` | `Authentication required` |
| Missing role | `403` | `Insufficient permissions` |
| Manager, unassigned batch | `403` | `You are not assigned to this batch` |
| Manager, own enrollment | `403` | `You cannot approve actions on your own enrollment` |
| Resource not found | `404` | `Not found` |

**Never leak existence through authorization.** If a manager requests a batch they are not assigned to, return `403` — not `404` with details, and not a `200` with filtered data.

---

## 5. Public (unauthenticated) surface

These endpoints require no token:

| Endpoint | Notes |
|---|---|
| `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` | |
| `GET /courses`, `GET /courses/:id` | Active courses only |
| `GET /batches?status=enrolling` | Open batches only |
| `POST /guest/lookup` | Returns student **name + outstanding dues only** (GST-05) |
| `POST /guest/payments` | Initiates a guest payment |
| `POST /webhooks/sslcommerz` | Signature-verified, **not** token-authenticated |

**The webhook is authenticated by signature verification, never by a session.** It arrives from SSLCommerz, not a browser.

**The guest lookup deliberately exposes a student's name** to anyone supplying a valid identifier — the accepted tradeoff that lets a paying relative confirm they have the right student. It exposes nothing else. Rate limiting is a deferred hardening measure, noted in `07-architecture.md`.

---

## 6. Ownership rules for students

A `student` may act only on their own records:

- `GET /me/enrollments`, `GET /me/billing-periods`, `GET /me/payments` — scoped to their own `Student` by the service, never by a client-supplied id.
- `POST /requests` — the service derives the enrollment from the authenticated user; a student-supplied `enrollmentId` MUST be validated as theirs.
- A student MUST NOT be able to read another student's dues, payments, or profile through any endpoint.

**Never trust a client-supplied identifier for ownership.** Derive the student from the token.

---

## 7. Invariants to test

Each requires an automated test named for its rule ID:

- `RBAC-01` — a user holding both `manager` and `student` can act in both capacities
- `RBAC-02` — a manager receives `403` on an unassigned batch
- `RBAC-03` — a manager receives `403` verifying a payment on their own enrollment, **even in a batch they manage**
- `RBAC-04` — a manager receives `403` on refund, penalty reversal, and partial-payment approval
- `RBAC-05` — a manager receives `403` creating a course or batch
- A student receives `403` reading another student's records
- An admin bypasses batch scope and self-approval

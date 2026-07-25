# 07 — Architecture

**Purpose:** system topology, module boundaries, layering rules, and how background work runs.

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | NestJS (TypeScript) | Module boundaries map onto the domain; guards express the RBAC model declaratively; first-class Prisma/BullMQ/Passport integration |
| Database | PostgreSQL 16 | Transactions, real constraints, exact decimal arithmetic — mandatory for money |
| ORM | Prisma | Type-safe queries, honest migrations, `Decimal` support |
| Queue | BullMQ + Redis | Durable scheduled jobs. A half-completed penalty run is unacceptable; BullMQ persists and retries |
| Auth | Self-built — JWT + refresh, argon2 | The authorization logic is the interesting part and is custom regardless of provider |
| Frontend | Next.js 15 (App Router) | Single app, route groups per audience |
| Payments | SSLCommerz | Aggregates bKash, Nagad, cards behind one integration |
| Email | Queued via BullMQ | Provider-agnostic behind an interface |

**Why a queue at all:** three jobs must run when no request is in flight — the penalty job at 00:00 on the 6th, monthly billing-period generation, and payment reminders. `node-cron` loses state on restart; for a job that charges people money, durability is not optional.

---

## 2. Topology

```
┌──────────────┐         ┌──────────────┐
│  Next.js 15  │────────▶│   NestJS API │
│  (frontend)  │◀────────│   /api/v1    │
└──────────────┘         └──────┬───────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
       ┌────────────┐    ┌───────────┐    ┌─────────────┐
       │ PostgreSQL │    │   Redis   │    │ SSLCommerz  │
       │  (source   │    │  (BullMQ) │    │  (webhook)  │
       │  of truth) │    └─────┬─────┘    └─────────────┘
       └────────────┘          │
                               ▼
                       ┌───────────────┐
                       │ Worker process │
                       │ penalty · billing
                       │ email · expiry │
                       └───────────────┘
```

**The worker is a separate process** from the API, sharing the same codebase and Prisma client. The API must stay responsive while a monthly penalty sweep runs across every enrollment.

---

## 3. Module structure

```
src/
├── main.ts                    # API bootstrap
├── worker.ts                  # Worker bootstrap — same code, no HTTP listener
├── app.module.ts
│
├── common/                    # Cross-cutting. Depends on NOTHING in modules/
│   ├── decorators/            # @Roles, @CurrentUser, @Public
│   ├── guards/                # JwtAuth, Roles, BatchScope, SelfApproval
│   ├── filters/               # GlobalExceptionFilter — the error envelope
│   ├── interceptors/          # Logging, response shaping
│   ├── pipes/                 # ValidationPipe config
│   ├── exceptions/            # BatchFullException, SelfApprovalException, …
│   └── utils/                 # money.ts, dhaka-time.ts, period.ts
│
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── modules/
│   ├── auth/                  # register, login, refresh, argon2, JWT strategy
│   ├── users/                 # users, roles
│   ├── students/              # profiles, sequential ID generation
│   ├── courses/               # catalog
│   ├── batches/               # batches, manager assignment, fee snapshotting
│   ├── enrollment/            # enrollment, capacity, late joiners, withdrawal
│   ├── billing/               # ★ periods, penalty engine, status derivation
│   ├── payments/              # manual + gateway, verification, refunds
│   ├── gateway/               # SSLCommerz adapter, webhook handling
│   ├── guest/                 # unauthenticated lookup + payment
│   ├── homework/              # batch homework (added scope)
│   ├── recordings/            # batch YouTube recordings (added scope)
│   ├── audit/                 # append-only log
│   ├── requests/              # grace, partial payment        [NOT BUILT — doc 12]
│   ├── notifications/         # dispatch, rule table, email    [NOT BUILT — doc 12]
│   └── reporting/             # revenue, outstanding, export   [NOT BUILT — doc 12]
│       # class-link lives on the batches module (it is a Batch field)
│
└── jobs/
    ├── queues.ts              # queue names, typed job payloads
    ├── penalty.processor.ts
    ├── billing-generation.processor.ts
    ├── payment-expiry.processor.ts
    └── email.processor.ts
```

**`billing/` is the heart of the system.** Every rule in the `BIL` and `PEN` families lives there. It is the module to test most heavily and to review most carefully.

---

## 4. Layering

Three layers per module, strictly ordered. **Dependencies point downward only.**

```
Controller  →  HTTP only: routing, DTO validation, guards.
               Contains NO business logic. Never touches Prisma.
     │
     ▼
Service     →  Business rules, transactions, orchestration.
               Where every rule from 02-business-rules.md lives.
     │
     ▼
Repository  →  Prisma access. Query composition only, no rules.
    (optional — inline Prisma in the service is acceptable for simple modules)
```

**Rules:**
- A controller that contains an `if` about business state is wrong.
- A service must not import `Request`/`Response` from Express.
- Cross-module access goes **service → service**, never service → another module's repository.
- `common/` must never import from `modules/`.

### Where each concern belongs

| Concern | Layer |
|---|---|
| Is the user authenticated? | Guard |
| Does the user hold the role? | Guard |
| Is this manager assigned to this batch? | Guard (`BatchScopeGuard`) |
| Is this the manager's own enrollment? | Guard (`SelfApprovalGuard`) |
| Is the batch full? | Service (needs a transaction) |
| Does the student have arrears? | Service |
| Is `amountPaid` correct after verification? | Service, inside a transaction |
| Is the payload well-formed? | DTO + `ValidationPipe` |

---

## 5. Background jobs

| Job | Schedule | Rule |
|---|---|---|
| `penalty-sweep` | `0 0 6 * *` Asia/Dhaka | PEN-01 |
| `billing-generation` | `0 1 1 * *` Asia/Dhaka | BIL-04 |
| `payment-reminder` | Daily, before the due window closes | NTF |
| `gateway-expiry` | Every 15 min | PAY-05 |
| `email-dispatch` | On demand | NTF-03 |

### Job requirements

**Idempotent.** Every job must be safe to run twice. Billing generation relies on the unique `(enrollmentId, periodMonth)` constraint; the penalty job relies on `inPenalty` guarding.

**Batched.** Never load every enrollment into memory. Page through in chunks of 100 and process per-enrollment inside its own transaction — one failure must not roll back the entire sweep.

**Observable.** Every run logs start, counts processed/skipped/failed, and completion. A penalty run that silently processed zero enrollments is a bug you must be able to see.

**Timezone-correct.** Cron expressions specify `Asia/Dhaka` explicitly. The penalty job runs at 00:00 on the **6th**, so a payment made at any moment on the 5th still counts (TIME-03).

```ts
// Repeatable job registration
await penaltyQueue.add('sweep', {}, {
  repeat: { pattern: '0 0 6 * *', tz: 'Asia/Dhaka' },
  removeOnComplete: 100,
  removeOnFail: 500,
});
```

---

## 6. Money handling

**Never `number` for money. Anywhere.**

- Database: `Decimal(10,2)`
- Prisma returns `Prisma.Decimal`
- Arithmetic: `Decimal` methods (`.plus()`, `.minus()`), never `+`/`-`
- API: serialized as **strings** (`"1500.00"`), because JSON numbers are IEEE-754 floats
- Frontend: display only; never compute totals client-side

`common/utils/money.ts` centralizes construction, arithmetic, and formatting. If money math appears outside it, that is a review failure.

---

## 7. Time handling

Two rules, and violating either produces off-by-one-day bugs that penalize real students:

1. **Persist in UTC.** Every `DateTime` column.
2. **Evaluate in Asia/Dhaka.** Due dates, the penalty cutoff, and period-month boundaries are all business dates in Dhaka.

`common/utils/dhaka-time.ts` owns every conversion. Direct `new Date()` arithmetic on business dates is forbidden.

---

## 8. Error handling

A single `GlobalExceptionFilter` produces the envelope in `06-api-design.md`. Domain exceptions extend a common base carrying a stable `error` code:

```ts
export class BatchFullException extends DomainException {
  constructor() {
    super('BATCH_FULL', 'Full — try next batch.', HttpStatus.CONFLICT);
  }
}
```

**Never leak internals.** Prisma errors, stack traces, and SQL never reach a response body. Log them server-side with a correlation id; return a generic `500`.

---

## 9. Configuration

`@nestjs/config` with a **validated schema**. The app refuses to boot on missing or malformed config — failing at startup beats failing at midnight during the penalty run.

```
DATABASE_URL
REDIS_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
SSLCOMMERZ_STORE_ID
SSLCOMMERZ_STORE_PASSWORD
SSLCOMMERZ_IS_SANDBOX
APP_URL
API_URL
TZ=Asia/Dhaka
```

Secrets never enter the repository. `.env.example` documents the shape with empty values.

---

## 10. Local development

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: nahda
      POSTGRES_PASSWORD: nahda_dev_password
      POSTGRES_DB: nahda
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports: ["6379:6379"]
    volumes: [redis_data:/data]

volumes:
  postgres_data:
  redis_data:
```

The named volumes are what let data survive `docker compose down`. Omitting them wipes the database on every stop.

The webhook needs a **publicly reachable URL** in development — use a tunnel (ngrok or similar) and register it as the SSLCommerz IPN endpoint.

---

## 11. Frontend structure

```
app/
├── (public)/          # landing, about, contact, courses, guest payment
├── (auth)/            # login, register
├── (student)/         # dashboard, dues, payments, requests
├── (manager)/         # verification queue, roster, batch reporting
└── (admin)/           # courses, batches, students, payments, reporting, audit
```

Route groups mirror the RBAC boundary. Middleware enforces role access at the route level; **the API remains the real authority** — client-side checks are UX, never security.

---

## 12. Deliberate deferrals

Recorded so they are conscious choices rather than oversights:

| Deferred | Rationale | Attaches by |
|---|---|---|
| Rate limiting on guest lookup | Sequential student IDs are enumerable, and the lookup returns a name | Adding `@nestjs/throttler` to one controller |
| SMS notifications | `channel` is already a data value | New enum value + a dispatcher |
| Attendance, homework, exams, certificates | Explicitly a later phase | New tables referencing `Enrollment`/`Batch` — no existing table changes |
| Redis caching | No demonstrated read pressure | Redis is already present for BullMQ |
| Horizontal scaling | Single instance is ample for an academy | Workers already separate from the API |

**The extensibility principle:** none of these required speculative fields or abstractions. Extensibility came from correct boundaries — payment attributed to a period, notifications behind a rule table, a deterministic billing engine with discretion pushed into logged human actions.

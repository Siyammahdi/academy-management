# An Nahda Academy — Management System

An enrollment and subscription-billing back-office for a madrasa-style academy. Teaching happens off-platform (Telegram, Zoom); this system is the source of truth for **who is enrolled and who has paid**.

It is not a learning platform. Attendance, homework, exams, and course content delivery are explicitly out of scope — see [`docs/README.md`](./docs/README.md).

**The shape in one line:** Course defines → Batch freezes → Enrollment subscribes → BillingPeriod owes → Payment settles, with Request/Refund as human-override paths and AuditLog observing all of it.

---

## Documentation

**[`docs/`](./docs)** is the specification and the source of truth for this project. Where code and docs disagree, the docs win. Read [`docs/README.md`](./docs/README.md) first — it indexes the rest and lists the non-negotiable rules (money handling, timezone handling, self-approval, fee immutability) that generated or unfamiliar code gets wrong most often.

| Doc | Covers |
|---|---|
| [01-prd.md](./docs/01-prd.md) | Product requirements |
| [02-business-rules.md](./docs/02-business-rules.md) | Every business rule, with stable IDs (`PEN-04`, `BIL-09`, …) |
| [03-domain-model.md](./docs/03-domain-model.md) | Entities, states, relationships |
| [04-rbac.md](./docs/04-rbac.md) | Roles and permission model |
| [05-database-design.md](./docs/05-database-design.md) | Schema |
| [06-api-design.md](./docs/06-api-design.md) | Endpoints, error envelope, DTOs |
| [07-architecture.md](./docs/07-architecture.md) | Module layout, background jobs, layering |
| [08-development-guidelines.md](./docs/08-development-guidelines.md) | Standards, testing conventions |
| [09-ui-design-system.md](./docs/09-ui-design-system.md) | Design tokens and components |

---

## Repository structure

This is **not** a single pnpm workspace — `api/` and `web/` are independent projects, each with its own lockfile and dependencies.

```
academy-management/
├── docs/               specification (see above)
├── docker-compose.yml  local Postgres + Redis
├── api/                NestJS backend
│   ├── src/
│   │   ├── modules/    one folder per domain (auth, courses, batches, payments, …)
│   │   ├── jobs/        BullMQ queues, processors, worker bootstrap
│   │   ├── common/      guards, decorators, exceptions, shared utils
│   │   └── prisma/      PrismaService
│   ├── prisma/          schema.prisma, migrations, seed
│   └── test/            e2e specs (run against real Postgres)
└── web/                Next.js frontend
    └── app/
        ├── (public)/    marketing (home, about, contact)
        ├── (auth)/      login, register
        ├── (admin)/     admin console
        ├── (manager)/   manager console
        └── (student)/   student dashboard + payment flow
```

---

## Stack

- **Backend:** NestJS, PostgreSQL 16, Prisma 7, Redis + BullMQ, self-built JWT auth, SSLCommerz (payment gateway)
- **Frontend:** Next.js (App Router), Tailwind, no external UI kit — the design system in `docs/09-ui-design-system.md` is implemented from tokens
- **Package manager:** pnpm, in both `api/` and `web/` independently

---

## Getting started

### Prerequisites

- Node.js 24+
- pnpm
- Docker (for Postgres and Redis)

### 1. Start Postgres and Redis

```bash
docker compose up -d
```

### 2. Backend setup

```bash
cd api
pnpm install
```

Create `api/.env` (not committed — see `.gitignore`) with at least:

```bash
DATABASE_URL="postgresql://nahda:nahda_dev_password@localhost:5432/nahda?schema=public"
REDIS_URL="redis://localhost:6379"

JWT_ACCESS_SECRET="<random secret>"
JWT_REFRESH_SECRET="<random secret>"
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

SSLCOMMERZ_STORE_ID="testbox"
SSLCOMMERZ_STORE_PASSWORD="qwerty1234"
SSLCOMMERZ_IS_SANDBOX=true

APP_URL="http://localhost:3001"
API_URL="http://localhost:3000"
```

`SSLCOMMERZ_STORE_ID`/`SSLCOMMERZ_STORE_PASSWORD` above are the public SSLCommerz sandbox test credentials — real payment initiation will fail against them; the webhook path and signature verification can still be exercised locally (see `api/test/payments.e2e-spec.ts`).

Run migrations and seed data:

```bash
pnpm db:migrate
pnpm db:seed
```

Start the API:

```bash
pnpm start:dev
```

The API listens on `:3000` by default and serves under the `/api/v1` prefix.

### 3. Background jobs (optional, but required for penalty/billing/expiry to actually run)

In a second terminal:

```bash
cd api
pnpm start:worker
```

This is a separate process — it registers no HTTP listener, only the job processors (`penalty-sweep`, `billing-generation`, `gateway-expiry`). The API process schedules and can manually trigger these jobs (`POST /jobs/:name/trigger`, admin-only); only the worker process consumes them. Without it running, enqueued jobs sit in Redis until a worker starts.

### 4. Frontend setup

```bash
cd web
pnpm install
pnpm dev
```

The frontend defaults to `NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1` if unset. **Both `next dev` and `nest start` default to port 3000** — if you run them at the same time, one will silently bind first and the other's requests will 404 against the wrong server. Either start the API first (`next dev` will fall back to `:3001`), or set `NEXT_PUBLIC_API_URL` explicitly in `web/.env.local`.

---

## Testing

```bash
# api/
pnpm test        # unit tests (mocked Prisma)
pnpm test:e2e    # e2e tests — require Postgres running, hit a real database
```

Tests are named for the business-rule IDs they verify (e.g. `PEN-06: the penalty must not stack`), per `docs/08-development-guidelines.md`.

---

## Current status

Built and wired into `app.module.ts`: auth, courses, batches, enrollment, payments (manual + gateway + webhook), the SSLCommerz gateway adapter, billing (period generation and the student-facing billing-periods read), students, users, and the background jobs (penalty sweep, billing generation, gateway-expiry cleanup).

Frontend: marketing pages, auth, and three role-scoped consoles — admin (courses, batches, roster, payment verification), manager (own-batch roster and payment verification), and student (dashboard, dues, payment history, browse-and-enroll, gateway redirect landing pages).

**Scaffolded but not implemented** (empty module stubs in `api/src/modules/`, not registered in `app.module.ts`): guest payment (unauthenticated checkout), grace/partial-payment requests, reporting (revenue, outstanding, ledger, export), and notifications (including the `email-dispatch` job). The audit trail is written on every money-affecting action but has no read endpoint yet (`GET /audit-logs` is documented, not built).

Consult `docs/07-architecture.md` §12 for what's deliberately deferred versus what's simply not built yet — they are not the same list.

---

## License

Private and licensed for An-Nahda Academy. Not for redistribution, it can cause legal actions.

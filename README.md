# An Nahda Academy — Management System

An enrollment and subscription-billing back-office for a madrasa-style academy. Teaching happens off-platform (Telegram, Zoom); this system is the source of truth for **who is enrolled and who has paid**.

It is not a learning platform — teaching content delivery, attendance, exams, and certificates remain explicitly out of scope. (Class links, homework, and recorded classes were added to scope after the original PRD as course-management conveniences on top of the billing core; see [`docs/README.md`](./docs/README.md) for the current boundary.)

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
| [10-current-state.md](./docs/10-current-state.md) | **Read this first if picking up the project** — what's built, tested, and known-broken |
| [11-hardening.md](./docs/11-hardening.md) | Security/robustness gaps to close before real money flows |
| [12-roadmap.md](./docs/12-roadmap.md) | What's left, in priority order, with rule IDs |

---

## Repository structure

This is **not** a single pnpm workspace — `api/` and `web/` are independent projects, each with its own lockfile and dependencies.

```
academy-management/
├── docs/               specification (see above)
├── docker-compose.yml  local Postgres + Redis
├── api/                NestJS backend
│   ├── src/
│   │   ├── modules/    one folder per domain (auth, courses, batches, payments,
│   │   │               enrollment, billing, gateway, guest, homework, recordings,
│   │   │               audit, students, users — plus empty stubs for requests/
│   │   │               notifications/reporting, not yet built, see doc 10 §2)
│   │   ├── jobs/        BullMQ queues, processors, worker bootstrap
│   │   ├── common/      guards, decorators, exceptions, shared utils
│   │   └── prisma/      PrismaService
│   ├── prisma/          schema.prisma, migrations, seed
│   └── test/            e2e specs (run against real Postgres)
└── web/                Next.js frontend
    └── app/
        ├── (public)/    marketing (home, about, contact, guest payment)
        ├── (auth)/      login, register
        ├── (admin)/     admin console
        ├── (teacher)/   teacher console
        └── (student)/   student dashboard, dues, payments, homework, recordings
```

---

## Stack

- **Backend:** NestJS, PostgreSQL 16, Prisma 7, Redis + BullMQ, self-built JWT auth, SSLCommerz (payment gateway)
- **Frontend:** Next.js (App Router), Tailwind, no external UI kit — the design system in `docs/09-ui-design-system.md` is implemented from tokens
- **Package teacher:** pnpm, in both `api/` and `web/` independently

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

```bash
cp .env.example .env
```

`api/.env.example` documents every variable the API reads (see `src/modules/auth/jwt.config.ts` and `src/main.ts` for what's required vs defaulted). Fill in real values; the copied `.env` is git-ignored. `SSLCOMMERZ_STORE_ID`/`SSLCOMMERZ_STORE_PASSWORD` in the example are the public SSLCommerz sandbox test credentials — real payment initiation will fail against them; the webhook path and signature verification can still be exercised locally (see `api/test/payments.e2e-spec.ts`).

Run migrations and seed data:

```bash
pnpm db:migrate
pnpm db:seed
```

Start the API:

```bash
pnpm start:dev
```

The API listens on the port in `PORT` (`api/.env.example` sets `4000` to avoid colliding with the frontend's default `3000`) and serves under the `/api/v1` prefix.

### 3. Background jobs (optional, but required for penalty/billing/expiry to actually run)

In a second terminal:

```bash
cd api
pnpm start:worker
# production (after build): pnpm start:worker:prod
```

This is a separate process — it registers no HTTP listener, only the job processors (`penalty-sweep`, `billing-generation`, `gateway-expiry`, **`email-dispatch`**). The API process schedules and can manually trigger these jobs (`POST /jobs/:name/trigger`, admin-only); only the worker process consumes them. Without it running, enqueued jobs sit in Redis until a worker starts. **Registration and password-reset emails require the worker.**

### 4. Frontend setup

```bash
cd web
pnpm install
cp .env.example .env.local
pnpm dev
```

`web/.env.example` uses same-origin `/api/v1` with `API_PROXY_TARGET` pointing at the Nest server — see `web/next.config.ts`.

---

## Production (Render + Vercel)

| Service | Platform | Name |
|---------|----------|------|
| API | Render web service | `academy-management` |
| Worker | Render background worker | `academy-management-worker` |
| Redis | Render Key Value | `an-nahda-redis` |
| Frontend | Vercel | `annahda` → `www.annahda.net` |

**[`render.yaml`](./render.yaml)** defines the API and worker (`rootDir: api`, migrate-on-deploy, Redis wiring). Connect it from the Render dashboard or mirror the same build/start commands manually.

**Render (API + worker)** — both need the env var group in `render.yaml`, especially `DATABASE_URL`, `REDIS_URL`, `RESEND_API_KEY`, `MAIL_FROM`, JWT secrets, and `WEB_URL`/`APP_URL`/`API_URL` for production domains.

**Vercel (`annahda`)** — root directory `web/`. Set:

- `NEXT_PUBLIC_API_URL=/api/v1`
- `API_PROXY_TARGET=https://academy-management-fkl4.onrender.com` (no `/api/v1` suffix)

**Resend** — verify `annahda.net` in Resend before using `noreply@annahda.net` as `MAIL_FROM`; until then, Resend only delivers to your account email.

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

**This section intentionally does not duplicate a feature list — it goes stale.** The authoritative, kept-current inventory is [`docs/10-current-state.md`](./docs/10-current-state.md): what's built, what's tested against real Postgres, what's only visually unverified, and what's a known issue. Read it before touching anything.

In short, as of the state that doc describes: the core product (enrollment, billing, the penalty engine, payments — manual, gateway, and guest) plus the class features (class links, homework, recorded classes) are functionally complete and tested. Notifications, grace/partial-payment requests, reporting, and role-management are specified but not built — see [`docs/12-roadmap.md`](./docs/12-roadmap.md) for what's left and in what order, and [`docs/11-hardening.md`](./docs/11-hardening.md) for what must be true before real money flows through it.

**No page in this application has been visually verified in a browser** — automated tests confirm the API contracts, not that the UI renders correctly. This is the single largest open item; see doc 10 §3–4.

---

## License

Private and licensed for An-Nahda Academy. Not for redistribution, it can cause legal actions.

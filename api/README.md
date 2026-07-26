# An Nahda Academy — API

NestJS backend for the enrollment and subscription-billing back-office. Read the root [`../README.md`](../README.md) and [`../docs/`](../docs) before changing anything here — `../docs/02-business-rules.md` outranks this file and every other doc if they disagree.

**If you're picking this up fresh:** read [`../docs/10-current-state.md`](../docs/10-current-state.md) first.

---

## Setup

```bash
pnpm install
cp .env.example .env    # fill in real values — see the comments in the file
```

Requires Postgres and Redis running (`docker compose up -d` from the repo root) and a migrated, seeded database:

```bash
pnpm db:migrate
pnpm db:seed
```

## Running

```bash
pnpm start:dev      # API, watch mode — listens on PORT (.env.example: 4000)
pnpm start:worker   # background jobs (penalty sweep, billing generation, gateway expiry)
```

The worker is a **separate process** with no HTTP listener — it only consumes the BullMQ queues the API schedules and can manually trigger (`POST /jobs/:name/trigger`, admin-only). Without it running, enqueued jobs sit in Redis until a worker starts.

Other scripts: `pnpm build` · `pnpm start:prod` · `pnpm db:studio` (Prisma Studio — also the only way to assign a user's roles today, see `../docs/10-current-state.md`) · `pnpm format`.

## Testing

```bash
pnpm test        # unit tests — Prisma mocked, no database needed
pnpm test:e2e    # e2e tests — hit a real Postgres, run serially for reliability:
pnpm exec jest --config ./test/jest-e2e.json --runInBand
```

Running e2e tests with parallel workers (the bare `pnpm test:e2e`) can intermittently fail under Postgres connection-pool contention when many suites spin up a full `AppModule` at once — this is test-infrastructure flakiness, not a code defect. `--runInBand` is the reliable way to run the full suite.

Tests are named for the business-rule IDs they verify (e.g. `describe('PEN-06: the penalty must not stack', ...)`) per `../docs/08-development-guidelines.md` §6 — when adding a rule, add a test named for it.

## Module layout

```
src/
├── modules/       one folder per domain — <name>.module.ts / .service.ts / .controller.ts / dto/
├── jobs/          BullMQ queue definitions, processors, scheduler, worker bootstrap (worker.ts)
├── common/        guards (RolesGuard, BatchScopeGuard, SelfApprovalGuard, JwtAuthGuard),
│                  decorators (@Roles, @TargetResource, @CurrentUser, @Public), exceptions,
│                  shared utils (dhaka-time.ts, period.ts, pagination.ts, youtube.ts)
└── prisma/        PrismaService (Prisma 7 driver-adapter wiring)
```

Three of `modules/*` (`requests`, `notifications`, `reporting`) are empty stub files, not registered in `app.module.ts` — placeholders for `../docs/12-roadmap.md`, not bugs. Every other module follows the same shape; copy an existing one (e.g. `homework/`) as the template for a new batch-scoped feature.

## Adding a batch-scoped resource

The `homework`/`recordings` modules are the reference pattern for "a new table that attaches to `Batch`" (`../docs/01-prd.md` §13's extensibility principle, proven five times over). To add another:

1. Add the Prisma model with `batchId`, `onDelete: Cascade` to `Batch`, `@@map` to a plural snake_case table name. Additive-only migration — never alter an existing table for this.
2. Add the resource kind to `TargetResourceKind` (`common/decorators/target-resource.decorator.ts`) and a case in `resolveTarget()` (`common/guards/target-resolver.util.ts`) if `PATCH`/`DELETE` routes address the resource by its own id rather than the batch id.
3. Controller routes reuse `@Roles('manager', 'admin')` + `@TargetResource('batch' | 'yourKind')` + `BatchScopeGuard` — manager-own-batch-or-admin, enforced identically every time.
4. Add the audit action(s) to `../docs/02-business-rules.md` AUD-04's list and write them via `AuditService.record()` inside the same transaction as the mutation.
5. Unit tests (mocked Prisma) + an e2e test proving an unassigned manager gets `403 BATCH_NOT_ASSIGNED`.

## Conventions

See `../docs/08-development-guidelines.md` for the full standard. The non-negotiables: money is `Prisma.Decimal` everywhere, never a JS `number`; every multi-row mutation runs in `prisma.$transaction`; controllers contain no business logic; every money-affecting or content-mutating action writes an `AuditLog` entry inside that same transaction.

# An Nahda Academy — Engineering Documentation

**Read this first.** These documents are the complete specification for the platform. They are the source of truth; where code disagrees with them, the code is wrong.

---

## The documents

| # | Document | Read it when |
|---|---|---|
| **01** | [Product Requirements](./01-prd.md) | Orienting — what the product is and is not |
| **02** | [Business Rules](./02-business-rules.md) | **Always.** Every rule the system enforces, with stable IDs |
| **03** | [Domain Model](./03-domain-model.md) | Understanding entities, states, and relationships |
| **04** | [RBAC](./04-rbac.md) | Writing anything that touches permissions |
| **05** | [Database Design](./05-database-design.md) | Writing schema, migrations, or queries |
| **06** | [API Design](./06-api-design.md) | Writing controllers, DTOs, or frontend calls |
| **07** | [Architecture](./07-architecture.md) | Adding a module, job, or cross-cutting concern |
| **08** | [Development Guidelines](./08-development-guidelines.md) | **Always.** Standards, testing, and agent instructions |
| **09** | [UI Design System](./09-ui-design-system.md) | Building any interface |
| **10** | [Current State](./10-current-state.md) | **First, before building on anything.** What's built, tested, verified, and broken |
| **11** | [Hardening Backlog](./11-hardening.md) | Before production; the security and robustness gaps |
| **12** | [Roadmap](./12-roadmap.md) | Picking up the next feature — what's left and in what order |

**Precedence:** `02-business-rules.md` outranks every other document. If two documents disagree, the business rules win.

**Start here if you are picking up the project:** read `10-current-state.md` first. It tells you what is solid ground and what is thin ice. Then `12-roadmap.md` for what to build next, and `11-hardening.md` for what must be true before real money flows.

---

## What this product is

An **enrollment and subscription-billing back-office** for a madrasa-style academy.

Teaching happens off-platform in Telegram and Zoom. This system is **not a learning platform**. Its single responsibility is being the source of truth for **who is enrolled and who has paid**.

---

## The shape in one line

> **Course** defines → **Batch** freezes → **Enrollment** subscribes → **BillingPeriod** owes → **Payment** settles

with `Request` and `Refund` as the human-override paths, and `AuditLog` observing all of it.

---

## The eight things most often got wrong

Generated code gets these wrong because they contradict common patterns. They are not negotiable.

| Rule | The mistake |
|---|---|
| `PEN-02` | "Cancellation" **does not remove the student** — it adds a fee to their balance |
| `PEN-06` | The penalty applies **once per lapse**, never once per missed month |
| `BIL-07` | A shortfall **stays on its own month** — it never rolls into the next |
| `BIL-06` | A late payment **never shifts** future due dates |
| `FEE-03` | Editing a course fee **never** touches an existing batch |
| `FEE-06` | The entry discount **never** reduces the penalty amount |
| `PAY-03` | The **webhook** settles a gateway payment — never the browser redirect |
| `RBAC-03` | Self-approval is blocked **even inside a batch the manager owns** |

---

## Non-negotiables

1. Money is **never** a `number`. `Decimal` in the database, `Decimal` in code, strings over the wire.
2. Timestamps persist in **UTC**; business dates evaluate in **Asia/Dhaka**.
3. `amountPaid` is never assigned directly — it moves via verified payments and refunds, inside a transaction.
4. Controllers contain no business logic.
5. Every money-affecting action writes an `AuditLog` entry.
6. Every business rule has a test naming its ID.
7. Fees are never accepted from the client — batches copy them server-side.

---

## Stack

NestJS · PostgreSQL 16 · Prisma · Redis + BullMQ · Next.js 15 · SSLCommerz · self-built JWT auth

---

## For AI implementation agents

Before writing code for any module:

1. Read `02-business-rules.md` for every rule ID in scope
2. Read `05-database-design.md` for the schema involved
3. Read `04-rbac.md` if permissions are involved
4. Read the agent section of `08-development-guidelines.md`

**Do not** add fields, tables, endpoints, or abstractions that are not specified. The deferral list in `07-architecture.md` is deliberate.

**Do not** substitute a familiar pattern for a specified rule. This system has intentionally unusual rules — flag contradictions rather than resolving them yourself.

---

## Scope status

**Built beyond the original core:** guest payments · class links · homework · recorded classes (YouTube).

**Still out of scope** (deferred; attach to `Enrollment`/`Batch` as new tables without altering existing ones — do not build or pre-anticipate): attendance · exams · class reports · certificates · course content delivery · in-app messaging · SMS · a `Teacher` role · waitlists · file uploads (resources will use link fields first).

**Specified but not yet built** (see `12-roadmap.md`): notifications · grace/partial-payment requests · reporting + export · role-management UI.

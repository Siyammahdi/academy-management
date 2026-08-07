# 08 — Development Guidelines

**Audience:** every contributor, human or AI. These are enforceable standards, not suggestions.

---

## 1. Non-negotiables

Violating any of these is a bug, regardless of whether tests pass.

1. **Money is never a `number`.** `Decimal` in the database and in code, strings over the wire.
2. **Business dates evaluate in Asia/Dhaka; timestamps persist in UTC.**
3. **`amountPaid` is never assigned directly.** It moves only via verified payments and refunds, inside a transaction.
4. **Controllers contain no business logic.**
5. **Every money-affecting action writes an `AuditLog` entry.**
6. **Every rule in `02-business-rules.md` has a test naming its ID.**
7. **Fees are never accepted from the client.** Batches copy them server-side from the course.
8. **A teacher may never approve anything on their own enrollment.**

---

## 2. TypeScript

`strict: true`. Non-negotiable.

**Forbidden:** `any` (use `unknown` and narrow) · non-null assertion `!` (handle the null) · `@ts-ignore` (fix the type, or `@ts-expect-error` with a comment explaining why).

**Required:** explicit return types on public methods · `readonly` for injected dependencies · `interface` for object shapes, `type` for unions.

```ts
// Wrong
async function pay(id, amount) { ... }

// Right
async function verifyPayment(
  paymentId: string,
  actor: AuthUser,
): Promise<PaymentResponseDto> { ... }
```

---

## 3. Naming

| Kind | Convention | Example |
|---|---|---|
| Files | kebab-case | `billing-period.service.ts` |
| Classes | PascalCase | `BillingPeriodService` |
| Methods / variables | camelCase | `applyPenalty` |
| Constants | SCREAMING_SNAKE | `PENALTY_CRON` |
| DB tables | snake_case plural | `billing_periods` |
| Prisma models | PascalCase singular | `BillingPeriod` |
| Enums (values) | snake_case | `partially_paid` |

**Method verbs carry meaning — use them precisely:**

| Verb | Meaning |
|---|---|
| `get*` | Fetch; throws if absent |
| `find*` | Fetch; returns `null` if absent |
| `list*` | Returns a paginated collection |
| `create*` / `update*` / `delete*` | Persistence |
| `apply*` | Executes a business rule (`applyPenalty`) |
| `derive*` | Computes without persisting (`derivePeriodStatus`) |
| `assert*` | Throws when an invariant fails (`assertNotSelfApproval`) |

---

## 4. Module structure

```
modules/billing/
├── billing.module.ts
├── billing.controller.ts
├── billing.service.ts
├── penalty.service.ts
├── dto/
│   ├── create-billing-period.dto.ts
│   └── billing-period-response.dto.ts
└── billing.service.spec.ts
```

One responsibility per service. When a service exceeds ~300 lines, split it by concern — `billing.service.ts` (periods) and `penalty.service.ts` (the penalty engine) are separate for exactly this reason.

---

## 5. Services

**Every method that mutates more than one row runs in a transaction.**

```ts
async verifyPayment(paymentId: string, actor: AuthUser): Promise<void> {
  return this.prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { billingPeriod: { include: { enrollment: true } } },
    });

    // PAY-08 — guard against double verification
    if (payment.status !== 'pending') {
      throw new PaymentAlreadySettledException();
    }

    // RBAC-03 — a teacher may never verify their own enrollment
    this.assertNotSelfApproval(actor, payment.billingPeriod.enrollment);

    await tx.payment.update({ ... });
    await tx.billingPeriod.update({ ... });
    await this.audit.record(tx, { action: 'payment_verified', ... });
  });
}
```

**Reference rule IDs in comments** wherever non-obvious logic implements one. A future reader must be able to trace code back to the rule that demanded it.

**Never swallow errors.** No empty `catch`. If recovery is impossible, let it propagate.

---

## 6. Testing

### Coverage expectations

| Area | Requirement |
|---|---|
| `billing/` (periods + penalty) | Every rule in `BIL` and `PEN`, unit tested |
| `payments/` | Verification, rejection, refund, webhook idempotency |
| Guards | Every `RBAC` invariant |
| Everything else | Happy path + the primary failure |

### Test naming

Name tests for the rule they defend:

```ts
describe('PEN-06: penalty must not stack', () => {
  it('does not apply a second penalty while inPenalty is true', async () => { ... });
});

describe('RBAC-03: self-approval prohibition', () => {
  it('rejects a teacher verifying a payment on their own enrollment', async () => { ... });
  it('rejects even when the teacher is assigned to that batch', async () => { ... });
});
```

### Mandatory tests before merge

These are the rules a naive implementation most often breaks:

- `ENR-04` — two concurrent enrollments cannot both take the final seat
- `BIL-07` — a shortfall stays on its own period and never rolls forward
- `BIL-08` — a pending payment does not increase `amountPaid`
- `BIL-10` — advance payment is refused while arrears exist
- `PAY-04` — a duplicate webhook does not double-credit
- `PEN-04` — the three-condition penalty gate
- `PEN-05` — a pending payment or request protects from penalty
- `PEN-06` — the penalty never stacks
- `RBAC-03` — self-approval is refused
- `FEE-06` — the entry discount never reduces the penalty

### Approach

Unit tests mock Prisma. Integration tests run against a real Postgres (Testcontainers or a dedicated test database) — **money paths must be tested against a real database**, because transaction and constraint behaviour is exactly what is being verified.

---

## 7. Git

**Branches:** `feat/…` · `fix/…` · `refactor/…` · `docs/…` · `chore/…`

**Commits:** Conventional Commits, referencing rule IDs where relevant.

```
feat(billing): implement penalty sweep job

Applies the re-enrollment fee to unpaid periods with no pending
payment and no approved grace. Guards against stacking via
enrollment.inPenalty.

Implements PEN-01, PEN-04, PEN-06.
```

**Every PR must:** pass lint, typecheck, and tests · include tests for new business rules · state which rule IDs it implements · leave no `TODO` without a linked issue.

---

## 8. Instructions for AI implementation agents

This project has a complete specification. **The specification is the source of truth, not your priors.**

**Before writing code for a module:**
1. Read `02-business-rules.md` for every rule ID in scope.
2. Read `05-database-design.md` for the schema you are touching.
3. Read `04-rbac.md` if the code involves permissions.

**Do:**
- Implement exactly what the rules specify.
- Reference rule IDs in comments on non-obvious logic.
- Write the test alongside the implementation.
- Stop and ask if a rule seems contradictory or missing.

**Do not:**
- Add fields, tables, or endpoints not in the specification.
- Add features "for future extensibility" — the deferral list in `07-architecture.md` is deliberate.
- Substitute a common pattern for a specified rule. This system has deliberately unusual rules (the penalty adds a fee without removing the student; a shortfall never rolls forward; a teacher cannot self-approve). Standard implementations of these are wrong here.
- Use `number` for money, anywhere, for any reason.
- Silently "fix" a rule you disagree with. Flag it.

**The highest-risk misunderstandings**, stated plainly because generated code gets these wrong:

| Rule | The mistake to avoid |
|---|---|
| PEN-02 | "Cancellation" **does not remove the student**. It adds a fee. |
| PEN-06 | The penalty applies **once per lapse**, never per missed month. |
| BIL-07 | A shortfall **stays on its own month**. It never merges into the next. |
| BIL-06 | A late payment **never shifts** future due dates. |
| FEE-03 | Editing a course fee **never** touches an existing batch. |
| FEE-06 | The entry discount **never** reduces the penalty amount. |
| PAY-03 | The **webhook** settles a payment, never the browser redirect. |
| RBAC-03 | Self-approval is blocked **even inside a batch the teacher owns**. |

---

## 9. Lessons from implementation

Real bugs that shipped and were caught later. Each one teaches a rule that now applies to all new work.

**A state transition that no test exercised end to end can silently never happen.**
`Enrollment.status` never moved `pending → active` on payment verification — the code updated the period and penalty flag but forgot the enrollment. Every "active enrollment" filter returned nothing, silently, and the unit tests passed because they never paid-verified-then-read as one flow. **A feature that depends on a state change MUST have a test that drives the whole transition and asserts the persisted result**, not the intermediate steps.

**State derived at read-time is a lie to every other reader.**
Period status was once corrected only inside one GET endpoint, leaving the database column stale — which the penalty job, reading the column directly, would have misread and penalized paid-up students. **Persist derived state at write time. Never patch it at read time in one consumer.**

**"Tests pass" is not "works."** No page in this system has been verified in a browser. The two bugs above are what that gap looks like. Before any feature is called done, its flow is walked as the relevant role.

## 10. Definition of done

A feature is complete when:

- [ ] The rules it implements are satisfied, with rule IDs referenced
- [ ] Tests exist and pass, named for their rule IDs
- [ ] **A test drives any state transition the feature relies on, end to end, and asserts the persisted result**
- [ ] Derived state is persisted at write time, not corrected at read time
- [ ] Money uses `Decimal`; business dates use the Dhaka helpers
- [ ] Multi-row mutations run in a transaction
- [ ] Money-affecting and content-mutating actions write an audit entry
- [ ] Guards enforce the RBAC constraints
- [ ] Errors use domain exceptions with stable codes
- [ ] No `any`, no `!`, no `@ts-ignore`
- [ ] Lint and typecheck pass
- [ ] **The flow has been walked in a browser as the relevant role**

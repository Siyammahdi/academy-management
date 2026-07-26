# An Nahda Academy — Web

Next.js (App Router) frontend for the enrollment and subscription-billing back-office. Read the root [`../README.md`](../README.md) and [`../docs/`](../docs) before changing anything — in particular [`../docs/09-ui-design-system.md`](../docs/09-ui-design-system.md) (every visual decision) and [`../docs/06-api-design.md`](../docs/06-api-design.md) (every endpoint this app calls).

**If you're picking this up fresh:** read [`../docs/10-current-state.md`](../docs/10-current-state.md) §3 first — it's blunt about what's unverified here. **No page in this app has been visually checked in a browser.** Typecheck, lint, and build passing means the contracts are right, not that anything looks correct, is responsive, or is usable. Walking a flow as each role (`../docs/11-hardening.md` H-03) is the highest-value thing you can do before adding new UI on top of this.

---

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The API must be running separately (see `../api/README.md`) on the port `NEXT_PUBLIC_API_URL` points at — `.env.example` defaults to `http://localhost:4000/api/v1`, matching the API's own `.env.example` default, so the two never collide on port 3000.

```bash
pnpm build   # also runs the TypeScript check
pnpm lint
```

There is no automated test suite for this app yet (`../docs/10-current-state.md` §5) — typecheck, lint, build, and manual verification against the running API are the only checks today.

---

## Structure

```
app/
├── (public)/    marketing: home, about, contact, guest payment (/pay)
├── (auth)/      login, register
├── (admin)/     admin console — courses, batches, roster, payments
├── (manager)/   manager console — own-batch roster, payment verification
└── (student)/   dashboard, dues, payments, browse/enroll, homework, recordings

components/
├── ui/          shadcn (Base UI + Luma) — Button, Input, Card, Field, Sonner, …
├── auth/        AuthShell, PasswordInput — login/register chrome
├── ledger/      LedgerLine, AmountCell, StatusPill — migrating to money/ next
├── layout/      AppShell, Sidebar, PageHeader — shared by admin/manager/student consoles
├── batches/     BatchRoster, HomeworkPanel, RecordingsPanel
├── payments/    PaymentModal, PendingPaymentsQueue
└── media/       YoutubeEmbed

lib/
├── auth.ts           login / register / logout / refresh / role home paths
├── auth-errors.ts    auth error-code → copy mapping
├── api-client.ts     authenticated domain API calls (all roles)
├── guest-api.ts      unauthenticated guest payment client
├── api.ts            apiFetch() + ApiError
├── session.ts        cookie-based token + roles storage
├── error-message.ts  shared ApiError code → copy helpers
├── format.ts         formatMoney(), formatDate()
└── utils.ts          cn() — shadcn class merge```

**Reuse philosophy:** admin and manager render the *same* components (`BatchRoster`, `HomeworkPanel`, `RecordingsPanel`, `PendingPaymentsQueue`) parameterized by route/props, not forked copies. If you need "the same thing but for manager," check whether the admin version already takes the props you need before writing a new component.

---

## Conventions

- **Money is a string, always.** The API serializes every amount as a decimal string (`"500.00"`); format it with `formatMoney()` from `lib/format.ts`. Never `Number()`/`parseFloat()` an amount for display, and never do money arithmetic client-side — that's what the API's `Decimal` math is for.
- **Dates render in Asia/Dhaka**, always, via `formatDate()` — never a raw UTC string, never `new Date().toLocaleDateString()` ad hoc.
- **Errors switch on `ApiError.body.error`** (a stable machine-readable code — see `../docs/06-api-design.md` §1), never on `.message` (human copy that can change). `apiErrorMessage()`/`payErrorMessage()` in `lib/error-message.ts` centralize the code→copy mapping; add new codes there, not inline in a page.
- **Design tokens** — shadcn Luma CSS variables in `app/globals.css` (purple primary + status colors). Prefer semantic classes (`bg-primary`, `text-muted-foreground`) over arbitrary values.
- **`docs/06-api-design.md`'s "NOT BUILT" annotations are load-bearing.** Several sections (Requests, Reporting, Notifications, and two Billing routes) document a *planned* API shape for endpoints that don't exist yet — check `../docs/10-current-state.md` §2 before wiring a page to any endpoint, so you don't build UI against a 404.

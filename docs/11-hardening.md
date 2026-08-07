# 11 — Hardening Backlog

**Purpose:** the security and robustness work between "works in development" and "safe in production with real money." Ordered by priority.

**This is a financial system.** The bar is higher than a typical CRUD app. Every item here is a real gap, not a nice-to-have.

---

## P0 — Before any real money flows

### H-01 · Prove SSLCommerz against a live sandbox
Signature verification is implemented from documentation and has never seen a real callback. If it's wrong, every real payment is rejected as invalid.

- Expose the API through a tunnel (ngrok or similar).
- Register the IPN URL in the SSLCommerz sandbox.
- Run one real transaction; confirm the webhook arrives, the signature verifies, and the period settles.
- Only then trust the gateway path.

### H-02 · Move auth tokens to `httpOnly` cookies
Tokens currently sit in a JS-readable cookie — XSS-exposed. An attacker who lands any script on the page can exfiltrate a session.

- Access + refresh tokens in `httpOnly`, `secure`, `sameSite` cookies set by the server.
- The browser never reads tokens directly; the API reads them from the cookie.
- Consider a thin BFF/proxy layer in Next.js so the browser never holds a token at all.

### H-03 · Verify every money path in a browser, as each role
Automated tests passed while `Enrollment.status` never activated — proof that the UI layer hides real bugs. Walk, as a human:

- Admin creates course → opens batch → assigns teacher
- Student enrolls → pays (gateway *and* manual) → sees status
- Teacher verifies → student sees it settled
- Guest pays for a student by identifier
- Penalty trigger (admin manual-trigger) → student sees the fee

---

## P1 — Before production launch

### H-04 · Rate limiting
No endpoint is rate-limited. Two concrete exposures:

- **Guest lookup** returns a student's name for any valid identifier, and IDs are sequential — trivially enumerable. Add `@nestjs/throttler`, tight limit per IP.
- **Auth** (login, register, refresh) needs limits to blunt credential stuffing and brute force.

### H-05 · Input sanitization and output encoding
Teacher- and student-supplied text (homework descriptions, resource titles, guest names) renders in dashboards. Confirm:

- React's default escaping is not bypassed anywhere (`dangerouslySetInnerHTML` must not appear).
- URL fields (class link, resource links) are validated as `http(s)` and rendered with `rel="noopener noreferrer"`.
- The YouTube embed uses the video-id path, never raw user URL injection into the iframe `src`.

### H-06 · Secrets and configuration
- Confirm `.env` is git-ignored and no secret was ever committed (check history, not just the working tree).
- Rotate the dev JWT secrets before production; generate fresh, distinct access and refresh secrets.
- Config validation should fail-fast on every required production variable.

### H-07 · CORS lockdown
Dev CORS allows localhost. Production must allow only the real frontend origin, with credentials, and nothing wildcard.

### H-08 · Migrate `middleware.ts` → Next 16 `proxy.ts`
Functional today, deprecated, emits a build warning. Migrate when the new contract is confirmed. Remember: this is UX-only routing — the API stays the real authority regardless.

---

## P2 — Operational readiness

### H-09 · Automated, off-server Postgres backups
Non-negotiable for a payment record system.

- Daily `pg_dump` to object storage, off the VPS.
- **Test a restore.** An untested backup is not a backup.
- Retention: keep at least 30 daily snapshots.

### H-10 · Structured logging and error tracking
- Requests logged with a correlation id (the exception filter already generates one — wire it through).
- An error tracker (Sentry or similar) on both API and web.
- The penalty and billing jobs must log run summaries somewhere durable — a silent zero-processed run is a bug you need to see.

### H-11 · Health checks and uptime
- A `/health` endpoint checking Postgres and Redis connectivity.
- External uptime monitoring, especially around the 1st–5th when billing is active.

### H-12 · Idempotency on all job triggers
The admin manual-trigger endpoints enqueue real jobs. Confirm a double-click can't double-run a penalty sweep in a way that harms (the `inPenalty` guard should hold, but verify under concurrency).

### H-13 · Database connection pooling
Under load (the monthly billing window), confirm Prisma's pool is sized correctly and the worker and API don't exhaust connections between them.

---

## P3 — Defense in depth

### H-14 · Audit log immutability
`AuditLog` is append-only by convention. Consider enforcing it at the database level (revoke UPDATE/DELETE for the app role) so a compromised app can't rewrite history.

### H-15 · Refund and penalty-reversal guards under concurrency
These reopen balances. Confirm two admins acting on the same payment can't produce a negative or doubled balance — the same `$transaction` discipline as verification.

### H-16 · Webhook replay window
Beyond idempotency by `transactionReference`, consider rejecting callbacks older than a reasonable window to limit replay surface.

### H-17 · PII minimization in logs
Guest names, phones, and emails must never land in plaintext logs or error traces.

---

## How to use this list

**Do not treat these as optional polish.** P0 and P1 are the difference between a demo and a system you'd trust with a family's tuition money. When Cursor or any agent works on scaling, these are the guardrails — new features must not regress any item here, and ideally each new feature is checked against H-05, H-04, and H-17 as it's built.

# 09 — UI Design System

**Purpose:** the visual and interaction language. Every screen derives from these tokens.

---

## 1. Direction

An Nahda Academy is a place of study with a **long tradition behind it** — and the product's job is *clarity about money and enrollment*. Those two facts set the direction.

**The brief in one line:** dignified and calm, precise where it matters, never corporate-SaaS and never ornamental-Islamic-kitsch.

**What this rules out.** The default madrasa/Islamic web aesthetic — gold gradients, arabesque borders, mosque silhouettes, ornate frames — reads as decorative rather than serious, and it fights the product's real job. Equally rejected: the generic admin-dashboard look (purple gradient sidebar, floating white cards, rounded-everything), which says nothing about this academy.

**The choice.** Draw from **manuscript and printed-page tradition** rather than architectural ornament: generous margins, considered typography, hairline rules, restrained ink-on-paper palette. A well-set book, not a decorated hall. Structure carries the meaning; ornament is absent.

**The signature element.** The **ledger line** — a hairline horizontal rule with the amount set right-aligned in a tabular face, used consistently for every financial row across student dues, verification queues, and reports. It is the one motif repeated everywhere, and it comes directly from the subject: an account book.

---

## 2. Palette

Ink on paper, with a single deep accent and a disciplined status set.

```css
:root {
  /* Surface */
  --paper:        #FAF7FD;   /* page background — marketing */
  --paper-app:    #FCFCFD;   /* page background — application */
  --paper-raised: #FFFFFF;   /* cards, table surfaces */
  --paper-sunken: #F3F1EC;   /* input fills, table headers, empty states */

  /* Ink */
  --ink:          #1A1917;   /* primary text */
  --ink-muted:    #57544E;   /* secondary text, labels */
  --ink-faint:    #8B8780;   /* metadata, placeholders */

  /* Rules */
  --rule:         #E4E1D9;   /* hairline dividers, the ledger line */
  --rule-strong:  #CBC7BC;   /* table headers, emphasis borders */

  /* Accent — deep purple. Restrained; used for action, never decoration. */
  --purple-deep:  #4C2A72;
  --purple:       #A372DA;
  --purple-wash:  #F1EBF8;
  --purple-tint:  #FAF7FD;

  /* Status */
  --paid:         #2F6B3D;   /* settled */
  --paid-wash:    #E8F1EA;
  --pending:      #8A6114;   /* awaiting verification */
  --pending-wash: #FAF0DC;
  --overdue:      #9A2B25;   /* unpaid past due, penalty */
  --overdue-wash: #FBECEA;
  --neutral:      #57544E;   /* upcoming, informational */
  --neutral-wash: #F0EEE9;
}
```


**Rules of use**
- Purple appears on **primary actions and links only**. Never as a background wash for whole sections, never as a gradient.
- Status colors appear on **status pills and amounts**, never as full-row backgrounds — a table of colored rows is unreadable.
- There are **no gradients anywhere** in this system.

---

## 3. Typography

Three roles, deliberately paired.

| Role | Face | Use |
|---|---|---|
| **Display** | `Fraunces` (variable serif, optical size) | Page titles, marketing headlines, section openers. Used sparingly. |
| **Body / UI** | `Inter` | Everything interface: labels, buttons, body copy, tables |
| **Numeric** | `IBM Plex Mono` | **All money, all dates, all IDs, all counts** |

**The numeric face is the load-bearing decision.** Every amount, due date, student ID, and period month is set in a monospaced face with tabular figures, so columns of money align perfectly and a `500.00` never optically outweighs a `1500.00`. This is what makes the ledger legible, and it is the typographic expression of the product's purpose.

```css
--font-display: 'Fraunces', Georgia, serif;
--font-body:    'Inter', system-ui, sans-serif;
--font-numeric: 'IBM Plex Mono', ui-monospace, monospace;

/* Money and figures always: */
font-variant-numeric: tabular-nums;
```

### Scale

```css
--text-display: 2.75rem;  /* 44px — page hero, display face */
--text-h1:      2rem;     /* 32px */
--text-h2:      1.5rem;   /* 24px */
--text-h3:      1.125rem; /* 18px */
--text-body:    0.9375rem;/* 15px — base */
--text-sm:      0.8125rem;/* 13px — labels, metadata */
--text-xs:      0.6875rem;/* 11px — eyebrows, pill text */
```

Line height: `1.65` for prose, `1.4` for UI, `1.2` for display.
Weights: `400` body · `500` UI emphasis and labels · `600` headings. **Never `700`+** — weight is not how this system creates emphasis; space and rule are.

**Eyebrow labels** (section markers, table headers) are `--text-xs`, uppercase, `letter-spacing: 0.08em`, `--ink-faint`.

---

## 4. Space and layout

An 8px base scale.

```css
--space-1: 0.25rem;  --space-2: 0.5rem;   --space-3: 0.75rem;
--space-4: 1rem;     --space-6: 1.5rem;   --space-8: 2rem;
--space-12: 3rem;    --space-16: 4rem;    --space-24: 6rem;
```

**Containers**
- Marketing/public pages: `max-width: 1120px`
- Application screens: `max-width: 1280px`
- Reading content (about, policies): `max-width: 68ch`

**Radius** — restrained. `--radius-sm: 4px` (inputs, pills) · `--radius-md: 8px` (cards, panels). Nothing is fully rounded except avatars. No `border-radius: 9999px` buttons.

**Elevation** — almost none. Surfaces are separated by **hairline rules**, not shadows. Two shadows exist:

```css
--shadow-overlay: 0 8px 32px rgba(26, 25, 23, 0.12);   /* modals, drawers */
--shadow-card:    0 2px 8px rgba(26, 25, 23, 0.06);    /* marketing cards only */
```

Application cards do not float — hairline rules only, never `--shadow-card`. This is the single strongest departure from the default dashboard look, and it is deliberate: a ledger is a flat page. Marketing pages (§9) may use `--shadow-card` for course cards and similar, since they're allowed to be more expressive.

---

## 5. Components

### The ledger line — the signature

Every financial row, everywhere in the product:

```
─────────────────────────────────────────────────────────────
 March 2026            Learning Arabic · Batch 8    ৳ 500.00
 Due 5 Mar             ● Unpaid                     ─────────
─────────────────────────────────────────────────────────────
```

- Hairline `--rule` above and below; no card, no shadow, no fill.
- Amount **right-aligned**, `--font-numeric`, tabular figures.
- Status pill inline, never a row background.
- Outstanding balances show the shortfall beneath the amount, in `--overdue`.

This component appears in the student dashboard, the manager verification queue, the guest payment selection, and every report. Its consistency *is* the design.

### Status pills

Small, uppercase, `--text-xs`, `--radius-sm`, wash background with matching ink. A filled dot precedes the label.

| Status | Token pair |
|---|---|
| Paid | `--paid` / `--paid-wash` |
| Pending | `--pending` / `--pending-wash` |
| Partially paid | `--pending` / `--pending-wash` |
| Unpaid | `--neutral` / `--neutral-wash` |
| Overdue · In penalty | `--overdue` / `--overdue-wash` |

### Buttons

| Variant | Treatment |
|---|---|
| Primary | `--purple` fill, white text |
| Secondary | Transparent, `1px solid --rule-strong`, `--ink` |
| Danger | `--overdue` fill, white text — reject, remove, refund only |
| Ghost | Text only, `--purple` |

Height `40px` (`36px` compact). Padding `0 --space-4`. Weight `500`. **Sentence case, never uppercase.** Focus: `2px` accent outline at `2px` offset — always visible, never removed.

### Tables

Header row: `--paper-sunken`, eyebrow treatment. Rows separated by `--rule` hairlines, no zebra striping. Numeric columns right-aligned in `--font-numeric`. Row hover: `--paper-sunken`. **No row-level color fills.**

### Forms

Label above input, `--text-sm`, `--ink-muted`, weight `500`. Input: `--paper-sunken` fill, `1px solid --rule`, `--radius-sm`, `40px` tall. Focus: border `--purple` + `2px` `--purple-wash` ring.

Errors appear **beneath** the field in `--overdue`, `--text-sm`, and state what to do — not merely what failed. "Enter an amount of ৳500.00 or less" beats "Invalid amount."

### Empty states

Centered, `--space-16` vertical padding. One line of `--ink-muted` explaining what would appear here, and a primary action when one exists. **No illustrations.**

---

## 6. Money and dates in the interface

**Money**
- Always `--font-numeric`, tabular figures, **two decimals always** (`৳ 500.00`, never `৳ 500`)
- Currency symbol `৳` precedes, with a hair space
- Right-aligned in every table and ledger line
- Negative or outstanding amounts in `--overdue`, never with a minus sign alone — label them ("Outstanding ৳ 200.00")

**Dates**
- Display in **Asia/Dhaka**, always. Never show a raw UTC timestamp.
- Format `5 Mar 2026`. Period months as `March 2026`.
- Relative time only for recency (`2 hours ago`) and never for due dates — a due date is always absolute.

---

## 7. Interface voice

Plain, direct, and specific. The interface is not chatty and does not apologize.

| Instead of | Write |
|---|---|
| "Oops! Something went wrong" | "Payment could not be verified. Try again or contact an admin." |
| "Submit" | "Submit payment" |
| "Are you sure?" | "Reject this payment? The student will be notified." |
| "No data" | "No payments awaiting verification." |
| "Error: batch capacity exceeded" | "Full — try next batch." |

**Consistency of vocabulary matters more than variety.** The verb on the button is the verb in the confirmation and the verb in the toast: *Verify* → *Verify payment* → *Payment verified*.

**Never expose internals.** People see "payment," "due date," "batch" — never "billing period ID," "webhook," or "enum value."

---

## 8. Motion

Restrained. Motion confirms an action; it never performs.

```css
--ease:          cubic-bezier(0.2, 0, 0, 1);
--duration-fast: 120ms;   /* hover, focus */
--duration-base: 200ms;   /* panels, disclosure */
--duration-slow: 320ms;   /* modals, drawers */
```

Permitted: hover and focus transitions, modal and drawer entry, toast entry, skeleton loading, a subtle row highlight when a payment settles.

**Not permitted:** scroll-triggered reveals in the application, parallax, animated counters on money, decorative loops.

`prefers-reduced-motion: reduce` disables all non-essential motion. Non-negotiable.

---

## 9. Public pages

The landing, about, contact, and course pages may be **more expressive** than the application — this is where Fraunces earns its place at display sizes and where the academy's character shows.

The rules that still hold: the same palette, no gradients, no stock photography of generic classrooms, hairline rules rather than shadows. Motion may include one deliberate page-load sequence; it must respect reduced-motion.

**Course cards** show title, billing type, fee, and — when a batch is open — seats remaining and the enrollment deadline. When full: **"Full — try next batch,"** in `--ink-muted`, with enrollment disabled rather than hidden.

---

## 10. Responsive

Breakpoints: `640px` · `768px` · `1024px` · `1280px`.

**Mobile is the primary case for students and guests** — a parent paying from a phone is a core flow, not an afterthought.

- Tables become **stacked ledger lines** below `768px`; never horizontally scrolling tables.
- The admin/manager sidebar collapses to a drawer below `1024px`.
- Touch targets are minimum `44px`.
- The guest payment flow must be completable one-handed on a phone.

---

## 11. Accessibility floor

Not optional, and not a later pass:

- Contrast **4.5:1** for body text, **3:1** for large text and UI borders
- Every interactive element reachable by keyboard, with a **visible** focus ring
- Status is never conveyed by color alone — pills carry text, not just a hue
- Form inputs have associated `<label>` elements
- Tables use `<th scope>` correctly
- Modals trap focus and close on `Escape`
- Live regions announce payment status changes

---

## 12. Implementation

Tailwind, with these tokens defined in `tailwind.config.ts` — **never arbitrary values in components**. If a color or spacing value is not a token, it does not belong in the interface.

```
components/
├── ui/          # Button, Input, Select, Modal, Toast, Pill, Table
├── ledger/      # LedgerLine, LedgerGroup, AmountCell, StatusPill
├── layout/      # AppShell, Sidebar, PageHeader, Container
└── forms/       # PaymentForm, EnrollmentForm, RequestForm
```

`components/ledger/` is the design system's core. Build it first, and build every financial surface from it.

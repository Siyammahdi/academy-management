# 09 — UI Design System

**Purpose:** the visual and interaction language. Built on **shadcn/ui (Base UI) with the Luma style preset**, themed purple. Every screen composes from shadcn components; this document defines how they're themed, and the product-specific rules that sit on top.

**Foundation:** shadcn Base UI + Luma preset. Luma is the "softer, more fluid" shadcn style — rounded, polished, consistent. Do not hand-build primitives that shadcn provides.

---

## 0. Setup (do this first, it is the source of truth)

The **CLI generates the real tokens** — radius, spacing, and the `:root` CSS variables. This document must not contradict them; where a number matters, the CLI's value wins.

```bash
cd web
pnpm dlx shadcn@latest init --base-ui
# choose the Luma style preset when prompted
# base color: neutral/stone (purple is layered on top, see §2)
```

Install the shadcn skill so Cursor uses the CLI and Base UI APIs correctly:

```bash
pnpm dlx shadcn@latest add https://ui.shadcn.com/skills/shadcn
# or ensure skills/shadcn/SKILL.md is present for the agent
```

Add components as needed via the CLI, never by hand:

```bash
pnpm dlx shadcn@latest add button input select dialog table sonner card badge form label textarea dropdown-menu sheet skeleton
```

**Rule for implementers:** if shadcn ships a component, use it. Do not reimplement Dialog, Select, Table, Toast, or focus-trapping by hand — the old hand-built primitives are being replaced.

---

## 1. Direction

An Nahda Academy is a place of study, and the product's job is **clarity about money and enrollment**. The visual language is **calm, polished, and consistent** — Luma's soft, rounded surfaces, themed in a restrained purple, with nothing decorative fighting the data.

**The brief in one line:** a polished, modern academy portal — playful where students learn and join class, quiet and precise where money appears.

**What this rules out:** ornamental Islamic motifs, generic grey SaaS dashboards, heavy drop shadows, and border-boxed chrome everywhere. Purple carries identity; color fills and spacing create hierarchy; money stays calm and tabular.

**Auth screens (login / register):** Same expressive student language — brand wash atmosphere, highlight tiles (Enroll · Dues · Class), and a solid form sheet. Mobile-first with safe-area padding and 44px+ controls; tablet/desktop use a two-column brand + form layout without heavy borders or shadows.

---

## 2. Color

Purple is the brand, mapped onto shadcn's semantic tokens. **The CLI writes the `:root` block; this section defines what purple maps to and what stays distinct.**

### Brand → shadcn primary

Map the purple family onto shadcn's `--primary`:

```css
--primary:            #A372DA;   /* purple — primary actions, active states */
--primary-foreground: #FFFFFF;
/* hover/darker shade for emphasis where needed */
--primary-strong:     #4C2A72;   /* deep purple — strong text, emphasis */
--primary-wash:       #F1EBF8;   /* subtle purple fills, active nav, badges */
```

Everything else (`--background`, `--foreground`, `--muted`, `--border`, `--card`, `--ring`) uses Luma's generated neutral values. Do not override them unless a specific need arises.

### Status colors — kept distinct from the brand

Payment status must be instantly distinguishable and must **not** be purple. Define these as semantic tokens alongside shadcn's:

```css
--status-paid:         #2F6B3D;  --status-paid-bg:      #E8F1EA;
--status-pending:      #8A6114;  --status-pending-bg:   #FAF0DC;
--status-overdue:      #9A2B25;  --status-overdue-bg:   #FBECEA;
--status-neutral:      #57544E;  --status-neutral-bg:   #F0EEE9;
```

Rendered via shadcn `Badge` variants (see §5). Green = paid, amber = pending/partial, red = overdue/penalty, grey = upcoming/neutral.

### Rules of use

- **Purple on actions, active states, and student highlight modules** (classroom spotlight, metric tiles, course covers). Do not flood admin money tables with purple washes.
- **Status colors on badges, amounts, and small urgency cues** — not full-table row fills. Soft status *surface* tokens (`--status-*-bg`) may tint student metric tiles.
- **Contrast:** `#A372DA` clears contrast for white-on-purple buttons, borders, and large text, but **not** for body-size purple text — use `--primary-strong` (`#4C2A72`) for small purple text and links.
- **Dark mode:** Luma generates a dark palette. If dark mode ships, verify the status tokens have dark variants that still read as green/amber/red.

---

## 3. Typography

Luma's default font stack (as generated). One product-specific rule sits on top.

- **UI / body:** Luma's default sans (Geist or Inter, per the preset).
- **Headings:** per Luma; used sparingly.
- **Money and figures — `tabular-nums`.** This is the one typographic rule kept from the prior system, because it is legibility, not decoration:

```css
/* Applied to every money amount, and to numeric table columns */
font-variant-numeric: tabular-nums;
```

**Why it stays:** in a proportional font, `1,500.00` and `500.00` don't align in a column — different digit widths make a list of amounts ragged and hard to reconcile. `tabular-nums` gives equal-width digits so columns line up. One CSS declaration on amount cells; invisible everywhere else. The `AmountCell` component (§5) applies it.

Everything else — the monospaced money typeface and the ledger-line motif from the previous version — is **removed**. Financial rows use standard shadcn `Table` and `Card`.

---

## 4. Layout and spacing

Use Luma's spacing scale and the product radius below. **Do not invent spacing values** — Tailwind's scale plus tokens cover everything.

**Radius — restrained, professional (overrides Luma's soft default):**

```css
--radius: 0.5rem; /* ~8px base */
```

| Surface | Token / class | Feel |
|---|---|---|
| Buttons, inputs | `rounded-lg` | Crisp control |
| Cards, panels, sheets | `rounded-xl` | Soft enough, not pillowy |
| Badges, chips | `rounded-md` | Compact |
| Avatars / icon wells | `rounded-lg` | Squircle-lite, not circles for chrome |

**Do not** use `rounded-3xl` / `rounded-4xl` / `rounded-full` for cards, buttons, or primary chrome — those read as consumer-toy, not academy SaaS. Reserve `rounded-full` for true circular affordances (avatar photo, status dot).

**Containers:**
- Marketing/public: `max-w-6xl` (~1120px)
- Application: `max-w-7xl` (~1280px)
- Reading content (about, policies): `max-w-prose`

**Elevation — flat, color-led (no shadow stack):**

- **Do not** use drop shadows on cards, panels, or buttons.
- **Do not** wrap every block in a 1px border. Prefer filled surfaces (`bg-card`, `bg-muted`, `bg-primary-wash`, status surface tokens) and whitespace.
- Borders are allowed sparingly for true dividers (sidebar edge, input underlines/fields) or when a control needs a clear hit edge (`outline` buttons).
- Depth comes from **contrast between fills**, not from `shadow-*` or nested rings.

**Student dashboard UX:**

- Highlight **classroom join**, **homework**, and **recorded classes** as first-class modules — not buried lists.
- Classroom actions: **Join class** + **Copy link** side by side.
- Recordings organized **by class day** (Asia/Dhaka calendar date), newest day first.
- Courses show a **cover** (branded generative art when no image field exists in the API).
- Mobile / tablet should feel app-like: horizontal snap rows, large tap targets (≥44px), stacked spotlight → homework → recordings → courses.
- Counts are fine; **never sum money across enrollments** (BIL-07).

---

## 5. Components

Compose from shadcn. The product-specific components are thin wrappers, not new primitives.

### Standard (use shadcn as-is)
`Button` · `Input` · `Textarea` · `Select` · `Dialog` · `Sheet` (mobile drawers) · `Table` · `Card` · `Badge` · `Form` + `Label` · `DropdownMenu` · `Skeleton` (loading) · `Sonner`/`Toast` (notifications).

**This replaces the hand-built `ui/` primitives.** Migrate Button, Input, Modal, Pill, Card, Select to their shadcn equivalents. Delete the hand-rolled versions once migrated.

### Product wrappers (thin, over shadcn)

**`AmountCell`** — renders money: `৳` prefix with a hair space, **two decimals always** (`৳ 500.00`), `tabular-nums`, right-aligned. Outstanding amounts use `--status-overdue` and are labelled ("Outstanding ৳ 200.00"), never shown as a bare negative.

**`StatusBadge`** — a shadcn `Badge` mapped to the status tokens in §2. Carries a text label and a colored dot, so status is never conveyed by color alone. Reused for non-money statuses where meaning matches (homework "Past due" → overdue tone, "Upcoming" → neutral).

**`PaymentRow`** — a `Table` row (or a stacked `Card` on mobile) showing period month, course · batch, amount (`AmountCell`), and `StatusBadge`. Replaces the old ledger line. Used in the student dashboard, the verification queue, guest payment selection, and reports.

**`PaymentModal`, `PendingPaymentsQueue`, `BatchRoster`, `HomeworkPanel`, `RecordingsPanel`, `YoutubeEmbed`** — keep their existing behaviour; reskin them onto shadcn `Dialog`, `Table`, `Card`, `Button`.

### Buttons

Use shadcn variants: `default` (purple primary), `secondary`, `outline`, `ghost`, `destructive` (reject/remove/refund only). **Sentence case, never uppercase.** Buttons use `rounded-lg`. Keep shadcn's built-in focus-visible ring — never remove it.

When a Button renders as a `Link` or `<a>` via the `render` prop, Base UI requires `nativeButton={false}` — the shared `Button` component sets this automatically when `render` is passed.

---

## 6. Money and dates

**Money** (via `AmountCell`): `tabular-nums`, two decimals always, `৳` prefix, right-aligned in tables. Computed server-side and sent as strings — never do money math in the client.

**Dates:** display in **Asia/Dhaka**, always. Format `5 Mar 2026`; period months as `March 2026`. Relative time only for recency, never for due dates. `lib/format.ts` owns all formatting.

---

## 7. Interface voice

Plain, direct, specific. Not chatty, does not apologize.

| Instead of | Write |
|---|---|
| "Oops! Something went wrong" | "Payment could not be verified. Try again or contact an admin." |
| "Submit" | "Submit payment" |
| "Are you sure?" | "Reject this payment? The student will be notified." |
| "No data" | "No payments awaiting verification." |
| "Error: batch capacity exceeded" | "Full — try next batch." |

**Vocabulary consistency beats variety:** *Verify* → *Verify payment* → *Payment verified*. **Never expose internals** — no "billing period ID," "webhook," or "enum value" in the UI.

Errors now use shadcn `Sonner` toasts for transient feedback and inline `Form` errors for field validation. Field errors state what to do ("Enter an amount of ৳500.00 or less"), not merely what failed.

---

## 8. Motion

Luma's defaults, kept restrained. Motion confirms an action; it never performs. shadcn's built-in transitions (dialog, dropdown, sheet) are sufficient — do not add custom animation libraries to the application.

Not permitted in the app: parallax, animated counters on money, scroll-triggered reveals, decorative loops. `prefers-reduced-motion: reduce` disables all non-essential motion — non-negotiable.

Marketing pages (§9) may have one deliberate page-load sequence, reduced-motion respected.

---

## 9. Public pages

The landing, about, contact, and course pages may be **more expressive** than the application. Same purple identity, Luma components, no stock photography of generic classrooms.

**Course cards** (shadcn `Card`) show title, billing type, fee, and — when a batch is open — seats remaining and the enrollment deadline. When full: **"Full — try next batch,"** muted, enrollment disabled rather than hidden.

---

## 10. Responsive

Breakpoints per Tailwind defaults. **Mobile is the primary case for students and guests** — a parent paying from a phone is a core flow.

**Student portal — app-like on small screens:**
- Fixed **bottom tab bar** (`Home` · `Dues` · `Pay` · `Enroll`) below `lg`, with `env(safe-area-inset-bottom)`.
- Compact sticky top bar (logo + logout); desktop keeps the sidebar.
- Main content pads above the tab bar so nothing sits under the home indicator.
- Metric tiles use a **2×2 grid** on phones (not a sideways scroller).
- Course shelf is a **horizontal snap carousel** on phones; grid from `sm` up.
- Primary actions use **min-height 44px** (`min-h-11`) and full-width stacks where helpful.
- Prefer filled surfaces and spacing over borders/shadows (see §4).

**Shared:**
- Tables collapse to stacked cards below `md`; never horizontally scrolling tables.
- Admin/manager use the hamburger drawer below `lg` (not bottom tabs).
- The guest payment flow must be completable one-handed on a phone.

---

## 11. Accessibility floor

Base UI gives strong accessibility defaults; do not undo them.

- Contrast 4.5:1 body text, 3:1 large text and UI borders. Purple body text uses `--primary-strong`.
- Every interactive element keyboard-reachable with a **visible** focus ring (shadcn's default — keep it).
- Status never by color alone — badges carry text and a dot.
- `Form` + `Label` associate inputs correctly.
- `Table` uses proper header scope.
- Dialogs trap focus and close on Escape (Base UI handles this).
- Live regions (`Sonner`) announce payment status changes.

---

## 12. Implementation

shadcn components live in `web/components/ui/` (CLI-managed — do not hand-edit beyond theming). Product wrappers and composites:

```
components/
├── ui/          shadcn components (CLI-managed)
├── money/       AmountCell, StatusBadge, PaymentRow
├── layout/      AppShell, Sidebar, MobileTabBar, Container, PageHeader
├── batches/     BatchRoster, HomeworkPanel, RecordingsPanel
├── payments/    PaymentModal, PendingPaymentsQueue
└── media/       YoutubeEmbed
```

**Migration note (from the pre-shadcn build):** the project previously hand-built `Button`, `Input`, `Textarea`, `Select`, `Modal`, `Pill`, `Card`, and a bespoke `ledger/` folder. These are **replaced** by shadcn equivalents. The `ledger/LedgerLine` concept becomes `money/PaymentRow` on a standard `Table`. Migrate page-by-page, delete the old primitive once its consumers are moved, and verify each screen in a browser as it's migrated (per doc 08 §9).

**Tokens:** never use arbitrary color values in components. Use shadcn semantic tokens (`bg-primary`, `text-muted-foreground`) and the status tokens from §2. If a value isn't a token, it doesn't belong in a component.

---

## 13. Added-scope components (class management)

Reskinned onto shadcn, no new visual language:

- **YoutubeEmbed** (`components/media/`) — lazy thumbnail (`next/image`, `aspect-video`) with a play overlay; on click swaps in the `youtube-nocookie.com` iframe. Lazy because a dashboard may list many recordings.
- **HomeworkPanel / RecordingsPanel** (`components/batches/`) — shadcn `Card` list + `Dialog` form, `Button` variants `ghost` (edit) and `destructive` (delete). "Past due"/"Upcoming" via `StatusBadge`.

---

## 14. What Cursor should do with this document

1. Run the shadcn init (§0) — that writes the real tokens.
2. Map purple onto `--primary` and add the status tokens (§2).
3. Migrate hand-built primitives to shadcn, page by page (§12).
4. Replace the ledger line with `PaymentRow` on a `Table`, keeping `tabular-nums` on amounts (§3, §5).
5. Verify each migrated screen in a browser (doc 08 §9) — the frontend has never been visually checked.

The identity to preserve through all of it: **purple brand, status colors kept distinct, two-decimal `tabular-nums` money, Dhaka dates, the plain interface voice.** Everything else is standard shadcn Luma.

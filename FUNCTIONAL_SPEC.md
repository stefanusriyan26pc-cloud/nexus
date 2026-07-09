# Nexus — Functional Specification

This document describes what Nexus does from a user's perspective: every module, its fields, its views, and the non-obvious behaviors between them. For setup/deployment instructions see [README.md](README.md).

Nexus is a single-user-per-account personal productivity app covering four modules — **Tasks**, **Notes**, **Calendar**, **Finance** — plus a **Dashboard**, **Profile**, and **Settings**. All data is scoped per-user via Supabase Row Level Security; nothing is shared between accounts.

---

## 1. Authentication

- **Sign-in methods:** email/password, or Google OAuth (account picker is forced every time via `prompt: select_account`).
- **Register:** collects full name, email, password (min. 6 chars). On submit, the account is created and the user is redirected into the app shortly after — there is no separate "confirm your email" gate in the UI flow.
- **OAuth callback:** exchanges the provider's auth code for a session, then redirects to the originally requested page (default `/dashboard`). Failures redirect back to `/login` with an error flag.
- **Profile auto-creation:** a database trigger creates a `profiles` row the moment a new `auth.users` row is inserted, pulling `full_name`/`avatar_url` from whatever metadata is available (manual signup fields, or Google's `name`/`picture` claims). The app never has to manually provision a profile.

## 2. Dashboard

A single overview page, loaded from six parallel queries: open tasks, upcoming calendar events, this month's transactions, all wallets, all savings goals, and the 3 most recent notes.

**Stat cards:** Income (this month), Expenses (this month), Total Balance (sum of all wallets), Net Balance (this month, with a Surplus/Deficit sub-label), Open Tasks (+ high-priority count), Notes count. Each card links to its module.

**Below the fold:**
- Upcoming Tasks (next 5, nearest due date first, priority badge)
- Upcoming Events (next 5, color dot + start time)
- Recent Transactions (last 5, colored by income/expense)
- Savings Overview (top 4 goals by progress, mini progress bars)
- Quick Actions (shortcuts to add a transaction / task / event)

All monetary figures on the Dashboard are converted to the user's chosen display currency (see [§7 Settings](#7-settings)) using a live exchange rate.

## 3. Tasks

A task has: title, description, status (`todo` / `in_progress` / `done`), priority (`low` / `medium` / `high`), an optional due date, and a manual sort position.

Three views, switchable at the top of the page:
- **Kanban** — three fixed columns (To Do / In Progress / Done). Drag-and-drop between columns updates status only; a floating drag preview follows the cursor.
- **List** — flat, filterable list.
- **Calendar** — a mini month grid of tasks by due date.

Kanban and List share filters: status, priority, due-date bucket (overdue / due today / upcoming / no due date), and free-text search. The Calendar view has no filter bar.

Create/edit uses one shared modal (title, description, status, priority, due date); deleting is available from the edit modal. New tasks are appended to the end of their column/list.

## 4. Notes

A note has a title, rich text content, a pinned flag, and an optional **folder**.

**Views:** Grid, List, and Folders. The Folders view shows each folder as a tile (name, color, note count, preview of the newest note inside) plus an "Uncategorized" tile for notes with no folder; clicking a tile filters into that folder's notes in a grid.

**Folders are fully user-managed** (create, rename, recolor, delete) — but that management UI lives in **Settings → Configuration**, not on the Notes page itself. The Notes page only offers a folder *dropdown* when creating/editing a note. Deleting a folder does not delete its notes — they fall back to Uncategorized.

Pinned notes always sort first, then by most recently updated. Search filters by title or content within the current view.

## 5. Calendar

An event has: title, description, start time, optional end time, an all-day flag, and a color (chosen from a fixed palette).

**Three views:**
- **Calendar** (month grid) — click an empty day to create an event pre-filled for that date; click an existing event to edit it.
- **Week** — 7-day columns with a quick-add "+" per day; today is highlighted.
- **List** — chronological, upcoming-first, with a period filter (all / upcoming / past / this month) and search. This is the only view with a filter bar.

## 6. Finance

Finance covers four sub-pages under one shell: **Transactions**, **Savings**, **Wallets**, **Analytics**.

### 6.1 Wallets

A wallet represents a real account/e-wallet: name, balance, currency, color, and an optional **bank** — one of the user's entries from **Settings → Configuration → Banks** (dropdown, not free text). Wallets in a non-IDR currency are excluded from the plain "Total Balance" figure and flagged "Transfer only" (their balance can only move via wallet-to-wallet transfers, since there's no per-transaction currency conversion).

- **Edit:** name, color, and bank can be changed after creation; currency and starting balance cannot (balance moves only through transactions).
- **Layout:** cards can be viewed as one flat, drag-to-reorder grid, or grouped by bank (grouping disables drag-reorder).
- A "Fetch exchange rates" action pulls live IDR-based rates (see §6.5) to estimate a combined total across mixed currencies.

### 6.2 Transactions

The transaction form has **four types**, each producing different underlying rows:

| Type | What it does |
|---|---|
| **Income** | Adds to a wallet's balance. Category picked from user-managed income categories. |
| **Expense** | Deducts from a wallet's balance. Category picked from user-managed expense categories. |
| **Transfer** | Moves money between two of the user's own wallets — internally this creates a linked expense row (source) and income row (destination), both tagged category `Transfer`. |
| **Goals** | Contributes money toward a savings goal. Requires picking both a goal and a source wallet; deducts the wallet exactly like a transfer, and credits the goal's progress. This is the **only** way to add funds to a goal — the Savings page itself has no "add funds" control. |

Deleting any transaction reverses its effect: the wallet balance is restored, and if it was a goal contribution, the goal's progress is decremented back too.

**List view** shows a filter bar (type — including Transfer/Goals as their own filterable buckets — category, wallet, period, search) and a running Income/Expense/Net summary for the filtered set. A **Calendar view** shows the same transactions on a month grid with a per-day detail panel.

Transfer and goal-contribution rows get a distinct icon/color in the list (blue swap icon, amber piggy-bank icon respectively) so they read as different from plain income/expense at a glance.

### 6.3 Savings Goals

A goal has: name, target amount, current amount (progress), an optional deadline, a color, its own currency + exchange rate (for foreign-currency goals), and an optional **default/linked wallet**.

- Funds only move via the Transactions page's "Goals" type (see above) — there is no in-page deposit action.
- The default wallet is used to (a) pre-select a source wallet when contributing and (b) group goals by wallet in the "Group by wallet" layout toggle.
- Goals can be freely reordered (drag-and-drop) when not grouped, and edited (all fields, including the linked wallet) at any time.

### 6.4 Analytics

A read-only dashboard for the Finance module: a 0–100 "Financial Health" score (ring gauge) derived from savings rate, spending habits, and goal progress; monthly income/expenses/wallet-total/savings-rate metric cards; a top-5 expense-category breakdown; an overall savings-goal progress summary; and this month's net balance.

### 6.5 Currency

Every user has a **display currency** (Settings → Regional). All aggregate/summary monetary figures across Dashboard and Finance (income, expenses, totals, transaction amounts) are shown converted into that currency using a live exchange rate fetched from a public rate API (base IDR), cached for up to an hour and refreshed immediately whenever the display currency is changed. Figures that are inherently tied to a specific record's own currency (an individual wallet's balance, a foreign-currency goal's amounts) are shown in that record's own currency instead, unaffected by the display-currency setting.

## 7. Settings

Settings is a sub-sidebar with five sections:

1. **Regional** — display currency, UI language (English/Indonesian — the entire UI, including every label, placeholder, and empty-state message, follows this toggle with no mixed-language leftovers), and a live exchange-rate reference table.
2. **Notifications** — local, browser-only toggles for task reminders, savings milestones, and a monthly finance summary (no server-side push; preferences persist in `localStorage`).
3. **Appearance** — light/dark theme.
4. **Configuration** — the single home for everything list-like elsewhere in the app: **Banks** (used by the Wallet "bank" dropdown), **Note Folders** (used by Notes), **Income categories**, and **Expense categories** (both used by the Transactions form). Each is a tab showing an add-box plus the existing entries as chips with inline rename/delete. New users get a sensible set of default income/expense categories seeded automatically.
5. **Security** — shows account email/status and a "send password reset email" action (password changes go through Supabase's own reset-email flow, not an in-app form).

## 8. Profile

Editable: full name, location, a short bio (200-char limit), and avatar (upload/replace/remove, stored in a public Supabase Storage bucket under a per-user folder). Email and "member since" date are shown read-only.

---

## Appendix: Data Model

All tables are per-user (a `user_id` column referencing `auth.users`, enforced by Row Level Security) unless noted otherwise.

| Table | Key columns |
|---|---|
| `profiles` | `id` (= auth user), `email`, `full_name`, `avatar_url`, `bio`, `location`, `currency`, `language` |
| `tasks` | `title`, `description`, `status`, `priority`, `due_date`, `position` |
| `calendar_events` | `title`, `description`, `start_at`, `end_at`, `all_day`, `color` |
| `notes` | `title`, `content`, `is_pinned`, `folder_id` → `note_folders` (legacy `category` text column is superseded) |
| `note_folders` | `name`, `color`, `position` |
| `wallets` | `name`, `balance`, `currency`, `color`, `bank`, `position` |
| `savings_goals` | `name`, `target_amount`, `current_amount`, `deadline`, `color`, `currency`, `exchange_rate`, `default_wallet_id` → `wallets`, `position` |
| `finance_transactions` | `wallet_id` → `wallets`, `type` (`income`\|`expense`), `amount`, `category` (free text), `description`, `transaction_date`, `goal_id` → `savings_goals` |
| `transaction_categories` | `type` (`income`\|`expense`), `name`, `position` |
| `user_banks` | `name`, `position` |

Notes:
- `finance_transactions.type` only ever stores `income`/`expense` at the database level — **Transfer** and **Goals** (as seen in the UI) are both built from these two types plus a `category = 'Transfer'` tag and/or a populated `goal_id`, not a separate enum value.
- `finance_transactions.category` (free text) and `transaction_categories` (the user-managed lookup table) are not formally linked by a foreign key — the former just stores whatever category name was picked from the latter at the time.

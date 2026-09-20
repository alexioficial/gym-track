# Training Ledger Web Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the web application's generic card-dashboard presentation with the approved responsive Training Ledger interface while retaining all existing behavior.

**Architecture:** Keep every SvelteKit route, loader, API call, offline store, and form handler in place. Establish presentation tokens and responsive shell centrally, then restyle each route into shared ledger primitives. Verify behavior through existing Bun tests and Svelte checks, and verify presentation through browser inspection at desktop and 390x844.

**Tech Stack:** SvelteKit 2, Svelte 5, Tailwind CSS 4, TypeScript, Bun tests, agent-browser.

**Spec:** `docs/superpowers/specs/2026-08-21-training-ledger-web.md`

## Global Constraints

- Preserve every route, API contract, validation rule, offline behavior, authentication behavior, and admin capability.
- Preserve all pre-existing uncommitted confirmation-dialog changes.
- Do not introduce remote font dependencies; font files must be bundled locally.
- Desktop uses a left navigation rail at 960px and wider; narrower windows use a compact topbar and edge-to-edge bottom navigation.
- Structural rows use dividers instead of universal floating cards.
- Controls meet 44px minimum target size and have visible focus, hover, active, disabled, and loading states.
- No decorative gradient, generic shadow, ornamental icon, or badge may remain without a functional reason.
- Do not refactor domain/server logic solely for presentation.

---

### Task 1: Design Tokens and Responsive Application Shell

**Files:**

- Create: `static/fonts/barlow/Barlow-Regular.woff2`
- Create: `static/fonts/barlow/Barlow-Medium.woff2`
- Create: `static/fonts/barlow/Barlow-SemiBold.woff2`
- Create: `static/fonts/barlow-condensed/BarlowCondensed-SemiBold.woff2`
- Create: `static/fonts/barlow-condensed/BarlowCondensed-Bold.woff2`
- Modify: `src/routes/layout.css`
- Modify: `src/routes/+layout.svelte`
- Modify: `src/lib/components/Nav.svelte`
- Modify: `src/lib/components/PageHeader.svelte`
- Modify: `src/lib/components/EmptyState.svelte`
- Modify: `src/lib/components/ConfirmDialog.svelte`

**Interfaces:**

- Consumes: existing route state, `data.user`, `SyncIndicator`, logout handler, and `Icon` names.
- Produces: global `.ledger-section`, `.ledger-row`, `.data-value`, `.section-label`, `.field-grid`, `.app-shell`, and responsive navigation styles used by later tasks.

- [ ] **Step 1: Capture the baseline**

Run `bun run check`, `bun test`, and take authenticated screenshots at 1440x900 and 390x844 for `/`, `/routines`, `/log`, `/progress`, and `/exercises`.

- [ ] **Step 2: Bundle typography assets**

Download only the five approved WOFF2 files into `static/fonts`, then declare them with `font-display: swap` in `layout.css`. The body stack must end in platform sans fallbacks and numeric values must retain `font-variant-numeric: tabular-nums`.

- [ ] **Step 3: Replace global presentation tokens**

Implement the exact colors, 4/8/12/16/24/32 spacing rhythm, 4px control radius, 8px overlay radius, flat background, focus state, reduced-motion rule, ledger rows, compact field grids, and action states from the spec. Remove the body radial gradient and universal 18px card treatment.

- [ ] **Step 4: Build the adaptive shell**

At `min-width: 960px`, render navigation as a 208px left rail and place account/admin/logout controls at its bottom. Below 960px retain the compact header and render navigation edge-to-edge at the bottom. Keep the existing link destinations and logout/offline behavior unchanged.

- [ ] **Step 5: Simplify shared primitives**

Make `PageHeader` left-aligned and compact, make `EmptyState` an inline bordered region without a circular decorative icon, and restyle `ConfirmDialog` as the sole shadowed overlay. Retain all props and emitted behavior.

- [ ] **Step 6: Verify the shell**

Run `bun run check` and `bun test`. Start the dev server, inspect `/` at 1440x900 and 390x844, keyboard-tab through header/navigation, and confirm no content is obscured.

- [ ] **Step 7: Commit the shell**

Commit only token, font, shell, and shared primitive files with message `feat: establish training ledger web shell`.

### Task 2: Home, Routines, and Exercises Ledgers

**Files:**

- Modify: `src/routes/+page.svelte`
- Modify: `src/routes/routines/+page.svelte`
- Modify: `src/routes/exercises/+page.svelte`
- Modify: `src/lib/components/Sparkline.svelte`

**Interfaces:**

- Consumes: Task 1 global ledger classes and unchanged route data/handlers.
- Produces: compact KPI strip, schedule strip, routine color rail, and exercise ledger patterns.

- [ ] **Step 1: Restyle Home**

Keep the current-workout area as the only raised panel. Replace three counter cards with one KPI strip separated by rules. Render progress and recent sessions as divider-separated rows with aligned numeric values.

- [ ] **Step 2: Restyle Routines without changing actions**

Keep create/edit/delete/duplicate handlers and confirmation flow exactly as implemented. Convert the week card into a compact schedule strip and routine cards into flat sections with a 3px routine-color rail. Replace exercise pills with ordered exercise lines.

- [ ] **Step 3: Restyle Exercises without changing actions**

Keep create/edit/delete handlers and confirmation flow. Render the form as a raised editing region and the collection as compact rows with aligned name, muscle group, and action controls.

- [ ] **Step 4: Verify public ledgers**

Run `bun run check` and `bun test`. Inspect all three pages at 1440x900 and 390x844, including long routine names and the bottom of the exercise list.

- [ ] **Step 5: Commit public ledgers**

Commit the three routes and any shared sparkline styling with message `feat: redesign workout overview ledgers`.

### Task 3: Session Logging Flows

**Files:**

- Modify: `src/lib/components/SessionForm.svelte`
- Modify: `src/routes/log/+page.svelte`
- Modify: `src/routes/log/[id]/+page.svelte`

**Interfaces:**

- Consumes: existing JSON client, offline queue, exercise/routine data, validation and edit/delete callbacks.
- Produces: compact logging editor, consistent weight/repetition columns, reachable save action, and dense history rows.

- [ ] **Step 1: Preserve and map all form behavior**

Before styling, enumerate every handler and state branch in `SessionForm.svelte` and confirm that create, edit-last-log, repeated exercises, set editing, offline submission, errors, loading, and confirmations remain represented.

- [ ] **Step 2: Redesign the session editor**

Use a restrained segmented mode control, compact metadata field grid, and ledger exercise blocks. Align weight and repetition inputs by column, retain accessible labels, and keep delete actions visually destructive.

- [ ] **Step 3: Redesign history and edit route**

Render recent logs as divider-separated rows and make the edit route use the same editor hierarchy without duplicating visual rules.

- [ ] **Step 4: Verify logging behavior and presentation**

Run `bun run check` and `bun test`. In the browser, switch modes, add a repeated exercise, add/remove a set, trigger a confirmation, and verify focus/loading/error layouts at desktop and mobile width without submitting destructive test data.

- [ ] **Step 5: Commit logging flows**

Commit the three files with message `feat: redesign session logging workflow`.

### Task 4: Progress Ledgers and Charts

**Files:**

- Modify: `src/routes/progress/+page.svelte`
- Modify: `src/routes/progress/[exerciseId]/+page.svelte`
- Modify: `src/lib/components/ProgressChart.svelte`
- Modify: `src/lib/components/Sparkline.svelte`
- Modify: `src/lib/components/StatDelta.svelte`

**Interfaces:**

- Consumes: unchanged progression data and chart props.
- Produces: aligned previous/current comparison rows, integrated charts, concise recommendations, and semantic positive/negative values.

- [ ] **Step 1: Flatten the weekly recap**

Remove the recap gradient and per-exercise card shells. Use one section header, summary counts as text, and a ledger whose columns remain legible on desktop and wrap deliberately on mobile.

- [ ] **Step 2: Integrate charts into the hierarchy**

Remove decorative chart framing and use strong axis/data contrast. Retain all existing values, labels, and links. Use badges only for recommendations that need a compact state marker.

- [ ] **Step 3: Verify progress screens**

Run `bun run check` and `bun test`. Inspect overview and one exercise-detail route at 1440x900 and 390x844. Confirm no horizontal overflow and no illegible chart labels.

- [ ] **Step 4: Commit progress screens**

Commit route and chart files with message `feat: redesign progress as performance ledger`.

### Task 5: Login and Administration

**Files:**

- Modify: `src/routes/login/+page.svelte`
- Modify: `src/routes/admin/+page.svelte`
- Modify: `src/routes/admin/audit/+page.svelte`
- Modify: `src/routes/admin/audit/[id]/+page.svelte`

**Interfaces:**

- Consumes: existing authentication, user mutation, filter, decryption, pagination/detail, and confirmation behavior.
- Produces: compact login composition, admin user table/disclosure rows, audit filter toolbar, dense audit table, and semantic detail sections.

- [ ] **Step 1: Redesign Login**

Keep the existing JSON authentication and validation. Place the form on a simple responsive grid with a restrained yellow identity rail; remove the centered floating-card composition.

- [ ] **Step 2: Redesign Admin Users**

Keep all user/password/delete handlers and confirmation behavior. Use a table at 960px and compact disclosure rows below it. Do not expose admin in Flutter.

- [ ] **Step 3: Redesign Audit List and Detail**

Render filters as a toolbar/field group, audit entries as a real table at desktop, and compact rows on mobile. Keep sensitive data organization, filtering, decryption, and URLs unchanged.

- [ ] **Step 4: Verify authentication and admin presentation**

Run `bun run check` and `bun test`. Inspect login while logged out and all three admin views while logged in at desktop; inspect login and compact table fallbacks at 390x844. Confirm keyboard focus and long header/body wrapping.

- [ ] **Step 5: Commit login and admin**

Commit route files with message `feat: redesign authentication and admin ledgers`.

### Task 6: Full Visual Iteration and Anti-AI-Slop Pass

**Files:**

- Modify: presentation files identified by browser findings only.
- Create: `docs/superpowers/reports/2026-08-21-training-ledger-web-audit.md`

**Interfaces:**

- Consumes: Tasks 1-5 complete web presentation.
- Produces: verified responsive application and evidence-backed audit report.

- [ ] **Step 1: Run complete automated verification**

Run `bun run check`, `bun test`, `bun run lint`, and `bun run build`. Record exit codes and exact test counts in the report.

- [ ] **Step 2: Run desktop browser pass**

At 1440x900 inspect `/`, `/routines`, `/log`, `/progress`, one progress detail, `/exercises`, `/login`, `/admin`, `/admin/audit`, and one audit detail. Capture screenshots and accessibility snapshots, inspect console errors, and record findings.

- [ ] **Step 3: Run mobile browser pass**

At 390x844 inspect `/`, `/routines`, `/log`, `/progress`, one progress detail, `/exercises`, and `/login`. Scroll each page to its end and verify sticky elements do not cover content or focus.

- [ ] **Step 4: Perform explicit anti-AI-slop review**

For every screenshot ask whether any universal card, pill, gradient, generic shadow, decorative icon, oversized spacing, centered composition, or repeated component remains without a functional reason. Record each occurrence and correct it.

- [ ] **Step 5: Repeat verification after corrections**

Run `bun run check`, `bun test`, and `bun run build`, then recapture changed screens at both widths. The report must distinguish fixed issues from accepted product-specific exceptions.

- [ ] **Step 6: Commit verified web redesign**

Commit the report and final visual corrections with message `test: verify training ledger web redesign`.

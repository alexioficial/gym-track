# Training Ledger Web Redesign Specification

**Status:** Approved on 2026-08-21

## Objective

Redesign the existing SvelteKit web application so it reads as a deliberate strength-training product rather than a generic card-based SaaS interface. Preserve every route, data flow, validation, offline behavior, authentication behavior, admin capability, and pending local change. Presentation code may change widely; domain and server logic must not be refactored unless a visual integration requires a minimal adjustment.

## Visual Direction

The product will use a **Training Ledger** language: a compact digital training log built from rows, rules, aligned numeric columns, and restrained highlighted surfaces. It should feel practical during a workout and easy to scan during review.

The identity remains dark with a yellow primary accent. Routine colors, positive green, negative red, and tabular performance values remain important product signals. Decorative gradients, generic shadows, ornamental icons, floating desktop navigation, and universal rounded cards are removed.

## Design System

### Typography

- Bundle fonts locally so the offline application does not depend on a remote font service.
- Use Barlow Condensed at weights 600 and 700 for page titles, routine names, and other short display labels.
- Use Barlow at weights 400, 500, and 600 for controls and prose.
- Use tabular numerals and the existing system monospace stack for weights, repetitions, dates, durations, and request metadata.
- Desktop page titles are 32px; mobile page titles are 28px. Body text remains 15-16px.

### Color

- Background: `#0b0c0b`
- Primary surface: `#121412`
- Raised surface: `#181a18`, reserved for forms, active workout regions, popovers, and dialogs
- Strong divider: `#2a2d29`
- Soft divider: `#1e211e`
- Primary text: `#f3f1e8`
- Secondary text: `#a6a79f`
- Muted text: `#777a74`
- Accent: `#f0c400`
- Accent hover: `#ffd329`
- Positive: `#38d997`
- Negative/destructive: `#ff6969`

Yellow is reserved for the current destination, primary action, active workout information, and focus state. It must not decorate every heading.

### Geometry and Density

- Spacing scale: 4, 8, 12, 16, 24, and 32px.
- Controls use a 4px radius; dialogs and exceptional raised regions use an 8px radius.
- Structural rows and sections use dividers rather than floating cards.
- Interactive rows are at least 44px high. Inputs and primary actions are at least 44px high.
- Motion is limited to 120-180ms state transitions. Respect `prefers-reduced-motion`.
- Shadows are reserved for dialogs and overlays.

### States and Accessibility

- Every interactive control has visible hover, focus-visible, active, disabled, and loading treatment.
- Focus rings are 2px yellow and cannot be hidden beneath persistent navigation.
- Icon-only controls retain accessible names and meaningful tooltips.
- Status is never communicated by color alone.
- Mobile content includes enough bottom padding and scroll padding to remain visible above navigation.

## Responsive Shell

- At 960px and wider, use a fixed-width left navigation rail with labeled destinations, logo at the top, account/admin/logout controls at the bottom, and a main content area up to 1120px wide.
- Below 960px, use a compact sticky top bar and an edge-to-edge bottom navigation bar.
- The Log destination remains visually important but is not a detached circular floating action button.
- The desktop shell must no longer look like an enlarged mobile application.
- Admin remains web-only.

## Screen Treatment

### Home

The current workout/today region is the only prominently raised surface. Counts become a compact KPI strip separated by vertical rules. Progress and recent sessions use ledger rows with aligned values instead of individual cards.

### Routines

The week overview becomes a compact schedule strip. Each routine is a section with a narrow colored identity rail and ordered exercise rows. Exercise metadata is plain text or a concise label; it is not a cloud of pills.

### Log and Edit Log

Mode selection becomes a segmented control with restrained geometry. Session metadata is a compact form row. Exercise logging blocks use a repeatable data-entry structure with clear columns for weight and repetitions. The primary save action remains obvious and reachable. History uses dense rows.

### Progress and Exercise Detail

Weekly comparison becomes a ledger with aligned previous/current values and concise recommendation text. Badges are used only when a compact status label is genuinely useful. Charts and sparklines integrate into rows without decorative gradient panels.

### Exercises

Exercises become compact rows with name, muscle group, and actions aligned consistently. Creation/editing forms remain visually distinct from the list without nesting cards.

### Admin and Audit

Admin users and audit records use tables on wide screens and compact disclosure rows on narrow screens. Filters become a toolbar/field group rather than a floating card. Sensitive record details remain organized into semantic sections.

### Login and Empty/Error States

Login uses a compact left-aligned form on a simple grid with a restrained brand rail. Empty and error states are inline structural regions, not centered cards with circular decorative icons.

## Implementation Constraints

- Do not change API contracts, server loaders, validation rules, offline synchronization, service-worker behavior, route paths, or authentication semantics.
- Do not remove the current confirmation-dialog work or other uncommitted user changes.
- Do not add decorative content to fill space.
- Prefer semantic HTML and existing Svelte patterns.
- Add tests before new behavioral helpers. Pure CSS/presentation changes are verified with checks, builds, browser inspection, and accessibility snapshots.
- Run a complete desktop and 390px mobile visual pass before beginning Flutter work.
- Run a second pass specifically identifying remaining AI-slop patterns and correct them.

## Acceptance Criteria

- All existing automated tests, Svelte checks, and production build pass.
- Every existing route remains reachable and functional.
- Desktop navigation uses a real rail and no floating mobile panel.
- Mobile navigation does not obscure content.
- Principal lists no longer render every item as an identical rounded card.
- Unnecessary gradients, shadows, decorative icons, and pills are removed.
- Home, routines, log, progress, exercises, login, admin users, audit list, and audit detail are inspected visually at desktop width.
- Home, routines, log, progress, exercises, and login are inspected visually at 390x844.
- No newly introduced horizontal overflow, clipped focus state, or browser console error remains.

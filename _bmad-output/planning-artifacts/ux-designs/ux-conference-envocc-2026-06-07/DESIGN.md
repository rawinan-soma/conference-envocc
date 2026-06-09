---
title: "ENVOCC Conference Room Booking System — Visual Design"
status: final
created: 2026-06-07
updated: 2026-06-08
sources:
  - ../../prds/prd-conference-envocc-2026-06-07/prd.md
  - .decision-log.md
  - .working/visual-system-1.html
  - .working/color-themes-1.html
theme_name: "Forest & Copper"
colors:
  # Brand greens (UXD-005)
  green-900: "#1B4332"   # darkest — sidebar, brand mark, strongest headings
  green-700: "#2D6A4F"   # primary action / primary brand
  green-500: "#40916C"   # mid — links, active states, calendar "booked"
  green-200: "#95D5B2"   # tint — subtle fills, hover backgrounds
  green-100: "#D8F3DC"   # lightest tint — "available" slot fill, success bg
  # Copper accent (UXD-005)
  copper: "#B5651D"      # secondary accent / highlights
  copper-light: "#E8A96A"
  copper-bg: "#FDF3E7"   # warm accent surface
  # Surfaces / neutrals (UXD-005)
  cream: "#FAFAF7"       # page background
  cream-100: "#F0EDE6"   # alt surface / striped rows
  cream-200: "#E8E3DA"   # deeper surface / disabled fill
  card: "#FFFFFF"        # card / panel surface
  border: "#E0DBD3"      # hairline borders, dividers
  # Text (UXD-005)
  ink: "#1C1C1C"         # primary text
  ink-2: "#5A5A5A"       # secondary text
  ink-3: "#9A9A9A"       # tertiary / placeholder / disabled text
  # Semantic status (derived; verify contrast at AA)
  success: "#2D6A4F"
  success-bg: "#D8F3DC"
  warning: "#B5651D"
  warning-bg: "#FDF3E7"
  danger: "#B3261E"
  danger-bg: "#FBEAE9"
typography:
  source: "Google Fonts CDN"
  heading: "Noto Serif Thai"   # headings, brand, display (UXD-007)
  body: "Noto Sans Thai"       # body, UI, labels, data (UXD-007)
  scale:                       # px; derived from prototype/visual-system-1.html (UXD-008: do not go below 14)
    display: 32
    h1: 28
    h2: 22
    h3: 18
    body: 16
    small: 14                  # hard floor for Thai (UXD-008)
  line-height:
    thai-body: 1.65            # generous for stacked vowel/tone marks (UXD-008)
    thai-tight: 1.5            # minimum even for dense rows/badges
    latin-body: 1.5
  weights:
    regular: 400
    medium: 500
    semibold: 600
    bold: 700
rounded:
  sm: 6
  md: 10
  lg: 16
  xl: 20
spacing:
  base: 8                      # 8px scale (UXD-012)
  scale: [4, 8, 16, 24, 32, 48, 64]
elevation:                     # 3-tier green-tinted shadows (UXD-012); verify exact values vs visual-system-1.html
  shadow-1: "0 1px 2px rgba(27,67,50,0.06)"    # subtle — inputs, hairline lift
  shadow-2: "0 2px 8px rgba(27,67,50,0.08)"    # card / booking card
  shadow-3: "0 8px 24px rgba(27,67,50,0.12)"   # modal / popover / elevated
components:
  - button
  - form-field
  - select
  - toggle-switch
  - read-only-field
  - status-badge
  - calendar-slot
  - booking-card
  - modal
  - admin-sidebar
  - heatmap-cell
  - toast
  - skeleton
  - empty-state
accessibility:
  target: "WCAG 2.1 AA"        # UXD-022
---

# DESIGN.md — Visual Identity

The visual contract for the ENVOCC Conference Room Booking System. Framework-agnostic
(pure semantic tokens — no component library named; that's an architecture-phase choice,
UXD-011). All example copy is **English placeholder**; production UI is Thai and Rawinan
translates manually (UXD-004).

---

## 1. Theme — "Forest & Copper"

A forest-green identity with a warm copper accent. Green signals an environmental &
occupational-health organization; copper adds warmth so the tool reads as polished, not
clinical. Locked in UXD-005.

See the frontmatter `colors` map for the canonical hex values and their semantic roles.

**Usage rules**
- **Primary actions** use `green-700`; hover/active deepen toward `green-900`.
- **Copper is an accent, not a primary** — use sparingly for highlights, the brand mark,
  and to draw the eye to one thing per view. Never compete copper against green for the
  same call to action.
- **Page background** is `cream`; cards/panels are `card` (#FFFFFF) lifted with `shadow-2`.
- **Borders** are always the single `border` hairline (#E0DBD3) — no heavy strokes.
- **Status** colors (success/warning/danger) reuse the brand where possible
  (success = green) so the palette stays cohesive.

---

## 2. Typography

Single **Noto** superfamily across Thai + Latin so metrics and rhythm stay consistent
(UXD-007).

- **Headings / brand / display:** Noto Serif Thai
- **Body / UI / labels / data:** Noto Sans Thai
- Loaded from the Google Fonts CDN.

**Thai-specific rules (UXD-008) — non-negotiable:**
- Body line-height **≥ 1.65**; never tighter than 1.5 even in dense tables or badges.
  Thai stacks vowel + tone marks above and below the baseline and will clip without it.
- **Never set Thai below 14px.** `small` (14px) is the hard floor.
- Keep type sizes at prototype values or slightly larger; do not shrink to fit.

See frontmatter `typography.scale` for the size ramp.

---

## 3. Spacing, radius, elevation

- **Spacing:** 8px base scale — `4, 8, 16, 24, 32, 48, 64` (UXD-012). 4px is a half-step
  for tight interior padding only.
- **Radius:** `sm 6` (inputs, badges) · `md 10` (buttons, cards) · `lg 16` (panels,
  modals) · `xl 20` (large feature cards / hero blocks).
- **Elevation:** three green-tinted shadow tiers (frontmatter `elevation`). Tint is part
  of the brand — shadows are green-cast, never neutral grey.

---

## 4. Component styles

Token-level intent only; markup/library is decided in architecture (UXD-011).

| Component | Spec |
|---|---|
| **Button — primary** | `green-700` fill, white text, radius `md`, `shadow-1`; hover → `green-900`; disabled → `cream-200` fill + `ink-3` text. Has a **loading state** (spinner in-button, disabled) for submits. |
| **Button — secondary** | `card` fill, `border` stroke, `ink` text; hover → `cream-100`. |
| **Button — ghost / copper** | Text-only or `copper` accent for low-emphasis or highlight actions. |
| **Form field** | `card` fill, `border` stroke, radius `sm`; focus → `green-500` ring (visible, ≥2px); **label always visible above** (never placeholder-only); error → `danger` border + message below. |
| **Select** | Same shell as form field; used for Title and Meal-type pickers. |
| **Toggle switch** | On = `green-700`; off = `ink-3`/`cream-200`. Used for the catering toggle and registration enable. |
| **Read-only field** | `cream-100` fill, `ink-2` text, no border emphasis, not focusable as input — used for the auto-filled **event contact** (organizer name + phone) on the booking form (FR-095). Visibly distinct from editable fields. |
| **Status badge** | Pill, radius `sm`. Registered = `green-100`/`green-700`; Attended = `green-700`/white; Cancelled = `cream-200`/`ink-2`. Carries a **text label**, never color-only. |
| **Calendar slot** | Available = `green-100` fill (no time label — time is set in the form, UXD-013); Booked = `green-500`; Blocked = hatched/`cream-200` with a label. Distinguished by label/pattern as well as color (a11y). |
| **Booking card** | `card` surface, `shadow-2`, radius `md`; shows event name, room, date/time, registrant count, catering summary, copy-link action. |
| **Modal** | `card`, radius `lg`, `shadow-3`, green header band. Used for the destructive **deactivate-room confirmation** (lists affected bookings, UXD-019). |
| **Admin sidebar** | `green-900` background, light text; active item highlighted. Internal app shell only. |
| **Heatmap cell** | 6-step intensity ramp `u0–u5` from `cream`/`green-100` up to `green-900`; raw booking count per room per month (FR-070). No hover tooltip in MVP. |
| **Toast** | Transient confirmation (e.g., "Link copied"), top-right, auto-dismiss. |
| **Skeleton** | Grey-green shimmer blocks shaped like content; the loading pattern for calendar, lists, dashboard (UXD-020). |
| **Empty state** | One calm line + a single primary action; no large illustration (UXD-020). |

---

## 5. Accessibility floor (WCAG 2.1 AA — UXD-022)

- Text contrast **≥ 4.5:1**. Verify at build: **copper (#B5651D) on cream**, and
  **green-500 (#40916C) on white** — if either falls short for body text, darken toward
  `copper`/`green-700` or reserve the lighter shade for large text only.
- **Visible focus rings** on every interactive element (keyboard navigation).
- **Labels always visible** — never placeholder-only.
- **No color-alone meaning** — calendar states, status badges, and heatmap cells all
  carry a label or pattern in addition to hue.
- **Tap targets ≥ 44×44px** on the responsive registration pages and mobile booking flow.
- Thai line-height ≥ 1.65, never below 14px (carries over from §2 / UXD-008).

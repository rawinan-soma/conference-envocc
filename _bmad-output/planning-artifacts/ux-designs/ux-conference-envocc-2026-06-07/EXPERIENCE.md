---
title: "ENVOCC Conference Room Booking System — Experience Spec"
status: final
created: 2026-06-07
updated: 2026-06-09
sources:
  - ../../prds/prd-conference-envocc-2026-06-07/prd.md
  - DESIGN.md
  - .decision-log.md
---

# EXPERIENCE.md — Information Architecture, Behavior & Flows

The behavior contract for the ENVOCC Conference Room Booking System. Pairs with
**DESIGN.md** (visual contract). Both derive from the PRD, which remains the source of
truth for *capabilities* — this document specifies *how* those capabilities look and
behave. All copy is **English placeholder**; production UI is Thai, translated by Rawinan
(UXD-004).

---

## 1. Information Architecture — screen map

Ten surfaces, in two zones. **No new role:** every internal user can act as both
**organizer** (when they book) and **attendee** (when they register for someone else's
event) — same account, two capacities (UXD-026).

**Internal app (authenticated — org IdP, FR-090).** Shell with the `admin-sidebar`
pattern for admins; organizers get a simpler top-level nav.

1. **Room Calendar** — **week scheduler**: **rooms on the Y axis (rows) × days on the X axis (columns)**; all rooms visible across the week (UXD-024/025). Each booking chip shows its **booked time** + event; an available day is an empty, clickable cell (no pre-set time — UXD-013). No day view. Clicking a **booking chip** opens the **Event Detail** view (#2).
2. **Event Detail (internal)** — read-only event info (name, date, time, room, agenda, contact). For any internal user — **including the owning organizer** (FR-105) — it offers **"Register to attend"**: identity (name, organization, email) **prefilled read-only** from their profile; **meal type is the only input**, shown only when catering is enabled — often a single confirm tap (UXD-026). Self-cancel from the same view. *(Backed by PRD FR-100–105; cross-organizer view enabled by FR-094 / DEC-025, prefill fields by FR-095 / DEC-027.)*
3. **Booking Form** — single unified booking + registration setup.
4. **Organizer Dashboard** — the organizer's own upcoming bookings.
5. **Admin · Room Management** — add/edit/deactivate rooms, block slots.
6. **Admin · Analytics** — utilization heatmap, bulk calendar, CSV export.
7. **Admin · System Settings** — SMTP config + role assignment.
8. **Login** — org identity provider.

**Public (unauthenticated, token link, fully responsive — UXD-009).**

9. **External Registration** — branded event page + registration form.
10. **Registration Confirmed / Self-Cancel** — success state + cancel-via-link.

**Two registration experiences, deliberately distinct (UXD-026):** external guests use the
**public token page** (#9, anonymous, full form, FR-045 intact); internal users use the
**in-app Event Detail** (#2, prefilled, meal-only). Internal confirmation is an in-app
toast/inline state (§3) — *not* the branded public confirmation screen (#10).

**Role boundaries (FR-094):** organizers can **manage** only their own bookings; admins
have read access to everything and **no booking-approval authority** — the single exception
is the automatic cancellation triggered by deactivating a room (FR-063 / DEC-022). Per
**FR-094 (PRD DEC-025)**, an internal user may **view** (read-only) another organizer's event
— event details only, not its registrant data — to register to attend; edit/manage stays own-only.

---

## 2. Key flows

### Flow 1 — Organizer creates a booking + registration *(protagonist: Anong)*

1. Opens the **Room Calendar** — a week scheduler with **rooms as rows, days as columns**
   (UXD-025) — scans all rooms for the week, and clicks an **open day cell** for the room she
   wants. Booked chips show their time; an open cell has no pre-set time — she sets it in the
   form (UXD-013). The calendar is a week schedule, not a day view (UXD-024).
2. **Booking Form** (single unified form, FR-010): room, event name, date, start/end
   time, agenda (optional), **catering toggle** (on/off only — no meal types here,
   UXD-014), registration settings. The **event contact** (her name + phone) appears
   **pre-filled and read-only** (FR-095 / UXD-016). No headcount, no capacity field.
3. Submits → conflict check (FR-004/011) → confirmation screen with the generated
   **registration link** + QR (FR-012/038); confirmation email to her (FR-013).
4. **Climax:** one form replaced the old two-app shuffle — booking and registration set
   up in a single pass.
5. Manages everything from the **Organizer Dashboard** (FR-050–053): registrant count,
   catering summary (aggregated from registrant meal choices), copy link, sign-in PDF.

### Flow 2 — External attendee registers *(protagonist: Pranee)*

1. Taps the link on phone or laptop (responsive). Lands on the **branded registration
   page**: org logo, event name, date, time, room, agenda, and the **contact name +
   phone** for inquiries (FR-040 / UXD-016).
2. Fills the form: **Title** (Mr/Mrs/Ms/Other → free text, UXD-017) → first name, last
   name, organization, email → **meal type** (Normal/Vegetarian/Muslim/Other → free
   text) shown **only when catering is enabled** (FR-041a / UXD-015). **No capacity bar**
   (registration is uncapped, FR-032).
3. Submits → **climax:** instant on-screen confirmation **and** a confirmation email from
   a clearly **ENVOCC**-branded sender (FR-083), carrying a **self-cancel link** (FR-043).
4. If she can't attend, she clicks that link → cancels in one tap, no login (FR-044).
5. **Edge:** registration closed (date passed or manually closed) → the page shows a
   clear "registration closed" message instead of the form (FR-046).
6. Target: complete in **≤ 2 minutes** (DEC-011) — Title and Meal type are quick pickers.

### Flow 3 — Admin caretakes rooms & reads utilization *(protagonist: Wirote)*

1. **Room Management:** add/edit rooms (name, floor, capacity, optional photo, features);
   block slots; deactivate rooms.
   - **Deactivating a room with future bookings** opens a **confirmation modal** listing
     the affected bookings, warning they'll be **auto-cancelled and notified** before
     proceeding (FR-063 / DEC-022 / UXD-019). Rooms with no future bookings deactivate
     without the warning.
2. **Analytics:** **climax** — the raw-count **utilization heatmap** (room × month) is
   readable at a glance (≤ 30s target). Plus bulk calendar and CSV export. No hover
   tooltips in MVP.
3. **Settings:** SMTP config + role assignment only. Session timeout is a fixed 30-min
   default, not shown here (FR-093 / DEC-021 / UXD-018).

### Flow 4 — Internal staff registers to attend a colleague's event *(protagonist: Decha)*

Decha is himself an organizer, but today he just wants to **attend** a seminar a colleague
booked — same account, attendee capacity (UXD-026).

1. Opens the **Room Calendar**, spots the seminar's booking chip, clicks it → **Event
   Detail** (read-only: name, date, time, room, agenda, contact).
2. Taps **"Register to attend."** His **name, organization, email appear prefilled and
   read-only** — pulled from his profile, no typing (PRD FR-101 / FR-095).
3. The **only** field is **meal type**, and only because catering is on; with no catering
   it's a single confirm tap. No title/name/org/email form — none of Flow 2's fields.
4. **Climax:** there's nothing to fill in — the app already knew him. One tap (plus meal)
   and he's on the list, in seconds, not the ≤2-min external target.
5. An **in-app toast** confirms ("You're registered"). If plans change, he **self-cancels
   from the same Event Detail** — no token link, no separate confirmation page.

---

## 3. State patterns (UXD-020)

| State | Behavior |
|---|---|
| **Empty** | One calm line + a single primary action (e.g., empty dashboard → "No bookings yet" + **Create booking**). No large illustrations. |
| **Loading** | **Skeleton placeholders** for calendar, lists, and dashboard. Submit buttons enter a loading + disabled state. |
| **Error — form** | Inline, field-level: red border + message under the field; page stays put; focus jumps to the first error. |
| **Error — system** | Page-level banner (e.g., "Couldn't load the calendar") with a **Retry** action. |
| **Success** | Toast for transient actions ("Link copied"); full success screen for the registration submit (Flow 2 climax). |
| **Destructive confirm** | Modal listing consequences before proceeding (room deactivation). |

---

## 4. Voice & tone (UXD-021)

**Two registers**, both warm-professional, plain language, second person, blame-free:

- **Public (registration pages)** — warmer, welcoming; the reader is an external guest who
  may not know ENVOCC. Builds trust.
- **Internal (organizer/admin)** — crisper, more efficient; the reader uses the tool daily.

Errors are **actionable, never accusatory** — "Please choose a meal type," not "Invalid
input." All copy authored in **English placeholder**; Rawinan translates to Thai (UXD-004).

---

## 5. Responsiveness (UXD-009 / NFR-004)

- **External Registration + Confirmation** — full responsive, mobile **and** desktop equal
  priority. Single-column on mobile; tap targets ≥ 44px.
- **Organizer booking flow** — usable on a smartphone browser (no horizontal scroll/zoom).
- Admin analytics is desktop-first (dense data) but must not break on tablet.

---

## 6. Accessibility & i18n

- **WCAG 2.1 AA** floor — see DESIGN.md §5 (contrast, focus rings, visible labels, no
  color-alone meaning, tap targets).
- **Thai typography** — line-height ≥ 1.65, never below 14px (UXD-008); affects dense
  tables, badges, and the registrant list.
- **i18n** — production language is Thai; every string is translatable; no Thai text is
  authored in these artifacts or mocks (UXD-004).

---
marp: true
theme: default
paginate: true
backgroundColor: #ffffff
color: #1f2933
header: 'ENVOCC Conference Room Booking System'
footer: 'Product Overview · 2026'
style: |
  :root {
    --teal: #0f766e;
    --teal-dark: #134e4a;
    --slate: #1f2933;
    --amber: #d97706;
    --muted: #64748b;
    --soft: #f0fdfa;
  }
  section {
    font-family: 'Segoe UI', 'Helvetica Neue', sans-serif;
    padding: 56px 72px;
    font-size: 25px;
    justify-content: flex-start;
    line-height: 1.45;
  }
  header { color: var(--muted); font-size: 14px; }
  footer { color: var(--muted); font-size: 13px; }
  h1 {
    color: var(--teal-dark);
    font-size: 1.7em;
    margin: 0 0 14px;
  }
  h2 {
    color: var(--teal);
    font-size: 1.15em;
    margin: 6px 0 10px;
  }
  h3 { color: var(--muted); font-size: 0.85em; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; margin: 4px 0; }
  strong { color: var(--teal-dark); }
  em { color: var(--amber); font-style: normal; font-weight: 600; }
  p { margin: 8px 0; }
  ul, ol { margin: 6px 0; padding-left: 26px; }
  li { margin: 7px 0; }
  a { color: var(--teal); }
  table { width: 100%; border-collapse: collapse; font-size: 0.8em; margin: 10px 0; }
  th { background: var(--teal); color: #fff; padding: 9px 14px; text-align: left; }
  td { padding: 8px 14px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) { background: var(--soft); }
  blockquote {
    border-left: 5px solid var(--amber);
    background: #fffbeb;
    margin: 14px 0;
    padding: 12px 20px;
    font-size: 1.05em;
    color: var(--slate);
  }
  /* Lead / section dividers */
  section.lead { justify-content: center; }
  section.lead h1 { font-size: 2.3em; border: none; }
  section.lead h2 { color: var(--muted); font-weight: 400; }
  section.cover {
    background: linear-gradient(135deg, var(--teal-dark) 0%, var(--teal) 100%);
    color: #f0fdfa;
    justify-content: center;
  }
  section.cover h1 { color: #ffffff; font-size: 2.6em; margin-bottom: 8px; }
  section.cover h2 { color: #99f6e4; font-weight: 400; font-size: 1.1em; }
  section.cover h3 { color: #5eead4; }
  section.cover::after { color: #5eead4; }
  section.divider {
    background: var(--slate);
    color: #e2e8f0;
    justify-content: center;
  }
  section.divider h1 { color: #fff; font-size: 2.1em; }
  section.divider h2 { color: var(--amber); font-weight: 600; }
  section.divider::after { color: #64748b; }
  /* Pillar grid via columns */
  .cols { display: flex; gap: 36px; }
  .cols > div { flex: 1; }
  .pill {
    display: inline-block; background: var(--soft); color: var(--teal-dark);
    border: 1px solid #99f6e4; border-radius: 999px;
    padding: 3px 14px; font-size: 0.7em; font-weight: 600; margin: 2px 4px 2px 0;
  }
  .big { font-size: 2.4em; color: var(--teal-dark); font-weight: 700; line-height: 1; }
  .label { color: var(--muted); font-size: 0.8em; }
---

<!-- _class: cover -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# ENVOCC Conference Room Booking System

## One secure platform for booking rooms and running event registration

### Product Overview · 2026

---

<!-- _class: divider -->

# Today's reality

## Two apps, a Google Form, and a security liability

---

# The problem

ENVOCC runs events on **fragmented, unsupported tooling**:

- **Two separate apps** — one to book a room, one to register attendees
- **External attendees have no real channel** — they depend on organizers manually sharing Google Form links
- **No live visibility** — utilization and registrant data live in disconnected silos
- The current stack runs on **unsupported frameworks with active, unpatchable vulnerabilities**

> Every event today is stitched together by hand — and the foundation underneath it can't be safely patched.

---

# What it costs

| Pain today | Consequence |
|------------|-------------|
| Switching between booking app + registration form | Slow, error-prone event setup |
| Manual link sharing with external attendees | Unprofessional, missed registrations |
| No conflict enforcement | Risk of double-booked rooms |
| Data scattered across tools | No real-time utilization insight |
| Unsupported, vulnerable frameworks | Standing security risk, no safe path forward |

---

<!-- _class: divider -->

# The answer

## One unified, secure replacement — booking **and** registration in a single workflow

---

# The solution

A single, branded, secure system that:

- **Unifies booking + registration** into one organizer workflow — no app-switching
- Gives external attendees a **professional self-service registration channel**
- Gives admins **real-time visibility** into room utilization and registrant data
- Runs on a **modern, maintainable, secure foundation** — *no known critical vulnerabilities at launch*
- **Fully replaces** the old two-app system — not a patch, a clean break

---

# Who it's for

### Three audiences, one system

| Role | What they do |
|------|--------------|
| **Internal staff** | Every account is *both* an **organizer** (create & run events) and an **attendee** (register for others' events) — no assignment needed |
| **Admin** | Elevated permission: manages rooms & settings, sees everything — but has **no approval authority** over bookings |
| **External registrant** | Self-registers via a unique per-event link — *no account, no login* |

---

<!-- _class: divider -->

# What it does

## Six capability pillars

---

# Capability pillars

<div class="cols">
<div>

### 🗓️ Unified Booking
One form: room, date, time, agenda, catering & registration settings.

### 🔒 Conflict-Free
Database-enforced conflict detection — *0 double-bookings, guaranteed.*

### 🎟️ Self-Service Registration
Branded public page + QR code. Attendees register in *under 2 minutes.*

</div>
<div>

### 🍱 Catering & Headcount
Registrants pick their own meal type; counts aggregate automatically.

### 📊 Admin Analytics
Utilization heatmap, bulk calendar, CSV export, full audit log.

### 🛡️ Secure by Design
OIDC sign-in, role-based access, SMTP-only email, WCAG 2.1 AA.

</div>
</div>

---

# Organizer journey

### From "I need a room" to "attendees are registering" — in one flow

1. **Find** a free room on the availability calendar
2. **Book** it in a single unified form — conflict-checked on submit
3. **Get** a shareable registration link + downloadable **QR code**
4. **Share** the link; watch registrants and meal counts roll in live
5. **Manage** — edit, cancel, or duplicate; download the sign-in sheet PDF

> One workflow. No app-switching. No Google Form.

---

# External registrant journey

### Frictionless, branded, no account

1. Open the organizer's **unique event link** — works on mobile *and* desktop
2. See a **branded page**: logo, event details, organizer contact
3. Fill **five fields** (+ meal type if catering is on)
4. Submit → **instant confirmation email** with a self-cancel link
5. Lost the email? **Re-request it** from the same page

<span class="pill">No login</span> <span class="pill">≤ 2 minutes</span> <span class="pill">Mobile + desktop equal priority</span> <span class="pill">Self-cancel</span>

---

# What "good" looks like

<div class="cols">
<div>

<span class="big">0</span>
<p class="label">double-booking incidents — conflict detection blocks 100%</p>

<span class="big">≥ 90%</span>
<p class="label">external registration completion rate</p>

</div>
<div>

<span class="big">≤ 2 min</span>
<p class="label">to complete an external registration</p>

<span class="big">≤ 30 s</span>
<p class="label">for an admin to read the utilization heatmap</p>

</div>
</div>

> Target: **≥ 80%** of organizers complete the full booking flow with no assistance.

---

# Built to last

### A modern, secure, maintainable foundation

- **SvelteKit + Bun** — fast, modern full-stack runtime
- **PostgreSQL + Drizzle** — with database-level booking-conflict enforcement
- **Authentik OIDC** sign-in · role-based access control · 30-min session timeout
- **Self-hosted SMTP only** — no third-party email services; org-branded sender
- **Thai-first UI** · **WCAG 2.1 AA** accessibility · full audit logging

> Security and accessibility are ratcheted in from page one — not bolted on later.

---

# How we're building it

### Seven epics, no forward dependencies — each consumes proven foundations

| # | Epic | Delivers |
|---|------|----------|
| 1 | Foundation & Walking Skeleton | Themed, Thai-capable shell; conflict mechanism proven end-to-end ✅ |
| 2 | Identity & Access | OIDC sign-in, profiles, roles & ownership guards |
| 3 | Room Inventory | Admin room CRUD, features, photos, blocked slots |
| 4 | Booking & Organizer Workspace | Conflict-free booking, calendar, dashboard, QR |
| 5 | External Registration & Headcount | Branded public registration — *the shippable headline* |
| 6 | Registration Ops & Attendance | Sign-in sheets, reminders, internal register-to-attend |
| 7 | Admin: Operations & Analytics | Heatmap, bulk calendar, CSV, audit view, settings |

---

# Where we draw the line

<div class="cols">
<div>

## In scope (MVP)
- Unified booking + registration
- 100%-accurate conflict detection
- Branded self-service + internal registration
- Catering headcounts & sign-in sheets
- Admin analytics, audit, room management

</div>
<div>

## Deferred (post-MVP)
- Waitlist with auto-notify
- Reusable event templates
- Calendar filtering by features
- Heatmap hover tooltips & filters
- Post-event feedback forms
- Invite-only registration

</div>
</div>

---

<!-- _class: lead -->

# From two fragile apps → **one secure platform**

## Booking and registration, unified — built to be safe, fast, and Thai-first.

### ENVOCC Conference Room Booking System

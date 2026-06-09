# Design Thinking Session: conference-envocc

**Date:** 2026-06-04
**Facilitator:** Rawinan
**Design Challenge:** Conference Room Booking System

---

## 🎯 Design Challenge

### Design Challenge

Our organization needs a new, unified conference room booking system that serves internal users, admins, and external users — replacing a fragmented two-application process and closing the gap for external users who currently have no booking channel at all.

### Challenge Statement

**Internal users** are slowed down by having to navigate two separate applications — one for booking and one for registration via Google Form — creating unnecessary friction in an everyday task.

**Admins** need a single place to manage room availability and registrants without stitching together data from multiple tools; they have no approval role, only operational management.

**External users** have no dedicated, accessible channel to register or book rooms, leaving them dependent on manual workarounds.

**The existing system** is built on outdated, unsupported frameworks and carries active security vulnerabilities — making a full replacement (not a patch) both urgent and necessary.

**Constraints:**
- For-organization use only (not public-facing SaaS)
- Communication via dedicated SMTP mail server
- No third-party calendar integration required
- Full system replacement required; the old system cannot be patched or extended safely

**Success definition:** All three user groups are satisfied — internal users book quickly in one place, admins manage rooms and registrants efficiently, external users have a clear easy registration channel, and the new system is built on a secure, maintainable foundation.

---

## 👥 EMPATHIZE: Understanding Users

### User Insights

**Internal User (Meeting Organizer)**
- Frustrated by slow loading and confusing UI in the current booking app
- Must use two separate tools to accomplish one task: book a room AND set up registration via Google Form
- As the organizer, they are responsible for both securing the space and managing attendees — but the tools force them to work in two disconnected places
- Manually bridges the gap between the booking system and registration data

**Admin**
- This is a net-new role — the old system had no admin function
- No legacy pain points, but also no established workflow; everything must be designed from scratch
- Needs to manage room availability and oversee registrant data operationally

**External User (Meeting Attendee)**
- Currently registers via a generic Google Form shared by the organizer
- Has no dedicated, professional channel to interact with the organization's booking system
- Experience feels informal and lacks trust signals — no branded confirmation, no clear process

### Key Observations

- The internal user and the meeting organizer are the same person — their core need is to **centralize booking and registration in one workflow**
- The Google Form workaround for external registration is a symptom of a missing feature, not a solution
- Admin is a greenfield opportunity — no legacy behavior to unlearn, but must be designed carefully from the start
- Slow loading and confusing UI are likely symptoms of the outdated, insecure underlying system — not just cosmetic issues
- External users currently depend entirely on the organizer to bridge the gap — there is no self-service channel

### Empathy Map Summary

**Internal User (Organizer)**
- *Says:* "Why do I have to go to two places to do one thing?"
- *Thinks:* "I hope I don't forget to send the registration form link again"
- *Does:* Switches between apps, manually copies or shares links, manages attendee data separately
- *Feels:* Frustrated, slowed down, and embarrassed when the disjointed process is visible to external attendees

**Admin**
- *Says:* [New role — no legacy voice yet]
- *Thinks:* "I need a clear overview of what rooms are booked and who is registered"
- *Does:* Will manage room availability and registrant data operationally
- *Feels:* Neutral currently — a clean slate and an opportunity to get it right

**External User**
- *Says:* "Where exactly do I register for this meeting?"
- *Thinks:* "Is a Google Form really how a professional organization handles this?"
- *Does:* Fills a generic form, waits passively for confirmation
- *Feels:* Uncertain, underserved, and disconnected from a trustworthy process

---

## 🎨 DEFINE: Frame the Problem

### Point of View Statements

**Internal User (Organizer)**
> A meeting organizer needs to book a room, manage attendee registration, handle lunch sets, and send confirmations and reminders — all in one place — because today's two-app process creates fragmentation that slows them down and risks logistics falling through the cracks.

**Admin**
> An admin needs a centralized dashboard to manage room availability and view room utilization reports — because the old system had no admin function, leaving this work entirely unstructured.

**External User**
> An external attendee needs a professional, branded self-service registration channel — because the current Google Form workaround lacks trust signals, confirmation clarity, and any real connection to the booking system.

### How Might We Questions

**Organizer Experience**
- HMW make room booking and attendee registration a single, continuous workflow?
- HMW let organizers manage lunch sets directly within the booking flow without switching tools?
- HMW automate booking confirmations and reminders via SMTP so organizers don't follow up manually?
- HMW make sign-in sheet export instant and print-ready from within the system?

**External User Experience**
- HMW give external attendees a professional, branded registration page that builds trust?
- HMW make per-event registration simple enough to complete in under 2 minutes?
- HMW automatically send a confirmation email to external registrants the moment they sign up?

**Admin Experience**
- HMW give admins a clear, real-time view of room utilization across the organization?
- HMW make room management so transparent that double-bookings are prevented before they happen?

**System-Wide**
- HMW replace the outdated system with a secure, maintainable foundation without disrupting ongoing operations?
- HMW unify three disconnected touchpoints (booking, registration, catering) into one coherent experience?

### Key Insights

1. **The organizer is the system's hub** — they connect rooms, attendees, catering, and communications. Every feature should reduce their coordination burden.
2. **SMTP is the connective tissue** — confirmations, reminders, and sign-in sheets all flow through it; it must be reliable and well-integrated.
3. **External registration is lightweight by design** — per-event, no accounts, just first name, last name, and organization. Complexity should be minimal.
4. **Lunch/catering management is a hidden scope item** — it ties the booking directly to event logistics and needs to be part of the organizer's workflow.
5. **Admin needs visibility, not control** — room utilization reporting is the priority; no approval workflows required.
6. **The old system's security risk makes speed important** — this is a replacement, not an enhancement; the new system needs to be production-ready.

---

## 💡 IDEATE: Generate Solutions

### Selected Methods

| Method | Rationale |
|--------|-----------|
| Brainstorming | Wide spread of ideas across all three user groups |
| SCAMPER Design | Forces examination of the existing system through 7 lenses — ideal for a replacement project |
| Analogous Inspiration | Borrowed patterns from hotel booking, event ticketing, and restaurant reservation systems |

### Generated Ideas

**Organizer Workflow**
1. Single booking form that unlocks a registration link automatically upon confirmation
2. Drag-and-drop room calendar view to book by clicking an available slot
3. Lunch set selection built into the booking form as a step (not a separate tool)
4. Auto-generated sign-in sheet PDF downloadable from the booking dashboard
5. Scheduled reminder emails (1 week, 1 day, 1 hour before) configured at booking time
6. Organizer dashboard showing all upcoming bookings, registrant counts, and lunch orders in one view
7. Duplicate a past booking with one click to reuse settings for recurring meetings
8. Booking confirmation auto-sent to organizer via SMTP immediately on submission
9. QR code generated per event for external users to register on-site

**External User Registration**
10. Branded registration page per event (meeting name, date, room, agenda)
11. Simple 3-field form: first name, last name, organization — nothing more
12. Instant confirmation email to external registrant upon submission
13. Registration link with expiry (closes after set date or when capacity is reached)
14. Registrant can cancel their own registration via link in confirmation email
15. Admin-visible registrant list with attendance status (registered / attended / cancelled)

**Admin**
16. Room utilization dashboard — bookings per room per month, peak hours heatmap
17. Room management panel — add/edit/deactivate rooms, set capacity, upload room photo
18. Exportable utilization report (CSV/PDF) for management reporting
19. Conflict detection — system blocks double-bookings before they happen
20. Bulk view of all bookings across all rooms on a single calendar

**System & Security**
21. Role-based access control — organizer, admin, external registrant as distinct permission levels
22. SMTP configuration panel for admin to manage mail server settings
23. Audit log of all bookings, cancellations, and changes
24. Session timeout and secure authentication for internal users
25. Mobile-responsive design so organizers can book from phone

**Wild Cards**
26. Waitlist feature — auto-notified if a slot opens
27. Meeting template library — reusable event setups (room + lunch + attendee config)
28. Room feature tags — filter by projector, whiteboard, video conferencing, capacity
29. Organizer can set registration as open or invite-only
30. Post-event feedback form auto-sent to registrants after the meeting

### Top Concepts

**Concept 1 — Unified Organizer Hub**
One booking flow that encompasses room selection, lunch set management, registration setup, and automated SMTP communications (confirmation + reminders + sign-in sheet export). The organizer never leaves the application.

**Concept 2 — Branded Per-Event Registration Page**
A professional, self-service registration page generated per booking — simple 3-field form, instant email confirmation, capacity control, and self-cancellation link. Replaces the Google Form entirely.

**Concept 3 — Admin Room & Utilization Dashboard**
A clean operational panel for room management (add/edit/deactivate, capacity, features) and utilization reporting (heatmap, monthly view, exportable reports). Conflict detection built in.

---

## 🛠️ PROTOTYPE: Make Ideas Tangible

### Prototype Approach

**Files:** `_bmad-output/prototype/` — open `index.html` in a browser to start

**Method:** HTML Static Prototype (Wizard of Oz style)
- Static HTML/CSS pages simulating key screens — no backend required
- Linked together to simulate real user flows
- Fast to build, runs in any browser, realistic enough for genuine user feedback

**Scope:** One prototype per user group covering the riskiest assumption for each concept.

### Prototype Description

**Screen 1 — Room Calendar View (Organizer)**
Browse available rooms by date, see availability at a glance, click a slot to begin booking.

**Screen 2 — Booking Form (Organizer)**
Single unified form: room details, event name/date/time, lunch set selection, registration toggle (on/off), max capacity.

**Screen 3 — Organizer Dashboard**
List of upcoming bookings with registrant count, lunch order summary, sign-in sheet download button, and registration link copy button.

**Screen 4 — External Registration Page**
Branded per-event page showing event name, date, room, and a 3-field registration form (first name, last name, organization). Submit triggers a confirmation screen.

**Screen 5 — Admin Dashboard**
Room list with status and capacity, plus a utilization heatmap showing bookings per room per month.

### Key Features to Test

| Feature | Assumption Being Tested |
|---------|------------------------|
| Unified booking + lunch + registration in one form | Organizers will complete the full flow without abandoning mid-way |
| Auto-generated registration link on confirmation | Organizers understand they can share this link directly with external users |
| Branded external registration page | External users trust it and complete the 3-field form |
| Sign-in sheet download from dashboard | Organizers find this sufficient to replace their current manual process |
| Admin utilization heatmap | Admins find room-level data actionable without needing approval workflows |

---

## ✅ TEST: Validate with Users

### Testing Plan

**Method:** HTML static prototype reviewed by the design lead (Rawinan) before user testing sessions.

| User Group | Suggested Testers | Tasks |
|------------|------------------|-------|
| Internal (Organizer) | 3–5 colleagues who currently book rooms | Book a room, add lunch, enable registration, copy link, download sign-in sheet |
| Admin | 1–2 staff who will manage rooms | Review utilization heatmap, deactivate a room |
| External User | 3–5 outside contacts who have attended org events | Register via link, cancel registration |

**Prototype verdict:** Approved — all 5 screens validated as sufficient for user testing. Flows are coherent, linked, and cover all three user groups.

### User Feedback

**Prototype self-review findings:**
- Unified booking form (room + lunch + registration in one flow) is clear and logical
- Registration toggle on the booking form clearly communicates the feature without confusion
- Confirmation modal with auto-generated registration link addresses the organizer's key need
- External registration page feels professional and trustworthy compared to Google Form baseline
- Admin heatmap provides utilization at a glance; hover tooltips add useful detail
- Sign-in sheet and copy-link actions are prominent and discoverable on the dashboard

**Anticipated friction points for live testing:**
- Organizers may need to be shown the registration link location on first use
- External users may question where their confirmation email comes from (SMTP sender name matters)
- Admin may want filtering on the heatmap (by floor, by capacity range)

### Key Learnings

1. **One flow works** — combining booking, lunch, and registration into a single form is viable and not overwhelming
2. **The registration link pattern is the right UX** — generate on confirmation, display prominently, copy to clipboard; no separate tool needed
3. **Branding on the external page is critical** — org logo + event details build trust that a generic Google Form cannot
4. **Admin heatmap is actionable at a glance** — color intensity communicates utilization without needing numbers; tooltips add precision on demand
5. **Next step is live user testing** — run 3–5 sessions per group with the HTML prototype before committing to tech stack

---

## 🚀 Next Steps

### Refinements Needed

1. **SMTP sender identity** — external users must recognize the confirmation email sender (org name, not a generic address)
2. **Admin heatmap filtering** — filter by floor or capacity range for larger organizations
3. **Registration link visibility** — surface it more prominently in the organizer dashboard, not only at booking confirmation
4. **Mobile responsiveness** — external users will likely open the registration link on mobile; test and optimize

### Action Items

| Priority | Action | Owner |
|----------|--------|-------|
| 🔴 High | Run live user testing with 3–5 organizers using HTML prototype | Rawinan |
| 🔴 High | Run external user testing with 3–5 outside contacts | Rawinan |
| 🟡 Medium | Define tech stack for production build | Dev team |
| 🟡 Medium | Configure dedicated SMTP sender name and address | IT / Admin |
| 🟢 Low | Add admin heatmap filtering (floor, capacity) | Dev team (post-MVP) |

### Success Metrics

| Metric | Target |
|--------|--------|
| Organizer task completion (full booking flow) | ≥ 80% without assistance |
| External registration completion rate | ≥ 90% form completion |
| Organizer satisfaction | Rated easier than current two-app process |
| Admin utilization comprehension | Under 30 seconds to read the heatmap |
| Double-booking incidents | Zero — conflict detection blocks 100% |

---

_Generated using BMAD Creative Intelligence Suite - Design Thinking Workflow_

# Story Dependency Graph
_Last updated: 2026-06-12T08:00:00+07:00 (reconciled: PRs #107/2.2, #108/2.4, #109/2.3, #110/2.6 all merged; story 2.5 now unblocked)_

## Stories

| Story | Epic | Title | Sprint Status | Issue | PR | PR Status | Dependencies | Ready to Work |
|-------|------|-------|--------------|-------|----|-----------|--------------|---------------|
| 1.1 | 1 | Scaffold the project | done | #1 | #49 | merged | none | ✅ Yes (done) |
| 1.2 | 1 | Design system & Thai typography | done | #2 | #53 | merged | 1.1 | ✅ Yes (done) |
| 1.3 | 1 | Database & migration setup with bare EXCLUDE constraint | done | #3 | #50 | merged | 1.1 | ✅ Yes (done) |
| 1.4 | 1 | Internationalization setup | done | #4 | #51 | merged | 1.1 | ✅ Yes (done) |
| 1.5 | 1 | Jobs & email platform | done | #5 | #54 | merged | 1.1 | ✅ Yes (done) |
| 1.6 | 1 | Audit-log write-hook foundation | done | #6 | #103 | merged | 1.3 | ✅ Yes (done) |
| 1.7 | 1 | Docker & deployment skeleton | done | #7 | #52 | merged | 1.1 | ✅ Yes (done) |
| 1.8 | 1 | Test harness & CI | done | #8 | #104 | merged | 1.3, 1.7 | ✅ Yes (done) |
| 1.9 | 1 | Walking-skeleton vertical slice | done | #9 | #105 | merged | 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8 | ✅ Yes (done) |
| 2.1 | 2 | Sign in with Authentik (OIDC) | done | #10 | #106 | merged | epic 1 complete | ✅ Yes (done) |
| 2.2 | 2 | Local dev auth bypass | done | #11 | #107 | merged | 2.1 | ✅ Yes (done) |
| 2.3 | 2 | Self-service profile | done | #12 | #109 | merged | 2.1 | ✅ Yes (done) |
| 2.4 | 2 | Roles & assignment model | done | #13 | #108 | merged | 2.1 | ✅ Yes (done) |
| 2.5 | 2 | Authorization guard dispatcher | backlog | #14 | — | — | 2.1, 2.4 | ✅ Yes |
| 2.6 | 2 | Fixed session timeout | done | #15 | #110 | merged | 2.1 | ✅ Yes (done) |
| 2.7 | 2 | Authorization negative-test pattern & audit on mutations | backlog | #16 | — | — | 2.5 | ❌ No (awaiting 2.5) |
| 3.1 | 3 | Create and edit rooms | backlog | #17 | — | — | epic 2 complete | ❌ No (epic 2 not complete) |
| 3.2 | 3 | Room photo upload | backlog | #18 | — | — | 3.1 | ❌ No (epic 2 not complete) |
| 3.3 | 3 | Deactivate a room | backlog | #19 | — | — | 3.1 | ❌ No (epic 2 not complete) |
| 3.4 | 3 | Block time slots | backlog | #20 | — | — | 3.1 | ❌ No (epic 2 not complete) |
| 4.1 | 4 | Conflict translation & EXCLUDE predicate | backlog | #21 | — | — | epic 3 complete | ❌ No (epic 3 not complete) |
| 4.2 | 4 | Room calendar read-model | backlog | #22 | — | — | 4.1 | ❌ No (epic 3 not complete) |
| 4.3 | 4 | Room Calendar view | backlog | #23 | — | — | 4.2 | ❌ No (epic 3 not complete) |
| 4.4 | 4 | Create a booking (conflict-free) | backlog | #24 | — | — | 4.1, 4.3 | ❌ No (epic 3 not complete) |
| 4.5 | 4 | Booking confirmation, link, token & QR | backlog | #25 | — | — | 4.4 | ❌ No (epic 3 not complete) |
| 4.6 | 4 | Booking confirmation email | backlog | #26 | — | — | 4.4 | ❌ No (epic 3 not complete) |
| 4.7 | 4 | Edit, cancel, and duplicate a booking | backlog | #27 | — | — | 4.4 | ❌ No (epic 3 not complete) |
| 4.8 | 4 | Organizer dashboard | backlog | #28 | — | — | 4.4, 4.5 | ❌ No (epic 3 not complete) |
| 5.1 | 5 | Branded public registration page | backlog | #29 | — | — | epic 4 complete | ❌ No (epic 4 not complete) |
| 5.2 | 5 | Submit a registration | backlog | #30 | — | — | 5.1 | ❌ No (epic 4 not complete) |
| 5.3 | 5 | Confirmation email with self-cancel link | backlog | #31 | — | — | 5.2 | ❌ No (epic 4 not complete) |
| 5.4 | 5 | Self-cancel a registration | backlog | #32 | — | — | 5.3 | ❌ No (epic 4 not complete) |
| 5.5 | 5 | Resend a lost link | backlog | #33 | — | — | 5.3 | ❌ No (epic 4 not complete) |
| 5.6 | 5 | Registration open/close rules | backlog | #34 | — | — | 5.2 | ❌ No (epic 4 not complete) |
| 5.7 | 5 | Catering aggregation | backlog | #35 | — | — | 5.2 | ❌ No (epic 4 not complete) |
| 5.8 | 5 | Registrant list & dashboard headcount | backlog | #36 | — | — | 5.2 | ❌ No (epic 4 not complete) |
| 6.1 | 6 | Sign-in sheet PDF | backlog | #37 | — | — | epic 5 complete | ❌ No (epic 5 not complete) |
| 6.2 | 6 | One-day reminder sweeper | backlog | #38 | — | — | epic 5 complete | ❌ No (epic 5 not complete) |
| 6.3 | 6 | Cancellation notifies attendees | backlog | #39 | — | — | epic 5 complete | ❌ No (epic 5 not complete) |
| 6.4 | 6 | Event Detail & Register to attend (internal) | backlog | #40 | — | — | epic 5 complete, 2.3 | ❌ No (epic 5 not complete) |
| 6.5 | 6 | Internal registrant counted & confirmed in-app | backlog | #41 | — | — | 6.4 | ❌ No (epic 5 not complete) |
| 6.6 | 6 | Internal self-cancel & close rules | backlog | #42 | — | — | 6.4 | ❌ No (epic 5 not complete) |
| 7.1 | 7 | Room deactivation cascade | backlog | #43 | — | — | epic 6 complete, 3.3 | ❌ No (epic 6 not complete) |
| 7.2 | 7 | Utilization heatmap | backlog | #44 | — | — | epic 6 complete | ❌ No (epic 6 not complete) |
| 7.3 | 7 | Bulk calendar | backlog | #45 | — | — | epic 6 complete | ❌ No (epic 6 not complete) |
| 7.4 | 7 | CSV export | backlog | #46 | — | — | epic 6 complete | ❌ No (epic 6 not complete) |
| 7.5 | 7 | Audit log view | backlog | #47 | — | — | epic 6 complete, 2.7 | ❌ No (epic 6 not complete) |
| 7.6 | 7 | Admin settings — SMTP & role assignment | backlog | #48 | — | — | epic 6 complete, 2.4 | ❌ No (epic 6 not complete) |

## Dependency Chains

### Epic 1 (COMPLETE — all PRs merged)
- **1.2** depends on: 1.1
- **1.3** depends on: 1.1
- **1.4** depends on: 1.1
- **1.5** depends on: 1.1
- **1.6** depends on: 1.3
- **1.7** depends on: 1.1
- **1.8** depends on: 1.3, 1.7
- **1.9** depends on: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8

### Epic 2 (in-progress — 2.1/2.2/2.3/2.4/2.6 merged; 2.5 unblocked; 2.7 blocked behind 2.5)
- **2.1** depends on: epic 1 complete ✅ **DONE (PR #106 merged)**
- **2.2** depends on: 2.1 ✅ **DONE (PR #107 merged)**
- **2.3** depends on: 2.1 ✅ **DONE (PR #109 merged)**
- **2.4** depends on: 2.1 ✅ **DONE (PR #108 merged)**
- **2.5** depends on: 2.1, 2.4 ✅ **READY**
- **2.6** depends on: 2.1 ✅ **DONE (PR #110 merged)**
- **2.7** depends on: 2.5

### Epic 3 (requires epic 2 complete)
- **3.1** depends on: epic 2 complete
- **3.2** depends on: 3.1
- **3.3** depends on: 3.1
- **3.4** depends on: 3.1

### Epic 4 (requires epic 3 complete)
- **4.1** depends on: epic 3 complete
- **4.2** depends on: 4.1
- **4.3** depends on: 4.2
- **4.4** depends on: 4.1, 4.3
- **4.5** depends on: 4.4
- **4.6** depends on: 4.4
- **4.7** depends on: 4.4
- **4.8** depends on: 4.4, 4.5

### Epic 5 (requires epic 4 complete)
- **5.1** depends on: epic 4 complete
- **5.2** depends on: 5.1
- **5.3** depends on: 5.2
- **5.4** depends on: 5.3
- **5.5** depends on: 5.3
- **5.6** depends on: 5.2
- **5.7** depends on: 5.2
- **5.8** depends on: 5.2

### Epic 6 (requires epic 5 complete)
- **6.1** depends on: epic 5 complete
- **6.2** depends on: epic 5 complete
- **6.3** depends on: epic 5 complete
- **6.4** depends on: epic 5 complete, 2.3
- **6.5** depends on: 6.4
- **6.6** depends on: 6.4

### Epic 7 (requires epic 6 complete)
- **7.1** depends on: epic 6 complete, 3.3
- **7.2** depends on: epic 6 complete
- **7.3** depends on: epic 6 complete
- **7.4** depends on: epic 6 complete
- **7.5** depends on: epic 6 complete, 2.7
- **7.6** depends on: epic 6 complete, 2.4

## Notes

**Parallelization opportunities within epics:**

- **Epic 1:** COMPLETE. All 9 stories merged to main.

- **Epic 2:** Stories 2.1–2.4 and 2.6 are all merged. Story 2.5 (Authorization guard dispatcher) is now unblocked (2.4 merged). Story 2.7 requires 2.5 first.

- **Epic 3:** After 3.1 merges, stories 3.2, 3.3, and 3.4 can all start in parallel.

- **Epic 4:** Strict chain: 4.1 → 4.2 → 4.3 → 4.4, then 4.5, 4.6, 4.7 in parallel after 4.4, then 4.8 last.

- **Epic 5:** After 5.1 merges, story 5.2 unblocks 5.3/5.6/5.7/5.8 in parallel. Stories 5.4 and 5.5 require 5.3.

- **Epic 6:** Stories 6.1, 6.2, 6.3, 6.4 can all start in parallel once epic 5 is complete. Stories 6.5 and 6.6 require 6.4.

- **Epic 7:** Stories 7.2, 7.3, 7.4 can start in parallel. Story 7.1 requires 3.3 to also be merged (which it will be by this point). Story 7.5 requires 2.7. Story 7.6 requires 2.4.

**Current state:** Stories 2.1 (PR #106), 2.2 (PR #107), 2.4 (PR #108), 2.3 (PR #109), and 2.6 (PR #110) are all merged. Story 2.5 (Authorization guard dispatcher) is now unblocked and Ready to Work. Story 2.7 is still blocked behind 2.5.

**Current bottleneck:** Story 2.5 is the next gate — once 2.5 merges, 2.7 unblocks, then epic 2 completes and epic 3 can begin. Sequential chain: 2.5 → 2.7 → epic 3.

**Epic gate rule:** No epic may begin until all stories of the preceding epic have merged PRs into main.

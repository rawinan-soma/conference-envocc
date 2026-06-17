# Story Dependency Graph
_Last updated: 2026-06-17T09:00:00+07:00 (phase 0 reconcile: PRs #134 (5.4) and #135 (5.5) CONFIRMED MERGED — 5.4 → done 2026-06-17T02:13:24Z; 5.5 → done 2026-06-17T02:20:56Z; epic-5 COMPLETE; epic-6 stories 6.1–6.4 now Ready to Work)_

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
| 2.5 | 2 | Authorization guard dispatcher | done | #14 | #111 | merged | 2.1, 2.4 | ✅ Yes (done) |
| 2.6 | 2 | Fixed session timeout | done | #15 | #110 | merged | 2.1 | ✅ Yes (done) |
| 2.7 | 2 | Authorization negative-test pattern & audit on mutations | done | #16 | #112 | merged | 2.5 | ✅ Yes (done) |
| 3.1 | 3 | Create and edit rooms | done | #17 | #113 | merged | epic 2 complete | ✅ Yes (done) |
| 3.2 | 3 | Room photo upload | done | #18 | #114 | merged | 3.1 | ✅ Yes (done) |
| 3.3 | 3 | Deactivate a room | done | #19 | #116 | merged | 3.1 | ✅ Yes (done) |
| 3.4 | 3 | Block time slots | done | #20 | #115 | merged | 3.1 | ✅ Yes (done) |
| 4.1 | 4 | Conflict translation & EXCLUDE predicate | done | #21 | #118 | merged | epic 3 complete | ✅ Yes (done) |
| 4.2 | 4 | Room calendar read-model | done | #22 | #119 | merged | 4.1 | ✅ Yes (done) |
| 4.3 | 4 | Room Calendar view | done | #23 | #121 | merged | 4.2 | ✅ Yes (done) |
| 4.4 | 4 | Create a booking (conflict-free) | done | #24 | #122 | merged | 4.1, 4.3 | ✅ Yes (done) |
| 4.5 | 4 | Booking confirmation, link, token & QR | done | #25 | #123 | merged | 4.4 | ✅ Yes (done) |
| 4.6 | 4 | Booking confirmation email | done | #26 | #124 | merged | 4.4 | ✅ Yes (done) |
| 4.7 | 4 | Edit, cancel, and duplicate a booking | done | #27 | #125 | merged | 4.4 | ✅ Yes (done) |
| 4.8 | 4 | Organizer dashboard | done | #28 | #126 | merged | 4.4, 4.5 | ✅ Yes (done) |
| 5.1 | 5 | Branded public registration page | done | #29 | #128 | merged | epic 4 complete | ✅ Yes (done) |
| 5.2 | 5 | Submit a registration | done | #30 | #129 | merged | 5.1 | ✅ Yes (done) |
| 5.3 | 5 | Confirmation email with self-cancel link | done | #31 | #130 | merged | 5.2 | ✅ Yes (done) |
| 5.4 | 5 | Self-cancel a registration | done | #32 | #134 | merged | 5.3 | ✅ Yes (done) |
| 5.5 | 5 | Resend a lost link | done | #33 | #135 | merged | 5.3 | ✅ Yes (done) |
| 5.6 | 5 | Registration open/close rules | done | #34 | #132 | merged | 5.2 | ✅ Yes (done) |
| 5.7 | 5 | Catering aggregation | done | #35 | #133 | merged | 5.2 | ✅ Yes (done) |
| 5.8 | 5 | Registrant list & dashboard headcount | done | #36 | #131 | merged | 5.2 | ✅ Yes (done) |
| 6.1 | 6 | Sign-in sheet PDF | backlog | #37 | — | — | epic 5 complete | ✅ Yes |
| 6.2 | 6 | One-day reminder sweeper | backlog | #38 | — | — | epic 5 complete | ✅ Yes |
| 6.3 | 6 | Cancellation notifies attendees | backlog | #39 | — | — | epic 5 complete | ✅ Yes |
| 6.4 | 6 | Event Detail & Register to attend (internal) | backlog | #40 | — | — | epic 5 complete, 2.3 | ✅ Yes |
| 6.5 | 6 | Internal registrant counted & confirmed in-app | backlog | #41 | — | — | 6.4 | ❌ No (6.4 not merged) |
| 6.6 | 6 | Internal self-cancel & close rules | backlog | #42 | — | — | 6.4 | ❌ No (6.4 not merged) |
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

### Epic 2 (COMPLETE — all PRs merged)
- **2.1** depends on: epic 1 complete ✅ **DONE (PR #106 merged)**
- **2.2** depends on: 2.1 ✅ **DONE (PR #107 merged)**
- **2.3** depends on: 2.1 ✅ **DONE (PR #109 merged)**
- **2.4** depends on: 2.1 ✅ **DONE (PR #108 merged)**
- **2.5** depends on: 2.1, 2.4 ✅ **DONE (PR #111 merged)**
- **2.6** depends on: 2.1 ✅ **DONE (PR #110 merged)**
- **2.7** depends on: 2.5 ✅ **DONE (PR #112 merged)**

### Epic 3 (COMPLETE — all PRs merged)
- **3.1** depends on: epic 2 complete ✅ **DONE (PR #113 merged)**
- **3.2** depends on: 3.1 ✅ **DONE (PR #114 merged)**
- **3.3** depends on: 3.1 ✅ **DONE (PR #116 merged)**
- **3.4** depends on: 3.1 ✅ **DONE (PR #115 merged)**

### Epic 4 (COMPLETE — all PRs merged)
- **4.1** depends on: epic 3 complete ✅ **DONE (PR #118 merged)**
- **4.2** depends on: 4.1 ✅ **DONE (PR #119 merged)**
- **4.3** depends on: 4.2 ✅ **DONE (PR #121 merged)**
- **4.4** depends on: 4.1, 4.3 ✅ **DONE (PR #122 merged)**
- **4.5** depends on: 4.4 ✅ **DONE (PR #123 merged)**
- **4.6** depends on: 4.4 ✅ **DONE (PR #124 merged)**
- **4.7** depends on: 4.4 ✅ **DONE (PR #125 merged)**
- **4.8** depends on: 4.4, 4.5 ✅ **DONE (PR #126 merged)**

### Epic 5 (COMPLETE — all PRs merged)
- **5.1** depends on: epic 4 complete ✅ **DONE (PR #128 merged 2026-06-15T14:38:49Z)**
- **5.2** depends on: 5.1 ✅ **DONE (PR #129 merged 2026-06-16T02:44:27Z)**
- **5.3** depends on: 5.2 ✅ **DONE (PR #130 merged 2026-06-16T14:34:45Z)**
- **5.4** depends on: 5.3 ✅ **DONE (PR #134 merged 2026-06-17T02:13:24Z)**
- **5.5** depends on: 5.3 ✅ **DONE (PR #135 merged 2026-06-17T02:20:56Z)**
- **5.6** depends on: 5.2 ✅ **DONE (PR #132 merged 2026-06-16T14:54:53Z)**
- **5.7** depends on: 5.2 ✅ **DONE (PR #133 merged 2026-06-16T15:01:05Z)**
- **5.8** depends on: 5.2 ✅ **DONE (PR #131 merged 2026-06-16T15:16:14Z)**

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

- **Epic 2:** COMPLETE. All 7 stories merged to main (including 2.7 PR #112).

- **Epic 3:** COMPLETE. All 4 stories merged to main (3.1 PR #113, 3.2 PR #114, 3.3 PR #116, 3.4 PR #115).

- **Epic 4:** COMPLETE. Strict chain: 4.1 → 4.2 → 4.3 → 4.4, then 4.5, 4.6, 4.7 in parallel after 4.4, then 4.8 last. All 8 stories **DONE** (PRs #118, #119, #121, #122, #123, #124, #125, #126 all merged).

- **Epic 5:** COMPLETE. All 8 stories merged to main. PRs #128 (5.1), #129 (5.2), #130 (5.3), #134 (5.4), #135 (5.5), #132 (5.6), #133 (5.7), #131 (5.8) all merged.

- **Epic 6:** Stories 6.1, 6.2, 6.3, 6.4 can all start in parallel — epic 5 is now complete. Stories 6.5 and 6.6 require 6.4.

- **Epic 7:** Stories 7.2, 7.3, 7.4 can start in parallel. Story 7.1 requires 3.3 (done PR #116). Story 7.5 requires 2.7 (done). Story 7.6 requires 2.4 (done).

**Current state:** Epics 1, 2, 3, 4, and 5 are fully complete (all PRs merged). Epic 6 is the current active epic — all 4 initial stories (6.1, 6.2, 6.3, 6.4) are now Ready to Work (epic 5 gate cleared). No open PRs. Worktrees story-5.4-self-cancel-a-registration and story-5.5-resend-a-lost-link removed.

**Currently unblocked (Ready to Work):** Stories 6.1, 6.2, 6.3, and 6.4 are all ready (epic 5 complete). Stories 6.5 and 6.6 depend on 6.4.

**Epic gate rule:** No epic may begin until all stories of the preceding epic have merged PRs into main.

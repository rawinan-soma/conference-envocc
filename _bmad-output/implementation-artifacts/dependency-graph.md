# Story Dependency Graph
_Last updated: 2026-06-15T12:00:00+07:00 (phase 0 reconcile: story 4.8 sprint status corrected to review — implementation complete, worktree exists, no PR yet)_

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
| 4.8 | 4 | Organizer dashboard | review | #28 | — | — | 4.4, 4.5 | ✅ Yes |
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

### Epic 4 (IN PROGRESS — 4.1–4.7 done; 4.8 Ready to Work)
- **4.1** depends on: epic 3 complete ✅ **DONE (PR #118 merged)**
- **4.2** depends on: 4.1 ✅ **DONE (PR #119 merged)**
- **4.3** depends on: 4.2 ✅ **DONE (PR #121 merged)**
- **4.4** depends on: 4.1, 4.3 ✅ **DONE (PR #122 merged)**
- **4.5** depends on: 4.4 ✅ **DONE (PR #123 merged)**
- **4.6** depends on: 4.4 ✅ **DONE (PR #124 merged)**
- **4.7** depends on: 4.4 ✅ **DONE (PR #125 merged)**
- **4.8** depends on: 4.4, 4.5 ✅ **IN REVIEW — implementation complete, no PR yet**

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

- **Epic 2:** COMPLETE. All 7 stories merged to main (including 2.7 PR #112).

- **Epic 3:** COMPLETE. All 4 stories merged to main (3.1 PR #113, 3.2 PR #114, 3.3 PR #116, 3.4 PR #115).

- **Epic 4:** Strict chain: 4.1 → 4.2 → 4.3 → 4.4, then 4.5, 4.6, 4.7 in parallel after 4.4, then 4.8 last. Stories 4.1–4.7 all **DONE** (PRs #118, #119, #121, #122, #123, #124, #125 all merged). Story 4.8 **IN REVIEW** (implementation complete, worktree exists at .worktrees/story-4.8-organizer-dashboard, no PR yet).

- **Epic 5:** After 5.1 merges, story 5.2 unblocks 5.3/5.6/5.7/5.8 in parallel. Stories 5.4 and 5.5 require 5.3.

- **Epic 6:** Stories 6.1, 6.2, 6.3, 6.4 can all start in parallel once epic 5 is complete. Stories 6.5 and 6.6 require 6.4.

- **Epic 7:** Stories 7.2, 7.3, 7.4 can start in parallel. Story 7.1 requires 3.3 (done PR #116). Story 7.5 requires 2.7 (done). Story 7.6 requires 2.4 (done).

**Current state:** Epics 1, 2, and 3 are fully complete (all PRs merged). Epic 4 is active. Stories 4.1–4.7 are all done (PRs #118, #119, #121, #122, #123, #124, #125 merged). Story 4.8 (Organizer dashboard) is in **review** — implementation is complete in worktree .worktrees/story-4.8-organizer-dashboard; PR not yet opened.

**Current bottleneck:** Story 4.8 is the only remaining story in epic 4. Once 4.8's PR merges, epic 4 will be complete and epic 5 will unblock.

**Epic gate rule:** No epic may begin until all stories of the preceding epic have merged PRs into main.

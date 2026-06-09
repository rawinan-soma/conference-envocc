---
marp: true
theme: default
paginate: true
backgroundColor: #ffffff
color: #2d2d2d
style: |
  section {
    font-family: 'Segoe UI', sans-serif;
    padding: 50px 64px;
    font-size: 26px;
    justify-content: flex-start;
  }
  section.lead {
    justify-content: center;
    text-align: left;
  }
  h1 {
    color: #1a73e8;
    font-size: 1.6em;
    border-bottom: 3px solid #1a73e8;
    padding-bottom: 8px;
    margin-top: 0;
    margin-bottom: 16px;
  }
  h2 {
    color: #1a73e8;
    font-size: 1.2em;
    margin: 8px 0;
  }
  h3 {
    color: #666;
    font-size: 0.95em;
    margin: 6px 0;
  }
  p { margin: 8px 0; }
  ul, ol { margin: 6px 0; padding-left: 24px; }
  li { margin: 5px 0; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.78em;
    margin: 10px 0;
  }
  th {
    background: #1a73e8;
    color: white;
    padding: 8px 14px;
    text-align: left;
  }
  td {
    padding: 7px 14px;
    border-bottom: 1px solid #e0e0e0;
    vertical-align: top;
  }
  tr:nth-child(even) { background: #f5f8ff; }
  blockquote {
    border-left: 4px solid #1a73e8;
    margin: 10px 0;
    padding: 8px 16px;
    color: #444;
    font-size: 0.85em;
    font-style: italic;
  }
  .highlight {
    background: #e8f0fe;
    border-left: 4px solid #1a73e8;
    padding: 10px 16px;
    border-radius: 0 8px 8px 0;
    margin: 10px 0;
    font-size: 0.85em;
  }
  .tip {
    background: #e6f4ea;
    border-left: 4px solid #34a853;
    padding: 10px 16px;
    border-radius: 0 8px 8px 0;
    margin: 10px 0;
    font-size: 0.85em;
  }
  pre {
    font-size: 0.75em;
    padding: 12px 16px;
    background: #f4f4f4;
    border-radius: 8px;
  }
---

<!-- _class: lead -->
<!-- _backgroundColor: #1a73e8 -->
<!-- _color: white -->

# Design Thinking
## A Human-Centered Design Process

---

# What is Design Thinking?

A **human-centered approach** to innovation that integrates the needs of people, the possibilities of technology, and the requirements for business success.

> "Design Thinking is not about what it looks like — it's about how it works for real people."
> — Tim Brown, IDEO

**Core Belief:** The best solutions come from deeply understanding the humans you are designing for.

---

# The 5 Phases of Design Thinking

| Phase            | Goal                   | Key Question                 |
| ---------------- | ---------------------- | ---------------------------- |
| 1. **Empathize** | Understand your users  | What do they feel, need, do? |
| 2. **Define**    | Frame the real problem | What is the core challenge?  |
| 3. **Ideate**    | Generate solutions     | How might we solve this?     |
| 4. **Prototype** | Make ideas tangible    | What can we build to test?   |
| 5. **Test**      | Validate with users    | What actually works?         |

---

# How the Process Flows

```
  EMPATHIZE → DEFINE → IDEATE → PROTOTYPE → TEST
      ↑                                       |
      └──────────── Iterate & Refine ─────────┘
```

**Key Principle:** This is not a straight line.

You may loop back to any earlier phase when you learn something new. Failure and iteration are built into the process — not signs of failure.

---

# Who Should Be in the Room?

| Phase         | Participants                       |
| ------------- | ---------------------------------- |
| **Empathize** | Real users, stakeholders, you      |
| **Define**    | Your team, product owner           |
| **Ideate**    | Mixed group — diverse perspectives |
| **Prototype** | Anyone who can sketch or build     |
| **Test**      | Real end users (5–7 people ideal)  |

<div class="tip">
💡 Working with real users — even just 2–3 people — is always better than working alone. Design WITH users, not FOR them.
</div>

---



# Before You Begin: Frame the Challenge

Before the session starts, the facilitator should be able to answer these 5 questions:

| #   | Question                                       | Purpose                       |
| --- | ---------------------------------------------- | ----------------------------- |
| 1   | What problem or opportunity are you exploring? | Sets the starting point       |
| 2   | Who are the primary users or stakeholders?     | Anchors design to real people |
| 3   | What constraints exist?                        | Sets realistic boundaries     |
| 4   | What does success look like?                   | Defines the destination       |
| 5   | What existing context matters?                 | Avoids reinventing the wheel  |

<div class="highlight">
🎯 Turn the answers into one clear statement: <em>"[Users] need [what] — so that [outcome]."</em> This is your compass for the entire session.
</div>

---

<!-- _class: lead -->
<!-- _backgroundColor: #1a73e8 -->
<!-- _color: white -->

# Phase 1
# EMPATHIZE

### Build deep understanding of your users
### before reaching for solutions.

---

# Phase 1: Empathize — Overview

**Goal:** Understand users' real needs, frustrations, and behaviors through direct observation and engagement.

**Why it matters:** Most systems fail not because the technology is wrong, but because the team designed for *assumed* users — not *real* ones.

<div class="highlight">
🎯 The output is <strong>insight</strong>, not data. Look for the gap between what users <em>say</em> they do and what they <em>actually</em> do.
</div>

---

# Phase 1: The Empathy Map

| Quadrant  | Question to ask                                            |
| --------- | ---------------------------------------------------------- |
| **SAY**   | What exact words do they use? What do they complain about? |
| **THINK** | What are they really thinking? What worries them quietly?  |
| **DO**    | What actions do they take? What workarounds do they use?   |
| **FEEL**  | What emotions surface? Frustrated? Relieved? Anxious?      |

> Build one Empathy Map **per user type** for a complete picture.

---

# Phase 1: Identify Your User Types

Before building empathy maps, list your user types:

- **Primary users** — who directly uses the solution day-to-day?
- **Secondary users** — who manages, oversees, or supports?
- **Edge-case users** — who interacts occasionally but critically? *(e.g., guests, partners)*

<div class="tip">
💡 Edge-case users are often overlooked but reveal the most important design constraints.
</div>

---

# Phase 1: Methods to Choose From

| Method              | Best When                                        |
| ------------------- | ------------------------------------------------ |
| **User Interviews** | You can schedule 15–30 min with real users       |
| **Empathy Mapping** | You have existing knowledge to structure         |
| **Shadowing**       | You can observe someone using the system live    |
| **Journey Mapping** | You want to trace the full experience end-to-end |

**Recommended:** Empathy Mapping first → validate with 2–3 real interviews.

---

# Phase 1: Step-by-Step Instructions

**Step 1** — Pick your first user type

**Step 2** — Fill each quadrant:
- **SAY:** What do they say about the current experience?
- **THINK:** What are they quietly worried about?
- **DO:** What workarounds do they use?
- **FEEL:** What is their emotional experience?

**Step 3** — Repeat for each remaining user type

**Step 4** — Compare: What surprised you? What patterns emerge?

---

# Phase 1: Strong vs. Weak Insights

**Weak (assumption):**
> "Users want a faster system."

**Strong (observation-based):**
> "Users don't trust the confirmation screen — they follow up manually anyway because they once lost data without warning."

<div class="highlight">
✅ A strong insight is <strong>specific</strong>, <strong>surprising</strong>, and points toward a clear design decision.
</div>

---

# Phase 1: Common Mistakes to Avoid

❌ **Jumping to solutions** — "Better UI" is a solution, not an insight

❌ **Designing from your own frustrations** — You are not the user

❌ **Only talking to vocal users** — Quiet users often have the most critical needs

❌ **Skipping edge-case users** — Their friction reveals system-wide weaknesses

<div class="tip">
💡 Ask "Tell me about a time when..." not "Do you like...?" — stories reveal truth.
</div>

---

# Phase 1: Ready to Start?

**You need:**
- A defined list of user types
- 30–60 minutes of focus time
- Access to 2–3 real users *(optional but recommended)*
- An open mind — assumptions will be challenged

**Your output will be:**
- Empathy Maps for each user type
- Key observations and pain points
- Surprising insights that shape everything that comes next

---

<!-- _class: lead -->
<!-- _backgroundColor: #1a73e8 -->
<!-- _color: white -->

# Phase 2
# DEFINE

### Turn observations into a clear,
### actionable problem statement.

---

# Phase 2: Define — Overview

**Goal:** Synthesize empathy findings into a focused problem statement that guides all ideation and prototyping.

**Why it matters:** Without a clear problem definition, teams solve the wrong problem very efficiently. The Define phase ensures everyone is aligned on *what* is actually being solved.

<div class="highlight">
🎯 The output is a <strong>Point of View (POV) statement</strong> — human-centered, specific, meaningful, and actionable.
</div>

---

# Phase 2: The POV Statement

A **Point of View** frames the problem from the user's perspective:

> **"[User] needs [need] because [surprising insight]."**

| Part | What it means |
|------|--------------|
| **User** | A specific, real person — not a demographic |
| **Need** | A verb — what they need to *do* or *feel* |
| **Insight** | The unexpected *why* behind the need |

<div class="tip">
💡 The insight is the most important part. If it's obvious, dig deeper.
</div>

---

# Phase 2: How Might We Questions

**How Might We (HMW)** questions reframe the POV into opportunities:

- Take each insight from the POV statement
- Turn it into an open question starting with *"How might we..."*
- Aim for 5–10 HMW questions

**Examples:**
- *"How might we help users trust that their action was successful?"*
- *"How might we reduce steps between intent and completion?"*
- *"How might we make edge-case users feel as confident as primary users?"*

> HMW questions are the bridge between Define and Ideate.

---

# Phase 2: Step-by-Step Instructions

**Step 1** — Spread out all empathy map findings

**Step 2** — Cluster related observations (Affinity Mapping)
- Group similar pain points, behaviors, and emotions
- Name each cluster with a theme

**Step 3** — Identify the most critical insight per user type

**Step 4** — Write one POV statement per user type:
*"[User] needs [need] because [insight]."*

**Step 5** — Generate 5–10 HMW questions from the POV statements

---

# Phase 2: Strong vs. Weak POV

**Weak (too vague):**
> "Users need a better experience because the current one is bad."

**Strong (specific + insight-driven):**
> "Busy staff need instant confirmation of their action because uncertainty causes them to repeat steps and lose trust in the system."

<div class="highlight">
✅ A strong POV names a <strong>real person</strong>, a <strong>specific need</strong>, and an <strong>insight that explains why</strong>.
</div>

---

# Phase 2: Common Mistakes to Avoid

❌ **Writing solutions into the POV** — "Users need a notification system" is a solution

❌ **Being too broad** — "Users need a better system" gives no direction

❌ **Skipping the insight** — without "because," the POV has no teeth

❌ **Combining multiple users** — write one POV per user type

<div class="tip">
💡 If your HMW questions all lead to the same solution, your POV is too narrow. Widen the insight.
</div>

---

# Phase 2: Ready to Move On?

**Your output should include:**
- Clustered observations from empathy phase
- One POV statement per user type
- 5–10 How Might We questions
- Team alignment on the core problem

**You're ready for Ideate when:**
- The problem is clear enough to inspire solutions
- Your HMW questions feel exciting, not limiting

> *"A problem well stated is a problem half solved."*

---

<!-- _class: lead -->
<!-- _backgroundColor: #1a73e8 -->
<!-- _color: white -->

# Phase 3
# IDEATE

### Generate a wide range of ideas
### before narrowing to the best ones.

---

# Phase 3: Ideate — Overview

**Goal:** Generate a large, diverse set of ideas that address the HMW questions — quantity over quality at this stage.

**Why it matters:** The first idea is rarely the best. Ideation creates the raw material from which great solutions are built. Judgment too early kills creative potential.

<div class="highlight">
🎯 Defer judgment during generation. The wilder the idea, the more useful it is as a creative springboard.
</div>

---

# Phase 3: Rules of Brainstorming

| Rule | Why it matters |
|------|---------------|
| **Defer judgment** | No bad ideas during generation |
| **Build on others** | "Yes, and..." — not "Yes, but..." |
| **Go for quantity** | Aim for 50+ before filtering |
| **Encourage wild ideas** | Extremes spark breakthroughs |
| **Stay visual** | Sketch, don't just write |

<div class="tip">
💡 <strong>Diverge first, converge later.</strong> Don't filter while generating.
</div>

---

# Phase 3: Methods to Choose From

| Method | Best When |
|--------|-----------|
| **Brainstorming** | Open group idea generation |
| **Crazy 8s** | Need to push past obvious ideas fast |
| **SCAMPER** | Reimagining something that already exists |
| **Analogous Inspiration** | Borrowing ideas from other domains |
| **How Might We Voting** | Prioritizing which HMW to solve first |

**Recommended:** Crazy 8s to warm up → open brainstorm → dot voting to select top concepts.

---

# Phase 3: Step-by-Step Instructions

**Step 1** — Pick your top 3 HMW questions to focus on

**Step 2** — Warm up with Crazy 8s (8 sketches in 8 minutes)

**Step 3** — Open brainstorm — generate ideas, no filtering

**Step 4** — Share and build — each person presents, others add

**Step 5** — Cluster similar ideas into themes

**Step 6** — Vote on top concepts (3 dots per person)

**Step 7** — Select 2–3 ideas to carry into Prototype

---

# Phase 3: Choosing What to Prototype

Evaluate top ideas against three lenses:

| Lens | Question |
|------|---------|
| **Desirability** | Do users actually want this? |
| **Feasibility** | Can we realistically build it? |
| **Viability** | Does it make sense for the organization? |

<div class="highlight">
🎯 The best idea to prototype tests the most important assumption — not necessarily the most popular idea.
</div>

---

# Phase 3: Common Mistakes to Avoid

❌ **Evaluating while generating** — kills creative momentum

❌ **Anchoring on the first idea** — teams stop too early

❌ **Only generating safe ideas** — safe ideas rarely solve hard problems

❌ **Skipping wild ideas** — they often contain the seed of a breakthrough

<div class="tip">
💡 If every idea feels obvious and comfortable, you haven't gone far enough.
</div>

---

# Phase 3: Ready to Move On?

**Your output should include:**
- 20–50+ raw ideas generated
- Ideas clustered by theme
- 2–3 top concepts selected for prototyping
- Shared understanding of *why* those concepts were chosen

**You're ready for Prototype when:**
- Each concept can be described in one sentence
- Each concept tests a different assumption

---

<!-- _class: lead -->
<!-- _backgroundColor: #1a73e8 -->
<!-- _color: white -->

# Phase 4
# PROTOTYPE

### Make ideas tangible quickly.
### A rough prototype teaches more than a perfect plan.

---

# Phase 4: Prototype — Overview

**Goal:** Build the simplest possible representation of your idea that can be put in front of users to generate feedback.

**Why it matters:** Discussions about ideas are abstract. A prototype makes an idea real enough to react to — users show you what works, rather than trying to imagine it.

<div class="highlight">
🎯 Prototype to <strong>learn</strong>, not to build. The goal is a question answered — not a product shipped.
</div>

---

# Phase 4: Choosing Fidelity

Use the lowest fidelity that still tests your assumption:

| Fidelity | What it looks like | Best for |
|----------|--------------------|----------|
| **Low** | Paper sketches, sticky notes | Testing concepts and flows |
| **Medium** | Wireframes, clickable mockups | Testing navigation and layout |
| **High** | Polished digital prototype | Testing look, feel, and detail |

<div class="tip">
💡 A paper prototype in 30 minutes teaches as much as a polished mockup in 3 days — and costs nothing to throw away.
</div>

---

# Phase 4: Methods to Choose From

| Method | Best When |
|--------|-----------|
| **Paper Prototyping** | Testing concepts and flows quickly |
| **Wireframing** | Designing digital screens |
| **Role Playing** | Testing a service or process interaction |
| **Storyboarding** | Communicating an experience over time |
| **Wizard of Oz** | Simulating complex functionality manually |

**Recommended:** Paper or wireframe for first iteration — get it in front of users fast.

---

# Phase 4: Step-by-Step Instructions

**Step 1** — Pick one concept to prototype first

**Step 2** — Define what you're trying to learn:
- What is the core assumption to test?
- What task should the user be able to attempt?

**Step 3** — Build the minimum needed to test that assumption

**Step 4** — Prepare 1–2 tasks for users during testing

**Step 5** — Internal walkthrough — does it make sense without explanation?

**Step 6** — Take it to users

---

# Phase 4: Common Mistakes to Avoid

❌ **Building too much** — over-investment creates attachment, not learning

❌ **Making it too polished** — users comment on aesthetics instead of concept

❌ **Prototyping without a test plan** — know your questions before you build

❌ **Building only one prototype** — test multiple concepts in parallel when possible

<div class="tip">
💡 If you feel attached to your prototype, it's too polished. You should be able to throw it away without hesitation.
</div>

---

# Phase 4: Ready to Move On?

**Your output should include:**
- A prototype for each top concept
- A clear list of assumptions being tested
- 1–2 user tasks prepared
- Agreement on what "validated" looks like

**You're ready for Test when:**
- A real user could interact with it without your explanation
- You know exactly what you're trying to learn

---

<!-- _class: lead -->
<!-- _backgroundColor: #1a73e8 -->
<!-- _color: white -->

# Phase 5
# TEST

### Observe. Listen. Learn.
### What users do matters more than what they say.

---

# Phase 5: Test — Overview

**Goal:** Put your prototype in front of real users, observe how they interact with it, and capture insights to refine or redirect your solution.

**Why it matters:** Testing is where assumptions meet reality. It is the phase that separates design thinking from design guessing.

<div class="highlight">
🎯 Your job during testing is to <strong>observe and listen</strong> — not explain, defend, or guide. Silence is data.
</div>

---

# Phase 5: Planning Your Test

| Question | Why it matters |
|----------|---------------|
| Who will you test with? | Wrong users = misleading data |
| How many? | 5–7 users reveals ~85% of issues |
| What tasks will they attempt? | Tasks reveal behavior, not opinion |
| How will you capture feedback? | Notes, recording, observation grid |
| What are you trying to learn? | Keeps the session focused |

---

# Phase 5: How to Run a Test Session

**Before:** *"We're testing the design, not you. There are no wrong answers."*

**During:**
- Give the task — don't explain how to do it
- Ask them to **think aloud** as they go
- Stay silent when they struggle — that's the data
- Note what they **do**, not just what they **say**

**After:**
- Ask: *"What was confusing? What surprised you? What would you change?"*
- Capture raw notes — interpret later, together

---

# Phase 5: Capturing Feedback

Use a **Feedback Capture Grid**:

| What worked | What didn't work |
|-------------|-----------------|
| Users did this easily | Users struggled here |

| Questions that arose | Ideas for improvement |
|---------------------|----------------------|
| What users asked | What users suggested |

<div class="tip">
💡 Fill the grid immediately after each session — memory fades fast.
</div>

---

# Phase 5: Synthesizing Learnings

After all sessions, ask:

- What patterns appeared **across multiple users**?
- Which assumptions were **validated**?
- Which assumptions were **invalidated**?
- What **surprised** us most?
- What needs to change before the next iteration?

<div class="highlight">
🎯 One user's frustration is a data point. Three users' frustration is a <strong>design problem</strong>.
</div>

---

# Phase 5: What Comes Next?

| Finding | Next action |
|---------|------------|
| Concept validated, details need fixing | Refine → test again |
| Users understood it but need isn't met | Back to **Define** |
| Users didn't understand the concept | Back to **Prototype** |
| Core assumption was wrong | Back to **Empathize** |

<div class="highlight">
✅ Iteration is not failure — it is the process working exactly as designed.
</div>

---

# Phase 5: Common Mistakes to Avoid

❌ **Explaining the prototype** — confusion is the finding

❌ **Asking leading questions** — *"Did you like it?"* vs. *"What did you notice?"*

❌ **Testing with colleagues** — they know too much context to react naturally

❌ **Waiting for a perfect prototype** — rough prototypes get more honest reactions

<div class="tip">
💡 The most valuable moment is when a user does something unexpected. Don't dismiss it — investigate it.
</div>

---

<!-- _class: lead -->
<!-- _backgroundColor: #2d2d2d -->
<!-- _color: white -->

# Summary

| Phase | Core Tool | Output |
|-------|-----------|--------|
| **Before You Begin** | 5 Questions | Challenge Statement |
| **1. Empathize** | Empathy Map | User Insights |
| **2. Define** | POV + HMW | Problem Frame |
| **3. Ideate** | Brainstorming | Top Concepts |
| **4. Prototype** | Low-fi Build | Testable Artifact |
| **5. Test** | User Sessions | Validated Learnings |

Design WITH users. Fail fast. Iterate often.

# 24 · Agile, Scrum, and the SDLC

**Why these exist:** software projects used to fail by planning everything up front (waterfall), building for a year, and discovering at the end that requirements had changed or were misunderstood. **Agile** delivers in **small increments with frequent feedback**, so you can change direction cheaply. **Scrum** is the most common framework for doing Agile. The **SDLC** is the overall life cycle any method follows.

**Your experience:** you worked in Scrum teams at Dell (sprint planning, estimation, daily stand-ups, reviews, retrospectives, a Jira story lifecycle), saw the shift to **spec-driven development** with AI-assisted coding, and you hold **Registered Scrum Master (RSM)** and **Registered Product Owner (RPO)** certifications from Scrum Inc. (Sep 2025). Mention the certifications once; don't dwell.

---

## Start here: SDLC, Agile and Scrum in plain words

### SDLC
**The Software Development Life Cycle** is the **set of stages every piece of software goes through**: decide what to build → design it → build it → test it → release it → maintain it. Every company follows some version of it; methods like Waterfall and Agile differ in **how they move through** the stages.

```
   ┌──► Plan/Requirements ──► Design ──► Build ──► Test ──► Deploy ──► Maintain/Monitor ──┐
   └──────────────────────────────── feedback ◄───────────────────────────────────────────┘
```

### Waterfall vs Agile, with an analogy

- **Waterfall = building a bridge:** design everything up front, then build it in strict phases; changes late are very expensive.
- **Agile = cooking for guests you can talk to:** cook one course, let them taste it, adjust the next course based on their feedback.

```
WATERFALL:  [Requirements]──►[Design]──►[Build]──►[Test]──►[Release]      (feedback only at the very end)
AGILE:      [Plan→Build→Test→Release]──►[Plan→Build→Test→Release]──►[…]   (a usable increment every 2 weeks)
```

### Scrum: the most popular way to do Agile
**Plain words:** a small team works in fixed **sprints** (usually 2 weeks). At the start they pick the most valuable work; each day they sync for 15 minutes; at the end they **show working software** to stakeholders and discuss how to work better.
**Analogy:** a **sports season played in fixed matches**: plan before each match, a quick huddle every day, review the match result, discuss tactics, then the next match.

```
 Product Backlog (everything wanted, ordered by the Product Owner)
        │ Sprint Planning: "what can we finish this sprint?"
        ▼
 Sprint Backlog ──► 2-week SPRINT ─────────────────────────────► Increment (working, "Done" software)
                     │  Daily Scrum (15 min every day)                    │
                     │                                                    ▼
                     │                                       Sprint Review (demo to stakeholders)
                     └──────────────────────────────────────► Sprint Retrospective (improve how we work)
 Roles: Product Owner (what & why, priorities) · Scrum Master (coach, removes blockers) · Developers (how, build it)
```

## Course map (everything in this file)
```
SDLC: phases · models (waterfall, V, iterative, spiral, Agile, DevOps) · requirements (functional/non-functional, PRDs) · design docs
  · testing types & levels · defect life cycle · maintenance types · secure SDLC · DevOps lifecycle
Agile: the manifesto (values & principles) · mindset · frameworks (Scrum, Kanban, XP, Lean, SAFe)
Scrum: pillars & values · roles/accountabilities · events (sprint, planning, daily, review, retro) · artifacts & commitments
  · backlog refinement · DoR/DoD · user stories (INVEST, acceptance criteria) · estimation (story points, planning poker,
  t-shirt sizes, three-point) · velocity & forecasting · burndown/burnup · scaling
Kanban: boards · WIP limits · flow metrics (lead time, cycle time, throughput)
XP: TDD · pair programming · CI · refactoring · small releases
Practice: handling scope change · technical debt · remote teams · tools (Jira) · spec-driven development with AI
```

## 1. SDLC phases

1. **Requirements / planning:** what problem, for whom, success criteria, constraints.
2. **Analysis and design:** architecture (HLD), detailed design (LLD), data models, APIs, threat model.
3. **Implementation:** code, code review, unit tests.
4. **Testing:** integration, system, regression, performance, security, UAT (user acceptance testing).
5. **Deployment / release:** CI/CD, staged rollout.
6. **Maintenance / operations:** monitoring, bug fixes, incidents, improvements.
(**Secure SDLC** adds security activities at every phase: threat modelling in design, SAST/SCA in build, DAST in test, monitoring in operations.)

## 2. SDLC models

| Model | Idea | Good for | Weakness |
|---|---|---|---|
| **Waterfall** | Sequential phases, each completed before the next | Fixed, well-understood requirements; regulated work | Late feedback; costly changes |
| **V-model** | Waterfall with a test phase paired to each design phase | Safety-critical systems | Rigid |
| **Iterative / incremental** | Build in pieces, refine | Large systems with evolving needs | Needs good architecture early |
| **Spiral** | Iterations driven by risk analysis | High-risk, large projects | Complex, expensive |
| **Agile** (Scrum, Kanban, XP) | Short iterations, continuous feedback, working software | Changing requirements, product development | Needs engaged stakeholders; can lose the big picture |
| **DevOps** | Dev + Ops collaboration, automation, CI/CD, monitoring | Fast, reliable delivery | Cultural change needed |

## 3. The Agile Manifesto (2001)
**Four values** (we value the left **more than** the right):

1. **Individuals and interactions** over processes and tools
2. **Working software** over comprehensive documentation
3. **Customer collaboration** over contract negotiation
4. **Responding to change** over following a plan
**Twelve principles** (key ones): satisfy the customer through early, continuous delivery; welcome changing requirements; deliver frequently (weeks, not months); business and developers work together daily; motivated individuals; face-to-face conversation; working software is the primary measure of progress; sustainable pace; technical excellence; **simplicity (maximise the work not done)**; self-organising teams; **regular reflection and adjustment**.

## 4. Scrum
**Pillars:** transparency, inspection, adaptation. **Values:** commitment, courage, focus, openness, respect.

**Three accountabilities (roles):**

| Role | Responsibility |
|---|---|
| **Product Owner** | Maximises value; owns and **orders the Product Backlog**; defines the product goal; accepts work |
| **Scrum Master** | Servant-leader; coaches Scrum; **removes impediments**; facilitates events; protects the team |
| **Developers** | Cross-functional team that builds the increment; self-managing; owns *how* |

**Five events (all time-boxed):**

| Event | Purpose | Time-box (1-month sprint; shorter for shorter sprints) |
|---|---|---|
| **Sprint** | The container: 1–4 weeks (2 weeks is most common) | fixed length |
| **Sprint Planning** | Why (sprint goal), what (backlog items), how (plan) | up to 8 h |
| **Daily Scrum** | Inspect progress toward the sprint goal, adapt the plan | 15 min |
| **Sprint Review** | Demo the increment to stakeholders; adapt the backlog | up to 4 h |
| **Sprint Retrospective** | Improve how the team works (people, process, tools) | up to 3 h |

**Three artifacts (with commitments):**

- **Product Backlog** → commitment: **Product Goal**
- **Sprint Backlog** → commitment: **Sprint Goal**
- **Increment** → commitment: **Definition of Done**

**Backlog refinement:** ongoing; break items down, clarify them, estimate them.
**Definition of Ready (team practice):** the story is clear, estimated, has acceptance criteria, dependencies are known.
**Definition of Done:** code reviewed, tests passing, coverage met, docs updated, deployed to the test environment, acceptance criteria met. *(At Dell the onboarding checklist and quality gates, e.g. Sonar coverage > 80% and zero critical scan findings, were effectively part of "done".)*

## 5. User stories and estimation

- **User story:** "As a *storage admin*, I want *alerts after N consecutive job failures* so that *I notice persistent problems without alert fatigue*."
- **Acceptance criteria** (Given/When/Then): "Given the threshold is 3, when 3 consecutive runs of the job fail, then a CELOG event is raised."
- **INVEST:** Independent, Negotiable, Valuable, Estimable, Small, Testable.
- **Story points:** relative effort/complexity/uncertainty (Fibonacci 1, 2, 3, 5, 8, 13), not hours. **Planning poker** for team consensus.
- **Velocity:** points completed per sprint, used for forecasting, **not** for comparing teams.
- **Epics → features → stories → tasks.**
- **Burndown chart** (work left in the sprint), **burnup** (scope vs done over the release).
- **Spikes:** time-boxed research stories (e.g. "evaluate DuckDB vs Arrow"; your internship benchmark was effectively a spike).

## 6. Kanban
Visualise work on a board (To do → In progress → Review → Done), **limit work in progress (WIP)**, manage **flow** (measure lead time and cycle time), continuous delivery without sprints. Good for support/ops teams and steady streams of work (incidents, defect triage). Many teams use **Scrumban**.

## 7. Scaling Agile
**SAFe** (Scaled Agile Framework: release trains, PI planning), LeSS, Scrum of Scrums. Large enterprises like Dell often use SAFe-style PI (program increment) planning across many teams.

## 8. Your Dell process
Jira story lifecycle: **Ready for squad → Development in progress → Testing → Integration testing → Ready for UAT → UAT done.** Ceremonies: planning, estimation, daily stand-up, review, retrospective. Environments: dev → int → UAT → prod with weekly production deployments (and a rotation you were part of).
**Spec-driven development:** with AI-assisted coding, the team wrote a **spec** that gated AI implementation and review. Review meant checking the implementation against the agreed spec (file 22).

## 8b. Requirements, testing, maintenance and documentation (SDLC in depth)

**Requirements:**

- **Functional** (what the system does: "admins can set a failure threshold per job type") vs **non-functional** (how well: performance, availability, security, scalability, usability, maintainability, compliance: "alerts fire within 1 minute").
- Elicitation: stakeholder interviews, user stories, use cases, prototypes. A **PRD** (product requirements document) captures the what and why; a **design doc / RFC** captures the how and its alternatives.
- **Traceability:** requirement → design → code → tests.

**Testing types (know each in one line):**

| Level / type | What it checks |
|---|---|
| **Unit** | One function/class in isolation (fast, many) |
| **Integration** | Components together (service + DB, consumer + broker) |
| **System / end-to-end** | The whole system from the user's view |
| **Acceptance / UAT** | Meets business requirements; signed off by users/PO |
| **Regression** | Old features still work after a change (your MVT/FVT lists) |
| **Smoke** | Quick "does it basically work?" after a build/deploy (BVT) |
| **Sanity** | A narrow check that a specific fix works |
| **Performance / load / stress / soak** | Speed under expected load / beyond capacity / over a long time |
| **Security** | SAST, DAST, pen tests (file 19) |
| **Chaos / resilience** | Deliberately inject failures (kill pods, add latency) |
| **Usability, compatibility, localisation** | Human and platform aspects |

**Black-box** (no knowledge of internals; equivalence partitioning, boundary-value analysis) vs **white-box** (code-aware; statement/branch/path coverage) vs grey-box.
**Boundary value example:** for a threshold allowed in 1–10, test 0, 1, 2, 9, 10, 11.
**TDD (test-driven development):** red (write a failing test) → green (make it pass minimally) → refactor. **BDD:** Given/When/Then scenarios in shared language (Cucumber, pytest-bdd).
**V-model mapping:** requirements ↔ acceptance tests, system design ↔ system tests, architecture ↔ integration tests, module design ↔ unit tests.
**Defect life cycle:** New → Assigned → Open → Fixed → Retest → Verified → Closed (or Reopened / Rejected / Deferred / Duplicate). **Severity** (impact on the system) vs **priority** (urgency for the business): a typo on the home page is low severity but high priority.

**Maintenance types:** **corrective** (fix bugs), **adaptive** (adapt to environment changes: new OS, new APIs), **perfective** (improve performance/features), **preventive** (refactor, upgrade dependencies, pay down tech debt; your 50+ vulnerability fixes were preventive maintenance).

**DevOps lifecycle (the infinity loop):** plan → code → build → test → release → deploy → operate → monitor → (feedback) → plan. **Shift left** (testing and security earlier) and **shift right** (monitoring, canaries and feature flags in production).

**Extreme Programming (XP) practices:** pair programming, TDD, continuous integration, small releases, refactoring, collective code ownership, coding standards, sustainable pace.
**Lean principles:** eliminate waste, build quality in, deliver fast, defer commitment, optimise the whole. **Flow metrics:** lead time (request → done), **cycle time** (start → done), throughput, WIP.
**Estimation techniques:** planning poker, t-shirt sizes (S/M/L/XL), affinity mapping, three-point estimates ((optimistic + 4 × likely + pessimistic) ÷ 6).
**Agile artefacts in practice:** Jira epics/stories/sub-tasks, sprint boards, burndown charts, release plans, roadmaps, and team working agreements.

## 9. Common Agile interview questions
**Q: What do you do when requirements change mid-sprint?** The PO decides. If the sprint goal becomes obsolete, the PO can cancel the sprint; otherwise new work goes to the backlog for the next sprint, and urgent production issues are handled per the team's agreement (with the trade-off made visible).
**Q: How do you handle a story that won't finish in the sprint?** Raise it early at stand-up, split it if possible, don't mark it done; it returns to the backlog and is re-estimated; discuss it in the retro.
**Q: How do you estimate unknown work?** A spike first; relative sizing; break it down; state the uncertainty.
**Q: What makes a good retrospective?** Psychological safety, concrete action items with owners, and following up on them next time.
**Q: Scrum Master vs project manager?** A servant-leader who coaches and removes impediments vs someone who commands and controls the plan, scope and schedule.
**Q: How do you handle technical debt in Agile?** Make it visible in the backlog, allocate capacity each sprint (e.g. 15–20%), tie it to the risk/cost it causes (your flaky CI fix was technical debt with a real cost: lost engineer hours and ignored red builds).
**Q: Tell me about a time you disagreed with a priority.** Use a STAR story (file 27): data, the trade-off, escalate respectfully, commit once decided.

## Quick revision

- SDLC phases + secure SDLC; models (waterfall, V, iterative, spiral, Agile, DevOps).
- Manifesto: 4 values (individuals, working software, collaboration, responding to change) + key principles.
- Scrum: PO/SM/Developers; Sprint, Planning, Daily, Review, Retro (+ time-boxes); Product/Sprint Backlog + Increment with Product Goal/Sprint Goal/DoD.
- Stories (INVEST, acceptance criteria), story points, velocity, burndown, spikes; Kanban (WIP limits, flow); SAFe.
- Your process: the Jira lifecycle, dev → int → UAT → prod, spec-driven development, RSM + RPO.

# START HERE: Your 20-Day Interview Plan

**Target roles:** SDE 2 · Senior Software Engineer · Backend Engineer · AI/LLM Engineer · DevOps/Platform Engineer
**Your profile in one line:** 2+ years at Dell on a distributed storage OS (PowerScale OneFS) and a Kafka/RabbitMQ telemetry platform, M.Tech IIIT Bangalore, Agentic AI hackathon winner, and a live AI product on the Chrome Web Store.

You said you will rely only on this material. So every file follows the same shape:

1. **Why it exists**: the problem the technology solves, which is how you answer "why did you use it?"
2. **Core concepts**: what you must understand, not just memorise
3. **How it works inside**: the depth that separates SDE 2 from SDE 1
4. **How *you* used it**: tied to your resume, since interviewers always connect topics back to you
5. **Interview traps**: the questions people get wrong
6. **Quick revision**: a 2-minute recap for the night before

Practice questions for every topic are in [28_Practice_Questions.md](28_Practice_Questions.md).

**Each technical file now runs from basics to advanced:**

- It opens with a **"Part 0 / Basics"** section: fundamentals like SQL's DDL/DML/DCL/TCL, C syntax, or OS types.
- It then covers the core and advanced topics.
- It ends with **hands-on sections**: runnable code, commands, configuration files and diagrams (for example Kafka and RabbitMQ client code, Kubernetes YAML, Prometheus configs, worked OS scheduling examples).
- **Study order:** start each file at Part 0 if a topic is rusty. If you're confident, skim Part 0 and spend your time on the advanced and hands-on parts.

---

## The files

| # | File | Covers (from your list) |
|---|---|---|
| 01 | [DSA](01_DSA.md) | 7 · patterns, templates, 150 problems mapped to days |
| 02 | [C and C++](02_C_and_Cpp.md) | 1, 2 |
| 03 | [Python](03_Python.md) | 3 |
| 04 | [Scala, JVM, Spring Boot](04_Scala_JVM_SpringBoot.md) | 4 |
| 05 | [OOP, SOLID, Design Patterns, LLD](05_OOP_Design_Patterns_LLD.md) | 8, 12 (LLD) |
| 06 | [Operating Systems, Linux, Bash](06_OS_Linux_Bash.md) | 6, 9, 18 |
| 07 | [Multithreading and Concurrency](07_Multithreading_Concurrency.md) | 13 |
| 08 | [Computer Networks](08_Computer_Networks.md) | 10 |
| 09 | [Databases: SQL, MySQL, PostgreSQL, MongoDB, Redis](09_Databases_SQL_MySQL_MongoDB.md) | 5, 31, 32 |
| 10 | [Elasticsearch, DuckDB, Arrow, Parquet](10_Elasticsearch_DuckDB_Arrow_Parquet.md) | 33–36 |
| 11 | [Storage Systems (your domain)](11_Storage_Systems.md) | 37–39 + storage deep dive |
| 12 | [Distributed Systems](12_Distributed_Systems.md) | 11 |
| 13 | [Kafka and RabbitMQ](13_Kafka_RabbitMQ.md) | 40, 41 |
| 14 | [System Design (HLD)](14_System_Design_HLD.md) | 12 (HLD) |
| 15 | [Backend, REST, Microservices, FastAPI](15_Backend_REST_Microservices_FastAPI.md) | 14–17 |
| 16 | [Docker and Kubernetes](16_Docker_Kubernetes.md) | 46, 47 |
| 17 | [CI/CD, Git, Jenkins, GitHub Actions, GitLab, Maven](17_CICD_Git_Jenkins_Maven.md) | 48–54 |
| 18 | [Observability: Prometheus, Grafana, Splunk, ELK](18_Observability.md) | 42–45 |
| 19 | [Security and DevSecOps](19_Security_DevSecOps.md) | 55–60 |
| 20 | [LLMs, Prompt Engineering, OpenAI API](20_LLMs_Prompting_OpenAI.md) | 20, 23, 26 |
| 21 | [RAG, Agentic AI, LangChain, Evals, Guardrails](21_RAG_Agents_Evals_Guardrails.md) | 21, 22, 24, 25, 27 |
| 22 | [AI Coding Tools: Copilot, Claude CLI, Devin](22_AI_Coding_Tools.md) | 28–30 |
| 23 | [Chrome Extensions](23_Chrome_Extensions.md) | 19 |
| 24 | [Agile, Scrum, SDLC](24_Agile_Scrum_SDLC.md) | 61, 62, 66 |
| 25 | [My Dell Experience](25_My_Dell_Experience.md) | 63, 65 |
| 26 | [My AI Projects](26_My_AI_Projects.md) | 64, 65 |
| 27 | [Behavioural, HR, Stories, Negotiation](27_Behavioral_HR.md) | interview rounds |
| 28 | [Practice Questions](28_Practice_Questions.md) | all topics + mock interviews |

---

## How product-company interviews work (so you study the right things)

A typical SDE 2 loop in India (product companies, GCCs, startups):

| Round | What they test | Where to study |
|---|---|---|
| Online assessment | 2–3 DSA problems in 60–90 min (HackerRank/CodeSignal) | 01 |
| DSA rounds (1–2) | Medium problems, clean code, complexity, edge cases, talking while coding | 01 |
| LLD / machine coding | Design classes for a parking lot, LRU cache, rate limiter, etc. Runnable code in 60–90 min | 05, 07 |
| HLD / system design | Design a scalable system. For SDE 2 you lead; the interviewer only nudges | 14, 12, 13, 09 |
| Project deep dive / hiring manager | "Walk me through your work." Why each decision, trade-offs, failures | 25, 26, 27 |
| Domain round (some companies) | Storage, OS, networks, Linux, DevOps, or AI depth | 06, 08, 11, 16–21 |
| Behavioural / HR | Ownership, conflict, failure, layoff explanation, salary | 27 |

**What "SDE 2" means to an interviewer:** you don't just solve the problem, you discuss **trade-offs**, you **own** things end to end, you handle **ambiguity**, and you can explain **why** the system is built the way it is. Every file in this folder trains that "why".

---

## The 20-day timeline

Plan for about **10 focused hours a day**. That's intense, but you have the time, and it's 20 days. If you get an interview call mid-plan, jump to the days for that company's rounds and come back.

### Every day follows this routine

| Time | Block | What to do |
|---|---|---|
| 07:30–10:00 | **DSA (2.5 h)** | The day's problems from [01_DSA.md](01_DSA.md). Try each for 25 min alone, then read the solution, then **re-code it from scratch**. |
| 10:15–13:15 | **Main topic, part 1 (3 h)** | Read the day's files slowly. Draw every diagram on paper. |
| 14:00–16:30 | **Main topic, part 2 (2.5 h)** | Finish the files. Explain each section **out loud** as if to an interviewer. |
| 16:30–17:30 | **Practice questions (1 h)** | Answer that day's questions in [28](28_Practice_Questions.md) out loud or in writing, without looking. Mark weak ones. |
| 17:30–18:30 | **Job applications (1 h)** | Don't stop applying while studying. Interviews take 1–3 weeks to arrive. Apply to 5–10 jobs a day plus 3 referral requests. |
| 21:00–21:30 | **Spaced revision (30 min)** | Read the "Quick revision" sections from **1 day ago, 3 days ago and 7 days ago**. This is what makes it stick. |

### Day by day

| Day | Main topic (files) | DSA of the day (file 01) | Done |
|---|---|---|---|
| **1** | 25 My Dell Experience · 27 "Tell me about yourself" | Arrays & Hashing | ☐ |
| **2** | 26 My AI Projects · 23 Chrome Extensions | Two Pointers · Sliding Window | ☐ |
| **3** | 03 Python · 05 OOP & SOLID (Part A) | Stack · Monotonic Stack | ☐ |
| **4** | 02 C and C++ | Binary Search | ☐ |
| **5** | 06 OS, Linux, Bash | Linked List | ☐ |
| **6** | 07 Multithreading & Concurrency | Trees (DFS/BFS) | ☐ |
| **7** | 08 Computer Networks · **Revision of Days 1–6 + mini-mock** | Trees II · Heaps | ☐ |
| **8** | 09 Databases (SQL, MySQL, PostgreSQL, MongoDB, Redis) | Heaps · Intervals | ☐ |
| **9** | 10 Elasticsearch/DuckDB/Arrow/Parquet · 11 Storage (first half) | Graphs: BFS/DFS | ☐ |
| **10** | 11 Storage (second half) · 12 Distributed Systems | Graphs: Topo sort, Union-Find | ☐ |
| **11** | 13 Kafka & RabbitMQ · 04 Scala/JVM/Spring Boot | Backtracking | ☐ |
| **12** | 15 Backend, REST, Microservices, FastAPI | DP 1D | ☐ |
| **13** | 14 System Design: framework + designs 1–5 | DP 2D | ☐ |
| **14** | 14 System Design: designs 6–11 · **Revision of Days 8–13 + mock** | Greedy | ☐ |
| **15** | 05 OOP Part B: Design Patterns + LLD problems | Tries · Strings | ☐ |
| **16** | 16 Docker & Kubernetes · 17 CI/CD, Git, Maven | Shortest path · Bit manipulation | ☐ |
| **17** | 18 Observability · 19 Security/DevSecOps · 24 Agile/SDLC | Mixed mediums (timed) | ☐ |
| **18** | 20 LLMs/OpenAI · 21 RAG/Agents/Evals/Guardrails · 22 AI tools | Mixed mediums (timed) | ☐ |
| **19** | **Full mock day** (see below) · fix weakest topics | Timed OA: 3 problems in 90 min | ☐ |
| **20** | All "Quick revision" sections · project pitches · 27 behavioural | Re-solve 10 problems you failed earlier | ☐ |

### Day 19: full mock day

Use the mock sets at the end of [28_Practice_Questions.md](28_Practice_Questions.md). Set a timer for each round:

- 09:00 DSA mock: 2 problems in 45 min, speaking out loud
- 11:00 LLD mock: 75 min, write runnable code
- 14:00 HLD mock: 45 min on a whiteboard or paper
- 16:00 Project deep dive: record yourself on your phone answering "walk me through your telemetry pipeline" and your extension, then watch it back
- 17:00 Behavioural: 8 stories out loud

Recording yourself is uncomfortable but it's the fastest way to fix rambling, "umm", and unclear explanations.

---

## Study method: how to actually learn this

1. **Understand, then compress.** After each section, write 3 bullet points from memory. If you can't, re-read.
2. **Explain out loud (Feynman method).** If you can't explain it simply, you don't know it yet. Interviews are spoken.
3. **Draw.** Every system, pipeline and data structure: draw it. Interviewers ask you to draw.
4. **Connect to yourself.** For every topic ask: "Where did I see this at Dell or in my extension?" Interviewers love "In my telemetry pipeline we hit exactly this…"
5. **Active recall beats re-reading.** The practice questions file matters more than reading twice.
6. **Spaced repetition.** Revise each topic on days +1, +3 and +7 (the 21:00 block).

## DSA method (the 25-minute rule)

1. Read the problem, then **restate it** and ask about edge cases (empty input, duplicates, negatives, huge sizes).
2. Say a brute force with its complexity, then optimise.
3. Name the **pattern** before coding (sliding window, BFS, DP…). File 01 teaches you to recognise patterns.
4. Code cleanly, using meaningful names and helper functions.
5. Dry-run a small example by hand. Then state time and space complexity.
6. Stuck for 25 minutes? Read the solution, understand it, close it, **re-code from scratch**, and mark it to redo in 3 days.

---

## Your story, in one place (memorise this)

**Tell me about yourself (90 seconds):**
> "I'm Gopal, a software engineer with a little over two years at Dell Technologies, plus an M.Tech in Computer Science from IIIT Bangalore.
>
> At Dell I worked on two very different systems. First, an enterprise telemetry data platform: a Scala pipeline on Kafka and RabbitMQ that processed log collections from Dell storage products within a 5-minute SLA. It converted them to Parquet, indexed metadata in Elasticsearch, stored files on Dell's ECS object store, and ran on Kubernetes with lag-based autoscaling and Grafana/Prometheus/Splunk monitoring.
>
> Then I moved to PowerScale OneFS, Dell's distributed scale-out NAS operating system, where I worked in C, C++ and Python. I stabilised Dynamic Licensing by resolving 20+ intermittent multi-node defects, and shipped three features end to end, including secure syslog forwarding and an uptime telemetry pipeline.
>
> I'm also deep into applied AI. Our team won Dell's Agentic AI Hackathon among 300+ teams, and after Dell I built and launched Smart Shopping Agent, an AI Chrome extension with a FastAPI backend, now live on the Chrome Web Store, with evals and guardrails behind every AI answer.
>
> I'm looking for a backend or SDE 2 role where I can work on distributed systems and production AI."

Details and the shorter and longer versions are in [27_Behavioral_HR.md](27_Behavioral_HR.md).

---

## Tracking progress

Copy this into a notes app and tick it each day:

```
Day __ | DSA solved: __/__ | Topic files done: __ | Practice Qs answered: __ | Applications sent: __ | Referral asks: __
Weak spots today:
1.
2.
```

## A word from your tutor

Three months after a layoff without an offer is hard, and it is **normal** in this market. It says nothing about your ability. Your profile is genuinely strong: distributed systems + storage + Kafka + Kubernetes + shipped AI is a rare combination. Most rejections at this stage come from three fixable things: **rusty DSA under time pressure, weak "why" answers in project rounds, and too few interviews in the pipeline**. This plan attacks all three. Keep applying every single day; studying without interviews doesn't produce offers.

You can do this. Start with Day 1 now.

# 28 · Practice Questions and Mock Interviews

**How to use this file:** in the daily **16:30 block**, answer that day's sections **out loud or in writing, without looking at the notes**. Then check yourself against the file in brackets. Mark each question:
✅ = could answer clearly · 🟡 = partly · ❌ = couldn't. Re-do the 🟡/❌ ones in the 21:00 revision block and again on Day 20.

Questions marked **⭐** are the most frequently asked. Questions marked **🧑‍💻** are about *your* experience: answer them with your real stories.

---

## Day 1 · My Dell experience (file 25) + intro (file 27)

1. ⭐🧑‍💻 Tell me about yourself (30 s, 90 s and 2 min versions).
2. ⭐🧑‍💻 Walk me through the telemetry data platform. Draw the architecture.
3. 🧑‍💻 What was the 5-minute SLA and how did it shape the design?
4. ⭐🧑‍💻 Why did you autoscale on consumer lag instead of CPU? What limits how far you can scale?
5. 🧑‍💻 How did you know you were meeting the SLA? What would you measure differently today?
6. 🧑‍💻 How did you handle duplicate collections? Why is idempotency a correctness requirement?
7. 🧑‍💻 How did you prioritise manual uploads in a Kafka-based system?
8. 🧑‍💻 What happens when a collection can't be processed (a poison message)?
9. 🧑‍💻 What would you change if you redesigned the platform today?
10. ⭐🧑‍💻 What is PowerScale OneFS? What makes it a *distributed* operating system?
11. 🧑‍💻 What's Dynamic Licensing, and why is it a CP problem?
12. ⭐🧑‍💻 Tell me about the hardest bug you've solved. (Cron overlap: full STAR + the four follow-ups.)
13. 🧑‍💻 How do you decide whether a test failure is a product bug, an automation bug or infrastructure?
14. 🧑‍💻 Explain the Python 2/3 interpreter bug in 60 seconds.
15. 🧑‍💻 Walk me through one feature you shipped end to end at OneFS.
16. 🧑‍💻 Why TLS over TCP for syslog forwarding instead of classic UDP syslog?
17. 🧑‍💻 Why alert on N consecutive job failures instead of every failure?
18. 🧑‍💻 Why gzip NDJSON for uptime telemetry, but Parquet on the telemetry platform?
19. 🧑‍💻 Why did OneFS choose FreeBSD rather than Linux?
20. 🧑‍💻 What did you learn moving from a data platform to an OS codebase?
21. 🧑‍💻 How did you benchmark DuckDB vs Arrow, and what did you recommend?
22. ⭐🧑‍💻 Why did you leave Dell? What have you done since?

## Day 2 · AI projects (file 26) + Chrome extensions (file 23)

1. ⭐🧑‍💻 Pitch Smart Shopping Agent in 30 seconds; then the 2-minute architecture.
2. ⭐🧑‍💻 What does "code computes, the model narrates" mean? Why?
3. 🧑‍💻 Walk me through the cross-store matching pipeline stage by stage.
4. ⭐🧑‍💻 How did you measure matching accuracy? Why 10 runs? What's the end-to-end recall test?
5. ⭐🧑‍💻 Tell me about a bug users found after launch and what you changed.
6. 🧑‍💻 How do you defend against prompt injection in scraped reviews?
7. 🧑‍💻 How do you control LLM cost? What's your cost per analysis?
8. 🧑‍💻 How do you protect the API without user accounts?
9. 🧑‍💻 Is your extension an agent? Why or why not?
10. 🧑‍💻 Why FastAPI? Why not LangChain?
11. 🧑‍💻 How would your extension work for 10 million users?
12. 🧑‍💻 Explain the Threat Modeling Workbench. What's STRIDE?
13. 🧑‍💻 Explain the Jira RCA Assistant. How did you evaluate it?
14. 🧑‍💻 Which of your projects is classic RAG, agentic RAG, an agent, a workflow?
15. 🧑‍💻 What exactly did *you* build in the hackathon vs your team?
16. Content script vs service worker vs side panel vs offscreen document: what runs where?
17. How do you keep state in an MV3 service worker that gets killed when idle?
18. How do you make scraping robust to site changes?
19. What's MV3 and what changed from MV2?
20. Why can't you put the OpenAI key in the extension?

## Day 3 · Python (file 03) + OOP/SOLID (file 05 Part A)

1. ⭐ Mutable vs immutable types; what happens when you pass a list to a function?
2. ⭐ The mutable default argument trap: explain and fix.
3. `is` vs `==`. Shallow vs deep copy.
4. How are `list` and `dict` implemented? Complexity of `in` for each?
5. ⭐ What's a generator? When would you use one? `yield` vs `return`.
6. ⭐ Write a decorator that retries a function with exponential backoff. Why `functools.wraps`?
7. Write a decorator that takes arguments.
8. What's a context manager? Write one with a class and with `@contextmanager`.
9. ⭐ What's the GIL? Threads vs processes vs asyncio: when do you use each?
10. Does the GIL make `x += 1` thread-safe? Why not?
11. What happens if you call `time.sleep()` inside `async def`?
12. How does Python manage memory? What can't reference counting free?
13. `@classmethod` vs `@staticmethod` vs `@property`.
14. What's the MRO? How does `super()` work with multiple inheritance?
15. Dataclasses vs Pydantic models vs plain classes.
16. pytest fixtures, parametrize and mocking: show an example.
17. ⭐ The four pillars of OOP with real examples.
18. Composition vs inheritance: why prefer composition?
19. ⭐ Explain each SOLID principle with an example. Which one is your cron decorator?
20. Interface vs abstract class.
21. What's the Liskov substitution principle? Give a violation.

## Day 4 · C and C++ (file 02)

1. ⭐ Memory layout of a process. Stack vs heap.
2. ⭐ The five classic memory bugs. How do you detect them?
3. Arrays vs pointers. Why does `sizeof` differ inside a function?
4. `const int*` vs `int* const`.
5. Write `strlen`, `strcpy`, reverse a string in place, and detect endianness.
6. `memcpy` vs `memmove`.
7. Struct padding: what's `sizeof(struct {char c; int i; char d;})` and why?
8. `static` (local vs global), `extern`, `volatile`. ⭐ Is `volatile` enough for thread safety?
9. Compilation stages. Static vs dynamic linking.
10. What's undefined behaviour? Give five examples.
11. ⭐ What's RAII? Why is it central to C++?
12. ⭐ `unique_ptr` vs `shared_ptr` vs `weak_ptr`. How do you break a reference cycle?
13. Rule of 0/3/5. Shallow vs deep copy.
14. ⭐ How do virtual functions work (vtable, vptr)? Why do you need a virtual destructor?
15. Object slicing. Overloading vs overriding.
16. Move semantics: what does `std::move` actually do? Why should move constructors be `noexcept`?
17. `map` vs `unordered_map`: internals and complexity.
18. Iterator invalidation in `vector`.
19. `new`/`delete` vs `malloc`/`free`.
20. The diamond problem and virtual inheritance.
21. Write a thread-safe counter with `std::mutex` and with `std::atomic`.

## Day 5 · OS, Linux, Bash (file 06)

1. ⭐ Process vs thread. Why is a process context switch more expensive?
2. What happens on `fork()`? What's copy-on-write? fork + exec.
3. Zombie vs orphan process.
4. Scheduling algorithms; what's starvation and how does aging fix it? What does Linux use?
5. ⭐ The four deadlock conditions; prevention vs avoidance vs detection.
6. ⭐ Virtual memory, paging, the TLB, page faults. What's thrashing?
7. Page replacement algorithms. Why is true LRU expensive?
8. ⭐ What's an inode? Hard link vs soft link.
9. ⭐ What does `fsync` do? Why do databases need it?
10. Why can a disk be full when `du` shows free space?
11. ⭐ select vs poll vs epoll. What's the C10K problem?
12. IPC mechanisms; which is fastest and why?
13. SIGTERM vs SIGKILL. What does Kubernetes send on pod shutdown?
14. What's load average? High load with low CPU usage means what?
15. ⭐ A service is slow on a Linux box: walk me through your investigation (commands).
16. How do you find which process is listening on port 8080?
17. Write a Bash one-liner: top 5 IPs in an access log.
18. Write a script that alerts when disk usage > 80%.
19. What does `set -euo pipefail` do? Why quote variables?
20. Cron syntax: what does `37 * * * *` mean?
21. Why is OneFS built on FreeBSD? kqueue vs epoll; jails vs containers.

## Day 6 · Multithreading (file 07)

1. ⭐ Concurrency vs parallelism.
2. ⭐ What's a race condition? Why is `count++` unsafe?
3. ⭐ Mutex vs semaphore.
4. Spinlock: when is it better than a mutex?
5. What's a condition variable? Why always wait in a `while` loop?
6. Deadlock vs livelock vs starvation. Priority inversion.
7. ⭐ Implement a bounded producer-consumer queue (C++ or Python).
8. ⭐ Print odd and even numbers alternately with two threads.
9. Dining philosophers: the deadlock and two fixes.
10. What's CAS? What's the ABA problem?
11. What's false sharing?
12. What's a memory barrier / happens-before?
13. How do you size a thread pool?
14. Async vs threads: trade-offs.
15. ⭐🧑‍💻 How did you debug an intermittent concurrency/timing issue?
16. Thread-safe singleton with double-checked locking.
17. How do distributed locks differ from in-process locks? What's a fencing token?

## Day 7 · Networks (file 08) + REVISION of Days 1–6

1. ⭐ OSI vs TCP/IP layers with protocols at each.
2. ⭐ TCP vs UDP with use cases.
3. ⭐ Explain the TCP 3-way handshake and 4-way termination. Why TIME_WAIT?
4. Flow control vs congestion control.
5. ⭐ What happens when you type a URL into the browser? (3 minutes)
6. ⭐ How does DNS resolution work? Record types; TTL trade-off.
7. HTTP/1.1 vs HTTP/2 vs HTTP/3.
8. ⭐ How does HTTPS/TLS work? Why both asymmetric and symmetric crypto?
9. 🧑‍💻 How do certificates and CAs work? Walk through your OpenSSL flow.
10. 401 vs 403; 502 vs 504; 429.
11. L4 vs L7 load balancing; load-balancing algorithms.
12. Reverse proxy vs forward proxy; CDN.
13. WebSockets vs SSE vs long polling.
14. NFS/SMB vs iSCSI/FC.
15. A service can't reach another service: how do you debug it?
**Mini-mock:** redo 5 starred questions from Days 1–6 that you marked 🟡/❌.

## Day 8 · Databases (file 09)

1. ⭐ ACID: how is each property implemented?
2. ⭐ Isolation levels and the anomalies each prevents.
3. What's MVCC and why does it improve concurrency?
4. Optimistic vs pessimistic locking; prevent a lost update three ways.
5. ⭐ Why B+ trees for indexes? Clustered vs secondary index in InnoDB.
6. ⭐ Composite index and the leftmost prefix rule. Covering index.
7. When does an index not help? How do you read EXPLAIN?
8. Normalisation forms; when would you denormalise?
9. ⭐ SQL: second highest salary; top earner per department; employees earning more than their manager; departments with no employees; delete duplicate rows.
10. ⭐ Window functions: ROW_NUMBER vs RANK vs DENSE_RANK; running total; LAG.
11. WHERE vs HAVING; logical query execution order.
12. `UNION` vs `UNION ALL`; `COUNT(*)` vs `COUNT(col)`; NULL pitfalls with `NOT IN`.
13. What's the N+1 query problem?
14. MySQL redo/undo/binlog; replication lag and read-after-write.
15. How would you scale a MySQL database step by step?
16. 🧑‍💻 Why PostgreSQL for OneFS uptime telemetry?
17. ⭐ SQL vs NoSQL: how do you choose?
18. MongoDB: embed vs reference; replica set elections; choosing a shard key.
19. ⭐ Redis use cases; cache-aside; cache stampede, penetration and hot keys.
20. Write-through vs write-back vs write-around caching.

## Day 9 · ES/DuckDB/Arrow/Parquet (file 10) + Storage first half (file 11)

1. ⭐ Row vs columnar storage; OLTP vs OLAP.
2. ⭐🧑‍💻 Why Parquet? Explain row groups, column chunks, predicate pushdown.
3. Parquet vs Avro vs JSON/NDJSON vs Arrow: when each?
4. 🧑‍💻 What's DuckDB? Why did views beat tables and Arrow in your benchmark?
5. What's Apache Arrow for (zero-copy)?
6. ⭐ How does an inverted index work? What's an analyser?
7. `text` vs `keyword` in Elasticsearch.
8. Why is Elasticsearch "near real-time"? What's a refresh?
9. Query context vs filter context; BM25.
10. Shards and replicas; why can't you change primary shard count?
11. 🧑‍💻 Why was ES your metadata index but not the source of truth?
12. ⭐ The storage latency hierarchy.
13. HDD vs SSD; what's write amplification? Wear levelling? TRIM?
14. IOPS vs throughput vs latency.
15. ⭐ Block vs file vs object storage, with examples and use cases.
16. NAS vs SAN vs DAS; scale-up vs scale-out.

## Day 10 · Storage second half (file 11) + Distributed systems (file 12)

1. ⭐ RAID 0/1/5/6/10; the RAID 5 write penalty; rebuild risk.
2. ⭐ Replication vs erasure coding: overhead and trade-offs.
3. How does OneFS protect data (N+M / +2d:1n)?
4. How do you detect silent data corruption?
5. ⭐ How do snapshots work (COW vs redirect-on-write)? Why isn't a snapshot a backup?
6. Sync vs async replication; RPO vs RTO.
7. How does deduplication work? Fixed vs variable chunking? Inline vs post-process?
8. Thin provisioning; tiering; write-back cache + NVRAM.
9. ⭐ S3: flat namespace, multipart upload, consistency model, versioning, pre-signed URLs.
10. 🧑‍💻 What is Dell ECS? Why did your Parquet files go to object storage?
11. B-tree vs LSM tree.
12. ⭐ CAP theorem with your licensing vs telemetry example. PACELC.
13. Consistency models; read-your-writes problem.
14. ⭐ Leader-follower vs leaderless replication; quorum W + R > N.
15. ⭐ Consistent hashing and virtual nodes.
16. ⭐ How does Raft elect a leader and replicate a log? Why odd cluster sizes?
17. Why can't you trust wall clocks? Lamport vs vector clocks.
18. ⭐ At-most/at-least/exactly-once; how do you get "effectively once"?
19. Circuit breaker, bulkhead, backpressure, retries with jitter.
20. 2PC vs saga; transactional outbox.

## Day 11 · Kafka & RabbitMQ (file 13) + Scala/JVM/Spring (file 04)

1. ⭐🧑‍💻 Kafka vs RabbitMQ: 30-second and 2-minute versions, with why you used both.
2. ⭐ Kafka topics, partitions, offsets, consumer groups.
3. ⭐ How does Kafka guarantee ordering?
4. What happens when a consumer dies? When a broker dies?
5. acks=all + min.insync.replicas: what do they guarantee?
6. Exactly-once semantics in Kafka: what's covered and what isn't.
7. Why is Kafka fast?
8. Retention vs log compaction; replay.
9. What's consumer lag? How did you use it?
10. Poison messages and DLQs in Kafka and RabbitMQ.
11. RabbitMQ exchanges (direct/topic/fanout/headers); prefetch; acks; publisher confirms; DLX.
12. How do you implement priority in Kafka?
13. What's the claim-check pattern?
14. Why Scala for a data pipeline? Case classes, pattern matching, Option.
15. Future vs Thread in Scala.
16. JVM memory areas and garbage collection; how does GC affect latency?
17. How does Java's HashMap work?
18. 🧑‍💻 What's Spring Boot? How did you fix transitive vulnerabilities in it?

## Day 12 · Backend, REST, microservices, FastAPI (file 15)

1. ⭐ REST principles. Safe vs idempotent methods.
2. ⭐ PUT vs PATCH vs POST. How do you make POST idempotent?
3. Offset vs cursor pagination.
4. API versioning strategies; how OneFS versions PAPI.
5. ⭐ AuthN vs AuthZ; sessions vs JWT; OAuth2 + OIDC.
6. 🧑‍💻 How does your extension's HMAC install token work?
7. REST vs gRPC vs GraphQL vs WebSocket vs SSE.
8. ⭐ Monolith vs microservices: trade-offs; when would you split?
9. API gateway, service discovery, circuit breaker, saga, outbox, CQRS.
10. What's the twelve-factor app?
11. ⭐ What is FastAPI? Why Starlette + Pydantic? `async def` vs `def`.
12. How does `Depends` work? Show an auth dependency.
13. How do you stream an LLM response in FastAPI?
14. How do you test FastAPI endpoints without calling OpenAI?
15. How do you run FastAPI in production?
16. The top API security risks (broken object-level authorisation, etc.).

## Day 13–14 · System design (file 14): do these as timed 35–45 min designs

1. ⭐ URL shortener.
2. ⭐ Distributed rate limiter.
3. Notification system.
4. ⭐ Chat system (WhatsApp).
5. ⭐ News feed (fan-out on write vs read).
6. ⭐🧑‍💻 Log/telemetry ingestion pipeline with a 5-minute SLA (your own system).
7. ⭐ Dropbox/Google Drive (chunking, dedup, sync).
8. ⭐ S3-like object store (storage companies).
9. Search autocomplete.
10. Distributed key-value store / cache.
11. Web crawler.
12. 🧑‍💻 Your extension at 10 M users (price tracker + LLM analysis).
13. Ticket booking with seat locking.
14. Distributed job scheduler (compare with the OneFS Job Engine).
**Follow-ups to practise on every design:** 10× traffic? A component dies? Hot key? Multi-region? How do you monitor it? How do you deploy safely?
**Day 14 mock:** pick 2 designs you haven't drawn yet; 40 minutes each, out loud, on paper.

## Day 15 · LLD and design patterns (file 05 Parts B–C)

1. ⭐ Code a parking lot (Strategy pricing, thread-safe parking).
2. ⭐ Code an LRU cache with a hash map + doubly linked list (thread-safe).
3. ⭐ Code a token-bucket rate limiter.
4. Design an elevator system (State + Strategy).
5. Design BookMyShow seat booking (seat locking with TTL).
6. Design Splitwise (split strategies, simplifying debts).
7. Design a logging framework (Chain of Responsibility).
8. Design a vending machine (State pattern).
9. Design an in-memory file system (Composite).
10. Singleton: implementation + why it's often an anti-pattern.
11. Factory vs Abstract Factory vs Builder.
12. Adapter vs Decorator vs Facade vs Proxy.
13. Strategy vs State; Observer; Template Method; Command.

## Day 16 · Docker & Kubernetes (file 16) + CI/CD, Git, Maven (file 17)

1. ⭐ Container vs VM. How do namespaces and cgroups work?
2. Image layers and build caching; multi-stage builds; best practices.
3. CMD vs ENTRYPOINT; COPY vs ADD; the PID 1 problem.
4. ⭐ Kubernetes architecture: what does each component do?
5. ⭐ What happens when you `kubectl apply` a Deployment?
6. Deployment vs StatefulSet vs DaemonSet vs Job.
7. Service types; how a Service finds pods; Ingress.
8. ⭐ Liveness vs readiness vs startup probes. A dangerous liveness probe example.
9. ⭐ Debug CrashLoopBackOff, ImagePullBackOff, Pending and OOMKilled.
10. Requests vs limits; QoS classes.
11. ⭐🧑‍💻 HPA vs KEDA: why did you use KEDA?
12. Rolling vs blue/green vs canary; graceful shutdown for queue consumers.
13. ⭐ Git merge vs rebase; reset vs revert; reflog; bisect; cherry-pick.
14. GitFlow vs trunk-based development.
15. ⭐ Design a CI/CD pipeline for a microservice. What gates would you add?
16. 🧑‍💻 How did you fix flaky tests in CI?
17. Jenkinsfile vs GitHub Actions vs GitLab CI.
18. 🧑‍💻 Explain your extension's GitHub Actions CI and release flow.
19. ⭐ Maven lifecycle, scopes, transitive dependencies and "nearest wins"; `dependency:tree`; BOM.

## Day 17 · Observability (18) + Security (19) + Agile/SDLC (24)

1. ⭐ Metrics vs logs vs traces; monitoring vs observability.
2. Golden signals; RED and USE.
3. ⭐ SLI vs SLO vs SLA; error budgets; burn-rate alerts.
4. Why percentiles instead of averages?
5. ⭐ Prometheus: pull model, metric types, cardinality. Write PromQL for error ratio and p99 latency.
6. Splunk architecture; write an SPL query that counts errors by service.
7. ELK stack components; Kubernetes logging pattern.
8. 🧑‍💻 How did you build the SLA dashboards? What alerts did you set?
9. ⭐ SAST vs SCA vs DAST vs container scanning, with tools.
10. ⭐🧑‍💻 How did you fix 50+ transitive vulnerabilities?
11. CVE and CVSS; how do you prioritise vulnerabilities?
12. ⭐ OWASP Top 10: explain five with fixes.
13. How do you prevent SQL injection, XSS and CSRF?
14. What's an SBOM? What's a supply-chain attack?
15. A secret was committed to Git: what do you do?
16. Hashing vs encryption vs encoding; how do you store passwords?
17. 🧑‍💻 What's STRIDE threat modelling?
18. ⭐ Agile values; Scrum roles, events and artifacts.
19. Story points vs hours; velocity; Definition of Done.
20. Requirements change mid-sprint: what happens?
21. SDLC models; secure SDLC.

## Day 18 · LLMs, RAG, agents, evals, guardrails, AI tools (files 20–22)

1. ⭐ What is an LLM, simply? What's a token and why should engineers care?
2. Explain self-attention at a high level.
3. Pretraining vs fine-tuning vs RLHF; what are reasoning models?
4. Temperature and top-p.
5. ⭐ Why do LLMs hallucinate? How do you reduce it?
6. What are embeddings? Cosine similarity?
7. ⭐ Prompting vs RAG vs fine-tuning: when each?
8. Prompt engineering techniques: give an example prompt you wrote.
9. ⭐ What are structured outputs? Function/tool calling?
10. How do you handle 429s and failures from an LLM API?
11. 🧑‍💻 How do you control LLM cost and latency?
12. ⭐ Explain RAG end to end. How do you choose the chunk size?
13. Dense vs sparse vs hybrid retrieval; reranking; HNSW.
14. ⭐ RAG failure modes and fixes.
15. ⭐ Workflow vs agent. Explain the agent loop (ReAct).
16. ⭐ What's MCP? Hosts/clients/servers; tools/resources/prompts.
17. What are skills/slash commands and why version-control prompts?
18. What's LangChain/LCEL/LangGraph? When would you not use them?
19. ⭐ How do you evaluate an LLM feature? Offline vs online; LLM-as-judge biases.
20. ⭐ Prompt injection (direct and indirect): mitigations; the "lethal trifecta".
21. OWASP LLM Top 10: name five.
22. 🧑‍💻 Do you use AI coding tools? How do you make sure AI code is correct and secure?
23. What's spec-driven development?
24. Will AI replace software engineers?

## Day 20 · Behavioural (file 27)

1. ⭐ Tell me about yourself.
2. ⭐ Why did you leave Dell / why the gap?
3. ⭐ Your most challenging problem.
4. ⭐ A failure or mistake and what you learned.
5. ⭐ A disagreement with a teammate or manager.
6. A time you used data to make a decision.
7. A time you went beyond your role.
8. A tight deadline.
9. A time you learned something quickly.
10. Critical feedback you received.
11. Strengths and a real weakness.
12. Why this company? Why should we hire you?
13. Where do you see yourself in 3–5 years?
14. Expected compensation? Notice period?
15. Your questions for us.

---

## Extra questions: the basics-to-advanced sections (do them on the same day as the file)

**DSA foundations and advanced (file 01)**

1. How does a hash table handle collisions? Chaining vs open addressing; what's the load factor?
2. Implement a queue using two stacks; a stack using queues.
3. Write iterative in-order and pre-order traversals.
4. Insert and delete in a BST (all three delete cases).
5. AVL vs red-black trees: why rotations? Where are red-black trees used?
6. Implement a min-heap's push and pop. Why is heapify O(n)?
7. Adjacency list vs matrix: when each?
8. Detect a cycle in a directed graph and in an undirected graph.
9. Apply the master theorem to merge sort and binary search.
10. 0/1 knapsack vs unbounded knapsack: the loop direction difference.
11. Explain KMP's LPS array. What's Rabin-Karp's rolling hash useful for?
12. Kruskal vs Prim; Dijkstra vs Bellman-Ford vs Floyd-Warshall.
13. When would you use a Fenwick tree or a segment tree?
14. Fast modular exponentiation; the sieve of Eratosthenes.
15. Why can't comparison sorting beat O(n log n)? How does counting sort avoid it?

**C/C++ basics and advanced (file 02)**

1. Data type sizes and `stdint.h`; signed vs unsigned overflow.
2. Call by value vs passing a pointer in C; write `swap`.
3. Allocate and free a dynamic 2D array in C.
4. Write a linked list (push, reverse, free) in C.
5. `fopen`/`fgets` vs `open`/`read`; what's `errno`?
6. The "goto cleanup" pattern: why is it used in C?
7. Public/protected/private inheritance: what becomes accessible?
8. The order of constructor and destructor calls with a base class and members.
9. Overload `+` and `<<` for a class.
10. Write a class template `Stack<T>`.
11. The erase-remove idiom; `lower_bound`; a min-heap `priority_queue`.
12. Exception-safety guarantees; what does `noexcept` buy you?
13. `std::optional` vs `std::variant`; Meyers' singleton; the PIMPL idiom.

**Python basics and advanced (file 03)**

1. Mutable vs immutable built-in types; why is `0.1 + 0.2 != 0.3`?
2. `/` vs `//`; chained comparisons; the walrus operator.
3. String slicing (reverse a string), f-string formatting.
4. Set operations; dict `get`/`setdefault`; unpacking with `*`.
5. What does `if __name__ == "__main__"` do? How do imports and `sys.modules` work?
6. Read a large file line by line; write JSON and CSV.
7. Write a regex to extract model numbers from text.
8. Descriptors: how does `@property` work?
9. `__init_subclass__` vs metaclasses for plugin registration.
10. asyncio: limit concurrency with a Semaphore; `gather` vs `TaskGroup`.
11. How do you profile slow Python code?
12. What's bytecode? CPython vs PyPy.

**Scala/Java/Spring (file 04)**

1. Primary vs auxiliary constructors; `val` vs `var` fields.
2. Currying and by-name parameters: write a `withRetry` helper.
3. Covariance (`+A`) vs contravariance (`-A`); upper/lower bounds.
4. Type classes with `given`/`using`.
5. Spark: transformations vs actions; what's a shuffle?
6. Checked vs unchecked exceptions in Java; try-with-resources.
7. Type erasure; PECS (`? extends` / `? super`).
8. Java Streams: group and count; records vs classes.
9. Class loaders; `ClassNotFoundException` vs `NoClassDefFoundError`.
10. Spring layers; `@Transactional` and why self-invocation bypasses it; JPA N+1; profiles.

**OOP/LLD (file 05)**

1. Upcasting vs downcasting; overloading vs overriding with code.
2. Coupling vs cohesion.
3. Write Factory, Builder, Adapter, Decorator, Observer, Command, State and Template Method.
4. Draw a UML class diagram for the parking lot (composition, inheritance, interfaces).
5. Code the elevator's SCAN logic; code seat locking with a TTL.

**OS/Linux/Bash (file 06)**

1. Types of OS; monolithic vs microkernel; type 1 vs type 2 hypervisors.
2. User-level vs kernel-level threads; one-to-one vs M:N.
3. Compute FCFS, SJF and RR (q=4) waiting times for P1=6, P2=8, P3=7, P4=3.
4. The three requirements of a critical-section solution; explain Peterson's solution.
5. Run the Banker's algorithm safety check on the example table.
6. Translate virtual address 0x3A7F with 4 KB pages (page 3 → frame 9).
7. Effective access time with a 90% TLB hit ratio.
8. FIFO/LRU/Optimal faults for `7 0 1 2 0 3 0 4 2 3 0 3 2` with 3 frames. What's Belady's anomaly?
9. Contiguous vs linked vs indexed allocation; draw an inode's pointers.
10. FCFS/SSTF/SCAN/C-SCAN head movement for the example queue (head 53).
11. DMA vs polling vs interrupts.
12. What's in `/etc`, `/var/log`, `/proc`? Explain `chmod 750` on a directory.
13. Write a systemd unit file for a Python service.
14. LVM: PV, VG, LV; growing a volume online.
15. Bash: `"$@"` vs `"$*"`; `${file##*/}`; `getopts`; exit code 137; `flock` in cron.

**Concurrency (file 07)**

1. The thread lifecycle; thread-local storage.
2. Write a read-write lock; reproduce and fix a deadlock.
3. Java: `BlockingQueue` producer-consumer; `CompletableFuture` chaining; virtual threads.
4. The actor model vs CSP channels vs shared memory with locks.
5. Amdahl's law: max speedup with a 90% parallel fraction?

**Networks (file 08)**

1. LAN/WAN; topologies; circuit vs packet switching.
2. Transmission vs propagation delay; bandwidth-delay product.
3. Subnet 192.168.10.0/26: hosts, mask, broadcast. Is .70 in the same subnet as .10?
4. IPv4 header fields: what do TTL and the protocol field do?
5. RIP vs OSPF vs BGP.
6. DHCP DORA; NAT vs PAT.
7. How does a switch learn MAC addresses? What's a VLAN?
8. CRC vs checksum; stop-and-wait vs Go-Back-N vs Selective Repeat.
9. TCP flags and connection states; what does lots of CLOSE_WAIT mean?
10. Stateful vs stateless firewalls; IPsec vs TLS VPN.
11. Cookies (HttpOnly/Secure/SameSite) and the CORS preflight.
12. Write a TCP echo server and client. Why does TCP need message framing?

**SQL/Databases (file 09)**

1. DDL vs DML vs DQL vs DCL vs TCL with two commands each.
2. Write CREATE TABLE with PK, FK (ON DELETE), UNIQUE, CHECK, DEFAULT.
3. ALTER: add/modify/drop a column; create/drop an index.
4. DELETE vs TRUNCATE vs DROP (rollback? triggers? identity reset?).
5. Upsert in MySQL and in PostgreSQL.
6. LIKE patterns; IN vs EXISTS; BETWEEN; IS NULL.
7. Conditional aggregation: SLA % per product with CASE.
8. Draw INNER/LEFT/RIGHT/FULL joins for the sample tables; write a self join.
9. Correlated subquery vs join; ANY/ALL; INTERSECT/EXCEPT.
10. Recursive CTE for an org chart.
11. Write a stored procedure, a function and an audit trigger.
12. GRANT/REVOKE; SAVEPOINT and ROLLBACK TO.
13. Super/candidate/primary/alternate/foreign keys.
14. Draw an ER diagram and map an M:N relationship to tables.
15. Normalise the order table from unnormalised to 3NF.
16. Relational algebra: σ, π, ⋈.
17. Query execution stages; why do stale statistics cause bad plans?
18. 2PL vs MVCC; ARIES redo/undo.
19. Range partitioning and partition pruning; ROLLUP/CUBE; p99 in SQL.
20. MongoDB: find with operators, update with `$set`/`$inc`/`$push`, upsert, TTL index, explain.
21. Redis: implement a sliding-window rate limit with sorted sets; why avoid `KEYS *`?

**Elasticsearch/DuckDB/Parquet (file 10)**

1. Create an index with mappings; bulk-index documents.
2. match vs match_phrase vs term; a bool query with must/filter/should/must_not.
3. A terms aggregation with nested percentiles and a date histogram.
4. Deep pagination: from/size vs search_after + PIT.
5. Object vs nested fields; aliases for zero-downtime reindexing.
6. DuckDB: query Parquet with Hive partitioning; view vs table; COPY TO Parquet.
7. PyArrow: write with zstd; read with column pruning and filters; partitioned datasets.

**Storage (file 11)**

1. Compute the rotational latency and approximate IOPS of a 7,200 RPM disk.
2. SLC/MLC/TLC/QLC; DWPD; SATA vs SAS vs NVMe.
3. Rebuild a lost RAID 5 block with XOR; usable capacity of 6 × 4 TB in RAID 5/6/10.
4. Erasure coding repair cost vs replication; what are LRCs?
5. LUN, zoning, masking, multipathing.
6. ext4 vs XFS vs ZFS vs OneFS.
7. NFSv3 vs NFSv4; SMB3 features; multi-protocol permission challenges.
8. HCI vs SDS; Ceph's RADOS, OSDs, monitors and CRUSH.
9. Write a fio command for 4K random reads; what do you look at?
10. Full vs incremental vs differential vs synthetic full backups.

**Distributed systems (file 12)**

1. Crash vs Byzantine faults; 2f+1 vs 3f+1.
2. The Two Generals problem and why exactly-once delivery is impossible.
3. Phi-accrual detection; SWIM gossip; leases.
4. Paxos phases.
5. ZooKeeper leader election with ephemeral sequential znodes.
6. Work through the vector clock example; what does "concurrent" mean?
7. Implement a G-counter CRDT; OT vs CRDT.
8. Implement consistent hashing, a Bloom filter, retry with jitter, a circuit breaker, an idempotent consumer.
9. MapReduce word count: what's a combiner?

**Kafka/RabbitMQ (file 13)**

1. Segments, indexes, LEO and high watermark: why do consumers read only up to the HW?
2. Write a Kafka producer (idempotent) and a consumer (manual commit + DLQ).
3. Key producer/consumer configs; cooperative-sticky assignment; static membership.
4. CLI: create a topic, describe groups (lag), reset offsets to a timestamp.
5. Kafka Connect vs Kafka Streams; KStream vs KTable; Schema Registry compatibility.
6. RabbitMQ: connection vs channel; vhosts; quorum queues; write a pika publisher and consumer with acks, nack and a DLX; the RPC pattern.

**System design (file 14)**

1. Do the full Twitter estimation.
2. Use the database decision guide for: payments, chat messages, product search, metrics.
3. Design a payment system with a double-entry ledger and idempotency.
4. Design video streaming (transcoding + adaptive bitrate + CDN).
5. Design ride sharing (geospatial index + matching).
6. Design Google Docs collaboration; design a distributed job scheduler.

**Backend/FastAPI (file 15)**

1. Walk through the request lifecycle; web server vs app server.
2. Layered vs hexagonal architecture.
3. SQLAlchemy models + a query; zero-downtime migrations (expand/contract).
4. JWT anatomy; HS256 vs RS256; the OAuth Authorization Code + PKCE flow.
5. Write a protobuf service; a GraphQL query; verify a webhook signature.
6. FastAPI: routers, a `yield` dependency for DB sessions, settings, middleware, an exception handler, OAuth2 bearer, WebSocket, tests with dependency overrides.

**Docker/Kubernetes (file 16)**

1. dockerd → containerd → runc; image vs container; OCI.
2. Every Dockerfile instruction; `docker run` resource limits and restart policies.
3. Write a docker-compose.yml with a DB health check.
4. Write the Deployment + Service + Ingress + ConfigMap + Secret + HPA YAML from memory.
5. PVC access modes; a CronJob with `concurrencyPolicy: Forbid`; RBAC Role/RoleBinding; NetworkPolicy.
6. Init containers vs sidecars; the Kubernetes networking model; CNI; CoreDNS.
7. CRDs and operators; admission webhooks; Helm chart structure and commands; drain vs cordon.

**CI/CD/Git/Maven (file 17)**

1. Resolve a merge conflict; `restore` vs `reset`; `--force-with-lease`.
2. Semantic versioning: which part changes for a bug fix vs a breaking change?
3. Jenkins credentials, triggers, shared libraries, Kubernetes agents.
4. GitHub Actions: environments, concurrency, OIDC, reusable workflows; why pin actions to a SHA.
5. GitLab: include/extends, protected variables, environments.
6. Write a pom.xml with dependencyManagement and exclusions; surefire vs failsafe; SNAPSHOT vs release; settings.xml.
7. Terraform plan/apply/state; DORA metrics.

**Observability (file 18)**

1. Instrument a service with a counter, a histogram and a gauge; compute SLA compliance from buckets.
2. Write a prometheus.yml with Kubernetes service discovery; a recording rule; Alertmanager routing + inhibition.
3. Error budget for 99.9% over 30 days; what's a burn rate of 14.4?
4. LogQL, SPL (eval/stats/top/transaction/lookup), KQL examples.
5. Logstash grok + date filter; a Filebeat config; an ILM policy.
6. Add OpenTelemetry spans per pipeline stage.

**Security (file 19)**

1. Show vulnerable and fixed code for SQLi, command injection, path traversal, XSS, IDOR.
2. AES-GCM vs HMAC vs argon2: when each? Why `compare_digest`?
3. Envelope encryption with a KMS.
4. Security headers: what do HSTS and CSP prevent?
5. Run snyk, sonar-scanner, trivy, gitleaks and ZAP baseline: what does each find?
6. A SonarQube quality gate on new code; the finding-triage workflow.
7. MIT vs Apache-2.0 vs GPL vs AGPL.
8. Kubernetes and cloud security controls.

**LLMs/OpenAI (file 20)**

1. AI vs ML vs DL vs GenAI; supervised vs unsupervised vs self-supervised vs RL.
2. Explain forward pass, loss, backpropagation and gradient descent.
3. Overfitting and its fixes; train/validation/test; data leakage.
4. Precision vs recall vs F1. Which did your extension prioritise and why?
5. Word2vec → RNN → transformer: what problem did each step solve?
6. The attention formula; BERT vs GPT vs T5; MoE.
7. Full fine-tuning vs LoRA vs QLoRA; quantisation; TTFT.
8. Zero-shot, few-shot, CoT, self-consistency, ReAct.
9. Write embeddings + cosine search; a full tool-calling loop; streaming; error handling; token counting.

**RAG/Agents/Evals (file 21)**

1. Build a minimal RAG system (chunk, embed, retrieve, generate with citations).
2. How does HNSW search work? Which parameters trade recall vs speed?
3. Choose a vector store for: an existing Postgres app; hybrid search; a prototype.
4. Implement recall@k and MRR.
5. Write an LLM-as-judge faithfulness prompt; how do you calibrate it?
6. Write a minimal MCP server with a tool and a resource.
7. Build a LangGraph agent with a tool loop; what does a checkpointer add?
8. Implement output guardrails with schema validation, number checks and a fallback.

**AI tools (file 22) · Chrome extensions (file 23) · Agile/SDLC (file 24)**

1. How does fill-in-the-middle completion work? Why do tests make agents better?
2. Write a CLAUDE.md, a permissions allow/deny list and a formatting hook.
3. Write a good vs a bad prompt for a coding agent.
4. What's slopsquatting?
5. Write content-script ↔ side-panel messaging; alarms + an offscreen DOM parser.
6. "Receiving end does not exist": cause and fix.
7. Chrome Web Store single-purpose and Limited Use policies.
8. Functional vs non-functional requirements; PRD vs design doc.
9. Unit vs integration vs system vs UAT vs regression vs smoke vs sanity.
10. Boundary-value analysis for 1–10; TDD red-green-refactor.
11. Severity vs priority; the defect life cycle; the four maintenance types.
12. Lead time vs cycle time; three-point estimation.

---

## Mock interview sets (Day 7, Day 14 and Day 19)

**Set A: DSA (45 min, out loud)**

1. 3Sum (LC 15) → then: "what if the array is a stream?"
2. LRU cache (LC 146) without OrderedDict.

**Set B: DSA (45 min)**

1. Course Schedule II (LC 210).
2. Coin Change (LC 322) → then: print one optimal combination.

**Set C: DSA (45 min)**

1. Minimum Window Substring (LC 76).
2. Merge k Sorted Lists (LC 23) → complexity with a heap vs divide and conquer.

**Set D: LLD (75 min)**
Parking lot with multiple floors, EV spots, hourly/weekend pricing, multiple gates. Runnable code + concurrency + extensibility discussion.

**Set E: HLD (45 min)**
"Design a system that ingests diagnostic bundles from 1 million storage devices a day and makes them searchable within 5 minutes." (Your home ground: lead it.)

**Set F: HLD (45 min)**
"Design an S3-compatible object store" or "Design Dropbox."

**Set G: Project deep dive (30 min, hiring-manager style)**

- Walk me through your most complex system. Why these technologies? What broke? What would you change?
- Then the extension: how do you know it's accurate? How does it scale? What's the cost?

**Set H: Domain round, storage/OS (30 min)**
Block vs file vs object · RAID vs erasure coding · snapshots · fsync and durability · inodes · page cache · epoll · what OneFS does when a node fails.

**Set I: Domain round, DevOps (30 min)**
Debug a CrashLoopBackOff · design a CI/CD pipeline with security gates · KEDA vs HPA · Prometheus alert for an SLA · Docker image best practices.

**Set J: Domain round, AI engineer (30 min)**
Design a RAG assistant over Confluence for 5,000 engineers (permissions, freshness, evals, cost) · prompt injection defences · how you'd evaluate it before launch · workflow vs agent.

**Set K: Behavioural (30 min)**
Tell me about yourself · hardest bug · failure · conflict · why leaving · why us · questions for them.

**After every mock:** write down three things that went well and three to fix. Re-study the fixes the same day.

---

## Final-week self-test (score yourself 1–5)

| Area | Score | Area | Score |
|---|---|---|---|
| DSA mediums in 25 min | | Kafka/RabbitMQ depth | |
| LLD runnable code | | Storage fundamentals | |
| HLD (lead a 45-min design) | | Docker/K8s debugging | |
| My Dell projects (why answers) | | CI/CD + security scanning | |
| My AI projects (numbers + design) | | LLM/RAG/agents/evals | |
| OS + concurrency | | Behavioural stories | |
| Networks | | SQL queries | |

Anything below 3 → spend Day 19 afternoon and Day 20 morning on it.

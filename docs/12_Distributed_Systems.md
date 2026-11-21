# 12 · Distributed Systems

**Why distributed systems exist:** one machine eventually runs out of CPU, memory, disk or network, and it's a **single point of failure**. Spreading work across many machines gives **scale** and **fault tolerance**, but introduces the hard problems: **partial failure, unreliable networks, no global clock, and keeping copies consistent.**

**Why you're credible here:** OneFS is a distributed OS (many nodes, one filesystem, consensus-backed configuration, a lock-holder node, cluster-wide jobs). The telemetry platform was a distributed pipeline (Kafka/RabbitMQ consumers, at-least-once delivery, idempotent processing, autoscaling on lag, a 5-minute SLA). You've seen **both** a CP-style system (licensing state must agree on every node) and an AP-style one (telemetry tolerates delay).

---

## Start here: distributed systems in plain words

**What it is:** many computers working together and looking like **one system** to the user: Google Search, WhatsApp, a Kafka cluster, a OneFS cluster.
**Analogy:** a company with offices in five cities that must act as one company, communicating only by **post**. Letters can be delayed, lost or arrive out of order, an office can burn down, and nobody's wall clock shows exactly the same time. Getting everyone to agree on "the current customer balance" is suddenly hard.

### Why we distribute anyway

1. **Scale:** one machine can't hold all the data or serve all the users.
2. **Availability:** if one machine dies, others keep serving.
3. **Latency:** put servers near users (India, US, EU).

### The five core ideas, in pictures
```
1. REPLICATION: copies of the same data (survive failures, serve more reads)
      Leader ──changes──► Follower 1
             ──changes──► Follower 2        Hard part: keeping copies in sync, and choosing a new leader

2. PARTITIONING / SHARDING: split the data (scale beyond one machine)
      users A–H → node 1   users I–P → node 2   users Q–Z → node 3      Hard part: hot spots, rebalancing

3. CONSENSUS: agree on one value/leader despite failures (Raft, Paxos)
      node A: "I propose X" → B: "OK" → C: "OK" → majority (2 of 3) → X is decided       Hard part: failures mid-vote

4. CONSISTENCY MODELS: what a reader is guaranteed to see
      strong: always the latest write          eventual: copies converge "soon"; you may read old data briefly

5. FAILURE HANDLING: timeouts, retries, idempotency, circuit breakers
      "No reply" could mean: the request was lost, the server is slow, the server died, or the REPLY was lost
```

### CAP in plain words
When the network between two data centres breaks (a **partition**), each side must choose:

- **Consistency:** refuse requests it can't be sure are correct ("sorry, try later"). Banks, licence state (OneFS).
- **Availability:** answer anyway with possibly old data and fix it later. Social media likes, telemetry metrics.
You can't have both during a partition. Partitions are unavoidable, so every distributed system makes this choice.

### A typical distributed system, end to end
```
 Users ─► DNS/CDN ─► Load balancers ─► stateless services (many copies)
                                          │        │            │
                                          ▼        ▼            ▼
                                   Cache cluster  Message log    Database cluster
                                   (Redis)        (Kafka)        (replicated + sharded)
                                                     │
                                                     ▼
                                             async workers ─► object storage / search index
 Coordination (leader election, config): etcd / ZooKeeper     Observability: metrics, logs, traces
```

## 1. The fallacies of distributed computing (why it's hard)
Engineers wrongly assume: the network is reliable; latency is zero; bandwidth is infinite; the network is secure; topology doesn't change; there's one administrator; transport cost is zero; the network is homogeneous.
**Consequences:** every remote call needs a **timeout**, **retries with backoff**, **idempotency**, and a plan for **partial failure** (the request may have succeeded even though you got no response).

## 2. Scaling basics

- **Vertical scaling (scale up):** a bigger machine. Simple, but has a ceiling and is a single point of failure.
- **Horizontal scaling (scale out):** more machines. Needs **stateless** services (state lives in DBs/caches) plus load balancing, partitioning and replication.
- **Stateless vs stateful:** stateless services are easy to scale and replace. Stateful ones (databases, brokers, OneFS nodes) need replication, partitioning and careful failover.

## 3. CAP theorem (and say it correctly)
In the presence of a **network Partition**, a distributed data system must choose between **Consistency** (every read sees the latest write, i.e. linearisable) and **Availability** (every request to a working node gets a non-error response).

- Partitions *will* happen, so the real choice is **CP vs AP during a partition**.
- **CP:** refuse or stall some requests to stay consistent (ZooKeeper, etcd, HBase, consensus-based configuration stores; **OneFS licensing state via GConfig**).
- **AP:** keep answering, possibly with stale data, and reconcile later (Cassandra, DynamoDB default settings, DNS, **telemetry metrics**).

**PACELC (the more complete version):** if **P**artition → choose **A** or **C**; **E**lse (normal operation) → choose **L**atency or **C**onsistency. Even without failures, stronger consistency costs latency (coordination, quorum round trips).

**Your CAP answer (memorise it):**
> "CAP is a design choice per system, not trivia. Dynamic Licensing in OneFS is a CP problem: every node must agree on which features are licensed, because a feature working on one node and failing on another is worse than it being briefly unavailable. So licensing state lives in a strongly consistent, cluster-wide config store. The telemetry platform was the opposite: a metric arriving a few seconds late is fine, so we favoured availability and throughput with eventual consistency."

## 4. Consistency models (strongest to weakest)

| Model | Guarantee | Example |
|---|---|---|
| **Linearisable (strong)** | Behaves like a single copy; a read sees the latest completed write in real time | etcd, ZooKeeper (writes), Spanner |
| Sequential | Everyone sees the same order, not necessarily real time | |
| **Causal** | Causally related operations are seen in order (a reply after its post) | some geo-replicated databases |
| Read-your-writes | You always see your own updates | session stickiness; read from the primary after a write |
| Monotonic reads | You never see time go backwards | pin to a replica |
| **Eventual** | If writes stop, replicas converge eventually | DNS, Cassandra (low consistency levels), S3 before 2020 |

**Read-after-write problem with replicas:** a user updates their profile, the next read hits a lagging replica, and the old value appears. Fixes: read from the primary for a short time after a write, use version tokens, or use sticky sessions.

## 5. Replication

- **Single-leader (primary/replica):** all writes go to the leader; it streams changes to followers. Simple; the leader can be a bottleneck; failover is needed (MySQL, PostgreSQL, MongoDB, Kafka partitions).
  - **Synchronous** (durable, slower) vs **asynchronous** (fast, may lose recent writes on failover, replica lag).
- **Multi-leader:** several regions accept writes, so **write conflicts** must be resolved (last-write-wins loses data; CRDTs; application merge).
- **Leaderless (Dynamo-style):** clients write to several replicas and read from several. **Quorum: W + R > N** ensures read and write sets overlap. Repair with **read repair** and **anti-entropy** (Merkle trees). Cassandra, DynamoDB, Riak.
  - Example: N=3, W=2, R=2 → tolerates 1 node down for both reads and writes.
- **Split brain:** two nodes both think they're the leader → conflicting writes. Prevent with **majority quorums** (need ⌊N/2⌋+1 votes, so use odd cluster sizes: 3, 5) and **fencing tokens**.

## 6. Partitioning (sharding)

- **Range partitioning:** by key ranges (A–F, G–M…). Good for range scans; risk of **hotspots** (all of today's timestamps land on one shard).
- **Hash partitioning:** `hash(key) % N`. Even spread; range queries scatter. But **changing N remaps almost every key** →
- **Consistent hashing:** nodes and keys sit on a hash ring; a key goes to the next node clockwise. Adding or removing a node moves only about **1/N of the keys**. **Virtual nodes** (each physical node owns many points) even out the load. Used by Dynamo, Cassandra, Riak, load balancers and caches.
- **Hot keys/partitions:** a celebrity user, or one huge customer. Mitigate with key salting (split into sub-keys), caching or dedicated shards.
- **Rebalancing:** move partitions when nodes join or leave. OneFS's Job Engine rebalances data after a node is added; Kafka reassigns partitions.
- **Secondary indexes on sharded data:** local (per shard; queries scatter-gather) vs global (a separate partitioned index; writes get more complex).

## 7. Consensus: Raft and Paxos
**Problem:** get several nodes to **agree on a value or a log of commands** despite crashes and message delays. Used for leader election, configuration stores, distributed locks and metadata.

**Raft (designed to be understandable):**

1. **Roles:** leader, follower, candidate. Time is divided into **terms**.
2. **Leader election:** a follower that hears no heartbeat within a randomised **election timeout** becomes a candidate, increments the term and requests votes. A **majority** vote makes it leader. Randomised timeouts avoid split votes.
3. **Log replication:** clients send commands to the leader → it appends to its log → replicates to followers → once a **majority** has stored the entry, it's **committed** and applied to the state machine.
4. **Safety:** a candidate can only win if its log is at least as up to date as a majority's, so committed entries are never lost.
5. With 5 nodes it tolerates 2 failures; with 3 nodes, 1. **Majority = progress; without a majority the cluster stops accepting writes (CP).**

**Paxos:** the older, harder-to-understand algorithm with the same goal (Chubby; variants in many systems). **ZAB** is ZooKeeper's protocol.
**Where consensus lives:** **etcd** (Kubernetes' brain), **ZooKeeper** (old Kafka, Hadoop), **KRaft** (Kafka's own Raft-based metadata quorum, replacing ZooKeeper), Consul, and **GConfig in OneFS** plays the same role ("what etcd is to Kubernetes").

**FLP impossibility (bonus):** in a fully asynchronous network with even one faulty process, no deterministic algorithm can guarantee consensus terminates. That's why real systems use **timeouts** (partial synchrony).

## 8. Time and ordering

- **No global clock:** machine clocks drift; NTP corrects them roughly (milliseconds), and clocks can even jump backwards. **Never rely on wall-clock time to order events across machines.**
- **Lamport clocks:** a counter incremented on each event and taken as max(local, received)+1 on messages. Gives an order consistent with causality.
- **Vector clocks:** one counter per node; can tell whether two events are **concurrent** (conflict detection: Dynamo, Riak).
- **Hybrid logical clocks** (CockroachDB) and **TrueTime** (Spanner, using GPS + atomic clocks with bounded uncertainty).
- **Monotonic clocks** (`time.monotonic()`) for measuring durations; wall clock only for display.

## 9. Delivery semantics and idempotency (core for your pipeline work)

| Semantics | Meaning | How |
|---|---|---|
| At-most-once | Never duplicated, may be lost | Commit/ack before processing |
| **At-least-once** | Never lost, **may be duplicated** | Process, then ack/commit (the common default for Kafka/RabbitMQ consumers) |
| Exactly-once | Effectively once | At-least-once + **idempotent processing** or transactions (Kafka transactions + idempotent producer, within Kafka) |

**Idempotency:** applying an operation twice has the same effect as once.

- Use **idempotency keys** (a request ID stored with the result; a repeat returns the stored result). Payment APIs do this.
- **Upserts** keyed by a natural ID instead of blind inserts.
- **Dedup tables** (processed message IDs, with a TTL).
- State checks: "if status == PROCESSED, skip."

> **Your line:** "At-least-once delivery means duplicates are guaranteed, not possible. So the consumer must be idempotent; that's a correctness requirement, not an optimisation. On the telemetry platform we deduplicated collections using a status field, so a redelivered collection wasn't processed and published twice."

## 10. Failure handling patterns

- **Timeouts** on every remote call (no timeout = threads hang forever).
- **Retries with exponential backoff + jitter:** `delay = base × 2^attempt + random`. Jitter prevents synchronised retry storms. **Only retry idempotent operations** (or use idempotency keys). Cap the attempts.
- **Circuit breaker:** after repeated failures, stop calling the failing dependency for a while (open), then trial a few calls (half-open), then resume (closed). Prevents cascading failures and gives the dependency time to recover.
- **Bulkhead:** isolate resources (separate thread pools or connection pools per dependency) so one slow dependency can't exhaust everything.
- **Fallbacks / graceful degradation:** serve cached or default data, or partial results. *(Your extension falls back to a template when the LLM output fails validation.)*
- **Dead-letter queue (DLQ):** after N failed attempts, move the "poison" message aside so it doesn't block the queue (**head-of-line blocking**) and alert on it.
- **Backpressure:** when consumers can't keep up, slow the producers (bounded queues, rate limits, rejecting with 429/503) instead of buffering until out of memory.
- **Load shedding / admission control:** under overload, drop low-priority work deliberately.
- **Health checks and heartbeats:** detect dead nodes (but a slow node looks the same as a dead one, so use timeouts carefully).

## 11. Leader election and distributed locks

- **Leader election** so only one node runs a job: via a consensus store (etcd/ZooKeeper leases), Kubernetes Lease objects, or a database row with expiry.
  OneFS runs the cluster-wide telemetry daemon only on the **lock-holder node**; otherwise every node would collect and upload the same cluster-wide statistics.
- **Distributed lock pitfalls:** the holder can pause (GC, VM freeze, network) beyond its lease, while another node acquires the lock, so two "owners" exist. **Fencing token:** the lock service hands out an increasing number; the storage rejects writes with an older token.
- **Redis locks** (`SET key val NX PX ttl`) are fine for efficiency (avoiding duplicate work) but debated for correctness-critical mutual exclusion.

## 12. Distributed transactions

- **Two-phase commit (2PC):** a coordinator asks all participants to **prepare** (vote) → if all say yes, **commit**; otherwise abort. Problems: blocking if the coordinator dies after prepare, extra latency, poor availability. Used inside databases and XA, rarely across microservices.
- **Saga pattern:** a sequence of **local transactions**, each with a **compensating action** (book a flight → book a hotel → if the hotel fails, cancel the flight). **Choreography** (services react to events) vs **orchestration** (a central coordinator). Gives eventual consistency.
- **Transactional outbox:** write the business change **and** an "event to publish" row in the **same local DB transaction**; a relay process publishes the outbox rows to Kafka. Solves the **dual-write problem** (DB updated but the event lost, or the reverse).
- **Change data capture (CDC):** stream DB changes from the log (Debezium reading the binlog/WAL into Kafka).

## 13. Observability of distributed systems (bridge to file 18)

- **Metrics** (is it healthy?), **logs** (what happened to this request?), **traces** (where did the latency go across services?).
- **Correlation/trace IDs** passed through every hop.
- **SLIs/SLOs:** e.g. "99% of collections processed within 5 minutes", measured on rolling windows (your Grafana SLA dashboards).

## 14. Classic patterns and systems to name-drop correctly

- **Event sourcing:** store events as the source of truth; derive state by replaying them.
- **CQRS:** separate write and read models.
- **MapReduce / Spark:** distributed batch processing with data locality.
- **Gossip protocols:** nodes spread membership/state info epidemically (Cassandra, Consul).
- **Merkle trees:** efficiently find which data differs between replicas (anti-entropy, Git, blockchains).
- **Bloom filters:** "definitely not present / maybe present" with tiny memory (LSM trees, cache penetration).
- **Heartbeats + leases:** failure detection and time-bounded ownership.

---

## Distributed systems course map (everything in this file)
```
Why & what: scaling · availability · latency · the 8 fallacies · system & failure models (crash, omission, Byzantine; sync/async)
Communication: RPC · messaging · delivery semantics · idempotency · timeouts · retries
Time & order: physical clocks & NTP · Lamport clocks · vector clocks · hybrid logical clocks · snapshots (Chandy-Lamport)
Data: replication (leader, multi-leader, leaderless/quorum) · partitioning (range, hash, consistent hashing) · rebalancing
Consistency: CAP · PACELC · linearisability → sequential → causal → read-your-writes → eventual · CRDTs
Agreement: consensus (Paxos, Raft, ZAB) · leader election · distributed locks & leases & fencing · coordination services (ZooKeeper, etcd)
Transactions: 2PC · sagas · outbox · CDC · event sourcing · CQRS
Failure handling: failure detection (heartbeats, phi-accrual, gossip/SWIM) · circuit breakers · bulkheads · backpressure · load shedding
Structures: consistent hashing · Bloom filters · Merkle trees · LSM trees
Processing: MapReduce · stream processing · batch vs stream
```

## 15. Foundations: system models and failure types

- **Failure types:** **crash-stop** (a node dies and stays dead), **crash-recovery** (dies and comes back, possibly with stale state), **omission** (messages lost), **timing** (too slow), **Byzantine** (arbitrary or malicious behaviour: lying, corrupting data).
- **Timing models:** synchronous (known bounds on delays), **asynchronous** (no bounds: the realistic one), **partially synchronous** (usually bounded: what real systems assume).
- **Two Generals problem:** two parties communicating over an unreliable channel can **never** be certain they agree (every acknowledgement needs its own acknowledgement). That's why "exactly-once delivery" over a network is impossible in general, and why we design for idempotency instead.
- **Byzantine Generals / BFT:** tolerating f malicious nodes needs **3f + 1** nodes (PBFT, blockchains). Most datacentre systems assume crash faults only, needing **2f + 1** nodes for f failures (Raft/Paxos majorities).

## 16. Failure detection

- **Heartbeats + timeouts:** simple; a timeout too short gives false positives (GC pauses look like death), too long gives slow failover.
- **Phi-accrual failure detector** (Cassandra, Akka): outputs a *suspicion level* based on the heartbeat arrival history, instead of a binary dead/alive.
- **Gossip-based membership** (SWIM protocol): nodes probe random peers and spread membership changes epidemically; scales to thousands of nodes.
- **Leases:** time-bounded ownership ("you're the leader for the next 10 s unless you renew"). Lease holders must stop acting before the lease expires (allowing for clock drift).

## 17. Paxos in brief (Raft is in section 7)
Roles: proposers, acceptors, learners.

1. **Prepare:** a proposer picks proposal number n and asks a majority of acceptors to promise not to accept anything numbered lower.
2. **Promise:** acceptors promise, and report any value they've already accepted.
3. **Accept:** the proposer sends (n, v), where v is the highest-numbered previously accepted value (or its own value if none).
4. **Accepted:** once a majority accepts, the value is **chosen**; learners are told.
**Multi-Paxos** elects a stable leader to skip phase 1 for later values, which is very similar to Raft in practice.

## 18. ZooKeeper (and etcd) as coordination services

- A replicated, strongly consistent hierarchical key-value store (znodes like a filesystem: `/services/api/node-1`).
- **Ephemeral znodes** disappear when the client's session dies → live membership and **leader election**.
- **Sequential znodes** get increasing suffixes → fair locks and queues.
- **Watches** notify clients of changes.
- **Leader election recipe:** each candidate creates an ephemeral sequential znode under `/election`; the lowest number is the leader; every other node watches the node just before its own (avoids a herd effect); when the leader dies, its znode vanishes and the next one takes over.
- **etcd** (Raft-based; Kubernetes' store) provides the same building blocks with leases, watches and transactions. Kafka moved from ZooKeeper to its built-in KRaft quorum.

## 19. Ordering examples
**Vector clocks (worked example)**, three nodes A, B, C:

```
A: event a1          → A=[1,0,0]
A sends m to B       → A=[2,0,0], m carries [2,0,0]
B: local event b1    → B=[0,1,0]
B receives m         → B = max([0,1,0],[2,0,0]) + B's own tick = [2,2,0]
C: event c1          → C=[0,0,1]
Compare [2,2,0] vs [0,0,1]: neither is ≤ the other in every position → CONCURRENT (a conflict to resolve)
Compare [2,0,0] vs [2,2,0]: the first ≤ the second everywhere → the first HAPPENED BEFORE the second
```

**Distributed snapshot (Chandy-Lamport):** take a consistent global snapshot of a running system without stopping it, by sending **marker** messages along every channel. Flink's checkpoints use a variant of this.

## 20. CRDTs (conflict-free replicated data types)
Data structures that replicas can update independently and **merge automatically** without conflicts (the merge is commutative, associative and idempotent). Used in collaborative editing, multi-region counters, shopping carts.

```python
class GCounter:                         # grow-only counter: one slot per replica
    def __init__(self, replica_id, n): self.id, self.counts = replica_id, [0] * n
    def increment(self): self.counts[self.id] += 1
    def value(self): return sum(self.counts)
    def merge(self, other): self.counts = [max(a, b) for a, b in zip(self.counts, other.counts)]
```

Others: PN-counter (increments and decrements), OR-set (add/remove sets), LWW-register (last write wins), sequence CRDTs for text (Yjs, Automerge). Google Docs uses **operational transformation (OT)** instead.

## 21. Code for the core building blocks

**Consistent hashing with virtual nodes:**

```python
import bisect, hashlib
class ConsistentHashRing:
    def __init__(self, nodes=(), vnodes=100):
        self.vnodes, self.ring, self.keys = vnodes, {}, []
        for n in nodes: self.add(n)
    def _h(self, s): return int(hashlib.md5(s.encode()).hexdigest(), 16)
    def add(self, node):
        for i in range(self.vnodes):
            h = self._h(f"{node}#{i}"); self.ring[h] = node; bisect.insort(self.keys, h)
    def remove(self, node):
        for i in range(self.vnodes):
            h = self._h(f"{node}#{i}"); del self.ring[h]; self.keys.remove(h)
    def get(self, key):
        h = self._h(key); i = bisect.bisect(self.keys, h) % len(self.keys)   # next point clockwise
        return self.ring[self.keys[i]]
```
```
          node-A#3
     ●───────────────●  node-C#1
   ╱                   ╲
  ●  key "user42" ──►   ● node-B#7   (the key goes to the next node clockwise)
   ╲                   ╱
     ●───────────────●
          node-B#2
```

**Bloom filter** ("definitely not present" or "maybe present"; no false negatives):

```python
class BloomFilter:
    def __init__(self, m=10_000, k=4): self.m, self.k, self.bits = m, k, bytearray(m)
    def _idx(self, item):
        for i in range(self.k):
            yield int(hashlib.sha256(f"{i}:{item}".encode()).hexdigest(), 16) % self.m
    def add(self, item):
        for i in self._idx(item): self.bits[i] = 1
    def might_contain(self, item): return all(self.bits[i] for i in self._idx(item))
```

False-positive rate ≈ (1 − e^(−kn/m))^k. Used in LSM trees (skip SSTables), caches (block cache-penetration attacks), crawlers (seen URLs).

**Merkle tree** (find differing data with few comparisons: anti-entropy between replicas, Git, blockchains):

```
            root = H(H12 + H34)
           /                  \
     H12 = H(H1+H2)       H34 = H(H3+H4)
      /      \             /       \
    H1        H2         H3         H4      ← hashes of data blocks
If two replicas' roots match → identical. If not, descend only into the subtrees whose hashes differ.
```

**Retry with exponential backoff + full jitter:**

```python
import random, time
def call_with_retry(fn, attempts=5, base=0.2, cap=10.0, retry_on=(TimeoutError, ConnectionError)):
    for i in range(attempts):
        try:
            return fn()
        except retry_on:
            if i == attempts - 1: raise
            time.sleep(random.uniform(0, min(cap, base * 2 ** i)))   # full jitter spreads out retries
```

**Circuit breaker:**

```python
class CircuitBreaker:
    def __init__(self, threshold=5, reset_after=30):
        self.threshold, self.reset_after = threshold, reset_after
        self.failures, self.state, self.opened_at = 0, "CLOSED", 0.0
    def call(self, fn, *a, **kw):
        if self.state == "OPEN":
            if time.time() - self.opened_at < self.reset_after:
                raise RuntimeError("circuit open: failing fast")
            self.state = "HALF_OPEN"                     # let a trial request through
        try:
            result = fn(*a, **kw)
        except Exception:
            self.failures += 1
            if self.state == "HALF_OPEN" or self.failures >= self.threshold:
                self.state, self.opened_at = "OPEN", time.time()
            raise
        self.failures, self.state = 0, "CLOSED"
        return result
```
```
CLOSED ──(failures ≥ threshold)──► OPEN ──(timeout)──► HALF_OPEN ──success──► CLOSED
                                     ▲                     │
                                     └──────failure────────┘
```

**Idempotent consumer (dedup by message ID, with a database unique constraint):**

```python
def handle(msg, db):
    try:
        with db.transaction():
            db.execute("INSERT INTO processed_messages(id) VALUES (%s)", (msg.id,))   # unique → fails on a duplicate
            apply_business_change(db, msg)                                             # same transaction
    except UniqueViolation:
        pass                                                                           # already processed: safe to ack
```

**MapReduce word count (the classic model behind Hadoop/Spark):**

```
map(doc)         → emit (word, 1) for each word
shuffle/sort     → group all values by word (across the network)
reduce(word, [1,1,1…]) → emit (word, sum)
```

Data locality (run map tasks where the data blocks live), combiners (pre-aggregate locally to shrink the shuffle), and re-running failed tasks (deterministic tasks make that safe).

## 22. Rate limiting and load management across a cluster
Centralised counters (Redis), local token buckets with periodic syncing, or per-node limits = global ÷ N. Plus **admission control** (reject early when queues are full), **load shedding by priority**, and **queue-based load levelling** (absorb bursts in a queue; consumers process at a steady rate: exactly your telemetry pipeline).

## Interview Q&A

**Q: Explain CAP with an example from your work.** (The licensing vs telemetry answer above.)
**Q: How does Raft elect a leader?** Election timeout → candidate → majority vote in a new term → heartbeats keep followers.
**Q: Why odd numbers of nodes?** A majority of 3 is 2 and of 4 is 3. Going from 3 to 4 adds cost without adding fault tolerance (both tolerate 1 failure).
**Q: How do you achieve exactly-once processing?** You don't, end to end, in general. You get at-least-once delivery plus idempotent consumers, or transactions within one system (Kafka EOS).
**Q: What's consistent hashing and why use it?** A ring + virtual nodes; adding or removing nodes moves only ~1/N of the keys.
**Q: How do you handle a slow downstream dependency?** Timeouts, circuit breaker, bulkhead, backpressure, fallback, and don't scale consumers into a saturated dependency (it makes things worse).
**Q: Saga vs 2PC?** 2PC is atomic but blocking and tightly coupled. A saga is eventually consistent with compensations; it scales across services.
**Q: How do you order events across machines?** Not with wall clocks. Use logical clocks or sequence numbers from a single partition/leader (Kafka orders within a partition).

## Quick revision

- Fallacies → timeouts, retries + jitter, idempotency.
- CAP → CP vs AP during a partition; PACELC adds the latency vs consistency trade-off. Your licensing (CP) vs telemetry (AP) example.
- Consistency models; read-your-writes problem.
- Replication: leader/follower, multi-leader, leaderless quorum W+R>N; split brain → majority + fencing.
- Partitioning: range vs hash vs consistent hashing (virtual nodes); hot keys.
- Raft: terms, election timeout, majority, log replication. etcd/ZooKeeper/KRaft/GConfig.
- Clocks: no global time; Lamport/vector clocks.
- At-least-once + idempotency; DLQ; circuit breaker; bulkhead; backpressure; load shedding.
- 2PC vs saga; outbox; CDC.

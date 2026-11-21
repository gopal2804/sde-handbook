# 14 · System Design (HLD)

**What the round tests:** can you take a vague prompt ("design WhatsApp"), drive the conversation, make reasonable **trade-offs**, and produce a design that scales and survives failures, while explaining **why**? At SDE 2 **you lead**: the interviewer should mostly listen and ask "what if…".

**Your unfair advantage:** you operated a real distributed pipeline with an SLA (telemetry), worked inside a distributed storage OS (OneFS), and shipped a production AI backend with cost controls (your extension). **Whenever a design touches ingestion, queues, object storage, search indexes, autoscaling or observability, use your real experience.**

> Day 13: Parts 1–3 + designs 1–5. Day 14: designs 6–12.

---

## Start here: system design in plain words

**What it is:** deciding **which big pieces** a software system needs (services, databases, caches, queues, storage), **how they connect**, and **why**, so it works for millions of users, survives failures, and stays affordable.
**Analogy:** designing a **city's infrastructure**, not a single house. Roads (networks), traffic lights (load balancers), warehouses (databases), corner shops (caches), postal service (queues), power backup (replication), and city planning for growth (scaling).

### The standard building blocks, assembled
```
                               ┌──────────┐
 Users (web/mobile) ──► DNS ──►│   CDN    │ static files, images, video served from edge locations
                               └────┬─────┘
                                    ▼
                         ┌────────────────────┐
                         │ Load balancer      │ spreads traffic, health checks, TLS
                         └─────────┬──────────┘
                                   ▼
                         ┌────────────────────┐
                         │ API gateway        │ auth, rate limiting, routing
                         └───┬───────┬────────┘
                ┌────────────┘       └─────────────┐
                ▼                                  ▼
       ┌────────────────┐                 ┌────────────────┐
       │ Service A      │ (many stateless │ Service B      │
       │ (users/orders) │  copies)        │ (search/feed)  │
       └──┬───────┬─────┘                 └──┬──────┬──────┘
          │       │ publish events            │      │
          ▼       ▼                           ▼      ▼
     ┌────────┐ ┌───────────────┐       ┌────────┐ ┌──────────────┐
     │ Cache  │ │ Queue / log   │──────►│ Workers│ │ Search index │
     │ (Redis)│ │ (Kafka/Rabbit)│       │ (async)│ │ (Elastic)    │
     └────────┘ └───────────────┘       └───┬────┘ └──────────────┘
          │                                 ▼
          ▼                          ┌──────────────┐
     ┌──────────────────────┐        │ Object store │ (files, media, Parquet)
     │ Database (primary +  │        └──────────────┘
     │ replicas; shards)    │
     └──────────────────────┘
 Cross-cutting: monitoring (metrics/logs/traces), config/secrets, CI/CD, security
```

### The questions every design answers

1. **What must it do?** (features) and **how well?** (users, latency, availability, consistency, cost)
2. **Where does the data live, and in what shape?** (SQL vs NoSQL vs object store vs search)
3. **How does it handle 10× traffic?** (stateless scale-out, caching, sharding, async queues)
4. **What happens when something breaks?** (replicas, retries, failover, graceful degradation)
5. **How do we know it's healthy?** (metrics, alerts, SLOs)

### Scaling, step by step (the story interviewers like to hear)
```
1 server (app + DB) → separate DB server → add a load balancer + several app servers (stateless)
→ add a cache → add DB read replicas → move static files to a CDN/object store
→ add queues for slow work → split into services → shard the database → multi-region
```

## System design course map (HLD here, LLD in file 05)
```
Fundamentals: requirements (functional/non-functional) · estimation · latency vs throughput · availability & nines · reliability · scalability
Building blocks: DNS · CDN · load balancers · reverse proxies · API gateways · app servers · caches · SQL/NoSQL · object storage
                 · search · queues/logs · stream processors · batch/analytics · coordination · ID generation · rate limiters
Data: modelling · choosing a database · replication · partitioning · consistency choices · indexing · caching strategies
Communication: REST/gRPC/GraphQL · sync vs async · webhooks · WebSockets/SSE · event-driven architecture
Reliability: redundancy · failover · retries/idempotency · circuit breakers · backpressure · graceful degradation · disaster recovery (RPO/RTO)
Operations: observability · deployment strategies · capacity planning · cost
Security: authN/authZ · encryption · secrets · rate limiting · DDoS protection
Practice: the 45-minute framework · 18 worked designs · deep-dive checklist · writing design docs
```

### Fundamentals in plain words

- **Latency** = how long one request takes (ms). **Throughput** = how many requests per second the system handles. A highway analogy: latency is how long one car takes to drive the route; throughput is how many cars pass per hour.
- **Availability** = the fraction of time the system works. Series components multiply (A and B both needed at 99.9% → 99.8%); **redundant** components improve it (two independent 99% replicas, either one enough → 1 − 0.01² = 99.99%).
- **Reliability** = it does the right thing (correct results, no data loss), not just "it's up".
- **Scalability** = handling more load by adding resources: **vertical** (bigger machine) or **horizontal** (more machines).
- **Disaster recovery tiers:** backup & restore (hours) → pilot light → warm standby → active-active multi-region (seconds), each costing more.

### Writing a design document (how real teams do system design)

1. **Context and problem**, 2. **Goals and non-goals**, 3. **Requirements** (functional, scale, SLOs), 4. **Proposed design** (diagrams, APIs, data model, flows), 5. **Alternatives considered** and why they were rejected, 6. **Failure modes and mitigations**, 7. **Security and privacy**, 8. **Rollout plan** (migration, feature flags, rollback), 9. **Monitoring** (metrics, alerts), 10. **Open questions**. Reviewers comment before anyone writes code.

## Part 1: The framework (45-minute round)

| Step | Time | What you do |
|---|---|---|
| 1. **Requirements** | 5 min | Functional (the 3–5 core features; say what's out of scope). Non-functional: scale, latency, availability vs consistency, durability, cost. **Ask questions.** |
| 2. **Estimates** | 3–5 min | Users, QPS (avg + peak), storage per day/year, bandwidth. Only to drive decisions ("this is write-heavy, so…"). |
| 3. **API** | 3 min | The main endpoints (REST) or events. |
| 4. **Data model** | 5 min | Entities, keys, which database and **why**. Access patterns drive the choice. |
| 5. **High-level design** | 10 min | Boxes: clients → LB/API gateway → services → cache → DB/queue/object store. Walk through the main flows. |
| 6. **Deep dives** | 15 min | The 2–3 hardest parts: scaling the hot path, consistency, failure handling, bottlenecks. Often the interviewer picks. |
| 7. **Wrap up** | 2 min | Bottlenecks, monitoring/alerts, what you'd do next, trade-offs you made. |

**Phrases that signal seniority:** "The trade-off here is…", "This is read-heavy (100:1), so I'll optimise reads with…", "For this data I'd accept eventual consistency because…", "The failure mode is…, so we add…", "I'd measure p99 latency and consumer lag, and alert on…".

## Part 2: Back-of-the-envelope cheat sheet

- 1 day ≈ **86,400 s ≈ 10⁵ s**. 1 month ≈ 2.5 × 10⁶ s.
- 1 million requests/day ≈ **12 QPS** average. Peak ≈ 2–5× average.
- 100 M DAU × 10 requests/day = 10⁹/day ≈ 12K QPS average.
- Sizes: char = 1 byte, int64 = 8 bytes, UUID = 16 bytes, a tweet-sized row ≈ 300 bytes–1 KB, an image ≈ 200 KB–2 MB, a minute of HD video ≈ 50–100 MB.
- Powers: 10³ KB, 10⁶ MB, 10⁹ GB, 10¹² TB, 10¹⁵ PB.
- **Latency numbers:** memory ~100 ns; SSD read ~100 µs; same-datacentre round trip ~0.5 ms; HDD seek ~10 ms; cross-continent ~150 ms.
- **Rough capacities:** one app server ≈ 1–10K simple requests/s; one well-indexed SQL DB ≈ thousands to ~10K+ simple queries/s; Redis ≈ 100K+ ops/s per node; one Kafka partition ≈ tens of MB/s.
- **Availability:** 99.9% ≈ 8.8 h downtime/year; 99.99% ≈ 53 min/year. Components in series multiply (0.999 × 0.999 = 0.998).

## Part 3: Building blocks (what each solves)

| Block | Solves | Notes |
|---|---|---|
| DNS + CDN | Locating services; serving static content near users | |
| Load balancer (L4/L7) | Spreading traffic, health checks, TLS termination | file 08 |
| API gateway | Auth, rate limiting, routing, request validation | file 15 |
| Stateless app servers | Horizontal scale | keep state out |
| Cache (Redis) | Fast reads, lower DB load | cache-aside, TTL, stampede protection (file 09) |
| SQL database | Transactions, relations, strong consistency | replicas for reads, sharding for writes |
| NoSQL (Cassandra/DynamoDB) | Massive writes, simple access patterns | partition key design |
| Object storage (S3/ECS) | Large blobs: images, video, files, Parquet | pre-signed URLs; metadata elsewhere |
| Search index (Elasticsearch) | Full-text search, flexible filters, aggregations | not the source of truth |
| Message queue / log (Kafka/RabbitMQ) | Async work, decoupling, buffering, fan-out | file 13 |
| Stream processing (Flink/Kafka Streams) | Real-time aggregation | |
| Batch / analytics (Spark, DuckDB, warehouse) | Reports, ML features | |
| Coordination (etcd/ZooKeeper) | Leader election, config, locks | file 12 |
| Observability stack | Metrics, logs, traces, alerts | file 18 |
| Rate limiter | Protect from abuse and overload | token bucket in Redis |
| ID generator | Unique IDs at scale | Snowflake: timestamp + machine ID + sequence (64-bit, time-sortable) |

---

## Part 4: Designs

### Design 1: URL shortener (TinyURL), the warm-up classic
**Requirements:** shorten a long URL → short code; redirect; optional custom alias and expiry; analytics optional. Read-heavy (100:1). Low latency on redirects. Highly available.
**Estimates:** 100 M new URLs/month ≈ 40 writes/s; reads ≈ 4K/s average. 5 years ≈ 6 B URLs × ~500 B ≈ 3 TB.
**API:** `POST /api/urls {longUrl, alias?, expiresAt?} → {shortUrl}`; `GET /{code} → 301/302 redirect`.
**Code generation:**

- Base62 (a–z, A–Z, 0–9): 7 characters → 62⁷ ≈ 3.5 trillion combinations.
- Option A: **counter/ID + Base62 encode** (unique, no collisions; needs a distributed ID generator or ranges handed out per server; codes are guessable/sequential).
- Option B: **hash (MD5/SHA) of the URL, take 7 chars**; collisions → check and retry with a salt.
- Option C: a **pre-generated key service** (keys generated offline, handed out in batches).
**Storage:** a key-value lookup `code → longUrl` (DynamoDB/Cassandra or a sharded SQL table). Cache hot codes in Redis (a small share of URLs gets most traffic).
**301 vs 302:** 301 (permanent) lets browsers cache it (less load, but you lose analytics); 302 means every click hits you (analytics).
**Deep dives:** cache hit ratio, sharding by code, analytics events → Kafka → aggregation, abuse/spam filtering, expiry cleanup.

### Design 2: Distributed rate limiter
**Requirements:** limit requests per user/API key/IP (e.g. 100/min); low latency (<1 ms overhead); works across many API servers; returns 429 with `Retry-After`.
**Algorithm:** token bucket (allows bursts) or sliding window counter (smooth). Details in file 05.
**Where:** API gateway or middleware; **state in Redis** shared by all servers.
**Atomicity:** read-modify-write must be atomic → a **Redis Lua script** (or `INCR` + `EXPIRE` for fixed windows; sorted sets for sliding logs).
**Failure mode:** if Redis is down → **fail open** (allow; availability) or **fail closed** (deny; protection). Decide per API.
**Scale:** shard Redis by key; a local in-memory pre-limit for hot keys; multi-region → per-region limits.
**Your example:** the Smart Shopping Agent backend enforces per-install daily limits (e.g. 150 product matches/day) plus a **monthly spend cap** on OpenAI, because for LLM APIs the scarce resource is **money**, not just CPU.

### Design 3: Notification system (email/SMS/push)
**Requirements:** send notifications from many services; channels with user preferences; templates; scheduling; retries; no duplicates; millions per day.
**Flow:** services → **Notification API** (validate, apply preferences and rate limits, render the template) → **Kafka/RabbitMQ topic per channel** → **channel workers** (email via SES/SendGrid, SMS via Twilio, push via APNs/FCM) → status store + delivery events.
**Key points:** idempotency keys (no double sends on retry); retries with backoff → DLQ; per-user rate limits and quiet hours; priority queues (OTP > marketing); a template service; tracking (delivered, opened); vendor failover.

### Design 4: Chat system (WhatsApp)
**Requirements:** 1:1 and group chat, online/last-seen, delivery receipts (sent/delivered/read), history, offline delivery, media. Low latency.
**Connections:** clients hold a persistent **WebSocket** to a **chat gateway**. A **session service** (Redis: `userId → gatewayId`) knows where each user is connected.
**Send flow:** A → gateway → chat service → **persist** the message (Cassandra/HBase: partition by `conversationId`, cluster by `messageId`/time) → look up B's gateway → push. B offline → store it + a push notification; deliver on reconnect.
**Ordering:** per-conversation sequence numbers (assigned by the server, or Snowflake IDs); clients reorder by them.
**Groups:** fan-out on write for small groups; large groups → fan-out via a queue.
**Receipts:** acks travel back as messages. **Presence:** heartbeats with a TTL in Redis; fan out presence lazily (only to contacts viewing the user).
**Media:** upload to object storage via a **pre-signed URL**; the message carries a reference (claim check). End-to-end encryption (Signal protocol) means the server stores only ciphertext.

### Design 5: News feed (Twitter/Instagram)
**Requirements:** post; follow; home feed sorted by time or rank; read-heavy; feed latency < 200 ms.
**Fan-out on write (push):** when a user posts, insert the post ID into every follower's feed cache (Redis lists). Fast reads; expensive for celebrities with millions of followers.
**Fan-out on read (pull):** build the feed at read time from the followees' recent posts. Cheap writes, slow reads.
**Hybrid (the real answer):** push for normal users; **pull for celebrities** at read time and merge.
**Storage:** posts in a DB/NoSQL; media in object storage + CDN; the social graph in a DB or graph store; feed caches in Redis (the latest ~500 IDs per user).
**Ranking:** a candidate generation → ranking model → filtering pipeline. Pagination with a **cursor** (last seen ID), not an offset.

### Design 6: Telemetry / log ingestion pipeline ⭐ (YOUR OWN SYSTEM: lead with it)
**Prompt variants:** "Design a log ingestion system", "Design a metrics pipeline", "Design a system that processes device uploads within an SLA".
**Requirements:** millions of devices upload log bundles (MBs each); process each within 5 minutes; parse many formats; store for analytics; searchable metadata; downstream consumers; observability; handle bursts.
**Estimates (practise saying this):** 1 M collections/day ≈ 12/s average, ~36/s peak. At 60 s processing time → concurrency ≈ 36 × 60 ≈ **2,200 in-flight**. At 50 MB raw each → 50 TB/day ingested; Parquet output at ~10% → ~5 TB/day.
**Architecture:**

```
Devices ──HTTPS──► Upload service (auth, pre-signed URL to object storage)
                         │ event {systemId, path}
                         ▼
                  Kafka "collection-received" (partitioned by systemId)
                         ▼
             Processor workers (Kubernetes, autoscaled on LAG via KEDA)
               download → extract → parse (per-product plugin) → transform
                         │
     ┌───────────────────┼───────────────────────┐
     ▼                   ▼                       ▼
 Object store        Elasticsearch          Kafka "collection-meta"
 (Parquet output)    (metadata index)       (downstream consumers)
                         │
              Metrics → Prometheus → Grafana SLA dashboards; logs → Splunk/ELK; alerts
Failures: retry with backoff → DLQ → alert. Priority: separate topic for manual uploads.
```

**Deep dives you can own:**

- **Why autoscale on lag, not CPU** (I/O-bound workers; CPU stays flat while the backlog grows); cap replicas at the partition count; cooldown to stop flapping.
- **Idempotency:** at-least-once delivery → dedup by collection ID/status.
- **Per-stage latency budgets** (download, extract, parse, write, publish) so an SLA breach is debuggable; measure **p99**, not the mean.
- **Claim check:** blobs in object storage, pointers in messages.
- **Backpressure:** if the object store slows down, more consumers make it worse → detect the downstream saturation, shed low-priority work, use admission control.
- **Extensibility:** new product line = a new parser plugin (Strategy pattern).
- **What you'd add:** distributed tracing (a known gap), schema registry, per-tenant fairness.

### Design 7: File storage and sync (Dropbox / Google Drive)
**Requirements:** upload/download, sync across devices, versioning, sharing, large files, resume interrupted uploads.
**Key ideas:**

- **Chunking:** split files into ~4 MB blocks, hash each (SHA-256) → upload **only changed chunks** (delta sync) → **dedup** identical chunks across users.
- **Metadata service** (SQL: files, versions, chunk lists, permissions) separate from the **block store** (object storage).
- **Upload:** the client asks for the chunks the server lacks → uploads them via pre-signed URLs → commits a new file version (an atomic metadata update).
- **Sync:** a notification service (long polling/WebSocket) tells other devices "file X changed to version N" → they fetch the metadata + missing chunks.
- **Conflicts:** two offline edits → keep both ("conflicted copy") or merge.
- Your storage background: talk about dedup, checksums, versioning (like snapshots), and metadata vs data separation.

### Design 8: Object storage service (S3-like) ⭐ storage companies
**Requirements:** PUT/GET/DELETE/LIST objects in buckets; 11 nines durability; very large scale; objects from bytes to TBs.
**Architecture:**

- **API/front-end layer:** auth, request routing.
- **Metadata service:** bucket + key → object metadata + **data placement** (which nodes hold which fragments). Partitioned (by a hash of bucket+key), replicated with consensus. Needs ordered listing by prefix (so range-partitioned or a separate index).
- **Data nodes:** store the fragments. **Erasure coding** (e.g. 10+4) across nodes/racks/AZs for durability at ~1.4× overhead; replication for small objects.
- **PUT flow:** stream data → split + encode → write fragments to placement nodes → write metadata **last** (an object only becomes visible after its data is durable; this gives read-after-write consistency).
- **Large objects:** multipart upload (parallel parts, then complete).
- **Integrity:** checksums per fragment, background scrubbing + repair; garbage collection of orphaned fragments.
- **Durability math talking points:** independent failure domains (disk, node, rack, AZ), fast repair (shorter repair time → lower chance of overlapping failures).
- Mention Dell ECS (your experience) and OneFS's erasure coding.

### Design 9: Search autocomplete (typeahead)
**Requirements:** top 5–10 suggestions per prefix in < 100 ms, ranked by popularity, updated periodically.
**Data structure:** a **trie** where each node stores the **top-K completions** for that prefix (precomputed), so a lookup is O(prefix length).
**Pipeline:** query logs → batch/stream aggregation (counts per query, time-decayed) → build tries → serve from memory (sharded by prefix) → CDN/browser caching for popular prefixes.
**Extras:** debounce on the client, personalisation, filtering offensive terms, multi-language support.

### Design 10: Distributed key-value store / cache (Dynamo-style)
**Requirements:** `get(key)`, `put(key, value)`; high availability; tunable consistency; scales horizontally.
**Design:** **consistent hashing** with virtual nodes for partitioning → replicate to N successors → **quorum** reads/writes (W + R > N for strong-ish consistency) → **hinted handoff** (temporarily store writes for a down node) → **read repair** + **Merkle-tree anti-entropy** → **vector clocks** or last-write-wins for conflicts → **gossip** for membership/failure detection. Storage engine: an **LSM tree** (memtable + WAL + SSTables + compaction + Bloom filters).
**For a cache (Redis-like):** in-memory, eviction (LRU/LFU), TTL, replication for failover, client-side consistent hashing or cluster hash slots.

### Design 11: Web crawler
**Flow:** seed URLs → **URL frontier** (priority + **politeness**: per-host queues and delays; respect robots.txt) → fetchers (async, distributed) → DNS cache → parse → extract links → **dedup URLs** (Bloom filter / hash set) → dedup content (fingerprints like SimHash) → store pages (object store) → index.
**Scale:** partition the frontier by host hash so one worker owns one host (politeness becomes easy); checkpoint state; handle traps (infinite calendars) with depth limits.

### Design 12: Price tracker / AI shopping assistant at scale (YOUR extension, scaled up)
**Prompt:** "How would your extension work for 10 million users?"
**Today:** the extension parses pages client-side; prices are stored locally in `chrome.storage.local`; a background alarm re-checks watched products; a FastAPI backend (on Render) calls OpenAI with per-install tokens, daily limits and a monthly spend cap.
**At scale:**

- **Shared price service:** dedupe watched products across users (many users watch the same phone) → **one** scheduled fetch per product, not per user → a time-series store of price history (TimescaleDB/Cassandra) → **price-change events on Kafka** → a notification service fans out to watchers.
- **LLM layer:** **cache** analyses per product + review-set hash (most users view popular products → a high hit rate); a queue for expensive analyses; model routing (a cheap model for simple tasks); per-user quotas; a **budget circuit breaker**; evals in CI before model changes.
- **Scraping robustness:** canary checks per site layout (a daily health check), fallback parsers (JSON-LD → page state → DOM), alerts on extraction failure rates.
- **Privacy:** keep personal data client-side; send only canonical product URLs and review text.
- **Trade-off to state:** "Client-side parsing avoids server-side scraping costs and blocks, but layout changes break all clients at once, so you need fast update rollout and server-side monitoring."

### More designs to sketch if time allows
Ride sharing (Uber: geo-indexing with geohash/quadtree, matching, location updates via WebSocket), video streaming (YouTube: upload → transcode pipeline → adaptive bitrate (HLS/DASH) segments → CDN), ticket booking (seat locking with a TTL, payment saga, prevent double booking), payment system (idempotency keys, double-entry ledger, reconciliation, exactly-once via idempotency), metrics monitoring system (Prometheus-like: pull scrapes, TSDB, downsampling, alerting), distributed job scheduler (leader election, durable job store, at-least-once execution + idempotent jobs: compare with the **OneFS Job Engine**).

---

## Part 4b: Worked details, diagrams and more designs

### A full estimation, worked (Twitter-like service)
```
DAU = 200 M; each user posts 0.5 tweets/day and reads 100 tweets/day
Writes: 200M × 0.5 = 100M/day ÷ 10⁵ s ≈ 1,000 writes/s (peak ~3,000)
Reads:  200M × 100 = 20B/day ÷ 10⁵ ≈ 200,000 reads/s → read-heavy (200:1) → cache feeds, fan-out
Storage: 100M tweets × 300 B ≈ 30 GB/day text → ~11 TB/year (+ replicas)
Media: 10% of tweets have a 500 KB image → 5 TB/day → object storage + CDN
Bandwidth out: 200K reads/s × ~1 KB ≈ 200 MB/s (text only; media served by the CDN)
```

### Choosing a database (decision guide)
```
Need multi-row ACID transactions / complex joins / strong consistency? ── yes ──► SQL (PostgreSQL/MySQL)
  │ no
Huge write volume, simple access by key, scale-out? ── yes ──► Wide-column/KV (Cassandra, DynamoDB)
  │ no
Flexible nested documents, evolving schema? ── yes ──► Document (MongoDB)
Full-text search / log analytics? ──► Elasticsearch       Graph traversals? ──► Neo4j
Metrics/time series? ──► Prometheus/TimescaleDB         Blobs/files? ──► Object storage (+ metadata DB)
Semantic search for RAG? ──► vector index (pgvector, ES kNN, Pinecone)
Hot reads, sessions, counters? ──► Redis in front
```

### URL shortener: diagram and schema
```
Client ──► LB ──► API servers ──► Redis (code → URL, hot entries)
                      │  miss
                      ▼
               KV store / sharded SQL:  urls(code PK, long_url, user_id, created_at, expires_at)
                      ▲
          ID generator (ranges per server) ── Base62(id) → code
Click events ──► Kafka ──► analytics consumers ──► OLAP store (counts by day/country)
```

### Chat: message schema (Cassandra) and send sequence
```sql
CREATE TABLE messages (
  conversation_id uuid,
  message_id      timeuuid,          -- time-ordered unique ID
  sender_id       uuid,
  body            text,
  PRIMARY KEY ((conversation_id), message_id)      -- partition by conversation, sorted by time
) WITH CLUSTERING ORDER BY (message_id DESC);
```
```
Sender ─WS─► Gateway A ─► Chat service ─► persist (Cassandra) ─► ack "sent" to sender
                                 │
                                 ├─► session store (Redis): recipient → Gateway B?
                                 │      online  ─► Gateway B ─WS─► Recipient ─► "delivered" ack back
                                 └─     offline ─► push notification service (APNs/FCM)
```

### News feed: hybrid fan-out diagram
```
Post ─► Post service ─► posts DB + media (S3/CDN)
                 └─► Fan-out workers (Kafka) ─► for each follower (non-celebrity): LPUSH feed:{follower} post_id (Redis)
Read feed ─► Feed service ─► Redis feed:{user} (precomputed)  +  merge recent posts from followed celebrities (pull) ─► rank ─► hydrate (post cache)
```

### Design 13: Payment system

- **Requirements:** charge, refund, exactly-once effect, auditability, reconciliation with banks/payment providers, high correctness over raw speed.
- **Idempotency keys** on every API call (a client retry never double-charges).
- **Double-entry ledger:** every movement is two entries (debit one account, credit another); balances are derived from immutable ledger rows; the books must always balance.
- **State machine per payment:** CREATED → AUTHORISED → CAPTURED → SETTLED / FAILED / REFUNDED.
- **External calls to payment providers** are asynchronous with webhooks (verify webhook signatures; handle duplicates and out-of-order events).
- **Outbox pattern** for events; a **daily reconciliation** job compares the internal ledger with provider reports and flags mismatches.
- Strong consistency (SQL with transactions); encrypt card data or, better, use tokenisation from the provider (PCI-DSS scope reduction).

### Design 14: Video streaming (YouTube/Netflix)
```
Upload ─► pre-signed URL ─► raw video in object storage ─► event ─► transcoding pipeline (DAG of workers):
   split into chunks → transcode in parallel to multiple resolutions/bitrates (1080p, 720p, 480p…) and codecs
   → package into HLS/DASH segments (2–10 s each) + manifest files → object storage → CDN
Playback: client fetches the manifest → picks the bitrate per segment based on bandwidth (adaptive bitrate streaming)
Metadata (title, owner, views) in SQL/NoSQL; view counts via a stream processor; recommendations offline
```

Deep dives: CDN cache hit ratio, pre-positioning popular content, resumable uploads, transcoding cost, DRM.

### Design 15: Ride sharing (Uber)

- Drivers send location every few seconds → **location service** keeps the latest positions in memory/Redis with a **geospatial index** (geohash, quadtree, or Uber's H3 hexagons).
- A ride request → find nearby available drivers (search neighbouring cells) → **matching service** offers the ride (with a timeout, then the next driver) → trip state machine.
- WebSockets for live updates; Kafka for location streams (analytics, ETA models); surge pricing per area from supply/demand counts.
- Consistency: a driver must not be double-assigned (a lock or a compare-and-set on driver state).

### Design 16: Collaborative document editing (Google Docs)
Each keystroke is an operation; concurrent edits are merged with **operational transformation (OT)** (a central server transforms operations against each other) or **CRDTs** (merge without a central authority). Presence and cursors via WebSocket; periodic snapshots + an operation log for history and versioning.

### Design 17: Metrics monitoring and alerting system (Prometheus-like)
Agents/exporters → collectors (pull scrapes or push) → a **time-series DB** (compressed chunks; a label index; downsampling for old data) → a query engine (aggregations over time windows) → an alert evaluator (rules every N seconds → dedup/routing/silencing) → dashboards. Deep dives: cardinality limits, retention tiers, HA (two replicas scraping the same targets), long-term storage in object storage (Thanos/Mimir).

### Design 18: Distributed job scheduler (compare with the OneFS Job Engine)
A durable job store (SQL) holds definitions + schedules → a **leader-elected scheduler** enqueues due jobs → workers lease jobs (a visibility timeout; heartbeats) → results recorded → retries with backoff and a max-attempts limit → DLQ. Jobs must be idempotent (a lease can expire while a slow worker still runs: use fencing tokens/version checks). Priorities and impact policies (OneFS jobs have impact levels so maintenance doesn't starve client I/O).

## Part 5: Deep-dive topics checklist (be ready for "what if…")

- **"What if traffic grows 10×?"** → find the bottleneck: stateless scale-out, cache, read replicas, shard, async via queues, CDN.
- **"What if this component dies?"** → replicas + failover, retries + idempotency, DLQ, graceful degradation.
- **"How do you keep the cache consistent?"** → TTL + invalidate on write; accept bounded staleness; versioned keys.
- **"Hot partition?"** → better key, salting, caching, splitting.
- **"Multi-region?"** → active-passive (simple) vs active-active (conflicts); data residency; latency-based routing.
- **"How do you monitor it?"** → golden signals (latency, traffic, errors, saturation) + business SLIs + consumer lag + alerts on SLO burn rate.
- **"How do you deploy safely?"** → canary/blue-green, feature flags, automatic rollback.
- **"Security?"** → authN/Z at the gateway, TLS everywhere, least privilege, secrets in a vault, rate limits, input validation.
- **"Cost?"** → caching, tiered storage, autoscaling to zero, right-sizing, LLM cost controls.

## Quick revision

- Framework: requirements → estimates → API → data model → HLD → deep dives → wrap-up. You lead.
- Numbers: 10⁵ s/day; 1 M/day ≈ 12 QPS; latency ladder; 99.9% ≈ 8.8 h/year.
- Building blocks + why each exists.
- Know cold: URL shortener, rate limiter, notifications, chat, news feed (hybrid fan-out), **telemetry pipeline (yours)**, Dropbox (chunking + dedup + metadata/block split), **S3-like store (EC + metadata service)**, typeahead (trie with top-K), Dynamo KV (consistent hashing + quorum + LSM), crawler (politeness + dedup), **your extension at scale**.

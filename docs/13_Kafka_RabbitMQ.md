# 13 · Kafka and RabbitMQ

**Why message brokers exist:** if service A calls service B directly, then A must wait for B, A fails when B is down, and a traffic burst at A overwhelms B. A broker **decouples** them in time and speed: A writes a message and moves on; B consumes at its own pace. You get **buffering, smoothing of bursts, retries, fan-out to many consumers, and independent scaling**.

**Why it's your strongest technical topic:** you used **both**. Kafka and RabbitMQ in the telemetry platform (5-minute SLA, autoscaling on consumer lag), and RabbitMQ again in the OneFS uptime telemetry pipeline (RabbitMQ → parser → PostgreSQL). **"Kafka vs RabbitMQ" is near-certain in your interviews.** Have a 30-second and a 2-minute answer.

---

# Start here: message brokers in plain words

**The problem:** service A needs to tell service B "a new collection arrived, process it." If A calls B directly and B is down, slow or overloaded, A fails or waits. If 10,000 collections arrive in one minute, B drowns.
**The idea:** put a **broker** in between. A drops a message and moves on; B picks messages up at its own pace. The broker holds them safely until then.

```
WITHOUT a broker:  Producer ──call──► Consumer        (tightly coupled: both must be up and equally fast)
WITH a broker:     Producer ──► [ BROKER: m1 m2 m3 m4 … ] ──► Consumer(s)   (decoupled in time and speed)
```

### Kafka in plain words: a shared logbook
**Analogy:** a **ship's logbook** (or a newspaper archive). Writers only **append** new lines at the end. Lines are never erased when read (they're kept for, say, 7 days). Every reader keeps their **own bookmark** (offset) and reads at their own speed; two different teams can read the same logbook independently, and anyone can **flip back** and re-read (replay).

- To handle huge volume, the logbook is split into several **partitions** (separate books), each on a different server; readers in a **group** divide the books among themselves.

```
 Topic "collection-received"
   Partition 0: [m0][m1][m2][m3][m4][m5] → new messages appended here
                       ▲ bookmark of group "processors"      ▲ bookmark of group "indexer"
   Partition 1: [m0][m1][m2][m3]
   Partition 2: [m0][m1][m2][m3][m4]
 Group "processors": consumer A reads P0+P1, consumer B reads P2 (each partition → exactly one consumer per group)
```

### RabbitMQ in plain words: a post office
**Analogy:** a **post office**. Senders drop letters at a counter (an **exchange**). Clerks sort them into **mailboxes (queues)** using rules (**bindings**: "letters marked `uptime.*` go to the parser's box"). A worker takes a letter from a mailbox, handles it, and signs for it (**ack**). Then the letter is gone. If the worker drops it (crashes before acking), the post office gives it to another worker.

```
 Producer ──► EXCHANGE (sorting rules) ──binding "uptime.*"──► QUEUE "uptime.parse" ──► Consumer 1 ─┐ ack
                    │                                                                ──► Consumer 2 ─┘ (shared work)
                    └──binding "alerts.#"──► QUEUE "alerts" ──► Alert service
 Rejected/expired messages ──► dead-letter exchange ──► DLQ (inspect later)
```

### The one-line difference
**Kafka = a durable log you can replay, read by many independent groups. RabbitMQ = a smart post office that routes each message to the right queue and deletes it once it's handled.**

# Part A: Kafka

## 1. What Kafka is
A **distributed, partitioned, replicated, append-only commit log**. Created at LinkedIn (2011) to move huge activity and log streams to many consumers. Messages are **not deleted when consumed**: they stay for a retention period, so consumers can **replay**.

## 2. Core concepts

| Concept | Meaning |
|---|---|
| **Topic** | A named stream (e.g. `collection-received`) |
| **Partition** | A topic is split into partitions; each is an **ordered, immutable log** stored on a broker. Partitions = the unit of **parallelism and ordering** |
| **Offset** | A message's position in a partition (0, 1, 2…) |
| **Broker** | A Kafka server storing partitions |
| **Producer** | Writes messages; picks a partition (by **key hash**, round-robin/sticky if no key, or custom) |
| **Consumer group** | A set of consumers sharing the work: **each partition is consumed by exactly one consumer in the group** |
| **Replication factor** | Copies of each partition (commonly 3) across brokers |
| **Leader / followers** | One replica leads (handles reads and writes); followers replicate |
| **ISR (in-sync replicas)** | Followers caught up with the leader |
| **Controller / KRaft** | Cluster metadata management. Kafka used **ZooKeeper** historically; **KRaft** (Kafka's built-in Raft quorum) replaced it, and Kafka 4.0 (2025) removed ZooKeeper entirely |

## 3. Ordering and keys (always asked)

- Kafka guarantees order **only within a partition**, not across a topic.
- Messages with the **same key** go to the same partition (`hash(key) % partitions`), so **per-key ordering** holds (e.g. key = `systemId`, so all events for one device stay in order).
- Changing the partition count changes the key → partition mapping (it breaks per-key ordering for existing keys). Plan partition counts up front.

## 4. Consumer groups and scaling
```
Topic with 6 partitions, group with 3 consumers → each consumer gets 2 partitions
Group with 6 consumers → 1 partition each
Group with 8 consumers → 2 consumers sit IDLE
```

**The max useful parallelism of a consumer group = the number of partitions.** That's why autoscaling consumers beyond the partition count does nothing (a great detail to mention about your KEDA autoscaling: cap `maxReplicaCount` at the partition count).

- **Several groups** read the same topic independently (fan-out): analytics, indexing and alerting each get every message.
- **Rebalance:** when consumers join or leave, partitions are reassigned. Eager rebalancing pauses everyone; **cooperative/incremental** rebalancing (newer) reduces the pauses. Long processing without polling (beyond `max.poll.interval.ms`) makes the consumer look dead and **triggers a rebalance**, a common production issue.

## 5. Offsets and delivery semantics

- Consumers **commit offsets** (stored in the internal `__consumer_offsets` topic) to record progress.
- **Commit after processing → at-least-once** (a crash before the commit means reprocessing, so duplicates). The usual choice, **plus idempotent consumers**.
- **Commit before processing → at-most-once** (a crash means a lost message).
- **Exactly-once semantics (EOS):** the **idempotent producer** (dedups retries per partition using producer ID + sequence numbers) + **transactions** (atomically write outputs and commit offsets) for read-process-write **within Kafka** (Kafka Streams uses this). Side effects outside Kafka (databases, emails) still need idempotency.
- **Auto-commit** (`enable.auto.commit=true`) commits periodically, which can lose or duplicate on crashes. Production code often commits manually.

## 6. Durability: producer settings

- `acks=0` (fire and forget), `acks=1` (the leader wrote it), **`acks=all`** (all in-sync replicas wrote it: the safest).
- **`min.insync.replicas=2`** with replication factor 3 and `acks=all` → a write succeeds only if at least 2 replicas have it; survives one broker loss without data loss.
- `enable.idempotence=true` (the default in modern clients) prevents duplicates from producer retries.
- **Unclean leader election** (`false` by default): allowing an out-of-sync replica to become leader trades data loss for availability.

## 7. Why Kafka is fast

- **Sequential disk I/O:** append-only writes and sequential reads (disks are fast sequentially).
- **OS page cache:** Kafka leans on the kernel's cache instead of its own heap.
- **Zero-copy** (`sendfile`): data goes from the page cache to the network socket without passing through user space.
- **Batching + compression** (lz4/zstd/snappy) on the producer, fewer and bigger requests.
- **Partitioning** spreads load across brokers and consumers.

## 8. Retention and compaction

- **Time/size retention:** delete segments older than 7 days (configurable) or beyond a size.
- **Log compaction:** keep only the **latest value per key** (a changelog / "table" view: user profiles, config state). A null value (tombstone) deletes the key.
- **Replay:** reset a group's offsets (to earliest, or a timestamp) to reprocess. **Huge value when a parser bug ships:** fix the bug and replay instead of asking devices to resend.

## 9. Consumer lag (your autoscaling signal)
**Lag = latest offset − committed offset**, per partition: how far behind consumers are.
> "Our workers were I/O-bound (downloading, extracting, writing to object storage), so CPU stayed flat while the backlog grew. CPU-based autoscaling would scale far too late. Lag directly measures SLA risk: growing lag means collections are waiting and the 5-minute budget is being eaten before processing even starts. So we scaled with **KEDA** on Kafka consumer lag and RabbitMQ queue depth, with cooldown periods to avoid flapping and a max of about the partition count."
Tools: **Offset Explorer** (a GUI you used), `kafka-consumer-groups.sh --describe --group X`, Burrow, Prometheus exporters + Grafana.

## 10. Kafka ecosystem

- **Kafka Connect:** ready-made connectors from or to databases, S3, Elasticsearch (e.g. Debezium for CDC).
- **Kafka Streams / ksqlDB / Flink:** stream processing (windows, joins, aggregations).
- **Schema Registry** + Avro/Protobuf: enforce schema compatibility between producers and consumers.
- **MirrorMaker 2:** replicate across clusters/regions.
- **Share groups ("queues for Kafka"):** a newer Kafka feature that adds queue-style consumption (several consumers on the same partition with per-message acks). It shows the two models are converging. Mention it as a recent development.

## 11. Common Kafka problems and fixes

| Problem | Cause | Fix |
|---|---|---|
| Lag growing | Consumers too slow or too few | Scale consumers (≤ partitions), add partitions, optimise processing, batch |
| Rebalance storms | Slow processing exceeds the poll interval; flapping pods | Tune `max.poll.interval.ms`/`max.poll.records`, cooperative rebalancing, static membership |
| Duplicates | At-least-once + retries | Idempotent consumers, idempotent producer |
| Poison message | A message that always fails blocks the partition | Retry N times → DLQ topic → alert |
| Hot partition | Skewed keys | Better key choice, salting |
| Out-of-order | Several partitions, or retries with `max.in.flight > 1` without idempotence | Key by entity; idempotent producer |

**Priority in Kafka** (your manual-upload prioritisation story): Kafka can't reorder within a partition, so you implement priority with a **separate high-priority topic plus dedicated consumers**, not by reordering one queue.

---

# Part B: RabbitMQ

## 1. What RabbitMQ is
A **message broker** implementing **AMQP 0-9-1** (plus MQTT, STOMP, and a stream protocol). Its model is "**smart broker, simple consumer**": the broker routes messages to queues, tracks per-message acknowledgements, redelivers, and **deletes messages once acknowledged**.

## 2. Core model
```
Producer → Exchange --(binding + routing key)--> Queue → Consumer
```

| Exchange type | Routing |
|---|---|
| **Direct** | Exact routing-key match (`task.parse` → parse queue) |
| **Topic** | Wildcard patterns (`telemetry.*.error`, `telemetry.#`) |
| **Fanout** | Broadcast to every bound queue |
| **Headers** | Match on message headers |

The **default exchange** routes directly to the queue named by the routing key.

## 3. Reliability features

- **Consumer acks:** manual `ack` after successful processing; `nack`/`reject` with or without requeue. Unacked messages are redelivered if the consumer dies → **at-least-once**.
- **Prefetch (`basic.qos`):** caps unacked messages per consumer. Prevents one consumer hoarding messages; this is how RabbitMQ does **fair dispatch** and backpressure. Too low = idle consumers; too high = uneven load and memory use.
- **Publisher confirms:** the broker confirms a message was persisted/routed (the producer side of reliability).
- **Durable queues + persistent messages** survive broker restarts.
- **Dead-letter exchange (DLX):** rejected, expired (TTL) or over-length messages are routed to a DLX → a DLQ for inspection/retry. **Delayed retry** pattern: a retry queue with a TTL that dead-letters back to the main queue.
- **Queue types:** **quorum queues** (Raft-replicated, durable; the recommended replicated type; classic mirrored queues were removed in RabbitMQ 4.0), classic queues, and **streams** (an append-only, Kafka-like log with replay).
- **Priority queues** are supported natively (`x-max-priority`).

## 4. Where RabbitMQ shines
Task queues/work distribution, complex routing, RPC-style request/reply, per-message ack/retry/TTL, lower latency for moderate volumes, and many producers sending modest volumes into a few consumer types.

---

# Part C: Kafka vs RabbitMQ (prepare both versions)

| | Kafka | RabbitMQ |
|---|---|---|
| Model | Distributed **log**; consumers pull and track offsets | **Broker with queues**; pushes to consumers; the broker tracks acks |
| After consumption | Message **kept** (retention) → **replay** | Message **deleted** after ack (streams excepted) |
| Throughput | Very high (millions/s across a cluster) | High, tuned for latency and routing |
| Ordering | Per partition | Per queue (with one consumer) |
| Routing | Topic + partition key (simple) | **Rich** exchanges (direct/topic/fanout/headers) |
| Consumers | Many independent groups read the same data | Competing consumers on a queue; fan-out needs a queue per subscriber |
| Scaling consumers | Up to the partition count | Add consumers freely (with prefetch) |
| Priority / delay / per-message TTL | Not native (separate topics) | Native |
| Best for | Event streaming, logs, metrics, CDC, multiple consumers, replay, stream processing | Task queues, work distribution, complex routing, per-message retry/ack, RPC |

**30-second answer:**
> "Kafka is a distributed log optimised for high-throughput streaming with retention and replay, so many independent consumers can read the same data, and you can reprocess history. RabbitMQ is a broker optimised for routing and per-message delivery: acks, retries, TTLs, priorities, and work queues. On the telemetry platform we used **both**: Kafka for the high-volume streams where several downstream teams consumed the same data and replay mattered, and RabbitMQ where routing and per-message acknowledgement and retry mattered more."

**2-minute extension:** add the OneFS uptime pipeline (thousands of clusters each sending modest telemetry into a few parsing consumers; per-message reliability mattered more than replay → RabbitMQ → PostgreSQL), the ops-cost caveat ("running two brokers costs more to operate; greenfield, I'd consider consolidating, but replay saved us when a parser bug shipped"), and lag-based autoscaling.

---

# Part D: Patterns that apply to both

- **Competing consumers** (work queue) vs **publish-subscribe** (fan-out).
- **Idempotent consumer** (dedup on message ID / business key / status field).
- **Retry with backoff → DLQ → alert**, never infinite inline retries (head-of-line blocking).
- **Transactional outbox** to publish reliably from a DB change.
- **Claim-check pattern:** don't put big payloads in messages; store the blob in object storage and send a **pointer**. *(Your pipeline: the collection file was downloaded by path; the Parquet output went to ECS; metadata + path went to the Kafka meta topic.)*
- **Backpressure:** bounded prefetch/poll, autoscaling on lag/depth, rate limiting producers.
- **Schema evolution:** version messages; add optional fields only; use a registry.
- **Message size:** Kafka's default max is about 1 MB; RabbitMQ handles bigger messages but they hurt performance. Prefer the claim check.

## Your telemetry pipeline flow (draw it)
```
Devices → Kafka / RabbitMQ (collection arrives: payload or pointer)
        → consumer: download → extract archive (if needed) → parse per product line
        → transform to Parquet / JSON / XML
        → write file to Dell ECS (object storage)
        → index metadata in Elasticsearch (systemId, startTime, endTime, processing times, file paths)
        → publish metadata to a Kafka "meta" topic (the downstream API team consumes it)
        → emit processing-time metrics → Prometheus/Grafana SLA dashboards (rolling 1h/2h/3h)
Failure path: retry with backoff → dead-letter → alert (Splunk)
Scaling: KEDA on Kafka lag / RabbitMQ queue depth; Kubernetes liveness probes for auto-healing
```

---

# Part E: Hands-on depth: architecture, internals, code, configuration

## Kafka architecture diagram
```
 Producers ──► ┌───────────────── Kafka cluster ─────────────────┐ ──► Consumer group "processors"
               │ Broker 1          Broker 2          Broker 3    │      C1 ← P0, P1
               │ P0 (leader)       P0 (follower)     P1 (leader) │      C2 ← P2
               │ P2 (follower)     P1 (follower)     P2 (leader) │
               │ KRaft controllers (Raft quorum) manage metadata │ ──► Consumer group "indexer" (reads the SAME data)
               └─────────────────────────────────────────────────┘
Topic "collection-received": 3 partitions × replication factor 2 (each partition: 1 leader + 1 follower)
```

## Inside a partition: segments, offsets, watermarks

- A partition is a directory of **segment files** (e.g. `00000000000000000000.log` + `.index` (offset → byte position) + `.timeindex` (timestamp → offset)). New segments roll by size/time; **retention deletes whole old segments** (cheap).
- **LEO (log end offset):** the next offset to be written on a replica. **High watermark (HW):** the highest offset replicated to all in-sync replicas. **Consumers only see messages up to the HW**, so they never read data that could be lost in a leader failover.
- **Leader epoch** tracks leadership changes so followers truncate divergent data correctly after a failover.

## Producer and consumer code (Python, confluent-kafka)
```python
from confluent_kafka import Producer, Consumer, KafkaException
import json

producer = Producer({
    "bootstrap.servers": "kafka:9092",
    "acks": "all", "enable.idempotence": True,          # durable + no duplicates from retries
    "linger.ms": 20, "compression.type": "zstd",          # batch for throughput
})
def delivered(err, msg):
    if err: log.error("delivery failed: %s", err)
producer.produce("collection-received", key=system_id, value=json.dumps(event), on_delivery=delivered)
producer.flush()                                          # block until queued messages are sent

consumer = Consumer({
    "bootstrap.servers": "kafka:9092",
    "group.id": "processors",
    "auto.offset.reset": "earliest",                      # where to start if the group has no committed offset
    "enable.auto.commit": False,                          # commit manually AFTER processing → at-least-once
    "max.poll.interval.ms": 300000,
    "partition.assignment.strategy": "cooperative-sticky",
})
consumer.subscribe(["collection-received"])
try:
    while True:
        msg = consumer.poll(1.0)
        if msg is None: continue
        if msg.error(): raise KafkaException(msg.error())
        try:
            process(json.loads(msg.value()))             # must be idempotent
        except Exception:
            send_to_dlq(msg)                              # don't block the partition forever
        consumer.commit(message=msg, asynchronous=False)
finally:
    consumer.close()                                      # leave the group cleanly → fast rebalance
```

## Key configurations

| Where | Config | Meaning |
|---|---|---|
| Topic | `num.partitions`, `replication.factor` | parallelism and durability |
| Topic | `retention.ms` / `retention.bytes` | how long/much to keep |
| Topic | `cleanup.policy` = `delete` / `compact` | time-based deletion vs keep the latest value per key |
| Topic/broker | `min.insync.replicas` | replicas needed for an `acks=all` write to succeed |
| Producer | `acks`, `enable.idempotence`, `retries`, `max.in.flight.requests.per.connection` | durability and ordering |
| Producer | `linger.ms`, `batch.size`, `compression.type` | throughput vs latency |
| Consumer | `group.id`, `auto.offset.reset` (`earliest`/`latest`) | group membership and the starting point |
| Consumer | `enable.auto.commit`, `max.poll.records`, `max.poll.interval.ms`, `session.timeout.ms`, `heartbeat.interval.ms` | commit behaviour and liveness |
| Consumer | `fetch.min.bytes`, `fetch.max.wait.ms` | batching on the read side |

**Partition assignment strategies:** range, round-robin, sticky (minimise movement), **cooperative-sticky** (incremental rebalances: consumers keep their unaffected partitions). **Static membership** (`group.instance.id`) avoids rebalances on quick restarts (e.g. rolling Kubernetes deploys).

## Kafka CLI you should know
```bash
kafka-topics.sh --bootstrap-server kafka:9092 --create --topic collection-received --partitions 12 --replication-factor 3
kafka-topics.sh --bootstrap-server kafka:9092 --describe --topic collection-received     # leaders, ISR per partition
kafka-console-producer.sh --bootstrap-server kafka:9092 --topic test
kafka-console-consumer.sh --bootstrap-server kafka:9092 --topic test --from-beginning --group debug
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group processors       # LAG per partition
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --group processors --topic collection-received \
    --reset-offsets --to-datetime 2026-11-20T00:00:00.000 --execute                          # replay (stop consumers first)
kafka-configs.sh --bootstrap-server kafka:9092 --entity-type topics --entity-name t --alter --add-config retention.ms=604800000
```

## Kafka Connect and Kafka Streams (examples)

- **Connect** (config, not code): a source connector (Debezium MySQL CDC → topics) or a sink connector (topic → Elasticsearch/S3), with converters (JSON/Avro), single message transforms, and a DLQ for bad records. Runs as a scalable worker cluster.
- **Kafka Streams** (a Java/Scala library): stateful stream processing with exactly-once support:

```java
builder.stream("collections")
       .filter((k, v) -> v.status().equals("FAILED"))
       .groupByKey()
       .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)))
       .count()
       .toStream().to("failures-per-5min");
```

Concepts: KStream (an event stream) vs KTable (the latest value per key), windowing (tumbling, hopping, session), state stores backed by changelog topics.

## Schema Registry
Producers register an Avro/Protobuf/JSON schema; messages carry a schema ID; compatibility modes (BACKWARD = new consumers can read old data, FORWARD, FULL) stop breaking changes reaching production.

## Kafka sizing rules of thumb

- Partitions ≥ the max consumer parallelism you'll need; throughput ÷ per-partition throughput.
- Replication factor 3 with `min.insync.replicas=2` for important data (tolerates one broker loss without stopping writes).
- Disk = ingest rate × retention × replication factor (+ headroom).

---

## RabbitMQ in depth

### Concepts beyond the basics

- **Connection** (a TCP connection; expensive) vs **channel** (a lightweight virtual connection inside it). One connection per app, a channel per thread.
- **Virtual hosts (vhosts):** logical isolation (queues, exchanges, permissions) inside one broker, like namespaces.
- **Bindings** connect exchanges to queues with a binding key (and exchange-to-exchange bindings).
- **Queue arguments:** `x-message-ttl`, `x-max-length` (+ overflow behaviour), `x-dead-letter-exchange`, `x-queue-type=quorum`, `x-max-priority`, single-active-consumer.
- **Clustering:** nodes share metadata; quorum queues replicate data across nodes with Raft. **Federation** and **Shovel** move messages between brokers/datacentres.
- **Management UI and HTTP API** (port 15672) for queues, rates and connections. Prometheus plugin for metrics.
- **Flow control and memory/disk alarms:** RabbitMQ blocks publishers when memory or disk crosses its thresholds (backpressure on producers).

### Publisher and consumer code (Python, pika)
```python
import pika, json
conn = pika.BlockingConnection(pika.ConnectionParameters("rabbitmq"))
ch = conn.channel()

ch.exchange_declare(exchange="telemetry", exchange_type="topic", durable=True)
ch.queue_declare(queue="uptime.parse", durable=True,
                 arguments={"x-queue-type": "quorum", "x-dead-letter-exchange": "telemetry.dlx"})
ch.queue_bind(queue="uptime.parse", exchange="telemetry", routing_key="uptime.*")

ch.confirm_delivery()                                     # publisher confirms
ch.basic_publish(exchange="telemetry", routing_key="uptime.5min",
                 body=json.dumps(payload),
                 properties=pika.BasicProperties(delivery_mode=2, message_id=msg_id))   # persistent

def on_message(ch, method, props, body):
    try:
        parse_and_store(json.loads(body))                 # idempotent on props.message_id
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except PermanentError:
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)   # → dead-letter exchange
    except Exception:
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)    # transient: retry (prefer a delayed-retry queue)

ch.basic_qos(prefetch_count=20)                           # at most 20 unacked messages per consumer
ch.basic_consume(queue="uptime.parse", on_message_callback=on_message)
ch.start_consuming()
```

### RPC over RabbitMQ (request/reply)
The client publishes a request with `reply_to` = its own (exclusive) callback queue and a `correlation_id`; the server consumes the request, then publishes the response to `reply_to` with the same `correlation_id`; the client matches responses by ID.

### CLI
```bash
rabbitmqctl list_queues name messages consumers
rabbitmqctl list_exchanges; rabbitmqctl list_bindings
rabbitmqctl list_connections; rabbitmqctl cluster_status
rabbitmq-plugins enable rabbitmq_management
```

### Monitoring signals (both brokers)
Kafka: consumer lag, under-replicated partitions, offline partitions, ISR shrinks, request latency, bytes in/out. RabbitMQ: queue depth (ready + unacked), publish/deliver/ack rates, consumer count, redelivery rate, memory/disk alarms, DLQ size.

---

# Part F: Completing Kafka and RabbitMQ from A to Z

### Course map
```
Kafka: concepts (event, topic, partition, offset, broker, cluster) · installing (KRaft) · CLI · producers (keys, partitioners,
  batching, acks, idempotence, transactions) · consumers (groups, offsets, commits, rebalancing, assignment strategies)
  · storage internals (segments, indexes, retention, compaction, HW/LEO) · replication (leaders, ISR, unclean election)
  · delivery semantics · Connect · Streams/ksqlDB · Schema Registry · security (TLS, SASL, ACLs) · operations (sizing,
  reassignment, rolling restarts, monitoring) · tiered storage · patterns (DLQ, retry topics, outbox, CDC, priority topics)
RabbitMQ: AMQP model (exchanges, queues, bindings, routing keys) · exchange types · installing & management UI · connections
  & channels · vhosts · acks, prefetch, publisher confirms · durability · queue types (classic, quorum, streams) · DLX/TTL/
  priority/delayed retries · RPC · clustering, federation, shovel · security · monitoring · patterns
```

### Running Kafka locally (KRaft mode, no ZooKeeper)
```bash
docker run -d --name kafka -p 9092:9092 apache/kafka:3.8.0     # single-node KRaft broker for development
docker exec -it kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --create --topic test --partitions 3
```

### Retry topics (non-blocking retries)
```
main-topic ──fail──► retry-5s ──(consumer waits until the message is 5 s old)──► reprocess ──fail──► retry-1m ──fail──► dlq-topic
```

Keeps the main partition moving (no head-of-line blocking) while still retrying transient failures with increasing delays.

### Kafka security

- **Encryption:** TLS between clients and brokers, and between brokers.
- **Authentication:** SASL (SCRAM usernames/passwords, Kerberos/GSSAPI, OAUTHBEARER) or mutual TLS.
- **Authorisation:** ACLs: `kafka-acls.sh --add --allow-principal User:processor --operation Read --topic collection-received --group processors`.
- **Quotas:** limit the produce/fetch bytes per client so one noisy client can't starve others.

### Kafka operations

- **Adding brokers** doesn't move existing partitions automatically: use `kafka-reassign-partitions.sh` (or Cruise Control) to rebalance.
- **Rolling restarts:** restart brokers one by one, waiting for under-replicated partitions to return to 0 in between.
- **Increasing partitions:** possible (never decreasing), but it changes the key → partition mapping.
- **Tiered storage** (newer Kafka versions): old segments move to object storage, so brokers keep only recent data on local disks (cheaper long retention).
- **Key metrics:** under-replicated partitions (should be 0), offline partitions, ISR shrink/expand rate, request latency, consumer lag, disk usage.

### RabbitMQ: installing and managing
```bash
docker run -d --name rabbit -p 5672:5672 -p 15672:15672 rabbitmq:3-management   # UI at http://localhost:15672 (guest/guest, local only)
rabbitmqctl add_vhost telemetry
rabbitmqctl add_user parser '…'; rabbitmqctl set_permissions -p telemetry parser "^uptime.*" "^uptime.*" "^uptime.*"   # configure/write/read regexes
rabbitmq-plugins enable rabbitmq_prometheus rabbitmq_shovel rabbitmq_federation
```

**Delayed retries in RabbitMQ:** a retry queue with `x-message-ttl` whose dead-letter exchange points back at the main exchange: the message waits there for the TTL, then returns for another try. Count attempts in a header (`x-death`) and send to a parking-lot queue after N attempts.
**Security:** per-vhost permissions, TLS for clients and inter-node traffic, disable the default `guest` user outside localhost, and the management UI behind authentication.
**Clustering notes:** nodes share users, vhosts, exchanges and bindings; **quorum queues** replicate messages with Raft (an odd number of nodes: 3 or 5); classic queues live on one node. **Federation** links brokers loosely across WANs; **Shovel** moves messages from a queue in one broker to an exchange in another.

## Interview Q&A

**Q: How do you guarantee ordering in Kafka?** Same key → same partition; one consumer per partition in the group; the idempotent producer prevents reordering on retry.
**Q: How many partitions?** Enough for the target consumer parallelism and throughput (throughput ÷ per-consumer throughput), with headroom, since adding them later breaks the key mapping. Too many costs metadata, file handles and longer failover.
**Q: What happens when a consumer dies?** Group rebalance; its partitions move to others; they resume from the last committed offset (so some reprocessing → idempotency).
**Q: What happens when a broker dies?** Leaders for its partitions move to in-sync replicas; with `acks=all` + `min.insync.replicas=2`, no acknowledged data is lost.
**Q: How do you handle a poison message?** Bounded retries → DLQ → alert → fix and replay.
**Q: Push vs pull?** RabbitMQ pushes (prefetch limits it); Kafka consumers pull (natural backpressure, batching).
**Q: Why not just use a database table as a queue?** Polling cost, locking contention, no fan-out or replay at scale. It's fine for small scale with `SELECT … FOR UPDATE SKIP LOCKED`.

## Quick revision

- Kafka: topic → partitions (ordered logs) → offsets; consumer groups (max parallelism = partitions); keys for per-key ordering; acks=all + min.insync.replicas; idempotent producer + transactions for EOS within Kafka; retention, compaction, replay; lag; KRaft replaced ZooKeeper (4.0).
- RabbitMQ: exchange → binding → queue; direct/topic/fanout/headers; manual acks, prefetch, publisher confirms, DLX/DLQ, TTL, priority, quorum queues, streams.
- Kafka = log + replay + many consumer groups; RabbitMQ = routing + per-message ack/retry. You used both: know why.
- At-least-once + idempotent consumers; DLQ; claim check; priority via a separate topic; autoscale on lag (capped at partitions).

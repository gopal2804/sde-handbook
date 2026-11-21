# 18 · Observability: Prometheus, Grafana, Splunk, ELK

**Why observability exists:** in distributed systems you can't attach a debugger to production. You need to answer **"Is it healthy? What's broken? Why? For whom?"** from the outside, using the signals the system emits. *Monitoring* tells you **when** something's wrong (known failure modes); *observability* lets you ask **new questions** about **why** (unknown failure modes).

**Your experience:** on the telemetry platform: Grafana **SLA dashboards** (rolling 1h/2h/3h windows for the 5-minute processing SLA), Prometheus metrics, **Splunk onboarding and alerting** across the squad, ELK/Kibana. On OneFS: the **CELOG** event/alerting system (you built alerting on consecutive job failures) and remote **syslog forwarding** to customers' SIEMs. In your extension: usage and spend tracking per request.

---

## Start here: observability and each tool in plain words

**The problem:** your service runs on 40 pods. Users say "it's slow." Where? Why? Since when? You can't attach a debugger to production.
**Analogy, a hospital patient:**

- **Metrics** are the **vital signs monitor** (heart rate, temperature, BP: numbers over time; an alarm rings when they cross a limit).
- **Logs** are the **doctor's notes** (detailed text: "10:42 patient complained of pain").
- **Traces** are the **patient's journey through the hospital** (reception 2 min → X-ray 40 min → doctor 5 min: where did the time go?).

### Prometheus: collects and stores metrics
**What:** a time-series database + collector. Every 15 s it **visits** (scrapes) each service's `/metrics` page and stores the numbers with labels. It evaluates alert rules and sends alerts to Alertmanager.
### Grafana: draws the dashboards
**What:** the **screen** that turns metrics (and logs) into graphs and dashboards. It stores no data itself; it queries Prometheus, Elasticsearch, Loki, Splunk, SQL and others.

```
 ┌──────────── your services ────────────┐
 │ api pod  /metrics   worker pod /metrics│  ◄── Prometheus SCRAPES (pulls) every 15 s
 │ node_exporter (host CPU/RAM/disk)      │      (targets discovered from Kubernetes)
 │ kafka_exporter (consumer lag)          │
 └────────────────────────────────────────┘
                     │
            ┌────────▼─────────┐  alert rules  ┌──────────────┐  route/dedupe  ┌─────────────────────┐
            │ PROMETHEUS (TSDB)├──────────────►│ Alertmanager ├───────────────►│ Slack / Email /     │
            └────────┬─────────┘               └──────────────┘                │ PagerDuty           │
                     │ PromQL queries                                          └─────────────────────┘
            ┌────────▼─────────┐
            │ GRAFANA          │  dashboards: SLA %, p99 latency, error rate, lag
            └──────────────────┘
```

### Splunk: search engine for machine data (logs)
**What:** a commercial platform that collects logs from everywhere, indexes them, and lets you search, chart and alert using its query language **SPL**. Common in big enterprises and security teams (SIEM).

```
 Hosts/apps ──► Universal Forwarders (lightweight agents tail log files)
                     ▼
              Indexers (parse: timestamps, fields; store in time-based buckets)
                     ▼
              Search heads (UI + SPL: search, dashboards, scheduled alerts)
```

### ELK / Elastic Stack: the open-source log pipeline
**What:** **E**lasticsearch (stores and searches) + **L**ogstash (parses and transforms) + **K**ibana (UI and dashboards), usually with **Beats** (Filebeat) shipping the logs.

```
 App logs (files / stdout) ──► Filebeat ──► Logstash (grok-parse, enrich, normalise timestamps) ──► Elasticsearch ──► Kibana
                                  (or straight to Elasticsearch with ingest pipelines)
```

### The whole observability picture
```
 Services ──metrics──► Prometheus ──► Grafana dashboards + alerts
          ──logs─────► Splunk or ELK (or Loki) ──► search "what happened to request X?"
          ──traces───► OpenTelemetry Collector ──► Jaeger/Tempo ──► "where did the 4 seconds go?"
 All three linked by a shared request/trace ID.
```

## Course map (everything in this file)
```
Concepts: monitoring vs observability · metrics/logs/traces/profiles · golden signals · RED/USE · SLI/SLO/SLA · error budgets · alerting philosophy
Prometheus: architecture · data model (metric, labels, samples) · metric types · instrumentation (client libraries) · exporters
  · scrape config & service discovery · PromQL (selectors, rate, aggregation, histogram_quantile) · recording & alerting rules
  · Alertmanager (routing, grouping, silencing, inhibition) · storage & retention · HA & long-term storage (Thanos/Mimir)
Grafana: data sources · dashboards & panels · variables · annotations · alerting · provisioning as code · Loki/LogQL · Tempo
Splunk: architecture (forwarders, indexers, search heads) · indexes & sourcetypes · SPL (search, stats, eval, timechart, rex,
  transaction, lookup) · dashboards · alerts · field extraction · configs (inputs/props/transforms)
ELK: Elasticsearch · Logstash pipelines (input/filter/output, grok, date) · Beats/Filebeat · Kibana (Discover, KQL, dashboards) · ILM
Tracing: OpenTelemetry (SDKs, collector, context propagation) · Jaeger/Tempo · sampling
Practice: structured logging · dashboards that work · incident response & postmortems
```

## 1. The three pillars (plus one)

| Pillar | Question it answers | Tools |
|---|---|---|
| **Metrics** | Is it healthy? Trends, alerts. Cheap numeric time series | Prometheus, Grafana, Datadog, CloudWatch |
| **Logs** | What exactly happened to *this* request? | Splunk, ELK/OpenSearch, Loki |
| **Traces** | Where did the latency go across services? | OpenTelemetry, Jaeger, Zipkin, Tempo |
| (Profiles / events) | Which code is hot? What changed (deploys)? | pprof, Pyroscope, deploy markers |

**OpenTelemetry (OTel):** the vendor-neutral standard (APIs, SDKs, collector) for emitting metrics, logs and traces. **Instrument once, send anywhere.**
**Tracing was the gap on your telemetry platform.** Name it as "what I'd add," and it shows maturity.

## 2. What to measure

- **Four golden signals (Google SRE):** **Latency** (separate successes from errors; use percentiles), **Traffic** (requests/s, messages/s), **Errors** (rate, type), **Saturation** (how full: CPU, memory, queue depth, consumer lag, disk).
- **RED method** (for services): Rate, Errors, Duration.
- **USE method** (for resources): Utilisation, Saturation, Errors.
- **Business/pipeline SLIs:** "% of collections processed within 5 min", consumer lag, DLQ size, end-to-end freshness.

## 3. SLI, SLO, SLA, error budgets

- **SLI (indicator):** a measured ratio. Example: good collections (processed ≤ 5 min) / total collections.
- **SLO (objective):** the internal target. Example: 99% over a rolling 28 days (or 1h/2h/3h windows for fast feedback, like your dashboards).
- **SLA (agreement):** an external contract with consequences (credits). The SLO is set stricter than the SLA.
- **Error budget:** 100% − SLO = how much failure is allowed. Budget left → ship faster; budget burning → freeze risky changes, fix reliability.
- **Alert on burn rate** (how fast the budget is being consumed), not on every blip.

**Percentiles over averages:** "If the mean is 90 seconds but p99 is 6 minutes, 1% of collections breach the SLA and the average tells you nothing." Report p50/p95/p99.

## 4. Prometheus
**Why:** created at SoundCloud (2012), inspired by Google's Borgmon. A CNCF graduated project, and the default for Kubernetes metrics.

- **Pull model:** Prometheus **scrapes** HTTP `/metrics` endpoints on an interval (e.g. 15 s). Targets come from **service discovery** (Kubernetes pods/services). Pull makes "is the target up?" obvious (`up == 0`) and keeps control centralised.
- **Pushgateway:** for short-lived batch jobs that end before a scrape (push their final metrics).
- **Exporters:** translate third-party systems into Prometheus metrics: node_exporter (host), kafka/JMX exporter, RabbitMQ (built-in plugin), Elasticsearch exporter, blackbox exporter (probe URLs), kube-state-metrics.
- **Data model:** `metric_name{label="value", …} value timestamp`, e.g. `collections_processed_total{product="PowerStore", status="ok"} 18342`.
- **Metric types:**

  | Type | Meaning | Example |
  |---|---|---|
  | **Counter** | Only goes up (resets on restart). Always use `rate()` | requests_total, errors_total |
  | **Gauge** | Goes up and down | queue_depth, memory_bytes, consumer_lag |
  | **Histogram** | Counts observations in **buckets** → percentiles computed at query time; aggregatable across instances | request_duration_seconds |
  | **Summary** | Quantiles computed client-side; **not aggregatable** across instances | |

- **Cardinality danger:** every unique label combination is a separate time series. **Never use user IDs, request IDs or collection IDs as labels.** That explodes memory. Use bounded labels (product line, status, endpoint).
- **TSDB:** a local time-series database with compression. For long-term or HA storage: **Thanos, Cortex/Mimir, VictoriaMetrics**.
- **Alertmanager:** receives alerts from Prometheus rules → dedup, grouping, silencing, inhibition → routes to email/Slack/PagerDuty.

### PromQL you should be able to write
```promql
rate(http_requests_total[5m])                                      # per-second request rate
sum by (status) (rate(http_requests_total[5m]))                    # by status code
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))   # error ratio
histogram_quantile(0.99, sum by (le) (rate(processing_seconds_bucket[5m])))              # p99 latency
increase(collections_failed_total[1h])                             # failures in the last hour
sum by (consumergroup) (kafka_consumergroup_lag)                   # consumer lag (kafka exporter)
avg_over_time(queue_depth[10m])
up == 0                                                            # dead scrape targets
```

- `rate` = per-second average over the window (use it for alerts and graphs); `irate` = based on the last two samples (spiky); `increase` = total growth over the window.
**Example alert rule:**

```yaml
- alert: CollectionSLABreachRisk
  expr: histogram_quantile(0.99, sum by (le) (rate(collection_processing_seconds_bucket[15m]))) > 240
  for: 10m
  labels: { severity: page }
  annotations: { summary: "p99 processing time above 4 min (SLA is 5 min)" }
```

## 5. Grafana
**Why:** a visualisation and dashboard layer over many data sources (Prometheus, Elasticsearch, Loki, PostgreSQL, Splunk, CloudWatch). **It doesn't store metrics itself.**

- Panels (time series, stat, gauge, table, heatmap for latency histograms), **template variables** (choose product/environment from a dropdown), annotations (deploy markers), alerting, provisioning dashboards as code (JSON).
- **Good dashboard design:** start with the SLO and golden signals at the top, then drill down per component; use the same time range across panels; percentiles, not averages; annotate deploys.
- **Your SLA dashboards:** processing-time percentiles and SLA compliance over rolling 1h/2h/3h windows, per product line (PowerStore, Unity, ESXi, Storage Center, FluidFS…), consumer lag and throughput.

## 6. Splunk
**Why:** an enterprise log platform: ingest any machine data, index it, and search it with a powerful language (SPL). Very common in large enterprises for operations and security (SIEM).

- **Architecture:** **Universal Forwarders** on hosts ship logs → **indexers** (parse, index, store in buckets: hot/warm/cold/frozen) → **search heads** (run queries, dashboards, alerts). Heavy forwarders can parse and filter before indexing.
- **Key fields:** `index`, `sourcetype`, `source`, `host`, `_time`.
- **Licensing is often priced by GB ingested per day**, which is why you filter what you forward (the same reasoning as your syslog forwarding rules).
- **SPL examples:**

```spl
index=telemetry sourcetype=processor level=ERROR earliest=-1h
| stats count by product, error_type | sort -count

index=telemetry "collection processed"
| timechart span=5m avg(processing_ms) by product

index=app | rex field=_raw "duration=(?<dur>\d+)ms" | stats p99(dur) as p99 by endpoint

index=telemetry status=FAILED | stats count by systemId | where count >= 3
```

- **Alerts:** saved searches on a schedule or in real time, with thresholds → email/Slack/webhook.
- **Your Splunk onboarding work:** getting services' logs flowing into the right index with the right sourcetypes, building searches and alerts for failures across the squad. That's "initiative beyond assigned work."

## 7. ELK / Elastic Stack

- **Elasticsearch** (store + search; file 10) + **Logstash** (ingest pipelines: input → filter (grok parsing, mutate, date) → output) + **Kibana** (UI: Discover, dashboards, Lens) + **Beats** (lightweight shippers: **Filebeat** for log files, Metricbeat). Modern setups often use Elastic Agent, or **Fluent Bit/Fluentd** as shippers.
- **Kubernetes logging pattern:** apps log to **stdout** → the container runtime writes the files → a **DaemonSet** shipper (Fluent Bit/Filebeat) tails them and adds pod metadata → Elasticsearch/Splunk/Loki.
- **Index lifecycle (ILM):** daily indices, hot → warm → cold → delete, to control cost.
- **ELK vs Splunk:** ELK/OpenSearch is open-source-based and self-managed (cheaper licences, more ops work). Splunk is commercial, powerful SPL, enterprise support, and expensive at volume. **Loki** (Grafana) indexes only labels and is cheap for Kubernetes logs.

## 8. Logging best practices

- **Structured logs (JSON)** with consistent fields: timestamp (UTC, ISO-8601), level, service, **trace/correlation ID**, message, plus context (systemId, collectionId).
- Levels: DEBUG (off in prod), INFO (business events), WARN (recoverable oddities), ERROR (failed operations), FATAL.
- **Never log secrets, tokens, passwords or personal data** (your extension's privacy policy restricts what's sent and logged).
- Log once at the boundary with context; avoid noisy logs in hot loops (cost + signal-to-noise).
- **Timestamps consistent across sources** (your Elasticsearch timestamp normalisation work).
- Sample high-volume debug logs; keep error logs.

## 9. Alerting best practices

- **Alert on symptoms users feel** (SLO burn, error rate, lag growing), not on every cause (CPU 80% on one pod).
- Every alert must be **actionable** and have a **runbook**. Page only for urgent things; ticket the rest.
- **Avoid alert fatigue** (it trains people to ignore alerts).
- **Your OneFS CELOG feature is the perfect example:** alert after **N consecutive** job failures (configurable per job type), not on every failure. One failure is often transient in a distributed system (a node reboot, a drive briefly unavailable); N in a row is a real persistent problem. Critical protection jobs can use a lower N than low-priority scans.

## 10. Distributed tracing basics

- A **trace** = a tree of **spans** (one per operation: the HTTP handler, a DB call, a Kafka publish) sharing a **trace ID**; context propagates via headers (W3C `traceparent`) and message headers.
- It shows the critical path and where time goes across services and queues.
- **Sampling** (head-based or tail-based) controls cost.

## 11. Incident response (blameless culture)
Detect (alert) → triage (impact, severity) → mitigate first (rollback, scale, failover, feature flag off) → communicate (status updates) → resolve → **blameless postmortem** (timeline, root cause, contributing factors, action items) → follow through.
**Your RCA mindset from OneFS:** decide whether it's a product bug, an automation bug, or infrastructure **before** changing code; look for patterns across failures; reproduce deliberately; validate the fix with regression runs.

## 12. Hands-on: configs and code

### Instrumenting a Python service (prometheus_client)
```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server
COLLECTIONS = Counter("collections_processed_total", "Collections processed", ["product", "status"])
LATENCY = Histogram("collection_processing_seconds", "End-to-end processing time", ["product"],
                    buckets=[5, 15, 30, 60, 120, 180, 240, 300, 600])   # include the SLA boundary (300 s)
IN_FLIGHT = Gauge("collections_in_flight", "Collections being processed")

start_http_server(9100)                    # exposes /metrics for Prometheus to scrape
def process(c):
    IN_FLIGHT.inc()
    with LATENCY.labels(c.product).time():
        try:
            do_work(c); COLLECTIONS.labels(c.product, "ok").inc()
        except Exception:
            COLLECTIONS.labels(c.product, "error").inc(); raise
        finally:
            IN_FLIGHT.dec()
```

What the endpoint returns (the text exposition format):

```
collections_processed_total{product="Unity",status="ok"} 18342
collection_processing_seconds_bucket{product="Unity",le="300"} 18190
collection_processing_seconds_bucket{product="Unity",le="+Inf"} 18342
collection_processing_seconds_sum{product="Unity"} 1.2e6
collection_processing_seconds_count{product="Unity"} 18342
```

SLA compliance straight from the histogram: `sum(rate(..._bucket{le="300"}[1h])) / sum(rate(..._count[1h]))`.

### prometheus.yml (scrape config) and recording rules
```yaml
global: { scrape_interval: 15s, evaluation_interval: 15s }
rule_files: ["rules/*.yml"]
alerting: { alertmanagers: [{ static_configs: [{ targets: ["alertmanager:9093"] }] }] }
scrape_configs:
  - job_name: node
    static_configs: [{ targets: ["10.0.0.5:9100", "10.0.0.6:9100"] }]
  - job_name: k8s-pods
    kubernetes_sd_configs: [{ role: pod }]
    relabel_configs:                       # scrape only pods annotated prometheus.io/scrape=true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: "true"
```
```yaml
# rules/recording.yml: precompute expensive queries
groups:
  - name: sla
    rules:
      - record: job:collection_sla_ratio:1h
        expr: sum(rate(collection_processing_seconds_bucket{le="300"}[1h])) / sum(rate(collection_processing_seconds_count[1h]))
```

With the Prometheus Operator in Kubernetes, you declare `ServiceMonitor`/`PodMonitor` resources instead of editing prometheus.yml.

### Alertmanager routing (excerpt)
```yaml
route:
  receiver: team-slack
  group_by: [alertname, product]
  group_wait: 30s
  repeat_interval: 4h
  routes: [{ matchers: [severity="page"], receiver: oncall-pager }]
receivers:
  - name: team-slack
    slack_configs: [{ channel: "#telemetry-alerts" }]
  - name: oncall-pager
    pagerduty_configs: [{ routing_key: "<secret>" }]
inhibit_rules:                            # don't page for symptoms when the cause is already firing
  - source_matchers: [alertname="KafkaDown"]
    target_matchers: [alertname="ConsumerLagHigh"]
```

### SLO / error budget arithmetic
SLO 99.9% over 30 days → error budget = 0.1% → **43.2 minutes** of "bad" time (or 0.1% of requests). **Burn rate** = actual error rate ÷ allowed error rate. A burn rate of 14.4 over 1 hour consumes 2% of a 30-day budget, which is a common "page now" threshold (multi-window, multi-burn-rate alerts from the Google SRE workbook).

### Grafana
Data sources → dashboards → panels → queries. **Variables** (`$product` from `label_values(collections_processed_total, product)`) make one dashboard serve every product line. **Provisioning as code** (dashboards as JSON, data sources as YAML in Git); **Grafana alerting** (multi-data-source rules, contact points, notification policies); annotations from deploy events. **Loki + LogQL** (Grafana's log store; indexes labels only):

```logql
{app="processor", env="prod"} |= "ERROR" | json | product="Unity"
sum by (product) (rate({app="processor"} |= "FAILED" [5m]))
```

### Splunk: more SPL and configuration
```spl
index=telemetry sourcetype=processor
| eval sla=if(processing_s<=300,"ok","breach")          # computed fields
| stats count by product, sla
| eventstats sum(count) as total by product
| eval pct=round(100*count/total,2) | where sla="breach" | sort - pct

index=app status>=500 | top limit=10 uri                 # most common failing endpoints
index=app | dedup request_id | table _time request_id user status
index=app | transaction request_id maxspan=5m            # group events of one request (expensive)
index=app | lookup product_owners product OUTPUT owner   # enrich from a CSV lookup
index=app earliest=-24h latest=now | timechart span=1h count by level
```

Config files: `inputs.conf` (on forwarders: what to monitor), `props.conf`/`transforms.conf` (parsing: line breaking, timestamp extraction, field extraction), `outputs.conf` (where to send). **Search-time vs index-time field extraction** (prefer search time: flexible, no reindexing).

```ini
# inputs.conf on a universal forwarder
[monitor:///var/log/processor/*.log]
index = telemetry
sourcetype = processor
```

### ELK: pipeline configs
```ruby
# logstash.conf
input  { beats { port => 5044 } }
filter {
  grok { match => { "message" => "%{TIMESTAMP_ISO8601:ts} %{LOGLEVEL:level} %{WORD:service} %{GREEDYDATA:msg}" } }
  date { match => ["ts", "ISO8601"] target => "@timestamp" }    # normalise timestamps (your ES lesson)
  mutate { remove_field => ["ts"] }
}
output { elasticsearch { hosts => ["http://es:9200"] index => "app-logs-%{+YYYY.MM.dd}" } }
```
```yaml
# filebeat.yml
filebeat.inputs:
  - type: filestream
    paths: [/var/log/processor/*.log]
    parsers: [{ ndjson: { target: "" } }]     # JSON logs parsed directly
output.logstash: { hosts: ["logstash:5044"] }
```

**KQL in Kibana:** `level:ERROR and service:processor and not product:"Unity"`, `processing_s > 300`.
**ILM policy:** hot (rollover at 50 GB or 1 day) → warm after 7 days (shrink, force-merge) → delete after 30 days.

### OpenTelemetry tracing (Python)
```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

trace.set_tracer_provider(TracerProvider())
trace.get_tracer_provider().add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint="otel-collector:4317")))
tracer = trace.get_tracer("processor")

def process(c):
    with tracer.start_as_current_span("process_collection", attributes={"product": c.product}):
        with tracer.start_as_current_span("download"): download(c)
        with tracer.start_as_current_span("parse"): parse(c)
        with tracer.start_as_current_span("write_parquet"): write(c)
```

Auto-instrumentation exists for FastAPI, requests/httpx, Kafka clients and databases. The **OTel Collector** receives, processes (batching, sampling) and exports to Jaeger/Tempo/vendors. This per-stage tracing is exactly what would have made the 5-minute SLA debuggable stage by stage.

## Interview Q&A

**Q: Monitoring vs observability?** Known failure checks vs the ability to investigate unknown failures from rich telemetry.
**Q: Counter vs gauge vs histogram?** Monotonic vs up/down vs bucketed distributions (for percentiles).
**Q: Why not use average latency?** Averages hide the tail; users feel p99.
**Q: Why is high cardinality bad in Prometheus?** Each label combination is its own series, so memory and query cost explode.
**Q: How did you monitor the 5-minute SLA?** Processing-time histograms per product line → Grafana percentiles + SLA compliance over rolling windows → alerts on breach risk; lag dashboards; Splunk for per-collection investigation.
**Q: Pull vs push metrics?** Pull: central control, easy up/down detection, natural for Kubernetes service discovery. Push: short-lived jobs, firewalled sources.
**Q: How would you reduce alert noise?** Symptom-based SLO burn alerts, consecutive-failure thresholds (your CELOG feature), grouping/dedup in Alertmanager, runbooks, delete unactionable alerts.

## Quick revision

- Metrics/logs/traces; OpenTelemetry; tracing was your platform's gap.
- Golden signals; RED/USE; SLI/SLO/SLA/error budget; burn-rate alerts; percentiles.
- Prometheus: pull/scrape, exporters, Pushgateway, counter/gauge/histogram/summary, cardinality, PromQL (`rate`, `sum by`, `histogram_quantile`, `increase`), Alertmanager.
- Grafana = visualisation over data sources; your SLA dashboards.
- Splunk: forwarders → indexers → search heads; SPL `stats`/`timechart`/`rex`; licence by ingest volume.
- ELK: Elasticsearch + Logstash + Kibana + Beats; stdout → DaemonSet shipper; ILM.
- Structured logs, no secrets, consistent timestamps; actionable alerts; CELOG consecutive-failure design; blameless postmortems.

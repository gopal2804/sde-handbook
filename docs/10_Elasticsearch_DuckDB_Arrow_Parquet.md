# 10 · Elasticsearch, DuckDB, Apache Arrow, Parquet (and data formats)

These four are **your** technologies: the telemetry platform wrote Parquet, indexed metadata in Elasticsearch, and your internship benchmarked DuckDB against Apache Arrow on Parquet files from 10 MB to 4 GB. Interviewers will go deep here because it's on your resume. Know the *why* behind each.

---

# Start here: the four technologies in plain words

### Row vs column storage: a picture first
A table of telemetry collections:

| id | product | size_mb | status |
|---|---|---|---|
| 1 | Unity | 420 | OK |
| 2 | PowerStore | 380 | FAILED |
| 3 | Unity | 510 | OK |

```
ROW storage (MySQL, CSV):     [1,Unity,420,OK][2,PowerStore,380,FAILED][3,Unity,510,OK]
   → great for "give me order #2 with all its fields"

COLUMN storage (Parquet, DuckDB): id:[1,2,3]  product:[Unity,PowerStore,Unity]  size_mb:[420,380,510]  status:[OK,FAILED,OK]
   → great for "average size_mb": read ONE column, skip the rest; similar values sit together → compress very well
```

**Analogy:** row storage is a stack of **filled-in forms** (to read everyone's age you flip through every form). Column storage is a **spreadsheet sorted by column**: one glance down the "age" column.

### Parquet: a file format for analytics
**Plain words:** a way to save a big table into a file **by columns**, compressed, with a "table of contents" at the end that says what's where and the min/max of each chunk. Tools can then read only the columns and chunks they need.
**Analogy:** a well-indexed textbook, where you can jump straight to chapter 7 instead of reading the whole book.

### Apache Arrow: a shared in-memory format
**Plain words:** a standard way to lay out a table **in RAM, by columns**, so different tools (Pandas, DuckDB, Spark, Polars) can hand data to each other **without converting it**.
**Analogy:** the **standard shipping container**. Before containers, every port repacked goods for each ship and truck. With a standard container, goods move between ship, train and truck untouched. Arrow is that container for data in memory; Parquet is how the container is stored in the warehouse (on disk).

```
Parquet file (disk, compressed) ──read──► Arrow table (RAM, columnar) ──zero-copy──► Pandas / DuckDB / Polars / Spark
```

### DuckDB: SQLite for analytics
**Plain words:** a **database engine that lives inside your program** (no server to install or run) and is built for **analytical queries** (sums, averages, group-bys over millions of rows). It can run SQL directly on Parquet/CSV files.
**Analogy:** a powerful calculator you carry in your pocket, vs a call centre (a database server) you have to phone.

```
 Your app process
 ┌───────────────────────────────────────────────────────┐
 │ app code ──SQL──► DuckDB library (in-process)          │
 │                    parser → optimiser → VECTORISED     │
 │                    executor (processes batches of     │
 │                    ~2,048 values per operator)        │
 └───────────────────────┬───────────────────────────────┘
                         ▼ reads only the needed columns / row groups
              Parquet / CSV / JSON files (local disk or S3)
```

### Elasticsearch: a search engine database
**Plain words:** a distributed system that stores JSON documents and builds an **inverted index** so it can find documents containing words, or matching filters, in milliseconds, plus fast aggregations for dashboards.
**Analogy:** the **index at the back of a book**, for millions of books, split across many librarians who search their shelves in parallel.

```
Inverted index:   "timeout" → [doc 3, doc 9, doc 42]      "licence" → [doc 9, doc 17]
query "licence timeout" → intersect → doc 9

ELASTICSEARCH CLUSTER
 Client ──► any node (acts as COORDINATOR) ──► fans the query out to one copy of each shard, merges the results
 ┌──────────── Node 1 ───────────┐ ┌──────────── Node 2 ───────────┐ ┌──────────── Node 3 ───────────┐
 │ P0 (primary shard 0)          │ │ P1                            │ │ P2                            │
 │ R1 (replica of shard 1)       │ │ R2                            │ │ R0                            │
 └───────────────────────────────┘ └───────────────────────────────┘ └───────────────────────────────┘
 Index "collections-meta" = 3 primary shards + 1 replica each, spread so losing any one node loses no data.
 Master-eligible nodes keep the cluster state (which shard lives where).
```

# Part A: Row vs columnar: the idea behind everything here

| | Row-oriented | Column-oriented |
|---|---|---|
| Layout | `[id, name, size, ts][id, name, size, ts]…` | `[id, id, id…][name, name…][size, size…]` |
| Good at | Reading/writing **whole records**; point lookups; transactions (**OLTP**) | Scanning **a few columns over many rows**: aggregates, analytics (**OLAP**) |
| Compression | Mixed types per row → weaker | Same type and similar values per column → **excellent** (dictionary, run-length, delta) |
| Examples | MySQL, PostgreSQL, CSV, JSON, Avro | **Parquet**, ORC, **Arrow**, **DuckDB**, ClickHouse, Snowflake, BigQuery, Redshift |

**Why columnar is fast for analytics:** `SELECT AVG(size) FROM logs WHERE product='Unity'` reads only the `size` and `product` columns, skipping the rest. Compressed columns mean less I/O, and CPUs process same-typed arrays fast with **SIMD/vectorised** execution.

**OLTP vs OLAP:** OLTP = many small transactions (orders, bookings). OLAP = few big analytical queries (dashboards, reports). Use different systems, usually feeding OLTP data into OLAP through **ETL/ELT** pipelines (like your telemetry pipeline feeding downstream analytics).

---

# Part B: Parquet

**Why it exists:** created in 2013 by Twitter and Cloudera for the Hadoop ecosystem, to give analytics an **open, efficient, columnar file format on disk** that any engine can read.

## Structure
```
Parquet file
├── Row group 1 (e.g. ~128 MB of rows)
│     ├── Column chunk: id      → pages (compressed, encoded)
│     ├── Column chunk: product → pages
│     └── Column chunk: size    → pages
├── Row group 2 …
└── Footer: schema + per-row-group, per-column STATISTICS (min, max, null count) + offsets
```

- **Column pruning:** read only the needed columns.
- **Predicate pushdown / row-group skipping:** the footer's min/max stats let a reader skip whole row groups (`WHERE ts > X` skips groups whose max ts < X).
- **Encodings:** dictionary encoding (repeated strings → small integers: great for product names and status codes), run-length encoding, bit-packing, delta encoding.
- **Compression codecs:** Snappy (fast, the common default), **Zstd** (better ratio, still fast), Gzip.
- **Schema embedded** in the footer, so the file is self-describing. Supports nested types.
- **Immutable:** you don't update a Parquet file in place; you write new files. (Table formats like **Apache Iceberg / Delta Lake / Hudi** add transactions, updates and time travel on top of Parquet files: the "lakehouse".)
- **Splittable:** row groups can be processed in parallel by different workers.

**Small files problem:** thousands of tiny Parquet files → too many footers and opens → slow. Batch/compact into bigger files (hundreds of MB).

## Why Parquet in your telemetry pipeline
> "Downstream teams ran analytical queries over telemetry: specific columns across huge numbers of collections. Parquet's columnar layout plus compression meant much less I/O and storage. Log data is extremely repetitive, so dictionary encoding compresses it very well, and every analytics engine reads Parquet. The output files are large and immutable, so they went to object storage (Dell ECS), with only the metadata and the file path indexed in Elasticsearch."

## Why NOT Parquet for OneFS uptime telemetry transport (great contrast)
On the producer side (inside the storage cluster), records were collected incrementally and shipped over the network, so **gzip NDJSON** was right: appendable, streamable, and a truncated upload still yields all complete lines. Parquet needs whole row groups before writing and is optimised for **analysis at rest**, not **transport**.
> "Same family of problem, opposite answer, because the constraint was different." Interviewers love this line.

---

# Part C: Data formats compared (asked as "which format would you use?")

| Format | Type | Schema | Splittable | Human-readable | Best for |
|---|---|---|---|---|---|
| CSV | row, text | none | yes (if uncompressed) | yes | simple exports; breaks on commas and newlines inside values |
| JSON | row, text | none | no (one big document) | yes | APIs, configs |
| **NDJSON / JSON Lines** | row, text, one record per line | none | **yes** | yes | **logs, streaming, appendable records** |
| XML | tree, text | XSD | no | yes (verbose) | legacy enterprise systems (your pipeline produced XML for some consumers) |
| **Avro** | row, binary | **required, travels with the data**; schema evolution | yes | no | **Kafka messages**, row-based pipelines (with a Schema Registry) |
| Protobuf | row, binary | `.proto` file | n/a | no | RPC (gRPC), compact messages |
| **Parquet** | **columnar**, binary | embedded | yes | no | **analytics at rest**, data lakes |
| ORC | columnar | embedded | yes | no | the Hive ecosystem |
| **Arrow** | **columnar, in-memory** | embedded | n/a | no | **zero-copy exchange between processes/engines** |

**Schema evolution:** adding optional fields with defaults is backward compatible. Removing or renaming fields breaks consumers. Schema registries enforce compatibility rules.

---

# Part D: Apache Arrow

**Why it exists (2016):** every engine (Pandas, Spark, databases) had its own in-memory format, so moving data between them meant expensive **serialisation and copying**. Arrow defines **one standard columnar in-memory format**, so tools can share data **without copying** (zero-copy).

- Columnar in memory, cache-friendly, SIMD-friendly.
- **Arrow IPC / Feather** for files and streams; **Arrow Flight** (gRPC-based) for fast network transfer.
- Pandas 2.x can use Arrow-backed types; Polars and DuckDB use Arrow internally or interoperate with it; Spark uses it for Python UDFs.
- **Arrow is a format plus libraries (compute kernels), not a database or query engine.** That distinction was the heart of your internship result.

---

# Part E: DuckDB

**Why it exists (2019, CWI Amsterdam):** "**SQLite for analytics**." An **embedded** (in-process, no server), **columnar, vectorised** OLAP SQL engine. You add a library and run fast analytical SQL directly over Parquet/CSV/JSON files, with no cluster to deploy.

- **Vectorised execution:** processes batches (vectors) of values per operator instead of one row at a time, so it's CPU-efficient.
- Reads Parquet **directly**, with column pruning and predicate pushdown: `SELECT product, avg(size) FROM 'collections/*.parquet' GROUP BY product;`
- Can spill to disk for larger-than-memory queries; parallelises across cores.
- Interoperates with Pandas, Polars and Arrow (zero-copy).
- Has a JDBC driver (so it fits a Scala/JVM service as one dependency).

## Your internship benchmark (know this cold)
**Question:** can we query the Parquet output efficiently in-process, and with which engine?
**Method:** load tests at **10 MB, 1 GB, 2 GB, 4 GB**, measuring query latency, scalability and memory use.
**Findings:**

- **DuckDB, table mode:** the whole dataset was loaded into memory, so memory grew with dataset size and became the bottleneck.
- **DuckDB, view mode:** a view over the Parquet files keeps the data on disk and reads only what each query needs, so performance stayed roughly flat as data grew. **The winner.**
- **Apache Arrow:** no equivalent of a view (data materialised in memory) and **no SQL**, so query logic had to be hand-coded as filters/conditionals. That's slower to build and harder to maintain.
**Recommendation:** DuckDB with views; presented to the platform team.
**Why an embedded engine at all?** No extra service to deploy, secure or operate. One dependency, versus standing up PostgreSQL or Spark for "SQL over Parquet files we already have."
**What you'd do differently now (say this; it shows maturity):** "I measured mean latency. I'd now also measure p95/p99, concurrent queries, and cold vs warm cache, because a single-threaded mean doesn't show real-world behaviour."

**DuckDB vs SQLite:** both embedded. SQLite is row-oriented OLTP (great for app state; your extension backend's usage counters use SQLite). DuckDB is columnar OLAP (great for analytics).
**DuckDB vs Spark:** DuckDB is single-node and very fast up to large single-machine datasets. Spark is distributed for truly huge data, with much more operational overhead.

---

# Part F: Elasticsearch

**Why it exists:** relational databases are bad at **full-text search** and flexible multi-field filtering over huge document sets. Elasticsearch (2010, built on the **Apache Lucene** library) is a **distributed search and analytics engine** with a REST/JSON API.

## Core concepts

| ES term | Rough analogy |
|---|---|
| Index | table (a collection of documents) |
| Document | row (a JSON object) |
| Field | column |
| Mapping | schema (field types: `keyword`, `text`, `date`, `long`, `nested`…) |
| Shard | a horizontal partition of an index (each shard is a Lucene index) |
| Replica | a copy of a shard on another node (high availability + read throughput) |

## The inverted index (the core idea; always asked)
Like the index at the back of a book: **term → list of documents containing it**.

```
"timeout"  → [doc3, doc9, doc42]
"powerstore" → [doc1, doc3]
```

A search for "powerstore timeout" intersects the lists, so finding matches is fast without scanning every document.

- **Analysers** (applied at index and query time): character filters → **tokenizer** (split text into terms) → token filters (lowercase, stemming "running"→"run", stop words, synonyms).
- **`text` vs `keyword`:** `text` is analysed (for full-text search). `keyword` is stored exactly (for **filters, sorting, aggregations**: IDs like `systemId`, status, product). Using the wrong type is a classic bug: a terms aggregation on a `text` field doesn't work as expected.
- **Doc values:** a columnar on-disk structure per field used for sorting and aggregations.

## How writes and searches work

- **Write:** goes to the primary shard (routed by `hash(_id) % number_of_primary_shards`) → written to an in-memory buffer + the **translog** (durability) → **refresh** (default every 1 s) creates a new searchable **segment** → so ES is **near-real-time** (a document is searchable about 1 s after indexing, not instantly) → replicated to replica shards → segments get **merged** in the background.
- **Search:** "query then fetch". The coordinating node sends the query to one copy of every shard, each returns its top hits, the coordinator merges them, then fetches the documents.
- **Number of primary shards can't be changed** after creating the index (routing depends on it). You reindex, or use split/shrink APIs. Too many small shards waste memory; a common guideline is shards of tens of GB.

## Query vs filter context

- **Query context:** "how well does it match?" (relevance **score**, BM25). Use for full-text search.
- **Filter context:** "does it match, yes or no?" No scoring, **cacheable**, faster. Use for exact matches, ranges and IDs.

```json
GET collections-meta/_search
{
  "query": { "bool": {
      "filter": [
        { "term":  { "product": "PowerStore" } },
        { "range": { "startTime": { "gte": "now-1h" } } } ] } },
  "aggs": { "avg_processing": { "avg": { "field": "overallCollectionProcessingTime" } } },
  "size": 20
}
```

- **BM25:** the default relevance scoring: term frequency (with saturation) × inverse document frequency (rare terms matter more), normalised by document length.
- **Aggregations:** bucket (`terms`, `date_histogram`, `range`) and metric (`avg`, `sum`, `percentiles`, `cardinality`): this is what powers Kibana dashboards.

## Cluster

- Node roles: master-eligible (cluster state; use 3 dedicated masters to avoid split brain), data (hot/warm/cold tiers), ingest, coordinating.
- **Health:** green (all shards assigned), yellow (primaries OK, some replicas unassigned: common on a single node), red (some primary shards missing → data unavailable).
- **ILM (index lifecycle management):** roll over time-based indices (`logs-2026.11.20`), move old data to warm/cold nodes, delete after retention. Essential for logs and telemetry.

## Why Elasticsearch for your telemetry metadata
> "Downstream needed to **search** collections by systemId, time range, product line and status, and to aggregate processing times. That's a search and aggregation problem: inverted index, fast filters, aggregations, and Kibana for operational visibility. We stored only the **metadata and a pointer** (the Parquet path on object storage), never the files themselves."
**The caveat to volunteer:** "Elasticsearch was the metadata **index**, not the source of truth. It's near-real-time, has no multi-document transactions, and can lose acknowledged writes in rare failure scenarios, so you shouldn't use it as your primary database."

**Your timestamp normalisation work:** product lines reported times in different formats and time zones. If date fields aren't consistent (ISO-8601, UTC), range queries and date histograms silently give wrong results. Normalising at ingest is a **data consistency** story.

## Elasticsearch vs alternatives

- **OpenSearch:** AWS's fork after Elastic's 2021 licence change. In 2024 Elastic added the AGPL option, making Elasticsearch open source again.
- **Vector search:** Elasticsearch/OpenSearch support **dense vector kNN** (HNSW), so they're used for **hybrid search (BM25 + vectors) in RAG** (file 21).
- **Solr:** also Lucene-based; older.

---

---

# Part G: Hands-on: commands and code for each

## Elasticsearch REST API, from CRUD to aggregations
```http
# Create an index with explicit settings and mappings
PUT /collections-meta
{
  "settings": { "number_of_shards": 3, "number_of_replicas": 1, "refresh_interval": "1s" },
  "mappings": {
    "properties": {
      "systemId":   { "type": "keyword" },
      "product":    { "type": "keyword" },
      "status":     { "type": "keyword" },
      "summary":    { "type": "text", "analyzer": "english" },
      "startTime":  { "type": "date" },
      "processingSeconds": { "type": "integer" },
      "parquetPath": { "type": "keyword", "index": false },
      "nodes": { "type": "nested", "properties": { "lnn": { "type": "integer" }, "health": { "type": "keyword" } } }
    }
  }
}

# Index (create/replace) a document; GET it; partial update; delete
PUT  /collections-meta/_doc/APM001-20261120-01  { "systemId": "APM001", "product": "PowerStore", "status": "PROCESSED", "startTime": "2026-11-20T09:00:00Z", "processingSeconds": 95 }
GET  /collections-meta/_doc/APM001-20261120-01
POST /collections-meta/_update/APM001-20261120-01  { "doc": { "status": "FAILED" } }
DELETE /collections-meta/_doc/APM001-20261120-01

# Bulk indexing (much faster than one request per document): NDJSON body, action line + document line
POST /_bulk
{ "index": { "_index": "collections-meta", "_id": "1" } }
{ "systemId": "APM001", "status": "PROCESSED" }
{ "index": { "_index": "collections-meta", "_id": "2" } }
{ "systemId": "UNI002", "status": "FAILED" }
```

**Query DSL: the main query types:**

```json
{ "query": { "match": { "summary": "disk timeout" } } }                  // full text (analysed)
{ "query": { "match_phrase": { "summary": "disk timeout" } } }           // exact phrase, in order
{ "query": { "term": { "status": "FAILED" } } }                          // exact value (keyword fields)
{ "query": { "terms": { "product": ["Unity", "PowerStore"] } } }
{ "query": { "range": { "processingSeconds": { "gt": 300 } } } }
{ "query": { "wildcard": { "systemId": "APM*" } } }                      // slow on big indices; prefer prefix/keyword design
{ "query": { "fuzzy": { "summary": { "value": "timout", "fuzziness": "AUTO" } } } }   // typo tolerance
{ "query": { "bool": {
    "must":     [ { "match": { "summary": "licence" } } ],               // must match, contributes to score
    "filter":   [ { "term": { "product": "PowerScale" } },
                  { "range": { "startTime": { "gte": "now-7d/d" } } } ],  // must match, no scoring, cached
    "should":   [ { "term": { "status": "FAILED" } } ],                  // optional: boosts the score
    "must_not": [ { "term": { "status": "TEST" } } ] } } }
{ "query": { "nested": { "path": "nodes", "query": { "term": { "nodes.health": "DOWN" } } } } }
```

**Aggregations:**

```json
{ "size": 0,
  "query": { "range": { "startTime": { "gte": "now-24h" } } },
  "aggs": {
    "by_product": {
      "terms": { "field": "product", "size": 10 },
      "aggs": {
        "p99_time":   { "percentiles": { "field": "processingSeconds", "percents": [50, 99] } },
        "over_sla":   { "filter": { "range": { "processingSeconds": { "gt": 300 } } } },
        "per_hour":   { "date_histogram": { "field": "startTime", "calendar_interval": "1h" } }
      } },
    "unique_systems": { "cardinality": { "field": "systemId" } } } }
```

**Pagination:** `from` + `size` (fine for the first pages; capped at 10,000 by default) → **`search_after`** with a sort key (deep pagination) + **point-in-time (PIT)** for a consistent view. Scroll is legacy, for exports.
**Useful APIs:** `GET _cat/indices?v`, `GET _cat/shards`, `GET _cluster/health`, `GET /idx/_mapping`, `POST /idx/_refresh`, `POST _reindex` (copy into a new index with new mappings), **aliases** (`POST _aliases`: point `collections-current` at the latest index, enabling zero-downtime reindexing), **index templates** (default mappings for `logs-*`), `_analyze` (see how text gets tokenised).
**Object vs nested:** arrays of objects get **flattened** in `object` fields (so "node 1 DOWN" and "node 2 lnn" could falsely match across objects); `nested` keeps each object separate (more expensive).
**Python client:** `from elasticsearch import Elasticsearch, helpers; es = Elasticsearch(url); es.search(index=..., query={...}); helpers.bulk(es, actions)`.

## DuckDB: SQL and Python
```sql
-- query Parquet files directly (globs, Hive-style partitions)
SELECT product, count(*) AS n, avg(processing_s) AS avg_s
FROM read_parquet('s3://bucket/collections/*/*.parquet', hive_partitioning = true)
WHERE day >= '2026-11-01'
GROUP BY product ORDER BY n DESC;

CREATE VIEW coll AS SELECT * FROM read_parquet('data/*.parquet');      -- the "view mode" from your benchmark
CREATE TABLE coll_mem AS SELECT * FROM read_parquet('data/*.parquet');  -- the "table mode": materialised
EXPLAIN ANALYZE SELECT count(*) FROM coll WHERE product = 'Unity';      -- see pushdown and timings
COPY (SELECT * FROM coll WHERE status = 'FAILED') TO 'failed.parquet' (FORMAT parquet, COMPRESSION zstd);
DESCRIBE coll;  SUMMARIZE coll;                                         -- schema and quick stats
```
```python
import duckdb
con = duckdb.connect()                     # in memory; duckdb.connect("file.db") to persist
df = con.sql("SELECT product, count(*) FROM 'data/*.parquet' GROUP BY 1").df()   # → pandas
con.sql("SELECT * FROM my_pandas_df WHERE x > 5")                               # query DataFrames in place
```

The S3 example needs the `httpfs` extension (`INSTALL httpfs; LOAD httpfs;`) and credentials.

## Parquet with PyArrow
```python
import pyarrow as pa, pyarrow.parquet as pq, pyarrow.compute as pc

table = pa.table({"systemId": ["APM001", "UNI002"], "product": ["PowerStore", "Unity"], "processing_s": [95, 410]})
pq.write_table(table, "out.parquet", compression="zstd", row_group_size=128_000)

pq.read_metadata("out.parquet")            # row groups, column stats
t = pq.read_table("out.parquet", columns=["product", "processing_s"],          # column pruning
                  filters=[("processing_s", ">", 300)])                          # predicate pushdown

# Partitioned dataset (Hive layout: product=Unity/part-0.parquet)
pq.write_to_dataset(table, root_path="dataset/", partition_cols=["product"])
import pyarrow.dataset as ds
dset = ds.dataset("dataset/", format="parquet", partitioning="hive")
breaches = dset.to_table(filter=ds.field("processing_s") > 300)

# Arrow compute + zero-copy-ish handoff to pandas
avg = pc.mean(table["processing_s"])
df = table.to_pandas()                     # converts to pandas (zero-copy for some numeric types)
```

**Partitioning layout matters:** partition by low-cardinality columns that queries filter on (date, product). Too many partitions → the small-files problem.
**Parquet schema evolution:** adding columns is fine (readers fill nulls); renaming or changing types needs care. Table formats (Iceberg/Delta) track the schema history.

## Arrow concepts recap with an example
```
pandas/NumPy (process A) ── Arrow IPC / shared memory ──► DuckDB / Polars (process B)
            same columnar buffers, no serialisation → "zero-copy"
```

`pa.RecordBatch` (a batch of columns), `pa.Table` (a collection of batches), `pa.Schema`, Arrow Flight for fast transfer over gRPC.

---

# Part H: Completing each technology from A to Z

### Course map
```
Elasticsearch: concepts (index, document, mapping, shard, replica) · installing · REST API & CRUD · mappings & analysers
  · query DSL · aggregations · pagination · relevance (BM25, boosting) · ingest pipelines · index templates, aliases, ILM
  · cluster architecture & node roles · scaling & sizing · snapshots/backups · security · monitoring · performance tuning · vector search
Parquet: columnar idea · file layout · encodings & compression · statistics & pushdown · schema & evolution · partitioned datasets · table formats
Arrow: in-memory columnar format · arrays/record batches/tables · compute functions · IPC/Feather · Flight · interop
DuckDB: embedded OLAP · installing & clients · SQL over files · persistence · extensions · performance · integration
```

### Elasticsearch: installing and running
```bash
docker run -d --name es -p 9200:9200 -e discovery.type=single-node -e xpack.security.enabled=false \
  docker.elastic.co/elasticsearch/elasticsearch:8.15.0          # local development only (security disabled)
curl localhost:9200                                              # cluster info
curl 'localhost:9200/_cat/health?v'
```

Kibana (`docker.elastic.co/kibana/kibana`) gives a UI and the **Dev Tools** console for running the requests in Part G.

### Ingest pipelines (transform documents on the way in)
```json
PUT _ingest/pipeline/normalise-collections
{ "processors": [
    { "date":      { "field": "startTime", "formats": ["ISO8601", "yyyy-MM-dd HH:mm:ss"], "timezone": "UTC" } },
    { "lowercase": { "field": "product" } },
    { "set":       { "field": "ingestedAt", "value": "{{_ingest.timestamp}}" } },
    { "remove":    { "field": "debugBlob", "ignore_missing": true } } ] }
POST collections-meta/_doc?pipeline=normalise-collections { "startTime": "2026-11-21 09:00:00", "product": "Unity" }
```

(Exactly the timestamp-normalisation problem you solved, done inside Elasticsearch.)

### Relevance tuning
`multi_match` across fields with boosts (`"fields": ["title^3", "summary"]`), `function_score` (boost recent or popular documents), synonyms, custom analysers (tokenizer + filters), `explain: true` to see how a score was computed.

### Sizing, performance and operations

- **Shard sizing:** aim for shards of roughly 10–50 GB; avoid thousands of tiny shards (each costs heap and file handles).
- **Heap:** give the JVM ≤ 50% of RAM (and under ~31 GB for compressed pointers); the rest is filesystem cache for Lucene.
- **Indexing speed:** bulk requests, a longer `refresh_interval` (e.g. 30 s) during heavy loads, fewer replicas during an initial load.
- **Query speed:** filters instead of queries where scoring isn't needed, `keyword` fields for aggregations, avoid leading wildcards and deep pagination.
- **Snapshots (backups):** register a repository (S3/ECS/NFS) → `PUT _snapshot/repo/snap-1` → restore with `_restore`; **SLM** policies automate them.
- **Security:** TLS between nodes and clients, users/roles (read-only dashboard users vs ingest service accounts), API keys, field/document-level security.
- **Monitoring:** `_cluster/health`, `_nodes/stats`, `_cat/thread_pool` (rejections = overload), slow logs, Stack Monitoring/Prometheus exporters.

### Elasticsearch vector search (for RAG)
```json
PUT docs { "mappings": { "properties": {
  "text": { "type": "text" },
  "embedding": { "type": "dense_vector", "dims": 1536, "index": true, "similarity": "cosine" } } } }
POST docs/_search { "knn": { "field": "embedding", "query_vector": [/* 1536 floats */], "k": 5, "num_candidates": 100 },
                    "query": { "match": { "text": "licence sync" } } }      // hybrid: vectors + BM25 together
```

### DuckDB beyond the basics

- **Clients:** CLI (`duckdb file.db`), Python, Java (JDBC), Node, R, Wasm (in the browser).
- **Persistence:** `duckdb.connect("analytics.duckdb")` stores tables in a single file; in-memory by default.
- **Extensions:** `httpfs` (S3/HTTP), `json`, `parquet` (built in), `postgres`/`mysql` scanners (query those databases directly), `spatial`, `fts` (full-text search), `iceberg`/`delta`.

```sql
INSTALL postgres; LOAD postgres;
ATTACH 'dbname=telemetry host=localhost user=app' AS pg (TYPE postgres);
SELECT product, count(*) FROM pg.public.collections GROUP BY 1;          -- join Postgres tables with Parquet files
```

- **Performance:** it uses all cores by default (`SET threads = 4;`), spills to disk beyond memory (`SET memory_limit = '4GB';`), and `PRAGMA enable_profiling`/`EXPLAIN ANALYZE` show the plan.
- **When not to use it:** many concurrent writers or an OLTP workload (use PostgreSQL); data much bigger than one machine (use Spark/Trino/a warehouse).

### Arrow beyond the basics

- **Arrays** (a typed column with a validity bitmap for nulls + data buffers) → **RecordBatch** (columns with a schema) → **Table** (chunked batches).
- **Compute functions** (`pyarrow.compute`): filter, sort, aggregate, string functions, all vectorised in C++.
- **IPC/Feather files:** fast, uncompressed-or-lightly-compressed on-disk Arrow (good for temporary storage between steps); **Parquet** is for long-term, compressed storage.
- **Arrow Flight / Flight SQL:** high-speed data transfer between services over gRPC (used by Dremio, InfluxDB and others).
- Languages: C++, Java, Rust, Go, JavaScript, Python, R; the same memory layout everywhere.

## Interview Q&A

**Q: Why is columnar storage faster for analytics?** Reads only the needed columns, compresses far better, and enables vectorised processing.
**Q: Parquet vs Avro?** Columnar for analytics at rest vs row-based with an attached schema for streaming/messages (e.g. Kafka).
**Q: What's predicate pushdown?** Applying the filter at the storage layer (using min/max stats) so irrelevant data is never read.
**Q: How does Elasticsearch search so fast?** The inverted index; filters are cached; parallel across shards.
**Q: Why is Elasticsearch "near real-time"?** A document becomes searchable only after a refresh creates a new segment (1 s by default).
**Q: Why did DuckDB beat Arrow in your benchmark?** Views kept data on disk and only scanned what was needed; Arrow materialised everything in memory and had no SQL.
**Q: text vs keyword?** Analysed for full-text vs exact for filters, sorting and aggregations.

## Quick revision

- Row (OLTP) vs columnar (OLAP); compression + column pruning + vectorisation.
- Parquet: row groups → column chunks → pages; footer stats → predicate pushdown; dictionary/RLE; Snappy/Zstd; immutable; Iceberg/Delta add tables on top.
- Formats: NDJSON (streaming/appendable), Avro (Kafka, schema evolution), Parquet (analytics), Arrow (in-memory zero-copy).
- DuckDB = embedded OLAP ("SQLite for analytics"), views over Parquet; your benchmark result + "would measure p99 now".
- Elasticsearch: inverted index, analysers, text vs keyword, shards/replicas, refresh (near-real-time), query vs filter context, BM25, aggregations, ILM; metadata index, not source of truth.

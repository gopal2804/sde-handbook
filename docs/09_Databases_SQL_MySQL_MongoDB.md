# 09 · Databases: SQL, MySQL, PostgreSQL, MongoDB, Redis

**Why databases exist:** files alone can't safely handle many users changing data at once, crashes in the middle of updates, or fast lookups over millions of rows. A database gives you **durability** (survives crashes), **concurrency control** (many users safely), **indexing** (fast queries) and a **query language**.

**Why you used them:** PostgreSQL as the destination of the OneFS uptime telemetry pipeline (RabbitMQ → parser → PostgreSQL), MySQL in your M.Tech projects (Spring Boot consent management, Hibernate CRUD), MongoDB in your Node.js blog app, SQLite for usage counters in your extension backend, plus Elasticsearch and DuckDB (file 10).

---

# Part 0: SQL and DBMS from the basics

## Start here: databases in plain words

### What a database is, and why not just files?
Imagine running a bank with Excel files on a shared drive. Two clerks open the same file and both change a balance, and one change is lost. The power goes off mid-save and the file is corrupted. Finding one customer among 50 million rows means reading everything. Anyone can open everything.

A **database management system (DBMS)** is software that solves exactly these problems:

| Problem with files | What the database gives you |
|---|---|
| Two people editing at once | **Concurrency control** (locks, MVCC) |
| Crash mid-update | **Transactions + recovery** (all-or-nothing, a write-ahead log) |
| Slow searches | **Indexes** (like a book's index) |
| Messy, duplicated data | **Schema + constraints** (rules the data must follow) |
| Everyone sees everything | **Security** (users, permissions) |
| Ad-hoc questions | **A query language** (SQL) |

### SQL in one sentence
**SQL (Structured Query Language)** is how you *describe what you want* ("customers in Pune who spent more than ₹10,000 last month") and the database figures out *how* to get it (which indexes, which join order). That's called a **declarative** language: you say what, not how.

### How a SQL query travels through a database
```
SELECT name FROM customers WHERE city = 'Pune' ORDER BY name;
   │
   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  ┌──────────────┐
│ 1. Parser    │→ │ 2. Analyser  │→ │ 3. Optimiser          │→ │ 4. Executor  │
│ checks syntax│  │ do the tables│  │ picks the cheapest plan│  │ runs the plan│
│ builds a tree│  │ and columns  │  │ "use the index on city,│  │ fetching rows│
│              │  │ exist?       │  │  then sort 300 rows"  │  │ from storage │
└──────────────┘  └──────────────┘  └──────────────────────┘  └──────┬───────┘
                                                                     ▼
                                       Buffer pool (pages cached in RAM) ⇄ data files on disk
```

### Plain-language versions of the big concepts

- **Table / row / column:** a spreadsheet tab / one line / one field. **Schema:** the rules for which columns exist and their types.
- **Primary key:** each row's unique ID, like an Aadhaar number for rows. **Foreign key:** a column that points to another table's primary key ("this order belongs to customer 42"), and the database refuses orders for customers that don't exist.
- **Index:** the index at the back of a textbook. Instead of reading every page to find "TCP", you look it up and jump to page 212. It costs extra space and must be updated when the book changes (slower writes).
- **Join:** combining two tables on a matching column, like matching a guest list with a seating chart by name.
- **Normalisation:** "store each fact in exactly one place" (the customer's city lives only in `customers`, not copied into every order), so updates can't leave contradictions. **Denormalisation** deliberately copies data to make reads faster.
- **Transaction:** a group of changes that must happen **all together or not at all**. Transferring ₹100 = debit A **and** credit B; if the server dies between them, the database undoes the debit.
- **ACID:** the four promises of a transaction: **A**tomic (all or nothing), **C**onsistent (rules always hold), **I**solated (concurrent transactions don't see each other's half-done work), **D**urable (once it says "committed", a crash won't lose it).
- **Isolation levels:** how much concurrent transactions can see of each other. Stronger isolation = fewer weird anomalies but less parallelism.
- **MVCC:** instead of making readers wait for writers, the database keeps **old versions** of rows. Each transaction reads a consistent **snapshot**, like reading yesterday's printed newspaper while today's is being typeset.
- **Write-ahead log (WAL):** before changing the real data, the database writes "I'm about to do X" into a sequential diary on disk. After a crash, it replays the diary. Sequential diary writes are fast; the real data pages are updated later.
- **Replication:** live copies of the database on other servers (for failover and read scaling). **Sharding:** splitting the data itself across servers (customers A–M on server 1, N–Z on server 2) when one server can't hold or handle it all.

### MySQL architecture (layers)
```
┌──────────────────────────────────────────────────────────────────────┐
│ Clients (apps, mysql CLI) ── TCP 3306                                │
├──────────────────────────────────────────────────────────────────────┤
│ CONNECTION LAYER: thread per connection, authentication, TLS         │
├──────────────────────────────────────────────────────────────────────┤
│ SQL LAYER (server): parser → optimiser → executor; built-in functions│
│                     binlog (logical change log → replication, PITR)  │
├──────────────────────────────────────────────────────────────────────┤
│ STORAGE ENGINE API  (pluggable: InnoDB (default), MyISAM, Memory…)   │
├──────────────────────────────────────────────────────────────────────┤
│ InnoDB                                                               │
│  In memory:  Buffer pool (cached data + index pages; LRU)            │
│              Change buffer (defers secondary-index updates)          │
│              Adaptive hash index · Log buffer                        │
│  On disk:    Tablespaces (.ibd: clustered B+ tree per table)         │
│              Redo log (WAL: crash recovery)                          │
│              Undo logs (rollback + MVCC old versions)                │
│              Doublewrite buffer (protects against torn page writes)  │
└──────────────────────────────────────────────────────────────────────┘
```

**A write in InnoDB, step by step:** `UPDATE` → find the page (load it into the buffer pool if needed) → write the old version to the **undo log** → change the page in memory (now "dirty") → record the change in the **redo log buffer** → on `COMMIT`, flush the redo log to disk (fsync) → acknowledge the client → later, a background thread writes dirty pages to the data files (checkpointing). The binlog is also written for replication (coordinated with the redo log by a two-phase commit inside MySQL).

### PostgreSQL architecture (processes)
```
Clients ── TCP 5432 ──► postmaster (listens; forks one BACKEND PROCESS per connection)
                              │
     ┌────────────────────────┼─────────────────────────────────────────┐
     │ Backend processes (one per client): parse → plan → execute       │
     │                              │                                   │
     │        SHARED MEMORY: shared_buffers (page cache) · WAL buffers · lock tables
     │                              │                                   │
     │ Background processes:                                            │
     │   WAL writer (flushes WAL) · checkpointer · background writer    │
     │   autovacuum (cleans dead row versions, updates statistics)      │
     │   WAL sender ──► streaming replication to standbys               │
     └──────────────────────────────┼───────────────────────────────────┘
                                    ▼
                 Data files (heap tables + separate B-tree indexes) · pg_wal (WAL segments)
```

**PostgreSQL MVCC in plain words:** an `UPDATE` doesn't overwrite the row. It writes a **new row version** and marks the old one as dead for future transactions. Old transactions still see the old version. **VACUUM** later reclaims the dead versions. Because every connection is a whole OS process, many connections are expensive, which is why **PgBouncer** (a connection pooler) is common.

### Replication and sharding (diagram)
```
REPLICATION (copies)                                SHARDING (splitting)
 App writes ──► PRIMARY ──binlog/WAL──► REPLICA 1    App ──► router: hash(customer_id) % 3
 App reads  ──► REPLICA 1/2 (may lag)  ► REPLICA 2           ├─► Shard 0 (customers 0,3,6…) + its replicas
 Failover: promote a replica if the primary dies             ├─► Shard 1 (1,4,7…)
                                                             └─► Shard 2 (2,5,8…)
```

### The four NoSQL families in one picture
```
Key-value (Redis, DynamoDB)   Document (MongoDB)         Wide-column (Cassandra)          Graph (Neo4j)
 "user:42" → {...}            { _id, name,               row key → {col1, col2, … sparse} (Asha)─FOLLOWS→(Ravi)
 fastest; lookups by key        orders: [ … ] }          huge write throughput             relationships first
```

## 0.1 DBMS vs RDBMS vs file system

- **File system:** data in files, with redundancy, no concurrency control, no query language, and integrity enforced by hand.
- **DBMS:** software to store, query and manage data (with concurrency, recovery, security).
- **RDBMS:** a DBMS based on the **relational model**: data in **tables (relations)** of **rows (tuples)** and **columns (attributes)**, linked by keys, queried with **SQL**. MySQL, PostgreSQL, Oracle, SQL Server, SQLite.
- **Schema** (structure) vs **instance** (data at a moment). **Three-schema architecture:** external (views), conceptual (logical schema), internal (physical storage). This gives **data independence** (change storage without changing apps).

## 0.2 SQL command categories (know all five)

| Category | Purpose | Commands |
|---|---|---|
| **DDL**: Data Definition Language | Define/change structure | `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `RENAME`, `COMMENT` |
| **DML**: Data Manipulation Language | Change data | `INSERT`, `UPDATE`, `DELETE`, `MERGE`/upsert |
| **DQL**: Data Query Language | Read data | `SELECT` (often grouped under DML) |
| **DCL**: Data Control Language | Permissions | `GRANT`, `REVOKE` |
| **TCL**: Transaction Control Language | Transactions | `COMMIT`, `ROLLBACK`, `SAVEPOINT`, `SET TRANSACTION` |

DDL statements usually **auto-commit** in MySQL (you can't roll back a `DROP TABLE` there); PostgreSQL supports transactional DDL.

## 0.3 Data types (MySQL/PostgreSQL)

| Kind | Types | Notes |
|---|---|---|
| Integer | `TINYINT`, `SMALLINT`, `INT`, `BIGINT` | use BIGINT for IDs that may grow large |
| Exact decimal | `DECIMAL(10,2)` / `NUMERIC` | **money** (never FLOAT) |
| Approximate | `FLOAT`, `DOUBLE` / `REAL` | scientific values |
| Text | `CHAR(n)` (fixed), `VARCHAR(n)` (variable), `TEXT` | |
| Date/time | `DATE`, `TIME`, `DATETIME`, `TIMESTAMP` (MySQL converts to UTC), PostgreSQL `TIMESTAMPTZ` | store UTC |
| Boolean | `BOOLEAN` (MySQL: TINYINT(1)) | |
| Binary | `BLOB` / `BYTEA` | avoid big blobs (use object storage) |
| JSON | `JSON` (MySQL), `JSONB` (PostgreSQL: binary, indexable) | semi-structured fields |
| Others | `ENUM`, `UUID` (PG), arrays (PG) | |

## 0.4 DDL: creating and changing structure
```sql
CREATE DATABASE telemetry;
USE telemetry;                                     -- MySQL (PostgreSQL: \c telemetry)

CREATE TABLE products (
    product_id   INT PRIMARY KEY AUTO_INCREMENT,   -- PostgreSQL: GENERATED ALWAYS AS IDENTITY / SERIAL
    name         VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE systems (
    system_id    VARCHAR(32)  PRIMARY KEY,
    product_id   INT          NOT NULL,
    customer     VARCHAR(100) NOT NULL,
    nodes        INT          DEFAULT 3 CHECK (nodes > 0),
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE collections (
    collection_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    system_id     VARCHAR(32) NOT NULL REFERENCES systems(system_id),
    status        ENUM('RECEIVED','PROCESSED','FAILED') NOT NULL DEFAULT 'RECEIVED',
    size_mb       DECIMAL(10,2),
    received_at   DATETIME NOT NULL,
    processing_s  INT
);

ALTER TABLE systems ADD COLUMN region VARCHAR(20);
ALTER TABLE systems MODIFY COLUMN customer VARCHAR(200);      -- PostgreSQL: ALTER COLUMN ... TYPE
ALTER TABLE systems DROP COLUMN region;
ALTER TABLE systems RENAME TO clusters;                        -- or: RENAME TABLE a TO b (MySQL)
CREATE INDEX idx_coll_sys_time ON collections(system_id, received_at);
DROP INDEX idx_coll_sys_time ON collections;                   -- PostgreSQL: DROP INDEX idx_coll_sys_time;
TRUNCATE TABLE collections;                                    -- remove all rows fast; keeps the structure
DROP TABLE IF EXISTS temp_stats;                               -- remove the table entirely
```

## 0.5 DML: changing data
```sql
INSERT INTO products (name) VALUES ('PowerStore'), ('Unity'), ('PowerScale');
INSERT INTO systems (system_id, product_id, customer) VALUES ('APM001', 1, 'Acme');
INSERT INTO archive_collections SELECT * FROM collections WHERE received_at < '2026-01-01';   -- insert from a query

UPDATE collections SET status = 'PROCESSED', processing_s = 95 WHERE collection_id = 42;
UPDATE systems SET nodes = nodes + 1 WHERE system_id = 'APM001';
DELETE FROM collections WHERE status = 'FAILED' AND received_at < NOW() - INTERVAL 30 DAY;
-- ⚠ UPDATE/DELETE without WHERE changes EVERY row. Run the SELECT with the same WHERE first.

-- Upsert
INSERT INTO daily_stats (day, product_id, cnt) VALUES ('2026-11-20', 1, 1)
  ON DUPLICATE KEY UPDATE cnt = cnt + 1;                                    -- MySQL
INSERT INTO daily_stats (day, product_id, cnt) VALUES ('2026-11-20', 1, 1)
  ON CONFLICT (day, product_id) DO UPDATE SET cnt = daily_stats.cnt + 1;     -- PostgreSQL
```

## 0.6 DQL: SELECT from the basics
```sql
SELECT DISTINCT product_id FROM systems;
SELECT c.collection_id AS id, c.size_mb * 1024 AS size_kb FROM collections c;   -- aliases, expressions
SELECT * FROM collections
WHERE status IN ('FAILED', 'RECEIVED')
  AND size_mb BETWEEN 10 AND 500
  AND system_id LIKE 'APM%'                 -- % = any characters, _ = one character
  AND processing_s IS NOT NULL
ORDER BY received_at DESC, size_mb ASC
LIMIT 20 OFFSET 40;                          -- page 3 of 20 (SQL Server: OFFSET … FETCH NEXT …)

-- Aggregates: COUNT, SUM, AVG, MIN, MAX
SELECT status, COUNT(*) AS n, AVG(processing_s) AS avg_s, MAX(size_mb) FROM collections GROUP BY status;

-- CASE (conditional logic), COALESCE (first non-null), NULLIF
SELECT collection_id,
       CASE WHEN processing_s <= 300 THEN 'within SLA'
            WHEN processing_s IS NULL THEN 'pending'
            ELSE 'breached' END AS sla,
       COALESCE(size_mb, 0) AS size
FROM collections;

-- SLA compliance % per product (conditional aggregation)
SELECT p.name,
       ROUND(100.0 * SUM(CASE WHEN c.processing_s <= 300 THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_within_sla
FROM collections c JOIN systems s USING (system_id) JOIN products p USING (product_id)
GROUP BY p.name;
```

**Common functions:** strings `CONCAT`, `UPPER`/`LOWER`, `SUBSTRING`, `TRIM`, `LENGTH`, `REPLACE`; dates `NOW()`, `CURDATE()`, `DATE_ADD`/`INTERVAL`, `DATEDIFF`, `DATE_FORMAT` (MySQL) / `date_trunc('hour', ts)` (PostgreSQL); numbers `ROUND`, `CEIL`, `FLOOR`, `ABS`; `CAST(x AS INT)`.

## 0.7 Joins: visual and with sample data
```
employees                          departments
id | name  | dept_id | mgr_id     id | name
1  | Asha  | 10      | NULL       10 | Storage
2  | Ravi  | 10      | 1          20 | AI
3  | Meena | 20      | 1          30 | HR      ← no employees
4  | John  | NULL    | 2
```

| Join | Result rows (employee, department) |
|---|---|
| `INNER JOIN` | (Asha, Storage), (Ravi, Storage), (Meena, AI) |
| `LEFT JOIN` departments | the above + (John, NULL) |
| `RIGHT JOIN` departments | inner rows + (NULL, HR) |
| `FULL OUTER JOIN` | inner rows + (John, NULL) + (NULL, HR) (MySQL: emulate with LEFT UNION RIGHT) |
| `CROSS JOIN` | 4 × 3 = 12 rows |
| `SELF JOIN` (employee → manager) | (Ravi → Asha), (Meena → Asha), (John → Ravi) |

```
INNER: A ∩ B        LEFT: all of A + matches        FULL: A ∪ B        ANTI (LEFT … WHERE B.id IS NULL): A − B
```

`USING (col)` when the names match; `NATURAL JOIN` joins on all same-named columns (risky: avoid).

## 0.8 Subqueries and set operations
```sql
SELECT name FROM employees WHERE dept_id IN (SELECT id FROM departments WHERE name = 'Storage');   -- IN subquery
SELECT name, (SELECT COUNT(*) FROM collections c WHERE c.system_id = s.system_id) AS n FROM systems s; -- scalar, correlated
SELECT * FROM systems s WHERE EXISTS (SELECT 1 FROM collections c WHERE c.system_id = s.system_id AND c.status = 'FAILED');
SELECT * FROM (SELECT system_id, COUNT(*) AS n FROM collections GROUP BY system_id) t WHERE t.n > 100;  -- derived table
SELECT name FROM employees WHERE salary > ALL (SELECT salary FROM employees WHERE dept_id = 20);     -- ALL / ANY

SELECT system_id FROM a UNION SELECT system_id FROM b;        -- distinct union
SELECT system_id FROM a UNION ALL SELECT system_id FROM b;    -- keeps duplicates (faster)
SELECT system_id FROM a INTERSECT SELECT system_id FROM b;    -- in both (MySQL 8.0.31+, PostgreSQL)
SELECT system_id FROM a EXCEPT SELECT system_id FROM b;       -- in a, not in b (Oracle: MINUS)
```

**Recursive CTE** (hierarchies: org charts, folder trees, dependency graphs):

```sql
WITH RECURSIVE chain AS (
    SELECT id, name, mgr_id, 1 AS level FROM employees WHERE mgr_id IS NULL
    UNION ALL
    SELECT e.id, e.name, e.mgr_id, c.level + 1 FROM employees e JOIN chain c ON e.mgr_id = c.id
)
SELECT * FROM chain ORDER BY level;
```

## 0.9 Views, stored procedures, functions, triggers, cursors (MySQL syntax)
```sql
CREATE VIEW failed_recent AS
SELECT system_id, COUNT(*) AS fails FROM collections
WHERE status = 'FAILED' AND received_at > NOW() - INTERVAL 1 DAY GROUP BY system_id;
SELECT * FROM failed_recent WHERE fails >= 3;          -- a view is a saved query (no stored data)

DELIMITER //
CREATE PROCEDURE mark_failed(IN p_id BIGINT, OUT p_rows INT)
BEGIN
    UPDATE collections SET status = 'FAILED' WHERE collection_id = p_id;
    SET p_rows = ROW_COUNT();
END //
CREATE FUNCTION sla_bucket(secs INT) RETURNS VARCHAR(10) DETERMINISTIC
BEGIN
    RETURN IF(secs <= 300, 'OK', 'BREACH');
END //
CREATE TRIGGER trg_audit_status AFTER UPDATE ON collections
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO status_audit(collection_id, old_status, new_status, changed_at)
        VALUES (NEW.collection_id, OLD.status, NEW.status, NOW());
    END IF;
END //
DELIMITER ;
CALL mark_failed(42, @n); SELECT @n, sla_bucket(120);
```

- **Procedure vs function:** a procedure is called with `CALL` and can have IN/OUT params and side effects; a function returns a value and can be used inside SQL.
- **Triggers:** run automatically BEFORE/AFTER INSERT/UPDATE/DELETE (auditing, derived columns). Use them sparingly: hidden logic is hard to debug.
- **Cursors:** iterate over query rows inside a procedure (row-by-row; slow; prefer set-based SQL).
- **Materialised view** (PostgreSQL): stores the results; `REFRESH MATERIALIZED VIEW` to update. Good for expensive dashboards.

## 0.10 DCL and TCL
```sql
CREATE USER 'reporter'@'%' IDENTIFIED BY '…';
GRANT SELECT ON telemetry.* TO 'reporter'@'%';                 -- least privilege
GRANT SELECT, INSERT, UPDATE ON telemetry.collections TO 'ingest'@'10.0.%';
REVOKE INSERT ON telemetry.collections FROM 'ingest'@'10.0.%';
SHOW GRANTS FOR 'reporter'@'%';

START TRANSACTION;                    -- or BEGIN
UPDATE accounts SET bal = bal - 100 WHERE id = 1;
SAVEPOINT after_debit;
UPDATE accounts SET bal = bal + 100 WHERE id = 2;
-- something wrong with the credit?  ROLLBACK TO after_debit;
COMMIT;                               -- or ROLLBACK to undo everything
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

**Roles** group privileges (`CREATE ROLE analyst; GRANT analyst TO alice;`).

## 0.11 Keys, the ER model and relational algebra
**Keys:** **super key** (any set of columns that uniquely identifies a row) ⊇ **candidate keys** (minimal super keys) → choose one as the **primary key**; the others are **alternate keys**. **Foreign key** references another table. **Composite key** = several columns. **Surrogate** (generated ID) vs **natural** key.

**ER modelling:** **entities** (rectangles: System, Collection), **attributes** (ovals; key attributes underlined; multivalued, derived, composite), **relationships** (diamonds: "System *sends* Collection") with **cardinality** (1:1, 1:N, M:N) and **participation** (total/partial). Weak entities depend on an owner (an order line depends on an order).

```
[Product] 1 ──── N [System] 1 ──── N [Collection]
                     │ M
                     │
                     N
                [Licence]        (M:N → needs a junction table system_licences(system_id, licence_id))
```

**Mapping ER to tables:** 1:N → a foreign key on the N side; M:N → a junction table with a composite primary key; 1:1 → a foreign key with a UNIQUE constraint (or merge the tables).

**Relational algebra (the theory behind SQL):** selection **σ** (WHERE rows), projection **π** (SELECT columns), **⋈** join, × Cartesian product, ∪ union, − difference, ∩ intersection, ρ rename, ÷ division ("customers who bought ALL products"). The query optimiser rewrites SQL as algebra and reorders it (e.g. pushes selections down before joins).

## 0.12 Functional dependencies and a normalisation walk-through
A **functional dependency** X → Y means the value of X determines Y (`emp_id → emp_name`).
**Unnormalised table:**

| order_id | customer | customer_city | items |
|---|---|---|---|
| 1 | Asha | Pune | "SSD x2, HDD x1" |

- **1NF** (atomic values): split items into rows → (order_id, customer, customer_city, product, qty); key = (order_id, product).
- **2NF** (no partial dependency on part of the key): `customer` and `customer_city` depend only on `order_id` → move them to `orders(order_id, customer_id)` and keep `order_items(order_id, product_id, qty)`.
- **3NF** (no transitive dependency): `customer_id → customer_city` → move it to `customers(customer_id, name, city)`.
- **BCNF:** every determinant must be a candidate key (handles rare overlapping-key cases).
- **4NF** (no multi-valued dependencies) and **5NF** (join dependencies) exist but are rarely asked.
**Lossless decomposition and dependency preservation** are the two properties a good decomposition keeps.

---

# Part A: Relational fundamentals

## 1. Keys and constraints

- **Primary key:** uniquely identifies a row; not null.
- **Foreign key:** references another table's primary key; enforces referential integrity (`ON DELETE CASCADE / SET NULL / RESTRICT`).
- **Unique**, **NOT NULL**, **CHECK**, **DEFAULT**.
- **Candidate key** (any minimal unique set), **composite key** (several columns), **surrogate key** (auto-increment ID or UUID) vs **natural key** (email).
- **UUID vs auto-increment:** UUIDs are globally unique (good for distributed inserts and merging) but random UUIDs fragment B-tree indexes. Time-ordered IDs (UUIDv7, Snowflake IDs) fix that.

## 2. Normalisation (reduce redundancy and update anomalies)

| Form | Rule | Violation example |
|---|---|---|
| 1NF | Atomic values, no repeating groups | `phones = "111,222"` in one column |
| 2NF | 1NF + no partial dependency on part of a composite key | (order_id, product_id) → product_name depends only on product_id |
| 3NF | 2NF + no transitive dependency (non-key → non-key) | emp → dept_id → dept_name stored in the employee table |
| BCNF | Every determinant is a candidate key | |

**Anomalies avoided:** update (change it in many places), insert (can't add without unrelated data), delete (lose unrelated data).
**Denormalisation:** deliberately duplicate data for **read speed** (fewer joins): reporting tables, read-heavy systems, NoSQL documents. The cost is keeping the copies consistent.

## 3. ACID

- **Atomicity:** all or nothing (implemented with an undo log / rollback).
- **Consistency:** constraints hold before and after the transaction.
- **Isolation:** concurrent transactions don't interfere (the isolation levels below).
- **Durability:** once committed, the data survives a crash (**write-ahead log** + fsync).

**Write-ahead logging (WAL):** before changing data pages, append the change to a sequential log and fsync it. After a crash, replay the log (redo) and undo uncommitted work. Sequential log writes are fast; the data pages are flushed lazily. The same idea as filesystem journaling (file 06) and Kafka's log (file 13).

## 4. Isolation levels and anomalies (very commonly asked)

| Anomaly | What happens |
|---|---|
| Dirty read | Read another transaction's **uncommitted** data |
| Non-repeatable read | Read the same row twice and get different values (another transaction committed an update in between) |
| Phantom read | Re-run a range query and get new rows (another transaction inserted) |
| Lost update | Two read-modify-write cycles; one overwrites the other |
| Write skew | Two transactions read overlapping data and make disjoint writes that together break a rule (two doctors both go off call) |

| Level | Dirty | Non-repeatable | Phantom |
|---|---|---|---|
| Read Uncommitted | possible | possible | possible |
| **Read Committed** (PostgreSQL default) | no | possible | possible |
| **Repeatable Read** (MySQL InnoDB default) | no | no | no in InnoDB for most cases (gap/next-key locks + MVCC snapshots) |
| Serializable | no | no | no |

Higher isolation = more correctness, less concurrency.

**MVCC (multi-version concurrency control):** writers create **new versions** of rows instead of overwriting them; readers see a consistent **snapshot** as of their start time. So **readers don't block writers and writers don't block readers**. Used by PostgreSQL, InnoDB (via undo logs) and Oracle. Old versions are cleaned up later (PostgreSQL `VACUUM`, the InnoDB purge thread).

**Preventing lost updates:**

- **Pessimistic:** `SELECT … FOR UPDATE` (locks the row until commit).
- **Optimistic:** a version column: `UPDATE t SET qty = ?, version = version + 1 WHERE id = ? AND version = ?`. If 0 rows were updated, retry.
- **Atomic update:** `UPDATE stock SET qty = qty - 1 WHERE id = ? AND qty > 0` (check + act in one statement).

## 5. Indexes (the #1 performance topic)

**B+ tree** (the default in MySQL InnoDB and PostgreSQL):

- A balanced tree with high fan-out (hundreds of keys per node), so millions of rows are only 3–4 levels deep, meaning 3–4 disk/page reads.
- Data lives only in the **leaves**, which are linked → fast **range scans** (`BETWEEN`, `ORDER BY`).
- Why not a binary tree? Too deep, so too many disk reads. Why not a hash index? No range queries or ordering.

**InnoDB specifics:**

- The table **is** a B+ tree ordered by the primary key (a **clustered index**: rows are stored in the leaves).
- **Secondary indexes** store the **primary key value** in their leaves, so a secondary lookup = find the PK, then look up the clustered index (a "double lookup"). That's why a huge random PK makes every secondary index bigger and inserts slower.

**Composite indexes and the leftmost prefix rule:**
An index on `(country, city, age)` helps `WHERE country=?`, `WHERE country=? AND city=?`, and `WHERE country=? AND city=? AND age>?`. It does **not** help `WHERE city=?` alone. Put **equality columns first, range columns last**.

**Covering index:** the index contains every column the query needs, so there's no table lookup at all ("Using index" in MySQL EXPLAIN).

**When indexes hurt or don't help:**

- Every insert/update must also update every index (slower writes, more storage).
- **Low selectivity** columns (gender, boolean) rarely help.
- Functions on indexed columns disable the index: `WHERE YEAR(created_at) = 2026` → rewrite as a range on `created_at`.
- A leading wildcard `LIKE '%abc'` can't use a B-tree (use full-text search / Elasticsearch).
- Implicit type conversions (string column compared to a number).

**Other index types:** hash (equality only), full-text (inverted index), GIN/GiST in PostgreSQL (JSONB, arrays, geo), bitmap (data warehouses), **LSM trees** (write-optimised: RocksDB, Cassandra; see file 11).

**`EXPLAIN` / `EXPLAIN ANALYZE`:** read the plan. Look for full table scans ("type: ALL" in MySQL, "Seq Scan" in PostgreSQL), rows examined, filesort/temporary tables, and the actual index used.

## 6. Joins

| Join | Returns |
|---|---|
| INNER | Rows matching in both |
| LEFT (OUTER) | All left rows + matches (NULL where none) |
| RIGHT | All right rows + matches |
| FULL OUTER | All rows from both |
| CROSS | Cartesian product |
| SELF | A table joined to itself (employee → manager) |

**Join algorithms (how the DB executes them):** nested loop (good with an index on the inner table, or small inputs), **hash join** (build a hash table on the smaller side; good for large equality joins), merge join (both sides sorted).

## 7. SQL you must write fluently

```sql
-- Aggregation
SELECT dept_id, COUNT(*) AS n, AVG(salary) AS avg_sal
FROM employees
WHERE active = 1                      -- filters rows BEFORE grouping
GROUP BY dept_id
HAVING COUNT(*) > 5                   -- filters groups AFTER grouping
ORDER BY avg_sal DESC
LIMIT 10;

-- Logical execution order: FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT
-- (that's why you can't use a SELECT alias in WHERE)

-- Second highest salary
SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);
-- N-th highest (handles ties) with a window function
SELECT DISTINCT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS r FROM employees) t
WHERE r = 3;

-- Top earner per department (top-N per group)
SELECT * FROM (
  SELECT e.*, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rn
  FROM employees e) t
WHERE rn = 1;

-- Employees earning more than their manager (self join)
SELECT e.name FROM employees e JOIN employees m ON e.manager_id = m.id WHERE e.salary > m.salary;

-- Departments with no employees (anti join)
SELECT d.name FROM departments d LEFT JOIN employees e ON e.dept_id = d.id WHERE e.id IS NULL;
-- or: WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.id)

-- Duplicate emails
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
-- Delete duplicates, keep the lowest id (MySQL)
DELETE u1 FROM users u1 JOIN users u2 ON u1.email = u2.email AND u1.id > u2.id;

-- Running total and day-over-day change
SELECT day, revenue,
       SUM(revenue) OVER (ORDER BY day) AS running_total,
       revenue - LAG(revenue) OVER (ORDER BY day) AS change
FROM daily_sales;

-- 7-day moving average
SELECT day, AVG(revenue) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) FROM daily_sales;

-- CTE (readable multi-step query)
WITH failed AS (
  SELECT system_id, COUNT(*) AS fails FROM job_runs WHERE status = 'FAILED' GROUP BY system_id)
SELECT s.name, f.fails FROM systems s JOIN failed f USING (system_id) WHERE f.fails >= 3;

-- Consecutive failures (gaps-and-islands idea): rows where the last 3 runs all failed
-- (relates to your OneFS job-failure alerting feature)
```

- **Window functions:** `ROW_NUMBER` (unique 1,2,3), `RANK` (ties skip: 1,1,3), `DENSE_RANK` (ties don't skip: 1,1,2), `LAG`/`LEAD`, `SUM/AVG OVER`, `NTILE`, `FIRST_VALUE`.
- **`UNION`** removes duplicates (sorts or hashes, so slower); **`UNION ALL`** keeps them (faster).
- **`COUNT(*)`** counts rows; **`COUNT(col)`** skips NULLs.
- **NULL:** `NULL = NULL` is unknown (not true). Use `IS NULL`. `NOT IN (subquery containing a NULL)` returns no rows: prefer `NOT EXISTS`.
- **`DELETE` vs `TRUNCATE` vs `DROP`:** delete rows (logged, can use WHERE, triggers fire) / remove all rows fast (resets auto-increment) / remove the table entirely.
- **Correlated subquery:** runs per outer row (can be slow; often rewritten as a join).
- **Views** (saved queries), **materialised views** (stored results, refreshed), **stored procedures**, **triggers** (use sparingly; hidden logic).

## 8. Transactions in code
```python
with conn:                          # commit on success, rollback on exception
    cur.execute("UPDATE accounts SET bal = bal - %s WHERE id = %s AND bal >= %s", (amt, a, amt))
    if cur.rowcount == 0: raise InsufficientFunds()
    cur.execute("UPDATE accounts SET bal = bal + %s WHERE id = %s", (amt, b))
```

**Always use parameterised queries** (`%s` placeholders), never string formatting. That's how you prevent **SQL injection**.
**Connection pooling:** opening a DB connection is expensive (TCP + TLS + auth), so reuse a pool (HikariCP in Java, SQLAlchemy pools, PgBouncer for PostgreSQL).

---

# Part B: MySQL and PostgreSQL specifics

## MySQL (InnoDB)

- **InnoDB** (default): ACID, row-level locking, MVCC, clustered PK, crash recovery. **MyISAM** (legacy): table locks, no transactions, no crash safety.
- **Logs:** **redo log** (WAL for crash recovery), **undo log** (rollback + MVCC old versions), **binlog** (logical change log used for **replication** and point-in-time recovery).
- **Buffer pool:** InnoDB's page cache in RAM. Size it to roughly 60–75% of RAM on a dedicated DB server.
- **Locks:** record locks, **gap locks**, next-key locks (prevent phantoms under Repeatable Read). Deadlocks are detected automatically and one transaction is rolled back, so applications must **retry**.
- **Replication:** primary writes the binlog → replicas pull and replay it. Asynchronous by default (replica lag; a read after a write may be stale) or semi-synchronous. Read replicas scale reads.
- **Scaling path:** indexes + query tuning → caching (Redis) → read replicas → vertical scaling → partitioning → **sharding** (by user_id, say; cross-shard joins/transactions get hard; tools like Vitess).

## PostgreSQL (your OneFS telemetry destination)

- More feature-rich: rich types (**JSONB** with GIN indexes, arrays, ranges), CTEs, window functions, extensions (**PostGIS**, **pgvector** for embeddings in RAG, **TimescaleDB** for time series), strong standards compliance.
- MVCC stores old row versions **in the table**, so it needs **VACUUM** (autovacuum) to reclaim space and avoid transaction-ID wraparound.
- Process per connection, so use **PgBouncer** for connection pooling at scale.
- Replication: streaming WAL replication (physical) and logical replication.
- **Why PostgreSQL for uptime telemetry?** The data isn't only numbers: it's configuration, events and state that you query **relationally** (join a cluster to its model, entitlements, support cases). A pure time-series DB is awkward for that, and PostgreSQL handles JSONB for semi-structured fields.

**MySQL vs PostgreSQL in one line:** MySQL is simple, fast for read-heavy web workloads, and widely hosted. PostgreSQL is more powerful (types, extensions, complex queries, correctness) and is the usual default for new systems today.

---

## Advanced database internals (SDE 2 / storage-company depth)

**How a query runs:** parser (syntax → parse tree) → analyser/binder (resolve tables and columns) → **rewriter** (views, rules) → **optimiser** (generates candidate plans and picks the cheapest using **table statistics**: row counts, histograms, distinct values) → **executor** (iterators that pull rows: scans, index lookups, joins, sorts, aggregates). Stale statistics → bad plans → run `ANALYZE` (PostgreSQL/MySQL).

**Storage layout:** data lives in fixed-size **pages** (InnoDB 16 KB, PostgreSQL 8 KB) inside table files. A **buffer pool** caches pages in RAM; dirty pages are flushed later (checkpointing). Row formats, slotted pages, overflow pages for large values (PostgreSQL **TOAST**).

**Concurrency control algorithms:**

- **Two-phase locking (2PL):** a transaction acquires locks (growing phase) and then releases them (shrinking phase); never acquires after releasing. **Strict 2PL** holds write locks until commit (prevents cascading aborts). Guarantees serialisability; can deadlock.
- **Timestamp ordering:** each transaction gets a timestamp; conflicting operations out of order are aborted.
- **MVCC** (Part A) + **Serializable Snapshot Isolation** (PostgreSQL's SERIALIZABLE detects dangerous read-write patterns and aborts one transaction).
- **Lock granularity:** row, page, table; intention locks; **lock escalation**.

**Recovery:**

- **WAL** + **checkpoints** (flush dirty pages and record a point so recovery replays only from there).
- **ARIES** (the classic algorithm): analysis → **redo** everything from the log (repeat history) → **undo** uncommitted transactions.
- **Backups:** logical (`mysqldump`, `pg_dump`) vs physical (file copies, `xtrabackup`, `pg_basebackup`) + **point-in-time recovery** by replaying the binlog/WAL up to a timestamp.

**Partitioning (within one database):**

```sql
-- PostgreSQL declarative range partitioning: one partition per month
CREATE TABLE collections (id BIGINT, received_at TIMESTAMPTZ NOT NULL, ...) PARTITION BY RANGE (received_at);
CREATE TABLE collections_2026_11 PARTITION OF collections
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
```

Range, list and hash partitioning. Benefits: **partition pruning** (queries skip irrelevant partitions), cheap retention (drop old partitions instead of a massive DELETE). Vertical partitioning = splitting columns into separate tables.
**Partitioning vs sharding:** partitioning splits a table within one server; sharding splits data across servers.

**OLAP SQL extensions:** `GROUP BY ROLLUP(product, status)` (subtotals + grand total), `CUBE` (all combinations), `GROUPING SETS`, `FILTER (WHERE …)` on aggregates (PostgreSQL), `PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY processing_s)` (p99 in SQL).

**JSON in relational databases:**

```sql
-- PostgreSQL JSONB
SELECT payload->>'model' AS model FROM uptime WHERE payload @> '{"product": "PowerScale"}';
CREATE INDEX idx_payload ON uptime USING GIN (payload);
```

**Full-text search in SQL:** MySQL `FULLTEXT` indexes + `MATCH … AGAINST`; PostgreSQL `tsvector`/`tsquery` + GIN. Good enough for simple search; Elasticsearch for heavy search (file 10).

**Database security:** least-privilege users, parameterised queries, encryption in transit (TLS) and at rest, auditing, secrets in a vault, row-level security (PostgreSQL policies), backups tested by restoring them.

**Database scaling summary:**

```
Optimise queries + indexes → connection pooling → cache (Redis) → read replicas
→ vertical scaling → partitioning → functional split (DB per service) → sharding → NewSQL/distributed SQL (CockroachDB, Spanner, TiDB, Vitess)
```

## Databases course map (everything in this file)
```
Foundations: DBMS vs files · relational model · ER modelling · keys · relational algebra · normalisation (1NF→BCNF)
SQL: DDL · DML · DQL · DCL · TCL · data types · constraints · joins · subqueries · CTEs (recursive) · window functions
     · views · procedures · functions · triggers · cursors
Transactions: ACID · isolation levels & anomalies · locking (2PL) · MVCC · deadlocks · WAL & recovery (ARIES)
Performance: indexes (B+tree, hash, full-text, covering, composite) · EXPLAIN · optimiser & statistics · partitioning
MySQL: architecture · InnoDB internals · administration · configuration · replication · backups · security
PostgreSQL: architecture · MVCC & VACUUM · JSONB · extensions
Scaling: replication · sharding · caching · NewSQL
NoSQL: families · MongoDB (zero → advanced) · Redis (zero → advanced) · caching patterns
```

## MySQL administration, from install to production
**Getting started:**

```bash
sudo apt install mysql-server          # or the official MySQL APT/YUM repos, or Docker: docker run -e MYSQL_ROOT_PASSWORD=… -p 3306:3306 mysql:8.4
sudo mysql_secure_installation         # remove anonymous users and the test DB, set the root password policy
mysql -u root -p                       # the CLI client;  mysql -h host -P 3306 -u app -p appdb
```
```sql
SHOW DATABASES; USE appdb; SHOW TABLES; DESCRIBE collections; SHOW CREATE TABLE collections\G
SHOW PROCESSLIST;                        -- running queries (KILL <id> to stop one)
SHOW ENGINE INNODB STATUS\G              -- locks, deadlocks, buffer pool state
SHOW VARIABLES LIKE 'innodb_buffer%'; SHOW GLOBAL STATUS LIKE 'Threads_connected';
```

**Character sets and collations:** always use **`utf8mb4`** (real UTF-8, including emoji). MySQL's old `utf8` is a 3-byte subset that breaks on emoji. The collation decides comparison/sorting rules (`utf8mb4_0900_ai_ci` = accent- and case-insensitive).
**Key configuration (`my.cnf`):**

| Setting | Meaning |
|---|---|
| `innodb_buffer_pool_size` | RAM for caching data/index pages (~60–75% of RAM on a dedicated server) |
| `innodb_log_file_size` / `innodb_redo_log_capacity` | redo log size (bigger = smoother writes, slower crash recovery) |
| `innodb_flush_log_at_trx_commit` | 1 = fsync at every commit (fully durable); 2/0 = faster, can lose ~1 s on a crash |
| `sync_binlog` | 1 = fsync the binlog at each commit (safe replication) |
| `max_connections` | connection limit (each connection uses memory) |
| `slow_query_log`, `long_query_time` | log queries slower than N seconds |

**Finding slow queries:** the slow query log + `mysqldumpslow`/`pt-query-digest`; `performance_schema` and the `sys` schema (`SELECT * FROM sys.statements_with_full_table_scans;`); `EXPLAIN ANALYZE` (8.0+).
**Users and security:** `CREATE USER 'app'@'10.0.%' IDENTIFIED BY '…'; GRANT SELECT, INSERT, UPDATE ON appdb.* TO 'app'@'10.0.%';`; enforce TLS (`REQUIRE SSL`); never use root from applications; roles (8.0+); audit plugins.
**Backups:** `mysqldump --single-transaction --routines appdb > appdb.sql` (a consistent logical dump without locking InnoDB tables), MySQL Shell dump utilities / `mydumper` (parallel; the older `mysqlpump` was removed in MySQL 8.4), Percona XtraBackup (physical, hot), plus **binlogs** for point-in-time recovery. Test restores regularly.
**Replication setups:** asynchronous source → replica (configure `server_id`, enable binlogs, `CHANGE REPLICATION SOURCE TO …; START REPLICA;`), **GTIDs** (global transaction IDs make failover and re-pointing replicas easy), semi-synchronous replication, **Group Replication / InnoDB Cluster** (a consensus-based multi-node cluster with automatic failover, fronted by MySQL Router). Check lag with `SHOW REPLICA STATUS\G` (`Seconds_Behind_Source`).
**Online schema changes:** `ALTER TABLE … ALGORITHM=INSTANT/INPLACE` where supported; tools like `gh-ost` / `pt-online-schema-change` for big tables without blocking writes.
**Common errors:** `ERROR 1045` (access denied: wrong user/host/password), `1062` (duplicate key), `1205` (lock wait timeout), `1213` (deadlock: retry the transaction), `2002`/`2003` (can't connect: server down or firewall), "Too many connections" (pooling!).

# Part C: NoSQL and MongoDB

## When NoSQL (and which kind)

| Type | Examples | Good for |
|---|---|---|
| Document | **MongoDB**, Couchbase | Flexible JSON-like records, nested data, fast iteration |
| Key-value | **Redis**, DynamoDB | Caches, sessions, counters, very fast lookups |
| Wide-column | Cassandra, HBase, ScyllaDB | Massive write throughput, time series, known query patterns |
| Search | **Elasticsearch** | Full-text search, log analytics (file 10) |
| Graph | Neo4j | Relationships (social graphs, fraud rings) |
| Time-series | Prometheus TSDB, InfluxDB, TimescaleDB | Metrics |
| Vector | pgvector, Pinecone, FAISS, Weaviate | Embeddings for RAG / similarity search |

**SQL vs NoSQL decision:** choose SQL when you need **strong consistency, transactions, complex joins and ad-hoc queries** (payments, inventory, bookings). Choose NoSQL when you need **huge scale-out writes, flexible schema, or simple access patterns** known up front (feeds, logs, sessions, catalogues). Many systems use both (polyglot persistence).

## MongoDB: from zero to advanced

### M1. MongoDB in plain words (start here)
**The problem with tables for some data:** in a relational database, one "thing" (an order with its items, addresses and payment info) is spread across many tables and stitched back together with joins. Every row in a table must have the same columns, so adding a field means altering the schema. For fast-changing products, or data that's naturally nested (a product catalogue where phones have "RAM" and shirts have "size"), that's awkward.

**The idea:** store each "thing" as one **document**, a JSON-like object that can contain nested objects and arrays, exactly the shape your code already uses. Documents in the same collection don't have to have identical fields.

**Analogy:** a relational database is a set of **spreadsheets** with fixed columns that you cross-reference. MongoDB is a **filing cabinet of folders**: each folder (document) holds everything about one customer or order, and folders can contain different kinds of pages.

```
Relational (3 tables + joins)                      MongoDB (1 document)
orders(id, customer_id, date)                      {
order_items(order_id, product, qty)    ───────►      "_id": 1001,
customers(id, name, city)                            "customer": {"name": "Asha", "city": "Pune"},
                                                     "date": ISODate("2026-11-21"),
                                                     "items": [ {"product": "SSD", "qty": 2},
                                                                {"product": "HDD", "qty": 1} ]
                                                   }
```

**Terminology map:**

| SQL | MongoDB |
|---|---|
| database | database |
| table | **collection** |
| row | **document** |
| column | **field** |
| primary key | `_id` (always present, unique) |
| index | index (very similar: B-trees) |
| JOIN | embedding, or `$lookup` in aggregation |
| GROUP BY | aggregation pipeline `$group` |
| foreign key constraint | none (the app's responsibility) |

**Why teams choose MongoDB:** flexible schema (iterate fast), a natural mapping to objects/JSON (less ORM friction), rich queries on nested data, **built-in replication and sharding** (scale out), and a strong aggregation framework.
**Why teams avoid it:** heavy multi-entity transactions and complex joins (relational is better), strict relational integrity needs, or "schemaless" turning into "messy" without discipline.

### M2. Documents, BSON and `_id`

- Documents are stored as **BSON** (binary JSON): faster to scan than text JSON and with more types: `ObjectId`, `Date`, `Int32`/`Int64`, `Decimal128` (money), `Binary`, `Boolean`, arrays, embedded documents, `null`.
- **Maximum document size: 16 MB** (bigger files → **GridFS**, which splits a file into chunks, or better, object storage).
- **`_id`** is the primary key of every document. If you don't provide one, Mongo generates an **ObjectId**: 12 bytes = **4-byte timestamp** + 5-byte random value + 3-byte counter. So ObjectIds are roughly time-ordered, and you can extract the creation time: `ObjectId("…").getTimestamp()`.
- Field order is preserved; names are case-sensitive; dot notation reaches into nested fields (`"customer.city"`) and array elements (`"items.product"`).

### M3. Architecture: the pieces of a MongoDB deployment
**A single server (`mongod`) inside:**

```
          Client drivers (pymongo, Java, Node…) — MongoDB wire protocol over TCP 27017
                                   │
                    ┌──────────────▼───────────────┐
                    │ mongod                        │
                    │  Query layer: parser → query planner (picks an index, caches plans) → executor
                    │  Replication layer (oplog)    │
                    │  Storage engine: WiredTiger   │
                    │   ├─ in-memory cache (by default ~50% of RAM − 1 GB) holding hot data + indexes
                    │   ├─ document-level concurrency (many writers at once on different documents)
                    │   ├─ compression (snappy by default; zstd/zlib) for data; prefix compression for indexes
                    │   ├─ journal (write-ahead log) → crash recovery
                    │   └─ checkpoints (consistent snapshots to disk about every 60 s)
                    └──────────────┬───────────────┘
                                   ▼
                         data files on disk (one file per collection and per index)
```

**Production deployments** are either a **replica set** (M7) or a **sharded cluster** (M8):

```
SHARDED CLUSTER
  App ──► mongos (query router; stateless; run several) ──► config servers (a replica set holding
           │                                                  cluster metadata: which chunk is on which shard)
           ├──────────────► Shard 1 = replica set (P + S + S)
           ├──────────────► Shard 2 = replica set (P + S + S)
           └──────────────► Shard 3 = replica set (P + S + S)
```

**Working set rule:** performance is great when the **working set** (the data + indexes you touch frequently) fits in WiredTiger's cache/RAM. When it doesn't, every query hits disk and latency jumps.

### M4. CRUD and querying, explained
(The command reference is in "MongoDB CRUD and commands" below. Here's the theory.)

- **Create:** `insertOne`/`insertMany`. Inserting into a non-existent collection creates it. `insertMany` with `ordered: false` continues past errors.
- **Read:** `find(filter, projection)` returns a **cursor** (results arrive in batches, not all at once). A filter is a document describing the match: `{status: "FAILED", sizeMb: {$gt: 100}}` means status equals FAILED **AND** size > 100.
  - Comparison: `$eq $ne $gt $gte $lt $lte $in $nin`. Logical: `$and $or $not $nor`. Element: `$exists $type`. Arrays: `$all`, `$size`, **`$elemMatch`** (one array element must satisfy *all* conditions together; without it, conditions can be satisfied by different elements). Text: `$regex`, `$text`.
  - **Projection** chooses fields: `{systemId: 1, status: 1, _id: 0}`.
  - `sort`, `limit`, `skip` (skip is slow for deep pages: use range/cursor pagination on an indexed field, like SQL keyset pagination).
- **Update:** `updateOne`/`updateMany` with **update operators** (`$set`, `$inc`, `$push`, `$pull`, `$addToSet`, `$unset`), or `replaceOne` to swap the whole document. **Upsert** inserts when nothing matches. `findOneAndUpdate` atomically updates and returns the document (great for "claim the next job").
- **Delete:** `deleteOne`/`deleteMany`.
- **Atomicity:** a write to a **single document is always atomic**, even if it changes many nested fields. That's why embedding related data often removes the need for multi-document transactions.

### M5. Data modelling: embed or reference? (the most important MongoDB skill)
**Rule of thumb:** *"Data that is accessed together should be stored together."* Design from your **queries**, not from normalisation rules.

| Relationship | Usually | Example |
|---|---|---|
| One-to-one | embed | user + profile settings |
| One-to-few | **embed** an array | order + line items, user + 3 addresses |
| One-to-many (hundreds+) | **reference** (child stores the parent ID) | product + reviews (store `productId` in each review) |
| One-to-squillions (unbounded) | reference from the child, never an array in the parent | server + log lines |
| Many-to-many | arrays of references on one or both sides | students ↔ courses |

```javascript
// Embedded: one read gets the whole order; atomic updates
{ _id: 1001, customer: { name: "Asha" }, items: [ { sku: "SSD", qty: 2 } ] }
// Referenced: reviews in their own collection (unbounded, queried separately)
{ _id: ObjectId("…"), productId: 99, rating: 5, text: "Great purifier" }
```

**Schema design patterns (official names; good to drop in interviews):**

- **Bucket:** group many small time-series measurements into one document per device per hour (fewer documents, smaller indexes). Built in as **time series collections** (5.0+).
- **Computed:** store precomputed totals (`reviewCount`, `avgRating`) and update them on write, instead of aggregating on every read.
- **Extended reference:** copy a few frequently needed fields of the referenced document (customer name in the order) to avoid lookups.
- **Subset:** embed only the latest/top N items (the latest 10 reviews), keeping the full list in another collection.
- **Attribute:** turn many sparse fields into an array of `{k, v}` pairs so one index covers them all (product specs).
- **Outlier:** handle the rare huge case separately (a celebrity with millions of followers gets overflow documents).
- **Polymorphic:** different shapes in one collection with a `type` field.
- **Schema versioning:** a `schemaVersion` field so old and new shapes coexist during a migration.
**Anti-patterns:** unbounded growing arrays (documents hit 16 MB and get slow to update), massive documents read just for one field, too many collections, lots of `$lookup` (if you always join, maybe it should be embedded, or relational).
**Schema validation** (enforce structure even in a flexible database):

```javascript
db.createCollection("collections", { validator: { $jsonSchema: {
  bsonType: "object", required: ["systemId", "status"],
  properties: { status: { enum: ["RECEIVED", "PROCESSED", "FAILED"] }, sizeMb: { bsonType: "double", minimum: 0 } } } } })
```

### M6. Indexes in MongoDB
**Without an index**, a query scans every document (**COLLSCAN**). **With one**, it walks a **B-tree** (**IXSCAN**) and fetches only the matching documents. Same idea as SQL (Part A §5).

```
Index on { systemId: 1, receivedAt: -1 }  (a B-tree of sorted entries pointing at documents)
 ("APM001", 2026-11-21) → doc 17
 ("APM001", 2026-11-20) → doc 9
 ("UNI002", 2026-11-21) → doc 4  …
```

**Index types:**

| Type | For |
|---|---|
| Single-field | `{status: 1}` |
| **Compound** | `{systemId: 1, receivedAt: -1}`: field order matters (prefix rule) |
| **Multikey** | automatically created when the indexed field is an array (one entry per element) |
| Text | keyword search with stemming (`$text`) |
| 2dsphere | geospatial ("near me") |
| Hashed | even distribution for hashed sharding |
| **TTL** | auto-delete documents after a time (sessions, logs) |
| **Partial** | index only documents matching a filter (`{status: "FAILED"}`): smaller, faster |
| Sparse | skip documents without the field |
| **Unique** | enforce uniqueness (e.g. email) |
| Wildcard | `{"specs.$**": 1}` for unpredictable field names |

**The ESR rule for compound indexes:** put fields used for **E**quality first, then **S**ort, then **R**ange. For `find({systemId: "X", sizeMb: {$gt: 100}}).sort({receivedAt: -1})` → index `{systemId: 1, receivedAt: -1, sizeMb: 1}`.
**Covered query:** all queried and returned fields are in the index → no document fetch at all.
**Read the plan:** `.explain("executionStats")` → check the stage (IXSCAN vs COLLSCAN), `totalKeysExamined` vs `totalDocsExamined` vs `nReturned` (ideally all close to each other).
**Costs:** every index slows writes and uses RAM. Too many indexes on a write-heavy collection hurt. Remove unused ones (`$indexStats`).

### M7. Replica sets: high availability and durability
**Plain words:** run 3 (or more) copies of the database on different machines. One is the **primary** and takes all writes; the **secondaries** copy everything it does. If the primary dies, the others **elect** a new primary within seconds, automatically.

```
             writes + reads (default)
   App ───────────────────────────────► PRIMARY ──── oplog (log of every change)
                                           │   ▲ heartbeats every 2 s
                          replicate oplog  │   │
                     ┌─────────────────────┴───┴──────────┐
                     ▼                                    ▼
                 SECONDARY 1                          SECONDARY 2
   Primary dies → secondaries notice missed heartbeats → election (majority vote) → one becomes PRIMARY
```

- **Oplog:** a special capped collection recording every write as an **idempotent** operation; secondaries pull it and apply it. Size it so a secondary can be down for hours and still catch up.
- **Elections:** a Raft-like protocol; a candidate needs votes from a **majority** of voting members (so use an odd number: 3 or 5). A replica set can have up to 50 members, at most 7 voting.
- **Member types:** **arbiter** (votes, holds no data; use sparingly), **hidden** (invisible to apps; for backups/analytics), **delayed** (applies the oplog an hour late: protection against "oops, I deleted everything").
- **Rollback:** if an old primary had writes that weren't replicated to a majority before it failed, those writes are **rolled back** when it rejoins. That's why `w: "majority"` matters.

**Write concern (how sure do you want to be that a write is saved?):**

| Setting | Meaning | Trade-off |
|---|---|---|
| `w: 1` | the primary acknowledged it | fast; can be lost in a failover (rolled back) |
| **`w: "majority"`** | a majority of members have it (the default for most deployments since 5.0) | survives failover; a bit slower |
| `j: true` | written to the on-disk journal before acknowledging | durability against crashes |
| `wtimeout` | give up waiting after N ms | avoid hanging forever |

**Read preference (where do reads go?):** `primary` (default: always the latest data), `primaryPreferred`, `secondary`, `secondaryPreferred`, `nearest` (lowest latency). Reading from secondaries scales reads and serves local regions, but **may be stale**.
**Read concern (what level of consistency?):** `local` (the newest data on that node; may be rolled back), **`majority`** (only data acknowledged by a majority: never rolled back), `linearizable` (the strongest; reads reflect all majority-acknowledged writes before the read), `snapshot` (for transactions).
**Causal consistency:** client sessions can guarantee read-your-own-writes even when reading from secondaries.

### M8. Sharding: horizontal scaling
**Plain words:** when one replica set can't hold all the data or handle all the writes, split the collection **across several replica sets (shards)** by a **shard key**. Each shard holds a subset of the documents. Apps talk to `mongos`, which knows where everything lives.

```
Shard key = customerId (hashed)

           mongos ── consults ──► config servers: chunk map
             │      e.g. hash range [min, -3e18) → Shard A, [-3e18, 2e18) → Shard B, [2e18, max] → Shard C
   query {customerId: 42} ──► hash(42) falls in Shard B's range ──► only Shard B is asked (TARGETED)
   query {status: "FAILED"}  ──► no shard key in the filter ──► every shard is asked (SCATTER-GATHER: slower)
```

- **Chunks:** contiguous ranges of shard-key values (default max chunk size 128 MB in recent versions). The **balancer** moves chunks between shards to keep them even.
- **Choosing a shard key (the most important and hardest decision):**
  1. **High cardinality** (many distinct values): otherwise chunks can't be split.
  2. **Low frequency** (no single value dominates): otherwise a "jumbo chunk" or a hot shard.
  3. **Non-monotonic** (not ever-increasing like a timestamp or ObjectId): otherwise every insert goes to the "last" chunk on one shard (a **hotspot**).
  4. **Matches your common queries**, so most queries are targeted, not scatter-gather.
- **Strategies:** **ranged** (good for range queries; risk of hotspots), **hashed** (even writes; range queries scatter), **zoned** (pin ranges to specific shards, e.g. EU customers on EU shards for data residency). Compound shard keys (`{customerId: 1, orderDate: 1}`) often balance both needs.
- **Resharding:** possible online since 5.0, but expensive; choose carefully up front.
- **Things to know:** unique indexes must include the shard key; transactions spanning shards cost more; `mongos` is stateless (run several, near the apps).

### M9. Aggregation pipeline: MongoDB's analytics engine
**Plain words:** a **conveyor belt** of stages. Documents enter at the top; each stage filters, reshapes, groups or joins them, and passes the result to the next stage, like Unix pipes or a SQL query broken into steps.

```
collection ──► $match ──► $group ──► $sort ──► $limit ──► results
            (WHERE)    (GROUP BY)  (ORDER BY)  (LIMIT)
```

**Example: average processing time and failure count per product, for last week:**

```javascript
db.collections.aggregate([
  { $match: { receivedAt: { $gte: ISODate("2026-11-14") } } },                       // filter early (uses an index)
  { $group: { _id: "$product",
              avgSecs:  { $avg: "$processingSecs" },
              failures: { $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] } },
              total:    { $sum: 1 } } },
  { $addFields: { failurePct: { $multiply: [{ $divide: ["$failures", "$total"] }, 100] } } },
  { $sort: { failurePct: -1 } },
  { $limit: 5 }
])
// → [{ _id: "Unity", avgSecs: 142.3, failures: 12, total: 410, failurePct: 2.93 }, …]
```

**Important stages:**

| Stage | SQL-ish meaning |
|---|---|
| `$match` | WHERE |
| `$project` / `$addFields` / `$set` | SELECT columns / computed columns |
| `$group` (+ `$sum $avg $min $max $push $addToSet $first`) | GROUP BY + aggregates |
| `$sort`, `$limit`, `$skip` | ORDER BY, LIMIT, OFFSET |
| `$unwind` | turn each array element into its own document |
| **`$lookup`** | LEFT OUTER JOIN with another collection |
| `$facet` | several sub-pipelines at once (dashboard counts) |
| `$bucket` / `$bucketAuto` | histograms |
| `$count`, `$sample`, `$out` / `$merge` | count, random sample, write results to a collection |

**`$unwind` + `$group` example (top products across all orders):**

```javascript
db.orders.aggregate([
  { $unwind: "$items" },
  { $group: { _id: "$items.sku", qty: { $sum: "$items.qty" } } },
  { $sort: { qty: -1 } }, { $limit: 10 } ])
```

**`$lookup` (join):**

```javascript
db.reviews.aggregate([
  { $match: { rating: { $lte: 2 } } },
  { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" } },
  { $unwind: "$product" },
  { $project: { text: 1, "product.title": 1 } } ])
```

**Performance:** put `$match` and `$sort` early so they use indexes; project away unneeded fields early; stages have a 100 MB memory limit unless spilling to disk is allowed (`allowDiskUse`, automatic in newer versions); `$lookup` on large collections is expensive (an index on `foreignField` is a must).

### M10. Transactions

- Single-document operations are atomic. **Multi-document ACID transactions** have been supported since 4.0 (replica sets) and 4.2 (sharded clusters), with **snapshot isolation**.

```python
with client.start_session() as s:
    with s.start_transaction(write_concern=WriteConcern("majority")):
        db.accounts.update_one({"_id": 1}, {"$inc": {"bal": -100}}, session=s)
        db.accounts.update_one({"_id": 2}, {"$inc": {"bal": 100}}, session=s)
        # commits at the end of the block; aborts on an exception
```

- **Limits:** a default 60-second lifetime, more overhead (locks, cache pressure), and retries needed on transient errors. **Design so you rarely need them** (embed related data so one document update is enough). If most of your operations need multi-document transactions, a relational database may fit better.

### M11. Other features worth knowing

- **Change streams:** subscribe to real-time inserts/updates/deletes on a collection, database or cluster (built on the oplog). Resumable with a resume token. Use for cache invalidation, syncing to Elasticsearch, event-driven services (like CDC with Debezium, file 12).
- **Time series collections** (5.0+): optimised storage for measurements (the bucket pattern built in).
- **Capped collections:** fixed size, insertion order, oldest entries overwritten (logs).
- **GridFS:** store files > 16 MB in chunks (prefer object storage for big blobs).
- **TTL indexes:** auto-expire documents.
- **Atlas** (MongoDB's managed cloud) adds **Atlas Search** (Lucene-based full-text) and **Atlas Vector Search** (embeddings for RAG), triggers, and online archive.

### M12. Operations: performance, backup, security

- **Performance checklist:** indexes that match your queries (ESR), working set in RAM, avoid unbounded arrays and huge documents, projections to return less data, `explain()` every important query, the database profiler (`db.setProfilingLevel(1, {slowms: 100})`), `mongostat`/`mongotop`, connection pooling in drivers.
- **Backups:** `mongodump`/`mongorestore` (logical, small datasets), filesystem/cloud snapshots, Atlas continuous backups with point-in-time restore. Test restores.
- **Security:** enable authentication (SCRAM, x.509, LDAP), role-based access control (built-in roles like `read`, `readWrite`, `dbAdmin`; custom roles), TLS, encryption at rest, network isolation (never expose port 27017 publicly: thousands of open MongoDB servers have been wiped by attackers), auditing. Guard against **NoSQL injection**: never pass raw user JSON as a filter (a user sending `{"$ne": null}` as a password field can bypass checks). Validate types.

### M13. MongoDB from Python (pymongo)
```python
from pymongo import MongoClient, ASCENDING, DESCENDING, ReturnDocument
from datetime import datetime, timezone
client = MongoClient("mongodb://app:pw@host1,host2,host3/?replicaSet=rs0&w=majority&retryWrites=true")
db = client.telemetry

db.collections.create_index([("systemId", ASCENDING), ("receivedAt", DESCENDING)])
db.collections.insert_one({"systemId": "APM001", "product": "PowerStore", "status": "RECEIVED",
                           "receivedAt": datetime.now(timezone.utc)})
for doc in db.collections.find({"status": "FAILED"}, {"_id": 0, "systemId": 1}).sort("receivedAt", -1).limit(20):
    print(doc)
job = db.jobs.find_one_and_update({"state": "queued"}, {"$set": {"state": "running", "worker": "w1"}},
                                  sort=[("priority", DESCENDING)], return_document=ReturnDocument.AFTER)   # atomic "claim a job"
pipeline = [{"$group": {"_id": "$product", "n": {"$sum": 1}}}, {"$sort": {"n": -1}}]
print(list(db.collections.aggregate(pipeline)))
with db.collections.watch([{"$match": {"operationType": "insert"}}]) as stream:   # change stream
    for change in stream: print(change["fullDocument"])
```

### M14. MongoDB vs PostgreSQL (JSONB): an honest comparison

| | MongoDB | PostgreSQL (+ JSONB) |
|---|---|---|
| Model | documents first | relational first, documents supported |
| Joins/transactions | `$lookup`; transactions supported but costly | first-class |
| Schema | flexible (+ optional validation) | strict (+ flexible JSONB columns) |
| Horizontal scale | built-in sharding | extensions (Citus) or application-level sharding |
| Best fit | catalogues, content, user profiles, events, IoT, rapidly evolving schemas | transactional systems, reporting, complex relations |
> A good answer: "I'd choose based on access patterns. If the data is naturally hierarchical, read as a whole, and I need easy horizontal scale, MongoDB. If I need multi-entity transactions, complex joins and strong constraints, PostgreSQL, using JSONB for the flexible parts."

### M15. MongoDB interview questions

1. Embedding vs referencing: give examples of when you'd use each.
2. What's the 16 MB limit and how do you design around it?
3. Explain a replica set election. What does `w: "majority"` protect you from?
4. Read preference vs read concern vs write concern.
5. How do you choose a shard key? What goes wrong with a timestamp shard key?
6. Targeted vs scatter-gather queries.
7. Explain the ESR rule. What's a covered query? How do you read `explain()` output?
8. Write an aggregation: top 5 products by failure rate.
9. Does MongoDB support transactions? When should you avoid needing them?
10. How do change streams work and what would you use them for?
11. What's NoSQL injection?
12. MongoDB or PostgreSQL for [scenario]? Why?

### Quick summary

- Stores **documents** (BSON = binary JSON) in **collections**. Schema-flexible (but use schema validation in production).
- **Embedding vs referencing:** embed data that's read together and bounded (an order's line items). Reference data that's large, unbounded or shared (comments on a viral post, users). Document limit: 16 MB.
- **Indexes:** single-field, compound (same leftmost-prefix rule), multikey (arrays), text, geospatial, TTL indexes (auto-expire documents: sessions, logs).
- **Aggregation pipeline:** `$match → $group → $sort → $project → $lookup (a join) → $unwind`.

```javascript
db.orders.aggregate([
  { $match: { status: "DELIVERED" } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } }, { $limit: 5 }
])
```

- **Replica set:** one **primary** (takes writes) + secondaries (replicate the **oplog**). Automatic **election** if the primary dies (a majority vote, so use an odd number of members).
- **Sharding:** split a collection across shards by a **shard key**; `mongos` routes queries. A bad shard key (monotonic like a timestamp, or low cardinality) → **hotspots**. A hashed shard key spreads writes evenly but makes range queries scatter-gather.
- **Write concern** (`w:1` fast vs `w:"majority"` durable across failover) and **read concern / read preference** (read from secondaries → possibly stale). Multi-document ACID **transactions** have been supported since 4.0 (replica sets) and 4.2 (sharded), but cost performance.

---

## MongoDB CRUD and commands (write these fluently)
```javascript
use telemetry                                         // switch/create database
db.collections.insertOne({ systemId: "APM001", product: "PowerStore", status: "RECEIVED",
                           sizeMb: 420, tags: ["prod", "india"], receivedAt: new Date() })
db.collections.insertMany([{ ... }, { ... }])

db.collections.find({ product: "Unity", sizeMb: { $gt: 100 } })                 // filter
db.collections.find({ status: { $in: ["FAILED", "RECEIVED"] } }, { systemId: 1, _id: 0 })   // projection
db.collections.find({ $or: [{ status: "FAILED" }, { sizeMb: { $gte: 1000 } }] }).sort({ receivedAt: -1 }).limit(20)
db.collections.find({ tags: "prod" })                 // matches if the array contains "prod"
db.collections.find({ "meta.model": "H700" })          // dot notation into nested documents
db.collections.countDocuments({ status: "FAILED" })

db.collections.updateOne({ _id: id }, { $set: { status: "PROCESSED" }, $inc: { retries: 1 } })
db.collections.updateMany({ status: "RECEIVED" }, { $set: { stale: true } })
db.collections.updateOne({ systemId: "X" }, { $set: { seen: new Date() } }, { upsert: true })
db.collections.updateOne({ _id: id }, { $push: { tags: "retried" } })            // also $pull, $addToSet
db.collections.deleteOne({ _id: id }); db.collections.deleteMany({ status: "FAILED" })

db.collections.createIndex({ systemId: 1, receivedAt: -1 })                      // compound index
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })          // TTL index
db.collections.find({ systemId: "APM001" }).explain("executionStats")            // IXSCAN vs COLLSCAN
```

Query operators: `$eq $ne $gt $gte $lt $lte $in $nin $and $or $not $exists $regex $elemMatch $size`. Update operators: `$set $unset $inc $push $pull $addToSet $rename`.
**Schema design patterns:** embed (one-to-few), reference (one-to-many/many-to-many), bucket pattern (time series: one document per device per hour), computed pattern (pre-aggregated counters), extended reference (copy a few fields to avoid joins).

# Part D: Redis (asked in almost every system design)

## D1. Redis in plain words (start here)

**The problem.** Your application keeps its data in a database like MySQL. The database stores data on **disk** and does a lot of work for every query (parsing SQL, checking indexes, locking, reading pages). That's safe, but it takes milliseconds. If 50,000 users open the same product page every second, asking the database 50,000 times for the same data is wasteful and slow, and the database eventually falls over.

**The idea.** Keep frequently used data in **RAM**, which is about 1,000× faster than disk, in a simple lookup structure: "give me the value for this key." That's Redis.

**Analogy.** The database is a **library**: huge, organised and permanent, but you have to walk to the shelves. Redis is the **whiteboard next to your desk**: small, instant to read, and you write the things you need all the time on it. If the whiteboard is wiped, you can always fetch the information from the library again.

**Redis = REmote DIctionary Server.** Think of it as a giant Python `dict` living on a separate server that many application servers share over the network, but with much more than plain strings as values: lists, sets, sorted sets, hashes, streams and more.

**Where Redis sits in an architecture:**

```
                 ┌────────────── App servers (many) ──────────────┐
Users ──► LB ──► │  App 1        App 2        App 3        App 4  │
                 └──────┬───────────┬────────────┬───────────┬────┘
                        │ 1. GET product:99 (≈0.2 ms)        │
                        ▼                                    ▼
                 ┌──────────────────────────────┐   miss  ┌──────────────────┐
                 │ REDIS (in RAM)               │ ──────► │ MySQL / Postgres │  (≈5–50 ms)
                 │ product:99 → {...}           │ ◄────── │ (on disk)        │
                 │ session:abc → {...}          │  2. fill└──────────────────┘
                 │ rate:user42 → 17             │
                 └──────────────────────────────┘
```

**What Redis is used for (each explained below):** caching, session storage, rate limiting, distributed locks, leaderboards and counters, queues and streams, pub/sub messaging, real-time analytics (unique visitors), geo lookups ("drivers near me").

**What Redis is NOT:** usually not your **primary system of record** for critical data. Data lives in RAM (limited and expensive), and depending on persistence settings you can lose the last second or more of writes on a crash. Use it **in front of** a durable database, or for data you can rebuild.

---

## D2. Keys, values and expiry: the basic model

- Everything is **key → value**. Keys are strings; by convention use colons as namespaces: `user:42:profile`, `product:99`, `rate:user42:2026-11-21T10:05`.
- Each value has a **type** (string, list, hash…), and the commands you can run depend on the type.
- **TTL (time to live):** any key can expire automatically: `SET otp:9876543210 482913 EX 300` → gone after 5 minutes. Perfect for caches, OTPs, sessions and rate-limit windows.

```bash
SET greeting "hello"        # create/overwrite
GET greeting                # "hello"
EXPIRE greeting 60          # expire in 60 s
TTL greeting                # seconds left (-1 = no expiry, -2 = key doesn't exist)
PERSIST greeting            # remove the expiry
DEL greeting; EXISTS greeting; TYPE greeting
SCAN 0 MATCH user:* COUNT 100   # iterate keys safely (never KEYS * in production)
```

**How expiry works internally:** Redis doesn't run a timer per key. It uses two methods together: **lazy expiry** (when you access a key, Redis checks whether it has expired and deletes it if so) and **active expiry** (several times a second, Redis samples random keys that have a TTL and deletes the expired ones; if many were expired, it repeats). So expired keys disappear quickly without costing a timer each.

---

## D3. The data structures: one by one (plain idea → picture → commands → use)

### 1. String: one value per key
**Idea:** the simplest box: a key holds one piece of text, a number, or binary data (up to 512 MB, but keep values small).

```
user:42:name  ──►  "Gopal"
page:views    ──►  "1043"        (stored as a string, but INCR treats it as a number)
```
```bash
SET user:42:name "Gopal"
SET product:99 '{"title":"Air purifier","price":12999}' EX 600   # a cached JSON blob for 10 min
INCR page:views            # atomic +1 → 1044 (no race even with 1,000 app servers)
INCRBY page:views 10; DECR stock:99
SET lock:job7 worker-1 NX PX 30000     # set only if Not eXists, expire in 30,000 ms → a lock
MSET a 1 b 2; MGET a b                 # several at once
```

**Uses:** caching serialised objects, counters, flags, locks, OTPs.

### 2. List: an ordered sequence (a queue or a stack)
**Idea:** like a Python list that you can push to and pop from at **both ends** quickly.

```
jobs ──► [ job3 | job2 | job1 ]
          ▲ LPUSH (add left)     RPOP / BRPOP (take right) ▲
```
```bash
LPUSH jobs '{"id":1}' '{"id":2}'      # producer adds jobs
BRPOP jobs 5                           # consumer waits up to 5 s for a job (blocking pop)
LRANGE recent:views:42 0 9             # the latest 10 viewed products
LTRIM recent:views:42 0 49             # keep only the latest 50
LMOVE jobs processing RIGHT LEFT       # move a job to a "processing" list (reliable-queue pattern)
```

**Uses:** simple job queues, "recent items" lists, activity feeds. Push/pop at the ends is O(1); index access in the middle is O(n).

### 3. Hash: an object with fields
**Idea:** one key holds a small dictionary of field → value, like a row or a JSON object, but you can read or update **one field** without rewriting the whole thing.

```
product:99 ──► { title: "Air purifier", price: "12999", views: "530" }
```
```bash
HSET product:99 title "Air purifier" price 12999 views 0
HGET product:99 price; HGETALL product:99
HINCRBY product:99 views 1            # update one field atomically
HDEL product:99 views; HEXISTS product:99 title
```

**Uses:** user profiles, sessions, product details, per-entity counters. Memory-efficient for small objects.

### 4. Set: unique, unordered members
**Idea:** a bag with no duplicates. Very fast "is X in it?" plus maths between sets.

```
online:users ──► { 42, 7, 1001 }
```
```bash
SADD online:users 42 7 1001
SISMEMBER online:users 42             # 1 = yes
SCARD online:users                    # how many
SINTER followers:A followers:B        # mutual followers
SUNION / SDIFF; SRANDMEMBER; SPOP
```

**Uses:** unique visitors (exact), tags, "who liked this", deduplication of processed IDs.

### 5. Sorted set (ZSET): unique members, each with a score, always kept sorted
**Idea:** a set where every member has a number (a score), and Redis keeps it ordered by score. Ask for the top 10, a range of scores, or someone's rank, instantly.

```
leaderboard ──► asha:1500  ravi:1200  meena:900   (sorted by score)
```
```bash
ZADD leaderboard 1500 asha 1200 ravi 900 meena
ZINCRBY leaderboard 50 ravi                # ravi now 1250
ZREVRANGE leaderboard 0 9 WITHSCORES       # top 10
ZREVRANK leaderboard ravi                  # rank (0-based)
ZRANGEBYSCORE events 1700000000 1700000600 # members with scores in a range (e.g. timestamps)
ZREMRANGEBYSCORE rl:user42 0 <cutoff>      # delete old entries (sliding-window rate limiting)
```

**Internals:** small sorted sets use a compact array (listpack); large ones use a **skip list** (fast ordered operations, O(log n)) plus a hash table (O(1) score lookup by member).
**Uses:** leaderboards, priority queues, time-ordered indexes ("events in the last 10 minutes"), sliding-window rate limiting, delayed jobs (score = run-at time).

### 6. Bitmap: a giant array of bits
**Idea:** set and read individual bits on a string. 1 million users' "active today?" flags take only ~125 KB.

```bash
SETBIT active:2026-11-21 42 1        # user 42 was active today
GETBIT active:2026-11-21 42
BITCOUNT active:2026-11-21           # how many users were active
BITOP AND active:both active:2026-11-20 active:2026-11-21   # active on both days
```

### 7. HyperLogLog: approximate unique counts in tiny memory
**Idea:** count **distinct** items (unique visitors) with about 0.81% error using only ~12 KB, no matter whether there are 1,000 or 1 billion items. You can't list the members, only count them.

```bash
PFADD visitors:2026-11-21 user42 user7 user42
PFCOUNT visitors:2026-11-21          # ≈ 2
PFMERGE visitors:week visitors:2026-11-15 visitors:2026-11-21
```

### 8. Geo: locations and "near me"
```bash
GEOADD drivers 77.5946 12.9716 driver:1        # longitude, latitude (Bengaluru)
GEOSEARCH drivers FROMLONLAT 77.60 12.97 BYRADIUS 3 km ASC COUNT 5
```

Stored inside a sorted set using a geohash as the score.

### 9. Streams: an append-only log with consumer groups (a mini Kafka)
**Idea:** an ever-growing log of entries with IDs (time-based). Many consumers can read it; **consumer groups** split the work and track what each consumer has acknowledged, like Kafka consumer groups.

```
events stream: 1732170000000-0 {type: price_drop, sku: 123} → 1732170000500-0 {…} → …
```
```bash
XADD events * type price_drop sku 123                 # * = auto ID
XGROUP CREATE events alerts $ MKSTREAM                # a consumer group starting at new messages
XREADGROUP GROUP alerts c1 COUNT 10 BLOCK 5000 STREAMS events >   # read new messages for consumer c1
XACK events alerts 1732170000000-0                    # acknowledge after processing
XPENDING events alerts                                # delivered but not yet acked (for retries)
XTRIM events MAXLEN ~ 100000                          # cap the stream's size
```

**Streams vs Kafka:** streams are great for moderate volumes inside an app that already uses Redis; Kafka is built for very high throughput, long retention on disk, and huge fan-out.

### 10. Pub/Sub: fire-and-forget broadcasting
**Idea:** publishers send messages to a channel; whoever is subscribed **right now** receives them. Nothing is stored: if a subscriber is offline, it misses the message.

```bash
SUBSCRIBE price-alerts          # (in one client)
PUBLISH price-alerts "sku 123 dropped to 999"    # (in another)
```

**Uses:** live notifications between servers, cache-invalidation broadcasts, chat typing indicators. For guaranteed delivery use Streams (or Kafka/RabbitMQ) instead.

### Data structure cheat sheet

| Type | Think of it as | Best for |
|---|---|---|
| String | a single box | cache blobs, counters, locks |
| List | a queue/stack | job queues, recent items |
| Hash | an object | profiles, sessions, per-entity fields |
| Set | a unique bag | membership, tags, dedup |
| Sorted set | a ranked list | leaderboards, time windows, priority/delayed jobs |
| Bitmap | an array of flags | daily active flags |
| HyperLogLog | an estimate counter | unique visitors |
| Geo | points on a map | nearby search |
| Stream | a durable log | event processing with consumer groups |
| Pub/Sub | a radio broadcast | live, losable notifications |

Redis 8 / Redis Stack also include **JSON** documents, a **query and search engine** (secondary indexes, full text, **vector search** for RAG), time series, and probabilistic structures (Bloom/cuckoo filters, count-min sketch, top-k).

---

## D4. Why Redis is so fast: the architecture inside one Redis server

```
           many client connections (TCP)
   ┌──────────┬──────────┬──────────┬──────────┐
   ▼          ▼          ▼          ▼          ▼
 ┌─────────────────────────────────────────────────┐
 │  I/O multiplexing (epoll / kqueue)              │  "which sockets have data?"
 │        │                                        │
 │        ▼                                        │
 │  ONE main thread: event loop                    │  reads command → executes → writes reply
 │   ┌───────────────────────────────────────┐     │  (optional I/O threads help read/write
 │   │ GET a │ INCR b │ ZADD c │ HSET d │ …   │     │   sockets in Redis 6+, but commands
 │   └───────────────────────────────────────┘     │   still execute one at a time)
 │        │                                        │
 │        ▼                                        │
 │  In-memory keyspace (hash table of all keys)    │
 │   key → value object (string/list/hash/zset…)   │
 └────────────────────┬────────────────────────────┘
                      │ (background)
          ┌───────────┴────────────┐
          ▼                        ▼
   RDB snapshot (forked child)   AOF append-only log
```

**Reasons it's fast:**

1. **Everything is in RAM** (no disk reads on the request path).
2. **One thread executes commands**, so there are no locks or context switches between threads. Most commands take microseconds.
3. **I/O multiplexing (epoll)** lets one thread serve tens of thousands of connections (file 06).
4. **Compact encodings** for small values (listpack, intset), so it's cache-friendly.
5. **Simple protocol** (RESP) that's cheap to parse.

**The consequence of single-threaded execution (important!):** each command is **atomic** (nothing else runs in the middle of it), but one **slow command blocks everyone**. `KEYS *` on 10 million keys, `SMEMBERS` on a set with a million members, or a long Lua script freezes the server for all clients. Use `SCAN`, `SSCAN`, `HSCAN` and keep values small.

**Scaling a single node:** to use more cores, run several Redis instances (or Redis Cluster). Redis 6+ I/O threads help with network-heavy workloads.

---

## D5. Atomicity: transactions, optimistic locking, Lua

**Single commands are atomic.** `INCR` from 1,000 app servers never loses a count.

**MULTI/EXEC: run a group of commands together:**

```bash
MULTI
DECRBY stock:99 1
LPUSH orders:pending order-555
EXEC            # both run back to back; no other client's command runs in between
```

⚠ Redis transactions have **no rollback**: if one command fails (e.g. a wrong type), the others still run. They guarantee isolation (no interleaving), not all-or-nothing undo.

**WATCH: optimistic locking (check-and-set):**

```bash
WATCH stock:99
GET stock:99          # → 3 (your code checks it's > 0)
MULTI
DECR stock:99
EXEC                  # returns nil (aborted) if stock:99 changed after WATCH → retry
```

**Lua scripts (or Redis Functions): custom atomic operations.** The whole script runs atomically on the server. It's the clean way to do "read, decide, write" in one step:

```lua
-- token bucket rate limiter: KEYS[1]=bucket key, ARGV: capacity, refill_per_sec, now_ms
local cap, rate, now = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(b[1]) or cap
local ts = tonumber(b[2]) or now
tokens = math.min(cap, tokens + (now - ts) / 1000 * rate)
local allowed = 0
if tokens >= 1 then tokens = tokens - 1; allowed = 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(cap / rate * 1000))
return allowed
```
```python
limiter = r.register_script(LUA_SOURCE)
allowed = limiter(keys=[f"tb:{user_id}"], args=[10, 5, int(time.time() * 1000)])
```

---

## D6. Persistence: what happens to the data if Redis restarts?

RAM is wiped when a process dies. Redis offers two ways to save data to disk:

**RDB snapshots: a photo of all data at a moment.**

```
Redis main process ──fork()──► child process
      │ keeps serving clients        │ writes the whole dataset to dump.rdb
      │ (copy-on-write: pages are    │ (a compact binary file)
      │  copied only if changed)     ▼
      ▼                          dump.rdb  ──► fast restart, good for backups
```

- Configured like `save 3600 1 300 100 60 10000` (snapshot if ≥1 change in 1 h, ≥100 in 5 min, ≥10,000 in 1 min), or manually with `BGSAVE`.
- ✅ Compact, fast to load, great for backups. ❌ You lose everything since the last snapshot (minutes of writes). `fork()` on a huge dataset can briefly pause the server and needs spare memory (COW, file 06).

**AOF (append-only file): a diary of every write command.**

```
client: SET a 1 → Redis applies it → appends "SET a 1" to appendonly.aof → (fsync policy)
restart: replay the AOF from top to bottom → the data is rebuilt
```

- `appendfsync always` (fsync every write: safest, slowest), **`everysec`** (default: lose at most ~1 s of writes), `no` (let the OS decide: fastest, least safe).
- The file keeps growing, so Redis **rewrites** it in the background into the minimal set of commands that recreates the current data (`BGREWRITEAOF`; Redis 7 uses a multi-part AOF).
- ✅ Much less data loss. ❌ Bigger files, slower restarts.

**Recommended:** enable both (RDB for backups and fast restarts, AOF everysec for durability), or neither for a pure cache that can be rebuilt from the database.

| Mode | Data loss on crash | Restart speed | Use |
|---|---|---|---|
| None | everything | instant (empty) | pure cache |
| RDB only | minutes | fast | caches that are slow to warm, backups |
| AOF everysec | ≤ ~1 s | slower | sessions, counters, queues |
| RDB + AOF | ≤ ~1 s | good | most production setups |

---

## D7. Memory limits and eviction: what happens when RAM is full?

Set `maxmemory 4gb` and a **`maxmemory-policy`**. When memory is full and a new write arrives:

| Policy | Behaviour | Use when |
|---|---|---|
| `noeviction` | reject writes with an error | Redis holds data you must not lose (queues, locks) |
| `allkeys-lru` | evict the **least recently used** key, any key | **general cache** (the most common choice) |
| `allkeys-lfu` | evict the **least frequently used** key | caches with stable hot items |
| `volatile-lru` / `volatile-lfu` | like the above, but only keys that have a TTL | a mix of cache keys (with TTL) and permanent keys |
| `volatile-ttl` | evict keys closest to expiring | |
| `allkeys-random` / `volatile-random` | random eviction | rarely |

**Approximate LRU:** Redis doesn't keep a perfect LRU list (too expensive). It **samples** a few keys (`maxmemory-samples`, default 5) and evicts the best candidate among them: close to true LRU at a tiny cost.
**Memory tips:** keep keys short but readable, use hashes for small objects, set TTLs on cache entries, watch **big keys** (`redis-cli --bigkeys`) and fragmentation (`INFO memory`).

---

## D8. Replication: copies of Redis on other servers

```
                 writes
App ─────────────────────────► PRIMARY (master)
 │                                  │ replication stream (async)
 │ reads (may be slightly stale)    ├──────────► REPLICA 1
 └─────────────────────────────────►├──────────► REPLICA 2
```

**Plain words:** the primary takes all writes and streams every change to one or more replicas, which keep identical copies. Replicas can serve reads and act as backups ready to take over.
**How it works:**

1. A new replica connects → the primary sends a full RDB snapshot (full sync) → then streams every following write command.
2. If the connection blips, the replica asks to continue from its **offset** (`PSYNC`); the primary keeps a **replication backlog** buffer so a short disconnect doesn't need a full resync.
3. Replication is **asynchronous**: the primary acknowledges the client before replicas have the write. If the primary crashes, the last few writes may be lost. `WAIT 1 100` makes a client wait until at least 1 replica acknowledged (within 100 ms) for important writes; it reduces the risk but isn't full consensus.
4. **Reads from replicas can be stale** (replica lag), so don't read-after-write from a replica when it matters.

---

## D9. High availability with Redis Sentinel

**Problem:** replication gives copies, but if the primary dies, someone must **promote a replica** and tell the apps where the new primary is.

```
       ┌───────────┐   ┌───────────┐   ┌───────────┐
       │ Sentinel 1│   │ Sentinel 2│   │ Sentinel 3│   (separate processes; odd number)
       └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
             │  monitor (ping) │               │
     ┌───────▼───────┐   ┌─────▼──────┐   ┌────▼───────┐
     │ PRIMARY  ✗    │   │ REPLICA A  │   │ REPLICA B  │
     └───────────────┘   └────────────┘   └────────────┘
1. A Sentinel can't reach the primary → marks it "subjectively down".
2. Enough Sentinels agree (the QUORUM, e.g. 2 of 3) → "objectively down".
3. The Sentinels elect a leader among themselves; it picks the best replica (most up to date) and promotes it.
4. Other replicas are re-pointed to the new primary; clients ask the Sentinels "who's the primary now?" and reconnect.
```

Sentinel gives **automatic failover** for a single primary (no sharding). Clients must be Sentinel-aware (most libraries are).

---

## D10. Redis Cluster: sharding across many primaries

**Problem:** one server's RAM (say 64 GB) and one thread's throughput aren't enough. **Cluster** splits the data across several primaries, each with its own replicas.

**Plain words:** the whole keyspace is divided into **16,384 hash slots**. Each key belongs to exactly one slot, and each primary owns a range of slots. It's like a big apartment building with 16,384 mailboxes split among three postmen.

```
slot = CRC16(key) mod 16384

        slots 0–5460          slots 5461–10922        slots 10923–16383
     ┌───────────────┐      ┌───────────────┐       ┌───────────────┐
     │ Primary A     │      │ Primary B     │       │ Primary C     │
     │   └ Replica A1│      │   └ Replica B1│       │   └ Replica C1│
     └───────┬───────┘      └───────┬───────┘       └───────┬───────┘
             └────── cluster bus (gossip: health, slot map, failover votes) ──────┘
Client (cluster-aware) caches "slot → node" and sends each command straight to the right primary.
```

- **Redirects:** if a client asks the wrong node, it replies `MOVED 3999 10.0.0.2:6379` (the slot lives there now) → the client updates its map. During resharding a slot can be mid-migration → `ASK` redirect for that one request.
- **Multi-key operations** (`MGET`, `MULTI`, Lua over several keys) only work if all the keys are in the **same slot**. Force that with **hash tags**: only the part inside `{}` is hashed, so `{user42}:cart` and `{user42}:profile` land in the same slot.
- **Failover:** if a primary fails, its replica is promoted by a vote of the other primaries (no Sentinel needed).
- **Resharding:** move slots between nodes online when adding capacity (`redis-cli --cluster reshard` / `add-node`).
- **Limits:** a single database (no `SELECT 1`), keys designed with hash tags for multi-key operations, and clients must support cluster mode.

**Sentinel vs Cluster:** Sentinel = HA for one dataset that fits on one server. Cluster = HA **and** horizontal scaling (sharding).

---

## D11. Common patterns with code (Python, `redis-py`)

```python
import redis, json, time, uuid
r = redis.Redis(host="localhost", port=6379, decode_responses=True)   # uses a connection pool internally
```

**1. Cache-aside (the #1 pattern):**

```python
def get_product(pid):
    key = f"product:{pid}"
    cached = r.get(key)
    if cached:
        return json.loads(cached)                       # cache hit (~0.2 ms)
    product = db.fetch_product(pid)                     # cache miss → database (~10 ms)
    r.set(key, json.dumps(product), ex=600)             # store for 10 min (+ random jitter in practice)
    return product

def update_product(pid, data):
    db.update_product(pid, data)
    r.delete(f"product:{pid}")                          # invalidate; the next read refills the cache
```
```
read:  App ──GET──► Redis ──hit──► return
                      └─miss─► DB ──► SET in Redis (TTL) ──► return
write: App ──► DB ──► DEL key in Redis
```

**2. Session store:**

```python
sid = str(uuid.uuid4())
r.hset(f"session:{sid}", mapping={"user_id": 42, "role": "admin"}); r.expire(f"session:{sid}", 1800)
# any app server can read the session → stateless app servers behind a load balancer
```

**3. Fixed-window rate limiter (simple):**

```python
def allow(user, limit=100, window=60):
    key = f"rl:{user}:{int(time.time() // window)}"
    n = r.incr(key)
    if n == 1: r.expire(key, window)
    return n <= limit
```

**4. Sliding-window rate limiter (exact, with a sorted set):**

```python
def allow_sliding(user, limit=100, window_ms=60_000):
    now = int(time.time() * 1000); key = f"rlz:{user}"
    p = r.pipeline()
    p.zremrangebyscore(key, 0, now - window_ms)         # drop requests older than the window
    p.zadd(key, {f"{now}-{uuid.uuid4()}": now})          # record this request
    p.zcard(key)                                         # count requests in the window
    p.pexpire(key, window_ms)
    _, _, count, _ = p.execute()
    return count <= limit
```

(The token-bucket Lua version in D5 is the most precise and atomic.)

**5. Distributed lock (safe release):**

```python
def acquire(name, ttl_ms=30_000):
    token = str(uuid.uuid4())
    if r.set(f"lock:{name}", token, nx=True, px=ttl_ms):   # only one client wins
        return token
    return None

RELEASE = r.register_script("""
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end
""")
def release(name, token): RELEASE(keys=[f"lock:{name}"], args=[token])   # only the owner can unlock
```

Why the token check: if your lock expired and someone else took it, a plain `DEL` would delete **their** lock.
**Caveat (asked in senior interviews):** a lock with a TTL isn't perfectly safe if the holder pauses (GC, network) past the TTL. Use **fencing tokens** for correctness-critical work (file 12). **Redlock** (locks across 5 independent Redis nodes) is debated (Martin Kleppmann's critique). Use it for efficiency (avoiding duplicate work), not as a guarantee.

**6. Leaderboard:** `ZINCRBY`, `ZREVRANGE … WITHSCORES`, `ZREVRANK` (see D3.5).

**7. Reliable job queue:**

```python
job = r.lmove("jobs", "jobs:processing", "RIGHT", "LEFT")   # atomically take a job AND park it
try:
    handle(json.loads(job)); r.lrem("jobs:processing", 1, job)    # done → remove from processing
except Exception:
    pass   # a reaper later moves stuck jobs from jobs:processing back to jobs (retry)
```

For serious queues, prefer Streams with consumer groups (D3.9), or a real broker (RabbitMQ/Kafka, file 13).

**8. Deduplication of processed messages (idempotency):**

```python
if r.set(f"seen:{msg_id}", 1, nx=True, ex=86400):   # first time we see this ID in 24 h
    process(msg)
```

**Pipelining (cut network round trips):**

```
Without pipelining:  send GET a → wait → reply; send GET b → wait → reply   (N round trips)
With pipelining:     send GET a, GET b, GET c … → read all replies          (1 round trip)
```
```python
p = r.pipeline(transaction=False)
for pid in ids: p.get(f"product:{pid}")
values = p.execute()
```

---

## D12. Operating Redis well: problems and fixes

| Problem | Symptom | Fix |
|---|---|---|
| **Big key** (a 1 GB hash, a million-member set) | latency spikes, slow deletes, uneven cluster memory | split into smaller keys; `UNLINK` (non-blocking delete) |
| **Hot key** (one key gets most traffic) | one cluster node at 100% CPU | replicate the hot value under several keys, local in-app caching, read replicas |
| **Slow commands** (`KEYS`, huge `SMEMBERS`/`HGETALL`, long Lua) | everyone's latency jumps | `SCAN` family, smaller values; check `SLOWLOG GET 10` |
| **Memory full** | errors (`noeviction`) or unexpected evictions | right-size, TTLs, the correct eviction policy, monitor `used_memory` |
| **Fork pauses** during RDB/AOF rewrite | periodic latency spikes on big datasets | more RAM headroom, disable transparent huge pages, persistence on replicas only |
| **Cache stampede** | the DB overloaded when a hot key expires | locks/single-flight, early refresh, TTL jitter (Part D caching patterns) |
| **Connection storms** | too many clients | connection pooling in apps, `maxclients` |

**Monitoring:** `INFO` (memory, clients, keyspace hits/misses → **hit ratio**, ops/sec, replication lag), `SLOWLOG`, `LATENCY DOCTOR`, `MONITOR` (debug only: very expensive), `redis-cli --stat`, plus a Prometheus `redis_exporter` → Grafana.

**Security:** never expose Redis to the internet (it was designed for trusted networks), bind to private interfaces, require auth (`requirepass` / **ACL users** with limited commands and key patterns), enable TLS, disable or rename dangerous commands (`FLUSHALL`, `CONFIG`, `DEBUG`).

---

## D13. Redis vs others, and when not to use it

| | Redis | Memcached | A database |
|---|---|---|---|
| Data types | many | strings only | tables/documents |
| Persistence | optional (RDB/AOF) | none | yes |
| Replication / HA | yes (Sentinel/Cluster) | no (client-side sharding) | yes |
| Threads | single main thread (+ I/O threads) | multi-threaded | many |
| Use | cache + data structures + queues + locks | simple, very large plain caches | the source of truth |

**Don't use Redis when:** the data must never be lost and you can't accept seconds of loss (use a database), the data is much bigger than RAM, or you need complex queries/joins.
**Managed options:** AWS ElastiCache / MemoryDB, Azure Cache for Redis, Google Memorystore, Redis Cloud.
**Ecosystem news worth knowing:** in 2024 Redis moved away from its BSD licence; the Linux Foundation launched **Valkey**, a BSD-licensed fork backed by AWS, Google and others; in 2025 Redis 8 added the AGPL as an open-source licence option.

## D14. Redis interview questions (with short answers)

1. **Why is Redis fast if it's single-threaded?** RAM + no locking + epoll event loop + tiny commands. CPU is rarely the bottleneck; memory and network are.
2. **RDB vs AOF?** Snapshot (compact, loses minutes) vs command log (loses ≤ 1 s with everysec, bigger).
3. **How does Redis Cluster decide where a key goes?** CRC16(key) mod 16,384 → slot → the node owning the slot; hash tags force related keys together.
4. **Sentinel vs Cluster?** Failover for one primary vs sharding + failover.
5. **How do you implement a rate limiter / lock / leaderboard / cache?** D11.
6. **What happens when memory is full?** Depends on `maxmemory-policy` (D7).
7. **Are Redis transactions ACID?** Atomic in the sense of isolation (no interleaving) but no rollback; durability depends on persistence settings.
8. **Pub/Sub vs Streams?** Fire-and-forget vs a durable log with consumer groups and acks.
9. **What is a cache stampede and how do you prevent it?** (Caching patterns below.)
10. **Can you lose data in Redis replication?** Yes: replication is async; recent writes can be lost on failover.

### Quick summary (one glance)
**What:** an in-memory data-structure store. Very fast (well under a millisecond), largely single-threaded command execution (so each command is atomic).
**Data structures:** strings (counters with `INCR`), hashes, lists (queues), sets, **sorted sets** (leaderboards, rate-limit windows, priority queues), streams, bitmaps, HyperLogLog (approximate unique counts), geo.
**Uses:** caching, sessions, **rate limiting** (`INCR` + `EXPIRE`, or sorted sets for sliding windows), distributed locks (`SET key val NX PX 30000`), pub/sub, leaderboards, job queues.
**Persistence:** RDB snapshots (compact, some data loss possible) and AOF (append-only log; more durable). **Replication** + **Sentinel** (failover) or **Redis Cluster** (sharding across 16,384 hash slots).
**Eviction policies:** `noeviction`, `allkeys-lru`, `volatile-lru`, `allkeys-lfu`, `volatile-ttl`.
**Licensing note:** Redis changed its licence in 2024 and the Linux Foundation fork **Valkey** appeared (AWS/GCP back it). Redis 8 (2025) added AGPL as an option. Mentioning this shows you follow the ecosystem.

## Redis commands by data structure
```bash
SET user:42:name "Gopal" EX 3600       # string with a 1-hour TTL
GET user:42:name;  DEL k;  EXISTS k;  TTL k;  EXPIRE k 60
INCR api:calls:2026-11-20              # atomic counter (rate limiting, stats)
SET lock:job42 worker1 NX PX 30000     # set only if absent, 30 s expiry → a simple lock
HSET product:99 title "Air purifier" price 12999;  HGETALL product:99;  HINCRBY product:99 views 1
LPUSH jobs '{"id":1}';  BRPOP jobs 5    # list as a queue (blocking pop with a 5 s timeout)
SADD online:users 42;  SISMEMBER online:users 42;  SCARD online:users
ZADD leaderboard 1500 "asha" 1200 "ravi";  ZREVRANGE leaderboard 0 9 WITHSCORES   # top 10
ZADD rl:user42 <now_ms> <request_id>;  ZREMRANGEBYSCORE rl:user42 0 <now_ms-60000>;  ZCARD rl:user42   # sliding-window rate limit
XADD events * type price_drop sku 123; XREADGROUP GROUP g1 c1 COUNT 10 STREAMS events >          # streams (Kafka-like)
PFADD visitors:today 42;  PFCOUNT visitors:today                                  # HyperLogLog distinct count
PUBLISH alerts "price drop";  SUBSCRIBE alerts
MULTI; INCR a; INCR b; EXEC             # a transaction (queued and run atomically; no rollback)
EVAL "<lua script>" 1 key arg            # atomic multi-step logic (the token-bucket check in one call)
```

**Pipelining** (send many commands without waiting for each reply) cuts round trips. Avoid `KEYS *` in production (it blocks); use `SCAN`.
**Python usage:** `r = redis.Redis(); r.set("k", "v", ex=60); r.incr("hits")`.

## Caching patterns (very important)

| Pattern | How | Trade-off |
|---|---|---|
| **Cache-aside (lazy loading)** | App reads the cache; on a miss, reads the DB and populates the cache | Most common; the first read is slow; possible staleness |
| Read-through | The cache itself loads from the DB on a miss | Simpler app code |
| Write-through | Write to the cache and the DB synchronously | Consistent; slower writes |
| Write-behind (write-back) | Write to the cache; flush to the DB asynchronously | Fast writes; **risk of data loss** |
| Write-around | Write only to the DB; the cache fills on read | Avoids polluting the cache with write-once data |

**Cache problems:**

- **Stale data / invalidation:** "one of the two hard things in computer science." Use TTLs, delete-on-write, or events.
- **Cache stampede (thundering herd):** a hot key expires and thousands of requests hit the DB at once. Fix: a lock/single-flight so one request recomputes, early probabilistic refresh, or staggered TTLs (jitter).
- **Cache penetration:** repeated requests for keys that don't exist go straight to the DB. Fix: cache the "not found" result briefly, or use a Bloom filter.
- **Hot keys:** one key gets massive traffic. Fix: replicate it across nodes or keep a local in-process cache.

**Your extension's caching:** the backend caches LLM results (e.g. match verdicts) so repeated requests don't cost another model call. Cost control *is* a caching use case.

---

## Interview Q&A

**Q: Why are B+ trees used for database indexes?** High fan-out → shallow trees → few disk reads; linked leaves → efficient range scans; balanced → predictable performance.
**Q: Clustered vs non-clustered index?** Clustered = the table rows stored in index order (one per table; the InnoDB PK). Non-clustered = a separate structure pointing to rows (in InnoDB, pointing to the PK).
**Q: How would you speed up a slow query?** EXPLAIN → missing or unused index? → rewrite (avoid functions on columns, SELECT only the needed columns, avoid N+1 queries) → covering index → caching → denormalise/partition if still needed.
**Q: What's the N+1 problem?** Fetch N parents, then run one query per parent for its children (N+1 queries). Fix: a join or a batched `IN (...)` query (ORM eager loading).
**Q: Optimistic vs pessimistic locking?** Version check + retry (low contention) vs lock the row (high contention, short transactions).
**Q: SQL vs NoSQL for X?** Discuss consistency needs, query patterns, scale and schema flexibility. Don't be dogmatic.

## Quick revision

- Keys, normal forms (1NF–BCNF), denormalisation trade-off. ACID + WAL.
- Isolation levels vs anomalies; MVCC (readers don't block writers); optimistic vs pessimistic locking.
- B+ tree, clustered PK in InnoDB, leftmost prefix, covering index, when indexes fail, EXPLAIN.
- SQL: GROUP BY/HAVING, execution order, window functions (ROW_NUMBER/RANK/DENSE_RANK/LAG), top-N per group, Nth salary, anti join.
- MySQL logs (redo/undo/binlog), replication lag, sharding. PostgreSQL: JSONB, VACUUM, pgvector.
- MongoDB: embed vs reference, aggregation, replica sets, shard keys, write concern.
- Redis structures + uses; cache-aside; stampede/penetration/hot key fixes.

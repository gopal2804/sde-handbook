# 11 · Storage Systems: Your Domain

**Why this file matters most for you:** you come from Dell's storage division. You worked on **PowerScale OneFS** (scale-out NAS: file storage) and wrote telemetry output to **Dell ECS** (object storage, S3-compatible). Storage-heavy companies (NetApp, Pure Storage, Nutanix, IBM, Cohesity, Rubrik, Commvault, Western Digital, Seagate, VMware/Broadcom, Hitachi Vantara, Dell itself) and every cloud team will test this. **Almost nobody at 2–3 years can speak to both file and object storage from real work, so say it explicitly.**

---

## Start here: storage in plain words

**What "storage" means:** anywhere data lives when the power is off: hard disks, SSDs, and the systems that combine many of them so data is **big, fast, shared and safe**.

### Block, file and object storage, with one analogy each

| Type | Analogy | What you get |
|---|---|---|
| **Block** | **Empty plots of land**: you get numbered plots and build whatever you want on them | A raw "disk" (numbered blocks). Your OS formats it with a file system. Used by databases and VMs |
| **File (NAS)** | **A library** with floors, shelves and a catalogue; many readers share it | Folders and files over the network (NFS/SMB). Many servers mount the same share |
| **Object** | **Valet parking**: hand over the car (data), get a ticket (key); you don't know or care where it's parked | Store/fetch whole blobs by key over HTTP (S3 API). Unlimited scale, cheap, but no editing in the middle of a file |

```
BLOCK (SAN)                         FILE (NAS)                            OBJECT (S3 / Dell ECS)
Server ──iSCSI/FC──► LUN            Servers ──NFS/SMB──► /ifs/data/...      App ──HTTPS PUT/GET──► bucket/key
(server sees a raw disk,            (everyone sees the same folder tree;    (flat namespace: "logs/2026/x.parquet"
 formats it ext4/XFS)                locking and permissions handled by NAS)  is just a key; metadata travels with it)
```

### Why storage systems are complicated
Disks **fail** (thousands of disks = failures every week), are **slow** compared with RAM, and one disk is **too small**. So storage systems:

1. **Spread data across many disks/nodes** for capacity and speed (striping).
2. **Keep redundancy** so a failure doesn't lose data (RAID, replication, erasure coding).
3. **Cache** hot data in RAM/SSD.
4. **Check integrity** (checksums) because bits can silently rot.
5. Offer **features** on top: snapshots, replication to another site, deduplication, tiering, quotas.

### PowerScale OneFS: a scale-out NAS cluster
```
                Clients (NFS / SMB / S3 / HDFS) mount ONE namespace: /ifs
                    │            │             │
           ┌────────▼───┐  ┌─────▼──────┐  ┌───▼────────┐  ┌────────────┐
           │ Node 1     │  │ Node 2     │  │ Node 3     │  │ Node 4 (add│ ← add a node: capacity AND
           │ CPU RAM    │  │ CPU RAM    │  │ CPU RAM    │  │ later)     │   performance grow; data is
           │ disks      │  │ disks      │  │ disks      │  │            │   rebalanced automatically
           └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
                 └──────── back-end network (node-to-node traffic) ───┘
 A file is split into stripes; data + erasure-code protection units are spread across nodes,
 so a failed drive or node is rebuilt from the others.
 Cluster-wide services: GConfig (config) · Job Engine (rebalance/repair) · PAPI/isi (management) · CELOG (events)
```

### Object storage (S3 / Dell ECS) architecture
```
 App / S3 Browser / SDK ──HTTPS (S3 API: PUT/GET/LIST)──► Load balancer
                                                            │
                                            ┌───────────────▼────────────────┐
                                            │ Front-end / API nodes          │  auth (keys/IAM), request routing
                                            ├────────────────────────────────┤
                                            │ Metadata service               │  bucket + key → where the chunks live,
                                            │ (replicated, partitioned index)│  size, checksum, version, user metadata
                                            ├────────────────────────────────┤
                                            │ Storage nodes                  │  data split into chunks, erasure coded
                                            │  (many disks each)             │  across nodes/racks; checksummed; scrubbed
                                            └───────────────┬────────────────┘
                                                            │ geo-replication (async) to another site
```

## 1. The storage hierarchy

| Level | Typical latency | Notes |
|---|---|---|
| CPU registers / L1 cache | ~1 ns | |
| L2/L3 cache | ~3–15 ns | |
| DRAM | ~100 ns | volatile |
| NVMe SSD | ~10–100 µs | flash over PCIe |
| SATA SSD | ~100 µs | |
| HDD | **~5–10 ms** (seek + rotation) | sequential is fast, random is slow |
| Network to another datacentre | ~1–100 ms | |
| Tape | seconds to minutes | archive, very cheap per TB |

**The key lesson:** disks are about 100,000× slower than RAM, so storage design is about **avoiding random I/O, caching, batching, and sequential writes**.

## 2. HDD vs SSD

| | HDD | SSD (NAND flash) |
|---|---|---|
| Mechanism | Spinning platters + moving head | Flash cells, no moving parts |
| Random I/O | Poor (~100–200 IOPS) | Excellent (tens to hundreds of thousands of IOPS) |
| Sequential | Good (~200 MB/s) | Very good (SATA ~550 MB/s, NVMe several GB/s) |
| Cost per TB | Low | Higher |
| Wear | Mechanical failure | **Limited write cycles** (P/E cycles) |

**SSD internals (asked by storage companies):**

- Flash is written in **pages** (~4–16 KB) but erased only in **blocks** (hundreds of pages). It can't overwrite in place.
- The **FTL (flash translation layer)** maps logical blocks to physical pages, writes updates to new pages, and marks the old ones stale.
- **Garbage collection** copies live pages out of a block so the whole block can be erased. That extra writing is **write amplification**.
- **Wear levelling** spreads writes so no block wears out early. **TRIM** tells the SSD which blocks the filesystem no longer uses.
- **Over-provisioning:** hidden spare capacity for GC and wear.
- This is why **log-structured / append-only** designs suit flash well.

**Your ECS HDD vs SSD write benchmarking** (telemetry platform): measuring write performance per media type to decide where data should land. It's a classic "use data to decide" story.

## 3. Key metrics

- **IOPS:** I/O operations per second (matters for small random I/O: databases, VMs).
- **Throughput / bandwidth:** MB/s (matters for large sequential I/O: media, backups, analytics).
- **Latency:** time per operation; watch **p99**, not just the mean.
- **Queue depth:** outstanding I/Os; more parallelism raises throughput up to a point.
- Relationship: throughput ≈ IOPS × I/O size. Little's law: concurrency = throughput × latency.

---

## 4. Block vs file vs object storage (the most asked storage question)

| | **Block** | **File (NAS)** | **Object** |
|---|---|---|---|
| Unit | Fixed-size blocks addressed by number | Files in a directory hierarchy | Objects = data + metadata + a unique key |
| Access | SCSI, iSCSI, Fibre Channel, NVMe-oF | **NFS, SMB**, (HDFS, S3 gateways) | **HTTP REST** (PUT/GET/DELETE): the S3 API |
| Namespace | None (a raw disk; you bring the filesystem) | Hierarchical paths (`/ifs/data/...`) | Flat (bucket + key; "folders" are just key prefixes) |
| Updates | Any block in place | Any byte range | Usually replace the **whole** object (no partial overwrite) |
| Sharing | One host at a time (normally) | Many clients share the files | Anyone with credentials, over the internet |
| Latency | Lowest | Low | Higher |
| Scale | Limited by the array | Petabytes (scale-out) | Effectively unlimited |
| Typical uses | Databases, VM disks, boot volumes | Home directories, shared project data, media, HPC, AI training data | Backups, archives, data lakes, logs, images/video, static websites |
| Dell | PowerStore, PowerMax | **PowerScale (OneFS)** | **ECS**, ObjectScale |
| AWS | EBS | EFS / FSx | **S3** |

**One-liner:** "Block gives you a raw disk and you bring your own filesystem. File gives you a shared POSIX filesystem many clients can mount. Object gives you an HTTP key-value store for blobs with unlimited scale but no partial updates."

**DAS / NAS / SAN:**

- **DAS:** direct-attached storage (disks inside or cabled to one server).
- **NAS:** network-attached storage; serves **files** over the network (NFS/SMB). PowerScale is a NAS.
- **SAN:** storage area network; serves **blocks** over a dedicated network (FC/iSCSI). Hosts see LUNs (logical disks).

**Scale-up vs scale-out:**

- **Scale-up:** one controller pair; add disks behind it. When the controller saturates, you've hit the ceiling.
- **Scale-out:** add **whole nodes** (CPU + RAM + disk + network), so capacity *and* performance grow together while it stays **one system**. PowerScale is scale-out.

---

## 5. Data protection: RAID, replication, erasure coding

### RAID (within a server or array)

| Level | How | Capacity | Survives | Notes |
|---|---|---|---|---|
| RAID 0 | Striping | 100% | **no** failures | speed only |
| RAID 1 | Mirroring | 50% | 1 disk (per mirror) | simple, fast reads |
| RAID 5 | Striping + 1 distributed parity | (n−1)/n | 1 disk | **write penalty** (read-modify-write parity); long rebuilds on big disks are risky |
| RAID 6 | Two parities | (n−2)/n | 2 disks | safer for large disks |
| RAID 10 | Mirrors, then striped | 50% | 1 per mirror pair | fast + safe; databases |

**Parity** = XOR of the data blocks; any one missing block can be recomputed by XOR-ing the rest.
**Rebuild risk:** with multi-TB disks, rebuilds take hours or days, and a second failure (or an unrecoverable read error) during the rebuild loses data. That's a reason for RAID 6 and erasure coding.

### Replication
Store N full copies (e.g. 3× in HDFS and many distributed stores). Simple, fast reads and fast recovery, but **300% raw storage for 100% data**.

### Erasure coding (EC): what modern scale-out systems use

- Split data into **k data fragments**, compute **m parity fragments** (Reed–Solomon codes); store all **k+m** on different disks/nodes. **Any k fragments** reconstruct the data.
- Example 10+4: survives any 4 failures with only **1.4× overhead** (vs 3× for triple replication).
- **Trade-off:** less storage overhead, but **more CPU and network for encoding and rebuilds**, and small writes are expensive. Hot or small data is often replicated; cold or large data is erasure coded.
- **OneFS** protects data with Reed–Solomon-based erasure coding (FlexProtect) across **nodes**, with protection levels like **N+2 or "+2d:1n"** (survive 2 drive failures or 1 node failure). Mirroring is also available for small files. Protection is configurable per file or directory via **SmartPools** policies.

### Durability vs availability

- **Durability:** the data isn't lost (e.g. S3 is designed for 11 nines of durability).
- **Availability:** you can access it right now. A system can be durable but temporarily unavailable.

### Data integrity

- **Silent data corruption (bit rot)** happens. Store **checksums** per block, verify them on read, and run background **scrubbing** to detect and repair corruption from redundancy (ZFS, OneFS integrity scans, object stores).
- **End-to-end checksums** from the client through to the disk catch corruption in transit too.

---

## 6. File system internals (review file 06, plus this)

- **Inodes** (metadata + block pointers), **directories** (name → inode maps), **extents** (contiguous ranges instead of block-by-block pointers: less metadata for big files).
- **Free-space management:** bitmaps or B-trees.
- **Journaling:** a write-ahead log of metadata (or data) changes for fast crash recovery.
- **Copy-on-write (ZFS, btrfs, NetApp WAFL):** never overwrite live blocks. Write new blocks and atomically update pointers up the tree. Benefits: always consistent on disk, cheap snapshots, checksums. Cost: fragmentation.
- **Log-structured filesystems:** all writes are appended sequentially (great for flash and for writes); they need cleaning/GC.
- **Metadata performance** matters as much as data: "millions of small files" workloads (AI datasets, genomics) stress metadata. Directory operations, `ls` on huge directories and `stat` storms are classic NAS pain points.
- **POSIX semantics:** consistency, locking (`flock`, NFS locks), atomic rename. Object stores **don't** give you atomic rename or append, which is why "S3 as a filesystem" causes surprises.

---

## 7. Snapshots, clones, replication, backup

### Snapshots (point-in-time copies)

- **Copy-on-write snapshot:** when a block is about to be overwritten, copy the **old** block into the snapshot area first. Extra write on the first overwrite.
- **Redirect-on-write:** write new data to a **new** location and leave the old block for the snapshot. No extra copy (ZFS, WAFL, many modern systems).
- Snapshots are nearly instant and space-efficient (only changed blocks use space), but **a snapshot is not a backup**: it lives on the same system, so losing the system loses the snapshots too.
- OneFS: **SnapshotIQ** (scheduled snapshots per directory).

### Clones
A writable snapshot (fast VM or dev/test copies that share unchanged blocks).

### Replication

- **Synchronous:** the write is acknowledged only after **both** sites have it. **RPO = 0**, but latency includes the round trip, so it's limited by distance (~100 km).
- **Asynchronous:** acknowledge locally, ship changes later. Some data loss is possible (RPO > 0), but it works at any distance. OneFS **SyncIQ** is asynchronous replication between clusters.
- **RPO** (recovery point objective): how much data you can afford to lose. **RTO** (recovery time objective): how long recovery may take.

### Backup

- **3-2-1 rule:** 3 copies, on 2 different media, 1 off-site. Modern versions add an **immutable/air-gapped** copy (3-2-1-1-0) against ransomware.
- Full vs incremental vs differential backups.
- **WORM / object lock / immutability:** data that can't be changed or deleted until a retention date (compliance; ransomware protection). OneFS **SmartLock**, S3 **Object Lock**.

---

## 8. Efficiency: dedup, compression, thin provisioning, tiering

- **Deduplication:** store identical chunks once. Split data into chunks (**fixed-size**, or **variable-size/content-defined** using rolling hashes, which handles inserted bytes better), fingerprint them (e.g. SHA-256), keep a fingerprint index → reference counts. **Inline** (before writing; saves I/O, costs CPU/latency) vs **post-process** (later). Great for backups and VMs.
- **Compression:** LZ4 (fast), Zstd (balanced), gzip (slower). Compress before dedup? Usually dedup first, because compression changes the bytes.
- **Thin provisioning:** present more logical capacity than physically exists; allocate on write. Risk: running out if everyone fills up (needs monitoring and alerts).
- **Tiering:** move data between fast/expensive and slow/cheap media based on policy or access patterns (hot → SSD, cold → HDD, archive → cloud/object). OneFS **SmartPools** (file pool policies); S3 storage classes + lifecycle rules.
- **Caching:** read cache (DRAM/SSD), **write-back cache** (fast, needs battery/NVRAM protection, so writes aren't lost on power failure; NetApp NVRAM is the classic example) vs **write-through** (safe, slower).

---

## 9. Object storage deep dive (S3 and Dell ECS)

### The S3 model

- **Buckets** (containers) + **objects** (key → bytes + metadata). Flat namespace; `logs/2026/11/20/x.parquet` is just a key with slashes, and "folders" are a UI illusion over prefixes.
- **API:** `PUT`, `GET` (with byte **range** reads), `DELETE`, `HEAD`, `LIST` (paginated, by prefix).
- **Multipart upload:** upload large objects in parallel parts (5 MB minimum per part except the last), retry failed parts, then "complete". Needed for very large objects (a single PUT is limited to 5 GB; the maximum object size has long been 5 TB. AWS raises limits over time, so check the current docs before quoting exact numbers).
- **Consistency:** AWS S3 has offered **strong read-after-write consistency** for all PUTs and DELETEs since **December 2020**. (Older material says "eventual consistency": know the update.) Other S3-compatible systems may differ, so check.
- **Versioning:** keep old versions; protects against overwrites and deletes. **Object Lock** for WORM.
- **Lifecycle rules:** transition to cheaper classes (Standard → Infrequent Access → Glacier) or expire after N days.
- **Storage classes:** trade retrieval cost and latency for storage price.
- **Pre-signed URLs:** time-limited URLs that let a client upload or download directly without your credentials: the standard design for "users upload files" (the client uploads straight to S3; your server never proxies the bytes).
- **Security:** IAM policies, bucket policies, block public access, server-side encryption (SSE-S3, SSE-KMS), TLS in transit.
- **Performance:** scales per **prefix**; parallelise requests and use range GETs for big objects.

### Dell ECS (Elastic Cloud Storage), your telemetry destination

- Dell's **software-defined object storage** platform, **S3-compatible** (plus other APIs). On-premises or hybrid. Erasure coding within a site + **geo-replication** across sites. Now part of the ObjectScale line.
- You accessed it with S3-compatible clients and tools like **S3 Browser**.
- **Note:** in the AWS world "ECS" means **Elastic Container Service** (containers). On your resume ECS = **Dell's object store**. Clarify this if an interviewer seems confused.

### Why object storage for the Parquet files (your design reasoning)
> "Parquet output files were large, immutable once written, and read by analytics later. Object storage is cheap, scales without limits, is accessed over HTTP from anywhere, and has erasure-coded durability. Putting large binaries in a database would wreck its backups, replication and cache. So the pattern was: **blob in object storage, metadata + pointer in a searchable index (Elasticsearch), event on a topic (Kafka)**."

---

## 10. PowerScale OneFS: what to say about your platform

**What it is:** Dell's **scale-out NAS** (formerly Isilon). Hardware nodes (PowerScale) + the **OneFS** distributed operating system. 3 to hundreds of nodes appear as **one cluster, one filesystem (`/ifs`), one namespace**. Used for unstructured data at petabyte scale: AI/ML datasets, media, genomics, medical imaging, backups.

**What makes it a *distributed* OS:**

| Single-machine OS | OneFS |
|---|---|
| Local filesystem | Distributed filesystem: files **striped across nodes** with erasure-coded protection |
| Config in `/etc` | **GConfig**: a cluster-wide configuration store kept consistent across nodes |
| Local scheduler | **Job Engine** (`isi_job_d`): cluster-wide background jobs (rebalance after adding a node, protection repair after a drive fails, tree deletes, integrity scans) |
| Local locks | **Distributed locking**; some services run only on a **lock-holder** node (leader-election style), e.g. the telemetry daemon |
| One management endpoint | **PAPI** (platform REST API, versioned per endpoint, e.g. `/platform/25/...`); the `isi` CLI is a thin client over it |

**Protocols served:** NFS, SMB, HDFS, S3, HTTP/FTP. **Features:** SmartPools (tiering), SmartQuotas, SnapshotIQ, SyncIQ (async replication), SmartLock (WORM), access zones (multi-tenancy), CELOG (cluster event log/alerting).

**Why FreeBSD:** the permissive BSD licence lets Dell ship a heavily modified proprietary OS; plus the integrated kernel/userland and a mature network stack and VFS. Historically, Isilon chose it in the early 2000s.

**Adding a node:** capacity and throughput go up; the Job Engine **rebalances** data across nodes in the background; clients see the same single namespace with no remount.

**Losing a drive or node:** reads reconstruct the missing data from erasure-code fragments; a background job re-protects the data onto remaining capacity; CELOG raises events/alerts.

---

## 11. Distributed storage design patterns (for HLD rounds)

- **Data placement:** consistent hashing (Dynamo, Cassandra), placement algorithms like **CRUSH** (Ceph: computes locations from a cluster map, so there's no central lookup table), or a central metadata service (HDFS NameNode, GFS master).
- **Metadata vs data separation:** a metadata service (namespace, which blocks are where) plus data servers (the bytes). The metadata service is the scaling bottleneck and single point of failure unless it's replicated (HA NameNode, Raft-replicated metadata).
- **GFS/HDFS:** large chunks (64–128 MB), 3× replication, a single master holding metadata in memory, an append-friendly design, data locality for MapReduce.
- **Ceph:** RADOS object store underneath; block (RBD), file (CephFS) and object (RGW) on top; CRUSH placement.
- **Storage engines:**
  - **B-tree:** update in place; good reads, random writes (InnoDB, PostgreSQL).
  - **LSM tree:** write to an in-memory **memtable** + a WAL → flush as sorted immutable **SSTables** → background **compaction**. Excellent write throughput and sequential I/O; reads may check several files (**Bloom filters** help). Used by RocksDB, LevelDB, Cassandra, HBase, ScyllaDB.
  - Trade-off triangle: **read amplification vs write amplification vs space amplification**.
- **Quorums:** with N replicas, write to W and read from R; **R + W > N** means reads overlap the latest write (Dynamo-style). See file 12.

## 11b. More storage fundamentals (basics → advanced)

### HDD anatomy and a latency calculation
```
Platters (spinning) ─ tracks (circles) ─ sectors (512 B / 4 KB "Advanced Format")
Cylinder = the same track across all platters; one read/write head per surface on an actuator arm
```

Access time = **seek** (move the arm: ~4–9 ms) + **rotational latency** (wait for the sector: half a rotation on average) + **transfer**.
At 7,200 RPM: 1 rotation = 8.33 ms → average rotational latency = **4.17 ms**. With a 5 ms seek, one random 4 KB read ≈ 9.2 ms → about **110 IOPS**. That's why one HDD does about 100–200 random IOPS but ~200 MB/s sequentially. **Short stroking**, **caching** and **sequential layouts** all exist because of this.

### SSD cell types and interfaces

| NAND type | Bits/cell | Endurance | Cost | Use |
|---|---|---|---|---|
| SLC | 1 | highest | highest | caches, enterprise write-heavy |
| MLC | 2 | high | | |
| TLC | 3 | medium | | mainstream |
| QLC | 4 | lower | lowest | read-heavy, capacity tiers |

**Endurance** is measured in **DWPD** (drive writes per day) or **TBW** (terabytes written).
**Interfaces:** **SATA** (consumer, ~550 MB/s, one queue), **SAS** (enterprise, dual-port for controller failover, more reliable), **NVMe over PCIe** (many deep queues: up to 64K queues × 64K commands; microsecond latency; several GB/s). **NVMe-oF** extends NVMe over the network.
**Form factors:** 2.5", M.2, U.2/U.3, EDSFF.

### RAID: the parity maths and usable capacity
```
Data blocks on 3 disks:  D1 = 1010   D2 = 0110   D3 = 1100
Parity P = D1 ⊕ D2 ⊕ D3 = 0000          (XOR)
Disk 2 fails → D2 = D1 ⊕ D3 ⊕ P = 1010 ⊕ 1100 ⊕ 0000 = 0110  ✓ rebuilt
```

**Usable capacity with N disks of size S:** RAID 0 = N·S; RAID 1 = S (2-disk mirror); RAID 5 = (N−1)·S; RAID 6 = (N−2)·S; RAID 10 = N·S/2.
Example: 6 × 4 TB → RAID 5 = 20 TB, RAID 6 = 16 TB, RAID 10 = 12 TB.
**RAID 5 write penalty = 4 I/Os** per small random write (read old data, read old parity, write new data, write new parity); RAID 6 = 6; RAID 10 = 2.
**Hardware vs software RAID** (mdadm, ZFS RAID-Z). **Hot spares** start rebuilds automatically.

### Erasure coding numbers

| Scheme | Overhead | Tolerates | Note |
|---|---|---|---|
| 3× replication | 200% extra (3.0×) | 2 failures | fast reads/repair |
| RS 4+2 | 50% (1.5×) | 2 failures | |
| RS 10+4 | 40% (1.4×) | 4 failures | common in large object stores |
| RS 17+3 | ~18% | 3 failures | very efficient; slow, heavy rebuilds |

**Repair cost:** rebuilding one lost fragment in k+m EC reads **k** fragments (network-heavy) vs reading 1 copy with replication. **Locally repairable codes (LRC)** reduce this (Azure Storage uses them).

### Logical volumes, LUNs and multipathing (SAN side)

- **LUN** (logical unit number): a block volume exported by a SAN array to hosts.
- **Zoning** (on the Fibre Channel switch) and **LUN masking** (on the array) control which hosts see which LUNs.
- **Multipathing** (Linux `dm-multipath`): several physical paths to the same LUN for failover and load balancing.
- **iSCSI terms:** initiator (host), target (array), IQN names, CHAP authentication.
- **LVM** on the host: PV → VG → LV (resizable volumes, snapshots).

### File systems compared

| FS | Highlights |
|---|---|
| ext4 | Default on many Linux distros; journaling; extents; mature |
| XFS | High performance for large files and parallel I/O; RHEL default; scales well |
| **ZFS** | COW, end-to-end checksums, snapshots/clones, RAID-Z, compression, dedup, send/receive replication; native on FreeBSD |
| btrfs | COW, snapshots, subvolumes, checksums (Linux) |
| NTFS | Windows; journaling; ACLs |
| **OneFS** | Distributed, clustered: one namespace across nodes, erasure coding across nodes |
| GPFS/Spectrum Scale, Lustre | Parallel filesystems for HPC |
| HDFS | Distributed, append-oriented, for Hadoop |

### NFS and SMB in more depth (PowerScale serves both)

- **NFSv3:** stateless server (simpler failover), UDP or TCP, separate lock protocol (NLM), auth by UID/GID (AUTH_SYS).
- **NFSv4/4.1:** stateful, TCP only, one port (2049), built-in locking with leases, **Kerberos** security, ACLs, compound operations, **pNFS** (parallel access to data servers).
- Client mount options: `rsize/wsize` (I/O size), `hard` vs `soft` (soft can return errors → data corruption risk for writes), `timeo`, `vers=4.1`.
- **SMB (Windows file sharing):** SMB2/3 (SMB1 is insecure: disable it), encryption and signing in SMB3, **multichannel** (several NICs), integration with **Active Directory** for authentication and ACLs.
- **Multi-protocol access** (the same file over NFS and SMB) is hard: permission models differ (POSIX mode bits vs Windows ACLs), so NAS systems map identities between them. OneFS handles this in access zones.

### Hyperconverged infrastructure (HCI) and software-defined storage (SDS)

- **SDS:** storage features delivered by software on commodity servers instead of proprietary arrays (Ceph, vSAN, MinIO, ObjectScale).
- **HCI:** compute + storage + virtualisation in each node, scaled by adding nodes (Nutanix, VMware vSAN, Dell VxRail). A frequent interview topic at Nutanix and VMware.
- **Ceph architecture:** **RADOS** (a reliable object store across **OSDs**, one per disk) + **monitors** (cluster map, via Paxos) + **CRUSH** (clients compute data placement themselves; no central lookup) → RBD (block), CephFS (file, with metadata servers), RGW (S3-compatible object gateway).

### Storage QoS and multi-tenancy
IOPS/bandwidth limits per volume or tenant; noisy-neighbour protection; priority classes; quotas (OneFS SmartQuotas: hard, soft and advisory limits per directory/user/group).

### Measuring storage performance (`fio`)
```bash
# 4K random reads, queue depth 32, 4 jobs, 60 s, bypassing the page cache
fio --name=randread --filename=/data/testfile --size=10G --rw=randread --bs=4k \
    --iodepth=32 --numjobs=4 --direct=1 --runtime=60 --time_based --group_reporting
# Sequential write throughput
fio --name=seqwrite --filename=/data/testfile --size=10G --rw=write --bs=1M --iodepth=8 --direct=1
```

Look at IOPS, bandwidth and **latency percentiles (clat p99)**. Use `--direct=1` to avoid measuring RAM. Compare media types the way you compared ECS HDD vs SSD writes.

### Data reduction ratio and capacity planning
Data reduction ratio = logical data ÷ physical space used (dedup × compression; e.g. 3:1 for VMs, much lower for already-compressed media). **Capacity planning:** usable capacity after protection overhead, headroom (don't run arrays above ~80–85% full: performance drops, rebuilds need space), growth rate, snapshot overhead.

### Backup types visualised
```
Full (Sunday) │███████████│
Incremental:  Mon│▓│ Tue│▓│ Wed│▓│        restore = full + every incremental since → slow restore, small backups
Differential: Mon│▓│ Tue│▓▓│ Wed│▓▓▓│      restore = full + the latest differential → faster restore, bigger backups
Synthetic full: build a new full on the backup server from the full + incrementals (no load on production)
CDP (continuous data protection): journal every write → restore to any point in time
```

### Data lifecycle
Hot (frequently accessed: SSD) → warm → cold (HDD/object) → archive (tape/Glacier) → delete per retention policy. Driven by policies (SmartPools, S3 lifecycle rules, Elasticsearch ILM). Legal hold and compliance (WORM) can override deletion.

## 11c. Storage course map, and S3 / ECS hands-on
```
Media: HDD anatomy & latency · SSD (NAND types, FTL, GC, wear, TRIM) · NVMe/SAS/SATA · tape
Metrics: IOPS · throughput · latency percentiles · queue depth · benchmarking (fio)
Access models: block (SAN, iSCSI, FC, LUNs, multipath) · file (NAS, NFS, SMB) · object (S3, ECS)
Protection: RAID (0/1/5/6/10) · replication · erasure coding · checksums & scrubbing
File systems: inodes · journaling · COW · extents · ext4/XFS/ZFS/btrfs · distributed (OneFS, HDFS, CephFS, GPFS)
Data services: snapshots · clones · replication (sync/async) · backup & restore · dedup · compression · thin provisioning · tiering · QoS · quotas · WORM
Distributed storage: placement (hashing, CRUSH) · metadata services · LSM vs B-tree · HCI/SDS · Ceph
Object storage: buckets/keys · API · consistency · multipart · versioning · lifecycle · storage classes · security · S3 CLI · Dell ECS
Your platforms: PowerScale OneFS · Dell ECS
```

### S3 hands-on (AWS CLI; works against S3-compatible stores like ECS via `--endpoint-url`)
```bash
aws s3 mb s3://telemetry-parquet                               # make a bucket
aws s3 cp out.parquet s3://telemetry-parquet/2026/11/21/       # upload
aws s3 sync ./reports s3://telemetry-parquet/reports/          # sync a folder (only changed files)
aws s3 ls s3://telemetry-parquet/2026/ --recursive --human-readable
aws s3 presign s3://telemetry-parquet/2026/11/21/out.parquet --expires-in 3600   # a 1-hour download link
aws s3api put-bucket-versioning --bucket telemetry-parquet --versioning-configuration Status=Enabled
aws s3api head-object --bucket telemetry-parquet --key 2026/11/21/out.parquet  # metadata only
aws --endpoint-url https://ecs.example.local:9021 s3 ls                        # the same commands against Dell ECS
```
```python
import boto3
s3 = boto3.client("s3")   # for ECS: boto3.client("s3", endpoint_url="https://ecs…:9021", aws_access_key_id=…, aws_secret_access_key=…)
s3.upload_file("out.parquet", "telemetry-parquet", "2026/11/21/out.parquet")     # automatic multipart for big files
obj = s3.get_object(Bucket="telemetry-parquet", Key="2026/11/21/out.parquet", Range="bytes=0-1023")  # ranged read
paginator = s3.get_paginator("list_objects_v2")
for page in paginator.paginate(Bucket="telemetry-parquet", Prefix="2026/11/"):
    for o in page.get("Contents", []): print(o["Key"], o["Size"])
url = s3.generate_presigned_url("put_object", Params={"Bucket": "b", "Key": "upload.bin"}, ExpiresIn=600)  # client uploads directly
```

**Bucket policy (JSON) example: read-only access for one role:**

```json
{ "Version": "2012-10-17",
  "Statement": [{ "Effect": "Allow",
                  "Principal": { "AWS": "arn:aws:iam::123456789012:role/analytics" },
                  "Action": ["s3:GetObject", "s3:ListBucket"],
                  "Resource": ["arn:aws:s3:::telemetry-parquet", "arn:aws:s3:::telemetry-parquet/*"] }] }
```

**Lifecycle rule:** move objects under `raw/` to an infrequent-access class after 30 days and delete them after 365. **Event notifications:** "object created" → a queue/function, the trigger for many processing pipelines.

### Dell ECS concepts (object storage you used)

| ECS concept | Meaning |
|---|---|
| **Virtual Data Center (VDC)** | an ECS site/cluster of nodes |
| **Storage pool** | a group of nodes and disks within a VDC |
| **Replication group** | which storage pools (possibly across VDCs/sites) hold copies of the data: controls geo-protection |
| **Namespace** | a tenant boundary (users, quotas, buckets per tenant) |
| **Bucket** | a container for objects, created in a namespace and bound to a replication group |
| **Object users** | S3 access keys / secret keys for applications (what tools like S3 Browser use) |

Data is chunked and erasure-coded inside a site, and replicated asynchronously across sites for geo-protection. It's accessed with the S3 API (plus other protocols). Exact port numbers and settings depend on the deployment, so check your environment's configuration.

## 12. Classic storage interview questions

1. Block vs file vs object, and when to use each.
2. RAID 5 vs RAID 6 vs RAID 10; the RAID 5 write penalty; rebuild risk on large disks.
3. Replication vs erasure coding: overhead, rebuild cost, latency.
4. How do snapshots work (COW vs redirect-on-write)? Why aren't snapshots backups?
5. How does deduplication work? Fixed vs variable chunking? Inline vs post-process?
6. What is write amplification in SSDs? Why does it matter for databases?
7. How does `fsync` relate to durability? What happens on power loss?
8. Design a distributed file system / object store (see file 14).
9. How would you detect and fix silent data corruption? (checksums + scrubbing + redundancy)
10. Synchronous vs asynchronous replication; RPO and RTO.
11. Why is listing millions of objects slow? (paginated LIST; design key prefixes; keep a separate index such as your Elasticsearch metadata)
12. Why is the metadata server the bottleneck in distributed filesystems?

## Your storage story in 30 seconds
> "I've worked on both ends of the storage taxonomy. On the telemetry platform I wrote Parquet output to Dell ECS, an S3-compatible object store, with the metadata indexed in Elasticsearch. On PowerScale OneFS I worked inside a scale-out NAS operating system where data is striped across nodes with erasure-coded protection, configuration lives in a cluster-wide store, and features like licensing have to be consistent on every node. So I understand both how object storage scales by giving up POSIX semantics, and how a distributed filesystem keeps POSIX semantics across a cluster."

## Quick revision

- Latency hierarchy; HDD vs SSD; FTL, GC, write amplification, wear levelling, TRIM.
- IOPS vs throughput vs latency (p99).
- Block (SAN, iSCSI/FC) vs file (NAS, NFS/SMB) vs object (S3/ECS, HTTP).
- RAID 0/1/5/6/10; replication 3× vs erasure coding k+m (OneFS +2d:1n).
- Checksums + scrubbing; COW/ROW snapshots; sync vs async replication; RPO/RTO; 3-2-1 + immutability.
- Dedup (chunking + fingerprints), compression, thin provisioning, tiering (SmartPools), write-back cache with NVRAM.
- S3: flat keys, multipart, strong consistency since Dec 2020, versioning, lifecycle, pre-signed URLs. Dell ECS = S3-compatible object store (not AWS ECS).
- OneFS: /ifs single namespace, striping + EC, GConfig, Job Engine, PAPI, SyncIQ, SnapshotIQ, SmartPools, FreeBSD (licence).
- B-tree vs LSM tree; metadata vs data separation; CRUSH; quorums.

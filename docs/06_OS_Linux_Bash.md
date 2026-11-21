# 06 · Operating Systems, Linux, and Bash

**Why an OS exists:** hardware is shared, dangerous and complicated. The OS **multiplexes** the CPU, memory and devices among programs, **isolates** them from each other, and gives them simple **abstractions**: processes instead of CPUs, virtual memory instead of RAM, files instead of disk blocks, sockets instead of network cards.

**Why it's your strength:** you worked *inside* an OS. OneFS is a FreeBSD-based **distributed operating system** that turns many nodes into one filesystem. Storage companies (NetApp, Pure, Nutanix, Dell, IBM, VMware) ask OS questions deeply. Use your OneFS context in answers.

---

# Part A: OS concepts

## Start here: operating systems in plain words

**What an OS is:** the **manager** between your programs and the hardware. Programs don't touch the CPU, memory or disk directly; they ask the OS.
**Restaurant analogy:**

| Restaurant | Computer |
|---|---|
| The building, the stoves, the fridge | hardware (CPU, RAM, disk, network card) |
| The **manager** who decides which cook uses which stove when, and keeps cooks from fighting | the **OS kernel** |
| Cooks | **processes/threads** |
| Order slips handed to the manager ("I need a stove") | **system calls** |
| Each cook's own workstation, labelled 1, 2, 3 (they think it's the whole kitchen) | **virtual memory** |
| The pantry with labelled shelves | the **file system** |
| The manager's rule: nobody walks into the fridge room alone | **protection / kernel mode** |

### OS architecture
```
 ┌───────────────────────────────────────────────────────────────┐
 │ USER SPACE   apps (browser, python, nginx)   shell (bash)     │
 │              libraries (libc: printf, malloc, fopen …)        │
 ├──────────────────── system call interface ────────────────────┤  ← read(), write(), fork(), mmap()…
 │ KERNEL SPACE                                                  │
 │   Process scheduler · Memory manager (paging, virtual memory) │
 │   VFS + file systems (ext4, XFS, ZFS, NFS client)             │
 │   Network stack (TCP/IP, sockets) · IPC · Security            │
 │   Device drivers (disk, NIC, GPU) · Interrupt handling        │
 ├───────────────────────────────────────────────────────────────┤
 │ HARDWARE   CPU cores · RAM · disks/SSDs · network cards       │
 └───────────────────────────────────────────────────────────────┘
```

### The core ideas in plain words

- **Process** = a running program with its own private memory (like a separate kitchen). **Thread** = a worker inside that process; threads share the kitchen (memory) and work in parallel.
- **Scheduling** = the manager deciding which worker gets a stove (CPU core) and for how long. Switching workers (a **context switch**) costs time, because they must save and restore their workstation.
- **Virtual memory** = every process believes it has a huge private memory starting at address 0. The OS secretly maps these "fake" addresses to real RAM pages (and to disk when RAM is full). Like hotel room numbers: guests use "room 101", and the hotel decides which physical room that is.

```
 Process A's view           Page table A          Physical RAM
 0x0000 page 0  ─────────►  page 0 → frame 7  ──► [frame 7: A's code]
 0x1000 page 1  ─────────►  page 1 → frame 2  ──► [frame 2: A's data]
 Process B's view           Page table B
 0x0000 page 0  ─────────►  page 0 → frame 4  ──► [frame 4: B's code]   (same "address", different real memory)
```

- **File system** = how the OS organises bytes on disk into files and folders, tracking where each file's blocks are (inodes).
- **System call** = a polite request to the kernel ("please read 4 KB from this file"); the CPU switches to kernel mode, the kernel does it, then switches back.
- **Interrupt** = a doorbell: hardware tells the CPU "I'm done" (disk finished, packet arrived), instead of the CPU repeatedly checking.
- **Deadlock** = two cars meet on a one-lane bridge and neither will reverse.

## 0. OS basics

**Functions of an OS:** process management, memory management, file system management, device (I/O) management, security and protection, networking, and the user interface (shell/GUI).

**Types of operating systems:**

| Type | Idea | Example |
|---|---|---|
| Batch | Jobs run in groups with no interaction | old mainframes |
| Multiprogramming | Several programs in memory; the CPU switches when one waits for I/O | foundation of modern OSes |
| **Time-sharing / multitasking** | Rapid switching gives each user/program the illusion of its own CPU | Linux, Windows, macOS |
| **Real-time (RTOS)** | Guaranteed deadlines (hard/soft real-time) | car ECUs, medical devices, FreeRTOS |
| Distributed | Many machines appear as one system | **OneFS** for its cluster, Plan 9 |
| Embedded | Small, dedicated | routers, IoT |
| Network OS | Built around sharing resources over a network | |

**OS structures:** monolithic (everything in kernel space: Linux, FreeBSD; with **loadable kernel modules**), layered, **microkernel** (minimal kernel; services as user processes: QNX, Minix, seL4), **hybrid** (Windows NT, macOS XNU), exokernel/unikernel (research/specialised).

**System call types:** process control (`fork`, `exec`, `exit`, `wait`), file management (`open`, `read`, `write`, `close`), device management (`ioctl`), information (`getpid`, `time`), communication (`pipe`, `socket`, `shmget`), protection (`chmod`, `setuid`). The C library (glibc) wraps them; `strace` shows them.

**Dual mode and protection rings:** x86 has rings 0–3; kernel in ring 0, user programs in ring 3. Privileged instructions (I/O, page tables, halting) only work in kernel mode.

**Virtualisation:** a hypervisor runs multiple OSes. **Type 1** (bare metal: VMware ESXi, Xen, KVM, Hyper-V) vs **Type 2** (hosted: VirtualBox, VMware Workstation). Hardware support (Intel VT-x/AMD-V, EPT for memory). Containers instead share one kernel (file 16). *(You onboarded VMware ESXi logs on the telemetry platform: ESXi is a type-1 hypervisor.)*

## 1. Kernel, user space, system calls

- **Kernel mode:** full hardware access. **User mode:** restricted; a bad pointer only crashes your process, not the machine.
- **System call:** the controlled door from user to kernel (`read`, `write`, `open`, `fork`, `mmap`, `socket`). The CPU switches mode via a trap instruction, which costs roughly hundreds of nanoseconds, so batching I/O matters.
- **Interrupts:** hardware signals the CPU (a disk finished, a packet arrived, a timer tick). The timer interrupt is what lets the scheduler preempt processes.
- **Monolithic kernel** (Linux, FreeBSD: drivers and filesystems in the kernel; fast) vs **microkernel** (minimal kernel, services in user space; more isolated but slower; QNX, Minix).

## 2. Process vs thread

| | Process | Thread |
|---|---|---|
| Memory | Own address space | Shares the process's address space (heap, globals, code) |
| Owns | PID, page tables, file descriptors, signal handlers | Own stack, registers, program counter, thread ID |
| Creation cost | High (`fork`) | Low |
| Communication | IPC (pipes, sockets, shared memory) | Shared memory directly (needs synchronisation) |
| Crash impact | Isolated | One thread's crash can kill the whole process |
| Context switch | Expensive (switch page tables, flush TLB) | Cheaper (same address space) |

**PCB (process control block):** the kernel's record of a process: PID, state, registers, memory maps, open files, priority.

**Process states:** New → Ready → Running → (Waiting/Blocked on I/O) → Ready … → Terminated.

**Context switch:** save the current registers and PC to the PCB, load the next process's. Pure overhead, so too many runnable threads causes thrashing.

## 3. fork, exec, wait, zombies, orphans

```c
pid_t pid = fork();            // duplicates the process; returns 0 in the child, the child's PID in the parent
if (pid == 0) { execvp("ls", args); }   // replace the child's program image
else { waitpid(pid, &status, 0); }      // parent collects the exit status
```

- **Copy-on-write (COW):** `fork` doesn't copy memory immediately. Parent and child share pages marked read-only, and a page is copied only when someone writes to it. That's why fork + exec is cheap.
- **Zombie:** the child has exited but the parent hasn't called `wait()`, so its process-table entry lingers (`Z` state in `ps`). Fix: the parent reaps it (or handles `SIGCHLD`).
- **Orphan:** the parent died first, so the child is re-parented to `init`/`systemd` (PID 1), which reaps it.
- **Daemon:** a background process detached from the terminal (OneFS daemons like `isi_telemetry_d`, `isi_job_d`).

## 4. CPU scheduling

| Algorithm | Idea | Problem |
|---|---|---|
| FCFS | First come, first served | Convoy effect (short jobs wait behind long ones) |
| SJF / SRTF | Shortest job first | Needs job lengths in advance; starves long jobs |
| Round Robin | Fixed time slice, rotate | The slice size trades responsiveness against switch overhead |
| Priority | Highest priority first | **Starvation** → fix with **aging** |
| MLFQ | Several queues; interactive jobs stay high priority | Complex tuning |
| Linux CFS | "Completely Fair Scheduler": a red-black tree keyed by virtual runtime; run the task that has had the least CPU | Replaced by **EEVDF** in Linux 6.6 (2023), which adds latency fairness |

**Preemptive** (the OS can interrupt a running task) vs **non-preemptive**. **Throughput vs latency** is the core trade-off.
**`nice` values** (−20 to 19) adjust priority on Linux.

## 5. Inter-process communication (IPC)

| Mechanism | Notes |
|---|---|
| Pipe (`|`) | One-way, parent↔child, byte stream |
| Named pipe (FIFO) | Pipe with a filesystem name; unrelated processes |
| Message queue | Structured messages, kernel-managed |
| Shared memory | **Fastest** (no copying), but you must synchronise yourself (semaphores) |
| Sockets | Unix domain sockets (same host, fast) or TCP/UDP (across hosts) |
| Signals | Async notifications (`SIGTERM`, `SIGKILL`, `SIGINT`, `SIGCHLD`, `SIGSEGV`) |
| Memory-mapped files (`mmap`) | Map a file into memory; share between processes |

**OneFS example:** the `isi` CLI talks to PAPI over a **local Unix domain socket**, not the network: same host, faster, no TCP stack, and permission-controlled by file permissions.

**Signals to know:** `SIGTERM` (15, polite; can be caught for graceful shutdown), `SIGKILL` (9, can't be caught or ignored), `SIGINT` (Ctrl+C), `SIGHUP` (often "reload config"), `SIGSTOP`/`SIGCONT`, `SIGSEGV` (bad memory access). Kubernetes sends SIGTERM, waits the grace period (30 s default), then SIGKILL.

## 6. Synchronisation and deadlock

(Locks, semaphores and condition variables are covered in depth in [07_Multithreading_Concurrency.md](07_Multithreading_Concurrency.md).)

**Deadlock: the four Coffman conditions (all four must hold):**

1. **Mutual exclusion:** the resource can't be shared.
2. **Hold and wait:** holding one resource while waiting for another.
3. **No preemption:** resources can't be forcibly taken.
4. **Circular wait:** A waits for B, B waits for A.

**Handling:**

- **Prevention:** break one condition. Most practical: a **global lock ordering** (always lock A before B) breaks circular wait. Or acquire everything at once, or use try-lock with timeout and back off.
- **Avoidance:** the Banker's algorithm (only grant if the system stays in a safe state). Theoretical; rarely used in practice.
- **Detection + recovery:** build a wait-for graph, find a cycle, kill or roll back a victim (databases do this).
- **Ignore it** (the "ostrich algorithm"): what most general-purpose OSes do for user locks.

**Livelock:** threads keep reacting to each other and make no progress (two people stepping aside in a corridor). **Starvation:** a thread never gets the resource.

## 7. Memory management (very commonly asked)

### Virtual memory
Each process sees its own large, contiguous **virtual address space**. The MMU (memory management unit) translates virtual → physical addresses using **page tables**.
**Why:** isolation (processes can't see each other's memory), simplicity (every program thinks it starts at the same address), overcommit (use more than physical RAM, with disk as backing), and sharing (shared libraries mapped into many processes).

### Paging

- Memory is divided into fixed-size **pages** (usually 4 KB; huge pages are 2 MB/1 GB) and physical **frames**.
- **Page table:** maps virtual page number → physical frame + flags (present, dirty, accessed, read/write/execute). Multi-level (4-level on x86-64) to save space.
- **TLB (translation lookaside buffer):** a CPU cache of recent translations. A TLB miss means walking the page tables (slow). Context switches between processes can flush the TLB, which is part of why process switches cost more than thread switches.
- **Page fault:** access to a page that isn't in RAM → the kernel loads it from disk (a major fault) or maps it (a minor fault). **Demand paging:** pages load only when first touched.
- **Page replacement** when RAM is full: FIFO (suffers Belady's anomaly), **LRU** (good but expensive to track exactly), **Clock / second chance** (an LRU approximation used in practice), Optimal (theoretical).
- **Thrashing:** the working set doesn't fit in RAM, so the system spends all its time paging. Fix: more RAM, fewer processes, smaller working set.
- **Fragmentation:** internal (wasted space inside a page or block) vs external (free memory split into small unusable holes; paging avoids external fragmentation).
- **Segmentation:** variable-size logical segments (code, stack, heap). Mostly replaced by paging on modern systems.

### Linux memory in practice

- `free -h`: "available" matters more than "free". Linux uses spare RAM as **page cache** (cached file data), which is good, not a leak.
- **Swap:** disk used as overflow memory. Heavy swapping means terrible latency.
- **OOM killer:** when memory is exhausted, the kernel kills a process (chosen by `oom_score`). In containers, exceeding the cgroup memory limit gives an **OOMKilled** pod.
- **`mmap`:** map files or anonymous memory into the address space. Used by databases and for fast file I/O.

## 8. File systems (your domain: go deep)

- **Inode:** metadata for a file (size, owner, permissions, timestamps, **pointers to data blocks**), but **not the name**. Directories map **names → inode numbers**.
- **Hard link:** another directory entry pointing to the same inode (the same file; it can't cross filesystems; the data is deleted only when the link count reaches 0). **Soft (symbolic) link:** a file containing a path (can dangle, can cross filesystems).
- **Deleting an open file:** the name disappears, but the data stays until the last file descriptor closes. That's why `df` can show a full disk while `du` shows less: a process still holds a deleted log file (`lsof +L1` finds it).
- **File descriptor:** a small integer per process indexing the open-file table (0 stdin, 1 stdout, 2 stderr). Limit: `ulimit -n`. "Too many open files" means a descriptor leak or a low limit.
- **VFS (virtual file system):** the kernel's common interface over different filesystems (ext4, XFS, ZFS, NFS). OneFS plugs its own distributed filesystem into a FreeBSD kernel this way.
- **Page cache and writes:** `write()` normally copies into the page cache and returns **before** the data reaches disk. The kernel flushes it later. **`fsync()`** forces data to stable storage. Databases call fsync on commit for durability. Losing power before the flush loses the data.
- **Buffered vs direct I/O (`O_DIRECT`):** direct bypasses the page cache (databases with their own cache use it).
- **Journaling (ext4, XFS, NTFS):** write intended metadata changes to a **journal (log)** first, then apply them. After a crash, replay the journal instead of a slow full `fsck` scan. The same idea as a database write-ahead log.
- **Copy-on-write filesystems (ZFS, btrfs, WAFL in NetApp):** never overwrite in place. Write new blocks, then atomically switch pointers. Gives cheap **snapshots**, consistency, checksums.
More storage depth in [11_Storage_Systems.md](11_Storage_Systems.md).

## 9. I/O models (asked for backend and storage roles)

| Model | Behaviour | Example |
|---|---|---|
| Blocking | The thread waits until data is ready | classic `read()` |
| Non-blocking | Returns immediately with EAGAIN; you poll | `O_NONBLOCK` |
| I/O multiplexing | One thread waits on **many** descriptors | `select`, `poll`, **`epoll`** (Linux), **`kqueue`** (FreeBSD/macOS) |
| Async I/O | Submit the request; get notified when done | **`io_uring`** (Linux), Windows IOCP |

**Why epoll matters:** `select`/`poll` scan every descriptor each call (O(n)). `epoll` returns only the ready ones, so one thread can handle tens of thousands of connections. Nginx, Node.js, Redis and Python's asyncio are built on it. This solves the **C10K problem**.

## 10. Boot process (Linux)
BIOS/UEFI → bootloader (GRUB) → kernel loads + initramfs → mounts the root filesystem → starts **PID 1 (systemd)** → systemd starts services (units) by target.

---

## 11. Threads: user-level vs kernel-level, threading models

- **User-level threads** are managed by a library in user space: fast to create and switch, but one blocking syscall can block them all, and they can't use multiple cores on their own.
- **Kernel-level threads** are scheduled by the OS: they can run in parallel and block independently, but cost more.
- **Models:** many-to-one (old green threads), **one-to-one** (Linux pthreads, Java platform threads), many-to-many / M:N (Go goroutines, Java virtual threads on carrier threads, Erlang processes).

## 12. CPU scheduling: criteria and a worked example
**Criteria:** CPU utilisation, throughput, **turnaround time** (completion − arrival), **waiting time** (turnaround − burst), **response time** (first run − arrival), fairness.

**Example** (all arrive at time 0): P1 burst 6, P2 burst 8, P3 burst 7, P4 burst 3.

*FCFS (order P1, P2, P3, P4):*

```
| P1 0–6 | P2 6–14 | P3 14–21 | P4 21–24 |
Waiting: P1=0, P2=6, P3=14, P4=21 → average = 41/4 = 10.25
```

*SJF (shortest first):*

```
| P4 0–3 | P1 3–9 | P3 9–16 | P2 16–24 |
Waiting: P4=0, P1=3, P3=9, P2=16 → average = 28/4 = 7.0   (SJF minimises average waiting time)
```

*Round robin (quantum 4):*

```
| P1 0–4 | P2 4–8 | P3 8–12 | P4 12–15 | P1 15–17 | P2 17–21 | P3 21–24 |
Completion: P4=15, P1=17, P2=21, P3=24 → waiting = completion − burst: P1=11, P2=13, P3=17, P4=12 → average 13.25
(worse average waiting, but much better response time: every process starts within 12 time units)
```

**Multilevel feedback queue:** new jobs start at high priority with a short quantum. Jobs that use their full quantum (CPU-bound) drop to lower queues; interactive jobs stay high. Periodic priority boosts prevent starvation.

## 13. The critical-section problem and classic solutions
**Requirements of any solution:** (1) **mutual exclusion**, (2) **progress** (if nobody is in the critical section, the choice of who enters next can't be postponed forever), (3) **bounded waiting** (no starvation).

**Peterson's solution** (two processes; a classic textbook answer. On modern CPUs it needs memory barriers because of instruction reordering):

```c
bool flag[2] = {false, false}; int turn;
// process i (j = 1 - i)
flag[i] = true; turn = j;
while (flag[j] && turn == j) ;      // busy-wait
/* critical section */
flag[i] = false;
```

**Hardware support:** atomic test-and-set, compare-and-swap, and disabling interrupts (single CPU, kernel only).
**Semaphores (Dijkstra):**

```
wait(S)   / P(S):  while S <= 0 block;  S--      (atomically)
signal(S) / V(S):  S++; wake a waiting process
```

Bounded buffer with semaphores: `empty = N`, `full = 0`, `mutex = 1`. The producer does `wait(empty); wait(mutex); add; signal(mutex); signal(full)`; the consumer does the mirror image. (The full code is in file 07.)
**Monitors:** a language construct where only one thread is inside at a time, with condition variables (Java `synchronized`).

## 14. Deadlock avoidance: Banker's algorithm (worked example)
Resources A, B, C. Available = (3, 3, 2).

| Process | Allocation | Max | Need = Max − Allocation |
|---|---|---|---|
| P0 | 0 1 0 | 7 5 3 | 7 4 3 |
| P1 | 2 0 0 | 3 2 2 | 1 2 2 |
| P2 | 3 0 2 | 9 0 2 | 6 0 0 |
| P3 | 2 1 1 | 2 2 2 | 0 1 1 |
| P4 | 0 0 2 | 4 3 3 | 4 3 1 |

**Safety check:** find a process whose Need ≤ Available, let it finish, and add its Allocation back to Available:
P1 (need 1 2 2 ≤ 3 3 2) → avail 5 3 2 → P3 → 7 4 3 → P4 → 7 4 5 → P0 → 7 5 5 → P2 → 10 5 7.
**Safe sequence: P1, P3, P4, P0, P2**, so the state is safe. A request is granted only if the resulting state is still safe.
**Resource allocation graph:** a cycle means deadlock when each resource has a single instance; with multiple instances, a cycle means deadlock is *possible*.

## 15. Memory allocation and address translation
**Contiguous allocation** (old/simple systems): each process gets one block. Placement strategies: **first fit** (fast), **best fit** (smallest hole that fits: leaves tiny fragments), **worst fit** (largest hole). This causes **external fragmentation**; **compaction** fixes it at a cost. Paging avoids it.

**Paging address translation example:** page size 4 KB = 2¹² → the low 12 bits are the **offset**, the rest is the **page number**.

```
Virtual address 0x3A7F = 0011 1010 0111 1111
page number = 0x3A7F >> 12 = 3        offset = 0x3A7F & 0xFFF = 0xA7F
Page table: page 3 → frame 9
Physical address = 9 × 4096 + 0xA7F = 0x9A7F
```

**Page table entry bits:** frame number, present/valid, dirty (modified: must be written back), accessed/referenced (for LRU approximations), protection (R/W/X), user/supervisor.
**Multi-level page tables** save memory (only allocate the tables for used regions); **inverted page tables** (one entry per physical frame); **huge pages** (fewer TLB misses for big-memory apps such as databases and JVMs).
**Effective access time with a TLB:** EAT = hit ratio × (TLB + memory) + miss ratio × (TLB + 2 × memory) for a 1-level table. E.g. 90% hits, 10 ns TLB, 100 ns memory → 0.9 × 110 + 0.1 × 210 = 120 ns.

**Segmentation:** logical segments (code, data, stack) of variable size with base + limit registers; protection per segment; external fragmentation. x86-64 mostly uses flat segments + paging.

## 16. Page replacement: worked example
Reference string `7 0 1 2 0 3 0 4 2 3 0 3 2`, **3 frames**:

- **FIFO:** 10 page faults. Suffers from **Belady's anomaly** (more frames can cause *more* faults).
- **LRU:** 9 faults. A stack algorithm, so no Belady's anomaly.
- **Optimal (replace the page used furthest in the future):** 7 faults (the theoretical minimum; needs the future).
Practise tracing these on paper; it's asked in OS-heavy interviews. Real systems use **Clock / second chance** (a circular list + reference bits), an LRU approximation.

**Working set model:** the set of pages a process used in the last Δ references. If the sum of working sets > RAM → thrashing. **Page fault frequency** control: give more frames to processes that fault often.

## 17. File-system implementation
**Allocation methods:**

| Method | How | Pros | Cons |
|---|---|---|---|
| Contiguous | A file occupies consecutive blocks | Fast sequential and random access | External fragmentation; hard to grow files |
| Linked | Each block points to the next (FAT keeps the pointers in a table) | No fragmentation | Slow random access; a broken pointer loses the rest |
| **Indexed** | An index block lists the file's blocks (Unix inodes: 12 direct pointers + single, double and triple indirect) | Fast random access; files grow easily | Index overhead |
| **Extents** | (start block, length) runs | Little metadata for big files | (ext4, XFS, NTFS) |

```
inode
├─ direct[0..11] ──► data blocks
├─ single indirect ──► block of pointers ──► data blocks
├─ double indirect ──► pointers ──► pointers ──► data
└─ triple indirect ──► …
```

**Directory structures:** single-level, two-level, **tree** (hierarchical), **acyclic graph** (shared files via links), general graph. Directories are implemented as lists or **hash tables/B-trees** (for huge directories).
**Free-space management:** a bitmap (1 bit per block), a linked free list, grouping, counting.
**Mounting:** attaching a filesystem at a directory of the global tree (`mount /dev/sdb1 /data`).
**Consistency:** `fsck` (scan and repair) vs journaling (replay the log) vs copy-on-write (always consistent).

## 18. Disk scheduling (very relevant for storage roles)
Request queue (cylinders): **98, 183, 37, 122, 14, 124, 65, 67**; head at **53**; cylinders 0–199.

| Algorithm | Order served | Total head movement |
|---|---|---|
| **FCFS** | 98, 183, 37, 122, 14, 124, 65, 67 | **640** |
| **SSTF** (shortest seek first) | 65, 67, 37, 14, 98, 122, 124, 183 | **236** (can starve far requests) |
| **SCAN** (elevator; moving toward 0 first) | 37, 14, (0), 65, 67, 98, 122, 124, 183 | 53 + 183 = **236** |
| **C-SCAN** (moving toward 199, jump back to 0) | 65, 67, 98, 122, 124, 183, (199 → 0), 14, 37 | 146 + 199 + 37 = **382** if the jump is counted; more uniform wait times |
| **LOOK / C-LOOK** | Like SCAN/C-SCAN but only go as far as the last request | less movement |

SSDs don't seek, so Linux uses simple schedulers for them (`none`/`mq-deadline`), while `bfq`/`mq-deadline` suit HDDs.

**Disk access time** = seek time + rotational latency + transfer time. For a 7,200 RPM disk, one rotation = 60/7200 s ≈ 8.33 ms → average rotational latency ≈ 4.17 ms.

## 19. I/O systems

- **Polling** (the CPU repeatedly checks the device: wasteful, but low latency for very fast devices; NVMe drivers can poll) vs **interrupts** (the device signals the CPU when ready).
- **DMA (direct memory access):** the device copies data to/from memory without the CPU touching each byte; the CPU gets one interrupt at the end. Essential for disks and NICs.
- **Buffering** (smooth out speed differences; double buffering), **caching**, **spooling** (queue output for a slow device, like printing).
- **Device drivers** are the kernel modules that speak each device's language. **Block devices** (disks, random access) vs **character devices** (terminals, streams).
- **Memory-mapped I/O vs port-mapped I/O.**

## 20. Caches and locality (the CPU side)

- **Temporal locality** (recently used data is used again) and **spatial locality** (nearby data is used soon). Caches exploit both.
- Cache lines (64 bytes), L1/L2/L3, hit/miss, write-through vs write-back caches, cache coherence across cores (MESI protocol): the reason **false sharing** happens (file 07).
- **Why it matters:** iterating a 2D array row by row (row-major) is much faster than column by column; arrays beat linked lists in practice.

---

## 21. Completing OS from A to Z

### OS course map (everything in this file)
```
Introduction: what an OS does · types · structures (monolithic, micro, hybrid) · system calls · dual mode · booting · virtualisation
Processes: PCB · states · creation/termination (fork/exec/wait) · context switch · IPC · signals · threads & threading models
Scheduling: criteria · FCFS/SJF/SRTF/RR/priority/MLFQ · CFS→EEVDF · multiprocessor & real-time scheduling
Synchronisation: critical section · Peterson · hardware atomics · mutex/semaphore/monitor · classic problems
Deadlocks: conditions · prevention · avoidance (Banker's) · detection & recovery
Memory: address binding · contiguous allocation · paging · segmentation · TLB · virtual memory · page replacement · thrashing · NUMA
Storage & files: file concepts · directories · allocation methods · free space · journaling · disk scheduling · RAID
I/O: polling/interrupts/DMA · drivers · buffering/caching/spooling · I/O models (blocking → epoll → io_uring)
Protection & security: access control · capabilities · ACLs · authentication · sandboxing
```

### Protection and security in the OS

- **Goals:** each process may only use the resources it's authorised for.
- **Access control models:** an **access matrix** (subjects × objects → rights), implemented as **ACLs** (a list per file: who can do what) or **capabilities** (unforgeable tokens a process holds).
- **DAC** (discretionary: owners set permissions, e.g. Unix `rwx`) vs **MAC** (mandatory: system-wide policy enforced by the kernel, e.g. **SELinux**, **AppArmor**) vs **RBAC** (role-based).
- **Least privilege:** run services as unprivileged users; Linux **capabilities** split root's powers (`CAP_NET_BIND_SERVICE` lets a process bind port 80 without being root).
- **Isolation mechanisms:** separate address spaces, user/kernel mode, chroot/jails, namespaces and cgroups (containers), seccomp (syscall filtering), VMs.
- **Threats:** buffer overflows (mitigated by ASLR, NX/DEP, stack canaries), privilege escalation, malware, side channels (Spectre/Meltdown → kernel page-table isolation).

### Multiprocessor scheduling and NUMA

- **SMP** (symmetric multiprocessing): every core runs the scheduler and shares memory.
- **Per-CPU run queues + load balancing** (work stealing between cores).
- **Processor affinity:** keep a thread on the same core so its cache stays warm (`taskset`, `sched_setaffinity`).
- **NUMA** (non-uniform memory access): each CPU socket has local RAM; remote memory is slower, so allocate memory near the CPU that uses it (`numactl`). Matters for databases and storage controllers.
- **Hyper-threading/SMT:** two hardware threads share one core's execution units.

### Real-time scheduling

- **Hard real-time** (missing a deadline is a failure: airbags) vs **soft** (degraded quality: video).
- **Rate-monotonic scheduling:** fixed priorities, where a shorter period means a higher priority.
- **Earliest deadline first (EDF):** dynamic priority to whichever task's deadline is nearest.
- Linux offers `SCHED_FIFO`, `SCHED_RR` and `SCHED_DEADLINE` policies; full hard real-time needs an RTOS or PREEMPT_RT.

### Address binding and loading
Addresses can be bound at **compile time** (absolute code), **load time** (relocatable code), or **execution time** (an MMU translates every access: the modern approach that enables virtual memory). **Dynamic linking** loads shared libraries at runtime; **memory-mapped files** let programs treat files as memory.

---

# Part B: Linux in practice

## 1. Commands you must know (grouped by the question you're answering)

**"What's running and what's eating the CPU?"**

```bash
top / htop                      # live view; press 1 for per-CPU, M to sort by memory
ps aux --sort=-%cpu | head      # top CPU processes
ps -ef | grep isi_telemetry_d   # find a process
pidof nginx; pgrep -f pattern
kill -15 <pid>  /  kill -9 <pid>
nice -n 10 cmd; renice -n 5 -p <pid>
uptime                          # load averages for 1/5/15 minutes
```

**Load average** = the average number of tasks running **or waiting** (on Linux, also tasks in uninterruptible I/O sleep). Compare it with the CPU count: load 8 on 8 cores is fully busy; load 16 means a queue. High load with low CPU usage usually means **I/O wait** (check `iostat`, and the `wa` column in top).

**"Memory?"** `free -h`, `vmstat 1` (si/so = swap in/out), `cat /proc/meminfo`, `smem`, `pmap <pid>`.

**"Disk?"**

```bash
df -h                     # filesystem usage
du -sh /var/log/* | sort -h   # what's big
iostat -x 1               # per-device utilisation, await (latency), queue size
lsof +L1                  # deleted-but-open files still holding space
find / -xdev -size +1G    # big files
```

**"Network?"**

```bash
ip addr; ip route
ss -tulpn                 # listening ports + process (replaces netstat)
ss -tan state established | wc -l
ping, traceroute / mtr
dig example.com +short; nslookup
curl -v https://host/health      # see the TLS handshake and headers
curl -o /dev/null -s -w "%{http_code} %{time_total}\n" URL
tcpdump -i eth0 port 443 -nn     # capture packets
nc -zv host 5672                 # is the port reachable? (RabbitMQ)
```

**"What is this process doing?"**

```bash
strace -p <pid> -f -e trace=network,file   # syscalls; see where it's stuck
lsof -p <pid>                               # open files and sockets
cat /proc/<pid>/status, /proc/<pid>/limits
gdb -p <pid>   /  pstack                    # stack traces
jstack <pid>                                # JVM thread dump
```

**Logs:**

```bash
journalctl -u myservice -f --since "10 min ago"
tail -f /var/log/messages; tail -f /var/log/isi_telemetry_d.log   # (OneFS daemon log)
dmesg -T | tail           # kernel messages: OOM kills, disk errors
```

**Files, text, search:**

```bash
grep -rn "ERROR" /var/log/app/ --include="*.log"
grep -c, -i, -v, -E 'a|b', -A3 -B3 (context lines)
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head   # top client IPs
awk -F',' '$3 > 100 {print $1, $3}' data.csv
sed -i 's/old/new/g' file;  sed -n '10,20p' file
cut -d':' -f1 /etc/passwd;  sort -k2 -n;  uniq -c;  wc -l;  head/tail;  tr
find . -name "*.log" -mtime +7 -delete
xargs: find . -name "*.tmp" | xargs rm -f
```

**Permissions:**

- `rwx` for user/group/others; `chmod 755 file` (rwxr-xr-x), `chmod u+x`, `chown user:group`.
- `umask 022` → new files 644, new directories 755.
- Special bits: **setuid** (run as the file's owner, e.g. `passwd`), setgid, **sticky bit** on `/tmp` (only the owner can delete their files).

**Services (systemd):**

```bash
systemctl status|start|stop|restart|enable nginx
systemctl list-units --failed
journalctl -u nginx
```

**Scheduling:** `crontab -e`: `MIN HOUR DOM MON DOW command`. `*/5 * * * *` = every 5 minutes; `37 * * * *` = minute 37 of every hour, **like the OneFS cron that caused your test failures**.

**Remote:** `ssh user@host`, `ssh -i key`, `ssh -L 8080:localhost:80 host` (port forwarding), `scp`, `rsync -avz --progress src/ dst/` (only transfers differences).

## Start here: Linux in plain words

**What Linux is:** strictly, Linux is a **kernel** (the core of an OS) written by Linus Torvalds in 1991. A **distribution** (Ubuntu, Red Hat/RHEL, Debian, Amazon Linux, Alpine) packages that kernel with tools, a shell, a package manager and services to make a complete OS. Linux runs most servers, all Kubernetes nodes, Android phones and almost every cloud VM, so backend and DevOps engineers live in it.
**"Everything is a file":** disks (`/dev/sda`), processes (`/proc/1234`), kernel settings (`/proc/sys/...`) and devices all look like files, so the same tools (`cat`, `grep`, `echo`) work on all of them.

```
 ┌──────────────────────────────────────────────────────────────────┐
 │ Users run commands in a SHELL (bash/zsh) or apps/services        │
 ├──────────────────────────────────────────────────────────────────┤
 │ GNU utilities (ls, grep, awk, ssh) · systemd (services, logs)    │
 │ package manager (apt/dnf) · libraries (glibc, OpenSSL)           │
 ├──────────────────────────── system calls ────────────────────────┤
 │ LINUX KERNEL: scheduler · memory · VFS/filesystems · networking  │
 │               cgroups & namespaces (→ containers) · drivers      │
 ├──────────────────────────────────────────────────────────────────┤
 │ Hardware / virtual machine                                       │
 └──────────────────────────────────────────────────────────────────┘
```

**Boot in plain words:** firmware (BIOS/UEFI) → bootloader (GRUB) loads the kernel → the kernel starts **systemd** (process #1) → systemd starts all services (network, sshd, your app) → login.

## 1b. Linux fundamentals (basics → admin)

**Filesystem hierarchy:**

| Path | Contains |
|---|---|
| `/` | root of everything |
| `/bin`, `/usr/bin` | user commands |
| `/sbin`, `/usr/sbin` | admin commands |
| `/etc` | **configuration** (`/etc/hosts`, `/etc/fstab`, `/etc/passwd`, `/etc/ssh/sshd_config`) |
| `/var` | variable data: **`/var/log`** (logs), spools, caches |
| `/home`, `/root` | user home directories |
| `/tmp` | temporary files (often cleared on reboot) |
| `/proc` | virtual files exposing kernel/process info (`/proc/cpuinfo`, `/proc/meminfo`, `/proc/<pid>/`) |
| `/sys` | device/kernel tunables |
| `/dev` | device files (`/dev/sda`, `/dev/null`, `/dev/zero`, `/dev/urandom`) |
| `/opt` | optional/third-party software |
| `/boot` | kernel + bootloader |
| `/mnt`, `/media` | mount points |

**Everyday navigation and files:** `pwd`, `cd -`, `ls -lah`, `tree`, `cp -r`, `mv`, `rm -rf` (careful), `mkdir -p`, `touch`, `cat`, `less`, `head -n 20`, `tail -n 50 -f`, `wc -l`, `diff -u a b`, `ln -s target link`, `file x`, `stat x`, `which cmd`, `type cmd`, `man cmd`, `history`, `!!`, `Ctrl+R` (search history).

**Users, groups, sudo:** `whoami`, `id`, `useradd -m alice`, `passwd alice`, `usermod -aG docker alice`, `groups`, `sudo cmd`, `su - user`, `/etc/passwd` (users), `/etc/shadow` (password hashes), `/etc/group`, `visudo` (edit sudoers safely).

**Permissions in detail:** `ls -l` shows `-rwxr-x---`: type, then user/group/other triplets. Octal: r=4, w=2, x=1 → `chmod 750`. On a **directory**, `x` means you can enter it and `r` means you can list it. `chmod u+s` (setuid), `chmod g+s` (setgid: new files inherit the group), `chmod +t` (sticky). ACLs: `setfacl`/`getfacl` for finer control.

**Environment variables:** `env`, `echo $PATH`, `export JAVA_HOME=/opt/jdk`, `unset VAR`, persisted in `~/.bashrc` / `~/.profile` / `/etc/environment`. `PATH` decides which binary runs.

**Package management:** Debian/Ubuntu `apt update && apt install nginx`; RHEL/CentOS/Fedora `dnf/yum install`; `rpm -qa`, `dpkg -l`; FreeBSD `pkg install`. Language package managers: pip, npm, maven.

**Archives and compression:** `tar -czvf logs.tgz /var/log/app` (create gzip), `tar -xzvf logs.tgz -C /tmp` (extract), `tar -tzf` (list), `gzip/gunzip`, `zip/unzip`, `zcat`/`zgrep` (read compressed logs directly), `xz`, `zstd`.

**Disks, mounts, LVM:** `lsblk`, `fdisk -l` / `parted`, `mkfs.ext4 /dev/sdb1`, `mount /dev/sdb1 /data`, `/etc/fstab` (mounts at boot), `umount`, `blkid`, `df -hT`, `mount -t nfs server:/export /mnt/nfs` (NFS client; ties to file 11).
**LVM (Logical Volume Manager):** physical volumes (PV, disks) → volume group (VG, a pool) → logical volumes (LV, resizable "partitions"). `pvcreate`, `vgcreate`, `lvcreate -L 50G -n data vg0`, `lvextend -r -L +10G` (grow online).

**Processes in more depth:** `ps -eo pid,ppid,stat,%cpu,%mem,cmd`. STAT codes: **R** running, **S** sleeping (interruptible), **D** uninterruptible sleep (usually I/O: lots of D = storage trouble), **Z** zombie, **T** stopped. Job control: `cmd &`, `jobs`, `fg %1`, `bg`, `Ctrl+Z` (suspend), `nohup cmd &` / `disown`, `screen`/`tmux` (keep sessions alive over SSH).

**systemd unit file (run your service properly):**

```ini
# /etc/systemd/system/api.service
[Unit]
Description=Shopping API
After=network-online.target

[Service]
User=app
WorkingDirectory=/opt/api
EnvironmentFile=/etc/api.env
ExecStart=/opt/api/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`systemctl daemon-reload && systemctl enable --now api`. Logs: `journalctl -u api -f`.

**Log rotation:** `logrotate` (config in `/etc/logrotate.d/`): rotate daily/weekly, compress, keep N copies, `copytruncate` or a signal to reopen files.

**Kernel tunables:** `sysctl -a`, `sysctl -w net.core.somaxconn=1024`, persisted in `/etc/sysctl.conf`. Limits: `ulimit -n` (open files), `/etc/security/limits.conf`.

**Networking config:** `ip addr add`, `ip link set eth0 up`, `/etc/resolv.conf` (DNS), `/etc/hosts`, `hostnamectl`, firewalls: `iptables`/`nftables`, `ufw allow 22`, `firewalld`.

**vim survival kit:** `i` insert, `Esc` normal mode, `:w` save, `:q!` quit without saving, `:wq` save and quit, `/text` search, `n` next match, `dd` delete line, `yy` copy, `p` paste, `u` undo, `gg`/`G` top/bottom, `:%s/old/new/g` replace all.

**Performance tools:** `top/htop`, `vmstat 1`, `iostat -x 1`, `mpstat -P ALL 1`, `sar`, `pidstat`, `free -h`, `perf top` (CPU hotspots), `ss -s`, `nload`/`iftop` (network), `dstat`.

## 1c. Completing Linux from A to Z

### Linux course map
```
Basics: history · distributions · the shell · filesystem hierarchy · navigation · files & directories · help (man, --help)
Text: viewing (cat, less, head, tail) · editors (vim, nano) · grep/sed/awk/cut/sort/uniq/tr/wc · regular expressions
Users & security: users/groups · sudo · permissions/ownership · special bits · ACLs · SELinux/AppArmor · SSH keys
Processes: ps/top/htop · signals/kill · jobs · nice · systemd services · cron/timers · /proc
Storage: disks/partitions · filesystems · mount/fstab · LVM · swap · df/du · archives & compression
Networking: ip/ss/ping/dig/curl/traceroute · firewall (iptables/nftables/ufw) · DNS config · SSH tunnels
Software: package managers · building from source · environment variables · shared libraries
System: boot (UEFI → GRUB → kernel → systemd) · logs (journald, /var/log) · kernel modules · sysctl · resource limits
Performance & troubleshooting: CPU/memory/disk/network tools · strace/lsof/perf · common failure stories
```

### Kernel modules and hardware
`lsmod` (loaded modules), `modprobe nfs` (load a module + dependencies), `modinfo`, `rmmod`; `lspci`, `lsusb`, `lscpu`, `lsblk`, `dmidecode`; drivers live in `/lib/modules/$(uname -r)/`. `uname -a` shows the kernel version.

### Swap and memory tuning
`swapon --show`, `mkswap /swapfile && swapon /swapfile`, `vm.swappiness` (how eagerly the kernel swaps), `/proc/meminfo`, `free -h` (`available` is what matters), `echo 3 > /proc/sys/vm/drop_caches` (testing only: drops the page cache).

### Shared libraries
`ldd /usr/bin/python3` lists the libraries a binary needs; `/etc/ld.so.conf` + `ldconfig` set the search paths; `LD_LIBRARY_PATH` overrides them (debugging only). A "library not found" error at startup = missing package or path.

### Building software from source
`./configure && make && sudo make install` (autotools), or `cmake -B build && cmake --build build`; install build tools with `apt install build-essential`. Prefer packages when available (security updates).

### systemd beyond services
**Timers** (a modern cron: `.timer` + `.service` units, with logging and missed-run catch-up), **targets** (groups of units: `multi-user.target`, `graphical.target`), `systemctl list-timers`, `systemd-analyze blame` (boot-time cost per unit), `journalctl -p err -b` (errors since boot), resource limits per service (`MemoryMax=`, `CPUQuota=`) via cgroups.

### SELinux and AppArmor in brief
Mandatory access control: even root-owned processes are confined by policy. SELinux (RHEL/Fedora): labels on files and processes, `getenforce`, `setenforce 0` (permissive, for debugging), `ls -Z`, `audit2why`. AppArmor (Ubuntu/Debian): path-based profiles in `/etc/apparmor.d`. A "permission denied" despite correct `rwx` bits is often MAC.

### Regular expressions for grep/sed/awk
`.` any char · `*` 0+ · `+` 1+ (ERE) · `?` 0/1 · `^` start · `$` end · `[abc]`, `[^abc]`, `[0-9]` · `\b` word boundary · `( )` groups · `|` alternation · `{n,m}` repeats. `grep -E` (extended), `grep -P` (Perl-style: `\d`, lookaheads), `grep -o` (print only the match), `grep -w` (whole word).

### Useful one-liners
```bash
du -ah /var | sort -rh | head -20                    # biggest files/dirs
find / -type f -mmin -10 2>/dev/null                 # files changed in the last 10 minutes
ps -eo pid,comm,%mem --sort=-%mem | head             # top memory users
ss -tanp | awk '{print $1}' | sort | uniq -c         # TCP connections by state
journalctl -u nginx --since today | grep -c " 500 "  # count 500 errors today
tar -czf backup-$(date +%F).tgz /etc                 # dated backup
watch -n 2 'kubectl get pods'                         # rerun a command every 2 s
```

## 2. Linux troubleshooting stories you can tell

- **"The disk is full but du shows space"** → a deleted file is still held open → `lsof +L1` → restart the process or truncate it.
- **"High load, low CPU"** → I/O wait → `iostat -x` shows the device at 100% utilisation → slow disk or a noisy neighbour.
- **"Service won't start"** → `systemctl status`, `journalctl -u`, check the port with `ss -tulpn` (already in use?), file permissions, the environment.
- **"Intermittent failures on the hour"** → look for **time patterns** → cron jobs (`crontab -l`, `/etc/crontab`) → that was your Dynamic Licensing story.

## 3. FreeBSD vs Linux (you worked on FreeBSD; it's a great differentiator)

| | FreeBSD | Linux |
|---|---|---|
| What it is | A complete OS: kernel + userland developed together | A kernel; distributions add the userland |
| Licence | **BSD (permissive)**: companies can ship modified proprietary versions | **GPL (copyleft)**: modified kernel code you distribute must be released |
| Event API | `kqueue` | `epoll` |
| Containers | `jails` | namespaces + cgroups |
| Filesystem | UFS, ZFS native | ext4, XFS, btrfs |
| Tools | `sockstat`, `top`, `gstat` | `ss`, `top`, `iostat` |

> "OneFS is built on FreeBSD largely because of the BSD licence: Dell can ship a heavily modified proprietary OS without having to open-source those kernel changes. FreeBSD's integrated kernel-plus-userland also makes a long-lived fork easier to maintain."

---

# Start here: the shell and Bash in plain words

**What a shell is:** a program that reads the commands you type and asks the OS to run them. **Bash** (Bourne Again SHell) is the most common shell on Linux. A **Bash script** is just a text file of those commands, so you can automate them (deployments, log cleanup, health checks).

**What happens when you type `grep ERROR app.log | wc -l`:**

```
 you type a line ──► BASH: parse it (words, quotes, variables, pipes, redirections)
                        │
                        ├─ fork() a child ─► exec("grep") ─┐  stdout of grep
                        │                                  ├──── PIPE ────►
                        └─ fork() a child ─► exec("wc")  ◄─┘               stdin of wc
                        │
                        └─ wait for both, then show the prompt again; $? = exit status
```

**Three standard streams:** every program gets **stdin (0)** (input), **stdout (1)** (normal output) and **stderr (2)** (errors). Redirection rewires them: `> file` (stdout to a file), `2> err.log`, `< input.txt`, `|` (stdout of one into stdin of the next). Small tools that each do one thing, chained by pipes, is the Unix philosophy.
**Exit status:** every command returns a number: 0 = success, anything else = failure. Scripts make decisions with it (`&&`, `||`, `if`).

# Part C: Bash scripting

**Why Bash exists:** to glue programs together and automate what you'd type by hand. It's present on every server (pipelines, cron jobs, CI steps, ops scripts).

## 1. Script skeleton (use this every time)
```bash
#!/usr/bin/env bash
set -euo pipefail       # -e: exit on error; -u: error on unset variables; pipefail: a pipeline fails if any part fails
IFS=$'\n\t'

LOG_DIR="${1:-/var/log/app}"          # first argument with a default
THRESHOLD="${THRESHOLD:-100}"         # environment variable with a default

log() { echo "[$(date '+%F %T')] $*" >&2; }
cleanup() { rm -f "$TMP"; }
trap cleanup EXIT                     # always runs, even on error

TMP=$(mktemp)
```

## 2. Core syntax
```bash
name="gopal"; echo "Hi $name"; echo 'literal $name'     # double quotes expand, single don't
files=$(ls *.log)                                         # command substitution
count=$(( 3 + 4 ))                                        # arithmetic
if [[ -f "$file" && -s "$file" ]]; then ...; elif ...; else ...; fi
#   -f file exists, -d directory, -s non-empty, -z empty string, -n non-empty, -eq/-ne/-lt/-gt numbers, == strings
for f in /var/log/*.log; do echo "$f"; done
for i in {1..10}; do pytest test.py >> loop.log; done    # (how you looped flaky tests at Dell)
while read -r line; do ...; done < input.txt
case "$1" in start) ...;; stop) ...;; *) echo "usage"; exit 1;; esac
arr=(a b c); echo "${arr[0]}" "${#arr[@]}"; for x in "${arr[@]}"; do ...; done
func() { local x="$1"; echo "$x"; return 0; }
echo $?                 # exit status of the last command (0 = success)
cmd1 && cmd2            # run cmd2 only if cmd1 succeeded;   cmd1 || cmd2 runs cmd2 only if cmd1 failed
cmd > out.txt 2>&1      # stdout and stderr to a file
cmd 2>/dev/null         # discard errors
cat <<EOF > config.yml  # here-doc
key: $value
EOF
```

**Always quote variables** (`"$file"`): unquoted variables split on spaces and expand globs. That's the #1 Bash bug.

## 2b. More Bash: from basic to advanced

**Special variables:**

| Variable | Meaning |
|---|---|
| `$0` | script name |
| `$1 … $9`, `${10}` | positional arguments |
| `$#` | number of arguments |
| `"$@"` | all arguments as separate words (**use this** when passing arguments on) |
| `"$*"` | all arguments as one string |
| `$?` | exit status of the last command |
| `$$` | PID of the current shell |
| `$!` | PID of the last background job |
| `$_` | last argument of the previous command |

**Test operators (`[[ ]]`):**

| Files | Strings | Numbers (or use `(( ))`) |
|---|---|---|
| `-e` exists, `-f` regular file, `-d` directory, `-r/-w/-x` permissions, `-s` non-empty, `-L` symlink, `f1 -nt f2` newer | `-z` empty, `-n` non-empty, `==`, `!=`, `=~` regex, `<` `>` (sort order) | `-eq -ne -lt -le -gt -ge`; `(( a > b ))` |

**Parameter expansion (string manipulation without external tools):**

```bash
file="/var/log/app/server.log.gz"
echo "${file##*/}"        # server.log.gz      (strip the longest match from the front → basename)
echo "${file%/*}"         # /var/log/app       (strip the shortest match from the end → dirname)
echo "${file%.gz}"        # /var/log/app/server.log
echo "${file/log/LOG}"    # replace the first match;  ${file//log/LOG} replaces all
echo "${#file}"           # length
echo "${name:-default}"   # use a default if unset/empty;  ${name:=default} also assigns it
echo "${name:?must be set}"   # error out if unset
echo "${str:0:5}"         # substring (offset, length)
echo "${str^^}" "${str,,}"    # upper / lower case (bash 4+)
```

**Reading input and options:**

```bash
read -rp "Cluster name: " cluster          # -r keeps backslashes; -p prompt
while IFS=, read -r id product size; do    # parse a CSV line by line
  echo "$id → $product ($size MB)"
done < collections.csv

usage() { echo "usage: $0 [-n nodes] [-v] host"; exit 1; }
nodes=3; verbose=0
while getopts ":n:vh" opt; do
  case "$opt" in
    n) nodes="$OPTARG" ;;
    v) verbose=1 ;;
    h|*) usage ;;
  esac
done
shift $((OPTIND - 1)); host="${1:?host required}"
```

**Arrays (indexed and associative):**

```bash
nodes=(node1 node2 node3); nodes+=(node4)
for n in "${nodes[@]}"; do echo "$n"; done; echo "${#nodes[@]}"
declare -A owner=([licensing]="gopal" [celog]="team-b")
for k in "${!owner[@]}"; do echo "$k=${owner[$k]}"; done
```

**Functions returning values:** a function's `return` is only an exit code (0–255); "return" data by `echo`ing it and capturing it:

```bash
get_version() { isi version | awk '{print $3}'; }
ver=$(get_version) || { echo "failed"; exit 1; }
```

**Redirection and plumbing:**

```bash
cmd > out.log 2> err.log        # separate stdout and stderr
cmd &> all.log                  # both (bash)
cmd | tee -a run.log            # show AND append to a file
cmd < input.txt                 # stdin from a file
diff <(sort a.txt) <(sort b.txt)    # process substitution: treat command output as files
( cd /tmp && do_stuff )         # subshell: the cd doesn't affect the parent
{ echo a; echo b; } > both.txt  # group commands without a subshell
cmd1; cmd2                      # run sequentially regardless of success
xargs -P 4 -n 1                 # run up to 4 in parallel
```

**Exit codes and error handling:** 0 = success; non-zero = failure (1 general, 2 misuse, 126 not executable, 127 command not found, 128+N killed by signal N: e.g. **137 = 128 + 9 (SIGKILL/OOMKilled)**, 143 = SIGTERM).
`set -e` caveats: it doesn't trigger inside `if` conditions or `&&`/`||` lists, so check critical commands explicitly. `trap 'echo "error on line $LINENO"' ERR` helps debugging.

**Debugging:** `bash -x script.sh` or `set -x` (prints each command), `set -v`, `shellcheck script.sh` (a linter that catches quoting bugs: use it).

**Arithmetic and floating point:** `(( count++ ))`, `$(( 10 / 3 ))` (integer only), use `bc` or `awk` for decimals: `echo "scale=2; 10/3" | bc`.

**awk and sed, a little deeper:**

```bash
awk -F'|' 'NR > 1 && $3 == "FAILED" { fails[$2]++ } END { for (s in fails) print s, fails[s] }' jobs.log
awk '{ sum += $5 } END { print "avg:", sum / NR }' latency.log
sed -n '/BEGIN/,/END/p' file            # print a block between markers
sed -E 's/([0-9]{3})-([0-9]{4})/\2-\1/' # regex groups
```

**Cron and scheduling scripts safely:** use absolute paths (cron has a minimal PATH), redirect output to a log, use `flock` to prevent overlapping runs: `*/5 * * * * flock -n /tmp/job.lock /opt/scripts/job.sh >> /var/log/job.log 2>&1`. *(Overlap and contention between scheduled jobs is exactly the class of problem behind your cron story.)*

## 3. Scripts to be able to write in an interview

```bash
# 1. Top 5 IPs hitting the server
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -5

# 2. Count ERRORs per service in the last log (format: date time LEVEL service msg)
grep ' ERROR ' app.log | awk '{print $4}' | sort | uniq -c | sort -rn

# 3. Alert if disk usage > 80%
df -h --output=pcent,target | tail -n +2 | while read -r pct mount; do
  usage=${pct%\%}
  if (( usage > 80 )); then echo "WARNING: $mount at $pct"; fi
done

# 4. Delete logs older than 7 days, compress the rest
find /var/log/app -name "*.log" -mtime +7 -delete
find /var/log/app -name "*.log" -mtime +1 -exec gzip {} \;

# 5. Retry a command with backoff
retry() { local n=0; until "$@"; do n=$((n+1)); (( n >= 5 )) && return 1; sleep $((2**n)); done; }
retry curl -fsS http://localhost:8000/health

# 6. Check whether a service is up, restart if not
systemctl is-active --quiet myapp || { log "restarting"; systemctl restart myapp; }

# 7. Run a command on every node (OneFS had isi_for_array; generic version)
for host in $(cat nodes.txt); do ssh "$host" 'uptime' & done; wait
```

## Interview traps

1. "Process vs thread" → address space, cost, crash isolation, and **why context switches differ** (TLB/page tables).
2. "What happens on fork?" → COW, return values, then exec.
3. "Free memory is low; is that a problem?" → not necessarily; page cache. Look at `available` and swap activity.
4. "kill -9 vs kill -15" → SIGKILL can't be caught, so no cleanup happens; always try SIGTERM first.
5. "Why doesn't deleting a log free space?" → an open file descriptor.
6. "What's load average?" → runnable + I/O-waiting tasks, compared with core count.
7. "Hard vs soft link." 8. "What does fsync do and why do databases need it?" 9. `set -euo pipefail`.

## Quick revision

- Kernel vs user mode, syscalls. Process vs thread. fork/exec/COW, zombie/orphan.
- Scheduling: RR, priority + aging, CFS → EEVDF. Deadlock: 4 conditions; prevent with lock ordering.
- Virtual memory, pages, TLB, page faults, LRU/Clock, thrashing, OOM killer, page cache.
- Inode, hard/soft links, fd, VFS, fsync, journaling, COW filesystems.
- epoll/kqueue for many connections; io_uring for async.
- Commands: top/ps/ss/lsof/strace/iostat/df/du/journalctl/grep/awk/sed/find. Bash: `set -euo pipefail`, quote variables, `trap`.
- FreeBSD: BSD licence (why OneFS uses it), kqueue, jails.

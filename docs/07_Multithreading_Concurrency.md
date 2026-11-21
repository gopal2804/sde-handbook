# 07 · Multithreading and Concurrency

**Why it exists:** CPUs stopped getting much faster around 2005 and got **more cores** instead. And programs spend most of their time **waiting** (disk, network, databases). Concurrency lets one program make progress on many things at once: use all cores (parallelism) and do useful work while waiting (overlapping I/O).

**Why it matters for you:** your hardest real bug (Dynamic Licensing) was a **concurrency/timing problem**: a cron job and tests contending for shared cluster resources. Your telemetry pipeline ran many consumers in parallel, and your extension's backend is async (FastAPI). Interviewers love "tell me about a race condition you found."

---

## Start here: concurrency in plain words

**The kitchen analogy:**

- A **process** is a restaurant kitchen. **Threads** are the cooks in that kitchen. They share the same fridge and counters (**shared memory**), which is why they can work fast together, and also why they can get in each other's way.
- **Concurrency** = one cook juggling several dishes, switching between them while the water boils. **Parallelism** = several cooks working at the same moment on different stoves (several CPU cores).

```
Concurrency (1 core, interleaved)      Parallelism (2 cores, simultaneous)
core1: A A B B A C C B                  core1: A A A A
                                        core2: B B B B
```

**The core problems and their tools:**

| Situation in the kitchen | Concurrency term | Tool |
|---|---|---|
| Two cooks grab the last egg at the same time | **race condition** | a **mutex** (lock) |
| Only one person may use the single knife at a time | **critical section** | mutex / `synchronized` |
| The car park has 10 spaces; the 11th car waits | **limited resource** | **semaphore** (a counter) |
| A cook waits until the oven bell rings | **waiting for a condition** | **condition variable** |
| Cook A holds the pan and wants the knife; cook B holds the knife and wants the pan | **deadlock** | lock ordering, timeouts |
| Two people keep stepping aside for each other in a corridor | **livelock** | randomised backoff |
| A shy cook never gets the stove | **starvation** | fair scheduling, aging |
| An order rail between the waiters and the cooks | **producer-consumer queue** | bounded blocking queue |
| A fixed team of cooks takes orders off the rail | **thread pool** | executor service |

**Threads share memory, processes don't:**

```
 PROCESS (one address space)
 ┌────────────────────────────────────────────────────┐
 │ Shared: code · heap (objects) · globals · open files│
 │                                                    │
 │  Thread 1          Thread 2          Thread 3       │
 │  [own stack]       [own stack]       [own stack]    │
 │  [own registers]   [own registers]   [own registers]│
 └────────────────────────────────────────────────────┘
 Two threads writing the same heap object without a lock = a data race.
```

**A race condition, step by step (`count += 1` run by two threads):**

```
count = 5
Thread A: read 5 ─────────────── add 1 → 6 ── write 6
Thread B:        read 5 ── add 1 → 6 ──────────────── write 6
Result: 6   (expected 7: one update was lost)
With a lock: A locks → read 5 → write 6 → unlock; B locks → read 6 → write 7 → unlock ✓
```

## 1. Core vocabulary

| Term | Meaning |
|---|---|
| **Concurrency** | Dealing with many tasks at once (interleaved; possible on 1 core) |
| **Parallelism** | Doing many tasks at the same instant (needs several cores) |
| **Race condition** | The result depends on the timing/order of threads |
| **Data race** | Two threads access the same memory, at least one writes, with no synchronisation (undefined behaviour in C/C++) |
| **Critical section** | Code that touches shared state and must not run concurrently |
| **Atomic operation** | Indivisible; no other thread sees a half-done state |
| **Thread-safe** | Behaves correctly when called from many threads at once |
| **Deadlock** | Threads wait on each other forever |
| **Livelock** | Threads keep changing state in response to each other and make no progress |
| **Starvation** | A thread never gets the resource it needs |
| **Priority inversion** | A high-priority thread waits for a low-priority thread holding a lock while a medium one runs (famous: the Mars Pathfinder bug; fixed with priority inheritance) |

## 2. Why `count++` is not safe

`count++` is **read → add → write**. Two threads:

```
T1 reads 5        T2 reads 5
T1 writes 6       T2 writes 6      → one increment lost (should be 7)
```

Fixes: a mutex around it, or an atomic increment (`std::atomic<int>`, `AtomicInteger`, or a lock in Python).

**Check-then-act is the same bug at a higher level:**

```python
if spot.is_free():        # T1 and T2 both see "free"
    spot.assign(car)      # both assign → double booking
```

The check and the act must be **one atomic step** (a lock, compare-and-swap, or a DB `UPDATE … WHERE free = true` that checks the affected row count).

## 3. Synchronisation primitives

### Mutex (mutual exclusion lock)
Only one thread holds it; the others **block** (sleep). Owned: the thread that locked it must unlock it.

```python
lock = threading.Lock()
with lock:            # acquire; released even if an exception occurs
    shared += 1
```

**RLock (reentrant lock):** the same thread can acquire it again (useful for recursive code).

### Spinlock
The waiting thread **busy-loops** instead of sleeping. Good only for **very short** critical sections on multi-core machines, where sleeping/waking would cost more than spinning. Used heavily inside kernels (including FreeBSD/OneFS internals). Bad in user space if the holder gets preempted.

### Semaphore
A counter allowing up to N holders. `acquire()` decrements (blocks at 0), `release()` increments.

- **Counting semaphore:** limit concurrency (e.g. at most 10 concurrent DB connections or API calls).
- **Binary semaphore:** like a mutex but **not owned** (any thread can release it), so it's used for **signalling** between threads.

```python
sem = threading.Semaphore(10)
with sem: call_external_api()     # at most 10 at once
```

### Mutex vs semaphore (classic question)
A mutex is a **locking** mechanism (ownership; protects a resource). A semaphore is a **signalling/counting** mechanism (no ownership; limits access to N resources).

### Condition variable
Lets a thread **sleep until a condition becomes true**, atomically releasing the lock while waiting.

```python
cond = threading.Condition()
with cond:
    while not queue:          # ALWAYS a while loop: spurious wakeups + another thread may take the item
        cond.wait()
    item = queue.pop()
# producer:
with cond:
    queue.append(x); cond.notify()
```

### Read-write lock
Many readers **or** one writer. Great for read-heavy data (configuration caches). Risk: writer starvation.

### Monitor
An object whose methods are mutually exclusive + condition variables (Java `synchronized` + `wait/notify`).

### Barrier / latch
Wait until N threads reach a point (`threading.Barrier`, Java `CountDownLatch`).

## 4. Atomics, CAS, and lock-free programming

- **Compare-and-swap (CAS):** atomically "if the value is still X, set it to Y". Hardware-supported (`CMPXCHG` on x86). It's the building block of lock-free structures.

```cpp
std::atomic<int> v{0};
int expected = v.load();
while (!v.compare_exchange_weak(expected, expected + 1)) { /* expected updated; retry */ }
```

- **Lock-free:** some thread always makes progress (no deadlock), but code is hard to get right (the **ABA problem**: the value changed A→B→A, so CAS wrongly succeeds; fixed with version tags).
- **Optimistic concurrency** is CAS at the application level: read a version, then write `WHERE version = v`. If 0 rows changed, someone else won, so retry. Used in databases and in Kubernetes (`resourceVersion`).

## 5. Memory visibility and reordering (SDE 2-level depth)

Compilers and CPUs **reorder** instructions and **cache** values per core. Without synchronisation, one thread may **never see** another thread's write, or see writes in a different order.

- **Happens-before:** a lock release *happens-before* the next acquire of the same lock, so everything written before the unlock is visible after the lock.
- **Java `volatile`:** visibility + ordering for that variable (not atomicity for `++`).
- **C++ atomics** have memory orders: `seq_cst` (default, safest), `acquire`/`release` (publish/subscribe pattern), `relaxed` (atomic but no ordering; counters).
- **C/C++ `volatile` is NOT for threads** (hardware registers only).
- **False sharing:** two threads update different variables that sit on the **same cache line** (64 bytes), so the cores keep invalidating each other's cache: a big slowdown without any logical sharing. Fix: pad or align the data per thread.

## 6. Deadlock: practical prevention

```python
# Deadlock: T1 locks A then B; T2 locks B then A.
# Fix 1: global lock ordering
def transfer(a, b, amt):
    first, second = sorted([a, b], key=lambda acc: acc.id)   # always lock in id order
    with first.lock, second.lock:
        a.balance -= amt; b.balance += amt
# Fix 2: try-lock with a timeout, back off, retry
# Fix 3: hold one lock at a time; keep critical sections tiny; never call unknown code (callbacks) while holding a lock
```

Diagnose: thread dumps (`jstack`, `gdb thread apply all bt`, Python `faulthandler`/`py-spy dump`) show who holds what and who waits.

## 7. Thread pools and executors

Creating a thread per task is expensive and unbounded (10,000 requests → 10,000 threads → memory and context-switch death). A **thread pool** keeps N worker threads pulling tasks from a queue.

- **Sizing:** CPU-bound → about the number of cores. I/O-bound → more (cores × (1 + wait time / compute time)).
- **Bounded queue + rejection policy** = **backpressure**: when overloaded, reject or slow down instead of growing memory forever.

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
with ThreadPoolExecutor(max_workers=16) as pool:
    futures = {pool.submit(process, c): c for c in collections}
    for f in as_completed(futures):
        try: f.result()
        except Exception as e: dead_letter(futures[f], e)
```

## 8. Classic problems (be able to code them)

### Producer-consumer (bounded buffer): the most asked
**C++:**

```cpp
#include <queue>
#include <mutex>
#include <condition_variable>
template <typename T>
class BoundedQueue {
    std::queue<T> q; size_t cap; std::mutex m;
    std::condition_variable notFull, notEmpty;
public:
    explicit BoundedQueue(size_t c) : cap(c) {}
    void put(T x) {
        std::unique_lock<std::mutex> lk(m);
        notFull.wait(lk, [&]{ return q.size() < cap; });   // predicate handles spurious wakeups
        q.push(std::move(x));
        notEmpty.notify_one();
    }
    T take() {
        std::unique_lock<std::mutex> lk(m);
        notEmpty.wait(lk, [&]{ return !q.empty(); });
        T x = std::move(q.front()); q.pop();
        notFull.notify_one();
        return x;
    }
};
```

**Python:** `queue.Queue(maxsize=N)` is already a thread-safe bounded buffer (`put` blocks when full, `get` blocks when empty).

```python
import queue, threading
q = queue.Queue(maxsize=100)
def producer():
    for item in source(): q.put(item)
    q.put(None)                                 # poison pill to stop the consumer
def consumer():
    while (item := q.get()) is not None: handle(item)
```
> Kafka/RabbitMQ consumers are this same pattern at distributed scale. The queue gives backpressure and decouples producer speed from consumer speed.

### Print odd/even numbers alternately with two threads
```python
import threading
cv = threading.Condition(); n = 1; LIMIT = 10
def worker(parity):
    global n
    while True:
        with cv:
            while n <= LIMIT and n % 2 != parity: cv.wait()
            if n > LIMIT: cv.notify_all(); return
            print(threading.current_thread().name, n); n += 1
            cv.notify_all()
threading.Thread(target=worker, args=(1,), name="odd").start()
threading.Thread(target=worker, args=(0,), name="even").start()
```

### Dining philosophers
Five philosophers, five forks; each needs two. A naive "pick up the left fork, then the right" deadlocks. Fixes: **resource ordering** (always pick up the lower-numbered fork first), allow at most 4 at the table (semaphore), or an arbitrator (waiter).

### Readers-writers
Readers share; a writer is exclusive. Watch for writer starvation (give writers priority once they're waiting).

### Thread-safe singleton (double-checked locking): see file 05.

## 9. Async (event loop) vs threads

| | Threads | Async (event loop) |
|---|---|---|
| Switching | The OS preempts anywhere | Cooperative: only at `await` |
| Cost per task | ~MBs of stack | ~KBs |
| Scale | Thousands | Hundreds of thousands of connections |
| Races | Anywhere | Only across `await` points (still possible) |
| Danger | Locks, deadlocks | **One blocking call freezes everything** |
| Good for | Mixed work, blocking libraries | High-concurrency I/O (APIs, websockets, proxies) |

Your FastAPI backend: `async def` endpoints use an async OpenAI client and streaming. Plain `def` endpoints are run in a thread pool automatically by FastAPI (via Starlette).

## 10. Concurrency in distributed systems (bridge to file 12)

Locks within one process don't work across machines. Across services you use:

- **Database transactions / row locks / optimistic versioning**
- **Distributed locks** (Redis with expiry, ZooKeeper/etcd leases). They need **fencing tokens**, because a lock holder can pause (GC, network) after its lease expires and still believe it holds the lock.
- **Leader election** so only one node does a job. OneFS ran the telemetry daemon only on the **lock-holder node**, which is exactly this pattern.
- **Idempotency:** at-least-once delivery means duplicates. Make handlers safe to repeat.

## 11. Testing and debugging concurrency bugs

- They're **intermittent** and timing-dependent. Logging often changes the timing and hides them ("Heisenbugs").
- Techniques: run in a **loop** (you did: `for i in {1..10}; do pytest …; done`), add stress (more threads), add random sleeps to widen race windows, **look for patterns across many failures (time of day, node, load)**, use thread sanitizers (`-fsanitize=thread`), and use thread dumps for deadlocks.
- **Your story:** failures clustered in the same minutes of every hour → a time pattern means a timing problem, not a logic bug → found the hourly cron at minute ~37 contending for the same resources.

## 12. Thread basics in each language

**Thread lifecycle:** New → Runnable/Ready → Running → Blocked/Waiting (lock, I/O, sleep, wait) → Runnable … → Terminated.

```
 New ──start()──► Runnable ◄──scheduler──► Running ──finished──► Terminated
                     ▲                         │
                     └──── notified / I/O done ┴── wait/lock/sleep ──► Blocked/Waiting
```

**Python:**

```python
import threading
def work(n): print(threading.current_thread().name, n)
t = threading.Thread(target=work, args=(1,), name="worker-1", daemon=False)
t.start(); t.join()             # daemon=True threads are killed when the main thread exits
local = threading.local()        # thread-local storage: each thread sees its own local.x
```

**C++:** `std::thread t(work, 1); t.join();`, `thread_local int counter;`, `std::jthread` (C++20: joins automatically, supports stop tokens).
**Java:**

```java
Thread t = new Thread(() -> work(1)); t.start(); t.join();
ExecutorService pool = Executors.newFixedThreadPool(8);
Future<Integer> f = pool.submit(() -> compute());
CompletableFuture.supplyAsync(this::fetch, pool).thenApply(this::parse).exceptionally(e -> fallback());
pool.shutdown(); pool.awaitTermination(30, TimeUnit.SECONDS);
// Java 21: Executors.newVirtualThreadPerTaskExecutor() → millions of cheap threads
```

## 13. More synchronisation code

**Semaphore limiting concurrency (Python):**

```python
sem = threading.BoundedSemaphore(3)          # at most 3 workers in the section
def download(url):
    with sem:
        fetch(url)
```

**Read-write lock (Python has none built in; a simple writer-preferring version):**

```python
class RWLock:
    def __init__(self):
        self.cond = threading.Condition(); self.readers = 0; self.writer = False; self.waiting_writers = 0
    def acquire_read(self):
        with self.cond:
            while self.writer or self.waiting_writers: self.cond.wait()
            self.readers += 1
    def release_read(self):
        with self.cond:
            self.readers -= 1
            if self.readers == 0: self.cond.notify_all()
    def acquire_write(self):
        with self.cond:
            self.waiting_writers += 1
            while self.writer or self.readers: self.cond.wait()
            self.waiting_writers -= 1; self.writer = True
    def release_write(self):
        with self.cond:
            self.writer = False; self.cond.notify_all()
```

C++ has `std::shared_mutex` (`std::shared_lock` for readers, `std::unique_lock` for writers); Java has `ReentrantReadWriteLock` and `StampedLock`.

**A deadlock, reproduced (so you can explain it):**

```python
a, b = threading.Lock(), threading.Lock()
def t1():
    with a:
        time.sleep(0.1)
        with b: pass          # waits for b, held by t2
def t2():
    with b:
        time.sleep(0.1)
        with a: pass          # waits for a, held by t1 → deadlock
# Fix: both acquire in the same order (a then b), or use acquire(timeout=...) and back off.
```

**Java producer-consumer with BlockingQueue (the idiomatic answer in Java rounds):**

```java
BlockingQueue<Job> q = new ArrayBlockingQueue<>(100);
Runnable producer = () -> { while (true) q.put(nextJob()); };     // blocks when full
Runnable consumer = () -> { while (true) handle(q.take()); };     // blocks when empty
```

**Java `synchronized` + `wait/notify`:**

```java
class Counter {
    private int c = 0;
    public synchronized void inc() { c++; }                   // intrinsic lock on `this`
    public int get() { synchronized (this) { return c; } }
}
AtomicInteger hits = new AtomicInteger(); hits.incrementAndGet();
ConcurrentHashMap<String, Integer> m = new ConcurrentHashMap<>(); m.merge(key, 1, Integer::sum);
```

**Barrier / latch:**

```python
barrier = threading.Barrier(3)
def phase_worker():
    load(); barrier.wait(); process()        # nobody processes until all 3 have loaded
```

Java: `CountDownLatch(3)` (one-shot), `CyclicBarrier`, `Phaser`.

## 14. Futures, promises, and other concurrency models

- **Future/promise:** a placeholder for a result computed later (`concurrent.futures.Future`, `CompletableFuture`, Scala `Future`, JS `Promise`). Compose with callbacks/then instead of blocking.
- **Actor model** (Akka/Pekko, Erlang): actors own their state and communicate only via messages processed one at a time, so there are no locks. Fault tolerance via supervisors.
- **CSP / channels** (Go goroutines + channels): "don't communicate by sharing memory; share memory by communicating."
- **Fork-join / work stealing:** split tasks recursively; idle threads steal work from busy ones (Java ForkJoinPool, parallel streams).
- **Parallel patterns:** map-reduce, pipeline (stages connected by queues, which is exactly your telemetry pipeline), scatter-gather, bulk-synchronous phases.
- **Reactive streams:** asynchronous streams with **backpressure** (RxJava, Project Reactor, Akka Streams).

## 15. Amdahl's law (why adding threads stops helping)
`Speedup = 1 / ((1 − P) + P / N)`, where P is the parallel fraction and N the number of cores. With P = 0.9, even infinite cores give at most a **10×** speedup. Serial sections (locks, coordination) cap scalability. **Gustafson's law:** with bigger problems, the parallel part grows, so scaling looks better.

## 16. Completing concurrency from A to Z

### Concurrency course map
```
Foundations: processes vs threads · concurrency vs parallelism · scheduling & context switches · thread lifecycle
Problems: race conditions · data races · atomicity · visibility · ordering · deadlock · livelock · starvation · priority inversion
Tools: mutex · spinlock · semaphore · condition variable · monitor · RW lock · barrier/latch · atomics/CAS · thread-local storage
Design: thread-safety strategies · thread pools/executors · producer-consumer · futures/promises · async/await · actors · CSP · reactive
Memory: memory models · happens-before · memory barriers · false sharing · cache coherence
Advanced: lock-free & wait-free structures · ABA · RCU · transactional memory · parallel algorithms · SIMD/GPU
Practice: testing & debugging concurrent code · performance (Amdahl/Gustafson) · distributed concurrency (locks, leases)
```

### Thread-safety strategies (how to make code safe, best first)

1. **Don't share:** confine data to one thread (thread confinement, thread-local storage, message passing).
2. **Don't mutate:** share only **immutable** objects (no locks needed).
3. **Use thread-safe building blocks:** concurrent queues/maps, atomics, executors, rather than inventing your own.
4. **Synchronise:** protect every access to shared mutable state with the same lock; keep critical sections small.
5. **Document:** state which lock guards which data ("guarded by `mu`").

### Thread states in Java (often asked) and `wait`/`notify`
`NEW → RUNNABLE → (BLOCKED on a monitor | WAITING on wait()/join() | TIMED_WAITING on sleep/wait(t)) → RUNNABLE → TERMINATED`.

```java
synchronized (lock) {
    while (!condition) lock.wait();   // releases the monitor while waiting; ALWAYS in a loop (spurious wakeups)
    doWork();
}
synchronized (lock) { condition = true; lock.notifyAll(); }   // prefer notifyAll unless you're sure
```

`sleep()` keeps the locks it holds; `wait()` releases the monitor. `join()` waits for a thread to finish. `interrupt()` politely asks a thread to stop (it must check `isInterrupted()` or handle `InterruptedException`).

### A lock-free stack (Treiber stack) with CAS
```cpp
template <typename T>
class LockFreeStack {
    struct Node { T value; Node* next; };
    std::atomic<Node*> head{nullptr};
public:
    void push(T v) {
        Node* n = new Node{std::move(v), head.load()};
        while (!head.compare_exchange_weak(n->next, n)) {}   // retry until no one changed head in between
    }
    bool pop(T& out) {
        Node* old = head.load();
        while (old && !head.compare_exchange_weak(old, old->next)) {}
        if (!old) return false;
        out = std::move(old->value);
        // ⚠ deleting `old` here is unsafe if another thread still reads it → needs hazard pointers/epochs (memory reclamation),
        //   and the ABA problem applies. This is why lock-free code is hard; prefer proven libraries.
        return true;
    }
};
```

**Progress guarantees:** blocking (locks), **lock-free** (some thread always progresses), **wait-free** (every thread finishes in bounded steps). **RCU (read-copy-update)**, used in the Linux kernel, lets readers proceed without locks while writers publish new versions.

### How an async event loop works (Python asyncio, Node.js)
```
          ┌────────────────── EVENT LOOP (one thread) ───────────────────┐
          │ 1. run every ready task until it hits an `await`             │
          │ 2. the awaited I/O is registered with the OS (epoll/kqueue)  │
          │ 3. ask the OS: "which sockets/timers are ready?"             │
          │ 4. mark the corresponding tasks ready → go to 1              │
          └──────────────────────────────────────────────────────────────┘
 task A: await db.query()  ──suspended──►  (loop runs task B, C …)  ──result ready──► A resumes
 ⚠ any CPU-heavy or blocking call in a task freezes the whole loop
```

**Structured concurrency:** child tasks are bound to a scope that waits for all of them and cancels the rest on failure (Python `TaskGroup`, Kotlin coroutine scopes, Java's structured concurrency API), so no task leaks or is orphaned.

### Concurrency across languages

| Language | Main tools |
|---|---|
| C/C++ | pthreads, `std::thread`, mutex/condition_variable/atomic, OpenMP, TBB |
| Java/Scala | threads, `synchronized`, `java.util.concurrent`, `CompletableFuture`, virtual threads, Akka/Pekko actors, Scala Futures |
| Python | `threading` (I/O), `multiprocessing` (CPU), `asyncio`, `concurrent.futures` |
| Go | goroutines + channels (CSP), `sync.Mutex`, `select` |
| JavaScript | a single-threaded event loop + promises/async; worker threads |
| Rust | ownership rules prevent data races at compile time; `Send`/`Sync`, `tokio` async |

### Data parallelism: SIMD and GPUs
**SIMD** (single instruction, multiple data) processes several numbers per CPU instruction (vectorised NumPy, DuckDB, Arrow). **GPUs** run thousands of simple threads at once, which is ideal for matrix maths (LLM training/inference).

## Interview Q&A

**Q: Mutex vs semaphore?** Ownership + locking vs counting + signalling.
**Q: How do you prevent deadlock?** Global lock ordering, minimal lock scope, try-lock with timeout, no callbacks under locks.
**Q: What's a spurious wakeup?** A thread wakes from a condition wait without a notify, so always re-check the condition in a `while` loop.
**Q: How many threads in a pool?** CPU-bound ≈ cores; I/O-bound more; measure.
**Q: Is Python multithreading useful?** Yes for I/O-bound (the GIL is released while waiting); no for CPU-bound (use processes).
**Q: How did you debug an intermittent failure?** The cron overlap story: pattern across runs → time window → found the cron → decorator fix → validated by looping.

## Quick revision

- Race = timing-dependent result; `count++` and check-then-act are both unsafe.
- Mutex (owned lock), spinlock (busy wait, short sections), semaphore (count/signal), condition variable (wait in a while loop), RW lock.
- CAS → lock-free; ABA problem. Visibility, reordering, happens-before, false sharing.
- Deadlock: 4 conditions; lock ordering. Thread pools + bounded queues = backpressure.
- Producer-consumer in C++ and Python. Odd/even printing. Dining philosophers.
- Async: cheap and scalable, but never block the loop.

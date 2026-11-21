# 04 · Scala, the JVM, and Spring Boot

**Why Scala exists:** Martin Odersky (2004) wanted to combine **object-oriented and functional programming** on the **JVM**. You get Java's huge ecosystem (Kafka clients, Elasticsearch clients, Spark) plus immutability, pattern matching, powerful types and concise code. Big data tools grew up with it: Kafka's broker was originally written in Scala, and Spark is written in Scala.

**Why you used it:** the telemetry data platform at Dell was a Scala service. The work was **transformation-heavy** (parse logs → map → filter → convert to Parquet/JSON/XML), where Scala's immutable collections, pattern matching and concise transformations shine. It ran on the JVM, so it used the mature Kafka, RabbitMQ and Elasticsearch Java clients.

**Honest trade-off to mention:** a steeper learning curve, a smaller hiring pool, and slower compile times than Java.

---

## Start here: Scala, the JVM and Spring in plain words

### Scala
**What:** a language that runs on the **Java Virtual Machine (JVM)**, mixing object-oriented programming (classes, like Java) with **functional programming** (functions as values, immutability, transforming data with `map`/`filter`).
**Analogy for functional style:** an **assembly line**. Raw parts (data) go in, each station applies one transformation and passes a *new* item along; no station modifies the item another station is holding. That makes parallel work safe.

```
log files ──► parse ──► filter(errors) ──► map(toRecord) ──► groupBy(product) ──► write Parquet
            (each step returns a NEW collection; nothing is mutated in place)
```

**Immutability in plain words:** a printed document vs a whiteboard. Anyone can read a printed copy at the same time without worrying that someone is erasing it. Immutable data can be shared between threads with no locks.
**Pure function:** the same input always gives the same output, with no side effects (like a calculator). Easy to test and to run in parallel.

### The JVM in plain words
**What:** a virtual computer that runs **bytecode**. Java, Scala and Kotlin all compile to bytecode, so they all run on any machine with a JVM ("write once, run anywhere"). It also manages memory for you (garbage collection) and speeds up hot code at runtime (JIT).

```
 .java / .scala ──compile──► .class files (bytecode) ──► ┌──────────────── JVM ─────────────────┐
                                                         │ Class loader subsystem               │
                                                         │   (load → verify → link → init)      │
                                                         │ Runtime data areas:                  │
                                                         │   Heap (objects; young + old gen)    │
                                                         │   Metaspace (class metadata)         │
                                                         │   Per thread: stack, PC register     │
                                                         │ Execution engine:                    │
                                                         │   interpreter + JIT compiler (hot    │
                                                         │   code → native machine code)        │
                                                         │   Garbage collector (G1/ZGC…)        │
                                                         │ JNI → native libraries               │
                                                         └──────────────────────────────────────┘
```

**Garbage collection in plain words:** a cleaning crew that walks through memory, finds objects nobody references any more, and frees them. Most objects die young, so the crew cleans the "nursery" (young generation) often and quickly, and the "archive" (old generation) rarely. While it cleans, the program may pause briefly ("stop-the-world"), which matters for latency.

### Spring Boot in plain words
**What:** a framework that gives a Java service a ready-made skeleton: a web server, configuration, database access, security, health checks. You write the business logic.
**Dependency injection analogy:** a restaurant kitchen where the manager (the **Spring container**) hands each cook the tools they need when they start their shift. Cooks don't go and buy their own knives (`new SomeService()`). So you can swap a real database for a fake one in tests by handing over different tools.

```
HTTP request
   ▼
Embedded Tomcat ──► DispatcherServlet (front controller: routes requests)
                         ▼
                 @RestController  (HTTP layer: parse JSON, validate)
                         ▼
                 @Service         (business logic, @Transactional)
                         ▼
                 @Repository      (Spring Data JPA → Hibernate → JDBC → database)
Spring IoC container: creates all these beans, wires them together, applies proxies (transactions, security)
Actuator: /actuator/health, /actuator/prometheus for Kubernetes probes and monitoring
```

## Part A: Scala essentials

### 0. Basics: program structure, types, loops, strings, classes, exceptions
```scala
object Main {                                   // a singleton object holds main (Scala 2 style)
  def main(args: Array[String]): Unit = println(s"Hello ${args.headOption.getOrElse("world")}")
}
@main def run(name: String): Unit = println(s"Hi $name")   // Scala 3 entry point
```

- **Basic types:** `Int`, `Long`, `Double`, `Float`, `Boolean`, `Char`, `String`, `Byte`, `Short`, `Unit`. All are objects (`1.toString`, `1 + 2` is `1.+(2)`).
- **String interpolation:** `s"Hi $name, ${x + 1}"`, `f"$price%.2f"` (printf-style), `raw"\n stays literal"`. Multi-line `"""..."""` with `.stripMargin`.
- **Loops:** `for (i <- 0 until 10)` (0..9), `for (i <- 1 to 10 by 2)`, `while (cond) { … }`. Idiomatic Scala prefers `map`/`foreach`/recursion over index loops. There's no `break` keyword (use `scala.util.control.Breaks` or restructure).
- **Classes:**

```scala
class Cluster(val name: String, private var nodes: Int = 3) {   // primary constructor; val = public read-only field
  require(nodes > 0, "need at least one node")                     // validation in the constructor body
  def this(name: String) = this(name, 3)                           // auxiliary constructor
  def addNode(): Unit = nodes += 1
  override def toString = s"Cluster($name, $nodes)"
}
abstract class Parser { def parse(raw: String): Record }           // abstract class (can take constructor params)
class UnityParser extends Parser { override def parse(raw: String) = ??? }   // ??? = "not implemented yet"
```

- **Access modifiers:** public by default, `private`, `protected`, and scoped: `private[pkg]`.
- **Exceptions:** `try { … } catch { case e: IOException => …; case NonFatal(e) => … } finally { … }`. `try` is an expression (returns a value). Idiomatic code prefers `Try`/`Either`.
- **Mutable collections** (use locally, for performance): `scala.collection.mutable.{ArrayBuffer, ListBuffer, Map, HashSet}`. `Array` is a mutable JVM array.
- **Tuples:** `val t = ("PowerStore", 420); t._1`; `val (product, size) = t`.

### 1. Values, types, expressions
```scala
val name: String = "Gopal"     // immutable (preferred)
var count = 0                  // mutable (avoid)
lazy val config = loadConfig() // computed on first use
val max = if (a > b) a else b  // if is an EXPRESSION (returns a value)
def square(x: Int): Int = x * x
```

- **Everything is an expression.** Even blocks `{ ... }` return their last value.
- **Type inference:** you rarely write types for local values.
- **`Unit`** is like `void`. **`Nothing`** is the bottom type (e.g. the type of `throw`). **`Any`** is the top type.

### 2. Immutability: why it matters for pipelines
Immutable data can be **shared across threads without locks**, because nobody can change it. In a parallel processing pipeline (many collections being processed at once) that removes a whole class of race conditions. Transformations return **new** collections instead of mutating the old ones.

### 3. Case classes and pattern matching (the core of Scala)
```scala
case class Collection(systemId: String, product: String, sizeMb: Long)
val c = Collection("APM123", "PowerStore", 420)
val bigger = c.copy(sizeMb = 500)          // immutable update
// Case classes give you: equals/hashCode by value, toString, copy, and pattern matching

sealed trait Event                          // sealed = all subtypes are in this file
case class Uploaded(id: String) extends Event
case class Failed(id: String, reason: String) extends Event
case object Heartbeat extends Event

def handle(e: Event): String = e match {
  case Uploaded(id)                       => s"process $id"
  case Failed(id, r) if r.contains("corrupt") => s"dead-letter $id"
  case Failed(id, r)                      => s"retry $id"
  case Heartbeat                          => "ok"
}   // the compiler warns if a case is missing (exhaustiveness checking, thanks to `sealed`)
```

**Algebraic data types (ADTs):** a sealed trait plus case classes model "one of these shapes", and the compiler checks you handled every shape. Perfect for "per product line" parsing: `PowerStore | Unity | ESXi | SOS …`.

### 4. Option, Either, Try: no nulls, explicit errors
```scala
val maybeUser: Option[User] = users.find(_.id == 7)     // Some(user) or None
maybeUser.map(_.name).getOrElse("unknown")

def parse(s: String): Either[String, Int] =
  s.toIntOption.toRight(s"not a number: $s")              // Left = error, Right = value

import scala.util.{Try, Success, Failure}
Try(riskyParse(line)) match {
  case Success(v) => v
  case Failure(e) => log.warn(e.getMessage); default
}
```

Why: **null-pointer bugs disappear**, and error handling is visible in the types instead of hidden exceptions.

### 5. Collections and higher-order functions
```scala
val sizes = collections.filter(_.product == "PowerStore").map(_.sizeMb)
val total = sizes.sum
val byProduct: Map[String, List[Collection]] = collections.groupBy(_.product)
val counts = collections.groupBy(_.product).view.mapValues(_.size).toMap
val all = files.flatMap(f => parseLines(f))         // flatMap = map + flatten
val sum = nums.foldLeft(0)(_ + _)                   // fold = reduce with an initial value
```

- `map`, `filter`, `flatMap`, `foldLeft`, `reduce`, `groupBy`, `collect` (filter + map with a partial function), `zip`, `take`/`drop`, `exists`/`forall`.
- Immutable by default (`List`, `Vector`, `Map`, `Set`). `List` is a singly linked list (fast prepend); `Vector` is good for indexed access.
- **Views and iterators** are lazy, so huge files don't load into memory at once.

### 6. For-comprehensions
```scala
for {
  file   <- files
  line   <- readLines(file)
  if line.contains("ERROR")
} yield line.trim
// compiles to files.flatMap(f => readLines(f).withFilter(...).map(...))
```

They also work on `Option`, `Either` and `Future`, which makes sequential async or error-prone steps readable.

### 7. Traits, objects, companions
```scala
trait Parser { def parse(raw: String): Record; def name: String = "base" }   // like an interface with defaults
object Config { val timeoutSec = 300 }               // singleton
class Collector private (id: String)
object Collector { def apply(id: String) = new Collector(id) }   // companion object: factory / "static" members
```

- **Traits** can be mixed into classes (`class X extends A with B`), resolved by linearisation. This is how you'd build a per-product-line parser plugin system (the Strategy pattern).
- Scala has **no `static`**. Use objects.

### 8. Futures (concurrency)
```scala
import scala.concurrent.{Future, ExecutionContext}
implicit val ec: ExecutionContext = ExecutionContext.global
val f: Future[Result] = Future { processCollection(c) }      // runs on a thread pool
f.map(r => publish(r)).recover { case e => sendToDeadLetter(c, e) }
```

- Non-blocking composition with `map`/`flatMap`/`recover`. Avoid `Await.result` in production code paths.
- **Akka** (actors, Akka Streams) is a well-known Scala concurrency toolkit: actors process messages one at a time, so there's no shared mutable state. Note: Akka changed to a business source licence in 2022, and the open-source fork is **Apache Pekko**.

### 9. Implicits / givens
Scala 2 `implicit` (Scala 3 `given`/`using`) lets the compiler pass context automatically: the `ExecutionContext` above, JSON codecs, type classes. Powerful, but overuse makes code hard to read. That's a fair criticism to mention.

### 10. Tail recursion
```scala
import scala.annotation.tailrec
@tailrec def sum(xs: List[Int], acc: Int = 0): Int = xs match {
  case Nil => acc
  case h :: t => sum(t, acc + h)       // the last call is the recursion → compiled into a loop, no stack overflow
}
```

### 11. Build: sbt vs Maven
Scala projects usually use **sbt**, but Maven works too (with the scala-maven-plugin). Dependencies come from Maven Central either way. See file 17 for Maven.

---

### 12. Advanced Scala

**Functions as values, currying, partial application:**

```scala
val add: (Int, Int) => Int = _ + _
def addC(a: Int)(b: Int): Int = a + b         // curried
val add5 = addC(5) _                           // partially applied → Int => Int
def withRetry[T](times: Int)(block: => T): T = // by-name parameter: block is evaluated lazily, each time it's used
  try block catch { case _ if times > 1 => withRetry(times - 1)(block) }
withRetry(3) { callService() }                 // reads like a built-in control structure
```

**Partial functions** (defined for some inputs only): `val parseKnown: PartialFunction[String, Int] = { case "one" => 1; case "two" => 2 }`, used by `collect`.

**Generics, variance and bounds:**

```scala
class Box[+A](val value: A)     // covariant: Box[Dog] is a Box[Animal] (safe for read-only containers, like List)
trait Sink[-A] { def put(a: A): Unit }   // contravariant: Sink[Animal] can be used as a Sink[Dog]
def max[T <: Comparable[T]](a: T, b: T): T = if (a.compareTo(b) > 0) a else b   // upper bound
def prepend[B >: A](b: B): List[B]       // lower bound (how List.:: stays type-safe)
```

**Type classes** (behaviour for types you don't own, via implicits/givens):

```scala
trait JsonEncoder[A] { def encode(a: A): String }
given JsonEncoder[Collection] with { def encode(c: Collection) = s"""{"id":"${c.systemId}"}""" }   // Scala 3
def toJson[A](a: A)(using enc: JsonEncoder[A]) = enc.encode(a)
```

**Lazy collections:** `LazyList` (formerly `Stream`), `.view`, `Iterator` for streaming big files.

**Scala 2 vs Scala 3:** Scala 3 (2021) brought new syntax (optional braces, `given`/`using` instead of implicits, `enum`, extension methods, union/intersection types, `@main`). Many production codebases are still on 2.12/2.13.

**Testing:** ScalaTest or MUnit (`"parser" should "parse PowerStore logs" in { … }`), ScalaCheck for property-based tests.

**Spark (the most common Scala data framework):** a distributed engine for batch and streaming. RDDs → DataFrames/Datasets; **transformations are lazy** (map, filter, join build a plan), **actions** trigger execution (count, collect, write). Narrow vs wide transformations (wide ones cause a **shuffle**: expensive). Reads and writes Parquet natively. If Spark comes up, say honestly whether you used it directly. Your resume work is Scala services with Kafka/RabbitMQ/Elasticsearch clients, so don't claim Spark unless you did.

---

### 13. Completing Scala from A to Z

**Scala course map**

```
Setup & tools: JDK · Scala 2 vs 3 · sbt · scala-cli · the REPL · IntelliJ/Metals
Basics: val/var · types · expressions · strings & interpolation · control structures · functions · tuples
OOP: classes · constructors · objects & companions · traits & mixins · case classes · sealed hierarchies · enums
FP: immutability · pure functions · higher-order functions · closures · currying · partial functions · recursion/@tailrec
Collections: hierarchy · immutable vs mutable · operations · performance · views/LazyList
Pattern matching: literals · types · case classes · guards · extractors (unapply) · sealed exhaustiveness
Error handling: Option · Either · Try · exceptions
Types: type inference · generics · variance · bounds · type classes · given/using · extension methods · opaque types
Concurrency: Futures/Promises · ExecutionContexts · Akka/Pekko actors & streams · effect libraries (cats-effect, ZIO)
Interop & ecosystem: Java interop · sbt builds · testing (ScalaTest, MUnit, ScalaCheck) · Spark
```

**Setup and tools:** install a JDK (17/21) and Scala via Coursier (`cs setup`); `scala-cli run hello.scala` for scripts; **sbt** for projects:

```scala
// build.sbt
ThisBuild / scalaVersion := "3.3.4"
lazy val root = (project in file("."))
  .settings(
    name := "telemetry-processor",
    libraryDependencies ++= Seq(
      "org.apache.kafka" % "kafka-clients" % "3.8.0",          // a Java library: one %
      "org.scalatest" %% "scalatest" % "3.2.19" % Test          // a Scala library: %% appends the Scala version
    )
  )
```

`sbt compile`, `sbt test`, `sbt run`, `sbt assembly` (fat JAR via a plugin), `sbt console` (REPL with the project's classpath).

**The collections hierarchy:**

```
Iterable
├── Seq ── IndexedSeq (Vector, ArraySeq, Range, String)  ── fast random access
│      └── LinearSeq (List, LazyList, Queue)              ── fast head/tail
├── Set (HashSet, TreeSet/SortedSet, BitSet)
└── Map (HashMap, TreeMap/SortedMap, VectorMap)
Immutable by default (scala.collection.immutable); mutable versions in scala.collection.mutable
(ArrayBuffer, ListBuffer, mutable.Map/Set, Queue, Stack)
```

| Collection | head/prepend | append | random access | Use |
|---|---|---|---|---|
| `List` | O(1) | O(n) | O(n) | recursion, prepending |
| `Vector` | ~O(1) | ~O(1) | ~O(1) (effectively constant) | the general-purpose immutable sequence |
| `ArrayBuffer` | O(n) | O(1) amortised | O(1) | local mutable building |
| `Map`/`Set` (hash) | — | ~O(1) | lookup ~O(1) | lookups |

**Common operations:** `map, flatMap, filter, filterNot, collect, foldLeft, reduce, groupBy, groupMapReduce, partition, sortBy, zip, zipWithIndex, sliding, grouped, take/drop/takeWhile, find, exists, forall, count, distinct, toMap/toList/toSet, mkString`.

```scala
val counts = collections.groupMapReduce(_.product)(_ => 1)(_ + _)    // Map(product -> count) in one pass
val avgSize = collections.map(_.sizeMb).sum.toDouble / collections.size
collections.sortBy(c => (-c.sizeMb, c.systemId)).take(10).mkString("\n")
```

**Strings:** `s"…"`, `f"…"`, `"a,b".split(",")`, `.trim`, `.toUpperCase`, `.contains`, `.startsWith`, `.toIntOption`, `"ab" * 3`, multi-line `"""…""".stripMargin`.

**Pattern matching, further:**

```scala
x match {
  case 0 | 1                       => "small"                       // alternatives
  case n: Int if n < 0             => "negative"                     // a type pattern + guard
  case s: String                   => s"string $s"
  case List(first, _*)             => s"list starting $first"        // sequence pattern
  case (a, b)                      => s"tuple $a $b"
  case Collection(id, "Unity", sz) => s"unity $id"                   // case-class deconstruction with a literal
  case _                           => "other"
}
object Email { def unapply(s: String): Option[(String, String)] =  // a custom EXTRACTOR
  s.split("@") match { case Array(u, d) => Some((u, d)); case _ => None } }
"asha@dell.com" match { case Email(user, domain) => println(domain) }
```

**Traits, linearisation, self-types:** a class mixing traits `class A extends B with C with D` resolves `super` calls right to left (D → C → B): the stackable trait pattern (logging, retry layers).
**Scala 3 features:** `enum Status { case Received, Processed, Failed }`, extension methods (`extension (s: String) def isSku: Boolean = …`), `given`/`using`, **opaque types** (`opaque type SystemId = String`: a zero-cost distinct type), union types (`Int | String`), optional braces, `@main`.
**Functional programming concepts:**

- **Referential transparency:** an expression can be replaced by its value without changing behaviour (pure functions).
- **Functor** (something you can `map` over: `List`, `Option`, `Future`), **monad** (something you can `flatMap` over, chaining computations: which is what for-comprehensions desugar to).
- **Effect systems** (cats-effect, ZIO) model side effects as values for safer concurrency and resource handling.

**Java interop:** use any Java library directly; convert collections with `import scala.jdk.CollectionConverters._` (`javaList.asScala`, `scalaSeq.asJava`); Java `null`s become `Option(x)` at the boundary.

**Testing:**

```scala
import org.scalatest.funsuite.AnyFunSuite
class ParserSpec extends AnyFunSuite {
  test("parses a PowerStore line") { assert(Parser.parse("ps|42").sizeMb == 42) }
}
// property-based (ScalaCheck): forAll { (xs: List[Int]) => xs.reverse.reverse == xs }
```

## Part B: The JVM (asked whenever Java/Scala is on your resume)

### 1. How JVM code runs
```
.scala/.java → compiler → .class (bytecode) → JVM: class loader → bytecode verifier → interpreter + JIT compiler → native code
```

- **Write once, run anywhere:** the bytecode is platform independent; the JVM is platform specific.
- **JIT (just-in-time) compilation:** the HotSpot JVM profiles hot methods and compiles them to optimised native code at runtime. That's why JVM services "warm up" (slow first requests, fast later).

### 2. JVM memory

| Area | Holds |
|---|---|
| **Heap** | All objects; shared by threads; managed by the GC. Young generation (Eden + Survivor) and Old generation |
| **Stack (per thread)** | Frames, local primitives, references |
| **Metaspace** | Class metadata (replaced PermGen in Java 8); native memory |
| Code cache | JIT-compiled code |

- `-Xms` / `-Xmx` set the initial and max heap. **In containers**, the JVM reads cgroup limits (Java 10+). Set `-XX:MaxRAMPercentage` so the heap fits the pod's memory limit, or Kubernetes will OOMKill the pod.
- `OutOfMemoryError: Java heap space` (too many live objects, or a leak) vs `StackOverflowError` (recursion too deep).

### 3. Garbage collection

- **Generational hypothesis:** most objects die young. So new objects go into Eden; minor GCs are frequent and cheap; survivors get promoted to the Old generation; major GCs are rare and expensive.
- **Collectors:** **G1** (default since Java 9; region-based, targets a pause time), **ZGC** and **Shenandoah** (very low pauses, large heaps), Parallel (throughput), Serial (small heaps).
- **Stop-the-world pauses** hurt latency SLAs. Tune by choosing the collector, sizing the heap, and reducing allocation churn.
- **Memory leaks in Java** happen when objects stay **reachable** by mistake: static collections that keep growing, caches without eviction, listeners never removed. Diagnose with a heap dump (`jmap`, Eclipse MAT) and GC logs.
- Tools: `jps`, `jstack` (thread dump, for deadlocks), `jmap`, `jcmd`, VisualVM, JFR (Java Flight Recorder).

### 3b. Class loading
Loading → linking (verify, prepare, resolve) → initialisation. **Class loader hierarchy:** bootstrap (core JDK) → platform → application (classpath); parent-first delegation. `ClassNotFoundException` (dynamic load failed) vs `NoClassDefFoundError` (the class was there at compile time but missing or failing at runtime; often a dependency/version conflict, the kind of thing transitive-dependency upgrades can cause).

### 3c. Java essentials (many companies interview in Java, so know these)

- **OOP in Java:** classes, interfaces (with `default` and `static` methods since Java 8), abstract classes, single class inheritance + multiple interfaces, `final` (class can't be extended, method can't be overridden, variable can't be reassigned), `static`, access modifiers (public, protected, package-private, private).
- **String:** immutable (thread-safe, cacheable, safe as map keys); the string pool; `StringBuilder` for building strings in loops; `equals()` vs `==`.
- **Wrapper classes and autoboxing:** `Integer` caching of -128..127 (`==` surprises: always use `equals`).
- **Exceptions:** **checked** (must be declared/handled: `IOException`) vs **unchecked** (`RuntimeException`: `NullPointerException`, `IllegalArgumentException`) vs `Error` (`OutOfMemoryError`). try-with-resources (`try (var in = new FileInputStream(f)) {…}`) auto-closes.
- **Generics and type erasure:** generic types are erased at runtime (`List<String>` and `List<Integer>` are the same class), so you can't do `new T()` or `instanceof List<String>`. Wildcards: `? extends T` (read/producer), `? super T` (write/consumer), "PECS".
- **Collections framework:** `List` (ArrayList, LinkedList), `Set` (HashSet, LinkedHashSet, TreeSet), `Map` (HashMap, LinkedHashMap, TreeMap, ConcurrentHashMap), `Queue`/`Deque` (ArrayDeque, PriorityQueue). `Comparable` (natural order) vs `Comparator` (custom order). Fail-fast iterators throw `ConcurrentModificationException`.
- **Java 8+ features:** lambdas, functional interfaces (`Function`, `Predicate`, `Supplier`, `Consumer`), **Streams API** (`list.stream().filter(...).map(...).collect(Collectors.groupingBy(...))`; lazy; parallel streams), `Optional`, the new Date/Time API (`java.time`). Java 11: `var` (10), HTTP client. Java 17: **records**, **sealed classes**, pattern matching for `instanceof`, text blocks. Java 21: **virtual threads**, pattern matching for `switch`, sequenced collections.

```java
record Collection(String systemId, String product, long sizeMb) {}   // immutable data class, like a Scala case class
Map<String, Long> countByProduct = collections.stream()
    .collect(Collectors.groupingBy(Collection::product, Collectors.counting()));
```

- **equals/hashCode contract;** `Object` methods (`toString`, `equals`, `hashCode`, `clone`, `wait`/`notify`).
- **Immutability recipe:** final class, private final fields, no setters, defensive copies.

### 4. Java concurrency basics (for JVM questions)

- `synchronized` (intrinsic lock), `volatile` (visibility + ordering for one variable, **not** atomicity for `count++`), `java.util.concurrent` (`ExecutorService`, `ConcurrentHashMap`, `AtomicInteger`, `CountDownLatch`, `BlockingQueue`), `CompletableFuture`.
- **Java 21 virtual threads** (Project Loom): very cheap threads, so blocking-style code scales like async. A good "modern Java" talking point.

### 5. Java collections internals (commonly asked)

- **`HashMap`:** array of buckets; key → `hashCode()` → bucket index. Collisions → linked list, which turns into a **red-black tree once a bucket has more than 8 entries** (Java 8+). Resizes (doubles) when size > capacity × load factor (0.75). **Not thread-safe.**
- **`ConcurrentHashMap`:** thread-safe with fine-grained locking/CAS per bucket; reads mostly lock-free.
- `equals()` and `hashCode()` must be consistent: equal objects must have equal hash codes.
- `ArrayList` (dynamic array) vs `LinkedList`, `TreeMap` (red-black tree, sorted), `LinkedHashMap` (insertion order; can be an LRU with `removeEldestEntry`).

---

## Part C: Spring Boot (you fixed 50+ vulnerabilities in a Spring Boot service)

### Why Spring Boot exists
Plain Spring needed lots of XML/config. **Spring Boot** gives **auto-configuration**, **starter** dependencies and an **embedded server** (Tomcat), so a production-ready REST service is one `main` method plus annotations. "Convention over configuration."

### Core ideas

- **IoC / dependency injection:** the Spring container creates objects ("beans") and injects their dependencies. You don't `new` your dependencies, which makes code testable (inject mocks) and loosely coupled.

```java
@RestController
@RequestMapping("/health")
class HealthController {
    private final HealthService service;
    HealthController(HealthService service) { this.service = service; }   // constructor injection (preferred)
    @GetMapping public HealthStatus get() { return service.check(); }
}
@Service class HealthService { ... }
```

- **Annotations:** `@SpringBootApplication`, `@RestController`, `@Service`, `@Repository`, `@Component`, `@Autowired`, `@Configuration` + `@Bean`, `@Value`/`@ConfigurationProperties`.
- **Bean scopes:** singleton (default), prototype, request, session.
- **Spring Boot Actuator:** `/actuator/health`, `/actuator/metrics`, `/actuator/prometheus`. That's how Kubernetes probes and Prometheus scraping hook into a Spring service.
- **Starters:** `spring-boot-starter-web`, `-data-jpa`, `-actuator`, `-security`. Each pulls a curated, version-aligned set of **transitive dependencies**.

### Layered architecture of a Spring Boot service
```
HTTP request → @RestController (validation, DTOs) → @Service (business logic, @Transactional)
            → @Repository (Spring Data JPA) → database
```
```java
@Entity class Order { @Id @GeneratedValue Long id; String status; @Version Long version; }  // @Version = optimistic locking
interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByStatus(String status);          // the query is derived from the method name
}
@Service class OrderService {
    private final OrderRepository repo;
    OrderService(OrderRepository repo) { this.repo = repo; }
    @Transactional public Order cancel(Long id) {
        Order o = repo.findById(id).orElseThrow(() -> new NotFoundException(id));
        o.status = "CANCELLED"; return o;              // dirty checking: saved on commit
    }
}
@RestControllerAdvice class Errors {                  // central exception → HTTP mapping
    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<Map<String, String>> nf(NotFoundException e) { return ResponseEntity.status(404).body(Map.of("code", "not_found")); }
}
```

- **Configuration:** `application.yml`/`.properties`, **profiles** (`application-prod.yml`, `--spring.profiles.active=prod`), `@ConfigurationProperties`, environment variables override files.
- **JPA/Hibernate:** entities, relationships (`@OneToMany`, lazy vs eager fetching; the **N+1** problem → `JOIN FETCH`/entity graphs), `@Transactional` (propagation, rollback on unchecked exceptions by default; doesn't apply to self-invocation, because it's proxy-based).
- **Validation:** `@Valid` + `@NotNull`, `@Size` on request DTOs.
- **Security:** Spring Security filter chain (authentication → authorisation), JWT/OAuth2 resource server.
- **Testing:** `@SpringBootTest` (full context), `@WebMvcTest` (controller slice + MockMvc), `@DataJpaTest`, Mockito `@MockBean`, Testcontainers for real databases.
- **Observability:** Actuator + Micrometer → `/actuator/prometheus`.
- **AOP (aspect-oriented programming):** cross-cutting concerns (transactions, logging, security) applied via proxies, which is how `@Transactional` works.

### Why your vulnerability work was about *transitive* dependencies
A starter pulls in dozens of libraries you never declared (e.g. Jackson, Tomcat, Netty, Log4j/Logback). A CVE in any of them shows up in **SCA** scans (BlackDuck) even though your code never mentions it. Fixes:

1. Upgrade the Spring Boot parent/BOM (it bumps many transitive versions together; the safest option).
2. Override a specific version in Maven `<dependencyManagement>` (forces the patched version everywhere).
3. `<exclusions>` to drop a library you don't need.
4. Run `mvn dependency:tree` to see **who** pulls the vulnerable library in.
5. Re-run the scans plus the regression tests to confirm nothing broke (version bumps can change behaviour).
Full story in [25_My_Dell_Experience.md](25_My_Dell_Experience.md) and the security details in [19_Security_DevSecOps.md](19_Security_DevSecOps.md).

---

## Interview Q&A

**Q: Why Scala and not Java for the telemetry pipeline?**
Transformation-heavy code. Immutable collections, case classes and pattern matching express "parse each product line's format and map it to an output schema" with much less code and fewer bugs. And because it's on the JVM we still used the standard Kafka, RabbitMQ and Elasticsearch clients. The downsides are a steeper learning curve and slower builds.

**Q: What's a case class?** An immutable data class with value equality, `copy`, `toString`, and pattern-matching support built in.

**Q: Option vs null?** `Option` forces the caller to handle absence at compile time. `null` fails at runtime.

**Q: Future vs Thread?** A Future is a value that will arrive later; it runs on a pooled ExecutionContext and composes with map/flatMap. Raw threads are expensive and don't compose.

**Q: Explain JVM GC and how it affects latency.** Generational collection, stop-the-world pauses; choose G1/ZGC, size the heap to the container limit, reduce allocation.

**Q: How does HashMap work?** Buckets, hashCode, collisions → list → tree after 8, resize at 0.75 load, not thread-safe.

## Quick revision

- Scala = OOP + FP on the JVM. `val`, case classes, sealed traits + pattern matching, Option/Either/Try, map/flatMap/fold, for-comprehensions, Futures.
- Immutability → safe parallelism without locks.
- JVM: bytecode + JIT, heap generations, G1/ZGC, OOM vs StackOverflow, container memory limits.
- Spring Boot = auto-config + starters + embedded server + DI. Actuator for health/metrics. Transitive CVEs → BOM upgrade, dependencyManagement, exclusions, `mvn dependency:tree`.

# 05 · OOP, SOLID, Design Patterns, and Low-Level Design (LLD)

**Why OOP exists:** as programs grew, procedural code with shared global data became impossible to change safely. OOP groups **data with the behaviour that owns it**, hides internals behind interfaces, and lets you extend behaviour without editing working code. The goal: **manage complexity and change**.

**What the LLD round tests:** given a vague problem ("design a parking lot"), can you find the entities, define clean classes and interfaces, apply the right patterns, handle concurrency and edge cases, and write **working code** in 60–90 minutes? At SDE 2 they expect extensibility ("what if we add electric vehicle spots?") and thread safety.

> **Day 3 = Part A (OOP + SOLID). Day 15 = Part B (patterns) + Part C (LLD problems).**

---

# Start here: OOP, design patterns and LLD in plain words

### OOP
**Before OOP**, programs were long lists of functions sharing global data. Change one thing and something far away breaks.
**OOP's idea:** model the program as **objects** (things) that **own their data and the actions on it**, like real-world objects. A `BankAccount` keeps its balance private and only lets you `deposit()` or `withdraw()` through rules it enforces.

**The four pillars, with a car:**

```
ENCAPSULATION  You use the pedals and the steering wheel; the engine's internals are hidden under the bonnet.
ABSTRACTION    "Drive" is a simple idea; you don't need to know about fuel injection to use it.
INHERITANCE    An ElectricCar IS-A Car: it reuses everything a Car has, and adds charging.
POLYMORPHISM   "Start the car": a petrol car cranks its engine, an electric car powers its motor.
               Same command, different behaviour depending on the actual object.
```

**Class vs object:** a class is the blueprint ("house design"); objects are the houses built from it, each with its own paint and furniture (state).

**SOLID in one breath:** each class does one job (S); add features by adding code, not editing working code (O); subclasses must behave like their parents (L); small focused interfaces (I); depend on abstractions, not concrete classes (D).

### Design patterns
**What:** named, proven solutions to recurring design problems, a shared vocabulary ("use a Strategy here") like architects saying "open-plan kitchen".

```
CREATIONAL (how objects are made)   STRUCTURAL (how objects fit together)   BEHAVIOURAL (how objects talk)
  Singleton, Factory,                 Adapter, Decorator, Facade,             Strategy, Observer, State,
  Abstract Factory, Builder,          Proxy, Composite, Flyweight             Command, Template Method,
  Prototype                                                                    Chain of Responsibility, Iterator…
```

Quick analogies: **Adapter** = a travel plug adapter; **Decorator** = adding toppings to a pizza without changing the base; **Facade** = a hotel concierge who handles complicated things for you; **Observer** = a YouTube subscription; **Strategy** = choosing a route in Google Maps (fastest / shortest / no tolls); **State** = a traffic light behaving differently in red/yellow/green; **Factory** = a restaurant kitchen: you order "pizza" and don't care which chef makes it; **Builder** = ordering a custom sandwich step by step.

### Low-level design (LLD)
**What:** designing the **classes, interfaces, relationships and code** for one component (as opposed to HLD, which designs the whole system's services, databases and networks).

```
HLD:  [Client] → [API Gateway] → [Booking Service] → [DB] + [Payment Service] + [Cache]     (boxes = services)
LLD:  inside Booking Service:  BookingController → BookingService → SeatLockProvider
                               Show ◇── Seat ;  Booking ── Payment ;  «interface» PaymentGateway   (boxes = classes)
```

# Part A: OOP and SOLID

## 0. Basics: classes, objects, constructors, methods

- A **class** is a blueprint (fields + methods). An **object** is an instance with its own state. **Identity, state, behaviour.**
- **Constructor:** initialises a new object (default, parameterised, copy; overloading constructors; chaining with `this(...)`/`super(...)` in Java; `__init__` in Python).
- **Instance vs static (class) members:** per object vs shared by all objects of the class.
- **`this` / `self`:** a reference to the current object. **`super`:** a reference to the parent's implementation.
- **Access modifiers:** public, protected, private (and package-private in Java). Python relies on convention (`_x`, `__x`).
- **Getters/setters vs properties:** expose behaviour, not raw fields; validate in setters.
- **Method overloading** (same name, different parameters: compile time) vs **overriding** (a subclass redefines a parent method: runtime).

```java
class Shape {                                   // Java example
    protected String name;
    Shape(String name) { this.name = name; }
    double area() { return 0; }
    public String toString() { return name + " area=" + area(); }
}
class Circle extends Shape {
    private final double r;
    Circle(double r) { super("circle"); this.r = r; }
    @Override double area() { return Math.PI * r * r; }        // overriding
}
class Calc {
    int add(int a, int b) { return a + b; }                    // overloading
    double add(double a, double b) { return a + b; }
}
Shape s = new Circle(2);   // upcasting; s.area() calls Circle.area() → runtime polymorphism
```

- **Upcasting** (child → parent reference; always safe) vs **downcasting** (parent → child; needs a check: `instanceof`).
- **Object class methods** (Java): `equals`, `hashCode`, `toString`. **Deep vs shallow copy** of objects.
- **Immutable objects:** all fields final/private, no setters: thread-safe and simple to reason about.
- **Coupling** (how dependent modules are on each other: aim low) and **cohesion** (how focused a module is: aim high).

## 1. The four pillars

| Pillar | Meaning | Why it matters | Example |
|---|---|---|---|
| **Encapsulation** | Bundle data + methods; hide internal state behind methods | Invariants can't be broken from outside; internals can change freely | `Account.deposit()` validates the amount; `balance` isn't directly writable |
| **Abstraction** | Expose *what* an object does, hide *how* | Callers depend on a simple contract | `Storage.save(blob)`; the caller doesn't care if it's S3 or local disk |
| **Inheritance** | A class reuses/extends another ("is-a") | Code reuse, polymorphism | `ElectricCar extends Car` |
| **Polymorphism** | One interface, many implementations; the call is resolved at runtime | Add new types without changing callers | `for p in payments: p.pay()` works for Card, UPI, Wallet |

**Compile-time polymorphism:** method overloading, templates. **Runtime polymorphism:** overriding + virtual dispatch.

## 2. Composition over inheritance

Inheritance is **tight coupling**: a change in the parent ripples into every child, and deep hierarchies get rigid ("fragile base class"). Prefer **has-a** (composition): a `Car` *has an* `Engine` you can swap, rather than `PetrolCar`, `DieselCar`, `ElectricCar` subclasses for every combination.
Use inheritance only for true "is-a" relationships where the subclass can fully stand in for the parent (see LSP).

## 3. Relationships

- **Association:** objects know each other (Teacher ↔ Student).
- **Aggregation:** "has-a", but the part can live alone (Team has Players).
- **Composition:** "owns-a"; the part dies with the whole (House has Rooms).
- **Dependency:** uses temporarily (a method parameter).

## 4. Interface vs abstract class

| Interface | Abstract class |
|---|---|
| Pure contract (what, not how) | Partial implementation + contract |
| A class can implement many | Usually single inheritance |
| No state | Can hold state and constructors |
| Use for capabilities: `Comparable`, `Notifier` | Use for a shared base with common code |

## 5. SOLID (learn the "why" and an example for each)

**S: Single Responsibility.** A class should have **one reason to change**.
❌ `ReportService` that fetches data, formats a PDF and emails it. ✅ `ReportFetcher`, `PdfFormatter`, `EmailSender`.

**O: Open/Closed.** Open for extension, closed for modification. Add behaviour by adding code, not editing tested code.
✅ A new payment type = a new class implementing `PaymentMethod`; no `if type == ...` chain to edit. *Your cron decorator is an OCP example: new behaviour was added to tests without modifying them.*

**L: Liskov Substitution.** Subtypes must be usable wherever the base type is expected, without surprises.
❌ The classic: `Square extends Rectangle` breaks `setWidth`/`setHeight` expectations. ❌ `Penguin extends Bird` with `fly()` throwing.

**I: Interface Segregation.** Many small, specific interfaces beat one fat one.
❌ `Machine { print(); scan(); fax(); }` forces a simple printer to implement fax. ✅ `Printer`, `Scanner`, `Fax`.

**D: Dependency Inversion.** High-level modules depend on **abstractions**, not concrete classes. Inject the dependencies.
✅ `OrderService(repo: OrderRepository)` where the repository is an interface → swap MySQL for an in-memory fake in tests. That's what FastAPI's `Depends` and Spring's DI give you.

**Other principles:** DRY (don't repeat yourself), KISS (keep it simple), YAGNI (you aren't gonna need it), the Law of Demeter (talk only to your immediate friends: avoid `a.getB().getC().doX()`), and **high cohesion, low coupling**.

---

# Part B: Design patterns (Gang of Four, the ones actually asked)

Know for each: **the problem it solves**, a code sketch, and a real example.

## Creational

### Singleton: exactly one instance (config, logger, connection pool)
```python
import threading
class Config:
    _instance = None
    _lock = threading.Lock()
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:                       # double-checked locking
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
```

**Criticism (say it):** a singleton is global state. It's hard to test and hides dependencies. Prefer creating one instance and **injecting** it. In Python a module-level object is already a singleton.

### Factory Method / Simple Factory: hide which concrete class gets created
```python
def parser_for(product: str) -> "LogParser":
    return {"PowerStore": PowerStoreParser, "Unity": UnityParser, "ESXi": EsxiParser}[product]()
```

Your telemetry platform needed per-product-line parsing. A factory + strategy is the clean design.

### Abstract Factory: families of related objects (UI widgets for Windows vs macOS; AWS vs Azure clients).

### Builder: construct complex objects step by step (many optional parameters)
```python
req = (HttpRequest.builder().url(u).method("POST").header("Auth", t).timeout(5).build())
```

### Prototype: clone existing objects (copy a template config).

## Structural

### Adapter: make an incompatible interface fit the expected one
Wrap a legacy logging library so it matches your `Logger` interface. Or wrap Amazon's and Flipkart's very different page structures behind one `ProductExtractor` interface (your extension does exactly this: `amazon.ts` / `flipkart.ts` behind a common shape).

### Decorator: add behaviour by wrapping, at runtime, without subclassing
Python decorators, Java I/O streams (`BufferedInputStream(FileInputStream(...))`), adding logging/retry/caching around a service.

### Facade: one simple interface over a complex subsystem
The OneFS `isi` CLI is a facade: one command → REST call to PAPI → handler → core daemons.

### Proxy: a stand-in that controls access (lazy loading, caching, auth checks, remote calls).

### Composite: treat individual objects and groups uniformly (file system: File and Directory both have `size()`).

## Behavioural

### Strategy: swap algorithms at runtime
```python
class PricingStrategy(ABC):
    @abstractmethod
    def fee(self, hours: int) -> int: ...
class HourlyPricing(PricingStrategy):
    def fee(self, h): return 20 * h
class WeekendPricing(PricingStrategy):
    def fee(self, h): return 30 * h
class ParkingLot:
    def __init__(self, pricing: PricingStrategy): self.pricing = pricing
```

### Observer (publish/subscribe): notify subscribers when something changes
```python
class PriceTracker:
    def __init__(self): self._subs = []
    def subscribe(self, fn): self._subs.append(fn)
    def update(self, product, price):
        for fn in self._subs: fn(product, price)
```

Event systems, UI updates, your extension's price-drop alerts; Kafka/RabbitMQ are Observer at distributed scale.

### Command: wrap a request as an object (undo/redo, queues, job systems).
### State: behaviour changes with internal state (vending machine, order lifecycle, TCP connection states). Replaces big switch statements.
### Template Method: the base class defines the algorithm skeleton; subclasses fill in steps (`process()` = `download → extract → parse → write`, with `parse` overridden per product).
### Chain of Responsibility: pass a request along handlers (middleware pipelines, logging levels, ATM note dispensing, approval chains).
### Iterator: traverse without exposing internals (Python generators).
### Mediator: objects talk through a central hub instead of to each other (a chat room, an air-traffic controller).

---

## More pattern code (the ones interviewers ask you to write)

```python
# ---------- Factory Method ----------
class Notifier(ABC):
    @abstractmethod
    def send(self, to: str, msg: str): ...
class EmailNotifier(Notifier):
    def send(self, to, msg): print(f"email {to}: {msg}")
class SmsNotifier(Notifier):
    def send(self, to, msg): print(f"sms {to}: {msg}")
class NotifierFactory:
    _registry = {"email": EmailNotifier, "sms": SmsNotifier}
    @classmethod
    def create(cls, channel: str) -> Notifier:
        try: return cls._registry[channel]()
        except KeyError: raise ValueError(f"unknown channel {channel}")

# ---------- Builder ----------
class Query:
    def __init__(self): self.table, self.filters, self.limit = None, [], None
class QueryBuilder:
    def __init__(self): self.q = Query()
    def from_(self, t): self.q.table = t; return self
    def where(self, cond): self.q.filters.append(cond); return self
    def take(self, n): self.q.limit = n; return self
    def build(self):
        if not self.q.table: raise ValueError("table required")
        return self.q
q = QueryBuilder().from_("collections").where("product='Unity'").take(10).build()

# ---------- Adapter ----------
class LegacyLogger:                      # an incompatible interface we can't change
    def write_line(self, level_code: int, text: str): ...
class Logger(ABC):
    @abstractmethod
    def log(self, level: str, msg: str): ...
class LegacyLoggerAdapter(Logger):
    LEVELS = {"INFO": 1, "WARN": 2, "ERROR": 3}
    def __init__(self, legacy: LegacyLogger): self.legacy = legacy
    def log(self, level, msg): self.legacy.write_line(self.LEVELS[level], msg)

# ---------- Decorator (object wrapping, not Python's @ syntax) ----------
class DataSource(ABC):
    @abstractmethod
    def read(self) -> bytes: ...
class FileSource(DataSource):
    def __init__(self, path): self.path = path
    def read(self): return open(self.path, "rb").read()
class GzipDecorator(DataSource):         # adds decompression without changing FileSource
    def __init__(self, inner: DataSource): self.inner = inner
    def read(self):
        import gzip; return gzip.decompress(self.inner.read())
src = GzipDecorator(FileSource("telemetry.ndjson.gz"))

# ---------- Observer ----------
class EventBus:
    def __init__(self): self._subs = defaultdict(list)
    def subscribe(self, event, handler): self._subs[event].append(handler)
    def publish(self, event, payload):
        for h in self._subs[event]: h(payload)
bus = EventBus(); bus.subscribe("price_drop", lambda p: print("alert", p))

# ---------- Command (with undo) ----------
class Command(ABC):
    @abstractmethod
    def execute(self): ...
    @abstractmethod
    def undo(self): ...
class AddText(Command):
    def __init__(self, doc, text): self.doc, self.text = doc, text
    def execute(self): self.doc.append(self.text)
    def undo(self): self.doc.pop()
history = []
def run(cmd): cmd.execute(); history.append(cmd)
def undo(): history.pop().undo()

# ---------- State ----------
class OrderState(ABC):
    @abstractmethod
    def next(self, order): ...
class Placed(OrderState):
    def next(self, order): order.state = Shipped()
class Shipped(OrderState):
    def next(self, order): order.state = Delivered()
class Delivered(OrderState):
    def next(self, order): raise RuntimeError("already delivered")
class Order:
    def __init__(self): self.state = Placed()
    def advance(self): self.state.next(self)

# ---------- Template Method ----------
class CollectionProcessor(ABC):
    def process(self, c):                 # the fixed skeleton
        raw = self.download(c); files = self.extract(raw)
        records = self.parse(files)       # the step that varies
        self.write(records)
    def download(self, c): ...
    def extract(self, raw): ...
    def write(self, records): ...
    @abstractmethod
    def parse(self, files): ...
class UnityProcessor(CollectionProcessor):
    def parse(self, files): ...
```

**Bridge** (separate *what* from *how*, so both can vary independently): instead of `PdfReportForEmail`, `PdfReportForSlack`, `CsvReportForEmail`… (classes multiply), keep a `Report` hierarchy (Pdf, Csv) that **has a** `Sender` (Email, Slack). 2 + 2 classes instead of 2 × 2.

```python
class Sender(ABC):
    @abstractmethod
    def send(self, data: bytes): ...
class EmailSender(Sender):
    def send(self, data): print("emailing", len(data), "bytes")
class Report(ABC):
    def __init__(self, sender: Sender): self.sender = sender      # the bridge
    @abstractmethod
    def render(self) -> bytes: ...
    def publish(self): self.sender.send(self.render())
class CsvReport(Report):
    def render(self): return b"id,status\n1,OK\n"
CsvReport(EmailSender()).publish()
```

**Others to recognise:** **Prototype** (clone), **Flyweight** (share common state to save memory: e.g. interned strings, glyphs), **Iterator**, **Mediator**, **Memento** (save/restore state), **Visitor** (add operations over an object structure without changing its classes; compilers/ASTs), **Null Object**, **Repository** (abstract data access), **Dependency Injection**, **MVC/MVVM** (separate the model, the view and the controller logic).

## UML class diagrams (how to draw your LLD)
```
┌────────────────────┐        ┌──────────────────┐
│ ParkingLot         │◆──────►│ Floor            │   ◆ composition (lot owns floors)
├────────────────────┤ 1   *  ├──────────────────┤
│ - floors: List     │        │ - spots: List    │
│ + park(v): Ticket  │        │ + findSpot(t)    │
└────────┬───────────┘        └──────────────────┘
         │ uses
         ▼
┌────────────────────┐   ▲ inheritance (hollow triangle)    ┌───────────────┐
│ «interface»        │   │                                  │ Vehicle       │
│ PricingStrategy    │◄──┴── HourlyPricing, WeekendPricing  │ ◇ aggregation  │
└────────────────────┘                                      └───────────────┘
Notation: + public, - private, # protected; ──► association; - - -▷ implements; multiplicities 1, *, 0..1
```

A **sequence diagram** (who calls whom, in order) helps for flows like booking: `User → BookingService → SeatLock → Payment → BookingService → User`.

# Part C: Low-level design problems

## The approach (use it every time, and say it out loud)

1. **Clarify requirements** (5 min): the core features, what's out of scope, scale, concurrency needs.
2. **Identify entities** (nouns) and **behaviours** (verbs).
3. **Define relationships + class diagram** (boxes and arrows on paper).
4. **Pick patterns** where they naturally fit (don't force them).
5. **Write code:** interfaces first, then the core classes, then the main flow. Use enums for fixed types.
6. **Handle concurrency** (two people booking the same seat) and edge cases.
7. **Extensibility:** "to add X, I'd add a new class implementing Y; nothing else changes."

## Problem 1: Parking lot (the most asked LLD question)

**Requirements:** multiple floors; spot types (bike, car, truck/large, plus EV); park and unpark; ticket on entry; fee on exit by duration; show free spots; several entry gates at once.

```python
from enum import Enum
from abc import ABC, abstractmethod
from datetime import datetime
import threading, uuid, math

class VehicleType(Enum): BIKE = 1; CAR = 2; TRUCK = 3
class SpotType(Enum): SMALL = 1; MEDIUM = 2; LARGE = 3

FITS = {VehicleType.BIKE: [SpotType.SMALL, SpotType.MEDIUM, SpotType.LARGE],
        VehicleType.CAR: [SpotType.MEDIUM, SpotType.LARGE],
        VehicleType.TRUCK: [SpotType.LARGE]}

class Vehicle:
    def __init__(self, plate: str, vtype: VehicleType): self.plate, self.type = plate, vtype

class Spot:
    def __init__(self, sid: str, stype: SpotType): self.id, self.type, self.vehicle = sid, stype, None
    def is_free(self): return self.vehicle is None

class Ticket:
    def __init__(self, vehicle, spot):
        self.id = str(uuid.uuid4()); self.vehicle = vehicle; self.spot = spot; self.entry = datetime.now()

class PricingStrategy(ABC):
    @abstractmethod
    def fee(self, ticket: Ticket, exit_time: datetime) -> int: ...

class HourlyPricing(PricingStrategy):
    RATE = {VehicleType.BIKE: 10, VehicleType.CAR: 20, VehicleType.TRUCK: 50}
    def fee(self, t, exit_time):
        hours = max(1, math.ceil((exit_time - t.entry).total_seconds() / 3600))
        return hours * self.RATE[t.vehicle.type]

class Floor:
    def __init__(self, number, spots): self.number, self.spots = number, spots
    def find_spot(self, vtype):
        for stype in FITS[vtype]:                          # smallest fitting spot first
            for s in self.spots:
                if s.type == stype and s.is_free(): return s
        return None

class ParkingLot:
    def __init__(self, floors, pricing: PricingStrategy):
        self.floors, self.pricing = floors, pricing
        self.active = {}                                   # ticket id -> Ticket
        self.lock = threading.Lock()                       # many gates park at once

    def park(self, v: Vehicle) -> Ticket:
        with self.lock:                                    # find + assign must be ATOMIC
            for f in self.floors:
                spot = f.find_spot(v.type)
                if spot:
                    spot.vehicle = v
                    t = Ticket(v, spot); self.active[t.id] = t
                    return t
        raise RuntimeError("Parking full")

    def unpark(self, ticket_id: str) -> int:
        with self.lock:
            t = self.active.pop(ticket_id)
            t.spot.vehicle = None
        return self.pricing.fee(t, datetime.now())
```

**Talking points:**

- **Strategy** for pricing (weekend, EV pricing → new class).
- **The lock makes find-and-assign atomic.** Without it, two gates could take the same spot (a check-then-act race). At scale, use a lock per floor, or keep a free-spot queue per spot type (O(1) allocation instead of scanning).
- **Extensions:** EV charging spots (new SpotType plus a charging fee), a display board (Observer on spot changes), payments (a `PaymentMethod` interface).

## Problem 2: LRU cache (with O(1) operations, thread-safe)
```python
class Node:
    __slots__ = ("k", "v", "prev", "next")
    def __init__(self, k=0, v=0): self.k, self.v, self.prev, self.next = k, v, None, None

class LRUCache:
    def __init__(self, cap):
        self.cap, self.map = cap, {}
        self.head, self.tail = Node(), Node()              # sentinels: head <-> ... <-> tail
        self.head.next, self.tail.prev = self.tail, self.head
        self.lock = threading.Lock()
    def _remove(self, n): n.prev.next, n.next.prev = n.next, n.prev
    def _add_front(self, n):
        n.next, n.prev = self.head.next, self.head
        self.head.next.prev = n; self.head.next = n
    def get(self, k):
        with self.lock:
            n = self.map.get(k)
            if not n: return -1
            self._remove(n); self._add_front(n); return n.v
    def put(self, k, v):
        with self.lock:
            if k in self.map: self._remove(self.map[k])
            n = Node(k, v); self.map[k] = n; self._add_front(n)
            if len(self.map) > self.cap:
                lru = self.tail.prev; self._remove(lru); del self.map[lru.k]
```

**Extensions:** TTL expiry (store an expiry time; check on get; background cleanup), LFU (frequency buckets), pluggable eviction (Strategy pattern).

## Problem 3: Rate limiter (LLD version)

Algorithms (also in file 14):

- **Token bucket:** a bucket of capacity C refills at R tokens/sec; each request takes a token. Allows bursts up to C. Most common.
- **Leaky bucket:** requests drain at a constant rate; smooths traffic.
- **Fixed window counter:** count per minute; simple, but allows 2× bursts at window edges.
- **Sliding window log:** store timestamps; exact, but memory-heavy.
- **Sliding window counter:** a weighted mix of the current and previous window; a good approximation.

```python
import time, threading
class TokenBucket:
    def __init__(self, capacity, refill_per_sec):
        self.cap, self.rate = capacity, refill_per_sec
        self.tokens, self.last = capacity, time.monotonic()
        self.lock = threading.Lock()
    def allow(self) -> bool:
        with self.lock:
            now = time.monotonic()
            self.tokens = min(self.cap, self.tokens + (now - self.last) * self.rate)
            self.last = now
            if self.tokens >= 1: self.tokens -= 1; return True
            return False

class RateLimiter:
    def __init__(self, capacity, rate): self.buckets, self.cap, self.rate = {}, capacity, rate
    def allow(self, user_id):
        b = self.buckets.setdefault(user_id, TokenBucket(self.cap, self.rate))
        return b.allow()
```

Your extension's backend has per-install **daily limits** (a fixed-window counter in SQLite) plus a **monthly budget cap**. Mention it.

## Problem 4: Others to practise (sketch the classes; code the core)

| Problem | Key entities | Key patterns / hard parts |
|---|---|---|
| **Elevator system** | Elevator, Floor, Request, Controller, Direction, State | State (moving/idle/doors-open), Strategy for scheduling (SCAN/LOOK, nearest car), concurrency of requests |
| **BookMyShow / movie booking** | Movie, Theatre, Screen, Show, Seat, Booking, Payment | **Seat locking**: temporarily hold seats for 5–10 minutes (lock with a TTL), then confirm or release; avoid double booking (DB row lock or optimistic version check) |
| **Splitwise** | User, Group, Expense, Split (Equal/Exact/Percent), BalanceSheet | Strategy for split types; simplify debts (greedy on net balances with max/min heaps) |
| **Vending machine** | Machine, Product, Inventory, Coin, State | State pattern (Idle → HasMoney → Dispensing), change-making |
| **Logger framework** | Logger, Level, Appender (console/file), Formatter | Chain of Responsibility (levels), Singleton/factory, async buffered writes |
| **Snake & ladder / tic-tac-toe / chess** | Board, Player, Piece, Move, Game | Clean turn loop; chess = polymorphic `Piece.valid_moves()` |
| **Library management** | Book, BookItem (copy), Member, Loan, Fine | Book vs BookItem distinction; fines Strategy |
| **Notification service** | Notification, Channel (email/SMS/push), Template, Preference | Strategy/Factory per channel, Observer, retries |
| **Pub-sub / message queue (in memory)** | Topic, Publisher, Subscriber, Message, offset | Thread-safe queues, consumer offsets, at-least-once delivery |
| **File system (in memory)** | File, Directory (Composite), Path | Composite pattern, path parsing, `ls`/`mkdir`/`write` (relates to your storage background) |
| **Cache with eviction policies** | Cache, EvictionPolicy (LRU/LFU/FIFO), Storage | Strategy for eviction |

## Problem 5: Elevator system (code sketch)
```python
class Direction(Enum): UP = 1; DOWN = -1; IDLE = 0

class Elevator:
    def __init__(self, eid, floors):
        self.id, self.floor, self.direction = eid, 0, Direction.IDLE
        self.up_stops, self.down_stops = set(), set()
    def add_stop(self, f):
        (self.up_stops if f > self.floor else self.down_stops).add(f)
        if self.direction == Direction.IDLE:
            self.direction = Direction.UP if f > self.floor else Direction.DOWN
    def step(self):                                   # SCAN/LOOK: keep going in one direction while there are stops
        if self.direction == Direction.UP:
            self.floor += 1
            if self.floor in self.up_stops: self.up_stops.discard(self.floor)   # open doors
            if not any(s > self.floor for s in self.up_stops):
                self.direction = Direction.DOWN if self.down_stops else Direction.IDLE
        elif self.direction == Direction.DOWN:
            self.floor -= 1
            if self.floor in self.down_stops: self.down_stops.discard(self.floor)
            if not any(s < self.floor for s in self.down_stops):
                self.direction = Direction.UP if self.up_stops else Direction.IDLE

class Dispatcher:                                    # Strategy: pick the best car for a hall call
    def __init__(self, elevators): self.elevators = elevators
    def request(self, floor):
        best = min(self.elevators, key=lambda e: abs(e.floor - floor) + (0 if e.direction == Direction.IDLE else 2))
        best.add_stop(floor)
```

Discuss: the State pattern for door/moving states, scheduling strategies (nearest car, zoning), capacity limits, emergency mode, and concurrency of requests (a lock or a single dispatcher thread consuming a queue).

## Problem 6: Movie ticket booking (the double-booking core)
```python
import time
class SeatLockProvider:
    def __init__(self, ttl=300): self.locks, self.ttl, self.mx = {}, ttl, threading.Lock()
    def lock(self, show_id, seats, user):
        with self.mx:
            now = time.time()
            for s in seats:                                   # all-or-nothing
                holder = self.locks.get((show_id, s))
                if holder and holder[1] > now and holder[0] != user:
                    raise RuntimeError(f"seat {s} is held")
            for s in seats: self.locks[(show_id, s)] = (user, now + self.ttl)
    def validate(self, show_id, seats, user):
        now = time.time()
        return all(self.locks.get((show_id, s), (None, 0))[0] == user and self.locks[(show_id, s)][1] > now for s in seats)
    def unlock(self, show_id, seats):
        with self.mx:
            for s in seats: self.locks.pop((show_id, s), None)

class BookingService:
    def __init__(self, locks: SeatLockProvider, payments): self.locks, self.payments, self.booked = locks, payments, set()
    def book(self, show_id, seats, user, amount):
        self.locks.lock(show_id, seats, user)                 # hold the seats for 5 minutes
        if not self.payments.charge(user, amount):
            self.locks.unlock(show_id, seats); raise RuntimeError("payment failed")
        if not self.locks.validate(show_id, seats, user):     # the hold expired during payment → refund
            self.payments.refund(user, amount); raise RuntimeError("hold expired")
        self.booked.update((show_id, s) for s in seats)
        self.locks.unlock(show_id, seats)
```

At scale, the hold lives in Redis with a TTL (`SET seat:show:12 user NX EX 300`) and the final booking is a DB transaction with a unique constraint on (show_id, seat_id), so a double booking is impossible even if two services race.

---

# Part D: Completing OOP from A to Z

### OOP course map
```
Basics: classes · objects · fields · methods · constructors/destructors · this/self · access modifiers · static members
Pillars: encapsulation · abstraction · inheritance · polymorphism (compile-time + runtime)
Relationships: association · aggregation · composition · dependency · realisation (implements)
Types: interfaces · abstract classes · generics · enums · immutable objects · value vs entity objects
Object lifecycle: creation · initialisation · copying/cloning · equality & hashing · destruction/GC
Principles: SOLID · DRY · KISS · YAGNI · Law of Demeter · GRASP · composition over inheritance
Patterns: 23 GoF patterns (creational, structural, behavioural) + architectural (MVC, layered, DI, repository)
Quality: code smells · refactoring · anti-patterns · testing objects (mocks, DI)
Design: UML class/sequence diagrams · LLD problem approach
```

### Object lifecycle, identity, equality and hashing
```
create (allocate memory) → initialise (constructor) → use → [copy/clone?] → no longer referenced → destroy (destructor / garbage collector)
```

- **Identity** (is it the *same* object? `is` in Python, `==` on references in Java) vs **equality** (do two objects *represent the same value*? `==`/`equals`).
- If you override equality you must keep **hashing consistent** (equal objects must have equal hashes), or the objects break in sets/maps.
- **Value objects** (Money, Point, DateRange): defined by their values, ideally immutable. **Entities** (User, Order): defined by an identity (ID) that persists while their attributes change.
- **Copying:** shallow (copies references to the same inner objects) vs deep (copies everything recursively). The Prototype pattern formalises cloning.
- **Destruction:** deterministic in C++ (destructors, RAII); non-deterministic in Java/Python (the garbage collector), so release external resources explicitly (`with`, try-with-resources).

### Generics (parametric polymorphism)
Write a class or function once for many types, with type safety: `List<T>` in Java, `template<T>` in C++, `list[T]` / `TypeVar` in Python type hints. **Bounded generics** restrict T (`<T extends Comparable<T>>`, `TypeVar("T", bound=Comparable)`).

```python
from typing import Generic, TypeVar
T = TypeVar("T")
class Repository(Generic[T]):
    def __init__(self): self._items: dict[int, T] = {}
    def add(self, id_: int, item: T) -> None: self._items[id_] = item
    def get(self, id_: int) -> T | None: return self._items.get(id_)
users: Repository[str] = Repository()
```

### OOP across languages

| Concept | Java | C++ | Python |
|---|---|---|---|
| Interface | `interface` | abstract class with pure virtuals | ABC / `Protocol` |
| Multiple inheritance | interfaces only | yes (virtual inheritance for diamonds) | yes (MRO, C3) |
| Access control | public/protected/package/private | public/protected/private | convention (`_`, `__`) |
| Runtime polymorphism | all non-final methods are virtual | only `virtual` methods | all methods (duck typing) |
| Memory | GC | manual/RAII | refcount + GC |
| Generics | type erasure | templates (compile-time) | type hints only (not enforced) |

### GRASP principles (assigning responsibilities)
**Information expert** (give a responsibility to the class with the information to fulfil it), **creator** (who creates an object: whoever contains or aggregates it), **controller** (a class that handles system events), **low coupling**, **high cohesion**, **polymorphism** (instead of type-switch statements), **pure fabrication** (an invented helper class like `Repository` to keep the domain clean), **indirection**, **protected variations** (hide what's likely to change behind an interface).

### Code smells and refactoring

| Smell | Looks like | Refactoring |
|---|---|---|
| Long method | 200-line function | extract method |
| Large/God class | one class does everything | extract class, single responsibility |
| Long parameter list | `f(a, b, c, d, e, f, g)` | introduce a parameter object / builder |
| Duplicated code | copy-paste | extract a shared function/class |
| Switch on type | `if type == "A" … elif "B"` | replace the conditional with polymorphism (Strategy/State) |
| Feature envy | a method uses another class's data more than its own | move the method |
| Primitive obsession | prices as plain floats, IDs as strings everywhere | introduce value objects (`Money`, `SystemId`) |
| Shotgun surgery | one change touches 15 files | move related behaviour together |
| Data clumps | the same 3 fields always travel together | make them a class |

**Refactoring** = improving structure **without changing behaviour**, in small steps, protected by tests.

### Anti-patterns
God object, spaghetti code, golden hammer (using one tool for everything), premature optimisation, copy-paste programming, magic numbers/strings, singleton abuse (hidden global state), anaemic domain model (classes with only data and no behaviour), circular dependencies.

### The remaining GoF patterns, with code
```python
# ---------- Abstract Factory: families of related objects ----------
class CloudFactory(ABC):
    @abstractmethod
    def storage(self): ...
    @abstractmethod
    def queue(self): ...
class AWSFactory(CloudFactory):
    def storage(self): return S3Storage()
    def queue(self): return SQSQueue()
class OnPremFactory(CloudFactory):
    def storage(self): return ECSStorage()
    def queue(self): return RabbitQueue()
def build_pipeline(f: CloudFactory): return Pipeline(f.storage(), f.queue())   # consistent family, swappable

# ---------- Prototype: clone a configured object ----------
import copy
base_job = Job(retries=3, timeout=300, tags=["telemetry"])
urgent = copy.deepcopy(base_job); urgent.priority = "high"

# ---------- Composite: treat single items and groups the same way ----------
class Node(ABC):
    @abstractmethod
    def size(self) -> int: ...
class File(Node):
    def __init__(self, n): self.n = n
    def size(self): return self.n
class Folder(Node):
    def __init__(self, *children): self.children = list(children)
    def size(self): return sum(c.size() for c in self.children)   # recursion through the tree
Folder(File(10), Folder(File(5), File(7))).size()   # 22

# ---------- Proxy: control access to a real object (lazy load, cache, auth) ----------
class ImageProxy:
    def __init__(self, path): self.path, self._real = path, None
    def show(self):
        if self._real is None: self._real = RealImage(self.path)   # load only when first needed
        self._real.show()

# ---------- Flyweight: share common immutable state between many objects ----------
class GlyphFactory:
    _cache = {}
    @classmethod
    def get(cls, char, font):
        key = (char, font)
        if key not in cls._cache: cls._cache[key] = Glyph(char, font)   # one shared object per (char, font)
        return cls._cache[key]

# ---------- Iterator: traverse without exposing internals ----------
class Range3:
    def __init__(self, n): self.n = n
    def __iter__(self):
        i = 0
        while i < self.n: yield i; i += 1

# ---------- Chain of Responsibility: pass a request along handlers ----------
class Handler:
    def __init__(self, nxt=None): self.nxt = nxt
    def handle(self, req):
        return self.nxt.handle(req) if self.nxt else None
class AuthHandler(Handler):
    def handle(self, req):
        if not req.get("token"): return "401"
        return super().handle(req)
class RateLimitHandler(Handler):
    def handle(self, req):
        if req.get("count", 0) > 100: return "429"
        return super().handle(req)
class AppHandler(Handler):
    def handle(self, req): return "200"
pipeline = AuthHandler(RateLimitHandler(AppHandler()))   # like web middleware

# ---------- Mediator: objects talk through a hub ----------
class ChatRoom:
    def __init__(self): self.users = []
    def join(self, u): self.users.append(u); u.room = self
    def broadcast(self, sender, msg):
        for u in self.users:
            if u is not sender: u.receive(f"{sender.name}: {msg}")

# ---------- Memento: save and restore state (undo) ----------
class Editor:
    def __init__(self): self.text = ""
    def save(self): return self.text            # the memento (an opaque snapshot)
    def restore(self, memento): self.text = memento

# ---------- Visitor: add operations over a structure without changing its classes ----------
class Circle:
    def accept(self, v): return v.visit_circle(self)
class Square:
    def accept(self, v): return v.visit_square(self)
class AreaVisitor:
    def visit_circle(self, c): return 3.14159 * c.r ** 2
    def visit_square(self, s): return s.side ** 2
class JsonVisitor:
    def visit_circle(self, c): return {"type": "circle", "r": c.r}
    def visit_square(self, s): return {"type": "square", "side": s.side}
```

**Pattern quick-reference (all 23 GoF):**

| Creational | Structural | Behavioural |
|---|---|---|
| Singleton · Factory Method · Abstract Factory · Builder · Prototype | Adapter · Bridge · Composite · Decorator · Facade · Flyweight · Proxy | Chain of Responsibility · Command · Interpreter · Iterator · Mediator · Memento · Observer · State · Strategy · Template Method · Visitor |

(**Interpreter:** represent a small language's grammar as classes and evaluate it, e.g. a rule or filter expression.)

### Architectural patterns built on OOP

- **MVC** (model–view–controller), **MVP**, **MVVM** (UI frameworks).
- **Layered architecture** (controller → service → repository), **hexagonal / ports-and-adapters**, **clean architecture** (file 15).
- **Repository** (a collection-like interface over data storage), **Unit of Work** (track changes and commit them together), **Service layer**, **DTOs** (data transfer objects for API boundaries).
- **Dependency injection containers** (Spring, Guice; FastAPI's `Depends` is a lightweight version).

### Testing object-oriented code
Depend on interfaces → inject **test doubles**: a **dummy** (a placeholder), a **stub** (returns canned answers), a **fake** (a working lightweight implementation, like an in-memory repository), a **mock** (verifies interactions: "was `send()` called once?"), a **spy** (records calls on a real object). Prefer testing behaviour through public interfaces over private details.

## LLD interview tips

- **Start with interfaces and enums.** It shows design thinking before code.
- Keep classes small; name things from the domain (`Ticket`, `Spot`, not `Data1`).
- Don't over-engineer: two or three patterns that fit naturally beat ten forced ones.
- Always address **concurrency** for shared resources (spots, seats, inventory): a lock, an atomic compare-and-set, or a DB transaction.
- Make the code **runnable**: a small `main` that demonstrates the flow.
- In machine-coding rounds, an in-memory store is fine; mention where a DB would go.

## Quick revision

- Four pillars + why. Composition over inheritance. Interface vs abstract class.
- SOLID with one example each (OCP = your decorator; DIP = injection, FastAPI `Depends`).
- Patterns: Singleton (and why it's often bad), Factory, Builder, Adapter, Decorator, Facade, Proxy, Strategy, Observer, State, Template Method, Chain of Responsibility, Command.
- LLD recipe: clarify → entities → relationships → patterns → code → concurrency → extensibility.
- Parking lot: Strategy pricing + lock around find-and-assign. LRU: hash map + doubly linked list. Token bucket rate limiter.

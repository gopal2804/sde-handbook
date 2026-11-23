# 03 · Python

**Why Python exists:** Guido van Rossum (1991) wanted a language that reads like plain English and lets you get things done quickly: **developer productivity over raw speed**. It's dynamically typed and interpreted (CPython compiles to bytecode, then a virtual machine runs it), with a huge standard library ("batteries included").

**Why it won:** scripting, automation, test frameworks, data, ML/AI (NumPy, PyTorch), and web backends (Django, Flask, FastAPI). Slow parts are delegated to C extensions.

**Why you used it:**

- **OneFS:** the test automation framework (pytest/tox, qTest), your cron-aware **decorator**, and the Python platform API handlers.
- **Telemetry platform:** tooling and scripts.
- **Smart Shopping Agent backend:** FastAPI, Pydantic, the OpenAI SDK, pytest, eval scripts.
- **Dell AI tools:** FastAPI and LangChain.

---

## Start here: Python in plain words

**What Python is:** a high-level language designed to be **easy to read and quick to write**. You don't declare types, manage memory, or compile. You write the logic and run it.
**Analogy:** Python is an automatic car: you focus on where you're going, not on shifting gears. The cost is speed, but slow parts can be handed to C libraries (NumPy, the Python bits of Pandas/PyTorch), so in practice Python glues fast components together.

### How Python runs your code (CPython architecture)
```
 your_script.py
      │  1. compile (automatic, on import/run)
      ▼
 bytecode (.pyc in __pycache__)        e.g.  LOAD_NAME x / LOAD_CONST 1 / BINARY_OP + / STORE_NAME x
      │  2. execute
      ▼
 ┌──────────────────────────────────────────────┐
 │ Python Virtual Machine (the interpreter loop)│  runs one bytecode instruction at a time
 │   ├─ GIL (one thread runs bytecode at a time)│
 │   ├─ memory manager: reference counting +    │
 │   │   cyclic garbage collector              │
 │   └─ calls into C for built-ins and          │
 │       extensions (list.sort, NumPy, …)        │
 └──────────────────────────────────────────────┘
```

**Try it yourself in the terminal:**

```bash
# 0. Write a module and a script that imports it
cat > calc.py <<'EOF'
def add(a, b):
    return a + b
EOF
cat > main.py <<'EOF'
import calc
print(calc.add(2, 3))
EOF

# 1. RUN: importing calc compiles it to bytecode and caches it
python3 main.py                  # 5
ls __pycache__                   # calc.cpython-312.pyc (the cached bytecode; main.py itself isn't cached)

# 2. LOOK at the bytecode the virtual machine runs
python3 -m dis calc.py                               # bytecode of the whole module
python3 -c "import dis, calc; dis.dis(calc.add)"     # LOAD_FAST a, LOAD_FAST b, BINARY_OP (+), RETURN_VALUE

# 3. COMPILE on purpose (pip does this when it installs packages)
python3 -m py_compile calc.py    # one file → __pycache__/calc.cpython-3XX.pyc
python3 -m compileall .          # every .py file in the folder
```

- Opcode names change slightly between versions (for example `BINARY_ADD` before 3.11, `BINARY_OP` from 3.11).
- If no `__pycache__` folder appears after step 1, caching is switched off (`PYTHONDONTWRITEBYTECODE=1`, common in Docker images). `py_compile` still writes the file.
- Delete `__pycache__` and run again: it's simply rebuilt. The `.pyc` only saves compile time on the next import; it doesn't make the code run faster.

### Variables are labels, not boxes
```
a = [1, 2, 3]          b = a

   a ──┐
       ├──► [1, 2, 3]      ← ONE list object in memory; both names are sticky notes on it
   b ──┘
b.append(4)  → a also shows [1, 2, 3, 4]
```

**Dynamic typing:** the *object* has a type; the *name* doesn't. `x = 5` then `x = "hi"` is fine: you just moved the label.

### The GIL in plain words
One **microphone** in a meeting room: many people (threads) are present, but only the one holding the mic can speak (run Python bytecode). While someone waits for a reply from outside (network/disk I/O), they hand the mic over, so threads still help for I/O-heavy work. For CPU-heavy work, use **several rooms** (processes), each with its own mic.

### Where Python fits in a backend (your extension's backend)
```
Chrome extension ──HTTPS──► Uvicorn (ASGI server) ──► FastAPI app (Python)
                                                        ├─ Pydantic validates the JSON
                                                        ├─ business logic (pure Python)
                                                        ├─ SQLite usage counters
                                                        └─ OpenAI SDK → api.openai.com
```

## Python course map: the whole language, A to Z

| # | Chapter | Section |
|---|---|---|
| 1 | Installing, running, the REPL, your first script | §16 |
| 2 | Variables, core types, operators | §0 + §1 + §17 |
| 3 | Numbers in depth (int, float, Decimal, Fraction, complex, math) | §17 |
| 4 | Strings, formatting, Unicode, bytes | §0 + §18 |
| 5 | Input and output (`input`, `print`) | §18 |
| 6 | Control flow (`if`, `for`, `while`, `match`) | §0 |
| 7 | Lists, tuples, sets, dicts, slicing, sorting | §0 + §2 + §19 |
| 8 | Functions: parameters, scope, closures, lambdas, recursion | §0 + §4 + §20 |
| 9 | Comprehensions, iterators, generators, itertools | §3 + §15 |
| 10 | Exceptions, the exception hierarchy, warnings | §10 + §21 |
| 11 | Files, paths, CSV, JSON, pickle, OS utilities | §0 + §22 |
| 12 | Modules, packages, imports | §0 + §23 |
| 13 | OOP: classes, inheritance, special methods, dataclasses, enums | §6 + §24 |
| 14 | Decorators and context managers | §4 + §5 |
| 15 | Type hints, Pydantic | §7 + §15 |
| 16 | Advanced: descriptors, metaclasses, ABCs, protocols | §15 |
| 17 | Concurrency: threads, processes, asyncio | §8 + §15 |
| 18 | Memory, performance, internals | §9 + §15 |
| 19 | The standard library tour | §11 + §25 |
| 20 | Working with the web and databases (requests/httpx, sqlite3) | §26 |
| 21 | Command-line apps (`argparse`) | §26 |
| 22 | Testing, debugging, profiling | §12 + §27 |
| 23 | Environments, packaging, code style (PEP 8) | §13 + §28 |
| 24 | The ecosystem: NumPy, Pandas, web frameworks, AI libraries | §29 |
| 25 | Exercises | §30 |

## 0. Python basics (start here)

### Core data types

| Type | Example | Mutable | Notes |
|---|---|---|---|
| `int` | `42`, `10**100` | no | arbitrary precision (no overflow) |
| `float` | `3.14` | no | IEEE-754 double; `0.1 + 0.2 != 0.3` → use `math.isclose` or `decimal.Decimal` for money |
| `bool` | `True` | no | a subclass of int (`True + True == 2`) |
| `str` | `"hi"`, `'hi'`, `"""multi"""` | no | Unicode |
| `bytes` | `b"\x00"` | no | binary data; `.encode()` / `.decode()` |
| `list` | `[1, "a"]` | yes | ordered |
| `tuple` | `(1, 2)`, `(1,)` | no | ordered; hashable if its contents are |
| `set` | `{1, 2}` | yes | unique, unordered; `set()` for empty (`{}` is a dict) |
| `dict` | `{"k": 1}` | yes | key → value; insertion-ordered |
| `NoneType` | `None` | | "no value" |

Truthiness: `0`, `""`, `[]`, `{}`, `set()`, `None` and `False` are falsy; everything else is truthy.

### Operators
Arithmetic `+ - * / // % **` (`/` is always float; `//` is floor division: `-7 // 2 == -4`), comparison (chained: `0 < x < 10`), logical `and or not` (short-circuit; they return an operand, e.g. `name = given or "default"`), membership `in`, identity `is`, bitwise `& | ^ ~ << >>`, walrus `:=` (assign inside an expression: `while (line := f.readline()):`).

### Control flow
```python
if x > 0: ...
elif x == 0: ...
else: ...

for i in range(0, 10, 2): ...           # 0, 2, 4, 6, 8
for i, item in enumerate(items, start=1): ...
for a, b in zip(list1, list2): ...       # stops at the shorter one
while cond: ...
for ... else:                            # the else runs if the loop wasn't broken out of
    ...

match command.split():                   # structural pattern matching (3.10+)
    case ["start", name]: start(name)
    case ["stop", *_]: stop()
    case _: print("unknown")
```

### Strings
```python
s = "PowerScale OneFS"
s[0], s[-1], s[0:5], s[::-1]             # index, last, slice [start:stop:step], reverse
s.lower(), s.upper(), s.strip(), s.split(), " ".join(words)
s.replace("One", "Two"), s.find("FS"), s.startswith("Power"), s.count("e")
f"{name!r} has {count:,} items, {ratio:.2%}"     # f-strings with format specs
"abc".isalnum(), "123".isdigit()
```

### Indexing and slicing (works on lists, strings, tuples)
```
 s = "PYTHON"
 index:   P  Y  T  H  O  N
           0  1  2  3  4  5
          -6 -5 -4 -3 -2 -1     (negative indexes count from the end)
```
```python
s[0]      # 'P'          s[-1]     # 'N'
s[1:4]    # 'YTH'        (start inclusive, stop exclusive)
s[:3]     # 'PYT'        s[3:]     # 'HON'
s[::2]    # 'PTO'        (step 2)
s[::-1]   # 'NOHTYP'     (reverse)
s[-3:]    # 'HON'        (last 3)
nums = [0, 1, 2, 3, 4, 5]
nums[1:5:2]      # [1, 3]
nums[2:4] = [9]  # slice assignment on lists → [0, 1, 9, 4, 5]
copy = nums[:]   # shallow copy of the whole list
```

Slicing never raises IndexError (`s[10:20]` → `''`), and it always creates a **new** list/string (O(k) for k elements). `slice(1, 4)` objects and `__getitem__` let your own classes support slicing.

### Lists, tuples, sets, dicts: everyday operations
```python
nums = [3, 1, 2]
nums.append(4); nums.extend([5, 6]); nums.insert(0, 9); nums.pop(); nums.remove(9)
nums.sort(); sorted(nums, reverse=True); nums.reverse(); nums.index(2); len(nums)
first, *rest = nums                       # unpacking
a, b = b, a                               # swap

point = (3, 4); x, y = point
from collections import namedtuple
P = namedtuple("P", "x y"); p = P(1, 2); p.x

s1, s2 = {1, 2, 3}, {2, 3, 4}
s1 | s2, s1 & s2, s1 - s2, s1 ^ s2         # union, intersection, difference, symmetric difference

d = {"a": 1}
d["b"] = 2; d.get("z", 0); d.setdefault("c", []).append(1)
for k, v in d.items(): ...
d.pop("a"); "b" in d; list(d.keys()); {**d, "x": 9}
```

### Functions, lambda, map/filter/reduce
```python
def greet(name: str, greeting: str = "Hello") -> str:
    """Docstring: shows up in help()."""
    return f"{greeting}, {name}"

square = lambda x: x * x
list(map(square, [1, 2, 3]))                          # [1, 4, 9]
list(filter(lambda x: x % 2, range(10)))              # odd numbers
from functools import reduce
reduce(lambda acc, x: acc + x, [1, 2, 3], 0)          # 6
# Comprehensions are usually clearer than map/filter.
```

Functions are **first-class objects**: they can be passed, returned and stored in data structures.

### Modules, packages, imports
```python
import os, json
from pathlib import Path
from mypkg.utils import parse_price as parse     # mypkg/ has an __init__.py (a regular package)

if __name__ == "__main__":                       # runs only when executed directly, not when imported
    main()
```

- A **module** is a `.py` file; a **package** is a directory of modules. Python searches `sys.path` for imports.
- Imports are cached in `sys.modules` (a module's top-level code runs **once**).
- **Circular imports** fail at import time; fix by moving the import inside a function or restructuring.

### File handling
```python
from pathlib import Path
text = Path("config.yml").read_text(encoding="utf-8")

with open("app.log", "r", encoding="utf-8") as f:     # modes: r, w, a, x, rb, wb, r+
    for line in f:                                    # streams line by line
        ...

with open("out.csv", "w", newline="") as f:
    import csv
    csv.writer(f).writerows([["id", "price"], [1, 999]])

import json
data = json.loads('{"a": 1}'); s = json.dumps(data, indent=2)
with open("data.json") as f: obj = json.load(f)
```

### Regular expressions
```python
import re
m = re.search(r"Model:\s*([A-Z0-9-]+)", text)
if m: code = m.group(1)
re.findall(r"\d+", "a1b22c333")        # ['1', '22', '333']
re.sub(r"\s+", " ", messy)            # collapse whitespace
pattern = re.compile(r"(?P<lvl>ERROR|WARN) (?P<svc>\w+)")
for m in pattern.finditer(log): print(m["lvl"], m["svc"])
```

Basics: `.` any char, `\d \w \s`, `[abc]`, `^ $`, `* + ? {m,n}`, groups `( )`, non-greedy `*?`, alternation `|`, raw strings `r"..."`.

### Date and time
```python
from datetime import datetime, timedelta, timezone
now = datetime.now(timezone.utc)                       # always prefer timezone-aware UTC
ts = datetime.fromisoformat("2026-11-20T09:00:00+05:30")
later = now + timedelta(minutes=5)
now.strftime("%Y-%m-%d %H:%M"); now.isoformat()
```

### Logging (instead of print in real code)
```python
import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger(__name__)
log.info("processed %s in %.2fs", collection_id, secs)   # lazy formatting
log.exception("failed")                                    # inside except: includes the traceback
```

---

## 1. Everything is an object; names are references

```python
a = [1, 2, 3]
b = a            # b points to the SAME list
b.append(4)      # a is now [1, 2, 3, 4]
```

- Variables are **names bound to objects**, not boxes holding values.
- **Mutable:** list, dict, set, bytearray, most custom objects. **Immutable:** int, float, str, tuple, frozenset, bytes.
- **`is` vs `==`:** `is` checks identity (same object), `==` checks value. Use `is` only for `None` (`if x is None`).
- **Small integer caching:** CPython caches -5..256, so `a is b` may be True for small ints and False for big ones. Never rely on it.
- **Function arguments are passed by "object reference" (assignment).** Mutating a list inside a function changes the caller's list. Rebinding the name doesn't.

### The mutable default argument trap (asked very often)
```python
def add(item, bucket=[]):      # BUG: the list is created ONCE, at definition time
    bucket.append(item); return bucket
add(1); add(2)                 # → [1, 2]  (shared!)

def add(item, bucket=None):    # FIX
    if bucket is None: bucket = []
    bucket.append(item); return bucket
```

### Shallow vs deep copy
```python
import copy
x = [[1, 2], [3]]
s = x[:]  or  list(x)  or  copy.copy(x)   # new outer list, SAME inner lists
d = copy.deepcopy(x)                      # recursively copied
```

## 2. Built-in data structures: internals and costs

| Type | Implementation | Notes |
|---|---|---|
| `list` | dynamic array of pointers | append O(1) amortised (over-allocates); `insert(0, x)` and `pop(0)` are O(n) |
| `dict` | hash table (open addressing) | O(1) average; **keeps insertion order** (guaranteed since 3.7); keys must be hashable |
| `set` | hash table | O(1) membership |
| `tuple` | fixed array | immutable; hashable if its contents are |
| `str` | immutable sequence of Unicode code points | `s += x` in a loop can be O(n²): use `''.join(parts)` |
| `collections.deque` | doubly linked list of blocks | O(1) at both ends |

**Hashability:** an object is hashable if it has `__hash__` and doesn't change. Lists can't be dict keys; tuples of immutables can. If you define `__eq__` on a class you must also define `__hash__`, or instances become unhashable.

## 3. Comprehensions, iterators, generators

```python
squares = [x * x for x in range(10) if x % 2 == 0]
index = {name: i for i, name in enumerate(names)}
total = sum(x * x for x in range(10**6))   # generator expression: O(1) memory
```

- **Iterator protocol:** an iterable has `__iter__()`, which returns an iterator. An iterator has `__next__()`, which raises `StopIteration` at the end. `for` loops call these for you.
- **Generators** (`yield`) produce values lazily and pause between them, so they use constant memory:

```python
def read_large_file(path):
    with open(path) as f:
        for line in f:            # files are lazy iterators too
            yield line.rstrip()
```

- **When to use generators:** streaming large files or logs (think NDJSON telemetry line by line), pipelines, infinite sequences.
- `yield from sub_gen()` delegates to another generator.

## 4. Functions: closures, decorators, `*args`/`**kwargs`

```python
def f(a, b=2, *args, key=None, **kwargs): ...
# a: positional, b: default, args: extra positionals (tuple), key: keyword-only, kwargs: extra keywords (dict)
```

- **LEGB scope rule:** Local → Enclosing → Global → Built-in. `nonlocal` rebinds an enclosing variable; `global` rebinds a module variable.
- **Closure:** an inner function remembers variables from its enclosing scope.
- **Late-binding trap:** `fns = [lambda: i for i in range(3)]` → all return 2. Fix: `lambda i=i: i`.

### Decorators (you wrote one at Dell, so know them deeply)
A decorator is a function that takes a function and returns a new function, adding behaviour **without changing the original code** (the open/closed principle).

```python
import functools, time

def retry(times=3, delay=1.0):              # decorator with arguments = 3 layers
    def decorator(func):
        @functools.wraps(func)               # keeps func's __name__, docstring
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if attempt == times: raise
                    time.sleep(delay * 2 ** (attempt - 1))   # exponential backoff
        return wrapper
    return decorator

@retry(times=3)
def call_api(): ...
# @retry(times=3) above is the same as: call_api = retry(times=3)(call_api)
```

**Your cron-aware decorator** (described in file 25): before running a test, it checked whether the current minute was inside the hourly cron's window (minutes 35–39), and if so it waited until the window passed. One annotation on each affected test, with no change to the test body or the product.

Built-in decorators: `@property`, `@classmethod`, `@staticmethod`, `@functools.lru_cache`, `@dataclass`, `@contextlib.contextmanager`.

## 5. Context managers (`with`)

They guarantee cleanup (files, locks, DB connections), which is Python's version of RAII.

```python
class Timer:
    def __enter__(self): self.t = time.perf_counter(); return self
    def __exit__(self, exc_type, exc, tb):
        print(f"took {time.perf_counter() - self.t:.3f}s")
        return False          # False = don't swallow exceptions

from contextlib import contextmanager
@contextmanager
def opened(path):
    f = open(path)
    try: yield f
    finally: f.close()
```

## 6. Classes and OOP in Python

```python
class Account:
    bank = "Dell Bank"                  # class attribute (shared)
    def __init__(self, owner, balance=0):
        self.owner = owner              # instance attribute
        self._balance = balance         # "_" = internal by convention
    @property
    def balance(self): return self._balance
    def deposit(self, amt):
        if amt <= 0: raise ValueError("amount must be positive")
        self._balance += amt
    @classmethod
    def from_dict(cls, d): return cls(d["owner"], d.get("balance", 0))   # alternative constructor
    @staticmethod
    def is_valid_amount(x): return x > 0
    def __repr__(self): return f"Account({self.owner!r}, {self._balance})"
```

- **Privacy:** `_x` is internal by convention; `__x` triggers **name mangling** (`_Account__x`) to avoid clashes in subclasses. Nothing is truly private.
- **Inheritance and MRO:** with multiple inheritance Python uses the **C3 linearisation** method resolution order (`Class.__mro__`). `super()` follows the MRO, not just "the parent".
- **Dunder (magic) methods:** `__init__`, `__repr__`/`__str__`, `__eq__`/`__hash__`, `__lt__` (sorting), `__len__`, `__getitem__`, `__iter__`, `__contains__`, `__call__`, `__enter__`/`__exit__`.
- **`__new__` vs `__init__`:** `__new__` creates the instance (used for singletons and immutable subclasses); `__init__` initialises it.
- **Abstract classes:** `from abc import ABC, abstractmethod`.
- **`@dataclass`** auto-generates `__init__`, `__repr__` and `__eq__`. Use `frozen=True` for immutable, and `slots=True` to save memory.
- **`__slots__`** removes the per-instance `__dict__`: less memory, faster attribute access.
- **Duck typing:** "if it walks like a duck…" Python cares about behaviour (methods), not declared type. `typing.Protocol` gives structural typing for type checkers.

## 7. Type hints and Pydantic

```python
from typing import Optional, Union
def find(user_id: int, tags: list[str] | None = None) -> dict[str, int]: ...
```

- Type hints are **not enforced at runtime**. Tools like mypy and pyright check them statically.
- **Pydantic** *does* validate at runtime: it parses input into typed models and raises clear errors. That's why FastAPI uses it for request and response bodies:

```python
from pydantic import BaseModel, Field
class AnalyzeRequest(BaseModel):
    title: str = Field(max_length=500)
    reviews: list[str] = Field(max_length=350)     # your extension caps request sizes like this
```

## 8. The GIL, threading, multiprocessing, asyncio (very frequently asked)

**GIL (Global Interpreter Lock):** in CPython only **one thread runs Python bytecode at a time**. It exists because CPython's memory management (reference counting) isn't thread-safe, and one big lock was simpler and faster for single-threaded code.

| Workload | Use | Why |
|---|---|---|
| **I/O-bound** (HTTP calls, DB, files) | `threading` or `asyncio` | The GIL is **released while waiting on I/O**, so threads overlap their waiting |
| **CPU-bound** (number crunching, parsing) | `multiprocessing` / `ProcessPoolExecutor` | Separate processes each have their own GIL, so you get real parallelism. Cost: process startup and pickling data between processes |
| **Many concurrent I/O tasks** (thousands of connections) | `asyncio` | Single thread with an event loop; tasks yield at `await`. Very cheap compared with threads |

- NumPy and many C extensions release the GIL inside heavy C code, so they can run in parallel.
- **Python 3.13+** ships an optional **free-threaded build** (no GIL, PEP 703). It's opt-in, not the default yet. Mention it to show you're current.
- **The GIL doesn't make your code thread-safe.** `x += 1` is several bytecodes (load, add, store), so a thread switch can happen in the middle and lose an update. You still need `threading.Lock`.

```python
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
with ThreadPoolExecutor(max_workers=8) as ex:
    results = list(ex.map(fetch_url, urls))          # I/O-bound

import asyncio, httpx
async def fetch_all(urls):
    async with httpx.AsyncClient() as client:
        return await asyncio.gather(*(client.get(u) for u in urls))
asyncio.run(fetch_all(urls))
```

**asyncio trap:** calling a blocking function (`time.sleep`, the `requests` library, a heavy CPU loop) inside `async def` **blocks the whole event loop** and stalls every other request. Use `await asyncio.sleep`, async libraries, or `await asyncio.to_thread(blocking_fn)`.

## 9. Memory management

- **Reference counting:** each object counts how many references point to it and is freed immediately at 0.
- **Cyclic garbage collector:** finds reference cycles (a → b → a) that refcounting can't free. It's generational (gen 0/1/2). The `gc` module controls it.
- `sys.getrefcount(x)`, `sys.getsizeof(x)` (shallow size only), `tracemalloc` for finding leaks.
- Common "leaks" in Python are really **unbounded caches or global lists** that keep growing.

## 10. Exceptions

```python
try:
    risky()
except (ValueError, KeyError) as e:
    log.warning("bad input: %s", e)
except Exception:
    log.exception("unexpected")     # logs the traceback
    raise                           # re-raise; don't swallow silently
else:
    runs_if_no_exception()
finally:
    always_runs()
```

- Catch specific exceptions. A bare `except:` also catches `KeyboardInterrupt`/`SystemExit` (bad).
- Custom exceptions: `class QuotaExceeded(Exception): pass`.
- `raise NewError(...) from e` keeps the cause chain.
- **EAFP** ("easier to ask forgiveness than permission": try/except) is more Pythonic than **LBYL** ("look before you leap": if-checks), and avoids race conditions like check-then-open.

## 11. Useful standard library

`collections` (Counter, defaultdict, deque, OrderedDict, namedtuple), `itertools` (chain, groupby, permutations, combinations, product, islice, accumulate), `functools` (lru_cache, partial, reduce, wraps), `heapq`, `bisect`, `datetime`, `json`, `re`, `pathlib`, `subprocess`, `logging`, `argparse`, `os`/`sys`, `concurrent.futures`, `asyncio`, `dataclasses`, `typing`, `unittest.mock`.

```python
import subprocess
out = subprocess.run(["isi", "status", "-q"], capture_output=True, text=True, check=True).stdout
# check=True raises if the exit code is non-zero; never use shell=True with untrusted input (command injection)
```

## 12. Testing with pytest (you used pytest + tox at Dell)

```python
import pytest
@pytest.fixture
def client():
    return make_test_client()           # setup; use yield for teardown

@pytest.mark.parametrize("raw,expected", [("₹1,299", 1299), ("₹99", 99)])
def test_parse_price(raw, expected):
    assert parse_price(raw) == expected

def test_rejects_bad_token(client, monkeypatch):
    monkeypatch.setenv("ADMIN_TOKEN", "x")
    assert client.get("/api/x").status_code == 401
```

- **Fixtures** for setup and teardown, **parametrize** for table-driven tests, **mock/monkeypatch** to replace external calls (your backend tests use fake models instead of calling OpenAI).
- **Markers:** you ran `-m 'bvt or mvt'` at Dell to select test tiers.
- **tox** runs tests in isolated virtualenvs across Python versions. **Coverage:** `pytest --cov`.
- Test pyramid: many unit tests, fewer integration tests, few end-to-end tests.

## 13. Packaging and environments

- `python -m venv .venv` → isolated dependencies per project. `pip install -r requirements.txt`. Pin versions for reproducibility.
- `pyproject.toml` is the modern project config. Tools: pip, poetry, uv.
- **Python 2 vs 3** (you hit a real bug with this at Dell): `print` became a function, `/` is true division, strings are Unicode by default. Py2 reached end of life in 2020, but old frameworks still invoke the default interpreter, which is exactly why your test framework picked the wrong one.

## 14. Python interview snippets to be fluent in

```python
# Frequency, then top 3
Counter(words).most_common(3)
# Sort by multiple keys
people.sort(key=lambda p: (-p.age, p.name))
# Group lines by a key
from itertools import groupby
for k, grp in groupby(sorted(logs, key=keyf), key=keyf): ...
# Flatten
[x for row in matrix for x in row]
# Read a big log and count errors per service (generator, O(1) memory)
counts = Counter(line.split()[2] for line in open("app.log") if " ERROR " in line)
# Merge dicts
merged = a | b                      # 3.9+
# Swap
a, b = b, a
```

## 15. Advanced Python

### Iterators and generators, more deeply
```python
class Countdown:                          # a custom iterator
    def __init__(self, n): self.n = n
    def __iter__(self): return self
    def __next__(self):
        if self.n <= 0: raise StopIteration
        self.n -= 1; return self.n + 1

def pipeline(lines):                      # chained generators = a lazy data pipeline
    parsed = (parse(l) for l in lines)
    errors = (p for p in parsed if p.level == "ERROR")
    yield from errors

def accumulator():                        # generators can receive values (coroutine style)
    total = 0
    while True:
        x = yield total
        total += x
g = accumulator(); next(g); g.send(5); g.send(10)   # → 15
```

`itertools`: `islice` (take n from a stream), `chain`, `groupby` (needs sorted input), `product`, `permutations`, `combinations`, `accumulate`, `tee`, `count`, `cycle`, `batched` (3.12+).

### Descriptors and properties
A **descriptor** is an object with `__get__`/`__set__`/`__delete__` that controls attribute access on another class. `@property`, methods, `classmethod` and `staticmethod` are all built on descriptors.

```python
class Positive:
    def __set_name__(self, owner, name): self.name = "_" + name
    def __get__(self, obj, objtype=None): return getattr(obj, self.name)
    def __set__(self, obj, value):
        if value <= 0: raise ValueError(f"{self.name[1:]} must be positive")
        setattr(obj, self.name, value)

class Order:
    qty = Positive()                      # reusable validation
    def __init__(self, qty): self.qty = qty
```

### Attribute hooks
`__getattr__` (called only when normal lookup fails: proxies, lazy loading), `__getattribute__` (every access; easy to break), `__setattr__`, `__dir__`.

### Metaclasses (classes that create classes)
`type` is the default metaclass: `type("Name", (Base,), {"x": 1})` creates a class. A custom metaclass can register or validate classes at definition time (ORMs and plugin registries use this). Simpler alternatives exist: `__init_subclass__` and class decorators.

```python
class PluginBase:
    registry = {}
    def __init_subclass__(cls, **kw):
        super().__init_subclass__(**kw)
        PluginBase.registry[cls.__name__] = cls    # auto-register every parser plugin
class PowerStoreParser(PluginBase): ...
```

### Abstract base classes and Protocols
```python
from abc import ABC, abstractmethod
class Storage(ABC):
    @abstractmethod
    def save(self, key: str, data: bytes) -> None: ...

from typing import Protocol
class SupportsSave(Protocol):              # structural typing: anything with save() fits
    def save(self, key: str, data: bytes) -> None: ...
```

### Advanced typing
`TypeVar` and generics (`def first[T](xs: list[T]) -> T` in 3.12 syntax), `Callable[[int], str]`, `Literal["same", "variant"]`, `TypedDict`, `Annotated`, `Final`, `overload`. Run `mypy`/`pyright` in CI.

### functools power tools
`partial` (pre-fill arguments), `lru_cache`/`cache` (memoise), `cached_property`, `singledispatch` (function overloading by argument type), `total_ordering`, `wraps`, `reduce`.

### Concurrency in depth
```python
# multiprocessing: real parallelism for CPU-bound work
from concurrent.futures import ProcessPoolExecutor
with ProcessPoolExecutor() as ex:
    results = list(ex.map(cpu_heavy, chunks))      # arguments/results are pickled between processes

# asyncio: tasks, concurrency limits, timeouts, queues
import asyncio
async def fetch(sem, client, url):
    async with sem:                                  # limit to N concurrent requests
        return await asyncio.wait_for(client.get(url), timeout=10)

async def main(urls):
    sem = asyncio.Semaphore(10)
    async with httpx.AsyncClient() as client:
        tasks = [asyncio.create_task(fetch(sem, client, u)) for u in urls]
        return await asyncio.gather(*tasks, return_exceptions=True)

# async producer/consumer
async def worker(q: asyncio.Queue):
    while True:
        item = await q.get()
        try: await handle(item)
        finally: q.task_done()
```

`asyncio.TaskGroup` (3.11+) gives structured concurrency (if one task fails, the others are cancelled). Event loop internals: a single thread running ready callbacks; an `await` on I/O registers interest with the OS selector (epoll/kqueue) and yields.

### Memory and performance

- `sys.getsizeof`, `tracemalloc`, `__slots__`, generators instead of lists, `array`/`numpy` for numeric data, `memoryview` (zero-copy slices of bytes).
- **Profiling:** `python -m cProfile -s cumtime app.py`, `py-spy` (sampling profiler, works on live processes), `timeit` for micro-benchmarks.
- Speed tips: use built-ins (written in C), local variables in hot loops, `set` for membership tests, `str.join`, avoid repeated attribute lookups, vectorise with NumPy, move hot code to C extensions/Cython/Rust if truly needed.
- `weakref`: references that don't keep objects alive (caches, observer lists).

### Python internals worth knowing

- **CPython** compiles source to **bytecode** (`dis.dis(func)` shows it; cached as `.pyc` in `__pycache__`), then a stack-based virtual machine executes it.
- Other implementations: **PyPy** (JIT: faster for pure-Python loops), Jython, MicroPython.
- Python 3.11+ is notably faster (the specialising adaptive interpreter); 3.13 added an experimental JIT and the optional free-threaded build.

### Packaging and project structure
```
myservice/
├── pyproject.toml          # metadata, dependencies, tool config (ruff, pytest, mypy)
├── src/myservice/__init__.py
├── src/myservice/api.py
└── tests/test_api.py
```

Tools: `pip` + `venv`, `uv` (fast), `poetry`; linters/formatters `ruff`, `black`; type checkers `mypy`/`pyright`; pre-commit hooks.

## 16. Installing and running Python

- Install from python.org, your OS package manager, or a version manager (`pyenv`, `uv python install`). Check: `python3 --version`.
- **The REPL** (interactive shell): type `python3`, then expressions run immediately (`>>> 2 + 3`). `help(str)`, `dir(obj)` and `type(x)` are your friends. **IPython/Jupyter** are richer interactive environments.
- **Run a script:** `python3 hello.py`. Run a module: `python3 -m http.server 8000`, `python3 -m pytest`.
- **Indentation is syntax:** blocks are defined by indentation (4 spaces by convention), not braces.
- **Comments** with `#`; **docstrings** (`"""…"""`) as the first statement of a module, function or class.
- **Shebang** for executable scripts: `#!/usr/bin/env python3`, then `chmod +x script.py`.

## 17. Numbers in depth
```python
7 / 2      # 3.5   true division (always a float)
7 // 2     # 3     floor division (rounds toward −∞: -7 // 2 == -4)
7 % 2      # 1     modulo (same sign as the divisor: -7 % 2 == 1)
2 ** 10    # 1024  power;  pow(2, 10, 1000) → 24 (modular power)
divmod(17, 5)    # (3, 2)
abs(-3), round(2.675, 2), round(2.5), round(3.5)   # 3, 2.67 (float error!), 2, 4 (banker's rounding to even)
int("ff", 16), bin(10), hex(255), oct(8)            # 255, '0b1010', '0xff', '0o10'
10**100                                              # ints have unlimited size
0.1 + 0.2 == 0.3          # False → binary floating point can't represent 0.1 exactly
import math; math.isclose(0.1 + 0.2, 0.3)            # True
from decimal import Decimal; Decimal("0.1") + Decimal("0.2")   # Decimal('0.3') → use for money
from fractions import Fraction; Fraction(1, 3) + Fraction(1, 6)  # Fraction(1, 2)
complex(1, 2) * 1j                                   # complex numbers built in
math.floor, math.ceil, math.sqrt, math.log, math.pi, math.inf, math.nan, math.gcd, math.comb, math.factorial
float("inf") > 10**308, float("nan") != float("nan")   # True, True (NaN isn't equal even to itself)
```

Integers are objects; ints from -5 to 256 are cached (§1). `sys.maxsize` is the largest native index, not a limit on int size.

## 18. Strings, formatting, Unicode, bytes, and console I/O
**Every common string method:**

```python
s = "  PowerScale OneFS  "
s.strip(), s.lstrip(), s.rstrip()           # trim whitespace (or given characters)
s.lower(), s.upper(), s.title(), s.capitalize(), s.swapcase(), s.casefold()   # casefold for caseless comparison
s.split(), "a,b,,c".split(","), "a b".split(maxsplit=1), s.splitlines(), "k=v".partition("=")
"-".join(["a", "b"]), s.replace("One", "Two", 1)
s.find("FS"), s.index("FS"), s.rfind("e"), s.count("e")   # find → -1 if missing; index raises ValueError
s.startswith(("Pow", "Iso")), s.endswith("FS ")
"abc".isalpha(), "123".isdigit(), "a1".isalnum(), " ".isspace(), "Ab".istitle()
"7".zfill(3), "x".center(9, "*"), "x".ljust(5, "."), "x".rjust(5)
"Hello"[::-1]                                # reverse (slicing)
"tab\tnew\nline", r"C:\raw\path", """multi
line"""
```

**Strings are immutable**, so every method returns a **new** string.
**Formatting: three styles (f-strings are preferred):**

```python
name, pct, n = "Unity", 0.9134, 1234567
f"{name} at {pct:.1%}, {n:,} items"          # 'Unity at 91.3%, 1,234,567 items'
f"{n:>12}|{name:<8}|{name:^10}|{42:08.3f}|{255:#x}|{255:b}"   # alignment, width, zero-pad, hex, binary
f"{name=}"                                   # debugging: "name='Unity'" (3.8+)
"{} has {:.2f}".format(name, 3.14159)        # str.format
"%s has %.2f" % (name, 3.14159)              # old printf style (still seen in logging)
```

**Format spec mini-language:** `[fill][align][sign][#][0][width][,][.precision][type]`, with types `d f e % x o b s`.
**Unicode and bytes:** `str` holds Unicode code points; `bytes` holds raw 8-bit values. Convert at the boundaries:

```python
"₹1,299".encode("utf-8")        # b'\xe2\x82\xb91,299'  (₹ takes 3 bytes in UTF-8)
b"\xe2\x82\xb9".decode("utf-8") # '₹'
len("₹"), len("₹".encode())     # 1, 3
ord("A"), chr(65)               # 65, 'A'
bytearray(b"abc")               # a mutable sequence of bytes
```

Always open text files with an explicit `encoding="utf-8"`.
**Console I/O:**

```python
name = input("Name: ")                       # always returns a str → convert: int(input())
a, b = map(int, input().split())             # read two ints from one line
print("a", "b", sep=",", end="!\n")          # a,b!
print("error", file=sys.stderr, flush=True)
import sys; data = sys.stdin.read()          # read everything (fast input for big data)
```

## 19. Collections, more completely
```python
# Lists: methods
lst = [3, 1, 2]
lst.append(4); lst.extend([5]); lst.insert(0, 9); lst.remove(9); lst.pop(); lst.pop(0)
lst.index(2); lst.count(2); lst.sort(); lst.sort(reverse=True); lst.reverse(); lst.copy(); lst.clear()
[0] * 3                       # [0, 0, 0]
[[0] * 3] * 2                 # ⚠ the SAME inner list twice → use [[0] * 3 for _ in range(2)]
# Sorting: stable; key functions; sorted() returns a new list, list.sort() sorts in place
people = [{"name": "Asha", "age": 30}, {"name": "Ravi", "age": 25}]
sorted(people, key=lambda p: p["age"])
from operator import itemgetter, attrgetter
sorted(people, key=itemgetter("age", "name"), reverse=True)
min(people, key=itemgetter("age")); max(nums, default=0)
# Tuples
t = (1, 2, 3); x, *rest = t; t.count(1); t.index(2); single = (5,)
# Sets: unique, unordered, fast membership; elements must be hashable
s = {1, 2}; s.add(3); s.discard(9); s.remove(2); s |= {7}; s.issubset({1, 3, 7, 8}); frozenset(s)
# Dicts
d = {"a": 1, "b": 2}
d.keys(), d.values(), d.items(), d.get("z", 0), d.pop("a"), d.popitem(), d.update(c=3), d.setdefault("x", [])
dict.fromkeys(["a", "b"], 0); {**d, "k": 1}; d | {"k": 1}; d |= {"k": 2}
{k: v for k, v in d.items() if v > 1}        # dict comprehension
# Built-ins that work on any iterable
len, sum, min, max, any, all, sorted, reversed, enumerate, zip, map, filter, range, iter, next
```

**Which collection?** an ordered sequence → `list`; fixed records → `tuple`/`namedtuple`/`dataclass`; membership/dedup → `set`; lookup by key → `dict`; queue/deque → `collections.deque`; counting → `Counter`; grouping → `defaultdict(list)`; priority → `heapq`.

## 20. Functions, completely
```python
def connect(host, port=443, /, *, timeout=5.0, **opts):
    """host and port are positional-only (before /); timeout is keyword-only (after *)."""
    ...
connect("db.local", 5432, timeout=2)         # ✅
# connect(host="db.local")                   # ❌ host is positional-only

def total(*nums: float) -> float:            # *args → a tuple
    return sum(nums)
def configure(**settings):                   # **kwargs → a dict
    for k, v in settings.items(): print(k, v)
args = (1, 2); kwargs = {"timeout": 3}
total(*args); connect("h", **kwargs)         # unpacking at the call site
```

**Rules:** parameter order is positional-only, then normal, then `*args`, then keyword-only, then `**kwargs`. Default values are evaluated **once** (the mutable-default trap, §1). Functions return `None` if there's no `return`. Return several values as a tuple: `return mn, mx`.
**Recursion:** the default recursion limit is about 1000 (`sys.setrecursionlimit`); Python has no tail-call optimisation, so prefer loops for deep recursion.
**Higher-order functions and closures:** functions can take and return functions (§4). **Lambdas** are single-expression anonymous functions; use `def` for anything non-trivial.
**Annotations and docstrings:** `def area(w: float, h: float) -> float:` plus a docstring; `help(area)` shows it.

## 21. Exceptions, completely
**The exception hierarchy (main branches):**

```
BaseException
├── SystemExit, KeyboardInterrupt, GeneratorExit      ← don't catch these by accident
└── Exception
    ├── ArithmeticError → ZeroDivisionError, OverflowError
    ├── LookupError → IndexError, KeyError
    ├── ValueError → UnicodeDecodeError …
    ├── TypeError, AttributeError, NameError
    ├── OSError → FileNotFoundError, PermissionError, TimeoutError, ConnectionError …
    ├── RuntimeError → RecursionError, NotImplementedError
    ├── ImportError → ModuleNotFoundError
    └── StopIteration, AssertionError, …
```
```python
class AppError(Exception):                     # your own hierarchy
    """Base for this application's errors."""
class QuotaExceeded(AppError):
    def __init__(self, user, limit):
        super().__init__(f"{user} exceeded {limit}"); self.user, self.limit = user, limit

try:
    raise QuotaExceeded("u42", 150)
except QuotaExceeded as e:
    print(e.user, e)
except (KeyError, IndexError):
    ...
else:
    ...          # no exception happened
finally:
    ...          # always runs (cleanup)

raise ValueError("bad price") from original_error     # chain: keeps the cause
assert price >= 0, "price must be non-negative"         # removed with python -O: not for input validation
try:
    ...
except* ValueError as group:                            # 3.11+: handle ExceptionGroups (e.g. from TaskGroup)
    ...
import warnings; warnings.warn("deprecated", DeprecationWarning)
```

Catch narrow exceptions, log with the traceback (`log.exception`), re-raise what you can't handle, and never silently `pass`.

## 22. Files, paths and OS utilities, completely
```python
from pathlib import Path
p = Path("logs") / "2026" / "app.log"          # build paths with /
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text("hello\n", encoding="utf-8"); p.read_text(encoding="utf-8")
p.exists(), p.is_file(), p.suffix, p.stem, p.name, p.stat().st_size, p.resolve()
for f in Path("logs").rglob("*.log"): print(f)  # recursive glob

with open("big.log", encoding="utf-8") as f:
    for line_no, line in enumerate(f, 1): ...    # stream line by line (constant memory)
with open("img.bin", "rb") as f:
    while chunk := f.read(64 * 1024): ...        # read binary in chunks
with open("out.txt", "a", encoding="utf-8") as f: f.write("line\n")

import csv
with open("in.csv", newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f): print(row["product"])
import json
json.dumps(obj, indent=2, default=str); json.loads(text)
import pickle                                   # Python-only binary serialisation; NEVER unpickle untrusted data
pickle.dump(obj, open("x.pkl", "wb"))
import os, shutil, tempfile, glob
os.environ.get("HOME"); os.getcwd(); os.listdir("."); os.remove("f"); os.rename("a", "b")
shutil.copy("a", "b"); shutil.copytree("src", "dst"); shutil.rmtree("tmp"); shutil.disk_usage("/")
with tempfile.TemporaryDirectory() as d: ...
glob.glob("*.py")
```

## 23. Modules and packages, completely
```
myapp/
├── pyproject.toml
└── src/myapp/
    ├── __init__.py          # marks a regular package; runs on import; can re-export names
    ├── __main__.py          # makes `python -m myapp` work
    ├── config.py
    └── services/
        ├── __init__.py
        └── pricing.py       # inside: from ..config import settings   (relative import)
```

- `import x` runs `x`'s top-level code once and caches it in `sys.modules`; later imports reuse it.
- **Absolute imports** (`from myapp.config import settings`) are clearer than relative ones (`from .config import settings`).
- `__all__ = ["public_fn"]` controls `from module import *` (avoid star imports anyway).
- **Search path:** the script's directory, `PYTHONPATH`, then site-packages (`sys.path`).
- **Namespace packages** (no `__init__.py`) can be split across directories.
- **Dynamic import:** `importlib.import_module("myapp.plugins.unity")` (plugin systems).
- Avoid naming your files after standard modules (`json.py`, `random.py`): they shadow the real ones.

## 24. OOP, completely
**Inheritance, overriding, `super()`, polymorphism:**

```python
class Parser:
    def __init__(self, product: str): self.product = product
    def parse(self, raw: str) -> dict: raise NotImplementedError
    def run(self, raw):                                   # template method
        record = self.parse(raw); record["product"] = self.product; return record

class UnityParser(Parser):
    def __init__(self): super().__init__("Unity")         # call the parent's __init__
    def parse(self, raw): return {"lines": raw.count("\n")}

for p in [UnityParser()]: print(p.run("a\nb\n"))          # polymorphism: same call, subclass behaviour
isinstance(UnityParser(), Parser), issubclass(UnityParser, Parser)   # True, True
```

**Special (dunder) methods: make your objects behave like built-ins:**

| Method | Enables |
|---|---|
| `__repr__` / `__str__` | `repr(x)` (for developers) / `str(x)`, `print(x)` |
| `__eq__`, `__lt__` (+ `functools.total_ordering`), `__hash__` | `==`, `<`, sorting, use as dict keys |
| `__add__`, `__sub__`, `__mul__`, `__radd__`, `__iadd__` | `+`, `-`, `*`, `sum()`, `+=` |
| `__len__`, `__bool__` | `len(x)`, truthiness |
| `__getitem__`, `__setitem__`, `__delitem__`, `__contains__` | `x[k]`, `x[k] = v`, `del x[k]`, `in` |
| `__iter__`, `__next__` | `for` loops |
| `__call__` | `x()` (objects as functions) |
| `__enter__`, `__exit__` | `with x:` |
| `__getattr__`, `__setattr__` | dynamic attributes |

```python
from dataclasses import dataclass, field
from functools import total_ordering
@total_ordering
@dataclass(frozen=True)
class Money:
    amount: int                 # paise
    currency: str = "INR"
    def __add__(self, other: "Money") -> "Money":
        if other.currency != self.currency: raise ValueError("currency mismatch")
        return Money(self.amount + other.amount, self.currency)
    def __lt__(self, other): return self.amount < other.amount
    def __str__(self): return f"₹{self.amount / 100:,.2f}"
print(Money(129900) + Money(100))            # ₹1,300.00

@dataclass
class Cart:
    items: list[str] = field(default_factory=list)   # never a mutable default directly
```

**Enums:**

```python
from enum import Enum, auto, IntEnum, StrEnum
class Status(Enum):
    RECEIVED = auto(); PROCESSED = auto(); FAILED = auto()
Status.FAILED.name, Status.FAILED.value, Status["FAILED"], [s for s in Status]
```

**Composition over inheritance**, **multiple inheritance and mixins** (`class Service(LoggingMixin, BaseService)`, resolved by the MRO), **class/static methods** and **properties** (§6), **`__slots__`** (§6), **ABCs/Protocols** (§15).

## 25. The standard library tour

| Area | Modules |
|---|---|
| Text | `string`, `re`, `textwrap`, `difflib`, `unicodedata` |
| Data structures | `collections` (deque, Counter, defaultdict, OrderedDict, namedtuple, ChainMap), `heapq`, `bisect`, `array`, `queue`, `enum`, `dataclasses` |
| Functional | `itertools`, `functools`, `operator` |
| Numbers | `math`, `decimal`, `fractions`, `random`, `statistics` |
| Files and OS | `pathlib`, `os`, `shutil`, `glob`, `tempfile`, `io`, `stat` |
| Data formats | `json`, `csv`, `pickle`, `sqlite3`, `xml.etree.ElementTree`, `tomllib` (read TOML), `configparser`, `base64`, `zipfile`, `tarfile`, `gzip` |
| Time | `datetime`, `time`, `zoneinfo`, `calendar` |
| Concurrency | `threading`, `multiprocessing`, `concurrent.futures`, `asyncio`, `subprocess`, `sched` |
| Networking | `socket`, `ssl`, `urllib.request`, `http.server`, `http.client`, `email`, `smtplib` |
| Dev tools | `logging`, `argparse`, `unittest`, `unittest.mock`, `doctest`, `pdb`, `cProfile`, `timeit`, `traceback`, `warnings`, `typing`, `inspect`, `dis` |
| Security | `hashlib`, `hmac`, `secrets` |
| Runtime | `sys`, `gc`, `weakref`, `importlib`, `contextlib`, `abc`, `copy` |

## 26. Web, databases and command-line apps
```python
# HTTP calls (third-party libraries: requests (sync), httpx (sync + async))
import httpx
r = httpx.get("https://api.example.com/items", params={"q": "ssd"}, timeout=10)
r.raise_for_status(); data = r.json()
httpx.post(url, json={"name": "x"}, headers={"Authorization": f"Bearer {token}"})

# SQLite, built in (your extension's backend uses it for usage counters)
import sqlite3
with sqlite3.connect("usage.db") as conn:
    conn.execute("CREATE TABLE IF NOT EXISTS usage(install TEXT, day TEXT, n INT, PRIMARY KEY(install, day))")
    conn.execute("INSERT INTO usage VALUES (?, ?, 1) ON CONFLICT(install, day) DO UPDATE SET n = n + 1", ("i1", "2026-11-21"))
    n, = conn.execute("SELECT n FROM usage WHERE install = ? AND day = ?", ("i1", "2026-11-21")).fetchone()
# Other databases: psycopg (PostgreSQL), PyMySQL/mysqlclient, pymongo, redis-py, SQLAlchemy (ORM)

# Command-line interface
import argparse
parser = argparse.ArgumentParser(description="Collection report")
parser.add_argument("path", help="log directory")
parser.add_argument("--days", type=int, default=7)
parser.add_argument("-v", "--verbose", action="store_true")
args = parser.parse_args()            # python report.py /var/log --days 3 -v
# Richer CLIs: click, typer
```

## 27. Debugging and testing, completely
```python
breakpoint()                     # drops into pdb at this line (3.7+)
# pdb commands: n(ext), s(tep), c(ontinue), l(ist), p expr, pp expr, w(here), u/d (up/down the stack), b file:line, q
python -m pdb script.py          # start the whole script under the debugger
import traceback; traceback.print_exc()

# unittest (built in)
import unittest
class TestMoney(unittest.TestCase):
    def test_add(self): self.assertEqual(Money(1) + Money(2), Money(3))
    def test_mismatch(self):
        with self.assertRaises(ValueError): Money(1, "INR") + Money(1, "USD")

# mocking external calls
from unittest.mock import patch, MagicMock
@patch("myapp.services.pricing.httpx.get")
def test_price_lookup(mock_get):
    mock_get.return_value = MagicMock(status_code=200, json=lambda: {"price": 999})
    assert lookup_price("sku1") == 999
```

pytest (§12) is the most common runner; add `pytest-cov` (coverage), `hypothesis` (property-based tests), `pytest-asyncio` (async tests).

## 28. Code style and project hygiene

- **PEP 8:** 4-space indents; `snake_case` for functions and variables, `PascalCase` for classes, `UPPER_CASE` for constants; ~79–100 characters per line; imports grouped (stdlib, third-party, local).
- **PEP 20, the Zen of Python** (`import this`): "Beautiful is better than ugly. Explicit is better than implicit. Simple is better than complex. Readability counts. Errors should never pass silently…"
- **PEP 257** (docstrings), **PEP 484** (type hints).
- **Tooling:** `ruff` (lint + format), `black`, `mypy`/`pyright`, `pre-commit` hooks, `pip-audit` (vulnerable dependencies).
- **Environments:** one virtual environment per project; pin dependencies; never commit `.venv` or secrets.

## 29. The Python ecosystem (know what each is for)

| Area | Libraries |
|---|---|
| Web APIs | **FastAPI**, Flask, Django (+ DRF), Starlette |
| HTTP clients | requests, **httpx**, aiohttp |
| Data | **NumPy** (fast arrays), **Pandas** (tables/DataFrames), Polars (fast DataFrames), PyArrow, DuckDB |
| Visualisation | Matplotlib, Seaborn, Plotly |
| ML/AI | scikit-learn, PyTorch, TensorFlow, Hugging Face Transformers, **OpenAI SDK**, **LangChain/LangGraph**, LlamaIndex |
| Databases | SQLAlchemy, psycopg, pymongo, redis-py, elasticsearch-py |
| Messaging | confluent-kafka, pika (RabbitMQ), celery |
| Testing | pytest, hypothesis, locust (load testing) |
| Validation/config | **Pydantic**, pydantic-settings |
| DevOps/automation | boto3 (AWS), kubernetes client, fabric, ansible |

**NumPy in 5 lines:** `import numpy as np; a = np.array([1, 2, 3]); a * 2` (vectorised, no Python loop) → `array([2, 4, 6])`; `a.mean()`, `a.reshape(3, 1)`, broadcasting, boolean masks `a[a > 1]`.
**Pandas in 5 lines:** `import pandas as pd; df = pd.read_csv("collections.csv"); df[df.status == "FAILED"].groupby("product")["size_mb"].mean().sort_values()`.

## 30. Python exercises (do them in order)

1. FizzBuzz, then a number-guessing game with `input()` and `random`.
2. Word frequency of a text file with `Counter`; print the top 10 formatted as a table.
3. Parse a CSV of collections; compute the SLA % per product; write a JSON report.
4. A `BankAccount` class with validation, `__repr__`, and custom exceptions; unit-test it.
5. A `@retry` decorator with exponential backoff and a `@timer` decorator.
6. A generator that streams a 1 GB log file and yields only the ERROR lines as dicts.
7. Concurrently download 50 URLs with a `ThreadPoolExecutor`, then with `asyncio` + `httpx`; compare times.
8. A CLI tool with `argparse` that summarises a directory's file sizes by extension.
9. An LRU cache class, tested with pytest + parametrize.
10. A tiny FastAPI service with SQLite, validation and tests (file 15).

## Interview traps

1. Mutable default arguments. 2. `is` vs `==`. 3. "Does the GIL make my code thread-safe?" No. 4. Threads for CPU-bound work: no gain. 5. Blocking calls inside `async def`. 6. Late-binding lambdas in loops. 7. Modifying a list while iterating over it. 8. `dict` order: insertion order since 3.7. 9. Shallow copy of nested lists. 10. `except Exception: pass`, which hides bugs.

## Quick revision

- Names are references; mutable vs immutable; shallow vs deep copy.
- list = dynamic array, dict/set = hash table (ordered dicts since 3.7).
- Generators = lazy, O(1) memory. Decorators = wrap a function (use `functools.wraps`). Context managers = guaranteed cleanup.
- GIL: one thread runs bytecode at a time. Threads/asyncio for I/O, processes for CPU. 3.13 has an optional free-threaded build.
- Refcounting + cyclic GC. pytest fixtures, parametrize, mocks.

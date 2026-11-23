# 02 · C and C++

**Why these languages exist:** C (1972, Dennis Ritchie at Bell Labs) was made to write the **UNIX operating system** portably. It's "portable assembly": direct memory access, no runtime, no garbage collector, predictable performance. C++ (Bjarne Stroustrup, 1985) added **abstraction without runtime cost**: classes, templates and RAII, so you can build large systems while keeping C's speed ("zero-overhead abstraction").

**Why you used them:** OneFS is a FreeBSD-based OS. The kernel, filesystem and daemons are performance- and memory-critical, so they're written in C/C++. You debugged the Dynamic Licensing backend (C/C++) under a Python test layer, and platform API handlers are in C++ and Python.

**What interviewers check:** memory model (stack vs heap, pointers), undefined behaviour, OOP internals (vtable), RAII and smart pointers, move semantics, STL complexity, and threading primitives.

---

# Part A: C

## Start here: C in plain words

**What C is:** a small, fast language that sits **just above machine code**. You talk almost directly to memory: you decide where data lives, how big it is, and when it's freed. There's no garbage collector and no safety net.
**Analogy:** Python is an automatic car with airbags. C is a manual race car: much faster and more control, but if you make a mistake (like using freed memory), you crash.
**Why it's still everywhere:** operating systems (Linux, FreeBSD, OneFS), databases (PostgreSQL, Redis, SQLite), network stacks, embedded devices, and the runtimes of other languages (CPython is written in C).

### How a C program becomes a running process
```
 hello.c ──► PREPROCESSOR ──► hello.i ──► COMPILER ──► hello.s ──► ASSEMBLER ──► hello.o ─┐
 (source)    (#include,        (expanded     (C → assembly)            (assembly →     │
              #define)          source)                                  machine code)  │
                                                                                         ▼
                 libc.so / other .o files ─────────────────────────────────────────► LINKER ──► ./hello
                                                                                     (joins pieces,      (executable)
                                                                                      resolves names)
 ./hello ──► LOADER (the OS maps the program into memory) ──► process with text, data, heap, stack
```

**Try it yourself in the terminal.** Each command runs one stage, so you can open the file it produces before going to the next. Use Linux or WSL; Mac differences are listed after the block.

```bash
# 0. Write a tiny program
cat > hello.c <<'EOF'
#include <stdio.h>
#define GREETING "Hello"

int main(void) {
    printf("%s, world!\n", GREETING);
    return 0;
}
EOF

# 1. PREPROCESSOR: hello.c → hello.i (headers pasted in, macros replaced)
gcc -E hello.c -o hello.i
wc -l hello.c hello.i            # 7 lines become hundreds: stdio.h was pasted in
tail -5 hello.i                  # GREETING is gone: printf("%s, world!\n", "Hello");

# 2. COMPILER: hello.i → hello.s (assembly, readable text)
gcc -S hello.i -o hello.s
cat hello.s                      # find "main:" and "call printf" (or puts)

# 3. ASSEMBLER: hello.s → hello.o (machine code, not runnable yet)
gcc -c hello.s -o hello.o
file hello.o                     # "ELF 64-bit LSB relocatable"
nm hello.o                       # T main = defined here · U printf = undefined, the linker must find it
objdump -d hello.o | head -20    # the machine code, disassembled

# 4. LINKER: hello.o + libc → ./hello (executable)
gcc hello.o -o hello
file hello                       # "ELF 64-bit LSB ... executable, dynamically linked"
ldd ./hello                      # shared libraries it needs: libc.so.6, ld-linux…

# 5. LOADER: the OS loads it into memory and runs it
./hello                          # Hello, world!
size hello                       # sizes of the text, data and bss sections
```

**Shortcuts and extras:**

- `gcc -save-temps hello.c -o hello` runs all stages at once and **keeps** hello.i, hello.s and hello.o.
- `gcc -v hello.c -o hello` prints every program gcc runs for you (cc1 = compiler, as = assembler, collect2/ld = linker).
- **Static vs dynamic linking:** `gcc -static hello.c -o hello_static && ls -lh hello hello_static`. The static file is much bigger because libc is copied in, and `ldd ./hello_static` says "not a dynamic executable".
- **Watch the loader:** `strace ./hello 2>&1 | head -20` shows `execve`, then libc being opened and mapped into memory (`openat`, `mmap`).
- **On a Mac:** `gcc` is really Clang and files are Mach-O, not ELF. Use `otool -L hello` instead of `ldd`; you'll see `_main` / `_printf` (with an underscore) and `bl _printf` in the assembly. `-static` and `strace` aren't available.

### Pointers in plain words
Memory is a long street of numbered houses (bytes). A **variable** is a house with something inside. A **pointer** is a slip of paper with a **house address** written on it.

```
int x = 42;      int *p = &x;

   address:   1000        1008
            ┌──────┐    ┌──────┐
            │  42  │    │ 1000 │
            └──────┘    └──────┘
               x            p        (p "points to" x;  *p means "go to that address" → 42)
```

- `&x` = "the address of x". `*p` = "the thing at the address in p". `p + 1` = the next element's address (moves by `sizeof(int)`).
- Why pointers matter: functions can modify the caller's data, you can build linked structures (lists, trees), and you can work with memory directly (buffers, hardware).

### Stack vs heap in plain words

- **Stack:** a stack of trays in a canteen. Every function call puts a tray (frame) on top with its local variables; returning removes it automatically. Fast, but small and short-lived.
- **Heap:** a warehouse where you rent space (`malloc`) for as long as you want and **must return it yourself** (`free`). Forgetting = a memory leak; returning it twice or using it after returning = a crash or a security hole.

```
 Process memory
 ┌─────────────────┐ high addresses
 │ stack ↓         │ main() frame → foo() frame → bar() frame (locals, return addresses)
 │                 │
 │ heap ↑          │ malloc'd blocks: [node][buffer][   free   ][node]
 │ BSS / data      │ global & static variables
 │ text (code)     │ compiled instructions (read-only)
 └─────────────────┘ low addresses
```

## C course map: the whole language, A to Z

| # | Chapter | Section |
|---|---|---|
| 1 | What C is, history and standards, compiling, first program | Start here + §0 + §11 |
| 2 | Tokens, keywords, identifiers, comments | §11 |
| 3 | Data types, sizes, literals, constants | §0 + §11 |
| 4 | Operators, precedence, type conversions | §0 + §12 |
| 5 | Control flow (if, switch, loops, break/continue, goto) | §0 + §12 |
| 6 | Functions, recursion, call by value, scope | §0 + §13 |
| 7 | Arrays (1D, 2D, passing to functions) | §0 + §14 |
| 8 | Pointers (everything) | §2 + §14 |
| 9 | Strings and `<string.h>` | §0 + §4 |
| 10 | Structures, unions, enums, bit fields, typedef | §0 + §5 + §15 |
| 11 | Dynamic memory | §3 |
| 12 | File I/O | §0 |
| 13 | Preprocessor and macros | §7 + §16 |
| 14 | Storage classes, scope, linkage, multi-file programs | §6 + §17 |
| 15 | The standard library tour | §18 |
| 16 | Data structures in C (stack, queue, list, hash table, BST) | §19 |
| 17 | Bit manipulation, endianness | §9 |
| 18 | Error handling, `errno`, signals | §0 + §20 |
| 19 | Systems programming: processes, threads (pthreads), sockets | §21 (+ files 06, 07, 08) |
| 20 | Undefined behaviour, security pitfalls, debugging tools | §8 + §22 |
| 21 | Exercises | §23 |

## 0. C basics (start here)

### Program structure, data types, sizes
```c
#include <stdio.h>          // preprocessor: paste the header

int main(int argc, char *argv[]) {     // argc = number of args, argv = the args (argv[0] = program name)
    printf("Hello, %s\n", argc > 1 ? argv[1] : "world");
    return 0;                           // 0 = success (the shell sees it as $?)
}
// compile and run:  gcc -Wall -Wextra -g hello.c -o hello && ./hello Gopal
```

| Type | Typical size (64-bit Linux) | Format specifier |
|---|---|---|
| `char` | 1 byte | `%c` |
| `short` | 2 | `%hd` |
| `int` | 4 | `%d` |
| `long` | 8 (4 on Windows) | `%ld` |
| `long long` | 8 | `%lld` |
| `float` / `double` | 4 / 8 | `%f` / `%lf` (scanf) |
| pointer | 8 | `%p` |
| `size_t` | 8 (unsigned) | `%zu` |

Sizes are platform-dependent, so use `<stdint.h>` (`int32_t`, `uint64_t`) when the exact size matters (file formats, network protocols). `signed` vs `unsigned`: unsigned overflow wraps around (defined); signed overflow is **undefined behaviour**.

### Operators and precedence traps
Arithmetic `+ - * / %` (integer division truncates: `7/2 == 3`), relational, logical `&& || !` (**short-circuit**), bitwise `& | ^ ~ << >>`, assignment, ternary `?:`, `sizeof`, comma. Traps: `if (x = 5)` (assignment, not comparison), `a & b == c` parses as `a & (b == c)`, `i++` vs `++i`.

### Control flow
`if/else`, `switch` (needs `break`, or it falls through), `for`, `while`, `do…while` (runs at least once), `break`, `continue`, `goto` (only for cleanup in kernel-style code).

### Functions: call by value vs "call by reference"
C passes **everything by value**. To let a function modify the caller's variable, pass a **pointer**:

```c
void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }
int x = 1, y = 2; swap(&x, &y);
```

Function **prototypes** (declarations) go in headers; definitions go in `.c` files. **Recursion** works like any language (watch the stack depth).

### Arrays, 2D arrays, and dynamic 2D arrays
```c
int a[5] = {1, 2, 3};                  // remaining elements are 0
int m[3][4];                           // row-major: m[i][j] is at base + (i*4 + j)*sizeof(int)
void print(int rows, int cols, int g[rows][cols]);   // C99 variable-length array parameter

int **grid = malloc(rows * sizeof(int *));             // dynamic 2D (an array of row pointers)
for (int i = 0; i < rows; i++) grid[i] = malloc(cols * sizeof(int));
/* ... */ for (int i = 0; i < rows; i++) free(grid[i]); free(grid);
```

### Strings and `<string.h>`
`strlen`, `strcpy`/`strncpy`, `strcat`/`strncat`, `strcmp` (returns <0, 0 or >0), `strchr`, `strstr`, `strtok` (not thread-safe; use `strtok_r`), `memset`, `memcpy`, `memmove`, `sprintf`/**`snprintf`**, `atoi`/**`strtol`** (strtol reports errors).

### enum, typedef, struct, union
```c
typedef enum { IDLE, RUNNING, FAILED } JobState;
typedef struct Node { int val; struct Node *next; } Node;   // a self-referential struct
```

### A linked list in C (a common C round question)
```c
#include <stdlib.h>
Node *push_front(Node *head, int v) {
    Node *n = malloc(sizeof *n);
    if (!n) return head;              // always check malloc
    n->val = v; n->next = head;
    return n;
}
Node *reverse(Node *head) {
    Node *prev = NULL;
    while (head) { Node *nx = head->next; head->next = prev; prev = head; head = nx; }
    return prev;
}
void free_list(Node *head) { while (head) { Node *nx = head->next; free(head); head = nx; } }
```

### File I/O
```c
FILE *f = fopen("data.txt", "r");                // modes: r, w, a, r+, rb/wb (binary)
if (!f) { perror("fopen"); return 1; }
char line[256];
while (fgets(line, sizeof line, f)) { /* process line */ }
fclose(f);
// Binary: fread(buf, size, count, f) / fwrite(...); fseek/ftell for random access.
// Lower level (POSIX): open/read/write/close with file descriptors; fsync(fd) for durability.
```

### Variadic functions and function pointers
```c
#include <stdarg.h>
int sum(int count, ...) { va_list ap; va_start(ap, count); int s = 0;
    for (int i = 0; i < count; i++) s += va_arg(ap, int); va_end(ap); return s; }

int cmp_int(const void *a, const void *b) { return (*(const int *)a > *(const int *)b) - (*(const int *)a < *(const int *)b); }
qsort(arr, n, sizeof(int), cmp_int);           // callback via a function pointer

typedef void (*handler_t)(const char *msg);    // dispatch tables (common in OS/driver code)
handler_t handlers[] = { on_info, on_warn, on_error };
```

### Error handling in C
Return codes + `errno` (set by system calls; read it with `perror()`/`strerror(errno)`). The "goto cleanup" pattern frees resources in one place:

```c
int process(const char *path) {
    int rc = -1; char *buf = NULL; FILE *f = fopen(path, "r");
    if (!f) goto out;
    buf = malloc(4096); if (!buf) goto out;
    /* ... work ... */ rc = 0;
out:
    free(buf); if (f) fclose(f);
    return rc;
}
```

---

## 1. Memory layout of a process

```
High addresses
┌──────────────────┐
│ Stack            │  local variables, function frames; grows DOWN; ~8 MB default on Linux
│        ↓         │
│                  │
│        ↑         │
│ Heap             │  malloc/new; grows UP; you manage it
├──────────────────┤
│ BSS              │  uninitialised globals/statics (zeroed at start)
│ Data             │  initialised globals/statics
│ Text (code)      │  machine instructions, read-only
└──────────────────┘
Low addresses
```

- **Stack:** automatic, fast (just move the stack pointer), freed when the function returns. Too deep → **stack overflow**.
- **Heap:** manual (`malloc`/`free`), slower (the allocator searches free lists), lives until freed. Problems: leaks, fragmentation.
- String literals like `"hello"` live in read-only memory. Modifying one is undefined behaviour.

## 2. Pointers

```c
int x = 10;
int *p = &x;      // p holds the address of x
*p = 20;          // dereference: x is now 20
int **pp = &p;    // pointer to pointer
int arr[5];       // arr decays to &arr[0] in most expressions
*(arr + 2) == arr[2];   // pointer arithmetic moves by sizeof(int)
```

- **Arrays vs pointers:** `sizeof(arr)` gives the whole array size, but inside a function the parameter `int arr[]` is really an `int *`, so `sizeof` gives the pointer size (8 on 64-bit). That's why C functions take a length argument.
- **`const` placement:** `const int *p` → you can't change the value through p. `int *const p` → you can't change p itself. `const int *const p` → neither.
- **`void *`** is a generic pointer (what `malloc` returns). Cast it before dereferencing.
- **Function pointers:** `int (*cmp)(const void*, const void*)`, used by `qsort` and for callbacks and plugin tables (OS code uses these a lot).
- **NULL pointer** dereference → segmentation fault.

## 3. Dynamic memory

```c
int *a = malloc(n * sizeof(int));    // uninitialised; returns NULL on failure, so check it
int *b = calloc(n, sizeof(int));     // zero-initialised
a = realloc(a, 2 * n * sizeof(int)); // may move the block; better: tmp = realloc(...); if (tmp) a = tmp;
free(a); a = NULL;                   // set to NULL to avoid a dangling pointer
```

**The classic bugs (know all five):**

| Bug | What happens |
|---|---|
| Memory leak | Allocated, never freed. The process grows until it's killed |
| Dangling pointer | Using memory after `free` (use-after-free): a security hole |
| Double free | Freeing twice corrupts the allocator's metadata |
| Buffer overflow | Writing past the end (`strcpy` without a bounds check): the classic exploit |
| Uninitialised read | Garbage values; nondeterministic bugs |

**Tools:** `valgrind --leak-check=full ./prog`, AddressSanitizer (`gcc -fsanitize=address -g`), `gdb` (`bt` for a backtrace after a crash, `print`, `break`, `next`, `step`).

## 4. Strings in C

C strings are `char` arrays ending in `'\0'`. `strlen` is O(n): it walks to the null byte.

```c
size_t my_strlen(const char *s) { const char *p = s; while (*p) p++; return p - s; }
char *my_strcpy(char *d, const char *s) { char *r = d; while ((*d++ = *s++)); return r; }
void reverse(char *s) {
    int i = 0, j = strlen(s) - 1;
    while (i < j) { char t = s[i]; s[i++] = s[j]; s[j--] = t; }
}
```

Prefer `strncpy`/`snprintf` (bounded) over `strcpy`/`sprintf`. Note that `strncpy` doesn't always add the null terminator.

## 5. Structs, unions, padding

```c
struct A { char c; int i; char d; };   // sizeof is usually 12, not 6 (padding)
struct B { int i; char c; char d; };   // sizeof is usually 8 (order the fields big to small)
union U { int i; float f; char b[4]; };// all members share memory; size = the largest member
```

- **Alignment:** the CPU reads efficiently at addresses that are multiples of the type size, so the compiler inserts padding. `#pragma pack(1)` removes it (used for network/disk formats, but unaligned access is slower).
- **Unions** are used for protocol parsing and type punning, and to save memory.
- **Bit fields:** `struct { unsigned flag:1; unsigned mode:3; }`, compact flags for hardware registers.

## 6. Storage classes and qualifiers

| Keyword | Meaning |
|---|---|
| `static` (local) | Keeps its value between calls; stored in data/BSS, not on the stack |
| `static` (global/function) | Internal linkage: visible only in this file. That's encapsulation in C |
| `extern` | Declared here, defined in another file |
| `const` | Read-only through this name |
| `volatile` | "May change outside the program's control" (hardware registers, signal handlers): the compiler must not cache it in a register. **It is NOT a thread-synchronisation tool** (a classic interview trap) |
| `register` | Hint only; obsolete |
| `inline` | Hint to paste the function body at the call site |

## 7. Compilation pipeline

```
source.c → [preprocessor] → .i → [compiler] → .s (assembly) → [assembler] → .o (object) → [linker] → executable
```

**Commands for each stage:** `gcc -E` (→ .i), `gcc -S` (→ .s), `gcc -c` (→ .o), `gcc file.o -o app` (link). Step-by-step walkthrough with what to look for: [How a C program becomes a running process](#how-a-c-program-becomes-a-running-process).

- **Preprocessor:** `#include` (pastes the file), `#define` macros, `#ifdef` (conditional compilation). Include guards (`#ifndef X_H #define X_H … #endif`) or `#pragma once` prevent double inclusion.
- **Macros vs inline functions:** a macro is text substitution with no type checking, and arguments can be evaluated twice: `#define SQ(x) x*x` gives `SQ(a+1)` = `a+1*a+1`. Always parenthesise, or prefer `inline`.
- **Static linking:** library code is copied into the binary (bigger, self-contained). **Dynamic linking (.so/.dll):** loaded at runtime, shared between processes, updatable, but brings "dependency hell".
- **Makefile:** declares targets, dependencies and commands, and rebuilds only what changed. OneFS uses make-based builds (you ran `make isi-checkcov` for coverage).

## 8. Undefined behaviour (UB)

The compiler can do *anything* with UB, including optimising your code away. Common UB:

- signed integer overflow
- out-of-bounds array access
- dereferencing NULL or a dangling pointer
- using an uninitialised variable
- modifying a variable twice without a sequence point (`i = i++ + 1`)
- data races (two threads, at least one writing, no synchronisation)

## 9. Endianness and bits

- **Little-endian** (x86, ARM usually): least significant byte at the lowest address. **Big-endian** is "network byte order". Use `htonl`/`ntohl` when sending integers over a network or writing them to disk formats.
- Check endianness: `int x = 1; char *c = (char*)&x; if (*c) puts("little");`
- Bit tricks: set bit `x |= (1<<k)`, clear `x &= ~(1<<k)`, toggle `x ^= (1<<k)`, test `(x >> k) & 1`.

## 10. Classic C interview programs

Be able to write these on paper: reverse a string in place, `strlen`/`strcpy`/`memcpy`, reverse a linked list, detect endianness, count set bits, swap without a temp (`a ^= b; b ^= a; a ^= b;`, which fails if a and b alias the same memory), implement `atoi`, a generic `swap` with `void*` and `memcpy`.

**`memcpy` vs `memmove`:** `memmove` handles overlapping regions correctly; `memcpy` doesn't.

---

## 11. History, standards and the building blocks of a C program

**History:** created by Dennis Ritchie at Bell Labs (1972) to rewrite UNIX. Standards: **K&R C** (1978 book) → **ANSI C / C89/C90** → **C99** (`//` comments, `long long`, `stdint.h`, `bool`, variable-length arrays, designated initialisers, declarations anywhere) → **C11** (threads `<threads.h>`, atomics, `_Static_assert`, anonymous structs) → **C17** (bug fixes) → **C23** (`bool`/`true`/`false` as keywords, `nullptr`, `constexpr` objects, `typeof`, binary literals, `#embed`). Compile with `gcc -std=c17` (or `-std=c11`).

**Tokens** (the smallest meaningful pieces): keywords, identifiers, constants, string literals, operators, punctuators.
**The keywords** (C17, 44): `auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while _Alignas _Alignof _Atomic _Bool _Complex _Generic _Imaginary _Noreturn _Static_assert _Thread_local`.
**Identifiers:** letters, digits and `_`; can't start with a digit; case-sensitive; names starting with `_` + capital letter or `__` are reserved.
**Comments:** `/* block */` and `// line` (C99+).
**Constants:** literal constants (`42`, `3.14`, `'A'`, `"text"`), `#define MAX 100` (preprocessor), `const int max = 100;` (a typed read-only variable), `enum { MAX = 100 };`.
**Escape sequences:** `\n \t \\ \' \" \0 \r \xFF`.

## 12. Operators, precedence and conversions in depth

**Precedence (high → low), the ones that matter:**

| Level | Operators | Associativity |
|---|---|---|
| 1 | `()` `[]` `->` `.` postfix `++ --` | left → right |
| 2 | prefix `++ --`, unary `+ -`, `! ~`, cast `(type)`, `*` (dereference), `&` (address), `sizeof` | right → left |
| 3 | `* / %` | left → right |
| 4 | `+ -` | left → right |
| 5 | `<< >>` | left → right |
| 6 | `< <= > >=` | left → right |
| 7 | `== !=` | left → right |
| 8 | `&` → 9 `^` → 10 `|` | left → right |
| 11 | `&&` → 12 `||` | left → right |
| 13 | `?:` | right → left |
| 14 | `= += -= *= /= %= <<= >>= &= ^= |=` | right → left |
| 15 | `,` | left → right |

Classic traps: `*p++` means `*(p++)` (increment the pointer, not the value); `a & b == c` means `a & (b == c)`; `x = y = 0` assigns right to left. **When in doubt, add parentheses.**

**Type conversions:**

- **Integer promotion:** `char`/`short` become `int` in expressions.
- **Usual arithmetic conversions:** the "smaller" operand converts to the "bigger" type (`int` + `double` → `double`; `int` + `unsigned` → `unsigned`, which is the source of `-1 > 0u` being true).
- **Explicit cast:** `(double)a / b`.
- **Integer division truncates toward zero** (`-7 / 2 == -3`); `%` takes the sign of the dividend.

**Control flow, with full examples:**

```c
switch (state) {                         // works on integer types (and chars/enums)
    case IDLE:    start(); break;
    case RUNNING: /* fall through on purpose */
    case RETRYING: poll(); break;
    default:      log_error("bad state");
}
for (int i = 0, j = n - 1; i < j; i++, j--) swap(&a[i], &a[j]);   // comma operator in a loop
do { c = getchar(); } while (c != '\n' && c != EOF);               // runs at least once
outer:                                                              // goto: only for breaking nested loops / cleanup
for (int r = 0; r < R; r++) for (int c = 0; c < C; c++) if (grid[r][c] == target) goto found;
found: ;
```

## 13. Functions in depth

- **Prototype** (declaration) vs **definition**; prototypes in headers let other files call the function. An empty parameter list in old C (`int f()`) means "unspecified arguments": write `int f(void)` for "no arguments" (C23 changes this).
- **Call by value only:** copies of the arguments are passed; to modify the caller's data, pass pointers (§0).
- **Returning several values:** via pointer "out" parameters or by returning a struct.
- **Recursion:** e.g. factorial, Fibonacci, tree traversal; each call adds a stack frame.
- **Static functions** (`static void helper(void)`) are private to their file (internal linkage).
- **Inline functions** (`static inline` in headers) avoid call overhead for tiny functions.
- **Variadic functions** (`printf`-style) with `<stdarg.h>` (§0).
- **`_Noreturn`/`noreturn`** for functions like `exit` that never return.
- **Function pointers and callbacks** (§0: `qsort`).
- **The call stack, visualised:**

```
main() calls area(3, 4), which calls mul(3, 4)
┌──────────────────┐  ← top
│ mul: a=3, b=4    │
├──────────────────┤
│ area: w=3, h=4   │
├──────────────────┤
│ main: locals     │
└──────────────────┘  each frame: parameters, locals, return address; popped on return
```

## 14. Arrays and pointers, completely

**Arrays:** a fixed number of same-type elements in **contiguous** memory. `int a[5];` → indexes 0..4. No bounds checking.

```c
int a[5] = {1, 2, 3};                    // the rest are 0
int b[] = {4, 5, 6};                     // size inferred (3)
int m[2][3] = {{1, 2, 3}, {4, 5, 6}};    // 2D, row-major
size_t n = sizeof a / sizeof a[0];       // element count (only works where a is a real array, not a pointer)
int d[5] = {[2] = 7, [4] = 9};           // designated initialisers (C99)
```

**Passing arrays to functions:** the array "decays" to a pointer to its first element, so the size is lost; pass it separately: `void sum(const int *arr, size_t n)`. For 2D: `void f(int rows, int cols, int m[rows][cols])` (C99 VLA parameter) or `int (*m)[3]`.

**Pointers, every form:**

```c
int x = 10, y = 20;
int *p = &x;                 // pointer to int
int **pp = &p;               // pointer to pointer (e.g. to change a caller's pointer)
const int *pc = &x;          // pointer to const int: can't change *pc
int *const cp = &x;          // const pointer: can't change cp itself
int *arr_of_ptrs[3];         // an ARRAY of 3 pointers to int
int (*ptr_to_arr)[3];        // a POINTER to an array of 3 ints (read declarations inside-out)
int (*fp)(int, int);         // a pointer to a function taking (int, int) returning int
void *vp = &x;               // generic pointer: must cast before dereferencing
int *np = NULL;              // null pointer: points nowhere (dereferencing it crashes)
```

**Pointer arithmetic:** `p + 1` moves by `sizeof(*p)` bytes; `a[i]` is exactly `*(a + i)`; subtracting two pointers into the same array gives the element distance (`ptrdiff_t`). Arithmetic outside the array (except one-past-the-end) is undefined.
**Arrays vs pointers:** an array name is not a variable you can reassign; `sizeof(array)` is the whole array; `&array` has type "pointer to array".
**Kinds of bad pointers:** **wild** (uninitialised), **dangling** (points to freed or out-of-scope memory), **null** (points nowhere). Initialise pointers, set them to `NULL` after `free`, and never return the address of a local variable.
**Reading complex declarations:** start at the name, go right when you can, left when you must: `char *(*f)(int)` = "f is a pointer to a function taking int and returning a pointer to char".

## 15. Structures in depth, enums and bit fields
```c
struct Address { char city[32]; int pin; };
struct Employee {
    int id;
    char name[50];
    struct Address addr;          // nested struct
    struct Employee *manager;     // self-referential pointer
};
struct Employee e = {.id = 1, .name = "Asha", .addr = {"Pune", 411001}};   // designated initialisers
struct Employee *pe = &e;
printf("%s %d\n", pe->name, pe->addr.pin);   // -> for pointers, . for objects
struct Employee team[10];                   // array of structs
void print_emp(const struct Employee *e);   // pass large structs by pointer (no copy)
struct Employee copy = e;                   // structs can be assigned/copied (shallow copy: pointers are shared)

struct Packet { uint16_t len; uint8_t data[]; };   // flexible array member (C99): a variable-size tail
struct Packet *pk = malloc(sizeof *pk + 100); pk->len = 100;

enum Color { RED, GREEN = 5, BLUE };     // RED=0, GREEN=5, BLUE=6; enums are ints in C
struct Flags { unsigned ready:1, error:1, mode:3; };   // bit fields: packed flags (layout is implementation-defined)
```

Structs can't be compared with `==` (compare field by field, or `memcmp` only when there's no padding). Padding and alignment: §5.

## 16. The preprocessor in depth
```c
#include <stdio.h>          // system header (searched in system paths)
#include "config.h"         // project header (searched next to this file first)
#define BUF_SIZE 4096
#define SQUARE(x) ((x) * (x))                         // always parenthesise macro parameters and bodies
#define MAX(a, b) ((a) > (b) ? (a) : (b))             // ⚠ evaluates an argument twice: MAX(i++, j) is a bug
#define STR(x) #x                                     // stringizing: STR(hello) → "hello"
#define CONCAT(a, b) a##b                             // token pasting: CONCAT(var, 1) → var1
#define LOG(fmt, ...) fprintf(stderr, "[%s:%d] " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)   // variadic macro
#ifdef DEBUG
  #define DBG(...) LOG(__VA_ARGS__)
#else
  #define DBG(...) ((void)0)
#endif
#if defined(__linux__)                                // platform-specific code
  #include <sys/epoll.h>
#elif defined(__FreeBSD__)
  #include <sys/event.h>                              // kqueue (OneFS-style platforms)
#endif
#undef BUF_SIZE
#error "unsupported platform"                         // stop compilation with a message
#pragma once                                          // non-standard but universal include guard
```

**Predefined macros:** `__FILE__`, `__LINE__`, `__func__` (actually a variable), `__DATE__`, `__TIME__`, `__STDC_VERSION__`. See the output after preprocessing with `gcc -E file.c`.
**Prefer** `const` variables, `enum` constants and `static inline` functions over macros where possible (type-safe, debuggable).

## 17. Multi-file programs, scope and linkage
```
geometry.h   ── declarations + include guards: double area(double w, double h); extern int g_calls;
geometry.c   ── definitions: int g_calls = 0; double area(double w, double h) { g_calls++; return w * h; }
                 static double helper(void) {…}   ← private to this file
main.c       ── #include "geometry.h"  and calls area()
build:  gcc -c geometry.c main.c   → geometry.o main.o   →   gcc geometry.o main.o -o app
```

- **Scope:** block, function (labels), file, prototype. **Linkage:** external (shared across files), internal (`static`), none (locals).
- **`extern`** declares a variable defined elsewhere; define it in exactly one `.c` file.
- **Header rules:** declarations only (no variable definitions, no non-inline function bodies), include guards, include what you use.
- **Makefiles** automate the build:

```make
CC = gcc
CFLAGS = -std=c17 -Wall -Wextra -g
app: main.o geometry.o
	$(CC) $(CFLAGS) -o $@ $^
%.o: %.c geometry.h
	$(CC) $(CFLAGS) -c $<
clean:
	rm -f *.o app
```

## 18. A tour of the C standard library

| Header | What's in it |
|---|---|
| `<stdio.h>` | `printf`/`scanf` families, `fopen`/`fclose`/`fgets`/`fputs`/`fread`/`fwrite`/`fseek`, `perror` |
| `<stdlib.h>` | `malloc`/`calloc`/`realloc`/`free`, `atoi`/`strtol`/`strtod`, `qsort`, `bsearch`, `rand`/`srand`, `exit`, `abs`, `getenv`, `system` |
| `<string.h>` | `strlen`, `strcpy`/`strncpy`, `strcat`, `strcmp`/`strncmp`, `strchr`/`strrchr`, `strstr`, `strtok`, `memcpy`, `memmove`, `memset`, `memcmp`, `strerror` |
| `<ctype.h>` | `isalpha`, `isdigit`, `isspace`, `isupper`, `toupper`, `tolower` |
| `<math.h>` | `sqrt`, `pow`, `fabs`, `floor`, `ceil`, `sin`, `log`, `exp` (link with `-lm`) |
| `<time.h>` | `time`, `clock`, `difftime`, `localtime`, `strftime`, `nanosleep` (POSIX) |
| `<limits.h>` / `<float.h>` | `INT_MAX`, `CHAR_BIT`, `DBL_EPSILON` |
| `<stdint.h>` / `<inttypes.h>` | `int32_t`, `uint64_t`, `PRIu64` format macros |
| `<stdbool.h>` | `bool`, `true`, `false` (built in from C23) |
| `<stddef.h>` | `size_t`, `ptrdiff_t`, `NULL`, `offsetof` |
| `<assert.h>` | `assert(cond)` (disabled with `-DNDEBUG`) |
| `<errno.h>` | `errno` and error codes (`ENOENT`, `EINTR`, `EAGAIN`) |
| `<signal.h>` | `signal`, `raise`, `SIGINT`, `SIGTERM` |
| `<stdarg.h>` | variadic arguments |
| `<setjmp.h>` | `setjmp`/`longjmp` (non-local jumps; rarely appropriate) |
| `<threads.h>`, `<stdatomic.h>` | C11 threads and atomics (POSIX `pthread` is more common) |

**printf formats:** `%d %i` int, `%u` unsigned, `%ld` long, `%lld`, `%zu` size_t, `%f %e %g` double, `%c`, `%s`, `%p` pointer, `%x` hex, `%%`; widths and precision: `%8.2f`, `%-10s`, `%05d`. **scanf** needs addresses (`scanf("%d", &x)`) and its return value tells you how many items were read. Prefer `fgets` + `sscanf`/`strtol` for safe input.

## 19. Data structures in C (implement these yourself)
```c
/* ---- Stack (array-based) ---- */
typedef struct { int *data; size_t top, cap; } Stack;
int stack_push(Stack *s, int v) {
    if (s->top == s->cap) {
        size_t nc = s->cap ? s->cap * 2 : 8;
        int *nd = realloc(s->data, nc * sizeof *nd);
        if (!nd) return -1;
        s->data = nd; s->cap = nc;
    }
    s->data[s->top++] = v; return 0;
}
int stack_pop(Stack *s, int *out) { if (!s->top) return -1; *out = s->data[--s->top]; return 0; }

/* ---- Queue (circular buffer) ---- */
typedef struct { int buf[64]; size_t head, tail, count; } Queue;
int enqueue(Queue *q, int v) { if (q->count == 64) return -1; q->buf[q->tail] = v; q->tail = (q->tail + 1) % 64; q->count++; return 0; }
int dequeue(Queue *q, int *v) { if (!q->count) return -1; *v = q->buf[q->head]; q->head = (q->head + 1) % 64; q->count--; return 0; }

/* ---- Hash table (separate chaining) ---- */
typedef struct Entry { char *key; int value; struct Entry *next; } Entry;
#define NBUCKETS 1024
static Entry *table[NBUCKETS];
static unsigned long hash(const char *s) { unsigned long h = 5381; int c; while ((c = *s++)) h = h * 33 + c; return h; }   // djb2
void ht_put(const char *key, int value) {
    unsigned long i = hash(key) % NBUCKETS;
    for (Entry *e = table[i]; e; e = e->next) if (strcmp(e->key, key) == 0) { e->value = value; return; }
    Entry *e = malloc(sizeof *e); e->key = strdup(key); e->value = value; e->next = table[i]; table[i] = e;
}
int ht_get(const char *key, int *out) {
    for (Entry *e = table[hash(key) % NBUCKETS]; e; e = e->next) if (strcmp(e->key, key) == 0) { *out = e->value; return 1; }
    return 0;
}

/* ---- Binary search tree ---- */
typedef struct Node { int key; struct Node *left, *right; } Node;
Node *bst_insert(Node *root, int key) {
    if (!root) { Node *n = calloc(1, sizeof *n); n->key = key; return n; }
    if (key < root->key) root->left = bst_insert(root->left, key);
    else root->right = bst_insert(root->right, key);
    return root;
}
void inorder(const Node *r) { if (!r) return; inorder(r->left); printf("%d ", r->key); inorder(r->right); }
void bst_free(Node *r) { if (!r) return; bst_free(r->left); bst_free(r->right); free(r); }
```

(The linked list is in §0. `strdup` is POSIX, and standard since C23.)

## 20. Error handling and signals

- **Return codes** + `errno`: system and library calls return -1/NULL and set `errno`; report with `perror("open")` or `strerror(errno)`. Check **every** return value of `malloc`, `fopen`, `read`, `write`.
- **`assert`** for programmer errors ("this can't happen"), not for user input.
- **The goto-cleanup pattern** for releasing resources (§0).
- **Signals:** asynchronous notifications. Install handlers with `sigaction` (preferred over `signal`). In a handler, do almost nothing: set a `volatile sig_atomic_t` flag and return (only async-signal-safe functions are allowed there).

```c
#include <signal.h>
static volatile sig_atomic_t stop = 0;
static void on_term(int sig) { (void)sig; stop = 1; }
int main(void) {
    struct sigaction sa = {0}; sa.sa_handler = on_term; sigaction(SIGTERM, &sa, NULL);
    while (!stop) { do_work(); }     // graceful shutdown on SIGTERM (e.g. from Kubernetes)
    cleanup(); return 0;
}
```

## 21. Systems programming in C (POSIX)
**Processes:**

```c
#include <unistd.h>
#include <sys/wait.h>
pid_t pid = fork();
if (pid == 0) { execlp("ls", "ls", "-l", (char *)NULL); perror("exec"); _exit(127); }   // child
int status; waitpid(pid, &status, 0);                                                     // parent
if (WIFEXITED(status)) printf("exit %d\n", WEXITSTATUS(status));
```

**Low-level file I/O (file descriptors):** `int fd = open("f", O_RDONLY); ssize_t n = read(fd, buf, sizeof buf); write(1, buf, n); close(fd); fsync(fd);`. A short read/write is normal: loop until done.
**Threads (pthreads):**

```c
#include <pthread.h>
static long counter = 0;
static pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;
void *worker(void *arg) {
    (void)arg;
    for (int i = 0; i < 100000; i++) { pthread_mutex_lock(&lock); counter++; pthread_mutex_unlock(&lock); }
    return NULL;
}
int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, worker, NULL); pthread_create(&t2, NULL, worker, NULL);
    pthread_join(t1, NULL); pthread_join(t2, NULL);
    printf("%ld\n", counter);          // 200000 (without the mutex: a random smaller number)
}
// compile: gcc -pthread file.c.  Also: pthread_cond_wait/signal (condition variables), pthread_rwlock_*.
```

**Sockets (a TCP server skeleton):** `socket()` → `setsockopt(SO_REUSEADDR)` → `bind()` → `listen()` → loop `accept()` → `read`/`write` → `close`. For many clients use `poll`/`epoll`/`kqueue` (files 06 and 08).
**Memory mapping:** `mmap` a file and access it like an array (databases and storage engines do this).

## 22. Security pitfalls and debugging C

| Bug | Example | Prevention |
|---|---|---|
| Buffer overflow | `strcpy(buf, input)`, `gets()` (removed in C11) | bounded functions (`snprintf`, `fgets`), length checks |
| Format string bug | `printf(user_input)` | always `printf("%s", user_input)` |
| Integer overflow | `malloc(n * size)` wraps around | check `n > SIZE_MAX / size` first |
| Use-after-free / double free | using a pointer after `free` | set to `NULL`, clear ownership rules |
| Off-by-one | `for (i = 0; i <= n; i++)` | think "half-open ranges" `[0, n)` |
| Uninitialised memory | reading `malloc`'d memory | `calloc`, initialise everything |
| Missing null terminator | `strncpy` that fills the buffer | terminate explicitly |

**Tools:** compile with `-Wall -Wextra -Werror -g`; run with `-fsanitize=address,undefined`; `valgrind --leak-check=full`; `gdb` (`break`, `run`, `bt`, `print`, `watch`); static analysers (clang `scan-build`, cppcheck); fuzzers (libFuzzer, AFL) for parsers.

## 23. C exercises (do them in order)

1. Temperature conversion table with `for` and `printf` formatting.
2. Read integers until EOF; print the count, sum, min and max.
3. Implement `my_strlen`, `my_strcpy`, `my_strcmp`, `my_strrev`, and `atoi` with error handling.
4. Matrix multiplication with dynamically allocated 2D arrays (and free everything).
5. A linked list: insert, delete, reverse, detect a cycle, free.
6. A stack and a circular queue; use the stack to check balanced brackets.
7. A word-count program (like `wc`) for a file given on the command line.
8. A hash table with string keys that resizes when the load factor exceeds 0.75.
9. A BST with insert, search, delete and in-order traversal.
10. A multi-file project with a header and a Makefile.
11. A program that forks a child to run `ls`, waits, and prints the exit status.
12. Two pthreads incrementing a shared counter: first without a mutex (see the bug), then with one.

# Part B: C++

## Start here: C++ in plain words

**What C++ is:** C plus tools for organising big programs (**classes, templates, the standard library, RAII**) without giving up C's speed. "You don't pay for what you don't use."
**Analogy:** if C is building a house brick by brick, C++ gives you prefabricated walls and doors (classes, containers) that you can still customise down to the brick.

### Class and object
A **class** is a blueprint (a "Car" design); an **object** is a car built from it, with its own state (colour, fuel level). Member functions are what the car can do (`drive()`).

### What an object looks like in memory (including virtual functions)
```cpp
struct Shape { virtual double area() const; int id; };
struct Circle : Shape { double r; double area() const override; };
```
```
Circle object in memory                Circle's vtable (one per class, shared)
┌──────────────────────┐               ┌────────────────────────┐
│ vptr ────────────────┼──────────────►│ &Circle::area          │
│ id   (from Shape)    │               │ &Circle::~Circle       │
│ r    (Circle's own)  │               └────────────────────────┘
└──────────────────────┘
shape_ptr->area()  ⇒  follow vptr → look up slot 0 → call Circle::area   (that's runtime polymorphism)
```

### RAII in plain words
**Hotel key card analogy:** you get the card when you check in (constructor acquires the resource), and the moment you check out (the object goes out of scope) the card stops working automatically (the destructor releases it). Even if you leave in a hurry (an exception), checkout still happens. That's why C++ code using `std::vector`, `std::unique_ptr` and `std::lock_guard` doesn't leak memory or locks.

### Smart pointers in plain words

- `unique_ptr`: **one owner**, like a car with one key. You can hand the key over (move), but not copy it.
- `shared_ptr`: **shared ownership with a counter**, like a shared flat: the last flatmate to leave turns off the lights (deletes the object).
- `weak_ptr`: a visitor's pass that doesn't count as a flatmate. Used to break cycles where two objects keep each other alive forever.

### The C++ standard library at a glance
```
Containers:  vector  deque  list  map/set (red-black tree)  unordered_map/set (hash)  priority_queue
Algorithms:  sort  find  binary_search  lower_bound  accumulate  transform  remove/erase …
Iterators:   the glue: algorithms work on any container through iterators (begin(), end())
Utilities:   string  optional  variant  tuple  chrono  thread/mutex/atomic  smart pointers
```

## C++ course map: the whole language, A to Z
Read in this order if you're starting from zero. Every chapter is in this file.

| # | Chapter | Section |
|---|---|---|
| 1 | What C++ is, setup, compiling, first program | Start here + §0 |
| 2 | Variables, types, literals, initialisation, conversions, `auto` | §0 + §17 |
| 3 | Operators and control flow | Part A §0 (shared with C) |
| 4 | Functions: parameters, overloading, default args, recursion, function pointers | §0 + §18 |
| 5 | Scope, lifetime, storage duration, linkage, namespaces | §19 |
| 6 | Arrays, pointers, references, dynamic memory | Part A + §4, §11 |
| 7 | Strings (`std::string`, `string_view`) | §20 |
| 8 | Input/output: console, files, string streams, formatting | §21 |
| 9 | Classes: members, constructors, destructors, `this`, static, const, friend | §0 + §1 |
| 10 | Operator overloading | §0 |
| 11 | Copy, move, rule of 0/3/5 | §1, §7 |
| 12 | Inheritance (single, multiple, virtual) | §0, §5, §27 |
| 13 | Polymorphism and virtual functions | §5, §15b |
| 14 | Casts and RTTI | §6, §27 |
| 15 | Templates (function, class, variadic, specialisation, concepts) | §8, §16, §26 |
| 16 | STL containers | §9, §22 |
| 17 | Iterators | §23 |
| 18 | Algorithms | §24 |
| 19 | Function objects, lambdas, `std::function` | §10, §25 |
| 20 | Exceptions and error handling | §12 |
| 21 | RAII and smart pointers | §2, §3 |
| 22 | Utility types: `pair`, `tuple`, `optional`, `variant`, `any` | §28 |
| 23 | Time and random numbers | §29 |
| 24 | Concurrency | §13, §30 (+ file 07) |
| 25 | Modern C++ (11 → 23): ranges, coroutines, modules | §14, §31 |
| 26 | Memory management in depth | §16, §32 |
| 27 | Building projects: headers, linking, libraries, CMake, package managers | §33 |
| 28 | Testing, debugging, tools | §34 |
| 29 | Best practices (C++ Core Guidelines) | §35 |
| 30 | Exercises | §36 |

## 0. C++ basics (start here)

### C++ vs C
C++ adds classes, references, function/operator overloading, templates, namespaces, exceptions, the STL, RAII and smart pointers, while staying (mostly) compatible with C.

```cpp
#include <iostream>
#include <string>
#include <vector>
using std::cout;                                 // avoid "using namespace std;" in headers

int main() {
    std::string name;
    std::cin >> name;
    std::vector<int> v{3, 1, 2};
    for (int x : v) cout << x << ' ';            // range-based for
    cout << "\nHello " << name << '\n';
}
// g++ -std=c++17 -Wall -O2 main.cpp -o app
```

### Namespaces, references, default arguments, inline, `auto`
```cpp
namespace storage { int capacity() { return 42; } }
storage::capacity();

void bump(int &x) { ++x; }                       // a reference: true pass-by-reference
void log(const std::string &msg, int level = 1); // a default argument
inline int sq(int x) { return x * x; }
auto it = v.begin();                             // type deduction
```

### Access specifiers and inheritance modes

| Member in base | `public` inheritance | `protected` inheritance | `private` inheritance |
|---|---|---|---|
| public | public | protected | private |
| protected | protected | protected | private |
| private | not accessible | not accessible | not accessible |

`public` = "is-a" (the most common). `private` inheritance = "implemented-in-terms-of" (prefer composition).

### Kinds of constructors and the order of construction/destruction
```cpp
class Node {
public:
    Node() : id_(0) {}                                    // default
    explicit Node(int id) : id_(id) {}                    // parameterised
    Node(const Node &o) = default;                        // copy
    Node(Node &&o) noexcept = default;                    // move
    Node(int id, std::string n) : Node(id) { name_ = n; } // delegating (C++11)
    ~Node() {}                                            // destructor
private:
    int id_; std::string name_;
};
```

**Order:** base-class constructors → member constructors (in **declaration order**) → the constructor body. Destruction is the **exact reverse**.
`this` is a pointer to the current object. `= default` / `= delete` (e.g. delete copying for unique owners: `Node(const Node&) = delete;`).

### Static members, const members, friend
```cpp
class Counter {
    static int instances;          // one shared copy; defined once in a .cpp: int Counter::instances = 0;
    mutable int cacheHits = 0;     // may change even in const methods
public:
    Counter() { ++instances; }
    static int count() { return instances; }   // no `this`
    int hits() const { return cacheHits; }      // const method: can't modify (non-mutable) members
    friend std::ostream &operator<<(std::ostream &os, const Counter &c);
};
```

### Operator overloading
```cpp
struct Vec2 {
    double x, y;
    Vec2 operator+(const Vec2 &o) const { return {x + o.x, y + o.y}; }
    bool operator==(const Vec2 &o) const { return x == o.x && y == o.y; }
    double &operator[](int i) { return i == 0 ? x : y; }
};
std::ostream &operator<<(std::ostream &os, const Vec2 &v) { return os << '(' << v.x << ", " << v.y << ')'; }
// Also common: operator< (for std::sort/std::map keys), operator() (functors), operator= (assignment)
```

### Class templates and specialisation
```cpp
template <typename T>
class Stack {
    std::vector<T> data;
public:
    void push(const T &x) { data.push_back(x); }
    T pop() { T x = data.back(); data.pop_back(); return x; }
    bool empty() const { return data.empty(); }
};
template <> class Stack<bool> { /* a special version for bool */ };
Stack<int> s; s.push(1);
```

### STL in practice (write these fluently)
```cpp
#include <algorithm>
#include <unordered_map>
#include <map>
#include <queue>
#include <numeric>

std::vector<int> v{5, 3, 8, 1};
std::sort(v.begin(), v.end());                                   // ascending
std::sort(v.begin(), v.end(), std::greater<int>());              // descending
auto pos = std::lower_bound(v.begin(), v.end(), 4);              // first >= 4 (sorted range)
int total = std::accumulate(v.begin(), v.end(), 0);
v.erase(std::remove(v.begin(), v.end(), 3), v.end());           // erase-remove idiom

std::unordered_map<std::string, int> freq;
for (auto &w : words) freq[w]++;
for (auto &[word, n] : freq) cout << word << ' ' << n << '\n';   // structured bindings (C++17)

std::map<int, std::string> ordered{{2, "b"}, {1, "a"}};          // sorted by key
std::priority_queue<int, std::vector<int>, std::greater<int>> minHeap;
std::pair<int, int> p = {1, 2}; auto [a, b] = p;
```

### RTTI and `typeid`
`dynamic_cast` and `typeid(obj).name()` use run-time type information (needs polymorphic classes). Some codebases disable RTTI for size/performance.

---

## 1. Classes, constructors, the special members

```cpp
class Buffer {
    size_t n_; int* data_;
public:
    explicit Buffer(size_t n) : n_(n), data_(new int[n]{}) {}           // constructor (init list)
    ~Buffer() { delete[] data_; }                                        // destructor
    Buffer(const Buffer& o) : n_(o.n_), data_(new int[o.n_]) {           // copy constructor (deep copy)
        std::copy(o.data_, o.data_ + n_, data_); }
    Buffer& operator=(Buffer o) { swap(o); return *this; }               // copy-and-swap assignment
    Buffer(Buffer&& o) noexcept : n_(o.n_), data_(o.data_) {             // move constructor: steal
        o.data_ = nullptr; o.n_ = 0; }
    void swap(Buffer& o) noexcept { std::swap(n_, o.n_); std::swap(data_, o.data_); }
};
```

- **Rule of 3:** if you write a destructor, copy constructor or copy assignment, you probably need all three (the class owns a resource).
- **Rule of 5:** in C++11+, add the move constructor and move assignment.
- **Rule of 0 (best):** don't manage raw resources at all. Use `std::vector`, `std::string` and smart pointers, and the compiler-generated members are correct.
- **Shallow vs deep copy:** the default copy copies the pointer. Two objects then free the same memory → double free.
- **`explicit`** prevents surprising implicit conversions (`Buffer b = 5;` won't compile).
- **Initialiser list** initialises members directly (required for `const` and reference members). Members initialise in **declaration order**, not list order.

## 2. RAII (the most important C++ idea)

**Resource Acquisition Is Initialisation:** tie a resource's lifetime to an object's lifetime. Acquire in the constructor, release in the destructor. Because destructors run automatically when scope ends, **even if an exception is thrown**, you get leak-free code without `finally`.

Examples: `std::vector` (memory), `std::fstream` (file handles), `std::lock_guard` (mutex), `std::unique_ptr` (heap objects).
> Interview line: "RAII is why C++ doesn't need a garbage collector for resource safety. Cleanup is deterministic and tied to scope, which matters in systems code where you're holding locks, file descriptors and memory."

## 3. Smart pointers

| Type | Ownership | Notes |
|---|---|---|
| `std::unique_ptr<T>` | exclusive | Can't be copied, only moved. Zero overhead. **Default choice.** `std::make_unique<T>(...)` |
| `std::shared_ptr<T>` | shared, reference counted | The control block holds an **atomic** reference count, so copies cost a bit. Deleted when the count reaches 0. `std::make_shared` does one allocation |
| `std::weak_ptr<T>` | non-owning observer | Breaks **reference cycles** (A ↔ B both holding shared_ptr never free). `lock()` gives a shared_ptr if the object is still alive |

**Cycle example:** parent holds `shared_ptr<Child>`, child holds `shared_ptr<Parent>` → leak. Fix: the child holds a `weak_ptr<Parent>`.

## 4. References vs pointers

| | Reference `T&` | Pointer `T*` |
|---|---|---|
| Can be null | no | yes |
| Can be reseated | no (bound once) | yes |
| Must be initialised | yes | no |
| Syntax | like the object | `*`, `->` |

Pass large objects by `const T&` (no copy, no modification).

## 5. Polymorphism and the vtable

```cpp
struct Shape { virtual double area() const = 0; virtual ~Shape() = default; };   // abstract
struct Circle : Shape { double r; double area() const override { return 3.14159 * r * r; } };
std::unique_ptr<Shape> s = std::make_unique<Circle>();
s->area();   // dynamic dispatch → Circle::area
```

- **How it works:** each class with virtual functions has a **vtable** (an array of function pointers). Each object holds a hidden **vptr** pointing to its class's vtable. A virtual call is `obj->vptr[slot](obj)`: one extra indirection, and it usually can't be inlined.
- **Virtual destructor:** if you `delete` a derived object through a base pointer and the base destructor isn't virtual → **undefined behaviour** (the derived destructor never runs). Rule: a base class with virtual functions needs a virtual destructor.
- **Object slicing:** `Shape s = circle;` (by value) copies only the base part and loses the derived behaviour. Use pointers or references.
- **Pure virtual (`= 0`)** makes the class abstract: you can't instantiate it. That's how C++ does interfaces.
- **Overloading** (same name, different parameters, compile time) vs **overriding** (virtual function redefined in a derived class, runtime). Use the `override` keyword to catch signature mistakes. `final` prevents further overriding.
- **Constructors can't be virtual.** Calling a virtual function inside a constructor calls the *base* version (the derived part isn't built yet).
- **Diamond problem:** `D : B, C` and `B, C : A` gives D two copies of A. Fix: `class B : virtual public A` (virtual inheritance).

## 6. Casts

| Cast | Use |
|---|---|
| `static_cast` | Compile-time conversions (int ↔ double, upcasts) |
| `dynamic_cast` | Safe downcast with a runtime check (needs a virtual function); returns nullptr or throws on failure |
| `const_cast` | Add or remove const (rarely legitimate) |
| `reinterpret_cast` | Reinterpret bits (pointer ↔ integer); dangerous |

Avoid C-style casts `(T)x`: they silently do any of the above.

## 7. Move semantics

- **lvalue:** has a name and an address (`x`). **rvalue:** a temporary (`x + 1`, a function return value).
- `T&&` binds to rvalues. A move constructor **steals** the internals (pointer swap, O(1)) instead of deep-copying (O(n)).
- `std::move(x)` doesn't move anything. It **casts** x to an rvalue so the move overload is chosen. After a move, x is valid but unspecified: don't use its value.
- **Return value optimisation (RVO):** returning a local by value usually doesn't even move; the object is built in place. Don't write `return std::move(local);`, because it blocks RVO.
- **Perfect forwarding:** `template<class T> void f(T&& arg) { g(std::forward<T>(arg)); }` keeps the lvalue/rvalue-ness.
- Mark move constructors `noexcept`. `std::vector` only moves (instead of copying) during a resize if the move can't throw.

## 8. Templates

```cpp
template <typename T>
T maxOf(T a, T b) { return a > b ? a : b; }
```

- Generated at **compile time** for each type used (monomorphisation): fast, but bigger binaries and slower builds. That's why template code lives in headers.
- Template specialisation, variadic templates (`template<class... Args>`), and **concepts** (C++20) to constrain types.

## 9. STL: containers and their complexity

| Container | Underlying | Access | Insert/erase | Notes |
|---|---|---|---|---|
| `vector` | dynamic array | O(1) | end O(1) amortised, middle O(n) | contiguous, cache friendly: **the default** |
| `deque` | chunked array | O(1) | both ends O(1) | |
| `list` | doubly linked list | O(n) | O(1) given an iterator | rarely the best choice (poor cache locality) |
| `map` / `set` | **red-black tree** | O(log n) | O(log n) | **sorted**; `lower_bound` available |
| `unordered_map` / `unordered_set` | hash table | O(1) avg, O(n) worst | O(1) avg | unordered; rehashing invalidates iterators |
| `priority_queue` | binary heap on a vector | top O(1) | push/pop O(log n) | **max-heap by default**; min-heap: `priority_queue<int, vector<int>, greater<int>>` |
| `stack` / `queue` | adapters over deque | | | |

**Iterator invalidation (a common trap):** `vector::push_back` that triggers a reallocation invalidates **all** iterators, pointers and references. Erasing from a vector while iterating: use `it = v.erase(it)`. For `map`, erase invalidates only the erased iterator.

**`map` vs `unordered_map`:** use `map` when you need order, range queries or a guaranteed O(log n). `unordered_map` is faster on average but has a bad worst case and no ordering.

Useful algorithms: `sort` (introsort, O(n log n)), `stable_sort`, `lower_bound`/`upper_bound`, `binary_search`, `reverse`, `accumulate`, `max_element`, `unique` (+ erase), `nth_element` (quickselect).

## 10. Lambdas

```cpp
int k = 3;
auto add_k = [k](int x) { return x + k; };            // capture by value
auto counter = [&k]() { ++k; };                         // capture by reference
std::sort(v.begin(), v.end(), [](const P& a, const P& b){ return a.cost < b.cost; });
```

**Trap:** capturing by reference a local that dies before the lambda runs (e.g. inside a thread) → dangling reference.

## 11. `new`/`delete` vs `malloc`/`free`

| `new` / `delete` | `malloc` / `free` |
|---|---|
| Operator; calls constructor/destructor | Function; raw bytes only |
| Type-safe, returns `T*` | Returns `void*` |
| Throws `std::bad_alloc` on failure | Returns NULL |
| `new[]` must pair with `delete[]` | |

Never mix them (`malloc` + `delete` is UB). In modern C++ avoid both: use containers and `make_unique`.

## 12. Exceptions

- `throw`, `try`/`catch` (catch by `const&`). Stack unwinding runs destructors, which is why RAII matters.
- **Never let an exception escape a destructor** (`std::terminate`).
- `noexcept` marks functions that can't throw (enables optimisations, e.g. vector moves).
- Many systems codebases (and some at Dell) avoid exceptions and use error codes instead, for predictability and C interop.

## 13. Concurrency in C++

```cpp
#include <thread>
#include <mutex>
#include <condition_variable>
#include <atomic>

std::mutex m;
int counter = 0;
void work() { for (int i = 0; i < 1000; ++i) { std::lock_guard<std::mutex> g(m); ++counter; } }
std::thread t1(work), t2(work); t1.join(); t2.join();

std::atomic<int> hits{0};
hits.fetch_add(1);          // lock-free increment
```

- `std::lock_guard` (simple RAII lock), `std::unique_lock` (can unlock early; needed with condition variables), `std::scoped_lock` (locks several mutexes without deadlock).
- `std::condition_variable` with `wait(lock, predicate)`: always use the predicate form, because of **spurious wakeups**.
- A `std::thread` must be `join()`ed or `detach()`ed before it's destroyed, otherwise `std::terminate`.
- `std::async` / `std::future` for task-based results.
Full producer-consumer code is in [07_Multithreading_Concurrency.md](07_Multithreading_Concurrency.md).

## 14. Modern C++ timeline (know the headline features)

| Standard | Highlights |
|---|---|
| C++11 | `auto`, lambdas, move semantics, smart pointers, `std::thread`, `nullptr`, range-for, `constexpr`, `unordered_map` |
| C++14 | generic lambdas, `make_unique` |
| C++17 | structured bindings `auto [a, b] = pair;`, `std::optional`, `std::variant`, `std::string_view`, `if constexpr`, filesystem |
| C++20 | concepts, ranges, coroutines, modules, `<=>` (three-way comparison), `std::span` |
| C++23 | `std::expected`, `std::print`, more ranges |

## 15. Misc questions that come up

- **`struct` vs `class`:** the only difference is default access (struct = public, class = private).
- **`static` member:** shared by all instances. A static member function has no `this`.
- **`const` member function** (`int get() const`) promises not to modify the object; it can be called on const objects. `mutable` members can still change (caches, mutexes).
- **`inline` and the ODR (One Definition Rule):** a non-inline function defined in a header and included in two .cpp files gives a linker error.
- **Why is `vector<bool>` special?** It's bit-packed, so it doesn't return real `bool&` references.
- **Empty class size** is 1 byte, so each object has a unique address.
- **Friend:** grants a function or class access to private members (breaks encapsulation; use sparingly).
- **Name mangling:** C++ encodes types into symbol names to support overloading. `extern "C"` turns it off so C code can link to C++ functions.

---

## 15b. Virtual functions: everything in one place (very frequently asked)

### In plain words
A **virtual function** lets you call a method through a **base-class pointer or reference** and have the **derived class's version** run, decided **at runtime** by the object's real type. Without `virtual`, the compiler decides at compile time from the pointer's type.
**Analogy:** a TV remote (base pointer) with a "power" button. Pressing it on a Sony TV runs Sony's power-on logic, and on an LG TV, LG's, even though you use the same remote.

### Static (early) binding vs dynamic (late) binding
```cpp
struct Animal {
    void eat()            { std::cout << "Animal eats\n"; }    // NOT virtual → static binding
    virtual void speak()  { std::cout << "...\n"; }            // virtual → dynamic binding
    virtual ~Animal() = default;
};
struct Dog : Animal {
    void eat()            { std::cout << "Dog eats\n"; }        // hides Animal::eat (not an override)
    void speak() override { std::cout << "Woof\n"; }
};
Animal* a = new Dog();
a->eat();     // "Animal eats"  → decided at COMPILE time from the pointer type (early/static binding)
a->speak();   // "Woof"         → decided at RUNTIME from the object type (late/dynamic binding)
delete a;     // calls ~Dog then ~Animal because the destructor is virtual
```

| | Static (early) binding | Dynamic (late) binding |
|---|---|---|
| Decided | at compile time | at runtime |
| Applies to | non-virtual functions, overloads, templates, default arguments | virtual functions called through a pointer/reference |
| Speed | direct call, can be inlined | one extra indirection (vtable lookup), usually not inlined |
| Gives | compile-time polymorphism | runtime polymorphism |

### How it works: vtable and vptr
```
class Animal: vtable_Animal = [ &Animal::speak, &Animal::~Animal ]
class Dog:    vtable_Dog    = [ &Dog::speak,    &Dog::~Dog ]          (overridden slots replaced)

Dog object: [ vptr → vtable_Dog | Animal's members | Dog's members ]
a->speak()  compiles to:  (*(a->vptr)[0])(a)   →  Dog::speak
```

- One **vtable per class** (created by the compiler, static); one **vptr per object** (set by the constructor).
- Calling through an **object** (not a pointer/reference) uses static binding: `Dog d; d.speak();`, and `Animal x = d;` **slices** the object to an Animal.

### Pure virtual functions, abstract classes and interfaces
```cpp
struct Shape {                        // ABSTRACT CLASS: has at least one pure virtual function
    virtual double area() const = 0;  // pure virtual: "derived classes MUST implement this"
    virtual ~Shape() = default;
    void describe() const { std::cout << "area " << area() << '\n'; }   // concrete method allowed
};
// Shape s;            // ❌ error: cannot instantiate an abstract class
struct Square : Shape { double side; double area() const override { return side * side; } };
```

- An **abstract class** can't be instantiated; it can have data members, constructors and implemented methods.
- An **interface** in C++ is an abstract class with **only** pure virtual functions (+ a virtual destructor).
- A derived class that doesn't implement every pure virtual function is **also abstract**.
- A pure virtual function **can** have a body (defined outside the class), callable as `Shape::area()`.

### Pure virtual destructor
```cpp
struct Base { virtual ~Base() = 0; };    // makes Base abstract even if there are no other pure virtuals
Base::~Base() {}                          // ⚠ MUST still be defined: derived destructors always call it
```

### Virtual destructor: why it's mandatory for polymorphic bases
Deleting a derived object through a base pointer whose destructor isn't virtual is **undefined behaviour**: typically only `~Base` runs, so the derived resources leak. **Rule:** if a class has any virtual function, give it a virtual destructor.

### `override` and `final`

- `override` asks the compiler to check that you really are overriding (it catches typos and signature mismatches like a missing `const`).
- `final` on a function → can't be overridden further. `final` on a class → can't be inherited from (also lets the compiler devirtualise calls).

### Tricky rules (classic interview questions)

1. **Constructors can't be virtual** (the vptr isn't set up until construction). Use a virtual `clone()` ("virtual constructor idiom") or factories.
2. **Calling a virtual function inside a constructor or destructor** calls the **current class's** version, not the derived one (the derived part doesn't exist yet, or no longer exists).
3. **Default arguments are statically bound:**

```cpp
struct B { virtual void f(int x = 1) { std::cout << "B " << x; } };
struct D : B { void f(int x = 2) override { std::cout << "D " << x; } };
B* p = new D; p->f();      // prints "D 1"  → D's body (dynamic) with B's default argument (static)!
```

4. **Static member functions can't be virtual** (no `this`, no object). **Member function templates can't be virtual.**
5. **Covariant return types:** an override may return a pointer/reference to a more derived type (`Dog* clone() override` overriding `Animal* clone()`).
6. **Calling the base version explicitly:** `Animal::speak();` inside `Dog::speak()`.
7. **Name hiding:** declaring `f(double)` in a derived class hides **all** base overloads of `f`. Bring them back with `using Base::f;`.
8. **Private virtual functions** can still be overridden (the basis of the "Non-Virtual Interface" pattern: a public non-virtual method calls a private virtual hook).
9. **Size:** an object with virtual functions grows by one pointer (the vptr), usually 8 bytes on 64-bit.
10. **Cost:** an indirect call + lost inlining; negligible in most code, but avoided in very hot loops (use templates/CRTP for static polymorphism instead).

### Polymorphism types in C++ (summary)
```
Polymorphism
├── Compile-time (static): function overloading · operator overloading · templates (incl. CRTP)
└── Runtime (dynamic):     virtual functions + inheritance, accessed via pointers/references
```

### `enum class` and `nullptr` (modern basics often asked)
```cpp
enum Color { RED, GREEN };            // old enum: names leak into the scope, converts to int silently
enum class Status { Ok, Failed };      // scoped + strongly typed: Status::Ok, no implicit int conversion
enum class Level : uint8_t { Low, High };   // you choose the underlying type
int* p = nullptr;                      // nullptr has its own type (std::nullptr_t); NULL is just 0,
                                       // which picks the wrong overload in f(int) vs f(int*)
```

## 16. Advanced C++ (SDE 2 / systems-company depth)

**Exception-safety guarantees:** *no-throw* (never throws: destructors, swaps, moves), *strong* (on failure, state is unchanged: the copy-and-swap idiom gives this), *basic* (no leaks, invariants hold, but state may change).

**`constexpr` and compile-time computation:**

```cpp
constexpr int fact(int n) { return n <= 1 ? 1 : n * fact(n - 1); }
static_assert(fact(5) == 120);      // evaluated at compile time
```

**`std::optional`, `std::variant`, `std::function`:**

```cpp
std::optional<int> find_id(const std::string &name);   // "maybe a value", instead of -1 or nullptr
std::variant<int, std::string> v = "x";                 // a type-safe union; std::visit to handle
std::function<void(int)> cb = [](int x){ /*...*/ };      // any callable (with some overhead)
```

**Meyers' singleton (thread-safe since C++11):**

```cpp
Config &Config::instance() { static Config inst; return inst; }   // local static init is thread-safe
```

**PIMPL (pointer to implementation):** hide private members behind a pointer in the header, so changing the implementation doesn't force all dependants to recompile (ABI stability for libraries).

```cpp
// widget.h
class Widget { public: Widget(); ~Widget(); void draw(); private: struct Impl; std::unique_ptr<Impl> p; };
```

**CRTP (curiously recurring template pattern):** static polymorphism without virtual calls: `template<class D> struct Base { void f() { static_cast<D*>(this)->impl(); } };`

**Placement new and custom allocators:** construct an object in pre-allocated memory (`new (buf) T(args)`); memory pools/arenas avoid repeated `malloc` costs in hot paths (common in storage/network code).

**Smart pointer custom deleters:** `std::unique_ptr<FILE, decltype(&fclose)> f(fopen("x", "r"), &fclose);` gives RAII for C resources.

**Copy elision:** guaranteed in C++17 for prvalues (`return T{...};` constructs directly in the caller's storage).

**Templates, SFINAE and concepts:** SFINAE ("substitution failure is not an error") enables/disables templates by type traits (`std::enable_if`). C++20 **concepts** make it readable:

```cpp
template <typename T> concept Numeric = std::is_arithmetic_v<T>;
template <Numeric T> T add(T a, T b) { return a + b; }
```

**Memory ordering in practice:** `std::atomic<bool> ready; data = 42; ready.store(true, std::memory_order_release);` in one thread and `while (!ready.load(std::memory_order_acquire)); use(data);` in another. Release/acquire publishes `data` safely.

**Undefined behaviour sanitizers and tools:** `-fsanitize=address,undefined,thread`, `valgrind`, `gdb`, `perf` (CPU profiling), `clang-tidy`/`cppcheck` (static analysis).

**Build systems:** Make (you used it at OneFS), CMake (generates builds), Bazel. Header vs source, one-definition rule, include guards, forward declarations to cut compile times.

## 17. Variables, literals, initialisation and type conversions

**Plain words:** a variable is a **named box of a fixed type** in memory. The type decides how big the box is and what you can do with it.

**Fundamental types:** `bool`, `char` (+ `signed char`, `unsigned char`, `char8_t/16_t/32_t`, `wchar_t`), `short`, `int`, `long`, `long long` (each signed or unsigned), `float`, `double`, `long double`, `void`, `std::nullptr_t`. Fixed-width types live in `<cstdint>`: `int8_t … int64_t`, `uint32_t`, `size_t` (for sizes and indexes).

**Literals:**

```cpp
42        // int           42u   // unsigned      42L   // long      42LL  // long long
0x2A      // hex 42        052   // octal 42      0b101010 // binary 42 (C++14)
1'000'000 // digit separators (C++14)
3.14      // double        3.14f // float
'A'       // char          "hi"  // const char[3] (C string)      "hi"s // std::string (using namespace std::literals)
true false nullptr
R"(C:\path\no\escapes)"   // raw string literal
```

**Ways to initialise (know all of them):**

```cpp
int a = 5;        // copy initialisation
int b(5);         // direct initialisation
int c{5};         // list/brace initialisation (C++11): PREFERRED; rejects narrowing
int d{};          // value-initialised → 0
int e;            // ⚠ uninitialised local: garbage value
// int f{3.7};    // ❌ compile error: narrowing double → int (a good thing)
std::vector<int> v1(3, 7);   // 3 elements, each 7
std::vector<int> v2{3, 7};   // 2 elements: 3 and 7   (braces prefer the initializer_list constructor!)
auto x = 5;       // int        auto y = 5.0;  // double     auto z{5};  // int (C++17)
const int k = 10;            // can't change after initialisation
constexpr int SIZE = 64;     // a compile-time constant (usable for array sizes and templates)
```

**Type conversions:**

- **Implicit (automatic):** integer promotion (`char`/`short` → `int` in arithmetic), the usual arithmetic conversions (`int + double` → `double`), `int` → `bool` (0 is false), derived* → base*.
- **Narrowing** (`double` → `int`, `long` → `short`) silently loses data with `=`, but brace initialisation refuses it.
- **Signed/unsigned trap:** `-1 < 0u` is **false** (−1 converts to a huge unsigned number). Compile with `-Wall -Wextra -Wconversion`.
- **Explicit:** `static_cast<int>(3.7)` → 3 (the C++ way; see §6 for the other casts).

**`auto` and `decltype`:**

```cpp
auto it = m.begin();              // the type is deduced from the initialiser (drops top-level const and references)
const auto& ref = big_vector;     // add const& yourself to avoid a copy
decltype(x + y) sum = x + y;      // "the type of this expression"
decltype(auto) f() { return (member); }   // keeps references exactly (advanced)
```

**Type aliases:** `using Price = double;` (modern) vs `typedef double Price;` (old); `using Map = std::unordered_map<std::string, int>;`.

## 18. Functions in depth

**Declaration vs definition:** a declaration (prototype) tells the compiler the function exists (`int add(int, int);`, usually in a header); the definition provides the body (in a `.cpp`). Call before definition = needs a declaration.

**How to pass parameters (decision table):**

| Pass as | Syntax | Copy? | Can modify caller's object? | Use for |
|---|---|---|---|---|
| Value | `f(Widget w)` | yes | no | small types (int, double, pointers), or when you need your own copy (then move it) |
| Const reference | `f(const Widget& w)` | no | no | **large read-only inputs** (strings, vectors): the default for objects |
| Reference | `f(Widget& w)` | no | yes | "out"/"in-out" parameters |
| Pointer | `f(Widget* w)` | no | yes | when "no object" (`nullptr`) is a valid option |
| Rvalue reference | `f(Widget&& w)` | no | takes ownership | sink parameters, move constructors |
| `std::string_view` / `std::span<T>` | | no | no | read-only views of strings/arrays (C++17/20) |

**Returning values:** return by value (cheap thanks to copy elision/move). **Never return a reference or pointer to a local variable** (it's destroyed when the function returns → dangling):

```cpp
const std::string& bad() { std::string s = "x"; return s; }   // ❌ dangling reference
std::string good()       { std::string s = "x"; return s; }   // ✅ moved/elided
```

Return several values with a struct, `std::pair`/`std::tuple` + structured bindings, or `std::optional` for "maybe no value".

**Overloading and overload resolution:** functions can share a name if the parameters differ. The compiler picks the best match: exact match > promotion > standard conversion > user-defined conversion; an ambiguity is a compile error. The return type alone can't distinguish overloads.

**Default arguments:** put them in the declaration only; from the right (`void log(std::string msg, int level = 1)`).

**Recursion:** a function calling itself; needs a base case; each call uses stack space (deep recursion → stack overflow).

**`inline`, `constexpr`, `consteval`, `noexcept`, `[[nodiscard]]`:**

```cpp
inline int sq(int x) { return x * x; }          // allowed in headers (ODR-safe); inlining is the compiler's choice
constexpr int cube(int x) { return x * x * x; } // can run at compile time
consteval int must_compile_time(int x) { return x + 1; }   // C++20: MUST run at compile time
[[nodiscard]] bool save();                       // warn if the caller ignores the result
void swap(Widget&, Widget&) noexcept;           // promises not to throw
```

**Function pointers, references to functions, `std::function`:**

```cpp
int add(int a, int b) { return a + b; }
int (*fp)(int, int) = &add;      fp(2, 3);          // a raw function pointer
using BinOp = int(*)(int, int);                     // alias for readability
std::function<int(int, int)> op = add;              // can hold any callable (lambda, functor, function)
```

**`main` and command-line arguments:** `int main(int argc, char* argv[])`; return 0 for success (`EXIT_SUCCESS`, `EXIT_FAILURE` from `<cstdlib>`).

## 19. Scope, lifetime, storage duration, linkage, namespaces

**Scope = where a name is visible.** Block scope (inside `{}`), function parameters, class scope, namespace scope (incl. global). An inner name **shadows** an outer one (compile with `-Wshadow`).

**Storage duration = how long the object lives:**

| Duration | Created | Destroyed | Examples |
|---|---|---|---|
| Automatic | entering the block | leaving the block (destructor runs) | local variables |
| Static | program start (or first use for function-local statics) | program end | globals, `static` locals, static members |
| Thread | thread start | thread end | `thread_local` variables |
| Dynamic | `new` | `delete` (or the smart pointer's destructor) | heap objects |

```cpp
int counter() { static int n = 0; return ++n; }   // n keeps its value between calls (initialised once, thread-safe)
```

**Linkage = can other `.cpp` files see this name?**

- **External linkage:** visible across files (non-static global functions/variables). Declare in a header with `extern int g;`, define once in one `.cpp`.
- **Internal linkage:** private to one `.cpp`: `static` globals or an **anonymous namespace** (`namespace { int helper; }`, the C++ way).
- **No linkage:** locals.
- **One Definition Rule (ODR):** each function/variable must be defined exactly once in the whole program (except `inline` ones, templates and classes, which may appear in several files if identical).

**Namespaces:** group names and avoid clashes.

```cpp
namespace onefs::licensing { bool is_enabled(const std::string& feature); }   // nested (C++17 syntax)
onefs::licensing::is_enabled("SyncIQ");
namespace lic = onefs::licensing;   lic::is_enabled("x");                    // alias
using std::string;                  // bring one name in (fine in .cpp files)
// using namespace std;             // avoid in headers: pollutes every includer
```

**Argument-dependent lookup (ADL):** for an unqualified function call, the compiler also looks in the namespaces of the arguments' types (why `std::cout << x` finds `std::operator<<`).

## 20. Strings: `std::string` and `std::string_view`

**Plain words:** `std::string` is a **growable, owning** sequence of characters that manages its own memory (unlike C's `char[]`). `std::string_view` is a **read-only window** onto characters owned by someone else: no copy, no allocation.

```cpp
#include <string>
#include <string_view>
std::string s = "PowerScale";
s += " OneFS";                      // append        s.push_back('!'); s.pop_back();
s.size(); s.length(); s.empty();    // size
s[0]; s.at(0);                      // at() checks bounds (throws std::out_of_range)
s.substr(0, 5);                     // "Power" (pos, count): makes a copy
s.find("One");                      // index, or std::string::npos if not found
s.rfind('e'); s.find_first_of("aeiou");
s.replace(0, 5, "Iso");             // replace a range
s.insert(0, ">> "); s.erase(0, 3);
s.compare("x"); s == "x"; s < "y";  // comparisons are lexicographic
s.c_str();                          // const char* for C APIs (valid until s changes)
s.starts_with("Power"); s.ends_with("FS");   // C++20 (contains() in C++23)

std::to_string(42);                 // number → string
std::stoi("42"); std::stod("3.5");  // string → number (throw on bad input)
// split a string on spaces
std::istringstream iss("a b c"); std::string word; while (iss >> word) { /* … */ }

void print(std::string_view sv) { std::cout << sv; }   // accepts std::string, "literal", char* with no copy
```

**string_view trap:** it doesn't own the data, so never keep a `string_view` to a temporary string that dies (`std::string_view v = std::string("tmp");` → dangling).
**Small string optimisation (SSO):** short strings (typically ≤15 chars) are stored inside the string object itself, with no heap allocation.
**Unicode:** `std::string` stores bytes (UTF-8 in practice); `size()` counts bytes, not visible characters.

## 21. Input and output: console, files, string streams, formatting

**The stream model:** data flows through **streams**: `std::cin` (keyboard/stdin), `std::cout` (stdout), `std::cerr` (unbuffered errors), `std::clog`. `<<` writes ("insertion"), `>>` reads ("extraction").

```
 keyboard ──► std::cin ──>>──► your variables ──<<──► std::cout ──► terminal
 file.txt ──► std::ifstream                          std::ofstream ──► out.txt
 a string ──► std::istringstream                     std::ostringstream ──► a string
```
```cpp
#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>

int age; std::string name;
std::cin >> name >> age;                       // reads whitespace-separated tokens
std::getline(std::cin, name);                  // a whole line (watch the leftover '\n' after >>; use std::ws)
if (!std::cin) { /* bad input → the stream is in a fail state */ std::cin.clear(); }

std::cout << std::fixed << std::setprecision(2) << 3.14159 << '\n';   // 3.14
std::cout << std::setw(8) << std::left << "id" << '|' << std::hex << 255 << std::dec << '\n';
// '\n' vs std::endl: endl also FLUSHES the buffer (slower in loops)

// Files
std::ifstream in("collections.csv");
if (!in) { std::cerr << "cannot open\n"; return 1; }
std::string line;
while (std::getline(in, line)) {
    std::istringstream row(line);
    std::string id, product; int size;
    std::getline(row, id, ','); std::getline(row, product, ','); row >> size;
}
std::ofstream out("report.txt", std::ios::app);     // modes: in, out, app, binary, trunc
out << "processed\n";                               // closed automatically by the destructor (RAII)

std::ifstream bin("data.bin", std::ios::binary);    // binary read
std::vector<char> buf(1024); bin.read(buf.data(), buf.size()); auto got = bin.gcount();

std::ostringstream os; os << "user=" << 42; std::string msg = os.str();   // build strings
```

**Modern formatting:** C++20 `std::format("{} has {:.2f}% used", name, pct)`; C++23 `std::print` / `std::println`. Many projects use the `fmt` library, which they're based on.
**Filesystem (C++17 `<filesystem>`):** `std::filesystem::exists(p)`, `directory_iterator`, `file_size`, `create_directories`, `path` operations.
**Performance tip:** `std::ios::sync_with_stdio(false); std::cin.tie(nullptr);` speeds up heavy console I/O (competitive programming).

## 22. STL containers in depth

**Plain words:** containers are ready-made data structures that manage their own memory. Choosing the right one is half of writing good C++.

```
SEQUENCE        vector · deque · list · forward_list · array      (ordered by position)
ASSOCIATIVE     set · multiset · map · multimap                     (sorted by key; red-black tree)
UNORDERED       unordered_set/_multiset · unordered_map/_multimap   (hash table; no order)
ADAPTORS        stack · queue · priority_queue                      (restricted interfaces on top of others)
VIEWS (C++17/20) string_view · span                                 (non-owning windows)
```

| Container | Structure | Access | Insert/erase | Notes |
|---|---|---|---|---|
| `vector<T>` | dynamic contiguous array | O(1) index | O(1) amortised at the end; O(n) elsewhere | the default choice; `reserve(n)` avoids reallocations |
| `array<T,N>` | fixed-size array on the stack | O(1) | n/a | a safer replacement for C arrays; knows its size |
| `deque<T>` | blocks of arrays | O(1) index | O(1) at both ends | double-ended queue; no contiguity guarantee |
| `list<T>` | doubly linked list | O(n) | O(1) anywhere with an iterator | `splice` moves nodes cheaply; poor cache use |
| `forward_list<T>` | singly linked list | O(n) | O(1) after a position | minimal memory |
| `set<T>` / `multiset<T>` | red-black tree | O(log n) find | O(log n) | sorted, unique / duplicates allowed |
| `map<K,V>` / `multimap` | red-black tree | O(log n) | O(log n) | sorted by key; `lower_bound`, range queries |
| `unordered_map<K,V>` / `unordered_set` | hash table | O(1) average | O(1) average | needs `std::hash<K>`; `reserve` to avoid rehashing |
| `stack<T>` | adaptor (deque by default) | top only | push/pop O(1) | LIFO |
| `queue<T>` | adaptor (deque) | front/back | push/pop O(1) | FIFO |
| `priority_queue<T>` | binary heap on a vector | top O(1) | push/pop O(log n) | **max-heap by default** |

```cpp
std::vector<int> v{5, 3, 8};
v.push_back(1); v.emplace_back(2);        // emplace constructs in place (no temporary)
v.insert(v.begin() + 1, 9); v.erase(v.begin());
v.size(); v.capacity(); v.reserve(100); v.shrink_to_fit(); v.clear();
v.front(); v.back(); v.data();            // raw pointer to contiguous storage
std::vector<std::vector<int>> grid(3, std::vector<int>(4, 0));   // 3×4 zeros

std::map<std::string, int> stock{{"ssd", 4}};
stock["hdd"] = 2;                         // operator[] INSERTS a default if the key is missing!
if (auto it = stock.find("nvme"); it != stock.end()) { /* found */ }   // if-with-initialiser (C++17)
stock.contains("ssd");                    // C++20
stock.insert_or_assign("ssd", 5); stock.try_emplace("ram", 8); stock.erase("hdd");
for (const auto& [name, qty] : stock) std::cout << name << '=' << qty << '\n';   // sorted by key
auto lo = stock.lower_bound("h");         // first key ≥ "h"

std::unordered_map<std::string, int> freq; freq.reserve(1000);
for (const auto& w : words) ++freq[w];

std::set<int> s{3, 1, 2}; s.insert(5); s.count(2); s.erase(1);
std::priority_queue<int> maxh; std::priority_queue<int, std::vector<int>, std::greater<>> minh;
auto cmp = [](const Job& a, const Job& b) { return a.priority < b.priority; };
std::priority_queue<Job, std::vector<Job>, decltype(cmp)> jobs(cmp);

struct Point { int x, y; bool operator==(const Point&) const = default; };   // C++20 defaulted ==
struct PointHash { size_t operator()(const Point& p) const { return std::hash<int>{}(p.x) ^ (std::hash<int>{}(p.y) << 1); } };
std::unordered_set<Point, PointHash> seen;            // custom key → provide a hash and ==
```

**Iterator invalidation summary:** `vector`: reallocation invalidates everything; insert/erase invalidates from that point on. `deque`: inserting at the ends invalidates iterators (not references). `list`/`map`/`set`: only the erased element's iterators. `unordered_*`: a rehash invalidates iterators.
**Choosing:** default to `vector`; need lookup by key → `unordered_map` (or `map` if you need order/ranges); need the min/max repeatedly → `priority_queue`; FIFO → `queue`/`deque`; frequent middle insertion with stable iterators → `list` (rare in practice).

## 23. Iterators

**Plain words:** an iterator is a **generalised pointer**, a bookmark that knows how to move through a container. Algorithms work on any container through iterators, so you write `std::sort` once and it works everywhere.

```
 v:   [ 5 | 3 | 8 | 1 ]  (end)
        ▲                  ▲
     v.begin()          v.end()   ← one PAST the last element (never dereference it)
```

| Category | Can do | Example containers |
|---|---|---|
| Input / output | read once / write once, move forward | stream iterators |
| Forward | read/write, move forward, multi-pass | `forward_list`, `unordered_*` |
| Bidirectional | + move backward (`--it`) | `list`, `set`, `map` |
| Random access | + jump (`it + 5`, `it[i]`, `<`) | `vector`, `deque`, `array` |
| Contiguous (C++20) | + elements adjacent in memory | `vector`, `array`, `string` |

```cpp
for (auto it = v.begin(); it != v.end(); ++it) *it *= 2;
for (auto it = v.rbegin(); it != v.rend(); ++it) std::cout << *it;   // reverse
std::cbegin(v);                                   // const iterator (read-only)
std::copy(v.begin(), v.end(), std::back_inserter(out));              // inserter grows `out`
std::copy(v.begin(), v.end(), std::ostream_iterator<int>(std::cout, " "));
std::distance(a, b); std::advance(it, 3); std::next(it); std::prev(it);
```

**Erasing while iterating:**

```cpp
for (auto it = m.begin(); it != m.end(); ) {
    if (it->second == 0) it = m.erase(it);   // erase returns the next valid iterator
    else ++it;
}
std::erase_if(v, [](int x) { return x < 0; });   // C++20 one-liner for vectors, maps, etc.
```

## 24. Algorithms (`<algorithm>`, `<numeric>`)

**Plain words:** a toolbox of ~100 ready-made, well-tested loops. Use them instead of hand-written loops: clearer and less buggy.

```cpp
#include <algorithm>
#include <numeric>
std::vector<int> v{5, 3, 8, 1, 9, 2};

// Non-modifying
std::find(v.begin(), v.end(), 8);                        // iterator to 8 (or end)
std::find_if(v.begin(), v.end(), [](int x){ return x > 6; });
std::count(v.begin(), v.end(), 3); std::count_if(...);
std::all_of / any_of / none_of(v.begin(), v.end(), pred);
std::min_element / max_element / minmax_element(v.begin(), v.end());
std::equal(a.begin(), a.end(), b.begin()); std::mismatch(...); std::search(...);  // search = subsequence

// Modifying
std::transform(v.begin(), v.end(), v.begin(), [](int x){ return x * 2; });   // map
std::fill(v.begin(), v.end(), 0); std::iota(v.begin(), v.end(), 1);          // 1,2,3,…
std::replace(v.begin(), v.end(), 3, 30); std::reverse(v.begin(), v.end());
std::rotate(v.begin(), v.begin() + 2, v.end());
v.erase(std::remove_if(v.begin(), v.end(), [](int x){ return x % 2; }), v.end());   // erase-remove idiom
std::sort(v.begin(), v.end()); v.erase(std::unique(v.begin(), v.end()), v.end());  // dedupe
std::shuffle(v.begin(), v.end(), std::mt19937{std::random_device{}()});

// Sorting and searching
std::sort(v.begin(), v.end());                                   // introsort, O(n log n), NOT stable
std::stable_sort(people.begin(), people.end(), [](auto& a, auto& b){ return a.age < b.age; });
std::partial_sort(v.begin(), v.begin() + 3, v.end());           // only the smallest 3 sorted, at the front
std::nth_element(v.begin(), v.begin() + k, v.end());            // the k-th element in place (quickselect), O(n)
std::binary_search(v.begin(), v.end(), 8);                      // needs sorted input
std::lower_bound / upper_bound / equal_range(v.begin(), v.end(), 8);
std::partition(v.begin(), v.end(), pred);

// Numeric
std::accumulate(v.begin(), v.end(), 0);                          // sum (pass 0LL for long long)
std::accumulate(v.begin(), v.end(), 1, std::multiplies<>());    // product
std::reduce(std::execution::par, v.begin(), v.end());           // parallel sum (C++17, <execution>)
std::partial_sum(v.begin(), v.end(), out.begin());              // prefix sums
std::inner_product(a.begin(), a.end(), b.begin(), 0);           // dot product
std::gcd(12, 18); std::lcm(4, 6);

// Set operations (on sorted ranges)
std::set_union / set_intersection / set_difference(a.begin(), a.end(), b.begin(), b.end(), std::back_inserter(out));
// Heap operations
std::make_heap(v.begin(), v.end()); std::push_heap(...); std::pop_heap(...); std::sort_heap(...);
// Permutations
std::next_permutation(v.begin(), v.end());                       // generates permutations in lexicographic order
```

**Comparators:** a function returning `true` if `a` should come before `b`, and it must be a **strict weak ordering** (use `<`, never `<=`, or `std::sort` can crash).
**C++20 ranges versions** are simpler: `std::ranges::sort(v);`, `std::ranges::find(v, 8);` (§31).

## 25. Function objects, lambdas, `std::function`, `std::bind`

**Function object (functor):** any object with `operator()`. It can carry state.

```cpp
struct GreaterThan { int limit; bool operator()(int x) const { return x > limit; } };
std::count_if(v.begin(), v.end(), GreaterThan{5});
std::sort(v.begin(), v.end(), std::greater<>());   // standard functors: plus, minus, less, greater, equal_to…
```

**Lambda = an unnamed functor written inline:**

```
 [captures] (parameters) mutable -> return_type { body }
```
```cpp
int base = 10;
auto add      = [](int a, int b) { return a + b; };            // no captures
auto addBase  = [base](int x) { return x + base; };            // capture a copy
auto bump     = [&base]() { ++base; };                         // capture by reference
auto all_copy = [=]() { return base * 2; };                    // capture everything used, by copy
auto all_ref  = [&]() { base = 0; };                           // capture everything by reference
auto counter  = [n = 0]() mutable { return ++n; };             // init-capture + mutable (modify its own copy)
auto owner    = [p = std::make_unique<int>(5)]() { return *p; };   // move-only capture via init-capture
auto generic  = [](auto a, auto b) { return a < b; };          // generic lambda (C++14)
auto typed    = []<typename T>(const std::vector<T>& v) { return v.size(); };   // template lambda (C++20)
// In member functions: [this] captures the object pointer; [*this] copies the object (C++17)
```

**Dangers:** capturing by reference a local that dies before the lambda runs (threads, callbacks, returned lambdas) → dangling. Capture `this` in a callback that outlives the object → crash.
**`std::function<R(Args…)>`** stores any callable with that signature (type erasure). It's flexible but may allocate and can't be inlined; use templates/`auto` parameters in hot paths.
**`std::bind`** (pre-lambda style) partially applies arguments: `auto add5 = std::bind(add, 5, std::placeholders::_1);`. Prefer lambdas today.

## 26. Templates in depth

**Plain words:** templates are **code stencils**. You write the logic once with a placeholder type `T`, and the compiler stamps out a real version for each type you use (`int`, `std::string`…). It's generic programming with no runtime cost.

**Function templates and argument deduction:**

```cpp
template <typename T>
T maxOf(const T& a, const T& b) { return a < b ? b : a; }
maxOf(3, 7);           // T deduced as int
maxOf<double>(3, 7.5); // explicit
// maxOf(3, 7.5);      // ❌ T can't be both int and double
```

**Class templates, member functions, default and non-type parameters:**

```cpp
template <typename T, std::size_t N = 16>          // N is a NON-TYPE parameter (a compile-time value)
class RingBuffer {
    std::array<T, N> data_{}; std::size_t head_ = 0, size_ = 0;
public:
    void push(const T& x) { data_[(head_ + size_) % N] = x; if (size_ < N) ++size_; else head_ = (head_ + 1) % N; }
    std::size_t size() const { return size_; }
};
RingBuffer<int, 8> rb;
std::vector v{1, 2, 3};        // CTAD (C++17): class template argument deduction → vector<int>
```

**Specialisation:**

```cpp
template <typename T> struct TypeName { static constexpr const char* get() { return "unknown"; } };
template <> struct TypeName<int> { static constexpr const char* get() { return "int"; } };   // full specialisation
template <typename T> struct TypeName<T*> { static constexpr const char* get() { return "pointer"; } }; // partial (classes only)
```

**Variadic templates and fold expressions:**

```cpp
template <typename... Args>
void log_all(const Args&... args) { ((std::cout << args << ' '), ...); std::cout << '\n'; }   // fold over the comma operator
template <typename... Ts> auto sum(Ts... xs) { return (xs + ... + 0); }                       // sum(1, 2, 3) = 6
template <typename... Args> auto make(Args&&... args) { return Widget(std::forward<Args>(args)...); }   // perfect forwarding
```

**Compile-time logic:** `<type_traits>` (`std::is_integral_v<T>`, `std::is_same_v<A,B>`, `std::remove_reference_t<T>`, `std::decay_t<T>`), `if constexpr` (discard branches at compile time), `static_assert`, concepts (§16):

```cpp
template <typename T>
std::string describe(const T& x) {
    if constexpr (std::is_arithmetic_v<T>) return "number " + std::to_string(x);
    else return "object";
}
```

**How templates are compiled:** they're instantiated where used, so their full definitions normally live in **headers**. Each distinct type creates a new copy of the code (code bloat), and error messages can be long (concepts help). Two-phase lookup: names not depending on `T` are checked at definition time; dependent names at instantiation (hence `typename T::value_type` and `this->member` in derived templates).

## 27. Multiple inheritance, casting in full, RTTI

```cpp
struct Printable { virtual void print() const = 0; virtual ~Printable() = default; };
struct Serializable { virtual std::string toJson() const = 0; virtual ~Serializable() = default; };
struct Report : Printable, Serializable {          // multiple inheritance: common for "interfaces"
    void print() const override { std::cout << "report\n"; }
    std::string toJson() const override { return "{}"; }
};
```

- **Diamond problem** and `virtual` inheritance: §5. With virtual bases, the **most-derived class constructs the shared base**.
- **Ambiguity:** if two bases have the same member name, qualify it: `obj.A::name`.
- **Object layout:** each base subobject sits inside the derived object, so a `Report*` converted to `Serializable*` may **change the pointer value** (it points to that subobject). That's why `reinterpret_cast` between them is wrong and `static_cast`/`dynamic_cast` are right.
- **Casts (full rules):**
  - `static_cast`: well-defined compile-time conversions (numeric, up-casts, down-casts you know are safe, `void*` → `T*`).
  - `dynamic_cast`: checked down/cross-casts in polymorphic hierarchies; `nullptr` (pointers) or `std::bad_cast` (references) on failure.
  - `const_cast`: add/remove `const` (modifying a truly const object is UB).
  - `reinterpret_cast`: bit reinterpretation (pointer ↔ integer, unrelated pointer types); low-level only.
  - `std::bit_cast` (C++20): safe type punning of same-size trivially copyable types.
- **RTTI:** `typeid(*ptr).name()` (implementation-specific names), `typeid(a) == typeid(b)`; requires polymorphic types for the dynamic type; can be disabled (`-fno-rtti`) in some codebases.

## 28. Utility types: `pair`, `tuple`, `optional`, `variant`, `any`
```cpp
std::pair<std::string, int> p{"ssd", 4};      p.first; p.second;
auto t = std::make_tuple(1, "x", 2.5);        std::get<0>(t); std::get<double>(t);
auto [id, name, score] = t;                   // structured bindings (C++17)
std::tie(a, b) = std::pair{1, 2};             // unpack into existing variables

std::optional<User> find_user(int id);        // "a User or nothing"
if (auto u = find_user(42)) use(*u);  else log("not found");
find_user(1).value_or(User{"guest"});

std::variant<int, std::string, double> v = "hello"s;    // exactly ONE of these types at a time
std::holds_alternative<std::string>(v);  std::get<std::string>(v);  std::get_if<int>(&v);
std::visit([](auto&& x) { std::cout << x; }, v);          // handle whichever is active
// overload pattern: std::visit(overloaded{ [](int i){…}, [](const std::string& s){…}, [](double d){…} }, v);

std::any a = 5; a = std::string("x"); std::any_cast<std::string>(a);   // any type (type-erased; rarely needed)
std::expected<int, std::string> parse(std::string_view s);              // C++23: a value OR an error
```

## 29. Time (`<chrono>`) and random numbers (`<random>`)
```cpp
#include <chrono>
using namespace std::chrono_literals;
auto start = std::chrono::steady_clock::now();            // steady_clock for measuring durations
do_work();
auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - start);
std::cout << elapsed.count() << " ms\n";
std::this_thread::sleep_for(250ms);
auto now = std::chrono::system_clock::now();              // wall-clock time (for timestamps)
// C++20 adds calendars and time zones: std::chrono::year_month_day, zoned_time

#include <random>
std::mt19937 rng{std::random_device{}()};                 // a seeded Mersenne Twister engine
std::uniform_int_distribution<int> dice(1, 6);
std::normal_distribution<double> noise(0.0, 1.0);
int roll = dice(rng); double n = noise(rng);
// Don't use rand() % N (poor quality, biased). Use <random>. For security (tokens), use OS crypto APIs instead.
```

## 30. Concurrency, the rest of the toolbox (basics in §13 and file 07)
```cpp
#include <future>
auto fut = std::async(std::launch::async, [] { return compute(); });   // run on another thread
int result = fut.get();                                                 // wait and get (rethrows exceptions)

std::promise<int> prom; std::future<int> f = prom.get_future();
std::thread t([&prom] { prom.set_value(42); }); std::cout << f.get(); t.join();

std::packaged_task<int(int)> task([](int x) { return x * 2; });
auto f2 = task.get_future(); std::thread(std::move(task), 21).detach(); f2.get();

std::once_flag flag; std::call_once(flag, init_logging);                // run exactly once across threads
thread_local int per_thread_counter = 0;

std::jthread worker([](std::stop_token st) { while (!st.stop_requested()) poll(); });   // C++20: auto-join + cooperative stop
worker.request_stop();

std::counting_semaphore<4> slots(4); slots.acquire(); /* … */ slots.release();          // C++20
std::latch ready(3); /* each worker */ ready.count_down(); /* main */ ready.wait();
std::barrier sync(3);                                                  // reusable phase barrier
std::shared_mutex rw; { std::shared_lock r(rw); /* many readers */ } { std::unique_lock w(rw); /* one writer */ }
```

Parallel algorithms (C++17): `std::sort(std::execution::par, v.begin(), v.end());`.

## 31. Modern C++ highlights: ranges, coroutines, modules

**Ranges (C++20):** algorithms that take whole containers, plus lazy **views** you can pipe together.

```cpp
#include <ranges>
std::vector<int> v{1, 2, 3, 4, 5, 6};
std::ranges::sort(v);
auto evens_squared = v | std::views::filter([](int x) { return x % 2 == 0; })
                       | std::views::transform([](int x) { return x * x; });   // lazy: nothing computed yet
for (int x : evens_squared) std::cout << x << ' ';                             // 4 16 36
for (int i : std::views::iota(0, 5)) {}                                        // 0..4
auto firstThree = v | std::views::take(3);   // also: drop, reverse, keys, values, split, zip (C++23), enumerate (C++23)
```

**Coroutines (C++20):** functions that can **pause and resume** (`co_await`, `co_yield`, `co_return`), the basis for generators and async I/O frameworks. The standard gives the low-level machinery; you normally use a library type (C++23 adds `std::generator`).

```cpp
std::generator<int> count_to(int n) { for (int i = 1; i <= n; ++i) co_yield i; }   // C++23
for (int x : count_to(3)) std::cout << x;                                           // 123
```

**Modules (C++20):** a replacement for header includes: `export module math; export int add(int a, int b);` and `import math;`. Faster builds and no macro leakage; compiler/build-system support is still maturing.
**Other C++20/23 features:** the three-way comparison `<=>` (auto-generates `<`, `<=`, `>`, `>=`), designated initialisers (`Point{.x = 1, .y = 2}`), `consteval`/`constinit`, `std::span`, `std::format`, `std::source_location`, `std::print` (23), `std::expected` (23), deducing `this` (23).

## 32. Memory management in depth

**The C++ memory toolbox, from safest to lowest-level:**

```
 automatic objects & containers (vector, string)        ← use by default
 smart pointers (unique_ptr, shared_ptr, weak_ptr)       ← when you need heap lifetime/ownership
 custom allocators / std::pmr memory resources            ← performance tuning
 new / delete (and new[] / delete[])                      ← rarely, inside RAII classes
 placement new, operator new overloads, malloc            ← very low level (pools, embedded, OS code)
```

- `new` = allocate (`operator new`) + construct; `delete` = destroy + deallocate. Arrays: `new T[n]` must be freed with `delete[]`.
- **Allocation failure** throws `std::bad_alloc` (or `new (std::nothrow) T` returns `nullptr`).
- **Overloading `operator new/delete`** per class enables pooling and tracking.
- **Alignment:** `alignof(T)`, `alignas(64)` (cache-line alignment to avoid false sharing), aligned `new` (C++17).
- **Polymorphic memory resources** (`<memory_resource>`, C++17): `std::pmr::vector<int> v{&arena};` allocates from an arena/pool you control.
- **Ownership rules (Core Guidelines):** a raw pointer = non-owning observer; ownership = a smart pointer or a container; never `delete` something you didn't `new`.
- **Common bugs:** leaks, double frees, use-after-free, mismatched `new[]`/`delete`, dangling references/iterators, buffer overruns. **Tools:** AddressSanitizer, LeakSanitizer, Valgrind (§16).

## 33. Building C++ projects: headers, linking, libraries, CMake

**How a multi-file program is organised:**

```
 include/geometry/shape.h   ← declarations (class definitions, function prototypes); has include guards / #pragma once
 src/shape.cpp              ← definitions (#include "geometry/shape.h")
 src/main.cpp               ← uses them
 compile each .cpp → .o (one "translation unit" each) → link all .o + libraries → executable
```
```cpp
// shape.h
#pragma once
#include <string>
namespace geo {
class Shape { public: virtual ~Shape() = default; virtual double area() const = 0; };
double total_area(const std::vector<const Shape*>& shapes);
}
```

**Libraries:** **static** (`libgeo.a`/`.lib`: copied into your executable at link time) vs **shared/dynamic** (`libgeo.so`/`.dylib`/`.dll`: loaded at runtime, shared between programs, needs to be found via `LD_LIBRARY_PATH`/rpath). Linker errors like "undefined reference to `X`" mean a missing definition or library; "multiple definition" means an ODR violation.
**Manual build:** `g++ -std=c++20 -O2 -Wall -Wextra -Iinclude src/*.cpp -o app`; flags: `-O0/-O2/-O3` (optimisation), `-g` (debug symbols), `-DNDEBUG` (disable `assert`), `-fsanitize=address,undefined`.
**CMake (the standard build-system generator):**

```cmake
cmake_minimum_required(VERSION 3.20)
project(telemetry LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
add_library(geo src/shape.cpp)
target_include_directories(geo PUBLIC include)
add_executable(app src/main.cpp)
target_link_libraries(app PRIVATE geo)
enable_testing()
add_subdirectory(tests)
```
```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build -j && ctest --test-dir build
```

**Package managers:** vcpkg, Conan. **Other build systems:** Make (OneFS), Bazel, Meson, Ninja (a fast backend for CMake).

## 34. Testing, debugging and tooling
```cpp
// GoogleTest
#include <gtest/gtest.h>
TEST(RingBuffer, OverwritesOldest) {
    RingBuffer<int, 2> rb; rb.push(1); rb.push(2); rb.push(3);
    EXPECT_EQ(rb.size(), 2u);
}
// Catch2 and doctest are popular alternatives
```

- **Debugging:** `gdb ./app` / `lldb`: `break file.cpp:42`, `run`, `bt` (backtrace), `frame 2`, `print var`, `watch var`, `next`/`step`/`finish`; debugging core dumps (`ulimit -c unlimited`, `gdb ./app core`).
- **Sanitizers:** AddressSanitizer (memory errors), UBSan (undefined behaviour), ThreadSanitizer (data races), MemorySanitizer (uninitialised reads).
- **Static analysis:** clang-tidy, cppcheck, compiler warnings as errors (`-Werror`); formatting with clang-format.
- **Profiling:** `perf record/report`, Valgrind's callgrind, gprof, Intel VTune; heap profiling with massif/heaptrack.
- **Benchmarking:** Google Benchmark (beware the optimiser removing "unused" work).

## 35. Best practices (from the C++ Core Guidelines)

1. Prefer RAII and value semantics; no naked `new`/`delete`.
2. Use `const` everywhere it applies; `constexpr` where possible.
3. Prefer `std::vector`, `std::array`, `std::string`, `std::string_view`, `std::span` over raw arrays and `char*`.
4. Pass large inputs by `const&`, small ones by value; return by value.
5. Rule of 0: let members manage resources; if you must, implement all of the rule of 5.
6. Make single-argument constructors `explicit`; mark overrides `override`; polymorphic bases get virtual destructors.
7. Prefer `enum class`, `nullptr`, `using` aliases, braces for initialisation.
8. Prefer algorithms and ranges over raw loops; prefer `auto` when the type is obvious or verbose.
9. Avoid global mutable state; keep functions short and focused.
10. Compile with warnings + sanitizers in CI; treat warnings as bugs.

## 36. Exercises (do them in order)

1. Read numbers from a file and print min, max and average with 2 decimals.
2. Implement your own `Vector<T>` with `push_back`, growth by doubling, the rule of 5, and iterators.
3. Write a `Matrix` class with `operator+`, `operator*` and `operator<<`.
4. Build a word-frequency counter for a text file using `unordered_map`, then print the top 10 with `partial_sort`.
5. Model shapes with an abstract `Shape` base, store them as `std::vector<std::unique_ptr<Shape>>`, and sum their areas.
6. Write a thread-safe bounded queue (mutex + condition variables) and a producer/consumer demo.
7. Implement an LRU cache with `std::list` + `std::unordered_map`.
8. Write a variadic `log(...)` using fold expressions, and a `print_all` using `std::visit` over a `std::variant`.
9. Rewrite a raw-loop program using ranges views.
10. Set up a CMake project with a library, an executable and GoogleTest, built with sanitizers.

## Interview traps (C/C++)

1. "Is `volatile` enough for thread safety?" **No.** Use atomics or a mutex. `volatile` gives no atomicity and no memory ordering.
2. "What happens if the base destructor isn't virtual?" Undefined behaviour; the derived resources leak.
3. "`std::move` moves the object?" No, it's a cast.
4. "`shared_ptr` is thread-safe?" The **reference count** is atomic, but accessing the **pointed-to object** is not synchronised.
5. "`sizeof` of a struct?" Remember padding.
6. "Difference between `map` and `unordered_map`?" Tree vs hash; ordered vs not; O(log n) guaranteed vs O(1) average.
7. "Why prefer `make_shared`?" One allocation for object + control block, and exception safety.

## How to tie it to your experience

> "OneFS is C and C++ on a FreeBSD base. In Dynamic Licensing I'd typically reproduce a failure through the Python test layer, then trace it into the C/C++ backend. For intermittent multi-node issues the cause was often timing, like shared resources or ordering, rather than a simple logic error. So I relied on logs across nodes, looping the test to reproduce it, and reading the code paths carefully, more than a debugger."

## Quick revision

- Stack (auto, fast, limited) vs heap (manual, big). The five memory bugs. valgrind/ASan/gdb.
- RAII + smart pointers (`unique_ptr` default, `shared_ptr` refcount, `weak_ptr` breaks cycles).
- vtable/vptr, virtual destructor, slicing, override vs overload.
- Rule of 0/3/5. Move = steal, `std::move` = cast, `noexcept` move.
- STL complexity table; `map` = red-black tree; iterator invalidation.
- `volatile` ≠ thread safety. Data race = UB.

# 01 · Data Structures & Algorithms

**Why this matters:** every product company filters on DSA first. At SDE 2 they expect **medium problems in 20–25 minutes**, clean code, correct complexity and handled edge cases, while you talk. You don't need 500 problems. You need to **recognise ~18 patterns** and have practised each one.

Language: use **Python** for interviews. It's the fastest to write and you know it well. Know C++ STL equivalents for C++-heavy companies (see file 02).

---

## Start here: DSA in plain words

**Data structure** = *how you arrange data* so the operations you need are fast. **Algorithm** = *a step-by-step recipe* to solve a problem. Choosing the right structure is like choosing the right container in a kitchen: a spice rack for quick grabbing, a fridge for keeping things, a stack of plates for last-in-first-out.

**Why companies test it:** it shows you can think about **efficiency** (will this work for 10 million users?) and write correct code under pressure. The same thinking is used when you design caches, indexes, queues and schedulers.

### Big-O in plain words
Big-O answers: *"If the input gets 10× bigger, how much slower does my code get?"*

```
O(1)       → same time no matter the size       (looking up a locker by its number)
O(log n)   → +1 step each time the size doubles  (guessing a number 1–1000 by halving: ~10 guesses)
O(n)       → 10× data = 10× time                 (reading every name on a list)
O(n log n) → a bit worse than linear             (good sorting)
O(n²)      → 10× data = 100× time                (comparing every pair of students)
O(2ⁿ)      → doubles with each extra item        (trying every subset: explodes fast)

time ▲                                   O(2ⁿ)  O(n²)
     │                                  ╱      ╱
     │                               ╱      ╱      O(n log n)
     │                            ╱     ╱     ___╱
     │                        ╱    ╱ ___╱‾‾      ____ O(n)
     │                   ╱  __╱‾‾‾      ____‾‾‾‾
     │            __╱‾‾‾____‾‾‾‾  _______________ O(log n)
     │___________________________________________ O(1)
     └──────────────────────────────────────────► input size n
```

### Every data structure as an everyday object

| Structure | Everyday picture | Good at | Bad at |
|---|---|---|---|
| **Array** | a row of numbered lockers | jump to locker #57 instantly | inserting a locker in the middle (shift everything) |
| **Linked list** | a treasure hunt: each clue points to the next | inserting/removing a clue anywhere (if you're at it) | finding the 57th clue (follow 57 clues) |
| **Stack** | a pile of plates | take the top plate (last in, first out) | reaching a plate in the middle |
| **Queue** | the line at a ticket counter | first come, first served | skipping the line |
| **Hash table** | a coat-check counter: give a token, get your coat | find by key instantly | keeping things in order |
| **Tree** | a family tree / company org chart | hierarchies, sorted data (BST), fast search when balanced | can become a "stick" if unbalanced |
| **Heap** | hospital triage: the most urgent patient is always seen next | getting the min/max quickly | searching for an arbitrary item |
| **Graph** | a city map: places + roads | routes, networks, dependencies | nothing simple: many algorithms |
| **Trie** | a phone's autocomplete tree of letters | prefix search | memory use |

```
Array:        [ 5 | 8 | 2 | 9 | 1 ]      index 0 1 2 3 4 → address = start + index × size
Linked list:  5 → 8 → 2 → 9 → 1 → null
Stack:        | 1 |  ← top (push/pop here)      Queue:  in → [ 1 | 9 | 2 | 8 ] → out
              | 9 |
              | 2 |
Hash table:   "asha" → hash → bucket 3 → ("asha", 98)
Tree:              8                 Graph:   A ─── B
                 /   \                        │ ╲   │
                3     10                      C ─── D
               / \      \
              1   6      14
```

### Algorithm strategies (paradigms) in plain words

| Paradigm | Idea | Everyday example | Classic problems |
|---|---|---|---|
| **Brute force** | try everything | trying every key on a key ring | small inputs; a baseline |
| **Two pointers / sliding window** | move two markers smartly instead of re-checking | reading a sentence with a highlighter window | pairs in sorted arrays, longest substring |
| **Divide and conquer** | split, solve the halves, combine | sorting exam papers by splitting the pile among friends | merge sort, quicksort, binary search |
| **Greedy** | take the best-looking option at each step | paying with the largest note first | interval scheduling, Dijkstra, Huffman |
| **Dynamic programming** | remember answers to smaller sub-problems so you never recompute | writing down "7 × 8 = 56" instead of re-adding | coin change, LCS, knapsack |
| **Backtracking** | try a choice, and undo it if it fails | solving a maze: go back at a dead end | permutations, N-Queens, sudoku |
| **Graph search (BFS/DFS)** | explore neighbours systematically | BFS = ripples in a pond; DFS = exploring one corridor fully before another | shortest path, islands, dependencies |

### How to recognise which tool to use (the decision map)
```
Is the input sorted, or can I sort it?        → two pointers / binary search
"Longest/shortest contiguous …"               → sliding window
"Find pairs / count / seen before?"           → hash map
"Next greater / matching brackets"            → stack (monotonic stack)
"Top K / smallest / largest repeatedly"       → heap
"Tree / hierarchy"                            → DFS (recursion) or BFS (levels)
"Grid / network / dependencies / shortest"    → graph BFS/DFS, topo sort, Dijkstra
"All combinations / arrangements"             → backtracking
"Count ways / min cost / max value" + overlapping choices → dynamic programming
"Prefix search over words"                    → trie
"Connected groups / merging sets"             → union-find
```

## Part 0: Foundations (basics first: every data structure, how it works)

### 0.1 Arrays and strings

- **Array:** contiguous memory, so index access is O(1) (address = base + i × element_size). Insert/delete in the middle is O(n) (shifting). Cache-friendly.
- **Static vs dynamic array:** fixed size (C arrays) vs growable (Python list, C++ vector, Java ArrayList; doubles capacity when full → amortised O(1) append).
- **2D arrays:** row-major in C/C++/Python (rows stored one after another). `grid[r][c]`; neighbours via direction arrays.
- **Strings:** immutable in Python and Java (every "change" makes a new string); mutable `char[]` in C, `std::string` in C++. Common operations: reverse, palindrome check, anagram (count array of 26), substring search, character frequency.

```python
# Basic array operations you must be able to write without thinking
def reverse_in_place(a):
    i, j = 0, len(a) - 1
    while i < j: a[i], a[j] = a[j], a[i]; i += 1; j -= 1

def rotate_right(a, k):                 # rotate by k using three reversals: O(n) time, O(1) space
    n = len(a); k %= n
    def rev(l, r):
        while l < r: a[l], a[r] = a[r], a[l]; l += 1; r -= 1
    rev(0, n - 1); rev(0, k - 1); rev(k, n - 1)

def is_anagram(s, t):
    if len(s) != len(t): return False
    cnt = [0] * 26
    for a, b in zip(s, t): cnt[ord(a) - 97] += 1; cnt[ord(b) - 97] -= 1
    return all(c == 0 for c in cnt)
```

- **Prefix sums:** `pre[i+1] = pre[i] + a[i]` → any range sum `a[l..r] = pre[r+1] - pre[l]` in O(1).
- **Difference array:** add v to range [l, r] in O(1): `d[l] += v; d[r+1] -= v`, then a prefix sum rebuilds the array. Great for many range updates.
- **Kadane, two pointers, sliding window** build on arrays (Part 3).

### 0.2 Recursion (the base of trees, backtracking and DP)
Every recursive function needs: (1) a **base case**, (2) progress towards it, (3) trust that the recursive call solves the smaller problem.

```python
def factorial(n):            # O(n) time, O(n) stack space
    return 1 if n <= 1 else n * factorial(n - 1)

def power(x, n):             # fast exponentiation: O(log n)
    if n == 0: return 1
    half = power(x, n // 2)
    return half * half if n % 2 == 0 else half * half * x
```

**Recursion tree** for naive Fibonacci: `fib(5)` calls `fib(4)` and `fib(3)`, which repeat work → O(2ⁿ). Memoisation (cache results) turns it into O(n). That's the bridge to DP.

```
                fib(5)
            /          \
        fib(4)        fib(3)   ← fib(3) computed twice, fib(2) three times …
       /     \        /    \
   fib(3)  fib(2)  fib(2) fib(1)
```

**Tail recursion:** the recursive call is the last operation. Some languages optimise it into a loop (Scala with `@tailrec`), but **Python and Java don't**.

### 0.3 Hash tables: how they work inside
```
key ──hash()──► integer ──mod capacity──► bucket index
             ┌───┬───┬───┬───┬───┐
buckets:     │ 0 │ 1 │ 2 │ 3 │ 4 │
             └─┬─┴───┴─┬─┴───┴───┘
               ▼       ▼
            (k1,v1)  (k7,v7)→(k3,v3)   ← separate chaining: collisions form a list
```

- **Collision handling:**
  - **Separate chaining:** each bucket holds a list (Java HashMap; converts to a tree after 8).
  - **Open addressing:** on a collision, probe for another slot. Linear probing (i+1, i+2…), quadratic probing, double hashing. Python dicts use open addressing.
- **Load factor** = items / buckets. When it's too high (~0.75), **resize** (double + rehash everything, O(n), but amortised O(1) per insert).
- **Worst case O(n)** if many keys collide (a bad hash, or an attack: hash flooding, which is why Python randomises string hashes).
- A good hash function is fast, deterministic and spreads keys uniformly.

### 0.4 Stack, queue, deque

| Structure | Order | Operations | Uses |
|---|---|---|---|
| **Stack** | LIFO | push, pop, peek: O(1) | function calls, undo, brackets, DFS, expression evaluation |
| **Queue** | FIFO | enqueue, dequeue: O(1) | BFS, scheduling, buffers |
| **Deque** | both ends | O(1) at both ends | sliding window maximum, palindromes |
| **Priority queue** | by priority | push/pop O(log n) | scheduling, Dijkstra, top-K |

```python
stack = []; stack.append(1); stack.pop()              # list as a stack
from collections import deque
q = deque(); q.append(1); q.popleft()                 # deque as a queue

class MyQueue:                                        # queue using two stacks (asked often)
    def __init__(self): self.inp, self.out = [], []
    def push(self, x): self.inp.append(x)
    def pop(self):
        if not self.out:
            while self.inp: self.out.append(self.inp.pop())
        return self.out.pop()                         # amortised O(1)
```

**Circular queue** (fixed array + head/tail indices mod capacity) is how ring buffers work in OS and network drivers.

**Expression evaluation:** infix `3 + 4 * 2` → postfix `3 4 2 * +` (shunting-yard algorithm, using an operator stack) → evaluate the postfix with a value stack.

### 0.5 Linked lists
```
Singly:   head → [1|•] → [2|•] → [3|∅]
Doubly:   ∅ ← [•|1|•] ⇄ [•|2|•] ⇄ [•|3|•] → ∅
Circular: the last node points back to the head
```

| Operation | Array | Linked list |
|---|---|---|
| Access by index | O(1) | O(n) |
| Insert/delete at head | O(n) | **O(1)** |
| Insert/delete in the middle (given the node) | O(n) | O(1) (doubly) |
| Memory | compact | extra pointer(s) per node; poor cache locality |

```python
class ListNode:
    def __init__(self, val=0, nxt=None): self.val, self.next = val, nxt

def middle(head):                      # slow/fast pointers
    slow = fast = head
    while fast and fast.next: slow, fast = slow.next, fast.next.next
    return slow

def merge_two(a, b):                   # dummy-node technique
    dummy = tail = ListNode()
    while a and b:
        if a.val <= b.val: tail.next, a = a, a.next
        else: tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b
    return dummy.next

def remove_nth_from_end(head, n):      # gap of n between two pointers
    dummy = ListNode(0, head); fast = slow = dummy
    for _ in range(n + 1): fast = fast.next
    while fast: fast, slow = fast.next, slow.next
    slow.next = slow.next.next
    return dummy.next
```

### 0.6 Trees: terminology and traversals
```
            1          ← root (depth 0)
          /   \
         2     3       ← 2 is the parent of 4 and 5
        / \     \
       4   5     6     ← leaves: 4, 5, 6; height of the tree = 2
```

- **Binary tree:** at most 2 children. **Full:** 0 or 2 children each. **Complete:** all levels full except the last, filled left to right (heaps). **Perfect:** all levels full. **Balanced:** heights of subtrees differ by at most 1. **Degenerate/skewed:** behaves like a linked list (height n).
- A binary tree with n nodes has height between log₂n (balanced) and n−1 (skewed).
- **Traversals** (for the tree above):
  - Pre-order (root, left, right): 1 2 4 5 3 6 → copying/serialising a tree
  - **In-order** (left, root, right): 4 2 5 1 3 6 → **sorted order for a BST**
  - Post-order (left, right, root): 4 5 2 6 3 1 → deleting/freeing, computing sizes
  - Level-order (BFS): 1 2 3 4 5 6

```python
def inorder_iterative(root):           # iterative in-order (asked when "no recursion")
    res, st, cur = [], [], root
    while cur or st:
        while cur: st.append(cur); cur = cur.left
        cur = st.pop(); res.append(cur.val); cur = cur.right
    return res

def preorder_iterative(root):
    if not root: return []
    res, st = [], [root]
    while st:
        n = st.pop(); res.append(n.val)
        if n.right: st.append(n.right)      # push right first so left is processed first
        if n.left: st.append(n.left)
    return res
```

### 0.7 Binary search trees (BST)
Property: left subtree < node < right subtree (for every node). Search/insert/delete are O(h): O(log n) if balanced, O(n) if skewed.

```python
def bst_search(root, key):
    while root and root.val != key:
        root = root.left if key < root.val else root.right
    return root

def bst_insert(root, key):
    if not root: return TreeNode(key)
    if key < root.val: root.left = bst_insert(root.left, key)
    else: root.right = bst_insert(root.right, key)
    return root

def bst_delete(root, key):
    if not root: return None
    if key < root.val: root.left = bst_delete(root.left, key)
    elif key > root.val: root.right = bst_delete(root.right, key)
    else:
        if not root.left: return root.right         # 0 or 1 child
        if not root.right: return root.left
        succ = root.right                            # 2 children: replace with the in-order successor
        while succ.left: succ = succ.left
        root.val = succ.val
        root.right = bst_delete(root.right, succ.val)
    return root
```

**Self-balancing BSTs** keep the height O(log n):

- **AVL tree:** strict balance (heights differ by ≤ 1), restored with **rotations** (LL, RR, LR, RL). Faster lookups, more rotations on insert.
- **Red-black tree:** looser balance (no red node has a red child; every root-to-leaf path has the same number of black nodes), so fewer rotations. Used by C++ `std::map`, Java `TreeMap`, the Linux CFS scheduler and Java HashMap's tree buckets.

```
Right rotation at y (fixes a left-heavy subtree):
      y                x
     / \              / \
    x   C    →       A   y
   / \                  / \
  A   B                B   C
```

- **B-trees / B+ trees:** many keys per node → shallow trees → few disk reads. Used in databases and filesystems (file 09).

### 0.8 Heaps (priority queues): how they work
A **binary heap** is a complete binary tree stored in an array: for index i, children are at `2i+1` and `2i+2`, and the parent is at `(i-1)//2`. **Min-heap property:** each parent ≤ its children.

```
Array: [1, 3, 2, 7, 4, 5]        Tree:        1
                                            /   \
                                           3     2
                                          / \   /
                                         7   4 5
```
```python
class MinHeap:
    def __init__(self): self.a = []
    def push(self, x):                        # append, then sift UP: O(log n)
        a = self.a; a.append(x); i = len(a) - 1
        while i > 0 and a[(i - 1) // 2] > a[i]:
            a[(i - 1) // 2], a[i] = a[i], a[(i - 1) // 2]; i = (i - 1) // 2
    def pop(self):                            # move the last to the root, then sift DOWN: O(log n)
        a = self.a; top = a[0]; last = a.pop()
        if a:
            a[0] = last; i = 0
            while True:
                l, r, s = 2 * i + 1, 2 * i + 2, i
                if l < len(a) and a[l] < a[s]: s = l
                if r < len(a) and a[r] < a[s]: s = r
                if s == i: break
                a[i], a[s] = a[s], a[i]; i = s
        return top
```

**Heapify** (building a heap from an array) is **O(n)**, not O(n log n): most nodes are near the bottom and sift down only a little. **Heap sort:** heapify, then pop n times: O(n log n), in place.

### 0.8b Skip list (an ordered structure used by Redis sorted sets)
A sorted linked list with **express lanes**: higher levels skip over many nodes, so search, insert and delete are **O(log n) on average**, without the complex rotations of balanced trees. Each new node is promoted to the next level with probability ½ (a coin flip).

```
Level 3:  head ──────────────────────────► 50 ──────────────────► nil
Level 2:  head ─────────► 20 ────────────► 50 ─────────► 80 ────► nil
Level 1:  head ──► 10 ──► 20 ──► 30 ──► 40 ─► 50 ──► 60 ─► 80 ─► 90 ─► nil
Search 60: start top-left, move right while the next value ≤ 60, drop down a level when it's too far.
```

Used by Redis sorted sets, LevelDB/RocksDB memtables, and `ConcurrentSkipListMap` in Java (easy to make concurrent).

### 0.9 Graphs: representation and terminology

- **Directed / undirected, weighted / unweighted, cyclic / acyclic (DAG), connected / disconnected, dense / sparse.**
- **Degree** (in-degree / out-degree for directed graphs). **Path, cycle, component, bipartite** (2-colourable).
- **Representations:**

```
Edges: 0-1, 0-2, 1-2, 2-3
Adjacency list (sparse graphs; O(V+E) space):   0: [1,2]  1: [0,2]  2: [0,1,3]  3: [2]
Adjacency matrix (dense graphs; O(V²) space; O(1) edge check):
      0 1 2 3
   0 [0 1 1 0]
   1 [1 0 1 0]
   2 [1 1 0 1]
   3 [0 0 1 0]
```

- **BFS** explores level by level (queue): shortest path in unweighted graphs. **DFS** goes deep (stack/recursion): cycle detection, topological sort, connected components, path finding. Both are O(V + E).
- **Cycle detection:** undirected → DFS with a parent check, or union-find. Directed → DFS with three colours (white/grey/black; a grey→grey edge is a back edge = cycle), or Kahn's algorithm (not all nodes processed = cycle).

```python
def has_cycle_directed(n, adj):
    WHITE, GREY, BLACK = 0, 1, 2; color = [WHITE] * n
    def dfs(u):
        color[u] = GREY
        for v in adj[u]:
            if color[v] == GREY: return True               # back edge
            if color[v] == WHITE and dfs(v): return True
        color[u] = BLACK; return False
    return any(color[u] == WHITE and dfs(u) for u in range(n))
```

---

## Part 1: Complexity (always state it)

| Notation | Name | Example | n = 10⁶ is OK? |
|---|---|---|---|
| O(1) | constant | hash lookup | ✅ |
| O(log n) | logarithmic | binary search | ✅ |
| O(n) | linear | single loop | ✅ |
| O(n log n) | linearithmic | sorting, heap of n items | ✅ |
| O(n²) | quadratic | nested loops | ❌ (10¹²) |
| O(2ⁿ) | exponential | subsets | only n ≤ ~20 |
| O(n!) | factorial | permutations | only n ≤ ~10 |

**Rule of thumb:** about 10⁸ simple operations per second. Read the constraints and they tell you the expected complexity:

- n ≤ 20 → backtracking / bitmask
- n ≤ 1000 → O(n²) is fine
- n ≤ 10⁵–10⁶ → O(n log n) or O(n)
- n ≤ 10⁹ → O(log n) or math

**Space complexity** includes the recursion stack: recursive DFS on a skewed tree is O(n) space.

**Amortised O(1):** Python `list.append` / C++ `vector::push_back` occasionally resize (copy everything into a buffer about 1.5–2× bigger), but averaged over many operations each append is O(1).

---

## Part 2: Python data structures and their costs

| Structure | Python | Key operations |
|---|---|---|
| Dynamic array | `list` | index O(1), append O(1) amortised, insert/pop at front O(n), `x in list` O(n) |
| Hash map | `dict`, `collections.defaultdict`, `Counter` | get/set/delete O(1) average, O(n) worst case |
| Hash set | `set` | add/remove/contains O(1) average |
| Deque | `collections.deque` | append/pop at both ends O(1). Use it as a queue, never `list.pop(0)` |
| Min-heap | `heapq` | push/pop O(log n), peek `h[0]` O(1), heapify O(n). For a max-heap, push `-x` |
| Sorted list | `bisect` on a list | search O(log n), insert O(n) |
| Ordered map | none built in (`sortedcontainers` isn't always allowed) | use heap + hash map, or C++ `std::map` |

```python
from collections import defaultdict, Counter, deque
import heapq, bisect
from functools import lru_cache   # memoisation
import math
INF = float('inf')
```

---

## Part 3: The patterns, with templates

### 1. Hashing: "have I seen this before?" / counting
**Signal:** find pairs, duplicates, anagrams, frequencies, "subarray sum = k".

```python
def two_sum(nums, target):
    seen = {}                      # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
```

**Prefix sum + hash map** (subarray sum equals k):

```python
def subarray_sum(nums, k):
    count, prefix, freq = 0, 0, {0: 1}
    for x in nums:
        prefix += x
        count += freq.get(prefix - k, 0)   # some earlier prefix p with prefix - p == k
        freq[prefix] = freq.get(prefix, 0) + 1
    return count
```

### 2. Two pointers
**Signal:** sorted array, pairs or triplets, palindromes, in-place partitioning.

```python
def two_sum_sorted(a, target):
    l, r = 0, len(a) - 1
    while l < r:
        s = a[l] + a[r]
        if s == target: return [l, r]
        if s < target: l += 1
        else: r -= 1
```

For 3Sum: sort, fix `i`, two-pointer the rest, skip duplicates.

### 3. Sliding window
**Signal:** "longest/shortest **contiguous** subarray/substring such that…".

```python
def longest_substring_no_repeat(s):
    last = {}; l = best = 0
    for r, ch in enumerate(s):
        if ch in last and last[ch] >= l:
            l = last[ch] + 1           # shrink past the duplicate
        last[ch] = r
        best = max(best, r - l + 1)
    return best
```

General template (variable window):

```python
l = 0
for r in range(len(a)):
    add(a[r])
    while window_invalid():
        remove(a[l]); l += 1
    update_answer(l, r)
```

### 4. Stack / monotonic stack
**Signal:** matching brackets, "next greater/smaller element", histogram, undo.

```python
def next_greater(nums):
    res = [-1] * len(nums); st = []          # stack of indices, values decreasing
    for i, x in enumerate(nums):
        while st and nums[st[-1]] < x:
            res[st.pop()] = x
        st.append(i)
    return res
```

### 5. Binary search (including "binary search on the answer")
**Signal:** sorted data, or "minimise the maximum" / "minimum capacity such that…" with a monotonic yes/no check.

```python
def lower_bound(a, target):          # first index with a[i] >= target
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < target: lo = mid + 1
        else: hi = mid
    return lo

def min_feasible(lo, hi, ok):        # smallest x in [lo, hi] with ok(x) True
    while lo < hi:
        mid = (lo + hi) // 2
        if ok(mid): hi = mid
        else: lo = mid + 1
    return lo
# Koko eating bananas: ok(speed) = sum(ceil(p / speed)) <= h
```

**Trap:** off-by-one. Use the `lo < hi` + `hi = mid` form consistently.

### 6. Linked list
**Signal:** reverse, merge, cycle, middle, k-th from the end.

```python
def reverse(head):
    prev = None
    while head:
        head.next, prev, head = prev, head, head.next
    return prev

def has_cycle(head):                  # Floyd: slow and fast pointers
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast: return True
    return False
```

**Use a dummy head node** for merges and deletions so you don't special-case the head.

### 7. Trees: DFS and BFS
**Signal:** anything on a tree. Decide: do I need info from children (post-order) or pass info down (pre-order)?

```python
def max_depth(root):
    if not root: return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))

def level_order(root):
    if not root: return []
    res, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft(); level.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        res.append(level)
    return res
```

**"Return one thing, update a global"** (diameter, max path sum):

```python
def diameter(root):
    best = 0
    def depth(n):
        nonlocal best
        if not n: return 0
        l, r = depth(n.left), depth(n.right)
        best = max(best, l + r)       # path through n
        return 1 + max(l, r)          # what the parent can use
    depth(root); return best
```

**BST:** in-order traversal gives sorted order. Validate a BST with (low, high) bounds, not just parent comparisons.

### 8. Heap / top-K / two heaps
**Signal:** "k largest/smallest/closest", "merge k sorted", "running median", scheduling.

```python
def top_k_frequent(nums, k):
    cnt = Counter(nums)
    return [x for x, _ in heapq.nlargest(k, cnt.items(), key=lambda p: p[1])]

def kth_largest(nums, k):            # min-heap of size k: O(n log k)
    h = []
    for x in nums:
        heapq.heappush(h, x)
        if len(h) > k: heapq.heappop(h)
    return h[0]
```

**Running median:** max-heap for the lower half and min-heap for the upper half, kept balanced.

### 9. Intervals
**Signal:** meetings, overlaps, merging ranges.

```python
def merge(intervals):
    intervals.sort()
    res = [intervals[0]]
    for s, e in intervals[1:]:
        if s <= res[-1][1]: res[-1][1] = max(res[-1][1], e)
        else: res.append([s, e])
    return res
```

**Minimum meeting rooms:** sort the starts and the ends separately and sweep, or use a min-heap of end times.

### 10. Graphs: BFS / DFS
**Signal:** grids, islands, connections, shortest path in an **unweighted** graph (use BFS).

```python
def num_islands(grid):
    R, C = len(grid), len(grid[0]); count = 0
    def dfs(r, c):
        if r < 0 or c < 0 or r >= R or c >= C or grid[r][c] != '1': return
        grid[r][c] = '0'                                  # mark visited
        for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)): dfs(r+dr, c+dc)
    for r in range(R):
        for c in range(C):
            if grid[r][c] == '1': count += 1; dfs(r, c)
    return count
```

**Multi-source BFS** (rotting oranges): push every source into the queue first.
**Trap:** Python recursion limit is about 1000. For big grids use an iterative BFS or `sys.setrecursionlimit`.

### 11. Topological sort (Kahn's algorithm)
**Signal:** dependencies, prerequisites, build order, "is there a cycle in a directed graph".

```python
def topo_order(n, edges):            # edge (a, b) means a must come before b
    g = defaultdict(list); indeg = [0] * n
    for a, b in edges: g[a].append(b); indeg[b] += 1
    q = deque(i for i in range(n) if indeg[i] == 0); order = []
    while q:
        u = q.popleft(); order.append(u)
        for v in g[u]:
            indeg[v] -= 1
            if indeg[v] == 0: q.append(v)
    return order if len(order) == n else []   # [] means there's a cycle
```

### 12. Union-Find (Disjoint Set Union)
**Signal:** connected components, "redundant connection", grouping, Kruskal's MST.

```python
class DSU:
    def __init__(self, n): self.p = list(range(n)); self.rank = [0] * n
    def find(self, x):
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]     # path compression (halving)
            x = self.p[x]
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb: return False             # already connected: adding this edge makes a cycle
        if self.rank[ra] < self.rank[rb]: ra, rb = rb, ra
        self.p[rb] = ra
        if self.rank[ra] == self.rank[rb]: self.rank[ra] += 1
        return True
```

With both optimisations, each operation is nearly O(1) (inverse Ackermann).

### 13. Shortest paths

- **Unweighted:** BFS.
- **Non-negative weights:** Dijkstra with a heap, O((V + E) log V).
- **Negative weights / at most k edges:** Bellman-Ford (e.g. "Cheapest Flights Within K Stops").

```python
def dijkstra(n, adj, src):            # adj[u] = [(v, w), ...]
    dist = [INF] * n; dist[src] = 0; h = [(0, src)]
    while h:
        d, u = heapq.heappop(h)
        if d > dist[u]: continue      # stale entry
        for v, w in adj[u]:
            if d + w < dist[v]:
                dist[v] = d + w; heapq.heappush(h, (dist[v], v))
    return dist
```

### 14. Backtracking
**Signal:** "all combinations / permutations / subsets", N-Queens, word search. Choose → explore → un-choose.

```python
def subsets(nums):
    res, path = [], []
    def bt(i):
        if i == len(nums): res.append(path[:]); return
        path.append(nums[i]); bt(i + 1); path.pop()   # take it
        bt(i + 1)                                      # skip it
    bt(0); return res
```

**Duplicates:** sort first, then skip `nums[i] == nums[i-1]` at the same recursion level.

### 15. Dynamic programming
**Signal:** "count the ways", "min/max cost", "is it possible", and the choices overlap. Recipe:

1. Define the **state**: `dp[i]` = answer for the first i items / ending at i.
2. Write the **transition** from smaller states.
3. Set the **base cases**.
4. Fix the **order** (top-down memo or bottom-up table).
5. **Optimise space** if only the last row is used.

```python
# Coin change: fewest coins to make the amount
def coin_change(coins, amount):
    dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a: dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != INF else -1

# LCS: classic 2D
def lcs(a, b):
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            dp[i][j] = dp[i-1][j-1] + 1 if a[i-1] == b[j-1] else max(dp[i-1][j], dp[i][j-1])
    return dp[-1][-1]

# Top-down with memo (often easier to write first)
@lru_cache(None)
def ways(n):                          # climbing stairs
    return 1 if n <= 1 else ways(n - 1) + ways(n - 2)
```

**DP families:** 1D (house robber, climbing stairs), knapsack 0/1 (partition equal subset), unbounded knapsack (coin change), LCS/edit distance (two strings), LIS (O(n log n) with `bisect`), grid paths, interval DP (burst balloons), DP on trees.

### 16. Greedy
**Signal:** a locally best choice is provably globally best (often after sorting). Jump game, gas station, intervals scheduling (sort by end time). If you can't argue why greedy is correct, it's probably DP.

```python
def max_subarray(nums):               # Kadane's
    best = cur = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x); best = max(best, cur)
    return best
```

### 17. Trie
**Signal:** prefix search, autocomplete, word dictionary, word search II.

```python
class Trie:
    def __init__(self): self.root = {}
    def insert(self, w):
        node = self.root
        for ch in w: node = node.setdefault(ch, {})
        node['$'] = True
    def starts_with(self, p):
        node = self.root
        for ch in p:
            if ch not in node: return False
            node = node[ch]
        return True
```

### 18. Bit manipulation

- `x & (x - 1)` clears the lowest set bit, so `x & (x-1) == 0` means a power of two.
- `x ^ x = 0`, `x ^ 0 = x`: the single number among pairs = XOR of everything.
- `x & -x` isolates the lowest set bit.
- Count bits: `bin(x).count('1')`, or loop `x &= x - 1`.
- Subsets with a bitmask: `for mask in range(1 << n)`.

### 19. Design-style data structures (common in interviews)
**LRU cache** (LeetCode 146) is asked constantly. Know both versions:

```python
from collections import OrderedDict
class LRUCache:
    def __init__(self, cap): self.cap = cap; self.d = OrderedDict()
    def get(self, k):
        if k not in self.d: return -1
        self.d.move_to_end(k); return self.d[k]
    def put(self, k, v):
        if k in self.d: self.d.move_to_end(k)
        self.d[k] = v
        if len(self.d) > self.cap: self.d.popitem(last=False)   # evict the least recently used
```

Interviewers often say "don't use OrderedDict". Then build it with **hash map + doubly linked list** (map: key → node; the list keeps recency order; move a node to the head on access; evict from the tail). Practise this version in C++ and Python.

---

## Part 4: Sorting, which you must know cold

| Algorithm | Time (avg / worst) | Space | Stable | Notes |
|---|---|---|---|---|
| Merge sort | n log n / n log n | O(n) | yes | Divide and conquer. Used for linked lists and external sorting |
| Quick sort | n log n / n² | O(log n) | no | A random pivot avoids the worst case. Fastest in practice (cache friendly) |
| Heap sort | n log n / n log n | O(1) | no | In place |
| Counting / radix | O(n + k) | O(k) | yes | Integers in a small range |
| Insertion sort | n² | O(1) | yes | Fast for tiny or nearly-sorted arrays |
| Timsort (Python, Java objects) | n log n | O(n) | yes | Merge + insertion hybrid; exploits existing runs |

**The simple O(n²) sorts: bubble sort, selection sort, insertion sort (asked in service companies and as warm-ups):**

```python
def bubble_sort(a):               # repeatedly swap adjacent out-of-order pairs; the largest "bubbles" to the end
    n = len(a)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if a[j] > a[j + 1]: a[j], a[j + 1] = a[j + 1], a[j]; swapped = True
        if not swapped: break     # already sorted → O(n) best case
    return a

def selection_sort(a):            # find the minimum of the unsorted part, put it at the front. Always O(n²); few swaps
    for i in range(len(a)):
        m = min(range(i, len(a)), key=a.__getitem__)
        a[i], a[m] = a[m], a[i]
    return a

def insertion_sort(a):            # like sorting playing cards in your hand. O(n) when nearly sorted; stable
    for i in range(1, len(a)):
        key, j = a[i], i - 1
        while j >= 0 and a[j] > key: a[j + 1] = a[j]; j -= 1
        a[j + 1] = key
    return a
```

| Sort | Best | Average | Worst | Space | Stable |
|---|---|---|---|---|---|
| Bubble | O(n) | O(n²) | O(n²) | O(1) | yes |
| Selection | O(n²) | O(n²) | O(n²) | O(1) | no |
| Insertion | O(n) | O(n²) | O(n²) | O(1) | yes |
| Merge | O(n log n) | O(n log n) | O(n log n) | O(n) | yes |
| Quick | O(n log n) | O(n log n) | O(n²) | O(log n) | no |
| Heap | O(n log n) | O(n log n) | O(n log n) | O(1) | no |

**Stable** = equal elements keep their original order (matters when sorting by one key after another).

**Write merge sort and quick sort from memory.** It's asked.

```python
def merge_sort(a):
    if len(a) <= 1: return a
    m = len(a) // 2; L, R = merge_sort(a[:m]), merge_sort(a[m:])
    res = []; i = j = 0
    while i < len(L) and j < len(R):
        if L[i] <= R[j]: res.append(L[i]); i += 1
        else: res.append(R[j]); j += 1
    return res + L[i:] + R[j:]

import random
def quick_sort(a, lo=0, hi=None):
    if hi is None: hi = len(a) - 1
    if lo >= hi: return
    p = random.randint(lo, hi); a[p], a[hi] = a[hi], a[p]
    pivot, i = a[hi], lo
    for j in range(lo, hi):
        if a[j] < pivot: a[i], a[j] = a[j], a[i]; i += 1
    a[i], a[hi] = a[hi], a[i]
    quick_sort(a, lo, i - 1); quick_sort(a, i + 1, hi)
```

**Quickselect** gives the k-th element in O(n) average.

**External sort** (storage-flavoured question, and you're from storage): when data is larger than RAM, sort chunks that fit in memory, write the sorted runs to disk, then do a k-way merge with a heap. That's how databases sort huge tables.

---

## Part 4.5: Advanced algorithms (for harder rounds and top product companies)

### Master theorem (complexity of divide and conquer)
For `T(n) = a·T(n/b) + O(n^d)`:

- if `d > log_b a` → O(n^d)
- if `d = log_b a` → O(n^d · log n)
- if `d < log_b a` → O(n^(log_b a))

Examples: merge sort `2T(n/2) + O(n)` → O(n log n); binary search `T(n/2) + O(1)` → O(log n); Karatsuba `3T(n/2) + O(n)` → O(n^1.58).

### 0/1 knapsack and LIS in O(n log n)
```python
def knapsack(weights, values, W):        # dp[w] = best value with capacity w; iterate w DOWN for 0/1
    dp = [0] * (W + 1)
    for wt, val in zip(weights, values):
        for w in range(W, wt - 1, -1):
            dp[w] = max(dp[w], dp[w - wt] + val)
    return dp[W]
# Unbounded knapsack (coin change style): iterate w UP so an item can be reused.

import bisect
def lis_length(nums):                    # tails[i] = smallest tail of an increasing subsequence of length i+1
    tails = []
    for x in nums:
        i = bisect.bisect_left(tails, x)
        if i == len(tails): tails.append(x)
        else: tails[i] = x
    return len(tails)
```

### Edit distance (a classic 2D DP; also used in fuzzy matching)
```python
def edit_distance(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1): dp[i][0] = i
    for j in range(n + 1): dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i-1] == b[j-1]: dp[i][j] = dp[i-1][j-1]
            else: dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])   # delete, insert, replace
    return dp[m][n]
```

### Bitmask DP (small n ≤ 20): e.g. shortest path visiting all nodes
`dp[mask][i]` = best cost having visited the set `mask`, ending at `i`. O(2ⁿ · n²).

### String matching

- **Naive:** O(n·m).
- **KMP:** O(n + m), using the LPS (longest proper prefix that's also a suffix) array to avoid re-checking characters.

```python
def kmp_search(text, pat):
    lps = [0] * len(pat); k = 0
    for i in range(1, len(pat)):
        while k and pat[i] != pat[k]: k = lps[k - 1]
        if pat[i] == pat[k]: k += 1
        lps[i] = k
    res, k = [], 0
    for i, ch in enumerate(text):
        while k and ch != pat[k]: k = lps[k - 1]
        if ch == pat[k]: k += 1
        if k == len(pat): res.append(i - k + 1); k = lps[k - 1]
    return res
```

- **Rabin-Karp:** a rolling hash of each window; compare hashes, then verify on a match. O(n + m) on average. Good for multiple patterns and for **deduplication chunking** (content-defined chunking in storage uses rolling hashes; file 11).

### Minimum spanning tree (connect all nodes at minimum total cost)
```python
def kruskal(n, edges):                    # edges: (w, u, v); sort + DSU → O(E log E)
    dsu, total = DSU(n), 0
    for w, u, v in sorted(edges):
        if dsu.union(u, v): total += w
    return total

def prim(n, adj):                         # adj[u] = [(w, v)]; heap → O((V+E) log V)
    seen, h, total = set(), [(0, 0)], 0
    while h and len(seen) < n:
        w, u = heapq.heappop(h)
        if u in seen: continue
        seen.add(u); total += w
        for wv, v in adj[u]:
            if v not in seen: heapq.heappush(h, (wv, v))
    return total
```

### More shortest-path algorithms
```python
def bellman_ford(n, edges, src):          # handles negative weights; detects negative cycles. O(V·E)
    dist = [INF] * n; dist[src] = 0
    for _ in range(n - 1):
        for u, v, w in edges:
            if dist[u] + w < dist[v]: dist[v] = dist[u] + w
    for u, v, w in edges:
        if dist[u] + w < dist[v]: raise ValueError("negative cycle")
    return dist

def floyd_warshall(n, w):                 # all pairs; w = n×n matrix with INF for no edge. O(V³)
    d = [row[:] for row in w]
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if d[i][k] + d[k][j] < d[i][j]: d[i][j] = d[i][k] + d[k][j]
    return d
```

| Algorithm | Graph | Complexity |
|---|---|---|
| BFS | unweighted | O(V+E) |
| 0-1 BFS (deque) | weights 0/1 | O(V+E) |
| Dijkstra | non-negative weights | O((V+E) log V) |
| Bellman-Ford | negative weights | O(V·E) |
| Floyd-Warshall | all pairs | O(V³) |
| A* | heuristic-guided (maps, games) | depends on the heuristic |

### Monotonic deque (sliding window maximum, LC 239)
```python
def max_sliding_window(nums, k):
    dq, res = deque(), []                 # indices; their values are decreasing
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x: dq.pop()
        dq.append(i)
        if dq[0] <= i - k: dq.popleft()   # out of the window
        if i >= k - 1: res.append(nums[dq[0]])
    return res
```

### Range query structures

- **Fenwick tree (binary indexed tree):** prefix sums with point updates, both O(log n).

```python
class Fenwick:
    def __init__(self, n): self.t = [0] * (n + 1)
    def update(self, i, delta):           # 1-indexed
        while i < len(self.t): self.t[i] += delta; i += i & -i
    def query(self, i):                   # sum of [1..i]
        s = 0
        while i > 0: s += self.t[i]; i -= i & -i
        return s
```

- **Segment tree:** range queries (sum/min/max) + updates in O(log n); supports lazy propagation for range updates.

```python
class SegTree:                            # range sum, point update
    def __init__(self, a):
        self.n = len(a); self.t = [0] * (2 * self.n)
        self.t[self.n:] = a
        for i in range(self.n - 1, 0, -1): self.t[i] = self.t[2*i] + self.t[2*i+1]
    def update(self, i, val):
        i += self.n; self.t[i] = val
        while i > 1: i //= 2; self.t[i] = self.t[2*i] + self.t[2*i+1]
    def query(self, l, r):                # sum of [l, r)
        s = 0; l += self.n; r += self.n
        while l < r:
            if l & 1: s += self.t[l]; l += 1
            if r & 1: r -= 1; s += self.t[r]
            l //= 2; r //= 2
        return s
```

- **Sparse table:** O(1) range-min queries on static arrays, after O(n log n) preprocessing.

### Maths you should know
```python
def gcd(a, b):
    while b: a, b = b, a % b
    return a
lcm = lambda a, b: a // gcd(a, b) * b

def sieve(n):                              # primes up to n: O(n log log n)
    is_p = [True] * (n + 1); is_p[0] = is_p[1] = False
    for i in range(2, int(n ** 0.5) + 1):
        if is_p[i]:
            for j in range(i * i, n + 1, i): is_p[j] = False
    return [i for i, p in enumerate(is_p) if p]

MOD = 10**9 + 7
def mod_pow(b, e, m=MOD):                  # built in as pow(b, e, m)
    r = 1; b %= m
    while e:
        if e & 1: r = r * b % m
        b = b * b % m; e >>= 1
    return r
```

Also: nCr with factorials + modular inverse (`pow(x, MOD-2, MOD)` when MOD is prime), the pigeonhole principle, and the **Boyer-Moore majority vote** (the majority element in O(1) space).

### Non-comparison sorts
```python
def counting_sort(a, max_val):             # O(n + k)
    cnt = [0] * (max_val + 1)
    for x in a: cnt[x] += 1
    return [v for v, c in enumerate(cnt) for _ in range(c)]
```

**Radix sort:** sort by each digit (least significant first) using a stable counting sort: O(d·(n + base)). **Bucket sort:** for uniformly distributed floats.
Comparison-based sorting can't beat **O(n log n)** in the worst case (the decision-tree lower bound). Counting/radix sort avoid it by not comparing.

### Randomised and streaming tricks

- **Reservoir sampling:** pick k random items from a stream of unknown length (keep item i with probability k/i).
- **Fisher–Yates shuffle:** an unbiased in-place shuffle.
- **Bloom filter / count-min sketch / HyperLogLog:** approximate membership, frequency and distinct counts in small memory (file 12).

---

## Part 4.6: The remaining classic algorithms (completing the A-to-Z)

### DSA course map (everything in this file)
```
Foundations: complexity · arrays/strings · recursion · hashing · stack/queue/deque · linked lists
Trees: terminology · traversals · BST · AVL/red-black · heaps · tries · segment/Fenwick trees · skip lists · B-trees (file 09)
Graphs: representations · BFS/DFS · cycle detection · topological sort · union-find · shortest paths (BFS, 0-1 BFS, Dijkstra,
        Bellman-Ford, Floyd-Warshall, A*) · MST (Kruskal, Prim) · SCC · bridges/articulation points · bipartite · LCA · max flow
Techniques: two pointers · sliding window · prefix sums/difference arrays · binary search (+ on answer, ternary, exponential)
            · monotonic stack/deque · greedy · divide and conquer · backtracking · DP (1D, 2D, knapsack, LIS, LCS, intervals,
            trees, bitmask) · bit manipulation · maths (gcd, sieve, modular arithmetic) · string matching (KMP, Rabin-Karp, Z)
            · randomised (reservoir sampling, shuffle) · game theory (minimax)
Sorting: bubble · selection · insertion · merge · quick · heap · counting · radix · bucket · external sort
```

### Topological sort with DFS (alternative to Kahn's)
```python
def topo_dfs(n, adj):
    seen, order = [False] * n, []
    def dfs(u):
        seen[u] = True
        for v in adj[u]:
            if not seen[v]: dfs(v)
        order.append(u)                 # add AFTER all descendants (post-order)
    for u in range(n):
        if not seen[u]: dfs(u)
    return order[::-1]                  # reverse post-order = a valid topological order (assumes a DAG)
```

### Bipartite check (2-colouring with BFS)
```python
def is_bipartite(n, adj):
    color = [-1] * n
    for s in range(n):
        if color[s] != -1: continue
        color[s] = 0; q = deque([s])
        while q:
            u = q.popleft()
            for v in adj[u]:
                if color[v] == -1: color[v] = 1 - color[u]; q.append(v)
                elif color[v] == color[u]: return False      # an edge inside one colour → odd cycle
    return True
```

### Strongly connected components (Kosaraju): groups where every node reaches every other
```python
def kosaraju(n, adj):
    order, seen = [], [False] * n
    def dfs1(u):
        seen[u] = True
        for v in adj[u]:
            if not seen[v]: dfs1(v)
        order.append(u)
    for u in range(n):
        if not seen[u]: dfs1(u)
    radj = [[] for _ in range(n)]
    for u in range(n):
        for v in adj[u]: radj[v].append(u)            # reverse every edge
    comp, c = [-1] * n, 0
    def dfs2(u):
        comp[u] = c
        for v in radj[u]:
            if comp[v] == -1: dfs2(v)
    for u in reversed(order):                          # decreasing finish time
        if comp[u] == -1: dfs2(u); c += 1
    return comp                                        # component id per node
```

Uses: deadlock detection in dependency graphs, condensing a graph into a DAG of components.

### Bridges and articulation points (Tarjan's low-link)
A **bridge** is an edge whose removal disconnects the graph; an **articulation point** is such a vertex: single points of failure in a network.

```python
def bridges(n, adj):
    tin, low, timer, res = [-1] * n, [0] * n, [0], []
    def dfs(u, parent):
        tin[u] = low[u] = timer[0]; timer[0] += 1
        for v in adj[u]:
            if v == parent: continue
            if tin[v] != -1: low[u] = min(low[u], tin[v])          # back edge
            else:
                dfs(v, u); low[u] = min(low[u], low[v])
                if low[v] > tin[u]: res.append((u, v))            # v can't reach above u without this edge
    for u in range(n):
        if tin[u] == -1: dfs(u, -1)
    return res
```

### Lowest common ancestor with binary lifting (O(log n) per query)
```python
def build_lca(n, adj, root=0):
    LOG = max(1, n.bit_length()); up = [[root] * n for _ in range(LOG)]; depth = [0] * n
    stack, seen = [root], [False] * n; seen[root] = True
    while stack:
        u = stack.pop()
        for v in adj[u]:
            if not seen[v]: seen[v] = True; depth[v] = depth[u] + 1; up[0][v] = u; stack.append(v)
    for k in range(1, LOG):
        for v in range(n): up[k][v] = up[k-1][up[k-1][v]]          # 2^k-th ancestor
    def lca(a, b):
        if depth[a] < depth[b]: a, b = b, a
        diff = depth[a] - depth[b]
        for k in range(LOG):
            if diff >> k & 1: a = up[k][a]
        if a == b: return a
        for k in reversed(range(LOG)):
            if up[k][a] != up[k][b]: a, b = up[k][a], up[k][b]
        return up[0][a]
    return lca
```

### Maximum flow (Edmonds-Karp: BFS augmenting paths)
**Plain words:** how much "water" can flow from a source to a sink through pipes with capacities? Also solves bipartite matching (assign workers to jobs) and min-cut problems.

```python
def max_flow(n, cap, s, t):                     # cap: n×n capacity matrix
    flow, parent = 0, [-1] * n
    def bfs():
        parent[:] = [-1] * n; parent[s] = s; q = deque([s])
        while q:
            u = q.popleft()
            for v in range(n):
                if parent[v] == -1 and cap[u][v] > 0: parent[v] = u; q.append(v)
        return parent[t] != -1
    while bfs():
        f, v = INF, t
        while v != s: f = min(f, cap[parent[v]][v]); v = parent[v]          # bottleneck
        v = t
        while v != s: u = parent[v]; cap[u][v] -= f; cap[v][u] += f; v = u   # update residual graph
        flow += f
    return flow
```

### A* search (shortest path guided by a heuristic)
Dijkstra ordered by `g(n) + h(n)`, where `g` is the cost so far and `h` an **admissible** estimate of the remaining cost (never overestimates, e.g. straight-line/Manhattan distance). It explores far fewer nodes on maps and grids.

### More searching techniques

- **Ternary search:** find the max/min of a **unimodal** function by discarding a third of the range each step.
- **Exponential search:** for unbounded/huge sorted data: check indexes 1, 2, 4, 8… until you overshoot, then binary search in that range.
- **Interpolation search:** guess the position from the value (fast on uniformly distributed data).

### More string algorithms

- **Z-algorithm:** `z[i]` = the length of the longest substring starting at i that matches a prefix of the string. Pattern search via `pattern + "$" + text`. O(n).
- **Manacher's algorithm:** the longest palindromic substring in O(n) (vs the O(n²) expand-around-centre approach).
- **Suffix arrays / suffix trees / suffix automata:** advanced substring queries (rare outside competitive programming).

```python
def z_function(s):
    n = len(s); z = [0] * n; l = r = 0
    for i in range(1, n):
        if i < r: z[i] = min(r - i, z[i - l])
        while i + z[i] < n and s[z[i]] == s[i + z[i]]: z[i] += 1
        if i + z[i] > r: l, r = i, i + z[i]
    return z
```

### More DP families with examples
```python
# Interval DP: minimum cost to multiply a chain of matrices (dims p[0..n])
def matrix_chain(p):
    n = len(p) - 1; dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = min(dp[i][k] + dp[k+1][j] + p[i] * p[k+1] * p[j+1] for k in range(i, j))
    return dp[0][n-1]

# DP on trees: max sum of non-adjacent nodes (House Robber III)
def rob_tree(root):
    def go(node):                       # returns (best if we take node, best if we skip it)
        if not node: return (0, 0)
        l, r = go(node.left), go(node.right)
        return (node.val + l[1] + r[1], max(l) + max(r))
    return max(go(root))

# Digit DP / bitmask DP / DP with a deque or convex hull optimisation: advanced variants built on the same recipe
```

### Game theory basics: minimax
Two players alternate; one maximises the score and the other minimises it. Recursively evaluate moves; **alpha-beta pruning** skips branches that can't affect the result. Simple impartial games: positions are "winning" if some move leads to a "losing" position for the opponent (Nim uses XOR of pile sizes: the XOR being non-zero means a win for the first player).

### Square-root decomposition
Split an array into blocks of size √n and precompute per-block answers: range queries/updates in O(√n). A simpler alternative to segment trees when updates are tricky.

## Part 5: The problem list (≈150, mapped to days)

Do them **on LeetCode in this order**. ⭐ means a must-do (very frequently asked). Aim: Days 1–18 cover all ⭐ plus as many others as you can.

**Day 1 · Arrays & Hashing:** ⭐1 Two Sum · ⭐217 Contains Duplicate · ⭐242 Valid Anagram · ⭐49 Group Anagrams · ⭐347 Top K Frequent Elements · ⭐238 Product of Array Except Self · ⭐128 Longest Consecutive Sequence · ⭐560 Subarray Sum Equals K · 36 Valid Sudoku · 380 Insert Delete GetRandom O(1)

**Day 2 · Two Pointers & Sliding Window:** ⭐125 Valid Palindrome · ⭐167 Two Sum II · ⭐15 3Sum · ⭐11 Container With Most Water · 42 Trapping Rain Water · 283 Move Zeroes · 75 Sort Colors · ⭐121 Best Time to Buy and Sell Stock · ⭐3 Longest Substring Without Repeating Characters · ⭐424 Longest Repeating Character Replacement · 567 Permutation in String · ⭐76 Minimum Window Substring · 239 Sliding Window Maximum · 209 Minimum Size Subarray Sum

**Day 3 · Stack:** ⭐20 Valid Parentheses · ⭐155 Min Stack · 150 Evaluate Reverse Polish Notation · 22 Generate Parentheses · ⭐739 Daily Temperatures · 853 Car Fleet · 84 Largest Rectangle in Histogram · 496 Next Greater Element I · 71 Simplify Path

**Day 4 · Binary Search:** ⭐704 Binary Search · 74 Search a 2D Matrix · ⭐875 Koko Eating Bananas · ⭐153 Find Minimum in Rotated Sorted Array · ⭐33 Search in Rotated Sorted Array · 34 Find First and Last Position · 981 Time Based Key-Value Store · 1011 Capacity To Ship Packages Within D Days · 4 Median of Two Sorted Arrays (hard, optional)

**Day 5 · Linked List:** ⭐206 Reverse Linked List · ⭐21 Merge Two Sorted Lists · ⭐141 Linked List Cycle · 142 Linked List Cycle II · ⭐143 Reorder List · ⭐19 Remove Nth Node From End · 138 Copy List with Random Pointer · 2 Add Two Numbers · 287 Find the Duplicate Number · ⭐146 LRU Cache · ⭐23 Merge k Sorted Lists · 25 Reverse Nodes in k-Group · 160 Intersection of Two Linked Lists

**Day 6 · Trees I:** ⭐226 Invert Binary Tree · ⭐104 Maximum Depth · ⭐543 Diameter · 110 Balanced Binary Tree · 100 Same Tree · 572 Subtree of Another Tree · ⭐235 LCA of a BST · ⭐236 LCA of a Binary Tree · ⭐102 Level Order Traversal · ⭐199 Right Side View

**Day 7 · Trees II & Heaps:** 1448 Count Good Nodes · ⭐98 Validate BST · ⭐230 Kth Smallest in a BST · ⭐105 Construct Tree from Preorder and Inorder · 124 Max Path Sum · ⭐297 Serialize and Deserialize · 703 Kth Largest in a Stream · 1046 Last Stone Weight

**Day 8 · Heaps & Intervals:** ⭐973 K Closest Points · ⭐215 Kth Largest Element · ⭐621 Task Scheduler · ⭐295 Find Median from Data Stream · 355 Design Twitter · ⭐56 Merge Intervals · ⭐57 Insert Interval · 435 Non-overlapping Intervals · 1094 Car Pooling · 986 Interval List Intersections

**Day 9 · Graphs I:** ⭐200 Number of Islands · ⭐133 Clone Graph · 695 Max Area of Island · 417 Pacific Atlantic Water Flow · 130 Surrounded Regions · ⭐994 Rotting Oranges · 547 Number of Provinces · 733 Flood Fill · 1091 Shortest Path in Binary Matrix

**Day 10 · Graphs II:** ⭐207 Course Schedule · ⭐210 Course Schedule II · ⭐684 Redundant Connection · 127 Word Ladder · 990 Satisfiability of Equality Equations · 721 Accounts Merge · 785 Is Graph Bipartite?

**Day 11 · Backtracking:** ⭐78 Subsets · ⭐39 Combination Sum · ⭐46 Permutations · 90 Subsets II · 40 Combination Sum II · ⭐79 Word Search · 131 Palindrome Partitioning · ⭐17 Letter Combinations of a Phone Number · 51 N-Queens

**Day 12 · DP 1D:** ⭐70 Climbing Stairs · 746 Min Cost Climbing Stairs · ⭐198 House Robber · 213 House Robber II · ⭐5 Longest Palindromic Substring · 647 Palindromic Substrings · ⭐91 Decode Ways · ⭐322 Coin Change · 152 Maximum Product Subarray · ⭐139 Word Break · ⭐300 Longest Increasing Subsequence · 416 Partition Equal Subset Sum

**Day 13 · DP 2D:** ⭐62 Unique Paths · ⭐1143 Longest Common Subsequence · 309 Best Time with Cooldown · 518 Coin Change II · 494 Target Sum · ⭐72 Edit Distance · 97 Interleaving String · 64 Minimum Path Sum · 221 Maximal Square

**Day 14 · Greedy:** ⭐53 Maximum Subarray · ⭐55 Jump Game · 45 Jump Game II · ⭐134 Gas Station · 846 Hand of Straights · ⭐763 Partition Labels · 678 Valid Parenthesis String · 435 (revisit)

**Day 15 · Tries & Strings:** ⭐208 Implement Trie · 211 Design Add and Search Words · 212 Word Search II · 14 Longest Common Prefix · 49 (revisit) · 438 Find All Anagrams in a String · 151 Reverse Words in a String · 8 String to Integer (atoi)

**Day 16 · Shortest Path & Bits:** ⭐743 Network Delay Time · ⭐787 Cheapest Flights Within K Stops · 1584 Min Cost to Connect All Points (MST) · 1631 Path With Minimum Effort · ⭐136 Single Number · 191 Number of 1 Bits · 338 Counting Bits · 268 Missing Number · 190 Reverse Bits · 371 Sum of Two Integers

**Day 17 · Matrix & Design (timed, 25 min each):** ⭐48 Rotate Image · ⭐54 Spiral Matrix · 73 Set Matrix Zeroes · 705 Design HashSet · 706 Design HashMap · 460 LFU Cache · 362 Design Hit Counter (if accessible, else 933 Number of Recent Calls)

**Day 18 · Mixed (timed):** pick 6 ⭐ problems you found hardest and redo them without notes.

**Day 19:** a timed online assessment: 3 unseen mediums in 90 minutes (use LeetCode's "random" on Medium + a tag you're weak in).

**Day 20:** re-solve the 10 problems you marked as failed.

**Company practice:** before an interview, look up that company's tagged questions (LeetCode company tags or LeetCode Discuss interview experiences) for the last 6 months.

---

## Part 6: Interview traps

- **Integer overflow:** not an issue in Python, but in C++ use `long long` and `mid = lo + (hi - lo) / 2`.
- **Mutating input:** ask before modifying the input array or grid.
- **Edge cases checklist:** empty input, one element, all duplicates, negatives, zero, very large n, already sorted, cycles in graphs, disconnected graphs.
- **Recursion depth** in Python (~1000): go iterative for deep trees or graphs.
- **Hash map worst case** is O(n) because of collisions. Mention it if asked about guarantees.
- **Don't go silent.** Narrate: "I'm thinking of a sliding window because we need the longest contiguous substring…"
- **Complexity of string building:** `s += ch` in a loop can be O(n²). Use a list and `''.join`.
- **Sorting cost:** if you sort, your solution is at least O(n log n). Say it.

## Quick revision

- Read the constraints to get the target complexity. Name the pattern before coding.
- Templates to know by heart: sliding window, binary search on the answer, BFS (level-by-level), DFS with a global, topo sort (Kahn), DSU, Dijkstra, backtracking, DP recipe, monotonic stack, two heaps, LRU (hash map + doubly linked list).
- Talk → brute force → optimise → code → dry run → complexity.

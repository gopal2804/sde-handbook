# SDE Handbook

A complete, beginner-to-advanced study plan for **SDE 2, Backend, DevOps and AI engineering** roles. It covers data structures and algorithms, C/C++, Python, Scala and the JVM, OOP and design patterns, operating systems, networks, databases, storage, distributed systems, Kafka/RabbitMQ, system design, backend and microservices, Docker/Kubernetes, CI/CD, observability, security, LLMs, RAG, agents and more. Every topic starts in plain words, then goes deep, with diagrams, code and practice questions.

**Read it online:** https://gopal2804.github.io/sde-handbook/

## What's inside

| Section | Pages |
|---|---|
| **Start** | Home dashboard · 20-Day Plan |
| **Foundations** | Data Structures & Algorithms · C and C++ · Python · Scala, JVM & Spring Boot · OOP, Design Patterns & LLD |
| **Systems** | Operating Systems, Linux & Bash · Multithreading & Concurrency · Computer Networks |
| **Data & Storage** | SQL, MySQL, MongoDB & Redis · Elasticsearch, DuckDB, Arrow & Parquet · Storage Systems, S3 & ECS · Distributed Systems · Kafka & RabbitMQ |
| **Design & Backend** | System Design (HLD) · Backend, REST, Microservices & FastAPI |
| **DevOps** | Docker & Kubernetes · CI/CD, Git, Jenkins & Maven · Observability · Security & DevSecOps |
| **AI Engineering** | LLMs, Prompting & OpenAI API · RAG, Agents, Evals & Guardrails · AI Coding Tools · Chrome Extensions |
| **Process & Practice** | Agile, Scrum & SDLC · Practice Questions & Mocks |

### How every skill page is written

- **Plain words first:** what the technology is, why it exists, and an everyday analogy, before any jargon.
- **Architecture diagrams** (text diagrams that work on any screen), for example how a C program becomes a process, how CPython and the JVM run code, Kafka internals, system designs.
- **A course map**, then the topic from basics to advanced: theory, code examples and common interview traps.
- **Terminal walkthroughs** you can run yourself. For example, the C page builds `hello.c` one stage at a time (`gcc -E` → `.i`, `gcc -S` → `.s`, `gcc -c` → `.o`, link, run) and shows what to look for in each file with `nm`, `objdump`, `ldd` and `size`. The Python page does the same for bytecode (`__pycache__`, `dis`, `py_compile`) and the JVM page for `javac`, `javap`, JIT/GC logs and `.jar` packaging.
- **Interview questions** at the end of each page.

### The 20-day plan and practice

- `plan.md`: a day-by-day timeline with a fixed daily routine, how product-company interviews work, a study method, the DSA "25-minute rule", and full mock days (Day 7, 14 and 19).
- `28_Practice_Questions.md`: about 650 questions and 11 mock interviews across all topics.

## Progress tracking

Built into the site (`docs/assets/progress.js`), no account needed:

- **Read** tick on every section heading, and **Mark skill as done** on every skill page.
- Tick boxes for each day of the 20-day plan.
- **Home dashboard:** overall progress ring, progress per category, a card per skill, and stats (skills done, in progress, sections read, plan days done).
- **Sidebar badges:** ✓ or % next to each skill in the navigation.
- **Continue** button: opens the last skill you were reading, **at the first section you haven't read yet**.
- **Export / Import** progress as a JSON file, and **Reset** (with a confirm step).

Without signing in, progress is saved only in that browser (`localStorage` key `sdeh-progress-v1`). Other visitors can't see or change it.

## Sign in and sync across devices

**Sign in** (top right) uses your Google account, so the same progress shows on your laptop and your phone.

- **How it works:** Firebase Authentication (Google sign-in) and Cloud Firestore, loaded from `docs/assets/cloud-sync.js`. Each user's progress is one document at `users/{uid}/sites/sde-handbook`.
- **Live sync:** a tick on one device appears on the other within a second or two, without refreshing.
- **Merging:** every tick, untick, "skill done", plan day and "last read" carries its own timestamp. When two devices meet, they're merged item by item and the newest change wins for each item. Ticks from both devices are combined, and an untick or a reset also reaches the other device. Progress saved before you first signed in is kept and uploaded.
- **Status:** the account button shows a dot: green = synced, yellow = syncing, red = offline or error. Its menu shows the account and a **Sign out** button. Signing out keeps the progress on that device.
- **Privacy:** `firestore.rules` lets each signed-in person read and write **only their own** progress, and only in the expected format and size.
- **Safe to publish:** `docs/assets/firebase-config.js` holds the Firebase web settings. They identify the project and are public by design; the rules protect the data. Set `apiKey` to `""` to turn sign-in off; the site then works browser-only as before.
- **If Firebase can't load** (blocked or offline), the sign-in button simply doesn't appear and nothing else changes.

### Firebase setup (only needed when recreating the project)

1. **Create a Firebase project:** at console.firebase.google.com (Google Analytics off).
2. **Turn on Google sign-in:** Authentication → Sign-in method → **Google** → enable.
3. **Allow the website:** Authentication → Settings → Authorized domains → add `gopal2804.github.io` (`localhost` is allowed by default).
4. **Create the database:** Firestore Database → create in **production mode** (location `asia-south1`). Then paste `firestore.rules` into the **Rules** tab and **Publish**. Replace `OWNER_UID` with your account ID first (the Private notes page shows it once you sign in).
5. **Register a web app:** Project settings → Your apps → **Web** → register. Copy `apiKey`, `authDomain`, `projectId` and `appId` into `docs/assets/firebase-config.js`.

## Private notes (owner only)

Personal notes never go into this repository or the published site. They live in Firestore and appear only for the site owner, after signing in.

- **Where:** the **Private notes** page (`/private/`, from `docs/private.md`). It isn't in the menu or the site search; the owner opens it from the account menu (**🔒 My private notes**).
- **Who can see them:** only the account whose ID is set as `OWNER_UID` in `firestore.rules`. The site's code never contains the notes or the owner's identity. For anyone else the database refuses to send them, and the page just says it's private.
- **What the owner can do:** upload `.md` files (several at once; same file name = replace), read them rendered from Markdown with a contents list, **Edit** in the browser, **Download** one or all as `.md` (backups), and **Delete**. Rendering uses `marked`, and the HTML is cleaned with `DOMPurify` before display.
- **Links:** links between notes (`25_My_Dell_Experience.md`) and to public pages (`01_DSA.md`) work inside a note. In public pages, `hooks.py` turns links to the personal notes into links to the Private notes page.
- **Local files:** the original personal files (`docs/25_*`, `26_*`, `27_*`) are still listed in `.gitignore` and `exclude_docs`, so a local copy can never be pushed or published by accident.

## Design

A custom theme (`docs/assets/extra.css`) on top of Material for MkDocs:

- **Colours:** warm paper and ink colours with a burnt-orange accent.
- **Fonts:** Plus Jakarta Sans for text, JetBrains Mono for code.
- **Dark mode:** light and dark modes with a toggle.
- **Phone layouts:** the header, dashboard and account menu are laid out for phone screens.

## Run it locally

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
mkdocs serve                 # open http://127.0.0.1:8000 (reloads as you edit)
mkdocs build --strict        # the check CI runs: fails on broken links or warnings
```

Sign-in also works on `localhost`, because Firebase allows it by default.

## Structure

```
docs/                      all pages (Markdown)
  index.md                 home dashboard
  plan.md                  the 20-day plan
  01_DSA.md … 28_*.md      one page per skill
  assets/extra.css         theme
  assets/progress.js       progress tracker, dashboard, export/import, merge logic
  assets/cloud-sync.js     Google sign-in + Firestore sync (ES module)
  assets/firebase-config.js  public Firebase web settings
  assets/private-notes.js  owner-only Private notes page (Firestore + Markdown rendering)
  private.md               the Private notes page shell (no content)
mkdocs.yml                 site settings, navigation, scripts, excluded pages
hooks.py                   build hook: points links to personal notes at the Private notes page
firestore.rules            Firestore security rules (paste into the Firebase console)
requirements.txt           MkDocs, Material, list extension
.github/workflows/deploy.yml  builds and publishes to GitHub Pages on every push to main
```

## Tech stack

- **Site:** MkDocs 1.6 + Material for MkDocs 9, with Python-Markdown extensions (admonitions, details, tabs, task lists, code highlighting, `mdx_truly_sane_lists`, `nl2br`).
- **Hosting:** GitHub Pages, deployed by GitHub Actions.
- **Progress and sync:** plain JavaScript (no framework), Firebase Authentication and Cloud Firestore (Firebase JS SDK 10).

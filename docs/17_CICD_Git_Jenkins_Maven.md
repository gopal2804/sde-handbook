# 17 · CI/CD, Git, GitHub, GitLab, Jenkins, GitHub Actions, Maven

**Why CI/CD exists:** integrating code rarely leads to "merge hell" and late surprises, and manual releases are slow and error-prone. **Continuous Integration:** every change is merged often and automatically built and tested. **Continuous Delivery:** every passing change is *releasable* (deploy is a button). **Continuous Deployment:** every passing change deploys automatically. The result: small, frequent, low-risk releases.

**Your experience:**

- **OneFS:** Jenkins, BuildWeb/Nexus artifacts, test tiers (BVT/MVT/FVT), Ducttape cluster provisioning, Test Manager/qTest.
- **Telemetry platform:** a GitLab CI pipeline with about 12 stages including security scans, weekly production deployments.
- **Your extension:** GitHub Actions CI (tests + evals on Python 3.10 and 3.12) → Render auto-deploys from `main` after CI passes; tagged releases attach the extension zip.

---

# Start here: each tool in plain words, with its architecture

### Git: a time machine for code
**What:** a **version control system**: it records snapshots of your project over time, so you can see who changed what and why, go back to any version, and work on several things in parallel (**branches**) without breaking the main code.
**Analogy:** **save points in a video game**, plus parallel universes (branches) you can later merge back into one.

```
 Working directory ──git add──► Staging area ──git commit──► Local repository ──git push──► Remote (GitHub/GitLab)
   (files you edit)              (what goes in               (history of snapshots)  ◄──git pull/fetch──
                                  the next snapshot)

 main:     A ── B ── C ──────── F (merge)
                      \        /
 feature:              D ── E          (D, E built in parallel, then merged)
```

**Distributed:** every developer has the full history locally (work offline, fast). A shared remote is just another copy everyone agrees to sync with.

### GitHub and GitLab: Git hosting + collaboration
**What:** websites/servers that host Git repositories and add the **team features** around them: **pull/merge requests** (propose changes and get reviews), issues, permissions, CI/CD pipelines, package registries, security scanning.

```
 Developer ──push branch──► GitHub/GitLab ──► Pull/Merge Request ──► code review + automated checks (CI)
                                                         │ approved + green
                                                         ▼
                                                   merge into main ──► CD deploys
```

GitHub = the largest community + GitHub Actions + Copilot. GitLab = an all-in-one DevOps platform, often **self-hosted** inside companies (like your telemetry team's).

### CI/CD: an automated assembly line for software
**What:** **CI (continuous integration)** = every code change is automatically built and tested soon after it's pushed. **CD (continuous delivery/deployment)** = every change that passes is automatically packaged and released to environments (dev → test → prod).
**Analogy:** a **car factory assembly line with quality checks at each station**. A car (code change) moves from station to station (build → test → scan → package → deploy); if any check fails, the line stops before a faulty car reaches a customer.

```
 git push ─► [Build] ─► [Unit tests] ─► [Lint/SAST/SCA scans] ─► [Package image] ─► [Deploy to dev/int]
                 │ fail? stop + notify                                                   │
                 ▼                                                                       ▼
            developer fixes                               [Integration tests] ─► [Approval] ─► [Deploy prod (canary)] ─► [Monitor]
```

### Jenkins: a self-hosted automation server
**What:** an open-source server that runs your pipelines. You describe the pipeline in a **Jenkinsfile** in your repo; Jenkins runs its stages on **agents** (worker machines).

```
 GitHub/GitLab ──webhook "new push"──► JENKINS CONTROLLER (UI, scheduling, plugins, credentials, job history)
                                            │ assigns work by label
                     ┌──────────────────────┼──────────────────────┐
                     ▼                      ▼                      ▼
              Agent: linux-docker     Agent: freebsd-build     Agent: k8s pod (ephemeral)
              runs stages, reports logs/artifacts/test results back to the controller
```

### GitHub Actions: CI/CD built into GitHub
**What:** pipelines written as YAML in `.github/workflows/`, triggered by **events** (push, pull request, schedule, tag), run on **runners** (GitHub-hosted VMs or your own machines).

```
 EVENT (push / PR / tag / cron) ──► WORKFLOW (.github/workflows/ci.yml)
                                         ├── JOB "test"   ──► runner VM ──► steps: checkout → setup-python → pytest
                                         ├── JOB "build"  ──► runner VM ──► steps: npm ci → npm run build   (jobs run in parallel)
                                         └── JOB "deploy" (needs: test, build) ──► only on main ──► deploy
 Marketplace "actions" are reusable steps (actions/checkout, setup-node …); secrets are injected safely.
```

### GitLab CI: pipelines inside GitLab
```
 GitLab server (.gitlab-ci.yml in the repo) ──► pipeline: stages build → test → scan → deploy
        │ jobs are queued
        ▼
 GitLab Runners (shared or your own; Docker / Kubernetes executors) pick up jobs and run them
```

### Maven: the Java/Scala build tool
**What:** a tool that **builds Java projects in a standard way and downloads the libraries they need**. You declare *what* you need in `pom.xml` (dependencies, plugins); Maven figures out the rest.
**Analogy:** a **recipe card + grocery delivery**. The recipe (`pom.xml`) lists the ingredients (libraries with versions); Maven fetches them from the store (Maven Central / Nexus), including the ingredients your ingredients need (**transitive dependencies**), then follows standard cooking steps (the **lifecycle**: compile → test → package).

```
 pom.xml ──► Maven ──► local cache ~/.m2 ──miss──► Nexus/Artifactory (company proxy) ──► Maven Central
              │
              ▼ lifecycle phases (each runs all the phases before it)
   validate → compile → test → package (JAR/WAR) → verify → install (~/.m2) → deploy (Nexus)
```

## Course map (everything in this file)
```
Git: concepts (repo, commit, branch, HEAD, staging) · setup & config · daily commands · .gitignore · branching & merging · rebase
  · conflicts · history (log, blame, bisect, reflog) · undoing (restore, reset, revert) · stash · tags & versioning · remotes
  · hooks · internals (objects, refs) · workflows (GitFlow, trunk-based) · large files (LFS) · submodules/worktrees
GitHub & GitLab: hosting · PRs/MRs & code review · branch protection · CODEOWNERS · issues & projects · permissions · packages
  & registries · security features (secret scanning, Dependabot/Renovate)
CI/CD: concepts (CI, continuous delivery, continuous deployment) · pipeline stages · quality & security gates · artifacts
  · environments & promotion · deployment strategies · rollback · secrets · flaky tests · DORA metrics
Jenkins: architecture (controller/agents) · jobs (freestyle, pipeline, multibranch) · Jenkinsfile (declarative/scripted) · triggers
  · credentials · plugins · shared libraries · agents in Docker/Kubernetes
GitHub Actions: workflows · events · jobs · steps · runners · actions & marketplace · matrix · secrets & OIDC · caching
  · artifacts · environments · reusable workflows · security
GitLab CI: .gitlab-ci.yml · stages · jobs · runners & executors · rules · needs (DAG) · artifacts/caches · environments
  · includes/templates · protected variables
Maven: concepts (POM, GAV, conventions) · lifecycle & phases · dependencies & scopes · transitive resolution · BOMs
  · plugins · profiles · multi-module · repositories (Central, Nexus) · settings.xml · releases
IaC: Terraform basics
```

# Part A: Git

## 1. Why Git
Linus Torvalds built Git (2005) for Linux kernel development: **distributed** (everyone has the full history), fast branching and merging, and integrity (everything is content-addressed by hash).

## 1b. Git basics (day-one commands)
```bash
git config --global user.name "Gopal Gupta"; git config --global user.email "<you>"
git init                                  # new repo   |   git clone <url>   (copy an existing one)
git status                                # what's changed / staged
git add file.py; git add .                # stage
git commit -m "Fix cron overlap in DL tests"
git log --oneline -10; git show <sha>
git remote add origin <url>; git remote -v
git push -u origin main                   # first push sets the upstream
git pull                                  # fetch + merge (or --rebase)
git branch; git branch feature/x; git switch feature/x    # (older: git checkout -b feature/x)
git branch -d feature/x; git push origin --delete feature/x
git diff; git diff --staged; git diff main..feature/x
git restore file.py                       # discard working changes  |  git restore --staged file.py (unstage)
git rm --cached secrets.env               # stop tracking a file (then add it to .gitignore)
```

**`.gitignore`:**

```
.env
*.log
__pycache__/
node_modules/
dist/
.venv/
target/
```

**Good commit messages:** an imperative summary ≤ 72 chars ("Add retry with backoff to Kafka consumer"), a blank line, then *why* the change was needed. One logical change per commit.

**Resolving a merge conflict (example):**

```
<<<<<<< HEAD
LIMIT_MATCH_PER_DAY = 150
=======
LIMIT_MATCH_PER_DAY = 100
>>>>>>> feature/limits
```

Decide on the correct final content (talk to the other author if needed), remove the markers, `git add file`, then `git commit` (merge) or `git rebase --continue`. Tools: `git mergetool`, IDE merge editors.

**Tags and versioning:** `git tag -a v0.6.1 -m "Report-it button"` then `git push origin v0.6.1`. **Semantic versioning** MAJOR.MINOR.PATCH: breaking change → MAJOR, new backward-compatible feature → MINOR, bug fix → PATCH. *(Your extension went 0.5.1 → 0.5.2 (fixes) → 0.6.0 (matching rework) → 0.6.1.)*

**Other useful features:** `git stash push -m "wip"`, `git log -p -- path` (history of a file), `git log -S "text"` (find when a string appeared/disappeared), `git shortlog -sn`, `git worktree` (several branches checked out at once), `git submodule` (repos inside repos), **hooks** (`.git/hooks/pre-commit`; or the `pre-commit` framework running linters, formatters and secret scanners before every commit), `git lfs` (large files), signed commits (`git commit -S`).

**Interactive rebase concepts** (cleaning history before a PR): squash commits together, reword messages, drop or reorder commits. Then `git push --force-with-lease` (safer than `--force`: refuses if someone else pushed meanwhile).

## 2. Internals (impresses interviewers)

- Git is a **content-addressable object store**. Objects (named by hash; SHA-1 historically, SHA-256 supported):
  - **blob:** file contents
  - **tree:** a directory (names → blobs/trees)
  - **commit:** a tree + parent commit(s) + author + message
  - **tag:** an annotated pointer
- **Branches** are just movable **pointers to commits** (a file containing a hash), which is why branching is instant. **HEAD** points to the current branch.
- Three areas: **working directory → staging area (index) → repository (commits)**.

## 3. Commands you must know
```bash
git status / log --oneline --graph / diff / diff --staged
git add -p                      # stage hunks interactively
git commit -m "msg"; git commit --amend
git switch -c feature/x; git switch main
git merge feature/x             # merge commit (or fast-forward)
git rebase main                 # replay my commits on top of main → linear history
git cherry-pick <sha>           # apply one commit elsewhere (e.g. a hotfix to a release branch)
git stash / stash pop
git reset --soft HEAD~1         # undo the commit, keep changes staged
git reset --mixed HEAD~1        # undo the commit, keep changes unstaged (default)
git reset --hard HEAD~1         # discard the commit AND the changes (dangerous)
git revert <sha>                # new commit that undoes <sha> (safe on shared branches)
git reflog                      # history of HEAD moves: recover "lost" commits
git bisect start/bad/good       # binary search for the commit that introduced a bug
git blame file                  # who last changed each line
git fetch vs git pull           # pull = fetch + merge (or rebase with --rebase)
git tag -a v1.2.0 -m "..."; git push origin v1.2.0
```

## 4. Merge vs rebase (always asked)

| Merge | Rebase |
|---|---|
| Keeps true history; adds a merge commit | Rewrites my commits on top of the target → **linear history** |
| Safe on shared branches | **Never rebase commits others have pulled** (it rewrites hashes) |
| Noisier history | Cleaner; easier `bisect` |

Squash merge: combine a PR into one commit on main.

## 5. Reset vs revert
**Reset** moves the branch pointer (rewrites history; local only). **Revert** adds an inverse commit (safe for shared history). For a bad commit already on `main`, use `git revert`.

## 6. Branching strategies

- **GitFlow:** `main`, `develop`, feature, release and hotfix branches. Suits scheduled releases and versioned products (common in enterprise storage).
- **Trunk-based development:** short-lived branches (hours to days) merged to main frequently, plus **feature flags** for unfinished work. Suits CI/CD and fast teams.
- **Release branches:** stabilise a version (`release/9.8`) while main moves on; cherry-pick fixes back. OneFS-style products maintain several release lines.

## 7. Pull requests and code review
Small focused PRs; a description of what and why; tests included; CI must pass; reviewers check correctness, readability, edge cases, security and tests; respond to feedback without ego. **CODEOWNERS** for required reviewers; **branch protection** (required checks + reviews, no force-push to main).

## 8. Merge conflicts
Git marks the conflicting sections (`<<<<<<<`, `=======`, `>>>>>>>`). Understand both changes, combine them correctly, test, then `git add` + continue. Prevent them with small PRs and frequent rebasing on main.

## 9. GitHub vs GitLab
Both host Git with PRs/MRs, issues and CI. **GitHub:** the biggest community, GitHub Actions, Copilot integration. **GitLab:** an all-in-one DevOps platform (CI/CD built in from early on, a container registry, security scanning), often self-hosted in enterprises (your telemetry team used GitLab).

---

# Part B: CI/CD pipelines

## 1. Typical pipeline stages
```
Commit/PR → Build/compile → Unit tests → Static analysis/lint → Security scans (SAST, SCA, secrets)
  → Package (JAR / Docker image) → Container scan → Push to registry
  → Deploy to dev/int → Integration/E2E tests → Deploy to UAT → Approval → Deploy to prod (canary/rolling)
  → Smoke tests / verify → Monitor → (auto-rollback on failure)
```

**Your telemetry platform's stages:** `compile-package → verify-build → blackduck-scan → checkmarx-scan → code-quality (SonarQube) → sast-scan → sca-scan → unit-test → xray-scan → build-docker → container-scan → deploy → verify-deploy`. Environments: dev → int → UAT → prod.

**Onboarding quality gates there:** Sonar coverage > 80% with the quality gate passed, Snyk/container scans with 0 critical/high, a Grafana SLA dashboard, liveness enabled, autoscaling enabled, naming conventions for Kafka topics and ES indexes, a data purge script, performance testing.

## 2. Principles

- **Fail fast:** cheap checks first (lint, unit tests), slow ones later.
- **Build once, deploy the same artifact everywhere** (promote one image digest through environments; don't rebuild per environment).
- **Everything as code:** pipelines, infrastructure (Terraform), configuration.
- **Hermetic, reproducible builds:** pinned dependency versions, lock files.
- **Secrets** come from the CI secret store or Vault, never hard-coded, and are masked in logs.
- **Fast feedback:** cache dependencies, parallelise jobs, use matrix builds.
- **Test tiers:** the OneFS **BVT** (build verification: fast, gates the build), **MVT** (merge verification: gates the merge), **FVT** (full verification: comprehensive, slow; e.g. ~2–8 hours for some lists).

## 3. Deployment strategies
Rolling, blue/green, canary, **feature flags** (decouple deploy from release; kill switches), dark launches, A/B tests. Always have **automatic rollback** on failed health checks or SLO burn.

## 4. Flaky tests (you fixed real ones; tell this)
Flaky = passes and fails without code changes. Causes: timing/races, shared state between tests, order dependence, external dependencies, **environment contention** (your **hourly cron overlapping the test window**), wrong interpreter versions (your **Python 2/3 interpreter selection bug**).
Approach: collect failures across many runs → look for patterns (time, node, environment) → reproduce in a loop → fix the root cause (not just retry) → quarantine meanwhile, so CI stays trusted.
> "Flaky CI is expensive: people start ignoring red builds, and real regressions slip through."

---

# Part C: Jenkins

**Why:** the long-standing open-source automation server (formerly Hudson, 2011), with a huge plugin ecosystem. Common in enterprises with self-hosted infrastructure (OneFS builds).

- **Controller** (schedules, UI) + **agents** (run the jobs). Label agents (e.g. FreeBSD build hosts, cluster-access agents).
- **Pipeline as code:** a `Jenkinsfile` in the repo (declarative or scripted Groovy).

```groovy
pipeline {
  agent { label 'linux' }
  options { timeout(time: 60, unit: 'MINUTES') }
  stages {
    stage('Build') { steps { sh 'make build' } }
    stage('Test')  { steps { sh 'pytest -m "bvt or mvt" --junitxml=report.xml' } }
    stage('Scan')  { parallel {
        stage('SonarQube') { steps { sh 'sonar-scanner' } }
        stage('SCA')       { steps { sh './run_blackduck.sh' } } } }
    stage('Deploy') { when { branch 'main' } steps { sh './deploy.sh int' } }
  }
  post { always { junit 'report.xml' } failure { mail to: 'team@x.com', subject: 'Build failed' } }
}
```

- Credentials plugin for secrets; multibranch pipelines (a pipeline per branch/PR); shared libraries for reuse.
- **Downsides:** plugin sprawl and security patching, controller maintenance, Groovy complexity. That's why teams move to GitHub Actions or GitLab CI.

---

# Part D: GitHub Actions

**Why:** CI/CD built into GitHub, event-driven, YAML workflows in `.github/workflows/`, a huge marketplace of reusable actions, and hosted runners (no servers to manage).

- **Concepts:** workflow → triggered by **events** (`push`, `pull_request`, `schedule`, `workflow_dispatch`, `release`, tag pushes) → **jobs** (run in parallel on **runners**, unless `needs:`) → **steps** (shell commands or `uses:` actions).
- **Matrix builds:** test across versions in parallel. **Secrets:** `${{ secrets.X }}`. **Caching:** `actions/cache` / setup-* cache options. **Artifacts:** upload/download between jobs. **Environments** with required reviewers for prod. **OIDC** to cloud providers (no long-lived keys).

**Your real CI (Smart Shopping Agent), roughly:**

```yaml
name: ci
on: [push, pull_request]
jobs:
  extension:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: extension/package-lock.json }
      - run: cd extension && npm ci && npm test && npm run build
  backend:
    runs-on: ubuntu-latest
    strategy: { matrix: { python: ["3.10", "3.12"] } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "${{ matrix.python }}" }
      - run: pip install -r backend/requirements.txt
      - run: cd backend && python -c "import app.main" && python -m evals.trust_eval --no-llm
```

A separate **release workflow** triggers on a `v*` tag and attaches the packaged extension zip to a GitHub Release. **Render** auto-deploys the backend from `main` only after CI passes.

---

# Part E: GitLab CI

`.gitlab-ci.yml` with **stages**, jobs, `rules`/`only`, `needs` (DAG), artifacts, caches, environments, manual jobs (`when: manual` for prod approval), and **runners** (shared or self-hosted, e.g. Kubernetes executors). Built-in templates for SAST, dependency scanning and container scanning.

```yaml
stages: [build, test, scan, package, deploy]
build:   { stage: build,   script: [mvn -B package -DskipTests], artifacts: { paths: [target/*.jar] } }
test:    { stage: test,    script: [mvn -B test] }
sonar:   { stage: scan,    script: [mvn sonar:sonar] }
docker:  { stage: package, script: [docker build -t $IMAGE:$CI_COMMIT_SHA ., docker push $IMAGE:$CI_COMMIT_SHA] }
deploy_prod: { stage: deploy, script: [./deploy.sh prod], when: manual, rules: [ { if: '$CI_COMMIT_BRANCH == "main"' } ] }
```

---

# Part F: Maven

**Why:** before Maven (2004), Java builds (Ant) were hand-written scripts and JARs were copied around by hand. Maven gives **convention over configuration** (a standard layout `src/main/java`, `src/test/java`), **declarative dependency management** from central repositories, and a **standard build lifecycle**.

- **POM (`pom.xml`):** groupId, artifactId, version (**GAV coordinates**), packaging, dependencies, plugins, properties.
- **Default lifecycle phases:** `validate → compile → test → package → verify → install` (to the local `~/.m2` repo) `→ deploy` (to a remote repo such as Nexus/Artifactory). Running a phase runs all earlier phases.
- **Dependency scopes:** `compile` (default), `provided` (supplied by the runtime, e.g. the servlet API), `runtime`, `test`, `system`, `import` (BOMs).
- **Transitive dependencies:** you get the dependencies of your dependencies. **Conflict resolution = "nearest wins"** (the shortest path in the tree; first declared on a tie). This is why a vulnerable library can sneak in at an old version.
- **Fixing transitive vulnerabilities (your Spring Boot story):**
  1. `mvn dependency:tree -Dincludes=com.fasterxml.jackson.core` finds who pulls it in.
  2. Upgrade the parent/BOM (Spring Boot parent) when possible: it aligns many versions together.
  3. Pin a safe version in `<dependencyManagement>` (it overrides the transitive version).
  4. `<exclusions>` for libraries you don't need.
  5. Re-run the SCA scans (BlackDuck/Snyk) + the tests; watch for breaking API changes.
- **BOM (bill of materials):** a POM that pins consistent versions for a family of libraries (`spring-boot-dependencies`).
- **Multi-module projects:** a parent POM aggregates modules.
- **Repositories:** Maven Central, plus internal **Nexus/Artifactory** proxies (OneFS used Nexus for artifacts).
- **Gradle:** a newer alternative (Groovy/Kotlin DSL, incremental builds, faster). **sbt** for Scala.
- Common commands: `mvn clean install`, `mvn -DskipTests package`, `mvn dependency:tree`, `mvn versions:display-dependency-updates`, `mvn -U` (force update snapshots).

---

# Part G: More depth for each tool

## Jenkins: beyond the basics

- **Freestyle jobs** (UI-configured, legacy) vs **Pipeline jobs** (Jenkinsfile in Git: reviewable, versioned).
- **Triggers:** SCM webhooks (GitHub/GitLab push → build), polling (`pollSCM('H/5 * * * *')`), cron (`cron('H 2 * * *')`; `H` spreads load), upstream jobs, manual parameters (`parameters { string(name: 'CLUSTER') }`).
- **Credentials:** stored in Jenkins and injected safely:

```groovy
withCredentials([usernamePassword(credentialsId: 'harbor', usernameVariable: 'U', passwordVariable: 'P')]) {
    sh 'echo "$P" | docker login harbor.example.com -u "$U" --password-stdin'
}
```

- **Shared libraries** (`@Library('ci-lib') _`): reuse pipeline steps across hundreds of repos.
- **Agents:** static (labelled machines: e.g. FreeBSD build hosts), Docker agents (`agent { docker { image 'python:3.12' } }`), Kubernetes pod agents (ephemeral, scalable).
- **Stages for quality:** `parallel`, `input` (manual approval), `when` (branch/condition), `post` (always/success/failure/cleanup), `stash`/`unstash` (pass files between agents), archiving artifacts, publishing JUnit/coverage reports.

## GitHub Actions: beyond the basics
```yaml
name: deploy
on:
  push: { branches: [main] }
  schedule: [{ cron: "0 3 * * *" }]            # nightly (UTC)
  workflow_dispatch: {}                         # manual "Run workflow" button
concurrency: { group: deploy-prod, cancel-in-progress: false }   # never two prod deploys at once
permissions: { contents: read, id-token: write } # least privilege; id-token for OIDC
jobs:
  test:
    uses: ./.github/workflows/reusable-test.yml # reusable workflow
  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production                     # protection rules: required reviewers, wait timers
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4     # OIDC: short-lived cloud credentials, no stored keys
        with: { role-to-assume: arn:aws:iam::123456789012:role/deploy, aws-region: ap-south-1 }
      - run: ./scripts/deploy.sh
```

Also: **composite actions** (bundle steps), `actions/cache` (dependency caches keyed on lock-file hashes), `upload-artifact`/`download-artifact`, `if:` conditions, `${{ github.sha }}` contexts, self-hosted runners (for private networks/hardware), secret masking. **Security:** pin third-party actions to a commit SHA, and be careful with `pull_request_target` (it runs with secrets on untrusted code).

## GitLab CI: beyond the basics
```yaml
include:
  - template: Security/SAST.gitlab-ci.yml          # built-in security scanning templates
  - project: platform/ci-templates
    file: /java.yml
variables: { MAVEN_OPTS: "-Dmaven.repo.local=.m2" }
.default_java: &java                                # YAML anchor / or `extends:`
  image: maven:3.9-eclipse-temurin-21
  cache: { key: "$CI_COMMIT_REF_SLUG", paths: [.m2/] }
unit_test:
  <<: *java
  stage: test
  script: mvn -B test
  artifacts: { reports: { junit: target/surefire-reports/*.xml } }
deploy_int:
  stage: deploy
  environment: { name: int, url: https://int.example.com }
  script: ./deploy.sh int
  rules: [{ if: '$CI_COMMIT_BRANCH == "main"' }]
```

Protected branches and protected variables (secrets only on protected refs), environments with deployment history and rollbacks, merge request pipelines, `needs` for DAG ordering, child/parent pipelines.

## Maven: a full pom.xml
```xml
<project>
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.5</version>                     <!-- upgrading this realigns many transitive versions -->
  </parent>
  <groupId>com.example</groupId>
  <artifactId>health-service</artifactId>
  <version>1.4.0-SNAPSHOT</version>              <!-- SNAPSHOT = in development; releases are immutable versions -->
  <properties><java.version>21</java.version></properties>

  <dependencyManagement>                         <!-- pin versions, including transitive ones -->
    <dependencies>
      <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>2.17.2</version>
      </dependency>
    </dependencies>
  </dependencyManagement>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
      <exclusions>                                <!-- drop an unneeded transitive library -->
        <exclusion><groupId>org.yaml</groupId><artifactId>snakeyaml</artifactId></exclusion>
      </exclusions>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin>
    </plugins>
  </build>

  <profiles>
    <profile><id>prod</id><properties><log.level>WARN</log.level></properties></profile>   <!-- mvn -Pprod package -->
  </profiles>
</project>
```

(Excluding snakeyaml is only safe if nothing needs YAML config; it illustrates the syntax. Always re-run the tests after exclusions.)
**Key plugins:** `maven-compiler-plugin` (Java version), **`maven-surefire-plugin`** (unit tests in the `test` phase), **`maven-failsafe-plugin`** (integration tests in `integration-test`/`verify`), `maven-jar-plugin`, `maven-shade-plugin` (fat/uber JAR), `jacoco-maven-plugin` (coverage → SonarQube), `spring-boot-maven-plugin` (executable JAR), `versions-maven-plugin`, `dependency-check-maven` (OWASP SCA).
**`settings.xml`** (`~/.m2/settings.xml`): repository mirrors (route everything through Nexus/Artifactory), credentials for deploying, proxies.
**Snapshot vs release repositories:** SNAPSHOTs can be overwritten (latest dev build); releases can't. `mvn deploy` publishes to the remote repository; `mvn release:prepare release:perform` automates version bumps and tags.

## Infrastructure as Code (Terraform) in brief
Declare infrastructure in HCL; `terraform init` → `plan` (preview the diff) → `apply`. **State** (store it remotely with locking: S3 + DynamoDB, Terraform Cloud) maps code to real resources. Modules for reuse; workspaces/environments; drift detection. Alternatives: Pulumi (real programming languages), CloudFormation, Ansible (configuration management, imperative-ish).

```hcl
resource "aws_s3_bucket" "telemetry" { bucket = "telemetry-parquet-prod" }
resource "aws_s3_bucket_versioning" "v" {
  bucket = aws_s3_bucket.telemetry.id
  versioning_configuration { status = "Enabled" }
}
```

## Release engineering terms
**Artifact repository** (Nexus, Artifactory, GitHub Packages, Harbor for images), **immutable artifacts**, **release notes/changelogs**, **hotfix** flow (branch from the release tag → fix → cherry-pick to main), **rollback vs roll-forward**, **DORA metrics**: deployment frequency, lead time for changes, change failure rate, time to restore service.

## Interview Q&A

**Q: CI vs CD vs continuous deployment?** Integrate and test every change / always releasable / auto-deploy every passing change.
**Q: How do you design a CI/CD pipeline for a microservice?** The stages above + quality gates + build once and promote + canary + rollback + secrets handling.
**Q: Merge vs rebase? Reset vs revert?** See above.
**Q: How do you recover a commit you reset away?** `git reflog` → `git reset --hard <sha>` or branch from it.
**Q: How do you find which commit introduced a bug?** `git bisect`.
**Q: How do you handle flaky tests?** Pattern analysis, reproduce, fix the root cause, quarantine meanwhile. Your cron and Python 2/3 stories.
**Q: How did you fix 50+ transitive vulnerabilities?** dependency:tree → BOM upgrade → dependencyManagement pins → exclusions → rescans + regression tests → passed the security maturity gate.

## Quick revision

- Git objects (blob/tree/commit), branches = pointers, HEAD; merge vs rebase; reset vs revert; reflog; bisect; cherry-pick; GitFlow vs trunk-based.
- Pipeline stages; fail fast; build once, promote; secrets; test tiers BVT/MVT/FVT; flaky tests.
- Deploy strategies + feature flags + rollback.
- Jenkins (controller/agents, Jenkinsfile), GitHub Actions (events, jobs, steps, matrix, secrets, your CI), GitLab CI (stages, runners, manual prod).
- Maven: GAV, lifecycle, scopes, transitive deps ("nearest wins"), dependency:tree, BOM, dependencyManagement, exclusions.

# 19 · Security and DevSecOps: SAST, SCA, BlackDuck, Checkmarx, SonarQube, Snyk

**Why DevSecOps exists:** security used to be a gate at the very end (a pen test before release), so issues were found late, were expensive to fix, and delayed releases. **"Shift left"** moves security checks **into the developer workflow and the CI pipeline**, so vulnerabilities are caught at commit/PR time, when they're cheapest to fix. Security becomes everyone's job, automated in every build.

**Your experience:**

- **Telemetry platform:** fixed **50+ transitive dependency vulnerabilities** in a shared **Spring Boot** service using **BlackDuck (SCA), Checkmarx (SAST) and SonarQube** to pass the **security maturity gate**. Container scanning with **Twistlock**; **Snyk** requirements (0 critical/high) in the onboarding checklist; **Xray** scans in the pipeline; secrets in **HashiCorp Vault**.
- **OneFS:** TLS certificates for **secure syslog forwarding**.
- **Dell AI hackathon:** the **Threat Modeling Workbench** (STRIDE-style threat analysis of PRs).
- **Your extension:** prompt-injection defences, HMAC tokens, rate limits, spend caps, privacy policy, scanning staged files for secrets before commits.

---

## Start here: DevSecOps and each tool in plain words

**The problem:** security checks used to happen once, just before release. Finding 200 problems at the last minute means delays or shipping vulnerable software.
**The idea, "shift left":** run automatic security checks **every time code changes**, inside the CI pipeline, so problems are caught when they're small and cheap.

### The kinds of checks, with an analogy each

| Check | Analogy | What it looks at |
|---|---|---|
| **SAST** (static analysis) | **Proofreading your own essay** for mistakes before printing it | Your source code, without running it (SQL injection, hard-coded secrets, unsafe functions) |
| **SCA** (software composition analysis) | **Checking the expiry dates and recall notices on the ingredients you bought** | The open-source libraries you depend on (and *their* dependencies) for known vulnerabilities (CVEs) and licence problems |
| **DAST** (dynamic) | **A burglar-for-hire testing your locked house from outside** | The running application, attacked over HTTP |
| **Container scanning** | **Inspecting a shipping container's contents** | OS packages and libraries inside the Docker image |
| **Secret scanning** | **Checking you didn't leave keys under the doormat** | Passwords and API keys accidentally committed to Git |

### The tools on your resume, one line each

- **SonarQube:** a code-quality and SAST server. Finds bugs, code smells, security hotspots and coverage gaps, and enforces a **quality gate** (e.g. coverage ≥ 80%, no new critical issues) that can fail the build.
- **Checkmarx:** an enterprise **SAST** tool. Traces how untrusted input flows through your code to dangerous places (a "source to sink" data flow).
- **Black Duck:** an enterprise **SCA** tool. Builds a bill of materials of every open-source component (even transitive ones), flags known CVEs and **licence** risks (e.g. GPL in proprietary code).
- **Snyk:** a developer-friendly **SCA** (also code, container and IaC) scanner that suggests the exact version upgrade that fixes a vulnerability and can open fix pull requests.

```
 Developer ─push─► CI pipeline
                    ├─ build + unit tests
                    ├─ SonarQube  (quality gate: bugs, smells, coverage, hotspots)
                    ├─ Checkmarx  (SAST: injection, XSS, insecure APIs in OUR code)
                    ├─ Black Duck / Snyk (SCA: CVEs + licences in THIRD-PARTY libraries)
                    ├─ build Docker image → Twistlock/Trivy (container scan)
                    └─ deploy to test → DAST (OWASP ZAP)
           any CRITICAL/HIGH finding ─► build fails ─► developer fixes or documents an approved exception
```

**SAST vs SCA in one line:** SAST checks **the code you wrote**; SCA checks **the code you imported**.

## Course map (everything in this file)
```
Fundamentals: CIA triad · threats/vulnerabilities/risks · least privilege · defence in depth · zero trust · secure SDLC · shift left
Testing types: SAST · SCA · DAST · IAST · container scanning · secret scanning · IaC scanning · penetration testing · fuzzing
Tools: SonarQube (quality gates, profiles, hotspots) · Checkmarx (data-flow SAST) · Black Duck (SCA + licences) · Snyk
  · Twistlock/Prisma, Trivy · gitleaks · Semgrep · OWASP ZAP · Dependabot/Renovate
Vulnerabilities: CVE/CVSS/KEV/EPSS · OWASP Top 10 (web + API + LLM) · injection · XSS · CSRF · SSRF · IDOR · deserialisation
Supply chain: SBOMs · dependency hygiene · transitive dependencies · signing & provenance · licences (permissive vs copyleft)
Crypto & identity: hashing · encryption (symmetric/asymmetric) · HMAC · TLS · password storage · MFA · tokens · secrets management (Vault, KMS)
Platform security: containers · Kubernetes (RBAC, PSS, NetworkPolicy) · cloud IAM · logging & detection
Process: threat modelling (STRIDE) · triage workflow · security gates in CI · incident response
```

## 1. The types of application security testing

| Type | What it examines | When | Finds | Tools |
|---|---|---|---|---|
| **SAST** (static application security testing) | **Your source code** (without running it) | Commit/PR/CI | Injection, hard-coded secrets, unsafe APIs, XSS sinks, path traversal | **Checkmarx**, SonarQube (security rules), Semgrep, CodeQL, Fortify |
| **SCA** (software composition analysis) | **Third-party/open-source dependencies** (incl. transitive) against vulnerability databases + **licences** | CI, continuously | Known CVEs in libraries; licence risks (GPL in proprietary code) | **BlackDuck**, **Snyk**, Dependabot, OWASP Dependency-Check, JFrog Xray, Mend |
| **DAST** (dynamic) | The **running app** from outside (black box) | Test/staging | Runtime issues: auth flaws, misconfigurations, injection via HTTP | OWASP ZAP, Burp Suite |
| **IAST** | Instrumented app during tests | Testing | Combines the static and dynamic views | Contrast |
| **Container scanning** | Image layers: OS packages + app dependencies + misconfigurations | Build + registry + runtime | CVEs in base images, running as root | **Twistlock / Prisma Cloud**, Trivy, Grype, Xray, Clair |
| **Secrets scanning** | Code + Git history | Pre-commit/CI | Leaked keys/tokens | gitleaks, GitHub secret scanning, trufflehog |
| **IaC scanning** | Terraform/K8s YAML/Dockerfiles | CI | Public buckets, privileged pods | Checkov, tfsec, kube-linter |

**SAST vs SCA (the most common confusion):** SAST = bugs in **code you wrote**. SCA = known vulnerabilities in **code you imported**. Most of a modern app's code is third-party, which is why SCA findings are so numerous.

## 2. The tools on your resume

- **BlackDuck (Synopsys, now Black Duck Software):** SCA. Builds a **Bill of Materials** of all open-source components (by scanning manifests, binaries and file signatures), maps them to known vulnerabilities (CVEs, Black Duck's own security advisories) and **licence obligations**, and enforces policies (e.g. fail the build on critical/high).
- **Checkmarx:** SAST. Analyses source code data flow from **sources** (user input) to **sinks** (SQL execution, file paths, HTML output) to find injection-type flaws. It produces false positives, so triage is needed: confirm the data flow is real, then fix or mark "not exploitable" with justification.
- **SonarQube:** code quality + security. **Quality gates** (e.g. coverage > 80%, no new critical issues, duplication limits), code smells, bugs, vulnerabilities and **security hotspots** (need human review), technical debt. Integrated as a CI stage that blocks merges on failure.
- **Snyk:** a developer-first SCA (also SAST, container and IaC scanning). Suggests **upgrade paths** and auto-fix PRs.
- **Twistlock (Palo Alto Prisma Cloud Compute):** container image scanning + runtime protection.
- **JFrog Xray:** scans artifacts in Artifactory (dependencies + images).

## 3. CVE, CVSS, and prioritisation

- **CVE:** a unique ID for a publicly known vulnerability (e.g. CVE-2021-44228 = **Log4Shell**).
- **CVSS:** severity score 0–10 (Critical 9.0–10, High 7.0–8.9, Medium 4–6.9, Low).
- **Prioritise by actual risk**, not just the score: is the vulnerable function reachable? Is it exposed to untrusted input? Is it exploited in the wild (CISA's **KEV** catalogue, **EPSS** probability)? Is there a fix?
- **Log4Shell story context:** a remote code execution bug in a ubiquitous **transitive** dependency (Log4j). It's why SCA and SBOMs became mandatory in many organisations.

## 4. How you fixed 50+ transitive vulnerabilities (STAR-ready)
**Situation:** a shared Spring Boot health-check service failed the **security maturity gate** because BlackDuck/Checkmarx/SonarQube reported 50+ vulnerabilities, mostly in **transitive** dependencies pulled by Spring Boot starters.
**Task:** clear them without breaking a service other teams depended on.
**Actions:**

1. Triaged the reports: grouped by library and severity, and separated **real reachable issues** from false positives.
2. `mvn dependency:tree` to find **which direct dependency pulled each vulnerable library**.
3. Preferred **upgrading the Spring Boot parent/BOM** (aligns many transitive versions at once, tested together).
4. Where needed, **pinned patched versions** in `<dependencyManagement>` and **excluded** unused libraries.
5. Fixed the code-level (SAST) findings flagged by Checkmarx/Sonar.
6. Re-ran the scans + unit/integration tests; verified the health endpoints and dependent services; documented the exceptions.
**Result:** passed the security maturity gate; the service was unblocked for release; and it established a repeatable process (scan in CI, upgrade regularly rather than in panic batches).
**Lesson:** "Dependency hygiene is continuous. Small regular upgrades are far cheaper than 50 at once."

## 5. OWASP Top 10 (web apps): know them with an example and a fix
The widely known **2021** list (OWASP has since published a 2025 update that, among other changes, gives **software supply chain failures** a category of their own, which is exactly SCA's territory):

| # | Risk | Example | Fix |
|---|---|---|---|
| A01 | **Broken access control** | `GET /orders/123` returns another user's order (IDOR) | Check ownership on every request; deny by default |
| A02 | **Cryptographic failures** | Plain HTTP, MD5 passwords | TLS everywhere; bcrypt/argon2 for passwords; encrypt sensitive data at rest |
| A03 | **Injection** (SQL, command, LDAP; XSS is grouped here in 2021) | `"... WHERE id=" + userInput` | Parameterised queries; avoid `shell=True`; output encoding |
| A04 | Insecure design | No rate limit on OTP | Threat modelling; secure design patterns |
| A05 | Security misconfiguration | Default credentials, verbose errors, open S3 bucket, CORS `*` | Hardened defaults, config scanning |
| A06 | **Vulnerable and outdated components** | Old Log4j | **SCA** + regular upgrades (your 50+ fixes) |
| A07 | Identification and authentication failures | Weak sessions, no MFA, credential stuffing | MFA, rate limiting, secure session handling |
| A08 | Software and data integrity failures | Unsigned updates, insecure deserialisation, CI/CD tampering | Signing, SBOM, pinned dependencies |
| A09 | Security logging and monitoring failures | Breach unnoticed for months | Centralised logs + alerts (your syslog → SIEM feature) |
| A10 | **SSRF** | Server fetches a user-provided URL → reaches internal metadata endpoints | Allow-lists, block internal ranges |

**XSS:** injected scripts run in other users' browsers → output encoding + Content-Security-Policy. **CSRF:** a forged cross-site request using the victim's cookies → SameSite cookies + CSRF tokens.

## 6. OWASP Top 10 for LLM applications (2025): ties to your AI work
LLM01 **Prompt injection** (direct and indirect, e.g. via scraped web pages, which is exactly the risk your extension defends against), LLM02 Sensitive information disclosure, LLM03 Supply chain, LLM04 Data and model poisoning, LLM05 Improper output handling, LLM06 **Excessive agency** (agents with too many permissions), LLM07 System prompt leakage, LLM08 Vector and embedding weaknesses, LLM09 Misinformation (hallucination), LLM10 **Unbounded consumption** (cost/DoS; your rate limits + monthly spend cap). Details in file 21.

## 7. Supply chain security

- **SBOM (software bill of materials):** an inventory of all components (formats: CycloneDX, SPDX). Increasingly required by customers and governments.
- **Pin versions + lock files**, verify checksums, use private proxies (Nexus/Artifactory), and watch for **typosquatting** and **dependency confusion** attacks.
- **Sign artifacts** (Sigstore/cosign), provenance (SLSA levels).
- Protect CI/CD: least-privilege tokens, protected branches, required reviews, no secrets in logs.

## 8. Secrets management

- **Never** in code, images, Git history or logs. Use **Vault** (dynamic, short-lived secrets, leases, audit), cloud secret managers, or Kubernetes Secrets with encryption + an external secrets operator.
- If a secret leaks: **revoke/rotate immediately** (deleting the commit isn't enough; the history and forks keep it), then audit usage.
- Your habit: scan staged files for secrets before every commit; `.env` is git-ignored; the OpenAI key lives only in the hosting platform's environment.

## 9. Security fundamentals that come up in any round

- **CIA triad:** confidentiality, integrity, availability.
- **Least privilege, defence in depth, zero trust** (never trust the network; authenticate every request), **secure by default**.
- **AuthN vs AuthZ; RBAC vs ABAC.**
- **Hashing vs encryption vs encoding:** hashing is one-way (SHA-256 for integrity; **bcrypt/scrypt/argon2 with a salt for passwords**: slow on purpose); encryption is reversible with a key (AES symmetric, RSA/ECC asymmetric); encoding (Base64) is **not security**.
- **TLS and certificates:** file 08 (your CA/CSR/verify work).
- **Rate limiting and abuse prevention**; input validation (allow-lists); output encoding.

## 10. Threat modelling and STRIDE (your hackathon project)
Threat modelling is a **proactive** design-time activity: identify assets, entry points and **trust boundaries**, enumerate threats, rate them, and plan mitigations **before** code ships.
**STRIDE:**

| Threat | Violates | Example | Mitigation |
|---|---|---|---|
| **S**poofing | Authentication | Forged identity/token | Strong auth, mTLS, signature checks |
| **T**ampering | Integrity | Modify data in transit or at rest | TLS, signing, checksums |
| **R**epudiation | Non-repudiation | "I never did that" | Audit logs (your syslog forwarding) |
| **I**nformation disclosure | Confidentiality | Leaked data, verbose errors | Encryption, access control |
| **D**enial of service | Availability | Flood the API | Rate limits, quotas, autoscaling |
| **E**levation of privilege | Authorisation | User becomes admin | Least privilege, input validation |

Other frameworks: DREAD (rating), PASTA, attack trees. Microsoft's Threat Modeling Tool uses **.tm7** files (the existing threat models your workbench read).
> "The workbench took a PR plus the architecture docs, existing threat models and Confluence pages, and produced candidate threats, attack vectors, missing controls and mitigations, each with evidence. It assisted security engineers; it didn't replace them. For security, human-in-the-loop is the design requirement."

## 11. Vulnerabilities in code: vulnerable vs fixed

**SQL injection:**

```python
# ❌ vulnerable: input "1 OR 1=1" or "1; DROP TABLE users" changes the query
cur.execute(f"SELECT * FROM users WHERE id = {user_id}")
# ✅ parameterised: the driver sends the value separately; it can never become SQL
cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

**Command injection:**

```python
# ❌ subprocess.run(f"ping -c 1 {host}", shell=True)    → host = "8.8.8.8; rm -rf /"
# ✅ subprocess.run(["ping", "-c", "1", host], check=True)   # no shell; plus validate host against a pattern
```

**Path traversal:**

```python
# ❌ open(f"/srv/reports/{name}")         → name = "../../etc/passwd"
from pathlib import Path
base = Path("/srv/reports").resolve()
p = (base / name).resolve()
if not p.is_relative_to(base): raise PermissionError("bad path")   # ✅
```

**XSS (cross-site scripting):** user input rendered as HTML runs as script in other users' browsers.

```js
// ❌ el.innerHTML = review.text           (a review containing <img src=x onerror=steal()>)
// ✅ el.textContent = review.text         (or a templating engine that escapes by default, plus a CSP)
```

**CSRF:** a malicious site makes the victim's browser send an authenticated request (cookies are attached automatically). Fixes: `SameSite` cookies, CSRF tokens in forms, re-authentication for sensitive actions. Bearer tokens in headers (not cookies) aren't vulnerable to classic CSRF.
**SSRF:** the server fetches a user-supplied URL → the attacker points it at `http://169.254.169.254/` (cloud metadata) or internal services. Fixes: allow-list hosts, resolve the DNS name and block private/link-local ranges, disable redirects, use cloud IMDSv2.
**Insecure deserialisation:** `pickle.loads` / Java native deserialisation of untrusted data can execute code. Use JSON with schema validation.
**IDOR / broken access control:**

```python
# ❌ return db.get(Order, order_id)
# ✅
order = db.get(Order, order_id)
if order is None or order.user_id != current_user.id: raise HTTPException(404)
```

## 12. Cryptography basics with code

| Need | Use | Avoid |
|---|---|---|
| Encrypt data (symmetric) | **AES-256-GCM** (authenticated encryption), ChaCha20-Poly1305 | ECB mode, DES, home-made crypto |
| Key exchange / signatures (asymmetric) | ECDHE, Ed25519/ECDSA, RSA-2048+ (RSA-OAEP / RSA-PSS) | RSA PKCS#1 v1.5 for new designs |
| Integrity + authenticity with a shared key | **HMAC-SHA256** | a plain hash (anyone can recompute it) |
| Password storage | **argon2id**, bcrypt, scrypt (salted, slow) | MD5/SHA-1/plain SHA-256, encryption |
| Random tokens | `secrets.token_urlsafe(32)`, `os.urandom` | `random` module |

```python
import hmac, hashlib, secrets
sig = hmac.new(SECRET, msg=body, digestmod=hashlib.sha256).hexdigest()
ok = hmac.compare_digest(sig, received_sig)       # constant-time comparison (prevents timing attacks)
# This is the idea behind your extension's install tokens and behind webhook signatures.

from argon2 import PasswordHasher                  # pip install argon2-cffi
ph = PasswordHasher(); h = ph.hash("user-password"); ph.verify(h, "user-password")

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
key = AESGCM.generate_key(bit_length=256); nonce = secrets.token_bytes(12)   # never reuse a nonce with the same key
ct = AESGCM(key).encrypt(nonce, b"secret data", b"header"); AESGCM(key).decrypt(nonce, ct, b"header")
```

**Encryption at rest** (disk/database/object store, often with a **KMS** managing keys: envelope encryption = data keys encrypted by a master key) vs **in transit** (TLS). **Key rotation**, HSMs for high-value keys.

## 13. Authentication hardening and security headers

- **MFA** (TOTP apps, WebAuthn/passkeys: phishing-resistant), account lockout/rate limiting on login, secure password reset (single-use, expiring tokens), session timeout and rotation on login.
- **HTTP security headers:** `Strict-Transport-Security` (HSTS: HTTPS only), `Content-Security-Policy` (limit script sources: a strong XSS defence), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` / CSP `frame-ancestors` (clickjacking), `Referrer-Policy`, `Permissions-Policy`.

## 14. Running the tools (commands you can mention)
```bash
snyk test                                    # SCA on the current project's manifests
snyk container test myorg/api:1.4.2          # container image
sonar-scanner -Dsonar.projectKey=health-service -Dsonar.sources=src -Dsonar.host.url=$SONAR_URL -Dsonar.token=$SONAR_TOKEN
mvn org.owasp:dependency-check-maven:check   # free SCA for Maven
./detect.sh --blackduck.url=$BD_URL --blackduck.api.token=$BD_TOKEN   # Black Duck "Detect" scanner (your org's CI template provides the script/version)
trivy image myorg/api:1.4.2                  # container scan
trivy fs --scanners vuln,secret,misconfig .  # repo scan
gitleaks detect --source . --verbose         # secrets in code and history
semgrep --config auto .                      # SAST (open source)
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://staging.example.com   # DAST baseline
pip-audit; npm audit                         # language-native SCA
```

**SonarQube quality gate example** ("Sonar way" style): on **new code**: coverage ≥ 80%, duplicated lines ≤ 3%, maintainability/reliability/security ratings = A, all security hotspots reviewed. A **quality profile** is the set of active rules; the **gate** is the pass/fail condition.

**A CI security stage (GitLab-style):**

```yaml
sca:        { stage: scan, script: ["snyk test --severity-threshold=high"] }
sast:       { stage: scan, script: ["semgrep --config auto --error ."] }
secrets:    { stage: scan, script: ["gitleaks detect --redact"] }
container:  { stage: scan, needs: [build_image], script: ["trivy image --exit-code 1 --severity CRITICAL,HIGH $IMAGE"] }
```

## 15. Triage workflow for findings

1. **Deduplicate and group** by component/rule.
2. **Validate:** true positive? (For SAST, trace the data flow; for SCA, is the vulnerable function reachable or the component even used at runtime?)
3. **Prioritise:** severity × exploitability × exposure (internet-facing? handles untrusted input?) × asset value.
4. **Fix:** upgrade/patch, code change, or configuration change. Otherwise mitigate (WAF rule, disable a feature) and **document an exception with an expiry date**.
5. **Verify** with a rescan + tests; **prevent recurrence** (pinned versions, automated dependency PRs like Dependabot/Renovate, policy gates).

## 16. Open-source licence compliance (also part of SCA)

- **Permissive:** MIT, BSD, Apache-2.0 (Apache adds a patent grant): use freely with attribution.
- **Weak copyleft:** LGPL, MPL: modifications to the library itself must be shared.
- **Strong copyleft:** **GPL** (distributing a combined work requires releasing source), **AGPL** (even network use counts: a big concern for SaaS companies).
- Tools like BlackDuck flag licence conflicts with company policy. *(Same reason OneFS is built on FreeBSD rather than Linux: the BSD licence vs the GPL.)*

## 17. Cloud and Kubernetes security

- **IAM least privilege** (roles, not long-lived keys; OIDC federation for CI), MFA on human accounts, no root account usage.
- **Network:** private subnets, security groups, no public databases, VPC endpoints.
- **Data:** encryption by default, blocked public buckets, backups + immutability.
- **Kubernetes:** RBAC with least privilege, Pod Security Standards (restricted), NetworkPolicies (default deny), image scanning + admission policies (only signed/scanned images), secrets from a vault, audit logging, keeping clusters patched, no `privileged` containers or `hostPath` mounts.
- **Detection:** CloudTrail/audit logs → SIEM; runtime security (Falco, Prisma).

## 18. Penetration testing, fuzzing and incident response

- **Penetration testing:** authorised experts attack the system like a real attacker (recon → scanning → exploitation → privilege escalation → report). It finds chained, logic and configuration flaws that automated scanners miss. **Bug bounties** crowd-source this. Always with written permission and a defined scope.
- **Fuzzing:** feed huge numbers of random/mutated inputs to a program to find crashes and hangs (AFL++, libFuzzer, OSS-Fuzz; `atheris` for Python). It's essential for parsers, file formats and network protocols (very relevant to storage and C code).
- **Security incident response:** prepare (playbooks, contacts, logging) → **detect** (alerts/SIEM) → **contain** (isolate hosts, revoke keys) → **eradicate** (remove the cause, patch) → **recover** (restore from clean backups, monitor) → **lessons learned** (postmortem). Keep evidence intact; communicate per legal/regulatory requirements.
- **Security logging:** authentication events, permission changes, admin actions and data exports, shipped off-host to a SIEM (Splunk/ELK): the reason your OneFS syslog-forwarding feature mattered.

## Interview Q&A

**Q: SAST vs DAST vs SCA?** Your code statically / the running app dynamically / your dependencies.
**Q: How do you handle hundreds of SCA findings?** Triage by reachability, exposure, exploit availability and fix availability; fix via BOM/parent upgrades; pin and exclude; automate continuous scanning; set policy gates.
**Q: What's a transitive dependency vulnerability and how do you fix it?** A CVE in a library pulled by another library. `dependency:tree` → upgrade the parent → dependencyManagement pin → exclusion → test.
**Q: How do you prevent SQL injection?** Parameterised queries / ORMs; never concatenate input; least-privilege DB users.
**Q: What's prompt injection and how do you mitigate it?** Untrusted text instructing the model. Fence and label untrusted input, keep instructions separate, validate outputs, least-privilege tools, human approval for risky actions, evals with injection cases (file 21).
**Q: How do you store passwords?** A salted slow hash (argon2/bcrypt), never encrypted or plain.
**Q: What do you do if an API key is committed to GitHub?** Revoke and rotate immediately, then clean the history, audit usage, and add secret scanning.

## Quick revision

- Shift left. SAST (code: Checkmarx, Sonar), SCA (dependencies + licences: BlackDuck, Snyk, Xray), DAST (running app: ZAP), container scanning (Twistlock/Prisma, Trivy), secrets scanning, IaC scanning.
- CVE + CVSS + reachability/KEV/EPSS prioritisation. Log4Shell.
- Your 50+ transitive fix: triage → dependency:tree → BOM upgrade → pin/exclude → rescan + test → gate passed.
- OWASP Top 10 (2021) + the 2025 supply-chain emphasis; OWASP LLM Top 10 (prompt injection, excessive agency, unbounded consumption).
- SBOM, signing, pinning; Vault; rotate leaked keys.
- CIA, least privilege, zero trust; hashing vs encryption vs encoding; STRIDE threat modelling (your hackathon).

# 15 · Backend Development, REST APIs, Microservices, FastAPI

**What backend development is:** building the server side that **owns the data and the business rules**. It exposes APIs, validates input, enforces auth, talks to databases/queues/caches/other services, and stays **correct, secure, fast and observable** under load.

**Your backend experience:**

- **OneFS PAPI** (a versioned REST platform API that the `isi` CLI calls) and your syslog-forwarding feature's endpoints (`/platform/25/rsyslog/servers`).
- A **Spring Boot** health-check service (fixed 50+ vulnerable dependencies).
- **Scala** pipeline services.
- **FastAPI** for the Dell AI assistants and your **Smart Shopping Agent backend** (live on Render: token auth, rate limits, budget cap, streaming, Pydantic validation, CI/CD).

---

# Start here: backend, APIs, REST, microservices and FastAPI in plain words

### Backend development
**Frontend** = what users see (web page, mobile app, your extension's side panel). **Backend** = the server-side brain: it **stores data, enforces rules, talks to other systems, and answers requests**.
**Restaurant analogy:** the dining area is the frontend; the **kitchen** is the backend; the **menu** is the **API** (the list of things you can order and how to ask for them); the **waiter** carries requests and responses (HTTP).

### API
An **API (application programming interface)** is a **contract**: "send me this, in this format, and I'll give you that back." It hides how the kitchen works.

### REST
**REST** is a style of designing web APIs around **resources** (nouns: users, orders, collections), each with a **URL**, manipulated with standard **HTTP verbs**:

```
GET    /orders/42      → read order 42          (like "show me")
POST   /orders         → create a new order     (like "add")
PUT    /orders/42      → replace order 42       (like "overwrite")
PATCH  /orders/42      → change part of it      (like "edit")
DELETE /orders/42      → remove it              (like "delete")
The response carries a STATUS CODE: 2xx ok · 4xx you made a mistake · 5xx the server made a mistake
```

**Stateless:** every request carries everything needed (like showing your ticket at every gate), so any server can handle any request, which makes scaling easy.

### Monolith vs microservices
**Monolith = a department store:** everything under one roof, one building to manage, easy to walk between departments, but renovating one floor can close the whole store.
**Microservices = a shopping mall of independent shops:** each shop has its own staff, stock (database) and opening hours (deployments). It scales shop by shop, but now you need corridors, signage and security between the shops (networking, service discovery, distributed tracing, eventual consistency).

```
MONOLITH                               MICROSERVICES
┌─────────────────────────┐            Client ─► API Gateway ─┬─► Users svc ──► Users DB
│ users │ orders │ payments│                                  ├─► Orders svc ─► Orders DB ─┐ events
│     one codebase         │                                  └─► Payments svc ► Payments DB│
│     one deployment       │                                        ▲                       │
└───────────┬─────────────┘                                        └──── Kafka/RabbitMQ ◄──┘
            ▼
       one database
```

### FastAPI
**What:** a Python web framework for building APIs quickly, using **type hints** to validate data automatically and generate documentation.
**How a request flows through a FastAPI app:**

```
 HTTP request ──► Uvicorn (ASGI server; event loop)
                    ▼
               Starlette (routing, middleware: CORS, logging, request IDs)
                    ▼
               Dependencies run first (Depends): auth token check, DB session, rate limit
                    ▼
               Pydantic validates the body/params ── invalid? ──► 422 with error details
                    ▼
               Your endpoint function (async or sync) ──► services, DB, OpenAI …
                    ▼
               response_model (Pydantic) filters/validates the output ──► JSON response
 Auto-generated docs from the same type hints: /docs (Swagger UI) and /redoc
```

# Part 0: Backend basics

## 0.1 Client–server and the request lifecycle
```
Browser/app ──HTTP──► DNS → Load balancer → Reverse proxy (nginx: TLS, gzip, static files)
                   → App server (Uvicorn/Gunicorn, Tomcat) → your code (routing → middleware → handler)
                   → services → DB / cache / queue / other APIs → response
```

- **Web server** (nginx, Apache: serves static files, terminates TLS, proxies) vs **application server** (runs your code: Uvicorn for ASGI, Gunicorn for WSGI, Tomcat for Java).
- **Raw HTTP request and response:**

```http
POST /api/v1/collections HTTP/1.1
Host: api.example.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOi...
Content-Length: 52

{"systemId": "APM001", "product": "PowerStore"}
```
```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/v1/collections/9812

{"id": 9812, "status": "RECEIVED"}
```

## 0.2 Backend architecture patterns

- **Layered (n-tier):** controller/router (HTTP concerns) → **service** (business logic) → **repository/DAO** (data access) → database. Each layer only talks to the one below; easy to test with fakes.
- **MVC:** model (data + rules), view (presentation), controller (handles input). In APIs, the "view" is the JSON serialiser.
- **Clean / hexagonal architecture (ports and adapters):** business logic in the centre, with no framework imports; adapters for HTTP, DB and queues plug in from outside. Swap MySQL for PostgreSQL, or REST for gRPC, without touching the core.
- **Monolith → modular monolith → microservices** (Part B).
- **Synchronous request/response vs asynchronous** (queue the work, return `202 Accepted` + a job ID, poll or get a callback/webhook).

## 0.3 Data access: ORMs, migrations, connection pools
```python
# SQLAlchemy 2.x ORM (the most common Python ORM)
from sqlalchemy import String, ForeignKey, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, Session

class Base(DeclarativeBase): pass
class System(Base):
    __tablename__ = "systems"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    collections: Mapped[list["Collection"]] = relationship(back_populates="system")
class Collection(Base):
    __tablename__ = "collections"
    id: Mapped[int] = mapped_column(primary_key=True)
    system_id: Mapped[str] = mapped_column(ForeignKey("systems.id"), index=True)
    status: Mapped[str] = mapped_column(String(16), default="RECEIVED")
    system: Mapped[System] = relationship(back_populates="collections")

with Session(engine) as s:
    failed = s.scalars(select(Collection).where(Collection.status == "FAILED").limit(50)).all()
    s.add(Collection(system_id="APM001")); s.commit()
```

- **ORM pros:** productivity, safety (parameterised queries), portability. **Cons:** hidden queries (**N+1**), inefficient SQL for complex reports, so drop to raw SQL when needed.
- **Migrations** (Alembic for SQLAlchemy, Flyway/Liquibase for Java): version-controlled schema changes applied in order in every environment. **Zero-downtime migrations:** expand → migrate data → contract (add the new column, dual-write, backfill, switch reads, drop the old column later). Never rename a column in place on a live system.
- **Connection pools:** reuse DB connections (`pool_size`, `max_overflow`, `pool_pre_ping` in SQLAlchemy; HikariCP in Java). Pool size × app instances must stay under the DB's `max_connections`.

## 0.4 Background jobs and scheduling
Work that's slow or can be retried shouldn't run inside the request: emails, report generation, LLM batch jobs, image processing. Options: **Celery/RQ/Dramatiq** (Python + Redis/RabbitMQ brokers), **Kafka consumers**, cloud queues (SQS), cron/CronJobs for schedules. Design jobs to be **idempotent** with **retries + backoff + DLQ**.

## 0.5 Configuration, secrets, environments
12-factor config from environment variables; separate dev/staging/prod; secrets in a vault/secret manager; feature flags for gradual rollouts; validate config at startup (fail fast if a required variable is missing).

## 0.6 Error handling and validation
Validate at the edge (schemas), return consistent error bodies, map internal exceptions to the right status codes, never leak stack traces, log with a request ID, and distinguish **client errors (4xx: don't retry)** from **server errors (5xx: may retry)**.

## 0.7 Testing a backend
**Test pyramid:** many **unit** tests (pure logic, fakes), fewer **integration** tests (real DB via Testcontainers/Docker, real HTTP via a test client), few **end-to-end** tests. Plus **contract tests** between services (Pact), **load tests** (Locust, k6, JMeter), and security tests (DAST).

---

# Part A: REST APIs

## 1. Why REST exists
Roy Fielding's 2000 PhD thesis described the architectural style of the web itself. REST uses **HTTP as designed** (resources + standard methods + status codes + caching), so any client (curl, browsers, scripts, other languages) can use your API with no special library. That's why OneFS chose REST for PAPI: storage admins use curl, Python and PowerShell.

**REST constraints:** client-server; **stateless** (each request carries all context, e.g. the auth token); cacheable; **uniform interface** (resources identified by URIs, manipulated through representations, self-descriptive messages, HATEOAS); layered system (proxies/LBs are invisible); code-on-demand (optional).

## 2. Resource design
```
GET    /api/v1/clusters                 list (with pagination and filters)
POST   /api/v1/clusters                 create → 201 Created + Location header
GET    /api/v1/clusters/{id}            read
PUT    /api/v1/clusters/{id}            replace (idempotent)
PATCH  /api/v1/clusters/{id}            partial update
DELETE /api/v1/clusters/{id}            delete → 204 (idempotent)
GET    /api/v1/clusters/{id}/nodes      sub-resource
POST   /api/v1/jobs/{id}/cancel         actions that aren't CRUD (use sparingly)
```

- **Nouns, plural, lowercase, hyphens**; no verbs in paths (`/getUser` ❌).
- Filtering/sorting via query params: `?status=failed&sort=-createdAt&limit=50`.
- Consistent **error format** (your extension returns `{code, message}` with codes like `auth`, `limit`, `budget`, `upstream`, `no_data`, and **never leaks exception text**).

## 3. Methods: safety and idempotency (asked often)

| Method | Safe (no side effects) | Idempotent (repeat = same effect) |
|---|---|---|
| GET, HEAD, OPTIONS | ✅ | ✅ |
| PUT | ❌ | ✅ |
| DELETE | ❌ | ✅ |
| POST | ❌ | ❌ (unless you use idempotency keys) |
| PATCH | ❌ | not guaranteed |

**Why it matters:** clients and proxies **retry** on timeouts. Retrying a non-idempotent POST can create duplicates (double payments). Fix: an **`Idempotency-Key` header**: the server stores the key + response and returns the stored response for repeats.

## 4. Status codes to use correctly
200, **201** (created), **202** (accepted for async processing; return a job ID to poll), 204, 301/302/304, **400** (malformed), **401** (not authenticated), **403** (authenticated, not allowed), 404, **409** (conflict, e.g. a version mismatch), **422** (validation failed), **429** (rate limited, plus `Retry-After`), 500, **502/503/504** (upstream errors, unavailable, gateway timeout).

## 5. Pagination

- **Offset/limit** (`?offset=1000&limit=50`): simple, but slow for deep pages (the DB still scans the skipped rows) and inconsistent when data changes between pages.
- **Cursor/keyset** (`?after=<last_id>&limit=50` → `WHERE id > last_id ORDER BY id LIMIT 50`): fast and stable. **Preferred for large or real-time data** (feeds, logs).

## 6. Versioning
URI (`/v1/`, the most common and explicit), header (`Accept: application/vnd.x.v2+json`), or query param. **OneFS versions each endpoint independently** (`/platform/17/cluster/config` vs `/platform/25/rsyslog/servers`) so old automation keeps working when one resource's schema changes. That's a real design choice you can discuss.
**Backward compatibility rules:** add optional fields freely; never remove or rename fields or change their meaning in the same version; deprecate with notice.

## 7. Caching
`Cache-Control: max-age=60`, **ETag** + `If-None-Match` → `304 Not Modified` (saves bandwidth), `Last-Modified`. **Optimistic concurrency with ETags:** `If-Match: <etag>` on PUT → `412 Precondition Failed` if someone changed it.

## 8. Authentication and authorisation

- **AuthN** = who are you? **AuthZ** = what may you do? (RBAC roles, ABAC attributes, scopes.)
- **API keys:** simple; for server-to-server; rotate them; never put them in client code.
- **Session cookies:** server-side session store; `HttpOnly`, `Secure`, `SameSite` flags; needs CSRF protection.
- **JWT (JSON Web Token):** `header.payload.signature` (Base64URL). **Signed, not encrypted**: anyone can read the payload, so put no secrets in it. Stateless verification (good for scale) but **hard to revoke** → short expiry + refresh tokens, or a deny-list. Verify the signature, `exp`, `aud`, `iss`; never accept `alg: none`.
- **OAuth 2.0:** delegated authorisation ("let app X access my Google Drive"). Flows: **Authorization Code + PKCE** (web/mobile apps), Client Credentials (service-to-service). **OpenID Connect (OIDC)** adds identity (an ID token) on top: "Sign in with Google".
- **HMAC signatures:** sign the request or token with a shared secret. **Your extension:** each install registers and gets an **HMAC-signed install token**; the backend verifies the signature on every AI call (`guarded()` dependency), then checks the per-install daily limit and the monthly budget. Stateless verification, no user accounts needed.
- **mTLS** for service-to-service identity.

## 9. Other API styles (know when to pick each)

| Style | Best for | Trade-offs |
|---|---|---|
| **REST/JSON** | Public and CRUD APIs, broad compatibility | Over/under-fetching, chattiness |
| **gRPC** (HTTP/2 + Protobuf) | Internal service-to-service, low latency, streaming, strict contracts | Needs tooling; not browser-native (gRPC-Web) |
| **GraphQL** | Many clients with different data needs (mobile/web), nested data | Caching is harder, query cost attacks, complexity |
| **WebSocket** | Bidirectional real-time (chat, games) | Stateful connections to scale |
| **SSE / streaming HTTP** | Server → client streams (LLM token streaming, live updates) | One direction |
| **Webhooks** | Notify external systems of events | Retries, signing (HMAC), idempotency on the receiver |

## 9b. Examples: JWT, OAuth flow, gRPC, GraphQL, webhooks

**JWT anatomy:**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJzdWIiOiI0MiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc5NTE4MTAwMH0 . <signature>
header {"alg":"HS256","typ":"JWT"}     payload {"sub":"42","role":"admin","exp":1795181000}     HMAC-SHA256(header.payload, secret)
```

HS256 = shared secret (one service). **RS256/ES256** = the private key signs, and the public key verifies (many services can verify without being able to mint tokens; keys published via JWKS).

```python
import jwt                                   # PyJWT
token = jwt.encode({"sub": "42", "exp": datetime.now(timezone.utc) + timedelta(minutes=15)}, SECRET, algorithm="HS256")
claims = jwt.decode(token, SECRET, algorithms=["HS256"], audience=None)   # raises if expired/tampered
```

**OAuth 2.0 Authorization Code + PKCE flow:**

```
User ─► App: "Sign in with Google"
App ─► Browser redirect to the Auth server (/authorize?client_id&redirect_uri&scope&code_challenge)
User logs in + consents at the Auth server
Auth server ─► redirect back to the App with a one-time CODE
App backend ─► Auth server /token (code + code_verifier) ─► ACCESS TOKEN (+ refresh token, + ID token for OIDC)
App ─► Resource API with "Authorization: Bearer <access token>"
```

PKCE stops a stolen code from being exchanged (the attacker doesn't have the verifier). Never use the old implicit flow.

**gRPC (a contract-first RPC):**

```protobuf
syntax = "proto3";
service CollectionService {
  rpc GetCollection (GetRequest) returns (Collection);
  rpc StreamStatus (GetRequest) returns (stream StatusUpdate);   // server streaming
}
message GetRequest { string id = 1; }
message Collection { string id = 1; string system_id = 2; int32 processing_s = 3; }
```

Code is generated for each language; binary Protobuf over HTTP/2; four call types (unary, server streaming, client streaming, bidirectional); deadlines and cancellation built in.

**GraphQL:**

```graphql
query { system(id: "APM001") { customer collections(last: 5) { id status processingSeconds } } }
```

One endpoint; the client asks for exactly the fields it needs. Watch out for **N+1 resolvers** (fix with DataLoader batching) and expensive queries (depth/complexity limits).

**Webhooks (receiving them safely):** verify an HMAC signature header against the raw body, check a timestamp to block replays, respond 2xx fast and process asynchronously, and dedupe by event ID (senders retry).

**File uploads:** small files → `multipart/form-data` to the API; large files → a **pre-signed URL** directly to object storage (resumable/multipart), then the client notifies the API.

**Rate-limit headers:** `429 Too Many Requests` + `Retry-After`; many APIs also send `X-RateLimit-Limit`/`Remaining`/`Reset`.

## 10. API security checklist (OWASP API Top 10 themes)
Broken object-level authorisation (**always check that the user owns resource {id}**: the #1 API bug), authentication flaws, excessive data exposure (return only the needed fields), lack of rate limiting, mass assignment (don't bind every JSON field to the model), injection (parameterised queries), security misconfiguration (CORS `*` with credentials, verbose errors), SSRF (don't fetch user-supplied URLs blindly), input size limits (**your Pydantic models cap request sizes**, e.g. at most 350 reviews).

---

# Part B: Microservices

## 1. Monolith vs microservices

| | Monolith | Microservices |
|---|---|---|
| Deploy | One unit | Each service independently |
| Scale | The whole app | Per service |
| Team autonomy | Low (shared codebase) | High (team owns a service) |
| Tech choice | One stack | Per service |
| Complexity | Simple to develop, test, debug | **Distributed systems complexity**: network failures, data consistency, observability, ops overhead |
| Data | One DB, ACID transactions | **Database per service**; consistency via events/sagas |

**Honest senior take:** start with a **modular monolith**; split into services when team size, scaling needs or deploy independence justify it. "Microservices are an organisational scaling tool as much as a technical one" (Conway's law: systems mirror the communication structure of the organisation).

## 2. Decomposition
By **business capability / bounded context** (domain-driven design): Orders, Payments, Inventory, Notifications. Each owns its data. Avoid a "distributed monolith" (services that must deploy together or share a DB).

## 3. Communication

- **Synchronous** (REST/gRPC): simple request/response, but creates **temporal coupling** (if B is down, A fails) and latency chains.
- **Asynchronous** (events via Kafka/RabbitMQ): decoupled and resilient; eventual consistency; harder to trace.
- Rule of thumb: sync for queries that need an answer now; async for commands and events that can complete later.

## 4. Essential patterns

| Pattern | Problem it solves |
|---|---|
| **API gateway** | One entry point: routing, auth, rate limiting, aggregation (Kong, AWS API Gateway, Envoy) |
| **Backend-for-frontend (BFF)** | A tailored API per client type (mobile vs web) |
| **Service discovery** | Find instances dynamically (Kubernetes DNS/Services, Consul, Eureka) |
| **Circuit breaker, retry + backoff + jitter, timeout, bulkhead** | Resilience (file 12); libraries: Resilience4j, Polly, or a service mesh |
| **Saga** | Multi-service transactions with compensations |
| **Transactional outbox / CDC** | Reliable event publishing alongside DB changes |
| **CQRS** | Separate read models (denormalised, fast) from the write model |
| **Event sourcing** | The event log as the source of truth |
| **Database per service** | Loose coupling, independent schema changes |
| **Strangler fig** | Migrate a monolith gradually: route features to new services one by one |
| **Sidecar / service mesh** (Istio, Linkerd) | mTLS, retries, metrics and traffic splitting outside the app code |
| **Config server / secrets manager** | Externalised config (12-factor), Vault (you used HashiCorp Vault) |
| **Health checks** | Liveness/readiness endpoints for orchestration (Spring Actuator, FastAPI `/health`) |
| **Distributed tracing** | Follow a request across services (OpenTelemetry, Jaeger) with a trace ID |

## 5. The twelve-factor app (cloud-native basics)
Codebase in version control; explicit dependencies; **config in the environment**; backing services as attached resources; separate build/release/run; **stateless processes**; port binding; scale by processes; disposability (fast start, graceful shutdown on SIGTERM); dev/prod parity; **logs as event streams (stdout)**; admin tasks as one-off processes.
*Your extension backend follows this:* settings from environment variables (`app/config.py`), stateless app on Render, logs to stdout, CI-gated deploys.

## 6. Data consistency across services
No cross-service ACID. Use: sagas + compensations, outbox + idempotent consumers, eventual consistency with clear UX ("payment processing…"), and reconciliation jobs that detect and fix drift.

---

# Part C: FastAPI

## 1. Why FastAPI exists
Released 2018 (Sebastián Ramírez). It combines **Starlette** (an async ASGI web toolkit) with **Pydantic** (data validation from type hints). Benefits:

- **Type hints drive everything:** request parsing, validation, serialisation, editor autocomplete.
- **Automatic OpenAPI docs** at `/docs` (Swagger UI) and `/redoc`.
- **Async-first** (ASGI), so it's very fast for I/O-heavy APIs like LLM calls, which wait seconds on the network.
- **Dependency injection** with `Depends`.
- Little boilerplate compared with Django; more structure than Flask.

**Why you chose it for LLM backends:** LLM calls are slow network I/O (seconds), so async handles many concurrent users on one small server. Pydantic validates both requests and **LLM structured outputs**, and the Python AI ecosystem (OpenAI SDK, LangChain) is native.

**WSGI vs ASGI:** WSGI (Flask, Django classic) is synchronous, one request per worker thread. ASGI supports async, WebSockets and streaming.

## 2. Core features in code
```python
from fastapi import FastAPI, Depends, HTTPException, Header, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager

class AnalyzeRequest(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    reviews: list[str] = Field(max_length=350)        # request size limit → 422 if violated

class AnalyzeResponse(BaseModel):
    verdict: str
    pros: list[str]
    cons: list[str]

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = make_client()                    # startup: create pools/clients once
    yield
    await app.state.http.aclose()                     # shutdown: clean up

app = FastAPI(lifespan=lifespan)

def guarded(bucket: str):                             # dependency factory (like your extension's)
    async def check(authorization: str = Header(...)):
        install_id = verify_hmac_token(authorization)          # 401 if invalid
        if budget_exhausted(): raise HTTPException(503, {"code": "budget", "message": "Monthly AI budget reached"})
        if not usage.allow(install_id, bucket): raise HTTPException(429, {"code": "limit", "message": "Daily limit reached"})
        return install_id
    return check

@app.get("/health")
def health(): return {"status": "ok"}

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest, install_id: str = Depends(guarded("analyze"))):
    return await run_analysis(req)                     # async LLM call; validated output

@app.post("/api/chat")
async def chat(req: ChatRequest, _: str = Depends(guarded("chat"))):
    async def tokens():
        async for chunk in stream_llm(req):
            yield chunk
    return StreamingResponse(tokens(), media_type="text/plain")   # stream tokens to the side panel
```

- **Path/query/body/header parameters** are declared by function signature and type.
- **`response_model`** filters and validates the output (prevents leaking extra fields).
- **`Depends`** is dependency injection: auth, DB sessions, rate limits, shared clients. Dependencies can depend on other dependencies and are easy to override in tests (`app.dependency_overrides`).
- **Validation errors return 422** automatically with field details.
- **`async def` vs `def`:** `async def` runs on the event loop (never block it). A plain `def` endpoint is run in a **thread pool** automatically, so blocking libraries are OK there.
- **BackgroundTasks:** run small work after sending the response (send an email, log usage). For heavy or reliable work use a real queue (Celery, RQ, Kafka).
- **Middleware:** CORS (`CORSMiddleware`: which origins may call your API; extensions and browsers need it), timing, request IDs, GZip.
- **Exception handlers:** map internal errors to a safe `{code, message}`.
- **Testing:** `from fastapi.testclient import TestClient`; override dependencies with fakes (your backend tests use fake models instead of calling OpenAI).

## 2b. FastAPI from basic to advanced: more code

**Path, query, body, headers, status codes:**

```python
from fastapi import FastAPI, Query, Path, status
from typing import Annotated

@app.get("/systems/{system_id}/collections")
def list_collections(
    system_id: Annotated[str, Path(pattern=r"^[A-Z0-9]{3,32}$")],
    status_: Annotated[str | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    cursor: str | None = None,
):
    return repo.list(system_id, status_, limit, cursor)

@app.post("/collections", status_code=status.HTTP_201_CREATED, response_model=CollectionOut)
def create(body: CollectionIn): ...
```

**Structuring a bigger app with routers:**

```
app/
├── main.py            # app = FastAPI(); app.include_router(collections.router, prefix="/api/v1")
├── config.py          # Settings(BaseSettings): read from env
├── deps.py            # get_db, get_current_user, guarded(...)
├── routers/collections.py   # router = APIRouter(tags=["collections"])
├── schemas.py         # Pydantic models (In/Out separate → never leak internal fields)
├── services/          # business logic
└── repositories/      # DB access
```

**A dependency with `yield` (DB session per request, always closed):**

```python
def get_db():
    db = SessionLocal()
    try:
        yield db                 # the endpoint runs here
        db.commit()
    except Exception:
        db.rollback(); raise
    finally:
        db.close()

@app.get("/collections/{cid}")
def read(cid: int, db: Session = Depends(get_db)):
    obj = db.get(Collection, cid)
    if not obj: raise HTTPException(status_code=404, detail={"code": "not_found"})
    return obj
```

**Settings from the environment (pydantic-settings):**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    openai_api_key: str                     # required → the app fails fast at startup if missing
    limit_match_per_day: int = 150
    monthly_budget_usd: float = 10.0
settings = Settings()
```

**Middleware (request ID + timing) and a global exception handler:**

```python
import time, uuid
from fastapi import Request
from fastapi.responses import JSONResponse

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    rid = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    log.info("%s %s %s %.1fms", rid, request.method, request.url.path, (time.perf_counter() - start) * 1000)
    return response

@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("unhandled error")
    return JSONResponse(status_code=500, content={"code": "internal", "message": "Something went wrong"})  # no stack traces

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["chrome-extension://<id>"], allow_methods=["*"], allow_headers=["*"])
```

**OAuth2 bearer tokens with JWT (the standard FastAPI auth recipe):**

```python
from fastapi.security import OAuth2PasswordBearer
oauth2 = OAuth2PasswordBearer(tokenUrl="/token")
def current_user(token: str = Depends(oauth2)):
    try:
        claims = jwt.decode(token, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "invalid token", headers={"WWW-Authenticate": "Bearer"})
    return claims["sub"]
@app.get("/me")
def me(user: str = Depends(current_user)): return {"user": user}
```

**Background tasks, file upload, WebSocket:**

```python
from fastapi import BackgroundTasks, UploadFile, WebSocket

@app.post("/reports")
def make_report(bg: BackgroundTasks):
    bg.add_task(send_email, "done")          # runs after the response is sent (same process: not durable)
    return {"queued": True}

@app.post("/upload")
async def upload(file: UploadFile):
    data = await file.read()                 # stream large files in chunks instead
    return {"name": file.filename, "bytes": len(data)}

@app.websocket("/ws/status")
async def ws(websocket: WebSocket):
    await websocket.accept()
    while True:
        msg = await websocket.receive_text()
        await websocket.send_text(f"echo {msg}")
```

**Async database access:** use async drivers (`asyncpg`, SQLAlchemy `AsyncSession`, `motor` for MongoDB) inside `async def` endpoints. Mixing a sync driver into `async def` blocks the event loop.

**Testing:**

```python
from fastapi.testclient import TestClient
def fake_guard(): return "test-install"
app.dependency_overrides[guarded_analyze] = fake_guard        # skip real auth/limits
app.dependency_overrides[get_llm] = lambda: FakeLLM()           # no real OpenAI calls
client = TestClient(app)
def test_analyze_validates_input():
    r = client.post("/api/analyze", json={"title": "", "reviews": []})
    assert r.status_code == 422
```

**Performance tips:** use async clients for outbound HTTP (`httpx.AsyncClient`, shared via lifespan), avoid CPU-heavy work in the event loop (offload to processes), add caching, paginate, and stream big responses.

## 3. Running in production

- **Uvicorn** (ASGI server). Several workers for multiple cores: `uvicorn app.main:app --workers 4`, or **Gunicorn with Uvicorn workers**. In Kubernetes, often 1 worker per container and scale with replicas.
- Behind a reverse proxy / load balancer (TLS termination).
- Config via environment variables (Pydantic `BaseSettings`); secrets never in code (your OpenAI key lives in the hosting platform's environment, never committed).
- Health endpoint for probes; structured logging to stdout; metrics (`prometheus-fastapi-instrumentator`).
- **Your deployment:** GitHub Actions CI (tests + evals) → Render auto-deploys from `main` after CI passes.

## 4. FastAPI vs Flask vs Django vs Spring Boot

| | FastAPI | Flask | Django | Spring Boot |
|---|---|---|---|---|
| Style | Async, typed, API-first | Minimal, sync (async optional) | Batteries included (ORM, admin, auth) | Enterprise JVM, DI everywhere |
| Validation | Pydantic built in | Add-ons | Forms/serializers (DRF) | Bean Validation |
| Docs | Auto OpenAPI | Add-ons | DRF add-ons | springdoc add-on |
| Best for | APIs, ML/LLM services | Small apps | Full web apps with admin | Large enterprise services |

---

---

# Part D: Completing backend, REST, microservices and FastAPI from A to Z

### Course map
```
Backend: HTTP · client-server · web vs app servers · architecture (layered, MVC, hexagonal) · data access (ORM, migrations, pools)
  · auth · caching · background jobs · files · email/notifications · config & secrets · logging & errors · testing · deployment
REST: resources & URIs · methods (safe/idempotent) · status codes · headers · content negotiation · pagination/filtering/sorting
  · versioning · HATEOAS · caching & ETags · idempotency keys · rate limiting · error format · OpenAPI documentation · security
Microservices: decomposition (DDD) · communication (sync/async) · data per service · gateway/BFF · discovery · resilience
  · sagas/outbox/CQRS/event sourcing · observability · deployment (containers, K8s, service mesh) · testing (contract) · migration (strangler fig)
FastAPI: install & run · path/query/body/header params · Pydantic models · response models · status codes · errors
  · dependencies · security (OAuth2/JWT, API keys) · middleware/CORS · background tasks · WebSockets · files · routers/structure
  · settings · databases (sync/async) · testing · async vs sync · deployment (Uvicorn/Gunicorn, Docker)
```

### Nginx as a reverse proxy in front of an API
```nginx
upstream api_backend {
    least_conn;                                   # load-balancing method
    server 10.0.0.11:8000 max_fails=3 fail_timeout=10s;
    server 10.0.0.12:8000 max_fails=3 fail_timeout=10s;
}
server {
    listen 443 ssl http2;
    server_name api.example.com;
    ssl_certificate     /etc/ssl/api.crt;
    ssl_certificate_key /etc/ssl/api.key;
    client_max_body_size 10m;                     # request size limit
    location /static/ { root /srv; expires 7d; }  # serve static files directly
    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Request-ID $request_id;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;                   # LLM streaming may need longer timeouts and proxy_buffering off
    }
}
```

### OpenAPI: the contract for REST APIs
FastAPI generates it automatically (`/openapi.json`). A hand-written snippet looks like:

```yaml
openapi: 3.1.0
info: { title: Collections API, version: 1.0.0 }
paths:
  /collections/{id}:
    get:
      parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
      responses:
        "200": { description: OK, content: { application/json: { schema: { $ref: "#/components/schemas/Collection" } } } }
        "404": { description: Not found }
components:
  schemas:
    Collection:
      type: object
      required: [id, status]
      properties: { id: { type: integer }, status: { type: string, enum: [RECEIVED, PROCESSED, FAILED] } }
```

Uses: interactive docs (Swagger UI), generating client SDKs, contract testing, API gateways.

### Content negotiation and HATEOAS

- The client says what it wants with `Accept: application/json` (or `text/csv`); the server answers with `Content-Type`. `415 Unsupported Media Type` / `406 Not Acceptable` when it can't.
- **HATEOAS** (the strictest REST level): responses include links to related actions (`"_links": {"cancel": {"href": "/orders/42/cancel"}}`), so clients navigate the API like a website. Rare in practice, but a known REST constraint (the **Richardson maturity model**: level 0 (one endpoint, RPC style) → level 1 (resources) → level 2 (HTTP verbs + status codes) → level 3 (hypermedia)).

### Sending emails and notifications from a backend
Never send inside the request: enqueue a job → a worker calls an email provider API (SES, SendGrid) with templates → retries with backoff → track delivery and bounces via webhooks. Configure SPF/DKIM/DMARC so mail isn't marked as spam.

### Microservices: testing and deployment, completed

- **Testing pyramid for services:** unit → component tests (one service with fake dependencies) → **contract tests** (consumer-driven: Pact) → a few end-to-end tests → production monitoring/canaries.
- **Deployment patterns:** one service per container; independent CI/CD pipelines per service; versioned APIs; backwards-compatible changes (expand/contract); feature flags; canary releases through the gateway/mesh.
- **API composition** (a gateway or BFF calls several services and merges the results) vs **CQRS read models** (precomputed views fed by events) for queries spanning services.
- **Shared libraries vs duplication:** share small, stable utilities (logging, auth clients); avoid a shared "domain model" library that couples services.

### FastAPI: deployment, completed
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
USER 10001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
```

- On a VM: Gunicorn managing Uvicorn workers (`gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4`) behind nginx.
- In Kubernetes: one Uvicorn process per container, scaled with replicas; readiness/liveness on `/health`.
- On a PaaS (Render, Railway, Fly.io, Heroku-style): a start command + environment variables (your extension's backend on Render).

## Interview Q&A

**Q: PUT vs PATCH vs POST?** Replace (idempotent) vs partial update vs create/action (not idempotent).
**Q: How do you make POST idempotent?** Idempotency-Key header; store key → result; return the stored result on repeat.
**Q: How do you design pagination for a feed?** Cursor/keyset, not offset.
**Q: JWT vs sessions?** Stateless and scalable but hard to revoke vs server state that's easy to revoke. Short-lived JWT + refresh token is a common hybrid.
**Q: How did you secure your extension's API without user accounts?** Per-install HMAC-signed tokens, per-install daily limits, a monthly spend cap, request size limits, safe error messages, CORS, HTTPS.
**Q: Why FastAPI for your LLM backend?** Async for slow I/O, Pydantic for request and LLM-output validation, auto docs, Python AI ecosystem.
**Q: What's a 502 vs 504?** The gateway got a bad response vs no response in time from upstream.
**Q: Monolith or microservices for a new product?** Modular monolith first; split when needed. Explain the costs of distribution.
**Q: How do services find each other in Kubernetes?** Services + DNS (`svc.namespace.svc.cluster.local`).

## Quick revision

- REST = resources + HTTP methods + status codes + statelessness + caching. Safe/idempotent table. Idempotency keys.
- Cursor pagination; per-endpoint versioning (OneFS PAPI); consistent error format; ETags.
- AuthN vs AuthZ; API keys, sessions, JWT (signed, not encrypted), OAuth2 + PKCE, OIDC, HMAC (your install tokens), mTLS.
- REST vs gRPC vs GraphQL vs WebSocket vs SSE vs webhooks.
- Microservices: bounded contexts, DB per service, gateway, discovery, circuit breaker, saga, outbox, CQRS, strangler fig, 12-factor, tracing. Start with a modular monolith.
- FastAPI = Starlette + Pydantic; Depends; response_model; 422 validation; async vs def (thread pool); StreamingResponse; lifespan; TestClient + dependency overrides; Uvicorn workers.

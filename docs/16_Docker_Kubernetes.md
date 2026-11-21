# 16 · Docker and Kubernetes

**Why containers exist:** "It works on my machine" happens because environments differ: OS libraries, language versions, configuration. Virtual machines fixed this but are heavy (a full OS each, minutes to boot, GBs). **Containers** package an app **with its dependencies** and share the host kernel, so they're lightweight (MBs, start in about a second) and identical everywhere.

**Why Kubernetes exists:** running hundreds of containers across many machines needs scheduling, restarting failed ones, scaling, networking, rolling updates and configuration. Kubernetes (from Google's internal Borg, open-sourced 2014) is the **orchestrator** that does this from **declarative** configuration.

**Your experience:** the telemetry platform ran on Kubernetes with **auto-healing (liveness probes and scripts)**, **KEDA autoscaling on Kafka lag / RabbitMQ depth**, a **PKS → KOB cluster migration**, integration-environment deployments, a weekly prod deployment rotation, the Harbor registry, container scanning (Twistlock), and Vault for secrets.

---

# Start here: Docker and Kubernetes in plain words

### Docker
**The problem:** "It works on my laptop" but fails on the server, because the server has a different Python version, missing libraries or different settings.
**The idea:** pack the app **with everything it needs** (runtime, libraries, config defaults) into a standard box, a **container image**, that runs the same everywhere.
**Analogy:** the **shipping container**. A ship doesn't care whether a container holds bananas or laptops; it just moves standard boxes. Docker lets any server run any app the same way.

```
 VIRTUAL MACHINES                              CONTAINERS
 ┌──────┐ ┌──────┐ ┌──────┐                    ┌──────┐ ┌──────┐ ┌──────┐
 │ App A│ │ App B│ │ App C│                    │ App A│ │ App B│ │ App C│
 │ Libs │ │ Libs │ │ Libs │                    │ Libs │ │ Libs │ │ Libs │
 │GuestOS│ │GuestOS│ │GuestOS│  ← heavy (GBs)  └──┬───┘ └──┬───┘ └──┬───┘
 └──┬───┘ └──┬───┘ └──┬───┘                        └── container runtime ──┘ ← light (MBs), shares the host kernel
 ┌──▼────────▼────────▼──┐                        ┌──────────────────────────┐
 │      Hypervisor       │                        │       Host OS kernel     │
 └───────────────────────┘                        └──────────────────────────┘
```

**Image vs container:** an image is a **recipe + ingredients** (read-only); a container is the **dish being cooked** from it (a running instance). One image → many containers.
**Dockerfile** = the written recipe. **Registry** (Docker Hub, Harbor) = the cookbook library where images are shared.

### Kubernetes
**The problem:** you now have 300 containers across 40 servers. Which server runs which container? What restarts a crashed one? How do they find each other? How do you update them without downtime?
**The idea:** a **cluster manager**. You declare "I want 5 copies of the api container, each with 1 CPU, reachable at `api`", and Kubernetes makes it so, and **keeps** it so.
**Analogy:** an **orchestra conductor** (or a harbour master): you hand over the score (YAML), and they make sure every musician (container) plays, replace anyone who faints, and add more violins when the music needs it.

```
 You: kubectl apply -f app.yaml  ("desired state: 3 replicas of api:1.4")
        │
        ▼
 ┌──────────────── CONTROL PLANE (the brain) ─────────────────┐
 │ API server ◄──► etcd (stores desired + actual state)        │
 │ Scheduler: "pod 3 goes to worker-2 (it has free CPU)"       │
 │ Controllers: loop forever: "desired 3, running 2 → start 1" │
 └───────────────────────────┬─────────────────────────────────┘
                             │ instructions
     ┌───────────────────────┼───────────────────────┐
     ▼                       ▼                       ▼
 Worker node 1           Worker node 2           Worker node 3     (the muscle)
 kubelet + runtime       kubelet + runtime       kubelet + runtime
 [pod api] [pod db]      [pod api]               [pod api] [pod redis]
     ▲ Service "api" (stable name + IP) load-balances across all api pods; Ingress brings outside traffic in
```

**Key words in plain language:** **Pod** = the smallest unit (one or a few containers that live together). **Deployment** = "keep N copies of this pod, update them gradually." **Service** = a stable address in front of changing pods. **Ingress** = the front door from the internet. **ConfigMap/Secret** = settings and passwords given to pods. **Probe** = a health check (restart if dead, stop sending traffic if not ready). **Autoscaler** = adds/removes pods with load.

# Part A: Docker

## 1. Container vs VM

| | VM | Container |
|---|---|---|
| Isolation | Hardware-level (a hypervisor runs a full guest OS) | OS-level (shares the host kernel) |
| Size | GBs | MBs |
| Boot | Minutes | Milliseconds to seconds |
| Density | Tens per host | Hundreds per host |
| Security boundary | Stronger | Weaker (shared kernel), so harden with seccomp, AppArmor, non-root, gVisor/Kata |

## 2. How containers work (Linux kernel features)

- **Namespaces** = what a process can **see**: `pid` (own process tree), `net` (own network stack/IP), `mnt` (own filesystem view), `uts` (hostname), `ipc`, `user` (UID mapping), `cgroup`.
- **cgroups** = what a process can **use**: CPU, memory, I/O and PID limits. (A Kubernetes memory limit is a cgroup limit; exceed it → OOMKilled.)
- **Union filesystem (overlayfs)** = image **layers** stacked read-only + one thin writable layer per container.
- A container is just a **process** with these restrictions. FreeBSD's older equivalent is **jails**.

## 3. Images and layers

- An image = ordered **read-only layers** (one per filesystem-changing Dockerfile instruction) + metadata. Layers are content-addressed and **shared/cached**.
- **Build cache:** if a layer's instruction and inputs are unchanged, it's reused. **Order instructions from least to most frequently changing** (dependencies before source code).
- Registry: Docker Hub, **Harbor** (what you used), ECR, GCR, GHCR. Tags are mutable; **digests** (`@sha256:…`) are immutable, so pin them in production.

## 4. A production-quality Dockerfile (Python/FastAPI)
```dockerfile
# ---- build stage ----
FROM python:3.12-slim AS build
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt   # cached unless requirements change

# ---- runtime stage ----
FROM python:3.12-slim
WORKDIR /app
COPY --from=build /install /usr/local
COPY app/ ./app/
RUN useradd -r -u 10001 appuser
USER appuser                                         # don't run as root
EXPOSE 8000
HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Best practices:** multi-stage builds (smaller images, no build tools in the runtime), slim/distroless base images, `.dockerignore` (exclude `.git`, `.env`, `node_modules`), **never bake secrets into images** (layers keep history), a non-root user, pinned versions, one process per container, log to stdout/stderr, handle SIGTERM for graceful shutdown, scan images (Trivy, Twistlock/Prisma Cloud).

## 5. Dockerfile instruction questions

- **`CMD` vs `ENTRYPOINT`:** ENTRYPOINT is the executable; CMD is the default arguments (overridable at `docker run`). Use the exec (JSON) form so the app is PID 1 and receives signals.
- **`COPY` vs `ADD`:** use COPY. ADD also extracts tarballs and fetches URLs (surprising behaviour).
- **`RUN` vs `CMD`:** RUN executes at **build** time (creates a layer); CMD at **run** time.
- **`ARG` vs `ENV`:** build-time variable vs runtime environment variable.
- **PID 1 problem:** PID 1 doesn't get default signal handlers and must reap zombies, so use the exec form, or `tini`/`--init`.

## 6. Data and networking

- **Volumes** (Docker-managed, persistent; for databases) vs **bind mounts** (a host path; for development) vs **tmpfs** (in memory). The container's writable layer **disappears** with the container.
- **Networks:** `bridge` (default; containers on a private network; publish ports with `-p 8080:8000`), `host` (share the host network stack), `none`, `overlay` (multi-host; Swarm). Containers on the same user-defined network resolve each other **by name**.

## 7. Docker Compose
Define multi-container apps (app + DB + Redis) in `docker-compose.yml`: services, networks, volumes, `depends_on` (start order, not readiness, so add healthchecks), env files. Great for local development and demos.

## 8. Commands
```bash
docker build -t app:1.0 .        docker run -d -p 8000:8000 --name api app:1.0
docker ps -a                     docker logs -f api          docker exec -it api sh
docker images                    docker inspect api          docker stats
docker stop api && docker rm api docker system prune
docker compose up -d --build     docker compose logs -f
```

---

## 9. Docker architecture
```
docker CLI ──REST──► dockerd (Docker daemon: images, networks, volumes, builds via BuildKit)
                          │
                          ▼
                     containerd (container lifecycle, image pull/storage)
                          │
                          ▼
                     runc (OCI runtime: sets up namespaces + cgroups and starts the process)
Registry (Docker Hub / Harbor / ECR) ◄── push / pull ──► local image store
```

**Image vs container:** an image is a read-only template (layers + config); a container is a running (or stopped) instance with a writable layer. Many containers can share one image. **OCI** standards define image and runtime formats, so Docker, Podman, containerd and Kubernetes all interoperate.

## 10. Dockerfile instructions reference

| Instruction | Purpose |
|---|---|
| `FROM image:tag [AS name]` | base image (multi-stage: several FROMs) |
| `RUN cmd` | execute at build time → new layer (chain with `&&`, clean caches in the same RUN) |
| `COPY src dst` / `ADD` | copy files into the image (ADD also extracts tars/fetches URLs) |
| `WORKDIR /app` | set the working directory |
| `ENV KEY=val` | runtime environment variable |
| `ARG NAME=default` | build-time variable (`--build-arg`) |
| `EXPOSE 8000` | documents the port (doesn't publish it) |
| `USER 10001` | run as non-root |
| `VOLUME /data` | declare a mount point |
| `HEALTHCHECK CMD …` | container health for Docker (Kubernetes uses probes instead) |
| `LABEL key=val` | metadata (version, maintainer, source) |
| `ENTRYPOINT ["exe"]` / `CMD ["args"]` | what runs (ENTRYPOINT fixed, CMD default args) |
| `SHELL`, `STOPSIGNAL`, `ONBUILD` | rarer |

## 11. `docker run` flags and everyday commands
```bash
docker run -d --name api -p 8000:8000 \
  -e LOG_LEVEL=info --env-file .env \
  -v api-data:/data -v "$PWD/config:/app/config:ro" \
  --memory 512m --cpus 1.0 --restart unless-stopped \
  --network appnet --read-only --user 10001 \
  myorg/api:1.4.2
docker build -t myorg/api:1.4.2 --build-arg PY=3.12 .      # add --platform linux/amd64 for cross-arch builds
docker tag myorg/api:1.4.2 harbor.example.com/team/api:1.4.2 && docker push harbor.example.com/team/api:1.4.2
docker image ls; docker image history myorg/api:1.4.2      # see layer sizes
docker volume ls; docker volume inspect api-data
docker network create appnet; docker network inspect appnet
docker cp api:/app/logs ./logs; docker top api; docker events
docker save -o api.tar myorg/api:1.4.2; docker load -i api.tar   # move images offline
docker buildx build --platform linux/amd64,linux/arm64 -t myorg/api:1.4.2 --push .   # multi-architecture images
```

Restart policies: `no`, `on-failure[:N]`, `always`, `unless-stopped`.

## 12. Docker Compose example (app + Postgres + Redis)
```yaml
services:
  api:
    build: .
    ports: ["8000:8000"]
    env_file: .env
    environment:
      DATABASE_URL: postgresql://app:secret@db:5432/app     # "db" resolves by service name
      REDIS_URL: redis://cache:6379/0
    depends_on:
      db: { condition: service_healthy }
      cache: { condition: service_started }
  db:
    image: postgres:16
    environment: { POSTGRES_USER: app, POSTGRES_PASSWORD: secret, POSTGRES_DB: app }
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U app"], interval: 5s, retries: 10 }
  cache:
    image: redis:7
volumes:
  pgdata:
```

`docker compose up -d --build`, `docker compose ps`, `docker compose logs -f api`, `docker compose down -v` (also removes volumes).

## 13. Image size and security checklist
Slim/distroless/alpine bases (alpine uses musl, which occasionally breaks Python wheels), multi-stage builds, combine RUN steps and clean package caches, `.dockerignore`, pinned versions and digests, a non-root user, a read-only root filesystem, no secrets (use BuildKit `--secret` for build-time secrets), scan images (Trivy/Twistlock), sign images (cosign), rebuild regularly to pick up base-image patches.

---

# Part B: Kubernetes

## 1. Architecture (draw this)
```
Control plane                                   Worker nodes
┌──────────────────────────────┐               ┌────────────────────────────┐
│ kube-apiserver (front door,  │◄─────────────►│ kubelet (runs pods,        │
│   REST, auth, validation)    │               │   reports status, probes)  │
│ etcd (all cluster state;     │               │ kube-proxy (Service        │
│   Raft-replicated KV store)  │               │   routing: iptables/IPVS)  │
│ kube-scheduler (picks a node │               │ container runtime          │
│   for each new pod)          │               │   (containerd / CRI-O)     │
│ controller-manager (control  │               │ Pods                       │
│   loops: Deployment, Node…)  │               └────────────────────────────┘
│ cloud-controller-manager     │
└──────────────────────────────┘
```

- **Declarative + reconciliation:** you declare the **desired state** (YAML); **controllers** loop forever comparing desired vs actual and act to converge. That's why a crashed pod comes back: the ReplicaSet controller sees 2/3 running and creates one.
- Everything goes through the **API server**; state lives in **etcd** (consensus: file 12).
- Docker images run under containerd. Kubernetes removed "dockershim" in v1.24, but Docker-built images work unchanged (they're OCI images).

## 2. Core objects

| Object | Purpose |
|---|---|
| **Pod** | The smallest unit: one or more containers sharing network (IP, localhost) and volumes. Ephemeral |
| **ReplicaSet** | Keeps N identical pods running |
| **Deployment** | Manages ReplicaSets: **rolling updates, rollbacks**. For stateless apps |
| **StatefulSet** | Stable pod identity (`kafka-0`, `kafka-1`), stable storage per pod, ordered start/stop. For databases and brokers |
| **DaemonSet** | One pod per node (log shippers, monitoring agents, Fluent Bit, node exporter) |
| **Job / CronJob** | Run-to-completion tasks / scheduled tasks (data purge scripts) |
| **Service** | A stable virtual IP + DNS name in front of a changing set of pods (selected by **labels**) |
| **Ingress** (+ Ingress controller) / Gateway API | L7 HTTP routing from outside (host/path rules, TLS) |
| **ConfigMap / Secret** | Configuration / sensitive values (Secrets are only **base64-encoded**, not encrypted by default; enable encryption at rest or use Vault/External Secrets) |
| **PersistentVolume (PV) / PersistentVolumeClaim (PVC) / StorageClass** | Storage abstraction: the pod claims storage; the StorageClass provisions it dynamically (CSI drivers, e.g. for Dell storage) |
| **Namespace** | Logical isolation (dev/int/uat/prod or per team) + resource quotas |
| **HPA / VPA** | Horizontal / vertical pod autoscaling |
| **ServiceAccount, Role/ClusterRole, RoleBinding** | RBAC: who can do what |
| **NetworkPolicy** | Firewall rules between pods |

## 3. Services

- **ClusterIP** (default; internal only), **NodePort** (a port on every node), **LoadBalancer** (a cloud LB), **Headless** (`clusterIP: None`: DNS returns pod IPs directly; used by StatefulSets).
- DNS: `my-svc.my-namespace.svc.cluster.local`.
- kube-proxy programs iptables/IPVS rules so the Service IP load-balances to healthy pod endpoints.

## 4. Probes: how auto-healing works (you worked on this)

| Probe | Question | On failure |
|---|---|---|
| **Liveness** | Is the process stuck or dead? | **Restart** the container |
| **Readiness** | Can it serve traffic right now? | **Remove from Service endpoints** (no restart) |
| **Startup** | Has it finished starting? | Holds off the other probes (for slow starters, e.g. JVM warm-up) |

```yaml
livenessProbe:  { httpGet: { path: /health, port: 8000 }, initialDelaySeconds: 10, periodSeconds: 10, failureThreshold: 3 }
readinessProbe: { httpGet: { path: /ready,  port: 8000 }, periodSeconds: 5 }
```

**Classic mistakes:** a liveness probe that checks dependencies (DB down → all pods restart in a loop, making things worse); no readiness probe (traffic hits pods still warming up). For a queue consumer with no HTTP server, liveness can be an **exec** probe or a heartbeat file that the consumer loop touches. Liveness scripts are part of how the telemetry platform auto-healed stuck consumers.

## 5. Resources, QoS, and the classic failure states
```yaml
resources:
  requests: { cpu: "500m", memory: "512Mi" }   # used by the SCHEDULER to place the pod
  limits:   { cpu: "1",    memory: "1Gi" }     # enforced at RUNTIME
```

- **CPU over the limit → throttled** (slower, not killed). **Memory over the limit → OOMKilled** (exit code 137).
- **QoS classes:** Guaranteed (requests = limits), Burstable, BestEffort (none set; evicted first under node pressure).
- JVM in containers: size the heap to the limit (`-XX:MaxRAMPercentage`).

**Debugging states (very commonly asked):**

| State | Usual cause | Investigate |
|---|---|---|
| `Pending` | No node has enough resources; unbound PVC; taints/affinity | `kubectl describe pod` → Events |
| `ImagePullBackOff` / `ErrImagePull` | Wrong image/tag; registry auth (imagePullSecrets) | describe → events |
| `CrashLoopBackOff` | The app crashes on start (bad config, missing env/secret, can't reach a dependency, failing liveness probe) | `kubectl logs <pod> --previous` |
| `OOMKilled` | Memory limit exceeded | raise the limit or fix the leak; check `describe` → Last State |
| `Running` but not `Ready` | Readiness probe failing | probe endpoint, dependencies |
| `Evicted` | Node pressure (disk/memory) | node conditions |

```bash
kubectl get pods -n prod -o wide          kubectl describe pod <p>
kubectl logs <p> -c <container> -f        kubectl logs <p> --previous
kubectl exec -it <p> -- sh                kubectl get events --sort-by=.lastTimestamp
kubectl top pods / nodes                  kubectl rollout status deploy/api
kubectl rollout undo deploy/api           kubectl scale deploy/api --replicas=5
kubectl apply -f k8s/                     kubectl port-forward svc/api 8000:80
kubectl get deploy api -o yaml            kubectl config use-context <ctx>
```

## 6. Deployments and rollout strategies

- **Rolling update** (default): `maxSurge` (extra pods during the update) and `maxUnavailable`. Zero downtime if readiness probes are correct.
- **Recreate:** kill all, then start new (downtime; for apps that can't run two versions at once).
- **Blue/green:** two full environments; switch traffic at once; instant rollback.
- **Canary:** send a small % of traffic to the new version, watch metrics, then expand (Argo Rollouts, Flagger, a service mesh).
- `kubectl rollout undo` for rollbacks. **Graceful shutdown:** on SIGTERM, stop taking new work, finish in-flight work, exit within `terminationGracePeriodSeconds` (30 s default). A `preStop` hook can add a delay for LB deregistration. **For queue consumers: stop polling, finish/ack the current message, commit offsets, then exit.**

## 7. Autoscaling

- **HPA:** scales pod replicas on CPU/memory (metrics-server) or custom metrics.
- **VPA:** adjusts requests/limits.
- **Cluster Autoscaler / Karpenter:** adds or removes **nodes** when pods are pending or nodes are idle.
- **KEDA (Kubernetes Event-Driven Autoscaling):** scales on **external event sources**: Kafka consumer lag, RabbitMQ queue length, Prometheus queries, cron. It can **scale to zero**. Under the hood it feeds an HPA.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata: { name: collection-processor }
spec:
  scaleTargetRef: { name: collection-processor }
  minReplicaCount: 2
  maxReplicaCount: 24          # ≈ the topic's partition count; more consumers would sit idle
  pollingInterval: 15
  cooldownPeriod: 300          # damp scale-down flapping
  triggers:
    - type: kafka
      metadata: { bootstrapServers: kafka:9092, consumerGroup: processors, topic: collection-received, lagThreshold: "100" }
```
> **Your best Kubernetes answer:** "Our workers were I/O-bound, so CPU-based HPA never triggered while the backlog grew and the 5-minute SLA was at risk. We scaled on consumer lag and queue depth with KEDA instead, capped replicas near the partition count, and used cooldowns to avoid thrashing."

## 8. Configuration, secrets, packaging

- ConfigMaps/Secrets as env vars or mounted files. **External secret stores:** HashiCorp **Vault** (what you used), AWS Secrets Manager, plus the External Secrets Operator.
- **Helm:** a package manager with templated charts + values per environment. **Kustomize:** overlays without templates.
- **GitOps (Argo CD, Flux):** Git is the source of truth; a controller syncs the cluster to it.

## 9. Scheduling controls
nodeSelector, **node affinity / anti-affinity** (spread replicas across nodes/zones), **taints and tolerations** (reserve nodes, e.g. GPUs), topologySpreadConstraints, **PodDisruptionBudget** (keep at least N pods during voluntary disruptions like node drains and upgrades), PriorityClasses.

## 10. Cluster migration (your PKS → KOB experience)
Moving workloads from one Kubernetes platform to another: recreate namespaces, RBAC, secrets (from Vault), ConfigMaps, network policies and ingress; update image registry access; redeploy via CI/CD; verify probes, autoscaling and dashboards; cut over traffic/consumers carefully (**consumer groups must not run in both clusters at once without care**, or partitions get split and the old cluster's consumers keep committing offsets); then decommission.
*(PKS = VMware's Pivotal Container Service, VMware's enterprise Kubernetes distribution. Describe the target generically as "the new internal Kubernetes platform" if you're unsure of the official name.)*

## 11. A complete application in YAML (Deployment + Service + Ingress + ConfigMap + Secret + HPA)
```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: api-config, namespace: shop }
data:
  LOG_LEVEL: "info"
  LIMIT_MATCH_PER_DAY: "150"
---
apiVersion: v1
kind: Secret
metadata: { name: api-secrets, namespace: shop }
type: Opaque
stringData:                           # base64-encoded on save; NOT encrypted unless encryption at rest is enabled
  OPENAI_API_KEY: "<from-vault>"
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: api, namespace: shop, labels: { app: api } }
spec:
  replicas: 3
  selector: { matchLabels: { app: api } }
  strategy: { type: RollingUpdate, rollingUpdate: { maxSurge: 1, maxUnavailable: 0 } }
  template:
    metadata: { labels: { app: api, version: "1.4.2" } }
    spec:
      serviceAccountName: api
      securityContext: { runAsNonRoot: true, runAsUser: 10001 }
      containers:
        - name: api
          image: harbor.example.com/team/api:1.4.2
          ports: [{ containerPort: 8000 }]
          envFrom: [{ configMapRef: { name: api-config } }, { secretRef: { name: api-secrets } }]
          resources:
            requests: { cpu: 250m, memory: 256Mi }
            limits:   { cpu: "1",  memory: 512Mi }
          readinessProbe: { httpGet: { path: /health, port: 8000 }, periodSeconds: 5 }
          livenessProbe:  { httpGet: { path: /health, port: 8000 }, initialDelaySeconds: 15, periodSeconds: 10 }
          lifecycle: { preStop: { exec: { command: ["sleep", "5"] } } }   # let the LB stop sending traffic first
      terminationGracePeriodSeconds: 30
---
apiVersion: v1
kind: Service
metadata: { name: api, namespace: shop }
spec:
  selector: { app: api }              # routes to pods with this label
  ports: [{ port: 80, targetPort: 8000 }]
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api
  namespace: shop
  annotations: { cert-manager.io/cluster-issuer: letsencrypt }
spec:
  ingressClassName: nginx
  tls: [{ hosts: [api.example.com], secretName: api-tls }]
  rules:
    - host: api.example.com
      http: { paths: [{ path: /, pathType: Prefix, backend: { service: { name: api, port: { number: 80 } } } }] }
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: api, namespace: shop }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: api }
  minReplicas: 3
  maxReplicas: 20
  metrics: [{ type: Resource, resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } } }]
```

## 12. Storage, jobs, RBAC and network policy YAML
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata: { name: pgdata }
spec:
  accessModes: [ReadWriteOnce]        # RWO (one node), ROX (many nodes read-only), RWX (many nodes read-write: NFS/file storage), RWOP
  storageClassName: fast-ssd          # the StorageClass's CSI driver provisions a volume dynamically
  resources: { requests: { storage: 50Gi } }
---
apiVersion: batch/v1
kind: CronJob
metadata: { name: purge-old-data }
spec:
  schedule: "0 2 * * *"               # 02:00 daily
  concurrencyPolicy: Forbid           # don't overlap runs (the lesson of your cron story!)
  jobTemplate:
    spec:
      backoffLimit: 3
      template:
        spec:
          restartPolicy: OnFailure
          containers: [{ name: purge, image: team/tools:1.0, args: ["purge", "--older-than", "30d"] }]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { name: pod-reader, namespace: shop }
rules: [{ apiGroups: [""], resources: [pods, pods/log], verbs: [get, list, watch] }]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: { name: read-pods, namespace: shop }
subjects: [{ kind: ServiceAccount, name: monitoring, namespace: shop }]
roleRef: { kind: Role, name: pod-reader, apiGroup: rbac.authorization.k8s.io }
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: db-allow-api-only, namespace: shop }
spec:
  podSelector: { matchLabels: { app: postgres } }
  policyTypes: [Ingress]
  ingress: [{ from: [{ podSelector: { matchLabels: { app: api } } }], ports: [{ port: 5432 }] }]
```

**StatefulSet** essentials: `serviceName` (a headless Service), `volumeClaimTemplates` (one PVC per replica: `data-kafka-0`, `data-kafka-1`), ordered start/stop, stable DNS (`kafka-0.kafka.ns.svc.cluster.local`).

## 13. Pod design patterns

- **Init containers:** run to completion before the app starts (wait for a DB, run migrations, fetch config).
- **Sidecar:** a helper container in the same pod (log shipper, service-mesh proxy like Envoy, config reloader). Kubernetes now has native sidecar support (an init container with `restartPolicy: Always`).
- **Ambassador** (a local proxy to external services), **adapter** (normalise output, e.g. metrics format).
- **Labels** (identifying, used by selectors) vs **annotations** (non-identifying metadata used by tools).

## 14. Kubernetes networking model

- **Every pod gets its own IP**; all pods can reach all pods without NAT (unless NetworkPolicies restrict them). Containers in one pod share the network namespace (talk over `localhost`).
- Implemented by a **CNI plugin** (Calico, Cilium (eBPF-based), Flannel, cloud CNIs).
- **Services** give stable virtual IPs; **kube-proxy** (iptables/IPVS) or eBPF does the load balancing; **CoreDNS** resolves service names.
- **Ingress controller** (nginx, Traefik, cloud LBs) or the newer **Gateway API** for north-south HTTP traffic; a **service mesh** (Istio, Linkerd) for east-west mTLS, retries and traffic splitting.

## 15. Extending Kubernetes

- **CRDs (custom resource definitions):** add your own resource types (e.g. KEDA's `ScaledObject`, cert-manager's `Certificate`).
- **Operators:** controllers that manage complex stateful apps using CRDs ("a Kafka cluster" → Strimzi creates and heals the brokers). Encodes operational knowledge as code.
- **Admission controllers / webhooks:** validate or mutate objects on creation (enforce "no root containers", inject sidecars). Policy engines: OPA Gatekeeper, Kyverno.
- **Pod Security Standards:** privileged / baseline / restricted, enforced per namespace.

## 16. Helm
```
mychart/
├── Chart.yaml           # name, version, appVersion
├── values.yaml          # defaults (image tag, replicas, resources)
├── values-prod.yaml     # environment overrides
└── templates/
    ├── deployment.yaml  # uses {{ .Values.image.tag }}, {{ .Release.Name }}
    ├── service.yaml
    └── _helpers.tpl
```
```bash
helm install api ./mychart -n shop -f values-prod.yaml
helm upgrade --install api ./mychart --set image.tag=1.4.3
helm rollback api 2; helm history api; helm template ./mychart   # render locally to check the YAML
```

## 17. Cluster operations

- **kubeconfig and contexts:** `kubectl config get-contexts`, `use-context prod`; namespaces via `-n` or `kubens`.
- **Node maintenance:** `kubectl cordon node1` (no new pods), `kubectl drain node1 --ignore-daemonsets` (evict, respecting PodDisruptionBudgets), `uncordon`.
- **Upgrades:** control plane first, then nodes, one minor version at a time.
- **etcd backups:** `etcdctl snapshot save` (the cluster's entire state lives there).
- **Managed Kubernetes:** EKS, GKE, AKS, plus enterprise distributions (OpenShift, VMware Tanzu/TKG; PKS was Tanzu's predecessor).

## 18. Completing Docker and Kubernetes from A to Z

### Course map
```
Docker: containers vs VMs · architecture (CLI, dockerd, containerd, runc, registries) · images & layers · Dockerfile (every
  instruction) · building (cache, multi-stage, BuildKit, multi-arch) · running (ports, env, volumes, limits, restart) · networking
  · storage · Compose · registries & tagging · security & scanning · debugging · Swarm (built-in orchestration)
Kubernetes: architecture (control plane, nodes) · kubectl & kubeconfig · pods · workloads (Deployment, ReplicaSet, StatefulSet,
  DaemonSet, Job, CronJob) · services & networking (CNI, DNS, Ingress, Gateway API, NetworkPolicy) · config (ConfigMap, Secret)
  · storage (PV, PVC, StorageClass, CSI) · probes · resources/QoS · scheduling (affinity, taints, topology spread) · autoscaling
  (HPA, VPA, KEDA, cluster autoscaler) · rollouts · RBAC & security · namespaces, quotas, limits · Helm & Kustomize · operators/CRDs
  · observability · troubleshooting · local clusters · managed Kubernetes · upgrades & backups
```

### Local Kubernetes for learning
`kind create cluster` (Kubernetes in Docker), `minikube start`, `k3d` (lightweight k3s), or Docker Desktop's built-in cluster. Then `kubectl get nodes` and apply the YAML from §11.

### Namespaces, quotas and limit ranges (multi-team clusters)
```yaml
apiVersion: v1
kind: ResourceQuota
metadata: { name: team-quota, namespace: telemetry }
spec:
  hard: { requests.cpu: "20", requests.memory: 64Gi, limits.cpu: "40", limits.memory: 128Gi, pods: "200", persistentvolumeclaims: "20" }
---
apiVersion: v1
kind: LimitRange
metadata: { name: defaults, namespace: telemetry }
spec:
  limits:
    - type: Container
      default:        { cpu: 500m, memory: 512Mi }    # applied if a container doesn't set limits
      defaultRequest: { cpu: 100m, memory: 128Mi }
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: api-pdb, namespace: shop }
spec: { minAvailable: 2, selector: { matchLabels: { app: api } } }   # node drains never take api below 2 pods
```

### Service accounts and pod identity
Every pod runs as a **ServiceAccount**; Kubernetes mounts a short-lived token so the pod can call the API server (limited by RBAC). In the cloud, workload identity (IRSA on EKS, Workload Identity on GKE) maps a ServiceAccount to a cloud IAM role, so no long-lived keys sit in Secrets.

### Kustomize (overlays without templates)
```
k8s/
├── base/ (deployment.yaml, service.yaml, kustomization.yaml)
└── overlays/
    ├── dev/kustomization.yaml    → patches: replicas 1, image tag dev
    └── prod/kustomization.yaml   → patches: replicas 6, resources, HPA
kubectl apply -k k8s/overlays/prod
```

### Storage via CSI
The **Container Storage Interface** lets storage vendors (Dell PowerScale/PowerStore/PowerFlex, AWS EBS/EFS, Ceph) provide drivers, so a `StorageClass` can dynamically provision volumes, snapshots and clones. **RWX** (many pods reading and writing the same volume) needs a file system backend like NFS/PowerScale/EFS/CephFS, which is where NAS fits into Kubernetes.

### Docker Swarm (in one paragraph)
Docker's built-in, simpler orchestrator: `docker swarm init`, `docker service create --replicas 3 -p 80:80 nginx`, stacks from Compose files. It's easy to learn but much less capable and less used than Kubernetes; know it exists.

### Debugging toolkit, completed
`kubectl debug -it <pod> --image=busybox --target=<container>` (an ephemeral debug container), `kubectl exec -it <pod> -- sh`, `kubectl port-forward`, `kubectl get events -A --sort-by=.lastTimestamp`, `kubectl describe node` (pressure, allocatable), `kubectl top`, `kubectl auth can-i create pods --as=system:serviceaccount:shop:api`, `stern`/`kubectl logs -l app=api -f --prefix` (logs from many pods), `k9s` (a terminal UI).

## Interview Q&A

**Q: What happens when you run `kubectl apply -f deployment.yaml`?** kubectl → API server (authn/authz/admission) → stored in etcd → the Deployment controller creates a ReplicaSet → the ReplicaSet creates Pods → the scheduler assigns nodes → each kubelet pulls images and starts containers → probes → Endpoints update → the Service routes traffic.
**Q: Deployment vs StatefulSet?** Interchangeable pods vs stable identity + storage + ordering.
**Q: Liveness vs readiness?** Restart vs remove from traffic.
**Q: CrashLoopBackOff, how do you debug it?** `describe` events, `logs --previous`, config/secrets, dependencies, probes, resource limits.
**Q: Why KEDA instead of HPA?** Event-driven metrics (lag/queue depth) + scale to zero; CPU doesn't reflect queue backlog for I/O-bound workers.
**Q: How does a Service find pods?** A label selector → Endpoints/EndpointSlices → kube-proxy rules.
**Q: Requests vs limits?** Scheduling guarantee vs runtime cap (CPU throttling vs memory OOMKill).
**Q: Container vs VM?** Shared kernel, namespaces + cgroups vs a hypervisor with full guest OSes.

## Quick revision

- Containers = namespaces (see) + cgroups (use) + layered images (overlayfs). Multi-stage, non-root, no secrets in images, `.dockerignore`, exec-form CMD.
- K8s: API server, etcd, scheduler, controllers, kubelet, kube-proxy; declarative reconciliation.
- Pod/Deployment/StatefulSet/DaemonSet/Job; Service types; Ingress; ConfigMap/Secret (base64); PV/PVC/StorageClass.
- Probes (liveness restart, readiness traffic, startup); requests/limits; OOMKilled 137; debugging states.
- Rolling/blue-green/canary; graceful SIGTERM; HPA vs KEDA (your lag-based scaling, capped at partitions); Helm/GitOps; Vault.

# 08 · Computer Networks

**Why networking is layered:** sending data across the world involves very different problems: electrical signals, local delivery, routing across networks, reliability, and application meaning. **Layering** lets each problem be solved independently: TCP doesn't care if it runs over Wi-Fi or fibre, and HTTP doesn't care how TCP retransmits.

**Why it matters for you:** syslog forwarding over **TLS/TCP** (you generated CA and server certificates with OpenSSL), REST APIs (OneFS PAPI on port 8080, FastAPI), Kafka and RabbitMQ over TCP, Kubernetes services, load balancers, and DNS. Storage companies ask about NFS/SMB/iSCSI, which run over these protocols.

---

## Start here: networks in plain words

**The postal system analogy:**

| Postal world | Network world |
|---|---|
| A house address (street, city) | **IP address** (which computer) |
| A flat number inside the building | **port** (which program on that computer: 443 = the web server) |
| The phone book that turns a name into an address | **DNS** (google.com → 142.250.x.x) |
| Registered post: tracked, guaranteed, in order, with a receipt | **TCP** |
| A postcard: cheap and fast, but it might get lost | **UDP** |
| A sealed, tamper-proof envelope only the receiver can open | **TLS/HTTPS** |
| Sorting offices that forward letters towards the destination | **routers** |
| The building's internal mail room | **switch** (the local network) |
| The building's reception that sends visitors to the right desk | **load balancer** |
| Writing the letter in a language both sides understand | **HTTP** (an application protocol) |

### Layers: each one does one job
```
 Sender                                                     Receiver
 Application  HTTP: "GET /index.html"                       Application  reads the HTTP request
     ▼ add TCP header (ports, sequence numbers)                  ▲ remove the TCP header
 Transport    [TCP | HTTP data]                             Transport
     ▼ add IP header (source/destination IP)                     ▲ remove the IP header
 Network      [IP | TCP | HTTP data]                        Network
     ▼ add Ethernet header (MAC addresses) + trailer             ▲ remove the frame
 Link         [ETH | IP | TCP | HTTP | CRC]  ───bits on a wire/radio───►  Link
```

Like putting a letter in an envelope, inside a courier bag, inside a truck: each layer adds its own wrapping and only reads its own label.

### How your request crosses the internet
```
 Laptop ──Wi-Fi──► Home router (NAT: private 192.168.x → public IP) ──► ISP network
   ──► Internet backbone (many routers, BGP decides paths between networks)
   ──► Cloud/datacentre edge ──► Load balancer ──► Web/app servers ──► database
 DNS first: "what's the IP of api.example.com?" → resolver → root → .com → example.com's DNS → IP
```

### The handshakes, visually
```
TCP 3-way handshake                    TLS 1.3 (on top of TCP)
Client          Server                 Client                       Server
  │── SYN ──────►│                       │── ClientHello + key share ─►│
  │◄── SYN-ACK ──│                       │◄─ ServerHello + key share ──│
  │── ACK ──────►│  connection open      │   + certificate + Finished  │
  │══ data ═════►│                       │── Finished ────────────────►│
                                         │══ encrypted HTTP ══════════►│
```

## 0. Basics

**Network types:** PAN (Bluetooth), **LAN** (an office/building; Ethernet, Wi-Fi), MAN (a city), **WAN** (across cities/countries; the internet is the biggest), plus SAN (storage area network, file 11) and VPN (a private network over a public one).

**Topologies:** bus, star (the most common LAN: everything connects to a switch), ring, mesh (full/partial; resilient: backbone/datacentre networks), tree, hybrid. Datacentres use **leaf-spine** (Clos) topologies.

**Transmission modes:** simplex (one way), half-duplex (both ways, one at a time: walkie-talkie, old Wi-Fi), full-duplex (both at once: modern Ethernet).

**Switching:** **circuit switching** (a dedicated path for the whole call: the old telephone network) vs **packet switching** (data split into packets routed independently: the internet; efficient, but variable delay).

**Delays in a network:** processing + queuing + **transmission** (packet size ÷ bandwidth) + **propagation** (distance ÷ signal speed, about 2×10⁸ m/s in fibre). **Bandwidth** = capacity; **throughput** = what you actually get; **latency** = delay; **jitter** = variation in latency. **Bandwidth-delay product** = how much data is "in flight"; TCP windows must be at least this big to fill a fast long link.

**Addressing at each layer:** MAC address (48-bit, a hardware address on the local network, e.g. `3c:22:fb:12:ab:cd`), IP address (logical, routable), port (16-bit; identifies the process/service).

**Common ports:** 20/21 FTP, **22 SSH**, 23 Telnet, 25 SMTP, **53 DNS**, 67/68 DHCP, **80 HTTP**, 110 POP3, 123 NTP, 143 IMAP, 161 SNMP, 389 LDAP, **443 HTTPS**, 445 SMB, **514 syslog (UDP)** / 6514 syslog over TLS, 2049 NFS, 3306 MySQL, 5432 PostgreSQL, **5672 RabbitMQ (AMQP)**, 6379 Redis, **9092 Kafka**, 9200 Elasticsearch, 9090 Prometheus, 3000 Grafana, 8080 (common alt HTTP; also OneFS PAPI), 27017 MongoDB, 6443 Kubernetes API.

## 1. Models

| OSI layer | TCP/IP layer | What it does | Examples |
|---|---|---|---|
| 7 Application | Application | Meaning for apps | HTTP, DNS, SMTP, SSH, NFS, SMB, gRPC |
| 6 Presentation | | Encoding, encryption | TLS (roughly), JSON, compression |
| 5 Session | | Sessions | (TLS sessions, RPC) |
| 4 Transport | Transport | Process-to-process delivery, ports, reliability | **TCP, UDP**, QUIC |
| 3 Network | Internet | Host-to-host routing across networks | **IP**, ICMP, routing (BGP, OSPF) |
| 2 Data link | Link | Delivery on the local network, MAC addresses, frames | Ethernet, Wi-Fi, ARP, switches |
| 1 Physical | | Bits on the wire | cables, fibre, radio |

**Encapsulation:** HTTP data → TCP segment (+ ports) → IP packet (+ IP addresses) → Ethernet frame (+ MAC addresses).

**Devices:** a **hub** (L1, repeats to all; obsolete), a **switch** (L2, forwards by MAC), a **router** (L3, forwards by IP between networks), a **load balancer** (L4 or L7).

## 2. IP addressing

- **IPv4:** 32 bits (`10.1.2.3`); **IPv6:** 128 bits.
- **CIDR:** `10.0.0.0/24` = the first 24 bits are the network → 256 addresses (254 usable hosts). `/16` = 65,536.
- **Private ranges:** `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`. Not routable on the internet.
- **NAT:** many private hosts share one public IP; the router rewrites addresses and ports (home routers, cloud NAT gateways).
- **ARP:** finds the MAC address for an IP on the local network.
- **DHCP:** gives a machine its IP, gateway and DNS server automatically.
- **Subnet mask / default gateway:** traffic to other networks goes to the gateway (router).

## 3. TCP vs UDP (always asked)

| | TCP | UDP |
|---|---|---|
| Connection | Connection-oriented (handshake) | Connectionless |
| Reliability | Guaranteed delivery, retransmission, ordering | Best effort; may lose, duplicate, reorder |
| Flow/congestion control | Yes | No |
| Header | 20+ bytes | 8 bytes |
| Speed / latency | More overhead | Lower latency |
| Use | HTTP/1.1–2, SSH, databases, Kafka, RabbitMQ, **TLS syslog** | DNS queries, video calls, gaming, streaming, QUIC (HTTP/3), classic syslog (UDP 514) |

**Your syslog story:** classic syslog over **UDP 514** silently drops messages under load and is unencrypted. For audit/compliance logs you need reliable, confidential delivery, so **TCP + TLS**.

## 4. TCP in depth

### Three-way handshake (connection setup)
```
Client → SYN (seq = x) → Server
Client ← SYN-ACK (seq = y, ack = x+1) ← Server
Client → ACK (ack = y+1) → Server          → connection ESTABLISHED (1 round trip of latency before data)
```

Why three steps? Both sides must agree on **initial sequence numbers** and confirm the other can send and receive.

### Four-way termination
FIN → ACK → FIN → ACK (each direction closes independently). The side that closes first enters **TIME_WAIT** for 2×MSL (often about 60 s) so delayed packets don't corrupt a new connection on the same ports. Many short-lived connections → lots of TIME_WAIT → use **connection pooling / keep-alive**.

**SYN flood attack:** send many SYNs and never ACK, filling the server's half-open connection queue. Mitigation: SYN cookies.

### Reliability
Sequence numbers + acknowledgements + **retransmission** on timeout, or after 3 duplicate ACKs (fast retransmit). Checksums detect corruption.

### Flow control (protect the **receiver**)
The receiver advertises a **window** (how much buffer it has free). The sender never has more unacknowledged bytes in flight than that.

### Congestion control (protect the **network**)

- **Slow start:** the congestion window starts small and **doubles** every round trip until a threshold.
- **Congestion avoidance:** then grows linearly (**AIMD**: additive increase, multiplicative decrease). Halve on packet loss.
- Algorithms: Reno, **CUBIC** (Linux default), **BBR** (Google; models bandwidth and RTT instead of reacting to loss).

### Other TCP terms
**Nagle's algorithm** (batch small writes; disable with `TCP_NODELAY` for low-latency apps), **keep-alive**, **head-of-line blocking** (one lost packet stalls everything behind it in that connection, because TCP delivers in order).

## 5. DNS

**What happens when you resolve `api.example.com`:**

1. Browser/OS cache → `/etc/hosts` → the configured **recursive resolver** (ISP, 8.8.8.8, cluster DNS).
2. Resolver (if not cached) → a **root** server → "ask the `.com` TLD servers"
3. → `.com` **TLD** server → "ask example.com's **authoritative** servers"
4. → authoritative server → the A record `93.184.x.x`
5. Each answer is cached for its **TTL**.

**Records:** A (IPv4), AAAA (IPv6), **CNAME** (alias to another name), MX (mail), NS (name servers), TXT (verification, SPF), SRV (service + port), PTR (reverse lookup).
DNS uses **UDP 53** for normal queries (TCP for large responses and zone transfers).
**DNS-based load balancing / failover:** return different IPs; the TTL controls how fast changes spread. Low TTL = faster failover, more queries.
**Kubernetes DNS:** `service.namespace.svc.cluster.local` resolves to the Service's ClusterIP.

## 6. HTTP

- A request is a **method + path + headers + optional body**. A response is a **status + headers + body**.
- **Methods:** GET (read; safe, idempotent), POST (create/action; not idempotent), PUT (replace; idempotent), PATCH (partial update), DELETE (idempotent), HEAD, OPTIONS (CORS preflight).
- **Status codes:** 200 OK, 201 Created, 204 No Content, 301/302 redirects, 304 Not Modified, 400 Bad Request, 401 Unauthorized (not authenticated), 403 Forbidden (authenticated but not allowed), 404, 409 Conflict, 422 Unprocessable (validation; FastAPI uses it), **429 Too Many Requests** (rate limit; your extension's daily limit), 500, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout.
- **Headers:** `Content-Type`, `Authorization`, `Cache-Control`, `ETag`/`If-None-Match`, `Cookie`/`Set-Cookie`, `User-Agent`, `Accept`, `Retry-After`, `X-Request-ID` (tracing).
- **Statelessness:** each request carries everything needed (tokens), which lets you put any server behind a load balancer.
- **Cookies vs tokens:** a session cookie means server-side session state; a JWT bearer token is self-contained (more in file 15).

### HTTP versions

| Version | Key change | Remaining problem |
|---|---|---|
| HTTP/1.0 | One request per connection | Handshake cost every time |
| HTTP/1.1 | **Keep-alive** (reuse connections), pipelining (rarely used), Host header | **Head-of-line blocking**: one slow response blocks the connection; browsers open about 6 connections |
| HTTP/2 | **Binary framing, multiplexing many streams on one connection**, header compression (HPACK), server push (deprecated) | TCP-level HOL blocking: one lost packet stalls all streams |
| HTTP/3 | Runs over **QUIC (UDP)**: per-stream reliability, so no TCP HOL; faster handshake (TLS 1.3 built in); connection migration (Wi-Fi → 4G) | Some networks block or throttle UDP |

gRPC runs on HTTP/2 (multiplexing + streaming).

## 7. TLS / HTTPS (you did certificate work; go deep)

**Goals:** **confidentiality** (encryption), **integrity** (tamper detection), **authentication** (you're talking to the real server).

**TLS 1.3 handshake (simplified, 1 round trip):**

1. **ClientHello:** supported ciphers + the client's **key share** (ephemeral Diffie-Hellman public value).
2. **ServerHello:** chosen cipher + the server's key share + its **certificate** + a signature proving it owns the private key + Finished.
3. Both compute the same **session key** from the DH exchange (the secret is never sent). Then **symmetric encryption** (AES-GCM or ChaCha20) is used for the data, because it's fast.
- **Why both asymmetric and symmetric?** Asymmetric crypto (RSA/ECDHE) solves key exchange and identity but is slow. Symmetric is fast, so it's used for the bulk data.
- **Forward secrecy:** ephemeral keys mean that stealing the server's private key later can't decrypt past recorded traffic.
- TLS 1.2 took 2 round trips; TLS 1.3 needs 1, and supports **0-RTT** resumption (with replay risks).

**Certificates and the chain of trust:**

- A certificate binds a **public key to an identity** (CN/**SAN** = hostnames), signed by a **Certificate Authority (CA)**.
- The client trusts a set of **root CAs**. The server sends its certificate plus **intermediates**; the client verifies each signature up to a trusted root, checks validity dates, the hostname (SAN must match!), and revocation (OCSP/CRL).
- **Your OpenSSL workflow:** create a CA key + self-signed CA cert → create a server key + **CSR** (certificate signing request) → the CA signs the CSR → `openssl verify -CAfile ca.crt server.crt` → install the CA on the cluster so it trusts the syslog server's certificate.
- **Most common misconfiguration:** the hostname doesn't match the CN/SAN, or the intermediate certificate is missing.
- **mTLS (mutual TLS):** the client also presents a certificate; used service-to-service (service meshes) and in high-security setups.

## 8. "What happens when you type a URL and press Enter?" (prepare a 3-minute answer)

1. **URL parsing:** scheme, host, path. Check HSTS (force HTTPS).
2. **DNS resolution** (caches → resolver → root → TLD → authoritative).
3. **TCP connection** (3-way handshake) to the IP on port 443. With HTTP/3 it's QUIC over UDP instead.
4. **TLS handshake:** certificate verification, session keys.
5. **HTTP request** sent (GET / with headers and cookies).
6. **On the server side:** CDN/edge → **load balancer** → reverse proxy (nginx) → application server → cache / database → response.
7. **Response:** status + headers + HTML. The browser **parses HTML**, builds the DOM, fetches CSS/JS/images (more requests, reusing the connection), builds the CSSOM, runs JS, lays out and **paints**.
8. **Keep-alive** keeps the connection for later requests; the caches store things according to headers.

## 9. Load balancing

| | L4 (transport) | L7 (application) |
|---|---|---|
| Sees | IP + port | HTTP: path, headers, cookies |
| Can | Forward TCP/UDP fast | Route `/api` vs `/static`, TLS termination, auth, retries, sticky sessions, rate limiting |
| Examples | AWS NLB, LVS, kube-proxy (iptables/IPVS) | AWS ALB, nginx, HAProxy, Envoy, Kubernetes Ingress |

**Algorithms:** round robin, weighted round robin, least connections, least response time, IP hash / **consistent hashing** (keeps the same client on the same server and minimises reshuffling when servers change).
**Health checks** remove dead backends. **Sticky sessions** are convenient but hurt even distribution (prefer stateless servers).

**Reverse proxy vs forward proxy:** a reverse proxy sits in front of **servers** (nginx in front of your app: TLS, caching, routing). A forward proxy sits in front of **clients** (a corporate proxy, VPN).

**CDN:** caches static (and some dynamic) content at edge locations near users, which lowers latency and offloads the origin.

## 10. Sockets (the programming interface)
Server: `socket() → bind() → listen() → accept()` (returns a new socket per client) → `recv/send` → `close`. Client: `socket() → connect() → send/recv`.
A connection is identified by the **4-tuple** (src IP, src port, dst IP, dst port), which is why one server port can hold many connections. Ephemeral client ports come from a range (about 28K by default on Linux), so a huge number of outbound connections to one destination can exhaust it: use pooling.

## 11. WebSockets, SSE, long polling

- **Polling:** the client asks repeatedly (wasteful).
- **Long polling:** the server holds the request until there's data.
- **Server-Sent Events (SSE):** a one-way server → client stream over HTTP; simple, auto-reconnects. **Your extension's chat streams the model's answer** to the side panel token by token (a streaming HTTP response), the same idea.
- **WebSocket:** a full-duplex persistent connection (starts with an HTTP Upgrade). Chat apps, live dashboards, games.

## 12. Storage networking (for storage interviews)

- **NFS** (Network File System; Unix; v3 stateless, v4 stateful with locking and better security) and **SMB/CIFS** (Windows file sharing): **file-level** protocols, which PowerScale/OneFS serves (it's a NAS). OneFS also speaks **HDFS** and **S3**.
- **iSCSI** (SCSI commands over TCP/IP) and **Fibre Channel** (a dedicated network): **block-level** protocols for SANs.
- **NVMe over Fabrics (NVMe-oF):** NVMe commands over RDMA/TCP/FC for very low latency.
- **RDMA:** network cards read/write remote memory directly, bypassing the CPU (low latency).
- **Jumbo frames:** MTU 9000 instead of 1500, so less per-packet overhead for storage traffic.

## 13. Network troubleshooting toolkit
`ping` (reachability, ICMP), `traceroute`/`mtr` (path, hop latency), `dig` (DNS), `curl -v` (HTTP + TLS details), `openssl s_client -connect host:443 -showcerts` (inspect certificate chains: useful for your syslog TLS work), `ss -tan` (connections and states), `tcpdump` / Wireshark (packets), `nc -zv host port` (port open?), `ip route` (routing).

**Debug flow for "service X can't reach Y":** DNS resolves? → port reachable (`nc`)? → firewall/security group? → TLS errors (certificate/hostname)? → HTTP status codes? → application logs.

## 14. Network layer in depth

### IPv4 header (key fields)
Version, header length, **TTL** (decremented at each router; 0 → dropped, which is how `traceroute` works), **protocol** (6 = TCP, 17 = UDP, 1 = ICMP), source/destination IP, header checksum, identification + flags + fragment offset (fragmentation when a packet exceeds a link's **MTU**, typically 1500 bytes on Ethernet).

### Subnetting: worked example
Network `192.168.10.0/26`:

- /26 → 26 network bits, 6 host bits → 2⁶ = **64 addresses**, **62 usable hosts** (minus network and broadcast).
- Mask = 255.255.255.**192**.
- Subnets of 192.168.10.0/24 split into /26: `.0–.63`, `.64–.127`, `.128–.191`, `.192–.255`.
- For `192.168.10.0/26`: network = .0, first host = .1, last host = .62, broadcast = .63.
- Is `192.168.10.70` in the same subnet as `.10`? No: .70 is in the .64/26 subnet → traffic goes through the router.
**Quick table:** /24 = 256 (254 hosts), /25 = 128, /26 = 64, /27 = 32, /28 = 16, /29 = 8, /30 = 4 (2 hosts: point-to-point links), /32 = a single host.
**Classful addressing (legacy):** A 1–126 (/8), B 128–191 (/16), C 192–223 (/24), D 224–239 multicast, E reserved. CIDR replaced classes. `127.0.0.0/8` is loopback; `169.254.0.0/16` is link-local (no DHCP answer).

### IPv6
128-bit addresses written as hex groups (`2001:db8::1`; `::` compresses zeros). No NAT needed (huge address space), no broadcast (multicast instead), a simpler fixed header, built-in autoconfiguration (SLAAC), and IPsec support. Dual-stack networks run IPv4 and IPv6 together.

### ICMP
Control and error messages: echo request/reply (`ping`), destination unreachable, time exceeded (TTL hit 0 → `traceroute` uses this), fragmentation needed (path MTU discovery). Blocking all ICMP breaks path MTU discovery and causes mysterious hangs.

### Routing

- **Routing table:** destination prefix → next hop/interface; **longest prefix match** wins. `ip route` shows it.
- **Static routing** (manual) vs **dynamic routing** (protocols):
  - **Distance vector:** RIP (hop count; neighbours share tables; slow convergence, count-to-infinity).
  - **Link state:** **OSPF** (each router knows the full topology and runs Dijkstra; fast convergence; inside an organisation).
  - **Path vector:** **BGP** (between autonomous systems: the protocol that glues the internet together; policy-based).
- **Interior vs exterior gateway protocols:** OSPF/IS-IS inside an AS; BGP between ASes.

### DHCP (DORA)
**D**iscover (client broadcasts) → **O**ffer (server offers an IP) → **R**equest (client requests it) → **A**cknowledge. Leases expire and renew. Also hands out the gateway, DNS servers and subnet mask.

### NAT and PAT
**NAT** rewrites private source IPs to a public IP. **PAT** (port address translation, "NAT overload") maps many internal hosts to one public IP using different source ports; the router keeps a translation table. Consequence: inbound connections need **port forwarding**; peer-to-peer apps need NAT traversal (STUN/TURN).

## 15. Data link layer

- **Ethernet frame:** preamble, destination MAC, source MAC, EtherType (e.g. IPv4), payload (46–1500 bytes), **CRC** (frame check sequence).
- **Switches** learn which MAC is on which port (a MAC address table) and forward frames only there. Unknown destination → flood. **Spanning Tree Protocol** prevents loops.
- **ARP:** "Who has 10.0.0.5? Tell 10.0.0.1" (broadcast) → the reply gives the MAC; cached in the ARP table (`ip neigh`). **ARP spoofing** is an attack on this.
- **VLANs** split one physical switch into isolated broadcast domains (802.1Q tags). Traffic between VLANs goes through a router/L3 switch.
- **Error detection:** parity bit (detects single-bit errors), **checksum** (TCP/UDP/IP: sum of 16-bit words), **CRC** (polynomial division; strong at detecting burst errors; used in Ethernet and storage).
- **Error control (ARQ):**
  - **Stop-and-wait:** send one frame, wait for its ACK. Simple, slow on long links.
  - **Go-Back-N:** send up to N unacknowledged frames; on a loss, resend from the lost frame onward.
  - **Selective Repeat:** resend only the lost frames; the receiver buffers out-of-order frames. (TCP with SACK behaves like this.)
- **Sliding window:** the sender may have up to *window size* unacknowledged bytes/frames in flight. It's the mechanism behind TCP flow control.
- **MAC protocols for shared media:** CSMA/CD (classic wired Ethernet: detect collisions), CSMA/CA (Wi-Fi: avoid collisions).

## 16. TCP header (key fields)
Source/destination port, **sequence number**, **acknowledgement number**, header length, **flags** (SYN, ACK, FIN, RST, PSH, URG), **window size** (flow control), checksum, options (MSS, window scaling, SACK, timestamps).
**RST** = abort the connection (e.g. connecting to a closed port gives "connection refused").
**Connection states:** LISTEN, SYN_SENT, SYN_RECEIVED, ESTABLISHED, FIN_WAIT_1/2, CLOSE_WAIT (**lots of CLOSE_WAIT = your app isn't closing sockets: a bug**), LAST_ACK, TIME_WAIT, CLOSED.

## 17. Security in the network

- **Firewalls:** stateless (packet filters: rules by IP/port) vs **stateful** (tracks connections, so return traffic is allowed automatically) vs application/L7 firewalls and WAFs (inspect HTTP: block SQL injection patterns). Cloud: security groups (stateful) and network ACLs (stateless).
- **VPN:** an encrypted tunnel over the public internet. **IPsec** (network layer: site-to-site), **TLS/SSL VPNs** and **WireGuard** (modern, simple).
- **DMZ:** a network zone for public-facing servers, separated from the internal network.
- **Common attacks:** DDoS (volumetric, SYN flood, application-layer floods), man-in-the-middle, DNS spoofing/cache poisoning, ARP spoofing, port scanning. Mitigations: TLS everywhere, DNSSEC, rate limiting, CDNs/scrubbing services, network segmentation, zero trust.
- **SSH:** encrypted remote shell (port 22); key-based auth (`ssh-keygen`, `~/.ssh/authorized_keys`), port forwarding, `scp`/`sftp`.

## 18. Other application protocols

- **Email:** SMTP (sending, 25/587), POP3 (download and delete), IMAP (sync with the server). SPF/DKIM/DMARC (DNS records that fight spoofing).
- **FTP** (21: separate control and data connections; insecure) → use SFTP (over SSH) or FTPS.
- **NTP:** clock synchronisation (important for logs, TLS certificate validity and distributed systems).
- **SNMP:** device monitoring (storage arrays and switches expose metrics via SNMP; OneFS supports it).
- **LDAP / Active Directory:** directory/identity services (NAS systems integrate with AD for SMB permissions).

## 19. HTTP state: cookies, sessions, CORS

- **Cookies:** the server sets `Set-Cookie: sid=abc; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`; the browser sends it back automatically. `HttpOnly` blocks JS access (XSS protection), `Secure` sends it only over HTTPS, `SameSite` limits cross-site sending (CSRF protection).
- **Sessions:** the server stores state keyed by the session ID (in memory, Redis or a DB).
- **CORS:** browsers block JS from reading responses from another origin unless the server allows it (`Access-Control-Allow-Origin`). "Non-simple" requests (e.g. JSON POST with custom headers) trigger an **OPTIONS preflight**. *(Your extension backend must allow the extension's origin.)* CORS is enforced by **browsers**, not servers: curl ignores it.

## 20. Socket programming: a TCP echo server and client
```python
# server.py
import socket
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)   # avoid "address in use" after restarts (TIME_WAIT)
    srv.bind(("0.0.0.0", 9000)); srv.listen(128)               # backlog of pending connections
    while True:
        conn, addr = srv.accept()                                # new socket per client
        with conn:
            while data := conn.recv(4096):                       # empty bytes = the client closed
                conn.sendall(data)

# client.py
with socket.create_connection(("localhost", 9000), timeout=5) as c:
    c.sendall(b"hello"); print(c.recv(4096))
```

This server handles **one client at a time**. Real servers use threads, a process pool, or an event loop (`asyncio.start_server`, built on epoll/kqueue) to serve thousands at once. **TCP is a byte stream, not messages:** you need framing (length prefixes or delimiters like newline-delimited JSON).
UDP version: `SOCK_DGRAM`, `sendto`/`recvfrom`, no connection, each datagram is independent.

## 21. Completing networks from A to Z

### Networks course map (everything in this file)
```
Basics: network types · topologies · transmission modes · switching · delays & bandwidth · addressing (MAC/IP/port)
Models: OSI · TCP/IP · encapsulation
Physical & link: media · Ethernet frames · switches · ARP · VLANs · STP · error detection (parity/checksum/CRC) · ARQ · MAC protocols · Wi-Fi
Network: IPv4 header · subnetting/CIDR · NAT/PAT · DHCP · ICMP · IPv6 · routing (static, RIP, OSPF, BGP) · unicast/multicast/anycast
Transport: ports · TCP (header, handshake, states, reliability, flow & congestion control) · UDP · QUIC
Application: DNS · HTTP/1.1/2/3 · TLS · cookies/CORS · email · FTP/SFTP · SSH · NTP · SNMP · LDAP · WebSockets/SSE
Infrastructure: load balancers · proxies · CDNs · firewalls · VPNs · QoS · SDN · datacentre topologies
Storage networking: NFS · SMB · iSCSI · FC · NVMe-oF · RDMA
Practice: sockets programming · troubleshooting tools · security attacks & defences
```

### Unicast, broadcast, multicast, anycast

- **Unicast:** one sender → one receiver (most traffic).
- **Broadcast:** one → everyone on the local network (ARP, DHCP discovery). IPv6 has no broadcast.
- **Multicast:** one → a subscribed group (`224.0.0.0/4`; IGMP manages membership): video streaming inside networks, cluster discovery.
- **Anycast:** the same IP announced from many locations; routing delivers you to the **nearest** one (public DNS resolvers like 8.8.8.8, CDNs).

### Wi-Fi basics (802.11)
Access points connect wireless clients to the wired network. Standards: 802.11n (Wi-Fi 4), ac (Wi-Fi 5), ax (Wi-Fi 6/6E), be (Wi-Fi 7). Bands: 2.4 GHz (longer range, more interference), 5 GHz and 6 GHz (faster, shorter range). Security: WPA2/**WPA3** (WEP and WPA are broken). Shared medium → CSMA/CA, so wireless latency is less predictable than wired.

### Quality of service (QoS)
Prioritise some traffic over other traffic when links are congested: classify and mark packets (DSCP field), queue them by class (voice > video > bulk), shape or police rates. Storage and replication traffic is often isolated on separate VLANs/networks for the same reason.

### Datacentre networking and SDN

- **Leaf-spine (Clos) topology:** every leaf switch (top of rack) connects to every spine switch, giving equal-cost paths and predictable latency (ECMP load-balances across them).
- **SDN (software-defined networking):** separate the **control plane** (decides routes; centralised software) from the **data plane** (forwards packets in switches), so networks are programmable. Cloud VPCs and Kubernetes CNIs build virtual overlay networks (VXLAN) on top of physical ones.
- **East-west** (server ↔ server inside the datacentre) vs **north-south** (users ↔ datacentre) traffic.

### Throughput maths you might be asked

- **Transmission time** = size ÷ bandwidth: 1 MB over 100 Mbps = 8 Mb ÷ 100 Mbps = **80 ms**.
- **Bandwidth-delay product** = bandwidth × RTT: 1 Gbps × 100 ms = 100 Mb ≈ 12.5 MB must be "in flight" to fill the pipe, so the TCP window must be at least that big (window scaling).
- **Max TCP throughput per connection** ≈ window ÷ RTT: a 64 KB window with 100 ms RTT ≈ 5.2 Mbps, however fast the link is.

## Interview traps

1. TCP vs UDP with real examples (and when you'd choose UDP).
2. Why a 3-way handshake (not 2)? Sequence numbers in both directions.
3. TIME_WAIT: why it exists and what problem it causes.
4. 401 vs 403. 502 vs 504.
5. HTTP/2 vs HTTP/3 head-of-line blocking.
6. How does HTTPS stop a man-in-the-middle? The certificate chain + hostname check + the private-key signature.
7. Symmetric vs asymmetric encryption: why TLS uses both.
8. L4 vs L7 load balancers.

## Quick revision

- OSI vs TCP/IP. Encapsulation. Switch = L2/MAC, router = L3/IP.
- TCP: handshake, reliability, flow control (receiver window), congestion control (slow start, AIMD, CUBIC/BBR), TIME_WAIT. UDP: fast, no guarantees.
- DNS chain + TTL + record types. HTTP methods/status codes; 1.1 → 2 (multiplexing) → 3 (QUIC).
- TLS 1.3: ECDHE key share, certificate chain, SAN match, symmetric bulk encryption, forward secrecy. Your CA/CSR/verify flow.
- URL-to-page walk-through. L4/L7 LB, reverse proxy, CDN. NFS/SMB (file) vs iSCSI/FC (block).

# SDE Handbook

A complete, beginner-to-advanced study plan for **SDE 2, Backend, DevOps and AI engineering** roles: data structures and algorithms, C/C++, Python, Scala, OOP and design patterns, operating systems, networks, databases, storage, distributed systems, Kafka/RabbitMQ, system design, backend and microservices, Docker/Kubernetes, CI/CD, observability, security, LLMs, RAG, agents and more. Every topic starts in plain words, then goes deep, with diagrams and code.

**Read it online:** https://gopal2804.github.io/sde-handbook/

## Run it locally
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
mkdocs serve            # open http://127.0.0.1:8000 (reloads as you edit)
```

## Structure
- `docs/`: all pages (Markdown); `docs/index.md` is the 20-day plan
- `mkdocs.yml`: site settings and navigation
- `.github/workflows/deploy.yml`: builds and publishes the site to GitHub Pages on every push to `main`

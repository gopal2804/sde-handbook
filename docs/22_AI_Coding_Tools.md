# 22 · AI Coding Tools: GitHub Copilot, Claude Code (Claude CLI), Devin CLI / Devin IDE

**Why these tools exist:** a large share of engineering time goes to boilerplate, searching code, reading docs, writing tests and debugging. AI assistants started as **autocomplete** (Copilot, 2021) and grew into **agents** that can read a whole repository, run commands, edit many files and open PRs.

**Why interviewers ask:** companies want engineers who use these tools **productively and safely**. They'll ask "Do you use AI tools? How? How do you make sure the code is correct and secure?" You have a strong, uncommon answer: you **evaluated Copilot** as an intern, used **Codeium Enterprise**, **Devin Desktop/CLI** and **Claude CLI** inside Dell's **governed AI workflow** (skills, MCP servers, slash commands, spec-driven development), and built your own AI product with an agentic coding tool.

---

## Start here: AI coding tools in plain words

- **GitHub Copilot:** an AI **pair programmer inside your editor**. It suggests the next lines as you type, answers questions in a chat panel, and (in agent mode) can edit several files and run commands for a task.
- **Claude Code ("Claude CLI"):** an AI **coding agent in your terminal**. You describe a task; it reads your codebase, edits files, runs tests and commands, and iterates, asking permission for risky actions.
- **Devin (CLI and Desktop/IDE):** an **autonomous AI software engineer** from Cognition. You give it a ticket; it plans and works in its own sandbox (shell, editor, browser) and opens a pull request for you to review.
**Analogy:** Copilot is a **helpful co-driver suggesting turns**; Claude Code is a **skilled assistant who takes the wheel for a task while you supervise**; Devin is a **contractor you hand a job to and review afterwards**.

```
 How an AI coding agent works
 You: "Fix the failing test in test_match.py and add a case for Mi/Xiaomi"
   ▼
 Agent (LLM) ──► tools: read files · search code · edit file · run `npm test` · git diff
   ▲                                                           │
   └──────────── reads results (test output, errors) ◄─────────┘    loop until the tests pass
   ▼
 Shows you the diff ──► you review ──► commit / PR ──► CI runs the same checks as for human code
 Context helpers: CLAUDE.md / instructions files · skills · MCP servers (Jira, GitHub) · permission rules
```

## Course map (everything in this file)
```
Concepts: how AI coding tools work (context assembly, FIM completion, agent loops, repo indexing) · evolution · strengths & limits
GitHub Copilot: completions · chat & slash commands · agent mode · coding agent · instructions files · enterprise controls · evaluation
Claude Code: installation & sessions · CLAUDE.md memory · permissions · slash commands · skills · subagents · hooks · MCP · plan mode · headless use
Devin: autonomous sessions · sandbox · playbooks/knowledge · CLI & Desktop/IDE · review flow
Practice: spec-driven development · prompting agents · reviewing AI code · governance · measuring impact · risks (security, licences, slopsquatting)
```

**Getting started (installation):** Copilot = an IDE extension (VS Code, JetBrains) with a GitHub subscription. Claude Code = installed via npm (`npm install -g @anthropic-ai/claude-code`) or the native installer, then run `claude` inside a repo and sign in; it's also available in IDEs, a desktop app and the web. Devin = a web app/desktop app with a CLI, connected to your repos. Enterprise versions add SSO, admin policies and data controls. (Install commands change between versions; check each tool's current docs.)

## 1. The evolution (be able to explain it)

| Generation | What it does | Examples |
|---|---|---|
| Autocomplete | Predicts the next lines in the editor | Early Copilot, Codeium, Tabnine |
| Chat in the IDE | Explain, refactor, generate tests about the selected code | Copilot Chat, Cursor chat |
| **Agentic coding** | Plans multi-step tasks, reads/edits many files, runs tests/commands, iterates until done | **Claude Code**, **Devin**, Copilot agent mode / coding agent, Cursor/Windsurf agents |
| Autonomous cloud agents | Take a ticket, work in a sandbox, open a PR | Devin, Copilot coding agent, Claude Code on the web |

## 2. GitHub Copilot

- Made by GitHub/Microsoft (originally on OpenAI Codex models; now supports several model providers).
- **Features:** inline completions, Copilot Chat (explain code, write tests, fix errors), **agent mode** in VS Code (multi-file edits, runs terminal commands), a **coding agent** that works on assigned issues and opens PRs, PR code review, CLI help.
- **Your internship evaluation:** you evaluated Copilot for **code generation, debugging and test-case generation** on the telemetry platform. Talking points:
  - **Strong:** boilerplate, unit test scaffolding, regexes, common API usage, explaining unfamiliar code, documentation.
  - **Weak:** domain-specific logic (proprietary formats, internal APIs it has never seen), subtle concurrency, and confident but wrong suggestions (outdated library APIs, made-up methods).
  - **Risks:** licence/IP concerns (duplication filters exist), leaking proprietary code to external services (hence enterprise plans with data controls), over-trust by juniors.
  - **Recommendation pattern:** use it for acceleration, keep human review + tests as the gate, and measure (time saved, defect rates), not anecdotes.

## 3. Claude Code (the "Claude CLI")

- Anthropic's **agentic coding tool** that runs in the **terminal** (also in IDEs, a desktop app and the web). It reads your codebase, edits files, runs shell commands and tests, uses Git, and iterates.
- **Key concepts you should know:**
  - **CLAUDE.md:** a project memory file with conventions, commands and architecture notes, loaded automatically each session. (Your extension repo has one with the design rules, layout and run commands.)
  - **Permission modes:** asks before editing files or running commands, unless allowed. Safety and control.
  - **Slash commands and skills:** reusable workflows and instructions (Markdown files) the agent can load.
  - **MCP servers:** connect it to external tools (Jira, GitHub, databases, browsers) through the Model Context Protocol.
  - **Hooks:** run scripts automatically on events (e.g. format or lint after every edit, block risky commands).
  - **Subagents:** delegate focused tasks (search, review) to separate agent contexts.
  - **Plan mode:** propose a plan before making changes.
- **How you used it:** at Dell inside the governed workflow (skills for RCA and threat modelling, MCP servers for Jira/GitHub/Confluence); personally, to build and ship Smart Shopping Agent (FastAPI backend, Chrome extension, evals, CI/CD) and your portfolio.

## 4. Devin (Cognition): Devin CLI, Devin IDE/Desktop

- **Devin** was launched by Cognition in 2024, positioned as an "**AI software engineer**": an autonomous agent with its own sandboxed shell, editor and browser that can take a task, plan it, write code, run tests and open a PR, with a human reviewing.
- **Devin CLI** (terminal agent) and **Devin Desktop/IDE** (an AI-native editor experience). Cognition acquired the **Windsurf** IDE (formerly **Codeium**) in 2025, so the Codeium Enterprise / Windsurf / Devin tools you used come from the same lineage today.
- **At Dell:** Devin Desktop and Devin CLI ran inside the AI governance framework: approved skills imported, standard slash commands configured (`/rca`, `/threat-model`), MCP servers for enterprise data, and engineers running workflows within those boundaries.

## 5. How to use AI coding tools well (your answer to "how do you use AI?")

1. **Spec first.** Write down what you want (inputs, outputs, edge cases, constraints) before generating code. → *spec-driven development*.
2. **Give context:** relevant files, conventions (CLAUDE.md / instructions files), error messages, failing tests.
3. **Small steps:** one change at a time; review each diff.
4. **Tests are the gate:** write or generate tests, and run them. AI-written code without tests is a liability.
5. **Review like a senior:** correctness, edge cases, security (injection, secrets, auth), performance, readability. **You own the code you commit.**
6. **Verify APIs and facts:** AI can invent functions, flags or library versions. Check the docs.
7. **Never paste secrets or confidential code** into unapproved tools. Use enterprise-approved tools with data controls.
8. **Use it for understanding too:** "explain this module", "where is X handled?", "why could this test be flaky?"

## 6. Spec-driven development (a strong current talking point)
```
Requirement → write the SPEC (human) → spec review/approval (gate)
  → AI-assisted implementation against the spec → review against the spec → merge
```
> "When implementation gets cheap and fast, the bottleneck moves upstream to specifying what you actually want. A vague ticket used to produce slow wrong code; now it produces fast wrong code, and the volume makes review harder. So the spec becomes the key artifact, and review means checking the implementation against the agreed spec."

## 7. Governance (why enterprises control these tools)

| Risk | Control |
|---|---|
| Proprietary code/customer data sent to external models | Approved models/vendors, enterprise data agreements, data boundaries |
| Inconsistent, unreviewed AI output | Standard version-controlled skills and commands; mandatory review |
| Blind trust in generated code | Human-in-the-loop; tests and security scans in CI |
| No audit trail | Workflows run through governed, logged pipelines |
| Agents taking risky actions | Permission modes, least-privilege tools, approvals |

## 8. Measuring impact (if asked "did it actually help?")
Look at cycle time (PR open → merge), time to first working version, test coverage, defect/rollback rates, review time, and developer surveys. Watch for hidden costs: bigger PRs, more review load, subtle bugs. "We measured, rather than assumed."

## 9. How these tools work under the hood

- **Context assembly is everything:** the tool gathers the current file, the cursor position, open tabs, related files (by imports or similarity search over the repo), instructions files and recent edits, and packs them into the model's context window.
- **Code completion uses fill-in-the-middle (FIM):** the model sees the code *before and after* the cursor and predicts the middle. Latency matters, so completions use smaller fast models; chat/agents use larger ones.
- **Agents** run the tool-use loop from file 21: read files, search (grep/semantic), edit, run commands/tests, read the output, iterate. Their quality depends on **feedback signals** (tests, type checkers, linters, build errors), which is why good test suites make AI agents dramatically more effective.
- **Repository indexing:** embeddings over code chunks for semantic search ("where do we validate install tokens?").

## 10. Claude Code in practice (commands and config)
```bash
claude                                   # start an interactive session in the current repo
claude -p "explain how guarded() works in backend/app/main.py"   # one-shot (headless) mode; scriptable in CI
/init                                     # generate a CLAUDE.md describing the project
/clear   /compact   /model   /permissions   /mcp      # common in-session slash commands
claude mcp add jira -- python jira_server.py          # register an MCP server
```

**CLAUDE.md example (project memory):**

```markdown
# Project: Smart Shopping Agent
- Backend: FastAPI in backend/app; run tests with `cd backend && .venv/bin/python -m pytest tests`
- Rule: code computes, the model narrates. Never let the LLM produce prices or counts.
- Every behaviour change needs a test or an eval case.
- Never print or commit OPENAI_API_KEY; scan staged files for secrets before committing.
```

**Settings (`.claude/settings.json`): permissions and hooks:**

```json
{
  "permissions": {
    "allow": ["Bash(npm test:*)", "Bash(pytest:*)", "Read(./**)"],
    "deny":  ["Read(./.env)", "Bash(rm -rf:*)"]
  },
  "hooks": {
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [ { "type": "command", "command": "ruff format --quiet ." } ] }
    ]
  }
}
```

- **Custom slash commands:** Markdown prompt files in `.claude/commands/` (e.g. `rca.md` → `/rca`).
- **Skills:** folders with a `SKILL.md` (instructions + optional scripts) that the agent loads when relevant: the "skills" idea you used at Dell.
- **Subagents:** specialised agents defined in `.claude/agents/` (a code reviewer, a test writer) with their own instructions and tool access.
- **Plan mode:** the agent proposes a plan before changing anything; good for risky or large changes.
(Exact commands and flags evolve; check `claude --help` and the docs for the version you use.)

## 11. GitHub Copilot in practice

- **Instructions file:** `.github/copilot-instructions.md` gives repository-wide guidance (style, frameworks, testing rules).
- **Chat commands in the IDE:** `/explain`, `/fix`, `/tests`, `/doc`; context references like `#file`, `@workspace`.
- **Agent mode** (multi-file changes + terminal) and the **coding agent** (assign a GitHub issue → it works in a sandbox → opens a PR for review).
- **Enterprise controls:** content exclusion (keep sensitive paths out of context), duplicate-detection filters, audit logs, policy for which models are allowed.

## 12. Devin workflow (how an autonomous agent session looks)

1. Give a task (a ticket or a spec) plus the repo access it needs.
2. Devin plans, then works in its sandbox (shell, editor, browser), running tests as it goes.
3. You watch, steer ("use the existing retry helper"), or answer questions.
4. It opens a PR; humans review it against the spec; CI must pass.
5. **Playbooks/knowledge** (reusable instructions) are Devin's equivalent of skills. In Dell's setup, approved skills and slash commands encoded the RCA and threat-modelling workflows.

## 13. Prompting coding agents well (examples)
❌ "Fix the bug."
✅ "Tests in `tests/test_match.py::test_xiaomi_alias` fail because 'Mi' and 'Xiaomi' aren't treated as the same brand. Add an alias table in `compare/rules.ts`, keep the existing normalisation, add test cases for both directions, and run `npm test`. Don't change the AI prompt."
Patterns: give the **goal + constraints + where to look + how to verify**; ask for a plan first on big tasks; keep tasks small; ask it to add tests; ask "what are the risks of this change?"; review the diff, not the description.

## 14. Risks to name (and how you mitigate them)
Hallucinated APIs/packages (verify; watch for **slopsquatting**, where attackers register package names that AIs commonly hallucinate), subtle logic bugs that look plausible (tests + review), insecure patterns (SAST/SCA in CI), licence-contaminated snippets (duplicate filters, review), secret leakage into prompts (deny-lists, content exclusion, no `.env` access), over-large PRs (small tasks), and skill atrophy in juniors (pairing, explaining the code).

## Interview Q&A

**Q: Do you use AI coding tools?** Yes, daily: Claude Code and Devin for multi-step tasks, Copilot-style completion for boilerplate. Spec first, small diffs, tests as the gate, and I review everything because I own what I commit.
**Q: Will AI replace software engineers?** It automates more of the typing and context-gathering. The value moves to problem framing, system design, specification, review, testing, and judgement about trade-offs and risk. Engineers who use it well become much more productive.
**Q: How do you stop AI-generated code from introducing vulnerabilities?** The same pipeline as human code (SAST, SCA, secrets scanning, review) plus extra care on auth, input handling and dependencies the AI suggests (check they exist and are maintained, to avoid typosquatting).
**Q: What did your Copilot evaluation conclude?** Strong for boilerplate, tests and explanations; weak on proprietary domain logic and subtle concurrency; needs review and tests; useful with clear guidelines.
**Q: What's MCP and why did it matter for your Dell tools?** A standard way for the agent to reach Jira, GitHub and Confluence through tool servers, with auth kept in the servers, instead of custom integrations.

## Quick revision

- Evolution: autocomplete → chat → agentic coding → autonomous agents.
- Copilot (completion, chat, agent mode, coding agent); your evaluation's strengths/weaknesses/risks.
- Claude Code: terminal agent; CLAUDE.md, permissions, slash commands/skills, MCP, hooks, subagents, plan mode.
- Devin (Cognition): autonomous AI engineer; Devin CLI + Desktop/IDE; Windsurf/Codeium lineage.
- Use well: spec first, context, small diffs, tests, review, verify APIs, no secrets.
- Spec-driven development; governance table; measure impact.

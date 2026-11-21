# 20 · LLMs, Prompt Engineering, and the OpenAI API

**Why LLMs matter for your career:** almost every company is adding AI features, and few backend engineers can build them **reliably** (evals, guardrails, cost control). You've done it twice: Dell's hackathon-winning AI assistants and the Smart Shopping Agent, which is live. This file gives you the fundamentals so you can explain **how and why**, not just "I called the API."

---

## Start here: LLMs, prompts and the OpenAI API in plain words

### What an LLM is
**A Large Language Model** is a program that has read a huge amount of text and learned to **predict the next word** (token) very well. Predicting the next word well turns out to require grammar, facts, reasoning patterns and coding knowledge, so the model can answer questions, summarise, translate and write code.
**Analogy:** an extremely well-read **autocomplete** that has read most of the internet and many books. It's brilliant at producing plausible text, but it has **no access to your private data** unless you give it, and it can **confidently make things up** (hallucinate).

### How an LLM generates an answer
```
 "The capital of India is"  ──tokenizer──► [The][ capital][ of][ India][ is]
        ▼
 Transformer network (billions of learned weights; attention = "which earlier words matter for the next one?")
        ▼
 probabilities for the next token:  " New" 0.92 · " Delhi" 0.03 · " Mumbai" 0.01 …
        ▼ pick one (temperature controls how adventurous the pick is)
 append " New" → run again → " Delhi" → run again → "." → stop
```

### Prompt engineering in plain words
A **prompt** is the instruction + context you give the model. **Prompt engineering** is writing it so the model reliably does what you want: a clear role, the task, the relevant context, rules, and the exact output format. It's like briefing a smart new intern: vague briefs get vague work.

### The OpenAI API
**What:** a web API that lets your code send prompts to OpenAI's models and get answers back, plus extras: structured JSON outputs, function/tool calling, embeddings, streaming.

```
 Your backend (FastAPI)                                         OpenAI
 ┌────────────────────────────┐   HTTPS + API key (secret!)    ┌──────────────────────┐
 │ build prompt (instructions │ ─────────────────────────────► │ model inference      │
 │ + context + user question) │                                │ (GPU clusters)       │
 │ validate output (Pydantic) │ ◄───────────────────────────── │ returns text/JSON +  │
 │ record token usage → cost  │   response (or a token stream) │ token usage          │
 └────────────────────────────┘                                └──────────────────────┘
 You pay per token (input + output). Rate limits per minute. Never put the API key in the frontend/extension.
```

## 0. AI/ML foundations (basics first)

### AI vs ML vs DL vs GenAI
```
Artificial Intelligence  (machines doing tasks that need "intelligence": rules, search, planning, learning)
└── Machine Learning     (learn patterns from data instead of hand-written rules)
    └── Deep Learning    (ML with many-layered neural networks)
        └── Generative AI / LLMs (deep models that generate text, images, code, audio)
```

### Types of machine learning

| Type | Data | Examples |
|---|---|---|
| **Supervised** | Labelled (input → correct output) | Classification (spam, toxic comment: your M.Tech project), regression (price prediction) |
| **Unsupervised** | Unlabelled | Clustering (k-means), dimensionality reduction (PCA), anomaly detection |
| **Self-supervised** | Labels generated from the data itself | **LLM pretraining** (predict the next/masked token) |
| **Reinforcement learning** | Rewards from actions in an environment | Games, robotics, **RLHF** for LLMs |

### Neural network basics

- A **neuron** computes a weighted sum of its inputs + a bias, then an **activation function** (ReLU, sigmoid, tanh, GELU) that adds non-linearity.
- **Layers** stack neurons: input → hidden layers → output. "Deep" = many hidden layers.
- **Training loop:** forward pass → compute the **loss** (how wrong: cross-entropy for classification, MSE for regression) → **backpropagation** (compute gradients of the loss with respect to every weight via the chain rule) → **gradient descent** updates the weights a little in the direction that reduces the loss (learning rate; optimisers: SGD, **Adam**) → repeat over many **epochs** of mini-**batches**.
- **Overfitting** (memorises the training data, fails on new data) vs **underfitting**. Fixes: more data, **regularisation** (L1/L2, **dropout**), early stopping, data augmentation, simpler models.
- **Train / validation / test splits:** train on one set, tune hyperparameters on validation, report on the untouched test set. **Data leakage** (test information sneaking into training) gives fake-good results.

### Classic ML evaluation metrics (also used in LLM evals)
```
                 Predicted +    Predicted −
Actual +            TP             FN
Actual −            FP             TN
Precision = TP / (TP + FP)   "of what I flagged, how much was right?"
Recall    = TP / (TP + FN)   "of the real positives, how many did I catch?"
F1        = 2·P·R / (P + R)
Accuracy  = (TP + TN) / all  (misleading for imbalanced data)
```

**Your extension prioritises precision:** a false "same product" or a false "fake reviews" alarm (a false positive) is worse than missing one, so the system is conservative. That's a precision/recall trade-off you chose deliberately. ROC-AUC/PR-AUC summarise performance across thresholds.

### NLP progression (how we got to transformers)
Bag-of-words / TF-IDF (counts; no meaning) → **word embeddings** (word2vec, GloVe: similar words get similar vectors; "king − man + woman ≈ queen") → **RNNs/LSTMs** (process tokens sequentially; slow and forget long contexts) → **attention + transformers** (2017: look at all tokens at once, in parallel) → pretrained models (BERT 2018, GPT series) → instruction-tuned chat models → reasoning and multimodal models.

## 1. What an LLM is (explain it simply)
A **large language model** is a neural network trained to **predict the next token** given the previous tokens. Trained on a huge amount of text, next-token prediction forces the model to learn grammar, facts, reasoning patterns and code, so it generalises to tasks like summarising, answering, classifying and writing code.
> "An LLM is a very good next-token predictor. It knows what was in its training data up to a cutoff. It knows nothing about your private data unless you put it in the prompt, and it can confidently make things up."

## 2. Tokens

- Text is split into **tokens** (sub-word pieces via BPE-style tokenisers). Roughly **1 token ≈ 4 characters ≈ 0.75 English words**. Indian languages and code often use more tokens per word.
- **Everything is measured in tokens:** the context window size, pricing (input vs output tokens; output usually costs more), latency (output is generated token by token), and rate limits (tokens per minute).
- **Why it matters in your extension:** ~300 reviews must fit the context, and cost per analysis was kept around **US$0.0005** by trimming inputs, choosing an efficient model and controlling output length. The backend shortens review bodies (1500 → 800 → 400 → 200 characters) when the total would exceed a context budget.

## 3. The transformer (enough for interviews)

- Introduced in **"Attention Is All You Need"** (2017).
- **Embeddings:** each token becomes a vector; **positional information** is added (the order matters).
- **Self-attention:** each token computes how much to "attend" to every other token (via queries, keys and values), so the model relates words across the whole context ("it" → which noun?). **Multi-head** attention looks at several kinds of relationships in parallel.
- Stacked layers of attention + feed-forward networks. **Decoder-only** models (GPT-style) generate left to right.
- **Cost:** attention is O(n²) in sequence length, which is why long contexts are expensive and why tricks like KV caching exist.
- **KV cache:** during generation the model reuses earlier keys/values instead of recomputing them; that's why the first token takes longer (the prompt is processed) than later ones.

## 4. How models are trained

1. **Pretraining:** next-token prediction on massive text → a "base model" (knowledgeable but not helpful or safe).
2. **Supervised fine-tuning (SFT / instruction tuning):** examples of good instruction → response pairs.
3. **Preference tuning:** **RLHF** (human rankings → reward model → reinforcement learning), **DPO** (direct preference optimisation, simpler), RLAIF (AI feedback; constitution-style approaches).
4. **Reasoning models:** trained (often with reinforcement learning on verifiable tasks) to think step by step internally before answering. Better at maths, code and multi-step logic, but slower and more expensive. Many APIs expose a **reasoning effort** setting (your extension uses `none` for chat and `low` for analysis/matching, which balances quality, latency and cost).

## 5. Generation settings

- **Temperature:** randomness. 0–0.3 for factual/structured tasks; higher for creative ones. (Some reasoning models fix or ignore temperature.)
- **Top-p (nucleus sampling):** sample only from the smallest set of tokens whose probability adds up to p.
- **Max output tokens:** caps length and cost.
- **Stop sequences.** **Seed** (best-effort reproducibility on some APIs).
- **Determinism isn't guaranteed** even at temperature 0, so evals run **multiple times** (your match eval ran 10 runs: 350/350).

## 6. Limitations you must name

- **Hallucination:** fluent but false statements, because the model optimises for plausible text. Mitigate with grounding (RAG), constrained outputs, validation, citations, and saying "I don't know" when the evidence is missing.
- **Knowledge cutoff;** no access to private or current data without retrieval or tools.
- **Context limits** and the **"lost in the middle"** effect (information in the middle of long prompts gets less attention). Put key instructions at the start or end; retrieve only what's relevant.
- **Arithmetic and counting errors:** compute in code. *(Your extension's rule: "**code computes, the model narrates**": every price, count and verdict is computed deterministically; the model only judges product identity or explains computed numbers.)*
- **Prompt injection:** the model can't reliably tell instructions from data (file 21).
- **Non-determinism, latency, cost.**

## 7. Embeddings

- An **embedding** turns text into a vector (e.g. 1,536 dimensions) where **similar meaning → nearby vectors**.
- Similarity: **cosine similarity** (the angle between vectors), dot product, Euclidean distance.
- Uses: semantic search, RAG retrieval, clustering, deduplication, recommendations, classification features.
- Embedding models are separate, cheaper models (e.g. OpenAI `text-embedding-3-small/large`).

## 8. Choosing how to adapt a model

| Approach | Changes | Use when | Cost |
|---|---|---|---|
| **Prompt engineering** | The input | Always start here | Cheapest, fastest to iterate |
| **RAG** | Adds retrieved knowledge to the prompt | Private/fresh data, citations needed | Moderate (retrieval infrastructure) |
| **Tools / function calling** | The model calls APIs/code | Live data, actions, exact computation | Moderate |
| **Fine-tuning** | Model weights | Consistent **style/format/behaviour** on a narrow task; shorter prompts; a smaller cheaper model matching a bigger one | Data prep + training + re-training when things change |

**Key rule:** fine-tuning teaches **behaviour/format**, not reliable **facts**. Facts change; use RAG for them.

## 9. Prompt engineering (practical techniques)

1. **Role + task + context + constraints + output format.** Be explicit.
2. **Separate instructions from data** with clear delimiters (XML tags, fenced blocks) and say the data is untrusted.
3. **Specify the output schema** (JSON fields, enums, lengths), or better, use **structured outputs** (below).
4. **Few-shot examples:** 1–5 input/output examples showing the edge cases (e.g. "same model, different colour → variant").
5. **Give the model an out:** "If the answer isn't in the reviews, say you don't have enough information."
6. **Decompose:** split complex tasks into steps or separate calls (prompt chaining).
7. **Ask for reasoning when it helps** (or use a reasoning model). For structured tasks, a short "reason" field before the verdict can improve accuracy and auditability.
8. **Iterate with evals**, not vibes: change one thing, re-run the labelled test set, compare.
9. **Keep prompts in version control** (as skills/files) and review prompt changes like code.

**Example (your Jira RCA prompt pattern):**

```
You are a Senior Software Engineer. Analyse the Jira defect below using ONLY the attached context.
Identify: 1. Root cause  2. Impact  3. Possible fix  4. Risks  5. Validation strategy.
If the context is insufficient, say what's missing instead of guessing.
Respond in this exact structure: ...
<jira>...</jira> <pr_diff>...</pr_diff> <docs>...</docs>
```
> "Adding role, context, constraints and an explicit output contract improved quality more than changing models did."

**Example (your product-matching rules, simplified):** the model compares the **titles and model codes** only (never prices), and must answer `same`, `variant` or `different`. Rules: a different model code → "different"; codes differing only after a "/" (e.g. a colour suffix) → "variant" (or "same" if nothing else differs); brand aliases (Mi = Xiaomi) count as the same brand; different product names are never "same".

## 10. The OpenAI API (what you used)
**Responses API** (OpenAI's current primary API; Chat Completions is still supported):

```python
from openai import OpenAI
client = OpenAI()                                   # reads OPENAI_API_KEY from the environment

resp = client.responses.create(
    model="<model-name>",
    instructions="You summarise product reviews for shoppers. Use only the reviews given.",
    input="<reviews>...</reviews>",
    reasoning={"effort": "low"},                    # for reasoning-capable models
    max_output_tokens=800,
)
print(resp.output_text)
print(resp.usage)                                   # input/output tokens → record cost
```

**Structured outputs (guaranteed JSON matching a schema):**

```python
from pydantic import BaseModel
from typing import Literal
class MatchVerdict(BaseModel):
    verdict: Literal["same", "variant", "different"]
    reason: str

resp = client.responses.parse(
    model="<model-name>",
    instructions=MATCH_INSTRUCTIONS,
    input=f"Source: {src_title} (Model: {src_model})\nCandidate: {cand_title}",
    text_format=MatchVerdict,
)
verdict = resp.output_parsed        # a validated Pydantic object
```

**Function / tool calling:** you describe tools (name, description, JSON-schema parameters); the model returns a **tool call** with arguments; **your code executes it** and sends the result back; the model continues. This is the foundation of agents (file 21).

```python
tools = [{"type": "function", "name": "get_price_history",
          "description": "Price history for a product URL",
          "parameters": {"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}}]
```

**Streaming:** `stream=True` returns events (text deltas) so the UI shows tokens as they arrive. Your chat endpoint streams to the side panel, so the perceived latency is much lower.
**Other things to know:** model selection by benchmark (your `model_bench.py` compared models on your own evals before choosing one), **prompt caching** (repeated prompt prefixes are cheaper and faster, so put static instructions first), the **Batch API** (cheaper, asynchronous, for offline jobs), the moderation endpoint, embeddings, **rate limits** (RPM/TPM per tier) → handle **429** with exponential backoff + jitter, timeouts on every call, and per-project **budgets/spend limits** (your US$10/month cap).

**Errors and resilience:** 429 (rate limit, or quota exceeded), 5xx (retry with backoff), timeouts (retry idempotent calls), content filter refusals (handle gracefully), malformed output (validate → retry once → fall back to a template).

## 11. Cost and latency engineering (a senior topic)

- **Cost per request** = input tokens × input price + output tokens × output price. Track it per feature (your backend records spend per call type).
- **Levers:** a smaller model for easy tasks (**model routing**), shorter prompts (retrieve only what's relevant; trim inputs), cap output length, **cache results** (the same product → the same analysis), batch offline work, prompt caching, a lower reasoning effort where quality allows.
- **Guard the wallet:** per-user quotas, global monthly budget caps, alerts on spend anomalies. **Unbounded consumption is an OWASP LLM risk.**
- **Latency:** streaming, smaller models, parallel calls, precompute, cache, avoid unnecessary chained calls.

## 12. Open vs closed models
Closed APIs (OpenAI, Anthropic Claude, Google Gemini): best quality, no infrastructure to run, but data leaves your network (enterprise agreements mitigate this) and you're tied to a vendor. **Open-weight models** (Llama, Mistral, Qwen, DeepSeek, Gemma): self-host for data control and cost at scale (GPUs, serving with vLLM, quantisation), but more ops and usually lower top-end quality. Enterprises like Dell often route through an **internal, governed enterprise LLM gateway**: approved models, data boundaries, logging.

## 13. Transformer architecture, a little deeper
```
Input text → tokenizer → token IDs → embedding vectors + positional encoding
   ┌──────────────── × N layers ────────────────┐
   │ Multi-head self-attention (+ residual + layer norm)
   │ Feed-forward network      (+ residual + layer norm)
   └────────────────────────────────────────────┘
→ linear layer over the vocabulary → softmax → probability of each next token → sample → append → repeat
```

**Attention in one line:** `Attention(Q, K, V) = softmax(Q·Kᵀ / √d) · V`. Each token's query is compared with every token's key; the resulting weights mix the values. Decoder models use a **causal mask** (a token can't see future tokens).

| Family | Architecture | Trained to | Good at | Examples |
|---|---|---|---|---|
| **Encoder-only** | bidirectional attention | fill in masked tokens | understanding: classification, embeddings, NER | BERT, RoBERTa |
| **Decoder-only** | causal attention | predict the next token | generation, chat, code | GPT, Llama, Claude, Gemini |
| **Encoder-decoder** | both | map input → output sequence | translation, summarisation | T5, BART |

**Mixture of Experts (MoE):** only a few "expert" sub-networks run per token, giving big total capacity with lower compute per token (used by many frontier models).
**Multimodal models** take or produce images, audio and video alongside text.

## 14. Fine-tuning techniques, quantisation, serving

- **Full fine-tuning:** update all weights (expensive; needs lots of GPU memory).
- **PEFT (parameter-efficient fine-tuning):** **LoRA** adds small low-rank matrices to the attention layers and trains only those (a tiny fraction of the parameters); **QLoRA** = LoRA on a 4-bit-quantised base model, so fine-tuning fits on a single GPU.
- **Instruction tuning, preference tuning (DPO), distillation** (train a small model to imitate a big one).
- **Quantisation:** store weights in fewer bits (FP16 → INT8/INT4) → less memory, faster inference, small quality loss (GGUF/llama.cpp, GPTQ, AWQ).
- **Serving:** vLLM / TGI / TensorRT-LLM with **continuous batching**, **paged KV cache**, speculative decoding. Metrics: **time to first token (TTFT)**, tokens/second, throughput, cost per 1M tokens.

## 15. Prompting patterns, named

| Pattern | What it is |
|---|---|
| Zero-shot | Just the instruction |
| Few-shot | Instruction + examples |
| **Chain-of-thought** | "Think step by step" or ask for reasoning before the answer (reasoning models do this internally) |
| Self-consistency | Sample several reasoning paths, take the majority answer |
| **ReAct** | Interleave reasoning and tool actions (the agent loop, file 21) |
| Tree-of-thoughts | Explore and evaluate several partial solutions |
| Role / persona prompting | "You are a senior SRE…" |
| Prompt chaining | Split a task across several calls |
| Self-critique / reflection | The model reviews and improves its own answer |
| Structured prompting | XML/JSON sections, explicit schemas |
| Retrieval-augmented | Add retrieved context (RAG) |

**Prompt templates** (with variables) are versioned and tested like code.

## 16. More OpenAI API code

**Chat Completions (the older, still widely used API):**

```python
resp = client.chat.completions.create(
    model="<model>",
    messages=[{"role": "system", "content": "You answer only from the given reviews."},
              {"role": "user", "content": f"<reviews>{text}</reviews>\nQuestion: Is the battery good?"}],
    temperature=0.2,
)
answer = resp.choices[0].message.content
```

**Embeddings + cosine similarity:**

```python
import numpy as np
def embed(texts):
    r = client.embeddings.create(model="text-embedding-3-small", input=texts)
    return np.array([d.embedding for d in r.data])
docs = ["Battery lasts two days", "Screen cracked in a week", "Great battery backup"]
D = embed(docs); q = embed(["How is the battery?"])[0]
scores = D @ q / (np.linalg.norm(D, axis=1) * np.linalg.norm(q))     # cosine similarity
print([docs[i] for i in scores.argsort()[::-1][:2]])                  # the two battery reviews
```

**A full tool-calling loop (Responses API):**

```python
import json
tools = [{"type": "function", "name": "get_price",
          "description": "Current price in INR for a product URL",
          "parameters": {"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}}]
def get_price(url): return {"price": 12999}

messages = [{"role": "user", "content": "Is https://example.com/p/123 under 15000?"}]
while True:
    resp = client.responses.create(model="<model>", input=messages, tools=tools)
    calls = [item for item in resp.output if item.type == "function_call"]
    if not calls:
        print(resp.output_text); break
    messages += resp.output                                   # keep the model's tool-call items in the history
    for call in calls:
        result = get_price(**json.loads(call.arguments))      # YOUR code executes the tool
        messages.append({"type": "function_call_output", "call_id": call.call_id, "output": json.dumps(result)})
```

Always validate tool arguments, cap the number of loop iterations, and never let the model call dangerous tools without checks.

**Streaming:**

```python
stream = client.responses.create(model="<model>", input="Summarise these reviews…", stream=True)
for event in stream:
    if event.type == "response.output_text.delta":
        print(event.delta, end="", flush=True)        # forward each chunk to the UI (StreamingResponse/SSE)
```

**Retries, timeouts and errors:**

```python
from openai import OpenAI, RateLimitError, APITimeoutError, APIError
client = OpenAI(timeout=30, max_retries=2)            # the SDK retries some errors with backoff
try:
    resp = client.responses.create(model="<model>", input=prompt)
except RateLimitError:
    ...   # 429: back off, queue the work, or show "try again later" (also covers quota exhaustion)
except (APITimeoutError, APIError):
    ...   # transient: retry an idempotent call a bounded number of times, then fall back
```

**Counting tokens before sending (budgeting the context):**

```python
import tiktoken
enc = tiktoken.get_encoding("o200k_base")             # the encoding used by recent OpenAI models
n_tokens = len(enc.encode(prompt))
```

## 17. Completing LLMs, prompting and the OpenAI API from A to Z

### Course map
```
AI/ML foundations: AI vs ML vs DL · learning types · neural networks · training loop · overfitting · metrics
NLP → LLMs: tokenisation · embeddings · RNNs → transformers · attention · encoder/decoder families · MoE · multimodal
Training: pretraining · instruction tuning · RLHF/DPO · reasoning models · fine-tuning (full, LoRA, QLoRA) · distillation · quantisation
Using models: sampling (temperature, top-p) · context windows · limitations (hallucination, cutoff, lost in the middle)
  · model families & vendors · open vs closed · local models · serving (vLLM, batching, KV cache) · safety & alignment
Prompt engineering: anatomy of a prompt · techniques (few-shot, CoT, decomposition, delimiters, output contracts) · named patterns
  · iterating with evals · prompt templates & versioning · prompt injection awareness
OpenAI API: auth & keys · Responses vs Chat Completions · structured outputs · tool/function calling · streaming · embeddings
  · errors, retries, rate limits · token counting · cost control · batching & caching · moderation
```

### Tokenisation, a little deeper
Modern tokenisers use **byte-pair encoding (BPE)**: start from bytes/characters and repeatedly merge the most frequent adjacent pairs into new tokens, so common words become one token and rare words split into pieces ("Power" + "Scale"). Consequences: token counts differ by language, numbers and code split oddly (one reason LLMs are bad at character-level tasks like counting letters), and pricing is per token, not per word.

### Managing the context window

- Budget it: system instructions + retrieved context + conversation history + the expected output must fit.
- For long conversations: keep a **running summary** of older turns, drop or compress tool outputs, and retrieve old details on demand (memory).
- For long documents: chunk + retrieve (RAG), or a map-reduce summary (summarise chunks, then summarise the summaries).
- Put stable content first so **prompt caching** applies.

### The model landscape

| Provider | Examples | Notes |
|---|---|---|
| OpenAI | GPT family, reasoning models, embeddings | Responses API, structured outputs, tools |
| Anthropic | Claude family | long context, strong coding/agents, tool use, MCP's origin |
| Google | Gemini family | multimodal, long context |
| Meta and other open-weight | Llama, Mistral, Qwen, DeepSeek, Gemma | self-hostable; run locally with **Ollama**/llama.cpp or serve with vLLM |
| Embedding/rerank models | OpenAI embeddings, Cohere, open models (BGE, E5) | for RAG |

Choose by **evaluating on your own task** (quality, latency, cost, context length, data policy), not by leaderboard hype, exactly as you did with `model_bench.py`.

### Running a model locally (for privacy or experimentation)
```bash
ollama pull llama3.1          # download an open-weight model
ollama run llama3.1 "Summarise: …"
# Ollama also exposes an HTTP API (and an OpenAI-compatible endpoint), so the same client code can target local or hosted models
```

### Safety and alignment in brief
Models are trained to refuse harmful requests and follow usage policies; providers add moderation layers. As an engineer you still own **application-level** safety: input/output guardrails, abuse monitoring, rate limits, privacy (don't send data you're not allowed to), and human review for high-stakes outputs (file 21).

### Prompt anatomy (a reusable template)
```
[ROLE]        You are a <role> for <audience>.
[TASK]        Your job is to <task>.
[CONTEXT]     <only the relevant facts/documents, clearly delimited>
[RULES]       - Use only the context. - If unsure, say so. - Never <forbidden thing>.
[EXAMPLES]    Input: … → Output: …   (1–3, covering edge cases)
[OUTPUT]      Return JSON matching: {...}   (or use structured outputs)
[INPUT]       <user input, delimited and labelled as untrusted if it comes from outside>
```

### Moderation and the Batch API

- The **moderation endpoint** classifies text/images for harmful categories: use it on user input and model output where appropriate.
- The **Batch API** processes large offline jobs (e.g. re-analysing thousands of products overnight) asynchronously at a lower price, with results within a time window.

## Interview Q&A

**Q: What is an LLM, simply?** A next-token predictor trained at scale that generalises to language tasks; limited by training data and context.
**Q: What's a token and why should engineers care?** The unit of context, cost, latency and rate limits.
**Q: How do you reduce hallucinations?** Ground with retrieval, structured outputs, validation against source data, compute facts in code, allow "not enough info", evals with known answers.
**Q: Temperature?** The randomness of sampling; low for factual/structured tasks.
**Q: RAG vs fine-tuning?** Knowledge (fresh, citable) vs behaviour/format.
**Q: What are structured outputs and why use them?** Schema-constrained JSON, so parsing never fails and fields are typed. You still validate the *content* (e.g. no invented numbers).
**Q: How did you control cost in your extension?** Code computes the numbers so the model's job is small; trimmed inputs with a context budget; an efficient model chosen by benchmark; low reasoning effort; caching; per-install daily limits; a monthly spend cap; spend recorded per call. About $0.0005 per review analysis.

## Quick revision

- LLM = next-token prediction; tokens ≈ 4 chars; context, cost, latency.
- Transformer: embeddings, self-attention (O(n²)), decoder-only, KV cache.
- Pretrain → SFT → RLHF/DPO; reasoning models + reasoning effort.
- Temperature/top-p; non-determinism → run evals several times.
- Limits: hallucination, cutoff, lost-in-the-middle, maths → "code computes, model narrates".
- Embeddings + cosine similarity. Prompting < RAG < tools < fine-tuning (behaviour, not facts).
- Prompt techniques: role/task/context/constraints/format, delimiters, few-shot, give an out, decompose, eval-driven.
- OpenAI Responses API, structured outputs (Pydantic), tool calling, streaming, 429 backoff, prompt caching, Batch API, budgets.

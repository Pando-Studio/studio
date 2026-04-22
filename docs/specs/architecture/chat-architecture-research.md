# AI Chat Architecture Research — Content Creation Studio (2025-2026)

Deep research on state-of-the-art AI chat architectures for Qiplim Studio's educational widget generation system.

---

## 1. Agentic Chat Patterns

### 1.1 How Modern Apps Implement Chat

**Plan-then-execute is the dominant pattern.** Every serious AI product in 2025-2026 separates planning from execution:

| Product | Architecture | Key Pattern |
|---------|-------------|-------------|
| **Cursor** | @-mention context injection + agentic loop (edit/run/fix) | Automatic context gathering, semantic codebase search, error recovery loops |
| **Windsurf** | Cascade Engine — graph-based reasoning over entire codebase | Persistent "Flow" state, remembers architectural intent across sessions |
| **v0.dev** | Chat-to-component pipeline, Vercel AI SDK + tool calling | Generates UI components from prompts, iterates on feedback |
| **Lovable** | Chat Mode Agent — multi-step reasoning without code changes until approval | Searches project files, inspects logs, queries DB, then proposes changes |
| **bolt.new** | Chat-to-full-stack-app, code-first interface | Agentic assistant builds entire apps, uses StackBlitz WebContainers |
| **NotebookLM** | Closed RAG system, source-grounded, Gemini 2.5 Flash | Multi-format output (audio, slides, quizzes, flashcards) from uploaded sources |
| **Claude Projects** | Project knowledge base + conversation memory + artifacts | System prompt + files as persistent context, artifacts as structured outputs |
| **ChatGPT Canvas** | Side-by-side editor + chat, specialized tools per content type | Chat drives a persistent document/code artifact, tools for specific operations |

### 1.2 Eight Agentic Patterns (from production systems)

1. **AGENTS.md Convention** — project-level context file that constrains agent behavior (Studio: `chat-intelligent.md` system prompt enrichment)
2. **Task Decomposition** — plan step-by-step before executing (Studio: PLAN mode)
3. **Context Window Management** — strategically include/exclude content per task type
4. **Test-Driven Agent Development** — objective success criteria the agent cannot argue with
5. **Incremental Execution** — one step at a time with verification between steps
6. **Error Recovery Loops** — self-fix → context expansion → simplification → human escalation
7. **Multi-Agent Review** — different personas evaluate the same output
8. **Autonomous Feature Branches** — plan → implement → verify → submit lifecycle

### 1.3 Recommendation for Studio

Studio's current 3-mode architecture (ASK/PLAN/AGENT) maps well to industry patterns but needs evolution:

- **ASK mode** = conversational RAG (keep as-is, enhance with re-ranking + citations)
- **PLAN mode** should become a **two-phase action pattern**: LLM proposes a generation plan, user reviews/modifies, then approves for execution. This matches Lovable's "no changes until you approve" pattern.
- **AGENT mode** should adopt an **incremental execution loop** with progress visibility, not a single `generateText()` call with `maxSteps: 3`. The agent should stream its reasoning, show tool calls inline, and allow cancellation between steps.

---

## 2. RAG-Enhanced Chat

### 2.1 From RAG to Context Engineering

The 2025 paradigm shift (coined by Andrej Karpathy) reframes RAG as **Context Engineering** — the deliberate architectural step between raw retrieval and prompt construction that decides what the model sees, how much, and in what order.

**Three complementary context layers:**
1. **Domain knowledge** — traditional RAG over uploaded documents
2. **Tool metadata** — which tools are available and how to use them
3. **Conversation history + state** — memory systems

Studio already has layer 1 (hybrid search). Layers 2 and 3 are the gaps identified in `chat-intelligent.md`.

### 2.2 Context Window Management

**Best practices for conversational RAG:**

| Strategy | When Context is Tight (<32K) | When Context is Large (>128K) |
|----------|------------------------------|-------------------------------|
| Retrieval | Top-8 chunks, aggressive reranking | Top-30 chunks, lighter filtering |
| History | Last 5-10 turns + summary of older turns | Last 20-30 turns verbatim |
| Summarization | Compress older turns via cheaper model | Not needed |
| Deduplication | Three-tier: exact containment, prefix overlap, token-overlap >0.72 | Still useful to reduce noise |

**Key insight:** Mechanically stuffing text into large context windows scatters model attention ("Lost in the Middle" effect). RAG precision filtering + large windows is the winning combination.

**Exponential decay for conversational memory:** Recent turns have full weight, older turns fade based on relevance-boost from query-token overlap. This is more nuanced than simple truncation.

### 2.3 Hybrid Search Architecture

Studio's current implementation (pgvector cosine + tsvector + RRF) is solid. Improvements to consider:

```
Query
  |
  ├── Query Expansion (HyDE: generate hypothetical answer, embed that)
  |
  ├── Dense: pgvector cosine similarity (current)
  ├── Sparse: tsvector with language detection (upgrade from French-only)
  |
  └── Fusion: RRF (K=60) → top-30 candidates
        |
        └── Cross-encoder Reranking → top-8 final chunks
```

**HyDE (Hypothetical Document Embeddings):** Generate a fabricated answer to the query, then embed that answer for retrieval. "Wrong answers are fine because they share structural shape with real documents." The embedding encoder's bottleneck preserves semantic domain while filtering specifics. This is the single highest-impact retrieval improvement.

### 2.4 Re-ranking

After RRF fusion, a cross-encoder reranker evaluates (query, chunk) pairs with full attention. This dramatically reduces false positives.

**Options for Studio:**
- **Cohere Rerank** — API, fast, accurate, $1/1K searches
- **Mistral Rerank** — good since Studio already uses Mistral for embeddings
- **Jina Reranker** — open-source alternative
- Cross-encoder locally — too heavy for production

**Recommended:** Cohere Rerank or Mistral Rerank as API calls after hybrid search, before injecting into prompt.

### 2.5 Citation Tracking

**State of the art — Citation-Aware RAG:**

1. **At index time:** Embed lightweight citation anchors in chunks (`<c>page.order</c>`). Store spatial metadata (page, bounding box) separately.
2. **At retrieval time:** Chunks arrive with anchors intact.
3. **At generation time:** Instruct LLM to return citation IDs alongside claims, not inline in prose.
4. **At render time:** Resolve citation IDs to source locations for clickable references.

**Anthropic Citations API** (launched June 2025): Claude can now natively cite exact sentences from provided source documents. Internal evaluations show it outperforms custom implementations. Studio should evaluate switching to the Citations API for Claude-powered responses.

**Studio improvement path:**
- Current: `[Source: nom]` pattern (string matching, fragile)
- Target: Structured citation objects in tool response metadata, rendered as hoverable badges with excerpt tooltips and deep links to source chunks

### 2.6 Multi-Document Reasoning

For educational content generation (syllabus from 5 PDFs, quiz across chapters):

- **Decoupled search-retrieve pipeline:** Fine-grained chunks for search precision, then dynamically aggregate into larger coherent blocks for the LLM
- **Hierarchical chunking:** Each chunk retains parent section title as metadata, enabling the LLM to reason about document structure
- **Cross-document entity linking:** Build lightweight entity graphs at index time (key concepts linking across documents), enabling multi-hop reasoning without full GraphRAG overhead

---

## 3. Tool Calling Architectures

### 3.1 Framework Comparison

| Aspect | Vercel AI SDK 6 | LangGraph | Mastra | Custom |
|--------|-----------------|-----------|--------|--------|
| **Tool definition** | Zod schemas, provider-agnostic | Python functions + schema | Zod schemas + Mastra tooling | Manual JSON Schema |
| **Loop control** | `ToolLoopAgent`, `stopWhen`, `prepareStep` | Graph nodes + edges, explicit state machine | `stream()`/`generate()` with supervisor | Manual while loop |
| **Human-in-the-loop** | `needsApproval` flag per tool | Checkpoint + human node | Supervisor pattern | Custom approval logic |
| **Streaming** | `streamText` + `useChat` hook | LangServe streaming | Built-in streaming | Manual SSE |
| **UI integration** | First-class React hooks, `streamUI` | Weak (Python-first) | Good (TypeScript) | Full control |
| **Multi-agent** | Manual orchestration | First-class multi-agent graphs | Supervisor pattern, Agent Network | Manual routing |
| **Observability** | AI SDK DevTools | LangSmith (most mature) | Built-in tracing | Custom logging |

### 3.2 Recommendation for Studio

**Vercel AI SDK 6 is the right choice** for Studio because:
1. Studio is a Next.js app — first-class React integration
2. Studio already uses Vercel AI SDK — natural upgrade path
3. `ToolLoopAgent` with `needsApproval` solves the plan-then-execute pattern
4. `streamUI` enables generative UI for tool results (widget previews inline in chat)
5. Mastra (already in Engage) can be used for multi-provider model routing

**AI SDK 6 key patterns to adopt:**

```
ToolLoopAgent({
  model: 'anthropic/claude-sonnet',
  tools: {
    // Auto-generated from template registry (existing spec)
    ...buildWidgetToolsFromRegistry(),
    // Utility tools
    search_sources: tool({ needsApproval: false, ... }),
    generate_widget: tool({ needsApproval: true, ... }),  // User approves
    regenerate_widget: tool({ needsApproval: true, ... }),
  },
  stopWhen: stepCountIs(10),
  prepareStep: ({ steps }) => {
    // Dynamic context: trim old messages, switch model if needed
  }
})
```

### 3.3 Multi-Step Tool Chains

For "generate a complete module" (PLAN mode), the pattern is:

1. LLM proposes a `GenerationPlan` (list of widgets with dependencies)
2. Plan is rendered as an interactive card in chat (`needsApproval: true`)
3. User modifies/approves the plan
4. Agent executes sequentially, each widget's output feeding as context to the next
5. Progress is streamed as inline cards showing status per widget

This maps directly to the spec in `chat-intelligent.md` section 6, but the implementation should use AI SDK 6's `ToolLoopAgent` + `needsApproval` rather than a custom solution.

### 3.4 Tool Result Rendering

**Inline tool cards in chat (Generative UI pattern):**

- **Read-only tools** (search_sources, list_widgets): Render results as collapsible inline cards
- **Generation tools** (generate_widget): Render as interactive cards with [Modify] [Cancel] [Generate] buttons
- **Plan tools** (generation plan): Render as checklist with drag-to-reorder, per-item edit
- **Progress tools** (generation progress): Render as real-time progress cards with status per widget

Use `streamUI` from AI SDK 6 to render React components directly from tool results, rather than serializing to markdown.

---

## 4. Memory Systems

### 4.1 Three-Tier Memory Architecture

Based on research across Claude, ChatGPT, Mem0, Zep, and academic frameworks:

| Tier | Scope | Storage | Retrieval | Studio Mapping |
|------|-------|---------|-----------|----------------|
| **Short-term** | Current conversation | In-memory (useChat messages array) | Full context in prompt | Already exists |
| **Medium-term** | Studio session / project | DB (conversation history, widget state) | Injected into system prompt | Partially exists (widget state in prompt) |
| **Long-term** | User across all studios | DB (UserMemory table) | Semantic search + category filter | Specced in `chat-intelligent.md` section 5 |

### 4.2 Short-term: Conversation Context

**Current gap:** Studio sends full message history every call, hitting token limits on long conversations.

**Recommended approach — Sliding window + progressive summarization:**
1. Keep last 10 messages verbatim in context
2. Summarize older messages using a cheaper/faster model (Gemini Flash or Mistral Small)
3. Store summary as a synthetic "system" message at conversation start
4. Re-summarize every 10 new messages (not every message — too expensive)

**Alternative — Exponential decay:** Weight recent turns fully, older turns get compressed proportionally. More nuanced but harder to implement.

### 4.3 Medium-term: Studio Context

This is the most valuable and most underutilized tier. The system prompt should contain:

```
## Studio State
- Sources: [list with chunk counts and indexing status]
- Widgets: [list with types, titles, statuses]
- Active generation plan: [if any]
- Recent conversation themes: [extracted from last 3 conversations]

## User Preferences (from long-term memory)
- Language, quiz length, pedagogical approach, etc.
```

**Key insight from NotebookLM:** The model should always know what sources exist and what has been generated, so it can make relevant suggestions ("You have a chapter on color theory but no quiz yet — want me to generate one?").

### 4.4 Long-term: User Memory

The spec in `chat-intelligent.md` section 5 is well-designed. Additional insights from research:

**Claude's approach:** Memory activates only when explicitly invoked (blank slate each conversation). This avoids creepy over-personalization.

**ChatGPT's approach:** Automatic memory extraction from every conversation. More convenient but raises privacy concerns.

**Recommended for Studio — Hybrid approach:**
1. **Explicit directives** (confidence 1.0): User says "always generate in French" → stored immediately
2. **Implicit extraction** (confidence 0.5-0.8): End-of-conversation LLM analysis extracts preferences → stored but low confidence
3. **Confirmation loop**: When the system uses a low-confidence memory, it mentions it ("I'm generating in French based on your usual preference — let me know if you want English instead")
4. **Soft-delete with timestamps** (Zep pattern): Never hard-delete memories — mark as inactive for GDPR compliance + auditability

**Memory extraction categories** (from the spec, validated by research):
- `preference` — language, style, detail level
- `context` — institution, subject, grade level, role
- `pedagogical` — approach, framework, objectives
- `technical` — stack, tools, integrations
- `directive` — explicit instructions

### 4.5 Experiential Memory (Advanced — Phase 3+)

The biggest untapped opportunity: learning **how** to generate better content, not just **what** the user prefers.

- Store successful generation strategies ("for this user, 5-question quizzes with practical examples score highest")
- Store failed generation patterns ("this user always rejects quizzes about definitions — prefer application questions")
- Implemented as a lightweight skill library, not full RL

This is the "experiential memory" tier from the research — currently a gap in every product.

---

## 5. @ Mentions / Context Injection

### 5.1 How Leading Products Handle It

| Product | @ Types | UX | Backend Effect |
|---------|---------|-----|----------------|
| **Cursor** | @file, @folder, @codebase, @docs, @git, @definitions | Autocomplete dropdown, keyboard nav | Injects content into context, or triggers semantic search |
| **Claude Code** | @file, @folder | Autocomplete | Reads file content into context |
| **Copilot** | @workspace, @terminal, @file | Participants model | Routes to different context providers |
| **Notion AI** | @page, @database | Inline link-style | Fetches page content as context |
| **Linear** | No @ in chat, but references issues/projects | Structured search | Contextual from current view |

### 5.2 Cursor 2.0 Insight

Cursor 2.0 **removed** @Web, @Git, @Linter, @Recent because the agent now gathers those automatically. Only @-mentions where "explicit human direction adds value over automatic discovery" were kept: @Files, @Folders, @Code, @Docs, @Past Chats.

**Lesson for Studio:** Don't over-engineer @ types. Three types are enough:
1. `@source` — Focus RAG on specific document(s)
2. `@widget` — Inject widget content as context
3. `@conversation` — Reference previous conversation

The agent should automatically discover studio state (sources list, widget list) without requiring explicit @-mention. The @ is for **overriding** default context, not providing it.

### 5.3 Implementation Architecture

The spec in `chat-intelligent.md` section 2 is well-designed. Key additions from research:

**Context priority order (from Cursor's model):**
1. Explicit @-mentions (highest priority, never truncated)
2. Active studio state (sources, widgets — auto-injected)
3. User memory (long-term preferences)
4. RAG chunks (hybrid search results)
5. Conversation history (sliding window)

When context exceeds budget, truncate from bottom up (history first, then RAG chunks, never @-mentions).

---

## 6. Multi-Mode Chat

### 6.1 Current Modes vs. Industry Patterns

Studio's current 3 modes map to industry patterns:

| Studio Mode | Industry Equivalent | Behavior |
|-------------|--------------------|---------|
| ASK | Perplexity search, ChatGPT default | Conversational RAG, answer questions |
| PLAN | ChatGPT Canvas planning, Lovable planning | Structured multi-widget generation plan |
| AGENT | Cursor agent, Lovable build mode | Execute tool calls to generate widgets |

### 6.2 Recommended Mode Evolution

**Remove the explicit mode selector.** Let the agent decide the mode based on intent:

- "What does chapter 3 say about color theory?" → ASK behavior (RAG search, conversational answer)
- "Create a quiz about renewable energy" → AGENT behavior (single tool call)
- "Prepare a complete module on color theory" → PLAN behavior (multi-widget plan, approval gate, sequential execution)

**How to implement intent detection:**

Option A — **System prompt routing:** Instruct the model to classify intent and respond accordingly. Simplest, works well with strong models (Claude, GPT-4).

Option B — **Two-pass:** First call classifies intent (fast, cheap model), second call executes with appropriate tools/constraints. More reliable but adds latency.

Option C — **Tool-based routing:** Always provide all tools. Simple questions naturally get text responses. Generation requests naturally trigger tool calls. Plans naturally use the plan tool. The model self-selects.

**Recommendation: Option C (tool-based routing).** With AI SDK 6's `ToolLoopAgent`, the model naturally selects the right tools. Add a `propose_generation_plan` tool for multi-widget requests. The model will use it when the request is complex enough.

### 6.3 Autonomy Levels

From the agent UX patterns research, implement a **Suggest → Draft → Execute** autonomy slider:

| Level | Behavior | Use Case |
|-------|----------|----------|
| **Suggest** | LLM proposes, never executes | New users, sensitive content |
| **Draft** | LLM generates draft, user approves before saving | Default for widget generation |
| **Execute** | LLM generates and saves directly | Power users, batch operations |

Default to **Draft** for all generation tools. Let users upgrade to Execute per-tool or globally.

---

## 7. Streaming UX Patterns

### 7.1 State Machine for Chat Messages

Model the chat request lifecycle explicitly:

```
idle → validating → sending → streaming → complete
                                  ↓
                            interrupted
                                  ↓
                              failed → retry → sending
```

**States and UI:**

| State | UI | User Actions |
|-------|-----|-------------|
| `idle` | Input enabled, send button active | Type, submit |
| `validating` | Input disabled briefly | None |
| `sending` | Spinner on send button | Cancel |
| `streaming` | Typing indicator, tokens appearing | Stop generation |
| `complete` | Full message rendered | Copy, regenerate, follow-up |
| `interrupted` | Message marked as partial, warning badge | Retry, new message |
| `failed` | Error message with context | Retry, modify and resend |

### 7.2 Tool Call Streaming

When the agent makes tool calls during streaming:

1. **Tool invocation announced:** Show card with tool name + parameters being formed
2. **Parameters complete:** Enable [Modify] [Approve] [Cancel] buttons (if `needsApproval`)
3. **Executing:** Progress indicator within the card
4. **Result:** Card updates with result (widget preview, search results, etc.)
5. **Agent continues:** Streaming resumes with agent interpreting tool results

**Critical pattern:** Persist messages only in the `onFinish` callback, never during streaming. Partial messages from interrupted streams should be marked as incomplete.

### 7.3 Cancellation

Two types of cancellation:

1. **Stream cancellation:** User clicks "Stop" — abort the fetch, mark message as partial, keep what was generated
2. **Tool cancellation:** User clicks "Cancel" on a tool card — abort tool execution, inform agent via tool result `{ cancelled: true }`, let agent respond

### 7.4 Error Recovery

**Escalating recovery strategy (from agentic patterns research):**

1. **Auto-retry** (network errors, 429 rate limits): Exponential backoff, max 3 retries, transparent to user
2. **Fallback model** (model errors, context too long): Try with a different model or truncated context
3. **User-assisted recovery** (content policy, ambiguous request): Show error with suggested modifications
4. **Graceful degradation** (persistent failures): Offer to save conversation state and resume later

### 7.5 Progress for Long Operations

For multi-widget generation plans (30s-2min):

```
Generating module "Color Theory" (3/6 widgets complete)

[x] Syllabus: Color Theory Fundamentals     ✓ Ready
[x] Session Plan 1: The Color Wheel          ✓ Ready
[>] Session Plan 2: Harmonies & Contrast     ⏳ Generating...
[ ] Quiz: Color Basics                        Pending
[ ] Flashcards: Key Terms                     Pending
[ ] Glossary: Color Terminology               Pending

[Cancel remaining]
```

Use Server-Sent Events or Ably for real-time progress updates on long-running BullMQ jobs.

---

## 8. State Machines for Chat

### 8.1 Why State Machines

Complex chat flows (plan → approve → execute → report) are inherently stateful. Without explicit state management, the system relies on LLM memory to track where it is in a workflow — fragile and non-deterministic.

### 8.2 XState + AI SDK Integration

The **Stately Agent** framework demonstrates how XState state machines can guide AI agent behavior. The key insight: state machines answer "where are we in the journey?" while the LLM answers "what should we do now?"

### 8.3 Recommended State Machine for Studio Chat

```
                    ┌─────────────┐
                    │    idle     │
                    └──────┬──────┘
                           │ user sends message
                           ▼
                    ┌─────────────┐
              ┌─────│  classifying │
              │     └──────┬──────┘
              │            │
    ┌─────────┼────────────┼─────────────┐
    ▼         ▼            ▼             ▼
┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐
│ asking │ │planning│ │generating│ │ searching│
└───┬────┘ └───┬────┘ └────┬─────┘ └────┬─────┘
    │          │           │             │
    │          ▼           │             │
    │     ┌─────────┐     │             │
    │     │approving│     │             │
    │     └────┬────┘     │             │
    │          │ approved  │             │
    │          ▼           │             │
    │     ┌──────────┐    │             │
    │     │executing │◄───┘             │
    │     └────┬─────┘                  │
    │          │                        │
    ▼          ▼                        ▼
┌────────────────────────────────────────────┐
│              responding                     │
└────────────────────────────────────────────┘
                    │
                    ▼
              ┌──────────┐
              │   idle   │
              └──────────┘
```

**Implementation:** Don't necessarily need XState as a runtime dependency. The state machine is a **design pattern** that can be implemented with a simple reducer:

```typescript
type ChatState =
  | { status: 'idle' }
  | { status: 'classifying'; userMessage: string }
  | { status: 'asking'; streamingResponse: boolean }
  | { status: 'planning'; plan: GenerationPlan | null }
  | { status: 'approving'; plan: GenerationPlan }
  | { status: 'executing'; plan: GenerationPlan; progress: ExecutionProgress }
  | { status: 'generating'; toolCall: ToolInvocation }
  | { status: 'searching'; query: string }
  | { status: 'responding'; response: string }
  | { status: 'error'; error: ChatError; previousState: ChatState }
```

This gives the UI deterministic rendering (each state maps to specific UI components) and the backend deterministic behavior (each state has valid transitions).

---

## 9. Synthesis: Architecture Recommendation for Studio

### 9.1 Target Architecture

```
User Input (with @mentions)
  │
  ├── Parse mentions → extract sourceIds, widgetIds, conversationIds
  ├── Build context:
  │     1. @mentioned content (highest priority)
  │     2. Studio state (sources, widgets, active plans)
  │     3. User memory (preferences, directives)
  │     4. RAG: HyDE query expansion → hybrid search → cross-encoder rerank → top-8 chunks
  │     5. Conversation history (last 10 messages + summary of older)
  │
  ├── ToolLoopAgent (AI SDK 6):
  │     tools: {
  │       ...autoGeneratedWidgetTools(registry),  // needsApproval: true
  │       propose_generation_plan,                 // needsApproval: true
  │       search_sources,                          // needsApproval: false
  │       list_widgets,                            // needsApproval: false
  │       regenerate_widget,                       // needsApproval: true
  │     }
  │     stopWhen: stepCountIs(10)
  │     prepareStep: dynamicContextManagement()
  │
  ├── Stream response + tool calls to client
  │     - Text: streaming tokens
  │     - Tool calls: interactive cards (approve/modify/cancel)
  │     - Citations: structured objects with source references
  │
  └── Post-completion:
        - Persist messages (onFinish only)
        - Extract user memory (async, end of conversation)
        - Update studio state cache
```

### 9.2 Migration Path from Current Architecture

| Step | Current → Target | Effort |
|------|-----------------|--------|
| 1 | Replace 3-mode selector with unified ToolLoopAgent (tool-based routing) | M |
| 2 | Add `needsApproval` to generation tools, render approval cards | M |
| 3 | Add HyDE query expansion before hybrid search | S |
| 4 | Add cross-encoder reranking after RRF fusion | S |
| 5 | Implement @mentions (hook + dropdown + backend filtering) | M |
| 6 | Enrich system prompt with full studio state | S |
| 7 | Add conversation summarization (sliding window + summary) | M |
| 8 | Implement user memory (DB model + extraction + injection) | L |
| 9 | Add `propose_generation_plan` tool with interactive plan cards | L |
| 10 | Evaluate Anthropic Citations API for source attribution | S |

### 9.3 Technology Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Agent framework** | Vercel AI SDK 6 (`ToolLoopAgent`) | Already in use, first-class Next.js/React integration, `needsApproval` |
| **Model routing** | Mastra (already in Engage) | Multi-provider, TypeScript, familiar |
| **Primary model** | Claude Sonnet (via Anthropic) | Best tool calling, native citations API |
| **Fast model** (summaries, classification) | Gemini Flash or Mistral Small | Cost-effective for non-creative tasks |
| **Embeddings** | Mistral Embed (current) | No change needed |
| **Reranking** | Cohere Rerank or Mistral Rerank | API-based, no infra overhead |
| **Vector DB** | pgvector (current) | No change needed |
| **Memory store** | PostgreSQL (UserMemory table) | Already have Prisma, no new infra |
| **State management** | Reducer pattern (no XState runtime) | Lightweight, type-safe, no new dependency |
| **Real-time progress** | SSE for generation progress | Already have pattern from Engage |

### 9.4 What NOT to Build

Based on research, these are **premature optimizations** for Studio's current scale:

- **GraphRAG** — overkill for 5-50 documents per studio. Hierarchical chunking with section metadata is sufficient.
- **Full XState runtime** — a TypeScript reducer with the same state machine design gives 90% of the benefit at 10% of the complexity.
- **Multi-agent orchestration** — Studio has one agent doing one thing (content generation). Multi-agent adds complexity without value until there are genuinely different specialist agents.
- **Latent/parametric memory** — requires self-hosted models. Token-level memory (DB + vector search) is the only practical option with hosted APIs.
- **RL-driven memory management** — academic frontier, not production-ready.

---

## 10. Sources

### Agentic Patterns
- [8 Agentic Coding Patterns That Ship 10x Faster](https://dev.to/dohkoai/8-agentic-coding-patterns-that-ship-10x-faster-cursor-windsurf-claude-code-2h0j)
- [AI Coding Agents in 2026: Cursor vs Windsurf vs Claude Code](https://callsphere.tech/blog/ai-coding-agents-cursor-windsurf-claude-code-comparison-2026)
- [The Rise of the Agentic IDE](https://markets.financialcontent.com/wss/article/tokenring-2026-1-26-the-rise-of-the-agentic-ide-how-cursor-and-windsurf-are-automating-the-art-of-software-engineering)
- [AI-Driven Prototyping: v0, Bolt, and Lovable Compared](https://addyo.substack.com/p/ai-driven-prototyping-v0-bolt-and)

### RAG & Context Engineering
- [From RAG to Context — A 2025 Year-End Review](https://ragflow.io/blog/rag-review-2025-from-rag-to-context)
- [Optimizing RAG with Hybrid Search & Reranking](https://superlinked.com/vectorhub/articles/optimizing-rag-with-hybrid-search-reranking)
- [Lessons from Implementing RAG in 2025](https://www.truestate.io/blog/lessons-from-rag)
- [RAG Isn't Enough — The Missing Context Layer](https://towardsdatascience.com/rag-isnt-enough-i-built-the-missing-context-layer-that-makes-llm-systems-work/)

### Tool Calling & AI SDK
- [AI SDK 6 — Vercel](https://vercel.com/blog/ai-sdk-6)
- [AI SDK Agents: Overview](https://ai-sdk.dev/docs/agents/overview)
- [AI SDK Agents: Loop Control](https://ai-sdk.dev/docs/agents/loop-control)
- [Human-in-the-Loop with Next.js](https://ai-sdk.dev/cookbook/next/human-in-the-loop)
- [Building AI Agent Workflows with Vercel AI SDK](https://www.callstack.com/blog/building-ai-agent-workflows-with-vercels-ai-sdk-a-practical-guide)
- [LangChain vs Vercel AI SDK vs OpenAI SDK: 2026 Guide](https://strapi.io/blog/langchain-vs-vercel-ai-sdk-vs-openai-sdk-comparison-guide)
- [Choosing an Agent Framework](https://www.speakeasy.com/blog/ai-agent-framework-comparison)

### Memory Systems
- [Memory Systems for AI Agents: What the Research Says](https://stevekinney.com/writing/agent-memory-systems)
- [Comparing Memory Implementations of Claude and ChatGPT](https://simonwillison.net/2025/Sep/12/claude-memory/)
- [AI Memory Explained: What Perplexity, ChatGPT, Pieces, and Claude Remember](https://pieces.app/blog/types-of-ai-memory)
- [Designing a Memory System for Long-Running AI Assistants](https://dasroot.net/posts/2026/03/designing-memory-system-long-running-ai-assistants/)

### Citations
- [Citation-Aware RAG: Fine-Grained Citations](https://www.tensorlake.ai/blog/rag-citations)
- [Introducing Citations on the Anthropic API](https://claude.com/blog/introducing-citations-api)
- [Anthropic-Style Citations with Any LLM](https://medium.com/data-science-collective/anthropic-style-citations-with-any-llm-2c061671ddd5)
- [LLM Citations Explained: RAG & Source Attribution Methods](https://rankstudio.net/articles/en/ai-citation-frameworks)

### Streaming & UX Patterns
- [AI UI Patterns](https://www.patterns.dev/react/ai-ui-patterns/)
- [Vercel AI SDK useChat in Production](https://dev.to/whoffagents/vercel-ai-sdk-usechat-in-production-streaming-errors-and-the-patterns-nobody-writes-about-4ecf)
- [Agent UX Patterns: Chat-First UX Fails](https://hatchworks.com/blog/ai-agents/agent-ux-patterns/)
- [Designing for AI Failures: Error States and Recovery Patterns](https://clearly.design/articles/ai-design-4-designing-for-ai-failures)

### State Machines
- [Stately Agent: State-Machine-Powered LLM Agents](https://github.com/statelyai/agent)
- [Agent Orchestration: State Machines & Patterns](https://cobbai.com/blog/agent-orchestration-customer-service)

### Context Management
- [Context Management Strategies for Cursor](https://datalakehousehub.com/blog/2026-03-context-management-cursor/)
- [Mastering Context Management in Cursor](https://stevekinney.com/courses/ai-development/cursor-context)

### Mastra & Multi-Agent
- [Mastra AI: Complete Guide to the TypeScript Agent Framework](https://www.generative.inc/mastra-ai-the-complete-guide-to-the-typescript-agent-framework-2026)
- [Beyond Workflows: Introducing Agent Network](https://mastra.ai/blog/vnext-agent-network)

### NotebookLM
- [NotebookLM: RAG Architecture Overview](https://www.scribd.com/document/887551310/NotebookLM-Internal-Framework-Explained)
- [NotebookLM: An LLM with RAG for Active Learning](https://arxiv.org/html/2504.09720v2)

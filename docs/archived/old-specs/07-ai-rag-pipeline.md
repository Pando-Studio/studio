# Studio - AI & RAG Pipeline

## Provider Architecture

### Supported providers

| Provider | Chat Model | Embedding Model | Image Model |
|----------|-----------|-----------------|-------------|
| Mistral (default) | mistral-large-latest | mistral-embed | - |
| OpenAI | gpt-4o | text-embedding-3-small | dall-e-3 |
| Anthropic | claude-sonnet-4-20250514 | - | - |
| Google | gemini-2.0-flash | text-embedding-004 | gemini-3-pro |

**File**: `apps/studio/lib/ai/providers.ts`

### BYOK Resolution Chain

When making an LLM call, the provider is resolved in this order:

1. **Studio-level BYOK** (`ProviderConfig` table) — key set for this specific studio
2. **User-level BYOK** (`UserProviderConfig` table) — key set by the user globally
3. **Environment variables** (`MISTRAL_API_KEY`, `OPENAI_API_KEY`, etc.)

If the preferred provider has no key at any level, the system falls back to the next available provider.

```typescript
// lib/ai/providers.ts
async function getProviderForStudio(studioId, preferredProvider?) {
  // Returns: { provider, key, model, apiKey, isByok }
}
```

### BYOK Key Storage

**File**: `apps/studio/lib/ai/byok.ts`

API keys are encrypted before storage in the database. Keys are decrypted at call time.

> **Security warning**: Current encryption uses XOR with a repeating key (`BYOK_ENCRYPTION_KEY` env var). This is **not cryptographically secure** and must be replaced with AES-256-GCM before production or open-source release. The code contains an explicit TODO acknowledging this.

### Key Validation

Before saving a BYOK key, the system validates it by making a test API call:

- Mistral: `GET /v1/models`
- OpenAI: `GET /v1/models`
- Anthropic: `POST /v1/messages` (minimal request, checks auth)
- Google: `GET /v1beta/models`

## Document Ingestion Pipeline

### Flow

```
Upload (file/URL/YouTube)
  │
  ├─ Store file in S3 (Cellar)
  ├─ Create StudioSource record (status: PENDING)
  ├─ Enqueue BullMQ job: source-analysis
  │
  ▼ Worker: analyze-source.worker.ts
  │
  ├─ Update status: INDEXING
  ├─ Download file from S3
  ├─ Parse via Unstructured.io API
  │   └─ Returns structured elements (Title, NarrativeText, Table, etc.)
  ├─ Chunk with structure awareness
  │   ├─ Respects document structure (sections, tables isolated)
  │   ├─ Max ~1500 chars per chunk, ~200 char overlap
  │   └─ Paragraph-aware boundaries
  ├─ For each chunk:
  │   ├─ Generate Mistral embedding (1024D, batch ≤25)
  │   └─ Store as StudioSourceChunk (content + embedding + metadata)
  ├─ Update status: INDEXED
  │
  └─ On error: Update status: ERROR, store error in metadata
```

### Supported source types

| Type | How parsed | Notes |
|------|-----------|-------|
| PDF, DOCX, PPTX, XLSX | Unstructured.io API | Full document structure |
| TXT, MD, HTML | Unstructured.io API | Text extraction |
| YouTube | `youtube-transcript` package | Transcript extraction |
| Web URL | Fetch + parse | HTML content extraction |
| Audio/Video | Whisper (via transcription) | Audio transcription |

### Chunking strategy

**File**: `apps/studio/lib/unstructured.ts`

Three strategies, applied based on document type:

1. **Structure-aware** (default): Respects element types from Unstructured.io. Titles start new chunks. Tables and figures are isolated. Overlaps by ~200 chars.
2. **Paragraph-aware**: Splits on paragraph boundaries. Used for simpler documents.
3. **Fixed-size**: Fallback for unstructured content. Fixed character count with overlap.

## Hybrid Search (RAG)

### Architecture

**File**: `apps/studio/lib/ai/embeddings.ts`

Search combines two signals fused by Reciprocal Rank Fusion:

```
Query
  │
  ├─ Dense search: embed query → pgvector cosine similarity
  │   SELECT *, 1 - (embedding <=> $queryVector) AS score
  │   FROM studio_source_chunks
  │   WHERE sourceId IN (selectedSources)
  │   ORDER BY score DESC LIMIT K
  │
  ├─ Sparse search: PostgreSQL tsvector BM25
  │   SELECT *, ts_rank(tsv, query) AS score
  │   FROM studio_source_chunks
  │   WHERE tsv @@ plainto_tsquery('french', $query)
  │   ORDER BY score DESC LIMIT K
  │
  └─ Reciprocal Rank Fusion (k=60)
      score(doc) = sum(1 / (k + rank_dense) + 1 / (k + rank_sparse))
      Return top-N fused results
```

### Why hybrid?

- **Dense search** captures semantic similarity (meaning-based)
- **Sparse BM25** captures lexical matches (exact terms, names, acronyms)
- **RRF fusion** balances both signals without needing score calibration

French stemming is used for BM25 (`plainto_tsquery('french', ...)`) since the target audience is primarily francophone.

## Generation Workflows

### Mastra Framework

**Directory**: `apps/studio/lib/mastra/`

Mastra is the AI orchestration layer. Each generation type has a workflow composed of steps:

```
Mastra Instance
  └── Workflows
       ├── generate-widget.workflow.ts       # Unified widget generation
       ├── generate-presentation.workflow.ts  # Presentation v1
       ├── generate-presentation-v2.workflow.ts
       ├── generate-course-plan.workflow.ts
       └── generate-roleplay.workflow.ts
```

### Standard workflow pattern

```typescript
// Simplified from generate-widget.workflow.ts
const generateWidgetWorkflow = new Workflow({
  name: 'generate-widget',
  steps: [
    // Step 1: Retrieve relevant chunks via hybrid search
    {
      id: 'retrieve',
      execute: async ({ context }) => {
        const chunks = await hybridSearch(context.query, context.sourceIds);
        return { chunks };
      },
    },
    // Step 2: Generate via LLM
    {
      id: 'generate',
      execute: async ({ context }) => {
        const result = await generateText({
          model: resolvedModel,
          system: template.systemPrompt,
          prompt: buildPrompt(template, context.inputs, context.chunks),
        });
        return { raw: result.text };
      },
    },
    // Step 3: Validate output
    {
      id: 'validate',
      execute: async ({ context }) => {
        const parsed = outputSchema.safeParse(JSON.parse(context.raw));
        if (!parsed.success) throw new Error('Validation failed');
        return { data: parsed.data };
      },
    },
  ],
});
```

### Prompts

**Directory**: `apps/studio/lib/mastra/prompts/`

Prompts are structured as TypeScript template literals with variable injection. Each widget template defines its own system prompt and user prompt template.

## Chat with RAG

### Endpoint

`POST /api/studios/[id]/chat`

### Flow

```
1. Receive message + mode (ASK/PLAN/AGENT) + optional sourceIds
2. Load or create Conversation
3. If mode is ASK or PLAN:
   a. Hybrid search over selected sources
   b. Build system prompt with RAG context
   c. streamText() via Vercel AI SDK
   d. Stream response to client
   e. On stream end: persist assistant message + citations
4. If mode is AGENT:
   a. Use generateText() with tool definitions
   b. Tools can generate widgets, search sources, etc.
   c. Persist result
```

### Citations

Citations map RAG chunks to response segments. Returned in the `X-Citations` response header (URL-encoded JSON).

### Conversation modes

| Mode | Behavior |
|------|----------|
| ASK | Q&A with source citations |
| PLAN | AI proposes a plan before executing |
| AGENT | AI executes actions via tool calls |

# Studio - Architecture

## Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                     │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │  Pages (SSR/CSR) │  │  API Routes (serverless)     │ │
│  │  app/(dashboard)/ │  │  app/api/                    │ │
│  │  app/(auth)/      │  │  studios, documents, chat,   │ │
│  │                   │  │  providers, queue, favorites  │ │
│  └────────┬─────────┘  └─────────────┬────────────────┘ │
│           │                          │                    │
│  ┌────────▼──────────────────────────▼────────────────┐ │
│  │                    lib/ (Business Logic)            │ │
│  │  ┌─────────┐  ┌──────────┐  ┌───────────────────┐ │ │
│  │  │ ai/     │  │ mastra/  │  │ composition/      │ │ │
│  │  │providers│  │workflows │  │ WPS++ types       │ │ │
│  │  │byok    │  │prompts   │  │ validation        │ │ │
│  │  │embed   │  │          │  │                   │ │ │
│  │  └────────┘  └──────────┘  └───────────────────┘ │ │
│  │  ┌─────────┐  ┌──────────┐  ┌───────────────────┐ │ │
│  │  │ queue/  │  │ deploy/  │  │ widget-templates/ │ │ │
│  │  │workers  │  │flatten   │  │ registry          │ │ │
│  │  │queues   │  │          │  │ templates (JSON)  │ │ │
│  │  └────────┘  └──────────┘  └───────────────────┘ │ │
│  └────────────────────────┬───────────────────────────┘ │
│                           │                              │
│  ┌────────────────────────▼───────────────────────────┐ │
│  │                External Services                    │ │
│  │  PostgreSQL   Redis    S3/Cellar   Unstructured.io │ │
│  │  (pgvector)   (cache   (files)     (doc parsing)   │ │
│  │               + queue)                              │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Separation of Concerns

| Directory | Responsibility | Server/Client |
|-----------|---------------|---------------|
| `app/` | Route definitions, page layouts, API handlers | Mixed |
| `components/` | React UI components | Client (mostly) |
| `lib/` | Business logic, AI, database, queue, composition | Server only |
| `hooks/` | Custom React hooks (Google Drive, debounce) | Client only |
| `middleware.ts` | Route protection, session redirects | Edge |
| `instrumentation.ts` | BullMQ worker startup | Node.js runtime |

## Client/Server Boundary

Studio uses a "client-heavy" architecture. The React Server Component boundary is minimal:

```
app/layout.tsx (Server Component)
  └─ app/(dashboard)/layout.tsx ("use client")  ← boundary
       └─ StudioProvider (Context)
            ├─ SourcesPanel
            ├─ ChatPanel
            └─ RightPanel (widgets, templates)
```

**Server Components**: Only the root layout (`app/layout.tsx`) and the home redirect page (`app/page.tsx`).

**Client Components**: Everything under `(dashboard)/layout.tsx` is client-side. This includes all studio pages, panels, widget editors, and forms. The dashboard layout uses `usePathname()` from `next/navigation` for conditional sidebar rendering.

**Consequence**: No RSC data fetching. All data is fetched client-side via `fetch()` in `useEffect`/`useCallback`, wrapped by `StudioContext`.

### Why client-heavy?

The Studio workspace is a highly interactive, panel-based UI (sources panel, chat panel, widget panel) with real-time polling for generation status. RSC would add complexity without clear benefit for this use case. The data fetching patterns (polling, streaming, optimistic updates) are inherently client-side.

## Middleware

**File**: `middleware.ts`

```
Request
  │
  ├─ /dashboard, /studios, /settings → Protected
  │   ├─ Has session token OR anonymous code → Allow
  │   └─ Neither → Redirect to /api/auth/anonymous
  │
  ├─ /login, /register → Auth routes
  │   ├─ Already authenticated → Redirect to /dashboard
  │   └─ Not authenticated → Allow
  │
  └─ /, /recover, /api → Public → Allow
```

Two authentication modes:
- **Authenticated**: BetterAuth session token cookie (`better-auth.session_token`)
- **Anonymous**: Studio anonymous code cookie (`studio_anonymous_code`)

Protected routes accept either. If neither exists, the middleware auto-creates an anonymous session.

## Worker Initialization

**File**: `instrumentation.ts`

BullMQ workers are started via Next.js instrumentation hook (runs once on server startup, Node.js runtime only):

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Start all workers
    createSourceAnalysisWorker();      // Document parsing + embedding
    createWidgetGenerationWorker();     // Widget generation via Mastra
    startPresentationGenerationWorker(); // Presentation generation
    createCoursePlanGenerationWorker(); // Course plan generation
  }
}
```

Workers connect to Redis via `lib/queue/connection.ts` and process jobs from their respective queues.

## Request Flow Examples

### Widget Generation

```
Client                    API Route                     Worker
  │                         │                             │
  ├─ POST /generate ──────►│                             │
  │                         ├─ Create Widget (DRAFT)      │
  │                         ├─ Create GenerationRun       │
  │                         ├─ Execute Mastra workflow ──►│
  │  ◄── { widget, runId } ┤                             │
  │                         │                    Retrieve RAG context
  │  Poll /generations ────►│                    Call LLM
  │  ◄── { runs: [...] }   │                    Validate with Zod
  │                         │                    Update Widget → READY
  │  Poll /generations ────►│                    Update Run → COMPLETED
  │  ◄── { status: COMPLETED }                           │
  │  Fetch /studios/[id] ──►│                             │
  │  ◄── { studio with updated widgets }                  │
```

### Chat with RAG

```
Client                    API Route
  │                         │
  ├─ POST /chat ──────────►│
  │                         ├─ Load conversation (or create)
  │                         ├─ Hybrid search (dense + BM25 + RRF)
  │                         ├─ Build system prompt with RAG context
  │                         ├─ streamText() via Vercel AI SDK
  │  ◄── Streaming chunks   │
  │  ◄── Headers: X-Conversation-Id, X-Citations
  │                         ├─ On stream end: persist assistant message
```

### Deploy to Engage

```
Studio API                    Engage API
  │                              │
  ├─ POST /deploy-to-engage     │
  │   ├─ Fetch all widgets       │
  │   ├─ Flatten tree → activities
  │   ├─ POST /api/projects/import ──►│
  │   │   (X-API-Secret header)       ├─ Create Project
  │   │                               ├─ Create Activities
  │   │                               ├─ Create LiveSession
  │   ◄── { projectId, sessionCode }  │
```

## Configuration

### Environment Variables

See `apps/studio/.env.example` for the complete list. Key groups:

| Group | Variables | Required |
|-------|----------|----------|
| App | `NEXT_PUBLIC_APP_URL` | Yes |
| Database | `DATABASE_URL` | Yes |
| Redis | `REDIS_URL` | Yes |
| AI defaults | `MISTRAL_API_KEY`, `OPENAI_API_KEY`, etc. | At least one |
| BYOK | `BYOK_ENCRYPTION_KEY` | Yes |
| Doc parsing | `UNSTRUCTURED_API_KEY` | Yes |
| Storage | `CELLAR_ADDON_HOST`, `CELLAR_ADDON_KEY_ID`, `CELLAR_ADDON_KEY_SECRET`, `S3_BUCKET` | Yes |
| Engage bridge | `NEXT_PUBLIC_ENGAGE_URL`, `ENGAGE_API_SECRET` | For deploy |
| Auth | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Yes |
| OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional |

### Docker Services

```bash
pnpm docker:up  # Starts PostgreSQL (5432, 5433) + Redis (6379)
```

Studio uses the PostgreSQL instance on port **5433** (`qiplim_studio` database) and the shared Redis on port **6379**.

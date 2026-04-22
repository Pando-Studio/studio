# Qiplim Studio - Technical Overview

## What is Studio?

Qiplim Studio is an AI-powered authoring platform that transforms documents into interactive web components (widgets). It follows a "RAG to Web Component" pipeline: users upload sources, the system indexes and embeds them, then generates interactive widgets via LLM calls guided by templates.

Studio is one of two applications in the Qiplim monorepo. The other is **Engage**, the live session delivery platform.

| Aspect | Studio | Engage |
|--------|--------|--------|
| Purpose | Authoring — create content from documents | Delivery — run live interactive sessions |
| Port | 3001 | 3000 |
| Database | `qiplim_studio` (PostgreSQL, port 5433) | `qiplim_engage` (PostgreSQL, port 5432) |
| Prisma package | `@qiplim/db-studio` | `@qiplim/db-engage` |
| Real-time | None (polling for generation progress) | Ably WebSocket (live sessions) |
| AI usage | Generation (widgets, presentations, course plans) | Evaluation (chat, activity feedback) |
| Users | Speakers, trainers, content creators | Participants, audience members |

## Core Pipeline

```
Documents → Parse (Unstructured.io) → Chunk → Embed (pgvector) → Hybrid Search (dense + BM25)
    ↓
Widget Template (JSON manifest) → Mastra Workflow → LLM Call → Zod Validation → Widget Record
    ↓
Deploy to Engage → Flat Activity List → Live Session
```

### Step by step

1. **Ingest**: Upload documents (PDF, DOCX, PPTX, web URLs, YouTube). Parsed by Unstructured.io, chunked with structure awareness, embedded via Mistral Embed (1024D), stored in PostgreSQL with pgvector.
2. **Search**: Hybrid retrieval combining dense cosine similarity (pgvector) and sparse BM25 (tsvector, French stemming), fused via Reciprocal Rank Fusion (k=60).
3. **Generate**: Template-driven generation via Mastra workflows. Each widget type has a JSON template defining inputs, prompts, and output schemas. LLM generates content, validated by Zod.
4. **Compose**: Widgets can be organized hierarchically — leaf widgets inside containers (sequences) or composites (course modules) with slot-based composition.
5. **Deploy**: Flatten widget tree into ordered activities, POST to Engage's import API, create project + live session.

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 15.1 |
| Language | TypeScript | 5.6 |
| Database | PostgreSQL + pgvector | 16 |
| ORM | Prisma | via `@qiplim/db-studio` |
| Cache / Queue broker | Redis + BullMQ | ioredis 5.9, bullmq 5.66 |
| AI orchestration | Mastra | 0.24 |
| AI SDK | Vercel AI SDK | 6.0 |
| LLM providers | Mistral (default), OpenAI, Anthropic, Google | Multi-provider BYOK |
| Document parsing | Unstructured.io | Client 0.30 |
| Auth | BetterAuth | 1.4 |
| UI | Radix UI + Tailwind CSS + CVA | - |
| Icons | lucide-react | 0.511 |
| Rich text | Tiptap | 2.4 |
| Storage | S3-compatible (Clever Cloud Cellar) | AWS SDK v3 |

## Key Directories

```
apps/studio/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── (auth)/             # Login, register
│   ├── (dashboard)/        # Protected pages (studios, library, settings)
│   └── api/                # REST API endpoints
├── components/
│   ├── ui/                 # Radix UI primitives (shadcn/ui)
│   ├── studio/             # Studio workspace (context, panels, modals)
│   ├── widgets/            # Widget type components (display + editor per type)
│   ├── presentation/       # Presentation editor
│   ├── composite/          # Composite widget editor
│   ├── course-plan/        # Course plan editor
│   ├── editor/             # Rich text editor (Tiptap)
│   └── library/            # Document library UI
├── lib/
│   ├── ai/                 # Providers, BYOK, embeddings, chat tools
│   ├── composition/        # WPS++ types and validation
│   ├── mastra/             # Mastra instance, workflows, prompts
│   ├── queue/              # BullMQ queues and workers
│   ├── widget-templates/   # JSON templates for widget generation
│   ├── presentations/      # Presentation schemas and renderers
│   ├── deploy/             # Flatten widgets for Engage deployment
│   ├── auth.ts             # BetterAuth configuration
│   ├── redis.ts            # Redis client, cache keys, TTLs
│   ├── s3.ts               # S3 file upload/download
│   └── unstructured.ts     # Document parsing + chunking
├── hooks/                  # Custom React hooks
├── middleware.ts            # Route protection (auth + anonymous sessions)
└── instrumentation.ts       # BullMQ worker initialization
```

## BYOK (Bring Your Own Key)

Studio supports multi-provider AI with a fallback resolution chain:

1. **Studio-level config** — Provider key set for a specific studio (`ProviderConfig`)
2. **User-level config** — Provider key set by the user (`UserProviderConfig`)
3. **Environment variables** — Default keys from server env (`MISTRAL_API_KEY`, etc.)

Supported providers: Mistral, OpenAI, Anthropic, Google.

> **Known issue**: API keys are currently encrypted with XOR (not cryptographically secure). Must be replaced with AES-256-GCM before any production or open-source release. See `apps/studio/lib/ai/byok.ts`.

## Open Source Vision

Studio is designed to become an open-source "RAG to Web Component" engine, inspired by the n8n open-core model:

| Component | License |
|-----------|---------|
| Studio Core (RAG + generation engine) | Open source |
| Default widgets | Open source |
| Widget Dev Kit | Open source |
| Qiplim Cloud (hosting, support) | Commercial |
| Live Runtime (Engage real-time) | Proprietary |

Current status: **Not yet open-sourced**. See `docs/studio/11-open-source-prep.md` for the readiness assessment.

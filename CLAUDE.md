# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Package Manager & Build

Uses **pnpm** 9.12.0 (standalone app, not a monorepo).

```bash
# Dev
pnpm dev                    # Next.js dev server (port 3001)

# Build & Lint
pnpm build                  # Prisma generate + Next.js build
pnpm lint                   # ESLint
pnpm typecheck              # TypeScript check (tsc --noEmit)

# Database
pnpm docker:up              # Start PostgreSQL + Redis
pnpm docker:down            # Stop containers
pnpm db:push                # Sync Prisma schema to DB
pnpm db:generate            # Regenerate Prisma client
pnpm db:migrate             # Interactive migration
pnpm db:studio              # Open Prisma Studio GUI

# Testing
pnpm test                   # Unit tests (Vitest)
pnpm test:watch             # Watch mode

# Full setup
pnpm setup                  # Docker + DB push + dev server
```

## Architecture

**Next.js 15** standalone app (App Router) for AI-powered widget generation from documents.

```
app/
  [locale]/              # Locale-prefixed routes (en, fr) — next-intl
  (admin)/               # Admin panel (user management, instance config)
  (auth)/                # Login, signup (BetterAuth)
  (dashboard)/           # User dashboard, studios, settings
  (public)/              # Public player, docs pages, developers
  api/                   # API routes
    v1/                  # Public API (generate, types, openapi.json)
    widgets/             # Widget CRUD
    studios/             # Studio CRUD, share, events (SSE)
    documents/           # Upload, parse
    presentations/       # Presentation management
    queue/               # Job queue operations
    providers/           # AI provider config
    mcp/                 # MCP server (SSE transport)
    auth/                # BetterAuth routes
components/
  widgets/               # 28 widget types — Display + Editor per type
  widgets/player/        # Player components (QuizPlayer, FlashcardPlayer, MediaPlayer, ComposedPlayer, ReadablePlayer...)
  widgets/registry.tsx   # Widget type → component registry
  studio/                # Studio editor (source panel, widget panel, chat)
  presentation/          # Presentation management UI
  ui/                    # shadcn/ui components
  layout/                # Navigation, sidebars
lib/
  ai/                    # Multi-LLM: providers, TTS, image gen, embeddings, BYOK
  schemas/               # Zod schemas
    widget-configs.ts    # All widget config schemas + registry
    composition.ts       # Composition schemas
  widget-templates/      # JSON generation templates
    templates/           # 24 template files (one per generation workflow)
    registry.ts          # Template registry (singleton)
    prompt-builder.ts    # Prompt construction from templates
  queue/                 # BullMQ
    queues.ts            # Queue definitions (5 queues)
    workers/             # Workers (source-analysis, widget-generation, presentation, course-plan)
    connection.ts        # Redis connection
  composition/           # Widget composition engine (playback order, conditions)
  connectors/            # Google Drive integration (future: Notion, SharePoint)
  mcp/                   # MCP server (stdio + SSE, 3 tools)
  events/                # Redis pub/sub → SSE
  deploy/                # Deploy-to-Engage bridge
  monitoring/            # Structured logger
    logger.ts            # logger.error/warn/info/debug
  api/                   # Auth context helpers, validation schemas, rate limiting
  queries/               # Prisma queries (server-side)
  stores/                # Zustand stores (client-side UI state)
  i18n/                  # next-intl setup
  auth.ts                # BetterAuth config
  db.ts                  # Prisma client
  redis.ts               # Redis client
  s3.ts                  # S3/Cellar storage
prisma/
  schema.prisma          # Full data model (40+ tables, 6 enums, pgvector)
```

### Widget System

28 widget types implemented. Each type is self-contained:

```
components/widgets/{type}/
  {Type}Display.tsx      # Read-only view
  {Type}Editor.tsx       # Edit form (auto-saves via WidgetEditContext)
  index.ts               # Barrel export
```

**Source of truth for widget config**: `lib/schemas/widget-configs.ts` (Zod schemas). Each type has a schema registered in `WidgetConfigSchemas`, `WidgetConfigMap`, and `getDefaultWidgetConfig`.

**Generation templates**: `lib/widget-templates/templates/{name}.json` — one per generation workflow, registered in `lib/widget-templates/registry.ts`. The AI chat agent auto-generates 24 tools from this registry via `buildWidgetToolsFromRegistry()`.

**Player system**: Players in `components/widgets/player/` handle self-paced playback. `ReadablePlayer` is the default (scroll tracking). Specialized players: `QuizPlayer`, `QcmPlayer`, `FlashcardPlayer`, `RankingPlayer`, `OpentextPlayer`, `PostitPlayer`, `MediaPlayer`, `ComposedPlayer`.

**Widget types enum** (in Prisma): QUIZ, MULTIPLE_CHOICE, WORDCLOUD, POSTIT, RANKING, OPENTEXT, ROLEPLAY, QCM, IMAGE, FAQ, GLOSSARY, SUMMARY, FLASHCARD, TIMELINE, REPORT, DATA_TABLE, MINDMAP, INFOGRAPHIC, AUDIO, VIDEO, SYLLABUS, SESSION_PLAN, PROGRAM_OVERVIEW, CLASS_OVERVIEW, PRESENTATION, SEQUENCE, COURSE_MODULE, SLIDE.

### Database

PostgreSQL 16 with pgvector. Prisma schema at `prisma/schema.prisma`.

Key model groups:
- **Auth**: user, session, account, verification (BetterAuth)
- **Content**: Studio, Widget (28 types), Presentation, Slide, Conversation
- **Sources**: StudioSource, StudioSourceChunk (pgvector embeddings), DocumentFolder, DocumentTag
- **Config**: ProviderConfig, UserProviderConfig (BYOK, AES-256-GCM), InstanceConfig
- **Tracking**: WidgetPlayResult, GenerationRun, DeepResearchRun
- **Sharing**: StudioShare (5 role levels), ApiKey (SHA-256)

### AI Stack

Multi-provider via **Vercel AI SDK 6.0** + **Mastra**:
- Mistral (default), OpenAI, Anthropic, Google Gemini
- BYOK: per-user encrypted keys (AES-256-GCM, prefix `v2:`)
- RAG: hybrid search (pgvector cosine + tsvector) + RRF fusion + Jina reranking + HyDE
- TTS: OpenAI (multi-speaker segments for podcasts)
- Embeddings: versioned per chunk (`embeddingModel` field)

### Real-time

Redis pub/sub → SSE endpoint (`/api/studios/[id]/events`) → `useStudioEvents()` hook.
Events: `source:status`, `generation:progress`, `generation:complete`, `widget:updated`.

### State Management

- **TanStack Query v5** — server state (studios, sources, widgets, conversations, runs)
- **Zustand** — client UI state (panels, source selection, active conversation, citation navigation)
- **StudioContext** — thin wrapper composing TanStack Query + Zustand

## Conventions

- **Commits**: Conventional Commits (`feat(studio):`, `fix(studio):`, `docs:`)
- **Branches**: `feature/<short-description>`, `fix/<short-description>`
- **Merge**: Squash merge to `main`
- **Path aliases**: `@/*` maps to project root
- **UI**: Always use shadcn/ui from `components/ui/`. Install missing: `pnpm dlx shadcn@latest add <component>`
- **Logging**: Use `logger` from `lib/monitoring/logger.ts` (not `console.error`). Methods: `logger.error`, `logger.warn`, `logger.info`, `logger.debug`
- **Type safety**: Use `getWidgetConfig()` from `lib/schemas/widget-configs.ts` — no `as unknown as X` casts for widget configs
- **i18n**: Use `useTranslations()` from `next-intl` for all user-facing text. Messages in `messages/en.json` and `messages/fr.json`

## Environment

Copy `.env.example` to `.env`. Required variables:
- `DATABASE_URL` — PostgreSQL (port 5433 for local Docker)
- `REDIS_URL` — Redis for BullMQ + pub/sub
- `BETTER_AUTH_SECRET` — auth secret
- At least one AI key: `MISTRAL_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_API_KEY`
- `BYOK_ENCRYPTION_KEY` — for user API key encryption

Optional: `CELLAR_*` (S3 storage), `DOCLING_URL` (self-hosted doc parser), `UNSTRUCTURED_API_KEY` (SaaS fallback), Google OAuth, Engage integration.

## Testing

- **Unit tests**: `__tests__/` — Vitest, covers AI generation, API endpoints, composition logic
- **Setup**: `__tests__/setup.ts` mocks Prisma, Redis, AI SDK
- Run: `pnpm test`

## Infrastructure

- **Docker**: PostgreSQL 16 + pgvector (port 5433), Redis 7 (port 6379)
- **Auth**: BetterAuth with Prisma adapter
- **Storage**: S3-compatible (Cellar on Clever Cloud)
- **Document parsing**: Docling (self-hosted, preferred) or Unstructured.io (SaaS fallback)
- **Node.js**: Pinned to v20 via `.node-version`

## Known Issues

- **Public pages not i18n'd**: Pages under `(public)/` (player, docs, developers) have hardcoded text instead of using `[locale]/` + `useTranslations()`. This is a known critical issue.

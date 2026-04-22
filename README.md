<p align="center">
  <h1 align="center">Qiplim Studio</h1>
  <p align="center">AI-powered interactive learning content from any document</p>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-green.svg" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/pnpm-9.12-orange.svg" alt="pnpm 9.12" />
</p>

---

Qiplim Studio transforms documents into interactive learning experiences. Upload a PDF, paste a URL, or connect Google Drive — the AI generates quizzes, flashcards, timelines, podcasts, mind maps, and 28 other widget types automatically.

**Try it live:** [studio.qiplim.com](https://studio.qiplim.com) — a hosted instance maintained by [Pando Studio](https://pando-studio.com), the company behind Qiplim.

## Features

- **28 widget types** — quizzes, flashcards, summaries, FAQs, timelines, mind maps, infographics, audio podcasts, video slideshows, presentations, and more
- **Multi-LLM support** — Mistral (default), OpenAI, Anthropic, Google Gemini. Bring Your Own Key (BYOK) per user
- **RAG pipeline** — hybrid search (pgvector + tsvector), HyDE, contextual embeddings, Jina reranking
- **Document processing** — PDF, DOCX, PPTX via Docling (self-hosted) or Unstructured.io (SaaS)
- **Intelligent chat** — unified AI agent with 24 auto-generated tools, citations, @mentions, memory
- **Composition** — combine widgets into presentations, sequences, and course modules
- **Player system** — self-paced playback with progress tracking and scoring
- **Public API** — stateless generation endpoints, OpenAPI 3.1 spec, API key auth
- **MCP server** — integrate with Claude Code, Cursor, and other MCP clients
- **i18n** — French and English (next-intl)
- **Self-hostable** — Docker Compose, PostgreSQL, Redis

## Quick Start

### Prerequisites

- Node.js 20+ (see `.node-version`)
- pnpm 9.12+
- Docker & Docker Compose
- At least one AI provider API key (Mistral, OpenAI, Anthropic, or Google)

### Setup

```bash
git clone https://github.com/Qiplim/studio.git
cd studio
pnpm install
cp .env.example .env
# Edit .env with your API keys
pnpm setup   # Starts Docker (PostgreSQL + Redis), pushes DB schema, launches dev server
```

The app runs at [http://localhost:3001](http://localhost:3001).

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (port 3001) |
| `pnpm build` | Build for production |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm db:push` | Sync Prisma schema to database |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm docker:up` | Start PostgreSQL + Redis |
| `pnpm docker:down` | Stop containers |

## Architecture

```
app/
  [locale]/           # Locale-prefixed routes (en, fr)
  (admin)/            # Admin panel
  (auth)/             # Login, signup
  (dashboard)/        # User dashboard, studios
  (public)/           # Public player, docs
  api/                # API routes (v1/, widgets/, documents/, mcp/)
components/
  widgets/            # 28 widget types (Display + Editor per type)
  widgets/player/     # Player components (Quiz, Flashcard, Media, Composed...)
  studio/             # Studio editor UI
  ui/                 # shadcn/ui components
lib/
  ai/                 # Multi-LLM abstraction, TTS, image generation, embeddings
  schemas/            # Zod schemas (widget configs, composition)
  widget-templates/   # JSON generation templates (24 templates)
  queue/              # BullMQ workers (source analysis, widget generation)
  composition/        # Widget composition engine
  connectors/         # Google Drive, future connectors
  mcp/                # MCP server (stdio + SSE)
prisma/
  schema.prisma       # Full data model (40+ tables, pgvector)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | PostgreSQL 16 + pgvector (Prisma ORM) |
| Cache & Queue | Redis + BullMQ |
| AI | Vercel AI SDK 6.0 + Mastra |
| Auth | BetterAuth (email, Google OAuth) |
| UI | Tailwind CSS + shadcn/ui + Tiptap |
| State | TanStack Query v5 + Zustand |
| Storage | S3-compatible (Cellar / AWS) |
| i18n | next-intl (FR, EN) |

## Documentation

Detailed specifications live in [`docs/`](docs/README.md):

- [Development Plan](docs/development-plan.md) — 5-phase roadmap with widget matrix
- [Widget System Spec](docs/specs/widgets/widget-system-spec.md) — architecture, taxonomy, composition
- [Widget Catalog](docs/specs/widgets/widget-catalog.md) — all 41 planned widget types
- [Data Model](docs/specs/architecture/data-model.md) — Prisma schema documentation
- [API Reference](docs/specs/architecture/api-reference.md) — ~55 internal endpoints
- [Implementation Status](docs/current/implementation-status.md) — what's built vs. planned

## Hosted Instance

[**studio.qiplim.com**](https://studio.qiplim.com) is a cloud instance of Qiplim Studio hosted and maintained by [Pando Studio](https://pando-studio.com). It runs a fork of this repository with deployment configuration for [Clever Cloud](https://clever-cloud.com) (French cloud provider).

You can use the hosted instance directly, or self-host your own — see [Self-Hosting docs](docs/specs/integration/open-source-plan.md) and the [Docker Compose setup](docker-compose.yml).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions, and how to add a new widget type.

## Links

- [studio.qiplim.com](https://studio.qiplim.com) — Hosted instance
- [qiplim.com](https://qiplim.com) — Qiplim project
- [pando-studio.com](https://pando-studio.com) — Pando Studio (company)

## License

[MIT](LICENSE)

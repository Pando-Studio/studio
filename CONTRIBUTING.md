# Contributing to Qiplim Studio

Thanks for your interest in contributing! This guide covers setup, conventions, and how to add new widget types.

## Development Setup

### Prerequisites

- Node.js 20+ (see `.node-version`)
- pnpm 9.12.0+
- Docker & Docker Compose
- At least one AI provider API key (Mistral, OpenAI, Anthropic, or Google)

### First-time setup

```bash
git clone https://github.com/Qiplim/studio.git
cd studio
pnpm install
cp .env.example .env
# Edit .env with your API keys
pnpm setup         # Starts Docker, pushes DB schema, launches dev server
```

Or step by step:

```bash
docker compose up -d
pnpm db:push
pnpm dev
```

The app runs at [http://localhost:3001](http://localhost:3001).

### Running checks

```bash
pnpm lint          # ESLint
pnpm typecheck     # TypeScript
pnpm test          # Unit tests (Vitest)
```

---

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(studio): add audio podcast generation
fix(engage): fix participant join timeout
docs: update widget catalog
refactor(studio): extract TTS module
test(studio): add audio generation tests
```

**Scopes**: `widget`, `ai`, `chat`, `db`, `ui`, `api`, `ci`, `docs`

---

## Branch Naming

```
feature/<short-description>
fix/<short-description>
```

---

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes with clear commits
3. Ensure `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass
4. Open a PR with:
   - **Title**: short, under 70 characters
   - **Description**: what changed and why
   - **Test plan**: how to verify the change
5. PRs are squash-merged to `main`

---

## Project Structure

```
app/                          # Next.js App Router
  [locale]/                   # Locale-prefixed routes (en, fr)
  (admin)/                    # Admin panel
  (auth)/                     # Login, signup
  (dashboard)/                # User dashboard, studios
  (public)/                   # Public player, docs
  api/                        # API routes (v1/, widgets/, mcp/)
components/
  widgets/                    # 28 widget types (Display + Editor per type)
  widgets/player/             # Player components
  studio/                     # Studio editor UI
  ui/                         # shadcn/ui components
lib/
  ai/                         # Multi-LLM, TTS, image gen, embeddings
  schemas/                    # Zod schemas (widget configs, composition)
  widget-templates/           # JSON generation templates (24 templates)
  queue/                      # BullMQ workers
  mcp/                        # MCP server
prisma/
  schema.prisma               # Data model (40+ tables, pgvector)
docs/                         # Specifications and roadmap
```

### Key files

| Path | Purpose |
|------|---------|
| `components/widgets/{type}/` | Display + Editor per widget type |
| `components/widgets/player/` | Player components (ReadablePlayer, MediaPlayer, etc.) |
| `components/widgets/registry.tsx` | Widget type -> component mapping |
| `lib/schemas/widget-configs.ts` | Zod schemas for all widget configs (source of truth) |
| `lib/widget-templates/templates/` | JSON generation templates |
| `lib/widget-templates/registry.ts` | Template registry |
| `lib/ai/` | AI providers, TTS, image generation, embeddings |
| `lib/queue/workers/` | BullMQ workers for async generation |

---

## Adding a New Widget Type

### 1. Define the schema

Add a Zod schema in `lib/schemas/widget-configs.ts`:

```typescript
export const MyWidgetConfigSchema = z.object({
  title: z.string().default(''),
  // ... your fields
});
export type MyWidgetConfig = z.infer<typeof MyWidgetConfigSchema>;
```

Register it in `WidgetConfigSchemas`, `WidgetConfigMap`, and `getDefaultWidgetConfig`.

### 2. Create Display and Editor components

```
components/widgets/my-widget/
  MyWidgetDisplay.tsx    # Read-only view
  MyWidgetEditor.tsx     # Edit form
  index.ts               # Barrel export
```

### 3. Register in the widget registry

In `components/widgets/registry.tsx`, add your widget to the registry map.

### 4. Create a generation template

Add `lib/widget-templates/templates/my-widget.json` following the existing pattern (see `summary-structured.json` for a simple example).

Register it in `lib/widget-templates/registry.ts`.

### 5. Add the type to Prisma

If this is a new `WidgetType` enum value, add it to `prisma/schema.prisma` and run `pnpm db:generate`.

### 6. Add a Player (optional)

If the widget needs interactive playback, create a Player component in `components/widgets/player/`. Otherwise, it will use `ReadablePlayer` (scroll/time tracking) by default.

---

## Code Conventions

- **UI components**: Always use shadcn/ui from `components/ui/`
- **Logging**: Use `logger` from `lib/monitoring/logger.ts`, not `console.error`
- **Path aliases**: `@/*` maps to the app root
- **Type safety**: Use `getWidgetConfig()` instead of `as unknown as X` casts
- **No full file rewrites**: Use targeted edits (see `.claude/rules/no-full-rewrite.md`)

---

## Questions?

- Open a [GitHub Discussion](https://github.com/Qiplim/studio/discussions)
- File a [bug report](https://github.com/Qiplim/studio/issues/new?template=bug_report.yml)
- Propose a [new widget type](https://github.com/Qiplim/studio/issues/new?template=new_widget_type.yml)

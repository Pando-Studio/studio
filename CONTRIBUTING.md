# Contributing to Qiplim

Thanks for your interest in contributing! This guide covers setup, conventions, and how to add new widget types.

## Development Setup

### Prerequisites

- Node.js 20+ (see `.node-version`)
- pnpm 9.12.0+
- Docker & Docker Compose
- At least one AI provider API key (Mistral, OpenAI, Anthropic, or Google)

### First-time setup

```bash
git clone https://github.com/qiplim/qiplim.git
cd qiplim
pnpm install
docker compose up -d
cp apps/studio/.env.example apps/studio/.env
cp apps/engage/.env.example apps/engage/.env
# Edit .env files with your keys
pnpm db:push:studio
pnpm db:push:engage
pnpm dev
```

### Running checks

```bash
pnpm lint          # ESLint
pnpm typecheck     # TypeScript
pnpm test          # Unit tests (Vitest)
pnpm test:e2e      # E2E tests (Playwright, requires dev server)
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

**Scopes**: `studio`, `engage`, `db`, `ui`, `ci`, `docs`

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
apps/
  studio/           # AI widget generation (Next.js 15)
  engage/           # Live interactive sessions (Next.js 15)
packages/
  db/               # Shared Prisma schema
  db-studio/        # Studio Prisma client
  db-engage/        # Engage Prisma client
docs/
  studio/           # Architecture specs
```

### Key directories in Studio

| Directory | Purpose |
|-----------|---------|
| `components/widgets/{type}/` | Display + Editor per widget type |
| `components/widgets/player/` | Player components (ReadablePlayer, MediaPlayer, etc.) |
| `lib/schemas/widget-configs.ts` | Zod schemas for all widget configs |
| `lib/widget-templates/templates/` | JSON generation templates |
| `lib/widget-templates/registry.ts` | Template registry |
| `lib/ai/` | AI providers, TTS, image generation, embeddings |
| `lib/queue/workers/` | BullMQ workers for async generation |

---

## Adding a New Widget Type

### 1. Define the schema

Add a Zod schema in `apps/studio/lib/schemas/widget-configs.ts`:

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
apps/studio/components/widgets/my-widget/
  MyWidgetDisplay.tsx    # Read-only view
  MyWidgetEditor.tsx     # Edit form
  index.ts               # Barrel export
```

### 3. Register in the widget registry

In `apps/studio/components/widgets/registry.tsx`, add your widget to the registry map.

### 4. Create a generation template

Add `apps/studio/lib/widget-templates/templates/my-widget.json` following the existing pattern (see `summary-structured.json` for a simple example).

Register it in `apps/studio/lib/widget-templates/registry.ts`.

### 5. Add the type to Prisma

If this is a new `WidgetType` enum value, add it to `packages/db/prisma/schema.prisma` and run `pnpm db:generate`.

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

- Open a [GitHub Discussion](https://github.com/qiplim/qiplim/discussions)
- File a [bug report](https://github.com/qiplim/qiplim/issues/new?template=bug_report.yml)
- Propose a [new widget type](https://github.com/qiplim/qiplim/issues/new?template=new_widget_type.yml)

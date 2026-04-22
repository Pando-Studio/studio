# Studio - Monorepo & Packages

## Monorepo Structure

The Qiplim codebase is a **pnpm workspace** with **Turborepo** for task orchestration.

```
qiplim-v2/
├── apps/
│   ├── engage/          # Production app — live session delivery (port 3000)
│   └── studio/          # Experimental — AI widget generation (port 3001)
├── packages/
│   ├── db/              # Shared Prisma base schema (not used directly)
│   ├── db-engage/       # Engage Prisma client (@qiplim/db-engage)
│   ├── db-studio/       # Studio Prisma client (@qiplim/db-studio)
│   └── shared/          # Shared types and utilities (@qiplim/shared)
├── turbo.json           # Turborepo pipeline config
├── pnpm-workspace.yaml  # Workspace definition
└── package.json         # Root scripts
```

## Package Details

### `@qiplim/db-studio`

**Path**: `packages/db-studio/`

Prisma client for the Studio database. Generated from `packages/db-studio/prisma/schema.prisma`.

| Aspect | Detail |
|--------|--------|
| Database | PostgreSQL on port 5433 (`qiplim_studio`) |
| Extensions | pgvector (for embeddings) |
| Output | `packages/db-studio/generated/client/` |
| Connection | `DATABASE_URL` env var |

**Key exports**: `prisma` (client instance), all Prisma types and enums.

```typescript
import { prisma, Prisma } from '@qiplim/db-studio';
import type { WidgetType, WidgetKind, AIProvider } from '@qiplim/db-studio';
```

### `@qiplim/db-engage`

**Path**: `packages/db-engage/`

Prisma client for the Engage database. Separate schema, separate database.

| Aspect | Detail |
|--------|--------|
| Database | PostgreSQL on port 5432 (`qiplim_engage`) |
| Extensions | pgvector |
| Output | `packages/db-engage/generated/client/` |

### `@qiplim/shared`

**Path**: `packages/shared/`

Shared types and utilities used by both apps.

#### Current state

The package currently contains **only compiled JavaScript** in `dist/`:

```
packages/shared/
├── dist/
│   ├── index.js
│   ├── composition.js
│   ├── composition-validation.js
│   └── normalize-activity-config.js
├── package.json
└── (no src/ directory)
```

**Exports** (from `dist/index.js`):

```typescript
export * from './composition';              // WPS++ types
export * from './composition-validation';   // Validation functions
export { normalizeActivityConfig } from './normalize-activity-config';
```

#### Known issue: No TypeScript source

The `packages/shared` package has no `src/` directory with TypeScript source files. The `dist/` files were generated externally or copied. This creates several problems:

1. No type-checking during development
2. Types are duplicated between apps and shared (divergence risk)
3. Cannot add new shared types without recreating the build pipeline

#### Planned evolution

`packages/shared` should be restructured with proper TypeScript source:

```
packages/shared/
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── activity.ts           # Shared ActivityType union
│   │   ├── widget.ts             # WidgetKind, WidgetType subset
│   │   └── playback-plan.ts      # PlaybackPlan contract (Studio → Engage)
│   ├── composition.ts            # WPS++ types (move from apps/studio)
│   ├── composition-validation.ts # Validation (move from apps/studio)
│   └── normalize-activity-config.ts
├── dist/                          # Built output
├── tsconfig.json
└── package.json
```

### `packages/db/`

**Path**: `packages/db/`

Originally the shared Prisma base schema. Now superseded by `db-engage` and `db-studio` which have their own schemas. Retained for compatibility but not actively used.

## Turborepo Pipeline

**File**: `turbo.json`

Tasks are defined with dependency ordering:

```
build:   db-studio → shared → studio (and db-engage → shared → engage)
lint:    parallel across all packages
dev:     no caching, persistent
```

## Commands

```bash
# Development
pnpm dev:studio           # Start Studio dev server (port 3001)
pnpm dev:engage           # Start Engage dev server (port 3000)
pnpm dev                  # Start all apps

# Database
pnpm db:push:studio       # Sync Prisma schema to Studio DB
pnpm db:view:studio       # Open Prisma Studio for Studio DB
pnpm db:generate          # Regenerate all Prisma clients

# Infrastructure
pnpm docker:up            # Start PostgreSQL (5432, 5433) + Redis (6379)

# Build
pnpm build                # Build all packages and apps
pnpm lint                 # Lint all
pnpm typecheck            # TypeScript check all
```

## Cross-App Imports

### What Studio imports from packages

```typescript
// Database
import { prisma, Prisma } from '@qiplim/db-studio';
import type { WidgetType, AIProvider } from '@qiplim/db-studio';

// Shared (composition types)
import type { WPSComposition, WPSOrchestration } from '@qiplim/shared';
```

### What Engage imports from packages

```typescript
// Database
import { prisma, Prisma } from '@qiplim/db-engage';
import type { ActivityType } from '@qiplim/db-engage';

// Shared (not currently used by Engage)
```

### No direct cross-app imports

Studio and Engage **never** import from each other. Communication is exclusively via HTTP API (`deploy-to-engage` route).

## Type Divergence

The same conceptual types are defined independently in each app:

| Concept | Studio | Engage |
|---------|--------|--------|
| Activity/Widget type enum | `WidgetType` (12 values) | `ActivityType` (7 values) |
| Content entity | `Widget` (hierarchical) | `Activity` (flat) |
| Config shape | `Record<string, unknown>` via type guards | Zod schemas per type |
| AI provider enum | `AIProvider` | None (env vars only) |

The 7 Engage-compatible types (`QUIZ`, `WORDCLOUD`, `ROLEPLAY`, `MULTIPLE_CHOICE`, `POSTIT`, `RANKING`, `OPENTEXT`) exist in both enums but are defined separately. The `normalizeActivityConfig` function in `@qiplim/shared` handles mapping between the two.

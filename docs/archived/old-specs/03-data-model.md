# Studio - Data Model

**Source of truth**: `packages/db-studio/prisma/schema.prisma`

## Database

- PostgreSQL 16 with `pgvector` extension (for embeddings)
- Connection: `postgresql://qiplim:qiplim@localhost:5433/qiplim_studio`
- Separate from Engage (which uses port 5432, database `qiplim_engage`)
- ORM: Prisma via `@qiplim/db-studio` package

## Entity Relationship Overview

```
user ──────────┬──── Studio ──────┬──── Widget (hierarchical via parentId)
               │                  ├──── StudioSource ──── StudioSourceChunk
               │                  ├──── Conversation ──── ConversationMessage
               │                  ├──── Presentation ──── PresentationVersion ──── Slide ──── SlideWidget
               │                  ├──── CoursePlan
               │                  ├──── ProviderConfig
               │                  └──── GenerationRun
               │
               ├──── UserProviderConfig
               ├──── UserFavorite (→ Widget or CoursePlan)
               ├──── DocumentFolder (hierarchical via parentId)
               └──── DocumentTag ──── DocumentTagSource (→ StudioSource)

StudioAnonymousSession ──── Studio (alternative to user ownership)
```

## Models

### Authentication (BetterAuth)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `user` | Registered user accounts | `id`, `email`, `name`, `image` |
| `session` | Active auth sessions | `userId`, `token`, `expiresAt` (7-day expiry) |
| `account` | OAuth provider connections | `userId`, `providerId`, `accessToken` |
| `verification` | Email verification tokens | `identifier`, `value`, `expiresAt` |

### Studio Core

#### Studio

The top-level workspace entity. Owned by either a `user` or a `StudioAnonymousSession`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `title` | String | Studio name |
| `description` | String? | Optional description |
| `userId` | String? | Owner (authenticated user) |
| `anonymousSessionId` | String? | Owner (anonymous session) |
| `isAnonymous` | Boolean | Whether created anonymously |
| `settings` | Json | Studio-level settings (`{}` default) |
| `preferredProvider` | String? | AI provider preference |
| `preferredModel` | String? | Model preference |

**Relations**: sources, widgets, conversations, presentations, coursePlans, providerConfigs, generationRuns

#### StudioAnonymousSession

Anonymous user identity (no email, no password).

| Field | Type | Description |
|-------|------|-------------|
| `code` | String(6) | Unique alphanumeric code |
| `expiresAt` | DateTime | 30-day expiry from creation |
| `metadata` | Json? | Optional metadata |

### Widget System

#### Widget

The central content entity. Supports hierarchical composition via self-referential `parentId`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `studioId` | String | Parent studio |
| `type` | `WidgetType` | One of 12 types (see enum below) |
| `kind` | `WidgetKind` | LEAF, COMPOSITE, or CONTAINER |
| `title` | String | Widget title |
| `description` | String? | Optional description |
| `data` | Json | Widget content (type-specific, see Widget Data Shapes) |
| `status` | `WidgetStatus` | DRAFT, GENERATING, READY, ERROR |
| `order` | Int | Display order within parent |
| `parentId` | String? | Parent widget (for hierarchy) |
| `slotId` | String? | Slot name within parent composite |
| `composition` | Json? | WPS++ composition metadata |
| `orchestration` | Json? | WPS++ orchestration config |
| `delivery` | Json? | WPS++ delivery mode config |
| `sourceIds` | String[] | Source IDs used for generation |
| `templateId` | String? | Template used for generation |
| `runId` | String? | GenerationRun that created this widget |

**Self-relation**: `parent` / `children` via `WidgetHierarchy` relation.

### Document Ingestion

#### StudioSource

A document or content source attached to a studio.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `StudioSourceType` | DOCUMENT, WEB, YOUTUBE, WIDGET, AUDIO, VIDEO |
| `title` | String | Source name |
| `url` | String? | URL for web/YouTube sources |
| `s3Key` | String? | S3 key for uploaded files |
| `mimeType` | String? | File MIME type |
| `size` | Int? | File size in bytes |
| `status` | `StudioSourceStatus` | PENDING, INDEXING, INDEXED, ERROR |
| `metadata` | Json? | Processing metadata (error details, element count) |
| `folderId` | String? | Optional folder for organization |

**Relations**: chunks, tags (via `DocumentTagSource`)

#### StudioSourceChunk

Parsed and embedded text chunks for RAG.

| Field | Type | Description |
|-------|------|-------------|
| `sourceId` | String | Parent source |
| `content` | String | Chunk text |
| `embedding` | vector? | Mistral embedding (1024 dimensions, pgvector) |
| `metadata` | Json? | Page number, element types, position info |
| `chunkIndex` | Int | Order within source |

> **Note**: The `embedding` column uses pgvector's `vector` type (`Unsupported("vector")` in Prisma). Queries use raw SQL for cosine similarity search.

### Content Models

#### Presentation / PresentationVersion / Slide

Presentations use a versioning system:

```
Presentation (metadata)
  └── PresentationVersion (version number, status)
       └── Slide (content JSON, order, notes)
            └── SlideWidget (junction: Slide ↔ Widget)
```

| Model | Key Fields |
|-------|------------|
| `Presentation` | `studioId`, `title` |
| `PresentationVersion` | `presentationId`, `version` (int), `status` |
| `Slide` | `presentationVersionId`, `order`, `content` (Json), `notes` |
| `SlideWidget` | `slideId`, `widgetId`, `position` (Json) — unique per pair |

#### CoursePlan

Generated course curricula.

| Field | Type | Description |
|-------|------|-------------|
| `studioId` | String | Parent studio |
| `title` | String | Plan title |
| `content` | Json | Structured course plan (modules, objectives) |
| `metadata` | Json | Generation metadata (provider, template) |
| `status` | `CoursePlanStatus` | DRAFT, GENERATING, READY, ERROR, PUBLISHED |
| `runId` | String? | GenerationRun that created this plan |

### AI & Chat

#### Conversation / ConversationMessage

RAG-powered chat within a studio.

| Model | Key Fields |
|-------|------------|
| `Conversation` | `studioId`, `title` |
| `ConversationMessage` | `conversationId`, `role` (USER/ASSISTANT/SYSTEM), `content`, `mode` (ASK/PLAN/AGENT), `citations` (Json), `focusSourceId` |

### Configuration

#### ProviderConfig (studio-level BYOK)

| Field | Type | Description |
|-------|------|-------------|
| `studioId` | String | Studio scope |
| `provider` | `AIProvider` | MISTRAL, OPENAI, ANTHROPIC, GOOGLE |
| `apiKey` | String | Encrypted API key |
| `isActive` | Boolean | Whether this config is active |

**Unique constraint**: `(studioId, provider)` — one key per provider per studio.

#### UserProviderConfig (user-level BYOK)

Same structure as `ProviderConfig` but scoped to `userId` instead of `studioId`.

**Unique constraint**: `(userId, provider)` — one key per provider per user.

### Generation Tracking

#### GenerationRun

Tracks all async AI generation operations.

| Field | Type | Description |
|-------|------|-------------|
| `studioId` | String | Parent studio |
| `type` | `GenerationRunType` | What's being generated (see enum) |
| `status` | `GenerationRunStatus` | PENDING, RUNNING, COMPLETED, FAILED |
| `widgetId` | String? | Target widget (if widget generation) |
| `presentationId` | String? | Target presentation |
| `slideId` | String? | Target slide |
| `estimatedTokens` | Int? | Estimated token usage |
| `actualTokens` | Int? | Actual token usage |
| `errorLog` | String? | Error message on failure |
| `metadata` | Json? | Additional run metadata |
| `completedAt` | DateTime? | When run finished |

### Organization

#### DocumentFolder

Hierarchical folder tree for organizing sources (user-scoped).

| Field | Type | Description |
|-------|------|-------------|
| `userId` | String | Owner |
| `name` | String | Folder name |
| `parentId` | String? | Parent folder (self-referential) |
| `color` | String? | Folder color |

#### DocumentTag / DocumentTagSource

Tags for categorizing sources (user-scoped, many-to-many via junction table).

| Model | Key Fields |
|-------|------------|
| `DocumentTag` | `userId`, `name`, `color` — unique per `(userId, name)` |
| `DocumentTagSource` | `tagId`, `sourceId` — unique per pair |

#### UserFavorite

Bookmarks for widgets and course plans (user-scoped).

| Field | Type | Description |
|-------|------|-------------|
| `userId` | String | Owner |
| `widgetId` | String? | Favorited widget |
| `coursePlanId` | String? | Favorited course plan |

**Unique constraints**: `(userId, widgetId)` and `(userId, coursePlanId)`.

## Enums

### WidgetType

```
QUIZ | WORDCLOUD | ROLEPLAY | MULTIPLE_CHOICE | POSTIT | RANKING | OPENTEXT
IMAGE | PRESENTATION | SLIDE | SEQUENCE | COURSE_MODULE
```

The first 7 are **Engage-compatible** (can be deployed as activities). The last 5 are Studio-only.

### WidgetKind

```
LEAF        — Terminal widget, no children (Quiz, Wordcloud, Image, ...)
COMPOSITE   — Structured with named slots (COURSE_MODULE)
CONTAINER   — Flexible ordered children (SEQUENCE)
```

### WidgetStatus

```
DRAFT → GENERATING → READY
                   → ERROR
```

### StudioSourceType

```
DOCUMENT | WEB | YOUTUBE | WIDGET | AUDIO | VIDEO
```

### StudioSourceStatus

```
PENDING → INDEXING → INDEXED
                   → ERROR
```

### CoursePlanStatus

```
DRAFT → GENERATING → READY → PUBLISHED
                   → ERROR
```

### PresentationVersionStatus

```
DRAFT → GENERATING → READY → PUBLISHED
```

### GenerationRunStatus

```
PENDING → RUNNING → COMPLETED
                  → FAILED
```

### GenerationRunType

```
QUIZ | WORDCLOUD | ROLEPLAY | PRESENTATION | COURSE_PLAN | SLIDES | SLIDE
DECK_PLAN | CHAT | MULTIPLE_CHOICE | POSTIT | RANKING | OPENTEXT
SEQUENCE | COURSE_MODULE | IMAGE
```

### AIProvider

```
MISTRAL | OPENAI | ANTHROPIC | GOOGLE
```

### ConversationMode

```
ASK | PLAN | AGENT
```

### MessageRole

```
USER | ASSISTANT | SYSTEM
```

## JSON Column Schemas

### Widget.data

Type-specific content. Shape depends on `WidgetType`:

| Type | Shape |
|------|-------|
| QUIZ | `{ questions: [{ question, options: [{ id, label, isCorrect }] }] }` |
| WORDCLOUD | `{ prompt: string }` |
| ROLEPLAY | `{ scenario: string, roles: [...] }` |
| MULTIPLE_CHOICE | `{ questions: [{ question, options: [...] }] }` |
| POSTIT | `{ prompt: string, categories?: [...] }` |
| RANKING | `{ prompt: string, items: [...] }` |
| OPENTEXT | `{ prompt: string }` |
| IMAGE | `{ url: string, prompt: string, ... }` |
| PRESENTATION | Generation metadata |
| SEQUENCE | `{}` (children carry the data) |
| COURSE_MODULE | `{}` (children carry the data) |

### Widget.composition

WPS++ composition metadata. See `lib/composition/composition.ts` for TypeScript types.

```typescript
interface WPSComposition {
  kind: 'LEAF' | 'COMPOSITE' | 'CONTAINER';
  slots?: WPSSlot[];       // Named slots for children
  accepts?: WPSAcceptRule[]; // What children are allowed
  providesAs?: string[];     // Tags this widget provides
}
```

### Widget.orchestration

WPS++ orchestration config (types defined but **not executed at runtime**):

```typescript
interface WPSOrchestration {
  mode: 'sequential' | 'parallel' | 'conditional' | 'state-machine';
  sequence?: WPSSequenceStep[];
  conditions?: WPSCondition[];
  states?: WPSState[];
  transitions?: WPSTransition[];
}
```

### Widget.delivery

WPS++ delivery mode config:

```typescript
interface WPSDelivery {
  modes: WPSDeliveryModeConfig[];
  defaultMode: 'live-session' | 'self-paced' | 'static';
}
```

## Indexes

All foreign keys are indexed. Notable composite indexes:

| Table | Index | Purpose |
|-------|-------|---------|
| `widgets` | `studioId` | List widgets by studio |
| `widgets` | `type` | Filter by widget type |
| `widgets` | `parentId` | Find children |
| `studio_sources` | `status` | Filter by processing status |
| `studio_sources` | `folderId` | List by folder |
| `generation_runs` | `status` | Find active runs |
| `studios` | `userId`, `anonymousSessionId` | Owner lookup |

## Differences with Engage Schema

| Aspect | Studio | Engage |
|--------|--------|--------|
| Activity entity | `Widget` (hierarchical, 12 types) | `Activity` (flat, 7 types) |
| Hierarchy | `parentId` + `slotId` + `kind` | None (flat order) |
| Session | None (authoring tool) | `LiveSession` + `Participant` |
| Responses | None | `ActivityResponse` |
| AI chat | `Conversation` / `ConversationMessage` | `GlobalConversation` / `GlobalConversationMessage` |
| Provider config | `ProviderConfig` + `UserProviderConfig` | None (uses env vars) |
| Documents | `StudioSource` + `StudioSourceChunk` | `Document` + `DocumentChunk` |
| Organization | `DocumentFolder` + `DocumentTag` | None |

# Qiplim Studio — API Reference

> Last updated: April 16, 2026
>
> Complete inventory of Studio API endpoints. 55 handlers, 14 domains.
>
> **Planned tooling**: `zod-to-openapi` to generate OpenAPI from existing Zod schemas. Swagger UI at `/api-docs` (Phase 3).

---

## Architecture

- **Framework**: Next.js 15 App Router (`app/api/` route handlers)
- **Auth**: BetterAuth session cookies. No API key auth (planned Phase 3).
- **Validation**: Zod on all body/query params
- **DB**: Prisma (PostgreSQL 16 + pgvector)
- **Queues**: BullMQ (Redis) for async jobs (generation, indexing)
- **Real-time**: SSE via Redis pub/sub (`/api/studios/[id]/events`)
- **Rate limiting**: Redis-backed, per user or per IP

### Auth patterns

| Pattern | Usage | Helper |
|---------|-------|--------|
| Studio owner | Routes `/api/studios/[id]/*` | `getStudioAuthContext(id)` |
| Session user | Global routes (`/api/documents`, `/api/favorites`) | `getUserAuthContext()` |
| Admin | Routes `/api/admin/*` | Session + role check |
| Public | Routes `/api/public/*`, some presentations | None |

### Rate limits

| Endpoint | Limit | Scope |
|----------|-------|-------|
| `POST /api/auth/[...all]` (sign-in) | 5 / 15 min | IP |
| `POST /api/auth/[...all]` (sign-up) | 3 / 15 min | IP |
| `POST /api/studios/[id]/chat` | 50 / hour | User |
| `POST /api/admin/studio` | 100 / min | User |

---

## 1. Auth

### `POST /api/auth/[...all]`

BetterAuth handler. Handles login, signup, session, Google OAuth.

### `GET /api/auth/anonymous`

> **Deprecated** — returns redirect to `/login`. Anonymous sessions are no longer supported.

### `POST /api/auth/migrate-anonymous`

Migrates studios from an anonymous session to an authenticated account.

- **Auth**: Session required
- **Cookie**: `studio_anonymous_code`
- **Response**: `{ migrated: boolean, studiosCount?: number, message: string }`

---

## 2. Studios

### `GET /api/studios`

Lists all studios for the current user.

- **Auth**: Session
- **Response**: `{ studios: Studio[] }` with `_count: { sources, widgets, presentations }`

### `POST /api/studios`

Creates a new studio.

- **Auth**: Session
- **Body**: `{ title: string, description?: string, settings?: object }`
- **Response**: `201 { studio: Studio }`

### `GET /api/studios/[id]`

Studio details with sources, widgets, presentations, provider configs.

- **Auth**: Studio owner

### `PATCH /api/studios/[id]`

Updates title, description, settings.

- **Auth**: Studio owner
- **Body**: `{ title?, description?, settings? }`

### `DELETE /api/studios/[id]`

Deletes a studio and all its data.

- **Auth**: Studio owner

### `GET /api/studios/[id]/settings`

AI preferences for the studio (provider, model).

- **Auth**: Studio owner
- **Response**: `{ preferredProvider, preferredModel, settings, providers }`

### `PATCH /api/studios/[id]/settings`

Updates the preferred provider/model.

- **Auth**: Studio owner
- **Body**: `{ preferredProvider?: string, preferredModel?: string }`

### `GET /api/studios/[id]/share`

Sharing state of the studio.

- **Auth**: Studio owner
- **Response**: `{ isPublic, publicSlug, publicUrl, shares: StudioShare[] }`

### `PATCH /api/studios/[id]/share`

Toggles public visibility.

- **Auth**: Studio owner
- **Body**: `{ isPublic: boolean }`

### `POST /api/studios/[id]/share`

Invites a user to the studio.

- **Auth**: Studio owner
- **Body**: `{ email?: string, userId?: string, role: 'EDITOR' | 'VIEWER' }`

---

## 3. Sources & Documents

### `GET /api/studios/[id]/sources`

Lists sources for a studio with chunk count and tags.

- **Auth**: Studio owner
- **Response**: `{ sources: StudioSource[] }` with `_count: { chunks }`, `tags`

### `POST /api/studios/[id]/sources`

Adds a source to the studio (from an existing document, a web URL, or YouTube).

- **Auth**: Studio owner
- **Body**: `{ documentId?: string, type?: 'WEB' | 'YOUTUBE', url?: string, title?: string }`
- **Response**: `201 { source: StudioSource }`
- **Side effect**: enqueues BullMQ `studio-source-analysis` for WEB/YOUTUBE

### `GET /api/studios/[id]/sources/[sourceId]/chunks`

Paginated chunks for a source with optional text search.

- **Auth**: Studio owner
- **Query**: `offset=0, limit=50, search?`
- **Response**: `{ chunks: StudioSourceChunk[], total, offset, limit }`

### `POST /api/studios/[id]/sources/[sourceId]/retry`

Retries analysis for a failed source.

- **Auth**: Studio owner
- **Side effect**: re-enqueues BullMQ job

### `GET /api/studios/[id]/sources/search`

Text search across all chunks in the studio.

- **Auth**: Studio owner
- **Query**: `q` (min 2 chars)
- **Response**: `{ results: [{ sourceId, sourceTitle, sourceType, matches: [{ chunkId, snippet }] }] }`

### `POST /api/studios/[id]/sources/from-widget`

Converts a widget or course plan into an indexable RAG source.

- **Auth**: Studio owner
- **Body**: `{ widgetId?: string, coursePlanId?: string }`
- **Dedup**: by `originWidgetId` / `originCoursePlanId`

### `POST /api/documents/upload`

Document upload (multipart or JSON for cloud sources).

- **Auth**: Session
- **Content-Type**: `multipart/form-data` or `application/json`
- **Form**: `file, studioId?, source? ('LOCAL' | 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'DROPBOX' | 'URL')`
- **JSON**: `{ cloudFileUrl, filename, mimeType, accessToken?, studioId? }`
- **Response**: `201 { documentId, studioId, status: 'PENDING', url, replaced? }`
- **Limit**: 100 MB max
- **Side effect**: enqueues `studio-source-analysis`

### `GET /api/documents`

Global document library (all studios).

- **Auth**: Session
- **Query**: `search?, folderId?, tagId?, type?`

### `GET /api/documents/[id]`

Document details.

- **Auth**: Document owner

### `DELETE /api/documents/[id]`

Deletes a document (cascades chunks, S3 deletion).

- **Auth**: Document owner

### `POST /api/documents/add-url`

Adds a web or YouTube URL as a source.

- **Auth**: Session
- **Body**: `{ url: string, title?: string }`

### `POST /api/documents/[id]/retry`

Retries indexing for a failed document.

- **Auth**: Document owner

### `POST /api/documents/[id]/tags`

Adds a tag to a document.

- **Auth**: Session
- **Body**: `{ tagId: string }`

### `DELETE /api/documents/[id]/tags`

Removes a tag.

- **Auth**: Session
- **Query**: `tagId`

### `PATCH /api/documents/[id]/folder`

Moves a document to a folder.

- **Auth**: Session
- **Body**: `{ folderId?: string }`

### `GET/POST/PATCH/DELETE /api/library/folders`

CRUD for library folders.

- **Auth**: Session
- **POST**: `{ name: string, parentId?: string, color?: string }`

### `GET/POST/DELETE /api/library/tags`

CRUD for library tags.

- **Auth**: Session
- **POST**: `{ name: string, color?: string }`

---

## 4. Chat & Conversations

### `GET /api/studios/[id]/chat`

Lists all conversations with messages.

- **Auth**: Studio owner

### `POST /api/studios/[id]/chat`

Sends a message to the AI chat.

- **Auth**: Studio owner
- **Rate limit**: 50/h
- **Body**: `{ message: string, mode: 'ASK' | 'PLAN' | 'AGENT', sourceIds: string[], conversationId?: string }`
- **Response (AGENT)**: `{ message, conversationId, citations, toolCalls }`
- **Response (ASK/PLAN)**: SSE stream, headers `X-Conversation-Id`, `X-Citations`

### `GET /api/studios/[id]/conversations`

Lists conversations with message count.

- **Auth**: Studio owner

### `POST /api/studios/[id]/conversations`

Creates a new conversation.

- **Auth**: Studio owner
- **Body**: `{ title?: string }`

### `GET /api/studios/[id]/conversations/[conversationId]`

Full conversation with messages (max 100).

- **Auth**: Studio owner

### `PATCH /api/studios/[id]/conversations/[conversationId]`

Renames a conversation.

- **Auth**: Studio owner
- **Body**: `{ title: string }`

### `DELETE /api/studios/[id]/conversations/[conversationId]`

Deletes a conversation and its messages.

- **Auth**: Studio owner

---

## 5. Widgets

### `POST /api/studios/[id]/widgets`

Creates a widget directly (for composites).

- **Auth**: Studio owner
- **Body**: `{ type: WidgetType, title: string, data?: object, kind?: 'LEAF' | 'COMPOSED', status?, composition?, orchestration? }`

### `GET /api/studios/[id]/widgets/[widgetId]`

Widget details with children.

- **Auth**: Studio owner

### `PATCH /api/studios/[id]/widgets/[widgetId]`

Updates a widget.

- **Auth**: Studio owner
- **Body**: `{ title?, data?, status?, kind?, parentId?, slotId?, composition?, orchestration? }`

### `DELETE /api/studios/[id]/widgets/[widgetId]`

Deletes a widget.

- **Auth**: Studio owner

### `GET /api/studios/[id]/widgets/[widgetId]/children`

Lists children of a composed widget.

- **Auth**: Studio owner
- **Query**: `slotId?`

### `POST /api/studios/[id]/widgets/[widgetId]/children`

Creates a child of a composed widget.

- **Auth**: Studio owner
- **Body**: `{ type, title, slotId?, data?, kind? }`

### `GET /api/studios/[id]/widgets/[widgetId]/play-result`

Play result of a widget for the current user.

- **Auth**: Session

### `POST /api/studios/[id]/widgets/[widgetId]/play-result`

Records/updates a play result (upsert).

- **Auth**: Session
- **Body**: `{ score?: number, maxScore?: number, duration?: number, status: 'started' | 'completed' }`

---

## 6. Generation

### `GET /api/studios/[id]/widgets/generate`

Lists available generation templates.

- **Auth**: Studio owner
- **Response**: `{ templates: [{ id, name, version, description, widgetType, inputSchema }] }`

### `POST /api/studios/[id]/widgets/generate`

Launches widget generation from a template (async).

- **Auth**: Studio owner
- **Body**: `{ widgetTemplateId, title, description?, inputs, sourceIds, language?, preferredProvider? }`
- **Response**: `202 { success, runId, widgetId, jobId, status: 'PENDING' }`

### `POST /api/studios/[id]/generate/quiz`

Synchronous quiz generation.

- **Auth**: Studio owner
- **Body**: `{ title, description?, sourceIds, questionCount, answersPerQuestion, difficulty, language?, preferredProvider? }`

### `POST /api/studios/[id]/generate/wordcloud`

Synchronous wordcloud generation.

- **Auth**: Studio owner
- **Body**: `{ title, description?, sourceIds, language?, preferredProvider? }`

### `POST /api/studios/[id]/generate/roleplay`

Synchronous roleplay generation.

- **Auth**: Studio owner
- **Body**: `{ title, description?, sourceIds, roleCount, scenario?, language?, preferredProvider? }`

### `POST /api/studios/[id]/generate/course-plan`

Asynchronous course plan generation.

- **Auth**: Studio owner
- **Body**: `{ courseTitle, courseDescription?, instructions?, duration, target, sector?, level, prerequisites?, style, objectives?, sourceIds, language?, preferredProvider? }`
- **Response**: `202 { success, runId, jobId, status: 'PENDING' }`

---

## 7. Presentations

### `GET /api/studios/[id]/presentations`

Lists presentations for a studio.

- **Auth**: Studio owner

### `POST /api/studios/[id]/presentations/generate`

Asynchronous presentation generation (v1).

- **Auth**: Studio owner
- **Body**: `{ title, slideCount, textDensity, tone, imageSource, sourceIds, language?, preferredProvider? }`
- **Response**: `202 { success, presentationId, runId }`

### `POST /api/studios/[id]/presentations/generate-v2`

Asynchronous presentation generation (v2, parallel slides).

- **Auth**: Studio owner
- **Body**: `{ title, description?, slideCount: 3-50, textDensity, tone, includeInteractiveWidgets?, imageSource, targetAudience?, duration?, learningObjectives?, language?, preferredProvider? }`
- **Response**: `202 { success, presentationId, versionId, runId }`

### `GET /api/presentations/[id]`

Presentation details with slides.

- **Auth**: Public

### `PATCH /api/presentations/[id]`

Updates the title.

- **Auth**: **NONE — SECURITY BUG P0**

### `DELETE /api/presentations/[id]`

Deletes a presentation.

- **Auth**: **NONE — SECURITY BUG P0**

### `POST /api/presentations/[id]/slides`

Adds a slide.

- **Auth**: **NONE — SECURITY BUG P0**
- **Body**: `{ order?, content: { title, patternId, html, isInteractive?, type?, widgetRef?, imageUrl? }, notes? }`

### `PATCH /api/presentations/[id]/slides/[slideId]`

Updates a slide.

- **Auth**: **NONE — SECURITY BUG P0**

### `DELETE /api/presentations/[id]/slides/[slideId]`

Deletes a slide.

- **Auth**: **NONE — SECURITY BUG P0**

### `POST /api/presentations/[id]/slides/reorder`

Reorders slides.

- **Auth**: **NONE — SECURITY BUG P0**
- **Body**: `{ slideIds: string[] }`

---

## 8. Course Plans

### `GET /api/studios/[id]/course-plans`

Lists course plans for a studio.

- **Auth**: Studio owner

### `GET /api/studios/[id]/course-plans/[planId]`

Course plan details.

- **Auth**: Studio owner

### `PATCH /api/studios/[id]/course-plans/[planId]`

Updates a course plan.

- **Auth**: Studio owner
- **Body**: `{ title?, description?, content?, metadata?, status? }`

### `DELETE /api/studios/[id]/course-plans/[planId]`

Deletes a course plan.

- **Auth**: Studio owner

---

## 9. Generation Tracking

### `GET /api/studios/[id]/generations`

Lists the 20 most recent generation runs.

- **Auth**: Studio owner

### `GET /api/studios/[id]/generations/[runId]`

Generation run details.

- **Auth**: Studio owner

### `GET /api/queue/jobs/[jobId]`

BullMQ job progress.

- **Auth**: **NONE — needs securing (P1)**

---

## 10. Real-time Events

### `GET /api/studios/[id]/events`

SSE stream for real-time events.

- **Auth**: Studio owner
- **Content-Type**: `text/event-stream`
- **Keepalive**: 30s
- **Events**: `source:status`, `generation:progress`, `generation:complete`, `widget:updated`

---

## 11. Providers & Settings

### `GET/POST/DELETE /api/providers`

BYOK API key management at the studio level.

- **Auth**: Studio owner
- **Query**: `studioId`
- **POST**: `{ studioId, provider, apiKey }`

### `GET/POST/DELETE /api/settings/providers`

BYOK API key management at the user level (global).

- **Auth**: Session
- **POST**: `{ provider, apiKey }`

---

## 12. Favorites

### `GET/POST/DELETE /api/favorites`

Favorites management (widgets + course plans).

- **Auth**: Session
- **POST/DELETE**: `{ widgetId?: string, coursePlanId?: string }`

---

## 13. Deploy

### `POST /api/studios/[id]/deploy-to-engage`

Deploys widgets to Engage as a project + live session.

- **Auth**: Studio owner
- **Body**: `{ widgetIds?: string[], title?: string }`
- **Response**: `{ engageProjectId, sessionCode?, sessionId?, presenterUrl?, participantUrl?, activitiesCount }`

---

## 14. Public

### `GET /api/public/s/[slug]`

Public data for a shared studio (READY widgets only).

- **Auth**: None
- **404**: if studio is not public

---

## 15. Admin

### `POST /api/admin/studio`

Admin DB queries (PG connection pooling).

- **Auth**: Admin role
- **Rate limit**: 100/min
- **Body**: `{ procedure: 'query' | 'sequence' | 'transaction' | 'sql-lint', ... }`

---

## Identified security issues

| Endpoint | Issue | Priority |
|----------|-------|----------|
| `PATCH/DELETE /api/presentations/[id]` | No auth | **P0** |
| `POST/PATCH/DELETE /api/presentations/[id]/slides/*` | No auth | **P0** |
| `POST /api/presentations/[id]/slides/reorder` | No auth | **P0** |
| `GET /api/queue/jobs/[jobId]` | No auth (job info leak) | P1 |

---

## BullMQ Queues

| Queue | Trigger | Side effects |
|-------|---------|--------------|
| `studio-source-analysis` | POST sources, POST documents/upload | Parse, chunk, embed → pgvector |
| `studio-widget-generation` | POST widgets/generate | LLM call → widget JSON → DB |
| `studio-presentation-generation` | POST presentations/generate | LLM call → slides → DB |
| `studio-presentation-v2-generation` | POST presentations/generate-v2 | Parallel slides → DB |
| `studio-course-plan-generation` | POST generate/course-plan | LLM call → ProseMirror content → DB |

---

## Phase 3 Plan — Public API

### Documentation tooling

**Recommendation**: `zod-to-openapi` — generates OpenAPI spec from existing Zod schemas.

| Tool | Approach | Effort | Fit |
|------|----------|--------|-----|
| **zod-to-openapi** | Annotate existing Zod → OpenAPI | S | Perfect |
| **next-openapi-gen** | JSDoc handlers → auto scan | S | Complement |
| **next-rest-framework** | Handler wrapper + built-in Swagger | M | Public endpoints |
| **ts-rest** | Contract-first, type-safe client | M | If TS clients |
| **Hono** | Lightweight framework, native OpenAPI | M | If perf critical |

### Architecture

**Stay on Next.js App Router** — no need for NestJS with 3 devs, 55 routes, ~5K QPS.

Migrate to NestJS/Hono only if: team >10 backend devs, microservices needed, or sustained QPS >50K.

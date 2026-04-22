# Qiplim Studio — API Reference

> Derniere mise a jour : 16 avril 2026
>
> Inventaire complet des endpoints API du Studio. 55 handlers, 14 domaines.
>
> **Tooling prevu** : `zod-to-openapi` pour generer OpenAPI depuis les schemas Zod existants. Swagger UI a `/api-docs` (Phase 3).

---

## Architecture

- **Framework** : Next.js 15 App Router (`app/api/` route handlers)
- **Auth** : BetterAuth session cookies. Pas d'API key auth (prevu Phase 3).
- **Validation** : Zod sur tous les body/query params
- **DB** : Prisma (PostgreSQL 16 + pgvector)
- **Queues** : BullMQ (Redis) pour les jobs async (generation, indexation)
- **Real-time** : SSE via Redis pub/sub (`/api/studios/[id]/events`)
- **Rate limiting** : Redis-backed, par user ou par IP

### Auth patterns

| Pattern | Usage | Helper |
|---------|-------|--------|
| Studio owner | Routes `/api/studios/[id]/*` | `getStudioAuthContext(id)` |
| Session user | Routes globales (`/api/documents`, `/api/favorites`) | `getUserAuthContext()` |
| Admin | Routes `/api/admin/*` | Session + role check |
| Public | Routes `/api/public/*`, certaines presentations | Aucun |

### Rate limits

| Endpoint | Limite | Scope |
|----------|--------|-------|
| `POST /api/auth/[...all]` (sign-in) | 5 / 15 min | IP |
| `POST /api/auth/[...all]` (sign-up) | 3 / 15 min | IP |
| `POST /api/studios/[id]/chat` | 50 / heure | User |
| `POST /api/admin/studio` | 100 / min | User |

---

## 1. Auth

### `POST /api/auth/[...all]`

BetterAuth handler. Gere login, signup, session, Google OAuth.

### `GET /api/auth/anonymous`

> **Deprecie** — retourne redirect vers `/login`. Les sessions anonymes ne sont plus supportees.

### `POST /api/auth/migrate-anonymous`

Migre les studios d'une session anonyme vers un compte authentifie.

- **Auth** : Session requise
- **Cookie** : `studio_anonymous_code`
- **Response** : `{ migrated: boolean, studiosCount?: number, message: string }`

---

## 2. Studios

### `GET /api/studios`

Liste tous les studios de l'utilisateur.

- **Auth** : Session
- **Response** : `{ studios: Studio[] }` avec `_count: { sources, widgets, presentations }`

### `POST /api/studios`

Cree un nouveau studio.

- **Auth** : Session
- **Body** : `{ title: string, description?: string, settings?: object }`
- **Response** : `201 { studio: Studio }`

### `GET /api/studios/[id]`

Detail d'un studio avec sources, widgets, presentations, provider configs.

- **Auth** : Studio owner

### `PATCH /api/studios/[id]`

Met a jour titre, description, settings.

- **Auth** : Studio owner
- **Body** : `{ title?, description?, settings? }`

### `DELETE /api/studios/[id]`

Supprime un studio et toutes ses donnees.

- **Auth** : Studio owner

### `GET /api/studios/[id]/settings`

Preferences AI du studio (provider, modele).

- **Auth** : Studio owner
- **Response** : `{ preferredProvider, preferredModel, settings, providers }`

### `PATCH /api/studios/[id]/settings`

Met a jour le provider/modele prefere.

- **Auth** : Studio owner
- **Body** : `{ preferredProvider?: string, preferredModel?: string }`

### `GET /api/studios/[id]/share`

Etat de partage du studio.

- **Auth** : Studio owner
- **Response** : `{ isPublic, publicSlug, publicUrl, shares: StudioShare[] }`

### `PATCH /api/studios/[id]/share`

Toggle visibilite publique.

- **Auth** : Studio owner
- **Body** : `{ isPublic: boolean }`

### `POST /api/studios/[id]/share`

Invite un utilisateur sur le studio.

- **Auth** : Studio owner
- **Body** : `{ email?: string, userId?: string, role: 'EDITOR' | 'VIEWER' }`

---

## 3. Sources & Documents

### `GET /api/studios/[id]/sources`

Liste les sources d'un studio avec nombre de chunks et tags.

- **Auth** : Studio owner
- **Response** : `{ sources: StudioSource[] }` avec `_count: { chunks }`, `tags`

### `POST /api/studios/[id]/sources`

Ajoute une source au studio (depuis un document existant, une URL web, ou YouTube).

- **Auth** : Studio owner
- **Body** : `{ documentId?: string, type?: 'WEB' | 'YOUTUBE', url?: string, title?: string }`
- **Response** : `201 { source: StudioSource }`
- **Side effect** : enqueue BullMQ `studio-source-analysis` pour WEB/YOUTUBE

### `GET /api/studios/[id]/sources/[sourceId]/chunks`

Chunks pagines d'une source avec recherche textuelle optionnelle.

- **Auth** : Studio owner
- **Query** : `offset=0, limit=50, search?`
- **Response** : `{ chunks: StudioSourceChunk[], total, offset, limit }`

### `POST /api/studios/[id]/sources/[sourceId]/retry`

Re-lance l'analyse d'une source en erreur.

- **Auth** : Studio owner
- **Side effect** : re-enqueue BullMQ job

### `GET /api/studios/[id]/sources/search`

Recherche textuelle dans tous les chunks du studio.

- **Auth** : Studio owner
- **Query** : `q` (min 2 chars)
- **Response** : `{ results: [{ sourceId, sourceTitle, sourceType, matches: [{ chunkId, snippet }] }] }`

### `POST /api/studios/[id]/sources/from-widget`

Convertit un widget ou course plan en source RAG indexable.

- **Auth** : Studio owner
- **Body** : `{ widgetId?: string, coursePlanId?: string }`
- **Dedup** : par `originWidgetId` / `originCoursePlanId`

### `POST /api/documents/upload`

Upload de document (multipart ou JSON pour cloud sources).

- **Auth** : Session
- **Content-Type** : `multipart/form-data` ou `application/json`
- **Form** : `file, studioId?, source? ('LOCAL' | 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'DROPBOX' | 'URL')`
- **JSON** : `{ cloudFileUrl, filename, mimeType, accessToken?, studioId? }`
- **Response** : `201 { documentId, studioId, status: 'PENDING', url, replaced? }`
- **Limite** : 100 MB max
- **Side effect** : enqueue `studio-source-analysis`

### `GET /api/documents`

Bibliotheque globale de documents (tous studios).

- **Auth** : Session
- **Query** : `search?, folderId?, tagId?, type?`

### `GET /api/documents/[id]`

Detail d'un document.

- **Auth** : Document owner

### `DELETE /api/documents/[id]`

Supprime un document (cascade chunks, suppression S3).

- **Auth** : Document owner

### `POST /api/documents/add-url`

Ajoute une URL web ou YouTube comme source.

- **Auth** : Session
- **Body** : `{ url: string, title?: string }`

### `POST /api/documents/[id]/retry`

Re-lance l'indexation d'un document en echec.

- **Auth** : Document owner

### `POST /api/documents/[id]/tags`

Ajoute un tag a un document.

- **Auth** : Session
- **Body** : `{ tagId: string }`

### `DELETE /api/documents/[id]/tags`

Retire un tag.

- **Auth** : Session
- **Query** : `tagId`

### `PATCH /api/documents/[id]/folder`

Deplace un document dans un dossier.

- **Auth** : Session
- **Body** : `{ folderId?: string }`

### `GET/POST/PATCH/DELETE /api/library/folders`

CRUD dossiers de la bibliotheque.

- **Auth** : Session
- **POST** : `{ name: string, parentId?: string, color?: string }`

### `GET/POST/DELETE /api/library/tags`

CRUD tags de la bibliotheque.

- **Auth** : Session
- **POST** : `{ name: string, color?: string }`

---

## 4. Chat & Conversations

### `GET /api/studios/[id]/chat`

Liste toutes les conversations avec messages.

- **Auth** : Studio owner

### `POST /api/studios/[id]/chat`

Envoie un message au chat IA.

- **Auth** : Studio owner
- **Rate limit** : 50/h
- **Body** : `{ message: string, mode: 'ASK' | 'PLAN' | 'AGENT', sourceIds: string[], conversationId?: string }`
- **Response (AGENT)** : `{ message, conversationId, citations, toolCalls }`
- **Response (ASK/PLAN)** : SSE stream, headers `X-Conversation-Id`, `X-Citations`

### `GET /api/studios/[id]/conversations`

Liste les conversations avec nombre de messages.

- **Auth** : Studio owner

### `POST /api/studios/[id]/conversations`

Cree une nouvelle conversation.

- **Auth** : Studio owner
- **Body** : `{ title?: string }`

### `GET /api/studios/[id]/conversations/[conversationId]`

Conversation complete avec messages (max 100).

- **Auth** : Studio owner

### `PATCH /api/studios/[id]/conversations/[conversationId]`

Renomme une conversation.

- **Auth** : Studio owner
- **Body** : `{ title: string }`

### `DELETE /api/studios/[id]/conversations/[conversationId]`

Supprime une conversation et ses messages.

- **Auth** : Studio owner

---

## 5. Widgets

### `POST /api/studios/[id]/widgets`

Cree un widget directement (pour composites).

- **Auth** : Studio owner
- **Body** : `{ type: WidgetType, title: string, data?: object, kind?: 'LEAF' | 'COMPOSED', status?, composition?, orchestration? }`

### `GET /api/studios/[id]/widgets/[widgetId]`

Detail d'un widget avec enfants.

- **Auth** : Studio owner

### `PATCH /api/studios/[id]/widgets/[widgetId]`

Met a jour un widget.

- **Auth** : Studio owner
- **Body** : `{ title?, data?, status?, kind?, parentId?, slotId?, composition?, orchestration? }`

### `DELETE /api/studios/[id]/widgets/[widgetId]`

Supprime un widget.

- **Auth** : Studio owner

### `GET /api/studios/[id]/widgets/[widgetId]/children`

Liste les enfants d'un widget compose.

- **Auth** : Studio owner
- **Query** : `slotId?`

### `POST /api/studios/[id]/widgets/[widgetId]/children`

Cree un enfant d'un widget compose.

- **Auth** : Studio owner
- **Body** : `{ type, title, slotId?, data?, kind? }`

### `GET /api/studios/[id]/widgets/[widgetId]/play-result`

Resultat de jeu d'un widget pour l'utilisateur courant.

- **Auth** : Session

### `POST /api/studios/[id]/widgets/[widgetId]/play-result`

Enregistre/met a jour un resultat de jeu (upsert).

- **Auth** : Session
- **Body** : `{ score?: number, maxScore?: number, duration?: number, status: 'started' | 'completed' }`

---

## 6. Generation

### `GET /api/studios/[id]/widgets/generate`

Liste les templates de generation disponibles.

- **Auth** : Studio owner
- **Response** : `{ templates: [{ id, name, version, description, widgetType, inputSchema }] }`

### `POST /api/studios/[id]/widgets/generate`

Lance la generation d'un widget depuis un template (async).

- **Auth** : Studio owner
- **Body** : `{ widgetTemplateId, title, description?, inputs, sourceIds, language?, preferredProvider? }`
- **Response** : `202 { success, runId, widgetId, jobId, status: 'PENDING' }`

### `POST /api/studios/[id]/generate/quiz`

Generation synchrone d'un quiz.

- **Auth** : Studio owner
- **Body** : `{ title, description?, sourceIds, questionCount, answersPerQuestion, difficulty, language?, preferredProvider? }`

### `POST /api/studios/[id]/generate/wordcloud`

Generation synchrone d'un wordcloud.

- **Auth** : Studio owner
- **Body** : `{ title, description?, sourceIds, language?, preferredProvider? }`

### `POST /api/studios/[id]/generate/roleplay`

Generation synchrone d'un roleplay.

- **Auth** : Studio owner
- **Body** : `{ title, description?, sourceIds, roleCount, scenario?, language?, preferredProvider? }`

### `POST /api/studios/[id]/generate/course-plan`

Generation asynchrone d'un course plan.

- **Auth** : Studio owner
- **Body** : `{ courseTitle, courseDescription?, instructions?, duration, target, sector?, level, prerequisites?, style, objectives?, sourceIds, language?, preferredProvider? }`
- **Response** : `202 { success, runId, jobId, status: 'PENDING' }`

---

## 7. Presentations

### `GET /api/studios/[id]/presentations`

Liste les presentations d'un studio.

- **Auth** : Studio owner

### `POST /api/studios/[id]/presentations/generate`

Generation asynchrone d'une presentation (v1).

- **Auth** : Studio owner
- **Body** : `{ title, slideCount, textDensity, tone, imageSource, sourceIds, language?, preferredProvider? }`
- **Response** : `202 { success, presentationId, runId }`

### `POST /api/studios/[id]/presentations/generate-v2`

Generation asynchrone d'une presentation (v2, slides paralleles).

- **Auth** : Studio owner
- **Body** : `{ title, description?, slideCount: 3-50, textDensity, tone, includeInteractiveWidgets?, imageSource, targetAudience?, duration?, learningObjectives?, language?, preferredProvider? }`
- **Response** : `202 { success, presentationId, versionId, runId }`

### `GET /api/presentations/[id]`

Detail d'une presentation avec slides.

- **Auth** : Public

### `PATCH /api/presentations/[id]`

Met a jour le titre.

- **Auth** : **AUCUNE — BUG SECURITE P0**

### `DELETE /api/presentations/[id]`

Supprime une presentation.

- **Auth** : **AUCUNE — BUG SECURITE P0**

### `POST /api/presentations/[id]/slides`

Ajoute un slide.

- **Auth** : **AUCUNE — BUG SECURITE P0**
- **Body** : `{ order?, content: { title, patternId, html, isInteractive?, type?, widgetRef?, imageUrl? }, notes? }`

### `PATCH /api/presentations/[id]/slides/[slideId]`

Met a jour un slide.

- **Auth** : **AUCUNE — BUG SECURITE P0**

### `DELETE /api/presentations/[id]/slides/[slideId]`

Supprime un slide.

- **Auth** : **AUCUNE — BUG SECURITE P0**

### `POST /api/presentations/[id]/slides/reorder`

Reordonne les slides.

- **Auth** : **AUCUNE — BUG SECURITE P0**
- **Body** : `{ slideIds: string[] }`

---

## 8. Course Plans

### `GET /api/studios/[id]/course-plans`

Liste les course plans d'un studio.

- **Auth** : Studio owner

### `GET /api/studios/[id]/course-plans/[planId]`

Detail d'un course plan.

- **Auth** : Studio owner

### `PATCH /api/studios/[id]/course-plans/[planId]`

Met a jour un course plan.

- **Auth** : Studio owner
- **Body** : `{ title?, description?, content?, metadata?, status? }`

### `DELETE /api/studios/[id]/course-plans/[planId]`

Supprime un course plan.

- **Auth** : Studio owner

---

## 9. Generation Tracking

### `GET /api/studios/[id]/generations`

Liste les 20 derniers runs de generation.

- **Auth** : Studio owner

### `GET /api/studios/[id]/generations/[runId]`

Detail d'un run de generation.

- **Auth** : Studio owner

### `GET /api/queue/jobs/[jobId]`

Progression d'un job BullMQ.

- **Auth** : **AUCUNE — a securiser (P1)**

---

## 10. Real-time Events

### `GET /api/studios/[id]/events`

Flux SSE pour les evenements temps reel.

- **Auth** : Studio owner
- **Content-Type** : `text/event-stream`
- **Keepalive** : 30s
- **Events** : `source:status`, `generation:progress`, `generation:complete`, `widget:updated`

---

## 11. Providers & Settings

### `GET/POST/DELETE /api/providers`

Gestion des API keys BYOK au niveau studio.

- **Auth** : Studio owner
- **Query** : `studioId`
- **POST** : `{ studioId, provider, apiKey }`

### `GET/POST/DELETE /api/settings/providers`

Gestion des API keys BYOK au niveau utilisateur (global).

- **Auth** : Session
- **POST** : `{ provider, apiKey }`

---

## 12. Favorites

### `GET/POST/DELETE /api/favorites`

Gestion des favoris (widgets + course plans).

- **Auth** : Session
- **POST/DELETE** : `{ widgetId?: string, coursePlanId?: string }`

---

## 13. Deploy

### `POST /api/studios/[id]/deploy-to-engage`

Deploie les widgets vers Engage comme projet + session live.

- **Auth** : Studio owner
- **Body** : `{ widgetIds?: string[], title?: string }`
- **Response** : `{ engageProjectId, sessionCode?, sessionId?, presenterUrl?, participantUrl?, activitiesCount }`

---

## 14. Public

### `GET /api/public/s/[slug]`

Donnees publiques d'un studio partage (widgets READY uniquement).

- **Auth** : Aucune
- **404** : si studio pas public

---

## 15. Admin

### `POST /api/admin/studio`

Requetes DB admin (PG connection pooling).

- **Auth** : Admin role
- **Rate limit** : 100/min
- **Body** : `{ procedure: 'query' | 'sequence' | 'transaction' | 'sql-lint', ... }`

---

## Problemes de securite identifies

| Endpoint | Probleme | Priorite |
|----------|----------|----------|
| `PATCH/DELETE /api/presentations/[id]` | Pas d'auth | **P0** |
| `POST/PATCH/DELETE /api/presentations/[id]/slides/*` | Pas d'auth | **P0** |
| `POST /api/presentations/[id]/slides/reorder` | Pas d'auth | **P0** |
| `GET /api/queue/jobs/[jobId]` | Pas d'auth (fuite info jobs) | P1 |

---

## Queues BullMQ

| Queue | Declencheur | Side effects |
|-------|------------|--------------|
| `studio-source-analysis` | POST sources, POST documents/upload | Parse, chunk, embed → pgvector |
| `studio-widget-generation` | POST widgets/generate | LLM call → widget JSON → DB |
| `studio-presentation-generation` | POST presentations/generate | LLM call → slides → DB |
| `studio-presentation-v2-generation` | POST presentations/generate-v2 | Slides paralleles → DB |
| `studio-course-plan-generation` | POST generate/course-plan | LLM call → ProseMirror content → DB |

---

## Plan Phase 3 — API publique

### Tooling documentation

**Recommandation** : `zod-to-openapi` — genere OpenAPI spec depuis les schemas Zod existants.

| Outil | Approche | Effort | Fit |
|-------|----------|--------|-----|
| **zod-to-openapi** | Annote Zod existants → OpenAPI | S | Parfait |
| **next-openapi-gen** | JSDoc handlers → scan auto | S | Complement |
| **next-rest-framework** | Wrapper handlers + Swagger built-in | M | Endpoints publics |
| **ts-rest** | Contract-first, client type-safe | M | Si clients TS |
| **Hono** | Framework leger, OpenAPI natif | M | Si perf critique |

### Architecture

**Rester sur Next.js App Router** — pas besoin de NestJS pour 3 devs, 55 routes, ~5K QPS.

Migrer vers NestJS/Hono uniquement si : equipe >10 devs backend, besoin microservices, ou QPS >50K soutenu.

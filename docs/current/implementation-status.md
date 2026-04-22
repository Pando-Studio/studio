# Implementation Status — Etat actuel du code

> Derniere mise a jour : 22 avril 2026 (post Vague 8 — media widgets: audio podcast, video slideshow, image polish)

Ce document decrit ce qui EXISTE dans le code aujourd'hui. Comparer avec `specs/` pour mesurer l'ecart.

---

## 1. Widget Types implementes (28)

### En production (Engage — 7 activities)

| Type | Schema Zod | Display | Editor | Template | Player | Deploy Engage |
|------|-----------|---------|--------|----------|--------|--------------|
| QUIZ | ✅ | ✅ | ✅ | quiz-interactive | ✅ QuizPlayer | ✅ |
| MULTIPLE_CHOICE | ✅ | ✅ | ✅ | multiple-choice-interactive | ✅ QuizPlayer | ✅ |
| WORDCLOUD | ✅ | ✅ | ✅ | wordcloud-interactive | — | ✅ |
| POSTIT | ✅ | ✅ | ✅ | postit-brainstorm | ✅ PostitPlayer | ✅ |
| RANKING | ✅ | ✅ | ✅ | ranking-prioritization | ✅ RankingPlayer | ✅ |
| OPENTEXT | ✅ | ✅ | ✅ | opentext-reflection | ✅ OpentextPlayer | ✅ |
| ROLEPLAY | ✅ | ✅ | ✅ | roleplay-conversation | — | ✅ |

### Studio — Interactifs (2)

| Type | Schema Zod | Display | Editor | Template | Player |
|------|-----------|---------|--------|----------|--------|
| QCM | ✅ | ✅ | ✅ | qcm-evaluation | ✅ QcmPlayer |
| IMAGE | ✅ | ✅ | ✅ | image-generation | — |

### Studio — NotebookLM-like (9)

| Type | Schema Zod | Display | Editor | Template | Player |
|------|-----------|---------|--------|----------|--------|
| FAQ | ✅ | ✅ (accordion) | ✅ | faq-extraction | ReadablePlayer |
| GLOSSARY | ✅ | ✅ (search + alpha) | ✅ | glossary-extraction | ReadablePlayer |
| SUMMARY | ✅ | ✅ (sections/bullets) | ✅ | summary-structured | ReadablePlayer |
| FLASHCARD | ✅ | ✅ (flip cards) | ✅ | flashcard-learning | ✅ FlashcardPlayer |
| TIMELINE | ✅ | ✅ (vertical dots) | ✅ | timeline-chronological | ReadablePlayer |
| REPORT | ✅ | ✅ (ReactMarkdown) | ✅ | report-document | ReadablePlayer |
| DATA_TABLE | ✅ | ✅ (sortable table) | ✅ | data-table-extraction | ReadablePlayer |
| MINDMAP | ✅ | ✅ (arbre horizontal SVG) | ✅ | mindmap-extraction | ReadablePlayer |
| INFOGRAPHIC | ✅ | ✅ (stats + sections) | ✅ | infographic-visual | ReadablePlayer |

### Studio — Media (2)

| Type | Schema Zod | Display | Editor | Template | TTS | Player |
|------|-----------|---------|--------|----------|-----|--------|
| AUDIO | ✅ (+ script, generationConfig) | ✅ (player + script dialogue) | ✅ (config, script view, TTS trigger) | audio-podcast | ✅ OpenAI TTS (multi-speaker via segments) | ✅ MediaPlayer |
| VIDEO | ✅ (+ script, generationConfig) | ✅ (player + storyboard) | ✅ (config, storyboard view, TTS narration) | video-slideshow | ✅ OpenAI TTS (per-slide narration) | ✅ MediaPlayer |

### Studio — Pedagogique (4)

| Type | Schema Zod | Display | Editor | Template | Player |
|------|-----------|---------|--------|----------|--------|
| SYLLABUS | ✅ | ✅ (ReactMarkdown) | ✅ | syllabus-generation | ReadablePlayer |
| SESSION_PLAN | ✅ | ✅ (ReactMarkdown) | ✅ | session-plan-generation | ReadablePlayer |
| PROGRAM_OVERVIEW | ✅ | ✅ (ReactMarkdown) | ✅ | program-overview-generation | ReadablePlayer |
| CLASS_OVERVIEW | ✅ | ✅ (ReactMarkdown) | ✅ | class-overview-generation | ReadablePlayer |

### Studio — Composition (3)

| Type | Schema Zod | Display | Editor | Template | Player |
|------|-----------|---------|--------|----------|--------|
| PRESENTATION | ✅ | ✅ | ✅ | presentation-from-sources | ✅ ComposedPlayer |
| SEQUENCE | ✅ | ✅ | ✅ | — | ✅ ComposedPlayer |
| COURSE_MODULE | ✅ | ✅ | ✅ | — | ✅ ComposedPlayer |

### Non visible dans l'UI (masques)

| Type | Raison |
|------|--------|
| WORDCLOUD | Experience multi uniquement |
| OPENTEXT | Experience multi uniquement |
| SLIDE | Sous-widget de PRESENTATION |

---

## 2. Architecture implementee

### Data layer
- **Prisma** avec PostgreSQL 16 + pgvector
- **Redis** pour BullMQ (jobs) + pub/sub (SSE events) + cache
- **S3/Cellar** pour le stockage fichiers

### Tables DB
- **WidgetPlayResult** : score, completion, attempts par widget/user
- **StudioShare** : partage studio (EDITOR/VIEWER), userId ou email
- **InstanceConfig** : singleton config (nom, logo, locale, widgets actives)
- **Studio.isPublic** + **Studio.publicSlug** : partage public via URL
- **StudioConnector** : connecteurs externes (Google Drive, etc.) — NEW
- **StudioSourceChunk.language** : langue detectee par chunk — NEW
- **StudioSourceChunk.embeddingModel** : modele d'embedding utilise — NEW
- **StudioSourceChunk.tsv** : tsvector par langue (remplace GENERATED ALWAYS) — NEW

### State management (frontend)
- **TanStack Query v5** — queries pour studio, sources, widgets, runs, conversations, course-plans, favorites
- **Zustand** — UI state (panels, source selection, active conversation) + citation navigation
- **StudioContext** — thin wrapper backward-compatible qui compose TanStack Query + Zustand

### API
- **Auth** : `getAuthContext()`, `getUserAuthContext()`, `getStudioAuthContext()` dans `lib/api/auth-context.ts`
- **Validation** : Zod schemas pour tous les POST/PATCH dans `lib/api/schemas.ts`
- **Rate limiting** : Redis sliding window sur le chat (50/h)
- **Logging** : structured logger dans `lib/monitoring/logger.ts`
- **Share API** : `GET/PATCH/POST /api/studios/[id]/share`
- **Play result API** : `GET/POST /api/studios/[id]/widgets/[widgetId]/play-result`
- **Public API** : `GET /api/public/s/[slug]`, `GET /api/public/s/[slug]/w/[widgetId]` — NEW
- **Google Drive API** : `GET .../connectors/google-drive/files`, `POST .../import` — NEW
- **Widget access resolver** : `lib/api/resolve-widget-access.ts` — role resolution (owner/editor/viewer) — NEW
- cf. `specs/api-reference.md` pour l'inventaire complet (55 endpoints)

### Real-time
- **Redis pub/sub** → SSE endpoint (`/api/studios/[id]/events`) → `useStudioEvents()` hook
- Events : `source:status`, `generation:progress`, `generation:complete`, `widget:updated`

### Generation pipeline
- **BullMQ workers** : 5 queues (source-analysis, widget-generation, presentation-generation, presentation-v2, course-plan-generation)
- **Template registry** : 24 templates JSON, singleton avec register/get/list
- **24 tools auto-generes** depuis le template registry via `buildWidgetToolsFromRegistry()` — NEW (remplace 10 hardcodes)
- **Progress** : ecrit dans `generationRun.metadata` + publish SSE event
- **Multi-provider** : Mistral (default) → OpenAI → Anthropic → Google (fallback)
- **BYOK** : AES-256-GCM encryption avec prefix `v2:`

### RAG pipeline — NEW (Vagues 1-3)
- **Hybrid search** : dense (pgvector cosine) + sparse (tsvector) + RRF fusion (K=60)
- **Re-ranking** : Jina Reranker v3 post-RRF (optional, fallback gracieux si pas de JINA_API_KEY) — NEW
- **HyDE** : Hypothetical Document Embeddings — LLM genere une reponse hypothetique, embed ca pour la dense search — NEW
- **Token budget** : estimation tokens, RAG adaptatif (< 20K → full context, sinon hybrid), truncation a 80% context window — NEW
- **Seuil minimum score** : 0.3 — pas d'injection si aucun chunk pertinent — NEW
- **Multilingual tsvector** : detection langue via `franc-min`, dictionnaire par langue, `simple` pour les queries — NEW
- **Contextual embedding** : LLM genere 1-2 phrases de contexte par chunk avant embedding (max 50 chunks) — NEW
- **Section titles** : `section_title` en metadata + prefix `[Section: ...]` dans le content — NEW
- **HNSW tuning** : `ef_search = 100` (recall ~95% → ~99%) — NEW

### Embedding — NEW
- **EmbeddingProvider** interface avec factory `getEmbeddingProvider()` — NEW
- **MistralEmbeddingProvider** : extrait de l'ancien code, BYOK support — NEW
- **Versioning** : `embeddingModel` stocke sur chaque chunk — NEW

### Document processing — NEW (Vague 3)
- **Unstructured.io hi_res** : `strategy: 'hi_res'` + `pdf_infer_table_structure: true` + `languages: ['fra', 'eng']` — NEW
- **Retry** : exponential backoff 3 retries (1s/2s/4s), seulement sur erreurs reseau/5xx — NEW
- **Timeout tiers** : 3min (<50 pages), 7min (50-200), 12min (>200) — NEW

### Chat — NEW (Vague 3)
- **Agent unifie** : plus de selecteur ASK/PLAN/AGENT — un seul agent avec tous les tools — NEW
- **System prompt enrichi** : etat du studio (sources, widgets, conversations) injecte automatiquement — NEW
- **Streaming** : `streamText()` avec tools, le LLM decide seul quand utiliser un tool — NEW
- **24 tools** auto-generes depuis le template registry — NEW
- **Citations** : chunk-level en ASK/PLAN, source-level en AGENT

### Player system — NEW (Vague 2)
- **PlayerContext** : role, userId, trackStart/trackComplete/trackProgress — NEW
- **ReadablePlayer** : IntersectionObserver, auto-complete apres 30s visible — NEW
- **MediaPlayer** : track completion a 90% du media — NEW
- **FlashcardPlayer** : flip cards, navigation, self-scoring — NEW
- **RankingPlayer** : reorder avec up/down, scoring par position — NEW
- **OpentextPlayer** : textarea + submit, reveal reference answer — NEW
- **PostitPlayer** : input + grid, categories optionnelles — NEW
- **QcmPlayer** : multi-question, feedback, scoring — NEW
- **ComposedPlayer** : step-by-step navigation enfants, progress bar — NEW

### Composition — NEW (Vague 3)
- **CompositionEngine** : `getPlaybackOrder()`, `buildPlaybackPlan()` — NEW
- **PlaybackPlan** type : steps + mode (sequential/conditional) — NEW
- **GenerateFromWidgetButton** : generer des enfants depuis un widget parent — NEW
- **WidgetBreadcrumb** : navigation parent → enfants — NEW

### Connectors — NEW (Vague 3)
- **Google Drive** : client API (list, download, export), browse files modal, import vers studio — NEW
- **StudioConnector** model pour futurs connecteurs (Notion, SharePoint) — NEW

### Widget editing
- **WidgetEditContext** : debounced auto-save (500ms)
- **Per-type editors** : 27 editors dedies + GenericWidgetEditor fallback
- **Widget detail modal** : preview + edit tabs, GenerateFromWidgetButton + WidgetBreadcrumb — UPDATED

### Source management
- **Upload** : multipart FormData, drag & drop, multi-file progress
- **Parsing** : Unstructured.io hi_res → structure-aware chunking → contextual embedding → pgvector — UPDATED
- **Preview** : SourcePreviewDrawer avec chunks pagines + search
- **Tags** : TagPicker popover, filter chips, backend CRUD complet
- **Google Drive** : bouton Drive dans SourcesPanel → browse + import — NEW

### Public player
- **Page studio** : `/s/[slug]` — carousel de tous les widgets READY
- **Page widget** : `/s/[slug]/w/[widgetId]` — widget individuel avec role resolution — NEW
- **⚠️ PROBLEME i18n** : textes hardcodes en francais, pas dans `[locale]/`

### Documentation publique — NEW V7
- **Page /developers** : API docs, Quick Start, MCP, widget catalog — NEW V7
- **Pages /docs** : getting-started, widget-types, api, self-hosting — NEW V7
- **⚠️ PROBLEME i18n** : toutes hardcodees (FR/EN melange), pas dans `[locale]/`, pas de `useTranslations()`

### Security
- **SQL injection fixe** dans analyze-source.worker.ts (bind params) — NEW
- **Presentations API securisee** : PATCH/DELETE `/api/presentations/[id]` et slides — `getPresentationAuthContext()` — FIXED V6
- **Redis SSE** : error/close handlers, keepalive 60s, client retry exponential backoff — FIXED V7

### i18n — PROBLEMES IDENTIFIES (audit 17 avril)

| Page | Route | Probleme |
|------|-------|----------|
| Landing | `/[locale]/` | ✅ OK — 100% i18n avec `useTranslations()` |
| Developers | `/(public)/developers/` | ❌ Hardcode EN, pas dans `[locale]/`, pas de traductions |
| Docs index | `/docs/` | ❌ Hardcode FR, pas dans `[locale]/`, pas de traductions |
| Docs getting-started | `/docs/getting-started/` | ❌ Hardcode FR |
| Docs widget-types | `/docs/widget-types/` | ❌ Hardcode FR |
| Docs self-hosting | `/docs/self-hosting/` | ❌ Hardcode FR |
| Docs API | `/docs/api/` | ❌ Hardcode FR |
| Public player | `/(public)/s/[slug]/` | ❌ Hardcode FR |
| Widget standalone | `/(public)/s/[slug]/w/[widgetId]/` | ❌ Hardcode FR |
| Root layout | `app/layout.tsx` | ⚠️ `lang="en"` hardcode |

**Correction requise** : deplacer toutes les pages publiques dans `[locale]/`, ajouter les traductions en `messages/en.json` et `messages/fr.json`, utiliser `useTranslations()` partout.

### Chat — Sprints B/C/D (Vagues 4-5)
- **needsApproval** : tools de generation demandent approbation, `ToolApprovalCard` (approve/modify/cancel) — NEW V4
- **@mentions** : `useMentions` hook, `MentionDropdown` (sources/widgets/conversations), backend parsing — NEW V4
- **Citations structurees** : excerpt tooltips au hover, `WidgetCitationBadge`, `SourceAttribution` footer — NEW V4
- **Conversation summarization** : >15 msgs → last 10 verbatim + LLM summary des anciens — NEW V4
- **User memory** : `UserMemory` model, extraction LLM, injection prompt, API settings — NEW V4
- **CRAG** : batch LLM relevance scoring (0-10), drop chunks <5 — NEW V4
- **Plans multi-widgets** : tool `propose_generation_plan`, `GenerationPlanCard`, execution cascade sequentielle, annulation Redis — NEW V5
- **approve-tool API** : execution differee d'un tool call approuve — NEW V4

### Evaluation RAG — NEW (Vague 4)
- **Golden dataset** : 20 exemples (factual/analytical/pedagogical, fr/en) — NEW V4
- **Metriques** : precision, recall@K, MRR, NDCG, keyword coverage — NEW V4
- **Runner** : `runEvaluation(studioId, dataset)` → rapport agrege — NEW V4
- **API** : `POST /api/studios/[id]/evaluation` (rate limit 1/min) — NEW V4

### Sources enrichies — NEW (Vague 4)
- **Jina Reader scraper** : remplace regex HTML strip pour les sources WEB — NEW V4
- **Deep research** : `DeepResearchRun` model, worker 7 steps, SSE progress, API + UI modal — NEW V4
- **searchWeb()** : placeholder (TODO: integration API de recherche) — NEW V4

### API publique v1 — NEW (Vague 5)
- **API keys** : `ApiKey` model (SHA-256 hash), `POST/GET/DELETE /api/settings/api-keys` — NEW V5
- **`POST /api/v1/generate/[type]`** : generation stateless, auth API key, rate limit 100/h — NEW V5
- **`GET /api/v1/types`** : liste types disponibles avec schemas — NEW V5
- **`GET /api/v1/openapi.json`** : spec OpenAPI 3.1 — NEW V5

### MCP Server — NEW (Vague 6)
- **3 tools** : `generate_widget`, `list_widget_types`, `search_sources` — NEW V6
- **SSE transport** : `GET/POST /api/mcp` avec auth API key — NEW V6
- **CLI entry point** : `apps/studio/lib/mcp/cli.ts` (stdio transport) — NEW V6
- **Resource** : `widget-types://list` — NEW V6

### Distribution — NEW (Vague 5-6)
- **`/llms.txt`** : route dynamique + fichier statique — NEW V6

### Docling — NEW (Vague 5)
- **Microservice Python** : `services/docling/` (FastAPI + Docling) — NEW V5
- **Docker** : Dockerfile + docker-compose pour dev local — NEW V5
- **`smartParseDocument()`** : Docling first, Unstructured.io fallback — NEW V5
- **DEPLOY.md** : instructions Clever Cloud CLI — NEW V5
- **Teste** : 75 elements extraits d'un PDF en 2.1s — VERIFIED

### Roles & Admin — NEW (Vague 6)
- **`requireRole()`** middleware (admin > creator > viewer) — NEW V6
- **`requireStudioAccess()`** middleware (owner/editor/viewer resolution) — NEW V6
- **Admin users page** : `/settings/users` (list, role change, ban/unban) — NEW V6
- **Settings layout** : sidebar navigation (providers, API keys, memory, users) — NEW V6
- **InstanceConfig UI** : `/settings/instance` (name, logo, locale, widget toggles) — NEW V6

### RGPD — NEW (Vague 6)
- **Data export** : `POST /api/settings/data-export` (JSON dump complet) — NEW V6
- **Data delete** : `DELETE /api/settings/data-delete` (cascade + account removal, email confirmation) — NEW V6
- **Privacy page** : `/settings/data` (export button, delete account zone) — NEW V6

---

## 3. Ce qui N'existe PAS encore dans le code

### Phase 2 (reste)
- Conditional orchestration dans CompositionEngine (sequential seulement)
- Dashboard resultats (completion par widget, scores moyens)

### Phase 2.5 (reste)
- `searchWeb()` reel pour deep research (actuellement placeholder)
- Google Drive OAuth scope config (Google Cloud Console + BetterAuth)
- Notion connector (MCP server officiel)
- SharePoint connector
- Integration DeepEval / Langfuse en CI
- HNSW index rebuild (m=32, ef_construction=128 — necessite downtime)
- Migration embedding model vers Cohere embed-v4

### Phase 3 (reste)
- `@qiplim/schema` npm package (Zod schemas exportes)
- CLI `qiplim generate`
- Docker compose prod (existe en dev seulement)
- Swagger UI (OpenAPI spec existe, pas l'UI)

### Phase 4 (reste)
- Dashboard resultats (Phase 4.3)
- Docs site + README + CONTRIBUTING + LICENSE
- Community setup (GitHub Discussions, templates)
- Security audit

### Phase 5+ (futur)
- Blocs generatifs runtime (LLM at runtime)
- Ontologie / primitives
- xAPI / LTI 1.3
- Marketplace de templates
- Nouveaux widgets (TRUE_FALSE, FILL_BLANKS, MATCHING, etc.)

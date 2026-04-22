# Qiplim Studio — Plan de developpement

> Derniere mise a jour : 22 avril 2026 (post Vague 8 — media widgets)

**Strategie** : 28 types de widgets en DB (27 visibles dans le registry, SLIDE est un sub-widget de PRESENTATION). Pas de nouveaux types avant Phase 5+. Les prochaines phases se concentrent sur la qualite du runtime, le lifecycle complet, l'API, et l'open source.

**Etat actuel** : Phase 0-1 terminee. Phase 2 ~98% (media widgets done). Phase 2.5 ~90%. Phase 3 ~40%. Phase 4 ~60%. **Probleme critique** : les pages publiques (docs, developers, public player) sont hors du systeme i18n — texte hardcode, pas de `[locale]/`, pas de traductions. A corriger avant toute release. Cf. `current/implementation-status.md`.

**Vague 8** (22 avril 2026) : media widgets — AUDIO (podcast 2 voix : script generation + OpenAI TTS multi-segment), VIDEO (storyboard slideshow : script generation + narration TTS par slide), IMAGE (polish : route regenerate-image, error feedback). Nouveau module `lib/ai/tts.ts`. Templates `audio-podcast.json` et `video-slideshow.json`. Branches AUDIO/VIDEO dans le worker de generation.

---

## Phase 0 — Fondations ✅ DONE

- Tables DB : WidgetPlayResult, StudioShare, InstanceConfig, isPublic/publicSlug
- Typage JSON : OrchestrationSchema, TransitionSchema, CompositionSchema
- Condition parser : `lib/composition/condition-evaluator.ts`
- Nettoyage : suppression WPS++ (2800 lignes), consolidation workflows, events SSE
- Widget kind simplifie : LEAF | COMPOSED (suppression CONTAINER)
- Suppression champ `delivery`

## Phase 1 — Widgets Core ✅ DONE

### Sprint 1.1 — Polish existants ✅
- Schemas Zod pour les 12 types originaux
- Editors migres sur WidgetEditContext (auto-save 500ms)
- Templates de generation complets

### Sprint 1.2 — NotebookLM-like ✅
- 11 nouveaux types : FAQ, GLOSSARY, SUMMARY, FLASHCARD, TIMELINE, REPORT, DATA_TABLE, AUDIO, VIDEO, MINDMAP, INFOGRAPHIC
- Schemas Zod + Display + Editor + templates pour chaque
- Mindmap : arbre horizontal SVG avec collapse
- Report/Summary : ReactMarkdown

### Sprint 1.3 — Structure pedagogique ✅
- 4 types : SYLLABUS, SESSION_PLAN, PROGRAM_OVERVIEW, CLASS_OVERVIEW
- LEAF avec `content` Markdown (pas COMPOSED)
- Templates de generation IA pedagogiques
- Tags : `lycee` (CLASS_OVERVIEW, SESSION_PLAN), `superieur` (SYLLABUS, PROGRAM_OVERVIEW, SESSION_PLAN)

### Sprint 1.4 — Self-paced player + partage ✅
- Page publique `/s/[slug]` (carousel widgets)
- Share API (toggle public, CRUD shares)
- Play result API (upsert scores)
- QCM type (distinct de MULTIPLE_CHOICE)
- Tags multi-categories (basic, evaluation, interactif, contenu, media, lycee, superieur)

### UX fixes ✅
- Redirect loop middleware (cookie vs session)
- Dedup bibliotheque (progress cards vs liste)
- Live Qiplim button (lien externe)
- WORDCLOUD/OPENTEXT masques (multi only)

---

## Phase 2 — Runtime & Player

> Objectif : chaque widget a un lifecycle complet — de la generation a la lecture et au partage. Multi-role. Composition runtime.
>
> **Etat actuel** : ~95%. Tous les 28 types ont un Player branche dans le registry (ReadablePlayer x13, MediaPlayer x2, interactifs x8, ComposedPlayer x3). Route standalone, CompositionEngine, cascade, breadcrumbs. Reste : conditional orchestration (P2).

### 2.1 Player views

**Spec** : `specs/lifecycle.md` § 10

**Ce qui existe** : ✅ DONE. Tous les 28 types ont un Player : ReadablePlayer (FAQ, GLOSSARY, SUMMARY, TIMELINE, REPORT, DATA_TABLE, MINDMAP, INFOGRAPHIC, IMAGE, SYLLABUS, SESSION_PLAN, PROGRAM_OVERVIEW, CLASS_OVERVIEW), MediaPlayer (AUDIO, VIDEO), interactifs dedies (QuizPlayer, QcmPlayer, FlashcardPlayer, RankingPlayer, OpentextPlayer, PostitPlayer), ComposedPlayer (PRESENTATION, SEQUENCE, COURSE_MODULE). Registry `registry.tsx` avec HOC wrappers.

| Tier | Types | Approche |
|------|-------|----------|
| Readable | FAQ, GLOSSARY, SUMMARY, TIMELINE, REPORT, DATA_TABLE, MINDMAP, INFOGRAPHIC, IMAGE | ReadablePlayer HOC (scroll tracking, time tracking) |
| Interactif | QUIZ, QCM, MULTIPLE_CHOICE, FLASHCARD, RANKING, POSTIT, ROLEPLAY | Player dedie par type (scoring, validation, feedback) |
| Media | AUDIO, VIDEO | MediaPlayer (progression lecture, trackComplete a 90%) |
| Compose | PRESENTATION, SEQUENCE, COURSE_MODULE | ComposedPlayer (navigation enfants, chaque enfant utilise son Player) |

**Delivrables** :
- `components/widgets/player/PlayerContext.tsx` — role, userId, trackStart/trackComplete
- `components/widgets/player/ReadablePlayer.tsx` — HOC IntersectionObserver
- `components/widgets/player/ComposedPlayer.tsx` — step-by-step enfants
- 8 Players interactifs dedies (QuizPlayer existe deja)
- 2 Players media
- Registry : `Player` devient non-optionnel dans `WidgetRenderers`

### 2.2 URL standalone par widget

**Spec** : `specs/lifecycle.md` § 10.2

**Ce qui existe** : ✅ DONE. Page publique `/s/[slug]` (carousel) + page widget `/s/[slug]/w/[widgetId]` avec role resolution. API `GET /api/public/s/[slug]/w/[widgetId]`. `resolve-widget-access.ts` (owner/editor/viewer). Adaptation UI par role (bouton "Modifier" si owner).

### 2.3 Generation en cascade

**Spec** : `specs/widget-system-spec.md` § 2.3, `specs/pedagogical-structure.md` § 2

**Ce qui existe** : ✅ DONE. `parentId` en DB + validation. `GenerateFromWidgetButton` (dropdown avec 14 types cibles, detecte les widgets avec content textuel). `WidgetBreadcrumb` (navigation parent → enfants, child count badge). Integre dans WidgetDetailModal.

### 2.4 Composition runtime

**Spec** : `specs/widget-system-spec.md` § 2.2, § 7.1

**Ce qui existe** : types (Orchestration, Transition, Composition, Group), validation, condition-evaluator. ✅ CompositionEngine (`getPlaybackOrder`, `buildPlaybackPlan`). ✅ PlaybackPlan type (steps + mode). ✅ ComposedPlayer (step-by-step, progress bar, prev/next/finish). **Reste** : mode conditional (evaluation expressions) — sequential seulement pour l'instant.

---

## Phase 3 — API & Distribution

> Objectif : API publique, packages npm, CLI, Docker. Prerequis pour l'open source.
>
> **Etat actuel** : ~40%. API v1 implementee (`/api/v1/generate/[type]`, `/api/v1/types`, OpenAPI spec). API key auth (SHA-256, BYOK). MCP server (SSE + CLI). `llms.txt` (statique + dynamique). Reste : `@qiplim/schema` npm, CLI `qiplim generate`, Docker compose prod.

### 3.1 Generative API stateless

**Spec** : `specs/generative-api.md`, `specs/pedagogical-structure.md` § 2

**Ce qui existe** : routes internes `/api/studios/[id]/generate/` avec session auth. A transformer en API publique stateless.

- `POST /api/v1/generate/{type}` — endpoint par type de widget
- Auth par API key (pas cookie session)
- Input/output JSON pur, stateless
- Endpoints pedagogiques : `/generate/program`, `/generate/semester`, `/generate/syllabus`, `/generate/session-plan`

### 3.2 Distribution

**Spec** : `specs/interoperability.md`, `specs/open-source-plan.md`

| Delivrable | Etat actuel | Spec |
|------------|-------------|------|
| `@qiplim/schema` npm — Zod schemas exportes | Pas commence | interoperability § 2 |
| CLI `qiplim generate` | Pas commence | interoperability § 3 |
| Docker compose prod | docker-compose dev existe, pas prod | open-source-plan § 2 |
| MCP server | Pas commence | interoperability § 5 |
| `llms.txt` | Pas commence | interoperability § 7 |

---

## Phase 4 — Roles, Config & Open Source Launch

> Objectif : multi-tenant simplifie, admin UI, RGPD, documentation, launch.
>
> **Etat actuel** : ~60%. `requireRole()` + `requireStudioAccess()` middlewares. Admin users page (/settings/users) avec role change + ban. InstanceConfig UI (/settings/instance). RGPD export + delete implementes. Settings layout avec navigation. Reste : dashboard resultats, docs site, community setup, open source launch.

### 4.1 Roles & permissions

**Spec** : `specs/multi-tenant.md`

**Ce qui existe** : deux systemes de roles dans le schema :
- `UserRole` (ADMIN/CREATOR/VIEWER) — role global utilisateur (enum defini, pas de middleware)
- `ShareRole` (EDITOR/VIEWER) — role de partage studio-level (StudioShare model + API CRUD)

A construire :
- UI de gestion des roles globaux (ADMIN/CREATOR/VIEWER)
- Permission middleware (`requireRole()`)
- Partage studio avec roles dans l'UI (invite par email) — l'API existe, pas l'UI
- Page admin `/settings/users`

### 4.2 Instance config

**Spec** : `specs/multi-tenant.md` § 4

**Ce qui existe** : modele `InstanceConfig` en DB (singleton, champs name/logo/locale/enabledWidgets). Pas d'UI.

- UI admin pour InstanceConfig (nom, logo, locale, widgets actives)
- Locale par instance (fr-lmd, fr-secondary, fr-pro, generic)
- Widget activation/desactivation

### 4.3 Dashboard resultats

**Spec** : `specs/lifecycle.md` § 7.3

- Vue creator : completion par widget, scores moyens
- Pas d'analytics avancees (pas de xAPI en Phase 4)

### 4.4 Open source launch

**Spec** : `specs/open-source-plan.md`, `specs/privacy-compliance.md`

| Delivrable | Spec |
|------------|------|
| RGPD : export + delete user data | privacy-compliance § 4 |
| README + CONTRIBUTING + LICENSE | open-source-plan § 3 |
| Docs site | open-source-plan § 3 |
| Security audit | privacy-compliance § 6 |
| Community setup (GitHub Discussions, templates) | open-source-plan § 7 |

---

## Phase 2.5 — RAG avance & Chat intelligent

> Objectif : le pipeline RAG passe de "fonctionnel" a "excellent". Le chat Studio devient aussi intelligent que celui d'Engage. Les enseignants connectent leurs sources existantes (Drive, Notion).
>
> **Analyse** : cf. `specs/rag-analysis.md` (critique architecture, benchmarks, deep research open-source). **Spec features** : cf. `specs/rag-advanced.md`.

### 2.5.0 Correctifs P0 (prerequis) ✅ DONE

| Action | Statut |
|--------|--------|
| Fix SQL injection worker (bind params) | ✅ Done |
| Token budget + RAG adaptatif (<20K → full, sinon hybrid, truncation 80%) | ✅ Done |
| Section titles en metadata + prefix `[Section: ...]` | ✅ Done |
| HNSW ef_search = 100 (recall ~95% → ~99%) | ✅ Done |
| Seuil minimum score 0.3 | ✅ Done |
| topK 8 → 15 | ✅ Done |
| Golden dataset evaluation | ❌ Pas encore (deplace en Vague 4) |
| Metriques retrieval | ❌ Pas encore (deplace en Vague 4) |

### 2.5.1 Qualite retrieval ✅ DONE

| Delivrable | Statut |
|------------|--------|
| Re-ranking Jina v3 post-RRF (option `rerank: true` dans hybridSearch) | ✅ Done |
| HyDE (option `useHyde: true`, LLM genere reponse hypothetique) | ✅ Done |
| Multilingual tsvector (franc-min, colonne `language`, dictionnaire par langue) | ✅ Done |
| Embedding provider abstraction (`EmbeddingProvider` interface, factory BYOK) | ✅ Done |
| Embedding versioning (`embeddingModel` sur StudioSourceChunk) | ✅ Done |
| Contextual embedding (LLM context par chunk, max 50) | ✅ Done |
| Unstructured hi_res + table inference | ✅ Done |
| Retry + exponential backoff + timeout tiers | ✅ Done |
| DeepEval CI + Langfuse monitoring | ❌ Pas encore (Vague 4) |
| Migration Cohere embed-v4 | ❌ Pas encore (apres evaluation) |
| HNSW index rebuild (m=32, ef_construction=128) | ❌ Pas encore (necessite downtime) |

### 2.5.2 Document processing — PARTIELLEMENT DONE

| Delivrable | Statut |
|------------|--------|
| Unstructured hi_res + table inference | ✅ Done |
| Retry + exponential backoff (3x, 1s/2s/4s) | ✅ Done |
| Timeout tiers (3/7/12 min) | ✅ Done |
| Contextual embedding (LLM context par chunk) | ✅ Done |
| Docling microservice Python (Docker) | ❌ Pas encore |
| PyMuPDF4LLM fast-path | ❌ Pas encore |

### 2.5.3 Connecteurs sources externes — PARTIELLEMENT DONE

| Delivrable | Statut |
|------------|--------|
| StudioConnector model Prisma | ✅ Done |
| Google Drive client (list, download, export) | ✅ Done |
| Google Drive API routes (browse + import) | ✅ Done |
| Google Drive UI (picker modal + bouton dans SourcesPanel) | ✅ Done |
| Google Drive OAuth scope (`drive.readonly`) dans BetterAuth | ❌ Config manquante (Google Cloud Console + BetterAuth) |
| Google Drive polling cadence (sync incremental) | ❌ Pas encore |
| Notion connector (MCP server officiel) | ❌ Pas encore |
| SharePoint (si besoin confirme) | ❌ Pas encore |

**Note** : le connecteur Drive est fonctionnel code-wise mais necessite la config OAuth (scope `drive.readonly` dans Google Cloud Console + BetterAuth) pour etre utilisable en prod.

### 2.5.4 Sources enrichies

**Web pages** : type `WEB` existe dans le schema → scrape + chunk + embed
- Scraper avance : Firecrawl (self-hostable, Markdown output) ou Jina Reader (API gratuite)
- Interface `WebScraper` avec fallback (cf. `specs/rag-advanced.md` § 3)

**Deep research** : agent multi-etapes (web search → scrape → evaluate → synthesize → embed)
- BullMQ worker + progress SSE
- Cf. `specs/rag-advanced.md` § 2

**YouTube** : type `YOUTUBE` existe — extraire transcription → chunk → embed

| Delivrable | Effort |
|------------|--------|
| Scraper avance (Firecrawl/Jina) | M |
| Deep research agent + worker + UI | L |
| YouTube transcription ingestion | S |

### 2.5.5 Chat intelligent

**Spec complete** : `specs/chat-intelligent.md` (reecrite avril 2026, integre deep research patterns 2025-2026).

**Ce qui existe** :
- ✅ Agent unifie (modes ASK/PLAN/AGENT supprimes, tool-based routing)
- ✅ 24 tools auto-generes depuis le template registry via `buildWidgetToolsFromRegistry()`
- ✅ System prompt enrichi avec etat studio (sources, widgets, conversations)
- ✅ Streaming via `streamText()` avec tous les tools disponibles
- Citations chunk-level en mode standard. Rate limiting (50 req/h)
- Pas de @mentions, pas de user memory, pas de CRAG, pas de conversation summarization

**Sprint A — Fondations agent** : ✅ DONE

**Sprint B — Interaction riche** :
- `needsApproval` sur les tools de generation + cards interactives (approve/modify/cancel)
- State machine typee (reducer TS) pour le chat : idle -> sending -> streaming/tool_call -> complete
- @mentions (3 types : source, widget, conversation) — hook, dropdown, parsing, backend filtering
- Citations structurees : excerpt au hover, refs widget `[Widget: titre]`, attribution multi-source
- Citations chunk-level aussi en mode AGENT (actuellement source-level seulement)

**Sprint C — Intelligence** :
- Conversation summarization : sliding window (last 10 verbatim) + resume des anciens (modele fast)
- User memory : modele DB (UserMemory), extraction LLM (fin de conversation), injection prompt, UI settings
- CRAG : LLM fast score chaque chunk, drop si <5 (cf. `specs/rag-analysis.md`)

**Sprint D — Plans** :
- Tool `propose_generation_plan` pour plans multi-widgets
- Execution sequentielle avec cascade (widget N-1 sert de contexte a widget N)
- Progress en temps reel dans le chat + annulation partielle

**Ce qu'on ne construit PAS** : GraphRAG, multi-agent, XState runtime, memoire RL, modes autonomes.

| Delivrable | Effort |
|------------|--------|
| System prompt enrichi (etat studio) | S |
| Tools auto-generes (registry-based, 27 types) | M |
| Agent unifie (supprimer modes, tool routing) | M |
| `needsApproval` + cards interactives + state machine | M |
| @mentions (hook, dropdown, parsing, backend) | M |
| Citations structurees + chunk-level en AGENT | S |
| Conversation summarization | M |
| User memory (DB + extraction + UI) | L |
| Plans multi-widgets + execution sequentielle | L |

---

## Phase 5+ — Avance (plus tard)

### Nouveaux widgets
TRUE_FALSE, FILL_BLANKS, MATCHING, POLL, RATING, QA, CATEGORIZE, ICEBREAKER, TRAINING, ADVENTURE, SIMULATION, NOTEBOOK, SPINNER, SLIDE_DECK_EXPORT

### Features avancees
- Blocs generatifs runtime (LLM at runtime, contenu dynamique)
- Ontologie / primitives (player universel)
- xAPI / LTI 1.3
- Marketplace de templates
- AUDIO multi-speaker (podcast dialogue)
- VIDEO generation (Veo/Sora)

---

## Matrice des widgets

| Phase | Widgets | Total |
|-------|---------|-------|
| Phase 0-1 (DONE) | QUIZ, MULTIPLE_CHOICE, QCM, WORDCLOUD, POSTIT, RANKING, OPENTEXT, ROLEPLAY, IMAGE, SLIDE, PRESENTATION, SEQUENCE, COURSE_MODULE, FAQ, GLOSSARY, SUMMARY, FLASHCARD, TIMELINE, REPORT, DATA_TABLE, AUDIO, VIDEO, MINDMAP, INFOGRAPHIC, SYLLABUS, SESSION_PLAN, PROGRAM_OVERVIEW, CLASS_OVERVIEW | **28** (27 visibles, SLIDE = sub-widget) |
| Phase 2-4 | (pas de nouveaux types — focus runtime & qualite) | 28 |
| Phase 5+ | + TRUE_FALSE, FILL_BLANKS, MATCHING, POLL, RATING, QA, CATEGORIZE, etc. | 36+ |

---

## Dependencies

```
Phase 0-1 ✅ DONE
  │
  ├──→ Phase 2 (Runtime & Player)
  │      ├── 2.1 Player views
  │      ├── 2.2 URL standalone
  │      ├── 2.3 Generation cascade
  │      └── 2.4 Composition runtime
  │
  ├──→ Phase 2.5 (RAG & Chat) — parallelisable avec Phase 2
  │      ├── 2.5.0 Correctifs P0 (SQL injection, token budget, section titles, golden dataset)
  │      ├── 2.5.1 Qualite retrieval (re-ranking, contextual retrieval, HyDE, multilingual, eval CI)
  │      ├── 2.5.2 Document processing (Docling, PyMuPDF fast-path, retry)
  │      ├── 2.5.3 Connecteurs (Google Drive, Notion MCP, SharePoint)
  │      ├── 2.5.4 Sources enrichies (web scraping, deep research, YouTube)
  │      └── 2.5.5 Chat intelligent (@refs, tools, citations, CRAG, memoire)
  │
  ├──→ Phase 3 (API & Distribution) — necessite Phase 2
  │      ├── 3.1 Generative API
  │      └── 3.2 npm, CLI, Docker, MCP
  │
  └──→ Phase 4 (Roles & Launch) — necessite Phase 3
         ├── 4.1 Roles UI
         ├── 4.2 Instance config
         ├── 4.3 Dashboard resultats
         └── 4.4 Open source launch
```

---

## Regles de developpement

### Architecture
- Chaque widget = schema Zod + editor + display + template. Cf. `specs/widget-catalog.md`
- Pas de composant generique (GenericWidgetEditor est un fallback temporaire)
- Typage strict (pas de `any`)

### Zero dette technique
- Pas de `// TODO` qui reste plus de 1 sprint
- Pas de code mort
- Pas de duplication
- Chaque PR passe : typecheck + lint + tests

### Coherence specs <> code
- Avant d'implementer, verifier la spec dans `specs/`
- Apres implementation, mettre a jour `current/implementation-status.md`

### Conventions
- Commits : Conventional Commits
- Branches : `feature/`, `fix/`, `refactor/`
- Events SSE : tout changement d'etat publie un event. Pas de polling.

---

## Verification

A chaque fin de sprint :
- `pnpm typecheck` — 0 erreurs
- `pnpm test` — tous les tests passent
- `pnpm build` — build reussie
- Smoke test : creer un studio → upload document → generer un widget → preview → jouer
- Mettre a jour `current/implementation-status.md`

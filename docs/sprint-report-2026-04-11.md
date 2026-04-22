# Studio — Sprint Report (11 avril 2026)

## Contexte

Le Studio est l'app "NotebookLM-like" de Qiplim : upload de documents → chat RAG avec citations → generation de widgets interactifs (quiz, wordcloud, roleplay…) → deploy vers Engage pour des sessions live.

Ce sprint a couvert **2 phases** : stabilisation de l'architecture existante, puis ajout des features core NotebookLM.

---

## Chiffres cles

| Metrique | Valeur |
|----------|--------|
| Fichiers modifies | 75 |
| Lignes ajoutees | +4 316 |
| Lignes supprimees | -2 160 |
| Net | +2 156 (mais -1 066 en Phase 1) |
| Commits | 3 |
| Erreurs TypeScript | 0 |
| Routes API refactorees | ~30 |
| Nouveaux fichiers crees | 25 |

---

## Phase 1 — Fix & Stabilize

> Commit `7d09b50d` — 40 fichiers, -1 066 lignes net

### 1.1 Securite BYOK (P0)

**Avant** : chiffrement XOR avec cle repetee — cryptographiquement nul.

**Apres** : AES-256-GCM via `crypto.createCipheriv`, cle derivee par `scryptSync`. Prefix `v2:` pour distinguer ancien/nouveau format. Migration lazy (dechiffre l'ancien au read, re-chiffre en AES au prochain save). Warning au demarrage si la cle par defaut est utilisee en production.

**Fichier** : `lib/ai/byok.ts`

### 1.2 Auth DRY (~30 routes)

**Avant** : 15 lignes de boilerplate auth copiees dans chaque route (getSession + anonymous cookie + studio ownership).

**Apres** : 3 helpers partages dans `lib/api/auth-context.ts` :
- `getAuthContext()` — user OU anonymous
- `getUserAuthContext()` — user only
- `getStudioAuthContext(studioId)` — user/anonymous + verification ownership studio

Chaque route passe de ~15 lignes d'auth a ~3 lignes.

### 1.3 Error Handling + Toast

- Install `sonner` pour les notifications toast
- `app/providers.tsx` — wrapper avec `QueryClientProvider` + `<Toaster>`
- `app/(dashboard)/error.tsx` + `studios/[id]/error.tsx` — error boundaries Next.js
- Remplacement des `console.error` par `toast.error()` dans les composants

### 1.4 Structured Logger

`lib/monitoring/logger.ts` — meme pattern qu'Engage. Dev = pretty console, prod = JSON structure. Methodes specialisees : `logger.generation()`, `logger.source()`, `logger.chat()`, `logger.api()`.

Remplace `console.log/error/warn` dans toutes les routes API et workers.

### 1.5 State Management (le plus gros changement)

**Avant** : `StudioContext.tsx` monolithique (~600 lignes) avec `useState` + `useEffect` + `fetch` + `setInterval` pour TOUT (studio, sources, widgets, runs, favorites, course plans, UI state).

**Apres** :
- **TanStack Query v5** pour le server state (8 fichiers dans `lib/queries/`)
- **Zustand** pour l'UI state (`lib/stores/studio-ui.ts`)
- `StudioContext.tsx` reduit a ~230 lignes (thin wrapper backward-compatible)

Hooks crees :
| Hook | Fichier |
|------|---------|
| `useStudio(id)` | `queries/studios.ts` |
| `useStudioSources(studioId)` | `queries/sources.ts` |
| `useStudioWidgets(studioId)` | `queries/widgets.ts` |
| `useStudioRuns(studioId)` | `queries/runs.ts` (polling auto quand runs actifs) |
| `useStudioConversations(studioId)` | `queries/conversations.ts` |
| `useStudioCoursePlans(studioId)` | `queries/course-plans.ts` |
| `useFavorites()` | `queries/favorites.ts` |
| `useStudioUI` | `stores/studio-ui.ts` (panels, selection, active conversation) |

### 1.6 Conversation CRUD API

**Avant** : `createConversation()` retournait un mock (`conv-${Date.now()}`). Pas de delete/rename.

**Apres** : 2 routes API completes :
- `GET/POST /api/studios/[id]/conversations`
- `GET/PATCH/DELETE /api/studios/[id]/conversations/[conversationId]`

Wirees aux mutations TanStack Query.

### 1.7 Zod Input Validation

`lib/api/schemas.ts` — 20+ schemas Zod pour tous les endpoints POST/PATCH :
- `createStudioSchema`, `updateStudioSchema`
- `chatMessageSchema`
- `createWidgetSchema`, `updateWidgetSchema`, `generateWidgetSchema`
- `generateQuizSchema`, `generateWordcloudSchema`, `generateRoleplaySchema`, `generatePresentationSchema`, `generateCoursePlanSchema`
- `addSourceSchema`, `sourceFromWidgetSchema`
- `favoriteSchema`, `deployToEngageSchema`, `saveProviderSchema`, etc.

Helper `validateBody(schema, body)` applique dans ~18 routes.

---

## Phase 2 Sprint 1 — Fondations NotebookLM

> Commit `5277aab4` — 11 fichiers, +1 209 lignes

### Widget Config Schemas (P2-0)

`lib/schemas/widget-configs.ts` — registry Zod par type de widget, inspiree d'Engage :

| Helper | Role |
|--------|------|
| `parseWidgetData(type, raw)` | Validation a l'ecriture |
| `safeParseWidgetData(type, raw)` | Validation safe pour output LLM |
| `getWidgetConfig(type, data)` | Cast type a la lecture |
| `getDefaultWidgetConfig(type)` | Config minimale valide par type |
| `sanitizeForParticipant(type, config)` | Strip `isCorrect`/`explanation` avant deploy |
| `hasConfigSchema(type)` | Type guard |

8 types couverts : QUIZ, MULTIPLE_CHOICE, WORDCLOUD, POSTIT, RANKING, OPENTEXT, ROLEPLAY, IMAGE.

### Chat Conversation Management (A1)

ChatPanel reecrit avec :
- **Conversation header dropdown** : liste des conversations, switch, create, rename (inline), delete
- Messages charges du serveur via `useConversation(studioId, conversationId)`
- Auto-selection de la conversation la plus recente au mount
- **Auto-growing textarea** (remplace Input single-line, Shift+Enter pour newline)

### Source Content Preview (C1)

- `GET /api/studios/[id]/sources/[sourceId]/chunks` — endpoint pagine avec search
- `hooks/use-source-chunks.ts` — TanStack Query hook
- `SourcePreviewDrawer.tsx` — sheet drawer avec liste de chunks, search debounce, stats

### Source Status Feedback (C3)

- PENDING : point jaune + "En attente..."
- INDEXING : spinner anime + barre de progression indeterminee
- INDEXED : check vert + nombre de chunks
- ERROR : alerte rouge + bouton "Retry"
- `POST /api/studios/[id]/sources/[sourceId]/retry` — re-enqueue le job BullMQ

---

## Phase 2 Sprint 2 — Core UX

> Commit `d82b451e` — 14 fichiers, +1 004 lignes

### Citations Cliquables (A2)

- Chat API enrichi : citations incluent `chunkId` + `excerpt` (200 premiers caracteres) depuis `hybridSearch`
- `CitationBadge` cliquable dans `MarkdownMessage`
- Store Zustand `useCitationNavigation` : `highlightSource(sourceId, chunkId)`
- `SourcesPanel` ecoute le store et ouvre automatiquement le `SourcePreviewDrawer` sur la bonne source

### Chat UX Polish (A3)

- `MarkdownMessage.tsx` — composant extrait avec :
  - Prose styles (headings, lists, code, blockquotes)
  - Remplacement inline des `[Source: Name]` par `CitationBadge` cliquables
  - Code blocks avec styles dedies
- Bouton "copy" sur hover de chaque message assistant
- Erreurs via `toast.error()` au lieu de `console.error`

### Generation Progress Live (B1)

**Workers** — les 4 workers ecrivent maintenant le progress dans `generationRun.metadata` :

| Worker | Steps |
|--------|-------|
| `generate-widget` | Template (5%) → RAG (20%) → Generation (60%) → Validation (90%) → Done (100%) |
| `generate-course-plan` | Init (5%) → Content (15%) → Analyse (30%) → Structure (50%) → Modules (70%) → Save (90%) → Done |
| `generate-presentation` | Init (5%) → Slides (20%) → Save (70%) → Done (100%) |
| `generate-presentation-v2` | Init (5%) → Plan (10%) → Slides (50%) → Save (80%) → Images (90%) → Done |

**Frontend** :
- `GenerationProgressCard.tsx` — barre de progression, label du step, temps ecoule, bouton "Voir" au complete
- `useGenerationProgress(studioId, runId)` — polling individuel a 1s
- Remplace les placeholders `animate-pulse` dans le RightPanel

### Widget Gallery (B4)

RightPanel `LibrarySection` reecrit :
- Suppression du `.slice(0, 5)` — tous les widgets affiches
- **Search** : filtre par titre (case-insensitive)
- **Type filter chips** : chips horizontaux par type present, toggle selection
- **Sort** : "Plus recent" ou "Par type"
- **Status badges** : point colore (gray/blue-pulse/green/red)
- **Timestamps relatifs** : "a l'instant", "il y a 5min", "il y a 2h", etc.
- Liste unifiee widgets + course plans

---

## Architecture resultante

```
apps/studio/
├── app/
│   ├── providers.tsx              ← NEW (QueryClient + Toaster)
│   ├── (dashboard)/
│   │   ├── error.tsx              ← NEW (error boundary)
│   │   └── studios/[id]/error.tsx ← NEW
│   └── api/
│       └── studios/[id]/
│           ├── conversations/      ← NEW (CRUD)
│           └── sources/[sourceId]/
│               ├── chunks/         ← NEW (paginated)
│               └── retry/          ← NEW
├── components/studio/
│   ├── MarkdownMessage.tsx         ← NEW
│   ├── GenerationProgressCard.tsx  ← NEW
│   ├── SourcePreviewDrawer.tsx     ← NEW
│   └── panels/
│       ├── ChatPanel.tsx           ← REWRITE (conversations, textarea, citations)
│       ├── SourcesPanel.tsx        ← ENHANCED (status feedback, retry, preview)
│       └── RightPanel.tsx          ← ENHANCED (progress cards, gallery)
├── hooks/
│   ├── use-source-chunks.ts        ← NEW
│   └── use-generation-progress.ts  ← NEW
├── lib/
│   ├── api/
│   │   ├── auth-context.ts         ← NEW (shared auth helpers)
│   │   └── schemas.ts              ← NEW (20+ Zod schemas)
│   ├── monitoring/
│   │   └── logger.ts               ← NEW (structured logging)
│   ├── queries/                    ← NEW (8 files, TanStack Query)
│   ├── stores/
│   │   ├── studio-ui.ts            ← NEW (Zustand UI state)
│   │   └── citation-navigation.ts  ← NEW (citation → source linking)
│   ├── schemas/
│   │   └── widget-configs.ts       ← NEW (Zod per widget type)
│   └── queue/workers/              ← ENHANCED (progress metadata)
```

---

## Reste a faire (Sprint 3-4)

### Sprint 3 — Generation & Sources
| ID | Feature | Effort |
|----|---------|--------|
| A4 | Chat tool integration (multi-step, fallback, rate limiting, auto-title) | M |
| B2 | Preview before save (widget status DRAFT → confirm) | M |
| B3 | Quick regenerate (re-run with same params) | S |
| C2 | Better upload UX (drag & drop, multi-file progress) | M |

### Sprint 4 — Polish
| ID | Feature | Effort |
|----|---------|--------|
| C5 | Tag management UI (backend exists, UI manquante) | M |
| C6 | Source search (full-text via tsvector + ts_headline) | M |
| B5 | Widget editor improvements (config context debounce, inline edit, per-type) | L |

---

## Dependances ajoutees

| Package | Version | Role |
|---------|---------|------|
| `@tanstack/react-query` | ^5.90.20 | Server state management |
| `@tanstack/react-query-devtools` | ^5.91.3 | Debug panel (dev only) |
| `sonner` | ^2.0.7 | Toast notifications |

---

## Patterns cles adoptes d'Engage

| Pattern | Source Engage | Adoption Studio |
|---------|-------------|-----------------|
| TanStack Query + key factory | `lib/queries/keys.ts` | `lib/queries/keys.ts` (copie adaptee) |
| Providers wrapper | `app/providers.tsx` | `app/providers.tsx` |
| Structured logger | `lib/monitoring/logger.ts` | `lib/monitoring/logger.ts` |
| Zod schema per activity type | `activities/{type}/schema.ts` | `lib/schemas/widget-configs.ts` |
| Schema registry + helpers | `lib/schemas/activity-configs.ts` | `parseWidgetData`, `getDefaultWidgetConfig`, `sanitizeForParticipant` |
| Conversation management | `lib/ai/conversation/manager.ts` | Conversation CRUD API + dropdown header |

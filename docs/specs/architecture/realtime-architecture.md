# Qiplim Studio — Architecture Temps Reel

Specification du systeme de communication temps reel dans Studio. Tout est push (Redis pub/sub → SSE). **Pas de polling.**

---

## Principe fondamental

```
Worker (BullMQ)               Redis pub/sub              SSE endpoint              Browser
     |                              |                         |                        |
     |-- publishStudioEvent() ----->|                         |                        |
     |                              |-- PUBLISH channel ----->|                        |
     |                              |                         |-- data: {...}\n\n ---->|
     |                              |                         |                        |-- useStudioEvents()
     |                              |                         |                        |-- invalidateQueries()
     |                              |                         |                        |-- UI se met a jour
```

**Regle** : toute operation asynchrone (generation, indexation, mise a jour) DOIT publier un event via `publishStudioEvent()`. Le frontend ne poll JAMAIS — il recoit les events en temps reel et invalide les queries TanStack Query concernees.

---

## 1. Composants

### 1.1 Redis clients (`lib/redis.ts`)

Trois clients Redis dedies :

| Client | Usage |
|--------|-------|
| `redis` | Cache et commandes generales |
| `redisPub` | Publication d'events (workers → channel) |
| `redisSub` | Souscription aux events (SSE endpoint → channel) |

Les clients pub/sub sont separes du client general car Redis interdit les commandes normales sur une connexion en mode SUBSCRIBE.

### 1.2 Events (`lib/events/studio-events.ts`)

```typescript
type StudioEventType =
  | 'source:status'           // Source indexing changed
  | 'generation:progress'     // Generation step changed
  | 'generation:complete'     // Generation finished (success or failure)
  | 'widget:updated';         // Widget modified

interface StudioEvent {
  type: StudioEventType;
  studioId: string;
  data: Record<string, unknown>;
  timestamp: number;
}
```

**Channel naming** : `studio:{studioId}:events` — un channel par studio.

**Publication** : `publishStudioEvent(studioId, type, data)` — appele depuis les workers et les routes API.

### 1.3 SSE endpoint (`app/api/studios/[id]/events/route.ts`)

```
GET /api/studios/{studioId}/events
Accept: text/event-stream
```

- Auth : `getStudioAuthContext(studioId)` — seul le owner peut se connecter
- Cree un subscriber Redis dedie par connexion SSE
- Subscribe au channel `studio:{studioId}:events`
- Stream chaque message comme `data: {json}\n\n`
- Keepalive toutes les 30s (`: keepalive\n\n`)
- Cleanup sur abort (unsubscribe + quit)

### 1.4 Hook frontend (`hooks/use-studio-events.ts`)

```typescript
useStudioEvents(studioId: string | undefined)
```

- Ouvre un `EventSource` vers `/api/studios/{studioId}/events`
- Parse chaque `data:` comme `StudioEvent`
- Invalide les queries TanStack Query selon le type d'event
- Auto-reconnect sur erreur (comportement natif d'EventSource)

**Mapping event → invalidation :**

| Event | Queries invalidees |
|-------|-------------------|
| `source:status` | `studios.detail(studioId)` — rafraichit les sources |
| `generation:progress` | `runs.byStudio(studioId)` — met a jour la progress card |
| `generation:complete` | `runs.byStudio(studioId)` + `widgets.byStudio(studioId)` + `studios.detail(studioId)` |
| `widget:updated` | `widgets.byStudio(studioId)` |

### 1.5 Integration dans StudioContext

Le hook `useStudioEvents(studioId)` est appele dans le `StudioProvider`. Chaque studio ouvert a une connexion SSE active.

---

## 2. BullMQ — Queues et Workers

### 2.1 Queues

| Queue | Worker | Job type | Concurrency |
|-------|--------|----------|-------------|
| `studio-source-analysis` | `analyze-source.worker.ts` | Parse, chunk, embed un document | 2 |
| `studio-widget-generation` | `generate-widget.worker.ts` | Generer un widget via Mastra workflow | 2 |
| `studio-presentation-generation` | `generate-presentation.worker.ts` | Generer une presentation (v1) | 2 |
| `studio-presentation-v2-generation` | `generate-presentation-v2.worker.ts` | Generer une presentation (v2 deck plan) | 2 |
| `studio-course-plan-generation` | `generate-course-plan.worker.ts` | Generer un plan de cours | 2 |
| `studio-slide-image-generation` | `generate-slide-image.worker.ts` | Generer une image pour une slide | 5 |

### 2.2 Lifecycle d'un job

```
API route recoit la requete
  → Cree un Widget(GENERATING) ou GenerationRun(PENDING) en DB
  → Enqueue le job: queue.add('job-name', jobData, options)
  → Retourne { widget, runId } au client

Worker prend le job
  → Met a jour le status: GenerationRun(RUNNING)
  → Publie: publishStudioEvent(studioId, 'generation:progress', { runId, progress: 5, step: 'initializing' })
  → Execute les etapes (RAG, LLM, validation)
  → Publie des events de progress a chaque etape
  → En cas de succes:
    → Widget(DRAFT), GenerationRun(COMPLETED)
    → Publie: publishStudioEvent(studioId, 'generation:complete', { runId, widgetId })
  → En cas d'echec:
    → Widget(ERROR), GenerationRun(FAILED)
    → Publie: publishStudioEvent(studioId, 'generation:complete', { runId, status: 'FAILED' })
```

### 2.3 Options des jobs

```typescript
{
  attempts: 3,                          // 3 tentatives max
  backoff: { type: 'exponential', delay: 5000 },  // 5s, 10s, 20s
  removeOnComplete: { age: 3600 },      // Supprimer apres 1h
  removeOnFail: { age: 86400 },         // Garder les echecs 24h
}
```

### 2.4 Demarrage des workers

Les workers sont demarres dans `instrumentation.ts` (Next.js server-side, au boot) :

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const sourceWorker = createSourceAnalysisWorker();
    const presentationWorker = startPresentationGenerationWorker();
    const coursePlanWorker = createCoursePlanGenerationWorker();
    const widgetWorker = createWidgetGenerationWorker();
  }
}
```

---

## 3. Events par domaine

### 3.1 Source indexing

| Moment | Event | Data |
|--------|-------|------|
| Source passe en INDEXING | `source:status` | `{ sourceId, status: 'INDEXING' }` |
| Source indexee avec succes | `source:status` | `{ sourceId, status: 'INDEXED', chunksCount }` |
| Source en erreur | `source:status` | `{ sourceId, status: 'ERROR' }` |

**Emetteur** : `analyze-source.worker.ts`

### 3.2 Widget generation

| Moment | Event | Data |
|--------|-------|------|
| Chaque etape du workflow | `generation:progress` | `{ runId, progress: 0-100, step, label }` |
| Generation terminee (succes) | `generation:complete` | `{ runId, widgetId, type }` |
| Generation echouee | `generation:complete` | `{ runId, widgetId, status: 'FAILED' }` |

**Emetteur** : `generate-widget.worker.ts`

**Steps de progression** :

| Step | Progress | Label |
|------|----------|-------|
| initializing | 5% | Chargement du template... |
| retrieving | 20% | Recherche dans les sources... |
| generating | 60% | Generation du contenu... |
| finalizing | 90% | Validation et sauvegarde... |
| completed | 100% | Termine ! |

### 3.3 Presentation generation

| Moment | Event | Data |
|--------|-------|------|
| Steps de generation | `generation:progress` | `{ runId, progress, step, label }` |
| Terminee | `generation:complete` | `{ runId, presentationId }` |

**Emetteur** : `generate-presentation.worker.ts`, `generate-presentation-v2.worker.ts`

### 3.4 Course plan generation

| Moment | Event | Data |
|--------|-------|------|
| Steps de generation | `generation:progress` | `{ runId, progress, step, label }` |
| Terminee | `generation:complete` | `{ runId, coursePlanId }` |

**Emetteur** : `generate-course-plan.worker.ts`

### 3.5 Widget update (futur)

| Moment | Event | Data |
|--------|-------|------|
| Widget modifie via API | `widget:updated` | `{ widgetId }` |

**Emetteur** : route API PATCH `/studios/[id]/widgets/[widgetId]` (pas encore implemente — a ajouter).

---

## 4. Events manquants (a implementer)

| Event | Declencheur | Workers concerne | Priorite |
|-------|------------|-----------------|----------|
| `generation:progress` dans presentation workers | Steps de generation presentation | `generate-presentation.worker.ts`, `generate-presentation-v2.worker.ts` | P2 |
| `generation:progress` dans course-plan worker | Steps de generation course plan | `generate-course-plan.worker.ts` | P2 |
| `widget:updated` depuis l'API | PATCH widget | Route API | P3 |
| `conversation:message` | Nouveau message dans le chat | Route chat | P3 |
| `studio:updated` | Titre ou settings modifie | Route PATCH studio | P3 |

**Regle** : tout changement d'etat visible par l'utilisateur doit emettre un event. Si un worker ou une route modifie la DB, il doit publier un event correspondant.

---

## 5. Regles d'implementation

### 5.1 Pas de polling

❌ Interdit :
```typescript
// NE PAS FAIRE
refetchInterval: 2000  // polling toutes les 2s
setInterval(() => fetch('/api/...'), 3000)  // polling manuel
```

✅ Correct :
```typescript
// Le hook SSE invalide automatiquement les queries
useStudioEvents(studioId);  // dans StudioProvider
// TanStack Query re-fetch quand la query est invalidee
```

### 5.2 Toujours publier depuis les workers

Chaque worker DOIT publier des events a chaque changement d'etat :

```typescript
// Dans le worker
import { publishStudioEvent } from '../../events/studio-events';

// A chaque etape
await publishStudioEvent(studioId, 'generation:progress', { runId, progress: 20, step: 'retrieving', label: '...' });

// A la fin
await publishStudioEvent(studioId, 'generation:complete', { runId, widgetId });
```

### 5.3 Publier depuis les routes API (quand pertinent)

Si une route API modifie un etat qui doit etre visible en temps reel :

```typescript
// Dans la route API
import { publishStudioEvent } from '@/lib/events/studio-events';

// Apres la modification en DB
await publishStudioEvent(studioId, 'widget:updated', { widgetId });
```

### 5.4 Gestion des erreurs

Les `publishStudioEvent()` dans les workers utilisent `.catch(() => {})` pour ne pas bloquer le worker si Redis est down. L'event est perdu mais le worker continue.

### 5.5 Scalabilite

Redis pub/sub fonctionne sur une instance unique. Pour du multi-replica :
- Option A : Redis Cluster (pub/sub fonctionne en cluster)
- Option B : Redis Streams (persistance + replay)
- Pour le MVP, une instance Redis suffit

---

## 6. Diagramme complet

```
                    ┌─────────────────────────────────────────────┐
                    │                 BROWSER                     │
                    │                                             │
                    │  useStudioEvents(studioId)                  │
                    │    → EventSource('/api/studios/{id}/events') │
                    │    → onmessage → invalidateQueries()        │
                    │                                             │
                    │  TanStack Query                              │
                    │    → refetch auto quand query invalidee     │
                    │    → UI se met a jour                       │
                    └──────────────────▲──────────────────────────┘
                                       │ SSE (text/event-stream)
                    ┌──────────────────┴──────────────────────────┐
                    │           SSE ENDPOINT                       │
                    │   GET /api/studios/{id}/events               │
                    │   → redisSub.subscribe(channel)             │
                    │   → stream events as SSE data frames        │
                    └──────────────────▲──────────────────────────┘
                                       │ Redis SUBSCRIBE
                    ┌──────────────────┴──────────────────────────┐
                    │              REDIS                           │
                    │   channel: studio:{studioId}:events         │
                    │   messages: StudioEvent JSON                │
                    └──▲──────────▲──────────▲───────────────────┘
                       │          │          │ Redis PUBLISH
            ┌──────────┴┐  ┌─────┴──────┐  ┌┴──────────────┐
            │ Source     │  │ Widget     │  │ Course Plan   │
            │ Worker     │  │ Worker     │  │ Worker        │
            │            │  │            │  │               │
            │ INDEXING   │  │ PROGRESS   │  │ PROGRESS      │
            │ INDEXED    │  │ COMPLETE   │  │ COMPLETE      │
            │ ERROR      │  │ FAILED     │  │ FAILED        │
            └────────────┘  └────────────┘  └───────────────┘
                       ▲          ▲          ▲
                       │          │          │ BullMQ jobs
            ┌──────────┴──────────┴──────────┴───────────────┐
            │                 BullMQ QUEUES                    │
            │  studio-source-analysis                         │
            │  studio-widget-generation                       │
            │  studio-presentation-generation                 │
            │  studio-course-plan-generation                  │
            │  studio-slide-image-generation                  │
            └─────────────────────▲───────────────────────────┘
                                  │ queue.add()
            ┌─────────────────────┴───────────────────────────┐
            │                 API ROUTES                        │
            │  POST /studios/{id}/generate/quiz                │
            │  POST /studios/{id}/sources                      │
            │  POST /studios/{id}/widgets/generate             │
            │  ...                                             │
            └──────────────────────────────────────────────────┘
```

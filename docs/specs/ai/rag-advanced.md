# Qiplim Studio — RAG Avance & Sources Intelligentes

Specification de l'evolution du pipeline RAG : deep research, scraping avance, connecteurs externes, et architecture extensible.

---

## 1. Etat actuel

### 1.1 Pipeline d'indexation

```
Source uploadee/ajoutee
  │
  ├── DOCUMENT → S3 → Unstructured.io API → elements structures → chunking → embed → pgvector
  ├── WEB → HTTP fetch → regex HTML strip → paragraph chunking → embed → pgvector
  ├── YOUTUBE → youtube-transcript (FR pref) → paragraph chunking → embed → pgvector
  ├── AUDIO → Whisper API → transcription → paragraph chunking → embed → pgvector
  └── VIDEO → Whisper API → transcription → paragraph chunking → embed → pgvector
```

### 1.2 Recherche hybride

```
Query utilisateur
  │
  ├── Dense: pgvector cosine similarity (HNSW index, 1024 dims Mistral)
  ├── Sparse: PostgreSQL tsvector (French stemming, GIN index)
  └── Fusion: Reciprocal Rank Fusion (K=60) → top-K results
```

### 1.3 Gaps identifies

| Gap | Impact |
|-----|--------|
| Web scraping basique (regex HTML strip) | Perd la structure, pas de JS rendering |
| Pas de deep research | L'utilisateur doit trouver et ajouter chaque source manuellement |
| Pas de connecteurs externes | Impossible de chercher dans Notion, Confluence, Drive, etc. |
| tsvector French-only | Mauvais ranking pour les sources en anglais |
| Pas de re-ranking | Les resultats hybrides ne sont pas reordonnees par un modele |

---

## 2. Deep Research

### 2.1 Concept

Un bouton **"Recherche approfondie"** dans le panel Sources permet de lancer une recherche web multi-etapes sur un sujet. L'agent :
1. Formule des queries de recherche a partir du sujet
2. Cherche sur le web (multiple queries)
3. Scrape et analyse les pages pertinentes
4. Synthetise les resultats
5. Indexe les pages retenues comme sources WEB dans le studio

### 2.2 Flow utilisateur

```
Panel Sources → bouton "Recherche approfondie"
  │
  ▼
Modal de deep research
  ┌──────────────────────────────────────────┐
  │ Recherche approfondie                    │
  │                                          │
  │ Sujet: [________________________________]│
  │                                          │
  │ Options:                                 │
  │   Langue: [FR ▾]                         │
  │   Profondeur: [Standard ▾]               │
  │     (Standard: 5 pages, Approfondi: 15)  │
  │                                          │
  │           [Annuler]  [Rechercher ✓]      │
  └──────────────────────────────────────────┘
  │
  ▼
Agent de recherche (BullMQ job)
  │ Step 1: Generer 3-5 queries de recherche variees
  │ Step 2: Web search (API) → 20-50 resultats
  │ Step 3: Scrape les top 10-15 pages (rendu JS si necessaire)
  │ Step 4: Evaluation pertinence (LLM scoring 0-10)
  │ Step 5: Retenir les pages score >= 6
  │ Step 6: Chunking + embedding des pages retenues
  │ Step 7: Synthese (resume des decouvertes)
  │
  ▼
Resultats affiches dans le panel Sources
  │ Nouvelles sources WEB ajoutees automatiquement
  │ Resume de la recherche dans le chat
```

### 2.3 Architecture technique

```typescript
interface DeepResearchJob {
  studioId: string;
  query: string;
  language: 'fr' | 'en';
  depth: 'standard' | 'deep'; // 5 vs 15 pages
  userId: string;
}

interface DeepResearchResult {
  pagesFound: number;
  pagesRetained: number;
  sourcesCreated: string[]; // source IDs
  summary: string; // markdown synthesis
}
```

**Web search API** : utiliser une API de recherche web (Serper, Brave Search, ou Tavily). Choix a faire selon le cout et la qualite.

**File** : `lib/ai/deep-research.ts` — orchestration agent. `lib/queue/workers/deep-research.worker.ts` — worker BullMQ.

### 2.4 Progress SSE

Nouveau type d'event : `research:progress` avec les etapes (searching, scraping, evaluating, indexing, done).

---

## 3. Scraping Web Avance

### 3.1 Probleme

Le scraping actuel (`fetch` + regex HTML strip) ne fonctionne pas pour :
- Pages avec rendu JavaScript (SPA, React, Vue)
- Pages avec lazy loading
- Pages protegees par anti-bot
- Structure semantique perdue (headings, listes, tableaux)

### 3.2 Solution : moteur de rendu headless

**Approche recommandee** : utiliser un service de scraping avec rendu JS.

**Options a evaluer (etat de l'art)** :

| Solution | Type | JS Rendering | Anti-bot | Open Source | Notes |
|----------|------|-------------|----------|-------------|-------|
| **Playwright** | Headless browser | ✅ | Basique | ✅ | Controle total, lourd en ressources |
| **Puppeteer** | Headless Chrome | ✅ | Basique | ✅ | Plus leger que Playwright |
| **Crawlee** | Framework scraping | ✅ (via Playwright) | ✅ (rotation, fingerprint) | ✅ | Framework complet, gere la queue |
| **Firecrawl** | API SaaS | ✅ | ✅ | ✅ (self-host) | API simple, Markdown output, LLM-ready |
| **Jina Reader** | API | ✅ | ✅ | Non (API gratuite) | `r.jina.ai/{url}` → Markdown propre |
| **@extractus/article-parser** | Lib Node | ✗ | ✗ | ✅ | Readability-like, pages statiques seulement |

**Recommandation** : commencer avec **Firecrawl** (self-hostable, output Markdown, gere le JS rendering). Fallback sur **Jina Reader** (API gratuite, zero infra). Pour le self-hosted long terme, **Crawlee + Playwright**.

### 3.3 Interface d'abstraction

```typescript
interface WebScraper {
  scrape(url: string, options?: ScrapeOptions): Promise<ScrapedPage>;
}

interface ScrapeOptions {
  waitForSelector?: string;   // attendre un element CSS
  timeout?: number;           // ms
  extractImages?: boolean;
  language?: string;
}

interface ScrapedPage {
  url: string;
  title: string;
  content: string;            // Markdown propre
  metadata: {
    author?: string;
    publishedDate?: string;
    description?: string;
    language?: string;
  };
  images?: Array<{ url: string; alt: string }>;
}
```

**File** : `lib/scraping/scraper.ts` — interface + factory. `lib/scraping/firecrawl.ts`, `lib/scraping/jina.ts`, `lib/scraping/playwright.ts` — implementations.

### 3.4 Integration dans le worker

Le worker `analyze-source.worker.ts` pour le type `WEB` appelle le scraper au lieu du fetch basique actuel :

```
WEB source → scraper.scrape(url) → ScrapedPage.content (Markdown)
  → paragraph chunking → embed → pgvector
```

---

## 4. Connecteurs Externes

### 4.1 Concept

Un studio peut se connecter a des bases de connaissances externes. Deux patterns :

**Pattern A — Federation de recherche** : le studio interroge la base externe a chaque query (pas d'import). Les resultats sont fusionnes avec la recherche locale.

**Pattern B — Import + indexation** : le studio importe les documents de la base externe, les chunk et les embed dans pgvector local. Recherche 100% locale ensuite.

### 4.2 Architecture des connecteurs

```typescript
interface KnowledgeConnector {
  id: string;
  name: string;
  type: 'search' | 'import' | 'both';

  // Pour le pattern A (federation)
  search?(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  // Pour le pattern B (import)
  listDocuments?(options?: ListOptions): Promise<ExternalDocument[]>;
  fetchDocument?(docId: string): Promise<ExternalDocumentContent>;
}

interface SearchResult {
  content: string;
  score: number;
  metadata: {
    source: string;      // nom du connecteur
    documentId: string;
    title: string;
    url?: string;
  };
}

interface ExternalDocument {
  id: string;
  title: string;
  updatedAt: Date;
  size?: number;
}

interface ExternalDocumentContent {
  content: string;        // texte brut ou Markdown
  metadata: Record<string, unknown>;
}
```

### 4.3 Connecteurs previsionnels

| Connecteur | Pattern | Auth | Notes |
|------------|---------|------|-------|
| **MCP generic** | A (search) | Token dans config | Tout serveur MCP avec une resource "search" |
| **Notion** | B (import) | OAuth / API key | Import pages/databases |
| **Confluence** | B (import) | OAuth | Import pages |
| **Google Drive** | B (import) | OAuth | Import docs/sheets/slides |
| **Pinecone** | A (search) | API key | Recherche vectorielle directe |
| **Weaviate** | A (search) | API key | Recherche vectorielle directe |
| **Qdrant** | A (search) | API key | Recherche vectorielle directe |
| **Custom API** | A ou B | Configurable | Webhook/REST endpoint |

### 4.4 Configuration dans le studio

```typescript
interface StudioConnectorConfig {
  id: string;
  studioId: string;
  connectorType: string;    // 'notion', 'pinecone', 'mcp', 'custom'
  config: Record<string, unknown>; // credentials, base URL, etc. (encrypted)
  isActive: boolean;
  lastSyncAt?: Date;
}
```

**UI** : section "Connecteurs" dans les settings du studio. Chaque connecteur a un formulaire de configuration specifique.

### 4.5 Federation de recherche

Quand un connecteur de type `search` est actif, la recherche hybride est etendue :

```
Query utilisateur
  │
  ├── Local: pgvector + tsvector (existant)
  ├── Connecteur 1: search(query) → results
  ├── Connecteur 2: search(query) → results
  └── Fusion: RRF sur tous les resultats → top-K
```

Les resultats externes sont marques avec leur source dans les citations.

### 4.6 Pas en Phase 2.5

Les connecteurs sont **prepares architecturalement** (interfaces, modele DB) mais pas tous implementes. Phase 2.5 = MCP generic + 1 base vectorielle (Pinecone ou Qdrant). Les autres connecteurs viendront en Phase 3+.

---

## 5. Ameliorations du pipeline existant

### 5.1 Multilingual tsvector

Detecter la langue du chunk (via LLM ou lib `franc`) et utiliser le bon dictionnaire tsvector :

```sql
-- Au lieu de: to_tsvector('french', content)
-- Utiliser: to_tsvector(detected_language, content)
```

### 5.2 Re-ranking

Apres la fusion RRF, un modele de re-ranking reordonne les resultats par pertinence :

```
Hybrid search → top-30 candidats → re-ranker → top-8 finals
```

Options : Cohere Rerank, Mistral rerank, ou cross-encoder local.

### 5.3 Chunking intelligent

Ameliorer le chunking au-dela du simple decoupage par taille :
- **Semantic chunking** : decouper aux changements de sujet (embedding similarity entre phrases consecutives)
- **Hierarchical chunking** : garder le contexte parent (section title) dans chaque chunk
- **Metadata enrichment** : ajouter le titre de la section, la page, la position dans le document

---

## 6. Modele de donnees

### 6.1 Nouvelles tables

```prisma
model StudioConnector {
  id            String   @id @default(cuid())
  studioId      String
  connectorType String   // 'notion', 'pinecone', 'mcp', 'custom'
  name          String
  config        Json     // encrypted credentials + settings
  isActive      Boolean  @default(true)
  lastSyncAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  studio        Studio   @relation(fields: [studioId], references: [id], onDelete: Cascade)

  @@index([studioId])
  @@map("studio_connectors")
}

model DeepResearchRun {
  id            String   @id @default(cuid())
  studioId      String
  query         String
  status        String   @default("pending") // pending, searching, scraping, indexing, completed, failed
  pagesFound    Int?
  pagesRetained Int?
  summary       String?  // markdown synthesis
  metadata      Json?
  createdAt     DateTime @default(now())
  completedAt   DateTime?
  studio        Studio   @relation(fields: [studioId], references: [id], onDelete: Cascade)

  @@index([studioId])
  @@map("deep_research_runs")
}
```

### 6.2 Extension StudioSourceChunk

```prisma
model StudioSourceChunk {
  // ... champs existants
  language   String?   // detected language ('fr', 'en', etc.)
  section    String?   // parent section title for context
}
```

---

## 7. API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/studios/[id]/deep-research` | POST | Lancer une recherche approfondie |
| `/api/studios/[id]/deep-research` | GET | Lister les recherches |
| `/api/studios/[id]/deep-research/[runId]` | GET | Status d'une recherche |
| `/api/studios/[id]/connectors` | GET/POST | CRUD connecteurs |
| `/api/studios/[id]/connectors/[connectorId]` | PATCH/DELETE | Modifier/supprimer |
| `/api/studios/[id]/connectors/[connectorId]/search` | POST | Test de recherche |

---

## 8. Plan d'implementation

| Etape | Effort | Contenu |
|-------|--------|---------|
| 8.1 | M | Scraper avance : interface + implementation Firecrawl/Jina, remplacer regex dans worker |
| 8.2 | L | Deep research : agent, worker, UI modal, progress SSE |
| 8.3 | S | Multilingual tsvector : detection langue, dictionnaire adaptatif |
| 8.4 | M | Re-ranking : integration Cohere/Mistral rerank apres hybrid search |
| 8.5 | M | Connecteurs : modele DB, interface, implementation MCP generic |
| 8.6 | M | Federation de recherche : fusion resultats locaux + externes |

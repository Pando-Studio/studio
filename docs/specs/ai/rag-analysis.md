# Qiplim Studio — Analyse approfondie RAG / Sources

> Deep research — 2026-04-15 — 25+ sources analysees, 4 agents de recherche + 1 agent critique architecture
>
> Ce document est un complement de `rag-advanced.md` (spec des features planifiees). Il couvre : critique de l'existant, benchmarks, deep research open-source, et recommandations priorisees.

---

## Resume executif

Le pipeline RAG actuel (Unstructured.io -> chunking -> Mistral embeddings -> pgvector + tsvector -> RRF) est **fonctionnel mais sous-optimal**. Les 5 actions a plus fort impact :

1. **Ajouter le re-ranking** (Cohere/Jina) — gain de +15-30% en precision pour un cout negligeable
2. **Passer a Docling** comme parser principal — 97.9% accuracy tables (vs ~75% Unstructured), gratuit, souverain, on-premise
3. **Implementer le contextual retrieval** (Anthropic-style) — -67% d'echecs de retrieval selon les benchmarks Anthropic
4. **Lancer le connecteur Google Drive** via OAuth2 + polling cadence (pas de framework lourd type Airbyte)
5. **Creer un framework d'evaluation** avec golden dataset + DeepEval (SDK TypeScript) + Langfuse (monitoring)

Le systeme n'a **aucune vulnerability de securite bloquante** mais un pattern SQL a risque dans `analyze-source.worker.ts` (interpolation directe du vecteur).

---

## I. Critique de l'architecture actuelle

### 1. Chunking — Score : 3/5

**Etat** : `structureAwareChunk()` dans `apps/studio/lib/unstructured.ts` respecte les elements Unstructured (Title/Header = section break, Table/Image = chunks isoles). Chunks de 1500 chars, overlap 200 chars. Pour WEB/YOUTUBE/AUDIO : chunking naif fixe.

**Problemes critiques** :
- **Section titles dans le content mais pas dans le metadata**. `structureAwareChunk()` inclut les titres de section dans le texte des chunks, mais il n'y a pas de champ `section_title` separe dans le metadata. Le frontend ne peut pas distinguer titre vs contenu lors du retrieval.
- **Pas de contextual embedding** (Anthropic). Chaque chunk est embede isolement sans resume du document global.
- **Overlap character-based**, pas sentence-based — coupe les phrases.
- **`parseDocumentForRAG()`** (ligne 154) aplatit tout en texte brut et re-chunke, perdant toute la structure Unstructured. Seul le worker utilise `structureAwareChunk`.

**Recommandations** :
| Action | Priorite | Effort |
|--------|----------|--------|
| Ajouter `section_title` explicite dans chunk metadata (titres deja dans le content mais pas distingues) | P0 | S |
| Contextual embedding : LLM fast (Gemini Flash) genere 1-2 phrases de contexte document-level par chunk avant embedding | P1 | M |
| Semantic chunking pour sources non-structurees (WEB, YOUTUBE, transcripts) | P2 | M |
| Parent/child chunks : petits chunks (1500) pour retrieval, parents (3000-5000) pour injection LLM | P2 | M |

### 2. Embedding Model — Score : 2.5/5

**Etat** : `mistral-embed` (1024d) hardcode dans `embeddings.ts`. Pas d'abstraction provider, pas de versioning.

**Problemes** :
- `mistral-embed` est **date** — surpasse sur MTEB par Cohere embed-v4, OpenAI text-embedding-3-large, BGE-M3.
- **Pas de distinction query/document embeddings** (Mistral le recommande mais le code ne le fait pas).
- **Pas de versioning** — changer le modele = re-embedder tout, sans migration strategy.

**Recommandations** :
| Action | Priorite | Effort |
|--------|----------|--------|
| Migrer vers Cohere embed-v4 (1024d, multilingual natif, search_document/search_query distincts) | P1 | M |
| Abstraire le provider embedding (interface `EmbeddingProvider`) | P1 | S |
| Ajouter champ `embeddingModel` sur `StudioSourceChunk` pour versioning | P1 | S |
| Alternative open-source : BGE-M3 (multilingual, dense+sparse+ColBERT en un modele) via HF Inference API | P2 | M |

### 3. Search & Re-ranking — Score : 3/5

**Etat** : Hybrid search bien implemente (dense pgvector + sparse tsvector + RRF K=60, parallel, graceful fallback). ASK mode : topK=8, candidateK=30.

**Problemes** :
- **Pas de re-ranking** — c'est le gap le plus impactant. Les benchmarks montrent +15-30% precision@K avec un cross-encoder ou API reranker.
- **Pas de HyDE** — la query brute est embedee directement, sans bridge vocabulaire question/document.
- **Fallback agressif** — quand hybrid search retourne 0, tout le contenu source est injecte (flood context).
- **Citations source-level en mode AGENT** (les modes ASK/PLAN ont deja des citations chunk-level avec chunkId/excerpt/score, mais AGENT deduplique par sourceId).

**Benchmarks re-ranking** (de la recherche) :
- ColBERT : 23ms latence, meilleur ratio qualite/latence
- Jina Reranker v3 : 188ms, excellent rapport qualite/prix
- Cohere Rerank v3 : ~600ms, $1/1000 queries

**Recommandations** :
| Action | Priorite | Effort |
|--------|----------|--------|
| Ajouter re-ranking post-RRF : `hybridSearch(candidateK=30)` -> reranker -> top 8 | P0 | M |
| Implementer HyDE pour mode ASK (LLM genere reponse hypothetique, embed ca) | P1 | S |
| Citations chunk-level en mode AGENT aussi (ASK/PLAN deja OK) | P1 | S |
| Seuil minimum de score — si rien au-dessus, dire "pas trouve" plutot que dump all | P1 | S |

### 4. Sparse Search (tsvector) — Score : 2/5

**Etat** : tsvector `GENERATED ALWAYS AS (to_tsvector('french', content))` — French-only, `ts_rank_cd` (pas BM25).

**Problemes** :
- **French-only** = contenu anglais casse
- **Pas BM25** — `ts_rank_cd` n'a pas d'IDF, pas de saturation TF, pas de normalisation longueur
- ParadeDB (`pg_search`) offrirait du vrai BM25 dans PostgreSQL, mais depend de la compatibilite Clever Cloud

**Recommandations** :
| Action | Priorite | Effort |
|--------|----------|--------|
| Language-aware tsvector : detecter la langue au chunking (franc/cld3), stocker dans colonne `language`, utiliser le bon dictionnaire | P1 | M |
| Evaluer ParadeDB pg_search pour BM25 natif (si Clever Cloud le supporte) | P2 | M |
| Sinon : BM25 applicatif en TypeScript post-tsvector | P2 | L |

### 5. Vector Database — Score : 3.5/5

**Etat** : pgvector HNSW sur PostgreSQL 16 manage Clever Cloud. Parametres HNSW par defaut (m=16, ef_construction=64).

**Verdict** : **pgvector est le bon choix** pour cette echelle. Pas besoin de Qdrant/Weaviate/Pinecone.

**Problemes** :
- **SQL injection pattern** dans `analyze-source.worker.ts` ligne 199 : `'${embeddingToVector(embedding)}'::vector` — interpolation directe. Non exploitable actuellement (embeddings pas user-controlled) mais mauvaise pratique.
- **HNSW parametres par defaut** — recall ~95%. Avec m=32, ef_construction=128 : ~99%.

**Recommandations** :
| Action | Priorite | Effort |
|--------|----------|--------|
| Fix SQL injection : passer aux parametres bind ($1::vector) | P0 | S |
| Tuner HNSW : m=32, ef_construction=128, ef_search=100 | P1 | S |
| NE PAS migrer vers un vector DB dedie — pgvector scale a plusieurs millions de vecteurs | - | - |

### 6. Document Processing — Score : 3/5

**Etat** : Unstructured.io SaaS API. Single point of failure, pas de retry, parametres par defaut (pas `hi_res`, pas `pdf_infer_table_structure`).

**Alternatives evaluees** (deep research) :

| Outil | Accuracy tables | Self-hosted | Cout 1M pages | Licence | GPU requis |
|-------|----------------|-------------|---------------|---------|------------|
| **Docling (IBM)** | 97.9% | Oui | ~$3 (compute) | MIT | Non (CPU OK, 790ms/page) |
| **MinerU** | Bon (LaTeX++) | Oui | ~$5 | AGPL-3 | Oui (PaddlePaddle) |
| **Marker** | Bon | Oui | ~$5 | Licence commerciale >$5M | Non |
| **LlamaParse** | 71.89% ParseBench | Non (API only) | ~$3000 | Proprietary | N/A |
| **Unstructured API** | ~75% tables | Non | ~$30,000 | Proprietary | N/A |
| **PyMuPDF4LLM** | PDF natifs only | Oui | ~$0.5 | AGPL-3 | Non (0.12s/page CPU) |

**Recommandation forte** : **Migrer vers Docling** comme parser principal.
- 97.9% accuracy tables (vs ~75% Unstructured) — critique pour le contenu educatif
- MIT licence, 100% on-premise, souverainete totale
- Tourne sur CPU 8-core/16GB (790ms/page) — pas besoin de GPU
- Microservice Python a cote du Node.js (ou Docker)
- **PyMuPDF4LLM** en fast-path pour les PDF textuels simples (0.12s/page)
- Garder Unstructured en fallback pour les formats exotiques

| Action | Priorite | Effort |
|--------|----------|--------|
| Deployer Docling comme microservice Python (Docker) | P1 | M |
| Ajouter retry + exponential backoff sur les appels parsing | P1 | S |
| Passer Unstructured en mode `hi_res` + `pdf_infer_table_structure: true` en attendant Docling | P1 | S |
| PyMuPDF4LLM en fast-path pour PDF natifs simples | P2 | S |

### 7. Context Window Management — Score : 2/5

**Etat** : Mode AGENT injecte tout le contenu source. Pas de token counting, pas de budget, pas de strategie adaptative.

**Recommandations** :
| Action | Priorite | Effort |
|--------|----------|--------|
| Token budget : estimer tokens avant injection, tronquer si >80% context window | P0 | S |
| RAG adaptatif : si sources < 20K tokens -> full context, sinon -> hybrid search | P0 | S |
| Augmenter topK ASK mode de 8 a 15-20 (avec re-ranking) | P1 | S |

### 8. Evaluation — Score : 0/5

**Etat** : Rien. Aucune metrique, aucun golden dataset, aucun test de qualite retrieval.

**Outils evalues** (deep research) :

| Outil | SDK TypeScript | Self-hosted | Metriques RAG | Cout |
|-------|---------------|-------------|---------------|------|
| **DeepEval** | Oui (SDK TS natif) | Oui | Faithfulness, relevancy, hallucination | Gratuit + couts LLM |
| **Langfuse** | Oui (excellent) | Oui (gratuit) | Traces, scores, monitoring prod | Free -> $2499/mo |
| **RAGAS** | Non (Python only) | Oui | Context precision/recall, faithfulness | Gratuit + couts LLM |
| **Arize Phoenix** | Oui | Oui | OpenTelemetry traces | Gratuit + cloud |

**Recommandations** :
| Action | Priorite | Effort |
|--------|----------|--------|
| Creer golden dataset : 50-100 query/expectedChunks pairs manuels | P0 | M |
| Implementer Recall@K + MRR + NDCG dans un script de test | P0 | S |
| Integrer DeepEval (SDK TypeScript) pour tests CI | P1 | M |
| Deployer Langfuse self-hosted pour monitoring production | P1 | M |

---

## II. Connecteurs externes — Deep Research

### Google Drive (priorite #1 pour les enseignants)

**Architecture recommandee** :

```
OAuth2 (scope drive.readonly)
  -> Polling cadence (changes.list avec pageToken persiste, toutes les 5 min)
  -> Delta detection (file ID + version hash)
  -> Export Google Docs -> text/markdown (natif via API, limite 10MB)
  -> Download autres fichiers (PDF, PPTX, DOCX)
  -> BullMQ queue -> Docling parsing -> chunking -> pgvector
```

**Faits cles** :
- **Auth** : OAuth2 recommande pour SaaS multi-tenant (scope `drive.readonly`). Service accounts = domain-wide delegation = complexe et sur-privilege.
- **Sync** : Webhooks (`changes.watch`) expirent max 7 jours sans renouvellement auto et ne contiennent pas le detail des changements -> **polling cadence superieur**. Stocker `pageToken` en DB pour reprise sur crash.
- **Export natif** : Google Docs -> `text/markdown` ou `text/plain`. Sheets -> CSV. Slides -> PDF puis parsing.
- **Quotas** : 12,000 req/60s par user. Gratuit.
- **Deduplication** : par `fileId + version` pour eviter de re-indexer un fichier inchange.

**Ce que Qiplim a deja** : Google OAuth dans BetterAuth (login). Il faut etendre les scopes pour Drive.

### SharePoint / OneDrive

**Architecture recommandee** :

```
MSAL OAuth2 (Azure AD, scope Files.Read)
  -> Delta queries (@odata.deltaLink comme bookmark)
  -> Download fichiers (pas d'export natif — DOCX/PPTX/PDF tels quels)
  -> BullMQ queue -> Docling parsing -> chunking -> pgvector
```

**Faits cles** :
- **Auth** : MSAL via Azure AD. Permissions `Files.Read` (delegated) ou `Files.Read.All` (application). Multi-tenant = enregistrement Azure AD multi-tenant + consent flow.
- **Sync** : Delta queries (pull model) avec `@odata.deltaLink` — superieur aux webhooks pour la robustesse. `?token=latest` pour "sync from now".
- **Quotas** : Dynamiques, non publies. HTTP 429 + Retry-After. Limite par app/user reduite depuis sept 2025.
- **Complexite** : significativement plus complexe que Google Drive (Azure AD setup, tenant discovery, permissions model).

### Notion (plus simple)

- **API** retourne du contenu structure (blocks) -> serialisable en Markdown sans parser externe
- **MCP server officiel** existe (first-party, production-ready, OAuth simple, read/write)
- Bon candidat comme 2eme connecteur apres Google Drive

### Frameworks unifies vs custom

| Approche | Recommandation |
|----------|---------------|
| **Nango** | Bonne option si >3 connecteurs. Gere OAuth multi-tenant, token refresh, syncs pre-construits. $50/mo starter. SDK Node.js. Mais self-hosted = Enterprise only. |
| **Airbyte** | Surdimensionne — ETL batch, pas d'integration applicative. Connecteur SharePoint = Enterprise ($25K/an). |
| **MCP Servers** | Approche la plus perenne. Notion = officiel. Google Drive = communautaire mature (1.1K stars). SharePoint = Microsoft Agent 365 (enterprise). Standard en forte croissance (83.8K stars). |
| **Custom direct** | Recommande pour Google Drive (simple API, vous avez deja OAuth). MCP pour Notion/SharePoint. |

**Recommandation Qiplim** :
1. **Google Drive** : custom direct (OAuth2 existant + API simple + gratuit)
2. **Notion** : via MCP server officiel
3. **SharePoint** : via Nango ou MCP Microsoft quand le besoin se confirme (complexite MSAL)

---

## III. Patterns RAG avances

### Production-ready (a implementer)

| Pattern | Impact | Effort | Detail |
|---------|--------|--------|--------|
| **Hybrid Search + RRF** | Baseline | Deja fait | Dense + sparse + fusion — c'est le standard |
| **Re-ranking** | +15-30% precision | M | ColBERT (23ms, meilleur ratio), Jina v3 (188ms, bon prix), Cohere v3 (600ms, $1/1K) |
| **Contextual Retrieval** (Anthropic) | -67% echecs retrieval | M | Prepend contexte document-level a chaque chunk avant embedding. Cout ingestion $1.02/M tokens |
| **CRAG** (Corrective RAG) | Elimine chunks non-pertinents | S | LLM fast score chaque chunk (0-10), drop si <5. Resout le probleme "fallback dump all" |
| **HyDE** | +10-15% recall | S | LLM genere reponse hypothetique, embed ca au lieu de la question brute |

### Early-adopter (a evaluer)

| Pattern | Impact | Effort | Detail |
|---------|--------|--------|--------|
| **Late Chunking** (Jina) | +1.9% a +6.5% recall | M | "Embed then chunk" — meilleur contexte par chunk. Simple via API Jina v3. |
| **Agentic RAG** | Flexibilite | M | Deja partiellement implemente (mode AGENT). Ajouter tool `search_sources` explicite. |

### Recherche (pas pour maintenant)

| Pattern | Pourquoi pas maintenant |
|---------|----------------------|
| **GraphRAG** (Microsoft) | Cout indexation eleve, non pertinent pour Q&A documentaire simple. Interessant si questions multi-hop. |
| **RAPTOR** | Manque d'implementations production-tested. Cout LLM eleve pour les summaries hierarchiques. |
| **Self-RAG** | Complexe, ajoute latence. CRAG est plus simple pour le meme objectif. |

---

## IV. Frameworks RAG open-source — Comparatif

| Framework | Stars | Connecteurs natifs (Drive/SP/Notion/Confluence) | Production-ready | Notes |
|-----------|-------|------------------------------------------------|-----------------|-------|
| **LlamaIndex** | 40.8K | 4/4 (via LlamaHub) | Oui | Meilleur equilibre connecteurs/retrieval |
| **LangChain** | 105K | 4/4 (document loaders) | Oui | Le plus populaire, API instable |
| **Haystack** | 20.2K | 1/4 (Notion seulement) | Oui (enterprise) | Meilleur cote evaluation/pipelines |
| **RAGFlow** | 62K | 0/4 | Moyen | Excellent parsing documents complexes |
| **Dify** | 111K | 0/4 | Oui (low-code) | Plateforme, pas un framework |
| **AnythingLLM** | - | 0/4 | Moyen | Desktop-first, pas pour SaaS |
| **Kotaemon** | - | 0/4 | Non | RAG UI simple |
| **PrivateGPT** | - | 0/4 | Non (ralentissement) | Derniere release aout 2024 |
| **Quivr** | - | 0/4 | Non (pivot) | Pivote vers customer support |

**Verdict** : Aucun de ces frameworks n'est recommande pour Qiplim. Le pipeline custom actuel (pgvector + BullMQ + Next.js) est plus adapte qu'un framework generique. Les connecteurs doivent etre implementes directement via les APIs (Google Drive) ou MCP (Notion, SharePoint).

---

## V. Matrice de priorite consolidee

### P0 — Correctifs immediats

| # | Action | Fichier principal | Effort |
|---|--------|-------------------|--------|
| 1 | Fix SQL injection worker (bind params) | `apps/studio/lib/queue/workers/analyze-source.worker.ts:199` | S |
| 2 | Token budget + RAG adaptatif (full context si <20K tokens) | `apps/studio/app/api/studios/[id]/chat/route.ts` | S |
| 3 | Ajouter `section_title` dans chunk metadata (titres deja dans content) | `apps/studio/lib/unstructured.ts` (structureAwareChunk) | S |
| 4 | Golden dataset evaluation (50-100 pairs manuels) | Nouveau fichier test | M |

### P1 — Ameliorations majeures

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 5 | Re-ranking post-RRF (Jina v3 ou Cohere) | +15-30% precision | M |
| 6 | Contextual embedding (Anthropic-style) | -67% echecs retrieval | M |
| 7 | Migrer parser vers Docling (microservice Python) | Souverainete + qualite tables | M |
| 8 | Google Drive connector (OAuth2 + polling) | Core user need | M |
| 9 | Abstraire embedding provider + versioning model | Maintenabilite | S |
| 10 | Language-aware tsvector | Multilingual | M |
| 11 | HyDE pour mode ASK | +10-15% recall | S |
| 12 | DeepEval CI + Langfuse monitoring | Regression detection | M |
| 13 | HNSW tuning (m=32, ef=128) | +4% recall | S |

### P2 — Evolutions futures

| # | Action | Quand |
|---|--------|-------|
| 14 | Notion connector (MCP server officiel) | Quand demande utilisateur |
| 15 | SharePoint connector (Nango ou MCP Microsoft) | Quand clients enterprise |
| 16 | Semantic chunking pour sources non-structurees | Apres evaluation baseline |
| 17 | Parent/child chunks hierarchy | Apres evaluation baseline |
| 18 | CRAG (filtrage pertinence post-retrieval) | Apres re-ranking |
| 19 | Late chunking (Jina v3) | Apres migration embedding model |
| 20 | Migrer embedding vers Cohere embed-v4 ou BGE-M3 | Apres framework evaluation en place |
| 21 | ParadeDB pg_search pour BM25 natif | Si Clever Cloud le supporte |
| 22 | Agentic RAG (tool search_sources explicite) | Apres re-ranking + CRAG |

---

## VI. Architecture cible

```
                    +-------------------------------------+
                    |          SOURCE CONNECTORS           |
                    |                                      |
                    |  Upload   Google    Notion    Share-  |
                    |  local    Drive     (MCP)    Point   |
                    |    |       |          |        |     |
                    +----+-------+----------+--------+-----+
                         |       |          |        |
                         v       v          v        v
                    +-------------------------------------+
                    |     INGESTION PIPELINE (BullMQ)      |
                    |                                      |
                    |  S3 Storage --> Parser Selection      |
                    |                 +- Docling (primary)  |
                    |                 +- PyMuPDF (fast PDF) |
                    |                 +- Unstructured (fbk) |
                    |                        |              |
                    |              Structure-Aware Chunk    |
                    |              + Section Title Prepend  |
                    |              + Language Detection     |
                    |                        |              |
                    |              Contextual Embedding     |
                    |              (LLM context + embed)    |
                    |                        |              |
                    |              pgvector + tsvector(lang) |
                    +-------------------------------------+
                                     |
                                     v
                    +-------------------------------------+
                    |         RETRIEVAL PIPELINE           |
                    |                                      |
                    |  Query --> [HyDE optional]           |
                    |        --> Hybrid Search (RRF)       |
                    |        --> Re-ranking (Jina/Cohere)  |
                    |        --> [CRAG filter]             |
                    |        --> Context injection         |
                    |              |                        |
                    |         Token Budget Check            |
                    |         (adaptive: full vs chunks)    |
                    +-------------------------------------+
                                     |
                                     v
                    +-------------------------------------+
                    |              CHAT / LLM              |
                    |                                      |
                    |  ASK: search + rerank + answer       |
                    |  PLAN: structured multi-widget plan  |
                    |  AGENT: tools + full context + gen   |
                    +-------------------------------------+
                                     |
                                     v
                    +-------------------------------------+
                    |           EVALUATION                 |
                    |                                      |
                    |  Golden Dataset -> Recall/MRR/NDCG   |
                    |  DeepEval -> CI quality gates         |
                    |  Langfuse -> Production monitoring    |
                    +-------------------------------------+
```

---

## VII. Fichiers critiques a modifier

| Fichier | Modifications |
|---------|--------------|
| `apps/studio/lib/queue/workers/analyze-source.worker.ts` | Fix SQL injection, ajouter language detection, integration Docling |
| `apps/studio/lib/unstructured.ts` | Section title propagation dans `structureAwareChunk()`, contextual embedding |
| `apps/studio/lib/ai/embeddings.ts` | Re-ranking, HyDE, provider abstraction, HNSW tuning queries |
| `apps/studio/app/api/studios/[id]/chat/route.ts` | Token budget, RAG adaptatif, CRAG filter, fix citations chunk-level |
| `packages/db-studio/prisma/schema.prisma` | Champs `language`, `embeddingModel` sur StudioSourceChunk + StudioConnector model |
| Nouveau : `apps/studio/lib/ai/reranker.ts` | Module re-ranking (Jina/Cohere API) |
| Nouveau : `apps/studio/lib/connectors/google-drive.ts` | Google Drive connector |
| Nouveau : `apps/studio/lib/ai/evaluation/` | Golden dataset + metriques + scripts |

---

## VIII. Sources principales

| # | Source | Type | Date |
|---|--------|------|------|
| 1 | Anthropic — Contextual Retrieval blog | Commercial/Research | 2024-09 |
| 2 | Docling GitHub (IBM/LF AI) — 97.9% table accuracy | Open-source | 2025-2026 |
| 3 | Google Drive API v3 docs | Officiel | 2026 |
| 4 | Microsoft Graph API delta queries | Officiel | 2026 |
| 5 | Cohere embed-v4 / Rerank v3 docs | Commercial | 2025-2026 |
| 6 | Jina Reranker v3 benchmarks | Commercial | 2025 |
| 7 | RAGAS / DeepEval documentation | Open-source | 2025-2026 |
| 8 | MCP Protocol spec (83.8K stars) | Standard | 2025-2026 |
| 9 | Nango connector framework docs | Commercial/OSS | 2025-2026 |
| 10 | LlamaIndex / LangChain connector docs | Open-source | 2025-2026 |
| 11 | ColBERT v2 benchmarks | Academique | 2024-2025 |
| 12 | ParadeDB pg_search docs | Open-source | 2025-2026 |
| 13 | Notion MCP Server (officiel) | Officiel | 2025-2026 |
| 14 | Microsoft Agent 365 MCP Servers | Officiel | 2026 |
| 15 | RAGFlow (62K stars) parsing benchmarks | Open-source | 2025-2026 |
| 16 | MinerU document parser (PaddleOCR) | Open-source | 2025-2026 |
| 17 | PyMuPDF4LLM benchmarks | Open-source | 2025 |

---

## IX. Limites de cette recherche

- Les benchmarks Docling (97.9%) proviennent principalement de publications IBM — a valider sur le corpus educatif francais de Qiplim
- Les gains du contextual retrieval (-67%) sont les chiffres Anthropic sur leur propre benchmark — resultats reels varient selon le domaine
- La compatibilite ParadeDB avec Clever Cloud n'a pas ete verifiee
- Les MCP servers communautaires (Google Drive, SharePoint) n'ont pas ete testes — maturite a valider
- Les couts Nango self-hosted (Enterprise only) n'ont pas ete obtenus

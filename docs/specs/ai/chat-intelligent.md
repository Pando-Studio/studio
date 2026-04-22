# Qiplim Studio — Chat Intelligent

Specification complete du systeme de chat IA du Studio : agent unifie, tools auto-generes, references `@`, citations structurees, memoire utilisateur, plans de generation.

> Derniere mise a jour : 15 avril 2026. Remplace la v1 avec integration du deep research sur les patterns 2025-2026.

---

## 1. Etat actuel & analyse

### 1.1 Architecture actuelle

```
POST /api/studios/[id]/chat
  |
  +-- Mode ASK:   streamText() + hybrid search (8 chunks) -> reponse conversationnelle
  +-- Mode PLAN:  streamText() + hybrid search (8 chunks) -> reponse structuree
  +-- Mode AGENT: generateText() + full source content -> tool calls (maxSteps: 3)
```

**Fichiers cles** :
- `app/api/studios/[id]/chat/route.ts` — endpoint principal
- `lib/ai/chat-tools.ts` — 10 tools hardcodes + mappings templates
- `lib/ai/embeddings.ts` — hybrid search (pgvector + tsvector + RRF)
- `lib/ai/providers.ts` — multi-provider (Mistral, OpenAI, Anthropic, Google)
- `lib/widget-templates/registry.ts` — 24 templates enregistres

### 1.2 Gaps identifies

| Gap | Impact | Priorite |
|-----|--------|----------|
| Selecteur 3 modes manuel (ASK/PLAN/AGENT) | L'utilisateur doit deviner quel mode utiliser. L'agent devrait decider seul | P1 |
| 10 tools sur 24 templates | 14 types non generables via chat | P1 |
| Tools hardcodes dans `chat-tools.ts` | Ajouter un template = code manuel | P1 |
| Pas de `@` mentions | Pas de reference contextuelle a des sources/widgets | P1 |
| Le chat ignore l'etat du studio | Ne sait pas quels widgets existent, quelles sources sont indexees | P1 |
| Historique naif (last 10 messages en string) | Perd le contexte sur longues conversations, pas de summarization | P2 |
| Pas de memoire utilisateur | Chaque conversation repart de zero | P2 |
| Pas de plan multi-widgets | Mode PLAN ne propose pas de plan structure validable | P2 |
| Citations fragiles (`[Source: nom]` string match) | Pas d'excerpt, pas de lien profond chunk, pas d'attribution multi-source | P2 |
| AGENT mode non-streaming | `generateText()` bloque, l'utilisateur attend sans feedback | P2 |
| Pas d'approbation des tool calls | L'agent propose mais l'utilisateur ne peut pas modifier avant execution | P2 |

### 1.3 Decisions architecturales

Basees sur l'analyse des patterns de Cursor 2.0, NotebookLM, Lovable, Claude Projects, ChatGPT Canvas, et les frameworks AI SDK 6, LangGraph, Mastra :

| Decision | Rationale |
|----------|-----------|
| **Supprimer le selecteur 3 modes** — l'agent auto-route via les tools disponibles | Cursor 2.0 a supprime ses modes pour la meme raison : si tous les tools sont disponibles, le modele choisit naturellement. Questions simples -> texte, "cree un quiz" -> tool call, "prepare un module" -> plan tool |
| **Vercel AI SDK 6 comme framework agent** | Deja en place (upgrade naturel), `ToolLoopAgent` + `needsApproval` resolve le pattern plan-then-execute, `streamUI` pour le rendering generatif |
| **Tools auto-generes depuis le template registry** | 0 code supplementaire par nouveau template. Resout le gap 10/24 |
| **State machine typee (reducer TS, pas XState)** | Rendering deterministe du chat, transitions explicites, pas de dependance runtime supplementaire |
| **Memoire 3 tiers** (conversation, studio, utilisateur) | Court-terme sliding window, moyen-terme etat studio auto-injecte, long-terme DB UserMemory |
| **Ne PAS construire** : GraphRAG, multi-agent, XState runtime, RL-memory | Optimisations prematurees pour l'echelle actuelle (5-50 docs par studio) |

---

## 2. Architecture cible

### 2.1 Vue d'ensemble

```
User Input (avec @mentions optionnels)
  |
  +-- 1. Parse mentions -> sourceIds, widgetIds, conversationIds
  |
  +-- 2. Build context (par priorite, jamais tronque du haut) :
  |     a. @mentioned content (priorite max, jamais tronque)
  |     b. Studio state (sources, widgets, plans actifs) — auto-injecte
  |     c. User memory (preferences, directives) — auto-injecte
  |     d. RAG: HyDE -> hybrid search -> cross-encoder rerank -> top-8 chunks
  |     e. Conversation history (last 10 messages + summary des anciens)
  |
  +-- 3. Unified Agent (AI SDK 6) :
  |     tools: {
  |       ...buildWidgetToolsFromRegistry(),     // 24 tools auto, needsApproval: true
  |       propose_generation_plan,                // plans multi-widgets, needsApproval: true
  |       search_sources,                         // read-only, needsApproval: false
  |       list_widgets,                           // read-only, needsApproval: false
  |       regenerate_widget,                      // needsApproval: true
  |       generate_from_widget,                   // cascade, needsApproval: true
  |       web_search,                             // si deep research actif, needsApproval: false
  |     }
  |     stopWhen: stepCountIs(10)
  |
  +-- 4. Stream response + tool calls -> client
  |     - Text: tokens streaming
  |     - Tool calls: interactive cards (approve/modify/cancel)
  |     - Citations: structured objects avec refs source
  |
  +-- 5. Post-completion :
        - Persist messages (onFinish callback only)
        - Extract user memory (async, fin de conversation)
        - Update studio state cache
```

### 2.2 State machine du chat

Le chat est modele comme une state machine typee. Implementation via un reducer TypeScript (pas XState).

```
                  +----------+
                  |   idle   |
                  +----+-----+
                       | user sends message
                       v
                  +----------+
                  | sending  |
                  +----+-----+
                       |
          +------------+------------+
          |            |            |
          v            v            v
     +--------+  +---------+  +----------+
     |streaming|  |tool_call|  |  error   |
     +----+----+  +----+----+  +----+-----+
          |            |            |
          |            v            | retry
          |       +----------+     |
          |       |approving |-----+
          |       +----+-----+
          |            | approved
          |            v
          |       +----------+
          |       |executing |
          |       +----+-----+
          |            |
          v            v
     +-------------------+
     |     complete      |
     +--------+----------+
              |
              v
         +----+-----+
         |   idle   |
         +----------+
```

```typescript
// lib/chat/chat-state.ts
type ChatState =
  | { status: 'idle' }
  | { status: 'sending'; userMessage: string }
  | { status: 'streaming'; partialResponse: string }
  | { status: 'tool_call'; toolName: string; args: Record<string, unknown>; needsApproval: boolean }
  | { status: 'approving'; toolName: string; args: Record<string, unknown> }
  | { status: 'executing'; toolName: string; progress?: ExecutionProgress }
  | { status: 'complete'; response: string; citations?: Citation[] }
  | { status: 'error'; error: ChatError; previousStatus: string };

type ChatAction =
  | { type: 'SEND_MESSAGE'; message: string }
  | { type: 'STREAM_TOKEN'; token: string }
  | { type: 'TOOL_CALL'; toolName: string; args: Record<string, unknown>; needsApproval: boolean }
  | { type: 'APPROVE_TOOL' }
  | { type: 'MODIFY_TOOL'; args: Record<string, unknown> }
  | { type: 'CANCEL_TOOL' }
  | { type: 'TOOL_EXECUTING'; progress?: ExecutionProgress }
  | { type: 'TOOL_COMPLETE'; result: unknown }
  | { type: 'STREAM_COMPLETE'; citations?: Citation[] }
  | { type: 'ERROR'; error: ChatError }
  | { type: 'RETRY' }
  | { type: 'CANCEL' };

function chatReducer(state: ChatState, action: ChatAction): ChatState;
```

**UI deterministe** : chaque etat mappe vers un rendu specifique :

| State | UI |
|-------|----|
| `idle` | Input actif, bouton send |
| `sending` | Spinner sur send, input desactive |
| `streaming` | Tokens qui apparaissent, bouton Stop |
| `tool_call` | Card outil avec params, boutons [Modifier] [Annuler] [Generer] |
| `approving` | Card outil en attente d'approbation |
| `executing` | Progress bar dans la card outil |
| `complete` | Message complet, citations, boutons Copy/Regenerate |
| `error` | Message d'erreur avec bouton Retry |

---

## 3. Agent unifie (suppression des modes)

### 3.1 Principe

Le selecteur ASK/PLAN/AGENT est supprime. L'agent dispose de tous les tools et decide seul de la strategie :

| Intent utilisateur | Comportement agent |
|--------------------|--------------------|
| "Que dit le chapitre 3 sur la couleur ?" | RAG search -> reponse conversationnelle avec citations |
| "Cree un quiz sur les energies renouvelables" | Tool call `generate_quiz` (needsApproval: true) |
| "Prepare un module complet sur la theorie de la couleur" | Tool call `propose_generation_plan` -> validation -> execution sequentielle |
| "Quels widgets j'ai deja ?" | Tool call `list_widgets` (read-only, inline result) |
| "Regenere le quiz mais avec 10 questions" | Tool call `regenerate_widget` (needsApproval: true) |

### 3.2 System prompt

Le system prompt est construit dynamiquement avec 5 couches de contexte :

```typescript
// lib/ai/build-system-prompt.ts
function buildSystemPrompt(params: {
  studioState: StudioState;
  userMemory: UserMemory[];
  ragChunks: SearchResult[];
  mentionedContent: MentionedContent;
  conversationSummary?: string;
}): string;
```

**Template system prompt** :

```
Tu es l'assistant IA de Qiplim Studio, une plateforme de creation de contenus pedagogiques interactifs.

## Capacites

Tu peux :
- Repondre aux questions sur les documents (sources) du studio
- Generer des widgets interactifs (quiz, flashcards, glossaire, syllabus, etc.)
- Proposer des plans de generation multi-widgets pour des modules complets
- Rechercher dans les sources
- Lister et decrire les widgets existants
- Regenerer ou ameliorer des widgets existants

## Regles

- Quand tu utilises une information d'une source, cite-la : [Source: Nom de la source]
- Quand tu references un widget existant : [Widget: Titre du widget]
- Pour les demandes de generation simples (1 widget), utilise directement le tool de generation
- Pour les demandes complexes (module, sequence, cours complet), utilise propose_generation_plan
- Ne genere jamais sans proposer — l'utilisateur doit toujours valider avant execution
- Adapte tes reponses a la langue de l'utilisateur

${studioStateBlock}
${userMemoryBlock}
${ragContextBlock}
${mentionedContentBlock}
${conversationSummaryBlock}
```

### 3.3 Contexte studio auto-injecte

**Toujours present dans le system prompt** (pas besoin de @mention) :

```
## Etat du studio

Sources indexees (3):
- chapitre-3.pdf (17 chunks, indexe) [id: abc123]
- introduction.md (5 chunks, indexe) [id: def456]
- video-cours.mp4 (transcription, 42 chunks) [id: ghi789]

Widgets generes (4):
- Quiz: "Les energies fossiles" (READY, 5 questions) [id: w1]
- Rapport: "Synthese du projet" (READY, 890 mots) [id: w2]
- Syllabus: "Master UX Design" (READY) [id: w3]
- Flashcards: "Termes cles" (GENERATING...) [id: w4]

Conversations recentes:
- "Brainstorm pedagogie" (12 messages, il y a 2h)
- "Generation quiz chapitre 3" (5 messages, hier)
```

**Impact** : le LLM peut proposer des actions pertinentes ("Tu as un chapitre sur la couleur mais pas de quiz — tu veux que j'en cree un ?"), referencer des widgets existants, et eviter de regenerer ce qui existe deja.

---

## 4. Tools auto-generes depuis le template registry

### 4.1 Probleme

Les 10 tools actuels sont hardcodes dans `lib/ai/chat-tools.ts`. Le template registry en contient 24. Chaque nouveau type necessite 4 modifications manuelles.

### 4.2 Solution : `buildWidgetToolsFromRegistry()`

```typescript
// lib/ai/chat-tools.ts (nouveau)
import { tool } from 'ai';
import { z } from 'zod';
import { templateRegistry } from '@/lib/widget-templates/registry';
import { convertJsonSchemaToZod } from '@/lib/widget-templates/schema-converter';

function buildWidgetToolsFromRegistry(): Record<string, ReturnType<typeof tool>> {
  const tools: Record<string, ReturnType<typeof tool>> = {};

  for (const template of templateRegistry.list()) {
    // Skip non-generatable templates (SLIDE, SEQUENCE, COURSE_MODULE — sub-widgets only)
    if (['SLIDE', 'SEQUENCE', 'COURSE_MODULE'].includes(template.widgetType)) continue;

    const toolName = `generate_${template.widgetType.toLowerCase()}`;

    // Convert template's JSON Schema inputs to Zod for the tool
    const inputsZod = convertJsonSchemaToZod(template.schema.inputs);

    tools[toolName] = tool({
      description: `Generer un widget ${template.name}. ${template.description || ''}`,
      parameters: z.object({
        title: z.string().describe('Titre du widget'),
        ...inputsZod.shape, // Merge template-specific inputs
      }),
      // needsApproval flag handled at agent level
    });
  }

  return tools;
}
```

**Avantage** : ajouter un template JSON dans `lib/widget-templates/templates/` = le tool chat est automatiquement disponible. Zero code.

**Mapping tool -> generation** : le tool name contient le widget type, on cherche le template correspondant dans le registry. Le handler retourne un `GenerateWidgetRequest` pour l'endpoint unifie `/api/studios/[id]/widgets/generate`.

### 4.3 Tools utilitaires (non-generation)

| Tool | `needsApproval` | Description | Parametres |
|------|-----------------|-------------|------------|
| `search_sources` | false | Recherche dans les sources du studio. Affiche les chunks trouves inline | `{ query: string, sourceIds?: string[] }` |
| `list_widgets` | false | Liste les widgets du studio avec type, titre, statut | `{ type?: WidgetType, status?: WidgetStatus }` |
| `regenerate_widget` | true | Regenerer un widget existant avec de nouveaux parametres | `{ widgetId: string, inputs?: Record<string, unknown> }` |
| `generate_from_widget` | true | Generer un widget enfant a partir du contenu d'un parent | `{ parentWidgetId: string, childTemplateId: string, title: string }` |
| `propose_generation_plan` | true | Proposer un plan de generation multi-widgets | `{ plan: GenerationPlanItem[] }` (cf. section 8) |
| `web_search` | false | Recherche web + synthese (requiert deep research actif) | `{ query: string, language?: string }` |

### 4.4 Tool invocation rendering

**Fichier** : `components/chat/ToolInvocationCard.tsx`

**Tools de generation** (needsApproval: true) :

```
+------------------------------------------+
| [icon] Generer un Quiz                   |
|                                          |
| Titre: Les energies fossiles             |
| 5 questions - Difficulte: medium         |
|                                          |
| [Modifier]  [Annuler]  [Generer]         |
+------------------------------------------+
```

L'utilisateur peut :
- **Modifier** : ouvre un formulaire inline pour ajuster les parametres
- **Annuler** : informe l'agent via tool result `{ cancelled: true }`
- **Generer** : lance la generation (POST `/widgets/generate`), card passe en mode progress

**Tools read-only** (needsApproval: false) : resultat affiche inline dans le chat (collapsible).

```
+------------------------------------------+
| [icon] Recherche dans les sources        |
| "theorie de la couleur"                  |
|                                          |
| 5 resultats trouves                      |
| > chapitre-3.pdf — "La theorie de la..." |
| > introduction.md — "Les bases de la..." |
| [Voir tout v]                            |
+------------------------------------------+
```

---

## 5. References `@` (Mentions)

### 5.1 Principe

L'utilisateur tape `@` dans le textarea pour **overrider** le contexte par defaut. L'agent injecte deja l'etat studio automatiquement (section 3.3) — les @mentions servent a focaliser ou enrichir le contexte au-dela des defaults.

**3 types suffisent** (valide par l'analyse de Cursor 2.0 qui a reduit ses @ types) :

| Type | Effet backend |
|------|--------------|
| `@source` | `hybridSearch()` filtre sur `sourceId IN mentionedSourceIds` (au lieu de toutes les sources) |
| `@widget` | Le `data.content` (Markdown) ou le JSON stringifie du widget est ajoute au contexte prioritaire |
| `@conversation` | Les 20 derniers messages de la conversation referencee sont ajoutes au contexte |

Si aucune mention : comportement par defaut (hybrid search sur toutes les sources selectionnees dans le panel).

### 5.2 UI : dropdown autocomplete

**Dropdown** : `components/chat/MentionDropdown.tsx`

```
+--------------------------------------+
| Sources                              |
|   chapitre-3.pdf                     |
|   introduction.md                    |
|   cours-theorie-couleur.pdf          |
|                                      |
| Widgets                              |
|   Quiz: Les energies fossiles        |
|   Rapport: Synthese du projet        |
|   Syllabus: Master UX Design         |
|                                      |
| Conversations                        |
|   Brainstorm pedagogie (il y a 2h)   |
|   Generation quiz chapitre 3         |
+--------------------------------------+
```

- Positionne au-dessus du textarea, aligne avec le curseur
- Groupes par type avec separateurs
- Navigation clavier (ArrowUp/Down/Enter/Escape)
- Max 8 items visibles, scrollable
- Filtre fuzzy par nom

### 5.3 Hook : `useStudioMentions`

```typescript
// hooks/use-studio-mentions.ts

interface MentionItem {
  id: string;
  name: string;
  type: 'source' | 'widget' | 'conversation';
  subLabel?: string;    // "Quiz", "PDF", "il y a 2h"
  icon?: string;        // lucide icon name
}

interface UseMentionsResult {
  mentionQuery: string | null;           // null = dropdown ferme
  filteredItems: MentionItem[];
  selectedIndex: number;
  selectMention: (item: MentionItem) => { newInput: string; newCursor: number };
  handleKeyDown: (e: KeyboardEvent) => boolean; // true si consumed
}

function useStudioMentions(params: {
  input: string;
  cursorPosition: number;
  sources: StudioSource[];
  widgets: Widget[];
  conversations: Conversation[];
}): UseMentionsResult;
```

**Detection** : `@` apres un espace ou en debut de ligne. Query = texte apres `@` jusqu'au curseur.

### 5.4 Parsing avant envoi

```typescript
// lib/chat/parse-mentions.ts

interface ParsedMessage {
  cleanText: string;                    // message sans les tokens @mention
  mentionedSourceIds: string[];
  mentionedWidgetIds: string[];
  mentionedConversationIds: string[];
}

function parseMentions(input: string, mentionMap: Map<string, MentionItem>): ParsedMessage;
```

### 5.5 Priorite de contexte

Quand le contexte depasse le budget tokens, tronquer **du bas vers le haut** :

1. **@mentioned content** — priorite max, jamais tronque
2. **Studio state** — auto-injecte, compact (~500 tokens)
3. **User memory** — auto-injecte, compact (~200 tokens)
4. **RAG chunks** — tronquer les chunks les moins pertinents d'abord
5. **Conversation history** — tronquer les messages les plus anciens d'abord

---

## 6. Citations structurees

### 6.1 Etat actuel

Pattern `[Source: nom]` insere par le LLM dans sa reponse -> regex matching cote client -> badge cliquable.

**Problemes** : fragile (le LLM peut varier le format), pas d'excerpt, pas de lien profond vers le chunk, deduplication par sourceId (perd les chunks individuels).

### 6.2 Architecture cible

**Deux types de citations** :

| Type | Pattern LLM | Rendu UI | Action au clic |
|------|-------------|----------|----------------|
| Source | `[Source: nom]` | Badge jaune avec icone document | Ouvre SourcePreviewDrawer au bon chunk, highlight le passage |
| Widget | `[Widget: titre]` | Badge bleu avec icone du type | Ouvre WidgetDetailModal |

**Metadata enrichie dans chaque citation** :

```typescript
interface Citation {
  type: 'source' | 'widget';
  id: string;                    // sourceId ou widgetId
  name: string;
  chunkId?: string;              // pour sources : le chunk exact cite
  excerpt?: string;              // les 200 premiers caracteres du chunk
  score?: number;                // pertinence
}
```

### 6.3 Ameliorations

**Excerpt au hover** : tooltip sur le badge de citation montrant le chunk cite.

**Attribution multi-source** : footer apres une reponse longue :

```
Sources utilisees: chapitre-3.pdf (3 passages), introduction.md (1 passage)
```

Chaque source cliquable -> affiche ses chunks specifiques dans le drawer.

### 6.4 Evaluation API Anthropic Citations

L'API Citations d'Anthropic (juin 2025) permet a Claude de citer nativement les passages exacts des documents fournis. **A evaluer** comme alternative au pattern `[Source: nom]` quand le provider est Anthropic.

Avantage : citations plus precises, meilleures que le string matching.
Contrainte : specifique a Anthropic, pas portable multi-provider.

**Decision** : implementer le pattern `[Source: nom]` generique d'abord (fonctionne avec tous les providers), evaluer l'API Citations comme amelioration optionnelle pour les utilisateurs Anthropic.

---

## 7. Memoire utilisateur

### 7.1 Concept

Le chat apprend les preferences et le contexte de l'utilisateur au fil des conversations. 3 tiers :

| Tier | Scope | Stockage | Injection |
|------|-------|----------|-----------|
| **Court-terme** | Conversation en cours | In-memory (messages array) | Last 10 messages verbatim + summary des anciens |
| **Moyen-terme** | Studio courant | DB (widgets, sources, conversations) | Auto-injecte dans le system prompt (section 3.3) |
| **Long-terme** | Utilisateur (cross-studio) | DB (table UserMemory) | Auto-injecte dans le system prompt |

### 7.2 Court-terme : sliding window + summarization

**Probleme actuel** : les 10 derniers messages sont envoyes en texte brut. Sur longues conversations, le contexte utile est perdu.

**Solution** :

1. Garder les **10 derniers messages** verbatim dans le prompt
2. Tous les 10 nouveaux messages, generer un **resume** des messages anciens (modele rapide : Gemini Flash ou Mistral Small)
3. Stocker le resume en DB comme champ `summary` sur la `Conversation`
4. Injecter le resume comme premier element de l'historique

```typescript
// lib/chat/conversation-summary.ts

async function summarizeConversation(
  messages: ConversationMessage[],
  existingSummary: string | null,
  model: LanguageModel,
): Promise<string>;
```

**Cout** : ~$0.001 par summarization (modele fast, ~500 tokens output).

### 7.3 Long-terme : UserMemory

**Categories** (validees par le research) :

| Categorie | Exemples | Confiance par defaut |
|-----------|----------|---------------------|
| `preference` | Langue, style, longueur quiz, niveau de detail | 0.7 |
| `context` | Role, matiere, niveau, institution | 0.8 |
| `pedagogical` | Approche, referentiel, objectifs | 0.7 |
| `technical` | Stack, outils, integrations | 0.6 |
| `directive` | Consignes explicites ("toujours en francais") | 1.0 |

### 7.4 Extraction automatique

**Approche hybride** (inspiree de ChatGPT + Claude) :

- **Directives explicites** (confidence 1.0) : l'utilisateur dit "genere toujours en francais" -> stocke immediatement
- **Extraction implicite** (confidence 0.5-0.8) : a la fin d'une conversation (>5 messages), un LLM fast analyse et extrait les preferences implicites
- **Boucle de confirmation** : quand le systeme utilise une memoire faible confidence, il le mentionne ("Je genere en francais comme d'habitude — dis-moi si tu preferes l'anglais")

```typescript
// lib/ai/memory-extraction.ts

interface ExtractedMemory {
  category: UserMemoryCategory;
  key: string;
  value: string;
  confidence: number;
}

async function extractMemoriesFromConversation(
  messages: ConversationMessage[],
  existingMemories: UserMemory[],
  model: LanguageModel,
): Promise<ExtractedMemory[]>;
```

**Prompt d'extraction** :

```
Analyse cette conversation et extrait les informations sur l'utilisateur.
Categories: preference, context, pedagogical, technical, directive.
Format JSON: [{category, key, value, confidence}]

Regles:
- Ne retiens que les informations explicites ou fortement implicites
- confidence 1.0 pour les directives explicites ("toujours...", "je veux...")
- confidence 0.5-0.8 pour les informations implicites
- Ignore les informations ephemeres (liees a une tache specifique)
- Compare avec les memoires existantes : ne duplique pas, mets a jour si necessaire

Memoires existantes: ${JSON.stringify(existingMemories)}
```

### 7.5 Injection dans le system prompt

```
## Profil de l'utilisateur

Preferences:
- Langue: francais
- Quiz: 5 questions max, difficulte moyenne

Contexte:
- Role: enseignant
- Matiere: mathematiques
- Niveau: terminale
- Institution: lycee

Pedagogie:
- Referentiel: fr-secondary

Directives:
- Toujours generer en francais
- Privilegier les exercices pratiques
```

### 7.6 Controle utilisateur

**Page Settings > Memoire IA** :

```
+------------------------------------------+
| Memoire IA                               |
|                                          |
| Ce que l'IA sait de vous:               |
|                                          |
| [Preferences]                            |
|   Langue: francais           [edit] [x]  |
|   Quiz: 5 questions max      [edit] [x]  |
|                                          |
| [Contexte]                               |
|   Role: enseignant           [edit] [x]  |
|   Matiere: mathematiques     [edit] [x]  |
|   Niveau: terminale          [edit] [x]  |
|                                          |
| [Directives]                             |
|   Toujours generer en FR     [edit] [x]  |
|                                          |
| [Tout effacer]                           |
+------------------------------------------+
```

L'utilisateur peut modifier, supprimer, ou tout effacer. RGPD-compliant : soft-delete avec `deletedAt` timestamp, purge definitive apres 30 jours.

### 7.7 Modele de donnees

```prisma
model UserMemory {
  id         String    @id @default(cuid())
  userId     String
  category   String    // preference, context, pedagogical, technical, directive
  key        String
  value      String
  confidence Float     @default(0.5)
  source     String    // conversationId or 'manual'
  deletedAt  DateTime? // soft-delete pour RGPD
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  user       user      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, category, key])
  @@index([userId])
  @@map("user_memories")
}
```

---

## 8. Plans de generation multi-widgets

### 8.1 Concept

Quand l'utilisateur demande un contenu complexe ("prepare un module complet", "cree un cours sur X"), l'agent utilise le tool `propose_generation_plan` pour proposer un plan structure.

### 8.2 Flow

```
Utilisateur: "Prepare un module complet sur la theorie de la couleur"

Agent -> tool call: propose_generation_plan
  |
  v
+-------------------------------------------------------+
| Plan de generation: Module Theorie de la couleur      |
|                                                       |
| 1. Syllabus — "Theorie de la couleur"                |
|    (objectifs, prerequis, plan general)               |
|                                                       |
| 2. Plan de seance 1 — "Cercle chromatique" (1h30)    |
|    depends: Syllabus                                  |
|                                                       |
| 3. Plan de seance 2 — "Harmonies et contrastes"      |
|    depends: Syllabus                                  |
|                                                       |
| 4. Quiz — "Les bases de la couleur" (5 questions)     |
|                                                       |
| 5. Flashcards — "Termes essentiels" (15 cartes)      |
|                                                       |
| 6. Glossaire — "Terminologie couleur" (20 termes)    |
|                                                       |
| [Modifier le plan]  [Annuler]  [Tout generer]        |
+-------------------------------------------------------+
```

### 8.3 Execution

Quand l'utilisateur valide :
- Les widgets sont generes **sequentiellement** (coherence contextuelle entre widgets dependants)
- Un widget avec `dependsOn` utilise le contenu du widget parent comme contexte supplementaire
- Progress affiche en temps reel :

```
Generation du module "Theorie de la couleur" (3/6)

[x] Syllabus: Theorie de la couleur          READY
[x] Plan de seance 1: Cercle chromatique     READY
[>] Plan de seance 2: Harmonies              GENERATING...
[ ] Quiz: Les bases de la couleur            En attente
[ ] Flashcards: Termes essentiels            En attente
[ ] Glossaire: Terminologie couleur          En attente

[Annuler les restants]
```

### 8.4 Representation technique

```typescript
// lib/chat/generation-plan.ts

interface GenerationPlanItem {
  order: number;
  templateId: string;           // ID du template dans le registry
  widgetType: WidgetType;
  title: string;
  inputs: Record<string, unknown>;
  dependsOn?: number;           // order du widget parent (son output sert de contexte)
}

interface GenerationPlan {
  id: string;
  studioId: string;
  conversationId: string;
  items: GenerationPlanItem[];
  status: 'proposed' | 'approved' | 'executing' | 'completed' | 'partial' | 'failed';
  progress?: {
    current: number;            // index de l'item en cours
    total: number;
    completedWidgetIds: string[];
    failedItems: number[];
  };
  createdAt: Date;
}
```

### 8.5 Tool definition

```typescript
const propose_generation_plan = tool({
  description: `Proposer un plan de generation multi-widgets. Utilise ce tool quand l'utilisateur demande un contenu complexe (module, cours, sequence). Le plan sera affiche pour validation avant execution.`,
  parameters: z.object({
    title: z.string().describe('Titre du plan'),
    items: z.array(z.object({
      order: z.number(),
      templateId: z.string().describe('ID du template (ex: qiplim/quiz-interactive)'),
      widgetType: z.string(),
      title: z.string(),
      inputs: z.record(z.unknown()).optional(),
      dependsOn: z.number().optional().describe('order du widget parent pour cascade'),
    })),
  }),
});
```

---

## 9. Streaming & error handling

### 9.1 Streaming unifie

**Plus de separation streaming / non-streaming par mode.** L'agent unifie stream toujours :
- Le texte arrive en tokens
- Les tool calls arrivent comme events structures
- Les resultats de tools arrivent apres execution

**Implementation** : `streamText()` de Vercel AI SDK avec tool calling streaming (plus de `generateText()` bloquant pour le mode AGENT).

### 9.2 Cancellation

| Type | Action utilisateur | Comportement |
|------|-------------------|--------------|
| Stream cancel | Bouton "Stop" | Abort le fetch, marque le message comme partiel, conserve le texte genere |
| Tool cancel | Bouton "Annuler" sur la card | Informe l'agent via tool result `{ cancelled: true, reason: 'user' }`, l'agent peut repondre |
| Plan cancel | "Annuler les restants" | Arrete l'execution sequentielle, garde les widgets deja generes |

### 9.3 Error recovery

**Strategie escaladante** :

1. **Auto-retry** (erreurs reseau, 429) : backoff exponentiel, max 3 tentatives, transparent
2. **Fallback model** (erreur modele, contexte trop long) : switch vers un modele alternatif ou tronquer le contexte
3. **Recovery assistee** (content policy, requete ambigue) : afficher l'erreur avec suggestions
4. **Degradation gracieuse** (echecs persistants) : sauver l'etat et proposer de reprendre plus tard

### 9.4 Persistence des messages

**Regle critique** : persister les messages uniquement dans le callback `onFinish`, jamais pendant le streaming. Les messages partiels (stream interrompu) sont marques `isPartial: true`.

---

## 10. Plan d'implementation

### 10.1 Ordre recommande

Les etapes sont ordonnees par valeur + dependencies minimales :

| Etape | Contenu | Effort | Dependencies |
|-------|---------|--------|-------------|
| **10.1** | Enrichir system prompt avec etat studio complet | S | Aucune |
| **10.2** | Auto-generer tools depuis template registry (`buildWidgetToolsFromRegistry`) | M | Template registry (existe) |
| **10.3** | Migrer vers agent unifie (supprimer selecteur de modes, tool-based routing) | M | 10.2 |
| **10.4** | `needsApproval` + cards interactives pour tool calls + state machine | M | 10.3 |
| **10.5** | @mentions (hook, dropdown, parsing, backend filtering) | M | Aucune |
| **10.6** | Citations structurees (excerpt hover, widget refs, attribution multi-source) | S | Aucune |
| **10.7** | Conversation summarization (sliding window + resume modele fast) | M | Aucune |
| **10.8** | User memory (modele DB, extraction LLM, injection prompt, UI settings) | L | Aucune |
| **10.9** | `propose_generation_plan` + plans multi-widgets + execution sequentielle | L | 10.3, 10.4 |

### 10.2 Regroupement en sprints

**Sprint A — Fondations agent** (10.1, 10.2, 10.3) : le chat passe d'un systeme 3-modes hardcode a un agent unifie avec 24 tools auto-generes. Effort total : M+.

**Sprint B — Interaction riche** (10.4, 10.5, 10.6) : cards d'approbation, @mentions, citations ameliorees. Le chat devient interactif. Effort total : M+.

**Sprint C — Intelligence** (10.7, 10.8) : le chat a de la memoire (conversation et utilisateur). Effort total : L.

**Sprint D — Plans** (10.9) : generation multi-widgets avec validation. Effort total : L.

---

## 11. Ce qu'on ne construit PAS

| Feature ecartee | Raison |
|-----------------|--------|
| GraphRAG | Overkill pour 5-50 docs par studio. Hierarchical chunking + section metadata suffit |
| Multi-agent orchestration | 1 agent avec des tools suffit. Multi-agent ajoute de la complexite sans valeur a cette echelle |
| XState runtime | Un reducer TypeScript donne 90% du benefice a 10% de la complexite |
| Memoire parametrique / RL | Frontier academique, pas production-ready. Token-level memory (DB + prompt injection) suffit |
| Modes autonomes (auto-execute sans approbation) | Trop risque pour la v1. A evaluer Phase 4+ quand les utilisateurs ont de l'experience |

---

## 12. References

### Code existant
- `apps/studio/app/api/studios/[id]/chat/route.ts` — endpoint chat actuel
- `apps/studio/lib/ai/chat-tools.ts` — tools hardcodes actuels
- `apps/studio/lib/ai/embeddings.ts` — hybrid search (pgvector + tsvector + RRF)
- `apps/studio/lib/widget-templates/registry.ts` — template registry (24 templates)
- `apps/studio/lib/ai/providers.ts` — multi-provider
- `apps/engage/lib/ai/mentions.ts` — mentions dans Engage (inspiration)

### Specs liees
- `specs/rag-advanced.md` — pipeline RAG, re-ranking, HyDE, connecteurs
- `specs/lifecycle.md` § 10 — player views, generation cascade
- `specs/widget-system-spec.md` — types, composition, orchestration

### Research architecture (2025-2026)
- Agentic patterns : Cursor 2.0 (tool-based routing, suppression modes), Lovable (no changes until approval), NotebookLM (source-grounded, multi-format output)
- Context engineering : paradigme post-RAG (Karpathy 2025), 3 couches complementaires (domain knowledge, tool metadata, conversation state)
- AI SDK 6 : `ToolLoopAgent`, `needsApproval`, `streamUI`, `prepareStep` pour context management dynamique
- Memoire : approche hybride Claude (explicit) + ChatGPT (implicit) avec boucle de confirmation
- Citations : Anthropic Citations API (juin 2025) comme amelioration future optionnelle
- Fichier de recherche complet : `specs/chat-architecture-research.md`

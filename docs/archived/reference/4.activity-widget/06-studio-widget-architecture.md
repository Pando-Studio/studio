# Architecture des Widgets Studio

> **Statut** : Spec formelle + Guide d'implementation
> **Date** : 2025-02-09
> **Auteur** : Architecture Team
> **Supersede** : Aucun (complementaire aux docs 03, 04, 05)

---

## Table des matieres

1. [Inventaire de l'existant](#1-inventaire-de-lexistant)
2. [Gap Analysis](#2-gap-analysis)
3. [Decisions d'architecture (ADRs)](#3-decisions-darchitecture-adrs)
4. [Evolution du modele de donnees](#4-evolution-du-modele-de-donnees)
5. [Nouveaux templates de generation](#5-nouveaux-templates-de-generation)
6. [Composants a creer/modifier](#6-composants-a-creermodifier)
7. [Mapping Studio <-> Engage](#7-mapping-studio---engage)
8. [Patterns real-time (analyse pour export futur)](#8-patterns-real-time)
9. [Phases d'implementation](#9-phases-dimplementation)
10. [Fichiers critiques (reference)](#10-fichiers-critiques)

---

## 1. Inventaire de l'existant

### 1.1 Studio aujourd'hui

**Modele de donnees** (`packages/db-studio/prisma/schema.prisma`)

- `WidgetType` enum : `QUIZ | WORDCLOUD | ROLEPLAY | PRESENTATION | SLIDE`
- `GenerationRunType` enum : `QUIZ | WORDCLOUD | ROLEPLAY | PRESENTATION | COURSE_PLAN | SLIDES | SLIDE | DECK_PLAN | CHAT`
- `Widget` model : `id, studioId, type, title, data (Json), status, runId, sourceIds, templateId, createdAt, updatedAt, slideWidgets`
- `WidgetStatus` enum : `DRAFT | GENERATING | READY | ERROR`

**Template Registry** (`apps/studio/lib/widget-templates/`)

Le systeme de templates est le point d'entree unique pour la generation de widgets. Il repose sur :

- **`types.ts`** : Definit `WidgetType`, `GenerationTemplate`, `GenerateWidgetRequest`, `GenerateWidgetResponse`
- **`registry.ts`** : Singleton `WidgetTemplateRegistry` qui enregistre et expose les templates
- **Templates JSON existants** (dans `templates/`) :
  - `quiz-interactive.json` — Quiz a choix multiples avec scoring et explications
  - `roleplay-conversation.json` — Simulation de conversation en roles
  - `slide-simple.json` — Slide unique
  - `presentation-from-sources.json` — Presentation complete depuis des sources

Chaque template suit le format `GenerationTemplate` :

```typescript
interface GenerationTemplate {
  id: string;           // format: "publisher/name" (ex: "qiplim/quiz-interactive")
  name: string;
  version: string;      // SemVer
  description?: string;
  widgetType: WidgetType;
  schema: {
    inputs: JSONSchema;       // Schema des entrees utilisateur
    activitySpec: JSONSchema; // Schema de validation de la sortie generee
  };
  generation: {
    systemPrompt: string;
    userPromptTemplate: string;  // Avec placeholders {{variable}}
    parameters: { temperature: number; maxTokens: number };
  };
  rag: { topK: number };
}
```

**Generation Modal** (`apps/studio/components/studio/modals/GenerationModal.tsx`)

Switch sur `GenerationType` pour afficher le formulaire correspondant :

```
GenerationType = 'QUIZ' | 'WORDCLOUD' | 'PRESENTATION' | 'ROLEPLAY' | 'COURSE_PLAN'
```

Formulaires existants :
- `QuizGenerationForm.tsx` — Titre, description, instructions, nombre de questions, difficulte, timer, options
- `WordcloudGenerationForm.tsx`
- `PresentationGenerationForm.tsx`
- `RoleplayGenerationForm.tsx`
- `CoursePlanGenerationForm.tsx`

Pattern commun des formulaires : props `{ studioId, selectedSourceIds, onClose, onGenerated }`, appel POST vers `/api/studios/${studioId}/generate/${type}`.

**StudioContext** (`apps/studio/components/studio/context/StudioContext.tsx`)

Fournit :
- `widgets: Widget[]` — Liste des widgets du studio (lecture seule, pas de CRUD expose)
- `refreshStudio()` — Rechargement complet des donnees
- `runs: GenerationRun[]` — Suivi des generations en cours (polling 2s)
- Interface `Widget` locale : `{ id, title, type, status, content?, createdAt }` avec `type: 'QUIZ' | 'WORDCLOUD' | 'ROLEPLAY'`

**RightPanel** (`apps/studio/components/studio/panels/RightPanel.tsx`)

Trois sections :
1. **Generables** — Boutons de generation par type
2. **Bibliotheque** — Liste des widgets et course plans generes
3. **En cours** — Runs actifs et recents

### 1.2 Engage aujourd'hui

**Modele d'activites**

`ActivityType` enum (Prisma Engage) : `Choix multiple | QUIZ | WORDCLOUD | POSTIT | ROLEPLAY | RANKING | OPENTEXT`

Chaque activite a un `config: Json` qui suit les interfaces partagees.

**Systeme real-time** (`apps/engage/lib/realtime/`)

4 modules collaboratifs :

| Module | Fichier | Responsabilite |
|---|---|---|
| Event Publisher | `event-publisher.ts` (491 lignes) | Publication d'evenements via Redis pub/sub + stockage dans Redis lists (retention 30min, max 1000/session) |
| Session Manager | `session-manager.ts` (699 lignes) | Lifecycle des sessions (WAITING → ACTIVE → CLOSED), cache dual-level, generation de codes, navigation slides |
| Participant Manager | `participant-manager.ts` (370 lignes) | Join/leave, presence (heartbeat + TTL), comptage atomique, nettoyage des stale |
| Activity Controller | `activity-controller.ts` (990 lignes) | State machine des activites (PENDING → ACTIVE → ENDED), navigation, resultats, logique quiz question-par-question |

**Aggregation** (`apps/engage/lib/aggregation/`)

Dispatcher central (`index.ts`, 357 lignes) qui route vers des aggregateurs specifiques par type :

| Type | Aggregation |
|---|---|
| Choix multiple | Correctness par question, distribution des options |
| QUIZ | Scores (avg/min/max), distribution des reponses |
| WORDCLOUD | Normalisation + frequence des mots |
| POSTIT | Groupement par categorie + votes |
| RANKING | Rang moyen + distribution des rangs par item |
| OPENTEXT | Collection des reponses avec timestamps |
| ROLEPLAY | Utilise le format OPENTEXT |

Fichiers specifiques : `choix multiple.ts`, `quiz.ts`, `wordcloud.ts`, `wordcloud-merger.ts`, `opentext.ts`, `ranking.ts`, `defaults.ts`, `types.ts`.

**Composants Engage**

Chaque type d'activite dispose de composants pour les vues presenter et participant, ainsi que de hooks SSE pour le temps reel.

### 1.3 Shared (`packages/shared/src/index.ts`)

Le package shared (258 lignes) definit les **types canoniques** qui servent de contrat entre Studio et Engage :

```typescript
// Types d'activites
type ActivityType = 'Choix multiple' | 'QUIZ' | 'WORDCLOUD' | 'POSTIT' | 'ROLEPLAY' | 'RANKING' | 'OPENTEXT';

// Configs par type
interface QuizConfig { questions: Array<{ id, question, type, options?, correctAnswer?, explanation?, timeLimit?, points?, difficulty? }>; showImmediateFeedback?; showCorrectAnswer?; showStatistics?; showLeaderboard?; showLiveResults? }
interface MultipleChoiceConfig { questions: MultipleChoiceQuestion[]; showCorrectAnswer?; timeLimit?; showLiveResults? }
interface WordCloudConfig { prompt; maxWords?; minWordLength?; maxWordLength?; showLiveResults? }
interface PostItConfig { prompt; categories?; maxPostIts?; allowVoting?; showLiveResults? }
interface RolePlayConfig { scenario; context?; roles: RolePlayRole[]; objectives?; assignmentMethod; allowRoleSwitch?; debriefingEnabled?; showLiveResults? }
interface RankingConfig { prompt; items: Array<{ id, label, description? }>; timeLimit?; showLiveResults? }
interface OpenTextConfig { prompt; placeholder?; minLength?; maxLength?; timeLimit?; showLiveResults? }
```

Ces interfaces sont le **contrat unique** pour le champ `Widget.data` (Studio) et `Activity.config` (Engage).

---

## 2. Gap Analysis

### Ce qui manque a Studio

| Gap | Detail | Impact |
|---|---|---|
| **Types manquants dans WidgetType** | `Choix multiple`, `POSTIT`, `RANKING`, `OPENTEXT` absents de l'enum Prisma | Impossible de creer ces types de widgets |
| **Types manquants dans GenerationRunType** | Idem pour le tracking des runs de generation | Pas de suivi des generations pour ces types |
| **Templates de generation** | Aucun template JSON pour Choix multiple, PostIt, Ranking, OpenText | Pas de generation IA pour ces types |
| **Formulaires de generation** | Pas de `MultipleChoiceGenerationForm`, `PostitGenerationForm`, `RankingGenerationForm`, `OpentextGenerationForm` | Pas d'UI de configuration avant generation |
| **GenerationModal incomplete** | Switch ne couvre que 5 types (QUIZ, WORDCLOUD, PRESENTATION, ROLEPLAY, COURSE_PLAN) | Les 4 nouveaux types n'ont pas d'entree dans la modale |
| **Composants d'affichage/edition** | Pas de composants `widgets/` par type pour visualiser/editer le contenu genere | Les widgets generes ne sont pas exploitables dans l'UI |
| **StudioContext.Widget limites** | Le type local `Widget.type` est restreint a `'QUIZ' \| 'WORDCLOUD' \| 'ROLEPLAY'` | Incompatible avec les nouveaux types |
| **Preview mode** | Aucune simulation participant dans Studio | Impossible de tester un widget sans passer par Engage |
| **Export Studio → Engage** | Aucune API ni UI pour transformer un Widget en Activity | Le workflow creation → utilisation est coupe |

### Ce qui existe deja et sera reutilise

- Le pattern `GenerationTemplate` JSON est mature et extensible
- Le `WidgetTemplateRegistry` supporte l'ajout de templates sans modification du code
- Les interfaces partagees dans `packages/shared` couvrent deja les 7 types
- Le pattern des formulaires de generation (`QuizGenerationForm`) est clair et reproductible
- L'aggregation Engage couvre les 7 types et servira de reference pour le preview

---

## 3. Decisions d'architecture (ADRs)

### ADR-1 : Etendre l'enum WidgetType de Studio (pas d'import depuis Engage)

**Contexte** : Studio et Engage ont des schemas Prisma separes (`packages/db-studio` vs `packages/db`). Les enums sont definis dans chaque schema independamment.

**Decision** : Ajouter `Choix multiple | POSTIT | RANKING | OPENTEXT` directement dans l'enum `WidgetType` du schema Studio. Ne pas tenter d'importer ou de synchroniser les enums Prisma entre les deux apps.

**Justification** :
- Les schemas Prisma sont independants par design (bases de donnees separees)
- Le mapping canonique vit dans `packages/shared` via `ActivityType`
- La coherence est assuree par les interfaces partagees, pas par les enums Prisma

**Consequences** :
- Migration Prisma necessaire sur `db-studio`
- Le type `WidgetType` dans `types.ts` doit etre mis a jour en parallele

### ADR-2 : Widget.data suit la meme forme que Activity.config d'Engage

**Contexte** : Le champ `Widget.data` (Json dans Prisma Studio) stocke la configuration du widget. Le champ `Activity.config` (Json dans Prisma Engage) stocke la configuration de l'activite.

**Decision** : `Widget.data` DOIT respecter les interfaces partagees (`QuizConfig`, `MultipleChoiceConfig`, `WordCloudConfig`, `PostItConfig`, `RolePlayConfig`, `RankingConfig`, `OpenTextConfig`) definies dans `packages/shared/src/index.ts`.

**Justification** :
- Pas de couche de conversion complexe a l'export Studio → Engage
- Validation possible avec les memes schemas
- Le generateur IA produit directement un objet conforme au type partage

**Consequences** :
- Les templates JSON (`schema.activitySpec`) doivent correspondre aux interfaces partagees
- L'export sera un simple transfert de `Widget.data` vers `Activity.config`

### ADR-3 : Pas de Redis/SSE pour le preview Studio en Phase 1

**Contexte** : Engage utilise Redis pub/sub + SSE pour le temps reel. Studio est une application mono-utilisateur de creation.

**Decision** : Le preview en Phase 1 utilise un React state local pour simuler les interactions participant. Pas de Redis, pas de SSE, pas de serveur de session.

**Justification** :
- Studio est mono-utilisateur : le createur teste seul
- La complexite Redis/SSE n'apporte rien pour un preview local
- Le feedback est immediat (pas de latence reseau a simuler)

**Consequences** :
- Les composants de preview ne seront pas reutilisables directement dans Engage
- Le preview ne couvre pas les scenarios multi-participants
- Migration vers une architecture real-time possible en Phase 4

### ADR-4 : Reutiliser les config forms d'Engage comme reference

**Contexte** : Engage dispose de formulaires de configuration pour chaque type d'activite. Studio a besoin de formulaires de generation (avant generation IA) et d'edition (apres generation).

**Decision** : Les formulaires d'edition Studio s'inspireront des formulaires Engage (memes champs, memes validations) mais seront adaptes au data flow Studio (`StudioContext`, appels API Studio).

**Justification** :
- Coherence de l'experience utilisateur entre les deux applications
- Les memes contraintes de validation s'appliquent (nombre min/max d'options, longueurs, etc.)
- Evite de reinventer les regles metier

**Consequences** :
- Les formulaires Studio ne sont pas des imports directs (data flow different)
- Les composants UI de base (`@qiplim/ui`) sont partages et reutilises

### ADR-5 : Le template registry reste le point d'entree unique pour la generation

**Contexte** : Le `WidgetTemplateRegistry` est un singleton qui charge les templates JSON au boot.

**Decision** : Les 4 nouveaux types sont ajoutes via 4 nouveaux fichiers JSON dans `apps/studio/lib/widget-templates/templates/`. Le registry les charge automatiquement.

**Justification** :
- Pattern existant, teste, extensible
- Pas de modification du moteur de generation
- Chaque template est autonome (prompts, schemas, parametres)

**Consequences** :
- 4 fichiers JSON a creer
- 4 imports + `this.register()` a ajouter dans `registry.ts`

---

## 4. Evolution du modele de donnees

### 4.1 Schema Prisma (`packages/db-studio/prisma/schema.prisma`)

**Modifications de l'enum `WidgetType`** :

```prisma
enum WidgetType {
  QUIZ
  WORDCLOUD
  ROLEPLAY
  PRESENTATION
  SLIDE
  Choix multiple        // NOUVEAU
  POSTIT     // NOUVEAU
  RANKING    // NOUVEAU
  OPENTEXT   // NOUVEAU
}
```

**Modifications de l'enum `GenerationRunType`** :

```prisma
enum GenerationRunType {
  QUIZ
  WORDCLOUD
  ROLEPLAY
  PRESENTATION
  COURSE_PLAN
  SLIDES
  SLIDE
  DECK_PLAN
  CHAT
  Choix multiple        // NOUVEAU
  POSTIT     // NOUVEAU
  RANKING    // NOUVEAU
  OPENTEXT   // NOUVEAU
}
```

**Modifications du model `Widget`** :

```prisma
model Widget {
  id           String        @id @default(cuid())
  studioId     String
  type         WidgetType
  title        String
  description  String?       // NOUVEAU - description du widget
  data         Json
  status       WidgetStatus  @default(DRAFT)
  order        Int           @default(0)  // NOUVEAU - ordre d'affichage
  runId        String?
  sourceIds    String[]      @default([])
  templateId   String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  slideWidgets SlideWidget[]
  studio       Studio        @relation(fields: [studioId], references: [id], onDelete: Cascade)

  @@index([studioId])
  @@index([type])
  @@map("widgets")
}
```

**Migration** : `npx prisma migrate dev --name add-new-widget-types`

### 4.2 Types TypeScript (`apps/studio/lib/widget-templates/types.ts`)

```typescript
// AVANT
export type WidgetType = 'QUIZ' | 'WORDCLOUD' | 'ROLEPLAY' | 'PRESENTATION' | 'SLIDE';

// APRES
export type WidgetType = 'QUIZ' | 'WORDCLOUD' | 'ROLEPLAY' | 'PRESENTATION' | 'SLIDE'
  | 'Choix multiple' | 'POSTIT' | 'RANKING' | 'OPENTEXT';
```

### 4.3 StudioContext (`apps/studio/components/studio/context/StudioContext.tsx`)

L'interface locale `Widget` doit etre mise a jour :

```typescript
// AVANT
export interface Widget {
  id: string;
  title: string;
  type: 'QUIZ' | 'WORDCLOUD' | 'ROLEPLAY';
  status: 'DRAFT' | 'GENERATING' | 'READY' | 'ERROR';
  content?: Record<string, unknown>;
  createdAt: string;
}

// APRES
export interface Widget {
  id: string;
  title: string;
  description?: string;
  type: 'QUIZ' | 'WORDCLOUD' | 'ROLEPLAY' | 'PRESENTATION' | 'SLIDE'
    | 'Choix multiple' | 'POSTIT' | 'RANKING' | 'OPENTEXT';
  status: 'DRAFT' | 'GENERATING' | 'READY' | 'ERROR';
  data?: Record<string, unknown>;
  order: number;
  createdAt: string;
}
```

Extensions du context :

```typescript
interface StudioContextValue {
  // ... existant ...

  // Widgets (NOUVEAU - CRUD)
  widgets: Widget[];
  selectedWidgetId: string | undefined;
  setSelectedWidgetId: (id: string | undefined) => void;
  updateWidget: (id: string, data: Partial<Widget>) => Promise<void>;
  deleteWidget: (id: string) => Promise<void>;
  reorderWidgets: (orderedIds: string[]) => Promise<void>;
}
```

---

## 5. Nouveaux templates de generation

### 5.1 Pattern de reference

Le template `quiz-interactive.json` sert de reference. Chaque nouveau template suit la meme structure :

```
{
  "id": "qiplim/<type>-<variante>",
  "name": "<Nom affiche>",
  "version": "1.0.0",
  "description": "<Description>",
  "widgetType": "<TYPE>",
  "schema": {
    "inputs": { /* JSON Schema des entrees utilisateur */ },
    "activitySpec": { /* JSON Schema conforme a l'interface partagee */ }
  },
  "generation": {
    "systemPrompt": "<Prompt systeme>",
    "userPromptTemplate": "<Prompt avec {{placeholders}}>",
    "parameters": { "temperature": 0.7, "maxTokens": 4000 }
  },
  "rag": { "topK": 10 }
}
```

### 5.2 `choix multiple-interactive.json`

**Fichier** : `apps/studio/lib/widget-templates/templates/choix multiple-interactive.json`

```json
{
  "id": "qiplim/choix multiple-interactive",
  "name": "Choix multiple Interactif",
  "version": "1.0.0",
  "description": "Questions a choix multiples avec correction et feedback",
  "widgetType": "Choix multiple",

  "schema": {
    "inputs": {
      "type": "object",
      "properties": {
        "questionCount": {
          "type": "integer",
          "minimum": 1,
          "maximum": 20,
          "default": 5,
          "title": "Nombre de questions"
        },
        "optionsPerQuestion": {
          "type": "integer",
          "minimum": 2,
          "maximum": 6,
          "default": 4,
          "title": "Options par question"
        },
        "allowMultiple": {
          "type": "boolean",
          "default": false,
          "title": "Autoriser les reponses multiples"
        },
        "timeLimit": {
          "type": "integer",
          "minimum": 10,
          "maximum": 300,
          "title": "Temps limite (secondes)"
        }
      },
      "required": ["questionCount"]
    },
    "activitySpec": {
      "type": "object",
      "properties": {
        "questions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "question": { "type": "string" },
              "options": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "id": { "type": "string" },
                    "label": { "type": "string" },
                    "isCorrect": { "type": "boolean" }
                  },
                  "required": ["id", "label"]
                },
                "minItems": 2,
                "maxItems": 6
              },
              "allowMultiple": { "type": "boolean" }
            },
            "required": ["id", "question", "options"]
          }
        },
        "showCorrectAnswer": { "type": "boolean" },
        "timeLimit": { "type": "integer" },
        "showLiveResults": { "type": "boolean" }
      },
      "required": ["questions"]
    }
  },

  "generation": {
    "systemPrompt": "Tu es un expert en creation de Choix multiple pedagogiques. Tu crees des questions claires avec des options plausibles. Chaque question a au moins une bonne reponse. Les distracteurs sont credibles mais clairement faux pour un expert du sujet.",
    "userPromptTemplate": "Cree un Choix multiple de {{questionCount}} questions sur le sujet: \"{{title}}\"\n{{#description}}Description: {{description}}\n{{/description}}\nOptions par question: {{optionsPerQuestion}}\nReponses multiples autorisees: {{allowMultiple}}\nLangue: {{language}}\n\nContenu de reference:\n{{context}}\n\nInstructions:\n- Chaque question doit avoir exactement {{optionsPerQuestion}} options\n- Marque les options correctes avec isCorrect: true\n- Genere un id unique pour chaque question et option\n- Base-toi sur le contenu de reference fourni",
    "parameters": {
      "temperature": 0.7,
      "maxTokens": 4000
    }
  },

  "rag": { "topK": 10 }
}
```

**Correspondance** : `MultipleChoiceConfig` de `packages/shared/src/index.ts` (lignes 139-144).

### 5.3 `postit-brainstorm.json`

**Fichier** : `apps/studio/lib/widget-templates/templates/postit-brainstorm.json`

```json
{
  "id": "qiplim/postit-brainstorm",
  "name": "Post-it Brainstorm",
  "version": "1.0.0",
  "description": "Session de brainstorming avec post-its categorises",
  "widgetType": "POSTIT",

  "schema": {
    "inputs": {
      "type": "object",
      "properties": {
        "prompt": {
          "type": "string",
          "title": "Question ou theme",
          "description": "La question ou le theme pour le brainstorming"
        },
        "categoryCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 8,
          "default": 3,
          "title": "Nombre de categories"
        },
        "maxPostIts": {
          "type": "integer",
          "minimum": 1,
          "maximum": 20,
          "default": 5,
          "title": "Post-its max par participant"
        },
        "allowVoting": {
          "type": "boolean",
          "default": true,
          "title": "Autoriser le vote"
        }
      },
      "required": ["prompt"]
    },
    "activitySpec": {
      "type": "object",
      "properties": {
        "prompt": { "type": "string" },
        "categories": {
          "type": "array",
          "items": { "type": "string" }
        },
        "maxPostIts": { "type": "integer" },
        "allowVoting": { "type": "boolean" },
        "showLiveResults": { "type": "boolean" }
      },
      "required": ["prompt"]
    }
  },

  "generation": {
    "systemPrompt": "Tu es un expert en facilitation et brainstorming. Tu crees des activites de post-it engageantes avec des categories pertinentes pour structurer la reflexion. Le prompt doit etre ouvert et stimulant.",
    "userPromptTemplate": "Cree une activite Post-it sur le sujet: \"{{title}}\"\n{{#description}}Description: {{description}}\n{{/description}}\nQuestion/theme propose: {{prompt}}\nNombre de categories: {{categoryCount}}\nLangue: {{language}}\n\nContenu de reference:\n{{context}}\n\nInstructions:\n- Genere un prompt engageant et ouvert\n- Propose {{categoryCount}} categories pertinentes pour organiser les idees\n- Les categories doivent couvrir differents angles du sujet\n- Base-toi sur le contenu de reference fourni",
    "parameters": {
      "temperature": 0.8,
      "maxTokens": 2000
    }
  },

  "rag": { "topK": 8 }
}
```

**Correspondance** : `PostItConfig` de `packages/shared/src/index.ts` (lignes 97-103).

### 5.4 `ranking-prioritization.json`

**Fichier** : `apps/studio/lib/widget-templates/templates/ranking-prioritization.json`

```json
{
  "id": "qiplim/ranking-prioritization",
  "name": "Classement par priorite",
  "version": "1.0.0",
  "description": "Classement d'elements par ordre de priorite ou de preference",
  "widgetType": "RANKING",

  "schema": {
    "inputs": {
      "type": "object",
      "properties": {
        "prompt": {
          "type": "string",
          "title": "Consigne de classement",
          "description": "La question ou l'instruction pour le classement"
        },
        "itemCount": {
          "type": "integer",
          "minimum": 3,
          "maximum": 15,
          "default": 5,
          "title": "Nombre d'elements a classer"
        },
        "timeLimit": {
          "type": "integer",
          "minimum": 30,
          "maximum": 600,
          "title": "Temps limite (secondes)"
        }
      },
      "required": ["prompt"]
    },
    "activitySpec": {
      "type": "object",
      "properties": {
        "prompt": { "type": "string" },
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "label": { "type": "string" },
              "description": { "type": "string" }
            },
            "required": ["id", "label"]
          },
          "minItems": 3,
          "maxItems": 15
        },
        "timeLimit": { "type": "integer" },
        "showLiveResults": { "type": "boolean" }
      },
      "required": ["prompt", "items"]
    }
  },

  "generation": {
    "systemPrompt": "Tu es un expert en pedagogie. Tu crees des activites de classement pertinentes ou les elements sont suffisamment distincts pour generer du debat mais pas triviaux a ordonner. Chaque element doit avoir un label clair et une description courte.",
    "userPromptTemplate": "Cree une activite de classement sur le sujet: \"{{title}}\"\n{{#description}}Description: {{description}}\n{{/description}}\nConsigne: {{prompt}}\nNombre d'elements: {{itemCount}}\nLangue: {{language}}\n\nContenu de reference:\n{{context}}\n\nInstructions:\n- Genere exactement {{itemCount}} elements a classer\n- Chaque element a un id unique, un label court et une description\n- Les elements doivent etre comparables et susciter la reflexion\n- Le prompt doit clairement indiquer le critere de classement\n- Base-toi sur le contenu de reference fourni",
    "parameters": {
      "temperature": 0.7,
      "maxTokens": 3000
    }
  },

  "rag": { "topK": 10 }
}
```

**Correspondance** : `RankingConfig` de `packages/shared/src/index.ts` (lignes 147-156).

### 5.5 `opentext-reflection.json`

**Fichier** : `apps/studio/lib/widget-templates/templates/opentext-reflection.json`

```json
{
  "id": "qiplim/opentext-reflection",
  "name": "Texte libre - Reflexion",
  "version": "1.0.0",
  "description": "Question ouverte pour une reflexion individuelle",
  "widgetType": "OPENTEXT",

  "schema": {
    "inputs": {
      "type": "object",
      "properties": {
        "prompt": {
          "type": "string",
          "title": "Question ouverte",
          "description": "La question pour la reflexion"
        },
        "placeholder": {
          "type": "string",
          "title": "Texte d'aide",
          "description": "Placeholder dans le champ de saisie"
        },
        "minLength": {
          "type": "integer",
          "minimum": 0,
          "maximum": 500,
          "default": 10,
          "title": "Longueur minimale (caracteres)"
        },
        "maxLength": {
          "type": "integer",
          "minimum": 50,
          "maximum": 5000,
          "default": 500,
          "title": "Longueur maximale (caracteres)"
        },
        "timeLimit": {
          "type": "integer",
          "minimum": 30,
          "maximum": 600,
          "title": "Temps limite (secondes)"
        }
      },
      "required": ["prompt"]
    },
    "activitySpec": {
      "type": "object",
      "properties": {
        "prompt": { "type": "string" },
        "placeholder": { "type": "string" },
        "minLength": { "type": "integer" },
        "maxLength": { "type": "integer" },
        "timeLimit": { "type": "integer" },
        "showLiveResults": { "type": "boolean" }
      },
      "required": ["prompt"]
    }
  },

  "generation": {
    "systemPrompt": "Tu es un expert en pedagogie. Tu crees des questions ouvertes profondes qui stimulent la reflexion critique. La question doit etre ouverte, non binaire, et inviter a l'argumentation. Le placeholder doit guider sans orienter.",
    "userPromptTemplate": "Cree une question ouverte sur le sujet: \"{{title}}\"\n{{#description}}Description: {{description}}\n{{/description}}\nQuestion proposee: {{prompt}}\nLangue: {{language}}\n\nContenu de reference:\n{{context}}\n\nInstructions:\n- Genere un prompt engageant qui invite a la reflexion\n- Le prompt doit etre ouvert et non binaire (pas de oui/non)\n- Propose un placeholder utile pour guider la saisie\n- Definis des longueurs min/max raisonnables\n- Base-toi sur le contenu de reference fourni",
    "parameters": {
      "temperature": 0.8,
      "maxTokens": 1500
    }
  },

  "rag": { "topK": 8 }
}
```

**Correspondance** : `OpenTextConfig` de `packages/shared/src/index.ts` (lignes 159-166).

---

## 6. Composants a creer/modifier

### 6.1 Nouveaux formulaires de generation

Chaque formulaire suit le pattern de `QuizGenerationForm.tsx` :

| Fichier a creer | Type | Champs specifiques |
|---|---|---|
| `apps/studio/components/studio/modals/MultipleChoiceGenerationForm.tsx` | Choix multiple | questionCount, optionsPerQuestion, allowMultiple, timeLimit |
| `apps/studio/components/studio/modals/PostitGenerationForm.tsx` | POSTIT | prompt, categoryCount, maxPostIts, allowVoting |
| `apps/studio/components/studio/modals/RankingGenerationForm.tsx` | RANKING | prompt, itemCount, timeLimit |
| `apps/studio/components/studio/modals/OpentextGenerationForm.tsx` | OPENTEXT | prompt, placeholder, minLength, maxLength, timeLimit |

**Pattern commun** :

```typescript
interface XxxGenerationFormProps {
  studioId: string;
  selectedSourceIds: Set<string>;
  onClose: () => void;
  onGenerated: () => void;
}

// Sections : Informations (titre, description, instructions) → Parametres → Options → Actions
// Appel : POST /api/studios/${studioId}/generate/${type.toLowerCase()}
```

### 6.2 Nouveaux composants d'affichage/edition

A creer dans `apps/studio/components/widgets/` :

```
widgets/
  choix multiple/
    MultipleChoiceWidgetDisplay.tsx      # Vue lecture seule du Choix multiple genere
    MultipleChoiceWidgetEditor.tsx       # Edition des questions/options
  postit/
    PostitWidgetDisplay.tsx    # Vue des categories et du prompt
    PostitWidgetEditor.tsx     # Edition du prompt et des categories
  ranking/
    RankingWidgetDisplay.tsx   # Vue des items a classer
    RankingWidgetEditor.tsx    # Edition des items et du prompt
  opentext/
    OpentextWidgetDisplay.tsx  # Vue de la question ouverte
    OpentextWidgetEditor.tsx   # Edition du prompt et des contraintes
```

**Pattern Display** : Recoit `data: Record<string, unknown>` et affiche le contenu de maniere lisible (questions, options, categories, items...).

**Pattern Editor** : Recoit `data` + `onSave(data)`, permet l'edition inline avec validation conforme aux interfaces partagees.

### 6.3 Fichiers a modifier

**`apps/studio/components/studio/modals/GenerationModal.tsx`**

```typescript
// AVANT
export type GenerationType = 'QUIZ' | 'WORDCLOUD' | 'PRESENTATION' | 'ROLEPLAY' | 'COURSE_PLAN';

// APRES
export type GenerationType = 'QUIZ' | 'WORDCLOUD' | 'PRESENTATION' | 'ROLEPLAY' | 'COURSE_PLAN'
  | 'Choix multiple' | 'POSTIT' | 'RANKING' | 'OPENTEXT';

// Ajouter dans typeConfigs :
Choix multiple: { title: 'Generer un Choix multiple', icon: ListChecks, color: 'text-indigo-500' },
POSTIT: { title: 'Generer des Post-its', icon: StickyNote, color: 'text-yellow-500' },
RANKING: { title: 'Generer un Classement', icon: ArrowUpDown, color: 'text-cyan-500' },
OPENTEXT: { title: 'Generer une Question ouverte', icon: MessageSquare, color: 'text-rose-500' },

// Ajouter dans renderForm() switch :
case 'Choix multiple': return <MultipleChoiceGenerationForm {...commonProps} />;
case 'POSTIT': return <PostitGenerationForm {...commonProps} />;
case 'RANKING': return <RankingGenerationForm {...commonProps} />;
case 'OPENTEXT': return <OpentextGenerationForm {...commonProps} />;
```

**`apps/studio/lib/widget-templates/registry.ts`**

```typescript
// Ajouter les imports :
import multipleChoiceTemplate from './templates/choix multiple-interactive.json';
import postitTemplate from './templates/postit-brainstorm.json';
import rankingTemplate from './templates/ranking-prioritization.json';
import opentextTemplate from './templates/opentext-reflection.json';

// Ajouter dans le constructeur :
this.register(multipleChoiceTemplate as GenerationTemplate);
this.register(postitTemplate as GenerationTemplate);
this.register(rankingTemplate as GenerationTemplate);
this.register(opentextTemplate as GenerationTemplate);
```

**`apps/studio/components/studio/panels/RightPanel.tsx`**

Ajouter dans `widgetTypeConfigs` :

```typescript
Choix multiple: { icon: ListChecks, label: 'Choix multiple', color: 'text-indigo-500 bg-indigo-500/10' },
POSTIT: { icon: StickyNote, label: 'Post-it', color: 'text-yellow-500 bg-yellow-500/10' },
RANKING: { icon: ArrowUpDown, label: 'Classement', color: 'text-cyan-500 bg-cyan-500/10' },
OPENTEXT: { icon: MessageSquare, label: 'Texte libre', color: 'text-rose-500 bg-rose-500/10' },
```

Ajouter dans `generableTemplates` :

```typescript
{ type: 'MULTIPLE_CHOICE', title: 'Choix multiple', description: 'Generez un questionnaire a choix multiples', icon: ListChecks, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
{ type: 'POSTIT', title: 'Post-it', description: 'Creez une activite de brainstorming', icon: StickyNote, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
{ type: 'RANKING', title: 'Classement', description: 'Creez une activite de classement', icon: ArrowUpDown, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
{ type: 'OPENTEXT', title: 'Texte libre', description: 'Posez une question ouverte', icon: MessageSquare, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
```

---

## 7. Mapping Studio <-> Engage

### 7.1 Table de correspondance

| Studio `WidgetType` | Engage `ActivityType` | Interface partagee | Fichier shared |
|---|---|---|---|
| `QUIZ` | `QUIZ` | `QuizConfig` | `packages/shared/src/index.ts:58-76` |
| `WORDCLOUD` | `WORDCLOUD` | `WordCloudConfig` | `packages/shared/src/index.ts:88-94` |
| `ROLEPLAY` | `ROLEPLAY` | `RolePlayConfig` | `packages/shared/src/index.ts:115-124` |
| `Choix multiple` | `Choix multiple` | `MultipleChoiceConfig` | `packages/shared/src/index.ts:139-144` |
| `POSTIT` | `POSTIT` | `PostItConfig` | `packages/shared/src/index.ts:97-103` |
| `RANKING` | `RANKING` | `RankingConfig` | `packages/shared/src/index.ts:147-156` |
| `OPENTEXT` | `OPENTEXT` | `OpenTextConfig` | `packages/shared/src/index.ts:159-166` |
| `PRESENTATION` | — | — | Pas d'equivalent Engage |
| `SLIDE` | — | — | Pas d'equivalent Engage |

### 7.2 Regles de mapping

- Le `WidgetType` Studio est **identique** a l'`ActivityType` Engage pour les 7 types communs
- `PRESENTATION` et `SLIDE` sont specifiques a Studio (pas d'activite correspondante dans Engage)
- Le champ `Widget.data` (Studio) correspond directement a `Activity.config` (Engage)
- Aucune transformation n'est necessaire a l'export (ADR-2)

### 7.3 Flux d'export (Phase 3)

```
Studio                              Engage
┌─────────────┐                     ┌─────────────┐
│   Widget     │     Export API      │   Activity   │
│  .type       │ ──────────────────> │  .type       │
│  .data       │   validation via    │  .config     │
│  .title      │   interfaces        │  .title      │
│  .description│   partagees         │  .description│
└─────────────┘                     └─────────────┘

API: POST /api/studios/:studioId/widgets/:widgetId/export
Body: { projectId: string }  // Projet Engage cible

Logique:
1. Charger Widget depuis db-studio
2. Valider Widget.data contre l'interface partagee du type
3. Creer Activity dans db-engage avec Activity.config = Widget.data
4. Retourner l'Activity creee
```

---

## 8. Patterns real-time (analyse pour export futur)

Cette section documente l'architecture real-time d'Engage pour reference. Elle sera reutilisee/adaptee quand le preview Studio et l'export vers Engage seront implementes.

### 8.1 Event Publisher (`apps/engage/lib/realtime/event-publisher.ts`)

**Mecanisme** : Redis pub/sub + stockage dans des listes Redis.

- Chaque evenement est stocke dans `session:{sessionId}:events` (liste Redis)
- Publication simultanee sur le channel `session:{sessionId}` (pub/sub)
- Retention : 30 minutes, max 1000 evenements par session
- Methodes specialisees par domaine :
  - Session : `publishSessionStarted`, `publishSessionPaused`, `publishSessionResumed`, `publishSessionEnded`
  - Participant : `publishParticipantJoined`, `publishParticipantLeft`, `publishParticipantCountUpdated`
  - Activity : `publishActivityStarted`, `publishActivityEnded`, `publishActivityResponseReceived`, `publishActivityResultsUpdated`
  - Quiz : `publishQuizQuestionStarted`, `publishQuizQuestionEnded` (avec resultats detailles)
  - PostIt : `publishPostItCreated`, `publishPostItUpdated`, `publishPostItDeleted`

### 8.2 Activity Controller (`apps/engage/lib/realtime/activity-controller.ts`)

**State machine** :

```
PENDING ──start──> ACTIVE ──end──> ENDED
                     │
                     └──(Quiz: question state machine)──>
                          waiting → active → ended
```

- Initialisation : charge les activites du projet, construit l'ordre
- Navigation : `moveToActivity(direction: 'next' | 'prev')` ou `moveToActivity(activityId)`
- Fin d'activite : calcule et cache les resultats agreges
- Quiz : gestion question-par-question avec `startQuizQuestion`, `endQuizQuestion`, `getQuizSummary`

### 8.3 SSE Endpoint

Les clients (presenter et participant) se connectent via SSE et recoivent les evenements filtres par role. Le polling complementaire permet de rattraper les evenements manques.

### 8.4 Aggregation (`apps/engage/lib/aggregation/`)

Chaque type d'activite a un aggregateur specialise qui transforme les reponses brutes en resultats structures. L'aggregation est declenchee a la fin de l'activite et les resultats sont caches dans Redis.

### 8.5 Ce qui sera reutilise pour Studio

| Element Engage | Usage Studio | Phase |
|---|---|---|
| Interfaces de config partagees | Validation de `Widget.data` | Phase 1 |
| Logique d'aggregation | Preview mode (simulation locale) | Phase 4 |
| Composants participant | Reference pour les composants de preview | Phase 4 |
| Event publisher | Non reutilise (preview local = React state) | — |
| Session manager | Non reutilise (pas de sessions en Studio) | — |

---

## 9. Phases d'implementation

### Phase 1 : Core — Nouveaux types + Generation

**Objectif** : Permettre la generation IA des 4 nouveaux types de widgets.

**Taches** :

1. **Migration Prisma** (`packages/db-studio/prisma/schema.prisma`)
   - Ajouter `Choix multiple | POSTIT | RANKING | OPENTEXT` a `WidgetType`
   - Ajouter `Choix multiple | POSTIT | RANKING | OPENTEXT` a `GenerationRunType`
   - Ajouter `description String?` et `order Int @default(0)` au model `Widget`
   - Executer `npx prisma migrate dev`

2. **Templates JSON** (4 fichiers dans `apps/studio/lib/widget-templates/templates/`)
   - `choix multiple-interactive.json`
   - `postit-brainstorm.json`
   - `ranking-prioritization.json`
   - `opentext-reflection.json`

3. **Registry** (`apps/studio/lib/widget-templates/registry.ts`)
   - Importer et enregistrer les 4 nouveaux templates

4. **Types** (`apps/studio/lib/widget-templates/types.ts`)
   - Etendre `WidgetType` avec les 4 nouveaux types

5. **Formulaires de generation** (4 fichiers dans `apps/studio/components/studio/modals/`)
   - `MultipleChoiceGenerationForm.tsx`
   - `PostitGenerationForm.tsx`
   - `RankingGenerationForm.tsx`
   - `OpentextGenerationForm.tsx`

6. **GenerationModal** (`apps/studio/components/studio/modals/GenerationModal.tsx`)
   - Etendre `GenerationType`
   - Ajouter 4 cases au switch
   - Ajouter les configs d'icones/couleurs

7. **RightPanel** (`apps/studio/components/studio/panels/RightPanel.tsx`)
   - Ajouter les 4 types dans `widgetTypeConfigs`
   - Ajouter les 4 entrees dans `generableTemplates`

8. **API routes** (4 routes dans `apps/studio/app/api/studios/[id]/generate/`)
   - `choix multiple/route.ts`
   - `postit/route.ts`
   - `ranking/route.ts`
   - `opentext/route.ts`

**Critere de validation** : Un utilisateur peut generer un widget Choix multiple, PostIt, Ranking ou OpenText depuis l'interface Studio.

### Phase 2 : Affichage + Edition

**Objectif** : Permettre la visualisation et l'edition des widgets generes.

**Taches** :

1. **Composants display/editor** (8 fichiers dans `apps/studio/components/widgets/`)
   - `choix multiple/MultipleChoiceWidgetDisplay.tsx` + `MultipleChoiceWidgetEditor.tsx`
   - `postit/PostitWidgetDisplay.tsx` + `PostitWidgetEditor.tsx`
   - `ranking/RankingWidgetDisplay.tsx` + `RankingWidgetEditor.tsx`
   - `opentext/OpentextWidgetDisplay.tsx` + `OpentextWidgetEditor.tsx`

2. **Extension StudioContext** (`apps/studio/components/studio/context/StudioContext.tsx`)
   - Mettre a jour l'interface `Widget` (types, description, order, data)
   - Ajouter `selectedWidgetId`, `setSelectedWidgetId`
   - Ajouter `updateWidget`, `deleteWidget`, `reorderWidgets`

3. **Widget detail panel** (dans RightPanel ou nouveau composant)
   - Affichage du widget selectionne avec le composant Display correspondant
   - Bouton d'edition ouvrant le composant Editor
   - Actions : supprimer, regenerer, dupliquer

4. **API CRUD widgets**
   - `PATCH /api/studios/:id/widgets/:widgetId` (update)
   - `DELETE /api/studios/:id/widgets/:widgetId` (delete)
   - `PATCH /api/studios/:id/widgets/reorder` (reorder)

**Critere de validation** : Un utilisateur peut voir le detail d'un widget genere, l'editer, le supprimer, et reordonner les widgets.

### Phase 3 : Export Studio → Engage

**Objectif** : Permettre l'export d'un widget Studio vers un projet Engage.

**Taches** :

1. **API d'export**
   - `POST /api/studios/:studioId/widgets/:widgetId/export`
   - Body : `{ projectId: string }`
   - Validation via interfaces partagees
   - Creation de l'Activity dans Engage

2. **UI de selection du projet cible**
   - Modale listant les projets Engage de l'utilisateur
   - Confirmation avant export
   - Feedback de succes/erreur

3. **Validation croisee**
   - Verifier que `Widget.data` est conforme a l'interface partagee du type
   - Gerer les cas d'erreur (projet inexistant, type non supporte)

**Critere de validation** : Un utilisateur peut exporter un widget Quiz depuis Studio et le retrouver comme activite dans un projet Engage.

### Phase 4 : Preview + Avance (post-MLP)

**Objectif** : Simuler l'experience participant directement dans Studio.

**Taches** :

1. **Preview mode**
   - Composants de preview par type (simulant la vue participant)
   - React state local pour les interactions (ADR-3)
   - Aggregation locale pour afficher les resultats simules

2. **Widget composition**
   - Sequences de widgets (enchainage)
   - Widgets conditionnels (branchement selon les reponses)

3. **Versioning**
   - Historique des modifications de `Widget.data`
   - Restauration de versions precedentes

---

## 10. Fichiers critiques (reference)

| Fichier | Role | Impact |
|---|---|---|
| `packages/db-studio/prisma/schema.prisma` | Schema a migrer (enums + model Widget) | Phase 1 |
| `packages/shared/src/index.ts` | Types canoniques partages (contrat Studio ↔ Engage) | Toutes phases |
| `apps/studio/lib/widget-templates/registry.ts` | Registre de templates (4 imports a ajouter) | Phase 1 |
| `apps/studio/lib/widget-templates/types.ts` | Type `WidgetType` a etendre | Phase 1 |
| `apps/studio/lib/widget-templates/templates/quiz-interactive.json` | Pattern de reference pour les nouveaux templates | Phase 1 |
| `apps/studio/components/studio/modals/GenerationModal.tsx` | Modal a etendre (4 cases + imports) | Phase 1 |
| `apps/studio/components/studio/modals/QuizGenerationForm.tsx` | Pattern de reference pour les nouveaux formulaires | Phase 1 |
| `apps/studio/components/studio/context/StudioContext.tsx` | Context a enrichir (Widget interface + CRUD) | Phase 2 |
| `apps/studio/components/studio/panels/RightPanel.tsx` | Panel a etendre (configs + generables) | Phase 1-2 |
| `apps/engage/lib/realtime/event-publisher.ts` | Pattern real-time de reference | Phase 3-4 |
| `apps/engage/lib/realtime/activity-controller.ts` | State machine de reference | Phase 3-4 |
| `apps/engage/lib/aggregation/index.ts` | Aggregation de reference (7 types) | Phase 4 |

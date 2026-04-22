# Qiplim Studio — Universal Widget System Specification

## Context

Studio is a universal creator of interactive experiences from documents. The goal is to define a composable widget system — static, interactive, and generative — that can be created via AI in Studio and played in live sessions in Engage. This document specifies the architecture, lifecycle, composition, and generation patterns to make the concept robust, interoperable, and open-source.

**This document replaces** the previous WPS++ specs which were too over-engineered (A2UI, capabilities runtime, 11 unimplemented lifecycle hooks). We start from **what works** (Engage in prod) and extend progressively.

---

## 1. Widget Taxonomy

### 1.1 Four categories

| Category | Description | Examples | Runtime state |
|----------|-------------|----------|---------------|
| **Static simple** | Generated content, read-only | Audio podcast, image, video, text/MD | None |
| **Static composed** | Structured set of static content | Course plan, slide deck, structured article | Navigation (current page) |
| **Interactive** | Widget with participant input + scoring | Quiz, MCQ, wordcloud, post-it, ranking, roleplay, opentext | State machine (idle→active→ended) + responses |
| **Interactive composed** | Orchestrated sequence of widgets | Presentation (slides + quiz), complete training, interactive adventure | Orchestration (sequential, conditional) |

### 1.2 The GENERATIVE block

A cross-cutting type: a block whose **content is generated at runtime** by an LLM, based on the session context (votes, responses, progression). Any widget type can have a generative layer.

```typescript
interface GenerativeConfig {
  promptTemplate: string;                     // template avec {{variables}}
  inputBindings: Record<string, string>;      // variable → source (résultat d'un autre bloc)
  outputSchema: Record<string, unknown>;      // JSON Schema du contenu attendu
  fallback?: unknown;                         // contenu par défaut si LLM fail
}
```

**Usage examples**:
- Next chapter of an adventure (input: collective vote result)
- Personalized post-quiz feedback (input: score + frequent errors)
- Adaptive follow-up question based on level (input: % of correct group answers)
- Dynamic vote options (input: generated narrative context)

---

## 2. Widget Architecture

### 2.1 Widget = JSON Spec + Schema + Renderer

Each widget is defined by three elements:
1. **JSON Spec** (`data`) — structure + content, stored in DB
2. **Zod Schema** — spec validation at write and read time
3. **Renderer(s)** — React components for display depending on context

```typescript
interface Widget {
  id: string;
  type: WidgetType;           // 'QUIZ' | 'SLIDE' | 'AUDIO' | 'SEQUENCE' | ...
  kind: 'LEAF' | 'COMPOSED';  // LEAF = terminal, COMPOSED = a des enfants
  status: 'DRAFT' | 'GENERATING' | 'READY' | 'ERROR';
  data: Record<string, unknown>;  // spec JSON validée par le Zod du type
  children?: Widget[];             // pour les composés uniquement
  orchestration?: Orchestration;   // règles de navigation entre enfants
  generative?: GenerativeConfig;   // si contenu dynamique at runtime
}
```

### 2.2 Simplified composition model

A composed widget = an **ordered list of children** + **navigation rules**.

```typescript
interface ComposedWidget extends Widget {
  kind: 'COMPOSED';
  children: Widget[];
  orchestration: {
    mode: 'sequential' | 'conditional';
    transitions?: Transition[];
  };
}

interface Transition {
  from: string;       // widget.id source
  to: string;         // widget.id destination
  condition?: string;  // expression simple (voir section 6.3)
}
```

**Sequential mode**: children are played in order. `transitions` is optional (auto-advance).

**Conditional mode**: `transitions` define which child comes after which, based on a condition evaluated on the result of the previous step.

### 2.3 LEAF with parentId — cascading generation

A LEAF widget can have **children** via `parentId`, without becoming COMPOSED. This is the chosen model for pedagogical widgets and "rich" widgets (report, summary, etc.).

**Semantics of `kind`**:

| Kind | Own content (`data`) | Children (`children`) | Usage |
|------|---------------------|----------------------|-------|
| `LEAF` | Yes (generated content, Markdown, items, etc.) | Optional — via `parentId` | Quiz, FAQ, Report, Syllabus, Semester, etc. |
| `COMPOSED` | No (orchestration only) | Yes — navigation between children | Sequence, Course Module |

A `LEAF` with children has **two views** in the UI:
1. **Content view** (default) — displays its own content (Markdown, items, questions)
2. **Children view** (tab or section) — lists the widgets generated from this content

**Example: cascading pedagogical generation**

```
[PROGRAM_OVERVIEW] LEAF, content: "# Master UX Design..."
   ├── "Generer les semestres" →
   ├── [SEMESTER] LEAF, parentId: program.id, content: "# S1 — Fondamentaux..."
   │      ├── "Generer les UE" →
   │      ├── [SYLLABUS] LEAF, parentId: semester.id, content: "# UX Research..."
   │      └── [SYLLABUS] LEAF, parentId: semester.id, content: "# Design Studio..."
   └── [SEMESTER] LEAF, parentId: program.id, content: "# S2 — Approfondissement..."
```

Each widget is **autonomous**: it has its own content and can be generated/viewed independently. The `parentId` link is optional and serves to:
- Display the tree structure in the UI
- Provide parent context during cascading generation
- Navigate between levels (breadcrumb)

**Markdown `content` as a generation source**:

> **Design consideration (not implemented)**: widgets whose `data.content` (Markdown) exists could serve as a contextual source for generating sub-widgets. A SEMESTER's `content` could be parsed (headings = potential course units) or used as RAG context to generate child SYLLABUS widgets. Similarly, a REPORT could feed the generation of QUIZ, FLASHCARD, or GLOSSARY. The Markdown `content` would be the **universal bridge** between widgets — any "rich" widget can become a source for others.
>
> This abstraction is not needed in Phase 1 but paves the way for a system where any widget is potentially a generator, not just pedagogical types.

### 2.4 Type registry

Each widget type is registered in a central registry:

```typescript
interface WidgetTypeDefinition {
  type: string;                    // 'QUIZ', 'SLIDE', 'AUDIO', etc.
  label: string;                   // 'Quiz interactif'
  icon: ComponentType;             // lucide-react icon
  category: 'static' | 'interactive';
  schema: ZodSchema;               // validation du champ data
  defaultData: () => unknown;      // config par défaut pour création
  renderers: {
    display: ComponentType;        // rendu lecture seule (Studio preview)
    editor: ComponentType;         // édition dans Studio
    presenter?: ComponentType;     // vue présentateur (Engage session live)
    participant?: ComponentType;   // vue participant (Engage session live)
    liveResults?: ComponentType;   // résultats agrégés temps réel
  };
  capabilities: string[];          // ['scoring', 'timer', 'realtime', 'generative']
}
```

The registry allows adding new widget types without modifying the core. A new type = a schema + renderers + a registration entry.

---

## 3. Lifecycle

### 3.1 Lifecycle in Studio (creation)

```
Document(s) upload
  → RAG (parse + chunk + embed + hybrid search)
  → LLM generation (template + prompt + context)
  → Zod validation
  → Widget(DRAFT)
  → User review / edit
  → Widget(READY)
  → Compose (optional: group into sequence)
  → Deploy to Engage
```

**States**: `DRAFT` → `GENERATING` → `READY` | `ERROR`

**Real-time communication**: Redis pub/sub → SSE endpoint → `useStudioEvents()` hook that invalidates TanStack Query queries. No polling.

**Events**:
- `source:status` — indexing status change (PENDING → INDEXING → INDEXED → ERROR)
- `generation:progress` — generation workflow progress (step + percentage)
- `generation:complete` — generation complete (success or failure)

### 3.2 Lifecycle in Engage (interactive execution)

For **interactive** widgets played in live sessions:

```
IDLE → PREVIEW → ACTIVE → ENDED
  │                 │
  │                 ├── Participants submit responses
  │                 ├── Real-time aggregation (throttled 500ms via Ably)
  │                 ├── Timer countdown (synced via Ably)
  │                 └── AI actions (résumé, suggestions)
  │
  └── Presenter controls all transitions
```

**Three primary states** (ActivityState):
- **PENDING**: the activity exists but has not started. The presenter can preview it.
- **ACTIVE**: the activity is live. Participants can submit responses. The presenter sees results in real time.
- **ENDED**: the activity is closed. Final results are computed and cached.

**Ably channels** (real-time):
- `session:{id}` — public events: `activity:started`, `activity:ended`, `timer_sync`, `quiz:question_started`, `quiz:results_revealed`
- `session:{id}:presenter` — presenter events: `response_received` (counter), `results_updated` (aggregation)

**Submission flow** (participant → server):
1. `POST /api/sessions/{id}/activities/{activityId}/{type}/submit`
2. Zod payload validation → duplicate check → atomic upsert (Prisma tx)
3. Immediate 201 response
4. Asynchronous fire-and-forget:
   - Response counter increment (Redis)
   - `response_received` publication (Ably, presenter)
   - Throttled aggregation (500ms) → Redis cache → `results_updated` publication

**Quiz: per-question lifecycle**:
```
Question PENDING → ACTIVE (presenter starts) → ENDED (presenter ends)
  → REVEAL (results shown to participants) → Next question
```
Each question has its own state, timer, and results. The quiz is a nested state machine.

### 3.3 GENERATIVE block lifecycle

When a generative block is reached in the sequence:

```
Block reached in the sequence
  → Collect inputBindings (results from previous blocks)
  → Display loading ("Generation in progress...")
  → LLM call (Qiplim platform key) with promptTemplate + inputs
  → outputSchema validation
  → Render generated content
  → Continue the sequence
```

**LLM config**: Qiplim platform key. Users do not manage keys on the Engage side. A per-session quota system limits abuse (e.g., max 20 LLM calls per session).

**Fallback**: if the LLM fails (timeout, quota, error), display the `fallback` content. If no fallback, graceful error message with a "Retry" option.

### 3.4 Composition lifecycle

For **composed** widgets in live sessions:

```
Composition loaded
  → Current step = first child
  → Render current step (LEAF lifecycle s'applique)
  → Step ends → evaluate transitions
    → sequential: next in order
    → conditional: match condition → target step
  → If step is GENERATIVE: generate content first, then render
  → Last step ends → composition ENDED
```

The **presenter** controls progression. They can:
- Advance to the next step
- Go back to the previous step (if sequential mode)
- Force a transition (bypass conditions)
- View overall progress (current / total steps)

---

## 4. Detailed Examples

### 4.1 Audio Podcast (static simple)

```json
{
  "type": "AUDIO",
  "kind": "LEAF",
  "data": {
    "title": "Résumé du chapitre 3",
    "script": "Bienvenue dans ce résumé audio. Aujourd'hui nous allons parler de...",
    "voice": "fr-female-1",
    "audioUrl": "https://storage.qiplim.com/audio/abc123.mp3",
    "duration": 180,
    "transcript": [
      { "start": 0, "end": 5, "text": "Bienvenue dans ce résumé audio." },
      { "start": 5, "end": 12, "text": "Aujourd'hui nous allons parler de..." }
    ]
  }
}
```

**Generation in Studio**:
1. Document → RAG retrieval of key points
2. LLM writes the audio script (conversational tone, ~3 min)
3. TTS (Voxtral, ElevenLabs, or Google TTS) → audio file
4. Upload to S3 → audio URL in the widget

**Rendering**: Audio player with synchronized transcript (highlighting text as it plays)

**Engage export**: Playable in session as a slide with audio auto-play. No participant interaction.

### 4.2 Interactive quiz (interactive)

```json
{
  "type": "QUIZ",
  "kind": "LEAF",
  "data": {
    "questions": [
      {
        "id": "q1",
        "question": "Quelle est la capitale de la France ?",
        "type": "single",
        "options": [
          { "id": "o1", "label": "Paris", "isCorrect": true },
          { "id": "o2", "label": "Lyon", "isCorrect": false },
          { "id": "o3", "label": "Marseille", "isCorrect": false }
        ],
        "points": 1,
        "difficulty": "easy",
        "explanation": "Paris est la capitale de la France depuis le Xe siècle."
      },
      {
        "id": "q2",
        "question": "Quel est le plus long fleuve de France ?",
        "type": "single",
        "options": [
          { "id": "o4", "label": "La Seine", "isCorrect": false },
          { "id": "o5", "label": "La Loire", "isCorrect": true },
          { "id": "o6", "label": "Le Rhône", "isCorrect": false }
        ],
        "points": 1,
        "difficulty": "medium"
      }
    ],
    "showCorrectAnswer": true,
    "showImmediateFeedback": true,
    "showLeaderboard": true
  }
}
```

**Generation**: Document → RAG retrieval → LLM generates N questions with options and explanations → Zod validation (min 2 options, exactly 1 isCorrect for single type)

**Engage lifecycle**:
- Per-question: PENDING → ACTIVE (question displayed) → ENDED (timer or presenter) → REVEAL (results visible)
- Scoring: points per question, optional response time
- Real-time leaderboard via Ably

### 4.3 Structured course plan (static composed)

```json
{
  "type": "COURSE_PLAN",
  "kind": "COMPOSED",
  "data": {
    "title": "Introduction au Machine Learning",
    "duration": "8h",
    "level": "intermediate",
    "objectives": [
      "Comprendre les algorithmes supervisés et non-supervisés",
      "Implémenter une régression linéaire",
      "Évaluer un modèle de classification"
    ],
    "prerequisites": "Bases en Python et statistiques"
  },
  "children": [
    {
      "type": "MODULE",
      "data": {
        "title": "Module 1 — Régression linéaire",
        "duration": "2h",
        "content": "## Objectifs\n- Comprendre le concept de régression\n- Implémenter un modèle simple\n\n## Contenu\n...",
        "activities": ["Exercice pratique sur un dataset immobilier"]
      }
    },
    {
      "type": "MODULE",
      "data": {
        "title": "Module 2 — Classification",
        "duration": "3h",
        "content": "## Objectifs\n- Différencier classification binaire et multi-classes\n..."
      }
    },
    {
      "type": "MODULE",
      "data": {
        "title": "Module 3 — Évaluation de modèles",
        "duration": "3h",
        "content": "## Objectifs\n- Calculer précision, recall, F1-score\n..."
      }
    }
  ],
  "orchestration": { "mode": "sequential" }
}
```

**Generation**: Document(s) → LLM structures the content into coherent modules → each module is a child
**Export**: Structured Markdown, PDF, or static web page

### 4.4 Interactive presentation (interactive composed)

```json
{
  "type": "PRESENTATION",
  "kind": "COMPOSED",
  "data": {
    "title": "Les enjeux du changement climatique",
    "theme": "professional-blue"
  },
  "children": [
    {
      "type": "SLIDE",
      "data": { "title": "Introduction", "content": "Le changement climatique est le défi majeur du XXIe siècle..." }
    },
    {
      "type": "SLIDE",
      "data": { "title": "Les causes principales", "content": "## Émissions de CO2\n- Transport (29%)\n- Industrie (21%)\n- Agriculture (10%)" }
    },
    {
      "type": "MULTIPLE_CHOICE",
      "data": {
        "question": "Selon vous, quel secteur devrait être la priorité ?",
        "options": [
          { "id": "a", "label": "Transport" },
          { "id": "b", "label": "Industrie" },
          { "id": "c", "label": "Agriculture" },
          { "id": "d", "label": "Énergie" }
        ],
        "allowMultiple": false
      }
    },
    {
      "type": "SLIDE",
      "data": { "title": "Les solutions", "content": "## Actions concrètes\n..." }
    },
    {
      "type": "QUIZ",
      "data": {
        "questions": [
          { "id": "q1", "question": "Quel pourcentage des émissions est dû au transport ?", "type": "single", "options": [...], "points": 1 }
        ]
      }
    },
    {
      "type": "SLIDE",
      "data": { "title": "Conclusion", "content": "..." }
    }
  ],
  "orchestration": { "mode": "sequential" }
}
```

**Engage lifecycle**: The presenter navigates sequentially. Slides are displayed passively. When an interactive widget (MCQ, quiz) is reached, it switches to ACTIVE mode — participants interact. The presenter sees real-time results, then advances to the next slide.

### 4.5 Interactive adventure "Choose your own adventure" (interactive composed + generative)

```json
{
  "type": "ADVENTURE",
  "kind": "COMPOSED",
  "data": {
    "title": "Exploration spatiale",
    "theme": "sci-fi",
    "context": "L'équipage du vaisseau Horizon explore une galaxie inconnue. Leur mission : trouver une planète habitable pour l'humanité."
  },
  "children": [
    {
      "type": "SLIDE",
      "id": "chapter-1",
      "data": {
        "title": "Chapitre 1 — Le décollage",
        "content": "Le vaisseau quitte l'orbite terrestre sous les applaudissements du centre de contrôle. Trois jours plus tard, les capteurs détectent une anomalie gravitationnelle à tribord. Le commandant hésite..."
      }
    },
    {
      "type": "MULTIPLE_CHOICE",
      "id": "vote-1",
      "data": {
        "question": "Que doit faire l'équipage ?",
        "options": [
          { "id": "a", "label": "Explorer l'anomalie" },
          { "id": "b", "label": "Continuer la route prévue" },
          { "id": "c", "label": "Envoyer un drone en éclaireur" }
        ]
      }
    },
    {
      "type": "GENERATIVE_TEXT",
      "id": "chapter-2",
      "generative": {
        "promptTemplate": "Tu es un narrateur de science-fiction captivant. Contexte de l'histoire: {{context}}. Le chapitre précédent: {{previousChapter}}. Le vote collectif des participants: '{{voteResult}}' a remporté {{votePercentage}}% des votes. Écris le chapitre suivant (~200 mots) en tenant compte du choix collectif. Termine par une nouvelle situation qui nécessite un choix.",
        "inputBindings": {
          "context": "parent.data.context",
          "previousChapter": "chapter-1.data.content",
          "voteResult": "vote-1.result.winningOption.label",
          "votePercentage": "vote-1.result.winningOption.percentage"
        },
        "outputSchema": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "content": { "type": "string" }
          },
          "required": ["title", "content"]
        },
        "fallback": { "title": "Chapitre 2", "content": "L'aventure continue dans l'espace infini..." }
      }
    },
    {
      "type": "MULTIPLE_CHOICE",
      "id": "vote-2",
      "generative": {
        "promptTemplate": "Basé sur ce chapitre d'une aventure spatiale: {{chapter}}. Propose exactement 3 choix distincts et intéressants pour la suite. Chaque choix doit mener à une direction narrative différente.",
        "inputBindings": { "chapter": "chapter-2.generatedContent" },
        "outputSchema": {
          "type": "object",
          "properties": {
            "question": { "type": "string" },
            "options": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "label": { "type": "string" } } } }
          }
        }
      }
    },
    {
      "type": "GENERATIVE_TEXT",
      "id": "chapter-3",
      "generative": {
        "promptTemplate": "Continue l'histoire. Contexte: {{context}}. Chapitres précédents: {{allChapters}}. Dernier vote: '{{voteResult}}'. Écris le chapitre final (~200 mots) avec une conclusion satisfaisante.",
        "inputBindings": {
          "context": "parent.data.context",
          "allChapters": "chapter-1.data.content + ' [...] ' + chapter-2.generatedContent",
          "voteResult": "vote-2.result.winningOption.label"
        },
        "outputSchema": { "type": "object", "properties": { "title": { "type": "string" }, "content": { "type": "string" } } },
        "fallback": { "title": "Épilogue", "content": "Le vaisseau Horizon retrouve enfin sa route vers les étoiles..." }
      }
    }
  ],
  "orchestration": { "mode": "sequential" }
}
```

**Live session flow**:
1. The presenter launches chapter 1 → displayed to all participants
2. The vote opens → participants vote in real time → results aggregated via Ably
3. The presenter advances → the `GENERATIVE_TEXT` block is detected
4. **Loading**: "Generating the next chapter..." (spinner visible to all)
5. The Engage server calls the LLM with the vote result injected into the prompt
6. Chapter 2 is displayed → participants discover the continuation together
7. Vote 2 is also generative: its options are created by the LLM from the chapter
8. Same flow for chapter 3 (epilogue)

**What is fundamental**: the LLM is called **during** the session, not before. The experience is co-created by the participants (via their votes) and the AI (via the narration).

### 4.6 Crisis simulation (interactive composed + conditional)

```json
{
  "type": "SIMULATION",
  "kind": "COMPOSED",
  "data": {
    "title": "Gestion de crise — Fuite de données client",
    "scenario": "Votre entreprise vient de découvrir qu'un serveur non protégé exposait les données personnelles de 50 000 clients depuis 3 semaines."
  },
  "children": [
    {
      "type": "SLIDE",
      "id": "briefing",
      "data": { "title": "Briefing", "content": "Il est 8h30 lundi matin. Votre téléphone sonne : le RSSI vous informe d'une fuite massive de données..." }
    },
    {
      "type": "MULTIPLE_CHOICE",
      "id": "decision-1",
      "data": {
        "question": "Quelle est votre première action ?",
        "options": [
          { "id": "isolate", "label": "Isoler immédiatement le serveur compromis" },
          { "id": "legal", "label": "Appeler le service juridique" },
          { "id": "comm", "label": "Préparer un communiqué de presse" },
          { "id": "ignore", "label": "Attendre plus d'informations" }
        ]
      }
    },
    {
      "type": "SLIDE",
      "id": "good-path",
      "data": { "title": "Bonne décision", "content": "En isolant le serveur, vous stoppez la fuite. Le RSSI confirme que les données ne sont plus exposées. Vous avez gagné du temps pour la suite..." }
    },
    {
      "type": "SLIDE",
      "id": "bad-path",
      "data": { "title": "Conséquences", "content": "Pendant que vous attendiez, un journaliste a découvert la fuite et publie un article. La crise s'aggrave..." }
    },
    {
      "type": "QUIZ",
      "id": "debrief",
      "data": {
        "questions": [
          {
            "id": "q1",
            "question": "Selon le RGPD, sous combien d'heures devez-vous notifier la CNIL ?",
            "type": "single",
            "options": [
              { "id": "a", "label": "24 heures", "isCorrect": false },
              { "id": "b", "label": "72 heures", "isCorrect": true },
              { "id": "c", "label": "7 jours", "isCorrect": false }
            ],
            "explanation": "Le RGPD impose une notification à la CNIL dans les 72 heures suivant la découverte de la violation."
          }
        ]
      }
    }
  ],
  "orchestration": {
    "mode": "conditional",
    "transitions": [
      { "from": "decision-1", "to": "good-path", "condition": "winningOptionId == 'isolate'" },
      { "from": "decision-1", "to": "bad-path", "condition": "winningOptionId != 'isolate'" },
      { "from": "good-path", "to": "debrief" },
      { "from": "bad-path", "to": "debrief" }
    ]
  }
}
```

**Flow**: After the collective vote, the engine evaluates which transition to take. If the majority voted "Isolate the server" (`winningOptionId == 'isolate'`), it goes to `good-path`. Otherwise, `bad-path`. In both cases, it ends with the debrief quiz.

### 4.7 Quick ice-breaker (composed template)

```json
{
  "type": "ICEBREAKER",
  "kind": "COMPOSED",
  "data": {
    "title": "Ice-breaker — Faire connaissance",
    "estimatedDuration": "5min"
  },
  "children": [
    {
      "type": "WORDCLOUD",
      "data": { "prompt": "Décrivez votre humeur du jour en un mot" }
    },
    {
      "type": "POSTIT",
      "data": {
        "prompt": "Quelle est votre attente principale pour cette session ?",
        "categories": ["Formation technique", "Networking", "Inspiration", "Autre"],
        "allowVoting": true
      }
    },
    {
      "type": "RANKING",
      "data": {
        "prompt": "Classez ces sujets par ordre de priorité pour vous",
        "items": [
          { "id": "r1", "label": "IA & Machine Learning" },
          { "id": "r2", "label": "Leadership" },
          { "id": "r3", "label": "Gestion de projet" },
          { "id": "r4", "label": "Communication" }
        ]
      }
    }
  ],
  "orchestration": { "mode": "sequential" }
}
```

**Usage**: Ready-to-use template, customizable. The user in Studio says "Create an ice-breaker for a management training" → the LLM adapts the prompts and items to the context.

### 4.8 Complete training with score-gating (interactive composed + conditional + generative)

```json
{
  "type": "TRAINING",
  "kind": "COMPOSED",
  "data": {
    "title": "Certification RGPD — Module 1",
    "passingScore": 70
  },
  "children": [
    {
      "type": "SLIDE",
      "id": "intro",
      "data": { "title": "Bienvenue", "content": "Ce module couvre les principes fondamentaux du RGPD..." }
    },
    {
      "type": "SLIDE",
      "id": "lesson-1",
      "data": { "title": "Les 6 principes du RGPD", "content": "1. Licéité, loyauté, transparence\n2. Limitation des finalités\n..." }
    },
    {
      "type": "QUIZ",
      "id": "eval-1",
      "data": {
        "questions": [
          { "id": "q1", "question": "Combien de principes fondamentaux compte le RGPD ?", "options": [...], "points": 10 },
          { "id": "q2", "question": "Qu'est-ce que le droit à l'oubli ?", "options": [...], "points": 10 }
        ],
        "showCorrectAnswer": true,
        "showImmediateFeedback": true
      }
    },
    {
      "type": "SLIDE",
      "id": "success",
      "data": { "title": "Bravo !", "content": "Vous avez réussi avec un score de {{score}}%. Passez au module suivant." }
    },
    {
      "type": "GENERATIVE_TEXT",
      "id": "remediation",
      "generative": {
        "promptTemplate": "L'apprenant a obtenu {{score}}% au quiz RGPD. Questions ratées: {{wrongQuestions}}. Explique de manière simple et encourageante les concepts mal compris. Propose de réessayer.",
        "inputBindings": {
          "score": "eval-1.result.averageScore",
          "wrongQuestions": "eval-1.result.wrongQuestionIds"
        },
        "outputSchema": { "type": "object", "properties": { "title": { "type": "string" }, "content": { "type": "string" } } },
        "fallback": { "title": "Continuez à apprendre", "content": "Revoyez les points clés et réessayez le quiz." }
      }
    }
  ],
  "orchestration": {
    "mode": "conditional",
    "transitions": [
      { "from": "eval-1", "to": "success", "condition": "averageScore >= 70" },
      { "from": "eval-1", "to": "remediation", "condition": "averageScore < 70" },
      { "from": "remediation", "to": "eval-1" }
    ]
  }
}
```

**Flow**: After the quiz, if the group's average score is >= 70%, "Bravo" is displayed. Otherwise, the GENERATIVE block creates personalized feedback based on the errors, then redirects to the quiz for a second attempt.

---

## 5. AI Generation

### 5.1 Generation pipeline (Studio)

```
Document(s) upload → Parse (Unstructured.io) → Chunk → Embed (Mistral)
  → Hybrid search (dense + BM25 + RRF fusion)
  → Context enrichi

Chat mode "Créer" → LLM analyse la demande
  → Tool selection (generateQuiz, generateComposed, generateAudio, ...)
  → Prompt building (system + user + RAG context)
  → LLM call (multi-provider BYOK: Mistral → OpenAI → Anthropic → Google)
  → Zod validation du output
  → Widget(DRAFT) → Preview → User confirm → Widget(READY)
```

### 5.2 How the LLM selects and builds

The chat in "Create" mode has access to **tools** that correspond to widget types:

| User request | Tool selected | Output |
|-------------|--------------|--------|
| "Make a quiz" | `generateQuiz` | QUIZ (LEAF) |
| "Create a word cloud" | `generateWordcloud` | WORDCLOUD (LEAF) |
| "Make an interactive presentation" | `generateComposed` | PRESENTATION (COMPOSED) with SLIDE + QUIZ children |
| "Create an interactive adventure" | `generateComposed` | ADVENTURE (COMPOSED) with SLIDE + VOTE + GENERATIVE children |
| "Summarize as a podcast" | `generateAudio` | AUDIO (LEAF) — script + TTS |
| "Create an ice-breaker" | `generateComposed` (template) | ICEBREAKER (COMPOSED) with WORDCLOUD + POSTIT + RANKING |

### 5.3 Composition generation

For a composed widget, the LLM generates the **complete skeleton**:

1. Determines the structure (number of children, types, orchestration mode)
2. Generates the content for static blocks (slides, narrative text)
3. Configures interactive blocks (questions, options, scoring)
4. Configures generative blocks (prompt templates with {{variables}}, input bindings)
5. Defines transitions (sequential or conditional)

The user can then edit each block in a visual **timeline editor**.

---

## 6. Export and Interoperability

### 6.1 Export format: PlaybackPlan

The exchange format between Studio and Engage. Replaces the current flatten which loses hierarchy.

```typescript
interface PlaybackPlan {
  version: '1.0';
  title: string;
  mode: 'live-session' | 'self-paced';
  steps: PlaybackStep[];
  transitions: PlaybackTransition[];
  llmConfig?: {
    maxCallsPerSession: number;  // quota, ex: 20
  };
}

interface PlaybackStep {
  id: string;
  type: string;                    // 'QUIZ' | 'SLIDE' | 'GENERATIVE_TEXT' | ...
  data: unknown;                    // activity config JSON
  groupId?: string;                 // module/chapter boundary
  groupLabel?: string;              // "Module 1 — Régression linéaire"
  generative?: GenerativeConfig;    // si bloc génératif
}

interface PlaybackTransition {
  from: string;
  to: string;
  trigger: 'auto' | 'manual' | 'condition';
  condition?: string;                // expression simple
}
```

### 6.2 Condition expressions

Conditions in transitions use **simple expressions** — no JSONPath or JavaScript.

```
Operators: ==, !=, >=, <=, >, <, in
Accessible values: flat properties from the previous step's result
Types: string, number, boolean

Examples:
  "score >= 70"
  "winningOptionId == 'explore'"
  "responseCount > 10"
  "averageScore < 50"
  "percentage >= 60"
```

Evaluated by a minimalist parser (~30 lines). Easy for LLMs to generate, easy for users to understand, easy to audit.

### 6.3 Interoperability standards

| Standard | Usage | Priority |
|----------|-------|----------|
| **JSON Schema** | Widget spec definitions (already in place via Zod) | P1 — current |
| **xAPI** | Standardized learning interaction tracking (who, what, score) | P2 — analytics |
| **LTI 1.3** | Integration into LMS platforms (Moodle, Canvas, D2L) | P3 — enterprise |
| **Web Components** | Standalone widget distribution (embeddable) | P3 — open source |

### 6.4 Universal JSON format

Each widget is exportable as standalone JSON, portable between instances:

```json
{
  "$schema": "https://qiplim.com/schemas/widget/v1.json",
  "version": "1.0",
  "type": "QUIZ",
  "kind": "LEAF",
  "data": { "questions": [...] },
  "metadata": {
    "createdAt": "2026-04-12T10:00:00Z",
    "generatedFrom": {
      "sources": ["Introduction_ML.pdf", "Chapitre_3.md"],
      "templateId": "quiz-interactive",
      "provider": "mistral"
    }
  }
}
```

---

## 7. Runtime Architecture (Engage)

### 7.1 Composition Engine

The composition execution engine — to be implemented in Engage:

```typescript
interface CompositionEngine {
  // Navigation
  getCurrentStep(): PlaybackStep;
  getStepIndex(): number;
  getTotalSteps(): number;
  canProceed(): boolean;          // évalue la condition de transition sortante
  canGoBack(): boolean;
  proceed(): PlaybackStep;        // avance au step suivant (évalue transitions)
  goBack(): PlaybackStep;
  goTo(stepId: string): void;     // force navigation (presenter override)

  // Génératif
  isGenerativeStep(step: PlaybackStep): boolean;
  generateContent(step: PlaybackStep): Promise<unknown>;

  // État
  getStepResults(stepId: string): StepResult | null;
  getSessionProgress(): { current: number; total: number; completed: string[] };
  getGroupProgress(groupId: string): { current: number; total: number };
}
```

### 7.2 LLM Runtime

To execute GENERATIVE blocks during a live session:

```typescript
async function executeGenerativeBlock(
  step: PlaybackStep,
  sessionContext: {
    previousResults: Record<string, StepResult>;
    sessionId: string;
    callCount: number;
    maxCalls: number;
  },
): Promise<{ content: unknown; cached: boolean }> {
  // 1. Vérifier le quota
  if (sessionContext.callCount >= sessionContext.maxCalls) {
    return { content: step.generative.fallback, cached: false };
  }

  // 2. Résoudre les inputBindings
  const inputs = resolveBindings(step.generative.inputBindings, sessionContext.previousResults);

  // 3. Construire le prompt
  const prompt = interpolateTemplate(step.generative.promptTemplate, inputs);

  // 4. Appeler le LLM (clé plateforme Qiplim)
  const result = await generateText({
    model: getPlatformModel(),
    system: 'Tu es un assistant créatif pour des expériences interactives en direct.',
    messages: [{ role: 'user', content: prompt }],
    maxOutputTokens: 1000,
  });

  // 5. Valider avec outputSchema
  const validated = validateJsonSchema(result.text, step.generative.outputSchema);

  // 6. Cacher le résultat (éviter re-génération si presenter revient en arrière)
  await cacheGeneratedContent(step.id, sessionContext.sessionId, validated);

  return { content: validated, cached: false };
}
```

**LLM key**: Qiplim platform key (no BYOK on the Engage side). Per-session quota (e.g., max 20 calls).

**Cache**: generated content is cached by (stepId, sessionId). If the presenter goes back then advances again, the already generated content is reused.

---

## 8. Incremental Implementation Plan

### Phase A — Composition Runtime (2 weeks)
- Implement `CompositionEngine` in Engage
- Functional SEQUENCE mode: navigation between steps, progression
- PlaybackPlan format for Studio → Engage deployment
- Modify deployment to send a PlaybackPlan instead of flatten
- Backward compatible: projects without a plan continue to work

### Phase B — Conditional Orchestration (1 week)
- Simple expression parser (==, !=, >=, <=, >, <)
- Condition evaluation on previous step results
- Conditional branching in the Composition Engine
- Presenter UI: display of possible branches, manual override

### Phase C — GENERATIVE_TEXT Block (2 weeks)
- New widget type: GENERATIVE_TEXT with promptTemplate + inputBindings
- Binding resolution (access to previous step results)
- LLM runtime in Engage (call during session, platform key)
- Loading UI during generation ("The next chapter is coming...")
- Cache for generated results (avoid re-generation)
- Fallback if LLM fails or quota exceeded
- Configurable quota per PlaybackPlan

### Phase D — New Static Types (1 week)
- AUDIO: TTS pipeline (script → Voxtral/ElevenLabs → S3 → player with transcript)
- Improve SLIDE: rich blocks (heading, text, bullets, image, quote, code, statistic)

### Phase E — Composition Templates (1 week)
- "Interactive adventure" — template with chapters + votes + generative blocks
- "Complete training" — intro + modules + quiz + recap + score-gating
- "Ice-breaker" — wordcloud + postit + ranking
- "Crisis simulation" — briefing + decisions + conditional consequences + debrief
- Available as suggestions in the "Create" chat mode

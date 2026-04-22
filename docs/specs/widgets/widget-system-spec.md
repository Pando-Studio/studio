# Qiplim Studio — Universal Widget System Specification

## Context

Studio est un créateur universel d'expériences interactives à partir de documents. L'objectif est de définir un système de widgets composables — statiques, interactifs, et génératifs — qui peuvent être créés via IA dans Studio et joués en session live dans Engage. Ce document spécifie l'architecture, le lifecycle, la composition, et les patterns de génération pour que le concept soit robuste, interopérable et open-source.

**Ce document remplace** les specs WPS++ précédentes qui étaient trop over-engineered (A2UI, capabilities runtime, 11 lifecycle hooks non implémentés). On part de **ce qui fonctionne** (Engage en prod) et on étend progressivement.

---

## 1. Taxonomie des Widgets

### 1.1 Quatre catégories

| Catégorie | Description | Exemples | État runtime |
|-----------|-------------|----------|-------------|
| **Static simple** | Contenu généré, lecture seule | Audio podcast, image, vidéo, texte/MD | Aucun |
| **Static composé** | Ensemble structuré de contenu statique | Plan de cours, slide deck, article structuré | Navigation (page courante) |
| **Interactif** | Widget avec input participant + scoring | Quiz, QCM, wordcloud, post-it, ranking, roleplay, opentext | State machine (idle→active→ended) + responses |
| **Interactif composé** | Séquence orchestrée de widgets | Présentation (slides + quiz), formation complète, aventure interactive | Orchestration (séquentiel, conditionnel) |

### 1.2 Le bloc GENERATIVE

Un type transversal : un bloc dont le **contenu est généré at runtime** par un LLM, en fonction du contexte de la session (votes, réponses, progression). N'importe quel type de widget peut avoir une couche générative.

```typescript
interface GenerativeConfig {
  promptTemplate: string;                     // template avec {{variables}}
  inputBindings: Record<string, string>;      // variable → source (résultat d'un autre bloc)
  outputSchema: Record<string, unknown>;      // JSON Schema du contenu attendu
  fallback?: unknown;                         // contenu par défaut si LLM fail
}
```

**Exemples d'usage** :
- Chapitre suivant d'une aventure (input: résultat du vote collectif)
- Feedback personnalisé post-quiz (input: score + erreurs fréquentes)
- Question de relance adaptée au niveau (input: % de bonnes réponses du groupe)
- Options de vote dynamiques (input: contexte narratif généré)

---

## 2. Architecture Widget

### 2.1 Widget = JSON Spec + Schema + Renderer

Chaque widget est défini par trois éléments :
1. **Spec JSON** (`data`) — structure + contenu, stocké en DB
2. **Schema Zod** — validation de la spec à l'écriture et à la lecture
3. **Renderer(s)** — composants React pour l'affichage selon le contexte

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

### 2.2 Modèle de composition simplifié

Un composé = une **liste ordonnée d'enfants** + des **règles de navigation**.

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

**Mode séquentiel** : les enfants sont joués dans l'ordre. `transitions` est optionnel (auto-advance).

**Mode conditionnel** : les `transitions` définissent quel enfant vient après quel autre, selon une condition évaluée sur le résultat du step précédent.

### 2.3 LEAF avec parentId — generation en cascade

Un widget LEAF peut avoir des **enfants** via `parentId`, sans devenir COMPOSED. C'est le modele retenu pour les widgets pedagogiques et les widgets "riches" (rapport, resume, etc.).

**Semantique du `kind`** :

| Kind | Contenu propre (`data`) | Enfants (`children`) | Usage |
|------|------------------------|---------------------|-------|
| `LEAF` | Oui (contenu genere, Markdown, items, etc.) | Optionnel — via `parentId` | Quiz, FAQ, Rapport, Syllabus, Semester, etc. |
| `COMPOSED` | Non (juste orchestration) | Oui — navigation entre enfants | Sequence, Module de cours |

Un `LEAF` avec enfants a **deux vues** dans l'UI :
1. **Vue contenu** (defaut) — affiche son propre contenu (Markdown, items, questions)
2. **Vue enfants** (onglet ou section) — liste les widgets generes a partir de ce contenu

**Exemple : generation pedagogique en cascade**

```
[PROGRAM_OVERVIEW] LEAF, content: "# Master UX Design..."
   ├── "Generer les semestres" →
   ├── [SEMESTER] LEAF, parentId: program.id, content: "# S1 — Fondamentaux..."
   │      ├── "Generer les UE" →
   │      ├── [SYLLABUS] LEAF, parentId: semester.id, content: "# UX Research..."
   │      └── [SYLLABUS] LEAF, parentId: semester.id, content: "# Design Studio..."
   └── [SEMESTER] LEAF, parentId: program.id, content: "# S2 — Approfondissement..."
```

Chaque widget est **autonome** : il a son propre contenu et peut etre genere/consulte independamment. Le lien `parentId` est optionnel et sert a :
- Afficher l'arborescence dans l'UI
- Fournir le contexte parent lors de la generation en cascade
- Naviguer entre niveaux (breadcrumb)

**Le `content` Markdown comme source de generation** :

> **Piste de reflexion (non implementee)** : les widgets dont `data.content` (Markdown) existe pourraient servir de source contextuelle pour generer des sous-widgets. Le `content` d'un SEMESTER pourrait etre parse (headings = UE potentielles) ou utilise comme contexte RAG pour generer des SYLLABUS enfants. De meme, un REPORT pourrait alimenter la generation de QUIZ, FLASHCARD, ou GLOSSARY. Le `content` Markdown serait le **pont universel** entre widgets — tout widget "riche" peut devenir source pour d'autres.
>
> Cette abstraction n'est pas necessaire en Phase 1 mais ouvre la voie a un systeme ou tout widget est potentiellement generateur, pas seulement les types pedagogiques.

### 2.4 Registry de types

Chaque type de widget est enregistré dans un registry central :

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

Le registry permet d'ajouter de nouveaux types de widgets sans modifier le core. Un nouveau type = un schema + des renderers + un enregistrement.

---

## 3. Lifecycle

### 3.1 Lifecycle dans Studio (création)

```
Document(s) upload
  → RAG (parse + chunk + embed + hybrid search)
  → LLM generation (template + prompt + context)
  → Zod validation
  → Widget(DRAFT)
  → User review / edit
  → Widget(READY)
  → Compose (optionnel: grouper en séquence)
  → Deploy to Engage
```

**États** : `DRAFT` → `GENERATING` → `READY` | `ERROR`

**Communication temps réel** : Redis pub/sub → SSE endpoint → `useStudioEvents()` hook qui invalide les queries TanStack Query. Pas de polling.

**Events** :
- `source:status` — changement de status d'indexation (PENDING → INDEXING → INDEXED → ERROR)
- `generation:progress` — progression du workflow de génération (step + pourcentage)
- `generation:complete` — fin de génération (succès ou échec)

### 3.2 Lifecycle dans Engage (exécution interactive)

Pour les widgets **interactifs** joués en session live :

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

**Trois états primaires** (ActivityState) :
- **PENDING** : l'activité existe mais n'a pas démarré. Le présentateur peut la preview.
- **ACTIVE** : l'activité est live. Les participants peuvent soumettre des réponses. Le présentateur voit les résultats en temps réel.
- **ENDED** : l'activité est fermée. Les résultats finaux sont calculés et mis en cache.

**Channels Ably** (temps réel) :
- `session:{id}` — events publics : `activity:started`, `activity:ended`, `timer_sync`, `quiz:question_started`, `quiz:results_revealed`
- `session:{id}:presenter` — events présentateur : `response_received` (compteur), `results_updated` (agrégation)

**Submission flow** (participant → serveur) :
1. `POST /api/sessions/{id}/activities/{activityId}/{type}/submit`
2. Validation Zod du payload → vérification de doublon → upsert atomique (Prisma tx)
3. Retour 201 immédiat
4. Fire-and-forget asynchrone :
   - Incrément du compteur de réponses (Redis)
   - Publication `response_received` (Ably, présentateur)
   - Agrégation throttlée (500ms) → cache Redis → publication `results_updated`

**Quiz : lifecycle per-question** :
```
Question PENDING → ACTIVE (presenter starts) → ENDED (presenter ends)
  → REVEAL (results shown to participants) → Next question
```
Chaque question a son propre état, timer, et résultats. Le quiz est un state machine imbriqué.

### 3.3 Lifecycle des blocs GENERATIVE

Quand un bloc génératif est atteint dans la séquence :

```
Bloc atteint dans la séquence
  → Collecte des inputBindings (résultats des blocs précédents)
  → Affichage loading ("Génération en cours...")
  → Appel LLM (clé plateforme Qiplim) avec promptTemplate + inputs
  → Validation outputSchema
  → Rendu du contenu généré
  → Continue la séquence
```

**Config LLM** : clé plateforme Qiplim. Les utilisateurs ne gèrent pas de clé côté Engage. Un système de quota par session limite les abus (ex: max 20 appels LLM par session).

**Fallback** : si le LLM échoue (timeout, quota, erreur), afficher le `fallback` content. Si pas de fallback, message d'erreur graceful avec option "Réessayer".

### 3.4 Lifecycle des compositions

Pour les widgets **composés** en session live :

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

Le **présentateur** contrôle la progression. Il peut :
- Avancer au step suivant
- Revenir au step précédent (si mode sequential)
- Forcer une transition (bypass les conditions)
- Voir la progression globale (current / total steps)

---

## 4. Exemples détaillés

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

**Génération dans Studio** :
1. Document → RAG retrieval des points clés
2. LLM écrit le script audio (ton conversationnel, ~3 min)
3. TTS (Voxtral, ElevenLabs, ou Google TTS) → fichier audio
4. Upload vers S3 → URL audio dans le widget

**Rendu** : Player audio avec transcript synchronisé (surlignage du texte en cours)

**Export Engage** : Jouable en session comme slide avec audio auto-play. Pas d'interaction participant.

### 4.2 Quiz interactif (interactif)

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

**Génération** : Document → RAG retrieval → LLM génère N questions avec options et explications → Validation Zod (min 2 options, exactement 1 isCorrect pour type single)

**Lifecycle Engage** :
- Per-question : PENDING → ACTIVE (question affichée) → ENDED (timer ou presenter) → REVEAL (résultats visibles)
- Scoring : points par question, temps de réponse optionnel
- Leaderboard temps réel via Ably

### 4.3 Plan de cours structuré (static composé)

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

**Génération** : Document(s) → LLM structure le contenu en modules cohérents → chaque module est un enfant
**Export** : Markdown structuré, PDF, ou page web statique

### 4.4 Présentation interactive (interactif composé)

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

**Lifecycle Engage** : Le présentateur navigue séquentiellement. Les slides sont affichées passivement. Quand un widget interactif (QCM, quiz) est atteint, il passe en mode ACTIVE — les participants interagissent. Le présentateur voit les résultats en temps réel, puis avance à la slide suivante.

### 4.5 Aventure interactive "Livre dont on est le héros" (interactif composé + génératif)

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

**Flow en session live** :
1. Le présentateur lance le chapitre 1 → affiché à tous les participants
2. Le vote s'ouvre → participants votent en temps réel → résultats agrégés via Ably
3. Le présentateur avance → le bloc `GENERATIVE_TEXT` est détecté
4. **Loading** : "Génération du chapitre suivant..." (spinner visible à tous)
5. Le serveur Engage appelle le LLM avec le résultat du vote injecté dans le prompt
6. Le chapitre 2 s'affiche → les participants découvrent la suite ensemble
7. Le vote 2 est aussi génératif : ses options sont créées par le LLM à partir du chapitre
8. Même flow pour le chapitre 3 (épilogue)

**Ce qui est fondamental** : le LLM est appelé **pendant** la session, pas avant. L'expérience est co-créée par les participants (via leurs votes) et l'IA (via la narration).

### 4.6 Simulation de crise (interactif composé + conditionnel)

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

**Flow** : Après le vote collectif, le moteur évalue quelle transition prendre. Si la majorité a voté "Isoler le serveur" (`winningOptionId == 'isolate'`), on va vers `good-path`. Sinon, `bad-path`. Dans les deux cas, on finit par le quiz de debrief.

### 4.7 Ice-breaker rapide (template composé)

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

**Usage** : Template prêt à l'emploi, personnalisable. L'utilisateur dans Studio dit "Crée un ice-breaker pour une formation en management" → le LLM adapte les prompts et les items au contexte.

### 4.8 Formation complète avec score-gating (interactif composé + conditionnel + génératif)

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

**Flow** : Après le quiz, si le score moyen du groupe est >= 70%, on affiche "Bravo". Sinon, le bloc GENERATIVE crée un feedback personnalisé basé sur les erreurs, puis redirige vers le quiz pour un second essai.

---

## 5. Génération par IA

### 5.1 Pipeline de génération (Studio)

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

### 5.2 Comment le LLM choisit et construit

Le chat en mode "Créer" a accès à des **tools** qui correspondent aux types de widgets :

| Demande utilisateur | Tool sélectionné | Output |
|---------------------|-----------------|--------|
| "Fais un quiz" | `generateQuiz` | QUIZ (LEAF) |
| "Crée un nuage de mots" | `generateWordcloud` | WORDCLOUD (LEAF) |
| "Fais une présentation interactive" | `generateComposed` | PRESENTATION (COMPOSED) avec SLIDE + QUIZ children |
| "Crée une aventure interactive" | `generateComposed` | ADVENTURE (COMPOSED) avec SLIDE + VOTE + GENERATIVE children |
| "Résume en podcast" | `generateAudio` | AUDIO (LEAF) — script + TTS |
| "Crée un ice-breaker" | `generateComposed` (template) | ICEBREAKER (COMPOSED) avec WORDCLOUD + POSTIT + RANKING |

### 5.3 Génération de compositions

Pour un composé, le LLM génère le **squelette complet** :

1. Détermine la structure (nombre d'enfants, types, orchestration mode)
2. Génère le contenu des blocs statiques (slides, texte narratif)
3. Configure les blocs interactifs (questions, options, scoring)
4. Configure les blocs génératifs (prompt templates avec {{variables}}, input bindings)
5. Définit les transitions (séquentielles ou conditionnelles)

L'utilisateur peut ensuite éditer chaque bloc dans un **timeline editor** visuel.

---

## 6. Export et Interopérabilité

### 6.1 Format d'export : PlaybackPlan

Le format d'échange entre Studio et Engage. Remplace le flatten actuel qui perd la hiérarchie.

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

### 6.2 Expressions de conditions

Les conditions dans les transitions utilisent des **expressions simples** — pas de JSONPath ni JavaScript.

```
Opérateurs : ==, !=, >=, <=, >, <, in
Valeurs accessibles : propriétés plates du résultat du step précédent
Types : string, number, boolean

Exemples :
  "score >= 70"
  "winningOptionId == 'explore'"
  "responseCount > 10"
  "averageScore < 50"
  "percentage >= 60"
```

Évaluées par un parser minimaliste (~30 lignes). Faciles à générer par LLM, faciles à comprendre par l'utilisateur, faciles à auditer.

### 6.3 Standards d'interopérabilité

| Standard | Usage | Priorité |
|----------|-------|----------|
| **JSON Schema** | Définition des specs widget (déjà en place via Zod) | P1 — actuel |
| **xAPI** | Tracking standardisé des interactions learning (qui, quoi, score) | P2 — analytics |
| **LTI 1.3** | Intégration dans les LMS (Moodle, Canvas, D2L) | P3 — enterprise |
| **Web Components** | Distribution standalone de widgets (embeddable) | P3 — open source |

### 6.4 Format JSON universel

Chaque widget est exportable en JSON standalone, portable entre instances :

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

## 7. Architecture Runtime (Engage)

### 7.1 Composition Engine

Le moteur d'exécution des compositions — à implémenter dans Engage :

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

Pour exécuter les blocs GENERATIVE pendant une session live :

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

**Clé LLM** : clé plateforme Qiplim (pas de BYOK côté Engage). Quota par session (ex: 20 appels max).

**Cache** : le contenu généré est mis en cache par (stepId, sessionId). Si le présentateur revient en arrière puis re-avance, le contenu déjà généré est réutilisé.

---

## 8. Plan d'implémentation incrémental

### Phase A — Composition Runtime (2 semaines)
- Implémenter `CompositionEngine` dans Engage
- Mode SEQUENCE fonctionnel : navigation entre steps, progression
- Format PlaybackPlan pour le deploy Studio → Engage
- Modifier le deploy pour envoyer un PlaybackPlan au lieu de flatten
- Backward compatible : projets sans plan continuent de fonctionner

### Phase B — Orchestration Conditionnelle (1 semaine)
- Parser d'expressions simples (==, !=, >=, <=, >, <)
- Évaluation des conditions sur les résultats du step précédent
- Branchement conditionnel dans le Composition Engine
- UI présentateur : affichage des branches possibles, override manuel

### Phase C — Bloc GENERATIVE_TEXT (2 semaines)
- Nouveau type de widget : GENERATIVE_TEXT avec promptTemplate + inputBindings
- Résolution des bindings (accès aux résultats des steps précédents)
- LLM runtime dans Engage (appel pendant la session, clé plateforme)
- UI loading pendant la génération ("Le chapitre suivant arrive...")
- Cache des résultats générés (éviter re-génération)
- Fallback si LLM échoue ou quota dépassé
- Quota configurable par PlaybackPlan

### Phase D — Nouveaux types statiques (1 semaine)
- AUDIO : TTS pipeline (script → Voxtral/ElevenLabs → S3 → player avec transcript)
- Améliorer SLIDE : blocs riches (heading, text, bullets, image, quote, code, statistic)

### Phase E — Templates de composition (1 semaine)
- "Aventure interactive" — template avec chapitres + votes + blocs génératifs
- "Formation complète" — intro + modules + quiz + recap + score-gating
- "Ice-breaker" — wordcloud + postit + ranking
- "Simulation de crise" — briefing + décisions + conséquences conditionnelles + debrief
- Disponibles comme suggestions dans le chat mode "Créer"

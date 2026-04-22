# Qiplim Widget Ontology — Universal Primitives

> **VISION — Phase 3+ (~12 mois)**
> Ce document decrit une architecture cible qui N'EST PAS implementee dans le code actuel. Les widgets utilisent aujourd'hui des types fixes avec des renderers React dedies. Le systeme de primitives viendra quand les types fixes auront prouve leurs limites. Voir `current/implementation-status.md` pour l'etat reel.

### Reference externe : json-render (Vercel)

[json-render.dev](https://json-render.dev/) (Apache 2.0, 14k+ stars) — framework "Generative UI" de Vercel. Catalogue de composants + schemas Zod → rendu React safe pour les LLMs. 41 composants integres (layout, input, data viz).

**Pertinent pour Qiplim** : rendu des widgets **statiques structures** (REPORT, DATA_TABLE, FAQ, SUMMARY, GLOSSARY, PROGRAM_OVERVIEW) ou le contenu est du layout + texte + graphiques sans scoring ni state machine.

**PAS pertinent pour** : widgets interactifs (QUIZ, WORDCLOUD, etc.) qui necessitent scoring, timer, navigation sequentielle, state machine, temps reel. json-render n'a pas de couche comportementale.

**Strategie** : json-render comme renderer optionnel pour les widgets statiques. Le player Qiplim custom pour les widgets interactifs. Les deux coexistent — le compilateur (type → primitives) decide quel renderer utiliser.

---

## Vision

L'ontologie Qiplim est un vocabulaire de ~20 primitives JSON qui permet de decrire n'importe quel composant web interactif. C'est le "HTML du contenu interactif" — un format semantique, composable et renderable par un player universel.

```
"Cree un jeu de memoire" → LLM compose les primitives → Player le rend
```

Deux niveaux coexistent :
- **Types fixes** (QUIZ, SLIDE, WORDCLOUD...) — schemas stricts, fiables pour les LLMs, couvrent 95% des cas
- **Primitives** — building blocks universels, permettent d'inventer de nouveaux types sans coder

Les types fixes sont compiles en primitives. Le player universel ne connait que les primitives.

---

## 1. Les primitives

### 1.1 Contenu (affichage passif)

| Primitive | Description | Props |
|-----------|-------------|-------|
| `text` | Texte brut ou riche | `content: string, format?: 'plain' \| 'markdown'` |
| `heading` | Titre | `content: string, level?: 1-4` |
| `image` | Image | `src: string, alt: string, caption?: string` |
| `audio` | Lecteur audio | `src: string, title?: string, transcript?: TranscriptEntry[]` |
| `video` | Lecteur video | `src: string, title?: string, poster?: string` |
| `code` | Bloc de code | `content: string, language?: string` |
| `divider` | Separateur | `style?: 'line' \| 'space' \| 'dots'` |
| `badge` | Badge / etiquette | `label: string, color?: string, icon?: string` |

### 1.2 Input (saisie participant)

| Primitive | Description | Props |
|-----------|-------------|-------|
| `select-one` | Choix unique (radio) | `options: Option[], correct?: string` |
| `select-many` | Choix multiple (checkboxes) | `options: Option[], correct?: string[], min?: number, max?: number` |
| `text-input` | Saisie texte courte | `placeholder?: string, maxLength?: number` |
| `free-text` | Saisie texte longue | `placeholder?: string, minLength?: number, maxLength?: number` |
| `ranking` | Classement drag & drop | `items: Item[]` |
| `number-input` | Saisie numerique | `min?: number, max?: number, step?: number` |

### 1.3 Feedback (etat et retour)

| Primitive | Description | Props |
|-----------|-------------|-------|
| `score` | Affichage de score | `value: number, max?: number, label?: string` |
| `timer` | Compte a rebours | `duration: number, autoStart?: boolean, onExpire?: Action` |
| `progress` | Barre de progression | `value: number, max: number, label?: string` |
| `leaderboard` | Classement des participants | `entries: LeaderboardEntry[], showRank?: boolean` |
| `results-chart` | Graphique de resultats | `type: 'bar' \| 'pie' \| 'wordcloud', data: ChartData` |

### 1.4 Layout (mise en page)

| Primitive | Description | Props |
|-----------|-------------|-------|
| `stack` | Empilement vertical | `gap?: number, align?: 'start' \| 'center' \| 'end'` |
| `row` | Alignement horizontal | `gap?: number, align?: 'start' \| 'center' \| 'end', wrap?: boolean` |
| `grid` | Grille | `columns: number, gap?: number` |
| `card` | Carte avec bordure | `title?: string, elevation?: 0-3` |
| `tabs` | Onglets | `tabs: Tab[]` |
| `collapsible` | Section repliable | `title: string, defaultOpen?: boolean` |

### 1.5 Action (declencheurs)

| Primitive | Description | Props |
|-----------|-------------|-------|
| `button` | Bouton | `label: string, action: Action, variant?: 'primary' \| 'secondary' \| 'danger'` |
| `navigate` | Navigation dans une sequence | `direction: 'next' \| 'prev' \| 'goto', target?: string` |

### 1.6 Generatif (contenu dynamique)

| Primitive | Description | Props |
|-----------|-------------|-------|
| `llm-generate` | Contenu genere par LLM at runtime | `promptTemplate: string, inputBindings: Record<string, string>, outputFormat: 'text' \| 'json', fallback?: any` |

---

## 2. Types partages

```typescript
interface Option {
  id: string;
  label: string;
  isCorrect?: boolean;    // pour scoring automatique
  icon?: string;
}

interface Item {
  id: string;
  label: string;
  description?: string;
}

interface Action {
  type: 'submit' | 'navigate' | 'emit' | 'set-state';
  target?: string;         // step id, state key, event name
  payload?: unknown;
}

interface Tab {
  id: string;
  label: string;
  children: Primitive[];
}

interface TranscriptEntry {
  start: number;           // secondes
  end: number;
  text: string;
}
```

---

## 3. Structure d'un widget en primitives

```typescript
interface WidgetDocument {
  $schema: string;           // "https://qiplim.com/schemas/primitives/v1.json"
  version: string;           // "1.0"
  id?: string;
  title: string;
  description?: string;

  // Arbre de primitives
  root: Primitive;

  // Comportements globaux
  behavior?: {
    scoring?: ScoringConfig;
    navigation?: NavigationConfig;
    state?: StateConfig;
  };

  // Metadata
  metadata?: Record<string, unknown>;
}

interface Primitive {
  primitive: string;         // "text", "select-one", "stack", etc.
  id?: string;               // identifiant pour references
  children?: Primitive[];    // pour les layouts
  visible?: string;          // condition de visibilite ("state.step == 2")
  [key: string]: unknown;   // props specifiques au type de primitive
}
```

---

## 4. Comportements (behavior)

### 4.1 Scoring

```typescript
interface ScoringConfig {
  mode: 'per-input' | 'total' | 'custom';
  // per-input: chaque select-one/select-many avec correct donne des points
  // total: somme de tous les inputs corrects
  // custom: scoring defini par expressions
  pointsPerCorrect?: number;    // default 1
  showScore?: boolean;           // afficher le score en temps reel
  showCorrectAfterSubmit?: boolean;
  passingScore?: number;         // seuil de reussite (0-100)
}
```

### 4.2 Navigation

```typescript
interface NavigationConfig {
  mode: 'single-page' | 'multi-page' | 'sequential';
  // single-page: tout visible d'un coup
  // multi-page: onglets ou pagination manuelle
  // sequential: un step a la fois, avance par action
  pages?: PageConfig[];
  allowBack?: boolean;
  showProgress?: boolean;
}

interface PageConfig {
  id: string;
  label?: string;
  primitiveIds: string[];    // quelles primitives sur cette page
}
```

### 4.3 State (etat partagé)

```typescript
interface StateConfig {
  initial: Record<string, unknown>;   // etat initial
  // L'etat est mutable via actions "set-state"
  // Accessible dans les conditions via "state.xxx"
}
```

---

## 5. Exemples : types fixes compiles en primitives

### 5.1 Quiz (2 questions)

**Type fixe :**
```json
{
  "type": "QUIZ",
  "data": {
    "questions": [
      { "id": "q1", "question": "Capitale de la France ?", "options": [{"id":"a","label":"Paris","isCorrect":true}, {"id":"b","label":"Lyon","isCorrect":false}], "points": 1 },
      { "id": "q2", "question": "Plus long fleuve ?", "options": [{"id":"c","label":"Seine","isCorrect":false}, {"id":"d","label":"Loire","isCorrect":true}], "points": 1 }
    ],
    "showCorrectAnswer": true
  }
}
```

**Compile en primitives :**
```json
{
  "$schema": "https://qiplim.com/schemas/primitives/v1.json",
  "version": "1.0",
  "title": "Quiz Geographie",
  "root": {
    "primitive": "stack",
    "gap": 16,
    "children": [
      { "primitive": "progress", "id": "quiz-progress", "value": 1, "max": 2, "label": "Question 1/2" },
      {
        "primitive": "card",
        "id": "q1",
        "visible": "state.currentQuestion == 0",
        "children": [
          { "primitive": "heading", "content": "Capitale de la France ?", "level": 3 },
          { "primitive": "select-one", "id": "q1-input", "options": [
            { "id": "a", "label": "Paris", "isCorrect": true },
            { "id": "b", "label": "Lyon", "isCorrect": false }
          ]},
          { "primitive": "button", "label": "Valider", "action": { "type": "submit" } }
        ]
      },
      {
        "primitive": "card",
        "id": "q2",
        "visible": "state.currentQuestion == 1",
        "children": [
          { "primitive": "heading", "content": "Plus long fleuve de France ?", "level": 3 },
          { "primitive": "select-one", "id": "q2-input", "options": [
            { "id": "c", "label": "Seine", "isCorrect": false },
            { "id": "d", "label": "Loire", "isCorrect": true }
          ]},
          { "primitive": "button", "label": "Valider", "action": { "type": "submit" } }
        ]
      },
      { "primitive": "score", "id": "final-score", "visible": "state.currentQuestion >= 2", "value": 0, "max": 2, "label": "Votre score" }
    ]
  },
  "behavior": {
    "scoring": { "mode": "per-input", "pointsPerCorrect": 1, "showCorrectAfterSubmit": true },
    "navigation": { "mode": "sequential", "showProgress": true },
    "state": { "initial": { "currentQuestion": 0 } }
  }
}
```

### 5.2 Jeu de memoire (nouveau type, impossible avec les types fixes)

Un prof dit : "Cree un jeu de memoire avec 8 paires sur le vocabulaire anglais"

```json
{
  "$schema": "https://qiplim.com/schemas/primitives/v1.json",
  "version": "1.0",
  "title": "Memory Game — English Vocabulary",
  "root": {
    "primitive": "stack",
    "gap": 16,
    "align": "center",
    "children": [
      { "primitive": "heading", "content": "Trouvez les paires !", "level": 2 },
      {
        "primitive": "row",
        "gap": 8,
        "children": [
          { "primitive": "timer", "id": "game-timer", "duration": 120, "autoStart": true },
          { "primitive": "score", "id": "pairs-found", "value": 0, "max": 8, "label": "Paires" },
          { "primitive": "badge", "id": "attempts", "label": "0 essais", "color": "blue" }
        ]
      },
      {
        "primitive": "grid",
        "columns": 4,
        "gap": 8,
        "children": [
          { "primitive": "card", "id": "card-1", "title": "?", "children": [{"primitive": "text", "content": "Hello"}] },
          { "primitive": "card", "id": "card-2", "title": "?", "children": [{"primitive": "text", "content": "Bonjour"}] },
          { "primitive": "card", "id": "card-3", "title": "?", "children": [{"primitive": "text", "content": "Goodbye"}] },
          { "primitive": "card", "id": "card-4", "title": "?", "children": [{"primitive": "text", "content": "Au revoir"}] },
          { "primitive": "card", "id": "card-5", "title": "?", "children": [{"primitive": "text", "content": "Thank you"}] },
          { "primitive": "card", "id": "card-6", "title": "?", "children": [{"primitive": "text", "content": "Merci"}] },
          { "primitive": "card", "id": "card-7", "title": "?", "children": [{"primitive": "text", "content": "Please"}] },
          { "primitive": "card", "id": "card-8", "title": "?", "children": [{"primitive": "text", "content": "S'il vous plait"}] },
          { "primitive": "card", "id": "card-9", "title": "?", "children": [{"primitive": "text", "content": "Yes"}] },
          { "primitive": "card", "id": "card-10", "title": "?", "children": [{"primitive": "text", "content": "Oui"}] },
          { "primitive": "card", "id": "card-11", "title": "?", "children": [{"primitive": "text", "content": "No"}] },
          { "primitive": "card", "id": "card-12", "title": "?", "children": [{"primitive": "text", "content": "Non"}] },
          { "primitive": "card", "id": "card-13", "title": "?", "children": [{"primitive": "text", "content": "Sorry"}] },
          { "primitive": "card", "id": "card-14", "title": "?", "children": [{"primitive": "text", "content": "Desole"}] },
          { "primitive": "card", "id": "card-15", "title": "?", "children": [{"primitive": "text", "content": "Help"}] },
          { "primitive": "card", "id": "card-16", "title": "?", "children": [{"primitive": "text", "content": "Aide"}] }
        ]
      }
    ]
  },
  "behavior": {
    "scoring": { "mode": "custom" },
    "state": {
      "initial": {
        "revealedCards": [],
        "matchedPairs": [],
        "attempts": 0,
        "pairs": [
          ["card-1","card-2"], ["card-3","card-4"], ["card-5","card-6"], ["card-7","card-8"],
          ["card-9","card-10"], ["card-11","card-12"], ["card-13","card-14"], ["card-15","card-16"]
        ]
      }
    }
  }
}
```

**Note** : le jeu de memoire necessite de la logique (retourner les cartes, matcher les paires, melanger). Les primitives seules ne suffisent pas — il faut un **runtime de comportement** (state machine cote player). Voir section 7.

### 5.3 Sondage en temps reel (interactif simple)

```json
{
  "$schema": "https://qiplim.com/schemas/primitives/v1.json",
  "version": "1.0",
  "title": "Sondage — Satisfaction",
  "root": {
    "primitive": "stack",
    "gap": 24,
    "children": [
      { "primitive": "heading", "content": "Comment evaluez-vous cette formation ?", "level": 2 },
      {
        "primitive": "select-one",
        "id": "satisfaction",
        "options": [
          { "id": "1", "label": "Tres insatisfait" },
          { "id": "2", "label": "Insatisfait" },
          { "id": "3", "label": "Neutre" },
          { "id": "4", "label": "Satisfait" },
          { "id": "5", "label": "Tres satisfait" }
        ]
      },
      { "primitive": "free-text", "id": "comment", "placeholder": "Un commentaire ? (optionnel)" },
      { "primitive": "button", "label": "Envoyer", "action": { "type": "submit" }, "variant": "primary" },
      { "primitive": "divider" },
      { "primitive": "results-chart", "id": "live-results", "type": "bar", "data": { "sourceInputId": "satisfaction" } }
    ]
  },
  "behavior": {
    "scoring": { "mode": "total" }
  }
}
```

### 5.4 Flashcards (nouveau type)

```json
{
  "$schema": "https://qiplim.com/schemas/primitives/v1.json",
  "version": "1.0",
  "title": "Flashcards — Dates historiques",
  "root": {
    "primitive": "stack",
    "gap": 16,
    "align": "center",
    "children": [
      { "primitive": "progress", "id": "card-progress", "value": 1, "max": 5, "label": "Carte 1/5" },
      {
        "primitive": "card",
        "id": "flashcard",
        "elevation": 2,
        "children": [
          {
            "primitive": "stack",
            "align": "center",
            "children": [
              { "primitive": "heading", "content": "1789", "level": 1, "visible": "state.side == 'front'" },
              { "primitive": "text", "content": "Revolution francaise — Prise de la Bastille le 14 juillet", "visible": "state.side == 'back'" }
            ]
          }
        ]
      },
      {
        "primitive": "row",
        "gap": 12,
        "children": [
          { "primitive": "button", "label": "Retourner", "action": { "type": "set-state", "target": "side", "payload": "toggle" }, "variant": "secondary" },
          { "primitive": "button", "label": "Je savais", "action": { "type": "emit", "target": "answer", "payload": "correct" }, "variant": "primary" },
          { "primitive": "button", "label": "Je ne savais pas", "action": { "type": "emit", "target": "answer", "payload": "wrong" }, "variant": "danger" }
        ]
      }
    ]
  },
  "behavior": {
    "scoring": { "mode": "custom" },
    "navigation": { "mode": "sequential" },
    "state": { "initial": { "side": "front", "currentCard": 0, "knownCount": 0 } }
  }
}
```

### 5.5 Debat structure (nouveau type, interactif compose)

Un prof dit : "Cree un debat structure sur l'IA dans l'education"

```json
{
  "$schema": "https://qiplim.com/schemas/primitives/v1.json",
  "version": "1.0",
  "title": "Debat — L'IA dans l'education",
  "root": {
    "primitive": "stack",
    "gap": 24,
    "children": [
      {
        "primitive": "card",
        "id": "intro",
        "visible": "state.phase == 'intro'",
        "children": [
          { "primitive": "heading", "content": "L'IA devrait-elle remplacer les examens traditionnels ?", "level": 2 },
          { "primitive": "text", "content": "Vous allez debattre en 3 phases : arguments, vote, synthese.", "format": "markdown" },
          { "primitive": "button", "label": "Commencer le debat", "action": { "type": "set-state", "target": "phase", "payload": "arguments" } }
        ]
      },
      {
        "primitive": "card",
        "id": "arguments-phase",
        "visible": "state.phase == 'arguments'",
        "children": [
          { "primitive": "heading", "content": "Phase 1 — Vos arguments", "level": 3 },
          { "primitive": "timer", "duration": 180, "autoStart": true },
          { "primitive": "tabs", "tabs": [
            {
              "id": "pour",
              "label": "Pour",
              "children": [
                { "primitive": "free-text", "id": "arg-pour", "placeholder": "Votre argument en faveur de l'IA..." }
              ]
            },
            {
              "id": "contre",
              "label": "Contre",
              "children": [
                { "primitive": "free-text", "id": "arg-contre", "placeholder": "Votre argument contre l'IA..." }
              ]
            }
          ]},
          { "primitive": "button", "label": "Soumettre", "action": { "type": "submit" } }
        ]
      },
      {
        "primitive": "card",
        "id": "vote-phase",
        "visible": "state.phase == 'vote'",
        "children": [
          { "primitive": "heading", "content": "Phase 2 — Vote", "level": 3 },
          { "primitive": "text", "content": "Apres avoir lu les arguments, quelle est votre position ?" },
          { "primitive": "select-one", "id": "position-vote", "options": [
            { "id": "pour", "label": "Pour — L'IA devrait remplacer les examens" },
            { "id": "mitige", "label": "Mitige — Complement mais pas remplacement" },
            { "id": "contre", "label": "Contre — Les examens traditionnels sont necessaires" }
          ]},
          { "primitive": "button", "label": "Voter", "action": { "type": "submit" } },
          { "primitive": "results-chart", "type": "pie", "data": { "sourceInputId": "position-vote" } }
        ]
      },
      {
        "primitive": "card",
        "id": "synthesis-phase",
        "visible": "state.phase == 'synthesis'",
        "children": [
          { "primitive": "heading", "content": "Phase 3 — Synthese", "level": 3 },
          {
            "primitive": "llm-generate",
            "id": "debate-synthesis",
            "promptTemplate": "Synthetise ce debat sur l'IA dans l'education. Arguments pour: {{argumentsPour}}. Arguments contre: {{argumentsContre}}. Resultat du vote: {{voteResult}}. Fais une synthese equilibree en ~150 mots.",
            "inputBindings": {
              "argumentsPour": "arg-pour.responses",
              "argumentsContre": "arg-contre.responses",
              "voteResult": "position-vote.results"
            },
            "outputFormat": "text",
            "fallback": "Les participants ont debattu activement sur ce sujet."
          }
        ]
      }
    ]
  },
  "behavior": {
    "navigation": { "mode": "sequential" },
    "state": { "initial": { "phase": "intro" } }
  }
}
```

---

## 6. Compilation type fixe → primitives

Le player n'a pas besoin de connaitre les types fixes. Chaque type a un **compilateur** qui transforme le schema haut niveau en arbre de primitives :

```typescript
// Registre de compilateurs
type Compiler = (widget: Widget) => WidgetDocument;

const compilers: Record<string, Compiler> = {
  QUIZ: compileQuiz,
  MULTIPLE_CHOICE: compileMultipleChoice,
  WORDCLOUD: compileWordcloud,
  SLIDE: compileSlide,
  // ...
};

function compileQuiz(widget: Widget): WidgetDocument {
  const config = widget.data as QuizConfig;
  return {
    title: widget.title,
    root: {
      primitive: 'stack',
      children: [
        { primitive: 'progress', value: 1, max: config.questions.length },
        ...config.questions.map((q, i) => ({
          primitive: 'card',
          id: q.id,
          visible: `state.currentQuestion == ${i}`,
          children: [
            { primitive: 'heading', content: q.question, level: 3 },
            { primitive: 'select-one', id: `${q.id}-input`, options: q.options },
            { primitive: 'button', label: 'Valider', action: { type: 'submit' } },
          ],
        })),
      ],
    },
    behavior: {
      scoring: { mode: 'per-input', showCorrectAfterSubmit: config.showCorrectAnswer },
      navigation: { mode: 'sequential' },
    },
  };
}
```

Avantages :
- Le player est generique (ne connait que les primitives)
- Ajouter un type = ajouter un compilateur (pas toucher au player)
- Les widgets custom (primitives brutes) passent directement au player sans compilation

---

## 7. Le Player universel

### 7.1 Architecture

```
Widget JSON (type fixe ou primitives)
  → Compilation (si type fixe → primitives)
  → Player Runtime
    ├── Renderer (primitives → React components)
    ├── State Manager (behavior.state)
    ├── Scoring Engine (behavior.scoring)
    ├── Navigation Controller (behavior.navigation)
    └── Event Bus (actions, submissions)
```

### 7.2 Le renderer

Chaque primitive a un composant React correspondant :

```typescript
const renderers: Record<string, ComponentType<PrimitiveProps>> = {
  'text': TextRenderer,
  'heading': HeadingRenderer,
  'select-one': SelectOneRenderer,
  'select-many': SelectManyRenderer,
  'stack': StackRenderer,
  'grid': GridRenderer,
  'card': CardRenderer,
  'button': ButtonRenderer,
  'timer': TimerRenderer,
  'score': ScoreRenderer,
  'results-chart': ResultsChartRenderer,
  'llm-generate': LLMGenerateRenderer,
  // ...
};

// Le renderer recursif
function PrimitiveRenderer({ node, context }: { node: Primitive; context: PlayerContext }) {
  // Evaluer la condition de visibilite
  if (node.visible && !evaluateCondition(node.visible, context.state)) {
    return null;
  }

  const Renderer = renderers[node.primitive];
  if (!Renderer) return <UnknownPrimitive type={node.primitive} />;

  return (
    <Renderer {...node} context={context}>
      {node.children?.map((child, i) => (
        <PrimitiveRenderer key={child.id || i} node={child} context={context} />
      ))}
    </Renderer>
  );
}
```

### 7.3 Distribution

Le player est distribue comme :

```bash
# Package npm (pour embed dans n'importe quelle app React)
npm install @qiplim/player

# Web Component (pour embed dans n'importe quelle page HTML)
<script src="https://cdn.qiplim.com/player/v1.js"></script>
<qiplim-player src="quiz.json"></qiplim-player>

# Iframe embed
<iframe src="https://play.qiplim.com/embed?url=https://example.com/quiz.json"></iframe>

# CLI preview
npx qiplim preview quiz.json
```

### 7.4 Modes du player

| Mode | Contexte | State | Temps reel |
|------|----------|-------|------------|
| **Preview** | Studio editor | Local, ephemere | Non |
| **Self-paced** | Studio partage / LMS | Persiste par user | Non |
| **Live session** | Engage | Partage, Redis + Ably | Oui |
| **Static** | Export HTML | Aucun | Non |
| **Embed** | Site tiers / LMS | Local ou connecte | Optionnel |

---

## 8. Limites et honnetete

### Ce que les primitives font bien
- Decrire des interfaces de contenu + interaction simples
- Composer des widgets interactifs standard (quiz, sondages, flashcards)
- Etre generees par des LLMs (vocabulaire restreint, pas d'ambiguite)
- Etre rendues par un player universel

### Ce que les primitives ne font PAS
- **Logique complexe** : un jeu de memoire (match de paires, retournement de cartes) necessite du code de comportement au-dela de l'etat simple. Le state machine du player couvre les cas basiques (visibilite conditionnelle, navigation, scoring), mais pas la logique de jeu arbitraire.
- **Animations** : pas de primitives pour les transitions, les animations, ou les effets visuels. Le player peut ajouter des animations par defaut (fade in, slide) mais rien de custom.
- **Canvas / dessin** : pas de primitives pour le dessin libre, les annotations, ou la manipulation spatiale.
- **Communication temps reel avancee** : les primitives decrivent le QUOI, pas le transport. Le temps reel (Ably, WebSocket) est gere par le mode du player, pas par les primitives.

### Strategie pour les cas non couverts
1. **Behavior plugins** : le player accepte des plugins de comportement pour des logiques specifiques (memory game, drag & drop complexe)
2. **Custom primitives** : le registry de primitives est extensible. Un developpeur peut ajouter `memory-grid` comme nouvelle primitive avec son renderer
3. **Escape hatch** : une primitive `custom-html` permet d'injecter du HTML/CSS arbitraire (avec sandboxing CSP)

---

## 9. Roadmap

| Phase | Quoi | Quand |
|-------|------|-------|
| **Maintenant** | Types fixes (QUIZ, SLIDE...) avec schemas Zod. LLMs generent des types fixes. | En place |
| **Phase 2** | Publier l'ontologie. Compilateurs type fixe → primitives. Player prototype (React). | +3 mois |
| **Phase 3** | Player universel (Web Component). LLMs composent en primitives. | +6 mois |
| **Phase 4** | Behavior plugins. Custom primitives. Marketplace de widgets. | +12 mois |

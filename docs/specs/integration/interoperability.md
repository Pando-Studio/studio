# Qiplim — Interoperability & LLM Interface

## Vision

Le format Qiplim Widget JSON est un **standard ouvert** pour décrire des expériences interactives. L'objectif est que n'importe quel LLM (Claude, GPT, Gemini, Mistral, local) puisse générer un widget jouable en une commande — sans connaître Studio ni Engage.

```
Prof → Claude Code → "crée un quiz sur ce chapitre" → JSON → qiplim push → jouable
```

Le format JSON est le produit. Studio et Engage sont des clients de référence.

---

## 1. JSON Schema publié

### 1.1 Structure

Chaque widget est un fichier JSON autonome :

```json
{
  "$schema": "https://qiplim.com/schemas/widget/v1.json",
  "version": "1.0",
  "type": "QUIZ",
  "kind": "LEAF",
  "title": "Les capitales européennes",
  "data": {
    "questions": [
      {
        "id": "q1",
        "question": "Quelle est la capitale de l'Allemagne ?",
        "type": "single",
        "options": [
          { "id": "o1", "label": "Berlin", "isCorrect": true },
          { "id": "o2", "label": "Munich", "isCorrect": false },
          { "id": "o3", "label": "Hambourg", "isCorrect": false }
        ],
        "points": 1
      }
    ],
    "showCorrectAnswer": true,
    "showImmediateFeedback": true
  },
  "metadata": {
    "language": "fr",
    "generatedBy": "claude-opus-4",
    "sourceDescription": "Chapitre 3 — Géographie européenne"
  }
}
```

### 1.2 Types supportés

**LEAF (widgets terminaux)** :

| Type | Catégorie | Description | Champs clés |
|------|-----------|-------------|-------------|
| `QUIZ` | interactive | Quiz multi-questions avec scoring | `questions[{id, question, type, options[{id, label, isCorrect}], points}]` |
| `MULTIPLE_CHOICE` | interactive | Question unique à choix | `question, options[{id, label, isCorrect?}], allowMultiple` |
| `WORDCLOUD` | interactive | Nuage de mots collectif | `prompt` |
| `POSTIT` | interactive | Brainstorming post-it | `prompt, categories[], allowVoting` |
| `RANKING` | interactive | Classement d'items | `prompt, items[{id, label}]` |
| `OPENTEXT` | interactive | Réponse texte libre | `prompt, placeholder?, maxLength?` |
| `ROLEPLAY` | interactive | Jeu de rôle avec IA | `scenario, roles[{id, name, description}]` |
| `SLIDE` | static | Slide de présentation | `title, content (markdown)` |
| `AUDIO` | static | Podcast audio | `title, script, audioUrl?, voice?` |
| `IMAGE` | static | Image générée | `prompt, imageUrl?, style` |

**COMPOSED (widgets composés)** :

| Type | Description | Orchestration |
|------|-------------|---------------|
| `PRESENTATION` | Slides + quiz intercalés | sequential |
| `ADVENTURE` | Livre dont on est le héros | sequential + generative |
| `SIMULATION` | Scénario avec branchements | conditional |
| `TRAINING` | Formation avec score-gating | conditional |
| `ICEBREAKER` | Enchainement de widgets rapides | sequential |
| `COURSE_PLAN` | Plan de cours structuré | sequential |

### 1.3 Compositions

```json
{
  "$schema": "https://qiplim.com/schemas/widget/v1.json",
  "version": "1.0",
  "type": "PRESENTATION",
  "kind": "COMPOSED",
  "title": "Introduction au ML",
  "children": [
    { "type": "SLIDE", "data": { "title": "Intro", "content": "..." } },
    { "type": "QUIZ", "data": { "questions": [...] } },
    { "type": "SLIDE", "data": { "title": "Conclusion", "content": "..." } }
  ],
  "orchestration": { "mode": "sequential" }
}
```

### 1.4 Blocs génératifs

```json
{
  "type": "GENERATIVE_TEXT",
  "generative": {
    "promptTemplate": "Écris la suite de l'histoire. Contexte: {{context}}. Vote: {{voteResult}}.",
    "inputBindings": {
      "context": "parent.data.context",
      "voteResult": "vote-1.result.winningOption.label"
    },
    "outputSchema": { "type": "object", "properties": { "title": {}, "content": {} } },
    "fallback": { "title": "Suite", "content": "L'aventure continue..." }
  }
}
```

### 1.5 Conditions (orchestration conditionnelle)

```
Opérateurs : ==, !=, >=, <=, >, <
Exemples :
  "score >= 70"
  "winningOptionId == 'explore'"
  "responseCount > 10"
```

---

## 2. Package `@qiplim/schema`

Package npm léger (zero dependencies hors Zod) contenant les types et schemas :

```bash
npm install @qiplim/schema
```

### Exports

```typescript
// Types
import type { Widget, QuizConfig, SlideConfig, ComposedWidget } from '@qiplim/schema';

// Zod schemas (validation)
import { QuizConfigSchema, SlideConfigSchema, WidgetSchema } from '@qiplim/schema';

// Helpers
import { validateWidget, getDefaultConfig, getWidgetTypes } from '@qiplim/schema';

// Registry
import { widgetTypes } from '@qiplim/schema';
// → [{ type: 'QUIZ', label: 'Quiz', category: 'interactive', schema: QuizConfigSchema }, ...]
```

### Usage

```typescript
import { WidgetSchema, validateWidget } from '@qiplim/schema';

// Valider un widget JSON
const result = validateWidget(myJson);
if (result.success) {
  console.log('Widget valide:', result.data.type);
} else {
  console.error('Erreurs:', result.errors);
}

// Créer un widget avec defaults
import { getDefaultConfig } from '@qiplim/schema';
const quizDefaults = getDefaultConfig('QUIZ');
// → { questions: [{ id: '...', question: '', options: [...] }], showCorrectAnswer: false }
```

### Pour les LLMs

Le package exporte un `schema.json` (JSON Schema standard, pas Zod) que les LLMs peuvent consommer :

```typescript
import schema from '@qiplim/schema/schema.json';
// → JSON Schema complet pour structured output / function calling
```

---

## 3. CLI `qiplim`

```bash
npx qiplim <command>
```

### Commandes

```bash
# Validation
qiplim validate quiz.json           # Valide un widget JSON
qiplim validate --strict quiz.json  # Validation stricte (pas de champs inconnus)

# Preview local
qiplim preview quiz.json            # Ouvre un preview dans le navigateur (localhost)
qiplim preview presentation.json    # Preview avec navigation pour les composés

# Push vers Studio
qiplim push quiz.json                          # Push vers le studio par défaut
qiplim push quiz.json --studio <studio-id>     # Push vers un studio spécifique
qiplim push *.json --studio <studio-id>        # Push multiple widgets

# Deploy vers Engage (session live)
qiplim deploy quiz.json                        # Crée un projet Engage + session
qiplim deploy presentation.json --title "Ma formation"

# Templates
qiplim templates                    # Liste les templates disponibles
qiplim generate quiz --from doc.pdf # Génère un quiz depuis un document (nécessite clé API LLM)

# Auth
qiplim login                        # Login via browser (OAuth)
qiplim login --token <api-token>    # Login via API token
qiplim whoami                       # Affiche l'utilisateur connecté
```

### Exemples d'usage

```bash
# Un prof crée un quiz et le pousse en une ligne
echo '{"type":"QUIZ","data":{"questions":[...]}}' | qiplim push --studio abc123

# Depuis Claude Code
claude "crée un quiz sur le chapitre 3 de ce PDF" > quiz.json && qiplim push quiz.json

# Générer + déployer en session live
qiplim generate quiz --from slides.pdf | qiplim deploy --title "Quiz surprise"
```

---

## 4. API REST publique

### 4.1 Endpoints

```
Base URL: https://studio.qiplim.com/api/v1
Auth: Bearer token (header Authorization: Bearer <token>)
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/widgets/types` | Liste les types de widgets disponibles avec leurs schemas |
| `POST` | `/widgets/validate` | Valide un widget JSON (sans le stocker) |
| `POST` | `/studios/{id}/widgets` | Crée un widget dans un studio |
| `POST` | `/studios/{id}/widgets/batch` | Crée plusieurs widgets |
| `POST` | `/studios/{id}/generate` | Génère un widget via LLM (nécessite sources) |
| `POST` | `/studios/{id}/deploy` | Deploy vers Engage (crée session) |
| `GET` | `/schemas/{type}` | Récupère le JSON Schema d'un type |
| `GET` | `/schemas/all` | Récupère tous les schemas |
| `GET` | `/templates` | Liste les templates de composition |

### 4.2 Exemples

**Valider un widget :**
```bash
curl -X POST https://studio.qiplim.com/api/v1/widgets/validate \
  -H "Content-Type: application/json" \
  -d @quiz.json

# → { "valid": true, "type": "QUIZ", "warnings": [] }
# → { "valid": false, "errors": ["questions: minimum 1 question required"] }
```

**Créer un widget dans un studio :**
```bash
curl -X POST https://studio.qiplim.com/api/v1/studios/abc123/widgets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @quiz.json

# → { "widget": { "id": "w_xyz", "type": "QUIZ", "status": "READY", ... } }
```

**Deploy vers Engage :**
```bash
curl -X POST https://studio.qiplim.com/api/v1/studios/abc123/deploy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Quiz surprise", "widgetIds": ["w_xyz"] }'

# → { "sessionCode": "ABC123", "presenterUrl": "https://engage.qiplim.com/session/...", "participantUrl": "..." }
```

---

## 5. MCP Server

Un serveur MCP (Model Context Protocol) permet aux assistants IA (Claude Code, Cursor, etc.) de manipuler directement les widgets Qiplim.

### 5.1 Tools exposés

```typescript
// Création
create_widget({ type, title, data })          // Crée un widget JSON validé
create_composed({ type, title, children, orchestration })  // Crée un composé

// Studio
push_to_studio({ studioId, widget })          // Push un widget vers Studio
list_studios()                                 // Liste les studios de l'utilisateur
list_widgets({ studioId })                    // Liste les widgets d'un studio

// Engage
deploy_to_engage({ studioId, title, widgetIds })  // Deploy en session live
get_session_results({ sessionId })                 // Récupère les résultats

// Génération
generate_from_document({ studioId, sourceId, type })  // Génère via RAG
list_templates()                                       // Liste les templates

// Schemas
get_widget_schema({ type })                   // Schema JSON pour un type
get_all_types()                                // Types disponibles
validate_widget({ widget })                    // Validation
```

### 5.2 Exemple d'usage avec Claude Code

```
User: "Crée un quiz de 5 questions sur ce document RGPD et pousse-le sur mon studio"

Claude Code:
1. tool: list_studios() → [{ id: "abc123", title: "Formation RGPD" }]
2. tool: generate_from_document({ studioId: "abc123", sourceId: "src_456", type: "QUIZ" })
   → { widget: { type: "QUIZ", data: { questions: [...] } } }
3. tool: push_to_studio({ studioId: "abc123", widget: ... })
   → { widgetId: "w_789", status: "READY" }
4. "Le quiz a été créé dans votre studio 'Formation RGPD'. Il contient 5 questions."
```

### 5.3 Configuration

```json
// .claude/settings.json ou mcp_servers.json
{
  "mcpServers": {
    "qiplim": {
      "command": "npx",
      "args": ["@qiplim/mcp-server"],
      "env": {
        "QIPLIM_API_TOKEN": "..."
      }
    }
  }
}
```

---

## 6. Fichier `llms.txt`

Publié à `https://qiplim.com/llms.txt` — guide pour les LLMs qui veulent générer des widgets Qiplim.

```
# Qiplim Widget Format — LLM Guide

Qiplim is an open-source platform for creating interactive experiences from any document.

## Quick Start

A Qiplim widget is a JSON object with:
- type: "QUIZ" | "MULTIPLE_CHOICE" | "WORDCLOUD" | "POSTIT" | "RANKING" | "OPENTEXT" | "ROLEPLAY" | "SLIDE" | "AUDIO"
- kind: "LEAF" (single widget) or "COMPOSED" (has children)
- data: type-specific content (see schemas below)

## Example: Quiz

{
  "type": "QUIZ",
  "kind": "LEAF",
  "title": "My Quiz",
  "data": {
    "questions": [
      {
        "id": "q1",
        "question": "What is 2+2?",
        "type": "single",
        "options": [
          { "id": "a", "label": "3", "isCorrect": false },
          { "id": "b", "label": "4", "isCorrect": true },
          { "id": "c", "label": "5", "isCorrect": false }
        ],
        "points": 1
      }
    ],
    "showCorrectAnswer": true
  }
}

## Example: Presentation (composed)

{
  "type": "PRESENTATION",
  "kind": "COMPOSED",
  "title": "My Presentation",
  "children": [
    { "type": "SLIDE", "data": { "title": "Intro", "content": "# Welcome\n..." } },
    { "type": "QUIZ", "data": { "questions": [...] } },
    { "type": "SLIDE", "data": { "title": "Conclusion", "content": "..." } }
  ],
  "orchestration": { "mode": "sequential" }
}

## Full JSON Schema

https://qiplim.com/schemas/widget/v1.json

## Documentation

https://github.com/qiplim/studio/tree/main/docs/studio

## API

https://studio.qiplim.com/api/v1/schemas/all

## MCP Server

npm install @qiplim/mcp-server
```

---

## 7. Distribution & Adoption

### 7.1 Ce qui doit être public sur GitHub

```
qiplim/
├── README.md                          ← Exemples JSON en premier, install en second
├── llms.txt                           ← Guide LLM (copié sur qiplim.com/llms.txt)
├── schemas/
│   ├── widget-v1.json                 ← JSON Schema complet
│   ├── quiz.json                      ← Schema QUIZ seul
│   ├── multiple-choice.json
│   └── ...
├── examples/
│   ├── quiz-simple.json               ← Exemples prêts à l'emploi
│   ├── presentation-interactive.json
│   ├── adventure-generative.json
│   ├── training-with-scoring.json
│   └── icebreaker.json
├── packages/
│   ├── schema/                        ← @qiplim/schema (npm)
│   ├── cli/                           ← qiplim CLI (npm)
│   └── mcp-server/                    ← @qiplim/mcp-server (npm)
├── apps/
│   ├── studio/                        ← App Studio (Next.js)
│   └── engage/                        ← App Engage (Next.js)
└── docs/
    └── studio/
        ├── widget-system-spec.md
        └── interoperability.md         ← Ce document
```

### 7.2 Stratégie d'adoption

| Phase | Action | Objectif |
|-------|--------|----------|
| **1. Format** | Publier schemas/ + examples/ + llms.txt | Les LLMs peuvent générer du JSON valide |
| **2. Package** | Publier @qiplim/schema sur npm | Les développeurs peuvent valider et typer |
| **3. CLI** | Publier la CLI (validate, preview, push) | Workflow terminal pour power users |
| **4. MCP** | Publier @qiplim/mcp-server | Claude Code / Cursor intégration native |
| **5. API** | API REST publique documentée (OpenAPI) | Intégrations tierces, webhooks |
| **6. Community** | Templates marketplace, widget gallery | Effet réseau, contenu partagé |

### 7.3 Pourquoi les LLMs adopteront le format

1. **Simplicité** : un quiz = 1 objet JSON avec `type`, `data`, `questions`. Pas de framework, pas de boilerplate.
2. **Exemples dans le training data** : le README et les exemples GitHub seront dans les training data des futurs modèles.
3. **Validable** : `@qiplim/schema` valide le JSON → les LLMs peuvent vérifier leur output.
4. **MCP natif** : Claude Code peut directement créer et pousser des widgets sans quitter le terminal.
5. **Standard ouvert** : MIT license, JSON Schema publié, pas de vendor lock-in.

---

## 8. Standards d'interopérabilité

### 8.1 xAPI (Experience API)

Chaque interaction widget émet des statements xAPI :

```json
{
  "actor": { "mbox": "mailto:student@example.com" },
  "verb": { "id": "http://adlnet.gov/expapi/verbs/answered" },
  "object": {
    "id": "https://qiplim.com/widgets/w_xyz/questions/q1",
    "definition": {
      "type": "http://adlnet.gov/expapi/activities/cmi.interaction",
      "interactionType": "choice"
    }
  },
  "result": {
    "score": { "raw": 1, "max": 1 },
    "success": true,
    "duration": "PT12S"
  }
}
```

### 8.2 LTI 1.3

Studio peut être lancé comme un outil LTI depuis un LMS :
- Le LMS envoie un launch request avec le contexte cours
- Studio affiche le widget player (self-paced)
- Les résultats sont renvoyés au LMS via Assignment and Grade Services

### 8.3 Export SCORM (optionnel, P4)

Un widget peut être packagé en SCORM 1.2/2004 pour les LMS legacy :
- HTML player standalone + imsmanifest.xml
- Communication via SCORM runtime API
- Scoring remonté au LMS

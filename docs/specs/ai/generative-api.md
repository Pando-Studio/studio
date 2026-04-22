# Qiplim — Generative API

API stateless de generation de widgets. Input/output pur, pas de studio, pas de persistence. C'est le point d'entree pour les systemes tiers (Neocampus, MCP server, CLI, LMS, etc.).

---

## Principe

```
Client (Neocampus, CLI, MCP, LLM)
  │
  │  POST /api/v1/generate
  │  Authorization: Bearer <api-key>
  │  Body: { type, content, params }
  │
  ▼
Qiplim Generative API
  │  Parse le contenu
  │  Appelle le LLM
  │  Valide le output (Zod)
  │
  ▼
  { widget: JSON }
  │
  Pas de studio
  Pas de persistence
  Pas de sources indexees
  Juste input → output
```

---

## Difference avec l'API Studio

| Aspect | API Generative | API Studio |
|--------|---------------|------------|
| **URL** | `/api/v1/generate` | `/api/studios/{id}/generate/*` |
| **Auth** | API key (Bearer token) | Session cookie (BetterAuth) |
| **Input** | Texte brut, URL, ou fichier | sourceIds (deja indexes) |
| **Persistence** | Aucune — le widget JSON est retourne et c'est tout | Widget stocke en DB, lie au studio |
| **RAG** | Optionnel (le contenu est passe inline) | Oui (hybrid search sur les chunks indexes) |
| **Async** | Synchrone (attente de la reponse) ou webhook | Async (BullMQ job + SSE progress) |
| **Usage** | Systemes tiers, CLI, MCP, API publique | Frontend Studio |

---

## Endpoints

### POST /api/v1/generate

Genere un widget a partir de contenu brut. Retourne le JSON du widget directement.

**Request :**
```json
{
  "type": "QUIZ",
  "content": "La photosynthese est le processus par lequel les plantes convertissent la lumiere...",
  "params": {
    "questionCount": 5,
    "difficulty": "medium",
    "language": "fr"
  }
}
```

**Variante avec URL :**
```json
{
  "type": "COURSE_PLAN",
  "contentUrl": "https://example.com/chapitre-3.pdf",
  "params": {
    "duration": "8h",
    "level": "intermediate",
    "style": "project-based"
  }
}
```

**Variante avec fichier (multipart) :**
```
POST /api/v1/generate
Content-Type: multipart/form-data

file: chapitre-3.pdf
type: QUIZ
params: {"questionCount": 5}
```

**Response (succes) :**
```json
{
  "success": true,
  "widget": {
    "type": "QUIZ",
    "kind": "LEAF",
    "title": "Quiz — La photosynthese",
    "data": {
      "questions": [
        {
          "id": "q1",
          "question": "Quel est le produit principal de la photosynthese ?",
          "type": "single",
          "options": [
            { "id": "a", "label": "Glucose", "isCorrect": true },
            { "id": "b", "label": "Oxygene", "isCorrect": false },
            { "id": "c", "label": "CO2", "isCorrect": false }
          ],
          "points": 1
        }
      ],
      "showCorrectAnswer": true,
      "showImmediateFeedback": true
    }
  },
  "usage": {
    "tokensIn": 1200,
    "tokensOut": 800,
    "provider": "mistral",
    "model": "mistral-large-latest",
    "durationMs": 3200
  }
}
```

**Response (erreur) :**
```json
{
  "success": false,
  "error": {
    "code": "GENERATION_FAILED",
    "message": "Le LLM n'a pas pu generer un quiz valide apres 2 tentatives.",
    "details": "Zod validation failed: questions must have at least 1 item"
  }
}
```

---

### POST /api/v1/generate/batch

Genere plusieurs widgets en une seule requete.

**Request :**
```json
{
  "content": "Contenu du chapitre 3 sur les energies renouvelables...",
  "widgets": [
    { "type": "QUIZ", "params": { "questionCount": 5 } },
    { "type": "SUMMARY" },
    { "type": "FLASHCARD", "params": { "cardCount": 10 } },
    { "type": "FAQ" }
  ]
}
```

**Response :**
```json
{
  "success": true,
  "widgets": [
    { "type": "QUIZ", "widget": { ... } },
    { "type": "SUMMARY", "widget": { ... } },
    { "type": "FLASHCARD", "widget": { ... } },
    { "type": "FAQ", "widget": { ... } }
  ],
  "usage": { "tokensIn": 5000, "tokensOut": 4200, "durationMs": 8500 }
}
```

---

### POST /api/v1/generate/composed

Genere un widget compose (presentation, plan de cours, aventure).

**Request :**
```json
{
  "type": "COURSE_PLAN",
  "content": "Contenu du programme de formation...",
  "params": {
    "courseTitle": "Introduction au Machine Learning",
    "duration": "8h",
    "level": "intermediate",
    "objectives": ["Comprendre les algorithmes de base", "Implementer une regression"],
    "style": "project-based"
  }
}
```

**Response :**
```json
{
  "success": true,
  "widget": {
    "type": "COURSE_PLAN",
    "kind": "COMPOSED",
    "title": "Introduction au Machine Learning",
    "data": {
      "duration": "8h",
      "level": "intermediate",
      "objectives": ["..."]
    },
    "children": [
      { "type": "MODULE", "data": { "title": "Module 1 — Regression lineaire", "content": "..." } },
      { "type": "MODULE", "data": { "title": "Module 2 — Classification", "content": "..." } },
      { "type": "MODULE", "data": { "title": "Module 3 — Evaluation", "content": "..." } }
    ],
    "orchestration": { "mode": "sequential" }
  },
  "usage": { "tokensIn": 3000, "tokensOut": 6000, "durationMs": 12000 }
}
```

---

### Endpoints pedagogiques specialises

Chaque niveau de la hierarchie pedagogique a son propre endpoint. Ils retournent du **contenu structure** (pas un widget interactif). Voir `specs/pedagogical-structure.md` pour le detail des schemas.

| Endpoint | Niveau | Input | Output | Locale |
|----------|--------|-------|--------|--------|
| `POST /api/v1/generate/program` | Programme | description + ECTS/heures | Semestres + UEs (ou Classes + Matieres) | fr-lmd, fr-secondary, fr-pro |
| `POST /api/v1/generate/semester` | Semestre | programme parent + ECTS | UEs + ECs | fr-lmd |
| `POST /api/v1/generate/unit` | UE | semestre parent + competences | ECs + heures | fr-lmd |
| `POST /api/v1/generate/syllabus` | EC | description cours + ECTS | Objectifs, prerequis, evaluation, biblio | tous |
| `POST /api/v1/generate/course-plan` | EC | syllabus + nb seances | Progression de seances | tous |
| `POST /api/v1/generate/session-plan` | Seance | contexte cours + objectifs | Timeline minute par minute avec activites | tous |
| `POST /api/v1/generate/activity` | Activite | contenu + type | Widget JSON (quiz, flashcard, etc.) | tous |

**Locale** : le parametre `locale` (`fr-lmd`, `fr-secondary`, `fr-pro`, `generic`) adapte la terminologie et la structure. Determine automatiquement par le type d'organisation (tenant) si utilise avec une API key organisationnelle.

**Cascade** : chaque niveau peut s'appuyer sur le resultat du precedent :
```
/generate/program → structure
  → /generate/semester (input: programme) → UEs
    → /generate/unit (input: semestre) → ECs
      → /generate/syllabus (input: UE + EC) → fiche
        → /generate/course-plan (input: syllabus) → seances
          → /generate/session-plan (input: plan + seance) → deroule
            → /generate/activity (input: contenu) → widget
```

Chaque endpoint est **autonome** : on peut appeler `/generate/session-plan` sans avoir genere le programme complet.

---

### GET /api/v1/types

Liste les types de widgets disponibles avec leurs params.

**Response :**
```json
{
  "types": [
    {
      "type": "QUIZ",
      "label": "Quiz interactif",
      "category": "interactive",
      "params": {
        "questionCount": { "type": "number", "default": 5, "min": 1, "max": 50 },
        "difficulty": { "type": "enum", "values": ["easy", "medium", "hard"], "default": "medium" },
        "language": { "type": "string", "default": "fr" }
      }
    },
    {
      "type": "COURSE_PLAN",
      "label": "Plan de cours",
      "category": "composed",
      "params": {
        "duration": { "type": "string", "default": "5h" },
        "level": { "type": "enum", "values": ["beginner", "intermediate", "expert"] },
        "style": { "type": "enum", "values": ["conservative", "project-based", "gamified", "flipped"] }
      }
    }
  ]
}
```

---

### POST /api/v1/validate

Valide un widget JSON sans le generer. Utile pour verifier un widget construit manuellement.

**Request :**
```json
{
  "widget": {
    "type": "QUIZ",
    "data": {
      "questions": [{ "question": "Test", "options": [{"label": "A"}] }]
    }
  }
}
```

**Response :**
```json
{
  "valid": false,
  "errors": [
    "questions[0].options: minimum 2 options required",
    "questions[0].options[0].id: required",
    "questions[0].id: required"
  ]
}
```

---

## Authentification

### API Keys

Chaque utilisateur ou organisation peut generer des API keys :

```
POST /api/v1/auth/keys
Authorization: Bearer <session-token>
Body: { "name": "Neocampus integration", "scopes": ["generate"] }

Response: { "key": "qpl_live_xxxxxxxxxxxxxxxx", "name": "Neocampus integration" }
```

**Format** : `qpl_live_` (production) ou `qpl_test_` (sandbox).
**Scopes** : `generate` (generer des widgets), `validate` (valider), `types` (lister les types).

### Usage dans les requetes

```bash
curl -X POST https://api.qiplim.com/v1/generate \
  -H "Authorization: Bearer qpl_live_xxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"type": "QUIZ", "content": "...", "params": {"questionCount": 5}}'
```

---

## Webhooks (async)

Pour les generations longues (course plan, presentation), le client peut fournir une `webhookUrl` :

**Request :**
```json
{
  "type": "COURSE_PLAN",
  "content": "...",
  "params": { "duration": "8h" },
  "webhookUrl": "https://neocampus.ecole-design.com/api/qiplim/callback",
  "webhookSecret": "whsec_xxxxxxxx"
}
```

**Response immediate :**
```json
{
  "status": "processing",
  "requestId": "req_xxxxxxxx",
  "estimatedDurationMs": 15000
}
```

**Webhook callback (quand c'est fini) :**
```
POST https://neocampus.ecole-design.com/api/qiplim/callback
X-Qiplim-Signature: sha256=xxxxxxxx
Content-Type: application/json

{
  "requestId": "req_xxxxxxxx",
  "success": true,
  "widget": { ... },
  "usage": { ... }
}
```

Le `X-Qiplim-Signature` est un HMAC-SHA256 du body signe avec le `webhookSecret`, pour verifier l'authenticite.

---

## Rate limiting

| Tier | Limite | Usage |
|------|--------|-------|
| Free | 50 requetes/jour, 100K tokens/jour | Test, prototypage |
| Pro | 1000 requetes/jour, 2M tokens/jour | Production |
| Enterprise | Sur mesure | Volume, SLA |

Self-hosted : pas de limite (l'utilisateur paie ses propres tokens LLM).

---

## Cas d'usage

### Neocampus (LMS)

```
Prof sur Neocampus → "Generer un deroulé de cours"
  → Neocampus POST /api/v1/generate/composed
    { type: "COURSE_PLAN", content: syllabus_pdf, params: { duration: "16h" } }
  → Qiplim genere le plan
  → Neocampus recoit le JSON
  → Neocampus stocke dans sa propre DB
  → Le prof voit le deroulé dans Neocampus
```

### MCP Server (Claude Code)

```
Prof dans Claude Code → "Cree un quiz sur ce document"
  → Claude appelle le tool generate_widget
  → MCP server POST /api/v1/generate
    { type: "QUIZ", content: document_text }
  → Retourne le JSON
  → Claude affiche le quiz ou le sauve en fichier
```

### CLI

```bash
cat chapitre-3.md | qiplim generate quiz --questions 10 --difficulty hard
# → JSON du quiz sur stdout

qiplim generate course-plan --from slides.pdf --duration 8h --output plan.json
# → plan.json cree
```

### Embed dans un site tiers

```javascript
const response = await fetch('https://api.qiplim.com/v1/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer qpl_live_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'QUIZ',
    content: documentText,
    params: { questionCount: 5 }
  })
});

const { widget } = await response.json();
// widget.data.questions → afficher dans votre propre UI
```

---

## Difference avec l'API Studio (resume)

| | API Generative (`/api/v1/*`) | API Studio (`/api/studios/*`) |
|-|------------------------------|------------------------------|
| Auth | API key (Bearer) | Cookie session |
| State | Stateless | Stateful (studio, sources, DB) |
| Input | Texte brut, URL, fichier | sourceIds indexes |
| Output | JSON widget (pas persiste) | Widget en DB + runId |
| RAG | Inline (contenu dans la requete) | Index pgvector + hybrid search |
| Async | Synchrone ou webhook | BullMQ + SSE |
| Pour qui | Systemes tiers, CLI, MCP | Frontend Studio |
| Quotas | Par API key (tokens/jour) | Par user (rate limit/heure) |
| Pedagogique | 7 endpoints specialises (/generate/program, .../session-plan, etc.) | Generation via chat + modals |
| Locale | `fr-lmd`, `fr-secondary`, `fr-pro`, `generic` | Determine par le studio |

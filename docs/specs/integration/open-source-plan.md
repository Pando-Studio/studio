# Qiplim — Open Source Launch Plan

## Objectif

Publier Qiplim Studio + Engage en open source pour :
1. Devenir le standard ouvert pour les widgets interactifs generatifs
2. Que les LLMs (Claude, GPT, Gemini) adoptent le format JSON Qiplim
3. Creer une communaute de devs qui contribuent des widgets, templates et integrations
4. Effet reseau : plus de widgets → plus d'utilisateurs → plus de contributions

---

## 1. Structure du repo

### 1.1 Monorepo public

```
qiplim/
├── README.md                          ← Hero README (exemples JSON, demo GIF, install 1-click)
├── LICENSE                            ← MIT
├── CONTRIBUTING.md                    ← Guide de contribution
├── SECURITY.md                        ← Politique de securite
├── CODE_OF_CONDUCT.md                 ← Contributor Covenant
├── CHANGELOG.md                       ← Genere automatiquement (conventional commits)
├── llms.txt                           ← Guide pour les LLMs (copie sur qiplim.com/llms.txt)
├── docker-compose.yml                 ← Dev local (1 commande)
├── docker-compose.prod.yml            ← Production self-hosted
├── Dockerfile.studio                  ← Image Studio
├── Dockerfile.engage                  ← Image Engage
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                     ← Lint + typecheck + tests
│   │   ├── release.yml                ← Semantic release + changelog
│   │   └── docker-publish.yml         ← Publish images sur GHCR
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   ├── feature_request.yml
│   │   └── new_widget_type.yml        ← Template pour proposer un nouveau widget
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── FUNDING.yml                    ← GitHub Sponsors
├── schemas/
│   ├── widget-v1.json                 ← JSON Schema complet
│   ├── quiz.json                      ← Schema par type (pour les LLMs)
│   ├── slide.json
│   ├── multiple-choice.json
│   └── ...
├── examples/
│   ├── quiz-simple.json
│   ├── presentation-interactive.json
│   ├── adventure-generative.json
│   ├── training-with-scoring.json
│   ├── icebreaker.json
│   └── simulation-crisis.json
├── packages/
│   ├── schema/                        ← @qiplim/schema (npm)
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── types.ts               ← Types TypeScript
│   │   │   ├── schemas/               ← Zod schemas par type
│   │   │   ├── validate.ts            ← validateWidget()
│   │   │   ├── defaults.ts            ← getDefaultConfig()
│   │   │   └── index.ts
│   │   ├── schema.json                ← JSON Schema exporte (pour LLMs / function calling)
│   │   └── README.md
│   ├── player/                        ← @qiplim/player (npm)
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── primitives/            ← Renderers de primitives
│   │   │   ├── engine/                ← Composition engine
│   │   │   ├── Player.tsx             ← Composant React principal
│   │   │   └── web-component.ts       ← <qiplim-player> Web Component
│   │   └── README.md
│   ├── cli/                           ← qiplim CLI (npm)
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── commands/              ← validate, preview, push, deploy
│   │   │   └── index.ts
│   │   └── README.md
│   ├── mcp-server/                    ← @qiplim/mcp-server (npm)
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── tools/                 ← MCP tools (create_widget, push, deploy)
│   │   │   └── index.ts
│   │   └── README.md
│   ├── db/                            ← Prisma schema partage
│   ├── db-studio/                     ← Prisma client Studio
│   └── db-engage/                     ← Prisma client Engage
├── apps/
│   ├── studio/                        ← App Studio (Next.js)
│   ├── engage/                        ← App Engage (Next.js)
│   └── docs/                          ← Site de documentation (Nextra ou Starlight)
└── docs/
    └── studio/
        ├── README.md
        ├── glossary.md
        ├── widget-system-spec.md
        ├── widget-catalog.md
        ├── ontology.md
        ├── interoperability.md
        └── open-source-plan.md        ← Ce document
```

### 1.2 Ce qui change par rapport au repo actuel

| Element | Actuel | Open source |
|---------|--------|-------------|
| Repo | Prive (`Pando-Studio/qiplim-v2`) | Public (`qiplim/qiplim` ou `qiplim/studio`) |
| Packages | Workspace interne | Publies sur npm |
| Docker | docker-compose.yml dev only | + Dockerfiles prod + docker-compose.prod.yml |
| Schemas | Zod dans le code | + JSON Schema publics dans `schemas/` |
| Exemples | Aucun | `examples/` avec des JSON prets a l'emploi |
| Docs | `docs/studio/` interne | Site public (Nextra/Starlight) + `docs/` dans le repo |
| CI | Deploy Clever Cloud | + Publish npm + publish Docker GHCR |
| Secrets | `.env` hardcode | `.env.example` + documentation claire |

---

## 2. Dockerfiles

### 2.1 Dockerfile.studio

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Dependencies
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db/package.json packages/db/
COPY packages/db-studio/package.json packages/db-studio/
COPY apps/studio/package.json apps/studio/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/db-studio/node_modules ./packages/db-studio/node_modules
COPY --from=deps /app/apps/studio/node_modules ./apps/studio/node_modules
COPY . .
RUN pnpm --filter @qiplim/db-studio db:generate
RUN pnpm --filter @qiplim/studio build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/studio/.next/standalone ./
COPY --from=builder /app/apps/studio/.next/static ./apps/studio/.next/static
COPY --from=builder /app/apps/studio/public ./apps/studio/public
EXPOSE 3001
CMD ["node", "apps/studio/server.js"]
```

### 2.2 docker-compose.prod.yml

```yaml
version: '3.8'

services:
  studio:
    build:
      context: .
      dockerfile: Dockerfile.studio
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://qiplim:qiplim@postgres:5432/qiplim_studio
      - REDIS_URL=redis://redis:6379
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - MISTRAL_API_KEY=${MISTRAL_API_KEY}
      # ... autres vars depuis .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  engage:
    build:
      context: .
      dockerfile: Dockerfile.engage
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://qiplim:qiplim@postgres:5432/qiplim_engage
      - REDIS_URL=redis://redis:6379
      - ABLY_API_KEY=${ABLY_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: qiplim
      POSTGRES_PASSWORD: qiplim
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U qiplim"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### 2.3 Self-hosting en 1 commande

```bash
git clone https://github.com/qiplim/qiplim.git
cd qiplim
cp .env.example .env    # editer avec ses cles API
docker compose -f docker-compose.prod.yml up -d
# → Studio sur http://localhost:3001
# → Engage sur http://localhost:3000
```

---

## 3. Documentation

### 3.1 README.md (hero)

Le README est la vitrine. Il doit :

1. **Hook en 1 ligne** : "Create interactive experiences from any document"
2. **Demo GIF** (3 secondes) : upload PDF → chat → quiz genere → play
3. **Exemple JSON** :
```json
{
  "type": "QUIZ",
  "title": "Quick check",
  "data": {
    "questions": [{
      "question": "What is 2+2?",
      "options": [
        { "label": "3", "isCorrect": false },
        { "label": "4", "isCorrect": true }
      ]
    }]
  }
}
```
4. **Install** : `docker compose up` ou `npx qiplim preview quiz.json`
5. **Features** : widgets interactifs, RAG, multi-LLM, real-time sessions, self-paced, generatif at runtime
6. **Widget types** : tableau visuel (icones + labels) des 33 types
7. **Architecture** : schema simple Studio → Player ← Engage
8. **For AI developers** : lien vers `llms.txt`, `@qiplim/schema`, MCP server
9. **Contributing** : lien CONTRIBUTING.md
10. **License** : MIT
11. **Badges** : CI status, npm version, Docker pulls, Discord members, GitHub stars

### 3.2 Site de documentation

Site statique deploy sur `docs.qiplim.com` (Nextra, Starlight ou Mintlify) :

```
docs.qiplim.com/
├── Getting Started
│   ├── Quick Start (docker compose)
│   ├── Cloud (qiplim.com)
│   └── Configuration (.env reference)
├── Concepts
│   ├── Glossary
│   ├── Widget Types (catalog avec previews)
│   ├── Lifecycle
│   └── Composition
├── Studio
│   ├── Creating Widgets
│   ├── Chat & RAG
│   ├── Editing & Composition
│   └── Deploy to Engage
├── Engage
│   ├── Live Sessions
│   ├── Presenter Controls
│   └── Participant Experience
├── Developer
│   ├── JSON Schema Reference
│   ├── REST API
│   ├── CLI Reference
│   ├── MCP Server
│   ├── Creating Custom Widgets
│   └── Contributing a Widget Type
├── Self-Hosting
│   ├── Docker
│   ├── Kubernetes
│   ├── Configuration Reference
│   └── Upgrading
└── API Reference
    ├── OpenAPI / Swagger
    └── Webhook Events
```

### 3.3 .env.example

```bash
# ============================================
# Qiplim Studio — Environment Variables
# ============================================

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_ENGAGE_URL=http://localhost:3000

# Database (PostgreSQL with pgvector)
DATABASE_URL=postgresql://qiplim:qiplim@localhost:5432/qiplim_studio

# Redis (BullMQ workers + pub/sub)
REDIS_URL=redis://localhost:6379

# Authentication (BetterAuth)
BETTER_AUTH_SECRET=change-me-to-a-random-string
BETTER_AUTH_URL=http://localhost:3001

# AI Providers (at least one required)
MISTRAL_API_KEY=              # Default provider
OPENAI_API_KEY=               # Optional
ANTHROPIC_API_KEY=            # Optional
GOOGLE_API_KEY=               # Optional

# BYOK Encryption (min 16 chars)
BYOK_ENCRYPTION_KEY=change-me-to-a-long-random-string

# Document Processing
UNSTRUCTURED_API_KEY=         # For PDF/DOCX parsing (or self-host unstructured)

# Cloud Storage (S3-compatible)
CELLAR_ADDON_HOST=            # S3 endpoint
CELLAR_ADDON_KEY_ID=          # Access key
CELLAR_ADDON_KEY_SECRET=      # Secret key
S3_BUCKET=qiplim-studio

# Optional: Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 4. Community & Communication

### 4.1 Canaux

| Canal | URL | Usage |
|-------|-----|-------|
| **GitHub** | github.com/qiplim/qiplim | Code, issues, PRs, discussions |
| **Discord** | discord.gg/qiplim | Chat communaute, support, showcases |
| **Twitter/X** | @qiplim | Annonces, demos, threads techniques |
| **LinkedIn** | /company/qiplim | Posts professionnels, use cases |
| **Reddit** | r/qiplim + posts dans r/opensource, r/selfhosted, r/edtech, r/webdev, r/artificial | Lancement, feedback, discussions |
| **Product Hunt** | producthunt.com/posts/qiplim | Lancement officiel |
| **Hacker News** | news.ycombinator.com | Show HN au lancement |
| **Dev.to / Hashnode** | Blog technique | Articles techniques, tutorials |
| **YouTube** | @qiplim | Demos, tutorials, showcases |

### 4.2 Strategie de lancement

**Phase 0 — Pre-lancement (2 semaines avant)**
- [ ] Repo public avec README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT
- [ ] Docker images fonctionnelles (test self-hosting)
- [ ] Site docs minimal (getting started + concepts)
- [ ] Packages npm publies (@qiplim/schema, @qiplim/cli)
- [ ] Discord server cree avec channels (#general, #help, #showcase, #dev, #widgets)
- [ ] Twitter/X account cree, premiers posts teasers
- [ ] Blog post technique "Why we built Qiplim" (Dev.to)
- [ ] Demo GIF / video courte (30s)

**Phase 1 — Lancement (jour J)**
- [ ] Post Hacker News (Show HN: Qiplim — Open-source platform for creating interactive experiences from documents)
- [ ] Post Reddit (r/opensource, r/selfhosted, r/webdev)
- [ ] Product Hunt launch
- [ ] Tweet thread : problem → solution → demo → lien
- [ ] Post LinkedIn : angle "interactive content from documents"
- [ ] Email aux early adopters / beta testeurs

**Phase 2 — Premiere semaine**
- [ ] Repondre a tous les commentaires HN/Reddit/PH
- [ ] Fixer les bugs remontes par la communaute
- [ ] Publier un blog post "What we learned from launching"
- [ ] Inviter les premiers contributeurs (issues "good first issue")

**Phase 3 — Premier mois**
- [ ] Premier blog post tutorial ("How to create a quiz from a PDF in 2 minutes")
- [ ] Premier widget type contribue par la communaute
- [ ] Integration avec un LMS (Moodle LTI)
- [ ] MCP server publie (Claude Code integration)
- [ ] Video YouTube demo complete (5 min)

**Phase 4 — Croissance (mois 2-6)**
- [ ] Widget marketplace / gallery
- [ ] Templates community
- [ ] Integrations (Notion, Slack, Google Classroom)
- [ ] Conferences / meetups (EdTech, AI, Open Source)
- [ ] Sponsoring / financement (GitHub Sponsors, Open Collective)

### 4.3 Contenu a produire

| Type | Sujet | Canal | Frequence |
|------|-------|-------|-----------|
| Blog technique | Architecture, decisions, deep dives | Dev.to / blog | 2x/mois |
| Tutorial | "Comment creer X avec Qiplim" | Blog + YouTube | 1x/semaine |
| Showcase | Widgets crees par la communaute | Twitter + Discord | Continu |
| Release notes | Changelog commente | GitHub + Blog | A chaque release |
| Thread technique | Decisions d'archi, comparaisons | Twitter/X | 1x/semaine |
| Demo video | Feature walkthrough | YouTube | 2x/mois |

### 4.4 Labels GitHub pour la communaute

```
good first issue       ← Pour les nouveaux contributeurs
help wanted            ← Besoin d'aide
new widget type        ← Proposition de nouveau type de widget
bug                    ← Bug report
enhancement            ← Feature request
documentation          ← Amelioration de la doc
question               ← Question de la communaute
widget: quiz           ← Specifique au type quiz
widget: audio          ← Specifique au type audio
area: studio           ← Concerne l'app Studio
area: engage           ← Concerne l'app Engage
area: player           ← Concerne le player universel
area: schema           ← Concerne les schemas
priority: critical     ← Bloquant
priority: high         ← Important
priority: low          ← Nice to have
```

---

## 5. Securite pre-lancement

### 5.1 Audit a faire avant de passer public

| Check | Status | Action |
|-------|--------|--------|
| Pas de secrets dans le code | A verifier | `git log --all -p \| grep -i "secret\|password\|key"` |
| Pas de secrets dans l'historique git | A verifier | `trufflehog git file://. --since-commit HEAD~100` |
| `.env.example` sans valeurs reelles | A creer | Remplacer par des placeholders |
| BYOK encryption securisee | Fait | AES-256-GCM (Phase 1) |
| Auth sur toutes les routes API | Fait | `getAuthContext` / `getStudioAuthContext` |
| Zod validation sur tous les inputs | Fait | `validateBody` (Phase 1) |
| Rate limiting | Fait | Chat 50/h (Phase 2) |
| CORS configure | A verifier | Next.js headers dans `next.config.mjs` |
| CSP headers | A verifier | Content Security Policy |
| Dependances a jour | A verifier | `pnpm audit` |
| Pas de eval() ou dangerouslySetInnerHTML | A verifier | Grep dans le code |
| Upload file validation | Fait | ALLOWED_TYPES + magic bytes |

### 5.2 SECURITY.md

```markdown
# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue**
2. Email security@qiplim.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Impact assessment
3. We will respond within 48 hours
4. We will publish a fix and credit you (unless you prefer anonymity)

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |
| < latest | No       |

## Scope

- Studio application (apps/studio/)
- Engage application (apps/engage/)
- Public API endpoints
- Authentication system
- File upload handling
- AI provider key management (BYOK)
```

---

## 6. Licensing

### 6.1 MIT License

```
MIT License

Copyright (c) 2026 Pando Studio

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

### 6.2 Pourquoi MIT

- Maximum d'adoption (pas de contrainte copyleft)
- Compatible avec les usages enterprise
- Les LLMs et outils IA peuvent reproduire le code sans restriction
- C'est le standard pour les outils dev (Next.js, React, shadcn, etc.)

---

## 7. CI/CD pour l'open source

### 7.1 GitHub Actions

```yaml
# ci.yml — sur chaque PR
- Lint (ESLint)
- Typecheck (tsc --noEmit)
- Unit tests (Vitest)
- Build (next build pour Studio + Engage)
- Schema validation (verifier que schemas/ est a jour)

# release.yml — sur push main avec tag
- Semantic versioning (conventional commits → version bump)
- Changelog generation
- npm publish (@qiplim/schema, @qiplim/cli, @qiplim/player, @qiplim/mcp-server)
- GitHub Release avec changelog

# docker-publish.yml — sur release
- Build Docker images (Studio + Engage)
- Push vers GitHub Container Registry (ghcr.io/qiplim/studio, ghcr.io/qiplim/engage)
- Tag latest + version
```

### 7.2 Semantic Release

Conventional commits → version automatique :
- `fix:` → patch (1.0.1)
- `feat:` → minor (1.1.0)
- `feat!:` ou `BREAKING CHANGE:` → major (2.0.0)

---

## 8. Monetisation (open core)

### 8.1 Modele

| Tier | Prix | Contenu |
|------|------|---------|
| **Community** | Gratuit | Self-hosted, toutes les features, pas de limite |
| **Cloud** | Freemium | qiplim.com heberge, 3 studios gratuits, LLM tokens inclus |
| **Pro** | Payant | Studios illimites, analytics avances, support prioritaire, SSO |
| **Enterprise** | Sur devis | On-premise, SLA, formation, custom widgets |

### 8.2 Ce qui est toujours gratuit (open source)

- Tout le code (Studio, Engage, Player, CLI, schemas)
- Self-hosting sans limite
- Tous les types de widgets
- API publique
- MCP server

### 8.3 Ce qui est payant (cloud only)

- Hosting gere (qiplim.com)
- LLM tokens pour la generation (cle plateforme)
- LLM tokens pour les blocs generatifs en session
- Analytics avances (xAPI dashboard)
- SSO / SAML
- Support prioritaire

---

## 9. Checklist pre-lancement

### Code
- [ ] Retirer tous les secrets de l'historique git (nouveau repo si necessaire)
- [ ] `.env.example` complet et documente
- [ ] Retirer les references a Clever Cloud (adapter pour self-hosting generique)
- [ ] Retirer les sessions anonymes (auth obligatoire pour l'open source)
- [ ] Dockerfile.studio fonctionnel
- [ ] Dockerfile.engage fonctionnel
- [ ] docker-compose.prod.yml teste end-to-end
- [ ] `pnpm install && pnpm build` fonctionne from scratch
- [ ] Prisma migrations fonctionnent sur DB vierge
- [ ] `init-db.sql` cree les deux bases (studio + engage) + extensions pgvector

### Packages npm
- [ ] @qiplim/schema publie (types + Zod + JSON Schema + validate)
- [ ] @qiplim/cli publie (validate, preview)
- [ ] @qiplim/player publie (React component)
- [ ] @qiplim/mcp-server publie (Claude Code tools)

### Documentation
- [ ] README.md avec demo GIF, exemples, install
- [ ] CONTRIBUTING.md
- [ ] SECURITY.md
- [ ] CODE_OF_CONDUCT.md
- [ ] CHANGELOG.md
- [ ] docs/ site deploye
- [ ] llms.txt a la racine

### Community
- [ ] Discord server pret
- [ ] Twitter/X account pret
- [ ] GitHub Discussions active
- [ ] Issue templates configurees
- [ ] Labels GitHub crees
- [ ] 10+ "good first issue" crees

### Lancement
- [ ] Blog post "Why we built Qiplim" redige
- [ ] Demo video (30s GIF + 5min YouTube)
- [ ] Product Hunt page preparee
- [ ] Hacker News post redige
- [ ] Reddit posts prepares (r/opensource, r/selfhosted, r/webdev)
- [ ] LinkedIn post prepare

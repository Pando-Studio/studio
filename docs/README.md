# Studio Documentation

## Structure

```
docs/studio/
├── development-plan.md  ← Plan d'action dev (phases, sprints, matrice widgets)
├── specs/               ← Objectif a atteindre (vision, architecture, features)
├── current/             ← Etat reel du code (ce qui existe aujourd'hui)
├── prompts/             ← Prompts LLM pour les workflows Mastra
├── archived/            ← Anciennes specs et references
└── README.md            ← Ce fichier
```

Comparer `specs/` et `current/` pour mesurer l'evolution et identifier les gaps.

---

## Plan de developpement

- **[development-plan.md](development-plan.md)** — Plan d'action detaille. Phase 0 (fondations) → Phase 1 (widgets core : existants + NotebookLM + pedago) → Phase 2 (composition + distribution) → Phase 3 (multi-tenant + open source). Matrice des 41 widgets par phase.

---

## Specs (objectif)

Les specs decrivent ce que le systeme DOIT etre. 16 documents, ~10 000 lignes.

### Fondations
- **[specs/glossary.md](specs/glossary.md)** — Definitions canoniques. Termes FR/EN, hierarchie pedagogique, roles. Lire en premier.
- **[specs/widget-system-spec.md](specs/widget-system-spec.md)** — Architecture widget. Taxonomie (LEAF/COMPOSED), composition, lifecycle, 8 exemples detailles.
- **[specs/data-model.md](specs/data-model.md)** — Schema Prisma complet (20 tables, enums, relations). Tables manquantes identifiees.

### Widgets
- **[specs/widget-catalog.md](specs/widget-catalog.md)** — Catalogue des 41 types. Schema JSON, settings modal, providers, scoring, contraintes par type.
- **[specs/lifecycle.md](specs/lifecycle.md)** — Creation (chat, modal, manual) et lecture (playback states, self-paced, partage, tracking resultats).

### Pedagogie
- **[specs/pedagogical-structure.md](specs/pedagogical-structure.md)** — Hierarchie LMD + lycee + pro. 3 locales (fr-lmd, fr-secondary, fr-pro). 7 endpoints par niveau.
- **[specs/pedagogy-design.md](specs/pedagogy-design.md)** — Parcours utilisateur, 10 templates de lecons, gamification, accessibilite. *(si genere par l'agent)*

### Architecture technique
- **[specs/realtime-architecture.md](specs/realtime-architecture.md)** — Redis pub/sub + SSE + BullMQ. Events, queues, workers. Regle : pas de polling.
- **[specs/api-reference.md](specs/api-reference.md)** — API Studio (~50 endpoints internes). Schemas Zod.
- **[specs/generative-api.md](specs/generative-api.md)** — API Generative (publique, stateless). Endpoints pedagogiques, API keys, webhooks, batch.
- **[specs/providers.md](specs/providers.md)** — 24 AI providers (image, audio, video). BYOK, pricing, settings UI.
- **[specs/ontology.md](specs/ontology.md)** — Primitives universelles (Phase 3+). Player generique, compilation, custom widgets.

### Institutionnel
- **[specs/multi-tenant.md](specs/multi-tenant.md)** — Organisation, Workspace, roles (5 niveaux). Widget activation par tenant. Data isolation.
- **[specs/privacy-compliance.md](specs/privacy-compliance.md)** — RGPD, donnees mineurs, souverainete, securite technique, DPA, conformite Education Nationale.

### Distribution
- **[specs/interoperability.md](specs/interoperability.md)** — JSON Schema, npm packages, CLI, MCP server, llms.txt, xAPI/LTI.
- **[specs/open-source-plan.md](specs/open-source-plan.md)** — Repo, Docker, docs, community, communication, CI/CD, monetisation.

---

## Current (realite)

L'etat reel du code. Ce qui fonctionne, ce qui manque, et les ecarts avec les specs.

- **[current/implementation-status.md](current/implementation-status.md)** — Status d'implementation complet. 12/41 types, gap analysis, terminologie spec vs code.

---

## Reports

- [sprint-report-2026-04-11.md](sprint-report-2026-04-11.md) — Sprint report: Phase 1 (fix & stabilize) + Phase 2 (features)

## Prompts

- [prompts/](prompts/) — Prompts LLM pour les workflows Mastra

## Archived

- [archived/old-specs/](archived/old-specs/) — Anciennes specs WPS++ (remplacees)
- [archived/reference/](archived/reference/) — Benchmarks et analyses

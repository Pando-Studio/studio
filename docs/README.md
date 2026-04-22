# Studio Documentation

## Structure

```
docs/
├── development-plan.md  ← Development roadmap (phases, sprints, widget matrix)
├── specs/               ← Target state (vision, architecture, features)
│   ├── widgets/         ← Widget system, catalog, media specs
│   ├── architecture/    ← Data model, API, realtime, lifecycle
│   ├── ai/              ← RAG, chat, generative API
│   ├── pedagogy/        ← Glossary, pedagogical structure, learning design
│   ├── governance/      ← Multi-tenant, privacy/GDPR
│   └── integration/     ← Providers, interoperability, open source plan
├── current/             ← Actual code state (what exists today)
├── prompts/             ← LLM prompts for Mastra generation workflows
├── archived/            ← Legacy specs and references
└── README.md            ← This file
```

Compare `specs/` and `current/` to measure progress and identify gaps.

---

## Development Plan

- **[development-plan.md](development-plan.md)** — Detailed roadmap. Phase 0 (foundations) -> Phase 1 (core widgets: existing + NotebookLM + pedagogy) -> Phase 2 (composition + distribution) -> Phase 3 (multi-tenant + open source). Matrix of 41 widgets by phase.

---

## Specs (target state)

Specs describe what the system SHOULD be. 23 documents across 6 categories.

### Widgets

- **[widget-system-spec.md](specs/widgets/widget-system-spec.md)** — Widget architecture. Taxonomy (LEAF/COMPOSED), composition, lifecycle, 8 detailed examples.
- **[widget-catalog.md](specs/widgets/widget-catalog.md)** — Catalog of 41 types. JSON schema, settings modal, providers, scoring, constraints per type.
- **[audio-podcast-spec.md](specs/widgets/audio-podcast-spec.md)** — Voice podcast generation (2-voice script + TTS segmentation).
- **[video-generation-spec.md](specs/widgets/video-generation-spec.md)** — Storyboard slideshow (script + per-slide narration).
- **[infographic-spec.md](specs/widgets/infographic-spec.md)** — Infographic generation pipeline.

### Architecture

- **[data-model.md](specs/architecture/data-model.md)** — Full Prisma schema (20+ tables, enums, relations). Missing tables identified.
- **[api-reference.md](specs/architecture/api-reference.md)** — Studio API (~55 internal endpoints). Zod schemas.
- **[realtime-architecture.md](specs/architecture/realtime-architecture.md)** — Redis pub/sub + SSE + BullMQ. Events, queues, workers. Rule: no polling.
- **[lifecycle.md](specs/architecture/lifecycle.md)** — Widget creation (chat, modal, manual) and playback (states, self-paced, sharing, result tracking).
- **[ontology.md](specs/architecture/ontology.md)** — Universal primitives (Phase 3+). Generic player, compilation, custom widgets.
- **[chat-architecture-research.md](specs/architecture/chat-architecture-research.md)** — Intelligent chat system design research.

### AI

- **[chat-intelligent.md](specs/ai/chat-intelligent.md)** — Unified LLM agent architecture, tool generation, mentions, citations.
- **[generative-api.md](specs/ai/generative-api.md)** — Public generative API (stateless endpoints, API keys, webhooks, batch).
- **[rag-analysis.md](specs/ai/rag-analysis.md)** — RAG pipeline analysis.
- **[rag-advanced.md](specs/ai/rag-advanced.md)** — Advanced retrieval patterns (HyDE, contextual embeddings, reranking).

### Pedagogy

- **[glossary.md](specs/pedagogy/glossary.md)** — Canonical definitions. FR/EN terms, pedagogical hierarchy, roles. Read first.
- **[pedagogical-structure.md](specs/pedagogy/pedagogical-structure.md)** — LMD + secondary + vocational hierarchies. 3 locales (fr-lmd, fr-secondary, fr-pro).
- **[pedagogy-design.md](specs/pedagogy/pedagogy-design.md)** — Learner journey, 10 lesson templates, gamification, accessibility.

### Governance

- **[multi-tenant.md](specs/governance/multi-tenant.md)** — Organization, Workspace, roles (5 levels). Widget activation per tenant. Data isolation.
- **[privacy-compliance.md](specs/governance/privacy-compliance.md)** — GDPR, minor data, sovereignty, security, DPA, Education Nationale compliance.

### Integration

- **[providers.md](specs/integration/providers.md)** — 24 AI providers (image, audio, video). BYOK, pricing, settings UI.
- **[interoperability.md](specs/integration/interoperability.md)** — JSON Schema, npm packages, CLI, MCP server, llms.txt, xAPI/LTI.
- **[open-source-plan.md](specs/integration/open-source-plan.md)** — Repo, Docker, docs, community, CI/CD, monetization.

---

## Current (actual state)

The actual state of the code. What works, what's missing, and gaps with specs.

- **[current/implementation-status.md](current/implementation-status.md)** — Full implementation status. 28/41 types built, gap analysis.

---

## Reports

- [sprint-report-2026-04-11.md](sprint-report-2026-04-11.md) — Sprint report: Phase 1 (fix & stabilize) + Phase 2 (features)

## Prompts

- [prompts/](prompts/) — LLM prompts for Mastra generation workflows

## Archived

- [archived/old-specs/](archived/old-specs/) — Legacy WPS++ specs (superseded)
- [archived/reference/](archived/reference/) — Benchmarks and research analyses

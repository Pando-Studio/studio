# Qiplim Studio - Technical Documentation

## Overview

This directory contains the complete technical specifications for the **Studio** application — an AI-powered authoring platform that transforms documents into interactive web components.

For product-level documentation (vision, concept, roadmap), see the KMS: `1.projets/qiplim/2.intents/studio/`
For the Widget Protocol Specification (WPS++), see the KMS: `1.projets/qiplim/3.specs/studio/widget-protocol-spec/`

## Document Index

| # | Document | Description |
|---|----------|-------------|
| 00 | [00-overview.md](./00-overview.md) | Vision, pipeline, stack, key directories, BYOK |
| 01 | [01-architecture.md](./01-architecture.md) | Layer diagram, separation of concerns, client/server boundary, middleware, worker init |
| 02 | [02-packages.md](./02-packages.md) | Monorepo structure, packages (db-studio, db-engage, shared), Turborepo, cross-app imports |
| 03 | [03-data-model.md](./03-data-model.md) | Prisma schema, all models, enums, status workflows, JSON column schemas |
| 04 | [04-react-patterns.md](./04-react-patterns.md) | Server/Client components, state management (Context), data fetching, forms, styling |
| 05 | [05-api-conventions.md](./05-api-conventions.md) | Route structure, auth pattern, Zod validation, error/response format, database queries |
| 06 | [06-widget-system.md](./06-widget-system.md) | Widget types/kinds, registry, type guards, WPS++ composition, templates, generation |
| 07 | [07-ai-rag-pipeline.md](./07-ai-rag-pipeline.md) | Providers, BYOK, embeddings, hybrid search (dense + BM25 + RRF), Mastra workflows, chat |
| 08 | [08-background-jobs.md](./08-background-jobs.md) | BullMQ queues, workers, progress tracking, instrumentation, error handling |
| 09 | [09-studio-engage-bridge.md](./09-studio-engage-bridge.md) | Deploy flow, flattening logic, what is lost, Playback Plans proposal |
| 10 | [10-testing-strategy.md](./10-testing-strategy.md) | Current state (zero tests), recommended strategy, priority areas |
| 11 | [11-open-source-prep.md](./11-open-source-prep.md) | Blockers, adapter interfaces, OSS packaging checklist |
| 12 | [12-recommendations.md](./12-recommendations.md) | Audit results, security fixes, frontend modernization, Docker, Voxtral podcast, priorities |

### Benchmark

| Document | Description |
|----------|-------------|
| [notebook-like-projects/](./notebook-like-projects/) | Benchmark de 16 projets NotebookLM-like |
| [notebook-like-projects/04-open-notebook-vs-studio.md](./notebook-like-projects/04-open-notebook-vs-studio.md) | Comparaison detaillee Open Notebook vs Studio |

## Quick Reference

- **Port**: 3001
- **Database**: PostgreSQL on port 5433 (`qiplim_studio`)
- **Prisma package**: `@qiplim/db-studio`
- **Branch**: `studio`
- **No real-time**: Studio uses polling, not WebSockets (Engage uses Ably)
- **AI SDK**: Vercel AI SDK + Mastra orchestration
- **State management**: React Context (Zustand installed but unused, TanStack Query planned)

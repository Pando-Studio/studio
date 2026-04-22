# Studio - Open Source Preparation

## Vision

Studio is intended to become an open-source "RAG to Web Component" engine, following an open-core model inspired by n8n.

| Component | License |
|-----------|---------|
| Studio Core (RAG + generation) | Open source |
| Default widgets | Open source |
| Widget Dev Kit (CLI, simulator) | Open source |
| Marketplace | Open (community + premium) |
| Qiplim Cloud (hosting) | Commercial |
| Live Runtime (Engage real-time) | Proprietary |

## Blockers

### 1. BYOK Encryption (Critical)

**File**: `apps/studio/lib/ai/byok.ts`

Current encryption is XOR with a repeating key. This is trivially reversible and not cryptographically secure. Any database operator (which in self-hosted mode means the user) can decode all stored API keys.

**Fix**: Replace with `crypto.createCipheriv('aes-256-gcm', ...)`. Add a migration to re-encrypt existing keys.

### 2. Infrastructure Coupling (High)

The codebase is coupled to Qiplim's infrastructure:

| Coupling | Files | Impact |
|----------|-------|--------|
| Clever Cloud deployment | `.clever.json`, `scripts/setup-clever-*` | CI/CD won't work for self-hosters |
| Cellar S3 (Clever Cloud) | `lib/s3.ts`, `CELLAR_*` env vars | S3 endpoint hardcoded |
| BetterAuth (specific auth lib) | `lib/auth.ts` | No adapter for Keycloak, Auth0, etc. |
| Unstructured.io (external API) | `lib/unstructured.ts` | Requires paid API key |
| Ably (Engage only) | Not in Studio | But Engage bridge assumes Ably |

### 3. No Dockerfile (High)

No Docker images for the apps. Only `docker-compose.yml` for PostgreSQL + Redis development services.

**Need**: Dockerfile per app + `docker-compose.prod.yml` with all services.

### 4. No Prisma Migrations (Medium)

Both databases use `db:push` (schema sync) instead of proper migration files. This works for development but is unsafe for production upgrades.

**Need**: Generate migration baselines, set up CI migration checks.

### 5. No TypeScript Source in packages/shared (Medium)

`packages/shared` has only compiled JS. Self-hosters can't modify shared types.

### 6. Missing Documentation (Medium)

- No README for the repo root
- No self-hosting guide
- No API documentation (OpenAPI/Swagger)
- No widget developer guide

## Adapter Interfaces (Planned)

To make Studio provider-agnostic, these adapter interfaces should be created:

### StorageAdapter

```typescript
interface StorageAdapter {
  upload(key: string, body: Buffer, contentType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  delete(key: string): Promise<void>;
}
```

Default implementation: S3 (current). Alternatives: MinIO, local filesystem, GCS.

### QueueAdapter

```typescript
interface QueueAdapter {
  enqueue(queueName: string, jobData: unknown): Promise<string>;
  getJobStatus(jobId: string): Promise<JobStatus>;
  createWorker(queueName: string, processor: Function): void;
}
```

Default: BullMQ + Redis. Alternative: PostgreSQL-based queue (pg-boss).

### DocumentParserAdapter

```typescript
interface DocumentParserAdapter {
  parse(file: Buffer, filename: string): Promise<ParsedElement[]>;
}
```

Default: Unstructured.io API. Alternatives: local parsing (pdf-parse, mammoth), LlamaParse.

### EmbeddingAdapter

Already partially abstracted via provider system. Could be formalized.

## OSS Packaging Checklist

| Item | Status | Priority |
|------|--------|----------|
| LICENSE file | Missing | High |
| CONTRIBUTING.md | Missing | High |
| SECURITY.md | Missing | High |
| Issue templates | Missing | Medium |
| PR template | Missing | Medium |
| README.md (root) | Exists but internal | High — rewrite for OSS |
| `.env.example` (Studio) | Exists | OK |
| Docker Compose (full) | Missing | High |
| Dockerfile (Studio) | Missing | High |
| CI for migrations | Missing | Medium |
| Remove Clever Cloud refs | Not done | Medium |
| Widget Dev Kit | Not started | Phase 4 roadmap |
| API docs (OpenAPI) | Missing | Medium |
| Self-hosting guide | Missing | High |

## Recommended Order

1. Fix BYOK encryption (1-2 days)
2. Add `packages/shared/src/` with TypeScript source (3-5 days)
3. Add Prisma migrations (3-5 days)
4. Create Dockerfiles + docker-compose.prod.yml (3-5 days)
5. Write self-hosting guide (2-3 days)
6. Add adapter interfaces (1-2 weeks)
7. OSS packaging (LICENSE, CONTRIBUTING, etc.) (2-3 days)
8. Widget Dev Kit scaffolding (1-2 weeks)

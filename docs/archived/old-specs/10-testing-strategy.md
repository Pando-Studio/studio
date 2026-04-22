# Studio - Testing Strategy

## Current State

Studio has **zero tests**. No unit tests, no integration tests, no E2E tests. This is in contrast with Engage, which has 180 unit tests (Vitest), 10 E2E specs (Playwright), and load tests (k6).

## Recommended Strategy

### Unit Tests (Vitest)

Priority areas for unit testing:

| Area | Files to Test | What to Verify |
|------|--------------|----------------|
| Composition validation | `lib/composition/composition-validation.ts` | Compatibility matching, cardinality, cycle detection, depth |
| Widget flattening | `lib/deploy/flatten-widgets.ts` | Correct flattening of nested trees, slot ordering |
| BYOK encryption | `lib/ai/byok.ts` | Encrypt/decrypt round-trip, key validation |
| Type guards | `components/widgets/types.ts` | Each type guard returns correct boolean |
| Hybrid search | `lib/ai/embeddings.ts` | RRF fusion logic, score ranking |
| Template registry | `lib/widget-templates/registry.ts` | Template lookup, input validation |

### Configuration

Use the same Vitest setup as Engage:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['__tests__/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
});
```

### API Route Tests

Test the standard route patterns:

| Route | Test Cases |
|-------|-----------|
| `POST /api/studios` | Auth required, creates studio, returns studio |
| `GET /api/studios/[id]` | Auth + ownership check, returns full studio |
| `POST /api/studios/[id]/widgets/generate` | Validation, creates widget + run, triggers generation |
| `POST /api/studios/[id]/deploy-to-engage` | Flattens correctly, calls Engage API |

### Integration Tests

Test with real LLM calls (skip if no API key):

| Test | What to Verify |
|------|----------------|
| Quiz generation | Template → LLM → valid quiz JSON |
| Hybrid search | Dense + sparse return relevant chunks |
| Chat with RAG | Streaming response with citations |

### E2E Tests (Playwright)

| Flow | Steps |
|------|-------|
| Create studio | Login → Create → Verify dashboard |
| Upload document | Create studio → Upload PDF → Wait for indexing |
| Generate widget | Upload → Select sources → Generate quiz → Verify widget |
| Deploy to Engage | Generate widgets → Deploy → Verify session URL |

### Test file organization

```
apps/studio/
├── __tests__/
│   ├── setup.ts
│   ├── composition/
│   │   └── validation.test.ts
│   ├── deploy/
│   │   └── flatten-widgets.test.ts
│   ├── ai/
│   │   ├── byok.test.ts
│   │   └── embeddings.test.ts
│   └── api/
│       ├── studios.test.ts
│       └── widgets.test.ts
└── e2e/
    ├── fixtures/
    └── tests/
        └── studio-flow.spec.ts
```

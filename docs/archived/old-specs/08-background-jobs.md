# Studio - Background Jobs

## Architecture

Studio uses **BullMQ** with **Redis** for asynchronous job processing. Heavy operations (document parsing, LLM generation) run in background workers rather than blocking API responses.

```
API Route                        Redis Queue                    Worker
  │                                 │                             │
  ├─ Create record (DRAFT/PENDING)  │                             │
  ├─ Enqueue job ─────────────────►│                             │
  ├─ Return { id, runId } ─────►Client                           │
  │                                 │                             │
  │                                 ├─ Dequeue ──────────────────►│
  │                                 │                    Process job
  │                                 │                    Update progress
  │                                 │                    Update DB status
  │                                 │◄───────────── Job complete   │
  │                                 │                             │
  Client polls /generations ──────►API ──► Read GenerationRun from DB
```

## Queues

**File**: `apps/studio/lib/queue/queues.ts`

6 queues with lazy initialization (created on first use):

| Queue Name | Purpose | Concurrency |
|------------|---------|-------------|
| `studio-source-analysis` | Document parsing + chunking + embedding | 2 |
| `studio-widget-generation` | Widget content generation via Mastra | 2 |
| `studio-presentation-generation` | Presentation generation v1 | 2 |
| `studio-presentation-v2-generation` | Presentation generation v2 | 2 |
| `studio-slide-image-generation` | Slide image generation (DALL-E, Gemini) | 2 |
| `studio-course-plan-generation` | Course plan generation | 2 |

### Queue factory pattern

```typescript
let queue: Queue | null = null;

export function getSourceAnalysisQueue(): Queue {
  if (!queue) {
    queue = new Queue('studio-source-analysis', { connection: connectionOptions });
  }
  return queue;
}
```

### Connection

**File**: `apps/studio/lib/queue/connection.ts`

Parses `REDIS_URL` env var. Default: `redis://localhost:6379`.

## Workers

**Directory**: `apps/studio/lib/queue/workers/`

### Worker pattern

Each worker follows this structure:

```typescript
async function processJob(job: Job<JobData>): Promise<JobResult> {
  // 1. Update DB status to processing
  await prisma.model.update({ data: { status: 'INDEXING' } });

  // 2. Report progress
  await job.updateProgress({ progress: 10, step: 'initializing', label: 'Starting...' });

  // 3. Do work
  const result = await heavyOperation();

  // 4. Report progress
  await job.updateProgress({ progress: 80, step: 'finalizing', label: 'Almost done...' });

  // 5. Update DB status to complete
  await prisma.model.update({ data: { status: 'INDEXED' } });

  // 6. Return result
  return { success: true, ...result };
}

function createWorker() {
  const worker = new Worker<JobData, JobResult>(
    'queue-name',
    processJob,
    { connection: connectionOptions, concurrency: 2 }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job.id} failed:`, err);
  });

  return worker;
}
```

### Worker inventory

| Worker | Queue | Input | Output |
|--------|-------|-------|--------|
| `analyze-source.worker.ts` | source-analysis | `{ sourceId, studioId, filename, url, s3Key, type }` | `{ success, chunksCount }` |
| `generate-widget.worker.ts` | widget-generation | `{ studioId, widgetId, templateId, inputs, sourceIds }` | `{ success, widgetId }` |
| `generate-presentation.worker.ts` | presentation-generation | Presentation config | `{ success, presentationId }` |
| `generate-presentation-v2.worker.ts` | presentation-v2 | V2 presentation config | `{ success, presentationId, versionId }` |
| `generate-slide-image.worker.ts` | slide-image | `{ slideId, prompt, style, model }` | `{ success, imageUrl }` |
| `generate-course-plan.worker.ts` | course-plan | `{ studioId, title, sourceIds, style }` | `{ success, coursePlanId }` |

## Progress Tracking

### Job progress

Workers report structured progress:

```typescript
await job.updateProgress({
  progress: 30,        // Percentage (0-100)
  step: 'generating',  // Machine-readable step name
  label: 'Generating content...',  // Human-readable label
});
```

### GenerationRun model

All generation jobs are tracked in the `GenerationRun` table:

| Field | Purpose |
|-------|---------|
| `status` | PENDING → RUNNING → COMPLETED / FAILED |
| `type` | What's being generated (QUIZ, PRESENTATION, etc.) |
| `widgetId` / `presentationId` / `slideId` | Target entity |
| `estimatedTokens` / `actualTokens` | Token usage tracking |
| `errorLog` | Error message on failure |
| `completedAt` | Completion timestamp |

### Client polling

The `StudioContext` polls `/api/studios/[id]/generations` every 2 seconds when active runs exist. When runs complete, it auto-refreshes the studio data.

## Worker Initialization

**File**: `apps/studio/instrumentation.ts`

Workers are started via the Next.js instrumentation hook, which runs once on server startup:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const sourceWorker = createSourceAnalysisWorker();
    const widgetWorker = createWidgetGenerationWorker();
    const presentationWorker = startPresentationGenerationWorker();
    const coursePlanWorker = createCoursePlanGenerationWorker();

    console.log('[Studio] BullMQ workers started');
  }
}
```

The `NEXT_RUNTIME === 'nodejs'` check ensures workers only start in the Node.js runtime, not in Edge runtime.

## Error Handling

### Worker error pattern

```typescript
try {
  // ... process job
} catch (error) {
  // Update source/widget status to ERROR
  await prisma.studioSource.update({
    where: { id: sourceId },
    data: {
      status: 'ERROR',
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
    },
  });

  // Update generation run
  await prisma.generationRun.update({
    where: { id: runId },
    data: {
      status: 'FAILED',
      errorLog: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date(),
    },
  });

  return { success: false, error: error.message };
}
```

### Retry policy

No automatic retries are configured. Failed jobs stay in the failed state. Users can retry document processing via `POST /api/documents/[id]/retry`.

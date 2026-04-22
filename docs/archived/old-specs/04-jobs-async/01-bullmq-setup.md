# Configuration BullMQ + Redis

## Vue d'ensemble

**BullMQ** est utilisé pour orchestrer les tâches asynchrones :
- Parsing de documents
- Génération d'embeddings
- Génération de widgets via IA
- Analyse et catégorisation

---

## Installation

```bash
pnpm add bullmq ioredis
```

---

## Configuration Redis

```typescript
// lib/redis.ts
import { Redis } from 'ioredis';

// Configuration de base
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: true,
  retryDelayOnFailover: 100,
};

// Client principal (pour BullMQ)
export const redis = new Redis(redisConfig);

// Client pub/sub (séparé)
export const redisPub = new Redis(redisConfig);
export const redisSub = new Redis(redisConfig);

// Gestion des erreurs
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected');
});
```

---

## Définition des Queues

```typescript
// lib/queue/queues.ts
import { Queue, QueueEvents } from 'bullmq';
import { redis } from '../redis';

// Options par défaut
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  removeOnComplete: {
    age: 3600, // 1 heure
    count: 100,
  },
  removeOnFail: {
    age: 86400, // 24 heures
  },
};

// ============================================
// Queue: Document Processing
// ============================================
export const documentQueue = new Queue<DocumentJobData>('document-processing', {
  connection: redis,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 3,
  },
});

export interface DocumentJobData {
  type: 'parse' | 'embed' | 'analyze';
  sourceId: string;
  userId: string;
}

// ============================================
// Queue: Widget Generation
// ============================================
export const generationQueue = new Queue<GenerationJobData>('widget-generation', {
  connection: redis,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  },
});

export interface GenerationJobData {
  type: 'widget' | 'suggestion';
  studioId: string;
  templateId?: string;
  sourceIds: string[];
  inputs: Record<string, unknown>;
  userId: string;
}

// ============================================
// Queue: Session Events
// ============================================
export const sessionQueue = new Queue<SessionJobData>('session-events', {
  connection: redis,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 1, // Events are fire-and-forget
    removeOnComplete: {
      age: 60, // 1 minute
    },
  },
});

export interface SessionJobData {
  type: 'aggregate' | 'notify' | 'export';
  sessionId: string;
  payload: Record<string, unknown>;
}

// ============================================
// Queue Events (pour monitoring)
// ============================================
export const documentQueueEvents = new QueueEvents('document-processing', {
  connection: redis,
});

export const generationQueueEvents = new QueueEvents('widget-generation', {
  connection: redis,
});
```

---

## Workers

### Document Processing Worker

```typescript
// workers/document-worker.ts
import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { db } from '@qiplim/db';
import { DocumentJobData, generationQueue } from '../lib/queue/queues';
import { parseWithUnstructured } from '../lib/parsing/unstructured';
import { generateEmbeddings } from '../lib/embeddings';
import { documentAnalyzerAgent } from '@qiplim/ai/agents';
import { getMastraForUser } from '@qiplim/ai';

const worker = new Worker<DocumentJobData>(
  'document-processing',
  async (job: Job<DocumentJobData>) => {
    const { type, sourceId, userId } = job.data;

    console.log(`Processing job ${job.id}: ${type} for source ${sourceId}`);

    switch (type) {
      case 'parse':
        return await handleParse(job, sourceId);

      case 'embed':
        return await handleEmbed(job, sourceId);

      case 'analyze':
        return await handleAnalyze(job, sourceId, userId);

      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  },
  {
    connection: redis,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

// Handler: Parse document
async function handleParse(job: Job, sourceId: string) {
  await job.updateProgress(10);

  const source = await db.source.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    throw new Error(`Source ${sourceId} not found`);
  }

  // Update status
  await db.source.update({
    where: { id: sourceId },
    data: { status: 'PROCESSING' },
  });

  await job.updateProgress(20);

  // Parse with Unstructured.io
  const elements = await parseWithUnstructured(source.url, source.mimeType);

  await job.updateProgress(50);

  // Create chunks
  const chunks = createChunks(elements, {
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  await job.updateProgress(70);

  // Save chunks (without embeddings yet)
  await db.sourceChunk.createMany({
    data: chunks.map((chunk, index) => ({
      sourceId,
      content: chunk.content,
      metadata: chunk.metadata,
      pageNumber: chunk.pageNumber,
      chunkIndex: index,
    })),
  });

  await job.updateProgress(90);

  // Enqueue embedding job
  await documentQueue.add(
    'embed',
    { type: 'embed', sourceId, userId: job.data.userId },
    { priority: 2 }
  );

  await job.updateProgress(100);

  return { chunksCreated: chunks.length };
}

// Handler: Generate embeddings
async function handleEmbed(job: Job, sourceId: string) {
  const chunks = await db.sourceChunk.findMany({
    where: { sourceId },
    orderBy: { chunkIndex: 'asc' },
  });

  const batchSize = 10;
  const totalBatches = Math.ceil(chunks.length / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const batch = chunks.slice(i * batchSize, (i + 1) * batchSize);
    const contents = batch.map((c) => c.content);

    // Generate embeddings
    const embeddings = await generateEmbeddings(contents);

    // Update chunks with embeddings
    for (let j = 0; j < batch.length; j++) {
      await db.$executeRaw`
        UPDATE source_chunks
        SET embedding = ${embeddings[j]}::vector
        WHERE id = ${batch[j].id}
      `;
    }

    await job.updateProgress(Math.round(((i + 1) / totalBatches) * 100));
  }

  // Enqueue analysis job
  await documentQueue.add(
    'analyze',
    { type: 'analyze', sourceId, userId: job.data.userId },
    { priority: 3 }
  );

  return { chunksEmbedded: chunks.length };
}

// Handler: Analyze document
async function handleAnalyze(job: Job, sourceId: string, userId: string) {
  const source = await db.source.findUnique({
    where: { id: sourceId },
    include: {
      chunks: {
        take: 10,
        orderBy: { chunkIndex: 'asc' },
      },
    },
  });

  if (!source) {
    throw new Error(`Source ${sourceId} not found`);
  }

  await job.updateProgress(20);

  // Get Mastra instance for user
  const mastra = await getMastraForUser(userId);

  // Analyze with AI
  const sampleContent = source.chunks.map((c) => c.content).join('\n\n');

  await job.updateProgress(40);

  const analysis = await mastra.runAgent(documentAnalyzerAgent, {
    content: sampleContent,
    filename: source.filename,
  });

  await job.updateProgress(80);

  // Update source with analysis
  await db.source.update({
    where: { id: sourceId },
    data: {
      status: 'COMPLETED',
      analysis,
    },
  });

  await job.updateProgress(100);

  return { analysis };
}

// Event handlers
worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

worker.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`);
});

export { worker as documentWorker };
```

### Widget Generation Worker

```typescript
// workers/generation-worker.ts
import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { db } from '@qiplim/db';
import { GenerationJobData } from '../lib/queue/queues';
import { getMastraForUser } from '@qiplim/ai';
import { generateWidgetWorkflow } from '@qiplim/ai/workflows';
import { publishEvent } from '../lib/socket/events';

const worker = new Worker<GenerationJobData>(
  'widget-generation',
  async (job: Job<GenerationJobData>) => {
    const { type, studioId, templateId, sourceIds, inputs, userId } = job.data;

    console.log(`Generation job ${job.id}: ${type} for studio ${studioId}`);

    const mastra = await getMastraForUser(userId);

    await job.updateProgress(10);

    // Execute workflow
    const result = await mastra.executeWorkflow(generateWidgetWorkflow, {
      studioId,
      templateId,
      sourceIds,
      inputs,
      userId,
    });

    await job.updateProgress(100);

    // Notify client via WebSocket
    await publishEvent(`studio:${studioId}`, {
      type: 'widget:generated',
      payload: {
        widgetId: result.widgetId,
        templateId,
      },
    });

    return result;
  },
  {
    connection: redis,
    concurrency: 3,
    limiter: {
      max: 5,
      duration: 1000,
    },
  }
);

worker.on('failed', async (job, err) => {
  if (job) {
    await publishEvent(`studio:${job.data.studioId}`, {
      type: 'widget:generation_failed',
      payload: {
        error: err.message,
        jobId: job.id,
      },
    });
  }
});

export { worker as generationWorker };
```

---

## Démarrage des Workers

### Via instrumentation.ts (Next.js)

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import workers only on Node.js runtime
    const { documentWorker } = await import('./workers/document-worker');
    const { generationWorker } = await import('./workers/generation-worker');

    console.log('BullMQ workers registered');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Shutting down workers...');
      await documentWorker.close();
      await generationWorker.close();
    });
  }
}
```

---

## Monitoring

### Dashboard BullMQ

```typescript
// app/api/admin/queues/route.ts
import { NextResponse } from 'next/server';
import { documentQueue, generationQueue } from '@/lib/queue/queues';

export async function GET() {
  const [docCounts, genCounts] = await Promise.all([
    documentQueue.getJobCounts(),
    generationQueue.getJobCounts(),
  ]);

  return NextResponse.json({
    queues: {
      'document-processing': docCounts,
      'widget-generation': genCounts,
    },
  });
}
```

### Job Status API

```typescript
// app/api/jobs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { documentQueue, generationQueue } from '@/lib/queue/queues';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const jobId = params.id;

  // Try to find in all queues
  let job = await documentQueue.getJob(jobId);
  if (!job) {
    job = await generationQueue.getJob(jobId);
  }

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const state = await job.getState();
  const progress = job.progress;

  return NextResponse.json({
    id: job.id,
    name: job.name,
    state,
    progress,
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    timestamp: job.timestamp,
    finishedOn: job.finishedOn,
  });
}
```

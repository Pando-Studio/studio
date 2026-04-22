# Stack Technique Détaillée

## Vue d'ensemble

| Catégorie | Technologie | Version | Usage |
|-----------|-------------|---------|-------|
| **Frontend** | Next.js | 15+ | App Router, SSR/SSG |
| **UI** | React | 18 | Composants |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS |
| **Components** | shadcn/ui | latest | Design system |
| **State** | TanStack Query | 5.x | Server state |
| **ORM** | Prisma | 6.x | PostgreSQL ORM |
| **Database** | PostgreSQL | 16 | Data + pgvector |
| **Cache** | Redis | 7 | Cache + Pub/Sub |
| **Queue** | BullMQ | 5.x | Job orchestration |
| **AI** | Mastra | latest | Agent framework |
| **Auth** | BetterAuth | latest | Authentication |
| **Hosting** | Clever Cloud | - | PaaS français |

---

## Frontend

### Next.js 15

Configuration optimisée pour le Studio :

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.cleverapps.io',
      },
    ],
  },
  webpack: (config) => {
    // Support pour les workers BullMQ
    config.externals.push({
      'bullmq': 'commonjs bullmq',
    });
    return config;
  },
};

export default nextConfig;
```

### React 18 + Server Components

Structure des composants :

```typescript
// Server Component (default)
// app/studio/[id]/page.tsx
import { db } from '@qiplim/db';

export default async function StudioPage({ params }: { params: { id: string } }) {
  const studio = await db.studio.findUnique({
    where: { id: params.id },
    include: { sources: true, widgets: true },
  });

  return <StudioEditor studio={studio} />;
}

// Client Component (interactif)
// components/studio/editor.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

export function StudioEditor({ studio }: { studio: Studio }) {
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  // ...
}
```

### shadcn/ui + Tailwind

Configuration du design system :

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // Couleurs spécifiques Studio
        studio: {
          sources: 'hsl(var(--studio-sources))',
          chat: 'hsl(var(--studio-chat))',
          widgets: 'hsl(var(--studio-widgets))',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### TanStack Query

Configuration et hooks custom :

```typescript
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// hooks/use-studio.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useStudio(studioId: string) {
  return useQuery({
    queryKey: ['studio', studioId],
    queryFn: () => fetchStudio(studioId),
  });
}

export function useGenerateWidget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateWidget,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['studio', variables.studioId, 'widgets'],
      });
    },
  });
}
```

---

## Backend

### Prisma ORM

Configuration avec PostgreSQL et pgvector :

```prisma
// packages/db/prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}
```

Client singleton :

```typescript
// packages/db/src/client.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
```

### BullMQ

Configuration des queues :

```typescript
// lib/queue/index.ts
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

// Définition des queues
export const documentQueue = new Queue('document-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600, // 1 heure
      count: 100,
    },
    removeOnFail: {
      age: 86400, // 24 heures
    },
  },
});

export const generationQueue = new Queue('widget-generation', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  },
});

// Types de jobs
export type DocumentJob = {
  type: 'parse' | 'embed';
  documentId: string;
  userId: string;
};

export type GenerationJob = {
  type: 'widget';
  studioId: string;
  templateId: string;
  sourceIds: string[];
  inputs: Record<string, unknown>;
  userId: string;
};
```

Workers :

```typescript
// workers/document-worker.ts
import { Worker, Job } from 'bullmq';
import { db } from '@qiplim/db';
import { parseDocument } from '../lib/parsing';
import { generateEmbeddings } from '../lib/embeddings';

const worker = new Worker<DocumentJob>(
  'document-processing',
  async (job: Job<DocumentJob>) => {
    const { type, documentId, userId } = job.data;

    await job.updateProgress(10);

    if (type === 'parse') {
      const document = await db.document.findUnique({
        where: { id: documentId },
      });

      if (!document) throw new Error('Document not found');

      await job.updateProgress(30);

      const chunks = await parseDocument(document.url);

      await job.updateProgress(60);

      await db.documentChunk.createMany({
        data: chunks.map((chunk, index) => ({
          documentId,
          content: chunk.content,
          metadata: chunk.metadata,
          chunkIndex: index,
          pageNumber: chunk.pageNumber,
        })),
      });

      await job.updateProgress(80);

      // Enqueue embedding job
      await generationQueue.add('embed', {
        type: 'embed',
        documentId,
        userId,
      });

      await job.updateProgress(100);
    }

    if (type === 'embed') {
      const chunks = await db.documentChunk.findMany({
        where: { documentId },
      });

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await generateEmbeddings(chunks[i].content);

        await db.$executeRaw`
          UPDATE document_chunks
          SET embedding = ${embedding}::vector
          WHERE id = ${chunks[i].id}
        `;

        await job.updateProgress(Math.round((i / chunks.length) * 100));
      }

      await db.document.update({
        where: { id: documentId },
        data: { status: 'COMPLETED' },
      });
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
```

### BetterAuth

Configuration de l'authentification :

```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { db } from '@qiplim/db';

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24, // 1 jour
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL!,
  ],
});

// Hook d'authentification
export function useAuth() {
  const session = auth.useSession();
  return {
    user: session.data?.user,
    isLoading: session.isPending,
    isAuthenticated: !!session.data?.user,
  };
}
```

---

## Infrastructure

### PostgreSQL 16

Extensions et configuration :

```sql
-- Extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Index pour recherche vectorielle
CREATE INDEX ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index pour performance
CREATE INDEX CONCURRENTLY idx_documents_project
ON documents(project_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_responses_session
ON activity_responses(session_id, activity_id);
```

### Redis 7

Configuration pour cache et pub/sub :

```typescript
// lib/redis.ts
import { Redis } from 'ioredis';

// Client principal (cache + queues)
export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
});

// Client pub/sub (séparé pour éviter les blocages)
export const redisSub = new Redis(process.env.REDIS_URL!);
export const redisPub = new Redis(process.env.REDIS_URL!);

// Helpers cache
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, data);
    } else {
      await redis.set(key, data);
    }
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};
```

### Clever Cloud Cellar (S3)

Configuration du stockage :

```typescript
// lib/storage.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: 'eu-west-1',
  endpoint: process.env.CELLAR_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CELLAR_KEY_ID!,
    secretAccessKey: process.env.CELLAR_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.CELLAR_BUCKET!;

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  return `${process.env.CELLAR_ENDPOINT}/${BUCKET}/${key}`;
}

export async function getSignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 heure
}
```

---

## Services IA

### Mastra Framework

Configuration et agents :

```typescript
// packages/ai/src/mastra.ts
import { Mastra } from '@mastra/core';
import { MistralProvider } from '@mastra/mistral';
import { OpenAIProvider } from '@mastra/openai';

export const mastra = new Mastra({
  providers: {
    mistral: new MistralProvider({
      apiKey: process.env.MISTRAL_API_KEY!,
    }),
    openai: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
    }),
  },
  defaultProvider: 'mistral',
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  },
});
```

### Providers IA Supportés

| Provider | Modèles | Usage |
|----------|---------|-------|
| **Mistral** | mistral-large, mistral-medium | Principal (souveraineté) |
| **OpenAI** | gpt-4o, gpt-4-turbo | BYOK |
| **Anthropic** | claude-3-5-sonnet | BYOK |
| **Google** | gemini-1.5-pro | BYOK |

Configuration BYOK :

```typescript
// lib/ai/provider-factory.ts
import { Mastra } from '@mastra/core';

export async function getProviderForUser(userId: string): Promise<Mastra> {
  const userConfig = await db.userAIConfig.findUnique({
    where: { userId },
  });

  if (userConfig?.byokProvider && userConfig.byokApiKey) {
    return new Mastra({
      providers: {
        [userConfig.byokProvider]: createProvider(
          userConfig.byokProvider,
          userConfig.byokApiKey
        ),
      },
      defaultProvider: userConfig.byokProvider,
    });
  }

  // Fallback sur Mistral par défaut
  return mastra;
}
```

---

## Variables d'Environnement

```bash
# .env.local

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Base de données
DATABASE_URL=postgresql://qiplim:qiplim@localhost:5432/qiplim_engage

# Redis
REDIS_URL=redis://localhost:6379

# Authentification
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stockage
CELLAR_ENDPOINT=https://cellar-c2.services.clever-cloud.com
CELLAR_KEY_ID=your-key-id
CELLAR_SECRET_KEY=your-secret-key
CELLAR_BUCKET=qiplim-engage

# IA
MISTRAL_API_KEY=your-mistral-key
OPENAI_API_KEY=your-openai-key
CLAUDE_API_KEY=your-claude-key
GEMINI_API_KEY=your-gemini-key

# Document Parsing
UNSTRUCTURED_API_KEY=your-unstructured-key
UNSTRUCTURED_API_URL=https://api.unstructured.io
```

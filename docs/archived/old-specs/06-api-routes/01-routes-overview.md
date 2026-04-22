# Routes API - Vue d'ensemble

## Organisation

L'API Studio utilise le **App Router de Next.js 15** avec les conventions suivantes.

> **⚠️ Important** : Cette documentation couvre uniquement les routes de **Studio**. Les routes d'Engage sont documentées dans les specs Engage séparées (`engage/00-specs-engage.md`).

### apps/studio/app/api/ (Backend principal)

```
apps/studio/app/api/
├── auth/                    # Authentification (Better Auth)
├── studios/                 # CRUD Studios
│   ├── route.ts            # GET (list), POST (create)
│   └── [studioId]/
│       ├── route.ts        # GET, PATCH, DELETE
│       ├── sources/        # Gestion des sources
│       ├── conversations/  # Historique chat IA
│       ├── widgets/        # Gestion des widgets
│       └── presentations/  # Gestion des présentations
├── ai/                     # Endpoints IA
│   ├── chat/               # Chat conversationnel
│   └── generate/           # Génération de widgets
├── templates/              # Templates de widgets
├── sessions/               # Sessions live
├── webhooks/               # Webhooks entrants
├── jobs/                   # Monitoring jobs
└── admin/                  # Administration
```

### Note sur Engage

> **📚 Documentation Engage** : Les routes API d'Engage sont documentées séparément dans `engage/00-specs-engage.md`.
>
> Les participants Engage se connectent au WebSocket de Studio pour les sessions live.

---

## Authentification

Toutes les routes (sauf webhooks) requièrent une authentification via **Better Auth**.

```typescript
// apps/studio/lib/auth.ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { db } from '@qiplim/db';

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
```

### Middleware d'authentification

```typescript
// apps/studio/middleware.ts
import { auth } from '@/lib/auth';

export default auth.middleware({
  publicRoutes: ['/api/webhooks/*', '/api/auth/*'],
});
```

---

## Tableau des Endpoints

### Studios

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `GET` | `/api/studios` | Liste des studios de l'utilisateur | ✅ |
| `POST` | `/api/studios` | Créer un nouveau studio | ✅ |
| `GET` | `/api/studios/:id` | Détails d'un studio | ✅ |
| `PATCH` | `/api/studios/:id` | Modifier un studio | ✅ |
| `DELETE` | `/api/studios/:id` | Supprimer un studio | ✅ |
| `POST` | `/api/studios/:id/duplicate` | Dupliquer un studio | ✅ |

### Sources

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `GET` | `/api/studios/:id/sources` | Liste des sources | ✅ |
| `POST` | `/api/studios/:id/sources` | Ajouter une source | ✅ |
| `GET` | `/api/studios/:id/sources/:sourceId` | Détails d'une source | ✅ |
| `DELETE` | `/api/studios/:id/sources/:sourceId` | Supprimer une source | ✅ |
| `POST` | `/api/studios/:id/sources/:sourceId/reprocess` | Relancer le traitement | ✅ |

### Widgets

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `GET` | `/api/studios/:id/widgets` | Liste des widgets | ✅ |
| `POST` | `/api/studios/:id/widgets/generate` | Générer un widget (async) | ✅ |
| `GET` | `/api/studios/:id/widgets/:widgetId` | Détails d'un widget | ✅ |
| `PATCH` | `/api/studios/:id/widgets/:widgetId` | Modifier un widget | ✅ |
| `DELETE` | `/api/studios/:id/widgets/:widgetId` | Supprimer un widget | ✅ |
| `POST` | `/api/studios/:id/widgets/:widgetId/regenerate` | Régénérer un widget | ✅ |

### Conversations (Chat IA)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `GET` | `/api/studios/:id/conversations` | Liste des conversations | ✅ |
| `POST` | `/api/studios/:id/conversations` | Créer une conversation | ✅ |
| `GET` | `/api/studios/:id/conversations/:convId` | Détails d'une conversation | ✅ |
| `DELETE` | `/api/studios/:id/conversations/:convId` | Supprimer une conversation | ✅ |
| `GET` | `/api/studios/:id/conversations/:convId/messages` | Messages d'une conversation | ✅ |
| `POST` | `/api/studios/:id/conversations/:convId/messages` | Envoyer un message (déclenche réponse IA) | ✅ |

### Chat IA (Streaming)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `POST` | `/api/ai/chat` | Chat avec streaming (SSE) | ✅ |
| `POST` | `/api/ai/chat/generate` | Chat + génération widget (async) | ✅ |

### Templates

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `GET` | `/api/templates` | Liste des templates disponibles | ✅ |
| `GET` | `/api/templates/:templateId` | Détails d'un template | ✅ |
| `GET` | `/api/templates?category=ACTIVITY` | Filtrer par catégorie | ✅ |
| `GET` | `/api/templates?type=QUIZ` | Filtrer par type | ✅ |
| `POST` | `/api/templates` | Créer un template custom | ✅ (Admin) |

### Présentations

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `GET` | `/api/studios/:id/presentations` | Liste des présentations | ✅ |
| `POST` | `/api/studios/:id/presentations` | Créer une présentation | ✅ |
| `GET` | `/api/studios/:id/presentations/:presId` | Détails d'une présentation | ✅ |
| `PATCH` | `/api/studios/:id/presentations/:presId` | Modifier une présentation | ✅ |
| `DELETE` | `/api/studios/:id/presentations/:presId` | Supprimer une présentation | ✅ |
| `POST` | `/api/studios/:id/presentations/:presId/widgets` | Ajouter un widget | ✅ |
| `PATCH` | `/api/studios/:id/presentations/:presId/widgets/reorder` | Réordonner les widgets | ✅ |

### Sessions Live

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `POST` | `/api/sessions` | Créer une session live | ✅ |
| `GET` | `/api/sessions/:sessionId` | Détails d'une session | ✅ |
| `PATCH` | `/api/sessions/:sessionId` | Modifier une session | ✅ |
| `DELETE` | `/api/sessions/:sessionId` | Supprimer une session | ✅ |
| `POST` | `/api/sessions/:sessionId/start` | Démarrer une session | ✅ |
| `POST` | `/api/sessions/:sessionId/end` | Terminer une session | ✅ |
| `GET` | `/api/sessions/:sessionId/stats` | Statistiques de session | ✅ |
| `GET` | `/api/sessions/:sessionId/export` | Exporter les résultats | ✅ |

> **Note** : La route `join/:code` pour les participants est gérée par l'app Engage (voir specs Engage).

### Jobs

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `GET` | `/api/jobs/:jobId` | Statut d'un job | ✅ |
| `GET` | `/api/admin/queues` | Dashboard des queues | ✅ (Admin) |

### Webhooks (entrants)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `POST` | `/api/webhooks/stripe` | Événements Stripe | Signature |
| `POST` | `/api/webhooks/uploadthing` | Événements upload | Signature |

---

## Exemples d'Implémentation

### Liste des Studios

```typescript
// apps/studio/app/api/studios/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@qiplim/db';

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const studios = await db.studio.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: { sources: true, widgets: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ studios });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const studio = await db.studio.create({
    data: {
      userId: session.user.id,
      name: body.name,
      description: body.description,
    },
  });

  return NextResponse.json({ studio }, { status: 201 });
}
```

### Génération de Widget (Async)

```typescript
// apps/studio/app/api/studios/[studioId]/widgets/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@qiplim/db';
import { generationQueue } from '@/lib/queue/queues';

export async function POST(
  req: NextRequest,
  { params }: { params: { studioId: string } }
) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Vérifier l'accès au studio
  const studio = await db.studio.findFirst({
    where: { id: params.studioId, userId: session.user.id },
  });

  if (!studio) {
    return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
  }

  const body = await req.json();
  const { templateId, sourceIds, inputs } = body;

  // Créer le job
  const job = await generationQueue.add(
    'generate-widget',
    {
      type: 'widget',
      studioId: params.studioId,
      templateId,
      sourceIds,
      inputs,
      userId: session.user.id,
    },
    { priority: 1 }
  );

  return NextResponse.json({
    jobId: job.id,
    message: 'Widget generation started',
  }, { status: 202 });
}
```

### Upload de Source

```typescript
// apps/studio/app/api/studios/[studioId]/sources/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@qiplim/db';
import { documentQueue } from '@/lib/queue/queues';
import { utapi } from '@/lib/uploadthing';

export async function POST(
  req: NextRequest,
  { params }: { params: { studioId: string } }
) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Upload via UploadThing
  const uploadResponse = await utapi.uploadFiles(file);

  if (!uploadResponse.data) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  // Créer la source
  const source = await db.source.create({
    data: {
      studioId: params.studioId,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      url: uploadResponse.data.url,
      status: 'PENDING',
    },
  });

  // Lancer le traitement
  await documentQueue.add(
    'parse',
    {
      type: 'parse',
      sourceId: source.id,
      userId: session.user.id,
    },
    { priority: 1 }
  );

  return NextResponse.json({ source }, { status: 201 });
}
```

### Chat IA avec Streaming

```typescript
// apps/studio/app/api/ai/chat/route.ts
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@qiplim/db';
import { mastra } from '@qiplim/ai';

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { conversationId, message, sourceIds } = await req.json();

  // Vérifier l'accès à la conversation
  const conversation = await db.conversation.findFirst({
    where: {
      id: conversationId,
      studio: { userId: session.user.id },
    },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  if (!conversation) {
    return new Response('Conversation not found', { status: 404 });
  }

  // Sauvegarder le message utilisateur
  await db.conversationMessage.create({
    data: {
      conversationId,
      role: 'USER',
      content: message,
      metadata: { sourceRefs: sourceIds },
    },
  });

  // Construire le contexte RAG si des sources sont sélectionnées
  let context = '';
  if (sourceIds?.length > 0) {
    const chunks = await retrieveRelevantChunks(message, sourceIds);
    context = chunks.map((c) => c.content).join('\n\n');
  }

  // Streaming response avec Mastra
  const stream = await mastra.chat({
    model: 'mistral-large',
    messages: [
      { role: 'system', content: buildSystemPrompt(context) },
      ...conversation.messages.map((m) => ({
        role: m.role.toLowerCase(),
        content: m.content,
      })),
      { role: 'user', content: message },
    ],
    stream: true,
  });

  // Retourner le stream SSE
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

function buildSystemPrompt(context: string): string {
  return `Tu es un assistant pédagogique expert. Tu aides les formateurs à créer du contenu interactif.

${context ? `Contexte des sources :\n${context}\n\n` : ''}

Tu peux :
- Répondre aux questions sur le contenu des sources
- Proposer des idées de widgets (quiz, slides, etc.)
- Générer des widgets si on te le demande explicitement

Sois concis et professionnel.`;
}
```

---

## Validation des Requêtes

### Avec Zod

```typescript
// apps/studio/lib/validations/studio.ts
import { z } from 'zod';

export const createStudioSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const updateStudioSchema = createStudioSchema.partial();

export const generateWidgetSchema = z.object({
  templateId: z.string().uuid(),
  sourceIds: z.array(z.string().uuid()).min(1),
  inputs: z.record(z.unknown()).optional(),
});
```

### Middleware de Validation

```typescript
// apps/studio/lib/api/validate.ts
import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: NextRequest): Promise<T | NextResponse> => {
    try {
      const body = await req.json();
      return schema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }
  };
}
```

---

## Gestion des Erreurs

### Format Standard

```typescript
interface APIError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
```

### Codes d'Erreur

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Non authentifié |
| `FORBIDDEN` | 403 | Accès refusé |
| `NOT_FOUND` | 404 | Ressource non trouvée |
| `VALIDATION_ERROR` | 400 | Données invalides |
| `CONFLICT` | 409 | Conflit (ex: nom dupliqué) |
| `RATE_LIMITED` | 429 | Trop de requêtes |
| `INTERNAL_ERROR` | 500 | Erreur serveur |

### Middleware Global

```typescript
// apps/studio/lib/api/error-handler.ts
import { NextResponse } from 'next/server';

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
  }
}

export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof APIError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}
```

---

## Rate Limiting

```typescript
// apps/studio/lib/api/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
});

export async function checkRateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

  return {
    success,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
    },
  };
}
```

---

## Pagination

### Format Standard

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}
```

### Implémentation

```typescript
// apps/studio/lib/api/pagination.ts
export function paginate<T>(
  data: T[],
  totalCount: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}
```

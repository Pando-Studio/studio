# Studio - API Conventions

## Route Structure

All API routes live under `apps/studio/app/api/`. Routes follow Next.js App Router file conventions (`route.ts` in each directory).

### Resource Hierarchy

```
/api/auth/[...all]                          # BetterAuth catch-all
/api/auth/anonymous                         # Anonymous session creation
/api/auth/migrate-anonymous                 # Migrate anonymous → registered

/api/studios                                # GET list, POST create
/api/studios/[id]                           # GET detail, PATCH update, DELETE
/api/studios/[id]/sources                   # GET list, POST add
/api/studios/[id]/sources/[sourceId]        # PUT update, DELETE
/api/studios/[id]/sources/from-widget       # POST extract source from widget
/api/studios/[id]/widgets                   # GET list, POST create
/api/studios/[id]/widgets/[widgetId]        # GET, PUT update, DELETE
/api/studios/[id]/widgets/[widgetId]/children # PUT manage children
/api/studios/[id]/widgets/generate          # POST unified generation
/api/studios/[id]/generate/quiz             # POST generate quiz (legacy)
/api/studios/[id]/generate/wordcloud        # POST generate wordcloud
/api/studios/[id]/generate/roleplay         # POST generate roleplay
/api/studios/[id]/generate/presentation     # POST generate presentation
/api/studios/[id]/presentations/generate-v2 # POST generate presentation v2
/api/studios/[id]/course-plans              # GET list, POST generate
/api/studios/[id]/course-plans/[planId]     # GET, PUT update
/api/studios/[id]/chat                      # POST send message (streaming)
/api/studios/[id]/generations               # GET list generation runs
/api/studios/[id]/generations/[runId]       # GET run status
/api/studios/[id]/deploy-to-engage          # POST deploy widgets to Engage
/api/studios/[id]/settings                  # PUT update studio settings

/api/presentations/[id]                     # GET, PUT, DELETE
/api/presentations/[id]/slides              # GET list, POST create
/api/presentations/[id]/slides/[slideId]    # PUT update, DELETE
/api/presentations/[id]/slides/reorder      # PUT reorder

/api/documents                              # GET list, POST create
/api/documents/[id]                         # GET, DELETE
/api/documents/upload                       # POST multipart upload
/api/documents/[id]/retry                   # POST retry processing
/api/documents/[id]/folder                  # PUT move to folder
/api/documents/[id]/tags                    # PUT update tags
/api/documents/add-url                      # POST add URL document

/api/library/folders                        # POST create folder
/api/library/tags                           # POST create/manage tags

/api/providers                              # GET available providers
/api/settings/providers                     # GET list, POST save, DELETE

/api/favorites                              # POST toggle favorite

/api/queue/jobs/[jobId]                     # GET poll job status
```

## Standard Route Pattern

Every API route handler follows this structure:

```typescript
type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    // 1. Extract params (Next.js 15 async pattern)
    const { id: studioId } = await params;

    // 2. Authentication
    const headersList = await headers();
    const cookieStore = await cookies();
    const session = await auth.api.getSession({ headers: headersList });
    const userId = session?.user?.id;
    const anonymousCode = cookieStore.get('studio_anonymous_code')?.value;
    let anonymousSessionId: string | null = null;
    if (anonymousCode) {
      const anonSession = await validateAnonymousSession(anonymousCode);
      anonymousSessionId = anonSession?.id ?? null;
    }
    if (!userId && !anonymousSessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Ownership verification
    const studio = await prisma.studio.findUnique({ where: { id: studioId } });
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    const isOwner =
      (userId && studio.userId === userId) ||
      (anonymousSessionId && studio.anonymousSessionId === anonymousSessionId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 4. Request validation (Zod)
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // 5. Business logic
    const result = await prisma.widget.create({ data: { ... } });

    // 6. Response
    return NextResponse.json({ widget: result }, { status: 201 });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

## Authentication

### Dual auth system

Studio supports two authentication modes, both checked in every protected route:

| Mode | Cookie | Model | Expiry |
|------|--------|-------|--------|
| Authenticated | `better-auth.session_token` | `user` + `session` (BetterAuth) | 7 days |
| Anonymous | `studio_anonymous_code` | `StudioAnonymousSession` | 30 days |

### Auth check helper (common pattern)

Most routes extract this into a `checkAccess` function:

```typescript
async function checkAccess(studioId: string) {
  const headersList = await headers();
  const cookieStore = await cookies();
  const session = await auth.api.getSession({ headers: headersList });
  const userId = session?.user?.id;
  const anonymousCode = cookieStore.get('studio_anonymous_code')?.value;
  let anonymousSessionId: string | null = null;
  if (anonymousCode) {
    const anonSession = await validateAnonymousSession(anonymousCode);
    anonymousSessionId = anonSession?.id ?? null;
  }
  if (!userId && !anonymousSessionId) {
    return { error: 'Unauthorized', status: 401 };
  }
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio) return { error: 'Studio not found', status: 404 };
  const isOwner =
    (userId && studio.userId === userId) ||
    (anonymousSessionId && studio.anonymousSessionId === anonymousSessionId);
  if (!isOwner) return { error: 'Unauthorized', status: 403 };
  return { studio, userId, anonymousSessionId };
}
```

### Server-to-server auth

The deploy-to-engage route uses a shared secret:

```typescript
const apiSecret = request.headers.get('X-API-Secret');
if (apiSecret !== process.env.ENGAGE_API_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Request Validation

### Zod schemas in routes

Validation uses Zod with `.safeParse()` for structured error responses:

```typescript
import { z } from 'zod';

const generateSchema = z.object({
  widgetTemplateId: z.string().min(1),
  title: z.string().min(1).max(200),
  inputs: z.record(z.unknown()),
  sourceIds: z.array(z.string()).default([]),
  language: z.string().default('fr'),
});

// In handler:
const parsed = generateSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: 'Validation error', details: parsed.error.flatten() },
    { status: 400 }
  );
}
const { widgetTemplateId, title, inputs, sourceIds } = parsed.data;
```

### Where schemas live

Schemas are defined **inline in route files**, not in separate files. This is a deliberate choice — each route owns its validation contract.

Exception: Widget config schemas for Engage-compatible types are in `components/widgets/types.ts` (type guards only, not Zod).

## Response Format

### Success responses

Always wrap data in a named property:

```typescript
// Collection
{ studios: [...] }
{ widgets: [...] }
{ runs: [...] }

// Single resource
{ studio: {...} }
{ widget: {...} }
{ presentation: {...} }

// Creation with side effects
{ widget: {...}, runId: "..." }

// Delete
{ success: true }
```

### Error responses

```typescript
// Simple error
{ error: "Unauthorized" }                          // 401
{ error: "Studio not found" }                      // 404
{ error: "Message is required" }                   // 400

// Validation error with details
{ error: "Validation error", details: {...} }      // 400

// Server error
{ error: "Failed to generate widget" }             // 500
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful GET, PUT, DELETE |
| 201 | Successful POST (resource created) |
| 400 | Validation error, missing required fields |
| 401 | No authentication (missing session) |
| 403 | Authenticated but not owner |
| 404 | Resource not found |
| 500 | Server error (catch block) |
| 502 | Upstream error (Engage API failure in deploy) |

## Database Query Patterns

### Direct Prisma (no repository pattern)

```typescript
// List with includes
const studios = await prisma.studio.findMany({
  where: {
    OR: [
      { userId },
      ...(anonymousSessionId ? [{ anonymousSessionId }] : []),
    ],
  },
  include: {
    _count: { select: { sources: true, widgets: true } },
  },
  orderBy: { updatedAt: 'desc' },
});

// Detail with full includes
const studio = await prisma.studio.findUnique({
  where: { id: studioId },
  include: {
    sources: { orderBy: { createdAt: 'desc' } },
    widgets: { orderBy: { createdAt: 'desc' } },
    presentations: { orderBy: { createdAt: 'desc' } },
    providerConfigs: true,
  },
});

// Conditional update
await prisma.studio.update({
  where: { id: studioId },
  data: {
    ...(title && { title }),
    ...(description !== undefined && { description }),
  },
});
```

### JSON column access

Prisma stores JSON columns as `Json`. Cast at read time:

```typescript
// Write
await prisma.widget.create({
  data: {
    composition: compositionData as Prisma.InputJsonValue,
    orchestration: orchestrationData as Prisma.InputJsonValue,
  },
});

// Read
const composition = widget.composition as WPSComposition | undefined;
```

## Logging

### Current pattern

Console logging with contextual prefixes:

```typescript
// Workers
console.log(`[SourceWorker] Processing source ${sourceId}`);
console.log(`[SourceWorker] Successfully processed in ${elapsed}ms`);
console.error(`[SourceWorker] Error:`, error);

// Workflows
console.log(`[generate-quiz] Step 1/2 retriever — ${results.length} chunks`);

// API routes
console.error('Error creating studio:', error);
```

### No structured logger

Unlike Engage (which has `lib/monitoring/logger.ts`), Studio uses raw `console.*`. A structured logger should be added for production.

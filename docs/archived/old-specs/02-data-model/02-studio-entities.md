# Entités Studio - Sources et Bibliothèque

## Vue d'ensemble

Le Studio est l'espace de travail principal où l'utilisateur :
1. Importe ses **Sources** (documents, médias)
2. **Converse avec l'IA** pour explorer les sources et demander des générations
3. Génère des **Widgets** à partir de ces sources
4. Organise des **Présentations** avec ces widgets

> **Interface 3 panneaux** : Sources (gauche), Chat IA (centre), Templates/Widgets (droite)

---

## Studio

### Schéma Prisma

```prisma
model Studio {
  id          String   @id @default(cuid())
  userId      String
  title       String   @db.VarChar(255)
  description String?  @db.Text
  settings    Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user          user              @relation(fields: [userId], references: [id], onDelete: Cascade)
  sources       Source[]
  conversations Conversation[]    // Historique chat IA (spécifique Studio)
  widgets       WidgetInstance[]
  presentations Presentation[]

  @@index([userId, updatedAt(sort: Desc)])
  @@map("studios")
}
```

### Interface TypeScript

```typescript
// packages/shared/src/types/studio.ts
export interface Studio {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  settings: StudioSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudioSettings {
  // Paramètres de génération par défaut
  defaultModel: 'mistral' | 'openai' | 'anthropic';
  defaultLanguage: string;

  // Préférences UI
  layout: 'three-panel' | 'two-panel';
  theme: 'light' | 'dark' | 'system';

  // Options avancées
  ragEnabled: boolean;
  ragThreshold: number; // Taille en tokens avant activation RAG

  // Branding (premium)
  customLogo?: string;
  customColors?: {
    primary: string;
    secondary: string;
  };
}

export interface StudioWithRelations extends Studio {
  sources: Source[];
  conversations: Conversation[]; // Historique chat IA
  widgets: WidgetInstance[];
  presentations: Presentation[];
}
```

### API CRUD

```typescript
// app/api/studios/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@qiplim/db';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const createStudioSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  settings: z.object({
    defaultModel: z.enum(['mistral', 'openai', 'anthropic']).optional(),
    defaultLanguage: z.string().optional(),
  }).optional(),
});

// GET /api/studios - Liste des studios de l'utilisateur
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const studios = await db.studio.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: {
          sources: true,
          widgets: true,
          presentations: true,
        },
      },
    },
  });

  return NextResponse.json(studios);
}

// POST /api/studios - Créer un studio
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const data = createStudioSchema.parse(body);

  const studio = await db.studio.create({
    data: {
      userId: session.user.id,
      title: data.title,
      description: data.description,
      settings: data.settings ?? {},
    },
  });

  return NextResponse.json(studio, { status: 201 });
}
```

---

## Conversation (Historique Chat IA)

L'entité Conversation stocke l'historique des échanges avec l'IA dans Studio. Contrairement à Engage, **Studio conserve l'historique des conversations**.

### Schéma Prisma

```prisma
model Conversation {
  id        String   @id @default(cuid())
  studioId  String
  title     String?  @db.VarChar(255)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  studio   Studio              @relation(fields: [studioId], references: [id], onDelete: Cascade)
  messages ConversationMessage[]

  @@index([studioId, updatedAt(sort: Desc)])
  @@map("conversations")
}

model ConversationMessage {
  id             String   @id @default(cuid())
  conversationId String
  role           MessageRole
  content        String   @db.Text
  metadata       Json?    // Infos supplémentaires (sources utilisées, widgets générés, etc.)
  createdAt      DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
  @@map("conversation_messages")
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}
```

### Interface TypeScript

```typescript
// packages/shared/src/types/conversation.ts
export interface Conversation {
  id: string;
  studioId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  metadata: MessageMetadata | null;
  createdAt: Date;
}

export interface MessageMetadata {
  // Sources référencées dans ce message
  sourceRefs?: string[];

  // Widgets générés suite à ce message
  generatedWidgets?: string[];

  // Extraits de sources cités
  citations?: Citation[];

  // Tokens utilisés
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface Citation {
  sourceId: string;
  chunkId: string;
  text: string;
  pageNumber?: number;
}

export interface ConversationWithMessages extends Conversation {
  messages: ConversationMessage[];
}
```

### API Conversations

```typescript
// app/api/studios/[id]/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@qiplim/db';
import { auth } from '@/lib/auth';

// GET /api/studios/:id/conversations - Liste des conversations
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversations = await db.conversation.findMany({
    where: { studioId: params.id, studio: { userId: session.user.id } },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1, // Dernier message pour preview
      },
    },
  });

  return NextResponse.json(conversations);
}

// POST /api/studios/:id/conversations - Créer une conversation
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const conversation = await db.conversation.create({
    data: {
      studioId: params.id,
      title: body.title,
    },
  });

  return NextResponse.json(conversation, { status: 201 });
}
```

### Relation avec la Génération de Widgets

Le chat IA peut déclencher la génération de widgets. Quand l'utilisateur demande "Génère un quiz sur ce document", le flow est :

1. Message USER sauvé dans la conversation
2. L'agent IA analyse la demande
3. Si génération demandée → job BullMQ créé
4. Message ASSISTANT avec `metadata.generatedWidgets` référençant le widget créé

```typescript
// Exemple de message avec widget généré
const assistantMessage: ConversationMessage = {
  id: 'msg_123',
  conversationId: 'conv_456',
  role: 'ASSISTANT',
  content: "J'ai généré un quiz de 5 questions basé sur le chapitre 3 de votre document.",
  metadata: {
    sourceRefs: ['source_789'],
    generatedWidgets: ['widget_abc'],
    citations: [
      {
        sourceId: 'source_789',
        chunkId: 'chunk_001',
        text: 'Les trois piliers du développement durable...',
        pageNumber: 15,
      },
    ],
  },
  createdAt: new Date(),
};
```

---

## Source

### Schéma Prisma

```prisma
model Source {
  id        String       @id @default(cuid())
  studioId  String
  filename  String       @db.VarChar(255)
  s3Key     String?      @db.VarChar(500)
  url       String       @db.Text
  mimeType  String       @db.VarChar(100)
  size      Int
  status    SourceStatus @default(PENDING)
  analysis  Json?
  createdAt DateTime     @default(now())

  studio Studio        @relation(fields: [studioId], references: [id], onDelete: Cascade)
  chunks SourceChunk[]

  @@index([studioId, createdAt(sort: Desc)])
  @@index([status])
  @@map("sources")
}

enum SourceStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

### Interface TypeScript

```typescript
// packages/shared/src/types/source.ts
export interface Source {
  id: string;
  studioId: string;
  filename: string;
  s3Key: string | null;
  url: string;
  mimeType: string;
  size: number;
  status: SourceStatus;
  analysis: SourceAnalysis | null;
  createdAt: Date;
}

export type SourceStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface SourceAnalysis {
  // Résultat de l'analyse IA
  title: string;
  summary: string;
  themes: string[];
  concepts: Concept[];
  keyPoints: string[];

  // Métadonnées extraites
  language: string;
  wordCount: number;
  pageCount?: number;

  // Suggestions de widgets
  suggestedWidgets: SuggestedWidget[];
}

export interface Concept {
  name: string;
  description: string;
  relevance: number; // 0-1
}

export interface SuggestedWidget {
  templateId: string;
  title: string;
  description: string;
  confidence: number; // 0-1
  inputs: Record<string, unknown>;
}

// Types de sources supportés
export const SUPPORTED_MIME_TYPES = {
  // Documents
  'application/pdf': { extension: 'pdf', category: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extension: 'docx', category: 'document'
  },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    extension: 'pptx', category: 'presentation'
  },
  'text/plain': { extension: 'txt', category: 'document' },
  'text/markdown': { extension: 'md', category: 'document' },

  // Tableurs
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    extension: 'xlsx', category: 'spreadsheet'
  },
  'text/csv': { extension: 'csv', category: 'spreadsheet' },

  // Audio
  'audio/mpeg': { extension: 'mp3', category: 'audio' },
  'audio/wav': { extension: 'wav', category: 'audio' },

  // Vidéo
  'video/mp4': { extension: 'mp4', category: 'video' },
} as const;

export type SupportedMimeType = keyof typeof SUPPORTED_MIME_TYPES;
```

### API Upload

```typescript
// app/api/studios/[id]/sources/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@qiplim/db';
import { documentQueue } from '@/lib/queue';
import { uploadFile, getSignedUploadUrl } from '@/lib/storage';

// POST /api/studios/:id/sources - Upload une source
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Vérifier que le studio appartient à l'utilisateur
  const studio = await db.studio.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!studio) {
    return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Valider le type de fichier
  if (!SUPPORTED_MIME_TYPES[file.type as SupportedMimeType]) {
    return NextResponse.json(
      { error: 'Unsupported file type' },
      { status: 400 }
    );
  }

  // Upload vers S3
  const buffer = Buffer.from(await file.arrayBuffer());
  const s3Key = `studios/${params.id}/sources/${Date.now()}-${file.name}`;
  const url = await uploadFile(s3Key, buffer, file.type);

  // Créer l'enregistrement source
  const source = await db.source.create({
    data: {
      studioId: params.id,
      filename: file.name,
      s3Key,
      url,
      mimeType: file.type,
      size: file.size,
      status: 'PENDING',
    },
  });

  // Enqueue le job de parsing
  await documentQueue.add('parse', {
    type: 'parse',
    sourceId: source.id,
    userId: session.user.id,
  });

  return NextResponse.json(source, { status: 201 });
}

// GET /api/studios/:id/sources - Liste des sources
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sources = await db.source.findMany({
    where: { studioId: params.id, studio: { userId: session.user.id } },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { chunks: true },
      },
    },
  });

  return NextResponse.json(sources);
}
```

---

## SourceChunk

### Schéma Prisma

```prisma
model SourceChunk {
  id         String                       @id @default(cuid())
  sourceId   String
  content    String                       @db.Text
  embedding  Unsupported("vector(1024)")?
  metadata   Json?
  pageNumber Int?
  chunkIndex Int                          @default(0)
  createdAt  DateTime                     @default(now())

  source Source @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  @@index([sourceId])
  @@map("source_chunks")
}
```

### Interface TypeScript

```typescript
// packages/shared/src/types/chunk.ts
export interface SourceChunk {
  id: string;
  sourceId: string;
  content: string;
  embedding?: number[]; // vector(1024)
  metadata: ChunkMetadata | null;
  pageNumber: number | null;
  chunkIndex: number;
  createdAt: Date;
}

export interface ChunkMetadata {
  // Position dans le document
  startOffset?: number;
  endOffset?: number;

  // Contexte
  section?: string;
  subsection?: string;

  // Éléments spéciaux
  hasTable?: boolean;
  hasImage?: boolean;
  hasCode?: boolean;

  // Stats
  tokenCount: number;
  wordCount: number;
}
```

### Recherche Sémantique

```typescript
// lib/rag/retriever.ts
import { db } from '@qiplim/db';
import { generateEmbedding } from './embeddings';

export interface RetrievalResult {
  chunkId: string;
  content: string;
  metadata: ChunkMetadata | null;
  similarity: number;
  sourceId: string;
  sourceName: string;
}

export async function retrieveRelevantChunks(
  query: string,
  sourceIds: string[],
  options: {
    topK?: number;
    minSimilarity?: number;
  } = {}
): Promise<RetrievalResult[]> {
  const { topK = 5, minSimilarity = 0.7 } = options;

  // Générer l'embedding de la requête
  const queryEmbedding = await generateEmbedding(query);

  // Recherche vectorielle avec pgvector
  const results = await db.$queryRaw<RetrievalResult[]>`
    SELECT
      sc.id as "chunkId",
      sc.content,
      sc.metadata,
      1 - (sc.embedding <=> ${queryEmbedding}::vector) as similarity,
      sc.source_id as "sourceId",
      s.filename as "sourceName"
    FROM source_chunks sc
    JOIN sources s ON s.id = sc.source_id
    WHERE sc.source_id = ANY(${sourceIds})
      AND sc.embedding IS NOT NULL
      AND 1 - (sc.embedding <=> ${queryEmbedding}::vector) >= ${minSimilarity}
    ORDER BY sc.embedding <=> ${queryEmbedding}::vector
    LIMIT ${topK}
  `;

  return results;
}

// Mode "deep" : récupérer tout le contenu d'une source
export async function getFullSourceContent(sourceId: string): Promise<string> {
  const chunks = await db.sourceChunk.findMany({
    where: { sourceId },
    orderBy: { chunkIndex: 'asc' },
    select: { content: true },
  });

  return chunks.map((c) => c.content).join('\n\n');
}
```

---

## Bibliothèque (Vue agrégée)

La bibliothèque est une vue agrégée des widgets générés dans le Studio.

```typescript
// lib/api/library.ts
export interface LibraryItem {
  id: string;
  type: 'widget';
  widget: WidgetInstance & {
    template: WidgetTemplate;
  };
  usedInPresentations: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export async function getStudioLibrary(studioId: string): Promise<LibraryItem[]> {
  const widgets = await db.widgetInstance.findMany({
    where: { studioId },
    include: {
      template: true,
      presentationWidgets: {
        select: {
          presentation: {
            select: {
              id: true,
              sessions: {
                select: { startedAt: true },
                orderBy: { startedAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return widgets.map((widget) => {
    const sessions = widget.presentationWidgets.flatMap(
      (pw) => pw.presentation.sessions
    );
    const lastSession = sessions[0];

    return {
      id: widget.id,
      type: 'widget' as const,
      widget: {
        ...widget,
        presentationWidgets: undefined,
      },
      usedInPresentations: widget.presentationWidgets.length,
      lastUsedAt: lastSession?.startedAt ?? null,
      createdAt: widget.createdAt,
    };
  });
}
```

### Composant React

```tsx
// components/studio/library-panel.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@qiplim/ui';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LibraryPanelProps {
  studioId: string;
  onSelectWidget: (widgetId: string) => void;
}

export function LibraryPanel({ studioId, onSelectWidget }: LibraryPanelProps) {
  const { data: items, isLoading } = useQuery({
    queryKey: ['studio', studioId, 'library'],
    queryFn: () => fetch(`/api/studios/${studioId}/library`).then((r) => r.json()),
  });

  if (isLoading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="space-y-2 p-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase">
        Bibliothèque
      </h3>

      {items?.map((item: LibraryItem) => (
        <Card
          key={item.id}
          className="p-3 cursor-pointer hover:bg-accent"
          onClick={() => onSelectWidget(item.id)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {getWidgetIcon(item.widget.template.category)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {item.widget.activitySpec?.title || 'Sans titre'}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.widget.template.name} •
                {formatDistanceToNow(item.createdAt, {
                  addSuffix: true,
                  locale: fr
                })}
              </p>
            </div>
            {item.usedInPresentations > 0 && (
              <span className="text-xs bg-primary/10 px-2 py-0.5 rounded">
                {item.usedInPresentations} présentations
              </span>
            )}
          </div>
        </Card>
      ))}

      {items?.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun widget généré. Utilisez le chat IA pour créer votre premier widget.
        </p>
      )}
    </div>
  );
}

function getWidgetIcon(category: string): string {
  const icons: Record<string, string> = {
    QUIZ: '❓',
    POLL: '📊',
    WORDCLOUD: '☁️',
    POSTIT: '📝',
    ROLEPLAY: '🎭',
    FLASHCARD: '📚',
  };
  return icons[category] || '🧩';
}
```

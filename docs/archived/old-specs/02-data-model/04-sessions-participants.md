# Sessions Live et Participants

## Vue d'ensemble

Le système de sessions permet d'animer des présentations interactives en temps réel :

1. Une **Présentation** contient des widgets ordonnés
2. Une **LiveSession** joue une présentation avec des participants
3. Les **Participants** interagissent via des réponses et events

---

## Presentation

### Schéma Prisma

```prisma
model Presentation {
  id        String   @id @default(cuid())
  studioId  String
  name      String   @db.VarChar(255)
  settings  Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  studio   Studio               @relation(fields: [studioId], references: [id], onDelete: Cascade)
  widgets  PresentationWidget[]
  sessions LiveSession[]

  @@index([studioId, updatedAt(sort: Desc)])
  @@map("presentations")
}

model PresentationWidget {
  id                 String   @id @default(cuid())
  presentationId     String
  widgetInstanceId   String
  order              Int      @default(0)
  transitionSettings Json     @default("{}")

  presentation Presentation   @relation(fields: [presentationId], references: [id], onDelete: Cascade)
  widget       WidgetInstance @relation(fields: [widgetInstanceId], references: [id], onDelete: Cascade)

  @@unique([presentationId, widgetInstanceId])
  @@index([presentationId, order])
  @@map("presentation_widgets")
}
```

### Interface TypeScript

```typescript
// packages/shared/src/types/presentation.ts
export interface Presentation {
  id: string;
  studioId: string;
  name: string;
  settings: PresentationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface PresentationSettings {
  // Apparence
  theme: 'light' | 'dark' | 'custom';
  customColors?: {
    primary: string;
    background: string;
    text: string;
  };

  // Comportement
  autoAdvance: boolean;
  transitionDuration: number; // ms

  // Branding
  showLogo: boolean;
  logoUrl?: string;
  showQRCode: boolean;
}

export interface PresentationWidget {
  id: string;
  presentationId: string;
  widgetInstanceId: string;
  order: number;
  transitionSettings: TransitionSettings;
}

export interface TransitionSettings {
  type: 'none' | 'fade' | 'slide';
  duration: number;
  direction?: 'left' | 'right' | 'up' | 'down';
}

export interface PresentationWithWidgets extends Presentation {
  widgets: Array<
    PresentationWidget & {
      widget: WidgetInstance & {
        template: WidgetTemplate;
      };
    }
  >;
}
```

---

## LiveSession

### Schéma Prisma

```prisma
model LiveSession {
  id                String       @id @default(cuid())
  presentationId    String
  code              String       @unique @db.VarChar(6)
  qrCode            String?      @db.Text
  shortUrl          String?      @db.VarChar(100)
  state             SessionState @default(WAITING)
  presenterToken    String       @unique @db.VarChar(64)
  currentWidgetIndex Int         @default(0)
  participantCount  Int          @default(0)
  metadata          Json         @default("{}")
  createdAt         DateTime     @default(now())
  startedAt         DateTime?
  endedAt           DateTime?

  presentation Presentation   @relation(fields: [presentationId], references: [id], onDelete: Cascade)
  participants Participant[]
  events       SessionEvent[]

  @@index([code])
  @@index([presenterToken])
  @@index([presentationId, startedAt(sort: Desc)])
  @@map("live_sessions")
}

enum SessionState {
  WAITING  // En attente de démarrage
  ACTIVE   // En cours
  PAUSED   // En pause
  CLOSED   // Terminée
}
```

### Interface TypeScript

```typescript
// packages/shared/src/types/session.ts
export interface LiveSession {
  id: string;
  presentationId: string;
  code: string;
  qrCode: string | null;
  shortUrl: string | null;
  state: SessionState;
  presenterToken: string;
  currentWidgetIndex: number;
  participantCount: number;
  metadata: SessionMetadata;
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
}

export type SessionState = 'WAITING' | 'ACTIVE' | 'PAUSED' | 'CLOSED';

export interface SessionMetadata {
  // Informations de la session
  title?: string;
  description?: string;

  // Configuration
  maxParticipants?: number;
  requireName: boolean;
  allowLateJoin: boolean;

  // Stats temps réel (mises à jour via Redis)
  currentActivityId?: string;
  currentActivityState?: 'waiting' | 'active' | 'completed';
}

export interface LiveSessionWithPresentation extends LiveSession {
  presentation: PresentationWithWidgets;
}

// Réponse création de session
export interface CreateSessionResponse {
  session: LiveSession;
  joinUrl: string;
  qrCodeDataUrl: string;
}
```

### Génération de Code PIN

```typescript
// lib/session/code-generator.ts
import { db } from '@qiplim/db';
import { randomInt } from 'crypto';

export async function generateUniqueCode(): Promise<string> {
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    // Générer un code à 6 chiffres
    const code = String(randomInt(100000, 999999));

    // Vérifier l'unicité
    const existing = await db.liveSession.findFirst({
      where: {
        code,
        state: { not: 'CLOSED' },
      },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error('Failed to generate unique code');
}

export function generatePresenterToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### Génération QR Code

```typescript
// lib/session/qr-code.ts
import QRCode from 'qrcode';

export async function generateQRCode(joinUrl: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(joinUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 400,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  return dataUrl;
}

export function getJoinUrl(code: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
  return `${baseUrl}/join/${code}`;
}
```

---

## Participant

### Schéma Prisma

```prisma
model Participant {
  id           String          @id @default(cuid())
  sessionId    String
  displayName  String          @db.VarChar(100)
  role         ParticipantRole @default(VIEWER)
  metadata     Json            @default("{}")
  joinedAt     DateTime        @default(now())
  lastActivity DateTime        @default(now())
  isActive     Boolean         @default(true)

  session   LiveSession        @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  responses ActivityResponse[]
  events    SessionEvent[]

  @@index([sessionId, isActive])
  @@map("participants")
}

enum ParticipantRole {
  VIEWER    // Participant standard
  SPEAKER   // Présentateur
  OBSERVER  // Observateur (pas d'interaction)
  COACH     // Coach (peut voir les stats individuelles)
}
```

### Interface TypeScript

```typescript
// packages/shared/src/types/participant.ts
export interface Participant {
  id: string;
  sessionId: string;
  displayName: string;
  role: ParticipantRole;
  metadata: ParticipantMetadata;
  joinedAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

export type ParticipantRole = 'VIEWER' | 'SPEAKER' | 'OBSERVER' | 'COACH';

export interface ParticipantMetadata {
  // Identité (optionnel)
  email?: string;
  avatarUrl?: string;

  // Groupe (pour activités en équipe)
  groupId?: string;
  groupName?: string;

  // Device info
  userAgent?: string;
  platform?: string;

  // Stats session
  totalResponses?: number;
  totalScore?: number;
}
```

---

## ActivityResponse

### Schéma Prisma

```prisma
model ActivityResponse {
  id               String   @id @default(cuid())
  sessionId        String
  widgetInstanceId String
  participantId    String
  response         Json
  score            Int?
  isCorrect        Boolean?
  submittedAt      DateTime @default(now())

  widget      WidgetInstance @relation(fields: [widgetInstanceId], references: [id], onDelete: Cascade)
  participant Participant    @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@index([sessionId, widgetInstanceId])
  @@index([participantId])
  @@map("activity_responses")
}
```

### Structures Response par Type

```typescript
// packages/shared/src/types/response.ts
export interface ActivityResponse {
  id: string;
  sessionId: string;
  widgetInstanceId: string;
  participantId: string;
  response: ResponsePayload;
  score: number | null;
  isCorrect: boolean | null;
  submittedAt: Date;
}

export type ResponsePayload =
  | QuizResponse
  | PollResponse
  | WordcloudResponse
  | PostitResponse
  | RoleplayResponse;

// Quiz
export interface QuizResponse {
  type: 'quiz';
  questionId: string;
  selectedOptionId: string;
  timeSpentMs: number;
}

// Poll
export interface PollResponse {
  type: 'poll';
  selectedOptionIds: string[]; // Peut être multiple
}

// Wordcloud
export interface WordcloudResponse {
  type: 'wordcloud';
  words: string[];
}

// Post-it
export interface PostitResponse {
  type: 'postit';
  content: string;
  color: string;
  position?: { x: number; y: number };
}

// Roleplay
export interface RoleplayResponse {
  type: 'roleplay';
  roleId: string;
  message: string;
  conversationId: string;
}
```

---

## SessionEvent

### Schéma Prisma

```prisma
model SessionEvent {
  id               String   @id @default(cuid())
  sessionId        String
  participantId    String?
  widgetInstanceId String?
  type             String   @db.VarChar(50)
  scope            Json     @default("{}")
  payload          Json
  occurredAt       DateTime @default(now())

  session     LiveSession     @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  participant Participant?    @relation(fields: [participantId], references: [id], onDelete: SetNull)
  widget      WidgetInstance? @relation(fields: [widgetInstanceId], references: [id], onDelete: SetNull)

  @@index([sessionId, occurredAt(sort: Desc)])
  @@index([sessionId, widgetInstanceId, type])
  @@map("session_events")
}
```

### Types d'Events

```typescript
// packages/shared/src/types/event.ts
export interface SessionEvent {
  id: string;
  sessionId: string;
  participantId: string | null;
  widgetInstanceId: string | null;
  type: EventType;
  scope: EventScope;
  payload: EventPayload;
  occurredAt: Date;
}

export type EventType =
  // Session lifecycle
  | 'session.started'
  | 'session.paused'
  | 'session.resumed'
  | 'session.ended'
  // Participants
  | 'participant.joined'
  | 'participant.left'
  | 'participant.renamed'
  // Navigation
  | 'widget.activated'
  | 'widget.deactivated'
  // Activities
  | 'activity.started'
  | 'activity.completed'
  | 'response.submitted'
  // Interactions
  | 'vote.cast'
  | 'word.submitted'
  | 'postit.created'
  | 'postit.voted'
  | 'message.sent'
  // Results
  | 'results.revealed'
  | 'leaderboard.updated';

export interface EventScope {
  sessionId: string;
  widgetInstanceId?: string;
  groupId?: string;
}

export type EventPayload = Record<string, unknown>;

// Exemples de payloads
export interface SessionStartedPayload {
  presentationId: string;
  participantCount: number;
}

export interface ParticipantJoinedPayload {
  displayName: string;
  role: ParticipantRole;
  participantCount: number;
}

export interface ResponseSubmittedPayload {
  responseId: string;
  questionId?: string;
  isCorrect?: boolean;
  score?: number;
  timeSpentMs?: number;
}

export interface LeaderboardUpdatedPayload {
  leaderboard: Array<{
    participantId: string;
    displayName: string;
    score: number;
    rank: number;
  }>;
}
```

---

## API Sessions

```typescript
// app/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@qiplim/db';
import { generateUniqueCode, generatePresenterToken } from '@/lib/session/code-generator';
import { generateQRCode, getJoinUrl } from '@/lib/session/qr-code';

// POST /api/sessions - Créer une session
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { presentationId } = await req.json();

  // Vérifier que la présentation appartient à l'utilisateur
  const presentation = await db.presentation.findFirst({
    where: {
      id: presentationId,
      studio: { userId: session.user.id },
    },
    include: {
      widgets: {
        include: {
          widget: {
            include: { template: true },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!presentation) {
    return NextResponse.json({ error: 'Presentation not found' }, { status: 404 });
  }

  // Générer le code et le token
  const code = await generateUniqueCode();
  const presenterToken = generatePresenterToken();
  const joinUrl = getJoinUrl(code);
  const qrCode = await generateQRCode(joinUrl);

  // Créer la session
  const liveSession = await db.liveSession.create({
    data: {
      presentationId,
      code,
      presenterToken,
      qrCode,
      shortUrl: joinUrl,
      state: 'WAITING',
      metadata: {
        title: presentation.name,
        requireName: true,
        allowLateJoin: true,
      },
    },
  });

  return NextResponse.json({
    session: liveSession,
    joinUrl,
    qrCodeDataUrl: qrCode,
  });
}

// app/api/sessions/[code]/join/route.ts
export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const { displayName } = await req.json();

  // Trouver la session active
  const session = await db.liveSession.findFirst({
    where: {
      code: params.code,
      state: { in: ['WAITING', 'ACTIVE', 'PAUSED'] },
    },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found or closed' }, { status: 404 });
  }

  // Créer le participant
  const participant = await db.participant.create({
    data: {
      sessionId: session.id,
      displayName: displayName || `Participant ${session.participantCount + 1}`,
      role: 'VIEWER',
    },
  });

  // Mettre à jour le compteur
  await db.liveSession.update({
    where: { id: session.id },
    data: { participantCount: { increment: 1 } },
  });

  // Émettre l'event via Redis pub/sub
  await publishEvent(session.id, {
    type: 'participant.joined',
    participantId: participant.id,
    payload: {
      displayName: participant.displayName,
      role: participant.role,
      participantCount: session.participantCount + 1,
    },
  });

  return NextResponse.json({
    participant,
    session: {
      id: session.id,
      state: session.state,
      currentWidgetIndex: session.currentWidgetIndex,
    },
  });
}
```

---

## Calcul des Métriques

```typescript
// lib/session/metrics.ts
export interface SessionMetrics {
  participationRate: number; // % participants ayant interagi
  completionRate: number; // % ayant complété toutes les activités
  avgTimeToFirstAction: number; // Temps moyen avant 1ère action (ms)
  engagementIntensity: number; // Interactions par participant par minute
  avgScore: number | null; // Score moyen (si applicable)
}

export async function calculateSessionMetrics(
  sessionId: string
): Promise<SessionMetrics> {
  const session = await db.liveSession.findUnique({
    where: { id: sessionId },
    include: {
      participants: true,
      events: true,
    },
  });

  if (!session) throw new Error('Session not found');

  const participants = session.participants;
  const events = session.events;

  // Participants ayant soumis au moins une réponse
  const activeParticipantIds = new Set(
    events
      .filter((e) => e.type === 'response.submitted')
      .map((e) => e.participantId)
  );

  const participationRate =
    participants.length > 0
      ? (activeParticipantIds.size / participants.length) * 100
      : 0;

  // Temps avant première action par participant
  const firstActions = new Map<string, number>();
  for (const p of participants) {
    const firstEvent = events.find(
      (e) => e.participantId === p.id && e.type === 'response.submitted'
    );
    if (firstEvent) {
      const timeToAction =
        firstEvent.occurredAt.getTime() - p.joinedAt.getTime();
      firstActions.set(p.id, timeToAction);
    }
  }

  const avgTimeToFirstAction =
    firstActions.size > 0
      ? Array.from(firstActions.values()).reduce((a, b) => a + b, 0) /
        firstActions.size
      : 0;

  // Intensité d'engagement
  const sessionDuration = session.endedAt
    ? (session.endedAt.getTime() - session.startedAt!.getTime()) / 60000
    : 0;

  const totalInteractions = events.filter((e) =>
    e.type.startsWith('response.') ||
    e.type.startsWith('vote.') ||
    e.type.startsWith('word.') ||
    e.type.startsWith('postit.') ||
    e.type.startsWith('message.')
  ).length;

  const engagementIntensity =
    sessionDuration > 0 && participants.length > 0
      ? totalInteractions / participants.length / sessionDuration
      : 0;

  // Score moyen (pour les quiz)
  const responses = await db.activityResponse.findMany({
    where: { sessionId },
    select: { score: true },
  });

  const scores = responses.filter((r) => r.score !== null).map((r) => r.score!);
  const avgScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : null;

  // Taux de complétion
  // (nécessite de savoir combien d'activités il y a dans la présentation)
  const completionRate = 0; // TODO: implémenter

  return {
    participationRate,
    completionRate,
    avgTimeToFirstAction,
    engagementIntensity,
    avgScore,
  };
}
```

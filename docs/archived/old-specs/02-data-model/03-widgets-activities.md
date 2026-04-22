# Widgets et Activités

## Vue d'ensemble

Le système de widgets de Studio est basé sur une architecture **Template → Instance** :

- **WidgetTemplate** : Définition générique d'un type de widget (Quiz, Slides, etc.)
- **WidgetInstance** : Instance concrète générée par l'IA à partir d'un template

### Deux Catégories de Widgets

Studio supporte **2 catégories** de widgets, contrairement à Engage qui n'a que des activités :

| Catégorie | Description | Jouable en session |
|-----------|-------------|:------------------:|
| **ACTIVITY** | Widgets interactifs avec participation | ✅ Oui |
| **PEDAGOGICAL_CONTENT** | Contenus pédagogiques générés | ❌ Non (affichage) |

#### 1. Activités (ACTIVITY)

Widgets interactifs jouables en session live avec les participants :

| Type | Description |
|------|-------------|
| `QUIZ` | Questions à choix multiples avec scoring et leaderboard |
| `POLL` | Sondages simples |
| `WORDCLOUD` | Nuage de mots collaboratif |
| `POSTIT` | Post-its avec catégorisation et vote |
| `ROLEPLAY` | Jeux de rôle avec agent IA conversationnel |

#### 2. Contenus Pédagogiques (PEDAGOGICAL_CONTENT)

Widgets de contenu générés depuis les sources, non interactifs :

| Type | Description |
|------|-------------|
| `SLIDES` | Diaporama de présentation |
| `COURSE_PLAN` | Plan de cours structuré |
| `COURSE_CONTENT` | Textes, résumés, synthèses |
| `PEDAGOGICAL_SEQUENCE` | Déroulé pédagogique / timeline |
| `WEBPAGE` | Contenu exportable en page web |
| `FLASHCARD` | Cartes de révision |
| `TIMELINE` | Frise chronologique |
| `MINDMAP` | Carte mentale |

---

## WidgetTemplate

### Schéma Prisma

```prisma
model WidgetTemplate {
  id             String            @id @default(cuid())
  name           String            @db.VarChar(100)
  description    String?           @db.Text
  categoryType   WidgetCategoryType // ACTIVITY ou PEDAGOGICAL_CONTENT
  widgetType     WidgetType        // Type spécifique (QUIZ, SLIDES, etc.)
  inputsSchema   Json              // JSON Schema des inputs
  promptTemplate String            @db.Text
  outputSchema   Json              // JSON Schema de l'output
  views          Json              // Configuration des 3 vues
  isOfficial     Boolean           @default(false)
  isPublic       Boolean           @default(true)
  authorId       String?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  instances WidgetInstance[]
  author    user?            @relation(fields: [authorId], references: [id])

  @@index([categoryType, widgetType])
  @@index([isOfficial, isPublic])
  @@map("widget_templates")
}

// Catégorie principale
enum WidgetCategoryType {
  ACTIVITY            // Widgets interactifs jouables en session
  PEDAGOGICAL_CONTENT // Contenus pédagogiques (non interactifs)
}

// Types de widgets
enum WidgetType {
  // === ACTIVITÉS (jouables en session) ===
  QUIZ
  POLL
  WORDCLOUD
  POSTIT
  ROLEPLAY

  // === CONTENUS PÉDAGOGIQUES ===
  SLIDES                // Diaporama
  COURSE_PLAN           // Plan de cours
  COURSE_CONTENT        // Contenus de cours
  PEDAGOGICAL_SEQUENCE  // Déroulé pédagogique
  WEBPAGE               // Page web exportable
  FLASHCARD             // Cartes de révision
  TIMELINE              // Frise chronologique
  MINDMAP               // Carte mentale
}
```

### Interface TypeScript

```typescript
// packages/shared/src/types/widget-template.ts
export interface WidgetTemplate {
  id: string;
  name: string;
  description: string | null;
  categoryType: WidgetCategoryType;
  widgetType: WidgetType;
  inputsSchema: InputsSchema;
  promptTemplate: string;
  outputSchema: OutputSchema;
  views: ViewsConfig;
  isOfficial: boolean;
  isPublic: boolean;
  authorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Catégorie principale
export type WidgetCategoryType = 'ACTIVITY' | 'PEDAGOGICAL_CONTENT';

// Types de widgets
export type WidgetType =
  // Activités
  | 'QUIZ'
  | 'POLL'
  | 'WORDCLOUD'
  | 'POSTIT'
  | 'ROLEPLAY'
  // Contenus pédagogiques
  | 'SLIDES'
  | 'COURSE_PLAN'
  | 'COURSE_CONTENT'
  | 'PEDAGOGICAL_SEQUENCE'
  | 'WEBPAGE'
  | 'FLASHCARD'
  | 'TIMELINE'
  | 'MINDMAP';

// Mapping type → catégorie
export const WIDGET_CATEGORY_MAP: Record<WidgetType, WidgetCategoryType> = {
  QUIZ: 'ACTIVITY',
  POLL: 'ACTIVITY',
  WORDCLOUD: 'ACTIVITY',
  POSTIT: 'ACTIVITY',
  ROLEPLAY: 'ACTIVITY',
  SLIDES: 'PEDAGOGICAL_CONTENT',
  COURSE_PLAN: 'PEDAGOGICAL_CONTENT',
  COURSE_CONTENT: 'PEDAGOGICAL_CONTENT',
  PEDAGOGICAL_SEQUENCE: 'PEDAGOGICAL_CONTENT',
  WEBPAGE: 'PEDAGOGICAL_CONTENT',
  FLASHCARD: 'PEDAGOGICAL_CONTENT',
  TIMELINE: 'PEDAGOGICAL_CONTENT',
  MINDMAP: 'PEDAGOGICAL_CONTENT',
};

// Helper pour vérifier si un widget est jouable en session
export function isPlayableInSession(type: WidgetType): boolean {
  return WIDGET_CATEGORY_MAP[type] === 'ACTIVITY';
}

// Schema des inputs configurables par l'utilisateur
export interface InputsSchema {
  type: 'object';
  properties: Record<string, InputProperty>;
  required?: string[];
}

export interface InputProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  items?: InputProperty;
}

// Configuration des 3 vues
export interface ViewsConfig {
  edit: ViewDefinition;
  speaker: ViewDefinition;
  viewer: ViewDefinition;
}

export interface ViewDefinition {
  layout: 'full' | 'split' | 'cards';
  components: string[]; // Composants A2UI autorisés
  actions: string[]; // Actions autorisées
}
```

### Templates Officiels

```typescript
// packages/ai/src/templates/quiz.template.ts
export const quizTemplate: WidgetTemplate = {
  id: 'official-quiz',
  name: 'Quiz',
  description: 'Questions à choix multiples avec scoring et leaderboard',
  category: 'QUIZ',
  inputsSchema: {
    type: 'object',
    properties: {
      questionCount: {
        type: 'number',
        title: 'Nombre de questions',
        description: 'Nombre de questions à générer',
        default: 5,
        minimum: 1,
        maximum: 20,
      },
      answersPerQuestion: {
        type: 'number',
        title: 'Réponses par question',
        default: 4,
        minimum: 2,
        maximum: 6,
      },
      difficulty: {
        type: 'string',
        title: 'Difficulté',
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
      },
      timerPerQuestion: {
        type: 'number',
        title: 'Timer par question (secondes)',
        default: 30,
        minimum: 10,
        maximum: 120,
      },
      showLeaderboard: {
        type: 'boolean',
        title: 'Afficher le leaderboard',
        default: true,
      },
      shuffleQuestions: {
        type: 'boolean',
        title: 'Mélanger les questions',
        default: false,
      },
      shuffleAnswers: {
        type: 'boolean',
        title: 'Mélanger les réponses',
        default: true,
      },
    },
    required: ['questionCount'],
  },
  promptTemplate: `Tu es un expert en création de quiz pédagogiques.

Génère un quiz basé sur le contenu suivant :
{{context}}

Configuration :
- Nombre de questions : {{questionCount}}
- Réponses par question : {{answersPerQuestion}}
- Difficulté : {{difficulty}}
- Langue : {{language}}

Instructions :
1. Crée des questions variées (Choix multiple, Vrai/Faux, Classement si approprié)
2. Une seule réponse correcte par question
3. Les distracteurs doivent être plausibles
4. Ajoute une explication pour chaque réponse

Retourne un JSON valide avec la structure ActivitySpec.`,

  outputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            type: { type: 'string', enum: ['mcq', 'true_false', 'ranking'] },
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  text: { type: 'string' },
                  isCorrect: { type: 'boolean' },
                },
              },
            },
            explanation: { type: 'string' },
            points: { type: 'number' },
          },
        },
      },
    },
  },
  views: {
    edit: {
      layout: 'full',
      components: ['QuizEditor', 'QuestionList', 'QuestionForm'],
      actions: ['addQuestion', 'editQuestion', 'deleteQuestion', 'reorder'],
    },
    speaker: {
      layout: 'split',
      components: ['QuizQuestion', 'QuizResults', 'Timer', 'Leaderboard'],
      actions: ['nextQuestion', 'revealAnswer', 'showLeaderboard', 'endQuiz'],
    },
    viewer: {
      layout: 'full',
      components: ['QuizQuestion', 'Timer', 'ProgressBar'],
      actions: ['submitAnswer'],
    },
  },
  isOfficial: true,
  isPublic: true,
  authorId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

---

## WidgetInstance

### Schéma Prisma

```prisma
model WidgetInstance {
  id           String   @id @default(cuid())
  studioId     String
  templateId   String
  title        String?  @db.VarChar(255)
  inputs       Json     @default("{}")
  sourceRefs   Json     @default("[]") // Array of source IDs
  activitySpec Json     // Données générées par l'IA
  a2uiViews    Json     // Vues A2UI générées
  version      Int      @default(1)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  studio              Studio               @relation(fields: [studioId], references: [id], onDelete: Cascade)
  template            WidgetTemplate       @relation(fields: [templateId], references: [id])
  presentationWidgets PresentationWidget[]
  responses           ActivityResponse[]

  @@index([studioId, createdAt(sort: Desc)])
  @@index([templateId])
  @@map("widget_instances")
}
```

### Interface TypeScript

```typescript
// packages/shared/src/types/widget-instance.ts
export interface WidgetInstance {
  id: string;
  studioId: string;
  templateId: string;
  title: string | null;
  inputs: Record<string, unknown>;
  sourceRefs: string[];
  activitySpec: ActivitySpec;
  a2uiViews: A2UIViews;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetInstanceWithTemplate extends WidgetInstance {
  template: WidgetTemplate;
}

// Specification de l'activité (générée par l'IA)
export type ActivitySpec =
  | QuizActivitySpec
  | PollActivitySpec
  | WordcloudActivitySpec
  | PostitActivitySpec
  | RoleplayActivitySpec;

// Quiz
export interface QuizActivitySpec {
  type: 'quiz';
  title: string;
  description: string;
  questions: QuizQuestion[];
  settings: {
    timerPerQuestion: number;
    showLeaderboard: boolean;
    shuffleQuestions: boolean;
    shuffleAnswers: boolean;
  };
}

export interface QuizQuestion {
  id: string;
  text: string;
  type: 'mcq' | 'true_false' | 'ranking';
  options: QuizOption[];
  explanation?: string;
  points: number;
  mediaUrl?: string;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

// Poll / Sondage
export interface PollActivitySpec {
  type: 'poll';
  title: string;
  question: string;
  options: PollOption[];
  settings: {
    allowMultiple: boolean;
    showResultsLive: boolean;
    anonymous: boolean;
  };
}

export interface PollOption {
  id: string;
  text: string;
  color?: string;
}

// Wordcloud
export interface WordcloudActivitySpec {
  type: 'wordcloud';
  title: string;
  question: string;
  settings: {
    maxWordsPerParticipant: number;
    minWordLength: number;
    groupSimilar: boolean;
    anonymousSubmission: boolean;
  };
}

// Post-it
export interface PostitActivitySpec {
  type: 'postit';
  title: string;
  prompt: string;
  categories?: string[];
  settings: {
    mode: 'individual' | 'group';
    allowVoting: boolean;
    votesPerParticipant: number;
    anonymous: boolean;
    aiCategorization: boolean;
    generateMatrix: boolean;
  };
}

// Roleplay
export interface RoleplayActivitySpec {
  type: 'roleplay';
  title: string;
  scenario: string;
  roles: Role[];
  settings: {
    mode: 'individual' | 'group';
    recordConversations: boolean;
    maxDuration: number;
    aiModel: string;
    temperature: number;
  };
}

export interface Role {
  id: string;
  name: string;
  description: string;
  objectives: string[];
  systemPrompt: string;
}
```

---

## Configuration JSONB par Type

### Quiz Config

```typescript
// Structure stockée dans inputs
interface QuizInputs {
  questionCount: number;
  answersPerQuestion: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timerPerQuestion: number;
  showLeaderboard: boolean;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  language: string;
  customInstructions?: string;
}

// Structure générée dans activitySpec
interface QuizActivitySpec {
  type: 'quiz';
  title: string;
  description: string;
  questions: Array<{
    id: string;
    text: string;
    type: 'mcq' | 'true_false' | 'ranking';
    options: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
    }>;
    explanation?: string;
    points: number;
    mediaUrl?: string;
  }>;
  settings: {
    timerPerQuestion: number;
    showLeaderboard: boolean;
    shuffleQuestions: boolean;
    shuffleAnswers: boolean;
  };
}
```

### Wordcloud Config

```typescript
// inputs
interface WordcloudInputs {
  question: string;
  maxWordsPerParticipant: number;
  minWordLength: number;
  groupSimilar: boolean;
  language: string;
}

// activitySpec
interface WordcloudActivitySpec {
  type: 'wordcloud';
  title: string;
  question: string;
  settings: {
    maxWordsPerParticipant: number;
    minWordLength: number;
    groupSimilar: boolean;
    anonymousSubmission: boolean;
  };
  // Rempli au runtime
  words?: Array<{
    text: string;
    count: number;
    group?: string;
  }>;
}
```

### Post-it Config

```typescript
// inputs
interface PostitInputs {
  prompt: string;
  mode: 'individual' | 'group';
  allowVoting: boolean;
  votesPerParticipant: number;
  anonymous: boolean;
  aiCategorization: boolean;
  generateMatrix: boolean;
}

// activitySpec
interface PostitActivitySpec {
  type: 'postit';
  title: string;
  prompt: string;
  categories?: string[];
  settings: {
    mode: 'individual' | 'group';
    allowVoting: boolean;
    votesPerParticipant: number;
    anonymous: boolean;
    aiCategorization: boolean;
    generateMatrix: boolean;
  };
  // Rempli au runtime
  postits?: Array<{
    id: string;
    content: string;
    authorId: string;
    color: string;
    category?: string;
    position?: { x: number; y: number };
    votes: number;
  }>;
  matrix?: {
    items: Array<{
      postitId: string;
      impact: number; // 0-1
      effort: number; // 0-1
    }>;
  };
}
```

### Roleplay Config

```typescript
// inputs
interface RoleplayInputs {
  scenario: string;
  roles: Array<{
    name: string;
    description: string;
    objectives: string[];
  }>;
  mode: 'individual' | 'group';
  recordConversations: boolean;
  maxDuration: number;
  aiModel: 'mistral-medium' | 'mistral-large';
  temperature: number;
}

// activitySpec
interface RoleplayActivitySpec {
  type: 'roleplay';
  title: string;
  scenario: string;
  context: string; // Contexte extrait des sources
  roles: Array<{
    id: string;
    name: string;
    description: string;
    objectives: string[];
    systemPrompt: string; // Généré par l'IA
  }>;
  settings: {
    mode: 'individual' | 'group';
    recordConversations: boolean;
    maxDuration: number;
    aiModel: string;
    temperature: number;
  };
}
```

---

## Génération de Widget

### Workflow Mastra

```typescript
// packages/ai/src/workflows/generate-widget.workflow.ts
import { Workflow, Step } from '@mastra/core/workflows';
import { z } from 'zod';

export interface GenerateWidgetInput {
  studioId: string;
  templateId: string;
  sourceIds: string[];
  inputs: Record<string, unknown>;
  userId: string;
}

// Step 1: Récupérer le contexte
const retrieveContextStep = new Step({
  id: 'retrieve-context',
  execute: async ({ context }) => {
    const { sourceIds, inputs } = context.getStepResult<GenerateWidgetInput>('trigger');

    // Mode deep ou RAG selon la taille
    const totalSize = await getTotalSourceSize(sourceIds);
    const contextThreshold = 50000; // ~50K tokens

    let contextText: string;
    if (totalSize < contextThreshold) {
      // Mode deep : tout le contenu
      contextText = await getFullSourcesContent(sourceIds);
    } else {
      // Mode RAG : recherche sémantique
      const query = inputs.customInstructions || inputs.title || '';
      const chunks = await retrieveRelevantChunks(query, sourceIds, { topK: 10 });
      contextText = chunks.map((c) => c.content).join('\n\n');
    }

    return { contextText, mode: totalSize < contextThreshold ? 'deep' : 'rag' };
  },
});

// Step 2: Générer l'ActivitySpec
const generateActivityStep = new Step({
  id: 'generate-activity',
  execute: async ({ context }) => {
    const trigger = context.getStepResult<GenerateWidgetInput>('trigger');
    const { contextText } = context.getStepResult('retrieve-context');

    // Récupérer le template
    const template = await db.widgetTemplate.findUnique({
      where: { id: trigger.templateId },
    });

    if (!template) throw new Error('Template not found');

    // Construire le prompt
    const prompt = buildPrompt(template.promptTemplate, {
      context: contextText,
      ...trigger.inputs,
    });

    // Appeler le LLM
    const response = await mastra.generate({
      model: 'mistral-large',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en création de contenu pédagogique interactif.',
        },
        { role: 'user', content: prompt },
      ],
      responseFormat: { type: 'json_object' },
    });

    const activitySpec = JSON.parse(response.content);

    // Valider contre le schema
    validateAgainstSchema(activitySpec, template.outputSchema);

    return { activitySpec };
  },
});

// Step 3: Générer les vues A2UI
const generateViewsStep = new Step({
  id: 'generate-views',
  execute: async ({ context }) => {
    const trigger = context.getStepResult<GenerateWidgetInput>('trigger');
    const { activitySpec } = context.getStepResult('generate-activity');

    const template = await db.widgetTemplate.findUnique({
      where: { id: trigger.templateId },
    });

    // Générer les 3 vues A2UI
    const a2uiViews = generateA2UIViews(activitySpec, template!.views);

    return { a2uiViews };
  },
});

// Step 4: Sauvegarder l'instance
const saveInstanceStep = new Step({
  id: 'save-instance',
  execute: async ({ context }) => {
    const trigger = context.getStepResult<GenerateWidgetInput>('trigger');
    const { activitySpec } = context.getStepResult('generate-activity');
    const { a2uiViews } = context.getStepResult('generate-views');

    const instance = await db.widgetInstance.create({
      data: {
        studioId: trigger.studioId,
        templateId: trigger.templateId,
        title: activitySpec.title,
        inputs: trigger.inputs,
        sourceRefs: trigger.sourceIds,
        activitySpec,
        a2uiViews,
      },
      include: { template: true },
    });

    return { instance };
  },
});

export const generateWidgetWorkflow = new Workflow({
  name: 'generate-widget',
  triggerSchema: z.object({
    studioId: z.string(),
    templateId: z.string(),
    sourceIds: z.array(z.string()),
    inputs: z.record(z.unknown()),
    userId: z.string(),
  }),
})
  .step(retrieveContextStep)
  .then(generateActivityStep)
  .then(generateViewsStep)
  .then(saveInstanceStep);
```

---

## API Génération

```typescript
// app/api/studios/[id]/widgets/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generationQueue } from '@/lib/queue';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { templateId, sourceIds, inputs } = body;

  // Vérifier le studio
  const studio = await db.studio.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!studio) {
    return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
  }

  // Enqueue le job de génération
  const job = await generationQueue.add('generate', {
    studioId: params.id,
    templateId,
    sourceIds,
    inputs,
    userId: session.user.id,
  });

  return NextResponse.json({
    jobId: job.id,
    status: 'queued',
  });
}
```

# Inventaire des Workflows - Migration qiplim3

## Vue d'ensemble

Ce document inventorie les workflows IA existants dans **qiplim3** et leur migration vers la stack **Qiplim-v2** avec Mastra.

---

## Workflows à Migrer

### Depuis `qiplim3/backend/ai/workflows/`

| Workflow Original | Fichier Source | Priorité | Statut |
|-------------------|----------------|----------|--------|
| `generateQuizWorkflow` | `generateQuizWorkflow.ts` | P0 | À migrer |
| `generateWordcloudWorkflow` | `generateWordcloudWorkflow.ts` | P0 | À migrer |
| `analyzePostitWorkflow` | `analyzePostitWorkflow.ts` | P0 | À migrer |
| `parserWorkflow` | `parserWorkflow.ts` | P0 | À migrer |
| `summarizerWorkflow` | `summarizerWorkflow.ts` | P1 | À migrer |
| `plannerWorkflow` | `plannerWorkflow.ts` | P2 | À évaluer |
| `generateModuleWorkflow` | `generateModuleWorkflow.ts` | P2 | Non requis |
| `generatePartWorkflow` | `generatePartWorkflow.ts` | P2 | Non requis |
| `generateWorkshopWorkflow` | `generateWorkshopWorkflow.ts` | P1 | À adapter |

---

## Détail des Migrations

### 1. generateQuizWorkflow (P0)

**Source** : `qiplim3/backend/ai/workflows/generateQuizWorkflow.ts`

**Fonctionnalités** :
- Récupération de contexte (mode deep ou RAG)
- Génération de questions via agent IA
- Support multi-providers (Claude, OpenAI)

**Migration vers Mastra** :

```typescript
// packages/ai/src/workflows/generate-quiz.workflow.ts
import { Workflow, Step } from '@mastra/core/workflows';
import { z } from 'zod';
import { quizGeneratorAgent } from '../agents/quiz-generator';
import { retrieveContext } from '../tools/retriever.tool';

const inputSchema = z.object({
  studioId: z.string(),
  sourceIds: z.array(z.string()),
  questionCount: z.number().min(1).max(20),
  answersPerQuestion: z.number().min(2).max(6),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  language: z.string().default('fr'),
  customInstructions: z.string().optional(),
});

// Step 1: Retrieve Context
const retrieveContextStep = new Step({
  id: 'retrieve-context',
  description: 'Récupère le contexte des sources sélectionnées',
  execute: async ({ context }) => {
    const input = context.getTriggerData<z.infer<typeof inputSchema>>();

    // Déterminer le mode (deep vs RAG)
    const totalSize = await calculateSourcesSize(input.sourceIds);
    const useRag = totalSize > 50000; // ~50K tokens

    let contextText: string;
    if (useRag) {
      // Mode RAG: recherche sémantique
      const query = input.customInstructions || 'quiz questions';
      const chunks = await retrieveContext({
        query,
        sourceIds: input.sourceIds,
        topK: 10,
      });
      contextText = chunks.map((c) => c.content).join('\n\n');
    } else {
      // Mode deep: tout le contenu
      contextText = await getFullSourcesContent(input.sourceIds);
    }

    return { contextText, mode: useRag ? 'rag' : 'deep' };
  },
});

// Step 2: Generate Quiz
const generateQuizStep = new Step({
  id: 'generate-quiz',
  description: 'Génère le quiz via l\'agent IA',
  execute: async ({ context, mastra }) => {
    const input = context.getTriggerData<z.infer<typeof inputSchema>>();
    const { contextText } = context.getStepResult('retrieve-context');

    const result = await mastra.runAgent(quizGeneratorAgent, {
      context: contextText,
      questionCount: input.questionCount,
      answersPerQuestion: input.answersPerQuestion,
      difficulty: input.difficulty,
      language: input.language,
      customInstructions: input.customInstructions,
    });

    return { activitySpec: result };
  },
});

// Step 3: Generate A2UI Views
const generateViewsStep = new Step({
  id: 'generate-views',
  description: 'Génère les vues A2UI',
  execute: async ({ context }) => {
    const { activitySpec } = context.getStepResult('generate-quiz');

    const a2uiViews = {
      edit: generateQuizEditView(activitySpec),
      speaker: generateQuizSpeakerView(activitySpec),
      viewer: generateQuizViewerView(activitySpec),
    };

    return { a2uiViews };
  },
});

export const generateQuizWorkflow = new Workflow({
  name: 'generate-quiz',
  triggerSchema: inputSchema,
})
  .step(retrieveContextStep)
  .then(generateQuizStep)
  .then(generateViewsStep);
```

### 2. generateWordcloudWorkflow (P0)

**Source** : `qiplim3/backend/ai/workflows/generateWordcloudWorkflow.ts`

**Migration** :

```typescript
// packages/ai/src/workflows/generate-wordcloud.workflow.ts
import { Workflow, Step } from '@mastra/core/workflows';
import { z } from 'zod';

const inputSchema = z.object({
  studioId: z.string(),
  sourceIds: z.array(z.string()),
  question: z.string(),
  maxWordsPerParticipant: z.number().default(3),
  groupSimilar: z.boolean().default(true),
  language: z.string().default('fr'),
});

const generateWordcloudStep = new Step({
  id: 'generate-wordcloud',
  execute: async ({ context, mastra }) => {
    const input = context.getTriggerData<z.infer<typeof inputSchema>>();
    const contextText = await getSourcesContext(input.sourceIds);

    // Générer la question si non fournie
    let question = input.question;
    if (!question) {
      const result = await mastra.generate({
        model: 'mistral-medium-latest',
        messages: [{
          role: 'user',
          content: `Basé sur ce contenu, suggère une question engageante pour un nuage de mots :

${contextText}

Réponds uniquement avec la question, sans explication.`,
        }],
      });
      question = result.content;
    }

    return {
      activitySpec: {
        type: 'wordcloud',
        title: 'Nuage de mots',
        question,
        settings: {
          maxWordsPerParticipant: input.maxWordsPerParticipant,
          minWordLength: 2,
          groupSimilar: input.groupSimilar,
          anonymousSubmission: true,
        },
      },
    };
  },
});

export const generateWordcloudWorkflow = new Workflow({
  name: 'generate-wordcloud',
  triggerSchema: inputSchema,
}).step(generateWordcloudStep);
```

### 3. analyzePostitWorkflow (P0)

**Source** : `qiplim3/backend/ai/workflows/analyzePostitWorkflow.ts`

**Fonctionnalités** :
- OCR via GPT-4 Vision
- Extraction de texte des post-its
- Génération de synthèse et thèmes
- Création de diagramme Mermaid

**Migration** :

```typescript
// packages/ai/src/workflows/analyze-postit.workflow.ts
import { Workflow, Step } from '@mastra/core/workflows';
import { z } from 'zod';
import { analyzeImageTool } from '../tools/vision.tool';

const inputSchema = z.object({
  imageUrl: z.string().url(),
  generateMatrix: z.boolean().default(false),
});

// Step 1: OCR et extraction
const extractPostitStep = new Step({
  id: 'extract-postits',
  execute: async ({ context, mastra }) => {
    const input = context.getTriggerData<z.infer<typeof inputSchema>>();

    const result = await analyzeImageTool.execute(
      { imageUrl: input.imageUrl, task: 'postit_extract' },
      { mastra }
    );

    return { postits: result.postits };
  },
});

// Step 2: Analyse et catégorisation
const categorizeStep = new Step({
  id: 'categorize',
  execute: async ({ context, mastra }) => {
    const { postits } = context.getStepResult('extract-postits');

    const result = await mastra.generate({
      model: 'mistral-large-latest',
      messages: [{
        role: 'system',
        content: `Tu es un expert en analyse et catégorisation d'idées.`,
      }, {
        role: 'user',
        content: `Analyse ces post-its et regroupe-les par thèmes :

${postits.map((p: any, i: number) => `${i + 1}. "${p.text}"`).join('\n')}

Réponds en JSON avec :
{
  "themes": ["theme1", "theme2", ...],
  "categories": [
    { "name": "...", "postitIndexes": [0, 2, 5] }
  ],
  "summary": "Synthèse en 2-3 phrases"
}`,
      }],
      responseFormat: { type: 'json_object' },
    });

    return JSON.parse(result.content);
  },
});

// Step 3: Matrice impact/effort (optionnel)
const generateMatrixStep = new Step({
  id: 'generate-matrix',
  execute: async ({ context, mastra }) => {
    const input = context.getTriggerData<z.infer<typeof inputSchema>>();
    if (!input.generateMatrix) {
      return { matrix: null };
    }

    const { postits } = context.getStepResult('extract-postits');

    const result = await mastra.generate({
      model: 'mistral-large-latest',
      messages: [{
        role: 'user',
        content: `Pour chaque post-it, évalue l'impact (0-1) et l'effort (0-1) :

${postits.map((p: any, i: number) => `${i}. "${p.text}"`).join('\n')}

Réponds en JSON : { "items": [{ "index": 0, "impact": 0.8, "effort": 0.3 }, ...] }`,
      }],
      responseFormat: { type: 'json_object' },
    });

    return { matrix: JSON.parse(result.content) };
  },
});

export const analyzePostitWorkflow = new Workflow({
  name: 'analyze-postit',
  triggerSchema: inputSchema,
})
  .step(extractPostitStep)
  .then(categorizeStep)
  .then(generateMatrixStep);
```

### 4. parserWorkflow (P0)

**Migration** : Intégré dans le job de parsing de documents

```typescript
// packages/ai/src/workflows/parse-document.workflow.ts
import { Workflow, Step } from '@mastra/core/workflows';
import { z } from 'zod';

const inputSchema = z.object({
  sourceId: z.string(),
  userId: z.string(),
});

// Step 1: Télécharger et parser
const parseStep = new Step({
  id: 'parse',
  execute: async ({ context }) => {
    const input = context.getTriggerData<z.infer<typeof inputSchema>>();

    const source = await db.source.findUnique({
      where: { id: input.sourceId },
    });

    if (!source) throw new Error('Source not found');

    // Parser via Unstructured.io
    const elements = await parseWithUnstructured(source.url);

    return { elements };
  },
});

// Step 2: Chunking
const chunkStep = new Step({
  id: 'chunk',
  execute: async ({ context }) => {
    const { elements } = context.getStepResult('parse');

    const chunks = createChunks(elements, {
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    return { chunks };
  },
});

// Step 3: Embeddings
const embedStep = new Step({
  id: 'embed',
  execute: async ({ context }) => {
    const input = context.getTriggerData<z.infer<typeof inputSchema>>();
    const { chunks } = context.getStepResult('chunk');

    // Générer les embeddings par batch
    const embeddings = await generateEmbeddingsBatch(
      chunks.map((c) => c.content)
    );

    // Sauvegarder dans la base
    await db.sourceChunk.createMany({
      data: chunks.map((chunk, i) => ({
        sourceId: input.sourceId,
        content: chunk.content,
        embedding: embeddings[i],
        metadata: chunk.metadata,
        pageNumber: chunk.pageNumber,
        chunkIndex: i,
      })),
    });

    return { chunkCount: chunks.length };
  },
});

// Step 4: Analyse IA
const analyzeStep = new Step({
  id: 'analyze',
  execute: async ({ context, mastra }) => {
    const input = context.getTriggerData<z.infer<typeof inputSchema>>();
    const { chunks } = context.getStepResult('chunk');

    // Prendre un échantillon pour l'analyse
    const sampleContent = chunks.slice(0, 10).map((c) => c.content).join('\n\n');

    const analysis = await mastra.runAgent(documentAnalyzerAgent, {
      content: sampleContent,
    });

    // Mettre à jour la source
    await db.source.update({
      where: { id: input.sourceId },
      data: {
        status: 'COMPLETED',
        analysis,
      },
    });

    return { analysis };
  },
});

export const parseDocumentWorkflow = new Workflow({
  name: 'parse-document',
  triggerSchema: inputSchema,
})
  .step(parseStep)
  .then(chunkStep)
  .then(embedStep)
  .then(analyzeStep);
```

---

## Mapping des Tools

### Tools à Migrer

| Tool Original | Fichier Source | Migration |
|---------------|----------------|-----------|
| `documentsTool` | `tools/documentsTool.ts` | → `retriever.tool.ts` |
| `summarizerTool` | `tools/summarizerTool.ts` | → `summarizer.tool.ts` |
| `programsTool` | `tools/programsTool.ts` | Non requis (Studio) |
| `presentationsTool` | `tools/presentationsTool.ts` | À adapter |

---

## Différences Architecturales

### qiplim3 (Ancien)

```typescript
// Structure ancienne
const workflow = new Workflow({
  name: 'Quiz Generator',
  triggerSchema: z.object({ ... }),
})
  .step(retrieverStep)
  .then(quizGeneratorStep);

// Exécution directe
const result = await workflow.execute(input);
```

### Qiplim-v2 (Nouveau)

```typescript
// Structure nouvelle avec Mastra
const workflow = new Workflow({
  name: 'generate-quiz',
  triggerSchema: z.object({ ... }),
})
  .step(retrieveContextStep)
  .then(generateQuizStep)
  .then(generateViewsStep);

// Exécution via BullMQ
await generationQueue.add('generate-quiz', {
  workflowName: 'generate-quiz',
  input: { ... },
  userId,
});

// Worker
const worker = new Worker('generation', async (job) => {
  const mastra = await getMastraForUser(job.data.userId);
  const result = await mastra.executeWorkflow(
    job.data.workflowName,
    job.data.input
  );
  return result;
});
```

---

## Plan de Migration

### Phase 1 (Semaine 1-2)
- [ ] Migrer `parseDocumentWorkflow`
- [ ] Migrer `generateQuizWorkflow`
- [ ] Configurer Mastra avec Mistral

### Phase 2 (Semaine 3-4)
- [ ] Migrer `generateWordcloudWorkflow`
- [ ] Migrer `analyzePostitWorkflow`
- [ ] Ajouter support BYOK

### Phase 3 (Semaine 5-6)
- [ ] Migrer `summarizerWorkflow`
- [ ] Ajouter nouveaux workflows (roleplay)
- [ ] Tests et optimisations

# Configuration Mastra

## Vue d'ensemble

**Mastra** est le framework d'orchestration des agents IA utilisé par Qiplim Studio. Il permet de :

- Définir des agents avec des outils et prompts personnalisés
- Orchestrer des workflows multi-étapes
- Gérer plusieurs providers IA (Mistral, OpenAI, Anthropic, etc.)
- Intégrer des outils personnalisés (RAG, base de données, etc.)

---

## Installation et Configuration

### Dépendances

```bash
pnpm add @mastra/core @mastra/mistral @mastra/openai @mastra/anthropic
```

### Configuration de Base

```typescript
// packages/ai/src/mastra.ts
import { Mastra } from '@mastra/core';
import { MistralProvider } from '@mastra/mistral';
import { OpenAIProvider } from '@mastra/openai';
import { AnthropicProvider } from '@mastra/anthropic';

// Configuration des providers
const mistralProvider = new MistralProvider({
  apiKey: process.env.MISTRAL_API_KEY!,
  defaultModel: 'mistral-large-latest',
});

const openaiProvider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  defaultModel: 'gpt-4o',
});

const anthropicProvider = new AnthropicProvider({
  apiKey: process.env.CLAUDE_API_KEY!,
  defaultModel: 'claude-3-5-sonnet-20241022',
});

// Instance Mastra principale
export const mastra = new Mastra({
  name: 'qiplim-studio',
  providers: {
    mistral: mistralProvider,
    openai: openaiProvider,
    anthropic: anthropicProvider,
  },
  defaultProvider: 'mistral', // Mistral par défaut (souveraineté)
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    destination: process.env.NODE_ENV === 'production' ? 'file' : 'console',
  },
  telemetry: {
    enabled: process.env.NODE_ENV === 'production',
    serviceName: 'qiplim-studio-ai',
  },
});
```

### Configuration BYOK (Bring Your Own Key)

```typescript
// packages/ai/src/byok.ts
import { Mastra } from '@mastra/core';
import { MistralProvider } from '@mastra/mistral';
import { OpenAIProvider } from '@mastra/openai';
import { AnthropicProvider } from '@mastra/anthropic';
import { db } from '@qiplim/db';

export type AIProvider = 'mistral' | 'openai' | 'anthropic' | 'google';

interface UserAIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

// Cache des instances Mastra par utilisateur
const userMastraCache = new Map<string, Mastra>();

export async function getMastraForUser(userId: string): Promise<Mastra> {
  // Vérifier le cache
  const cached = userMastraCache.get(userId);
  if (cached) return cached;

  // Récupérer la config utilisateur
  const userConfig = await db.userAIConfig.findUnique({
    where: { userId },
  });

  if (!userConfig?.apiKey) {
    // Pas de BYOK, utiliser l'instance par défaut
    return mastra;
  }

  // Créer une instance personnalisée
  const provider = createProvider(userConfig.provider, userConfig.apiKey);
  const userMastra = new Mastra({
    name: `qiplim-studio-${userId}`,
    providers: {
      [userConfig.provider]: provider,
    },
    defaultProvider: userConfig.provider,
  });

  // Mettre en cache (TTL 1h)
  userMastraCache.set(userId, userMastra);
  setTimeout(() => userMastraCache.delete(userId), 3600000);

  return userMastra;
}

function createProvider(type: AIProvider, apiKey: string) {
  switch (type) {
    case 'mistral':
      return new MistralProvider({ apiKey });
    case 'openai':
      return new OpenAIProvider({ apiKey });
    case 'anthropic':
      return new AnthropicProvider({ apiKey });
    default:
      throw new Error(`Unsupported provider: ${type}`);
  }
}
```

---

## Modèles Disponibles

### Mistral (Principal)

| Modèle | Contexte | Usage |
|--------|----------|-------|
| `mistral-large-latest` | 128K | Génération complexe, raisonnement |
| `mistral-medium-latest` | 32K | Usage général, bon rapport qualité/prix |
| `mistral-small-latest` | 32K | Tâches simples, haute vitesse |
| `pixtral-large-latest` | 128K | Vision + texte (analyse images) |

### OpenAI (BYOK)

| Modèle | Contexte | Usage |
|--------|----------|-------|
| `gpt-4o` | 128K | Multimodal, haute qualité |
| `gpt-4-turbo` | 128K | Haute qualité, plus économique |
| `gpt-4o-mini` | 128K | Rapide, économique |

### Anthropic (BYOK)

| Modèle | Contexte | Usage |
|--------|----------|-------|
| `claude-3-5-sonnet-20241022` | 200K | Équilibré, recommandé |
| `claude-3-opus-20240229` | 200K | Très haute qualité |
| `claude-3-haiku-20240307` | 200K | Rapide, économique |

---

## Tools Personnalisés

### RAG Retriever Tool

```typescript
// packages/ai/src/tools/retriever.tool.ts
import { createTool } from '@mastra/core';
import { z } from 'zod';
import { retrieveRelevantChunks } from '../rag/retriever';

export const retrieverTool = createTool({
  name: 'retrieve_context',
  description: 'Recherche des passages pertinents dans les documents sources',
  inputSchema: z.object({
    query: z.string().describe('La requête de recherche'),
    sourceIds: z.array(z.string()).describe('IDs des sources à interroger'),
    topK: z.number().optional().default(5).describe('Nombre de résultats'),
  }),
  execute: async ({ query, sourceIds, topK }) => {
    const results = await retrieveRelevantChunks(query, sourceIds, { topK });

    return {
      chunks: results.map((r) => ({
        content: r.content,
        source: r.sourceName,
        similarity: r.similarity,
      })),
      totalFound: results.length,
    };
  },
});
```

### Database Tool

```typescript
// packages/ai/src/tools/database.tool.ts
import { createTool } from '@mastra/core';
import { z } from 'zod';
import { db } from '@qiplim/db';

export const saveWidgetTool = createTool({
  name: 'save_widget',
  description: 'Sauvegarde un widget généré dans la base de données',
  inputSchema: z.object({
    studioId: z.string(),
    templateId: z.string(),
    inputs: z.record(z.unknown()),
    activitySpec: z.record(z.unknown()),
    a2uiViews: z.record(z.unknown()),
  }),
  execute: async ({ studioId, templateId, inputs, activitySpec, a2uiViews }) => {
    const widget = await db.widgetInstance.create({
      data: {
        studioId,
        templateId,
        inputs,
        activitySpec,
        a2uiViews,
      },
    });

    return { widgetId: widget.id, success: true };
  },
});
```

### Vision Tool (OCR Post-its)

```typescript
// packages/ai/src/tools/vision.tool.ts
import { createTool } from '@mastra/core';
import { z } from 'zod';

export const analyzeImageTool = createTool({
  name: 'analyze_image',
  description: 'Analyse une image (OCR, extraction de contenu)',
  inputSchema: z.object({
    imageUrl: z.string().url().describe("URL de l'image à analyser"),
    task: z.enum(['ocr', 'describe', 'postit_extract']).describe('Type de tâche'),
  }),
  execute: async ({ imageUrl, task }, { mastra }) => {
    const prompt = getVisionPrompt(task);

    const response = await mastra.generate({
      model: 'pixtral-large-latest', // Mistral Vision
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: 'Analyse cette image.' },
          ],
        },
      ],
      responseFormat: { type: 'json_object' },
    });

    return JSON.parse(response.content);
  },
});

function getVisionPrompt(task: string): string {
  const prompts: Record<string, string> = {
    ocr: `Extrais tout le texte visible dans l'image. Retourne un JSON: { "text": "..." }`,
    describe: `Décris le contenu de l'image. Retourne un JSON: { "description": "..." }`,
    postit_extract: `Cette image contient des post-its. Extrais le texte de chaque post-it.
Retourne un JSON: { "postits": [{ "text": "...", "color": "yellow|pink|blue|green" }] }`,
  };
  return prompts[task] || prompts.describe;
}
```

---

## Agents

### Document Analyzer Agent

```typescript
// packages/ai/src/agents/document-analyzer.ts
import { Agent } from '@mastra/core';
import { z } from 'zod';
import { retrieverTool } from '../tools/retriever.tool';

export const documentAnalyzerAgent = new Agent({
  name: 'DocumentAnalyzer',
  description: 'Analyse des documents pour extraire thèmes, concepts et suggestions',
  model: 'mistral-large-latest',
  systemPrompt: `Tu es un expert en analyse de contenu pédagogique.

Ton rôle est d'analyser des documents et d'en extraire :
1. Les thèmes principaux
2. Les concepts clés
3. Les points importants
4. Des suggestions d'activités interactives pertinentes

Tu dois toujours répondre en JSON structuré.`,

  tools: [retrieverTool],

  outputSchema: z.object({
    title: z.string(),
    summary: z.string(),
    themes: z.array(z.string()),
    concepts: z.array(z.object({
      name: z.string(),
      description: z.string(),
      relevance: z.number(),
    })),
    keyPoints: z.array(z.string()),
    suggestedWidgets: z.array(z.object({
      templateId: z.string(),
      title: z.string(),
      description: z.string(),
      confidence: z.number(),
    })),
    language: z.string(),
  }),
});
```

### Quiz Generator Agent

```typescript
// packages/ai/src/agents/quiz-generator.ts
import { Agent } from '@mastra/core';
import { z } from 'zod';
import { retrieverTool } from '../tools/retriever.tool';

export const quizGeneratorAgent = new Agent({
  name: 'QuizGenerator',
  description: 'Génère des quiz à partir de contenu pédagogique',
  model: 'mistral-large-latest',
  systemPrompt: `Tu es un expert en création de quiz pédagogiques.

Tu crées des questions de qualité qui :
- Testent la compréhension, pas la mémorisation
- Ont des distracteurs plausibles
- Incluent des explications claires
- Sont adaptées au niveau de difficulté demandé

Règles importantes :
- Une seule réponse correcte par question (sauf si spécifié)
- Les options doivent être de longueur similaire
- Éviter les formulations négatives
- Varier les types de questions si possible

Tu dois toujours répondre en JSON valide.`,

  tools: [retrieverTool],

  outputSchema: z.object({
    title: z.string(),
    description: z.string(),
    questions: z.array(z.object({
      id: z.string(),
      text: z.string(),
      type: z.enum(['mcq', 'true_false', 'ranking']),
      options: z.array(z.object({
        id: z.string(),
        text: z.string(),
        isCorrect: z.boolean(),
      })),
      explanation: z.string().optional(),
      points: z.number(),
    })),
  }),
});
```

### Roleplay Agent

```typescript
// packages/ai/src/agents/roleplay-agent.ts
import { Agent } from '@mastra/core';
import { z } from 'zod';

export function createRoleplayAgent(role: {
  name: string;
  description: string;
  objectives: string[];
  systemPrompt: string;
}) {
  return new Agent({
    name: `RoleplayAgent_${role.name}`,
    description: `Agent conversationnel pour le rôle: ${role.name}`,
    model: 'mistral-medium-latest', // Plus rapide pour le conversationnel
    systemPrompt: `${role.systemPrompt}

Tu joues le rôle de "${role.name}".

Description du personnage :
${role.description}

Tes objectifs dans cette conversation :
${role.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Instructions :
- Reste toujours dans ton personnage
- Réponds de manière naturelle et engageante
- Guide subtilement la conversation vers les objectifs pédagogiques
- Utilise des questions ouvertes pour stimuler la réflexion
- Donne des feedbacks constructifs`,

    temperature: 0.7, // Plus de variété pour le conversationnel
    maxTokens: 500, // Réponses concises

    outputSchema: z.object({
      message: z.string(),
      mood: z.enum(['neutral', 'positive', 'challenging', 'supportive']).optional(),
      suggestedFollowUp: z.string().optional(),
    }),
  });
}
```

---

## Usage dans les Workers

```typescript
// workers/generation-worker.ts
import { Worker } from 'bullmq';
import { getMastraForUser } from '@qiplim/ai';
import { quizGeneratorAgent } from '@qiplim/ai/agents';
import { db } from '@qiplim/db';

const worker = new Worker('widget-generation', async (job) => {
  const { studioId, templateId, sourceIds, inputs, userId } = job.data;

  // Obtenir l'instance Mastra (avec BYOK si configuré)
  const mastra = await getMastraForUser(userId);

  // Récupérer le contexte des sources
  const context = await getSourcesContext(sourceIds, inputs);

  // Générer selon le type de template
  const template = await db.widgetTemplate.findUnique({
    where: { id: templateId },
  });

  let result;
  switch (template?.category) {
    case 'QUIZ':
      result = await mastra.runAgent(quizGeneratorAgent, {
        context,
        ...inputs,
      });
      break;
    // ... autres cas
  }

  // Sauvegarder le widget
  const widget = await db.widgetInstance.create({
    data: {
      studioId,
      templateId,
      inputs,
      sourceRefs: sourceIds,
      activitySpec: result,
      a2uiViews: generateA2UIViews(result, template!),
    },
  });

  return { widgetId: widget.id };
});
```

# Configuration des Agents IA

## Vue d'ensemble

Qiplim Studio utilise plusieurs agents IA spécialisés, orchestrés par Mastra, avec **Mistral AI** comme provider principal (souveraineté française) et support BYOK pour d'autres providers.

---

## Agents Disponibles

### 1. DocumentAnalyzerAgent

**Rôle** : Analyser les documents importés pour en extraire thèmes, concepts et suggestions d'activités.

```typescript
// packages/ai/src/agents/document-analyzer.agent.ts
import { Agent } from '@mastra/core';
import { z } from 'zod';

export const documentAnalyzerAgent = new Agent({
  name: 'DocumentAnalyzer',
  description: 'Analyse des documents pour extraire structure et contenu',

  model: 'mistral-large-latest',
  temperature: 0.3, // Précision
  maxTokens: 4096,

  systemPrompt: `Tu es un expert en analyse de contenu pédagogique et professionnel.

Ton rôle est d'analyser des documents et d'en extraire :
1. **Titre et résumé** : Identifie le sujet principal
2. **Thèmes** : Liste les thèmes abordés (3-7 thèmes)
3. **Concepts clés** : Extrais les notions importantes avec leur pertinence
4. **Points clés** : Liste les informations essentielles à retenir
5. **Suggestions** : Propose des activités interactives pertinentes

Critères de qualité :
- Sois précis et factuel
- Adapte le niveau au contenu (académique, professionnel, grand public)
- Les suggestions doivent être directement liées au contenu

Réponds toujours en JSON valide selon le schéma fourni.`,

  outputSchema: z.object({
    title: z.string().describe("Titre déduit du document"),
    summary: z.string().max(500).describe("Résumé en 2-3 phrases"),
    themes: z.array(z.string()).min(1).max(7),
    concepts: z.array(z.object({
      name: z.string(),
      description: z.string(),
      relevance: z.number().min(0).max(1),
    })),
    keyPoints: z.array(z.string()).max(10),
    suggestedWidgets: z.array(z.object({
      templateId: z.enum(['official-quiz', 'official-wordcloud', 'official-postit', 'official-roleplay']),
      title: z.string(),
      description: z.string(),
      confidence: z.number().min(0).max(1),
      suggestedInputs: z.record(z.unknown()).optional(),
    })),
    language: z.enum(['fr', 'en', 'es', 'de', 'it']),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    estimatedReadTime: z.number().describe("Temps de lecture estimé en minutes"),
  }),
});
```

### 2. QuizGeneratorAgent

**Rôle** : Générer des quiz pédagogiques de qualité.

```typescript
// packages/ai/src/agents/quiz-generator.agent.ts
import { Agent } from '@mastra/core';
import { z } from 'zod';

export const quizGeneratorAgent = new Agent({
  name: 'QuizGenerator',
  description: 'Génère des quiz pédagogiques de qualité',

  model: 'mistral-large-latest',
  temperature: 0.5,
  maxTokens: 8192,

  systemPrompt: `Tu es un expert en création de quiz pédagogiques.

PRINCIPES DE CRÉATION :
1. **Compréhension > Mémorisation** : Teste la compréhension des concepts
2. **Distracteurs plausibles** : Les mauvaises réponses doivent être crédibles
3. **Formulation claire** : Questions et réponses sans ambiguïté
4. **Progression** : Varier la difficulté si plusieurs questions
5. **Feedback utile** : Les explications doivent aider à apprendre

RÈGLES :
- Une seule réponse correcte par question (sauf indication contraire)
- Longueur similaire pour toutes les options
- Éviter les négations dans les questions
- Éviter "toutes les réponses" ou "aucune"
- Ordre aléatoire des bonnes réponses

TYPES DE QUESTIONS :
- MCQ (choix multiple) : 3-6 options
- True/False : Vrai ou Faux
- Ranking : Classement d'éléments

Réponds en JSON valide.`,

  inputSchema: z.object({
    context: z.string().describe("Contenu source pour le quiz"),
    questionCount: z.number().min(1).max(20).default(5),
    answersPerQuestion: z.number().min(2).max(6).default(4),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    language: z.string().default('fr'),
    questionTypes: z.array(z.enum(['mcq', 'true_false', 'ranking'])).optional(),
    customInstructions: z.string().optional(),
  }),

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
      explanation: z.string(),
      points: z.number(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
    })),
    totalPoints: z.number(),
    estimatedDuration: z.number().describe("Durée estimée en secondes"),
  }),
});
```

### 3. WordcloudAnalyzerAgent

**Rôle** : Analyser et regrouper les mots d'un nuage de mots.

```typescript
// packages/ai/src/agents/wordcloud-analyzer.agent.ts
import { Agent } from '@mastra/core';
import { z } from 'zod';

export const wordcloudAnalyzerAgent = new Agent({
  name: 'WordcloudAnalyzer',
  description: 'Analyse et regroupe les mots soumis',

  model: 'mistral-medium-latest', // Plus rapide pour cette tâche
  temperature: 0.2,
  maxTokens: 2048,

  systemPrompt: `Tu es un expert en analyse lexicale et sémantique.

Ton rôle est d'analyser une liste de mots soumis et de :
1. **Regrouper** les synonymes et variations (singulier/pluriel, conjugaisons)
2. **Normaliser** l'orthographe (accents, casse)
3. **Identifier** les thèmes émergents
4. **Filtrer** les mots non pertinents (articles, prépositions isolées)

Règles :
- Conserver le mot le plus fréquent comme représentant du groupe
- Respecter la casse originale si significative (acronymes)
- Signaler les mots potentiellement inappropriés`,

  inputSchema: z.object({
    words: z.array(z.object({
      text: z.string(),
      participantId: z.string().optional(),
      submittedAt: z.string().optional(),
    })),
    language: z.string().default('fr'),
    minWordLength: z.number().default(2),
  }),

  outputSchema: z.object({
    groups: z.array(z.object({
      canonical: z.string().describe("Mot représentatif"),
      variants: z.array(z.string()).describe("Variantes regroupées"),
      count: z.number(),
      theme: z.string().optional(),
    })),
    themes: z.array(z.string()),
    filtered: z.array(z.object({
      word: z.string(),
      reason: z.enum(['too_short', 'stopword', 'inappropriate', 'duplicate']),
    })),
    stats: z.object({
      totalSubmitted: z.number(),
      uniqueWords: z.number(),
      groupCount: z.number(),
    }),
  }),
});
```

### 4. PostitCategorizerAgent

**Rôle** : Catégoriser et analyser les post-its.

```typescript
// packages/ai/src/agents/postit-categorizer.agent.ts
import { Agent } from '@mastra/core';
import { z } from 'zod';

export const postitCategorizerAgent = new Agent({
  name: 'PostitCategorizer',
  description: 'Catégorise et analyse les post-its',

  model: 'mistral-large-latest',
  temperature: 0.3,
  maxTokens: 4096,

  systemPrompt: `Tu es un expert en facilitation et analyse d'idées.

Ton rôle est d'analyser des post-its de brainstorming et de :
1. **Catégoriser** : Regrouper par thèmes similaires
2. **Synthétiser** : Résumer les idées principales
3. **Détecter** : Identifier les tendances et patterns
4. **Évaluer** : Suggérer impact et effort si demandé

Principes :
- Créer 3-7 catégories maximum
- Noms de catégories courts et explicites
- Un post-it peut appartenir à une seule catégorie
- Identifier les idées récurrentes`,

  inputSchema: z.object({
    postits: z.array(z.object({
      id: z.string(),
      content: z.string(),
      authorId: z.string().optional(),
      color: z.string().optional(),
    })),
    context: z.string().optional().describe("Contexte de l'activité"),
    evaluateMatrix: z.boolean().default(false),
  }),

  outputSchema: z.object({
    categories: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      postitIds: z.array(z.string()),
      color: z.string(),
    })),
    summary: z.string().max(500),
    insights: z.array(z.string()).describe("Observations clés"),
    matrix: z.array(z.object({
      postitId: z.string(),
      impact: z.number().min(0).max(1),
      effort: z.number().min(0).max(1),
      quadrant: z.enum(['quick_wins', 'major_projects', 'fill_ins', 'thankless_tasks']),
    })).optional(),
    stats: z.object({
      totalPostits: z.number(),
      categoryCount: z.number(),
      avgPerCategory: z.number(),
    }),
  }),
});
```

### 5. RoleplayDialogAgent

**Rôle** : Agent conversationnel pour les jeux de rôle.

```typescript
// packages/ai/src/agents/roleplay-dialog.agent.ts
import { Agent } from '@mastra/core';
import { z } from 'zod';

export function createRoleplayDialogAgent(config: {
  roleName: string;
  roleDescription: string;
  objectives: string[];
  scenario: string;
  personality?: string;
}) {
  return new Agent({
    name: `RoleplayDialog_${config.roleName}`,
    description: `Agent de dialogue pour le rôle: ${config.roleName}`,

    model: 'mistral-medium-latest', // Équilibre vitesse/qualité
    temperature: 0.7, // Plus de variété
    maxTokens: 500, // Réponses concises

    systemPrompt: `Tu incarnes "${config.roleName}" dans un jeu de rôle pédagogique.

SCÉNARIO :
${config.scenario}

TON PERSONNAGE :
${config.roleDescription}

${config.personality ? `PERSONNALITÉ : ${config.personality}` : ''}

TES OBJECTIFS PÉDAGOGIQUES :
${config.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

INSTRUCTIONS :
1. Reste toujours dans ton personnage
2. Réponds de manière naturelle et engageante
3. Guide subtilement vers les objectifs sans être didactique
4. Pose des questions ouvertes pour stimuler la réflexion
5. Adapte ton niveau de langage à l'interlocuteur
6. Si tu détectes une erreur de raisonnement, corrige avec tact
7. Félicite les bonnes intuitions

FORMAT DE RÉPONSE :
- Réponses courtes (2-4 phrases maximum)
- Termine souvent par une question ou relance
- Utilise des marqueurs émotionnels quand approprié`,

    inputSchema: z.object({
      message: z.string().describe("Message du participant"),
      conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })).optional(),
      participantName: z.string().optional(),
    }),

    outputSchema: z.object({
      message: z.string(),
      mood: z.enum(['neutral', 'encouraging', 'challenging', 'thoughtful', 'surprised']),
      objectiveProgress: z.array(z.object({
        objectiveIndex: z.number(),
        progress: z.number().min(0).max(1),
        notes: z.string().optional(),
      })).optional(),
      suggestedFollowUp: z.string().optional(),
      shouldEndConversation: z.boolean().default(false),
    }),
  });
}
```

---

## Configuration BYOK

### Interface de Configuration

```typescript
// packages/shared/src/types/ai-config.ts
export interface UserAIConfig {
  userId: string;
  provider: AIProvider;
  apiKey: string; // Chiffré
  model?: string;
  settings?: AISettings;
  createdAt: Date;
  updatedAt: Date;
}

export type AIProvider = 'mistral' | 'openai' | 'anthropic' | 'google';

export interface AISettings {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  mistral: [
    'mistral-large-latest',
    'mistral-medium-latest',
    'mistral-small-latest',
    'pixtral-large-latest',
  ],
  openai: [
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-4o-mini',
    'gpt-4-vision-preview',
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307',
  ],
  google: [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ],
};
```

### Stockage Sécurisé des Clés

```typescript
// lib/ai/key-management.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.AI_KEY_ENCRYPTION_KEY!, 'hex');

export function encryptApiKey(apiKey: string): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  };
}

export function decryptApiKey(data: {
  encrypted: string;
  iv: string;
  tag: string;
}): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(data.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(data.tag, 'hex'));

  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

---

## Monitoring et Coûts

### Tracking des Appels

```typescript
// lib/ai/usage-tracker.ts
import { db } from '@qiplim/db';

export interface AIUsageRecord {
  userId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  success: boolean;
  errorType?: string;
}

export async function trackAIUsage(record: AIUsageRecord): Promise<void> {
  await db.aiUsage.create({
    data: {
      ...record,
      createdAt: new Date(),
    },
  });
}

// Coûts par 1M tokens (approximatifs)
export const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  'mistral-large-latest': { input: 2, output: 6 },
  'mistral-medium-latest': { input: 0.7, output: 2.1 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
};

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = TOKEN_COSTS[model] || { input: 5, output: 15 };
  return (
    (inputTokens / 1_000_000) * costs.input +
    (outputTokens / 1_000_000) * costs.output
  );
}
```

### Dashboard Utilisation

```typescript
// API pour récupérer les stats
export async function getAIUsageStats(userId: string, period: 'day' | 'week' | 'month') {
  const startDate = getStartDate(period);

  const stats = await db.aiUsage.groupBy({
    by: ['provider', 'model'],
    where: {
      userId,
      createdAt: { gte: startDate },
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      cost: true,
    },
    _count: true,
    _avg: {
      latencyMs: true,
    },
  });

  return {
    period,
    stats: stats.map((s) => ({
      provider: s.provider,
      model: s.model,
      calls: s._count,
      inputTokens: s._sum.inputTokens,
      outputTokens: s._sum.outputTokens,
      totalCost: s._sum.cost,
      avgLatency: s._avg.latencyMs,
    })),
    totalCost: stats.reduce((acc, s) => acc + (s._sum.cost || 0), 0),
  };
}
```

import { LegacyStep as Step, LegacyWorkflow as Workflow } from '@mastra/core/workflows/legacy';
import { z } from 'zod';
import { generateObject } from 'ai';
import { semanticSearch } from '../../ai/embeddings';
import { getProviderForStudio, type ProviderKey } from '../../ai/providers';

// Activity types that can be embedded in the course plan
const ActivityTypeEnum = z.enum(['quiz', 'wordcloud', 'roleplay', 'workshop', 'exercise']);
type ActivityType = z.infer<typeof ActivityTypeEnum>;

// ProseMirror node schemas
const TextNodeSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

const HeadingNodeSchema = z.object({
  type: z.literal('heading'),
  attrs: z.object({
    level: z.number().min(1).max(3),
  }),
  content: z.array(TextNodeSchema).optional(),
});

const ParagraphNodeSchema = z.object({
  type: z.literal('paragraph'),
  content: z.array(TextNodeSchema).optional(),
});

const ListItemNodeSchema = z.object({
  type: z.literal('listItem'),
  content: z.array(ParagraphNodeSchema).optional(),
});

const BulletListNodeSchema = z.object({
  type: z.literal('bulletList'),
  content: z.array(ListItemNodeSchema).optional(),
});

const ActivityBlockConfigSchema = z.object({
  questionCount: z.number().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  duration: z.string().optional(),
  groupSize: z.number().optional(),
}).passthrough();

const ActivityBlockNodeSchema = z.object({
  type: z.literal('activityBlock'),
  attrs: z.object({
    activityType: ActivityTypeEnum,
    title: z.string(),
    description: z.string(),
    config: ActivityBlockConfigSchema,
  }),
});

const ContentNodeSchema = z.discriminatedUnion('type', [
  HeadingNodeSchema,
  ParagraphNodeSchema,
  BulletListNodeSchema,
  ActivityBlockNodeSchema,
]);

// ProseMirror document schema
const ProseMirrorDocSchema = z.object({
  type: z.literal('doc'),
  content: z.array(ContentNodeSchema),
});

// Metadata schema for the course plan
const CoursePlanMetadataSchema = z.object({
  duration: z.string().describe('Total duration of the course'),
  target: z.enum(['student', 'professional', 'freelance', 'public']).describe('Target audience'),
  level: z.enum(['beginner', 'intermediate', 'expert']).describe('Difficulty level'),
  style: z.string().optional().describe('Pedagogical style'),
  objectives: z.array(z.string()).describe('Global learning objectives'),
  sector: z.string().optional().describe('Domain/sector'),
  prerequisites: z.string().optional().describe('Prerequisites'),
});

// Complete course plan output
const CoursePlanOutputSchema = z.object({
  title: z.string().describe('Title of the course'),
  description: z.string().describe('Description of the course'),
  content: ProseMirrorDocSchema.describe('ProseMirror JSON document with the course plan structure'),
  metadata: CoursePlanMetadataSchema,
});

export type CoursePlanOutput = z.infer<typeof CoursePlanOutputSchema>;

// Input types
export interface CoursePlanWorkflowInput {
  studioId: string;
  courseTitle?: string;
  courseDescription?: string;
  instructions?: string;
  duration?: string;
  target?: 'student' | 'professional' | 'freelance' | 'public';
  sector?: string;
  level?: 'beginner' | 'intermediate' | 'expert';
  prerequisites?: string;
  style?: string;
  objectives?: string[];
  sourceIds: string[];
  language: string;
  preferredProvider?: ProviderKey;
}

export interface CoursePlanWorkflowOutput {
  success: boolean;
  coursePlan: CoursePlanOutput;
}

// Style descriptions for the prompt
const STYLE_DESCRIPTIONS: Record<string, string> = {
  conservative: 'Approche theorique - transmission structuree des connaissances, interactions limitees',
  normal: 'Approche mixte - equilibre entre theorie et pratique, interactions moderees',
  creative: 'Approche pratique - apprentissage par l\'action, ateliers varies',
  immersive: 'Approche immersive - mise en situation continue, scenarios realistes, simulation',
  collaborative: 'Approche collaborative - travail en groupe, co-construction, apprentissage entre pairs',
  gamified: 'Approche gamifiee - defis, recompenses, progression ludique, competition',
  storytelling: 'Approche narrative - parcours sous forme d\'histoire, fil conducteur engageant',
  'micro-learning': 'Approche micro-learning - sequences courtes, objectifs cibles, consommation rapide',
  'project-based': 'Approche projet - construction d\'un livrable concret tout au long de la formation',
  flipped: 'Classe inversee - theorie en autonomie, pratique en session',
};

// Style to activity mapping
const STYLE_ACTIVITIES: Record<string, ActivityType[]> = {
  conservative: ['quiz', 'exercise'],
  normal: ['quiz', 'exercise', 'workshop'],
  creative: ['workshop', 'roleplay', 'exercise'],
  immersive: ['roleplay', 'workshop'],
  collaborative: ['wordcloud', 'workshop'],
  gamified: ['quiz', 'exercise'],
  storytelling: ['roleplay', 'exercise'],
  'micro-learning': ['quiz', 'exercise'],
  'project-based': ['workshop', 'exercise'],
  flipped: ['quiz', 'exercise', 'workshop'],
};

// Step 1: Retrieve relevant content
const retrieverStep = new Step({
  id: 'retriever',
  description: 'Retrieve relevant content for course plan generation',
  inputSchema: z.object({
    studioId: z.string(),
    courseTitle: z.string().optional(),
    sourceIds: z.array(z.string()),
  }),
  outputSchema: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      score: z.number(),
    })
  ),
  execute: async ({ context }) => {
    const triggerData = context.getStepResult<CoursePlanWorkflowInput>('trigger');

    if (!triggerData) {
      throw new Error('Trigger data not found');
    }

    const searchQuery = triggerData.courseTitle || 'formation cours plan pedagogique';

    const searchResults = await semanticSearch(
      triggerData.studioId,
      searchQuery,
      triggerData.sourceIds.length > 0 ? triggerData.sourceIds : undefined,
      10 // Get more context for course planning
    );

    return searchResults.map((r) => ({
      id: r.id,
      content: r.content,
      score: r.score,
    }));
  },
});

// Step 2: Generate course plan in ProseMirror format
const coursePlanGeneratorStep = new Step({
  id: 'coursePlanGenerator',
  description: 'Generate course plan using AI in ProseMirror format',
  inputSchema: z.object({
    studioId: z.string(),
    courseTitle: z.string().optional(),
    courseDescription: z.string().optional(),
    instructions: z.string().optional(),
    duration: z.string().optional(),
    target: z.string().optional(),
    sector: z.string().optional(),
    level: z.string().optional(),
    prerequisites: z.string().optional(),
    style: z.string().optional(),
    objectives: z.array(z.string()).optional(),
    language: z.string(),
    preferredProvider: z.string().optional(),
  }),
  outputSchema: CoursePlanOutputSchema,
  execute: async ({ context }) => {
    const triggerData = context.getStepResult<CoursePlanWorkflowInput>('trigger');
    const retrievedContent = context.getStepResult<
      Array<{ id: string; content: string; score: number }>
    >('retriever');

    if (!triggerData) {
      throw new Error('Trigger data not found');
    }

    const contextText = retrievedContent?.map((c) => c.content).join('\n\n') || '';
    const style = triggerData.style || 'normal';
    const styleDescription = STYLE_DESCRIPTIONS[style] || STYLE_DESCRIPTIONS.normal;
    const suggestedActivities = STYLE_ACTIVITIES[style] || STYLE_ACTIVITIES.normal;

    const { model } = await getProviderForStudio(
      triggerData.studioId,
      triggerData.preferredProvider
    );

    const targetLabels: Record<string, string> = {
      student: 'Etudiants',
      professional: 'Professionnels',
      freelance: 'Professions liberales',
      public: 'Grand public',
    };

    const levelLabels: Record<string, string> = {
      beginner: 'Debutant',
      intermediate: 'Intermediaire',
      expert: 'Expert',
    };

    const activityDescriptions: Record<ActivityType, string> = {
      quiz: 'Quiz interactif pour evaluer les acquis',
      wordcloud: 'Nuage de mots pour brainstorming collaboratif',
      roleplay: 'Jeu de role ou mise en situation',
      workshop: 'Atelier pratique en groupe',
      exercise: 'Exercice individuel ou defi pratique',
    };

    const result = await generateObject({
      model,
      schema: CoursePlanOutputSchema,
      prompt: `Tu es un expert en ingenierie pedagogique et conception de formations.

Cree un plan de cours structure et detaille au format ProseMirror JSON.

${triggerData.courseTitle ? `Titre souhaite: "${triggerData.courseTitle}"` : 'Genere un titre adapte au contenu.'}
${triggerData.courseDescription ? `Description souhaitee: "${triggerData.courseDescription}"` : ''}
${triggerData.sector ? `Domaine/Secteur: ${triggerData.sector}` : ''}

Parametres pedagogiques:
- Duree totale: ${triggerData.duration || '5'} heures
- Public cible: ${triggerData.target ? targetLabels[triggerData.target] : 'A determiner selon le contenu'}
- Niveau: ${triggerData.level ? levelLabels[triggerData.level] : 'A determiner selon le contenu'}
- Style pedagogique: ${styleDescription}
${triggerData.prerequisites ? `- Prerequis: ${triggerData.prerequisites}` : ''}

${triggerData.objectives && triggerData.objectives.length > 0 ? `Objectifs pedagogiques souhaites:
${triggerData.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}` : 'Genere des objectifs pedagogiques adaptes.'}

${triggerData.instructions ? `Instructions specifiques du createur:
${triggerData.instructions}` : ''}

Langue: ${triggerData.language}

Contenu de reference (documents sources):
${contextText}

IMPORTANT - Format de sortie ProseMirror:
Le champ "content" doit etre un document ProseMirror JSON valide avec la structure suivante:
{
  "type": "doc",
  "content": [
    // Titre du cours (heading level 1)
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Titre" }] },

    // Description (paragraph)
    { "type": "paragraph", "content": [{ "type": "text", "text": "Description..." }] },

    // Modules (heading level 2)
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Module 1: ..." }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Contenu..." }] },

    // Parties (heading level 3)
    { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "Partie 1.1: ..." }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "..." }] },

    // Listes a puces pour objectifs
    { "type": "bulletList", "content": [
      { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Objectif 1" }] }] }
    ]},

    // Blocs d'activite (IMPORTANT: insere-les aux endroits pertinents)
    { "type": "activityBlock", "attrs": {
      "activityType": "quiz",
      "title": "Titre de l'activite",
      "description": "Description de l'activite",
      "config": { "questionCount": 5, "difficulty": "medium" }
    }}
  ]
}

Types d'activites disponibles et leurs configs:
${suggestedActivities.map(type => `- ${type}: ${activityDescriptions[type]}
  Config: ${type === 'quiz' ? '{ questionCount: number, difficulty: "easy"|"medium"|"hard" }' :
           type === 'workshop' ? '{ groupSize: number, duration: string }' :
           '{ duration: string }'}`).join('\n')}

Instructions de generation:
1. Structure le document avec des headings hierarchiques (level 1 pour titre, level 2 pour modules, level 3 pour parties)
2. Insere des paragraphes pour le contenu explicatif
3. Utilise des bulletList pour les objectifs et points cles
4. INSERE DES BLOCS activityBlock aux moments pedagogiquement pertinents:
   - En debut de module pour des pre-tests (quiz)
   - Apres une partie theorique pour de la pratique (exercise, workshop)
   - Pour des activites collaboratives (wordcloud, roleplay)
   - En fin de module pour evaluer (quiz)
5. Adapte les activites au style pedagogique: ${style}
6. Activites privilegiees pour ce style: ${suggestedActivities.join(', ')}
7. Assure-toi que chaque module a au moins 1 activite
8. La somme des durees des modules doit correspondre a la duree totale`,
    });

    return result.object;
  },
});

// Workflow definition
const generateCoursePlanWorkflowBuilder = new Workflow({
  name: 'Generate Course Plan',
  triggerSchema: z.object({
    studioId: z.string(),
    courseTitle: z.string().optional(),
    courseDescription: z.string().optional(),
    instructions: z.string().optional(),
    duration: z.string().optional().default('5'),
    target: z.enum(['student', 'professional', 'freelance', 'public']).optional(),
    sector: z.string().optional(),
    level: z.enum(['beginner', 'intermediate', 'expert']).optional(),
    prerequisites: z.string().optional(),
    style: z.string().optional(),
    objectives: z.array(z.string()).optional(),
    sourceIds: z.array(z.string()).default([]),
    language: z.string().default('fr'),
    preferredProvider: z.string().optional(),
  }),
})
  .step(retrieverStep)
  .then(coursePlanGeneratorStep);

export const generateCoursePlanWorkflow = generateCoursePlanWorkflowBuilder.commit();

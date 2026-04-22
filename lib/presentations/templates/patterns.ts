import type { ITemplatePattern } from '../types';

export const SimplePattern: ITemplatePattern = {
  id: 'simple',
  description:
    'Slide avec un titre et optionnellement un ou plusieurs paragraphes et sous-titres.',
  tags: [
    'title',
    'text',
    'introduction',
    'subtitle',
    'key-phrase',
    'key-number',
  ],
  useWhen: [
    'Pour introduire la formation, un module ou une partie',
    'Pour marquer une transition majeure dans la formation',
    "Pour presenter une phrase ou un chiffre important sans avoir besoin de beaucoup d'information",
    "Lorsque la slide ne contient qu'une idee centrale a annoncer",
  ],
  avoidWhen: [
    'Lorsque du contenu doit etre detaille ou explique dans la slide',
    'Si le contenu est sous forme de liste',
  ],
};

export const SmartLayoutPattern: ITemplatePattern = {
  id: 'smart-layout',
  description:
    "Slide avec un layout tres flexible permettant d'ajuster dynamiquement le nombre de blocs d'information et la maniere dont ils sont presentes (exemples, etapes, points cles).",
  tags: ['list', 'grid', 'numbers'],
  useWhen: [
    'Si la slide contient un element de type: "liste"',
    'La mise en page doit rester visuellement equilibree',
    'Chaque item peut etre mis en avant par une icone ou un nombre (facultatif)',
  ],
  avoidWhen: [
    'Un contenu unique qui ne doit pas etre presente en differentes zones',
    "Si le contenu n'est pas sous forme de liste",
    'Si la liste illustre un processus, un cycle, un flux, un chemin, un parcours, etc... alors il est preferable de choisir le pattern media',
  ],
};

export const MediaPattern: ITemplatePattern = {
  id: 'media',
  description: 'Slide avec une image comme contenu principal.',
  tags: [
    'image',
    'media',
    'schema',
    'process',
    'cycle',
    'flow',
    'path',
    'journey',
  ],
  useWhen: [
    'Si le contenu contient un element de type: "image" ou "liste"',
    'Si le contenu est une liste, elle doit illustrer un processus, un cycle, un flux, un chemin, un parcours, etc.',
    "Quand le contenu est tourne autour d'un schema, un diagramme, un visuel, un graphique, une image, etc.",
  ],
  avoidWhen: [
    'Si la slide est une slide de transition (introduction, plan, objectifs, etc.)',
    "Si la liste de la slide n'est pas propice a la creation d'un schema",
    "Si le contenu est trop long et risque d'etre erode par la creation d'une image d'illustration",
  ],
};

export const InteractivePattern: ITemplatePattern = {
  id: 'interactive',
  description: 'Slide interactive (quiz, wordcloud, atelier) - le contenu est gere par le widget.',
  tags: ['quiz', 'wordcloud', 'atelier', 'interactive'],
  useWhen: [
    'Si la slide est liee a un widget interactif (quiz, wordcloud, atelier)',
  ],
  avoidWhen: [
    'Si la slide doit afficher du contenu textuel ou visuel',
  ],
};

export const AllTemplatePatterns: ITemplatePattern[] = [
  SimplePattern,
  SmartLayoutPattern,
  MediaPattern,
  InteractivePattern,
];

export function getPatternById(id: string): ITemplatePattern | undefined {
  return AllTemplatePatterns.find((p) => p.id === id);
}

export function formatPatternsForPrompt(): string {
  return AllTemplatePatterns.filter((p) => p.id !== 'interactive')
    .map((pattern) => {
      return `## Pattern: ${pattern.id}
Description: ${pattern.description}
Tags: ${pattern.tags.join(', ')}

Utiliser quand:
${pattern.useWhen.map((u) => `- ${u}`).join('\n')}

Eviter quand:
${pattern.avoidWhen.map((a) => `- ${a}`).join('\n')}`;
    })
    .join('\n\n---\n\n');
}

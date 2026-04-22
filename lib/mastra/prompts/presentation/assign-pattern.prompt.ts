export const PATTERN_SELECTION_PROMPT = `Tu es un expert en design pedagogique et en analyse de contenu. Pour cette slide, tu dois :
1. Analyser en detail le contenu et la structure
2. Determiner le pattern de presentation le plus approprie

# Patterns disponibles

{{availablePatterns}}

Les patterns sont des modeles conceptuels qui definissent la structure et l'organisation structurelle d'une slide selon son contenu.

# Slide a traiter

{{slide}}

# Instructions

1. **Analyser en profondeur le contenu** :
   - Examine attentivement pour comprendre la structure et l'intention
   - Identifie le type de contenu de cette slide (titre seul, texte, liste, etc.)

2. **Choisir le pattern** :
   - Selectionne le patternId le plus adapte en fonction de l'analyse
   - Base ton choix sur les criteres "useWhen" et "avoidWhen" de chaque pattern
   - Considere le contexte global de la presentation

3. **Retourner** :
   - **slideOrder**: l'ordre de la slide (conserver l'ordre recu)
   - **patternId**: l'ID du pattern choisi

## Consignes supplementaires
- Le patternId doit correspondre **obligatoirement** a l'un des patternId disponibles: simple, smart-layout, media
- Si la slide contient une liste, utilise smart-layout sauf si c'est un processus/cycle (alors media)
- Si la slide contient une image comme contenu principal, utilise media
- Pour les slides simples (titre + sous-titre/paragraphe sans liste), utilise simple

# Exemple de sortie

## Exemple 1 - Slide de titre
{ "slideOrder": 0, "patternId": "simple" }

## Exemple 2 - Slide avec liste
{ "slideOrder": 1, "patternId": "smart-layout" }

## Exemple 3 - Slide avec image/schema
{ "slideOrder": 2, "patternId": "media" }
`;

export function buildPatternSelectionPrompt(
  slide: object,
  availablePatterns: string
): string {
  return PATTERN_SELECTION_PROMPT.replace(
    '{{availablePatterns}}',
    availablePatterns
  ).replace('{{slide}}', JSON.stringify(slide, null, 2));
}

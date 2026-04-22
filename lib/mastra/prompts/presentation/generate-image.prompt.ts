export const OPTIMIZE_IMAGE_DESCRIPTION_PROMPT = `Tu es un expert en creation de prompts pour la generation d'images par IA. Ta mission est d'optimiser une description d'image pour obtenir le meilleur resultat possible.

# Description originale
{{imageDescription}}

# Contexte de la slide
{{slideContext}}

# Instructions

1. **Analyse la description** :
   - Identifie les elements visuels cles
   - Comprends l'objectif pedagogique de l'image

2. **Optimise le prompt** :
   - Ajoute des details sur la composition (cadrage, disposition)
   - Precise les couleurs dominantes (prefere des couleurs professionnelles)
   - Indique le style visuel (infographie, schema, illustration)
   - Ajoute des indications sur l'eclairage et l'ambiance

3. **Adapte pour la generation IA** :
   - Utilise un vocabulaire precis et descriptif
   - Evite les termes ambigus
   - Structure la description du general au particulier

# Regles importantes
- L'image doit etre professionnelle et adaptee a une presentation
- Evite les visages humains detailles (prefere des silhouettes ou icones)
- Privilegiie les schemas, diagrammes et infographies
- Les couleurs doivent etre coherentes avec un theme professionnel

# Format de sortie

Retourne un prompt optimise en anglais pour la generation d'image :
\`\`\`json
{
  "optimizedPrompt": "prompt optimise en anglais",
  "style": "infographic|diagram|illustration|abstract",
  "aspectRatio": "16:9|4:3|1:1"
}
\`\`\`
`;

export const UNSPLASH_SEARCH_PROMPT = `Tu es un expert en recherche d'images. Ta mission est de generer les meilleurs termes de recherche pour trouver une image sur Unsplash.

# Description de l'image souhaitee
{{imageDescription}}

# Contexte de la slide
{{slideContext}}

# Instructions

1. **Analyse les besoins** :
   - Identifie les concepts visuels principaux
   - Determine l'ambiance recherchee

2. **Genere les termes de recherche** :
   - Utilise des mots-cles en anglais
   - Prefere des termes generiques plutot que trop specifiques
   - Inclus des termes relatifs a l'ambiance (professional, modern, clean)

# Format de sortie

Retourne les termes de recherche :
\`\`\`json
{
  "searchTerms": ["term1", "term2", "term3"],
  "orientation": "landscape|portrait|square"
}
\`\`\`
`;

export function buildOptimizeImagePrompt(
  imageDescription: string,
  slideContext: string
): string {
  return OPTIMIZE_IMAGE_DESCRIPTION_PROMPT.replace(
    '{{imageDescription}}',
    imageDescription
  ).replace('{{slideContext}}', slideContext);
}

export function buildUnsplashSearchPrompt(
  imageDescription: string,
  slideContext: string
): string {
  return UNSPLASH_SEARCH_PROMPT.replace(
    '{{imageDescription}}',
    imageDescription
  ).replace('{{slideContext}}', slideContext);
}

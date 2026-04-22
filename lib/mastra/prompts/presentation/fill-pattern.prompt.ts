export const SIMPLE_PATTERN_PROMPT = `Tu es un expert en integration HTML et en design de presentation. Ta mission est de remplir un pattern HTML avec le contenu d'une slide.

# Contenu de la slide
{{slide}}

# Pattern HTML a modifier
\`\`\`html
{{patternHtml}}
\`\`\`

# Noeuds optionnels disponibles
{{optionalNodes}}

# Instructions

1. **Analyse le contenu de la slide** :
   - Identifie les elements cles : titre, sous-titres, paragraphes, listes, etc.
   - Comprends la hierarchie et l'importance relative des informations

2. **Analyse la structure du pattern HTML** :
   - Repere les zones ou le contenu doit etre insere (elements avec data-agent-role)
   - Identifie les commentaires indiquant des zones pour contenu optionnel

3. **Utilisation des noeuds optionnels** :
   - Lorsque tu rencontres un commentaire comme <!-- FACULTATIF: paragraph -->, tu dois :
     a. Verifier si le contenu de la slide necessite ce type de noeud
     b. Si oui, inserer le HTML du noeud optionnel correspondant
     c. Remplir ce noeud avec le contenu approprie
   - Pour le text align, utilise center par defaut. Left si le paragraphe est long.

4. **Insere le contenu dans le HTML** :
   - Place le titre dans l'element avec data-agent-role="slide-title"
   - Insere les autres contenus dans les elements appropries

# Regles importantes
- Ne modifie PAS la structure de base du pattern HTML
- Conserve TOUS les attributs originaux (data-*, style, level, etc.)
- N'invente PAS de nouvelles balises
- Assure-toi que le HTML genere est valide

# Format de sortie
\`\`\`json
{
  "generatedHtml": "HTML complet de la slide remplie"
}
\`\`\`
`;

export const SMART_LAYOUT_PATTERN_PROMPT = `Tu es un expert en integration HTML et en design de presentation. Ta mission est de remplir un pattern HTML smart-layout avec le contenu d'une slide contenant une liste.

# Contenu de la slide
{{slide}}

# Pattern HTML a modifier
\`\`\`html
{{patternHtml}}
\`\`\`

# Instructions

1. **Analyse le contenu de la slide** :
   - Identifie le titre principal
   - Identifie la liste et ses elements
   - Chaque element de liste a un subtitle et un content

2. **Remplis le smart-layout** :
   - Place le titre dans data-agent-role="slide-title"
   - Pour chaque element de la liste, cree une cellule smart-layout-cell
   - Dans chaque cellule :
     - Place le subtitle dans data-agent-role="cell-heading"
     - Place le content dans data-agent-role="cell-content"
     - Si un number est present, utilise data-statistic

3. **Variantes de smart-layout disponibles** :
   - framed : Encadrement simple
   - chips : Puces/badges
   - blockWithBgColorAndIcon : Blocs avec fond et icone
   - framedWithCircle : Encadrement avec cercle numerote
   - framedWithHeader : Encadrement avec en-tete
   - iconWithText : Icone avec texte

Choisis la variante la plus adaptee au contenu.

# Regles importantes
- Respecte exactement le nombre d'elements de la liste
- Conserve tous les attributs data-* du pattern
- Ne depasse pas 8 cellules pour la lisibilite

# Format de sortie
\`\`\`json
{
  "generatedHtml": "HTML complet de la slide remplie",
  "variant": "nom de la variante utilisee"
}
\`\`\`
`;

export const MEDIA_PATTERN_PROMPT = `Tu es un expert en integration HTML et en design de presentation. Ta mission est de remplir un pattern HTML media avec le contenu d'une slide contenant une image.

# Contenu de la slide
{{slide}}

# Pattern HTML a modifier
\`\`\`html
{{patternHtml}}
\`\`\`

# Instructions

1. **Analyse le contenu de la slide** :
   - Identifie le titre principal
   - Identifie l'element de type "image" avec sa description
   - Identifie les sous-titres ou paragraphes optionnels

2. **Remplis le pattern media** :
   - Place le titre dans data-agent-role="slide-title"
   - L'element data-type="media-placeholder" sera remplace par l'image generee
   - Ajoute les sous-titres/paragraphes optionnels si necessaires

3. **Description de l'image** :
   - La description doit etre extraite du contenu de type "image"
   - Cette description sera utilisee pour generer l'image via AI

# Format de sortie
\`\`\`json
{
  "generatedHtml": "HTML complet de la slide remplie",
  "imageDescription": "description de l'image a generer"
}
\`\`\`
`;

export function buildFillPatternPrompt(
  patternId: string,
  slide: object,
  patternHtml: string,
  optionalNodes?: string
): string {
  let prompt: string;

  switch (patternId) {
    case 'smart-layout':
      prompt = SMART_LAYOUT_PATTERN_PROMPT;
      break;
    case 'media':
      prompt = MEDIA_PATTERN_PROMPT;
      break;
    default:
      prompt = SIMPLE_PATTERN_PROMPT;
  }

  return prompt
    .replace('{{slide}}', JSON.stringify(slide, null, 2))
    .replace('{{patternHtml}}', patternHtml)
    .replace('{{optionalNodes}}', optionalNodes || '');
}

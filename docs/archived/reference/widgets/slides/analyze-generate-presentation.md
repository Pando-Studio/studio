# Analyse du Système de Génération de Présentations

Ce document documente l'analyse complète du système de génération de présentations Qiplim v1.

## 1. Point d'entrée principal

**Fichier:** `qiplim/apps/qiplim-v1/qiplim3/netlify/functions/generate-presentation-background/index.ts`

### Description
Fonction Netlify Background déclenchée via HTTP. Elle utilise le middleware `withAuthAndValidation` pour l'authentification et la validation des paramètres requis (`programId`, `presentationParams`).

### Étapes du handler principal

| Étape | Fonction | Description |
|-------|----------|-------------|
| 1 | `step1_PreparePlanAndCredits` | Vérifie les crédits de l'utilisateur et les soustrait |
| 2 | `step2_CreatePresentationDocument` | Crée le document de présentation dans Firestore |
| 3 | `step3_GenerateSlides` | Génère le plan et le contenu des slides via workflow AI |
| 4 | `step4_CreateSlides` | Crée les slides complètes (patterns, images, etc.) |

### Gestion des erreurs
- En cas d'erreur, les crédits sont restitués à l'utilisateur
- Le statut est mis à jour via streaming dans Firestore

---

## 2. Workflows impliqués

### Workflow 1: `generateSlidesWorkflow`

**Fichier:** `backend/ai/workflows/presentation/1-generate-slides/1-generate-slides.workflow.ts`

**Rôle:** Génère la structure et le contenu initial de toutes les slides de la présentation.

**Schema d'entrée (trigger):**
- `programContext`: Informations sur la formation (titre, description, durée, cible, secteur, niveau, objectifs)
- `generationParams`: Paramètres de génération (textQuantity, tone)
- `programContent`: Contenu et architecture complète de la formation
- `imageSource`: Source des images (`ai` ou `unsplash`)

**Étape unique:**
- `generateSlidesStep` - Appelle l'agent `GenerateSlidesAgent` pour générer la structure des slides

---

### Workflow 2: `createSlideWorkflow`

**Fichier:** `backend/ai/workflows/presentation/2-create-slide/create-slide.workflow.ts`

**Rôle:** Pipeline séquentiel pour créer une slide complète à partir du contenu généré.

**Pipeline en 5 étapes:**

```
assignPatternToSlideStep (2a)
        ↓
   fillPatternStep (2b)
        ↓
   findIconsStep (2c) [conditionnel]
        ↓
    addImageStep (2d) [conditionnel]
        ↓
 generateImageStep (2e) [conditionnel]
```

#### Étape 2a: Assign Pattern
- **Fichier:** `steps/2a-assign-pattern/2a-assign-pattern.step.ts`
- **Agent:** `AssignPatternToSlideAgent`
- **Rôle:** Analyse le contenu de la slide et assigne le template HTML le plus approprié
- **Patterns disponibles:** `simple`, `smart-layout`, `media`, `interactive`

#### Étape 2b: Fill Pattern
- **Fichier:** `steps/2b-fill-pattern/2b-fill-pattern.step.ts`
- **Agent:** `FillPatternAgent`
- **Rôle:** Remplit le template HTML choisi avec le contenu de la slide
- **Prompts spécifiques:** `simple-pattern.prompt.ts`, `smart-layout-pattern.prompt.ts`, `media-pattern.prompt.ts`

#### Étape 2c: Find Icons (conditionnelle)
- **Fichier:** `steps/2c-find-icons/2c-find-icons.step.ts`
- **Agent:** `FindIconsAgent`
- **Rôle:** Sélectionne les icônes appropriées pour les variants smart-layout
- **Condition:** Uniquement pour `smart-layout` avec variants: `chips`, `blockWithBgColorAndIcon`, `framedWithCircle`, `framedWithHeader`, `iconWithText`

#### Étape 2d: Add Image (conditionnelle)
- **Fichier:** `steps/2d-add-image/2d-add-image.step.ts`
- **Agent:** `AddImageAgent`
- **Rôle:** Décide si une image d'illustration est nécessaire et sa position (`top`, `left`, `right`)
- **Condition:** Skippée pour les patterns `media`

#### Étape 2e: Generate Image (conditionnelle)
- **Fichier:** `steps/2e-generate-image/2e-generate-image.step.ts`
- **Agents:** `OptimizeAiImageDescriptionAgent` ou `OptimizeUnsplashImageDescriptionAgent`
- **Rôle:** Génère ou récupère l'image selon la source choisie
- **Condition:** Uniquement si une image a été décidée à l'étape 2d

---

## 3. Agents utilisés

| Agent | Rôle | Modèle | Fichier |
|-------|------|--------|---------|
| `GenerateSlidesAgent` | Génère la structure complète des slides | O3 (OpenAI) | `agents/presentation/create-presentation/1-generate-slides.agent.ts` |
| `AssignPatternToSlideAgent` | Assigne le template pattern approprié | O3 (OpenAI) | `agents/presentation/create-presentation/2a-assign-pattern-to-slide.agent.ts` |
| `FillPatternAgent` | Remplit le pattern avec le contenu HTML | O3 (OpenAI) | `agents/presentation/create-presentation/2b-fill-pattern.agent.ts` |
| `FindIconsAgent` | Sélectionne les icônes pour smart-layout | O3 (OpenAI) | `agents/presentation/create-presentation/2c-find-icons.agent.ts` |
| `AddImageAgent` | Décide si une image est nécessaire | O3-MINI (OpenAI) | `agents/presentation/create-presentation/2d-add-image.agent.ts` |
| `OptimizeAiImageDescriptionAgent` | Génère description pour génération AI | GPT-4O-MINI (OpenAI) | `agents/presentation/create-presentation/2e-optimize-accent-image-description.agent.ts` |
| `OptimizeUnsplashImageDescriptionAgent` | Génère mots-clés pour recherche Unsplash | GPT-4O-MINI (OpenAI) | `agents/presentation/create-presentation/2e-optimize-accent-image-description.agent.ts` |
| `OptimizeImageContextForAIAgent` | Expert en prompts visuels | GPT-4O-MINI (OpenAI) | `agents/presentation/optimize-image-context-for-ai.agent.ts` |
| `OptimizeImageContextForUnsplashAgent` | Expert en mots-clés Unsplash | GPT-4O-MINI (OpenAI) | `agents/presentation/optimize-image-context-for-unsplash.agent.ts` |

### Modèles utilisés (référence)

| Enum | Valeur | Provider |
|------|--------|----------|
| `Model.O3` | `o3` | OpenAI |
| `Model.O3MINI` | `o3-mini` | OpenAI |
| `Model.GPT4OMINI` | `gpt-4o-mini` | OpenAI |

---

## 4. Prompts utilisés

### Workflow 1 - Génération des slides

| Prompt | Fichier | Description |
|--------|---------|-------------|
| `GENERATE_SLIDES_PROMPT` | `1-generate-slides/steps/1/prompt/generate-slide.prompt.ts` | Prompt principal pour générer la structure des slides |
| `MEDIA_SLIDES_RULE` | (même fichier) | Règles pour slides médias (si `imageSource === 'ai'`) |
| `MEDIA_SLIDES_EXAMPLES` | (même fichier) | Exemples de slides médias |

### Workflow 2 - Création des slides

| Prompt | Fichier | Description |
|--------|---------|-------------|
| `PATTERN_SELECTION_PROMPT` | `2a-assign-pattern/prompt/assign-pattern.prompt.ts` | Sélection du template pattern |
| `SIMPLE_PATTERN_PROMPT` | `2b-fill-pattern/prompts/simple-pattern.prompt.ts` | Remplissage pattern simple |
| `SMART_LAYOUT_PATTERN_PROMPT` | `2b-fill-pattern/prompts/smart-layout-pattern.prompt.ts` | Remplissage pattern smart-layout |
| `MEDIA_PATTERN_PROMPT` | `2b-fill-pattern/prompts/media-pattern.prompt.ts` | Remplissage pattern média |
| `FIND_ICONS_PROMPT` | `2c-find-icons/prompt/find-icons.prompt.ts` | Recherche d'icônes |
| `ADD_IMAGE_PROMPT` | `2d-add-image/prompt/add-image.prompt.ts` | Décision d'ajout d'image |

---

## 5. Flux de données complet

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HTTP REQUEST                                     │
│  params: { programId, presentationParams }                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   withAuthAndValidation Middleware                       │
│  - Authentification utilisateur                                         │
│  - Validation des paramètres requis                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 STEP 1: Prepare Plan & Credits                          │
│  - Récupération du programme depuis Firestore                           │
│  - Estimation du nombre de slides et images                             │
│  - Vérification et soustraction des crédits                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              STEP 2: Create Presentation Document                        │
│  - Création du document dans Firestore                                  │
│  - Retourne: presRef, programData, folderId                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 3: Generate Slides                               │
│                   [generateSlidesWorkflow]                               │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    generateSlidesStep                              │ │
│  │  Agent: GenerateSlidesAgent (O3)                                   │ │
│  │  Input: programContext, generationParams, programContent           │ │
│  │  Output: Array<IGeneratedSlideFirstStep>                           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     STEP 4: Create Slides                                │
│               [createSlideWorkflow × N slides]                           │
│                                                                          │
│  Pour chaque slide générée:                                             │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 2a. assignPatternToSlideStep                                       │ │
│  │     Agent: AssignPatternToSlideAgent (O3)                          │ │
│  │     → Assigne: simple | smart-layout | media | interactive         │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 2b. fillPatternStep                                                │ │
│  │     Agent: FillPatternAgent (O3)                                   │ │
│  │     → Génère le HTML avec le contenu                               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 2c. findIconsStep [CONDITIONNEL]                                   │ │
│  │     Agent: FindIconsAgent (O3)                                     │ │
│  │     Condition: smart-layout + variants nécessitant icônes          │ │
│  │     → Ajoute les icônes appropriées                                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 2d. addImageStep [CONDITIONNEL]                                    │ │
│  │     Agent: AddImageAgent (O3-MINI)                                 │ │
│  │     Condition: pattern !== media                                   │ │
│  │     → Décide: shouldAddImage, imagePosition (top|left|right)       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 2e. generateImageStep [CONDITIONNEL]                               │ │
│  │     Agents: OptimizeAi/UnsplashImageDescriptionAgent (GPT-4O-MINI) │ │
│  │     Condition: shouldAddImage === true                             │ │
│  │     → Génère/récupère l'image et met à jour le HTML                │ │
│  │                                                                    │ │
│  │     Sources d'images:                                              │ │
│  │     - AI: Imagen 4 / Gemini 3 Pro (aspect ratio selon position)    │ │
│  │     - Unsplash: Recherche par mots-clés optimisés                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     FIRESTORE UPDATE                                     │
│  - Mise à jour du document présentation                                 │
│  - Streaming du statut (globalProgress: 100%)                           │
│  - Retourne: presentationId                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         RESPONSE                                         │
│  { statusCode: 200, body: { success: true } }                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Structure des fichiers

```
qiplim/apps/qiplim-v1/qiplim3/
├── netlify/functions/generate-presentation-background/
│   └── index.ts                           # Point d'entrée principal
│
├── backend/
│   ├── presentations/
│   │   ├── 2-create-presentation-document.ts
│   │   ├── 3-generate-slides.ts
│   │   ├── 4-create-slides.ts
│   │   └── types/generated-slides.ts
│   │
│   ├── ai/
│   │   ├── agents/presentation/
│   │   │   ├── create-presentation/
│   │   │   │   ├── 1-generate-slides.agent.ts
│   │   │   │   ├── 2a-assign-pattern-to-slide.agent.ts
│   │   │   │   ├── 2b-fill-pattern.agent.ts
│   │   │   │   ├── 2c-find-icons.agent.ts
│   │   │   │   ├── 2d-add-image.agent.ts
│   │   │   │   └── 2e-optimize-accent-image-description.agent.ts
│   │   │   ├── optimize-image-context-for-ai.agent.ts
│   │   │   └── optimize-image-context-for-unsplash.agent.ts
│   │   │
│   │   └── workflows/presentation/
│   │       ├── 1-generate-slides/
│   │       │   ├── 1-generate-slides.workflow.ts
│   │       │   └── steps/1/
│   │       │       ├── generate-slides.step.ts
│   │       │       └── prompt/generate-slide.prompt.ts
│   │       │
│   │       └── 2-create-slide/
│   │           ├── create-slide.workflow.ts
│   │           └── steps/
│   │               ├── 2a-assign-pattern/
│   │               ├── 2b-fill-pattern/
│   │               ├── 2c-find-icons/
│   │               ├── 2d-add-image/
│   │               └── 2e-generate-image/
│   │
│   └── models.ts                          # Configuration des modèles AI
│
└── src/shared/
    └── models.ts                          # Définition des enums Model, Provider
```

---

## 7. Points d'attention

### Gestion des crédits
- Les crédits sont soustraits au début du processus
- En cas d'erreur, ils sont automatiquement restitués

### Optimisation conditionnelle
- Les étapes 2c, 2d, 2e peuvent être skippées selon le contexte
- Le champ `workflowSkipSteps` est propagé entre les étapes

### Sources d'images
- **AI (Imagen 4 / Gemini 3 Pro):** Génération avec prompts détaillés, aspect ratio dynamique
- **Unsplash:** Recherche par mots-clés optimisés en anglais

### Patterns disponibles
| Pattern | Description |
|---------|-------------|
| `simple` | Layout basique avec texte |
| `smart-layout` | Layout avancé avec variants (chips, icons, etc.) |
| `media` | Slide centrée sur une image/média |
| `interactive` | Slide avec widget interactif (quiz, wordcloud, etc.) |

---

## 8. Édition Frontend avec TipTap

### 8.1 Architecture de routage

- **Route:** `/program/:programId/presentation/:presentationId/slide/:slideId`
- **Fichier config:** `src/features/auth/configs/router.config.tsx`
- **Loaders:** `PresentationLoader`, `ProgramLoader`

---

### 8.2 Hiérarchie des composants

```
PresentationPage
├── SidebarLeft (ListSlides)
├── SlideNavigation
└── Slide
    └── SlideRenderer / InteractiveSlideRenderer
        └── BlockEditor (TipTap)
```

**Fichiers clés:**
- `src/pages/presentation/slides/editor/components/BlockEditor/BlockEditor.tsx`
- `src/pages/presentation/slides/SlideRenderer.tsx`
- `src/features/presentation/components/slide.tsx`

---

### 8.3 Configuration TipTap

**Extensions utilisées** (`extension-kit.ts`):

| Catégorie | Extensions |
|-----------|------------|
| **Core** | StarterKit, Document, SlashCommand, Placeholder |
| **Layout** | LayoutNode, AccentNode, BodyNode, Columns, Column, Box |
| **Texte** | Paragraph, Heading (1-6), BulletList, OrderedList |
| **Média** | ImageBlock, ImageBlockLayout, MediaPlaceholder, Youtube, Icon |
| **Structure** | SmartLayout, SmartLayoutCell, Table |

**Initialisation:**
```typescript
const editor = useEditor({
  extensions,
  content: slide.content,
  onUpdate: handleUpdate,
  parseOptions: { preserveWhitespace: true },
  immediatelyRender: true,
})
```

---

### 8.4 Gestion d'état

**Zustand Store** (`slide.store.ts`):
- `currentSlideId` - Slide active
- Persisté dans localStorage

**React Query:**
| Query | Description |
|-------|-------------|
| `getPresentationQuery` | Métadonnées présentation |
| `getSlidesQuery` | Liste des slides |
| `getSlideQuery` | Slide individuelle |

---

### 8.5 Synchronisation temps réel

**Hooks de sync:**
- `useSlidesRealtimeSync` - Écoute Firestore pour chaque slide
- `usePresentationRealtimeSync` - Écoute document présentation

**Debounce des mises à jour** (`use-update-content-debounced.ts`):
- Délai: 500ms
- Extraction automatique du titre depuis le premier nœud
- Mise à jour Firestore: `presentations/{id}/slides/{slideId}`

---

### 8.6 Structure Firestore

```
presentations/{presentationId}
├── slides/{slideId}
│   ├── content (HTML TipTap)
│   ├── title
│   ├── order
│   ├── state
│   ├── type
│   └── isInteractive
└── widgets/{widgetId} (pour slides interactives)
```

---

### 8.7 Types de données (`presentation.d.ts`)

**ISlidePresentation (Discriminated Union):**

| Type | Condition | Description |
|------|-----------|-------------|
| Slide interactive | `isInteractive: true` + `widgetRef` | Slide avec widget (quiz, atelier, wordcloud) |
| Slide texte | `isInteractive: false` + `widgetRef: null` | Slide texte standard |

---

### 8.8 Opérations CRUD sur les slides

| Opération | Hook | Fichier |
|-----------|------|---------|
| Créer | `useCreateSlide` | `use-create-slide.ts` |
| Modifier | `useUpdateContentDebounced` | `use-update-content-debounced.ts` |
| Supprimer | `useDeleteSlide` | `use-delete-slide.ts` |
| Réordonner | `useMoveSlide` | `use-move-slide.ts` |

---

### 8.9 Flux de données complet (édition)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER EDIT                                       │
│  Utilisateur modifie le contenu dans TipTap                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       TipTap onUpdate                                    │
│  Editor déclenche callback avec nouveau contenu                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Debounce (500ms)                                     │
│  useUpdateContentDebounced attend stabilisation                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      updateDocument()                                    │
│  Mise à jour Firestore: presentations/{id}/slides/{slideId}            │
│  - content: HTML TipTap                                                 │
│  - title: extrait du premier nœud                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    onSnapshot Listener                                   │
│  useSlidesRealtimeSync détecte le changement                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    React Query Cache                                     │
│  Mise à jour automatique du cache via setQueryData                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Component Re-render                                   │
│  Interface utilisateur mise à jour                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 8.10 Fichiers analysés

| Catégorie | Fichiers |
|-----------|----------|
| Éditeur | `BlockEditor.tsx`, `extension-kit.ts` |
| Routing | `router.config.tsx`, `presentation.loader.tsx` |
| State | `slide.store.ts`, `presentation.queries.ts` |
| Sync | `use-slides-realtime-sync.ts`, `use-update-content-debounced.ts` |
| Types | `presentation.d.ts` |
| Utils | `slideUtils.ts`, `updateDocument.ts` |

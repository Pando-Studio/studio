# Studio - Widget System

## Widget Types and Kinds

Every widget has a `type` (what it is) and a `kind` (how it relates to other widgets).

### WidgetType → WidgetKind mapping

| Type | Kind | Description | Engage-deployable |
|------|------|-------------|-------------------|
| `QUIZ` | LEAF | Multi-question quiz with scoring | Yes |
| `WORDCLOUD` | LEAF | Word collection from participants | Yes |
| `ROLEPLAY` | LEAF | Multi-agent conversation simulator | Yes |
| `MULTIPLE_CHOICE` | LEAF | Single question, option selection | Yes |
| `POSTIT` | LEAF | Sticky note brainstorm | Yes |
| `RANKING` | LEAF | Item prioritization | Yes |
| `OPENTEXT` | LEAF | Free-form text response | Yes |
| `IMAGE` | LEAF | AI-generated image | No |
| `PRESENTATION` | LEAF | Slide deck metadata | No |
| `SLIDE` | LEAF | Individual slide | No |
| `SEQUENCE` | CONTAINER | Linear sequence of children | No (children are deployed) |
| `COURSE_MODULE` | COMPOSITE | Structured course unit with slots | No (children are deployed) |

**Source**: `apps/studio/components/widgets/types.ts` (`DEFAULT_WIDGET_KIND` mapping)

### Kind definitions

| Kind | Behavior | Children | Examples |
|------|----------|----------|----------|
| `LEAF` | Terminal widget with content in `data` | None | Quiz, Wordcloud, Image |
| `CONTAINER` | Holds N ordered children | Via `parentId` | Sequence |
| `COMPOSITE` | Holds children in named slots | Via `parentId` + `slotId` | CourseModule |

## Widget Registry

**File**: `apps/studio/components/widgets/registry.ts`

Maps each widget type to its Display and Editor React components:

```typescript
const registry = {
  QUIZ:            { Display: QuizDisplay, Editor: QuizEditor, Player: QuizPlayer },
  WORDCLOUD:       { Display: WordcloudDisplay, Editor: WordcloudEditor },
  ROLEPLAY:        { Display: RoleplayDisplay, Editor: RoleplayEditor },
  MULTIPLE_CHOICE: { Display: MultipleChoiceDisplay, Editor: MultipleChoiceEditor },
  POSTIT:          { Display: PostItDisplay, Editor: PostItEditor },
  RANKING:         { Display: RankingDisplay, Editor: RankingEditor },
  OPENTEXT:        { Display: OpentextDisplay, Editor: OpentextEditor },
  // IMAGE, PRESENTATION, SLIDE, SEQUENCE, COURSE_MODULE use GenericWidgetDisplay/Editor
};
```

### Fallback rendering

Types without specialized renderers use `GenericWidgetDisplay` (read-only JSON view) and `GenericWidgetEditor` (JSON editing).

### Component props

```typescript
// Display component
interface WidgetDisplayProps {
  data: Record<string, unknown>;
  widget?: WidgetData;
  children?: WidgetData[];
}

// Editor component
interface WidgetEditorProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
  widget?: WidgetData;
  children?: WidgetData[];
  onAddChild?: (slotId: string, type: WidgetType) => Promise<void>;
  onRemoveChild?: (childId: string) => Promise<void>;
  onReorderChildren?: (slotId: string, orderedIds: string[]) => Promise<void>;
}
```

## Type Guards

**File**: `apps/studio/components/widgets/types.ts`

Runtime type checking for widget data shapes:

```typescript
isQuizData(data)           // Has questions[].question + options
isWordcloudData(data)      // Has prompt: string
isRoleplayData(data)       // Has scenario + roles[]
isMultipleChoiceData(data) // Has questions[].options
isPostItData(data)         // Has prompt, optional categories
isRankingData(data)        // Has prompt + items[]
isOpenTextData(data)       // Has prompt, no items/categories
```

Widget kind guards:

```typescript
isCompositeWidget(widget)  // kind === 'COMPOSITE'
isContainerWidget(widget)  // kind === 'CONTAINER'
isLeafWidget(widget)       // kind === 'LEAF'
hasChildren(widget)        // children?.length > 0
```

## WPS++ Composition

### What is implemented

The Widget Protocol Specification (WPS++) defines how widgets compose hierarchically. The **type system** is fully implemented in `lib/composition/composition.ts`.

| Feature | TypeScript Types | Runtime Logic | Status |
|---------|-----------------|---------------|--------|
| Widget kinds (leaf/composite/container) | Yes | Yes (DB enum) | Implemented |
| Slots with accept rules | Yes | Yes (validation) | Implemented |
| Cardinality (min/max children) | Yes | Yes (validation) | Implemented |
| Cycle detection | Yes | Yes (validation) | Implemented |
| Depth validation | Yes | Yes (validation) | Implemented |
| Delivery mode compatibility | Yes | Yes (validation) | Implemented |
| Orchestration (sequential) | Yes (types only) | No runtime | Types only |
| Orchestration (state-machine) | Yes (types only) | No runtime | Types only |
| Orchestration (conditional) | Yes (types only) | No runtime | Types only |
| Data pipelines | Yes (types only) | No runtime | Types only |
| Composition runtime API | Yes (types only) | No runtime | Types only |

### Composition types

**File**: `apps/studio/lib/composition/composition.ts`

```typescript
interface WPSComposition {
  kind: WidgetKind;
  slots?: WPSSlot[];
  accepts?: WPSAcceptRule[];
  providesAs?: string[];
}

interface WPSSlot {
  id: string;
  name: string;
  description?: string;
  required: boolean;
  accepts: WPSAcceptRule[];
  minChildren?: number;
  maxChildren?: number;
  default?: WPSSlotDefault;
}

interface WPSAcceptRule {
  tags?: string[];
  widgetIds?: string[];
  requiresCapabilities?: string[];
  excludeTags?: string[];
  excludeWidgetIds?: string[];
}
```

### Composition validation

**File**: `apps/studio/lib/composition/composition-validation.ts`

| Function | Purpose |
|----------|---------|
| `isCompatible(childTags, childWidgetId, slot)` | Check if a child matches a slot's accept rules |
| `validateSlotCardinality(slot, currentCount)` | Check min/max children |
| `detectCycle(widgetId, parentChain)` | Prevent circular references |
| `validateDepth(currentDepth, limits?)` | Enforce max nesting depth |
| `validateChildDeliveryCompat(parentDelivery, childDelivery)` | Ensure delivery mode compatibility |

### Default limits

```typescript
const DEFAULT_COMPOSITION_LIMITS = {
  maxDepth: 5,
  maxTotalChildren: 50,
  maxChildrenPerSlot: 20,
  maxPipelines: 10,
  maxTransitions: 50,
};
```

### Orchestration types (defined, not executed)

The orchestration system defines 4 modes. Types exist in `composition.ts` but no engine evaluates them at runtime.

```typescript
type OrchestrationMode = 'sequential' | 'parallel' | 'conditional' | 'state-machine';

interface WPSOrchestration {
  mode: OrchestrationMode;
  sequence?: WPSSequenceStep[];     // Sequential mode
  conditions?: WPSCondition[];       // Conditional mode
  states?: WPSState[];               // State machine
  initialState?: string;
  transitions?: WPSTransition[];
  onComplete?: WPSAction[];
  onError?: WPSAction[];
}
```

These types are stored in `Widget.orchestration` (Json column) but never read back by any execution engine. They are a forward-looking spec that will be implemented incrementally.

### Delivery types

```typescript
type DeliveryModeId = 'live-session' | 'self-paced' | 'static';
type PlayerType = 'engage-session' | 'standalone-player' | 'static-renderer';

interface WPSDelivery {
  modes: WPSDeliveryModeConfig[];
  defaultMode: DeliveryModeId;
}

interface WPSDeliveryModeConfig {
  id: DeliveryModeId;
  views: WidgetView[];           // 'edit' | 'speaker' | 'viewer' | 'results'
  requiresCapabilities?: string[];
  producesOutput: boolean;
  playerType: PlayerType;
}
```

Currently, only `live-session` with `engage-session` player is functional (via deploy-to-engage).

## Widget Template System

### How generation works

Widget generation is template-driven. Each template defines inputs, prompts, and output schemas.

**File**: `apps/studio/lib/widget-templates/registry.ts`

```
1. User picks a template (e.g., "quiz-interactive")
2. Form collects inputs (questionCount, difficulty, etc.)
3. POST /api/studios/[id]/widgets/generate
     { templateId, title, inputs, sourceIds }
4. Create Widget (DRAFT) + GenerationRun (PENDING)
5. Execute Mastra workflow:
     a. Load template + validate inputs
     b. Hybrid search across selected sources (RAG)
     c. Build prompt from template + RAG context
     d. Call LLM (respecting BYOK resolution chain)
     e. Parse response with Zod schema
     f. Update Widget.data → status READY
6. Client polls /generations until COMPLETED
```

### Template format

Templates are JSON files in `lib/widget-templates/templates/`:

```typescript
interface GenerationTemplate {
  id: string;                        // e.g., "qiplim/quiz-interactive"
  name: string;                      // Display name
  description: string;               // Human description
  widgetType: WidgetType;            // Target widget type
  inputs: JSONSchemaObject;          // Input schema (displayed as form)
  outputSchema: JSONSchemaObject;    // Expected LLM output shape
  systemPrompt: string;              // System prompt for LLM
  userPromptTemplate: string;        // User prompt template (with {{variable}} placeholders)
  ragConfig?: {
    maxChunks: number;
    minScore: number;
  };
}
```

### Available templates

Templates exist for: quiz-interactive, wordcloud, roleplay, multiple-choice, postit, ranking, opentext, course-module, presentation, image.

### Mastra workflows

**Directory**: `apps/studio/lib/mastra/workflows/`

Each workflow is a sequence of steps:

| Workflow | Steps |
|----------|-------|
| `generate-widget.workflow.ts` | Retrieve → Generate → Validate → Store |
| `generate-presentation.workflow.ts` | Retrieve → Plan deck → Generate slides → Store |
| `generate-course-plan.workflow.ts` | Retrieve → Generate plan → Validate → Store |
| `generate-roleplay.workflow.ts` | Retrieve → Generate scenario + roles → Store |

## Deploying Widgets to Engage

### Current implementation

**File**: `apps/studio/lib/deploy/flatten-widgets.ts`

The `flattenWidgetsForDeploy()` function recursively walks the widget tree and extracts only Engage-compatible leaf widgets:

```typescript
const DEPLOYABLE_TYPES = new Set([
  'MULTIPLE_CHOICE', 'QUIZ', 'WORDCLOUD', 'POSTIT',
  'ROLEPLAY', 'RANKING', 'OPENTEXT',
]);
```

**What gets deployed**: `{ type, title, description, config (= Widget.data), order }` per leaf.

**What is lost**: hierarchy, parentId, slotId, composition, orchestration, delivery, kind, sourceIds, templateId.

For COURSE_MODULE, children are sorted by slot order (`intro` → `activities` → `assessment`) before flattening.

See `docs/studio/09-studio-engage-bridge.md` for the planned Playback Plan evolution.

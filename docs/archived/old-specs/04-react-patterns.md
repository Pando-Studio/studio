# Studio - React & Next.js Patterns

## Server vs Client Components

### Boundary

Studio uses a **client-heavy** architecture. The server/client boundary is at the dashboard layout:

| Component | Type | Why |
|-----------|------|-----|
| `app/layout.tsx` | Server | Root layout, fonts, metadata |
| `app/page.tsx` | Server | Home redirect |
| `app/(auth)/login/page.tsx` | Client | Form state, auth client |
| `app/(auth)/register/page.tsx` | Client | Form state, auth client |
| `app/(dashboard)/layout.tsx` | Client | `usePathname()` for sidebar |
| `app/(dashboard)/studios/[id]/*` | Client | All studio pages are interactive |
| `app/(dashboard)/dashboard/page.tsx` | Client | Studio list with actions |
| `app/(dashboard)/library/page.tsx` | Client | File browser with filters |

### No RSC Data Fetching

Studio does **not** use React Server Components for data fetching. All data is fetched client-side via `fetch()` in hooks, managed by `StudioContext`. This is intentional — the Studio workspace is a persistent, panel-based UI where polling and streaming are primary data patterns.

**Do not** introduce `async` Server Components or server-side data fetching without explicit discussion. The current architecture assumes client-side data ownership.

## State Management

### StudioContext (primary)

**File**: `components/studio/context/StudioContext.tsx`

A single React Context provides all studio-scoped state:

```typescript
// Data state
const [studio, setStudio] = useState<Studio | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [coursePlans, setCoursePlans] = useState<CoursePlan[]>([]);
const [favorites, setFavorites] = useState<UserFavorite[]>([]);
const [runs, setRuns] = useState<GenerationRun[]>([]);

// Selection state
const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
const [activeConversationId, setActiveConversationId] = useState<string | undefined>();

// UI state
const [isSourcesPanelCollapsed, setSourcesPanelCollapsed] = useState(false);
const [isRightPanelCollapsed, setRightPanelCollapsed] = useState(false);
```

### Derived hooks

```typescript
import { useStudio } from '@/components/studio';          // Full context
import { useSources } from '@/components/studio';          // Sources slice
import { useConversations } from '@/components/studio';    // Conversations slice
import { usePanels } from '@/components/studio';           // UI panel state
```

### What is NOT used

| Library | Status | Notes |
|---------|--------|-------|
| Zustand | Not used | Engage uses it, Studio uses Context |
| TanStack Query | Not used | Engage uses it, Studio uses manual fetch |
| Redux | Not used | - |
| SWR | Not used | - |
| Jotai / Recoil | Not used | - |

### State categories

| Category | Location | Pattern |
|----------|----------|---------|
| Studio data (widgets, sources, plans) | `StudioContext` | Fetch on mount, poll on active runs |
| Form inputs | Local `useState` per component | Controlled inputs |
| Modal visibility | Local `useState` | Boolean toggles |
| Generation tracking | `StudioContext.runs` | Polling every 2s |
| UI layout (panels) | `StudioContext` | Boolean collapsed state |

## Data Fetching

### Pattern: fetch() + useState

All client data fetching uses the native `fetch` API with manual loading/error state:

```typescript
// Standard pattern used throughout the app
const [data, setData] = useState<T | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

const fetchData = useCallback(async () => {
  try {
    setIsLoading(true);
    setError(null);
    const response = await fetch(`/api/studios/${studioId}`);
    if (!response.ok) throw new Error('Failed to fetch');
    const result = await response.json();
    setData(result.studio);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    setIsLoading(false);
  }
}, [studioId]);

useEffect(() => { fetchData(); }, [fetchData]);
```

### Pattern: Polling for generation progress

**File**: `StudioContext.tsx` (polling block)

When generation runs are active (PENDING or RUNNING), the context polls every 2 seconds:

```typescript
useEffect(() => {
  const hasActiveRuns = runs.some(
    (r) => r.status === 'PENDING' || r.status === 'RUNNING'
  );
  if (!hasActiveRuns) return;

  const interval = setInterval(async () => {
    const runsRes = await fetch(`/api/studios/${studioId}/generations`);
    if (runsRes.ok) {
      const runsData = await runsRes.json();
      setRuns(runsData.runs || []);

      // Auto-refresh studio data when widget runs complete
      if (hadActiveWidgetRun && hasCompletedWidgetRun) {
        const studioRes = await fetch(`/api/studios/${studioId}`);
        // ... update studio state
      }
    }
  }, 2000);

  return () => clearInterval(interval);
}, [runs, studioId]);
```

### Pattern: Streaming (AI chat)

**File**: `app/api/studios/[id]/chat/route.ts`

Uses Vercel AI SDK for streaming LLM responses:

```typescript
import { streamText } from 'ai';

const result = streamText({
  model,
  system: systemPrompt,
  messages: aiMessages,
});

// Pipe through TransformStream to persist assistant message on completion
const transformStream = new TransformStream({
  transform(chunk, controller) {
    streamedContent += new TextDecoder().decode(chunk);
    controller.enqueue(chunk);
  },
  flush: async () => {
    await prisma.conversationMessage.create({ /* persist */ });
  },
});

return new Response(streamBody.pipeThrough(transformStream), {
  headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Conversation-Id': conversation.id,
    'X-Citations': encodeURIComponent(JSON.stringify(citationsMap)),
  },
});
```

## Forms

### No form library

Studio uses **native HTML forms + `useState`** for all form handling. There is no react-hook-form, Formik, or other form library.

### Standard form pattern

```typescript
// components/studio/modals/QuizGenerationForm.tsx
export function QuizGenerationForm({ studioId, selectedSourceIds, onClose, onGenerated }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/studios/${studioId}/widgets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetTemplateId: 'qiplim/quiz-interactive',
          title: title || 'Quiz sans titre',
          inputs: { questionCount, difficulty },
          sourceIds: Array.from(selectedSourceIds),
        }),
      });
      if (!response.ok) throw new Error('Generation failed');
      onGenerated();
      onClose();
    } catch (error) {
      console.error('Error generating quiz:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Titre (optionnel)</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      {/* ... more fields */}
      <Button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Generation...' : 'Generer'}
      </Button>
    </div>
  );
}
```

### Validation

- **Client-side**: Basic checks (required fields, min/max) in submit handlers
- **Server-side**: Zod schemas in API routes (`.safeParse()`)
- No client-side Zod integration (schemas are server-only)

## Component Structure

### Organization: by feature

```
components/
├── ui/              # Radix UI primitives (shadcn/ui base)
├── studio/          # Studio workspace feature
│   ├── context/     # StudioContext
│   ├── panels/      # ChatPanel, SourcesPanel, RightPanel
│   ├── modals/      # Generation form modals
│   └── StudioLayout.tsx
├── widgets/         # One subfolder per widget type
│   ├── quiz/        # QuizDisplay.tsx, QuizEditor.tsx
│   ├── wordcloud/   # WordcloudDisplay.tsx, WordcloudEditor.tsx
│   ├── registry.ts  # Type → component mapping
│   └── types.ts     # WidgetData, type guards, props interfaces
├── presentation/    # Presentation editor
├── composite/       # Composite widget editor
├── course-plan/     # Course plan editor
├── editor/          # Rich text editor (Tiptap)
├── library/         # Document library UI
└── layout/          # Sidebar, navigation
```

### Props pattern

Always use exported interfaces, never inline:

```typescript
// Good
export interface QuizGenerationFormProps {
  studioId: string;
  selectedSourceIds: Set<string>;
  onClose: () => void;
  onGenerated: () => void;
}

export function QuizGenerationForm({ studioId, ... }: QuizGenerationFormProps) {}

// Bad — do not use inline props
export function QuizGenerationForm({ studioId }: { studioId: string }) {}
```

### Barrel exports

UI components and widget components use barrel exports:

```typescript
// components/ui/index.ts
export * from './button';
export * from './card';
export * from './dialog';
// ...

// Import via barrel
import { Button, Card, Dialog } from '@/components/ui';
```

### Import alias

`@/*` maps to the Studio app root:

```typescript
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useStudio } from '@/components/studio';
```

## Styling

### Tailwind CSS + CVA

All styling uses Tailwind utility classes. Component variants use Class Variance Authority (CVA):

```typescript
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ...',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground ...',
        outline: 'border border-input bg-background ...',
        secondary: 'bg-secondary text-secondary-foreground ...',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: { default: 'h-9 px-4 py-2', sm: 'h-8 px-3 text-xs', lg: 'h-10 px-8', icon: 'h-9 w-9' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
```

### cn() utility

**File**: `lib/utils.ts`

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Always use `cn()` for conditional classes:

```typescript
// Good
className={cn('flex gap-3', message.role === 'USER' && 'justify-end')}

// Bad — string interpolation
className={`flex gap-3 ${message.role === 'USER' ? 'justify-end' : ''}`}
```

### Color system

CSS variables defined in `globals.css`, referenced by Tailwind:

- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--muted`, `--accent`, `--destructive`
- `--border`, `--input`, `--ring`
- `--card`, `--popover`

Dark mode: class-based (`darkMode: ['class']` in tailwind.config.ts).

### Icons

Studio uses **lucide-react** (not Phosphor like Engage):

```typescript
import { Plus, Trash2, FileText } from 'lucide-react';
```

## Error Handling

### Current state (needs improvement)

| Layer | Pattern | Status |
|-------|---------|--------|
| API routes | try/catch + `NextResponse.json({ error })` | Consistent |
| Components | try/catch + `console.error` + error state | Inconsistent |
| Error boundaries | `app/.../error.tsx` | **Not implemented** |
| Loading states | `useState(true/false)` | Per-component |

### Recommendations

1. Add `error.tsx` files for route groups (`(dashboard)/error.tsx`, `studios/[id]/error.tsx`)
2. Replace `console.error` in components with a toast notification system
3. Add error state UI (not just silent `console.error`)

## Async Params (Next.js 15)

All API routes use the Next.js 15 async params pattern:

```typescript
type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id: studioId } = await params;  // Must await
  // ...
}
```

This is required by Next.js 15 — `params` is a Promise, not a synchronous object.

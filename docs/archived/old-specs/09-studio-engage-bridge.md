# Studio - Studio/Engage Bridge

## Current Architecture

Studio and Engage are separate applications with separate databases. They communicate via a server-to-server HTTP API call.

```
Studio DB                    Engage DB
(widgets, sources,           (projects, activities,
 compositions)                sessions, responses)
     │                            │
     ▼                            ▼
Studio API                   Engage API
POST /deploy-to-engage  ──►  POST /api/projects/import
     │                            │
     └─ Flatten widgets           └─ Create Project
        to activities                 Create Activities
                                      Create LiveSession
```

## Deploy Flow

### Studio side

**File**: `apps/studio/app/api/studios/[id]/deploy-to-engage/route.ts`

1. Authenticate (session or anonymous)
2. Verify studio ownership
3. Fetch all widgets from the studio
4. Determine target widgets (explicit `widgetIds` or all root widgets)
5. Flatten widget tree into deployable activities
6. POST to Engage's import endpoint with `X-API-Secret` header

### Flattening Logic

**File**: `apps/studio/lib/deploy/flatten-widgets.ts`

```typescript
function flattenWidgetsForDeploy(widgets, allWidgets): DeployableActivity[]
```

- Only includes LEAF widgets with status READY
- Only includes Engage-compatible types: MULTIPLE_CHOICE, QUIZ, WORDCLOUD, POSTIT, ROLEPLAY, RANKING, OPENTEXT
- For CONTAINER (SEQUENCE): recursively processes children in order
- For COMPOSITE (COURSE_MODULE): sorts children by slot order (`intro` → `activities` → `assessment`)
- Renumbers order sequentially

### What is sent to Engage

```typescript
interface DeployableActivity {
  type: string;       // ActivityType enum value
  title: string;
  description?: string;
  config: Record<string, unknown>;  // Widget.data mapped to Activity.config
  order: number;
}
```

### What is lost in translation

| Studio Field | Preserved? | Notes |
|--------------|-----------|-------|
| `type` | Yes | Mapped to Engage ActivityType |
| `title` | Yes | |
| `data` → `config` | Yes | JSON blob transferred as-is |
| `order` | Yes | Renumbered sequentially |
| `kind` | No | All activities are flat in Engage |
| `parentId` / `slotId` | No | Hierarchy lost |
| `composition` | No | Slot metadata lost |
| `orchestration` | No | Sequence/conditions lost |
| `delivery` | No | Delivery mode ignored |
| `sourceIds` | No | Source references lost |
| `templateId` | No | Template reference lost |
| Group boundaries | No | Module/sequence grouping lost |

### Engage side

**File**: `apps/engage/app/api/projects/import/route.ts`

1. Verify `X-API-Secret` header matches `ENGAGE_API_SECRET` env var
2. Validate request body with Zod schema
3. Create Project (anonymous, with generated code)
4. Create Activities with `parseActivityConfig()` validation
5. Optionally create LiveSession (with session code, presenter token, QR)
6. Return project ID, session code, presenter/participant URLs

### Authentication

Server-to-server auth uses a shared secret:
- Studio sends: `X-API-Secret: <ENGAGE_API_SECRET>`
- Engage verifies: `request.headers.get('X-API-Secret') === process.env.ENGAGE_API_SECRET`

Both apps must have the same `ENGAGE_API_SECRET` env var.

## Planned Evolution: Playback Plans

### Problem

The current bridge is destructive — all hierarchy, orchestration, and grouping metadata is lost. A course module with intro → activities → assessment becomes a flat list of activities with no indication of module boundaries.

### Solution: Compiled Playback Plans

A Playback Plan is an intermediate format that preserves grouping and transition metadata while remaining simple enough for Engage to consume.

```typescript
// Proposed: packages/shared/src/types/playback-plan.ts
interface PlaybackPlan {
  version: string;
  title: string;
  mode: 'live-session' | 'self-paced' | 'static';
  steps: PlaybackStep[];
  transitions: PlaybackTransition[];
  metadata: { studioId: string; compiledAt: string };
}

interface PlaybackStep {
  id: string;
  activityType: string;
  title: string;
  config: Record<string, unknown>;
  groupId?: string;
  groupLabel?: string;
  order: number;
}

interface PlaybackTransition {
  fromStepId: string;
  toStepId: string;
  condition?: 'auto' | 'manual' | 'score-threshold';
  conditionConfig?: Record<string, unknown>;
}
```

### Migration path

1. Add `compilePlaybackPlan()` in `packages/shared`
2. Update deploy-to-engage to send plans
3. Update Engage import to accept and store plans in `Project.metadata`
4. Engage reads plans to derive activity order + group labels
5. Backward compatible: projects without plans work as today

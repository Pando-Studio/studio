# Qiplim Studio — Data Model

PostgreSQL 16 + pgvector schema. Prisma ORM. Database `qiplim_studio`.

---

## Enums

```
WidgetType        QUIZ | WORDCLOUD | ROLEPLAY | PRESENTATION | SLIDE | MULTIPLE_CHOICE | POSTIT | RANKING | OPENTEXT | SEQUENCE | COURSE_MODULE | IMAGE
WidgetStatus      DRAFT | GENERATING | READY | ERROR
WidgetKind        LEAF | COMPOSED
StudioSourceType  DOCUMENT | WEB | YOUTUBE | WIDGET | AUDIO | VIDEO
StudioSourceStatus PENDING | INDEXING | INDEXED | ERROR
MessageRole       USER | ASSISTANT | SYSTEM
ConversationMode  ASK | PLAN | AGENT
AIProvider        MISTRAL | OPENAI | ANTHROPIC | GOOGLE
GenerationRunType QUIZ | WORDCLOUD | ROLEPLAY | PRESENTATION | COURSE_PLAN | SLIDES | SLIDE | DECK_PLAN | CHAT | MULTIPLE_CHOICE | POSTIT | RANKING | OPENTEXT | SEQUENCE | COURSE_MODULE | IMAGE
GenerationRunStatus PENDING | RUNNING | COMPLETED | FAILED
CoursePlanStatus  DRAFT | GENERATING | READY | ERROR | PUBLISHED
PresentationVersionStatus DRAFT | GENERATING | READY | PUBLISHED
```

---

## Tables

### Auth (BetterAuth)

#### user
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK |
| email | String | unique |
| emailVerified | Boolean | default false |
| name | String? | |
| image | String? | |
| role | String | default "user" |
| status | String | default "pending" |
| banned | Boolean | default false |
| banReason | String? | |
| banExpires | DateTime? | |
| createdAt | DateTime | default now |
| updatedAt | DateTime | auto |

Relations: studios[], favorites[], providerConfigs[], documentFolders[], documentTags[]

#### session
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK |
| userId | String | FK → user |
| token | String | unique |
| expiresAt | DateTime | |
| ipAddress | String? | |
| userAgent | String? | |

Index: userId

#### account
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK |
| userId | String | FK → user |
| accountId | String | |
| providerId | String | |
| accessToken | String? | |
| refreshToken | String? | |
| password | String? | |

Index: userId

---

### Studio

#### Studio
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| title | String | |
| description | String? | |
| userId | String? | FK → user |
| anonymousSessionId | String? | FK → StudioAnonymousSession |
| isAnonymous | Boolean | default false |
| settings | Json | default {} |
| preferredProvider | String? | |
| preferredModel | String? | |
| createdAt | DateTime | default now |
| updatedAt | DateTime | auto |

Relations: sources[], widgets[], conversations[], presentations[], coursePlans[], generationRuns[], providerConfigs[]
Index: userId, anonymousSessionId

#### StudioAnonymousSession
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| code | String | unique, varchar(6) |
| expiresAt | DateTime | |
| metadata | Json? | |

Relations: studios[]
Index: code

> Note: anonymous sessions are deprecated (auth is mandatory). The table remains for backward compatibility.

---

### Sources & RAG

#### StudioSource
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| studioId | String | FK → Studio |
| type | StudioSourceType | |
| title | String | |
| url | String? | |
| s3Key | String? | |
| mimeType | String? | |
| size | Int? | |
| status | StudioSourceStatus | default PENDING |
| metadata | Json? | |
| originWidgetId | String? | |
| originCoursePlanId | String? | |
| folderId | String? | FK → DocumentFolder |
| createdAt | DateTime | default now |
| updatedAt | DateTime | auto |

Relations: chunks[], tags[], studio, folder
Index: studioId, status, folderId

#### StudioSourceChunk
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| sourceId | String | FK → StudioSource (cascade) |
| content | String | |
| embedding | vector? | pgvector (1024D) |
| metadata | Json? | |
| pageNumber | Int? | |
| chunkIndex | Int | default 0 |
| createdAt | DateTime | default now |

Index: sourceId

---

### Widgets

#### Widget
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| studioId | String | FK → Studio |
| type | WidgetType | |
| title | String | |
| description | String? | |
| data | Json | default {} |
| status | WidgetStatus | default DRAFT |
| order | Int | default 0 |
| runId | String? | |
| sourceIds | String[] | default [] |
| templateId | String? | |
| kind | WidgetKind | default LEAF |
| parentId | String? | FK → Widget (self-ref) |
| slotId | String? | |
| composition | Json? | reserved (future) |
| orchestration | Json? | reserved (future) |
| delivery | Json? | reserved (future) |
| createdAt | DateTime | default now |
| updatedAt | DateTime | auto |

Relations: parent, children[], slideWidgets[], favorites[], studio
Index: studioId, type, parentId

---

### Conversations

#### Conversation
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| studioId | String | FK → Studio (cascade) |
| title | String? | |
| createdAt | DateTime | default now |
| updatedAt | DateTime | auto |

Relations: messages[], studio
Index: studioId

#### ConversationMessage
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| conversationId | String | FK → Conversation (cascade) |
| role | MessageRole | |
| content | String | |
| mode | ConversationMode? | |
| focusSourceId | String? | |
| citations | Json? | |
| metadata | Json? | |
| createdAt | DateTime | default now |

Index: conversationId

---

### Presentations

#### Presentation
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| studioId | String | FK → Studio |
| title | String | |

Relations: versions[], studio
Index: studioId

#### PresentationVersion
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| presentationId | String | FK → Presentation (cascade) |
| version | Int | default 1 |
| status | PresentationVersionStatus | |

Relations: slides[], presentation
Unique: (presentationId, version)

#### Slide
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| presentationVersionId | String | FK → PresentationVersion (cascade) |
| order | Int | default 0 |
| content | Json | |
| notes | String? | |

Relations: slideWidgets[]
Index: presentationVersionId

#### SlideWidget
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| slideId | String | FK → Slide (cascade) |
| widgetId | String | FK → Widget (cascade) |
| position | Json? | |

Unique: (slideId, widgetId)

---

### Generation

#### GenerationRun
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| studioId | String | FK → Studio |
| type | GenerationRunType | |
| status | GenerationRunStatus | default PENDING |
| widgetId | String? | |
| presentationId | String? | |
| slideId | String? | |
| estimatedTokens | Int? | |
| actualTokens | Int? | |
| errorLog | String? | |
| metadata | Json? | progress, step, label, inputs |
| createdAt | DateTime | default now |
| completedAt | DateTime? | |

Index: studioId, status

#### CoursePlan
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| studioId | String | FK → Studio |
| title | String | |
| description | String? | |
| content | Json | |
| metadata | Json | |
| status | CoursePlanStatus | default DRAFT |
| runId | String? | |

Index: studioId

---

### Configuration

#### ProviderConfig (studio-level BYOK)
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| studioId | String | FK → Studio (cascade) |
| provider | AIProvider | |
| apiKey | String | encrypted AES-256-GCM (prefix v2:) |
| isActive | Boolean | default true |

Unique: (studioId, provider)

#### UserProviderConfig (user-level BYOK)
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| userId | String | FK → user (cascade) |
| provider | AIProvider | |
| apiKey | String | encrypted AES-256-GCM (prefix v2:) |
| isActive | Boolean | default true |

Unique: (userId, provider)

---

### User preferences

#### UserFavorite
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| userId | String | FK → user (cascade) |
| widgetId | String? | FK → Widget (cascade) |
| coursePlanId | String? | FK → CoursePlan (cascade) |

Unique: (userId, widgetId), (userId, coursePlanId)
Index: userId

#### DocumentFolder
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| userId | String | FK → user (cascade) |
| name | String | |
| parentId | String? | FK → self (set null) |
| color | String? | |

Relations: children[] (self-ref), sources[]
Index: userId

#### DocumentTag
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| userId | String | FK → user (cascade) |
| name | String | |
| color | String | default #6B7280 |

Relations: sources[] (via DocumentTagSource)
Unique: (userId, name)
Index: userId

#### DocumentTagSource (junction)
| Field | Type | Constraint |
|-------|------|-----------|
| id | String | PK (cuid) |
| tagId | String | FK → DocumentTag (cascade) |
| sourceId | String | FK → StudioSource (cascade) |

Unique: (tagId, sourceId)

---

## Missing tables (specified but not in DB)

| Table | Spec | Description | Priority |
|-------|------|-------------|----------|
| **WidgetPlayResult** | specs/lifecycle.md § 7 | Score + completion per widget per user in self-paced mode | P1 |
| **StudioShare** | specs/lifecycle.md § 6 | Studio sharing (owner/editor/viewer roles, public link) | P1 |

---

## Main relationship diagram

```
user ──┬── Studio ──┬── StudioSource ── StudioSourceChunk (pgvector)
       │            ├── Widget (self-ref parent/children)
       │            ├── Conversation ── ConversationMessage
       │            ├── Presentation ── PresentationVersion ── Slide ── SlideWidget
       │            ├── CoursePlan
       │            ├── GenerationRun
       │            └── ProviderConfig
       ├── UserProviderConfig
       ├── UserFavorite
       ├── DocumentFolder (tree)
       └── DocumentTag ── DocumentTagSource ── StudioSource
```

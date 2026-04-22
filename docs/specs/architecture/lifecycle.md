# Qiplim — Widget Creation & Playback Lifecycle

Ce document detaille les flows complets de creation et de lecture des widgets : comment on cree un widget (chat, modal), les differents etats, comment on le joue en self-paced, comment le partage fonctionne, et comment tracker les resultats.

---

## 1. Creation Lifecycle

Deux chemins pour creer un widget dans Studio.

### 1.1 Via le chat (recommande)

Meme flow qu'Engage : conversation naturelle → tool call → preview → validate → generation.

```
User: "Cree un quiz de 5 questions sur le chapitre 3"
  │
  ▼
LLM analyse la demande
  │ collecte les parametres manquants via la conversation
  │ (type, titre, difficulte, nombre de questions, sources)
  │
  ▼
LLM appelle le tool generateQuiz(title, questionCount, difficulty, sourceIds)
  │
  ▼
Chat affiche un apercu du widget propose
  ┌──────────────────────────────────────────┐
  │ [Sparkles] Quiz: "Les energies fossiles" │
  │                                          │
  │ 5 questions • Difficulte moyenne         │
  │ Sources: chapitre-3.pdf                  │
  │                                          │
  │ [Modifier]  [Annuler]  [Generer ✓]       │
  └──────────────────────────────────────────┘
  │
  ├── User clique "Modifier" → continue la conversation, le LLM re-propose
  ├── User clique "Annuler" → rien ne se passe
  └── User clique "Generer" ↓
  │
  ▼
Job BullMQ lance (pipeline de generation)
  │ Step 1: Template loading (5%)
  │ Step 2: RAG retrieval des sources (20%)
  │ Step 3: LLM generation du contenu (60%)
  │ Step 4: Zod validation du output (90%)
  │ Step 5: Sauvegarde Widget(DRAFT) (100%)
  │
  │ Progress via SSE (Redis pub/sub → useStudioEvents → invalidate queries)
  │
  ▼
Widget apparait dans la bibliotheque (panneau droit)
  │ Status: DRAFT
  │ GenerationProgressCard montre le resultat
  │
  ▼
User clique "Voir le widget" → WidgetDetailModal s'ouvre
  ┌──────────────────────────────────────────┐
  │ [Apercu — verifiez le contenu genere]    │
  │                                          │
  │ Preview du quiz (questions + options)     │
  │                                          │
  │ [Regenerer]           [Confirmer ✓]       │
  └──────────────────────────────────────────┘
  │
  ├── "Regenerer" → relance le pipeline avec les memes params → Widget(GENERATING)
  └── "Confirmer" → Widget(READY) ← jouable, deployable
```

### 1.2 Via le panneau Actions (manual)

Pour les users qui preferent un formulaire a une conversation.

```
User clique sur un type dans la grille "Generables"
  │ (Quiz, Presentation, Wordcloud, Roleplay, etc.)
  │
  ▼
Modal de generation s'ouvre
  ┌──────────────────────────────────────────┐
  │ Generer un Quiz                          │
  │                                          │
  │ Titre: [________________________]        │
  │ Nombre de questions: [5]                 │
  │ Difficulte: [● Facile ○ Moyen ○ Dur]    │
  │ Sources: [✓ chapitre-3.pdf]              │
  │          [  introduction.md ]            │
  │                                          │
  │           [Annuler]  [Generer ✓]         │
  └──────────────────────────────────────────┘
  │
  ▼
Meme pipeline de generation que le chat (etapes 1-5)
  │
  ▼
Widget(DRAFT) → preview → confirmer ou regenerer
```

### 1.3 Creation manuelle (sans IA)

Pour les widgets simples que l'utilisateur veut ecrire lui-meme.

```
User clique "+" dans la bibliotheque
  → choix du type
  → Widget cree avec getDefaultConfig(type)
  → Status: READY (pas de generation)
  → Edition directe dans le WidgetDetailModal
```

---

## 2. Widget Status

Les etats d'un widget pendant sa creation et sa vie dans Studio.

```
                          ┌──────────┐
           creation       │          │
           manuelle ─────►│  READY   │◄─── user confirme le DRAFT
                          │          │
                          └────┬─────┘
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
            user regenere   deploy       user supprime
                 │          to Engage        │
                 ▼             │             ▼
          ┌──────────┐        │        ┌──────────┐
          │GENERATING│        │        │ DELETED  │
          └────┬─────┘        │        └──────────┘
               │              │
        ┌──────┴──────┐       │
        │             │       │
     succes        echec      │
        │             │       │
        ▼             ▼       ▼
  ┌──────────┐  ┌─────────┐
  │  DRAFT   │  │  ERROR  │
  │ (preview)│  │ (retry) │
  └──────────┘  └─────────┘
```

| Status | Description | Actions possibles |
|--------|-------------|-------------------|
| **DRAFT** | Genere par l'IA, en attente de validation | Confirmer → READY, Regenerer → GENERATING, Editer, Supprimer |
| **GENERATING** | Pipeline LLM en cours | Voir la progression, Annuler (si possible) |
| **READY** | Valide, jouable, deployable | Jouer, Editer, Deployer vers Engage, Regenerer, Supprimer |
| **ERROR** | Generation echouee | Retry → GENERATING, Supprimer |

---

## 3. Playback State (lecture d'un widget)

Quand un widget est "joue" (self-paced dans Studio, ou en session live dans Engage), il passe par des etats de lecture.

### 3.1 Widgets interactifs

```
IDLE ──► ACTIVE ──► ENDED
           │
           │ participant soumet une reponse
           │ scoring calcule
           │ resultats affiches
```

| State | Description | Ce qui se passe |
|-------|-------------|-----------------|
| **IDLE** | Widget affiche mais pas encore lance | L'utilisateur voit le titre et les instructions |
| **ACTIVE** | Widget interactif, en attente de reponse | L'utilisateur peut repondre, voter, classer, ecrire |
| **ENDED** | Reponse soumise, resultats visibles | Score affiche, bonne reponse revelee (si configure) |

**Qui controle les transitions :**
- **Self-paced** : l'utilisateur lui-meme (clique "Commencer", "Valider", "Suivant")
- **Live session** : le presenter (start activity, end activity)

### 3.2 Widgets statiques

```
IDLE ──► DISPLAYED
```

Pas d'etat ENDED — le contenu est affiche et c'est tout (SLIDE, AUDIO, IMAGE, VIDEO).
L'utilisateur peut naviguer (next/prev dans une presentation) mais il n'y a pas de soumission.

### 3.3 Widgets composes

```
Composition chargee
  │
  ▼
Step 1 (IDLE → ACTIVE → ENDED)
  │ transition evaluee
  ▼
Step 2 (IDLE → ACTIVE → ENDED)
  │ transition evaluee
  ▼
Step N → Composition ENDED
```

Le **CompositionEngine** gere la navigation entre steps :
- Mode **sequential** : avance au step suivant quand le courant est termine
- Mode **conditional** : evalue la condition de transition pour choisir le prochain step

Chaque step a son propre Playback State independant.

---

## 4. Internal State (par type de widget)

A l'interieur du Playback State `ACTIVE`, chaque type de widget a son propre flow interne.

### Quiz
```
Question 1: PENDING → LIVE (affichee) → CLOSED (timer/submit) → REVEALED (reponse montree)
Question 2: PENDING → LIVE → CLOSED → REVEALED
...
Toutes les questions REVEALED → Quiz ENDED → Score final
```

Le presenter (live) ou le player (self-paced) controle la progression entre questions.

### Multiple Choice
```
COLLECTING (options affichees, user choisit) → SUBMITTED → RESULTS (distribution)
```

### Wordcloud
```
COLLECTING (users soumettent des mots) → ENDED (nuage final)
```

### Post-it
```
COLLECTING (users creent des post-its)
  → ORGANIZING (creator/presenter categorise)
  → VOTING (votes ouverts)
  → RESULTS (post-its tries par votes)
```

### Ranking
```
COLLECTING (users classent les items) → ENDED (classement moyen)
```

### Opentext
```
COLLECTING (users ecrivent) → ENDED (reponses listees)
```

### Roleplay
```
BRIEFING (scenario + role affiches)
  → CONVERSATION (echange avec l'IA)
  → DEBRIEFING (feedback IA sur la performance)
```

### Flashcard
```
FRONT (terme affiche) → BACK (definition revelee) → SELF_SCORE (je savais / je ne savais pas)
  → next card → ... → ENDED (stats de revision)
```

---

## 5. Lecture Self-paced dans Studio

### 5.1 Contexte

Quand un utilisateur (creator ou viewer) joue un widget dans Studio, il est en mode **self-paced** :
- Pas de presenter
- Pas de temps reel collectif
- Pas de participants externes
- Navigation libre (avancer, reculer, recommencer)
- Scoring individuel

### 5.2 Integration UI

**Widget LEAF (simple)** :
- Click sur le widget dans la bibliotheque → **WidgetDetailModal** s'ouvre
- Onglet "Apercu" : le widget est jouable directement dans le modal
- Onglet "Edition" : le widget est editable (si l'utilisateur a les droits)
- L'utilisateur joue, soumet sa reponse, voit son score
- Le resultat est persiste (WidgetPlayResult)

**Widget COMPOSED (compose)** :
- Click sur le compose → ouvre un **player pleine page**
- Navigation entre les steps (barre de progression en haut)
- Chaque step est joue dans son propre Playback State
- Le CompositionEngine gere les transitions
- A la fin, score total affiche

### 5.3 Player self-paced

```typescript
interface SelfPacedPlayer {
  // Navigation
  currentStep: PlaybackStep;
  progress: { current: number; total: number };
  canProceed: boolean;
  canGoBack: boolean;
  proceed(): void;
  goBack(): void;

  // State
  playbackState: 'IDLE' | 'ACTIVE' | 'ENDED';
  startWidget(): void;
  submitResponse(response: unknown): void;

  // Results
  result: WidgetPlayResult | null;
  score: number | null;
}
```

---

## 6. Partage du Studio

### 6.1 Niveaux d'acces

| Role | Voir sources | Voir widgets | Jouer widgets | Editer | Generer | Deployer | Partager |
|------|-------------|-------------|--------------|--------|---------|----------|----------|
| **owner** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **editor** | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| **viewer** | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| **public** (lien) | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |

### 6.2 Ce que le viewer voit

L'interface Studio complete, en **lecture seule** :
- Sources listees (peut les consulter, voir le contenu preview)
- Chat visible (peut lire l'historique des conversations)
- Widgets dans la bibliotheque (peut les ouvrir et les jouer)
- Presentations jouables dans le player

Ce qui est **masque** pour le viewer :
- Boutons "Generer" / "Ajouter une source" / "Deployer"
- Modals de generation (QuizGenerationForm, etc.)
- Settings du studio (BYOK, providers)
- Boutons "Supprimer" / "Editer" sur les widgets

### 6.3 Partage technique

```typescript
// Table StudioShare
interface StudioShare {
  id: string;
  studioId: string;
  userId?: string;       // invitation par user (editor/viewer)
  email?: string;        // invitation par email (pending)
  role: 'editor' | 'viewer';
  createdAt: Date;
}

// Le studio a aussi un champ de partage public
interface Studio {
  // ... existing fields
  isPublic: boolean;      // accessible via lien public
  publicSlug?: string;    // URL publique: studio.qiplim.com/s/{slug}
}
```

**URL publique** : `studio.qiplim.com/s/{slug}` — accessible sans compte. L'utilisateur est traite comme un viewer anonyme. Ses resultats de jeu sont stockes dans un cookie de session.

---

## 7. Tracking des resultats

### 7.1 Modele de donnees

Tracking minimal : score final + completion status par widget par user.

```typescript
interface WidgetPlayResult {
  id: string;
  widgetId: string;
  userId: string;            // ou anonymousSessionId pour les publics
  studioId: string;
  status: 'started' | 'completed';
  score?: number;            // 0-100 (pourcentage)
  maxScore?: number;         // score max possible
  completedAt?: Date;
  duration?: number;         // temps en secondes
  attempts: number;          // nombre de tentatives (incremente a chaque replay)
  createdAt: Date;
  updatedAt: Date;
}
```

### 7.2 Quand les resultats sont enregistres

| Moment | Action |
|--------|--------|
| User ouvre un widget interactif | `status: 'started'`, `attempts++` |
| User soumet sa reponse | `score` calcule, `status: 'completed'`, `completedAt` set |
| User rejoue | Nouveau record ou update de l'existant (selon la politique) |

**Politique de scoring** :
- Par defaut : on garde le **meilleur score** (le user peut rejouer pour s'ameliorer)
- Le nombre de tentatives est toujours incremente

### 7.3 Dashboard creator

Le creator voit un tableau de bord simple pour son studio :

```
┌──────────────────────────────────────────────────┐
│ Resultats — Mon Studio                           │
│──────────────────────────────────────────────────│
│                                                  │
│ 12 viewers • 8 ont joue • 67% taux completion    │
│                                                  │
│ Widget                │ Joue par │ Score moyen    │
│───────────────────────┼──────────┼───────────────│
│ Quiz: Energies        │ 8/12     │ 72%           │
│ QCM: Climat           │ 6/12     │ 85%           │
│ Ranking: Priorites    │ 5/12     │ —             │
│ Wordcloud: Humeur     │ 10/12    │ —             │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Pas d'analytics avancees** (details par question, distribution des reponses, courbes de progression). Ca viendra plus tard avec l'integration xAPI.

### 7.4 Pas de tracking pour les widgets statiques

Les SLIDE, AUDIO, IMAGE, VIDEO n'ont pas de score ni de soumission. On peut tracker la "vue" (le user a ouvert le widget) mais c'est optionnel — pas dans le MVP.

---

## 8. Comparaison Self-paced vs Live Session

| Aspect | Self-paced (Studio) | Live session (Engage) |
|--------|--------------------|-----------------------|
| **Qui controle** | L'utilisateur seul | Le presenter |
| **Reponses** | Individuelles, privees | Collectives, agregees en temps reel |
| **Scoring** | Personnel, persiste dans WidgetPlayResult | Groupe, leaderboard live, cache Redis |
| **Timer** | Pas de timer (ou timer local optionnel) | Timer synchronise via Ably |
| **Resultats** | Stockes dans DB Studio (WidgetPlayResult) | Stockes dans DB Engage (ActivityResponse) + Redis |
| **Temps reel** | Non — pas de WebSocket | Oui — Ably channels |
| **Blocs GENERATIVE** | LLM appele pour l'user seul | LLM appele une fois, resultat partage a tous |
| **Infra** | Studio server + DB | Engage server + Ably + Redis |
| **Rejouer** | Illimite, score garde | Une fois par session (sauf config) |
| **Anonyme** | Oui (via lien public + cookie) | Oui (via code session) |

---

## 9. Diagramme de flux complet

```
                           CREATION
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         Via Chat        Via Modal        Manuelle
         (conversation)  (formulaire)    (default config)
              │               │               │
              ▼               ▼               │
         Tool call →    Submit form →         │
         Preview         Settings             │
              │               │               │
              ▼               ▼               │
         [Generer]       [Generer]            │
              │               │               │
              └───────┬───────┘               │
                      │                       │
                      ▼                       │
               GENERATING                     │
               (BullMQ job)                   │
               Progress SSE                   │
                      │                       │
               ┌──────┴──────┐                │
               │             │                │
            succes        echec               │
               │             │                │
               ▼             ▼                │
            DRAFT          ERROR              │
            (preview)      (retry)            │
               │                              │
               ▼                              │
         [Confirmer]                          │
               │                              │
               ▼                              │
             READY ◄──────────────────────────┘
               │
       ┌───────┼───────────┐
       │       │           │
    Jouer    Editer     Deployer
  (self-paced) (Studio)  (→ Engage)
       │                   │
       ▼                   ▼
  PLAYBACK            LIVE SESSION
  IDLE→ACTIVE→ENDED   (presenter + participants)
       │
       ▼
  WidgetPlayResult
  (score, completion)
```

---

## 10. Widget Player Views & URLs Standalone

Chaque widget est **jouable** via une vue Player, accessible par une URL autonome. Cela permet de partager un studio complet OU un seul widget.

### 10.1 Trois renderers par widget

Tout widget possede **trois vues** React :

| Renderer | Usage | Contexte |
|----------|-------|----------|
| **Display** | Apercu lecture seule | Bibliotheque, preview dans le chat, cards |
| **Editor** | Edition du contenu | WidgetDetailModal onglet Edition, dashboard |
| **Player** | Vue interactive/consommable | Self-paced, partage, standalone URL |

```typescript
interface WidgetRenderers {
  Display: ComponentType<WidgetDisplayProps>;
  Editor: ComponentType<WidgetEditorProps>;
  Player: ComponentType<WidgetDisplayProps>;  // obligatoire pour tous les types
}
```

Les Players sont classes en **quatre tiers** selon leur niveau d'interactivite :

#### Tier A — Readable Player (9 types)

Types : FAQ, GLOSSARY, SUMMARY, TIMELINE, REPORT, DATA_TABLE, MINDMAP, INFOGRAPHIC, IMAGE

Le Player est le **Display wrappe dans un ReadablePlayer** HOC qui ajoute :
- Tracking du scroll (IntersectionObserver sur le contenu)
- Tracking du temps de lecture
- `trackStart()` au mount
- `trackComplete()` quand scroll >= 90% OU temps suffisant
- Barre de progression de lecture fine en haut

Ces widgets n'ont pas de scoring — leur completion est basee sur la consultation du contenu.

#### Tier B — Interactive Player (8 types)

Types : QUIZ, MULTIPLE_CHOICE, FLASHCARD, RANKING, WORDCLOUD, POSTIT, OPENTEXT, ROLEPLAY

Chaque type a un **composant Player dedie** avec :
- Interaction utilisateur (reponses, selections, saisie)
- Validation et feedback (correct/incorrect, explications)
- Scoring (quand applicable)
- Appels `trackStart()` / `trackComplete(score, maxScore, duration)`

| Type | Interaction Player | Scoring | Completion |
|------|-------------------|---------|------------|
| QUIZ | Questions sequentielles, timer, feedback immediat | Score (bonnes reponses / total) | Toutes les questions repondues |
| MULTIPLE_CHOICE | Selection d'options, validation | Score (correct/incorrect) | Reponse soumise |
| FLASHCARD | Flip recto/verso, navigation, auto-evaluation | Score (su / pas su) | Toutes les cartes vues |
| RANKING | Drag-and-drop reordering | Score (items en bonne position) | Ordre soumis |
| WORDCLOUD | Saisie de mots | Pas de score | >= 1 mot soumis |
| POSTIT | Creation de notes + categories | Pas de score | >= 1 note creee |
| OPENTEXT | Textarea avec compteur | Pas de score | Texte soumis (min length) |
| ROLEPLAY | Selection role, dialogue IA, debriefing | Pas de score | Dialogue termine |

#### Tier C — Composed Player (6 types)

Types : SEQUENCE, COURSE_MODULE, SYLLABUS, SESSION_PLAN, PROGRAM_OVERVIEW, CLASS_OVERVIEW

Le Player utilise un **ComposedPlayer generique** :
- Navigation step-by-step parmi les enfants (previous / next)
- Barre de progression (steps completes / total)
- Chaque enfant est rendu via `getWidgetRenderers(child.type).Player`
- Chaque enfant a son propre `PlayerContext` (widgetId enfant)
- Completion du compose = tous les enfants completes
- Score agrege = moyenne ponderee des scores enfants (si applicable)

```
┌─────────────────────────────────────────────────┐
│ [← Retour]   Syllabus: Formation IA    3/8     │
│─────────────────────────────────────────────────│
│ ● ● ● ○ ○ ○ ○ ○    (barre de progression)     │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ │  [Player du widget enfant courant]          │ │
│ │  (Quiz, Flashcard, FAQ, etc.)               │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [← Precedent]                    [Suivant →]    │
└─────────────────────────────────────────────────┘
```

#### Media Player (2 types)

Types : AUDIO, VIDEO

Le Player wrappe l'element `<audio>` ou `<video>` natif avec :
- `trackStart()` au premier play
- `trackComplete()` quand lecture >= 90% de la duree
- Pour VIDEO : navigation par chapitres (si definis)
- Controles standards (play/pause, volume, seek, vitesse)

### 10.2 URLs de partage

Deux niveaux de granularite pour le partage :

```
Studio complet          Widget standalone
/s/{slug}               /s/{slug}/w/{widgetId}
     │                       │
     ▼                       ▼
Carousel de tous        Player focus sur
les widgets READY       un seul widget
(navigation prev/next)  (plein ecran)
```

| URL | Contenu | Layout |
|-----|---------|--------|
| `/s/{slug}` | Tous les widgets READY du studio | Header studio + carousel avec navigation dots |
| `/s/{slug}/w/{widgetId}` | Un seul widget | Header minimal + player plein ecran |

**Regles d'acces :**
- Si `studio.isPublic = true` → URL accessible a tous (anonymous inclus)
- Si `studio.isPublic = false` → URL accessible seulement aux owner/editor/viewer (via session + StudioShare)
- Widget inexistant ou non-READY → 404

**API correspondantes :**

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/public/s/{slug}` | Non | Studio + tous les widgets READY + role du viewer |
| `GET /api/public/s/{slug}/w/{widgetId}` | Non | Studio + widget unique (avec enfants si compose) + role |
| `POST /api/public/s/{slug}/w/{widgetId}/play-result` | Oui | Upsert du resultat de jeu (auth requise) |

### 10.3 Resolution du role

Pour toute requete sur une URL player, le **role du viewer** est determine par cette logique :

```
Requete sur /s/{slug}[/w/{widgetId}]
  │
  ▼
Studio existe et (isPublic OU session valide) ?
  │
  ├── NON → 404
  │
  └── OUI → Determiner le role :
        │
        ├── session.userId === studio.userId → OWNER
        │
        ├── StudioShare(studioId, userId).role === 'EDITOR' → EDITOR
        │
        ├── StudioShare(studioId, userId).role === 'VIEWER' → VIEWER
        │
        ├── studio.isPublic && pas de session → ANONYMOUS
        │
        └── studio.isPublic && session (sans share) → VIEWER (authentifie mais pas invite)
```

```typescript
type PlayerRole = 'owner' | 'editor' | 'viewer' | 'anonymous';

interface ResolvedAccess {
  studio: { id: string; title: string; publicSlug: string };
  role: PlayerRole;
  userId: string | null;
}
```

### 10.4 Adaptation du Player selon le role

Le Player **adapte son affichage** selon le role du viewer :

| Element UI | owner | editor | viewer | anonymous |
|-----------|-------|--------|--------|-----------|
| Jouer le widget | ✓ | ✓ | ✓ | ✓ |
| Voir le score/resultats | ✓ | ✓ | ✓ | ✓ |
| Bouton "Editer" (lien dashboard) | ✓ | ✓ | ✗ | ✗ |
| Bouton "Partager" (copie URL) | ✓ | ✓ | ✓ | ✓ |
| Persistence du score (WidgetPlayResult) | ✓ | ✓ | ✓ | ✗ |
| Bouton "Regenerer" | ✓ | ✗ | ✗ | ✗ |
| Badge role visible | ✗ | "Editeur" | "Viewer" | ✗ |

**Pour les anonymes** : le scoring fonctionne localement (en memoire) mais n'est pas persiste en DB. Si l'utilisateur se connecte ensuite, les resultats ne sont pas recuperes (pas de merge anonymous → authentifie pour le MVP).

### 10.5 PlayerContext

Le `PlayerContext` est un **React Context** fourni au niveau de la page player et consomme par chaque composant Player :

```typescript
interface PlayerContextValue {
  // Identite
  role: PlayerRole;
  userId: string | null;
  studioId: string;
  widgetId: string;

  // Tracking des resultats
  trackStart: () => void;
  trackComplete: (score?: number, maxScore?: number, duration?: number) => void;

  // Navigation et context
  isStandalone: boolean;          // true si /s/{slug}/w/{widgetId}
  studioSlug: string | null;      // pour les liens retour
  editUrl: string | null;         // null si viewer/anonymous
}
```

**Comportement du tracking :**
- `trackStart()` : appele au mount du Player. Si `userId` est null (anonymous), skip l'appel API. Sinon, upsert `status: 'started'`.
- `trackComplete(score, maxScore, duration)` : appele quand le widget est termine. Debounce de 500ms. Upsert avec `status: 'completed'`, `attempts++`.
- Pour les widgets composes, le parent agrege les scores des enfants et appelle `trackComplete` avec le score moyen.

### 10.6 Comportement Player par type

Tableau de reference croisant chaque widget avec son comportement Player. Ce tableau complete la section 4 (Internal State) en precisant les criteres de completion et de scoring pour le mode self-paced.

| Type | Tier | Scoring | Critere de completion | Internal State |
|------|------|---------|----------------------|----------------|
| QUIZ | B | bonnes reponses / total × 100 | Toutes les questions repondues | Ref section 4: PENDING → LIVE → CLOSED → REVEALED |
| MULTIPLE_CHOICE | B | 100 si correct, 0 sinon | Reponse soumise | Ref section 4: COLLECTING → SUBMITTED → RESULTS |
| FLASHCARD | B | cartes "su" / total × 100 | Toutes les cartes retournees | Ref section 4: FRONT → BACK → SELF_SCORE → next |
| RANKING | B | items en bonne position / total × 100 | Ordre soumis | COLLECTING → SUBMITTED |
| WORDCLOUD | B | — | >= 1 mot soumis | COLLECTING → ENDED |
| POSTIT | B | — | >= 1 note creee | COLLECTING → ENDED |
| OPENTEXT | B | — | Texte soumis (>= minLength) | COLLECTING → SUBMITTED |
| ROLEPLAY | B | — | Debriefing affiche | Ref section 4: BRIEFING → CONVERSATION → DEBRIEFING |
| FAQ | A | — | Scroll >= 90% | DISPLAYED |
| GLOSSARY | A | — | Scroll >= 90% | DISPLAYED |
| SUMMARY | A | — | Scroll >= 90% | DISPLAYED |
| TIMELINE | A | — | Scroll >= 90% | DISPLAYED |
| REPORT | A | — | Scroll >= 90% | DISPLAYED |
| DATA_TABLE | A | — | Scroll >= 90% | DISPLAYED |
| MINDMAP | A | — | Scroll >= 90% | DISPLAYED |
| INFOGRAPHIC | A | — | Scroll >= 90% | DISPLAYED |
| IMAGE | A | — | Affichee | DISPLAYED |
| AUDIO | Media | — | Lecture >= 90% duree | PLAYING → ENDED |
| VIDEO | Media | — | Lecture >= 90% duree | PLAYING → ENDED |
| SEQUENCE | C | Moyenne enfants | Tous les enfants completes | Step-by-step |
| COURSE_MODULE | C | Moyenne enfants | Tous les enfants completes | Step-by-step |
| SYLLABUS | C | Moyenne enfants | Tous les enfants completes | Step-by-step |
| SESSION_PLAN | C | Moyenne enfants | Tous les enfants completes | Step-by-step |
| PROGRAM_OVERVIEW | C | Moyenne enfants | Tous les enfants completes | Step-by-step |
| CLASS_OVERVIEW | C | Moyenne enfants | Tous les enfants completes | Step-by-step |

### 10.7 Exemples d'usage

**Scenario 1 — Partager un studio complet**
```
Creator active le partage public → obtient lien studio.qiplim.com/s/abc123
  → Le viewer ouvre le lien
  → Page avec carousel de widgets (Quiz, FAQ, Flashcard, Resume)
  → Navigation prev/next, chaque widget joue avec son Player
  → Si le viewer est connecte, ses scores sont persistes
```

**Scenario 2 — Partager un seul quiz**
```
Creator copie le lien d'un widget → studio.qiplim.com/s/abc123/w/quiz42
  → Le viewer ouvre le lien
  → Player plein ecran du quiz
  → Score affiche a la fin
  → Bouton "Voir le studio complet" en footer
```

**Scenario 3 — Embed dans un LMS**
```
Creator integre l'URL standalone dans un iframe du LMS
  → Le widget est jouable en standalone
  → API ouverte pour futur support xAPI/LTI (hors scope MVP)
```

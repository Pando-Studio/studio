# Qiplim — Glossary

Definitions canoniques des termes utilises dans le code, les specs et la documentation. Tout nouveau document ou code doit utiliser ces termes exactement.

---

## Core

### Widget
Unite atomique de contenu ou d'interaction, decrite en JSON, renderable par le player. C'est l'objet central du systeme. Un widget a un **type** (QUIZ, SLIDE, AUDIO...), un **kind** (LEAF ou COMPOSED), un **status** (creation lifecycle) et une **spec** (le champ `data` JSON).

### Activity
Un widget joue dans une session Engage. C'est le terme utilise cote Engage. Toute activity est un widget. Tous les types de widgets (interactifs ET statiques) deviennent des activities quand ils sont deployes dans une session — un SLIDE affiche en session est une activity (meme sans interaction participant).

Distinction :
- **Widget** = l'objet (JSON spec + metadata). Utilise dans Studio et dans les specs.
- **Activity** = un widget instancie dans une session Engage. La distinction interactive/statique est dans la **category**, pas dans le terme activity.

### Primitive
Brique de base de l'ontologie universelle (~20 types : text, select-one, timer, stack, card...). Les widgets de type fixe sont compiles en primitives pour le player. Les widgets custom sont decrits directement en primitives.

### Composition
Un widget compose d'autres widgets. Un widget de kind `COMPOSED` a des `children` (widgets enfants ordonnes) et une `orchestration` (regles de navigation entre les enfants). Exemples : une presentation (slides + quiz), une aventure interactive (chapitres + votes + blocs generatifs).

### Source
Document uploade dans Studio (PDF, DOCX, page web, YouTube, audio, video) parse et indexe pour le RAG. Les sources alimentent la generation de widgets par l'IA.

---

## Types & Categories

### Type
L'identite semantique d'un widget : QUIZ, SLIDE, WORDCLOUD, POSTIT, RANKING, OPENTEXT, ROLEPLAY, MULTIPLE_CHOICE, AUDIO, IMAGE, etc. Chaque type a un schema Zod, des renderers, et un compilateur vers primitives.

### Kind
La nature structurelle d'un widget. Deux valeurs :
- **LEAF** : widget terminal, pas d'enfants. Contient une spec `data` directement.
- **COMPOSED** : widget avec des enfants ordonnes (`children`) + orchestration. Peut optionnellement avoir des `groups` pour nommer des sections d'enfants (ex: "Introduction", "Activites", "Evaluation").

### Category
Le comportement general d'un widget :
- **Static** : contenu en lecture seule (SLIDE, AUDIO, IMAGE, texte). Pas d'input participant.
- **Interactive** : contenu avec input participant, scoring, resultats (QUIZ, WORDCLOUD, POSTIT...).

### Template
Modele predefini de composition. Un template decrit une structure type (ex: "Ice-breaker" = WORDCLOUD + POSTIT + RANKING en sequence) que le LLM instancie avec du contenu specifique. Un template n'est PAS un type — c'est une recette de composition.

---

## Lifecycle

### Widget Status (creation lifecycle)
Les etats d'un widget dans Studio, pendant sa creation :

| Status | Description |
|--------|-------------|
| `DRAFT` | Cree ou genere, pas encore valide par l'utilisateur |
| `GENERATING` | En cours de generation par le pipeline LLM |
| `READY` | Valide, jouable, deployable |
| `ERROR` | Generation echouee |

Transitions : `DRAFT → GENERATING → READY` ou `GENERATING → ERROR → GENERATING` (retry)

Le status est controle par le systeme (pipeline de generation) et l'utilisateur (confirmation DRAFT → READY).

### Playback State (session lifecycle)
L'etat de lecture d'un widget dans une session (Engage ou player self-paced). Commun a tous les types de widgets.

| State | Description |
|-------|-------------|
| `IDLE` | Le widget existe dans la session mais n'a pas ete lance |
| `PREVIEW` | Le presenter visualise le widget avant de le lancer (pas visible aux participants) |
| `ACTIVE` | Le widget est live. Les participants peuvent interagir. Les resultats s'agregent en temps reel |
| `ENDED` | Le widget est termine. Plus de soumissions acceptees. Resultats finaux affiches |

Transitions : `IDLE → PREVIEW → ACTIVE → ENDED`

Le playback state est controle par le **presenter** (start, end) ou par le **player** en mode self-paced (l'utilisateur avance a son rythme).

### Internal State (widget-specific lifecycle)
Les etats internes propres a chaque type de widget, a l'interieur du playback state `ACTIVE`. Chaque type definit son propre flow.

**Quiz** :
```
Per-question: PENDING → LIVE (question affichee) → CLOSED (timer expire ou presenter end)
  → REVEALED (resultats visibles aux participants) → next question
Global: all questions REVEALED → quiz ENDED
```

**Post-it** :
```
COLLECTING (participants creent des post-its) → ORGANIZING (presenter categorise)
  → VOTING (votes ouverts) → RESULTS
```

**Wordcloud** :
```
COLLECTING (participants soumettent des mots) → ENDED (nuage final)
```

**Slide** (statique) :
```
DISPLAYED (pas d'etat interne, lecture seule)
```

L'internal state est gere par le widget lui-meme (via son composant presenter/participant) et expose au presenter via des actions de controle.

---

## Orchestration

### Orchestration
Les regles de navigation entre les enfants d'un widget COMPOSED. Deux modes :

- **Sequential** : les enfants sont joues dans l'ordre. Le presenter (ou le player) avance au suivant quand le courant est termine.
- **Conditional** : les transitions entre enfants dependent de conditions evaluees sur les resultats (score, vote, etc.).

### Transition
Une regle de navigation entre deux widgets enfants dans une composition. Definie par :
- `from` : widget source (id)
- `to` : widget destination (id)
- `condition` (optionnel) : expression simple evaluee sur le resultat du widget source

### Condition
Expression simple evaluee pour decider d'une transition. Syntaxe minimaliste :
```
Operateurs : ==, !=, >=, <=, >, <
Exemples : "score >= 70", "winningOptionId == 'explore'"
```
Pas de JSONPath, pas de JavaScript. Operandes = proprietes plates du resultat du widget precedent.

---

## Generatif

### Generative Block
Un widget (ou une partie de widget) dont le contenu est genere **at runtime** par un LLM, pendant la session. Defini par :
- **promptTemplate** : le prompt avec des variables `{{variable}}`
- **inputBindings** : comment les variables sont resolues (resultats de widgets precedents)
- **outputSchema** : la forme attendue du contenu genere
- **fallback** : contenu par defaut si le LLM echoue

Un generative block n'est PAS un type de widget — c'est une **capacite** que n'importe quel widget peut avoir.

---

## Architecture

### Studio
Application de creation. Upload de documents, chat RAG avec l'IA, generation de widgets, edition, composition, preview self-paced, partage. Nom technique interne (le nom marketing sera different).

### Engage
Application de session live. Le presenter lance une session, les participants rejoignent, les widgets interactifs (activities) sont joues en temps reel. Nom technique interne.

### Player
Le renderer universel de widgets. Interprete les primitives et rend des composants web. Existe en plusieurs modes :

| Mode | Contexte | Temps reel |
|------|----------|------------|
| **Preview** | Studio editor, ephemere | Non |
| **Self-paced** | Studio partage, LMS, embed | Non |
| **Live** | Engage session | Oui (Ably) |
| **Static** | Export HTML, partage public | Non |
| **Embed** | Site tiers, iframe | Optionnel |

### PlaybackPlan
Format d'export d'une composition. Le contrat entre Studio et le Player/Engage. Contient :
- `steps` : les widgets a jouer (avec leur spec)
- `transitions` : les regles de navigation entre steps
- `mode` : live-session ou self-paced
- Config LLM pour les blocs generatifs

---

## Roles

### Creator
L'utilisateur qui cree des widgets dans Studio. Upload des documents, interagit avec le chat IA, edite les widgets, compose des sequences, deploie vers Engage.

### Presenter
L'utilisateur qui pilote une session live dans Engage. Controle le playback state des widgets (start, end, next), voit les resultats en temps reel, peut forcer des transitions.

### Participant
L'utilisateur qui interagit avec un widget interactif dans une session live. Soumet des reponses, vote, ecrit des post-its, repond au quiz. N'a pas de controle sur le playback state.

### Viewer
L'utilisateur qui consulte un widget en lecture seule ou en mode self-paced. Navigue a son rythme, repond individuellement (pas de temps reel collectif).

---

## Data

### Spec (data)
Le champ JSON `data` d'un widget qui contient sa configuration specifique au type. Pour un QUIZ : les questions, options, scoring config. Pour un SLIDE : le titre et le contenu markdown. Valide par le schema Zod du type.

### Schema
La definition Zod qui valide la spec d'un type de widget. Source de verite pour la forme du `data`. Utilise a l'ecriture (validation) et a la lecture (cast type).

### Config
Synonyme de Spec dans le contexte d'Engage (activity config). Le terme "config" est utilise dans le code Engage, "spec/data" dans Studio. Designent la meme chose.

### Result
Les donnees produites par un widget apres interaction : reponses des participants, scores, distribution des votes, mots soumis, etc. Calcule par aggregation et stocke en cache (Redis) pendant la session.

---

## Structure pedagogique

Terminologie officielle du systeme LMD francais (ECTS europeen). Chaque terme est donne en francais (officiel), avec sa traduction anglaise et son usage dans le systeme Qiplim.

Voir `specs/pedagogical-structure.md` pour le detail complet et le mapping international.

### Hierarchie — tableau de reference

| Niveau | Terme FR (officiel) | Terme EN | Widget Qiplim | Endpoint API | Roles |
|--------|--------------------|-----------|--------------|--------------|----- |
| 1 | **Programme** (Formation) | Program | `PROGRAM_OVERVIEW` | `/generate/program` | Admin, RP |
| 2 | **Semestre** | Semester | `SEMESTER` | `/generate/semester` | Admin, RP |
| 3 | **UE** (Unite d'Enseignement) | Unit (Teaching Unit) | `UNIT` | `/generate/unit` | Admin, RP |
| 4 | **EC** (Element Constitutif) | Course (Component) | `COURSE_PLAN` + `SYLLABUS` | `/generate/course-plan`, `/generate/syllabus` | RP, Intervenant |
| 5 | **Seance** (Session) | Session | `SESSION_PLAN` | `/generate/session-plan` | RP, Intervenant |
| 6 | **Activite** | Activity | `QUIZ`, `WORDCLOUD`, etc. | `/generate/activity` | Intervenant |

### Programme
- **FR** : Programme / Formation
- **EN** : Program
- **Definition** : Diplome complet (Licence, Master, Certification). Le niveau le plus haut. Defini par un referentiel de competences et une maquette de formation.
- **Widget** : `PROGRAM_OVERVIEW`
- **Exemple** : "Master UX Design — 120 ECTS, 4 semestres"
- **Roles** : Admin, RP (Responsable Pedagogique)

### Semestre
- **FR** : Semestre
- **EN** : Semester / Term
- **Definition** : Periode academique. Toujours 30 ECTS dans le systeme LMD. Contient des UEs.
- **Widget** : `SEMESTER`
- **Exemple** : "Semestre 1 — Fondamentaux du design, 30 ECTS"
- **Roles** : Admin, RP

### UE (Unite d'Enseignement)
- **FR** : Unite d'Enseignement (UE)
- **EN** : Teaching Unit / Unit
- **Definition** : Groupe coherent d'enseignements au sein d'un semestre. Peut etre obligatoire, optionnel ou libre. Contient un ou plusieurs ECs. Associee a un bloc de competences.
- **Widget** : `UNIT`
- **Exemple** : "Design fondamental — 6 ECTS, coefficient 1"
- **Roles** : Admin, RP
- **Attention** : "Module" est souvent utilise comme synonyme de UE dans le langage courant, mais c'est imprecis. Dans Qiplim, on utilise **UE** (officiel) ou **Unit** (API).

### EC (Element Constitutif)
- **FR** : Element Constitutif (EC)
- **EN** : Course / Course Component
- **Definition** : Un cours individuel au sein d'une UE. C'est l'unite la plus fine du systeme administratif. A un volume horaire (CM/TD/TP), des ECTS, un syllabus.
- **Widgets** : `COURSE_PLAN` (progression des seances) + `SYLLABUS` (fiche descriptive)
- **Exemple** : "Theorie de la couleur — 3 ECTS, 24h (12h CM + 8h TD + 4h TP)"
- **Roles** : RP, Intervenant
- **Attention** : dans le systeme Qiplim, un EC est represente par deux widgets complementaires : le `SYLLABUS` (quoi enseigner) et le `COURSE_PLAN` (comment le structurer en seances).

### Seance
- **FR** : Seance / Session
- **EN** : Session / Class / Lecture
- **Definition** : Une intervention dans un EC (ex: 3h de cours). Contient des activites. N'a pas d'existence administrative formelle (pas d'ECTS propres) mais c'est l'unite operationnelle de l'enseignant.
- **Widget** : `SESSION_PLAN`
- **Exemple** : "Seance 3 — Le cercle chromatique, 3h, presentiel"
- **Roles** : RP, Intervenant

### Activite (pedagogique)
- **FR** : Activite / Activite pedagogique
- **EN** : Activity / Learning Activity
- **Definition** : Ce qui se passe dans une seance : quiz, discussion, exercice pratique, atelier, roleplay. Dans Qiplim, une activite pedagogique est representee par un **widget** (terme technique) ou une **activity** (terme Engage en session live).
- **Widget** : `QUIZ`, `WORDCLOUD`, `POSTIT`, `RANKING`, `OPENTEXT`, `ROLEPLAY`, etc.
- **Exemple** : "Quiz de 5 questions sur le cercle chromatique, 10 min"
- **Roles** : Intervenant
- **Attention** : le terme "activite" est prefere dans le discours pedagogique. Le terme "widget" est utilise dans le code et les specs techniques. En session live Engage, on parle d'"activity".

### Syllabus
- **FR** : Syllabus / Plan de cours (attention: ambigue)
- **EN** : Syllabus / Course Description
- **Definition** : Fiche descriptive d'un EC : objectifs, prerequis, contenu, modalites d'evaluation, bibliographie. Document destine aux etudiants et aux enseignants.
- **Widget** : `SYLLABUS`
- **Attention** : en francais, "plan de cours" est parfois utilise comme synonyme de syllabus. Dans Qiplim, on distingue clairement : `SYLLABUS` = description (quoi), `COURSE_PLAN` = progression (comment).

### Plan de cours
- **FR** : Plan de cours / Progression pedagogique
- **EN** : Course Plan / Course Outline
- **Definition** : Structure d'un EC en seances : liste ordonnee des seances avec titre, objectifs et resume. Document de planification pour l'enseignant.
- **Widget** : `COURSE_PLAN`
- **Attention** : ne pas confondre avec le syllabus. Le plan de cours repond a "dans quel ordre ?", le syllabus repond a "quoi et pourquoi ?".

### Deroule pedagogique
- **FR** : Deroule pedagogique / Scenario pedagogique
- **EN** : Session Plan / Lesson Plan
- **Definition** : Detail minute par minute d'une seance : timing, activites, supports, transitions. Document operationnel de l'enseignant.
- **Widget** : `SESSION_PLAN`

### Maquette de formation
- **FR** : Maquette de formation / Maquette pedagogique
- **EN** : Curriculum Framework / Curriculum Blueprint
- **Definition** : Document administratif officiel qui structure un programme : UEs, ECs, ECTS, coefficients. Depose au ministere et evalue par le HCERES. Ce n'est pas un widget — c'est le document de reference que les widgets `PROGRAM_OVERVIEW` + `SEMESTER` + `UNIT` representent.

### Modalite
- **FR** / **EN** :
  - **Presentiel** / In-person : en personne, meme lieu
  - **Distanciel synchrone** / Synchronous remote : a distance, en direct (visio)
  - **Distanciel asynchrone** / Asynchronous remote : a distance, a son rythme (LMS)
  - **Hybride** / Blended : mix presentiel/distanciel, le formateur decide la repartition
  - **Comodal** / Comodal (HyFlex) : meme contenu en presentiel et distanciel simultanement, l'etudiant choisit

### ECTS
- **FR** : Credit ECTS
- **EN** : ECTS Credit
- **Definition** : European Credit Transfer and Accumulation System. 1 ECTS = 25-30h de travail etudiant (cours + travail personnel). 30 ECTS par semestre. 60 ECTS par annee. Standard europeen (Bologna Process).
- **Equivalences** : 1 ECTS ≈ 2 CATS (UK) ≈ 0.5 US Credit Hour

### Bloc de competences
- **FR** : Bloc de competences
- **EN** : Competency Block / Skills Block
- **Definition** : Ensemble homogene de competences necessaires a l'exercice autonome d'une activite professionnelle. Defini par France Competences. Peut etre valide independamment du diplome complet. Associe aux UEs dans la maquette.

### Roles pedagogiques

| Role | FR | EN | Acces dans Qiplim |
|------|----|----|-------------------|
| **Admin** | Administrateur | Administrator | Programme, Semestre, UE |
| **RP** | Responsable Pedagogique | Academic Director | Programme, Semestre, UE, EC |
| **Intervenant** | Intervenant / Enseignant | Instructor / Teacher | EC, Seance, Activite |
| **Apprenant** | Etudiant / Apprenant | Student / Learner | Lecture, Participation |

---

## API

### API Studio
API interne (stateful). Liee a un studio, un user, des sources. Authentification par cookie de session. Utilisee par le frontend Studio.

### API Generative
API publique (stateless). Input/output pur, pas de studio, pas de persistence. Authentification par API key. Utilisee par les systemes tiers (Neocampus, CLI, MCP server). Endpoints specialises par niveau pedagogique (syllabus, plan de cours, deroule, activite).

### Locale
Parametre de l'API Generative qui adapte la terminologie au systeme educatif du pays. `fr-lmd` (defaut), `en-uk`, `en-us`, `generic`. Voir `specs/pedagogical-structure.md § 3`.

---

## Distribution

### Registry
Le registre central qui associe chaque type de widget a ses composants : schema Zod, renderers (display, editor, presenter, participant), icone, label, categorie, capabilities. Extensible : ajouter un type = ajouter une entree dans le registry.

### Compiler
Fonction qui transforme un widget de type fixe (QUIZ, SLIDE...) en arbre de primitives pour le player universel. Chaque type a son compilateur. Les widgets custom en primitives brutes n'ont pas besoin de compilation.

### MCP Server
Serveur Model Context Protocol qui expose les operations Qiplim comme tools pour les assistants IA (Claude Code, Cursor). Permet de creer, pousser et deployer des widgets directement depuis un LLM.

# Qiplim — Structure Pedagogique & Generation

Specification de la hierarchie pedagogique, de la generation a chaque niveau, et du mapping multi-locale.

---

## 1. Hierarchie pedagogique

Basee sur le systeme LMD francais (Licence-Master-Doctorat), standard europeen ECTS.

```
PROGRAMME (Master UX Design — 120 ECTS, 4 semestres)
  └── SEMESTRE (S1 — 30 ECTS)
        └── UE — Unite d'Enseignement (Design fondamental — 6 ECTS)
              └── EC — Element Constitutif (Theorie de la couleur — 3 ECTS, 24h)
                    └── SEANCE (Seance 3 — Le cercle chromatique — 3h)
                          └── ACTIVITE (Quiz, exercice, discussion, atelier, roleplay)
```

### 1.1 Definitions par niveau

| Niveau | Terme FR | Description | Contient | Metadonnees cles |
|--------|----------|-------------|----------|-----------------|
| **Programme** | Programme / Formation | Diplome complet (Licence, Master, Certification) | Semestres, UEs | ECTS total, duree (annees), niveau (L/M/D), referentiel de competences, fiche RNCP |
| **Semestre** | Semestre | Periode academique (30 ECTS) | UEs | Numero (S1-S10), ECTS (30), periode |
| **UE** | Unite d'Enseignement | Groupe coherent d'enseignements | ECs | ECTS, coefficient, obligatoire/optionnel/libre, blocs de competences |
| **EC** | Element Constitutif | Un cours individuel | Seances | ECTS, heures (CM/TD/TP), modalite (presentiel/distanciel/hybride), prerequis, evaluation |
| **Seance** | Seance / Session | Une intervention (ex: 3h) | Activites | Duree, objectifs specifiques, materiel, modalite |
| **Activite** | Activite | Ce qui se passe dans une seance | — | Type (quiz, discussion, exercice, atelier), duree, materiel, consignes |

### 1.2 Documents associes

| Document | Niveau | Description | Pour qui |
|----------|--------|-------------|----------|
| **Maquette de formation** | Programme | Structure officielle (UEs, ECTS, coefficients). Document administratif depose au ministere. | Administration, HCERES |
| **Referentiel de competences** | Programme | Competences visees a l'issue du diplome. Blocs de competences (France Competences). | Administration, etudiants |
| **Fiche RNCP** | Programme | Enregistrement officiel de la certification (France Competences). | Administration, employeurs |
| **Syllabus** | EC (cours) | Fiche descriptive du cours : objectifs, prerequis, contenu, evaluation, bibliographie. | Etudiants, enseignants |
| **Plan de cours** | EC (cours) | Progression pedagogique : liste des seances avec titre + objectifs. | Enseignants |
| **Deroule pedagogique** | Seance | Detail minute par minute : timing, activites, supports, transitions. | Enseignants |
| **Scenario pedagogique** | Seance ou EC | Design complet d'une experience d'apprentissage (activites + evaluations + ressources). | Concepteurs pedagogiques |

### 1.3 Modalites

| Terme | Description |
|-------|-------------|
| **Presentiel** | En personne, meme lieu |
| **Distanciel synchrone** | A distance, en direct (visio, Zoom) |
| **Distanciel asynchrone** | A distance, a son rythme (LMS, video, exercices) |
| **Hybride** | Mix presentiel + distanciel, le formateur decide la repartition |
| **Comodal** | Meme contenu delivre en presentiel ET distanciel simultanement, l'etudiant choisit |

---

## 2. API Generative — Endpoints par niveau

Chaque niveau de la hierarchie a son **propre endpoint** avec ses inputs/outputs specifiques. Pas d'endpoint generique unique.

### 2.1 POST /api/v1/generate/program

Genere la structure d'un programme (semestres, UEs, ECTS).

**Input :**
```json
{
  "title": "Master UX Design",
  "content": "Description du programme, referentiel de competences...",
  "params": {
    "level": "master",
    "totalEcts": 120,
    "semesters": 4,
    "competencyBlocks": ["Recherche utilisateur", "Design d'interaction", "Prototypage"],
    "language": "fr"
  }
}
```

**Output :**
```json
{
  "program": {
    "title": "Master UX Design",
    "level": "master",
    "totalEcts": 120,
    "semesters": [
      {
        "number": 1,
        "ects": 30,
        "title": "Fondamentaux du design d'experience",
        "units": [
          { "title": "UX Research", "ects": 6 },
          { "title": "Design Studio", "ects": 9 },
          { "title": "Culture Design", "ects": 6 },
          { "title": "Outils numeriques", "ects": 9 }
        ]
      }
    ]
  }
}
```

---

### 2.2 POST /api/v1/generate/semester

Genere la structure d'un semestre (UEs avec repartition ECTS).

**Input :**
```json
{
  "title": "Semestre 1 — Fondamentaux",
  "content": "Contexte du programme...",
  "params": {
    "number": 1,
    "ects": 30,
    "parentProgramTitle": "Master UX Design",
    "language": "fr"
  }
}
```

**Output :**
```json
{
  "semester": {
    "number": 1,
    "ects": 30,
    "title": "Semestre 1 — Fondamentaux du design d'experience",
    "units": [
      { "title": "UX Research", "ects": 6, "mandatory": true, "courses": ["Methodes d'entretien", "Tests utilisateurs"] },
      { "title": "Design Studio", "ects": 9, "mandatory": true, "courses": ["Projet UX 1"] }
    ]
  }
}
```

---

### 2.3 POST /api/v1/generate/unit

Genere la structure d'une UE (ECs avec repartition ECTS et competences).

**Input :**
```json
{
  "title": "UX Research",
  "content": "Description de l'unite...",
  "params": {
    "ects": 6,
    "competencyBlock": "Recherche utilisateur",
    "parentSemesterTitle": "Semestre 1",
    "language": "fr"
  }
}
```

**Output :**
```json
{
  "unit": {
    "title": "UX Research",
    "ects": 6,
    "competencyBlock": "Recherche utilisateur",
    "courses": [
      { "title": "Methodes d'entretien", "ects": 3, "hours": 24, "modality": "presentiel" },
      { "title": "Tests utilisateurs", "ects": 3, "hours": 24, "modality": "hybride" }
    ]
  }
}
```

---

### 2.4 POST /api/v1/generate/syllabus

Genere un syllabus (fiche descriptive d'un cours/EC).

**Input :**
```json
{
  "title": "Theorie de la couleur",
  "content": "Document source ou description du cours...",
  "params": {
    "ects": 3,
    "hours": 24,
    "hoursBreakdown": { "cm": 12, "td": 8, "tp": 4 },
    "level": "licence-2",
    "modality": "presentiel",
    "language": "fr",
    "competencyBlocks": ["Design graphique", "Culture visuelle"]
  }
}
```

**Output :**
```json
{
  "syllabus": {
    "title": "Theorie de la couleur",
    "ects": 3,
    "hours": 24,
    "level": "licence-2",
    "objectives": [
      "Maitriser le cercle chromatique et les harmonies",
      "Comprendre la psychologie des couleurs",
      "Appliquer les principes de couleur en design"
    ],
    "prerequisites": ["Bases en design graphique", "Culture visuelle niveau 1"],
    "content": [
      "Introduction a la theorie de la couleur",
      "Le cercle chromatique et les systemes de couleur (RVB, CMJN, Pantone)",
      "Harmonies et contrastes",
      "Psychologie et symbolique des couleurs",
      "Application en design d'interface"
    ],
    "assessment": {
      "methods": ["Projet pratique (60%)", "Examen ecrit (40%)"],
      "description": "Projet de creation d'une palette chromatique pour un projet de design."
    },
    "bibliography": [
      "Itten, J. — Art de la couleur",
      "Albers, J. — L'interaction des couleurs"
    ],
    "competencies": ["Concevoir une palette chromatique coherente", "Argumenter ses choix de couleur"]
  }
}
```

---

### 2.2 POST /api/v1/generate/course-plan

Genere un plan de cours (progression de seances pour un EC).

**Input :**
```json
{
  "title": "Theorie de la couleur",
  "content": "Document source ou syllabus...",
  "syllabus": { ... },
  "params": {
    "sessionCount": 8,
    "sessionDuration": 3,
    "modality": "hybride",
    "language": "fr"
  }
}
```

**Output :**
```json
{
  "coursePlan": {
    "title": "Theorie de la couleur",
    "totalHours": 24,
    "sessionCount": 8,
    "sessions": [
      {
        "number": 1,
        "title": "Introduction — Pourquoi la couleur ?",
        "objectives": ["Comprendre l'importance de la couleur en design"],
        "modality": "presentiel",
        "duration": 3,
        "summary": "Presentation du cours, histoire de la couleur, premiers exercices d'observation."
      },
      {
        "number": 2,
        "title": "Le cercle chromatique",
        "objectives": ["Maitriser les couleurs primaires, secondaires, tertiaires"],
        "modality": "presentiel",
        "duration": 3,
        "summary": "Theorie + atelier pratique de creation d'un cercle chromatique."
      }
    ],
    "assessmentPlan": {
      "continuous": "Participation + exercices hebdomadaires (40%)",
      "final": "Projet de palette chromatique (60%)"
    }
  }
}
```

---

### 2.3 POST /api/v1/generate/session-plan

Genere un deroule pedagogique (detail d'une seance).

**Input :**
```json
{
  "title": "Le cercle chromatique",
  "content": "Document source...",
  "context": {
    "coursePlanTitle": "Theorie de la couleur",
    "sessionNumber": 2,
    "totalSessions": 8,
    "previousSession": "Introduction — Pourquoi la couleur ?",
    "nextSession": "Harmonies et contrastes"
  },
  "params": {
    "duration": 180,
    "modality": "presentiel",
    "language": "fr",
    "activityTypes": ["quiz", "discussion", "exercice-pratique"]
  }
}
```

**Output :**
```json
{
  "sessionPlan": {
    "title": "Le cercle chromatique",
    "duration": 180,
    "objectives": [
      "Identifier les couleurs primaires, secondaires et tertiaires",
      "Construire un cercle chromatique a la main"
    ],
    "materials": ["Gouache (3 primaires)", "Papier aquarelle", "Pinceau", "Projecteur"],
    "timeline": [
      {
        "start": 0,
        "duration": 10,
        "type": "introduction",
        "title": "Accueil et rappel",
        "description": "Rappel de la seance precedente. Questions."
      },
      {
        "start": 10,
        "duration": 20,
        "type": "presentation",
        "title": "Les systemes de couleur",
        "description": "Presentation magistrale : RVB, CMJN, Pantone. Exemples concrets."
      },
      {
        "start": 30,
        "duration": 10,
        "type": "activite",
        "activityType": "quiz",
        "title": "Quiz — Les bases",
        "description": "5 questions rapides sur les couleurs primaires et secondaires."
      },
      {
        "start": 40,
        "duration": 15,
        "type": "pause",
        "title": "Pause"
      },
      {
        "start": 55,
        "duration": 60,
        "type": "activite",
        "activityType": "exercice-pratique",
        "title": "Atelier — Construction du cercle chromatique",
        "description": "A partir des 3 couleurs primaires en gouache, les etudiants construisent un cercle chromatique complet."
      },
      {
        "start": 115,
        "duration": 20,
        "type": "activite",
        "activityType": "discussion",
        "title": "Critique collective",
        "description": "Chaque etudiant presente son cercle. Discussion sur les melanges obtenus."
      },
      {
        "start": 135,
        "duration": 15,
        "type": "synthese",
        "title": "Synthese et ouverture",
        "description": "Recapitulatif des points cles. Introduction a la prochaine seance sur les harmonies."
      }
    ]
  }
}
```

---

### 2.4 POST /api/v1/generate/activity

Genere une activite (widget) a partir du contenu d'une seance. C'est l'endpoint existant, inchange.

**Input :**
```json
{
  "type": "QUIZ",
  "content": "Le cercle chromatique se compose de couleurs primaires (rouge, bleu, jaune)...",
  "params": {
    "questionCount": 5,
    "difficulty": "easy",
    "language": "fr"
  }
}
```

**Output :** un widget JSON (cf. generative-api.md).

---

### 2.8 Resume des endpoints

| Endpoint | Niveau | Input principal | Output | Roles |
|----------|--------|----------------|--------|-------|
| `POST /api/v1/generate/program` | Programme | Description + ECTS + competences | Structure semestres + UEs | Admin, RP |
| `POST /api/v1/generate/semester` | Semestre | Programme parent + ECTS | Structure UEs + ECs | Admin, RP |
| `POST /api/v1/generate/unit` | UE | Semestre parent + competences | Structure ECs + heures | Admin, RP |
| `POST /api/v1/generate/syllabus` | EC | Description du cours + params ECTS | Objectifs, prerequis, evaluation, biblio | RP, Intervenant |
| `POST /api/v1/generate/course-plan` | EC | Syllabus + params (nb seances, duree) | Progression de seances | RP, Intervenant |
| `POST /api/v1/generate/session-plan` | Seance | Contexte du cours + contenu | Timeline minute par minute | RP, Intervenant |
| `POST /api/v1/generate/activity` | Activite | Contenu + type | Widget JSON (quiz, roleplay, etc.) | Intervenant |

Chaque niveau peut s'appuyer sur le resultat du niveau superieur (generation en cascade) :
```
generate/program → structure du programme
  → generate/semester (input: programme) → structure du semestre
    → generate/unit (input: semestre) → structure de l'UE
      → generate/syllabus (input: UE + EC) → fiche descriptive
        → generate/course-plan (input: syllabus) → progression des seances
          → generate/session-plan (input: plan + seance) → deroule pedagogique
            → generate/activity (input: contenu seance) → widget interactif
```

Chaque niveau est **autonome** : on peut generer un SESSION_PLAN sans avoir de PROGRAM_OVERVIEW. Le lien parent est optionnel (`parentProgramId`, `parentSemesterId`, `parentUnitId`).

---

## 3. Locale & Mapping international

### 3.1 Systeme de locale

L'API accepte un parametre `locale` qui adapte la terminologie et la structure a chaque systeme educatif.

```json
{
  "locale": "fr-lmd",
  "type": "COURSE_PLAN",
  "content": "...",
  "params": { ... }
}
```

### 3.2 Locales supportees

| Locale | Systeme | Hierarchie | Contexte |
|--------|---------|-----------|----------|
| `fr-lmd` | LMD francais / ECTS europeen | Programme → Semestre → UE → EC → Seance → Activite | Enseignement superieur |
| `fr-secondary` | Secondaire francais | Classe → Matiere → Chapitre → Seance → Activite | Lycees, colleges |
| `fr-pro` | Formation professionnelle | Parcours → Module → Session → Activite | Entreprises, OF |
| `en-uk` | Systeme britannique | Programme → Year → Module → Lecture/Seminar → Activity | UK higher ed |
| `en-us` | Systeme americain | Program → Semester → Course → Class/Lecture → Activity | US higher ed |
| `generic` (default) | Generique | Program → Unit → Course → Session → Activity | Tout contexte |

La locale est determinee par le type d'organisation (tenant). Un lycee utilise automatiquement `fr-secondary`. Un prof n'a pas a choisir.

### 3.3 Hierarchie par locale

#### `fr-secondary` (Lycees)

```
CLASSE (ex: Terminale STI2D — 30 eleves)
  └── MATIERE (ex: Mathematiques — 4h/semaine)
        └── CHAPITRE (ex: Limites et derivees — 3 semaines)
              └── SEANCE (ex: Seance 4 — Applications geometriques — 1h)
                    └── ACTIVITE (quiz, exercice, discussion)
```

| Niveau | Terme | Widget | Endpoint API |
|--------|-------|--------|-------------|
| 1 | Classe | — (gestion administrative, pas de widget) | — |
| 2 | Matiere | — (gestion administrative) | — |
| 3 | Chapitre | `COURSE_PLAN` | `/generate/course-plan` |
| 4 | Seance | `SESSION_PLAN` | `/generate/session-plan` |
| 5 | Activite | `QUIZ`, `WORDCLOUD`, etc. | `/generate/activity` |

**Differences avec `fr-lmd`** :
- Pas d'ECTS (les credits n'existent pas en lycee)
- Pas de semestre (l'annee est decoupee en trimestres mais c'est de l'administration, pas du contenu)
- La "Classe" et la "Matiere" sont des conteneurs organisationnels, pas des widgets generatifs
- Le prof genere au niveau Chapitre (plan de seances) et Seance (deroule)

#### `fr-pro` (Formation professionnelle)

```
PARCOURS (ex: Certification RGPD — 40h)
  └── MODULE (ex: Module 1 — Les principes du RGPD — 8h)
        └── SESSION (ex: Session 2 — Droits des personnes — 2h)
              └── ACTIVITE (quiz, roleplay, simulation)
```

| Niveau | Terme | Widget | Endpoint API |
|--------|-------|--------|-------------|
| 1 | Parcours | `PROGRAM_OVERVIEW` | `/generate/program` |
| 2 | Module | `COURSE_PLAN` | `/generate/course-plan` |
| 3 | Session | `SESSION_PLAN` | `/generate/session-plan` |
| 4 | Activite | `QUIZ`, `ROLEPLAY`, etc. | `/generate/activity` |

**Differences avec `fr-lmd`** :
- Pas d'ECTS (mais des heures de formation et des blocs de competences)
- "Module" en pro ≈ "EC" en superieur (un cours)
- Souvent lie a une certification (Qualiopi, RNCP)

### 3.4 Mapping terminologique complet

| Concept | `fr-lmd` | `fr-secondary` | `fr-pro` | `en-uk` | `en-us` | `generic` |
|---------|----------|----------------|----------|---------|---------|-----------|
| Niveau 1 (programme) | Programme | Classe | Parcours | Programme | Program | Program |
| Niveau 2 (groupe) | Semestre → UE | Matiere | Module | Year → Module | Semester | Unit |
| Niveau 3 (cours) | EC | Chapitre | Session | Module | Course | Course |
| Niveau 4 (intervention) | Seance | Seance | — | Lecture | Class | Session |
| Niveau 5 (interaction) | Activite | Activite | Activite | Activity | Activity | Activity |
| Fiche descriptive | Syllabus | — | Fiche module | Module Spec | Syllabus | Syllabus |
| Plan des seances | Plan de cours | Plan du chapitre | Plan du module | Teaching Plan | Course Outline | Course Plan |
| Detail d'une seance | Deroule pedagogique | Deroule | Deroule | Lesson Plan | Lesson Plan | Session Plan |
| Credits | ECTS | — | Heures | CATS | Credit Hours | Credits |

### 3.5 ECTS et equivalences

### 3.4 ECTS et equivalences

| Systeme | Unite | Equivalence |
|---------|-------|-------------|
| ECTS (Europe) | 1 ECTS = 25-30h de travail etudiant | Standard europeen |
| CATS (UK) | 1 CAT = 10h. 1 ECTS ≈ 2 CATS | Systeme britannique |
| US Credit Hours | 1 credit ≈ 45h total (15h cours + 30h travail personnel) | Systeme americain |

---

## 4. Widgets Studio par niveau

Dans l'UI Studio, chaque niveau de la hierarchie a son propre widget/vue dedie.

| Niveau | Widget Studio | Ce qu'il affiche | Actions |
|--------|--------------|-----------------|---------|
| **Programme** | `PROGRAM_OVERVIEW` | Vue d'ensemble du diplome, semestres, ECTS, competences | Generer la maquette, exporter |
| **UE** | `UNIT_CARD` | Carte d'une UE avec ECs, ECTS, coefficient | Editer, generer les ECs |
| **EC / Cours** | `COURSE_SYLLABUS` | Syllabus complet (objectifs, contenu, evaluation) | Generer le syllabus, generer le plan de cours |
| **Plan de cours** | `COURSE_PLAN` | Progression des seances (timeline) | Generer, editer les seances, reordonner |
| **Seance** | `SESSION_PLAN` | Deroule minute par minute (timeline detaillee) | Generer le deroule, ajouter des activites |
| **Activite** | `QUIZ`, `WORDCLOUD`, `ROLEPLAY`, etc. | Le widget interactif jouable | Generer, editer, jouer, deployer |

Chaque widget appelle l'endpoint API correspondant a son niveau. Les widgets de niveaux superieurs peuvent generer en cascade (plan de cours → seances → activites).

---

## 5. References

### Sources officielles
- **Arrete du 22 janvier 2014** (Legifrance) — cadre LMD, definition UE/EC
- **ECTS Users' Guide** (Commission Europeenne) — credits, charge de travail
- **France Competences** — blocs de competences, fiches RNCP
- **HCERES** — evaluation des formations
- **Arrete du 30 juillet 2018** — approche par competences

### Equivalences internationales
- **CATS** (Credit Accumulation and Transfer Scheme) — systeme britannique
- **US Credit Hours** — systeme americain
- **Bologna Process** — harmonisation europeenne

# Qiplim Studio — Design pedagogique, patterns ludiques & parcours utilisateurs

> **Public cible** : enseignants (lycee, universite), formateurs corporate, createurs independants.
> Ce document est un guide pratique. Il explique comment utiliser Studio pour creer des contenus pedagogiques engageants, sans prerequis technique.

---

## Table des matieres

1. [Parcours utilisateurs](#1-parcours-utilisateurs)
2. [Templates de lecons prets a l'emploi](#2-templates-de-lecons-prets-a-lemploi)
3. [Guide de gamification](#3-guide-de-gamification)
4. [Guide de documentation pedagogique](#4-guide-de-documentation-pedagogique)
5. [Accessibilite](#5-accessibilite)
6. [Annexe — Widgets disponibles](#6-annexe--widgets-disponibles)

---

## 1. Parcours utilisateurs

Quatre personas, quatre parcours. Chaque parcours est un scenario reel, etape par etape.

### 1.A Prof de lycee — "Creer un quiz pour demain"

**Contexte** : Mme Leroy, prof de maths en Terminale, a un controle la semaine prochaine. Elle veut faire reviser ses eleves sur les derivees avec un quiz interactif. Elle a 15 minutes devant elle.

**Objectif pedagogique** : verification des connaissances (Bloom : Memoriser / Comprendre)

| Etape | Action | Ce qui se passe dans Studio | Duree |
|-------|--------|----------------------------|-------|
| 1 | Connexion | Login → Dashboard. Mme Leroy voit ses studios existants. | 10s |
| 2 | Nouveau studio | Clic "Nouveau studio" → titre : "Maths Terminale — Derivees" | 10s |
| 3 | Upload du PDF | Drag & drop du PDF du chapitre dans le panneau Sources. Le document est indexe (extraction + embeddings). Statut : PENDING → INDEXING → INDEXED. | 30s-2min |
| 4 | Chat | "Cree un quiz de 10 questions sur les derivees, niveau terminale. Melange des calculs simples et des questions de comprehension." | 5s |
| 5 | Preview du quiz | L'IA genere le quiz. Apercu dans le chat avec le nombre de questions, la difficulte, les sources utilisees. Boutons : Modifier / Annuler / Generer. | 10-30s |
| 6 | Generation | Clic "Generer". Pipeline BullMQ : RAG sur le PDF → LLM → validation Zod → Widget(DRAFT). Progression en temps reel (SSE). | 15-45s |
| 7 | Verification | Le quiz apparait dans la bibliotheque. Clic → WidgetDetailModal. Onglet Apercu : elle joue le quiz elle-meme. Elle repere qu'une question est mal formulee. | 2min |
| 8 | Edition | Onglet Edition : elle corrige la question 7, ajoute une explication. Sauvegarde automatique (debounce 500ms). | 1min |
| 9 | Confirmation | Clic "Confirmer" → Widget(READY). | 1s |
| 10 | Deploiement | Clic "Deployer vers Engage" → le quiz est cree comme Activity dans un projet Engage. Un lien de session est genere. | 5s |
| 11 | En classe | Mme Leroy projette Engage, demarre la session live. Les eleves rejoignent avec le code affiche (smartphone ou PC). | 30s |
| 12 | Quiz live | Chaque question s'affiche sur les ecrans. Timer. Les eleves repondent. Leaderboard en temps reel. Mme Leroy voit la distribution des reponses. | 10min |
| 13 | Resultats | Quiz termine. Score final par eleve. Leaderboard. Mme Leroy voit que 80% ont rate la question 4 → elle sait quoi reexpliquer. | 2min |

**Temps total de preparation** : ~5 minutes (hors indexation du PDF).

**Widgets utilises** : QUIZ

**Ce que Mme Leroy peut demander au chat** :
- "Ajoute 3 questions plus difficiles sur les derivees de fonctions composees"
- "Transforme la question 5 en vrai/faux"
- "Genere un recap en 2 slides sur les points cles des derivees"

---

### 1.B Prof de lycee — "Preparer un cours interactif"

**Contexte** : M. Dupont, prof d'histoire-geo en Premiere, veut un cours de 45 minutes sur la Premiere Guerre mondiale. Il a un PowerPoint de 30 slides qu'il utilise depuis 3 ans. Il veut le rendre interactif.

**Objectif pedagogique** : comprendre et appliquer (Bloom : Comprendre / Analyser)

| Etape | Action | Ce qui se passe | Duree |
|-------|--------|----------------|-------|
| 1 | Nouveau studio | "Histoire 1ere — WW1" | 10s |
| 2 | Upload | Drag & drop du PowerPoint (.pptx). Parsing par Unstructured.io → extraction du contenu texte + images. | 1-3min |
| 3 | Chat | "Transforme ces slides en presentation interactive de 45 minutes. Insere un quiz de 5 questions apres les causes de la guerre, et un wordcloud apres les consequences." | 10s |
| 4 | Generation | Studio genere une PRESENTATION composee : SLIDE (Intro) → SLIDE (Causes) → SLIDE (Detail causes) → QUIZ (5 questions sur les causes) → SLIDE (Deroulement) → SLIDE (Consequences) → WORDCLOUD ("En un mot, quel a ete l'impact le plus marquant de WW1 ?") → SLIDE (Conclusion). | 30s-2min |
| 5 | Preview | M. Dupont navigue dans la presentation. Il voit les slides, joue le quiz, teste le wordcloud. | 3min |
| 6 | Edition | Il modifie le titre de 2 slides, change une question du quiz, reformule le prompt du wordcloud. | 3min |
| 7 | Confirmation | Tous les widgets sont READY. | 1s |
| 8 | Deploiement | Session live dans Engage. | 5s |
| 9 | En classe | Les eleves voient les slides sur leurs ecrans. Quand le quiz arrive, ils repondent. Quand le wordcloud arrive, ils soumettent leurs mots. Le nuage se construit en direct sur le projecteur. | 45min |

**Temps total de preparation** : ~10 minutes.

**Widgets utilises** : PRESENTATION (compose de SLIDE + QUIZ + WORDCLOUD)

**Ce que M. Dupont peut demander ensuite** :
- "Ajoute un post-it apres la conclusion pour recueillir les questions des eleves"
- "Genere un quiz de revision de 10 questions sur l'ensemble du cours"
- "Cree une frise chronologique interactive de 1914 a 1918"

---

### 1.C Responsable pedagogique — "Creer un deroule de formation"

**Contexte** : Dr. Martin, responsable pedagogique d'une licence en sciences de l'education, doit preparer le plan de cours de l'UE "Introduction aux sciences cognitives" (24h, 8 seances de 3h). Elle a le syllabus et 3 articles de reference.

**Objectif pedagogique** : structurer une progression d'apprentissage (Bloom : de Memoriser a Creer sur 8 seances)

| Etape | Action | Ce qui se passe | Duree |
|-------|--------|----------------|-------|
| 1 | Nouveau studio | "Licence SED — Intro Sciences Cognitives" | 10s |
| 2 | Upload des sources | Syllabus PDF + 3 articles. Indexation. | 2-5min |
| 3 | Chat | "Genere un plan de cours de 8 seances de 3h. Progression du simple au complexe. Seance 1 : intro + ice-breaker. Seances 2-6 : theorie + activites. Seance 7 : revision. Seance 8 : evaluation." | 15s |
| 4 | Generation | Studio genere un COURSE_PLAN avec 8 SESSION_PLANs. Chaque seance a un titre, des objectifs, un timing, et des activites suggerees. | 1-2min |
| 5 | Revue | Dr. Martin parcourt les 8 seances. Elle trouve que la seance 3 est trop chargee et la seance 5 pas assez. | 5min |
| 6 | Ajustements chat | "Allege la seance 3 : deplace le concept d'attention selective en seance 4. Ajoute un exercice pratique en seance 5 : un roleplay ou les etudiants jouent un chercheur presentant ses resultats." | 15s |
| 7 | Regeneration | Studio ajuste les 2 seances. Les autres restent intactes. | 30s |
| 8 | Generation des activites | Pour chaque seance, Dr. Martin demande les activites detaillees : "Genere le quiz de la seance 2", "Genere le roleplay de la seance 5". | 5-10min |
| 9 | Export | Plan de cours exporte en PDF pour les intervenants. Chaque intervenant recoit le deroule de sa seance. | 1min |

**Temps total** : ~20-30 minutes pour 24h de formation.

**Widgets utilises** : COURSE_PLAN, SESSION_PLAN, QUIZ, WORDCLOUD, ROLEPLAY, OPENTEXT, POSTIT

**Hierarchie generee** :
```
COURSE_PLAN "Intro Sciences Cognitives" (24h, 8 seances)
├── SESSION_PLAN S1 "Introduction & Ice-breaker" (3h)
│   ├── WORDCLOUD "En un mot, c'est quoi la cognition ?"
│   ├── SLIDE "Presentation du cours"
│   └── QUIZ "Quiz diagnostic — que savez-vous deja ?"
├── SESSION_PLAN S2 "Perception & Attention" (3h)
│   ├── SLIDE "La perception visuelle"
│   ├── QUIZ "Quiz — Illusions et perception"
│   └── OPENTEXT "Decrivez une experience de biais perceptif"
├── SESSION_PLAN S3 "Memoire" (3h)
│   ├── SLIDE "Types de memoire"
│   ├── QUIZ "Quiz — MCT vs MLT"
│   └── POSTIT "Vos techniques de memorisation"
├── SESSION_PLAN S4 "Attention selective" (3h)
│   ├── SLIDE "L'attention selective"
│   ├── MULTIPLE_CHOICE "Gorille invisible — l'avez-vous vu ?"
│   └── RANKING "Classez ces facteurs par impact sur l'attention"
├── SESSION_PLAN S5 "Langage & Communication" (3h)
│   ├── SLIDE "Acquisition du langage"
│   ├── ROLEPLAY "Presentez vos resultats de recherche (5 min)"
│   └── QUIZ "Quiz — Langage et cerveau"
├── SESSION_PLAN S6 "Decision & Raisonnement" (3h)
│   ├── SLIDE "Biais cognitifs"
│   ├── QUIZ "Quiz — Reconnaissez le biais"
│   └── POSTIT "Biais que vous avez observes au quotidien"
├── SESSION_PLAN S7 "Revision" (3h)
│   ├── QUIZ "Mega-quiz de revision (20 questions)"
│   └── RANKING "Les 5 concepts les plus importants du cours"
└── SESSION_PLAN S8 "Evaluation" (3h)
    ├── QUIZ "Evaluation finale (30 questions)"
    └── WORDCLOUD "En un mot, qu'avez-vous retenu ?"
```

---

### 1.D Formateur corporate — "Module d'onboarding"

**Contexte** : Sarah, responsable L&D chez une ETI de 500 personnes, doit creer un module d'onboarding de 2h pour les nouveaux arrivants. Elle a la charte d'entreprise, le reglement interieur, et un document sur la culture d'entreprise.

**Objectif pedagogique** : s'integrer et appliquer les regles de l'entreprise (Bloom : Memoriser / Appliquer)

| Etape | Action | Ce qui se passe | Duree |
|-------|--------|----------------|-------|
| 1 | Nouveau studio | "Onboarding 2025 — Nouveaux arrivants" | 10s |
| 2 | Upload | Charte, reglement interieur, doc culture. | 2-5min |
| 3 | Chat | "Cree un module d'onboarding de 2h. Commence par un ice-breaker, puis la culture d'entreprise (slides + quiz), les regles de securite (quiz obligatoire, score min 80%), et termine par un roleplay : accueillir un client." | 15s |
| 4 | Generation | Studio genere une SEQUENCE composee de : WORDCLOUD (ice-breaker) → PRESENTATION (culture, 10 slides) → QUIZ (culture, 10 questions) → PRESENTATION (securite, 8 slides) → QUIZ (securite, 15 questions, seuil 80%) → ROLEPLAY (accueil client) → OPENTEXT (feedback sur le module). | 1-3min |
| 5 | Revue | Sarah parcourt le module. Elle verifie que les informations de securite sont correctes (critique). Elle ajuste le scenario du roleplay. | 10min |
| 6 | Deploiement | Self-paced via lien public. Chaque nouvel arrivant fait le module a son rythme. | 1min |
| 7 | Suivi | Dashboard resultats : taux de completion, scores par quiz, temps passe. Sarah voit que 3 personnes ont rate le quiz securite → elle les recontacte. | continu |

**Temps total de preparation** : ~20 minutes.

**Widgets utilises** : WORDCLOUD, PRESENTATION (SLIDE), QUIZ (x2), ROLEPLAY, OPENTEXT

**Mode de diffusion** : self-paced (pas de session live). Chaque nouvel arrivant parcourt le module seul, a son rythme. Les resultats sont persistes (WidgetPlayResult).

**Ce que Sarah peut demander ensuite** :
- "Ajoute une section sur le RGPD avec un quiz"
- "Genere un certificat de completion"
- "Cree une version courte (30 min) pour les stagiaires"

---

## 2. Templates de lecons prets a l'emploi

Dix templates concrets, utilisables immediatement. Chaque template est un modele de seance que le chat peut generer d'un seul prompt.

### 2.1 Ice-breaker express

| | |
|---|---|
| **Duree** | 5 minutes |
| **Widgets** | WORDCLOUD + MULTIPLE_CHOICE |
| **Objectif pedagogique** | Briser la glace, prendre la temperature du groupe, creer une dynamique collective |
| **Quand l'utiliser** | Debut de cours, debut de formation, debut de session live |
| **Niveau Bloom** | N/A (social, pas d'objectif cognitif) |

**Deroulement** :
1. WORDCLOUD (2 min) — "Decrivez votre humeur en un mot" ou "Un mot qui vous definit"
2. MULTIPLE_CHOICE (1 min) — "A quel point connaissez-vous le sujet d'aujourd'hui ?" (echelle 1-5, pas de bonne reponse → sondage)
3. Le formateur commente les resultats (2 min)

**Exemples concrets** :

| Matiere | Prompt wordcloud | Question MC |
|---------|-----------------|-------------|
| Maths | "Un mot quand on dit 'mathematiques'" | "Les maths, c'est : Facile / Logique / Abstrait / Utile / Incomprehensible" |
| Anglais | "One word: how do you feel about English?" | "Your English level: Beginner / Intermediate / Advanced / Fluent / Native" |
| Histoire | "Un personnage historique que vous admirez" | "L'histoire, c'est : Des dates / Des recits / De la politique / La comprension du present" |
| Corporate | "Un mot pour decrire votre premiere semaine" | "Votre anciennete : < 1 mois / 1-6 mois / 6-12 mois / > 1 an" |

**Prompt chat** : "Cree un ice-breaker de 5 minutes avec un wordcloud et un sondage pour un cours de [matiere] sur [sujet]."

---

### 2.2 Quiz battle

| | |
|---|---|
| **Duree** | 10 minutes |
| **Widgets** | QUIZ (10-15 questions, timer actif, leaderboard) |
| **Objectif pedagogique** | Verifier les connaissances en mode competitif. Stimuler la memorisation par le jeu. |
| **Quand l'utiliser** | Revision avant controle, fin de chapitre, debut de seance (rappel du cours precedent) |
| **Niveau Bloom** | Memoriser / Comprendre |

**Deroulement** :
1. Le formateur lance le quiz (projete sur l'ecran)
2. Chaque question : 15-30s de reflexion, timer visible
3. Apres chaque question : bonne reponse revelee + explication
4. Leaderboard mis a jour en temps reel
5. Score final : top 3 annonce

**Exemples concrets** :

| Matiere | Sujet | Type de questions |
|---------|-------|-------------------|
| Physique-chimie | Tableau periodique | "Quel est le symbole du Sodium ?", "Combien d'electrons a le carbone ?" |
| SVT | Cellule | "La mitochondrie est...", "Quel organite fait la photosynthese ?" |
| Geographie | Capitales du monde | "Capitale de l'Australie ?", "Ou se trouve le Bhoutan ?" |
| Droit | Code du travail | "Duree legale du travail ?", "Delai de preavis CDI ?" |

**Prompt chat** : "Cree un quiz battle de 15 questions sur [sujet], difficulte [facile/moyen/difficile], avec timer 20 secondes par question et leaderboard."

---

### 2.3 Brainstorm & Vote

| | |
|---|---|
| **Duree** | 15 minutes |
| **Widgets** | POSTIT + RANKING |
| **Objectif pedagogique** | Faire emerger des idees collectives, prioriser, structurer la pensee du groupe |
| **Quand l'utiliser** | Debut de projet, phase de reflexion, recueil des besoins, retrospective |
| **Niveau Bloom** | Analyser / Evaluer |

**Deroulement** :
1. POSTIT (5 min) — Chaque participant ecrit 3-5 post-its en reponse a la question
2. Organisation (3 min) — Le formateur regroupe les post-its par themes (categories)
3. RANKING (5 min) — Les participants classent les themes par priorite
4. Debrief (2 min) — Le formateur presente le classement final

**Exemples concrets** :

| Matiere | Prompt post-it | Items a classer |
|---------|---------------|-----------------|
| SES | "Quelles sont les causes de l'inflation ?" | Les 5 categories emergentes |
| Management | "Quelles competences pour un bon manager ?" | Leadership / Communication / Technique / Empathie / Vision |
| Environnement | "Actions concretes pour le climat" | Les propositions du groupe |

**Prompt chat** : "Cree un brainstorm de 15 minutes avec post-its collectifs puis classement sur le theme [sujet]."

---

### 2.4 Cours interactif

| | |
|---|---|
| **Duree** | 45 minutes |
| **Widgets** | PRESENTATION (SLIDE + QUIZ + WORDCLOUD + OPENTEXT) |
| **Objectif pedagogique** | Transmettre de nouvelles connaissances tout en maintenant l'attention par des interactions regulieres |
| **Quand l'utiliser** | Cours magistral, formation theorique, presentation de nouveaux concepts |
| **Niveau Bloom** | Comprendre / Appliquer |

**Deroulement** :
```
0-5 min   │ WORDCLOUD — Ice-breaker rapide
5-15 min  │ SLIDE (5 slides) — Premiere partie du cours
15-20 min │ QUIZ (5 questions) — Verification de comprehension
20-30 min │ SLIDE (5 slides) — Deuxieme partie du cours
30-35 min │ MULTIPLE_CHOICE — Question de reflexion (sondage, pas de bonne reponse)
35-42 min │ SLIDE (3 slides) — Troisieme partie / conclusion
42-45 min │ OPENTEXT — "Qu'avez-vous retenu ? Une question ?"
```

**Regle d'or** : jamais plus de 10 minutes de slides sans interaction.

**Exemples concrets** :

| Matiere | Sujet | Decoupage |
|---------|-------|-----------|
| Physique | Forces et mouvement | WC "Un mot: la gravite" → Slides Forces → Quiz Newton → Slides Frottement → MC "Quelle force predomine dans votre quotidien ?" → Slides Conclusion → OT Reflexion |
| Economie | Offre et demande | WC "Un mot: le marche" → Slides Offre → Quiz Courbes → Slides Demande → MC "Le prix du pain augmente, pourquoi ?" → Slides Equilibre → OT Question |
| Francais | Le romantisme | WC "Un mot: l'amour" → Slides Contexte historique → Quiz Auteurs → Slides Themes → MC "Hugo ou Lamartine ?" → Slides Heritage → OT Poeme prefere |

**Prompt chat** : "Cree un cours interactif de 45 minutes sur [sujet] a partir de [source]. Insere un quiz toutes les 10 minutes et un wordcloud en ouverture."

---

### 2.5 Revision rapide

| | |
|---|---|
| **Duree** | 10 minutes |
| **Widgets** | QUIZ (10 questions, mode rapide) |
| **Objectif pedagogique** | Reactiver les connaissances acquises. Identifier les lacunes avant un controle. |
| **Quand l'utiliser** | Debut de seance (rappel), veille d'examen, self-paced a la maison |
| **Niveau Bloom** | Memoriser |

**Deroulement** :
1. QUIZ en mode rapide : 10 questions, 15 secondes par question, feedback immediat
2. Score final avec detail par question
3. En mode self-paced : l'eleve peut rejouer autant de fois qu'il veut

**Exemples concrets** :

| Matiere | Sujet | Type de questions |
|---------|-------|-------------------|
| Anglais | Irregular verbs | "Past tense of 'to go' ?", "Past participle of 'to write' ?" |
| Maths | Tables de multiplication | "7 x 8 = ?", "12 x 11 = ?" |
| Chimie | Formules | "Formule de l'eau ?", "pH neutre = ?" |

**Prompt chat** : "Cree un quiz de revision rapide : 10 questions en 10 minutes sur [sujet], timer court, feedback immediat."

---

### 2.6 Debat structure

| | |
|---|---|
| **Duree** | 30 minutes |
| **Widgets** | OPENTEXT + MULTIPLE_CHOICE + POSTIT |
| **Objectif pedagogique** | Developper l'argumentation, l'esprit critique, la capacite a ecouter des points de vue opposes |
| **Quand l'utiliser** | Sujets de societe, dilemmes ethiques, controverses scientifiques |
| **Niveau Bloom** | Analyser / Evaluer |

**Deroulement** :
```
0-2 min   │ MULTIPLE_CHOICE — Sondage initial : "Votre position ?" (Pour / Mitige / Contre)
2-10 min  │ OPENTEXT — "Donnez votre meilleur argument" (chaque participant ecrit)
10-15 min │ Le formateur projette les arguments (anonymises), discussion orale
15-20 min │ POSTIT — "Un contre-argument a ce que vous venez d'entendre"
20-25 min │ Discussion orale a partir des post-its
25-28 min │ MULTIPLE_CHOICE — Re-vote : "Votre position a-t-elle change ?"
28-30 min │ Synthese : comparaison avant/apres, points cles
```

**Exemples concrets** :

| Matiere | Question du debat |
|---------|-------------------|
| Philosophie | "L'intelligence artificielle peut-elle etre consciente ?" |
| SES | "Faut-il un revenu universel ?" |
| SVT/Ethique | "Les OGM sont-ils acceptables ?" |
| Histoire | "La colonisation a-t-elle eu des effets positifs ?" |

**Prompt chat** : "Cree un debat structure de 30 minutes sur [question]. Sondage initial, arguments ecrits, contre-arguments en post-its, re-vote final."

---

### 2.7 Evaluation formative

| | |
|---|---|
| **Duree** | 20 minutes |
| **Widgets** | QUIZ (15-20 questions, feedback detaille) |
| **Objectif pedagogique** | Evaluer la comprehension sans pression de la note. Identifier les lacunes pour adapter le cours suivant. |
| **Quand l'utiliser** | Milieu de sequence, avant un partiel, bilan de competences |
| **Niveau Bloom** | Comprendre / Appliquer / Analyser |

**Deroulement** :
1. QUIZ avec 15-20 questions couvrant l'ensemble du programme
2. Feedback detaille apres chaque question (explication de la bonne reponse)
3. Score final non comptabilise dans la note
4. Le formateur recoit le rapport : questions les mieux reussies / les plus ratees

**Exemples concrets** :

| Matiere | Sujet | Structure |
|---------|-------|-----------|
| Maths | Bilan chapitres 1-4 | 5 questions par chapitre, difficulte croissante |
| Biologie | Genetique | 20 questions : 10 definitions, 5 schemas, 5 cas pratiques |
| Droit | Droit des contrats | 15 questions : conditions de validite, vices, nullite |

**Prompt chat** : "Cree une evaluation formative de 20 questions sur [programme]. Couvre les chapitres 1 a 4. Ajoute une explication apres chaque question. Ne compte pas les points."

---

### 2.8 Decouverte

| | |
|---|---|
| **Duree** | 30 minutes |
| **Widgets** | SLIDE + WORDCLOUD + OPENTEXT + MULTIPLE_CHOICE |
| **Objectif pedagogique** | Introduire un nouveau sujet en partant des representations des apprenants. Susciter la curiosite avant d'apporter les connaissances. |
| **Quand l'utiliser** | Premier cours sur un theme, decouverte d'un domaine, introduction d'un projet |
| **Niveau Bloom** | Memoriser / Comprendre |

**Deroulement** :
```
0-3 min   │ WORDCLOUD — "Qu'est-ce que [sujet] vous evoque ?"
3-5 min   │ Le formateur commente le nuage — fait emerger les representations
5-8 min   │ MULTIPLE_CHOICE — "Selon vous, [affirmation]. Vrai ou faux ?" (3 mythes a debunker)
8-20 min  │ SLIDE (8 slides) — Presentation du vrai contenu, en rebondissant sur les representations
20-25 min │ OPENTEXT — "Qu'est-ce qui vous a le plus surpris ?"
25-30 min │ Discussion orale + synthese
```

**Exemples concrets** :

| Matiere | Sujet | Wordcloud | Mythes a debunker |
|---------|-------|-----------|-------------------|
| Physique | L'espace | "L'espace en un mot" | "Le soleil est une boule de feu" (non, fusion nucleaire) |
| Nutrition | Alimentation | "Manger sain en un mot" | "Les graisses font grossir" (depend du type) |
| Informatique | L'IA | "L'IA en un mot" | "L'IA pense comme nous" (non, statistiques) |

**Prompt chat** : "Cree une seance de decouverte de 30 minutes sur [sujet]. Commence par les representations des eleves (wordcloud), debunke 3 mythes, puis presente les vrais concepts."

---

### 2.9 Jeu de role

| | |
|---|---|
| **Duree** | 45 minutes |
| **Widgets** | SLIDE (briefing) + ROLEPLAY + OPENTEXT (debrief) |
| **Objectif pedagogique** | Mettre en pratique des competences relationnelles, professionnelles ou de communication dans un contexte simule. |
| **Quand l'utiliser** | Soft skills, langues, negociation, management, relation client, entretien d'embauche |
| **Niveau Bloom** | Appliquer / Analyser / Evaluer |

**Deroulement** :
```
0-5 min   │ SLIDE (3 slides) — Briefing : contexte, roles, objectifs
5-10 min  │ Le formateur explique les regles, repond aux questions
10-35 min │ ROLEPLAY — Les participants jouent la scene avec l'IA. L'IA joue le role du client / du patient / du collegue. Feedback IA a la fin.
35-40 min │ OPENTEXT — "Qu'avez-vous appris ? Qu'est-ce qui etait difficile ?"
40-45 min │ Discussion orale — Debrief collectif
```

**Exemples concrets** :

| Matiere | Scenario | Role IA |
|---------|----------|---------|
| Anglais | Entretien d'embauche dans une startup londonienne | Recruteur exigeant |
| Management | Annoncer une mauvaise nouvelle a un collaborateur | Le collaborateur (inquiet, puis en colere) |
| Commercial | Negocier un contrat avec un client hesitant | Le client (objections successives) |
| Medecine | Consultation avec un patient anxieux | Le patient (symptomes vagues, inquietude) |
| Droit | Plaidoirie devant un tribunal | Le juge (questions pointues) |

**Prompt chat** : "Cree un jeu de role de 45 minutes. Scenario : [contexte]. Le participant joue [role]. L'IA joue [role IA]. Avec briefing, roleplay, et debrief ecrit."

---

### 2.10 Aventure collective

| | |
|---|---|
| **Duree** | 30 minutes |
| **Widgets** | SLIDE (narratif) + MULTIPLE_CHOICE (choix) + QUIZ + OPENTEXT |
| **Objectif pedagogique** | Apprendre en vivant une aventure narrative ou les choix du groupe influencent la suite. Ideal pour les sujets ou le contexte et les consequences comptent. |
| **Quand l'utiliser** | Histoire, litterature, ethique, sciences, economie — tout sujet narrativisable |
| **Niveau Bloom** | Comprendre / Analyser / Evaluer |

**Deroulement** :
```
0-3 min   │ SLIDE — Introduction narrative ("Vous etes en 1789...")
3-5 min   │ MULTIPLE_CHOICE — Premier choix collectif (la majorite decide)
5-10 min  │ SLIDE — Consequence du choix + suite du recit
10-12 min │ QUIZ — Verification de comprehension (3 questions)
12-15 min │ SLIDE — Suite narrative
15-17 min │ MULTIPLE_CHOICE — Deuxieme choix
17-22 min │ SLIDE — Consequence + suite
22-25 min │ MULTIPLE_CHOICE — Choix final
25-28 min │ SLIDE — Denouement + "ce qui s'est vraiment passe"
28-30 min │ OPENTEXT — "Auriez-vous fait un choix different ? Pourquoi ?"
```

**Exemples concrets** :

| Matiere | Aventure | Choix proposes |
|---------|----------|---------------|
| Histoire | "Vous etes Louis XVI en 1789" | Convoquer les Etats Generaux / Envoyer l'armee / Fuir |
| Sciences | "Vous dirigez une mission sur Mars" | Atterrir dans le cratere / Sur le plateau / Pres de la glace |
| Economie | "Vous etes ministre de l'economie en crise" | Relance keynesienne / Austerite / Monetisation |
| Litterature | "Vous etes le heros d'un roman de Zola" | Rejoindre la greve / Rester neutre / Denoncer les meneurs |

**Prompt chat** : "Cree une aventure collective de 30 minutes sur [sujet]. 3 choix narratifs, des quiz entre les choix, et un debrief final comparant les choix du groupe avec la realite historique."

---

## 3. Guide de gamification

### 3.1 Elements de gamification disponibles

Qiplim offre des mecaniques de jeu integrees dans les widgets. Voici ce qui est disponible et comment l'utiliser.

| Element | Widget(s) | Description | Impact sur l'engagement |
|---------|-----------|-------------|------------------------|
| **Leaderboard** | QUIZ | Classement temps reel des participants par score | Tres fort — cree une dynamique competitive. Attention : peut stresser les eleves fragiles. |
| **Timer** | QUIZ, MULTIPLE_CHOICE, OPENTEXT, RANKING | Compte a rebours visible | Fort — cree de l'urgence, accelere les reponses. Ne pas en abuser. |
| **Points / Score** | QUIZ, MULTIPLE_CHOICE | Points par bonne reponse, score final | Moyen — feedback quantitatif. Utile en evaluation formative. |
| **Feedback immediat** | QUIZ, MULTIPLE_CHOICE | Bonne/mauvaise reponse revelee immediatement | Fort — l'eleve apprend de ses erreurs en temps reel. |
| **Reactions (emojis)** | Tous (session live) | Les participants envoient des reactions | Faible a moyen — feedback ambiance, pas cognitif. Fun. |
| **Progression** | PRESENTATION, QUIZ | Barre de progression (slide 3/10, question 5/15) | Moyen — donne un sentiment d'avancement, reduit l'anxiete. |
| **Anonymat** | WORDCLOUD, POSTIT, OPENTEXT | Les reponses sont anonymes | Fort — libere la parole, encourage la participation des timides. |
| **Collective** | WORDCLOUD, POSTIT | Le resultat est construit ensemble en temps reel | Fort — sentiment d'appartenance, curiosite pour les reponses des autres. |
| **Votes** | POSTIT | Voter pour les meilleurs post-its | Moyen — priorisation collective, engagement actif. |
| **Feedback IA** | ROLEPLAY | L'IA donne un retour personnalise sur la performance | Fort — feedback individuel, adapte, detaille. Pas possible manuellement a 30 eleves. |

### 3.2 Patterns d'engagement par duree

L'enjeu central : **maintenir l'attention**. La capacite d'attention moyenne d'un adulte est de 10-15 minutes. D'un lyceen : 8-10 minutes. Il faut donc alterner les modalites.

#### 5 minutes — Activation rapide

**Usage** : debut de seance, transition, brise-glace.

```
1 activite unique : WORDCLOUD ou QUIZ (5 questions)
```

**Regles** :
- 1 seul widget, pas de transition
- Consigne simple, immediatement comprehensible
- Pas de scoring complexe (sondage ou quiz court)

#### 15 minutes — Mini-sequence

**Usage** : intro de cours, revision express, feedback.

```
Activite 1 (3 min) — WORDCLOUD ou MULTIPLE_CHOICE (entree en matiere)
Activite 2 (7 min) — QUIZ (verification)
Activite 3 (5 min) — OPENTEXT ou POSTIT (reflexion)
```

**Regles** :
- 2 a 3 activites enchainées
- Alterner collectif (wordcloud) et individuel (quiz)
- Terminer par du qualitatif (pas un quiz)

#### 30 minutes — Mini-parcours

**Usage** : cours autonome, atelier, exploration.

```
Phase 1 — Accroche (5 min)     : WORDCLOUD + discussion
Phase 2 — Contenu (10 min)     : SLIDE (presentation)
Phase 3 — Verification (5 min) : QUIZ
Phase 4 — Reflexion (5 min)    : OPENTEXT ou POSTIT
Phase 5 — Synthese (5 min)     : MULTIPLE_CHOICE (sondage) + discussion
```

**Regles** :
- Interaction toutes les 10 minutes maximum
- Alterner passif (slides) et actif (quiz, postit)
- Finir par une activite ouverte (pas un quiz)

#### 45 minutes — Cours complet

**Usage** : seance de cours standard.

```
Phase 1 — Ice-breaker (5 min)   : WORDCLOUD
Phase 2 — Contenu A (10 min)    : SLIDE
Phase 3 — Check A (5 min)       : QUIZ (5 questions)
Phase 4 — Contenu B (10 min)    : SLIDE
Phase 5 — Check B (5 min)       : MULTIPLE_CHOICE + discussion
Phase 6 — Contenu C (5 min)     : SLIDE (conclusion)
Phase 7 — Synthese (5 min)      : OPENTEXT "Ce que j'ai retenu"
```

**Regles** :
- 3 blocs de contenu, 3 interactions
- Le premier quiz est facile (confiance)
- Le deuxieme est plus ouvert (reflexion)
- Terminer par une trace ecrite individuelle

#### 90 minutes — Formation complete

**Usage** : demi-journee de formation, module e-learning.

```
Bloc 1 — Ouverture (15 min)
  Ice-breaker (WORDCLOUD)
  Attentes (POSTIT)
  Presentation du programme (SLIDE)

-- Pause 5 min --

Bloc 2 — Module 1 (25 min)
  Contenu (SLIDE, 10 slides)
  Quiz verification (QUIZ, 10 questions)
  Discussion (5 min oral)

-- Pause 5 min --

Bloc 3 — Module 2 (25 min)
  Contenu (SLIDE, 10 slides)
  Mise en pratique (ROLEPLAY ou OPENTEXT)
  Debrief (5 min oral)

-- Pause 5 min --

Bloc 4 — Cloture (10 min)
  Quiz final (QUIZ, 15 questions — evaluation)
  Feedback (OPENTEXT "Un mot sur cette formation")
  Resultats et synthese
```

**Regles** :
- Pause toutes les 30 minutes
- Pas plus de 2 quiz dans la session (fatigue)
- Au moins 1 activite ouverte/creative (roleplay, postit, opentext)
- Varier les modalites : ecouter, lire, repondre, ecrire, jouer

### 3.3 Regles d'or de la gamification pedagogique

Ces regles sont issues de la recherche en sciences de l'education et de la pratique terrain.

#### Regle 1 : Maximum 10 minutes sans interaction

Le cerveau decroche apres 10 minutes de reception passive. Toute sequence de slides de plus de 10 minutes doit etre coupee par une interaction, meme minime (MULTIPLE_CHOICE rapide, reaction emoji, question orale).

**Anti-pattern** : 20 slides d'affilee sans aucune activite.
**Pattern correct** : 5 slides → quiz 3 questions → 5 slides → sondage → 5 slides.

#### Regle 2 : Varier les types d'activite

Ne jamais enchainer 3 quiz. Ne jamais enchainer 3 wordclouds. Le cerveau s'habitue et decroche.

**Anti-pattern** : QUIZ → QUIZ → QUIZ
**Pattern correct** : QUIZ → WORDCLOUD → OPENTEXT → QUIZ

**Matrice de variation** :

| Apres... | Enchainer avec... | Eviter |
|----------|-------------------|--------|
| QUIZ | WORDCLOUD, OPENTEXT, SLIDE | QUIZ, MULTIPLE_CHOICE |
| WORDCLOUD | SLIDE, QUIZ, RANKING | WORDCLOUD, POSTIT |
| SLIDE (long) | QUIZ, MULTIPLE_CHOICE | SLIDE (long) |
| OPENTEXT | SLIDE, QUIZ, MULTIPLE_CHOICE | OPENTEXT |
| ROLEPLAY | OPENTEXT (debrief), SLIDE | ROLEPLAY |
| POSTIT | RANKING, SLIDE | POSTIT |

#### Regle 3 : Feedback positif systematique

Meme quand un participant se trompe, le feedback doit etre encourageant. "Pas tout a fait" est mieux que "Faux". L'explication apres chaque question est obligatoire en evaluation formative.

**Dans Studio** : activez `showCorrectAnswer: true` et `showImmediateFeedback: true` dans les quiz. Redigez des `explanation` pour chaque question.

#### Regle 4 : Laisser du temps de reflexion

Le timer est un outil puissant, mais il ne doit pas etre systematique. Pour les questions de reflexion (OPENTEXT, POSTIT), pas de timer. Pour les quiz de revision, un timer court (15-20s) est motivant. Pour les evaluations, un timer genereux (60s+) reduit le stress.

**Recommandations par type** :

| Widget | Timer recommande | Justification |
|--------|-----------------|---------------|
| QUIZ (revision) | 15-20s par question | Rappel rapide, pas de reflexion profonde |
| QUIZ (evaluation) | 45-60s par question | Laisser le temps de raisonner |
| MULTIPLE_CHOICE | 30s | Une seule question, reflexion moderee |
| WORDCLOUD | Pas de timer | Laisser emerger les idees |
| OPENTEXT | Pas de timer (ou 3-5 min) | Ecriture = reflexion, ne pas presser |
| POSTIT | Pas de timer (ou 5 min) | Idem |
| RANKING | 60s | Assez pour classer, pas pour trop reflechir |
| ROLEPLAY | Pas de timer | Conversation naturelle |

#### Regle 5 : Terminer par une synthese collective

Ne jamais finir une seance sur un quiz. Le quiz est un outil d'evaluation, pas de cloture. Terminer par une activite ouverte qui permet aux participants de verbaliser ce qu'ils ont appris.

**Bonnes clotures** :
- WORDCLOUD : "En un mot, qu'avez-vous retenu ?"
- OPENTEXT : "La chose la plus importante que j'ai apprise aujourd'hui"
- MULTIPLE_CHOICE : "Ce cours etait : Utile / Interessant / Difficile / Trop court" (feedback, pas evaluation)

**Mauvaises clotures** :
- QUIZ final sans debrief
- SLIDE de conclusion sans interaction
- Rien (fin brutale)

#### Regle 6 : Adapter la difficulte

Commencer facile, monter progressivement. Un quiz qui commence par une question impossible decourage immediatement. Les 2-3 premieres questions doivent etre accessibles a tous.

**Pattern de difficulte pour un quiz de 10 questions** :
- Questions 1-3 : faciles (tout le monde reussit → confiance)
- Questions 4-7 : moyennes (discrimination)
- Questions 8-10 : difficiles (pour les meilleurs → defi)

**Prompt chat** : "Cree un quiz de 10 questions avec difficulte progressive : 3 faciles, 4 moyennes, 3 difficiles."

#### Regle 7 : L'anonymat libere la parole

Pour les sujets sensibles, les questions ouvertes, ou les groupes timides : privilegier les widgets anonymes (WORDCLOUD, POSTIT, OPENTEXT). Les participants osent plus quand leurs reponses ne sont pas identifiees.

**Quand forcer l'anonymat** :
- Sujets sensibles (ethique, politique, personnel)
- Groupes ou certains dominent la discussion
- Feedback sur le cours (les eleves n'osent pas critiquer le prof)

**Quand le leaderboard est utile** :
- Revision ludique (pas d'enjeu de note)
- Groupes competitifs (classes prepa, ecoles de commerce)
- Challenges inter-equipes

---

## 4. Guide de documentation pedagogique

### 4.1 Ce que les enseignants doivent documenter

Pour chaque seance ou module, l'enseignant devrait pouvoir specifier (et Studio devrait aider a generer) :

#### Objectifs d'apprentissage (Taxonomie de Bloom)

Chaque activite vise un niveau cognitif. Studio aide a verifier l'alignement.

| Niveau Bloom | Verbe | Exemple | Widget adapte |
|--------------|-------|---------|---------------|
| **Memoriser** | Nommer, lister, identifier, definir | "Nommer les 3 lois de Newton" | QUIZ, MULTIPLE_CHOICE |
| **Comprendre** | Expliquer, decrire, resumer, interpreter | "Expliquer la difference entre ADN et ARN" | QUIZ (avec explication), OPENTEXT |
| **Appliquer** | Utiliser, calculer, resoudre, demontrer | "Calculer la derivee de f(x)=3x^2" | QUIZ (calcul), OPENTEXT |
| **Analyser** | Comparer, differencier, categoriser, examiner | "Comparer les regimes totalitaires du XXe siecle" | POSTIT, RANKING, OPENTEXT |
| **Evaluer** | Juger, argumenter, critiquer, justifier | "Argumenter pour ou contre l'energie nucleaire" | OPENTEXT, POSTIT (debat), MULTIPLE_CHOICE (sondage) |
| **Creer** | Concevoir, produire, inventer, composer | "Rediger un dialogue en anglais" | ROLEPLAY, OPENTEXT |

#### Prerequis

Ce que l'apprenant doit savoir avant. Studio peut generer un "quiz prerequis" pour verifier.

**Prompt chat** : "Genere un quiz de 5 questions pour verifier les prerequis de [seance]. Les prerequis sont : [liste]."

#### Duree estimee

Studio calcule la duree en fonction du nombre et du type de widgets :

| Widget | Duree moyenne estimee |
|--------|-----------------------|
| QUIZ (10 questions) | 10 min |
| MULTIPLE_CHOICE | 1-2 min |
| WORDCLOUD | 2-3 min |
| POSTIT (avec vote) | 8-10 min |
| RANKING | 3-5 min |
| OPENTEXT | 3-5 min |
| ROLEPLAY | 15-25 min |
| SLIDE (par slide) | 1-2 min |

#### Materiel necessaire

- **Self-paced** : un appareil connecte (PC, tablette, smartphone)
- **Session live** : un projecteur + les appareils des participants
- **Hybride** : un outil de visio + les appareils

#### Modalite

| Modalite | Compatible Studio | Notes |
|----------|------------------|-------|
| Presentiel | Session live (Engage) | Formateur projette, participants sur leurs appareils |
| Distanciel synchrone | Session live (Engage) + visio | Meme experience, le formateur partage son ecran |
| Distanciel asynchrone | Self-paced (lien public) | Le participant fait le parcours seul, a son rythme |
| Hybride | Session live + lien public | Le formateur anime en live, les distants suivent en self-paced |

### 4.2 Comment Studio aide a documenter

#### Generation automatique du syllabus

A partir des sources et du plan de cours, Studio peut generer un syllabus complet (cf. `pedagogical-structure.md` §2.4).

**Prompt chat** : "Genere le syllabus de ce cours : objectifs, prerequis, contenu, evaluation, bibliographie."

**Output** : un document structure avec les sections standard (objectifs, prerequis, contenu, evaluation, bibliographie) que l'enseignant peut exporter en PDF.

#### Export du deroule pedagogique

Le plan de cours (COURSE_PLAN) et les deroules de seance (SESSION_PLAN) sont exportables en PDF. Chaque intervenant recoit son deroule avec :
- Titre de la seance
- Objectifs
- Timing minute par minute
- Liste des activites avec consignes
- Materiel necessaire

#### Tracking des resultats pour le bilan

Apres une session (live ou self-paced), le formateur a acces a :
- Taux de completion par widget
- Score moyen par quiz
- Distribution des reponses par question
- Temps moyen de reponse

Ces donnees alimentent le bilan pedagogique de fin de formation.

---

## 5. Accessibilite

L'accessibilite est un droit, pas une option. Qiplim vise la conformite WCAG 2.1 niveau AA.

### 5.1 Typographie

| Critere | Implementation | Statut |
|---------|---------------|--------|
| Police lisible | GT Walsheim (sans-serif, haute lisibilite) comme police par defaut | En place |
| Taille minimale | 16px corps de texte, 14px minimum absolu | En place |
| Option dyslexie | Police OpenDyslexic proposee en option dans les parametres utilisateur | A implementer |
| Interligne | 1.5 minimum pour le corps de texte | En place |
| Contraste texte/fond | Ratio 4.5:1 minimum (WCAG AA) | A verifier par widget |

### 5.2 Contraste et couleurs

| Critere | Implementation |
|---------|---------------|
| Contraste WCAG AA | Ratio 4.5:1 pour le texte, 3:1 pour les grands textes et les composants UI |
| Pas de couleur seule | L'information n'est jamais transmise uniquement par la couleur (icones, labels, patterns en complement) |
| Mode sombre | Supporter un mode sombre natif avec contrastes valides |
| Bonne reponse / Mauvaise reponse | Vert + icone check / Rouge + icone croix (pas juste la couleur) |

### 5.3 Navigation clavier

| Critere | Implementation |
|---------|---------------|
| Focus visible | Outline visible sur tous les elements interactifs (minimum 2px) |
| Tab order logique | Ordre de tabulation qui suit la lecture naturelle |
| Raccourcis quiz | Touche 1-4 pour selectionner une option, Entree pour valider |
| Raccourcis navigation | Fleches gauche/droite pour naviguer dans les slides |
| Skip to content | Lien "Aller au contenu" en debut de page |

### 5.4 Lecteur d'ecran

| Critere | Implementation |
|---------|---------------|
| Landmarks ARIA | `role="main"`, `role="navigation"`, `role="region"` sur les zones cles |
| Labels | Tous les boutons et inputs ont un `aria-label` ou `aria-labelledby` |
| Live regions | `aria-live="polite"` sur le leaderboard, le timer, les resultats |
| Alt text | Toutes les images ont un texte alternatif descriptif |
| Annonces | Les changements d'etat (nouvelle question, score, fin du quiz) sont annonces |

### 5.5 Contenu non-textuel

| Critere | Implementation |
|---------|---------------|
| Alt text sur les images | Obligatoire pour toutes les images generees ou uploadees |
| Transcripts | Les contenus audio/video doivent avoir une transcription textuelle |
| Sous-titres | Les videos doivent avoir des sous-titres |
| Descriptions | Les graphiques de resultats ont une description textuelle alternative |

### 5.6 Timer et handicap

Le timer est un element de gamification qui peut devenir un obstacle pour les personnes en situation de handicap (troubles DYS, handicap moteur, deficience visuelle).

| Critere | Implementation |
|---------|---------------|
| Timer extensible | Option "temps supplementaire" dans les parametres de session (x1.33, x1.5, x2) |
| Timer desactivable | Le formateur peut desactiver le timer pour un participant specifique |
| Alerte sonore | Bip a 10 secondes et a 5 secondes avant la fin (configurable) |
| Alerte visuelle | Le timer change de couleur (vert → orange → rouge) ET pulse a 5 secondes |
| Pas de penalite temps | En mode "accessibilite", pas de bonus de vitesse au leaderboard |

**Pour le formateur** : dans les parametres de session Engage, une option "Mode accessibilite" active :
- Timer x1.5 par defaut
- Pas de bonus de vitesse
- Polices plus grandes
- Contraste renforce

### 5.7 Compatibilite des appareils

| Appareil | Support | Notes |
|----------|---------|-------|
| PC / Mac (Chrome, Firefox, Safari, Edge) | Complet | Experience optimale |
| Tablette (iPad, Android) | Complet | Interface responsive |
| Smartphone | Complet | Interface responsive, interactions tactiles |
| Lecteur d'ecran (NVDA, JAWS, VoiceOver) | A valider | Tests a realiser sur chaque type de widget |

---

## 6. Annexe — Widgets disponibles

Reference rapide des widgets utilisables dans les templates ci-dessus.

### Widgets en production (Engage + Studio)

| Widget | Description | Interactif | Scoring | Live | Self-paced |
|--------|-------------|-----------|---------|------|------------|
| **QUIZ** | Quiz multi-questions avec timer et leaderboard | Oui | Points + leaderboard | Oui | Oui |
| **MULTIPLE_CHOICE** | Question unique a choix (QCM ou sondage) | Oui | Optionnel | Oui | Oui |
| **WORDCLOUD** | Nuage de mots collectif | Oui | Non | Oui | Oui |
| **POSTIT** | Brainstorming post-it avec categories et votes | Oui | Votes | Oui | Oui |
| **RANKING** | Classement d'items par priorite (drag & drop) | Oui | Rang moyen | Oui | Oui |
| **OPENTEXT** | Reponse texte libre a une question ouverte | Oui | Non | Oui | Oui |
| **ROLEPLAY** | Jeu de role conversationnel avec personnage IA | Oui | Feedback IA | Oui | Oui |

### Widgets Studio uniquement

| Widget | Description | Interactif | Notes |
|--------|-------------|-----------|-------|
| **SLIDE** | Slide de presentation (titre, texte, image) | Non | Contenu statique dans une presentation |
| **PRESENTATION** | Conteneur compose de slides et d'activites | Non | Orchestration sequentielle |
| **IMAGE** | Image generee par IA (DALL-E / Gemini) | Non | Illustration pour slides ou standalone |
| **SEQUENCE** | Conteneur ordonne de widgets | Non | Enchainement lineaire |
| **COURSE_MODULE** | Conteneur avec slots (intro, contenu, evaluation) | Non | Structure modulaire |

### Widgets planifies (pas encore dans le code)

TRUE_FALSE, FILL_BLANKS, MATCHING, POLL, RATING, FLASHCARD, CATEGORIZE, FAQ, TIMELINE, SUMMARY, GLOSSARY, MINDMAP, ADVENTURE, SIMULATION

Pour le catalogue complet avec les schemas JSON : voir `widget-catalog.md`.
Pour la structure pedagogique et l'API generative : voir `pedagogical-structure.md`.
Pour le cycle de vie creation/lecture : voir `lifecycle.md`.

# Qiplim — Widget Catalog

Catalogue exhaustif de tous les types de widgets supportes et proposes. Chaque fiche contient le schema, les etats, les contraintes et un exemple JSON. Ce document est la reference pour les developpeurs, les LLMs, et la documentation publique.

Sources d'inspiration : Engage (7 activities en prod), Studio (12 types), NotebookLM (13 outputs), H5P (60+ types), Mentimeter, Kahoot, AhaSlides, Slido, Nearpod.

---

## Legende

| Icone | Signification |
|-------|---------------|
| PROD | En production (Engage ou Studio) |
| READY | Code existe, a tester/deployer |
| PLANNED | Specifie, a implementer |
| IDEA | A valider, priorite basse |

---

## 1. Widgets interactifs (session live + self-paced)

### 1.1 QUIZ — Quiz multi-questions PROD

Quiz avec plusieurs questions sequentielles, scoring, leaderboard.

**Category** : interactive
**Engage** : oui (activity)
**Internal states** : per-question PENDING → LIVE → CLOSED → REVEALED

```json
{
  "type": "QUIZ",
  "data": {
    "questions": [
      {
        "id": "q1",
        "question": "Quelle est la capitale de la France ?",
        "type": "single",
        "options": [
          { "id": "o1", "label": "Paris", "isCorrect": true },
          { "id": "o2", "label": "Lyon", "isCorrect": false },
          { "id": "o3", "label": "Marseille", "isCorrect": false }
        ],
        "points": 1,
        "difficulty": "easy",
        "explanation": "Paris est la capitale depuis le Xe siecle."
      }
    ],
    "showCorrectAnswer": true,
    "showImmediateFeedback": true,
    "showStatistics": false,
    "showLeaderboard": true
  }
}
```

**Scoring** : points par question, bonus temps optionnel, leaderboard temps reel
**Contraintes** : min 1 question, min 2 options par question, exactement 1+ isCorrect pour type single
**Generation hint** : le LLM doit generer des distracteurs plausibles, pas des options absurdes

---

### 1.2 MULTIPLE_CHOICE — Question unique a choix PROD

Une seule question avec options. Plus simple que le quiz, pas de navigation entre questions.

**Category** : interactive
**Engage** : oui (activity)
**Internal states** : COLLECTING → ENDED

```json
{
  "type": "MULTIPLE_CHOICE",
  "data": {
    "question": "Quel secteur devrait etre la priorite climatique ?",
    "options": [
      { "id": "a", "label": "Transport", "isCorrect": false },
      { "id": "b", "label": "Industrie", "isCorrect": false },
      { "id": "c", "label": "Energie", "isCorrect": true },
      { "id": "d", "label": "Agriculture", "isCorrect": false }
    ],
    "allowMultiple": false,
    "showCorrectAnswer": true,
    "explanation": "Le secteur energetique represente 40% des emissions."
  }
}
```

**Scoring** : optionnel (avec isCorrect) ou sondage (sans isCorrect)
**Contraintes** : min 2 options, max 8 options
**Variante sondage** : sans `isCorrect` → affiche la distribution des votes, pas de bonne reponse

---

### 1.3 WORDCLOUD — Nuage de mots collectif PROD

Les participants soumettent des mots, le nuage se construit en temps reel.

**Category** : interactive
**Engage** : oui (activity)
**Internal states** : COLLECTING → ENDED

```json
{
  "type": "WORDCLOUD",
  "data": {
    "prompt": "Decrivez votre humeur en un mot",
    "maxWords": 3,
    "minWordLength": 2,
    "maxWordLength": 30
  }
}
```

**Scoring** : aucun
**Contraintes** : max 3 mots par participant par defaut
**Generation hint** : le prompt doit etre une question ouverte qui appelle des reponses courtes (1-3 mots)

---

### 1.4 POSTIT — Brainstorming post-it collectif PROD

Les participants creent des post-its, les organisent en categories, votent.

**Category** : interactive
**Engage** : oui (activity)
**Internal states** : COLLECTING → ORGANIZING → VOTING → RESULTS

```json
{
  "type": "POSTIT",
  "data": {
    "prompt": "Quelles sont vos attentes pour cette session ?",
    "categories": ["Formation", "Networking", "Inspiration"],
    "maxPostIts": 5,
    "allowVoting": true,
    "allowPhotoCapture": false
  }
}
```

**Scoring** : votes par post-it
**Contraintes** : max 5 post-its par participant par defaut

---

### 1.5 RANKING — Classement par priorite PROD

Les participants classent des items par ordre de priorite via drag & drop.

**Category** : interactive
**Engage** : oui (activity)
**Internal states** : COLLECTING → ENDED

```json
{
  "type": "RANKING",
  "data": {
    "prompt": "Classez ces competences par importance",
    "items": [
      { "id": "r1", "label": "Communication", "description": "Savoir transmettre ses idees" },
      { "id": "r2", "label": "Leadership", "description": "Guider une equipe" },
      { "id": "r3", "label": "Technique", "description": "Maitrise des outils" },
      { "id": "r4", "label": "Creativite", "description": "Penser differemment" }
    ],
    "timeLimit": 60
  }
}
```

**Scoring** : rang moyen par item, ecart-type
**Contraintes** : min 2 items, max 12 items

---

### 1.6 OPENTEXT — Reponse texte libre PROD

Les participants ecrivent une reponse longue a une question ouverte.

**Category** : interactive
**Engage** : oui (activity)
**Internal states** : COLLECTING → ENDED

```json
{
  "type": "OPENTEXT",
  "data": {
    "prompt": "Decrivez un defi professionnel que vous avez surmonte",
    "placeholder": "Racontez votre experience...",
    "minLength": 20,
    "maxLength": 500,
    "timeLimit": 180
  }
}
```

**Scoring** : aucun (qualitatif)
**Generation hint** : le prompt doit inviter a la reflexion, pas a une reponse factuelle courte

---

### 1.7 ROLEPLAY — Jeu de role avec IA PROD

Scenario conversationnel ou le participant joue un role et interagit avec un personnage IA.

**Category** : interactive
**Engage** : oui (activity)
**Internal states** : BRIEFING → CONVERSATION → DEBRIEFING

```json
{
  "type": "ROLEPLAY",
  "data": {
    "scenario": "Vous etes un manager qui doit annoncer une restructuration a votre equipe.",
    "context": "L'entreprise a perdu 30% de son chiffre d'affaires. 3 postes seront supprimes.",
    "roles": [
      {
        "id": "manager",
        "name": "Directeur des operations",
        "description": "Vous devez annoncer la nouvelle avec empathie tout en restant ferme.",
        "personality": "Calme, professionnel, empathique",
        "objectives": ["Annoncer la restructuration", "Repondre aux questions", "Maintenir la cohesion"]
      }
    ],
    "assignmentMethod": "random",
    "debriefingEnabled": true
  }
}
```

**Scoring** : feedback IA sur la performance (optionnel)
**Generation hint** : le scenario doit etre realiste et avoir des enjeux clairs

---

### 1.8 TRUE_FALSE — Vrai ou Faux PLANNED

Question binaire simple. Plus rapide qu'un QCM.

**Category** : interactive
**Engage** : a ajouter
**Internal states** : COLLECTING → ENDED → REVEALED

```json
{
  "type": "TRUE_FALSE",
  "data": {
    "statement": "La Grande Muraille de Chine est visible depuis l'espace.",
    "correctAnswer": false,
    "explanation": "C'est un mythe. La muraille est trop etroite pour etre visible a l'oeil nu depuis l'orbite."
  }
}
```

**Scoring** : 1 point si correct
**Generation hint** : privilegier les idees recues et mythes pour maximiser l'engagement

---

### 1.9 FILL_BLANKS — Texte a trous PLANNED

Un texte avec des trous que le participant doit completer.

**Category** : interactive
**Engage** : a ajouter
**Internal states** : COLLECTING → ENDED → REVEALED

```json
{
  "type": "FILL_BLANKS",
  "data": {
    "text": "La photosynthese transforme le {{blank1}} et l'{{blank2}} en glucose grace a la {{blank3}}.",
    "blanks": [
      { "id": "blank1", "answer": "CO2", "alternatives": ["dioxyde de carbone", "gaz carbonique"] },
      { "id": "blank2", "answer": "eau", "alternatives": ["H2O"] },
      { "id": "blank3", "answer": "lumiere", "alternatives": ["lumiere solaire", "energie lumineuse"] }
    ],
    "showHints": false
  }
}
```

**Scoring** : points par trou correct (match exact ou alternatives)
**Generation hint** : les mots cles a retirer doivent etre les concepts importants, pas les mots de liaison

---

### 1.10 MATCHING — Association de paires PLANNED

Associer des elements de deux colonnes (termes ↔ definitions, images ↔ labels).

**Category** : interactive
**Engage** : a ajouter
**Internal states** : COLLECTING → ENDED → REVEALED

```json
{
  "type": "MATCHING",
  "data": {
    "prompt": "Associez chaque pays a sa capitale",
    "pairs": [
      { "id": "p1", "left": "France", "right": "Paris" },
      { "id": "p2", "left": "Allemagne", "right": "Berlin" },
      { "id": "p3", "left": "Italie", "right": "Rome" },
      { "id": "p4", "left": "Espagne", "right": "Madrid" }
    ],
    "shuffleSides": true
  }
}
```

**Scoring** : points par paire correcte
**Contraintes** : min 3 paires, max 10

---

### 1.11 POLL — Sondage rapide PLANNED

Vote rapide sur une question, sans bonne reponse. Resultats en temps reel.

**Category** : interactive
**Engage** : a ajouter (sous-type de MULTIPLE_CHOICE sans isCorrect)

```json
{
  "type": "POLL",
  "data": {
    "question": "Preferez-vous le travail en presentiel ou en remote ?",
    "options": [
      { "id": "a", "label": "Presentiel" },
      { "id": "b", "label": "Remote" },
      { "id": "c", "label": "Hybride" }
    ],
    "allowMultiple": false,
    "showResultsLive": true
  }
}
```

**Scoring** : aucun (c'est un sondage)
**Note** : Techniquement un MULTIPLE_CHOICE sans isCorrect. Type separe pour la clarte semantique et la generation LLM.

---

### 1.12 RATING — Echelle de satisfaction PLANNED

Reponse sur une echelle (1-5 etoiles, NPS, Likert).

**Category** : interactive
**Engage** : a ajouter

```json
{
  "type": "RATING",
  "data": {
    "question": "Comment evaluez-vous cette formation ?",
    "scale": { "min": 1, "max": 5, "labels": { "1": "Mauvais", "3": "Moyen", "5": "Excellent" } },
    "showAverage": true
  }
}
```

**Scoring** : moyenne, distribution

---

### 1.13 QA — Questions-Reponses avec upvote PLANNED

Les participants posent des questions, votent pour les plus pertinentes. Le presenter repond.

**Category** : interactive
**Engage** : a ajouter
**Internal states** : COLLECTING (questions + votes) → ANSWERING → ENDED

```json
{
  "type": "QA",
  "data": {
    "prompt": "Posez vos questions sur la presentation",
    "allowAnonymous": true,
    "allowUpvote": true,
    "moderated": false
  }
}
```

---

### 1.14 CATEGORIZE — Trier dans des categories PLANNED

Les participants trient des items dans des categories (drag & drop).

**Category** : interactive

```json
{
  "type": "CATEGORIZE",
  "data": {
    "prompt": "Classez ces animaux par type",
    "categories": [
      { "id": "c1", "label": "Mammiferes" },
      { "id": "c2", "label": "Reptiles" },
      { "id": "c3", "label": "Oiseaux" }
    ],
    "items": [
      { "id": "i1", "label": "Chat", "correctCategory": "c1" },
      { "id": "i2", "label": "Serpent", "correctCategory": "c2" },
      { "id": "i3", "label": "Aigle", "correctCategory": "c3" },
      { "id": "i4", "label": "Chien", "correctCategory": "c1" }
    ]
  }
}
```

**Scoring** : points par item correctement classe

---

### 1.15 SPINNER — Roue aleatoire PLANNED

Roue qui tourne pour selectionner aleatoirement un participant, un sujet, une question.

**Category** : interactive (engagement)

```json
{
  "type": "SPINNER",
  "data": {
    "segments": [
      { "id": "s1", "label": "Question surprise", "color": "#FF6B6B" },
      { "id": "s2", "label": "Defi", "color": "#4ECDC4" },
      { "id": "s3", "label": "Anecdote", "color": "#45B7D1" },
      { "id": "s4", "label": "Bonus", "color": "#96CEB4" }
    ],
    "mode": "random"
  }
}
```

---

## 2. Widgets statiques (contenu)

### 2.1 SLIDE — Slide native Qiplim PROD

Slide en markdown/JSON rendue par le player Qiplim. Support du texte riche, images, layouts. C'est l'unite de base des presentations Qiplim.

**Category** : static

```json
{
  "type": "SLIDE",
  "data": {
    "title": "Les 3 piliers du developpement durable",
    "content": "## Economique\nCroissance responsable...\n\n## Social\nEquite et inclusion...\n\n## Environnemental\nPreservation des ressources...",
    "image": "https://storage.../illustration.png",
    "layout": "text-left",
    "notes": "Insister sur l'interdependance des 3 piliers"
  }
}
```

**Layouts** : `text-only`, `text-left` (image a droite), `text-right`, `image-full`, `two-columns`, `title-only`, `blank`
**Notes** : notes presenter (visibles uniquement par le presenter en session live)
**Embeds** : une slide est une surface libre qui peut integrer :
- N'importe quelle **source** : image importee, video YouTube, PDF, iframe, audio
- N'importe quel **widget** : un quiz inline, un poll, un wordcloud, une image generee, etc.

C'est le conteneur universel — la brique de base des presentations. Tous les autres widgets sont purement generatifs, mais une slide peut les composer visuellement.

---

### 2.2 SLIDE_DECK_EXPORT — Slide deck exporte (PPTX/PDF) PLANNED

Presentation generee comme fichier PPTX ou PDF via un provider externe (Gemini, Anthropic, ou template engine). Non interactive — fichier downloadable.

**Category** : static (fichier)

```json
{
  "type": "SLIDE_DECK_EXPORT",
  "data": {
    "title": "Formation RGPD — Module 1",
    "format": "pptx",
    "provider": "gemini",
    "slideCount": 15,
    "theme": "professional-blue",
    "fileUrl": "https://storage.../presentation.pptx",
    "slides": [
      { "title": "Introduction", "content": "...", "speakerNotes": "..." },
      { "title": "Les 6 principes", "content": "...", "speakerNotes": "..." }
    ]
  }
}
```

**Formats** : `pptx`, `pdf`, `google-slides` (lien)
**Providers** : `gemini` (Gemini 2.0 flash avec generation de slides), `anthropic` (generation de contenu + template PPTX), `template` (moteur de template Qiplim → PPTX via pptxgenjs ou python-pptx)
**Generation** : Document → LLM structure en slides → provider genere le fichier → upload S3
**Export** : lien de telechargement direct. Pas de rendu interactif.

---

### 2.3 AUDIO — Resume audio / Podcast READY

Audio genere par TTS a partir des sources. Deux styles : resume audio (monologue) ou podcast (dialogue deux voix).

**Category** : static

**Settings modal** :

| Setting | Options | Default |
|---------|---------|---------|
| Style | `resume` (monologue), `podcast` (dialogue 2 voix) | resume |
| Voix | Liste de voix selon provider (genre, langue, ton) | auto |
| Duree cible | `court` (~3min), `standard` (~10min), `long` (~20min) | standard |
| Langue | Detectee depuis les sources ou selectionnee | fr |
| Instructions | Texte libre pour personnaliser le ton, le focus | — |

**Schema** :
```json
{
  "type": "AUDIO",
  "data": {
    "title": "Resume du chapitre 3",
    "style": "podcast",
    "script": "Bienvenue dans ce resume audio. Aujourd'hui nous allons parler de...",
    "speakers": [
      { "id": "host", "name": "Hote", "voice": "fr-female-1" },
      { "id": "expert", "name": "Expert", "voice": "fr-male-1" }
    ],
    "audioUrl": "https://storage.../podcast.mp3",
    "duration": 600,
    "transcript": [
      { "start": 0, "end": 5, "speaker": "host", "text": "Bienvenue dans ce resume audio." },
      { "start": 5, "end": 12, "speaker": "expert", "text": "Aujourd'hui nous allons parler de..." }
    ]
  }
}
```

**Pipeline de generation** :
1. Sources → RAG retrieval des points cles
2. LLM ecrit le script (monologue ou dialogue selon style)
3. TTS par speaker → fichiers audio individuels
4. Concatenation / mixage → fichier final
5. Upload S3 → audioUrl

**Providers TTS** (BYOK — l'utilisateur choisit) :

| Provider | API | Voix | Multi-speaker | Qualite |
|----------|-----|------|--------------|---------|
| ElevenLabs | REST API | 100+ voix, clonage | Oui | Excellent |
| Voxtral (Mistral) | REST API | Voix FR natives | Oui | Bon |
| Google Cloud TTS | gRPC/REST | 400+ voix, SSML | Oui | Bon |
| OpenAI TTS | REST API | 6 voix | Non (1 seule) | Bon |

---

### 2.3 IMAGE — Image generee PROD

Image generee par IA (DALL-E, Gemini, Flux).

**Category** : static

```json
{
  "type": "IMAGE",
  "data": {
    "prompt": "Illustration minimaliste d'une foret tropicale",
    "imageUrl": "https://storage.../generated.png",
    "style": "illustration",
    "aspectRatio": "16:9",
    "alt": "Foret tropicale dense avec rayons de lumiere",
    "caption": "La deforestation menace 80% de la biodiversite terrestre"
  }
}
```

---

### 2.4 VIDEO — Video generee PLANNED

Video generee par IA a partir des documents source. Le contenu video existant (YouTube, etc.) est gere comme une **source**, pas comme un widget.

**Category** : static

**Settings modal** (inspire de NotebookLM "Resume video") :

| Setting | Options | Default |
|---------|---------|---------|
| Format | `explicative` (presentation structuree et complete), `briefing` (apercu condense des idees principales) | explicative |
| Langue | `francais`, `english`, ... | detectee des sources |
| Style visuel | `automatique`, `personnalise`, `classique`, `tableau-blanc`, `kawaii`, `anime` | automatique |
| Voix | Liste de voix TTS (genre, langue, ton) | auto |
| Provider | `auto` (choisit selon le style), ou selection manuelle | auto |
| Instructions | Texte libre pour preciser le contenu visuel | — |

```json
{
  "type": "VIDEO",
  "data": {
    "title": "Explication visuelle de la photosynthese",
    "provider": "veo",
    "prompt": "Animation pedagogique expliquant le processus de photosynthese, style flat design, 60 secondes",
    "script": "La photosynthese est le processus par lequel les plantes convertissent la lumiere en energie...",
    "voice": "fr-female-1",
    "style": "animation",
    "duration": 60,
    "videoUrl": "https://storage.../generated-video.mp4",
    "poster": "https://storage.../thumb.jpg",
    "transcript": [
      { "start": 0, "end": 5, "text": "La photosynthese est le processus..." },
      { "start": 5, "end": 12, "text": "par lequel les plantes convertissent..." }
    ]
  }
}
```

**Providers** :

| Provider | API | Type de video | Duree max |
|----------|-----|--------------|-----------|
| `veo` | Google Veo / Gemini | Video realiste ou animation | ~60s |
| `sora` | OpenAI Sora | Video realiste | ~60s |
| `runway` | Runway Gen-3 | Video creative/artistique | ~10s |
| `heygen` | HeyGen | Avatar parlant (presenter virtuel) | ~5min |
| `synthesia` | Synthesia | Avatar parlant (formation) | ~10min |
| `pika` | Pika Labs | Clips courts creatifs | ~4s |
| `luma` | Luma Dream Machine | Video 3D/creative | ~5s |

**Pipeline de generation** :
1. Document → LLM ecrit un script video (narration + descriptions visuelles)
2. Script → TTS pour la voix off (Voxtral, ElevenLabs)
3. Descriptions → API video pour les visuels (Veo, Sora, Runway)
4. Assemblage voix + video (ou avatar parlant via HeyGen/Synthesia)
5. Upload S3 → videoUrl

**Use cases** :
- **Explainer video** : document technique → animation pedagogique (Veo/Sora)
- **Avatar presenter** : slides → avatar qui presente (HeyGen/Synthesia)
- **Recap video** : resume de session → video courte (Veo + TTS)
- **Teaser** : presentation → clip teaser 30s (Runway/Pika)

**Generation hint** : le LLM doit decomposer le script en scenes courtes (~5-10s chacune) avec description visuelle precise pour chaque scene. La qualite du prompt visuel determine la qualite de la video.

---

### 2.5 FLASHCARD — Fiches d'apprentissage PLANNED

Cartes recto-verso pour reviser. Auto-evaluation (je savais / je ne savais pas).

**Category** : static (self-paced) avec self-scoring

**Settings modal** (inspire de NotebookLM) :

| Setting | Options | Default |
|---------|---------|---------|
| Nombre de cartes | `moins` (~5), `standard` (~15, par defaut), `plus` (~30) | standard |
| Niveau de difficulte | `facile`, `moyen` (par defaut), `difficile` | moyen |
| Theme / instructions | Texte libre : "Se concentrer sur le vocabulaire anglais", "Limiter aux dates cles" | — |

**Schema** :
```json
{
  "type": "FLASHCARD",
  "data": {
    "title": "Vocabulaire Big Data",
    "cardCount": "standard",
    "difficulty": "moyen",
    "cards": [
      { "id": "f1", "front": "Data Lake", "back": "Stockage centralise de donnees brutes a grande echelle, structurees ou non." },
      { "id": "f2", "front": "MapReduce", "back": "Modele de programmation pour le traitement distribue de gros volumes de donnees." },
      { "id": "f3", "front": "ETL", "back": "Extract, Transform, Load — pipeline d'integration de donnees." }
    ],
    "shuffleOnStart": true,
    "showProgress": true,
    "enableSelfScoring": true
  }
}
```

**Pipeline** : Sources → RAG → LLM extrait les concepts cles → genere front/back par carte → validation
**Self-scoring** : le participant retourne la carte et indique "Je savais" / "Je ne savais pas" → stats de revision (% maitrise)
**Generation hint** : le front doit etre court (1-5 mots), le back doit etre une definition concise. Ideal pour vocabulaire, definitions, dates, formules.

---

### 2.6 FAQ — Questions frequentes PLANNED

Liste de questions-reponses structuree, generee depuis les sources.

**Category** : static

```json
{
  "type": "FAQ",
  "data": {
    "title": "FAQ — Reglement interieur",
    "items": [
      { "id": "faq1", "question": "Quels sont les horaires d'ouverture ?", "answer": "Du lundi au vendredi, de 8h a 18h." },
      { "id": "faq2", "question": "Comment demander un conge ?", "answer": "Via le portail RH, au moins 2 semaines a l'avance." },
      { "id": "faq3", "question": "Quel est le dress code ?", "answer": "Business casual. Pas de tenues de sport." }
    ]
  }
}
```

**Generation hint** : le LLM extrait les questions implicites du document et y repond

---

### 2.7 TIMELINE — Frise chronologique PLANNED

Evenements ordonnes sur un axe temporel.

**Category** : static

```json
{
  "type": "TIMELINE",
  "data": {
    "title": "Histoire de l'intelligence artificielle",
    "events": [
      { "id": "t1", "date": "1950", "title": "Test de Turing", "description": "Alan Turing propose un test pour evaluer l'intelligence d'une machine." },
      { "id": "t2", "date": "1956", "title": "Conference de Dartmouth", "description": "Le terme 'intelligence artificielle' est invente." },
      { "id": "t3", "date": "1997", "title": "Deep Blue bat Kasparov", "description": "Un ordinateur bat le champion du monde d'echecs." },
      { "id": "t4", "date": "2022", "title": "ChatGPT", "description": "OpenAI lance ChatGPT, l'IA generative devient grand public." }
    ]
  }
}
```

---

### 2.8 SUMMARY — Resume structure PLANNED

Resume des points cles d'un document, avec sections et bullet points.

**Category** : static

```json
{
  "type": "SUMMARY",
  "data": {
    "title": "Resume — Chapitre 3 : Les energies renouvelables",
    "sections": [
      {
        "heading": "Points cles",
        "bullets": [
          "L'eolien represente 7% de la production electrique mondiale",
          "Le solaire a vu ses couts baisser de 90% en 10 ans",
          "L'hydroelectricite reste la premiere source renouvelable"
        ]
      },
      {
        "heading": "Chiffres importants",
        "bullets": [
          "Objectif UE : 42.5% de renouvelables en 2030",
          "Investissements mondiaux : 500 milliards USD/an"
        ]
      }
    ],
    "sourceDocuments": ["chapitre-3.pdf"]
  }
}
```

---

### 2.9 GLOSSARY — Glossaire de termes PLANNED

Liste de termes et definitions extraits d'un document.

**Category** : static

```json
{
  "type": "GLOSSARY",
  "data": {
    "title": "Glossaire — Finance d'entreprise",
    "terms": [
      { "id": "g1", "term": "EBITDA", "definition": "Earnings Before Interest, Taxes, Depreciation and Amortization — benefice avant interets, impots et amortissements." },
      { "id": "g2", "term": "ROI", "definition": "Return on Investment — ratio de rentabilite d'un investissement." },
      { "id": "g3", "term": "Cash flow", "definition": "Flux de tresorerie — entrees et sorties d'argent sur une periode." }
    ],
    "sortAlphabetically": true
  }
}
```

---

### 2.10 MINDMAP — Carte mentale PLANNED

Representation visuelle hierarchique de concepts et leurs relations. Rendu interactif (zoom, pan, expand/collapse).

**Category** : static
**Lib de rendu** : **React Flow** (reactflow.dev) + layout automatique (dagre ou elkjs)

**Settings modal** :

| Setting | Options | Default |
|---------|---------|---------|
| Profondeur | `2 niveaux`, `3 niveaux` (par defaut), `4 niveaux` | 3 |
| Style | `standard`, `organigramme`, `radial` | standard |
| Instructions | Texte libre : "Se concentrer sur les causes economiques" | — |

**Schema** :
```json
{
  "type": "MINDMAP",
  "data": {
    "title": "Les causes du changement climatique",
    "depth": 3,
    "style": "standard",
    "root": {
      "id": "root",
      "label": "Changement climatique",
      "children": [
        {
          "id": "n1",
          "label": "Emissions CO2",
          "children": [
            { "id": "n1a", "label": "Transport (29%)" },
            { "id": "n1b", "label": "Industrie (21%)" },
            { "id": "n1c", "label": "Batiment (18%)" }
          ]
        },
        {
          "id": "n2",
          "label": "Deforestation",
          "children": [
            { "id": "n2a", "label": "Agriculture" },
            { "id": "n2b", "label": "Urbanisation" }
          ]
        }
      ]
    }
  }
}
```

**Pipeline** : Sources → RAG → LLM extrait la hierarchie de concepts → genere l'arbre JSON → React Flow rend le graphe
**Rendu** : React Flow avec layout dagre automatique. Chaque noeud est un composant React (titre + description optionnelle). Zoom, pan, expand/collapse des branches. Export possible en SVG/PNG.
**Deps** : `@xyflow/react` (React Flow v12), `dagre` (layout algorithm)

---

### 2.11 INFOGRAPHIC — Infographie PLANNED

Image infographique generee par IA a partir des sources. Le LLM construit le brief, un modele image genere le visuel.

**Category** : static (image generee)
**Provider** : Gemini (deja utilise dans Engage pour la generation d'images)

**Settings modal** (inspire de NotebookLM) :

| Setting | Options | Default |
|---------|---------|---------|
| Langue | `francais`, `english`, ... | detectee des sources |
| Orientation | `paysage`, `portrait`, `carre` | paysage |
| Style visuel | `automatique`, `croquis`, `kawaii`, `professionnel`, `scientifique`, `anime` | automatique |
| Niveau de detail | `concis`, `standard` (par defaut), `detaille` (beta) | standard |
| Description | Texte libre : "Theme bleu, mettre en avant les 3 statistiques cles" | — |

**Schema** :
```json
{
  "type": "INFOGRAPHIC",
  "data": {
    "title": "L'eau dans le monde — Chiffres cles",
    "language": "fr",
    "orientation": "paysage",
    "style": "professionnel",
    "detailLevel": "standard",
    "description": "Theme bleu, mettre en avant les statistiques d'acces a l'eau",
    "briefContent": "Points cles extraits:\n- 2.2 milliards de personnes sans acces...\n- Agriculture = 70% de la consommation...",
    "imageUrl": "https://storage.../infographic.png",
    "imageWidth": 1920,
    "imageHeight": 1080
  }
}
```

**Pipeline** :
1. Sources → RAG → LLM extrait les chiffres cles, faits saillants, hierarchie
2. LLM construit un brief visuel detaille (structure, donnees, textes a afficher)
3. Prompt de generation image = brief + style + orientation + description utilisateur
4. Appel Gemini Image Generation (ou DALL-E 3) avec le prompt
5. Upload S3 → imageUrl

**Note** : l'infographie est une **image** (non-editable inline). Pour des donnees interactives, utiliser `DATA_TABLE` ou des composants chart.

---

### 2.12 REPORT — Rapport / Document structure PLANNED

Document long genere a partir des sources. Plusieurs formats possibles.

**Category** : static

**Settings modal** (inspire de NotebookLM) :

| Setting | Options | Default |
|---------|---------|---------|
| Format | `custom` (creer le votre), `synthesis` (document de synthese), `study-guide` (guide d'etude), `blog-article` (article de blog) | synthesis |
| Instructions | Texte libre pour preciser la structure, le style, le ton | — |
| Langue | Detectee des sources ou selectionnee | fr |

**Formats detailles** :

| Format | Description | Structure type |
|--------|-------------|---------------|
| **custom** | L'utilisateur precise la structure, le style, le ton | Libre |
| **synthesis** | Apercu des sources avec infos cles et citations | Introduction → Points cles → Citations → Conclusion |
| **study-guide** | Quiz a reponses courtes, questions de dissertation, glossaire | Concepts → Questions → Glossaire → Ressources |
| **blog-article** | Article facile a lire avec conclusions enrichissantes | Titre accrocheur → Introduction → Sections → Conclusion |

**Schema** :
```json
{
  "type": "REPORT",
  "data": {
    "title": "Synthese — Technologies Big Data",
    "format": "synthesis",
    "language": "fr",
    "instructions": "Se concentrer sur les aspects ethiques et la comparaison Data Mesh vs Data Fabric",
    "content": "# Synthese\n\n## Points cles\n\n### 1. Les fondations technologiques\nApache Spark et Accumulo sont les outils principaux...\n\n### 2. Enjeux ethiques\n...\n\n## Citations\n> \"La vie privee est le premier droit sacrifie...\" — Source 3\n\n## Conclusion\n...",
    "wordCount": 1500,
    "sourceCount": 8,
    "citations": [
      { "text": "La vie privee est le premier droit sacrifie...", "sourceId": "src_3", "sourceTitle": "Big Data Ethics.pdf" }
    ]
  }
}
```

**Pipeline** : Sources → RAG (toutes les sources selectionnees) → LLM genere le document selon le format → Markdown structure
**Rendu** : Markdown rendu en HTML. Copier, exporter en PDF, sauvegarder en note.

---

### 2.13 DATA_TABLE — Tableau de donnees structure PLANNED

Extraction de donnees structurees depuis les sources. Exportable en CSV ou Excel.

**Category** : static

**Settings modal** :

| Setting | Options | Default |
|---------|---------|---------|
| Instructions | Texte libre : "Extraire toutes les dates et evenements", "Comparer les 3 technologies" | — |
| Colonnes suggerees | Le LLM propose des colonnes, l'utilisateur valide/modifie | auto |
| Format d'export | `csv`, `xlsx`, `google-sheets` (lien) | csv |

**Schema** :
```json
{
  "type": "DATA_TABLE",
  "data": {
    "title": "Comparaison des technologies Big Data",
    "instructions": "Comparer Apache Spark, Accumulo et NiFi",
    "columns": [
      { "id": "name", "label": "Technologie", "type": "string" },
      { "id": "type", "label": "Type", "type": "string" },
      { "id": "usage", "label": "Usage principal", "type": "string" },
      { "id": "license", "label": "Licence", "type": "string" },
      { "id": "scale", "label": "Echelle", "type": "string" }
    ],
    "rows": [
      { "name": "Apache Spark", "type": "Traitement distribue", "usage": "Analytics temps reel", "license": "Apache 2.0", "scale": "Petaoctets" },
      { "name": "Accumulo", "type": "Base de donnees", "usage": "Stockage cle-valeur securise", "license": "Apache 2.0", "scale": "Teraoctets" },
      { "name": "Apache NiFi", "type": "ETL", "usage": "Integration de flux de donnees", "license": "Apache 2.0", "scale": "Variable" }
    ],
    "exportUrl": "https://storage.../table.csv"
  }
}
```

**Pipeline** : Sources → RAG → LLM extrait les donnees structurees → genere colonnes + lignes → validation → export CSV/XLSX
**Rendu** : Tableau HTML interactif (tri, filtre). Bouton "Exporter CSV" / "Exporter Excel".
**Export** : `csv` via generation cote serveur, `xlsx` via une lib (SheetJS/exceljs), `google-sheets` via Google Sheets API (cree une feuille partagee).

---

### 2.14 NOTEBOOK — Notebook interactif (code executable) PLANNED

Notebook de cellules executables, inspire de Jupyter/Colab. Cellules de texte (markdown) + cellules de code (executees dans le navigateur). Genere par l'IA a partir des sources.

**Category** : interactive composed
**Execution** : sandbox navigateur (pas de serveur backend)

**Settings modal** :

| Setting | Options | Default |
|---------|---------|---------|
| Langage | `python`, `javascript`, `typescript`, `sql` | python |
| Niveau | `debutant`, `intermediaire`, `avance` | intermediaire |
| Type | `tutoriel` (step by step avec explications), `exploration` (analyse de donnees) | tutoriel |
| Instructions | Texte libre : "Creer un tutoriel sur pandas avec le dataset iris" | — |
| Nombre de cellules | `court` (~5), `standard` (~10), `long` (~20) | standard |

**Schema** :
```json
{
  "type": "NOTEBOOK",
  "kind": "COMPOSED",
  "data": {
    "title": "Introduction a Pandas — Manipulation de donnees",
    "language": "python",
    "level": "debutant",
    "notebookType": "tutoriel",
    "runtime": "pyodide"
  },
  "children": [
    {
      "type": "NOTEBOOK_CELL",
      "data": {
        "cellType": "markdown",
        "content": "# Introduction a Pandas\n\nPandas est une librairie Python pour la manipulation de donnees tabulaires. Dans ce notebook, nous allons apprendre a charger, explorer et transformer un dataset."
      }
    },
    {
      "type": "NOTEBOOK_CELL",
      "data": {
        "cellType": "code",
        "language": "python",
        "source": "import pandas as pd\nimport numpy as np\n\n# Creer un DataFrame simple\ndf = pd.DataFrame({\n    'Nom': ['Alice', 'Bob', 'Charlie'],\n    'Age': [25, 30, 35],\n    'Ville': ['Paris', 'Lyon', 'Marseille']\n})\ndf",
        "expectedOutput": "Un tableau avec 3 lignes et 3 colonnes",
        "hint": "pd.DataFrame() cree un tableau a partir d'un dictionnaire"
      }
    },
    {
      "type": "NOTEBOOK_CELL",
      "data": {
        "cellType": "markdown",
        "content": "## Exercice\n\nAjoutez une colonne 'Salaire' au DataFrame avec des valeurs de votre choix."
      }
    },
    {
      "type": "NOTEBOOK_CELL",
      "data": {
        "cellType": "code",
        "language": "python",
        "source": "# Votre code ici\n",
        "solution": "df['Salaire'] = [3000, 4000, 5000]\ndf",
        "isExercise": true
      }
    },
    {
      "type": "NOTEBOOK_CELL",
      "data": {
        "cellType": "markdown",
        "content": "## Filtrage\n\nPandas permet de filtrer les donnees avec des conditions booleennes."
      }
    },
    {
      "type": "NOTEBOOK_CELL",
      "data": {
        "cellType": "code",
        "language": "python",
        "source": "# Filtrer les personnes de plus de 28 ans\ndf[df['Age'] > 28]",
        "expectedOutput": "Tableau filtre avec Bob et Charlie"
      }
    }
  ],
  "orchestration": { "mode": "sequential" }
}
```

**Sous-type NOTEBOOK_CELL** :

```typescript
interface NotebookCell {
  cellType: 'markdown' | 'code' | 'output';
  // Markdown cell
  content?: string;
  // Code cell
  language?: 'python' | 'javascript' | 'typescript' | 'sql';
  source?: string;            // code a executer
  expectedOutput?: string;    // description du resultat attendu
  hint?: string;              // indice pour l'etudiant
  solution?: string;          // solution (masquee, revealable)
  isExercise?: boolean;       // true = cellule vide, l'etudiant ecrit
  // Output cell
  outputType?: 'text' | 'table' | 'chart' | 'image' | 'error';
  outputData?: unknown;
}
```

**Sandbox navigateur** :

| Langage | Runtime | Lib | Packages disponibles |
|---------|---------|-----|---------------------|
| **Python** | Pyodide | [pyodide.org](https://pyodide.org) | pandas, numpy, matplotlib, scikit-learn, scipy (~100 packages) |
| **JavaScript / TypeScript** | WebContainers | [webcontainers.io](https://webcontainers.io) (StackBlitz) | npm complet |
| **SQL** | sql.js | [sql.js](https://sql.js.org) | SQLite in-browser |

**Pipeline de generation** :
1. Sources → RAG retrieval (documentation, dataset, tutoriel existant)
2. LLM genere la sequence de cellules (markdown + code alterne)
3. Pour les tutoriels : genere les exercices avec solutions masquees
4. Pour l'exploration : genere les imports + chargement de donnees + analyses
5. Validation : chaque cellule code est testee dans le sandbox pour verifier qu'elle s'execute

**Rendu** :
- Editeur de code : Monaco Editor (meme editeur que VS Code) ou CodeMirror 6
- Cellules markdown : rendu markdown standard
- Output : texte, tableaux HTML, graphiques (matplotlib → SVG via Pyodide), erreurs formatees
- Bouton "Run" par cellule + "Run All"
- Bouton "Show Solution" pour les exercices
- Progression : compteur de cellules executees / total

**Engage compatibility** : jouable en session live. Le presenter peut :
- Montrer le notebook en mode presentation (cellules executees une par une)
- Les participants executent les exercices sur leur device
- Les resultats sont collectes (cellule executee avec succes / echec)

---

## 3. Widgets composes (orchestration)

### 3.1 PRESENTATION — Presentation interactive Qiplim PROD

Composition de SLIDE natives + widgets interactifs intercales. C'est le format presentation de reference Qiplim : rendu par le player, jouable en session live, avec des quiz/polls/wordclouds entre les slides.

**Category** : interactive composed
**Orchestration** : sequential
**Engage** : oui (le presenter navigue, les widgets interactifs activent la participation)

```json
{
  "type": "PRESENTATION",
  "kind": "COMPOSED",
  "data": {
    "title": "Les enjeux du changement climatique",
    "theme": "professional-blue",
    "estimatedDuration": "20min"
  },
  "children": [
    { "type": "SLIDE", "data": { "title": "Introduction", "content": "Le changement climatique est...", "layout": "title-only" } },
    { "type": "SLIDE", "data": { "title": "Les causes", "content": "## Emissions de CO2\n- Transport (29%)\n- Industrie (21%)...", "image": "https://..." } },
    { "type": "POLL", "data": { "question": "Quel secteur devrait etre la priorite ?", "options": [{"id":"a","label":"Transport"},{"id":"b","label":"Energie"},{"id":"c","label":"Agriculture"}] } },
    { "type": "SLIDE", "data": { "title": "Les solutions", "content": "..." } },
    { "type": "QUIZ", "data": { "questions": [{"id":"q1","question":"Quel % d'emissions vient du transport ?","type":"single","options":[{"id":"o1","label":"15%","isCorrect":false},{"id":"o2","label":"29%","isCorrect":true},{"id":"o3","label":"40%","isCorrect":false}],"points":1}] } },
    { "type": "SLIDE", "data": { "title": "Conclusion", "content": "...", "layout": "title-only" } }
  ],
  "orchestration": { "mode": "sequential" }
}
```

**Difference avec SLIDE_DECK_EXPORT** : la presentation Qiplim est interactive (quiz, polls, votes entre les slides). Le PPTX est un fichier statique telecharge.

**Difference avec CANVA_EMBED** : la presentation Qiplim est native, generee par IA, editable dans Studio. Canva est un lien externe.

**Pourquoi 3 types de "slides"** :

| Type | Rendu | Interactif | Editable dans Studio | Genere par IA | Session live |
|------|-------|-----------|---------------------|--------------|-------------|
| **PRESENTATION** (compose) | Player Qiplim | Oui (quiz, polls entre slides) | Oui | Oui | Oui |
| **SLIDE_DECK_EXPORT** (fichier) | PPTX/PDF/Google Slides | Non | Non (fichier externe) | Oui (LLM → fichier) | Non (download) |

Le choix depend du use case :
- **Session live interactive** → PRESENTATION Qiplim
- **Partager un fichier PPTX par email** → SLIDE_DECK_EXPORT

---

### 3.2 ADVENTURE — Aventure interactive PLANNED

Recit a embranchements ou les participants votent pour decider la suite. Blocs generatifs pour une narration adaptative.

**Category** : interactive composed + generative
**Orchestration** : sequential (chapitres + votes + blocs generatifs)

Voir exemple detaille dans `widget-system-spec.md` section 4.5.

---

### 3.3 SIMULATION — Simulation de crise PLANNED

Scenario avec decisions collectives et consequences conditionnelles.

**Category** : interactive composed
**Orchestration** : conditional

Voir exemple detaille dans `widget-system-spec.md` section 4.6.

---

### 3.4 TRAINING — Formation avec score-gating PLANNED

Enchainement de lecons + evaluations avec seuil de reussite pour avancer.

**Category** : interactive composed
**Orchestration** : conditional (score >= seuil → next, sinon → remediation)

Voir exemple detaille dans `widget-system-spec.md` section 4.8.

---

### 3.5 ICEBREAKER — Ice-breaker rapide PLANNED

Enchainement court de widgets engageants pour demarrer une session.

**Category** : interactive composed
**Orchestration** : sequential

Voir exemple detaille dans `widget-system-spec.md` section 4.7.

---

### 3.6 COURSE_PLAN — Plan de cours structure PROD

Ensemble de modules avec contenu structuré.

**Category** : static composed
**Orchestration** : sequential

Voir exemple detaille dans `widget-system-spec.md` section 4.3.

---

## 4. Widgets de structure pedagogique

Widgets dedies a chaque niveau de la hierarchie pedagogique LMD (cf. `specs/pedagogical-structure.md`). Chaque widget appelle l'endpoint API correspondant a son niveau.

### 4.1 SEMESTER — Semestre d'un programme PLANNED

Structure d'un semestre : UEs, ECTS, objectifs du semestre.

**Category** : static composed
**Niveau** : Semestre
**Roles** : Admin, RP

```json
{
  "type": "SEMESTER",
  "kind": "COMPOSED",
  "data": {
    "title": "Semestre 1 — Fondamentaux du design",
    "number": 1,
    "ects": 30,
    "parentProgramId": "prog_xxx",
    "objectives": [
      "Acquerir les bases du design graphique et spatial",
      "Developper une culture visuelle"
    ]
  },
  "children": [
    { "type": "UNIT", "data": { "title": "Design fondamental", "ects": 6 } },
    { "type": "UNIT", "data": { "title": "Culture visuelle", "ects": 6 } },
    { "type": "UNIT", "data": { "title": "Projet studio", "ects": 9 } },
    { "type": "UNIT", "data": { "title": "Outils numeriques", "ects": 9 } }
  ],
  "orchestration": { "mode": "sequential" }
}
```

**API** : `POST /api/v1/generate/semester`
**Input** : programme parent (optionnel) + params (numero, ECTS, objectifs)
**Generation** : LLM propose la repartition en UEs avec ECTS coherents (total = 30)

---

### 4.2 UNIT — Unite d'Enseignement (UE) PLANNED

Structure d'une UE : ECs (cours), ECTS, coefficient, competences visees.

**Category** : static composed
**Niveau** : UE
**Roles** : Admin, RP

```json
{
  "type": "UNIT",
  "kind": "COMPOSED",
  "data": {
    "title": "Design fondamental",
    "ects": 6,
    "coefficient": 1,
    "mandatory": true,
    "parentSemesterId": "sem_xxx",
    "competencyBlock": "Design graphique",
    "objectives": [
      "Maitriser les principes fondamentaux du design",
      "Developper un regard critique sur les productions visuelles"
    ]
  },
  "children": [
    { "type": "COURSE_PLAN", "data": { "title": "Theorie de la couleur", "ects": 3, "hours": 24 } },
    { "type": "COURSE_PLAN", "data": { "title": "Typographie", "ects": 3, "hours": 24 } }
  ],
  "orchestration": { "mode": "sequential" }
}
```

**API** : `POST /api/v1/generate/unit`
**Input** : semestre parent (optionnel) + params (ECTS, competences)
**Generation** : LLM propose la decomposition en ECs avec ECTS coherents

---

### 4.3 SYLLABUS — Fiche descriptive d'un cours (EC) PLANNED

Genere un syllabus (objectifs, prerequis, contenu, evaluation, bibliographie) pour un EC.

**Category** : static
**Niveau** : EC (Element Constitutif)

```json
{
  "type": "SYLLABUS",
  "kind": "LEAF",
  "data": {
    "title": "Theorie de la couleur",
    "ects": 3,
    "hours": 24,
    "hoursBreakdown": { "cm": 12, "td": 8, "tp": 4 },
    "level": "licence-2",
    "modality": "presentiel",
    "objectives": [
      "Maitriser le cercle chromatique et les harmonies",
      "Comprendre la psychologie des couleurs",
      "Appliquer les principes de couleur en design"
    ],
    "prerequisites": ["Bases en design graphique", "Culture visuelle niveau 1"],
    "content": [
      "Introduction a la theorie de la couleur",
      "Le cercle chromatique et les systemes (RVB, CMJN, Pantone)",
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

**API** : `POST /api/v1/generate/syllabus`
**Generation** : Document source + params ECTS/heures → LLM structure le syllabus
**Export** : PDF, Markdown, ou integration LMS

---

### 4.4 COURSE_PLAN — Plan de cours (EC) PROD

Plan de cours d'un EC : progression des seances avec objectifs et resume.

**Category** : static composed
**Niveau** : EC (Element Constitutif)
**Roles** : RP, Intervenant

```json
{
  "type": "COURSE_PLAN",
  "kind": "COMPOSED",
  "data": {
    "title": "Theorie de la couleur",
    "ects": 3,
    "hours": 24,
    "parentUnitId": "unit_xxx",
    "modality": "presentiel",
    "sessionCount": 8,
    "sessionDuration": 3
  },
  "children": [
    { "type": "SESSION_PLAN", "data": { "title": "Introduction", "number": 1, "duration": 180 } },
    { "type": "SESSION_PLAN", "data": { "title": "Le cercle chromatique", "number": 2, "duration": 180 } }
  ],
  "orchestration": { "mode": "sequential" }
}
```

**API** : `POST /api/v1/generate/course-plan`
**Input** : syllabus (optionnel) + params (nb seances, duree, modalite)
**Generation** : LLM structure la progression pedagogique en seances

---

### 4.5 SESSION_PLAN — Deroule pedagogique d'une seance PLANNED

Genere le detail minute par minute d'une seance (timing, activites, transitions).

**Category** : static composed (timeline d'activites)
**Niveau** : Seance

```json
{
  "type": "SESSION_PLAN",
  "kind": "COMPOSED",
  "data": {
    "title": "Le cercle chromatique",
    "duration": 180,
    "sessionNumber": 2,
    "totalSessions": 8,
    "objectives": [
      "Identifier les couleurs primaires, secondaires et tertiaires",
      "Construire un cercle chromatique"
    ],
    "materials": ["Gouache (3 primaires)", "Papier aquarelle", "Projecteur"]
  },
  "children": [
    {
      "type": "SLIDE",
      "data": {
        "title": "Accueil et rappel",
        "content": "Rappel de la seance precedente. Questions.",
        "notes": "10 min — Introduction"
      }
    },
    {
      "type": "SLIDE",
      "data": {
        "title": "Les systemes de couleur",
        "content": "## RVB, CMJN, Pantone\n...",
        "notes": "20 min — Presentation magistrale"
      }
    },
    {
      "type": "QUIZ",
      "data": {
        "questions": [
          {
            "id": "q1",
            "question": "Quelles sont les 3 couleurs primaires en synthese soustractive ?",
            "type": "single",
            "options": [
              { "id": "a", "label": "Rouge, Bleu, Jaune", "isCorrect": false },
              { "id": "b", "label": "Cyan, Magenta, Jaune", "isCorrect": true },
              { "id": "c", "label": "Rouge, Vert, Bleu", "isCorrect": false }
            ],
            "points": 1
          }
        ],
        "showCorrectAnswer": true
      }
    },
    {
      "type": "SLIDE",
      "data": {
        "title": "Atelier pratique",
        "content": "Construction du cercle chromatique a la gouache.",
        "notes": "60 min — Les etudiants travaillent en autonomie"
      }
    },
    {
      "type": "OPENTEXT",
      "data": {
        "prompt": "Decrivez en 3 phrases ce que vous avez appris aujourd'hui.",
        "placeholder": "Ce que je retiens...",
        "maxLength": 300
      }
    }
  ],
  "orchestration": { "mode": "sequential" }
}
```

**API** : `POST /api/v1/generate/session-plan`
**Generation** : Contexte du cours + objectifs seance → LLM genere la timeline avec activites
**Note** : Le SESSION_PLAN est un widget COMPOSED qui contient des SLIDE + activites. Il peut etre joue dans le player (self-paced) ou deploye vers Engage (session live).

---

### 4.6 PROGRAM_OVERVIEW — Vue d'ensemble d'un programme (superieur) PLANNED

Vue structurelle d'un programme d'enseignement superieur (semestres, UEs, ECTS). **Contexte : enseignement superieur uniquement** (`fr-lmd`). Pour les lycees, voir `CLASS_OVERVIEW`.

**Category** : static
**Niveau** : Programme
**Locale** : `fr-lmd` (superieur)

```json
{
  "type": "PROGRAM_OVERVIEW",
  "kind": "LEAF",
  "data": {
    "title": "Master UX Design",
    "institution": "Ecole de Design Nantes Atlantique",
    "level": "master",
    "totalEcts": 120,
    "duration": "2 ans (4 semestres)",
    "competencyBlocks": [
      "Recherche utilisateur",
      "Design d'interaction",
      "Prototypage et test",
      "Gestion de projet design"
    ],
    "semesters": [
      {
        "number": 1,
        "ects": 30,
        "units": [
          { "title": "UX Research", "ects": 6, "courses": ["Methodes d'entretien", "Tests utilisateurs"] },
          { "title": "Design Studio", "ects": 9, "courses": ["Projet UX 1"] },
          { "title": "Culture Design", "ects": 6, "courses": ["Histoire du design", "Semiologie"] }
        ]
      }
    ]
  }
}
```

**API** : `POST /api/v1/generate/program`
**Generation** : description du programme + competences → LLM structure en semestres/UEs

---

### 4.7 CLASS_OVERVIEW — Vue d'ensemble d'une classe (lycee) PLANNED

Vue structurelle d'une classe de lycee (matieres, horaires, professeurs). **Contexte : enseignement secondaire uniquement** (`fr-secondary`). Pour le superieur, voir `PROGRAM_OVERVIEW`.

**Category** : static
**Niveau** : Classe
**Locale** : `fr-secondary` (lycee)

```json
{
  "type": "CLASS_OVERVIEW",
  "kind": "LEAF",
  "data": {
    "title": "Terminale STI2D — Groupe A",
    "institution": "Lycee Jean Moulin, Nantes",
    "level": "terminale",
    "filiere": "STI2D",
    "effectif": 30,
    "subjects": [
      {
        "title": "Mathematiques",
        "hoursPerWeek": 4,
        "teacher": "Mme Leroy",
        "chapters": [
          "Limites et derivees",
          "Fonctions exponentielles",
          "Probabilites conditionnelles",
          "Geometrie dans l'espace"
        ]
      },
      {
        "title": "Physique-Chimie",
        "hoursPerWeek": 3,
        "teacher": "M. Dupont",
        "chapters": [
          "Ondes et signaux",
          "Mouvements et interactions",
          "Conversions d'energie"
        ]
      },
      {
        "title": "Anglais",
        "hoursPerWeek": 2,
        "teacher": "Mme Garcia",
        "chapters": [
          "Art and Power",
          "Innovations and Responsibility",
          "Diversity and Inclusion"
        ]
      }
    ],
    "schedule": {
      "trimester": 2,
      "weeksRemaining": 12
    }
  }
}
```

**Settings modal** :

| Setting | Options | Default |
|---------|---------|---------|
| Niveau | `seconde`, `premiere`, `terminale` | terminale |
| Filiere | `generale`, `STI2D`, `STMG`, `STL`, `ST2S`, `pro` | generale |
| Matieres | Liste editable (auto-suggeree par le LLM selon niveau + filiere) | auto |

**API** : `POST /api/v1/generate/class`
**Generation** : niveau + filiere → LLM genere la liste des matieres avec chapitres du programme national
**Note** : pas d'ECTS. Les volumes sont en heures/semaine. La structure est Matiere → Chapitres (pas Semestre → UE → EC).

---

## 5. Matrice recapitulative

| Type | Category | Engage | Scoring | Timer | Generatif | Status |
|------|----------|--------|---------|-------|-----------|--------|
| QUIZ | interactive | oui | oui | oui | non | PROD |
| MULTIPLE_CHOICE | interactive | oui | optionnel | oui | non | PROD |
| WORDCLOUD | interactive | oui | non | oui | non | PROD |
| POSTIT | interactive | oui | votes | non | non | PROD |
| RANKING | interactive | oui | rang moyen | oui | non | PROD |
| OPENTEXT | interactive | oui | non | oui | non | PROD |
| ROLEPLAY | interactive | oui | feedback IA | non | oui (conversation) | PROD |
| TRUE_FALSE | interactive | a ajouter | oui | oui | non | PLANNED |
| FILL_BLANKS | interactive | a ajouter | oui | oui | non | PLANNED |
| MATCHING | interactive | a ajouter | oui | oui | non | PLANNED |
| POLL | interactive | a ajouter | non | non | non | PLANNED |
| RATING | interactive | a ajouter | non | non | non | PLANNED |
| QA | interactive | a ajouter | non | non | non | PLANNED |
| CATEGORIZE | interactive | a ajouter | oui | oui | non | PLANNED |
| SPINNER | interactive | a ajouter | non | non | non | PLANNED |
| FLASHCARD | static/interactive | non | self-scoring | non | non | PLANNED |
| SLIDE | static | display only | non | non | non | PROD |
| SLIDE_DECK_EXPORT | static (fichier) | non | non | non | non | PLANNED |
| AUDIO | static | display only | non | non | non | READY |
| IMAGE | static | display only | non | non | non | PROD |
| VIDEO | static (genere) | non | non | non | non | PLANNED |
| FAQ | static | non | non | non | non | PLANNED |
| TIMELINE | static | non | non | non | non | PLANNED |
| SUMMARY | static | non | non | non | non | PLANNED |
| GLOSSARY | static | non | non | non | non | PLANNED |
| MINDMAP | static (React Flow) | non | non | non | non | PLANNED |
| INFOGRAPHIC | static (image Gemini) | non | non | non | non | PLANNED |
| REPORT | static (document) | non | non | non | non | PLANNED |
| DATA_TABLE | static (CSV/Excel) | non | non | non | non | PLANNED |
| NOTEBOOK | interactive composed (code) | oui | exercices | non | non | PLANNED |
| PRESENTATION | composed | oui | via enfants | via enfants | optionnel | PROD |
| ADVENTURE | composed | oui | non | non | oui | PLANNED |
| SIMULATION | composed | oui | via enfants | non | optionnel | PLANNED |
| TRAINING | composed | oui | score-gating | via enfants | optionnel | PLANNED |
| ICEBREAKER | composed | oui | non | non | non | PLANNED |
| COURSE_PLAN | composed | non | non | non | non | PROD |
| PROGRAM_OVERVIEW | static (pedagogique) | non | non | non | non | PLANNED |
| SEMESTER | composed (pedagogique) | non | non | non | non | PLANNED |
| UNIT | composed (pedagogique) | non | non | non | non | PLANNED |
| SYLLABUS | static (pedagogique) | non | non | non | non | PLANNED |
| SESSION_PLAN | composed (pedagogique) | oui | via enfants | via enfants | non | PLANNED |

| CLASS_OVERVIEW | static (pedagogique, lycee) | non | non | non | non | PLANNED |

**Total : 42 types** (7 en prod Engage, 12 en prod/ready Studio, 23 planned)

---

## 5. Priorites d'implementation

### Vague 1 — Quick wins (types simples, proches de l'existant)
- `TRUE_FALSE` : sous-type de QUIZ avec 2 options, trivial
- `POLL` : MULTIPLE_CHOICE sans isCorrect, trivial
- `RATING` : nouveau renderer simple (slider/etoiles)
- `FLASHCARD` : nouveau type, renderer recto/verso

### Vague 2 — Nouveaux interactifs
- `FILL_BLANKS` : parsing du texte avec `{{blank}}`, renderer inline
- `MATCHING` : drag & drop entre deux colonnes
- `CATEGORIZE` : drag & drop dans des zones
- `QA` : liste de questions avec upvote

### Vague 3 — Structure pedagogique (hierarchie LMD)
- `PROGRAM_OVERVIEW` : vue structurelle d'un programme (semestres, UEs, ECTS)
- `SEMESTER` : structure d'un semestre (UEs, 30 ECTS)
- `UNIT` : structure d'une UE (ECs, competences)
- `SYLLABUS` : fiche descriptive d'un EC (objectifs, prerequis, evaluation, biblio)
- `SESSION_PLAN` : deroule de seance (timeline minute par minute avec activites)
- Refactor `COURSE_PLAN` pour aligner sur la hierarchie LMD

### Vague 4 — Contenu statique genere
- `FAQ` : extraction depuis RAG
- `TIMELINE` : extraction de dates/evenements
- `SUMMARY` : resume structure
- `GLOSSARY` : extraction de termes/definitions

### Vague 5 — Compose + generatif
- `ADVENTURE` : composition runtime + blocs generatifs
- `SIMULATION` : orchestration conditionnelle
- `TRAINING` : score-gating

### Vague 6 — Avance
- `VIDEO` : generation IA multi-providers (Veo, Sora, HeyGen, Synthesia)
- `MINDMAP` : rendu graphique de hierarchie
- `INFOGRAPHIC` : composition de stats + charts
- `SPINNER` : animation de roue
- `PROGRAM_OVERVIEW` : vue structurelle d'un programme complet

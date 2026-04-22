# Top 5 — Analyse approfondie

> Sélection des projets les plus pertinents pour la veille Studio

---

## 1. Open Notebook — Le clone le plus complet

- **Repo** : https://github.com/lfnovo/open-notebook
- **Stars** : 22.0k | **Licence** : MIT | **Stack** : TypeScript
- **Activité** : Très actif (dernière maj : avril 2026)

### Features

- Upload multi-modal : PDFs, vidéos, audio, pages web
- Interface notebook avec organisation par sources
- AI chat groundé sur les documents (citations)
- Génération de podcasts/audio à partir des sources
- Summaries et notes automatiques
- Self-learning tools
- 18+ providers LLM (OpenAI, Anthropic, Ollama, LM Studio, Google, Groq...)

### Pourquoi c'est intéressant

Le projet le plus **feature-complete** en tant qu'alternative NotebookLM. Couvre les 4 piliers (upload, chat, audio, summaries). La licence MIT et le support massif de providers LLM en font une base d'étude solide. L'architecture TypeScript est compatible avec notre stack.

### Limites

- UX encore en dessous de NotebookLM (côté polish)
- Moins d'intégrations externes que SurfSense

---

## 2. SurfSense — L'option "connected workspace"

- **Repo** : https://github.com/MODSetter/SurfSense
- **Stars** : 13.7k | **Licence** : Apache 2.0 | **Stack** : Python (FastAPI) + Next.js
- **Activité** : Très actif

### Features

- Document upload + AI chat avec sources
- Podcast generation rapide (~3 min de podcast en <20s)
- Intégrations : Slack, Linear, Notion, YouTube, GitHub, moteurs de recherche
- Chrome extension pour capturer le browsing
- Multi-user, team-oriented
- Support Ollama pour le local

### Pourquoi c'est intéressant

Va au-delà de NotebookLM en connectant des sources externes (Slack, Linear — outils qu'on utilise). Le fast podcast generation est impressionnant. L'architecture Next.js frontend + FastAPI backend est proche de ce qu'on pourrait adopter. **Pertinent pour Studio si on veut connecter des sources live.**

### Limites

- Backend Python (pas notre stack principale)
- Setup plus complexe (multiple services)

---

## 3. Kotaemon — La meilleure UX pour le document chat

- **Repo** : https://github.com/Cinnamon/kotaemon
- **Stars** : 25.3k | **Licence** : Apache 2.0 | **Stack** : Python, Gradio
- **Activité** : Très actif

### Features

- Upload documents (PDF, DOCX, etc.)
- Multi-user avec collections privées/publiques
- Citations avec highlights dans les sources
- Multiple pipelines RAG (hybrid RAG, GraphRAG)
- Support raisonnement complexe (multi-hop)
- Configurable retrieval/generation pipelines
- Support OpenAI, Azure, Cohere, Ollama, llama.cpp

### Pourquoi c'est intéressant

L'UX de chat documentaire la plus aboutie du lot. Le système de **citations avec highlights** directement dans les PDFs source est un pattern UX à étudier. Le support multi-pipeline RAG (hybrid + GraphRAG) montre les meilleures pratiques actuelles en retrieval.

### Limites

- Pas d'audio/podcast
- Gradio = pas flexible pour du custom UI
- Python only

---

## 4. Podcastfy — Référence pour la génération audio

- **Repo** : https://github.com/souzatharsis/podcastfy
- **Stars** : 6.2k | **Licence** : Apache 2.0 | **Stack** : Python
- **Activité** : Actif

### Features

- Conversion PDF, sites web, YouTube, images → podcast audio conversationnel
- Support multilingue
- Voix customisables
- Contrôle du style de conversation
- Support LLM local (partiel)
- Pipeline : content analysis → script generation (Gemini/OpenAI) → TTS (ElevenLabs/Google/Edge)

### Pourquoi c'est intéressant

Le projet de référence pour comprendre le pipeline **document → script → audio**. L'architecture en 3 étapes (analyse → scriptwriting → TTS) est le pattern standard. Si Studio veut ajouter de la génération audio, ce projet est la meilleure source d'inspiration pour le pipeline.

### Limites

- Podcast-only (pas de chat, pas de notebook)
- Nécessite des API TTS payantes pour la qualité (ElevenLabs)

---

## 5. PageLM — Le plus proche de notre domaine (éducation)

- **Repo** : https://github.com/CaviraOSS/PageLM
- **Stars** : 1.5k | **Licence** : Custom | **Stack** : TypeScript, React, Vite, Tailwind, LangChain
- **Activité** : Actif

### Features

- Chat contextuel sur les documents
- Génération de notes intelligentes
- Génération de flashcards
- Génération de quiz
- Création de podcasts AI
- Transcription vocale
- Orienté éducation / étude

### Pourquoi c'est intéressant

**Le plus pertinent pour Qiplim** car orienté éducation/formation. Les features de quiz et flashcards générés à partir de documents sont directement dans notre domaine (génération d'activités interactives). La stack TypeScript/React/Tailwind est compatible. Le concept de transformer du contenu documentaire en matériel interactif est exactement ce que Studio fait avec les widgets.

### Limites

- Communauté plus petite (1.5k stars)
- Licence custom (à vérifier)
- Moins mature que les gros projets

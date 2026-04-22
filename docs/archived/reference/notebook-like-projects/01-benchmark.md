# Benchmark — NotebookLM-like Open Source Projects

> Dernière mise à jour : 2026-04-09

## Matrice comparative

| Projet | Stars | Doc Upload | AI Chat | Audio/Podcast | Summaries | Local LLM | Licence | Stack |
|---|---|---|---|---|---|---|---|---|
| [RAGFlow](https://github.com/infiniflow/ragflow) | 77.6k | Yes | Yes | No | Partial | Yes (Ollama) | Apache 2.0 | Python, FastAPI, Elasticsearch |
| [Khoj](https://github.com/khoj-ai/khoj) | 34.0k | Yes | Yes | No | Yes | Yes (Ollama) | AGPL-3.0 | Python, Django |
| [Kotaemon](https://github.com/Cinnamon/kotaemon) | 25.3k | Yes | Yes | No | Partial | Yes (Ollama) | Apache 2.0 | Python, Gradio |
| [Open Notebook](https://github.com/lfnovo/open-notebook) | 22.0k | Yes | Yes | Yes | Yes | Yes (18+ providers) | MIT | TypeScript |
| [SurfSense](https://github.com/MODSetter/SurfSense) | 13.7k | Yes | Yes | Yes | Yes | Yes (Ollama) | Apache 2.0 | Python/FastAPI + Next.js |
| [Verba](https://github.com/weaviate/Verba) | 7.6k | Yes | Yes | No | No | Partial | BSD 3-Clause | Python, Weaviate, React |
| [Podcastfy](https://github.com/souzatharsis/podcastfy) | 6.2k | Input | No | Yes | No | Partial | Apache 2.0 | Python |
| [Cognita](https://github.com/truefoundry/cognita) | 4.4k | Yes | Yes | No | No | Yes | Apache 2.0 | Python + TS frontend |
| [NotebookLlama](https://github.com/run-llama/notebookllama) | 1.9k | Yes | Yes | Yes | Yes | Partial | MIT | Python, LlamaIndex |
| [PageLM](https://github.com/CaviraOSS/PageLM) | 1.5k | Yes | Yes | Yes | Notes/Quizzes | No | Custom | TypeScript, React, Vite |
| [KnowNote](https://github.com/MrSibe/KnowNote) | 976 | Yes | Yes | No | No | No | GPL-3.0 | TypeScript, Electron |
| [Local-NotebookLM](https://github.com/Goekdeniz-Guelmez/Local-NotebookLM) | 869 | Yes | Yes | Yes | No | Yes (Ollama) | Apache 2.0 | Python |
| [InsightsLM](https://github.com/theaiautomators/insights-lm-public) | 516 | Yes | Yes | Yes | Yes | Via N8N | MIT | React, Supabase, N8N |
| [NotebookMLX](https://github.com/johnmai-dev/NotebookMLX) | 340 | Yes | No | Yes | No | Yes (MLX) | MIT | Python, Jupyter |
| [NeuralNoise](https://github.com/leopiney/neuralnoise) | 223 | Input | No | Yes | No | No | MIT | Python, AG2 |
| [Mozilla Doc-to-Podcast](https://github.com/mozilla-ai/document-to-podcast) | 175 | Input | No | Yes | No | Yes (100% local) | Apache 2.0 | Python |

## Couverture des features NotebookLM

Les 4 piliers de NotebookLM :

1. **Document Upload & Parsing** — Tous les projets le supportent
2. **AI Chat grounded in sources** — Majorité des projets (sauf ceux podcast-only)
3. **Audio Overview / Podcast generation** — 8/16 projets (feature différenciante)
4. **Summaries & Notes** — ~6/16 projets

## Observations clés

- **Le RAG document chat est commoditisé** : des dizaines de projets matures existent (RAGFlow, Kotaemon, Khoj)
- **La génération audio/podcast est le vrai différenciateur** de NotebookLM et reste moins couvert
- **Open Notebook** est le seul projet couvrant les 4 piliers avec une vraie maturité (22k stars, MIT)
- **SurfSense** se distingue par ses intégrations externes (Slack, Linear, Notion, Chrome extension)
- **Les licences sont majoritairement permissives** (Apache 2.0, MIT) sauf Khoj (AGPL-3.0)
- **Le support LLM local** (Ollama) est quasi-universel, montrant une demande forte pour la privacy

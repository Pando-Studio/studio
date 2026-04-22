# Qiplim Studio — Audio Podcast Widget Spec

> Derniere mise a jour : 17 avril 2026
>
> Widget AUDIO — generation de podcasts educatifs a 2 voix inspires de Google NotebookLM Audio Overview.

---

## 1. Vision

Transformer n'importe quel document (cours PDF, article, notes) en un **podcast educatif a 2 voix** de 5 a 15 minutes. Deux hotes virtuels discutent du contenu de maniere conversationnelle, engageante et pedagogique — comme NotebookLM mais open-source et configurable.

**Differenciateurs vs NotebookLM** :
- Open source, self-hostable
- Configurable (duree, ton, nombre de voix, langue)
- Multi-provider TTS (ElevenLabs, OpenAI, Google, open-source)
- Script editable par l'utilisateur avant generation audio
- Chapitrage automatique

---

## 2. Pipeline de generation

```
Sources du studio (documents indexes)
  |
  v
Step 1: EXTRACTION — RAG retrieval des points cles
  (hybridSearch topK=20, full content si petit document)
  |
  v
Step 2: SCRIPT — LLM genere un script de dialogue a 2 voix
  (Claude/GPT-4/Gemini avec prompt specialise)
  |
  v
Step 3: REVIEW — L'utilisateur peut editer le script (optionnel)
  |
  v
Step 4: TTS — Generation audio par segment, voix par voix
  (ElevenLabs Projects API / OpenAI TTS / Google Cloud TTS)
  |
  v
Step 5: MIXING — Assemblage audio + musique de fond + intro/outro
  (ffmpeg server-side)
  |
  v
Step 6: UPLOAD — Stockage S3 + mise a jour du widget
  |
  v
AudioConfig { audioUrl, transcript, duration, voices, chapters }
```

---

## 3. Step 1 — Extraction du contenu

Reutiliser le pipeline RAG existant :
- Si document < 20K tokens : injection complete (pas de chunking)
- Si document > 20K tokens : `hybridSearch()` avec `topK=20` + `rerank=true`
- Inclure les `section_title` pour la structure

**Output** : texte brut structure avec les points cles du document.

---

## 4. Step 2 — Generation du script

### 4.1 Format du script

```typescript
interface PodcastScript {
  title: string;
  description: string;
  language: 'fr' | 'en';
  estimatedDuration: number; // minutes
  speakers: {
    id: string;
    name: string;
    role: 'host' | 'expert' | 'narrator';
    voiceConfig: {
      provider: 'elevenlabs' | 'openai' | 'google' | 'parler';
      voiceId: string;        // ID specifique au provider
      voiceName: string;      // nom lisible
    };
  }[];
  segments: {
    id: string;
    speakerId: string;
    text: string;
    type: 'intro' | 'discussion' | 'example' | 'summary' | 'transition' | 'outro';
    pauseAfterMs: number;     // silence apres ce segment
    emphasis?: string[];      // mots a accentuer (SSML)
  }[];
  chapters: {
    title: string;
    startSegmentId: string;
    description?: string;
  }[];
}
```

### 4.2 System prompt pour la generation du script

```
Tu es un scriptwriter pour des podcasts educatifs. Tu crees des dialogues
engageants entre 2 hotes qui discutent d'un sujet a partir d'un document source.

REGLES DU DIALOGUE :
- 2 hotes : {hostA} (animateur principal, pose les questions, guide) et
  {hostB} (expert, approfondit, donne des exemples)
- Ton : conversationnel mais informatif. Pas academique, pas familier.
- Duree cible : {duration} minutes (~{wordCount} mots)
- Langue : {language}

STRUCTURE :
1. INTRO (30s) : {hostA} accueille, presente le sujet, teaser des points cles
2. CONTEXTE (1-2 min) : {hostB} pose le cadre, explique pourquoi c'est important
3. POINTS CLES (60-70% du temps) : alternance de questions ({hostA}) et
   explications ({hostB}), avec des exemples concrets, des analogies
4. REACTIONS NATURELLES : inclure des "Exactement !", "C'est interessant...",
   "Ah oui ?", "Attends, je reformule..." pour que ca sonne naturel
5. RESUME (1 min) : {hostA} recapitule les 3-5 points essentiels
6. OUTRO (30s) : remerciements, invitation a explorer le contenu

CONTRAINTES :
- Chaque segment fait 1 a 4 phrases max (pas de monologues)
- Alterner les speakers toutes les 2-3 phrases
- Ne PAS inventer d'informations absentes du document source
- Citer les concepts cles du document
- Inclure au moins 2 exemples concrets ou analogies
- Definir les termes techniques la premiere fois qu'ils apparaissent

FORMAT DE SORTIE : JSON conforme au schema PodcastScript.
```

### 4.3 Parametres utilisateur

| Parametre | Options | Default |
|-----------|---------|---------|
| Duree | 3 min, 5 min, 10 min, 15 min | 5 min |
| Ton | decontracte, professionnel, academique | professionnel |
| Langue | fr, en | langue du document |
| Nombre de voix | 1 (narrateur), 2 (dialogue), 3 (panel) | 2 |
| Style | interview, discussion, cours, debate | discussion |

### 4.4 Estimation mots → duree

| Duree cible | Mots approx | Segments approx |
|-------------|-------------|-----------------|
| 3 min | 450 | 15-20 |
| 5 min | 750 | 25-35 |
| 10 min | 1500 | 50-70 |
| 15 min | 2250 | 75-100 |

---

## 5. Step 3 — Review du script (optionnel)

L'utilisateur peut editer le script avant la generation TTS :
- Modifier le texte de chaque segment
- Reordonner les segments
- Ajouter/supprimer des segments
- Changer l'attribution d'un segment a un speaker
- Preview texte (pas d'audio preview a ce stade)

**UI** : editeur de script dans le widget Editor, avec timeline visuelle des segments par speaker.

---

## 6. Step 4 — Generation TTS

### 6.1 Providers supportes

| Provider | Modele | Multi-speaker natif | Qualite FR | Cout ~10 min | Latence |
|----------|--------|--------------------:|-----------|-------------|---------|
| **ElevenLabs** | Multilingual v2 | ✅ Projects API | Excellente | ~$0.50 | 2-5s/segment |
| **OpenAI** | tts-1-hd | ❌ (1 voix/appel) | Bonne | ~$0.20 | 1-3s/segment |
| **Google Cloud** | Neural2/Studio | ⚠️ SSML partiel | Tres bonne | ~$0.15 | 1-2s/segment |
| **Parler-TTS** | parler-tts-large | ❌ | Faible | Gratuit (GPU) | 10-30s/segment |

### 6.2 Voix recommandees

**Francais (par defaut)** :
- ElevenLabs : "Charlotte" (host), "Antoine" (expert) — ou clones
- OpenAI : "nova" (host), "onyx" (expert)
- Google : "fr-FR-Neural2-A" (femme), "fr-FR-Neural2-D" (homme)

**Anglais** :
- ElevenLabs : "Rachel" (host), "Adam" (expert)
- OpenAI : "alloy" (host), "echo" (expert)
- Google : "en-US-Studio-O" (femme), "en-US-Studio-M" (homme)

### 6.3 Processus de generation

```typescript
async function generateAudioSegments(script: PodcastScript): Promise<AudioSegment[]> {
  const segments: AudioSegment[] = [];

  for (const segment of script.segments) {
    const speaker = script.speakers.find(s => s.id === segment.speakerId);
    const provider = getTTSProvider(speaker.voiceConfig.provider);

    const audioBuffer = await provider.synthesize({
      text: segment.text,
      voiceId: speaker.voiceConfig.voiceId,
      language: script.language,
      speed: 1.0,
      // SSML pour les emphases si le provider le supporte
      ssml: segment.emphasis ? wrapWithSSML(segment.text, segment.emphasis) : undefined,
    });

    segments.push({
      id: segment.id,
      audio: audioBuffer,
      durationMs: getAudioDuration(audioBuffer),
      pauseAfterMs: segment.pauseAfterMs,
    });
  }

  return segments;
}
```

### 6.4 Interface TTSProvider

```typescript
interface TTSProvider {
  id: string;
  name: string;
  synthesize(options: TTSSynthesizeOptions): Promise<Buffer>;
  listVoices(language?: string): Promise<TTSVoice[]>;
  estimateCost(charCount: number): number;
  supportsSSML: boolean;
  supportsStreaming: boolean;
}

interface TTSSynthesizeOptions {
  text: string;
  voiceId: string;
  language: string;
  speed?: number;       // 0.5 - 2.0, default 1.0
  ssml?: string;        // SSML markup si supporte
  format?: 'mp3' | 'wav' | 'ogg';
}

interface TTSVoice {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  preview?: string;     // URL preview audio
}
```

---

## 7. Step 5 — Mixage audio (ffmpeg)

### 7.1 Pipeline ffmpeg

```bash
# 1. Generer les fichiers silence (pauses entre segments)
ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t {pauseSeconds} silence_{id}.wav

# 2. Concatener segments + pauses
ffmpeg -f concat -safe 0 -i segments.txt -c copy dialogue.mp3

# 3. Ajouter musique de fond (volume 8%)
ffmpeg -i dialogue.mp3 -i background_music.mp3 \
  -filter_complex "[1:a]volume=0.08[bg];[0:a][bg]amix=inputs=2:duration=first[out]" \
  -map "[out]" podcast_with_music.mp3

# 4. Ajouter intro jingle (3s) + outro (3s)
ffmpeg -i intro.mp3 -i podcast_with_music.mp3 -i outro.mp3 \
  -filter_complex "[0:a][1:a][2:a]concat=n=3:v=0:a=1[out]" \
  -map "[out]" podcast_final.mp3

# 5. Normaliser le volume (-16 LUFS standard podcast)
ffmpeg -i podcast_final.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11 podcast_ready.mp3
```

### 7.2 Assets audio

Fournir avec le projet :
- `assets/audio/intro-jingle.mp3` — 3s, musique de debut
- `assets/audio/outro-jingle.mp3` — 3s, musique de fin
- `assets/audio/background-loop.mp3` — loop ambient discret pour fond sonore
- Licence : Creative Commons ou genere (royalty-free)

### 7.3 Specifications de sortie

| Parametre | Valeur |
|-----------|--------|
| Format | MP3 |
| Bitrate | 128 kbps (voix) |
| Sample rate | 44100 Hz |
| Channels | Stereo |
| Loudness | -16 LUFS |
| Metadata ID3 | title, artist="Qiplim Studio", album |

---

## 8. Schema Zod mis a jour

```typescript
export const AudioConfigSchema = z.object({
  title: z.string().default(''),
  audioUrl: z.string().optional(),
  transcript: z.string().optional(),
  duration: z.number().optional(),
  voices: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.enum(['host', 'expert', 'narrator']).default('narrator'),
  })).optional(),
  language: z.string().default('fr'),
  // NEW
  script: z.object({
    segments: z.array(z.object({
      id: z.string(),
      speakerId: z.string(),
      text: z.string(),
      type: z.enum(['intro', 'discussion', 'example', 'summary', 'transition', 'outro']),
    })),
    chapters: z.array(z.object({
      title: z.string(),
      startSegmentId: z.string(),
    })).optional(),
  }).optional(),
  generationConfig: z.object({
    targetDuration: z.enum(['3', '5', '10', '15']).default('5'),
    tone: z.enum(['casual', 'professional', 'academic']).default('professional'),
    style: z.enum(['interview', 'discussion', 'lecture', 'debate']).default('discussion'),
    speakerCount: z.enum(['1', '2', '3']).default('2'),
    ttsProvider: z.enum(['elevenlabs', 'openai', 'google', 'parler']).default('elevenlabs'),
    includeMusic: z.boolean().default(true),
  }).optional(),
});
```

---

## 9. Template de generation

Creer `lib/widget-templates/templates/audio-podcast.json` :

```json
{
  "id": "qiplim/audio-podcast",
  "name": "Audio Podcast",
  "version": "1.0.0",
  "description": "Generate an educational podcast with 2 hosts discussing the content",
  "widgetType": "AUDIO",
  "tags": ["media", "podcast", "audio"],
  "schema": {
    "inputs": {
      "targetDuration": { "type": "string", "enum": ["3", "5", "10", "15"], "default": "5" },
      "tone": { "type": "string", "enum": ["casual", "professional", "academic"], "default": "professional" },
      "style": { "type": "string", "enum": ["interview", "discussion", "lecture", "debate"], "default": "discussion" },
      "speakerCount": { "type": "string", "enum": ["1", "2", "3"], "default": "2" },
      "ttsProvider": { "type": "string", "enum": ["elevenlabs", "openai", "google"], "default": "elevenlabs" },
      "includeMusic": { "type": "boolean", "default": true }
    }
  },
  "generation": {
    "mode": "multi-step",
    "steps": ["script", "tts", "mixing"]
  },
  "rag": { "topK": 20, "rerank": true, "useHyde": false }
}
```

---

## 10. Worker BullMQ

Queue dediee : `studio-audio-generation`

```
Job input: { studioId, widgetId, sourceIds, script?, generationConfig }

Step 1 (30%): Generate script via LLM (si pas de script fourni)
Step 2 (50%): Generate TTS segments (parallel par speaker si possible)
Step 3 (70%): Mix audio via ffmpeg (subprocess)
Step 4 (80%): Upload to S3
Step 5 (90%): Update widget with audioUrl, transcript, duration, chapters
Step 6 (100%): Complete
```

Progress SSE : `generation:progress` a chaque step.

---

## 11. UI

### 11.1 Generation Modal

- Selecteur de duree (3/5/10/15 min)
- Selecteur de ton
- Selecteur de style
- Choix du provider TTS (avec preview des voix)
- Preview du cout estime
- Bouton "Generer le script d'abord" vs "Generer directement"

### 11.2 Script Editor

- Timeline horizontale avec segments colores par speaker
- Edition inline du texte de chaque segment
- Drag-and-drop pour reordonner
- Bouton "Regenerer ce segment"
- Preview audio segment par segment (apres TTS)

### 11.3 Player

Le AudioDisplay existant est deja adapte :
- Lecteur audio avec controles
- Affichage des voix/roles
- Transcription collapsible
- Chapitrage (seek to chapter)

---

## 12. Couts estimes

| Duree | Chars approx | ElevenLabs | OpenAI TTS | Google Neural2 |
|-------|-------------|-----------|-----------|----------------|
| 3 min | ~2700 | ~$0.08 | ~$0.04 | ~$0.04 |
| 5 min | ~4500 | ~$0.14 | ~$0.07 | ~$0.07 |
| 10 min | ~9000 | ~$0.27 | ~$0.14 | ~$0.14 |
| 15 min | ~13500 | ~$0.41 | ~$0.20 | ~$0.22 |

---

## 13. Dependances

- `ffmpeg` : doit etre installe sur le serveur (ou via Docker)
- Provider TTS : au moins 1 API key configuree (ELEVENLABS_API_KEY, OPENAI_API_KEY, ou GOOGLE_TTS_API_KEY)
- S3 : stockage des fichiers audio generes

---

## 14. Phases d'implementation

| Phase | Contenu | Effort |
|-------|---------|--------|
| 1 | Script generation (LLM prompt + format JSON) | M |
| 2 | TTS integration (ElevenLabs d'abord, puis OpenAI/Google) | M |
| 3 | ffmpeg mixing pipeline (concat + music + normalize) | M |
| 4 | Worker BullMQ + progress SSE | S |
| 5 | Script Editor UI | L |
| 6 | Voix additionnelles + preview | S |

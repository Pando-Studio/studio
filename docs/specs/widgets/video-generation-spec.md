# Qiplim Studio — Video Generation Widget Spec

> Derniere mise a jour : 17 avril 2026
>
> Widget VIDEO — generation de videos educatives a partir de documents.

---

## 1. Vision

Transformer un document en une **video educative** de 1 a 10 minutes. Trois modes de generation selon le besoin et le budget :
1. **Slideshow + narration** (recommande) — slides generees + voix off TTS
2. **Avatar presenter** (premium) — presentateur virtuel face camera
3. **Clips illustratifs** (experimental) — sequences generatives courtes

**Philosophie** : le mode Slideshow est le defaut car il offre le meilleur rapport qualite/cout/fiabilite pour du contenu educatif. Les autres modes sont optionnels.

---

## 2. Comparatif des approches

| Critere | Slideshow + TTS | Avatar (Synthesia/HeyGen/D-ID) | Generatif (Veo/Sora/Runway) |
|---------|----------------|-------------------------------|---------------------------|
| Controle contenu | Total | Bon (script controle) | Faible (hallucinations) |
| Cout / min | ~$0.05-0.20 | ~$1-5 | ~$3-15 |
| Duree max | Illimitee | Minutes | 5-20 secondes |
| Qualite FR | Excellente (TTS) | Bonne | Visuel uniquement |
| Open-source friendly | Oui (ffmpeg) | Non (API Enterprise) | Non |
| Fiabilite educative | Excellente | Bonne | Faible |
| Temps de generation | Secondes | 2-10 min | 1-5 min / clip |

**Recommandation** : Slideshow + TTS comme mode principal. Avatar en option premium. Generatif uniquement pour des illustrations courtes integrees dans un slideshow.

---

## 3. Mode 1 — Slideshow + Narration (defaut)

### 3.1 Pipeline

```
Sources du studio
  |
  v
Step 1: OUTLINE — LLM structure le contenu en sections/slides
  |
  v
Step 2: SCRIPT — LLM genere narration + contenu visuel par slide
  |
  v
Step 3: SLIDES — HTML templates → Puppeteer → PNG (ou SVG direct)
  |
  v
Step 4: TTS — Narration voix off par slide (meme pipeline que Audio)
  |
  v
Step 5: ASSEMBLY — ffmpeg : slides + audio + transitions + sous-titres
  |
  v
Step 6: UPLOAD — S3 + mise a jour du widget
  |
  v
VideoConfig { videoUrl, transcript, chapters, duration, thumbnailUrl }
```

### 3.2 Format du script video

```typescript
interface VideoScript {
  title: string;
  language: 'fr' | 'en';
  estimatedDuration: number;
  narrator: {
    voiceConfig: TTSVoiceConfig;
  };
  slides: {
    id: string;
    order: number;
    // Contenu visuel de la slide
    visual: {
      layout: 'title' | 'content' | 'bullets' | 'comparison' | 'quote' | 'image' | 'chart';
      title?: string;
      subtitle?: string;
      bullets?: string[];
      content?: string;       // texte principal
      imagePrompt?: string;   // si generation d'image souhaitee
      imageUrl?: string;      // si image existante
      chartData?: unknown;    // si graphique
      backgroundColor?: string;
      accentColor?: string;
    };
    // Narration audio pour cette slide
    narration: string;        // texte lu par le narrateur
    durationHint: number;     // duree estimee en secondes
    transition: 'fade' | 'slide' | 'none';
  }[];
}
```

### 3.3 System prompt pour le script video

```
Tu es un realisateur de videos educatives. Tu structures un document en une
serie de slides avec narration pour creer une video pedagogique.

REGLES :
- {slideCount} slides pour une video de ~{duration} minutes
- Chaque slide a un contenu visuel ET une narration
- La narration ne repete PAS ce qui est ecrit sur la slide — elle EXPLIQUE
- Utilise des layouts varies (pas que des bullet points)
- La premiere slide = titre + accroche
- La derniere slide = resume + call-to-action
- Inclure au moins 1 slide avec un graphique ou comparaison

LAYOUTS DISPONIBLES :
- title : titre + subtitle + image de fond (pour intro/outro)
- content : titre + paragraphe + image optionnelle
- bullets : titre + liste de points + icones
- comparison : 2 colonnes (avant/apres, pour/contre, etc.)
- quote : citation mise en avant
- image : image plein ecran avec caption
- chart : graphique (bar, pie, line) avec donnees

NARRATION :
- Ton : {tone}
- Parler naturellement, pas lire les slides
- Ajouter des transitions verbales ("Maintenant voyons...", "Un point important...")
- 15-20 mots par slide de type "title"
- 30-50 mots par slide de type "content/bullets"
- 10-15 mots par slide de type "quote/image"
```

### 3.4 Generation des slides (HTML → PNG)

Templates HTML Tailwind renderises via Puppeteer headless :

```typescript
interface SlideTemplate {
  layout: string;
  html: string;          // template HTML avec placeholders
  width: number;         // 1920
  height: number;        // 1080
  fonts: string[];       // Google Fonts a charger
}

const SLIDE_TEMPLATES: Record<string, SlideTemplate> = {
  title: {
    layout: 'title',
    html: `<div class="slide-title">
      <h1>{{title}}</h1>
      <p>{{subtitle}}</p>
    </div>`,
    width: 1920,
    height: 1080,
    fonts: ['Inter', 'DM Sans'],
  },
  bullets: { /* ... */ },
  comparison: { /* ... */ },
  // etc.
};
```

Alternative sans Puppeteer : **SVG direct** genere cote serveur (plus leger, pas besoin de headless browser).

### 3.5 Assemblage ffmpeg

```bash
# 1. Pour chaque slide : image + audio → clip video
ffmpeg -loop 1 -i slide_001.png -i narration_001.mp3 \
  -c:v libx264 -tune stillimage -c:a aac \
  -t {duration} -pix_fmt yuv420p clip_001.mp4

# 2. Ajouter transitions (crossfade 0.5s)
ffmpeg -i clip_001.mp4 -i clip_002.mp4 \
  -filter_complex "xfade=transition=fade:duration=0.5:offset={offset}" \
  merged.mp4

# 3. Ajouter sous-titres (SRT)
ffmpeg -i merged.mp4 -vf subtitles=subtitles.srt output.mp4

# 4. Ajouter musique de fond
ffmpeg -i output.mp4 -i background.mp3 \
  -filter_complex "[1:a]volume=0.05[bg];[0:a][bg]amix=inputs=2:duration=first[a]" \
  -map 0:v -map "[a]" final.mp4
```

### 3.6 Specifications de sortie

| Parametre | Valeur |
|-----------|--------|
| Format | MP4 (H.264 + AAC) |
| Resolution | 1920x1080 (16:9) |
| Framerate | 30 fps |
| Audio | AAC 128 kbps, stereo |
| Sous-titres | SRT embedded ou hardcoded |
| Thumbnail | Frame de la premiere slide |

---

## 4. Mode 2 — Avatar Presenter (premium, optionnel)

### 4.1 Providers

| Provider | API | Qualite | Cout | FR | Acces |
|----------|-----|---------|------|-----|-------|
| **D-ID** | REST, pay-per-use | Correct | ~$0.025/s | Oui (via TTS tiers) | GA |
| **HeyGen** | REST v2 | Bon | ~$0.04/s | Oui natif | Business plan |
| **Synthesia** | REST | Excellent | ~$0.08/s | Oui natif | Enterprise |

### 4.2 Pipeline Avatar

```
Script video (narration uniquement)
  |
  v
API Avatar : script → video avec presentateur
  (D-ID / HeyGen / Synthesia)
  |
  v
Post-processing : ajouter slides en picture-in-picture (optionnel)
  (ffmpeg overlay)
  |
  v
VideoConfig { videoUrl, ... }
```

### 4.3 Integration D-ID (recommande pour MVP)

```typescript
// D-ID API — le plus accessible
const response = await fetch('https://api.d-id.com/talks', {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${D_ID_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    source_url: 'https://example.com/presenter-photo.jpg',
    script: {
      type: 'text',
      input: narrationText,
      provider: { type: 'elevenlabs', voice_id: 'voiceId' },
    },
    config: { result_format: 'mp4' },
  }),
});
```

---

## 5. Mode 3 — Clips illustratifs (experimental)

Utiliser des APIs de generation video (Runway Gen-3, Google Veo 2) pour creer des **illustrations courtes** (5-10s) integrees dans un slideshow :

```
Slide avec imagePrompt
  |
  v
Runway Gen-3 API : prompt → video 5s
  (ou Veo 2 via Vertex AI)
  |
  v
Inserer le clip a la place de l'image statique dans le slideshow
```

**Limites** :
- 5-10s max par clip
- Cout eleve (~$0.05/s = $0.50 par clip de 10s)
- Hallucinations visuelles possibles
- A utiliser avec parcimonie : 1-3 clips par video max

---

## 6. Schema Zod mis a jour

```typescript
export const VideoConfigSchema = z.object({
  title: z.string().default(''),
  videoUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  transcript: z.string().optional(),
  duration: z.number().optional(),
  chapters: z.array(z.object({
    id: z.string(),
    title: z.string(),
    timestamp: z.number(),
  })).optional(),
  language: z.string().default('fr'),
  // NEW
  script: z.object({
    slides: z.array(z.object({
      id: z.string(),
      layout: z.string(),
      title: z.string().optional(),
      narration: z.string(),
      durationHint: z.number(),
    })),
  }).optional(),
  generationConfig: z.object({
    mode: z.enum(['slideshow', 'avatar', 'clips']).default('slideshow'),
    slideCount: z.number().min(3).max(30).default(8),
    targetDuration: z.enum(['1', '3', '5', '10']).default('3'),
    tone: z.enum(['casual', 'professional', 'academic']).default('professional'),
    ttsProvider: z.enum(['elevenlabs', 'openai', 'google']).default('elevenlabs'),
    avatarProvider: z.enum(['d-id', 'heygen', 'synthesia']).optional(),
    includeSubtitles: z.boolean().default(true),
    includeBackgroundMusic: z.boolean().default(true),
  }).optional(),
});
```

---

## 7. Template de generation

Creer `lib/widget-templates/templates/video-slideshow.json` :

```json
{
  "id": "qiplim/video-slideshow",
  "name": "Video Slideshow",
  "version": "1.0.0",
  "description": "Generate an educational video with narrated slides",
  "widgetType": "VIDEO",
  "tags": ["media", "video", "slideshow"],
  "schema": {
    "inputs": {
      "mode": { "type": "string", "enum": ["slideshow", "avatar"], "default": "slideshow" },
      "slideCount": { "type": "integer", "minimum": 3, "maximum": 30, "default": 8 },
      "targetDuration": { "type": "string", "enum": ["1", "3", "5", "10"], "default": "3" },
      "tone": { "type": "string", "enum": ["casual", "professional", "academic"], "default": "professional" },
      "includeSubtitles": { "type": "boolean", "default": true }
    }
  },
  "generation": {
    "mode": "multi-step",
    "steps": ["script", "slides", "tts", "assembly"]
  },
  "rag": { "topK": 15, "rerank": true }
}
```

---

## 8. Dependances

- `ffmpeg` : assemblage video (deja requis pour Audio)
- `puppeteer` ou alternative headless : generation slides PNG (ou SVG direct)
- TTS provider : meme que Audio (ElevenLabs/OpenAI/Google)
- S3 : stockage videos
- Optionnel : D-ID API key pour le mode Avatar

---

## 9. Couts estimes

| Mode | Duree 3 min | Duree 5 min | Duree 10 min |
|------|------------|------------|-------------|
| Slideshow + TTS | ~$0.10 | ~$0.15 | ~$0.30 |
| Avatar D-ID | ~$4.50 | ~$7.50 | ~$15.00 |
| Slideshow + 3 clips Runway | ~$1.60 | ~$1.65 | ~$1.80 |

---

## 10. Phases d'implementation

| Phase | Contenu | Effort |
|-------|---------|--------|
| 1 | Script generation (LLM prompt + VideoScript format) | M |
| 2 | Slide templates HTML/SVG (6 layouts) | M |
| 3 | TTS narration (reutiliser le pipeline Audio) | S |
| 4 | ffmpeg assembly (slides + audio + transitions + sous-titres) | M |
| 5 | Worker BullMQ + progress SSE | S |
| 6 | Mode Avatar D-ID (optionnel) | M |
| 7 | Mode clips generatifs (optionnel) | L |

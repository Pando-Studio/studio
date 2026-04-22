# Qiplim — AI Providers Reference

Catalogue des API de generation (image, audio, video) disponibles dans le systeme. L'utilisateur configure ses cles API dans les settings du compte (global) ou par projet (override). Les cles activent les options correspondantes dans les modals de generation.

---

## Principe BYOK

```
Settings compte (global)           Settings projet (override)
  ├── LLM: Mistral, OpenAI...       ├── LLM: override provider
  ├── Image: Gemini, DALL-E...      ├── Image: override provider
  ├── Audio: ElevenLabs, Voxtral... ├── Audio: override provider
  └── Video: Veo, HeyGen...         └── Video: override provider

Resolution: projet > compte > plateforme (cle Qiplim si dispo)
```

Quand une cle est configuree, les options du provider s'activent dans la modal de generation du widget concerne (voix, styles, modeles, etc.).

---

## 1. Image Generation

### Providers

| Provider | Modele | Prix/image | Qualite | API | Acces | Use case |
|----------|--------|-----------|---------|-----|-------|----------|
| **Gemini Imagen 4** | imagen-4 | $0.02 (fast) — $0.06 (HD) | Excellent | REST (Gemini API) | Open | Default — deja integre dans Studio |
| **OpenAI GPT Image** | gpt-image-1.5 | $0.04 (standard) — $0.19 (HD) | Excellent | REST (OpenAI API) | Open | Photorealisme, comprehension prompt |
| **DALL-E 3** | dall-e-3 | $0.04 — $0.12 | Bon | REST (OpenAI API) | Open | Creatif, style illustratif |
| **Flux 2 Pro** | flux-2-pro | $0.03 — $0.055 | Excellent | REST (BFL API) | Open | Customisation avancee, inpainting |
| **Stable Diffusion 3.5** | sd-3.5-large | $0.025 (API) — <$0.01 (self-hosted) | Bon | REST (Replicate, fal.ai) | Open | Budget, self-hosted |
| **Ideogram 3.0** | ideogram-3 | $0.06 | Bon | REST | Open | Rendu texte dans les images |
| **Recraft V4** | recraft-v4 | $0.04 (raster) — $0.08 (vector) | Bon | REST | Open | Design, vector output |

### Config utilisateur

```typescript
interface ImageProviderConfig {
  provider: 'gemini' | 'openai' | 'dalle3' | 'flux' | 'stable-diffusion' | 'ideogram' | 'recraft';
  apiKey: string;        // chiffre AES-256-GCM
  isActive: boolean;
  defaultModel?: string; // ex: 'imagen-4', 'gpt-image-1.5'
}
```

### Impact dans les modals

Quand une cle image est configuree, la modal IMAGE et INFOGRAPHIC affiche :
- Le choix du provider (dropdown)
- Les modeles disponibles pour ce provider
- Les options specifiques (resolution, style, etc.)

---

## 2. Audio / TTS

### Providers

| Provider | Prix | Voix | Langues | Multi-speaker | Latence | API | Acces |
|----------|------|------|---------|--------------|---------|-----|-------|
| **ElevenLabs v3** | $0.10/1K chars | 3000+ | 70+ | Oui | 75ms (Flash) | REST, SDK | Open |
| **Voxtral (Mistral)** | $0.016/1K chars | FR natives | 9 | Oui | 70ms | REST | Open |
| **OpenAI TTS** | $15/1M chars | 11 voix | 20+ | Non (1 seule) | ~500ms | REST | Open |
| **Google Cloud TTS** | $4/1M chars (standard) — $30/1M (Neural HD) | 220+ | 40+ | Oui (SSML) | Variable | REST, gRPC | Open |
| **Azure Speech** | $15/1M chars (Neural) | 600+ | 150+ | Oui (SSML) | Variable | REST, WebSocket | Open |
| **Amazon Polly** | $4.80/1M chars (standard) — $19.20 (Neural) | Standard + Neural | Multiple | Oui (SSML) | Variable | REST | Open |
| **Cartesia Sonic 3** | $0.03/min | 40+ langues | 40+ | Oui | 40ms (Turbo) | WebSocket, REST | Open |
| **PlayHT** | $49/mo (Creator) | 800+ | 142 | Oui | Variable | SDK (Python) | Open |
| **Murf Falcon** | $0.01/min | 150+ | 35+ | Oui | 55ms | REST | Open |

### Config utilisateur

```typescript
interface AudioProviderConfig {
  provider: 'elevenlabs' | 'voxtral' | 'openai-tts' | 'google-tts' | 'azure-speech' | 'amazon-polly' | 'cartesia' | 'playht' | 'murf';
  apiKey: string;
  isActive: boolean;
}
```

### Impact dans les modals

Quand une cle audio est configuree, la modal AUDIO affiche :
- Le choix du provider
- La liste des voix disponibles (fetchee depuis l'API du provider)
- Les options : genre, langue, ton, style (podcast / resume)
- L'option multi-speaker (si le provider le supporte)
- Preview audio (generer 10s d'echantillon avant de lancer la generation complete)

### Recommandation par use case

| Use case | Provider recommande | Pourquoi |
|----------|-------------------|----------|
| Podcast FR (meilleur rapport qualite/prix) | **Voxtral** | Voix FR natives, 73% moins cher qu'ElevenLabs |
| Podcast multi-langue (meilleure qualite) | **ElevenLabs** | 3000+ voix, clonage, emotions |
| **Podcast 2 voix (dialogue natif)** | **ElevenLabs Text-to-Dialogue** | API dediee : un appel = script dialogue → audio mixe 2 voix. Pas de concatenation manuelle. |
| **Podcast 2 voix (alternative)** | **Google Gemini-TTS MultiSpeaker** | `MultiSpeakerVoiceConfig` : 2 speakers en un appel. Integre a Gemini API. |
| Resume audio budget | **OpenAI TTS** | Simple, bon marche, 11 voix correctes |
| Volume eleve (LMS) | **Google Cloud TTS** | Free tier genereux (4M chars/mois), SSML |
| Temps reel (conversation) | **Cartesia Sonic** | 40ms de latence |

### Pipeline podcast (AUDIO multi-speaker)

```
Sources → RAG → LLM ecrit un script dialogue :
  [Hote]: Bienvenue dans ce resume...
  [Expert]: Merci. Aujourd'hui on va parler de...
  [Hote]: Commençons par le premier point.

→ API Text-to-Dialogue (ElevenLabs ou Gemini-TTS) :
  Input: script avec marqueurs speaker + voix assignees
  Output: fichier audio mixe (MP3/WAV)

→ Upload S3 → audioUrl
```

**Pas de concatenation manuelle** — les APIs de dialogue gerent le mixage, les pauses, et les transitions entre speakers nativement.

---

## 3. Video Generation

### Providers

| Provider | Prix | Type | Duree max | Resolution | API | Acces |
|----------|------|------|-----------|-----------|-----|-------|
| **Google Veo 3.1** | $0.15/s (fast) — $0.75/s (full) | Realiste, animation | ~8s | 4K | REST (Gemini API) | Open |
| **OpenAI Sora 2** | $0.10/s (standard) — $0.30/s (pro) | Cinematique | ~minutes | 720p | REST (OpenAI API) | Open |
| **Runway Gen-4** | $12/mo (625 credits) | Creatif, professionnel | 5-60s | 1080p | REST, webhooks | Open |
| **HeyGen** | $0.50/credit (Scale) | Avatar parlant | 30min | 1080p | REST | Open |
| **Synthesia** | $29/mo (Starter, 10min) | Avatar parlant | Variable | 1080p | REST (Creator+) | Open |
| **Pika 2.2** | $10/mo (700 credits) | Clips creatifs | 5-10s | Variable | REST (fal.ai) | Open |
| **Luma Dream Machine** | $94.99/mo (10K credits) | 3D, creatif | ~10s | Variable | REST | Open |
| **Kling 2.6** | $10/mo (660 credits) | Realiste | Variable | 720p-1080p | REST | Open |

### Config utilisateur

```typescript
interface VideoProviderConfig {
  provider: 'veo' | 'sora' | 'runway' | 'heygen' | 'synthesia' | 'pika' | 'luma' | 'kling';
  apiKey: string;
  isActive: boolean;
}
```

### Impact dans les modals

Quand une cle video est configuree, la modal VIDEO affiche :
- Le choix du provider
- Le type de video adapte au provider (explainer, avatar, clip)
- Les options specifiques : style, resolution, duree estimee
- Le cout estime (base sur le pricing du provider)

### Recommandation par use case

| Use case | Provider recommande | Pourquoi |
|----------|-------------------|----------|
| Explainer / animation | **Veo 3.1 Fast** | $0.15/s, meilleur qualite/prix |
| Avatar presenter (formation) | **HeyGen** ou **Synthesia** | Avatars professionnels, longue duree |
| Clip teaser / creatif | **Runway Gen-4** | Controle professionnel, credit-based |
| Video cinematique | **Sora 2** | Meilleure qualite visuelle |
| Budget / volume | **Kling 2.6** | $10/mo, free tier genereux |

---

## 4. LLM (Text Generation) — deja en place

Pour reference, les providers LLM deja integres dans Studio :

| Provider | Modele default | Prix | API |
|----------|---------------|------|-----|
| **Mistral** | mistral-large-latest | $2/1M tokens (in) + $6/1M (out) | REST (AI SDK) |
| **OpenAI** | gpt-4o | $2.50/1M (in) + $10/1M (out) | REST (AI SDK) |
| **Anthropic** | claude-sonnet-4 | $3/1M (in) + $15/1M (out) | REST (AI SDK) |
| **Google** | gemini-2.0-flash | $0.10/1M (in) + $0.40/1M (out) | REST (AI SDK) |

Resolution BYOK : **projet** → **compte** → **env var plateforme** (Mistral par defaut)

---

## 5. UI Settings

### Page Settings du compte (`/settings/providers`)

```
┌──────────────────────────────────────────────────┐
│ Mes cles API                                     │
│──────────────────────────────────────────────────│
│                                                  │
│ LLM (Generation de texte)                        │
│ ┌─────────────┬──────────────────┬──────────┐    │
│ │ Mistral     │ ••••••••kMk3yq  │ ✓ Actif  │    │
│ │ OpenAI      │ Non configure   │          │    │
│ │ Anthropic   │ Non configure   │          │    │
│ │ Google      │ Non configure   │          │    │
│ └─────────────┴──────────────────┴──────────┘    │
│                                                  │
│ Image                                            │
│ ┌─────────────┬──────────────────┬──────────┐    │
│ │ Gemini      │ ••••••••abc123  │ ✓ Actif  │    │
│ │ OpenAI      │ Non configure   │          │    │
│ │ Flux        │ Non configure   │          │    │
│ └─────────────┴──────────────────┴──────────┘    │
│                                                  │
│ Audio / TTS                                      │
│ ┌─────────────┬──────────────────┬──────────┐    │
│ │ ElevenLabs  │ ••••••••sk_xyz  │ ✓ Actif  │    │
│ │ Voxtral     │ Non configure   │          │    │
│ │ OpenAI      │ (utilise la cle LLM)       │    │
│ └─────────────┴──────────────────┴──────────┘    │
│                                                  │
│ Video                                            │
│ ┌─────────────┬──────────────────┬──────────┐    │
│ │ HeyGen      │ Non configure   │          │    │
│ │ Runway      │ Non configure   │          │    │
│ │ Veo         │ (utilise la cle Gemini)    │    │
│ └─────────────┴──────────────────┴──────────┘    │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Notes** :
- Certaines cles sont partagees (OpenAI pour LLM + DALL-E + TTS, Google pour LLM + Imagen + Veo + TTS)
- L'UI detecte automatiquement les cles reutilisables et affiche "(utilise la cle LLM)" ou "(utilise la cle Gemini)"
- La validation de cle se fait en temps reel (appel API de test lors de la saisie)

### Override par projet

Dans les settings d'un studio specifique, l'utilisateur peut overrider les providers :

```
Settings du studio "Formation RGPD"
  └── Provider LLM : Anthropic (override le Mistral du compte)
  └── Provider Image : (utilise le compte)
  └── Provider Audio : Voxtral (override l'ElevenLabs du compte)
```

---

## 6. Schema DB

### Table existante : ProviderConfig (studio-level)

```prisma
model ProviderConfig {
  id        String     @id @default(cuid())
  studioId  String
  provider  AIProvider // MISTRAL | OPENAI | ANTHROPIC | GOOGLE
  apiKey    String     // chiffre AES-256-GCM
  isActive  Boolean    @default(true)
  @@unique([studioId, provider])
}
```

### Table existante : UserProviderConfig (user-level)

```prisma
model UserProviderConfig {
  id        String     @id @default(cuid())
  userId    String
  provider  AIProvider
  apiKey    String     // chiffre AES-256-GCM
  isActive  Boolean    @default(true)
  @@unique([userId, provider])
}
```

### Extension necessaire

L'enum `AIProvider` actuel ne couvre que les LLM. Il faut l'etendre pour les providers media :

```prisma
enum AIProvider {
  // LLM
  MISTRAL
  OPENAI
  ANTHROPIC
  GOOGLE

  // Image (a ajouter)
  FLUX
  STABLE_DIFFUSION
  IDEOGRAM
  RECRAFT

  // Audio (a ajouter)
  ELEVENLABS
  VOXTRAL
  CARTESIA
  PLAYHT
  MURF
  AZURE_SPEECH
  AMAZON_POLLY

  // Video (a ajouter)
  RUNWAY
  HEYGEN
  SYNTHESIA
  PIKA
  LUMA
  KLING
  SORA
  VEO
}
```

**Note** : OpenAI couvre LLM + DALL-E + TTS (meme cle). Google couvre LLM + Imagen + Veo + TTS (meme cle). L'UI gere cette reutilisation.

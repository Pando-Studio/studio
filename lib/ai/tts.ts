/**
 * Text-to-Speech service for podcast and video narration generation.
 * Supports multiple TTS providers: OpenAI, Mistral, ElevenLabs, Gemini.
 * Uses BYOK key resolution (studio → user → env).
 */

import { uploadToS3, generateS3Key } from '../s3';
import { getApiKeyForProvider, type ProviderKey } from './providers';
import { logger } from '../monitoring/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TTSProviderKey = 'openai' | 'mistral' | 'elevenlabs' | 'gemini';

export interface TTSResult {
  audioBuffer: Buffer;
  durationEstimateMs: number;
  model: string;
}

export interface PodcastAudioResult {
  audioUrl: string;
  durationSeconds: number;
  model: string;
  transcript: string;
}

// ---------------------------------------------------------------------------
// Provider → API key mapping
// ---------------------------------------------------------------------------

const TTS_TO_PROVIDER_KEY: Record<TTSProviderKey, ProviderKey> = {
  openai: 'openai',
  mistral: 'mistral',
  elevenlabs: 'elevenlabs',
  gemini: 'google',
};

// ---------------------------------------------------------------------------
// Voice mappings per provider
// ---------------------------------------------------------------------------

const VOICE_MAP: Record<TTSProviderKey, Record<string, string>> = {
  openai: { host: 'nova', expert: 'onyx', narrator: 'alloy' },
  // Voxtral TTS only ships one French speaker (Marie). We vary emotion per role.
  mistral: { host: 'fr_marie_happy', expert: 'fr_marie_neutral', narrator: 'fr_marie_neutral' },
  elevenlabs: {
    host: 'cgSgspJ2msm6clMCkdW9',      // Jessica — playful, bright, warm
    expert: 'nPczCjzI2devNBz1zQrb',    // Brian — deep, resonant
    narrator: 'JBFqnCBsd6RMkjVDRZzb',  // George — warm storyteller
  },
  gemini: { host: 'Kore', expert: 'Charon', narrator: 'Aoede' },
};

const TTS_MODEL_NAMES: Record<TTSProviderKey, string> = {
  openai: 'tts-1',
  mistral: 'voxtral-mini-tts-2603',
  elevenlabs: 'eleven_multilingual_v2',
  gemini: 'google-cloud-tts',
};

// ---------------------------------------------------------------------------
// Provider adapters
// ---------------------------------------------------------------------------

function estimateDurationMs(text: string): number {
  const wordCount = text.split(/\s+/).length;
  return (wordCount / 150) * 60 * 1000;
}

async function generateWithOpenAITTS(
  text: string,
  voiceId: string,
  apiKey: string,
): Promise<TTSResult> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: voiceId,
      input: text,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI TTS failed: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    audioBuffer: Buffer.from(arrayBuffer),
    durationEstimateMs: estimateDurationMs(text),
    model: 'tts-1',
  };
}

async function generateWithMistralTTS(
  text: string,
  voiceId: string,
  apiKey: string,
): Promise<TTSResult> {
  const maxAttempts = 3;
  let lastError = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch('https://api.mistral.ai/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'voxtral-mini-tts-2603',
        voice_id: voiceId,
        input: text,
        response_format: 'mp3',
      }),
    });

    if (response.ok) {
      // Voxtral returns JSON: { audio_data: "<base64>" } — not a raw audio stream.
      const data = (await response.json()) as { audio_data?: string };
      if (!data.audio_data) {
        throw new Error('Mistral TTS: missing audio_data in response');
      }
      return {
        audioBuffer: Buffer.from(data.audio_data, 'base64'),
        durationEstimateMs: estimateDurationMs(text),
        model: 'voxtral-mini-tts-2603',
      };
    }

    lastError = `${response.status} - ${await response.text()}`;
    // Retry on transient Mistral 5xx (e.g. 500 Service unavailable). Bail on 4xx.
    if (response.status < 500 || attempt === maxAttempts) break;
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  throw new Error(`Mistral TTS failed: ${lastError}`);
}

async function generateWithElevenLabsTTS(
  text: string,
  voiceId: string,
  apiKey: string,
): Promise<TTSResult> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs TTS failed: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    audioBuffer: Buffer.from(arrayBuffer),
    durationEstimateMs: estimateDurationMs(text),
    model: 'eleven_multilingual_v2',
  };
}

async function generateWithGeminiTTS(
  text: string,
  voiceId: string,
  apiKey: string,
): Promise<TTSResult> {
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'fr-FR', name: voiceId },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini TTS failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const audioBuffer = Buffer.from(data.audioContent, 'base64');
  return {
    audioBuffer,
    durationEstimateMs: estimateDurationMs(text),
    model: 'google-cloud-tts',
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

function generateSpeech(
  text: string,
  voiceId: string,
  apiKey: string,
  provider: TTSProviderKey,
): Promise<TTSResult> {
  switch (provider) {
    case 'openai':
      return generateWithOpenAITTS(text, voiceId, apiKey);
    case 'mistral':
      return generateWithMistralTTS(text, voiceId, apiKey);
    case 'elevenlabs':
      return generateWithElevenLabsTTS(text, voiceId, apiKey);
    case 'gemini':
      return generateWithGeminiTTS(text, voiceId, apiKey);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a single TTS segment and return audio buffer.
 * Uses BYOK provider resolution.
 */
export async function generateTTS(
  text: string,
  voiceId: string,
  studioId: string,
  ttsProvider: TTSProviderKey = 'openai',
): Promise<TTSResult> {
  const providerKey = TTS_TO_PROVIDER_KEY[ttsProvider];
  const apiKey = await getApiKeyForProvider(studioId, providerKey);
  if (!apiKey) {
    throw new Error(`Pas de cle API ${ttsProvider} disponible pour la generation TTS`);
  }

  return generateSpeech(text, voiceId, apiKey, ttsProvider);
}

/**
 * Generate a full podcast audio from a script with multiple speakers.
 * Generates TTS per segment, concatenates MP3 buffers, uploads to S3.
 */
export async function generatePodcastAudio(
  script: {
    segments: Array<{ id: string; speakerId: string; text: string; type: string }>;
  },
  voices: Array<{ id: string; name: string; role: string }> | undefined,
  studioId: string,
  ttsProvider: TTSProviderKey = 'openai',
): Promise<PodcastAudioResult> {
  const providerKey = TTS_TO_PROVIDER_KEY[ttsProvider];
  const apiKey = await getApiKeyForProvider(studioId, providerKey);
  if (!apiKey) {
    throw new Error(`Pas de cle API ${ttsProvider} disponible pour la generation TTS`);
  }

  const voiceMap = VOICE_MAP[ttsProvider];
  const modelName = TTS_MODEL_NAMES[ttsProvider];
  const audioBuffers: Buffer[] = [];
  let totalDurationMs = 0;
  const transcriptParts: string[] = [];

  for (const segment of script.segments) {
    const voice = voices?.find((v) => v.id === segment.speakerId);
    const voiceId = voiceMap[voice?.role ?? 'narrator'] ?? voiceMap.narrator;
    const speakerName = voice?.name ?? segment.speakerId;

    logger.info(`[TTS:${ttsProvider}] Generating segment ${segment.id} for ${speakerName} (voice: ${voiceId})`);

    const result = await generateSpeech(segment.text, voiceId, apiKey, ttsProvider);
    audioBuffers.push(result.audioBuffer);
    totalDurationMs += result.durationEstimateMs;
    transcriptParts.push(`${speakerName}: ${segment.text}`);
  }

  // Concatenate all MP3 buffers (MP3 is frame-based, concat works)
  const combinedAudio = Buffer.concat(audioBuffers);

  // Upload to S3
  const filename = `podcast-${Date.now()}.mp3`;
  const s3Key = generateS3Key(filename, studioId);
  const s3Result = await uploadToS3(combinedAudio, s3Key, 'audio/mpeg', { publicRead: true });

  return {
    audioUrl: s3Result.url,
    durationSeconds: Math.round(totalDurationMs / 1000),
    model: modelName,
    transcript: transcriptParts.join('\n'),
  };
}

/**
 * Generate TTS narration for video slides.
 * Returns individual audio URLs per slide + total duration.
 */
export async function generateVideoNarration(
  slides: Array<{ id: string; narration: string }>,
  studioId: string,
  ttsProvider: TTSProviderKey = 'openai',
): Promise<{
  slideAudioUrls: Record<string, string>;
  totalDurationSeconds: number;
  model: string;
  transcript: string;
}> {
  const providerKey = TTS_TO_PROVIDER_KEY[ttsProvider];
  const apiKey = await getApiKeyForProvider(studioId, providerKey);
  if (!apiKey) {
    throw new Error(`Pas de cle API ${ttsProvider} disponible pour la generation TTS`);
  }

  const voiceMap = VOICE_MAP[ttsProvider];
  const modelName = TTS_MODEL_NAMES[ttsProvider];
  const narratorVoice = voiceMap.narrator;
  const slideAudioUrls: Record<string, string> = {};
  let totalDurationMs = 0;
  const transcriptParts: string[] = [];

  for (const slide of slides) {
    if (!slide.narration) continue;

    logger.info(`[TTS:${ttsProvider}] Generating narration for slide ${slide.id}`);

    const result = await generateSpeech(slide.narration, narratorVoice, apiKey, ttsProvider);
    totalDurationMs += result.durationEstimateMs;
    transcriptParts.push(slide.narration);

    // Upload each slide's audio to S3
    const filename = `narration-${slide.id}-${Date.now()}.mp3`;
    const s3Key = generateS3Key(filename, studioId);
    const s3Result = await uploadToS3(result.audioBuffer, s3Key, 'audio/mpeg', { publicRead: true });
    slideAudioUrls[slide.id] = s3Result.url;
  }

  return {
    slideAudioUrls,
    totalDurationSeconds: Math.round(totalDurationMs / 1000),
    model: modelName,
    transcript: transcriptParts.join('\n\n'),
  };
}

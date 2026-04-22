/**
 * Text-to-Speech service for podcast and video narration generation.
 * Uses OpenAI TTS API as default provider.
 * Supports BYOK key resolution (studio → user → env).
 */

import { uploadToS3, generateS3Key } from '../s3';
import { getApiKeyForProvider } from './providers';
import { logger } from '../monitoring/logger';

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

// Default voice mapping for podcast roles
const DEFAULT_VOICES: Record<string, string> = {
  host: 'nova',
  expert: 'onyx',
  narrator: 'alloy',
};

/**
 * Generate speech for a single text segment using OpenAI TTS.
 */
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
  const audioBuffer = Buffer.from(arrayBuffer);

  // Estimate duration: ~150 words per minute, average word = 5 chars
  const wordCount = text.split(/\s+/).length;
  const durationEstimateMs = (wordCount / 150) * 60 * 1000;

  return {
    audioBuffer,
    durationEstimateMs,
    model: 'tts-1',
  };
}

/**
 * Generate a single TTS segment and return audio buffer.
 * Uses BYOK provider resolution.
 */
export async function generateTTS(
  text: string,
  voiceId: string,
  studioId: string,
): Promise<TTSResult> {
  const apiKey = await getApiKeyForProvider(studioId, 'openai');
  if (!apiKey) {
    throw new Error('Pas de cle API OpenAI disponible pour la generation TTS');
  }

  return generateWithOpenAITTS(text, voiceId, apiKey);
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
): Promise<PodcastAudioResult> {
  const apiKey = await getApiKeyForProvider(studioId, 'openai');
  if (!apiKey) {
    throw new Error('Pas de cle API OpenAI disponible pour la generation TTS');
  }

  const audioBuffers: Buffer[] = [];
  let totalDurationMs = 0;
  const transcriptParts: string[] = [];

  for (const segment of script.segments) {
    // Resolve voice for this speaker
    const voice = voices?.find((v) => v.id === segment.speakerId);
    const voiceId = DEFAULT_VOICES[voice?.role ?? 'narrator'] ?? 'alloy';
    const speakerName = voice?.name ?? segment.speakerId;

    logger.info(`[TTS] Generating segment ${segment.id} for ${speakerName} (voice: ${voiceId})`);

    const result = await generateWithOpenAITTS(segment.text, voiceId, apiKey);
    audioBuffers.push(result.audioBuffer);
    totalDurationMs += result.durationEstimateMs;
    transcriptParts.push(`${speakerName}: ${segment.text}`);
  }

  // Concatenate all MP3 buffers (MP3 is frame-based, concat works)
  const combinedAudio = Buffer.concat(audioBuffers);

  // Upload to S3
  const filename = `podcast-${Date.now()}.mp3`;
  const s3Key = generateS3Key(filename, studioId);
  const s3Result = await uploadToS3(combinedAudio, s3Key, 'audio/mpeg');

  return {
    audioUrl: s3Result.url,
    durationSeconds: Math.round(totalDurationMs / 1000),
    model: 'tts-1',
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
): Promise<{
  slideAudioUrls: Record<string, string>;
  totalDurationSeconds: number;
  model: string;
  transcript: string;
}> {
  const apiKey = await getApiKeyForProvider(studioId, 'openai');
  if (!apiKey) {
    throw new Error('Pas de cle API OpenAI disponible pour la generation TTS');
  }

  const slideAudioUrls: Record<string, string> = {};
  let totalDurationMs = 0;
  const transcriptParts: string[] = [];

  for (const slide of slides) {
    if (!slide.narration) continue;

    logger.info(`[TTS] Generating narration for slide ${slide.id}`);

    const result = await generateWithOpenAITTS(slide.narration, 'alloy', apiKey);
    totalDurationMs += result.durationEstimateMs;
    transcriptParts.push(slide.narration);

    // Upload each slide's audio to S3
    const filename = `narration-${slide.id}-${Date.now()}.mp3`;
    const s3Key = generateS3Key(filename, studioId);
    const s3Result = await uploadToS3(result.audioBuffer, s3Key, 'audio/mpeg');
    slideAudioUrls[slide.id] = s3Result.url;
  }

  return {
    slideAudioUrls,
    totalDurationSeconds: Math.round(totalDurationMs / 1000),
    model: 'tts-1',
    transcript: transcriptParts.join('\n\n'),
  };
}

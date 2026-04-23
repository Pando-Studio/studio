import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock S3
vi.mock('@/lib/s3', () => ({
  uploadToS3: vi.fn().mockResolvedValue({ s3Key: 'test-key', url: 'https://s3.example.com/audio.mp3' }),
  generateS3Key: vi.fn().mockReturnValue('test-s3-key'),
}));

// Mock providers
vi.mock('@/lib/ai/providers', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/ai/providers')>();
  return {
    ...original,
    getApiKeyForProvider: vi.fn().mockResolvedValue('test-api-key'),
  };
});

import { generateTTS, generatePodcastAudio, generateVideoNarration, type TTSProviderKey } from '@/lib/ai/tts';
import { getApiKeyForProvider } from '@/lib/ai/providers';
import { uploadToS3 } from '@/lib/s3';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockAudioResponse() {
  const buffer = new ArrayBuffer(100);
  return new Response(buffer, { status: 200, headers: { 'content-type': 'audio/mpeg' } });
}

function mockGeminiResponse() {
  return new Response(
    JSON.stringify({ audioContent: Buffer.from('fake-audio').toString('base64') }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('TTS Multi-Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation(() => Promise.resolve(mockAudioResponse()));
    vi.mocked(getApiKeyForProvider).mockResolvedValue('test-api-key');
  });

  describe('generateTTS — provider dispatching', () => {
    it('calls OpenAI endpoint with Bearer auth', async () => {
      await generateTTS('Hello', 'alloy', 'studio-1', 'openai');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/audio/speech',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-api-key' }),
        }),
      );
    });

    it('calls Mistral endpoint with Bearer auth', async () => {
      await generateTTS('Hello', 'emma', 'studio-1', 'mistral');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mistral.ai/v1/audio/speech',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-api-key' }),
        }),
      );
    });

    it('calls ElevenLabs with voice-specific URL and xi-api-key', async () => {
      const voiceId = '21m00Tcm4TlvDq8ikWAM';
      await generateTTS('Hello', voiceId, 'studio-1', 'elevenlabs');

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'xi-api-key': 'test-api-key' }),
        }),
      );
    });

    it('calls Google TTS with key in URL', async () => {
      mockFetch.mockResolvedValueOnce(mockGeminiResponse());
      await generateTTS('Hello', 'Kore', 'studio-1', 'gemini');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://texttospeech.googleapis.com/v1/text:synthesize?key=test-api-key',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('resolves correct provider key for each TTS provider', async () => {
      const cases: Array<[TTSProviderKey, string]> = [
        ['openai', 'openai'],
        ['mistral', 'mistral'],
        ['elevenlabs', 'elevenlabs'],
        ['gemini', 'google'],
      ];

      for (const [ttsKey, providerKey] of cases) {
        vi.clearAllMocks();
        vi.mocked(getApiKeyForProvider).mockResolvedValue('key');
        if (ttsKey === 'gemini') {
          mockFetch.mockResolvedValueOnce(mockGeminiResponse());
        } else {
          mockFetch.mockResolvedValueOnce(mockAudioResponse());
        }
        await generateTTS('Test', 'voice', 'studio-1', ttsKey);
        expect(getApiKeyForProvider).toHaveBeenCalledWith('studio-1', providerKey);
      }
    });
  });

  describe('generateTTS — error handling', () => {
    it('throws when no API key is available', async () => {
      vi.mocked(getApiKeyForProvider).mockResolvedValue(null);

      await expect(generateTTS('Hello', 'alloy', 'studio-1', 'openai'))
        .rejects.toThrow('Pas de cle API openai disponible');
    });

    it('throws when provider API returns error', async () => {
      mockFetch.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

      await expect(generateTTS('Hello', 'alloy', 'studio-1', 'openai'))
        .rejects.toThrow('OpenAI TTS failed: 401');
    });
  });

  describe('generatePodcastAudio', () => {
    it('generates per-segment and uploads concatenated audio', async () => {
      const script = {
        segments: [
          { id: 's1', speakerId: 'host', text: 'Welcome', type: 'intro' },
          { id: 's2', speakerId: 'expert', text: 'Thanks', type: 'discussion' },
        ],
      };
      const voices = [
        { id: 'host', name: 'Alice', role: 'host' },
        { id: 'expert', name: 'Bob', role: 'expert' },
      ];

      const result = await generatePodcastAudio(script, voices, 'studio-1', 'openai');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(uploadToS3).toHaveBeenCalledTimes(1);
      expect(result.audioUrl).toBe('https://s3.example.com/audio.mp3');
      expect(result.transcript).toContain('Alice: Welcome');
      expect(result.transcript).toContain('Bob: Thanks');
      expect(result.model).toBe('tts-1');
    });

    it('uses provider-specific voice map', async () => {
      const script = { segments: [{ id: 's1', speakerId: 'h', text: 'Hi', type: 'intro' }] };
      const voices = [{ id: 'h', name: 'Host', role: 'host' }];

      await generatePodcastAudio(script, voices, 'studio-1', 'elevenlabs');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model_id).toBe('eleven_multilingual_v2');
    });
  });

  describe('generateVideoNarration', () => {
    it('uploads per-slide audio and returns URL map', async () => {
      const slides = [
        { id: 'slide-1', narration: 'First slide narration' },
        { id: 'slide-2', narration: 'Second slide narration' },
      ];

      const result = await generateVideoNarration(slides, 'studio-1', 'openai');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(uploadToS3).toHaveBeenCalledTimes(2);
      expect(result.slideAudioUrls['slide-1']).toBe('https://s3.example.com/audio.mp3');
      expect(result.slideAudioUrls['slide-2']).toBe('https://s3.example.com/audio.mp3');
      expect(result.totalDurationSeconds).toBeGreaterThan(0);
    });

    it('skips slides with empty narration', async () => {
      const slides = [
        { id: 'slide-1', narration: 'Some text' },
        { id: 'slide-2', narration: '' },
      ];

      const result = await generateVideoNarration(slides, 'studio-1', 'openai');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.slideAudioUrls['slide-1']).toBeDefined();
      expect(result.slideAudioUrls['slide-2']).toBeUndefined();
    });
  });
});

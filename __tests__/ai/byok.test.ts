import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

// We need to import after mocking
import { decrypt, validateApiKey } from '@/lib/ai/byok';

describe('BYOK', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('decrypt', () => {
    it('is exported as a function', () => {
      expect(typeof decrypt).toBe('function');
    });
  });

  describe('validateApiKey', () => {
    it('validates mistral with Bearer auth on /v1/models', async () => {
      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));

      const result = await validateApiKey('mistral', 'test-key');

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mistral.ai/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        }),
      );
    });

    it('validates openai with Bearer auth on /v1/models', async () => {
      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));

      const result = await validateApiKey('openai', 'test-key');

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        }),
      );
    });

    it('validates anthropic — 400 counts as valid (auth passed)', async () => {
      mockFetch.mockResolvedValueOnce(new Response('Bad Request', { status: 400 }));

      const result = await validateApiKey('anthropic', 'test-key');

      expect(result.valid).toBe(true);
    });

    it('validates elevenlabs with xi-api-key header', async () => {
      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));

      const result = await validateApiKey('elevenlabs', 'test-key');

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/user',
        expect.objectContaining({
          headers: expect.objectContaining({ 'xi-api-key': 'test-key' }),
        }),
      );
    });

    it('validates google with key in URL', async () => {
      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));

      const result = await validateApiKey('google', 'test-key');

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('key=test-key'),
      );
    });

    it('returns invalid on 401', async () => {
      mockFetch.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

      const result = await validateApiKey('openai', 'bad-key');

      expect(result.valid).toBe(false);
    });

    it('returns error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await validateApiKey('openai', 'key');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});

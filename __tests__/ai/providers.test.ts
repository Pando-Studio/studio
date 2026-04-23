import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';

// Mock byok decrypt
vi.mock('@/lib/ai/byok', () => ({
  decrypt: vi.fn((val: string) => `decrypted:${val}`),
}));

import {
  getApiKeyForProvider,
  getAvailableProviders,
  PROVIDER_INFO,
  type ProviderKey,
} from '@/lib/ai/providers';
import { decrypt } from '@/lib/ai/byok';

describe('Provider Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env
    delete process.env.OPENAI_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('PROVIDER_INFO', () => {
    it('contains all 5 providers', () => {
      const keys = Object.keys(PROVIDER_INFO);
      expect(keys).toContain('mistral');
      expect(keys).toContain('openai');
      expect(keys).toContain('anthropic');
      expect(keys).toContain('google');
      expect(keys).toContain('elevenlabs');
    });

    it('elevenlabs has empty chat model (TTS-only)', () => {
      expect(PROVIDER_INFO.elevenlabs.models.chat).toBe('');
    });

    it('each provider has name and description', () => {
      for (const key of Object.keys(PROVIDER_INFO) as ProviderKey[]) {
        expect(PROVIDER_INFO[key].name).toBeTruthy();
        expect(PROVIDER_INFO[key].description).toBeTruthy();
      }
    });
  });

  describe('getApiKeyForProvider', () => {
    it('returns decrypted studio BYOK key first', async () => {
      vi.mocked(prisma.providerConfig.findUnique).mockResolvedValue({
        id: '1', studioId: 's1', provider: 'OPENAI', apiKey: 'encrypted-studio-key',
        isActive: true, createdAt: new Date(), updatedAt: new Date(),
      });

      const key = await getApiKeyForProvider('s1', 'openai');

      expect(decrypt).toHaveBeenCalledWith('encrypted-studio-key');
      expect(key).toBe('decrypted:encrypted-studio-key');
    });

    it('falls back to user BYOK when no studio config', async () => {
      vi.mocked(prisma.providerConfig.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.studio.findUnique).mockResolvedValue({
        id: 's1', userId: 'u1',
      } as never);
      vi.mocked(prisma.userProviderConfig.findUnique).mockResolvedValue({
        id: '2', userId: 'u1', provider: 'OPENAI', apiKey: 'encrypted-user-key',
        isActive: true, createdAt: new Date(), updatedAt: new Date(),
      });

      const key = await getApiKeyForProvider('s1', 'openai');

      expect(decrypt).toHaveBeenCalledWith('encrypted-user-key');
      expect(key).toBe('decrypted:encrypted-user-key');
    });

    it('falls back to env var when no BYOK', async () => {
      vi.mocked(prisma.providerConfig.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.studio.findUnique).mockResolvedValue({
        id: 's1', userId: 'u1',
      } as never);
      vi.mocked(prisma.userProviderConfig.findUnique).mockResolvedValue(null);
      process.env.OPENAI_API_KEY = 'env-key';

      const key = await getApiKeyForProvider('s1', 'openai');

      expect(key).toBe('env-key');
      expect(decrypt).not.toHaveBeenCalled();
    });

    it('returns null when no key available', async () => {
      vi.mocked(prisma.providerConfig.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.studio.findUnique).mockResolvedValue({
        id: 's1', userId: 'u1',
      } as never);
      vi.mocked(prisma.userProviderConfig.findUnique).mockResolvedValue(null);

      const key = await getApiKeyForProvider('s1', 'openai');

      expect(key).toBeNull();
    });

    it('skips inactive studio BYOK', async () => {
      vi.mocked(prisma.providerConfig.findUnique).mockResolvedValue({
        id: '1', studioId: 's1', provider: 'OPENAI', apiKey: 'encrypted',
        isActive: false, createdAt: new Date(), updatedAt: new Date(),
      });
      vi.mocked(prisma.studio.findUnique).mockResolvedValue({
        id: 's1', userId: 'u1',
      } as never);
      vi.mocked(prisma.userProviderConfig.findUnique).mockResolvedValue(null);
      process.env.OPENAI_API_KEY = 'env-key';

      const key = await getApiKeyForProvider('s1', 'openai');

      expect(key).toBe('env-key');
    });

    it('works with elevenlabs provider', async () => {
      vi.mocked(prisma.providerConfig.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.studio.findUnique).mockResolvedValue({
        id: 's1', userId: 'u1',
      } as never);
      vi.mocked(prisma.userProviderConfig.findUnique).mockResolvedValue(null);
      process.env.ELEVENLABS_API_KEY = 'el-key';

      const key = await getApiKeyForProvider('s1', 'elevenlabs');

      expect(key).toBe('el-key');
    });
  });

  describe('getAvailableProviders', () => {
    it('returns union of BYOK and env providers', async () => {
      vi.mocked(prisma.providerConfig.findMany).mockResolvedValue([
        { id: '1', studioId: 's1', provider: 'MISTRAL', apiKey: 'k', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ]);
      process.env.OPENAI_API_KEY = 'env-key';

      const result = await getAvailableProviders('s1');

      expect(result.available).toContain('mistral');
      expect(result.available).toContain('openai');
      expect(result.byok).toEqual(['mistral']);
      expect(result.env).toContain('openai');
    });
  });
});

import { Mistral } from '@mistralai/mistralai';
import { prisma } from '@/lib/db';
import { type ProviderKey, PROVIDER_INFO } from './providers';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface EmbeddingProvider {
  /** Canonical model identifier stored alongside chunks for traceability */
  modelId: string;
  /** Vector dimensions produced by this model */
  dimensions: number;
  /** Generate embeddings for a batch of texts (handles internal batching) */
  generate(texts: string[], studioId?: string): Promise<number[][]>;
  /** Generate a single query embedding (convenience wrapper) */
  generateQuery(text: string, studioId?: string): Promise<number[]>;
}

// ---------------------------------------------------------------------------
// Mistral implementation
// ---------------------------------------------------------------------------

const MISTRAL_BATCH_SIZE = 25; // Mistral recommends batches of 25 max
const MISTRAL_DIMENSIONS = 1024;

async function getMistralApiKey(studioId?: string): Promise<string> {
  if (studioId) {
    // Studio-level BYOK
    const studioConfig = await prisma.providerConfig.findUnique({
      where: { studioId_provider: { studioId, provider: 'MISTRAL' } },
    });
    if (studioConfig?.isActive) return studioConfig.apiKey;

    // User-level BYOK
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: { userId: true },
    });
    if (studio?.userId) {
      const userConfig = await prisma.userProviderConfig.findUnique({
        where: { userId_provider: { userId: studio.userId, provider: 'MISTRAL' } },
      });
      if (userConfig?.isActive) return userConfig.apiKey;
    }
  }

  // Env fallback
  const envKey = process.env.MISTRAL_API_KEY;
  if (!envKey) {
    throw new Error('MISTRAL_API_KEY is not configured and no BYOK key found');
  }
  return envKey;
}

function createMistralEmbeddingProvider(): EmbeddingProvider {
  return {
    modelId: PROVIDER_INFO.mistral.models.embedding ?? 'mistral-embed',
    dimensions: MISTRAL_DIMENSIONS,

    async generate(texts: string[], studioId?: string): Promise<number[][]> {
      const apiKey = await getMistralApiKey(studioId);
      const client = new Mistral({ apiKey });
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += MISTRAL_BATCH_SIZE) {
        const batch = texts.slice(i, i + MISTRAL_BATCH_SIZE);

        const response = await client.embeddings.create({
          model: this.modelId,
          inputs: batch,
        });

        for (let j = 0; j < batch.length; j++) {
          const embedding = response.data[j]?.embedding;
          if (!embedding) {
            throw new Error(
              `Failed to generate embedding for text at index ${i + j}`
            );
          }
          allEmbeddings.push(embedding);
        }
      }

      return allEmbeddings;
    },

    async generateQuery(text: string, studioId?: string): Promise<number[]> {
      const results = await this.generate([text], studioId);
      return results[0];
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Get the embedding provider for a studio.
 *
 * Resolution: always returns Mistral for now (only supported embedding provider).
 * The factory exists so we can add OpenAI / Google embedding support later
 * without touching callers.
 */
export function getEmbeddingProvider(_studioId?: string): EmbeddingProvider {
  // Future: resolve per-studio preferred embedding provider here
  return createMistralEmbeddingProvider();
}

/**
 * Supported embedding provider keys (subset of ProviderKey that offer embeddings)
 */
export type EmbeddingProviderKey = Extract<ProviderKey, 'mistral' | 'openai' | 'google'>;

export { MISTRAL_DIMENSIONS, MISTRAL_BATCH_SIZE };

import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { prisma, type AIProvider } from '@/lib/db';

// Types
export type ProviderKey = 'mistral' | 'openai' | 'anthropic' | 'google';

export interface ProviderInfo {
  name: string;
  description: string;
  models: {
    chat: string;
    embedding?: string;
    image?: string;
  };
}

// Provider metadata
export const PROVIDER_INFO: Record<ProviderKey, ProviderInfo> = {
  mistral: {
    name: 'Mistral AI',
    description: 'Modele francais, souverainete des donnees',
    models: {
      chat: 'mistral-large-latest',
      embedding: 'mistral-embed',
    },
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT-4o, puissant et polyvalent',
    models: {
      chat: 'gpt-4o',
      embedding: 'text-embedding-3-small',
      image: 'dall-e-3',
    },
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude Sonnet 4, excellent pour le raisonnement',
    models: {
      chat: 'claude-sonnet-4-20250514',
    },
  },
  google: {
    name: 'Google',
    description: 'Gemini 2.0 Flash, rapide et multimodal',
    models: {
      chat: 'gemini-2.0-flash',
      embedding: 'text-embedding-004',
      image: 'gemini-3-pro-image-preview',
    },
  },
};

// Map Prisma enum to ProviderKey
const enumToKey: Record<AIProvider, ProviderKey> = {
  MISTRAL: 'mistral',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
};

const keyToEnum: Record<ProviderKey, AIProvider> = {
  mistral: 'MISTRAL',
  openai: 'OPENAI',
  anthropic: 'ANTHROPIC',
  google: 'GOOGLE',
};

// Create provider instance with API key
function createProvider(provider: ProviderKey, apiKey: string) {
  switch (provider) {
    case 'mistral':
      return createMistral({ apiKey });
    case 'openai':
      return createOpenAI({ apiKey });
    case 'anthropic':
      return createAnthropic({ apiKey });
    case 'google':
      return createGoogleGenerativeAI({ apiKey });
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Default providers using environment variables
export function getDefaultProvider(provider: ProviderKey) {
  const envKeys: Record<ProviderKey, string> = {
    mistral: process.env.MISTRAL_API_KEY || '',
    openai: process.env.OPENAI_API_KEY || '',
    anthropic: process.env.ANTHROPIC_API_KEY || '',
    google: process.env.GOOGLE_API_KEY || '',
  };

  const apiKey = envKeys[provider];
  if (!apiKey) {
    return null;
  }

  return createProvider(provider, apiKey);
}

// Get model for a provider
export function getModel(provider: ProviderKey, apiKey: string) {
  const providerInstance = createProvider(provider, apiKey);
  const modelName = PROVIDER_INFO[provider].models.chat;
  return providerInstance(modelName);
}

/**
 * Get provider for a studio with BYOK support
 * Resolution order: studio BYOK → user BYOK → env vars
 */
export async function getProviderForStudio(
  studioId: string,
  preferredProvider?: ProviderKey
): Promise<{
  provider: ReturnType<typeof createProvider>;
  key: ProviderKey;
  model: ReturnType<typeof getModel>;
  apiKey: string;
  isbyok: boolean;
}> {
  // Fetch studio to get preferredProvider and userId
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { preferredProvider: true, userId: true },
  });

  // Use studio's preferred provider if not explicitly passed
  const effectivePreferred = preferredProvider
    || (studio?.preferredProvider as ProviderKey | null)
    || undefined;

  // Priority order for providers
  const priorityOrder: ProviderKey[] = effectivePreferred
    ? [effectivePreferred, 'mistral', 'openai', 'anthropic', 'google'].filter(
        (v, i, a) => a.indexOf(v) === i
      ) as ProviderKey[]
    : ['mistral', 'openai', 'anthropic', 'google'];

  // 1. Studio-level BYOK configs
  const studioBYOK = await prisma.providerConfig.findMany({
    where: { studioId, isActive: true },
  });
  const studioByokMap = new Map(
    studioBYOK.map((config) => [enumToKey[config.provider], config.apiKey])
  );

  // 2. User-level BYOK configs
  let userByokMap = new Map<ProviderKey, string>();
  if (studio?.userId) {
    const userBYOK = await prisma.userProviderConfig.findMany({
      where: { userId: studio.userId, isActive: true },
    });
    userByokMap = new Map(
      userBYOK.map((config) => [enumToKey[config.provider], config.apiKey])
    );
  }

  // Find the first available provider
  for (const providerKey of priorityOrder) {
    // Studio BYOK first
    const studioApiKey = studioByokMap.get(providerKey);
    if (studioApiKey) {
      const provider = createProvider(providerKey, studioApiKey);
      const model = getModel(providerKey, studioApiKey);
      return { provider, key: providerKey, model, apiKey: studioApiKey, isbyok: true };
    }

    // User BYOK second
    const userApiKey = userByokMap.get(providerKey);
    if (userApiKey) {
      const provider = createProvider(providerKey, userApiKey);
      const model = getModel(providerKey, userApiKey);
      return { provider, key: providerKey, model, apiKey: userApiKey, isbyok: true };
    }

    // Environment key last
    const envKey = getEnvApiKey(providerKey);
    if (envKey) {
      const provider = createProvider(providerKey, envKey);
      const model = getModel(providerKey, envKey);
      return { provider, key: providerKey, model, apiKey: envKey, isbyok: false };
    }
  }

  throw new Error('No AI provider available. Please configure a BYOK provider or set environment API keys.');
}

function getEnvApiKey(provider: ProviderKey): string | null {
  const envKeys: Record<ProviderKey, string | undefined> = {
    mistral: process.env.MISTRAL_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_API_KEY,
  };

  return envKeys[provider] || null;
}

/**
 * Check which providers are available (BYOK or env)
 */
export async function getAvailableProviders(studioId: string): Promise<{
  available: ProviderKey[];
  byok: ProviderKey[];
  env: ProviderKey[];
}> {
  const byokConfigs = await prisma.providerConfig.findMany({
    where: {
      studioId,
      isActive: true,
    },
  });

  const byokProviders = byokConfigs.map((c) => enumToKey[c.provider]);

  const envProviders: ProviderKey[] = [];
  for (const key of Object.keys(PROVIDER_INFO) as ProviderKey[]) {
    if (getEnvApiKey(key)) {
      envProviders.push(key);
    }
  }

  // Available = union of BYOK and env (without duplicates)
  const available = [...new Set([...byokProviders, ...envProviders])];

  return {
    available,
    byok: byokProviders,
    env: envProviders,
  };
}

/**
 * Check which providers are available for a user (user BYOK + env)
 */
export async function getAvailableProvidersForUser(userId: string): Promise<{
  available: ProviderKey[];
  byok: ProviderKey[];
  env: ProviderKey[];
}> {
  const userConfigs = await prisma.userProviderConfig.findMany({
    where: { userId, isActive: true },
  });

  const byokProviders = userConfigs.map((c) => enumToKey[c.provider]);

  const envProviders: ProviderKey[] = [];
  for (const key of Object.keys(PROVIDER_INFO) as ProviderKey[]) {
    if (getEnvApiKey(key)) {
      envProviders.push(key);
    }
  }

  const available = [...new Set([...byokProviders, ...envProviders])];

  return { available, byok: byokProviders, env: envProviders };
}

/**
 * Get API key for a specific provider (studio BYOK → user BYOK → env)
 */
export async function getApiKeyForProvider(
  studioId: string,
  provider: ProviderKey
): Promise<string | null> {
  // Studio BYOK
  const studioConfig = await prisma.providerConfig.findUnique({
    where: { studioId_provider: { studioId, provider: keyToEnum[provider] } },
  });
  if (studioConfig?.isActive) return studioConfig.apiKey;

  // User BYOK
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { userId: true },
  });
  if (studio?.userId) {
    const userConfig = await prisma.userProviderConfig.findUnique({
      where: { userId_provider: { userId: studio.userId, provider: keyToEnum[provider] } },
    });
    if (userConfig?.isActive) return userConfig.apiKey;
  }

  // Env
  return getEnvApiKey(provider);
}

export { enumToKey, keyToEnum };

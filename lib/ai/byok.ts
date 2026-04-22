import crypto from 'node:crypto';
import { prisma, type AIProvider } from '@/lib/db';
import { keyToEnum, enumToKey, type ProviderKey } from './providers';

const ENCRYPTION_KEY = process.env.BYOK_ENCRYPTION_KEY || 'default-dev-key-change-in-prod';
const AES_SALT = 'qiplim-studio-byok';
const AES_PREFIX = 'v2:';

function deriveKey(): Buffer {
  return crypto.scryptSync(ENCRYPTION_KEY, AES_SALT, 32);
}

function encryptAES(text: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // iv (12) + authTag (16) + ciphertext
  const blob = Buffer.concat([iv, authTag, encrypted]);
  return AES_PREFIX + blob.toString('base64');
}

function decryptAES(encrypted: string): string {
  const key = deriveKey();
  const blob = Buffer.from(encrypted.slice(AES_PREFIX.length), 'base64');
  const iv = blob.subarray(0, 12);
  const authTag = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

function decryptLegacyXOR(encrypted: string): string {
  const decoded = Buffer.from(encrypted, 'base64').toString();
  const key = ENCRYPTION_KEY;
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

function encrypt(text: string): string {
  return encryptAES(text);
}

function decrypt(encrypted: string): string {
  if (encrypted.startsWith(AES_PREFIX)) {
    return decryptAES(encrypted);
  }
  // Legacy XOR format — will be re-encrypted on next save
  return decryptLegacyXOR(encrypted);
}

/**
 * Save or update a BYOK provider config
 */
export async function saveProviderConfig(
  studioId: string,
  provider: ProviderKey,
  apiKey: string
): Promise<void> {
  const encryptedKey = encrypt(apiKey);
  const providerEnum = keyToEnum[provider];

  await prisma.providerConfig.upsert({
    where: {
      studioId_provider: {
        studioId,
        provider: providerEnum,
      },
    },
    update: {
      apiKey: encryptedKey,
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      studioId,
      provider: providerEnum,
      apiKey: encryptedKey,
      isActive: true,
    },
  });
}

/**
 * Get decrypted API key for a provider
 */
export async function getProviderApiKey(
  studioId: string,
  provider: ProviderKey
): Promise<string | null> {
  const providerEnum = keyToEnum[provider];

  const config = await prisma.providerConfig.findUnique({
    where: {
      studioId_provider: {
        studioId,
        provider: providerEnum,
      },
    },
  });

  if (!config || !config.isActive) {
    return null;
  }

  return decrypt(config.apiKey);
}

/**
 * Disable a BYOK provider config
 */
export async function disableProviderConfig(
  studioId: string,
  provider: ProviderKey
): Promise<void> {
  const providerEnum = keyToEnum[provider];

  await prisma.providerConfig.updateMany({
    where: {
      studioId,
      provider: providerEnum,
    },
    data: {
      isActive: false,
    },
  });
}

/**
 * Delete a BYOK provider config
 */
export async function deleteProviderConfig(
  studioId: string,
  provider: ProviderKey
): Promise<void> {
  const providerEnum = keyToEnum[provider];

  await prisma.providerConfig.deleteMany({
    where: {
      studioId,
      provider: providerEnum,
    },
  });
}

/**
 * Get all BYOK configs for a studio (without exposing keys)
 */
export async function getProviderConfigs(
  studioId: string
): Promise<
  Array<{
    provider: AIProvider;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  const configs = await prisma.providerConfig.findMany({
    where: { studioId },
    select: {
      provider: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return configs;
}

// ===========================================
// User-level BYOK functions
// ===========================================

/**
 * Save or update a user-level BYOK provider config
 */
export async function saveUserProviderConfig(
  userId: string,
  provider: ProviderKey,
  apiKey: string
): Promise<void> {
  const encryptedKey = encrypt(apiKey);
  const providerEnum = keyToEnum[provider];

  await prisma.userProviderConfig.upsert({
    where: {
      userId_provider: {
        userId,
        provider: providerEnum,
      },
    },
    update: {
      apiKey: encryptedKey,
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      userId,
      provider: providerEnum,
      apiKey: encryptedKey,
      isActive: true,
    },
  });
}

/**
 * Get decrypted user-level API key for a provider
 */
export async function getUserProviderApiKey(
  userId: string,
  provider: ProviderKey
): Promise<string | null> {
  const providerEnum = keyToEnum[provider];

  const config = await prisma.userProviderConfig.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: providerEnum,
      },
    },
  });

  if (!config || !config.isActive) {
    return null;
  }

  return decrypt(config.apiKey);
}

/**
 * Delete a user-level BYOK provider config
 */
export async function deleteUserProviderConfig(
  userId: string,
  provider: ProviderKey
): Promise<void> {
  const providerEnum = keyToEnum[provider];

  await prisma.userProviderConfig.deleteMany({
    where: {
      userId,
      provider: providerEnum,
    },
  });
}

/**
 * Get all user-level BYOK configs (without exposing keys)
 */
export async function getUserProviderConfigs(
  userId: string
): Promise<
  Array<{
    provider: ProviderKey;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  const configs = await prisma.userProviderConfig.findMany({
    where: { userId },
    select: {
      provider: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return configs.map((c) => ({
    provider: enumToKey[c.provider],
    isActive: c.isActive,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

/**
 * Get decrypted user-level API keys map (for provider resolution)
 */
export async function getUserProviderApiKeys(
  userId: string
): Promise<Map<ProviderKey, string>> {
  const configs = await prisma.userProviderConfig.findMany({
    where: { userId, isActive: true },
  });

  const map = new Map<ProviderKey, string>();
  for (const config of configs) {
    map.set(enumToKey[config.provider], decrypt(config.apiKey));
  }
  return map;
}

/**
 * Validate an API key by making a test request
 */
export async function validateApiKey(
  provider: ProviderKey,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    switch (provider) {
      case 'mistral': {
        const response = await fetch('https://api.mistral.ai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return { valid: response.ok };
      }
      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return { valid: response.ok };
      }
      case 'anthropic': {
        // Anthropic doesn't have a models endpoint, so we check with a minimal request
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'content-type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        });
        // 200 or 400 (bad request but auth passed) means valid
        return { valid: response.ok || response.status === 400 };
      }
      case 'google': {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        return { valid: response.ok };
      }
      default:
        return { valid: false, error: 'Unknown provider' };
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

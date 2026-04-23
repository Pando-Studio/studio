import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock api-key-auth
vi.mock('@/lib/api/api-key-auth', () => ({
  authenticateApiKey: vi.fn(),
  hashApiKey: vi.fn(),
}));

// Mock rate-limit
vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 99 }),
}));

// Mock template registry
vi.mock('@/lib/widget-templates', () => {
  const mockTemplates = [
    {
      id: 'qiplim/quiz',
      name: 'Quiz',
      version: '1.0',
      description: 'Generate a quiz',
      widgetType: 'QUIZ',
      schema: { inputs: { questionCount: { type: 'number', default: 5 } } },
    },
    {
      id: 'qiplim/summary-structured',
      name: 'Summary',
      version: '1.0',
      description: 'Generate a summary',
      widgetType: 'SUMMARY',
      schema: { inputs: { style: { type: 'string', default: 'bullets' } } },
    },
  ];
  return {
    templateRegistry: {
      list: vi.fn(() => mockTemplates),
      get: vi.fn((id: string) => mockTemplates.find((t) => t.id === id) ?? null),
    },
    jsonSchemaToZod: vi.fn(() => ({ parse: vi.fn() })),
    buildPromptFromTemplate: vi.fn(),
  };
});

import { authenticateApiKey } from '@/lib/api/api-key-auth';

describe('API v1 Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/types', () => {
    it('returns 401 when no API key', async () => {
      vi.mocked(authenticateApiKey).mockResolvedValue({ error: 'Missing Authorization header', status: 401 });

      const { GET } = await import('@/app/api/v1/types/route');
      const request = new Request('http://localhost/api/v1/types');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toContain('Missing');
    });

    it('returns widget types with schemas when authenticated', async () => {
      vi.mocked(authenticateApiKey).mockResolvedValue({ userId: 'user-1' });

      const { GET } = await import('@/app/api/v1/types/route');
      const request = new Request('http://localhost/api/v1/types', {
        headers: { Authorization: 'Bearer sk_test' },
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.types).toHaveLength(2);
      expect(body.types[0]).toMatchObject({
        type: 'quiz',
        name: 'Quiz',
        widgetType: 'QUIZ',
      });
      expect(body.types[0].inputSchema).toBeDefined();
    });
  });

  describe('GET /api/v1/openapi.json', () => {
    it('returns valid OpenAPI 3.1 spec without auth', async () => {
      const { GET } = await import('@/app/api/v1/openapi.json/route');
      const response = await GET();

      expect(response.status).toBe(200);
      const spec = await response.json();
      expect(spec.openapi).toBe('3.1.0');
      expect(spec.info.title).toBe('Qiplim Studio API');
      expect(spec.paths).toBeDefined();
    });

    it('includes generate paths for each template', async () => {
      const { GET } = await import('@/app/api/v1/openapi.json/route');
      const response = await GET();
      const spec = await response.json();

      expect(spec.paths['/api/v1/generate/quiz']).toBeDefined();
      expect(spec.paths['/api/v1/generate/summary-structured']).toBeDefined();
    });

    it('includes tts-providers endpoint', async () => {
      const { GET } = await import('@/app/api/v1/openapi.json/route');
      const response = await GET();
      const spec = await response.json();

      expect(spec.paths['/api/v1/tts-providers']).toBeDefined();
      expect(spec.paths['/api/v1/tts-providers'].get.operationId).toBe('list_tts_providers');
    });

    it('includes types endpoint', async () => {
      const { GET } = await import('@/app/api/v1/openapi.json/route');
      const response = await GET();
      const spec = await response.json();

      expect(spec.paths['/api/v1/types']).toBeDefined();
    });

    it('has BearerAuth security scheme', async () => {
      const { GET } = await import('@/app/api/v1/openapi.json/route');
      const response = await GET();
      const spec = await response.json();

      expect(spec.components.securitySchemes.BearerAuth).toBeDefined();
      expect(spec.components.securitySchemes.BearerAuth.scheme).toBe('bearer');
    });
  });
});

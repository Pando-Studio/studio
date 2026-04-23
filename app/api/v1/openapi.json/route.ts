import { NextResponse } from 'next/server';
import { templateRegistry } from '@/lib/widget-templates';

/**
 * Build a minimal JSON Schema representation from our internal JSONSchema type.
 */
function templateInputToOpenApiSchema(
  inputs: Record<string, unknown>,
): Record<string, unknown> {
  // The template input schemas are already JSON Schema objects, pass them through
  return inputs;
}

function buildOpenApiSpec(): Record<string, unknown> {
  // Build per-type path entries
  const paths: Record<string, unknown> = {};
  const typeExamples: string[] = [];

  for (const template of templateRegistry.list()) {
    const slug = template.id.split('/').pop() ?? template.id;
    typeExamples.push(slug);

    paths[`/api/v1/generate/${slug}`] = {
      post: {
        operationId: `generate_${slug.replace(/-/g, '_')}`,
        summary: `Generate a ${template.name} widget`,
        description: template.description ?? `Generate a widget of type ${slug}`,
        tags: ['Generation'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: {
                    type: 'string',
                    description: 'Title of the widget to generate',
                    maxLength: 200,
                  },
                  sources: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Raw text sources to use as context for generation',
                  },
                  inputs: {
                    ...templateInputToOpenApiSchema(
                      template.schema.inputs as Record<string, unknown>,
                    ),
                    description: 'Type-specific generation parameters',
                  },
                  language: {
                    type: 'string',
                    default: 'fr',
                    description: 'Language for generated content',
                  },
                  provider: {
                    type: 'string',
                    enum: ['mistral', 'openai', 'anthropic', 'google'],
                    description:
                      'Preferred AI provider. Falls back to user config or environment defaults.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Widget generated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GenerateResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid request (bad type, missing title, invalid inputs)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Missing or invalid API key',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '429': {
            description: 'Rate limit exceeded (100 requests/hour per API key)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    retryAfter: { type: 'integer', description: 'Seconds until next allowed request' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    };
  }

  // Add /api/v1/types
  paths['/api/v1/types'] = {
    get: {
      operationId: 'list_types',
      summary: 'List all available widget types',
      description: 'Returns all widget types that can be generated, with their input schemas.',
      tags: ['Discovery'],
      security: [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'List of available types',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  types: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', description: 'URL slug for generation' },
                        templateId: { type: 'string', description: 'Full template ID' },
                        name: { type: 'string' },
                        version: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        widgetType: { type: 'string' },
                        inputSchema: { type: 'object', description: 'JSON Schema for type-specific inputs' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '401': {
          description: 'Missing or invalid API key',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  };

  // Add /api/v1/tts-providers
  paths['/api/v1/tts-providers'] = {
    get: {
      operationId: 'list_tts_providers',
      summary: 'List available TTS providers',
      description: 'Returns which TTS providers are available for generating audio (podcast, video narration). Availability depends on configured API keys (BYOK or environment).',
      tags: ['Discovery'],
      security: [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'List of TTS providers with availability',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  providers: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        key: { type: 'string', enum: ['openai', 'mistral', 'elevenlabs', 'gemini'] },
                        name: { type: 'string' },
                        available: { type: 'boolean', description: 'Whether an API key is configured for this provider' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '401': {
          description: 'Missing or invalid API key',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  };

  return {
    openapi: '3.1.0',
    info: {
      title: 'Qiplim Studio API',
      version: '1.0.0',
      description:
        'Public API for generating educational widgets (quizzes, flashcards, summaries, etc.) from text sources using AI.',
      contact: {
        name: 'Qiplim',
        url: 'https://qiplim.com',
      },
    },
    servers: [
      {
        url: '{baseUrl}',
        description: 'Qiplim Studio instance',
        variables: {
          baseUrl: {
            default: 'https://studio.qiplim.com',
          },
        },
      },
    ],
    security: [{ BearerAuth: [] }],
    paths,
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description:
            'API key obtained from Settings > API Keys. Format: sk_...',
        },
      },
      schemas: {
        GenerateResponse: {
          type: 'object',
          properties: {
            widget: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                title: { type: 'string' },
                data: { type: 'object', description: 'Widget-specific generated data' },
              },
            },
            usage: {
              type: 'object',
              properties: {
                inputTokens: { type: 'integer' },
                outputTokens: { type: 'integer' },
                totalTokens: { type: 'integer' },
                model: { type: 'string' },
                provider: { type: 'string' },
              },
            },
            template: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                version: { type: 'string' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error message' },
            details: {
              type: 'array',
              items: { type: 'string' },
              description: 'Detailed validation errors (when applicable)',
            },
          },
          required: ['error'],
        },
      },
    },
    tags: [
      { name: 'Generation', description: 'Widget generation endpoints' },
      { name: 'Discovery', description: 'API discovery and introspection' },
    ],
  };
}

/**
 * GET /api/v1/openapi.json
 * Returns the OpenAPI 3.1 specification for the v1 API.
 * No authentication required — the spec is public.
 */
export async function GET() {
  const spec = buildOpenApiSpec();
  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

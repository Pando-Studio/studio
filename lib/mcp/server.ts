import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { templateRegistry } from '@/lib/widget-templates';
import type { GenerationTemplate } from '@/lib/widget-templates';

/**
 * Build the Qiplim MCP Server instance.
 *
 * The server exposes three tools:
 *  - generate_widget: generates an educational widget via the v1 API
 *  - list_widget_types: lists available widget types with schemas
 *  - search_sources: searches indexed sources within a studio
 *
 * And one resource:
 *  - widget-types://list: the full list of types with schemas
 *
 * The server is transport-agnostic. Call `server.connect(transport)` to wire
 * it to SSE (WebStandardStreamableHTTP) or stdio.
 */
export function createQiplimMcpServer(): McpServer {
  const mcp = new McpServer(
    { name: 'qiplim-studio', version: '1.0.0' },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions:
        'Qiplim Studio generates interactive educational widgets (quizzes, flashcards, presentations, etc.) from source text using AI. Use list_widget_types to discover what can be generated, then generate_widget to create content.',
    },
  );

  // ---- Tools ---------------------------------------------------------------

  mcp.tool(
    'list_widget_types',
    'List all available widget types with their input schemas',
    {},
    async () => {
      const types = templateRegistry.list().map((t: GenerationTemplate) => {
        const slug = t.id.split('/').pop() ?? t.id;
        return {
          type: slug,
          name: t.name,
          description: t.description ?? '',
          widgetType: t.widgetType,
          inputSchema: t.schema.inputs,
        };
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ types }, null, 2) }],
      };
    },
  );

  mcp.tool(
    'generate_widget',
    'Generate an educational widget from source text. Use list_widget_types first to see available types and their input schemas.',
    {
      type: z.string().describe('Widget type slug (e.g. "quiz-interactive", "flashcard-learning")'),
      title: z.string().describe('Title for the generated widget'),
      sources: z.array(z.string()).describe('Array of source texts to use as context'),
      inputs: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Type-specific generation parameters (see inputSchema from list_widget_types)'),
      language: z
        .string()
        .optional()
        .default('fr')
        .describe('Language for generated content (default: fr)'),
      apiBaseUrl: z
        .string()
        .optional()
        .default('https://studio.qiplim.com')
        .describe('Base URL of the Qiplim Studio API'),
      apiKey: z
        .string()
        .optional()
        .describe('API key (sk_...). Falls back to QIPLIM_API_KEY env var.'),
    },
    async (args) => {
      const baseUrl = args.apiBaseUrl ?? 'https://studio.qiplim.com';
      const key = args.apiKey ?? process.env.QIPLIM_API_KEY;

      if (!key) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'No API key provided. Pass apiKey or set QIPLIM_API_KEY environment variable.',
            },
          ],
        };
      }

      const url = `${baseUrl}/api/v1/generate/${encodeURIComponent(args.type)}`;
      const body = {
        title: args.title,
        sources: args.sources,
        inputs: args.inputs ?? {},
        language: args.language ?? 'fr',
      };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(body),
        });

        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Failed to call Qiplim API: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  mcp.tool(
    'search_sources',
    'Search indexed sources within a Qiplim studio for relevant content',
    {
      studioId: z.string().describe('The studio ID to search in'),
      query: z.string().describe('Search query'),
      apiBaseUrl: z
        .string()
        .optional()
        .default('https://studio.qiplim.com')
        .describe('Base URL of the Qiplim Studio API'),
      apiKey: z
        .string()
        .optional()
        .describe('API key (sk_...). Falls back to QIPLIM_API_KEY env var.'),
    },
    async (args) => {
      const baseUrl = args.apiBaseUrl ?? 'https://studio.qiplim.com';
      const key = args.apiKey ?? process.env.QIPLIM_API_KEY;

      if (!key) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'No API key provided. Pass apiKey or set QIPLIM_API_KEY environment variable.',
            },
          ],
        };
      }

      const url = `${baseUrl}/api/v1/studios/${encodeURIComponent(args.studioId)}/search?q=${encodeURIComponent(args.query)}`;

      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${key}` },
        });

        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
          };
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (error: unknown) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Failed to search: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  // ---- Resources -----------------------------------------------------------

  mcp.resource(
    'widget-types',
    'widget-types://list',
    { description: 'List of all available widget types with their schemas', mimeType: 'application/json' },
    async () => {
      const types = templateRegistry.list().map((t: GenerationTemplate) => {
        const slug = t.id.split('/').pop() ?? t.id;
        return {
          type: slug,
          templateId: t.id,
          name: t.name,
          version: t.version,
          description: t.description ?? null,
          widgetType: t.widgetType,
          inputSchema: t.schema.inputs,
        };
      });

      return {
        contents: [
          {
            uri: 'widget-types://list',
            mimeType: 'application/json',
            text: JSON.stringify({ types }, null, 2),
          },
        ],
      };
    },
  );

  return mcp;
}

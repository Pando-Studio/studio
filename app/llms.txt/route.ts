import { templateRegistry } from '@/lib/widget-templates';
import type { GenerationTemplate } from '@/lib/widget-templates';

/**
 * GET /llms.txt
 *
 * Serves a machine-readable description of the Qiplim Studio API
 * following the llms.txt convention (https://llmstxt.org/).
 *
 * Widget types are injected dynamically from the template registry
 * so the list stays up-to-date as new types are added.
 */
export async function GET(): Promise<Response> {
  const widgetLines = templateRegistry
    .list()
    .map((t: GenerationTemplate) => {
      const slug = t.id.split('/').pop() ?? t.id;
      const desc = t.description ?? t.name;
      return `- ${slug}: ${desc}`;
    })
    .join('\n');

  const body = `# Qiplim Studio

> AI-powered educational content generation platform

## Overview

Qiplim Studio generates interactive educational widgets (quizzes, flashcards, presentations, timelines, etc.) from source documents using AI. It supports ${templateRegistry.list().length} widget types, multiple AI providers (Mistral, OpenAI, Anthropic, Google), and outputs structured JSON ready for rendering.

## API

- Base URL: https://studio.qiplim.com/api/v1
- Auth: Bearer token (API key starting with \`sk_\`)
- OpenAPI spec: https://studio.qiplim.com/api/v1/openapi.json
- Rate limit: 100 requests/hour per API key

## Endpoints

### POST /api/v1/generate/{type}
Generate a widget of the given type. Requires \`title\` (string). Optional: \`sources\` (string[]), \`inputs\` (object), \`language\` (string, default "fr"), \`provider\` (string).

### GET /api/v1/types
List all available widget types with their input schemas.

### GET /api/v1/openapi.json
OpenAPI 3.1 specification (no auth required).

## Widget Types

${widgetLines}

## Quick Start

\`\`\`
POST /api/v1/generate/quiz-interactive
Authorization: Bearer sk_...
Content-Type: application/json

{
  "title": "Quiz sur la Revolution francaise",
  "sources": ["La Revolution francaise commence en 1789..."],
  "inputs": { "questionCount": 5, "difficulty": "medium" },
  "language": "fr"
}
\`\`\`

## MCP Server

Connect via stdio: \`QIPLIM_API_KEY=sk_... npx qiplim-mcp\`
Or Streamable HTTP: \`POST https://studio.qiplim.com/api/mcp\` (Authorization: Bearer sk_...)
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createQiplimMcpServer } from '@/lib/mcp/server';
import { authenticateApiKey } from '@/lib/api/api-key-auth';
import { logger } from '@/lib/monitoring/logger';

/**
 * MCP Streamable HTTP endpoint.
 *
 * Clients POST JSON-RPC messages here and receive responses via SSE or JSON.
 * GET opens a standalone SSE stream for server-initiated notifications.
 * DELETE closes the session.
 *
 * Auth: same API key as v1 API (Authorization: Bearer sk_...).
 */

async function handleMcpRequest(request: Request): Promise<Response> {
  // Auth check for all methods
  const authResult = await authenticateApiKey(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Create a fresh server + transport per request (stateless mode).
    // This is simpler and matches the Next.js serverless model well.
    const mcp = createQiplimMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    await mcp.connect(transport);

    const response = await transport.handleRequest(request);
    return response;
  } catch (error: unknown) {
    logger.error('MCP request error', {
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  return handleMcpRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleMcpRequest(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handleMcpRequest(request);
}

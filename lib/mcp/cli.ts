#!/usr/bin/env node

/**
 * Qiplim MCP CLI entry point (stdio transport).
 *
 * Usage:
 *   QIPLIM_API_KEY=sk_... npx qiplim-mcp
 *
 * This connects to the Qiplim Studio API via HTTP and exposes the
 * generate_widget, list_widget_types, and search_sources tools
 * over the MCP stdio transport for use with Claude Code, Cursor, etc.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createQiplimMcpServer } from './server.js';

async function main(): Promise<void> {
  const apiKey = process.env.QIPLIM_API_KEY;
  if (!apiKey) {
    process.stderr.write(
      'Error: QIPLIM_API_KEY environment variable is required.\n' +
        'Get an API key from Settings > API Keys in Qiplim Studio.\n',
    );
    process.exit(1);
  }

  const mcp = createQiplimMcpServer();
  const transport = new StdioServerTransport();

  await mcp.connect(transport);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await mcp.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await mcp.close();
    process.exit(0);
  });
}

main().catch((error: unknown) => {
  process.stderr.write(
    `Fatal: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
